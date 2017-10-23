const _ = require('lodash');
const moment = require('moment');
const HTTPStatus = require('http-status');
const HmacSHA512 = require('crypto-js/hmac-sha512.js');
const config = require('../config.js');
const sendgridLib = require('../lib/sendgrid.js');
const sequelize = require('../model/init.js');
const UserController = require('../controller/user.js');
const NonceController = require('../controller/nonce.js');
const PermissionController = require('../controller/permission.js');
const { errorResponse, successResponse, parseUser } = require('../controller/parse.js');
const { parseSignup } = require('../middleware/data.js');
const { validateParameters, requiredLogin, validateNonce, checkCandyAmount } = require('../middleware/auth.js');

const userController = new UserController();
const nonceController = new NonceController();
const permissionController = new PermissionController(); 

module.exports = api => {
  api.post('/v1/users/signup', validateParameters('/v1/users/signup'), parseSignup, ctx => {
    const params = ctx.request.body;
    if (_.isEmpty(params)) {
      return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1000 ]);
    }

    return sequelize.transaction(async () => {
      const userObj = await userController.signup(params);
      if (_.isEmpty(userObj)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1001 ]);
      }
      await permissionController.create({ owner_id: userObj.id });

      // Create nonce
      const verifyEmailNonce = nonceController.createNonce(userObj.id);
      const passReviewNonce = nonceController.createNonce(userObj.id, 'pass-review');
      const unpassReviewNonce = nonceController.createNonce(userObj.id, 'unpass-review');

      await Promise.all([
        nonceController.create(verifyEmailNonce),
        nonceController.create(passReviewNonce),
        nonceController.create(unpassReviewNonce)
      ]);

      const reviewOptions = {
        substitutions: {
          data: JSON.stringify(params),
          pass_review_url: `${config.backendUrl}/v1/users/review?mode=pass&nonce=${passReviewNonce.nonce}`,
          unpass_review_url: `${config.backendUrl}/v1/users/review?mode=unpass&nonce=${unpassReviewNonce.nonce}`
        }
      };
      const welcomeOptions = {
        to: {
          email: userObj.email,
          name: userObj.display_name
        },
        substitutions: { display_name: userObj.display_name }
      };
      const verifyEmailOptions = {
        to: {
          email: userObj.email,
          name: userObj.display_name
        },
        substitutions: {
          verify_email_link: `${config.frontendUrl}/verify-email?nonce=${verifyEmailNonce.nonce}`,
          display_name: userObj.display_name
        }
      };

      return Promise.all([
        sendgridLib.send(reviewOptions, 'review'),
        sendgridLib.send(welcomeOptions, 'welcome'),
        sendgridLib.send(verifyEmailOptions, 'verifyEmail')
      ]);
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.CREATED, 'user', 'api', 1000 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1002, error ]);
    });
  });

  api.post('/v1/users/login', validateParameters('/v1/users/login'), ctx => {
    const { email, password } = ctx.request.body;

    return sequelize.transaction(async () => {
      const userObj = await userController.loginWithPassword(email, password);
      if (_.isEmpty(userObj)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1003 ]);
      }
      if (!userObj.email_verified) {
        return errorResponse(ctx, [ HTTPStatus.UNAUTHORIZED, 'user', 'api', 1004 ]);
      }

      return parseUser(userObj.id);
    }).then(result => {
      successResponse(ctx, [ HTTPStatus.OK, 'user', 'api', 1001, result ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1004, error ]);
    });
  });

  api.post('/v1/users/logout', requiredLogin, ctx => {
    const targetUser = ctx.request.targetUser;

    return sequelize.transaction(() => {
      return userController.update(targetUser, { session_token: null });
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.OK, 'user', 'api', 1002 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1005, error ]);
    });
  });

  api.post('/v1/users/verify/email', validateParameters('/v1/users/verify/email'), validateNonce('verify-email'), ctx => {
    const nonceObj = ctx.request.nonceObj;
    const userId = ctx.request.body.userId;

    return sequelize.transaction(async () => {
      const userObj = await userController.find(userId, 'id');
      if (_.isEmpty(userObj)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1006 ]);
      }

      return Promise.all([
        userController.update(userObj, { email_verified: true }),
        nonceController.update(nonceObj, { used_at: new Date() })
      ]);
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.OK, 'user', 'api', 1003 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1007, error ]);
    });
  });

  api.post('/v1/users/resend/verify/email', validateParameters('/v1/users/resend/verify/email'), ctx => {
    const email = ctx.request.body.email;

    return sequelize.transaction(async () => {
      const userObj = await userController.find({ where: { email } }, 'id');
      if (_.isEmpty(userObj)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1008 ]);
      }

      // Create nonce
      const verifyEmailNonce = nonceController.createNonce(userObj.id);
      await nonceController.create(verifyEmailNonce);
      const verifyEmailOptions = {
        to: { email, name: userObj.display_name },
        substitutions: {
          verify_email_link: `${config.frontendUrl}/verify-email?nonce=${verifyEmailNonce.nonce}`,
          display_name: userObj.display_name
        }
      };
      return sendgridLib.send(verifyEmailOptions, 'verifyEmail');
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.ACCEPTED, 'user', 'api', 1004 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1009, error ]);
    });
  });

  api.post('/v1/users/forget/password', validateParameters('/v1/users/forget/password'), ctx => {
    const email = ctx.request.body.email;

    return sequelize.transaction(async () => {
      const userObj = await userController.find({ where: { email } }, 'one');
      if (_.isEmpty(userObj)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1010 ]);
      }
      const forgetPasswordNonce = nonceController.createNonce(userObj.id, 'forget-password');
      await nonceController.create(forgetPasswordNonce);
      const forgetPasswordOptions = {
        to: {
          email: userObj.email,
          name: userObj.display_name
        },
        substitutions: {
          verify_email_link: `${config.frontendUrl}/forget-password?nonce=${forgetPasswordNonce.nonce}`,
          display_name: userObj.display_name
        }
      };
      return sendgridLib.send(forgetPasswordOptions, 'forgetPassword');
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.ACCEPTED, 'user', 'api', 1005 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1011, error ]);
    });
  });

  api.post('/v1/users/reset/password', validateParameters('/v1/users/reset/password'), validateNonce('forget-password'), ctx => {
    const { userId, new_password } = ctx.request.body;

    return sequelize.transaction(async () => {
      const userObj = await userController.find(userId, 'id');
      if (_.isEmpty(userObj)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1012 ]);
      }

      const salt = userController.getSalt();
      const password = _.toString(HmacSHA512(new_password, salt));
      return userController.update(userObj, { password, salt });
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.CREATED, 'user', 'api', 1006 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1013, error ]);
    });
  });

  api.get('/v1/users/review', validateNonce('review'), ctx => {
    const userId = ctx.request.body.userId;
    const { mode, nonce } = ctx.query;
    if (_.isEmpty(mode) || _.isEmpty(nonce)) {
      return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1014 ]);
    }

    return sequelize.transaction(async () => {
      const [ nonceObj, permissionObj ] = await Promise.all([
        nonceController.find({ where: { nonce } }, 'one'),
        permissionController.find({ where: { owner_id: userId } }, 'one')
      ]);
      if (_.isEmpty(permissionObj) || _.isEmpty(nonceObj)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1015 ]);
      }

      const options = {};
      if (mode === 'pass') {
        options.under_review = false;
      } else if (mode === 'unpass') {
        options.under_review = true;
      }
      if (_.isEmpty(options)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1016 ]);
      }

      return Promise.all([
        permissionController.update(permissionObj, options),
        nonceController.update(nonceObj, { used_at: new Date() })
      ]);
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.OK, 'user', 'api', 1006 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1017, error ]);
    });
  });

  api.get('/v1/users/:userId', requiredLogin, async ctx => {
    const userId = ctx.params.userId;
    const targetUser = ctx.request.targetUser;

    try {
      if (targetUser.id !== userId) {
        return errorResponse(ctx, [ HTTPStatus.FORBIDDEN, 'user', 'api', 1018 ]);
      }
      const result = await parseUser(userId);
      successResponse(ctx, [ HTTPStatus.OK, 'user', 'api', 1007, result ] );
    } catch (error) {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1019, error ]);
    }
  });

  api.put('/v1/users/:userId/unlock', requiredLogin, validateParameters('/v1/users/:userId/unlock'), checkCandyAmount, ctx => {
    const targetUser = ctx.request.targetUser;
    if (_.isEmpty(targetUser)) {
      return errorResponse(ctx, [ HTTPStatus.UNAUTHORIZED, 'room', 'api', 1021 ]);
    }
    const productObj = ctx.request.body.productObj;
    if (_.isEmpty(productObj)) {
      return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'room', 'api', 1022 ]);
    }

    return sequelize.transaction(async () => {
      const newCandy = targetUser.candy - productObj.cost;
      const plusTimeList = _.split(productObj.extend_time, ',');
      let expiredAt = targetUser.permission.expired_at;
      _.forEach(plusTimeList, value => {
        const [ timeUnit, timeValue ] = _.split(value, ':');
        expiredAt = moment(expiredAt).add(timeValue, timeUnit).toDate();
      });
      return Promise.all([
        userController.update(targetUser, { candy: newCandy }),
        permissionController.update(targetUser.permission, { expired_at: expiredAt })
      ]);
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.CREATED, 'room', 'api', 1008 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'room', 'api', 1023, error ]);
    });
  });

  api.put('/v1/users/:userId/prefeneces', requiredLogin, ctx => {
    const userId = ctx.params.userId;
    const options = ctx.request.body;

    if (_.isEmpty(options)) {
      return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1024 ]);
    }

    return sequelize.transaction(async () => {
      const permissionObj = await permissionController.find({ where: { owner_id: userId } }, 'one');
      if (_.isEmpty(permissionObj)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'user', 'api', 1025 ]);
      }

      const preferneces = JSON.parse(permissionObj.preferneces);
      if (_.has(options, 'country')) {
        preferneces.country = options.country;
      }
      if (_.has(options, 'locality')) {
        preferneces.locality = options.locality;
      }
      if (_.has(options, 'administrative_area_level_1')) {
        preferneces.administrative_area_level_1 = options.administrative_area_level_1;
      }
      if (_.has(options, 'administrative_area_level_2')) {
        preferneces.administrative_area_level_2 = options.administrative_area_level_2;
      }
      if (_.has(options, 'distance')) {
        preferneces.distance = options.distance;
      }
      if (_.has(options, 'sex') && (options.sex === 'male' || options.sex === 'female' || options.sex === 'all')) {
        preferneces.sex = options.sex;
      }
      if (_.has(options, 'max_age')) {
        preferneces.age.max = options.max_age;
      }
      if (_.has(options, 'min_age') && options.min_age > 17) {
        preferneces.age.min = options.min_age;
      }
      
      const jsonPreferneces = JSON.stringify(preferneces);
      await permissionController.update(permissionObj, { preferneces: jsonPreferneces });
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.CREATED, 'user', 'api', 1009 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1026, error ]);
    });
  });

  api.patch('/v1/users/:userId/password', requiredLogin, validateParameters('/v1/users/:userId/password'), ctx => {
    const targetUser = ctx.request.targetUser;
    const { old_password, new_password } = ctx.request.body;

    return sequelize.transaction(async () => {
      const userObj = await userController.loginWithPassword(targetUser.email, old_password);
      if (_.isEmpty(userObj)) {
        return errorResponse(ctx, [ HTTPStatus.UNAUTHORIZED, 'user', 'api', 1027 ]);
      }
      if (targetUser.id !== userObj.id) {
        return errorResponse(ctx, [ HTTPStatus.FORBIDDEN, 'user', 'api', 1028 ]);
      }

      const password = _.toString(HmacSHA512(new_password, targetUser.salt));
      return userController.update(targetUser, { password });
    }).then(() => {
      successResponse(ctx, [ HTTPStatus.CREATED, 'user', 'api', 1010 ] );
    }).catch(error => {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'user', 'api', 1029, error ]);
    });
  });
};