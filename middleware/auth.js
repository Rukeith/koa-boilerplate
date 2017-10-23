const _ = require('lodash');
const moment = require('moment');
const HTTPStatus = require('http-status');
const UserController = require('../controller/user.js');
const NonceController = require('../controller/nonce.js');
const { errorResponse } = require('../controller/parse.js');
const userController = new UserController();
const nonceController = new NonceController();

module.exports = {
  requiredLogin: async (ctx, next) => {
    const token = ctx.headers['x-token'];
    const userId = ctx.headers['x-user-id'];
    if (_.isEmpty(token) || _.isEmpty(userId)) {
      return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'auth', 'middleware', 1000 ]);
    }

    try {
      const currentUser = await userController.loginWithToken(token);
      if (_.isEmpty(currentUser)) {
        return errorResponse(ctx, [ HTTPStatus.UNAUTHORIZED, 'auth', 'middleware', 1001 ]);
      } else if (!currentUser.email_verified) {
        return errorResponse(ctx, [ HTTPStatus.UNAUTHORIZED, 'auth', 'middleware', 1002 ]);
      } else if (currentUser.permission.warning) {
        return errorResponse(ctx, [ HTTPStatus.FORBIDDEN, 'auth', 'middleware', 1003 ]);
      }
      console.info(`User ${currentUser.username} login success`);
      ctx.request.currentUser = currentUser;

      if (currentUser.permission.role !== 'admin') {
        if (currentUser.id !== userId) {
          return errorResponse(ctx, [ HTTPStatus.FORBIDDEN, 'auth', 'middleware', 1004 ]);
        } else {
          ctx.request.targetUser = currentUser;
        }
      } else {
        const targetUser = await userController.find({ where: { id: userId }, include: [ { model: 'permission' } ] }, 'one');
        if (_.isEmpty(targetUser)) {
          return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'auth', 'middleware', 1005 ]);
        }
        console.info(`Target user is ${targetUser.username}`);
        ctx.request.targetUser = targetUser;
      }

      await next();
    } catch (error) {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'auth', 'middleware', 1006, error ]);
    }
  },

  validateParameters: (type) => {
    return async (ctx, next) => {
      const params = ctx.request.body;
      if (_.isEmpty(params)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'auth', 'middleware', 1007 ]);
      }

      try {
        switch (type) {
          case '/v1/users/signup':
            ctx.verifyParams({
              email: 'email',
              password: { type: 'password', min: 8 },
              display_name: 'string',
              country: { type: 'string', format: /[A-Z]{0,2}$/ },
              locality: 'string',
              administrative_area_level_1: 'string',
              administrative_area_level_2: 'string',
              latitude: 'string',
              longitude: 'string',
              birth: { type: 'string', format: /[1-2][09][0-9][0-9]\/[0-1][0-9]\/[0-3][0-9]$/ },
              sex: [ 'male', 'female' ],
              role: [ 'baby', 'daddy' ]
            });
            break;
          case '/v1/users/login':
            ctx.verifyParams({
              email: 'email',
              password: { type: 'password', min: 8 }
            });
            break;
          case '/v1/users/verify/email':
            ctx.verifyParams({ nonce: 'string' });
            break;
          case '/v1/users/resend/verify/email':
            ctx.verifyParams({ email: 'email' });
            break;
          case '/v1/users/forget/password':
            ctx.verifyParams({ email: 'email' });
            break;
          case '/v1/users/reset/password':
            ctx.verifyParams({ new_password: { type: 'password', min: 8 } });
            break;
          case '/v1/users/:userId/password':
            ctx.verifyParams({
              old_password: { type: 'password', min: 8 },
              new_password: { type: 'password', min: 8 }
            });
            break;
          case '/v1/users/:userId/unlock':
            ctx.verifyParams({ product_id: 'string' });
            break;
        }
        await next();
      } catch (error) {
        let err = error;
        if (error.code === 'INVALID_PARAM') {
          err = JSON.stringify(error.errors);
        }
        errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'auth', 'middleware', 1008, err ]);
      }
    };
  },

  checkPayStauts: async (ctx, next) => {
    const targetUser = ctx.request.targetUser;
    if (_.isEmpty(targetUser)) {
      return errorResponse(ctx, [ HTTPStatus.UNAUTHORIZED, 'auth', 'middleware', 1009 ]);
    }

    try {
      const nowTime = moment().toDate();
      const expiredAt = targetUser.permission.expired_at;
      if (_.isDate(expiredAt) && moment(expiredAt).isAfter(nowTime)) {
        await next();
      } else {
        return errorResponse(ctx, [ HTTPStatus.FORBIDDEN, 'auth', 'middleware', 1010 ]);
      }
    } catch (error) {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'auth', 'middleware', 1011, error ]);
    }
  },

  validateNonce: (action = 'verify-email') => {
    return async (ctx, next) => {
      const nonce = ctx.request.body.nonce || ctx.query.nonce || ctx.params.nonce;
      if (_.isEmpty(nonce)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'auth', 'middleware', 1019 ]);
      }

      try {
        const validResult = await nonceController.verify(nonce, action);
        if (!validResult.valid) {
          return errorResponse(ctx, [ HTTPStatus.UNAUTHORIZED, 'auth', 'middleware', 1020 ]);
        }
        ctx.request.nonceObj = validResult.nonce;
        ctx.request.body.userId = validResult.userId;
        await next();
      } catch (error) {
        errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'auth', 'middleware', 1021, error ]);
      }
    };
  }
};
