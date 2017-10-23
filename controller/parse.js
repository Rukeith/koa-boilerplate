const _ = require('lodash');
const moment = require('moment');
const errorLevel = require('../config/error-level.json');
const UserController = require('./user.js');
const userController = new UserController();

module.exports = {
  successResponse: (ctx, options = []) => {
    let [ status, type, file, code, data ] = options;
  
    // Translate message
    const path = `${type}${_.upperFirst(file)}`;
    const translate = `success-${path}-${code}`;
    let message = ctx.i18n.__(translate);
    if (_.isEmpty(message)) {
      message = 'Translate message not found';
    }
  
    ctx.status = status;
    ctx.response.body = { status, message, data };
  },

  /**
   * @func errorResponse
   * @desc List of level
   *   debug (the least serious)
   *   info
   *   warning
   *   error
   *   fatal (the most serious)
   * @param {Array} options 
   */
  errorResponse: (ctx, options = [], userId) => {
    let [ status, type, file, code, error ] = options;
  
    // Translate message
    const path = `${type}${_.upperFirst(file)}`;
    const translate = `error-${path}-${code}`;
    let level = errorLevel[translate];
    let message = ctx.i18n.__(translate);
  
    if (_.isEmpty(message)) {
      type = 'info';
      level = 'warning';
      message = 'Error code not found';
    }
  
    const user = {};
    if (userId) user.id = userId;
    if (ctx.request.cookie) user.cookie = ctx.request.cookie;
  
    ctx.sentryError = {
      status, user, message,
      req: ctx.request,
      tags: { path, type },
      extra: _.toString(error) || '',
      fingerprint: [ process.env.NODE_ENV ],
      level: (process.env.NODE_ENV === 'production') ? level : 'debug'
    };
  
    ctx.status = status;
    ctx.app.emit('error', new Error(message), ctx);
  },

  filterNull: (options = {}) => {
    const result = _.pickBy(options, (value) => !_.isNil(value));
    return result;
  },

  parseUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const userObj = await userController.find({ where: { id: userId }, include: [ { model: 'permission' } ] } , 'one');
        const profile = {
          id: userObj.id,
          session_token: userObj.session_token,
          email_verified: userObj.email_verified,
          display_name: userObj.display_name,
          role: userObj.role,
          created_at: moment(userObj.created_at).valueOf(),
          updated_at: moment(userObj.updated_at).valueOf(),
          permission: {
            expired_at: moment(userObj.permission.expired_at).valueOf(),
            info_unread_message: userObj.permission.info_unread_message,
            info_see_profile: userObj.permission.info_see_profile,
            warning: userObj.permission.warning,
            under_review: userObj.permission.under_review,
            preferneces: (_.isEmpty(userObj.permission.preferneces)) ? null : JSON.parse(userObj.permission.preferneces)
          }
        };
        resolve(profile);
      } catch (error) {
        reject([ 'parse', 'controller', 1000, error ]);
      }
    });
  }
}; 