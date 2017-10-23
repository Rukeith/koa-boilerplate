const _ = require('lodash');
const moment = require('moment');
const countryJS = require('countryjs');
const HTTPStatus = require('http-status');
const HmacSHA512 = require('crypto-js/hmac-sha512.js');
const UserController = require('../controller/user.js');
const { errorResponse } = require('../controller/parse.js');
const userController = new UserController();

module.exports = {
  parseSignup: async (ctx, next) => {
    const params = ctx.request.body;
    if (_.isEmpty(params)) {
      return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'data', 'middleware', 1000 ]);
    }
  
    try {
      // Check email is not used
      const email = _.toLower(params.email);
      const checkExist = await userController.find({ where: { email } }, 'one');
      if (_.isEmpty(checkExist)) {
        params.email = email;
      } else {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'data', 'middleware', 1001 ]);
      }
  
      // Check country code
      const countryCode = _.toUpper(params.country);
      const countryName = countryJS.name(countryCode);
      if (_.isEmpty(countryName)) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'data', 'middleware', 1002 ]);
      }
      params.country = countryCode;
      params.age = moment().diff(moment(params.birth, 'YYYY/MM/DD'), 'years');
      if (params.age < 18) {
        return errorResponse(ctx, [ HTTPStatus.BAD_REQUEST, 'data', 'middleware', 1003 ]);
      }
  
      // Password and salt
      const salt = userController.getSalt();
      params.salt = salt;
      params.password = _.toString(HmacSHA512(params.password, salt));
      
      // Merge latitude, longitude to point
      params.geometry = { type: 'Point', coordinates: [ _.toNumber(params.latitude), _.toNumber(params.longitude) ] };
      delete params.latitude;
      delete params.longitude;
      ctx.request.body = params;
      await next();
    } catch (error) {
      errorResponse(ctx, [ HTTPStatus.INTERNAL_SERVER_ERROR, 'data', 'middleware', 1004, error ]);
    }
  }
};
