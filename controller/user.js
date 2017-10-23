const _ = require('lodash');
const jwt = require('jsonwebtoken');
const HmacSHA512 = require('crypto-js/hmac-sha512');
const UserModel = require('../model/user.js');
const userModel = new UserModel();

module.exports = class UserController {
  signup (values = {}, options = {}) {
    if (_.isEmpty(values)) {
      return Promise.reject([ 'user', 'controller', 1000 ]);
    }

    return userModel.create(values, options);
  }

  find (queries = {}, type = 'all') {
    if (_.isEmpty(queries)) {
      return Promise.reject([ 'user', 'controller', 1001 ]);
    }
    
    return userModel.find(queries, type);
  }

  update (idOrObj, values = {}, options = {}) {
    if (_.isEmpty(idOrObj) || _.isEmpty(values)) {
      return Promise.reject([ 'user', 'controller', 1002 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        let userObj;
        if (_.isString(idOrObj)) {
          userObj = await userModel.find(idOrObj, 'id');
        } else if (_.isObject(idOrObj) && !_.isArray(idOrObj)) {
          userObj = idOrObj;
        }

        if (_.isEmpty(userObj)) {
          return Promise.reject([ 'user', 'controller', 1003 ]);
        }

        const result = await userModel.update(userObj, values, options);
        resolve(result);
      } catch (error) {
        reject([ 'user', 'controller', 1004, error ]);
      }
    });
  }

  remove (idOrObj, options = {}) {
    if (_.isEmpty(idOrObj)) {
      return Promise.reject([ 'user', 'controller', 1005 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        let userObj;
        if (_.isString(idOrObj)) {
          userObj = await userModel.find(idOrObj, 'id');
        } else if (_.isObject(idOrObj) && !_.isArray(idOrObj)) {
          userObj = idOrObj;
        }

        if (_.isEmpty(userObj)) {
          return Promise.reject([ 'user', 'controller', 1006 ]);
        }

        const result = await userModel.remove(userObj, options);
        resolve(result);
      } catch (error) {
        reject([ 'user', 'controller', 1007, error ]);
      }
    });
  }

  getSalt (length = 48, chars = '#aA!') {
    let mask = '', result = '';

    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';

    for (let i = length; i > 0; --i)
      result += mask[Math.round(Math.random() * (mask.length - 1))];
    return result;
  }

  verifyPassword (hashPassword, salt, password) {
    if (_.isEmpty(hashPassword) || _.isEmpty(salt) || _.isEmpty(password)) {
      return Promise.reject([ 'user', 'controller', 1008 ]);
    }

    const validPassword = _.toString(HmacSHA512(password, salt));
    return validPassword === hashPassword;
  }

  verifyToken (token, secret) {
    if (_.isNil(token) || _.isNil(secret)) {
      return { valid: false };
    }
    return { valid: true, data: jwt.verify(token, secret) };
  }

  loginWithPassword (email, password) {
    if (_.isEmpty(email) || _.isEmpty(password)) {
      return Promise.reject([ 'user', 'controller', 1009 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        const userObj = await userModel.find({ where: { email } }, 'one');
        if (_.isEmpty(userObj)) {
          return Promise.reject([ 'user', 'controller', 1010 ]);
        }
        const valid = this.verifyPassword(userObj.password, userObj.salt, password);

        if (valid === true) {
          let result;
          if (_.isNil(userObj.session_token)) {
            result = await this.updateToken(userObj);
          }
          const verifyToken = this.verifyToken(userObj.session_token, userObj.password);
          if (verifyToken.valid === false) {
            result = await this.updateToken(userObj);
          } else if (verifyToken.data.id !== userObj.id) {
            reject([ 'user', 'controller', 1011 ]);
          } else {
            result = await userModel.find(verifyToken.data.id, 'id');
          }
          resolve(result);
        } else {
          reject([ 'user', 'controller', 1012 ]);
        }
      } catch (error) {
        reject([ 'user', 'controller', 1013, error ]);
      }
    });
  }

  loginWithToken (token) {
    return new Promise(async (resolve, reject) => {
      try {
        const userObj = await userModel.find({ where: { session_token: token }, include: [ { model: 'permission' } ] }, 'one');
        const verify = this.verifyToken(userObj.session_token, userObj.password);
        if (verify.valid === false) {
          return reject([ 'user', 'controller', 1014 ]);
        }
        resolve(userObj);
      } catch (error) {
        reject([ 'user', 'controller', 1015, error ]);
      }
    });
  }

  updateToken (userObj) {
    if (_.isEmpty(userObj)) {
      return Promise.reject([ 'user', 'controller', 1016 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        const token = this.getToken({ id: userObj.id }, userObj.password);
        const result = await userModel.update(userObj, { session_token: token });
        resolve(result);
      } catch (error) {
        reject([ 'user', 'controller', 1017, error ]);
      }
    });
  }

  getToken (payload, secret) {
    if (_.isEmpty(payload) || _.isEmpty(secret)) {
      return Promise.reject([ 'user', 'controller', 1018 ]);
    }
    return jwt.sign(payload, secret, { expiresIn: '15d', issuer: 'sample' });
  }
};