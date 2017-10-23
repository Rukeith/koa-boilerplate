const _ = require('lodash');
const CryptoJS = require('crypto-js');
const nonceHandler = require('node-timednonce');
const NonceModel = require('../model/nonce.js');
const nonceModel = new NonceModel();

module.exports = class NonceController {
  create (values = {}, options = {}) {
    if (_.isEmpty(values)) {
      return Promise.reject([ 'nonce', 'controller', 1000 ]);
    }

    return nonceModel.create(values, options);
  }

  createNonce (userId, type = 'verify-email') {
    if (_.isEmpty(userId) || _.isEmpty(type)) {
      return Promise.reject([ 'nonce', 'controller', 1001 ]);
    }

    const options = { action: type };
    switch(type) {
      case 'verify-email':
        options.key = userId;
        options.nonce = nonceHandler.create(userId, 900); // 15 分鐘
        break;
      case 'pass-review':
        options.key = `pass-${userId}-${new Date().getTime()}`;
        options.nonce = _.replace(_.toString(CryptoJS.AES.encrypt(userId, options.key)), '/', '_');
        options.nonce = _.replace(options.nonce, '+', '^');
        break;
      case 'unpass-review':
        options.key = `unpass-${userId}-${new Date().getTime()}`;
        options.nonce = _.replace(_.toString(CryptoJS.AES.encrypt(userId, options.key)), '/', '_');
        options.nonce = _.replace(options.nonce, '+', '^');
        break;
      case 'forget-password':
        options.key = `forget-password-${userId}-${new Date().getTime()}`;
        options.nonce = _.replace(_.toString(CryptoJS.AES.encrypt(userId, options.key)), '/', '_');
        options.nonce = _.replace(options.nonce, '+', '^');
        break;
    }
    return options;
  }

  verify (nonce, type = 'verify-email') {
    if (_.isEmpty(nonce) || _.isEmpty(type)) {
      return Promise.reject([ 'nonce', 'controller', 1002 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        const nonceObj = await nonceModel.find({ where: { nonce } }, 'one');
        if (_.isEmpty(nonceObj)) {
          return reject([ 'nonce', 'controller', 1003 ]);
        }
        if (!_.isEmpty(nonceObj.used_at)) {
          return reject([ 'nonce', 'controller', 1004 ]);
        }

        let valid, userId;
        switch(type) {
          case 'verify-email':
            valid = nonceHandler.verify(nonceObj.key, nonce);
            userId = nonceObj.key;
            break;
          case 'forget-password':
          case 'review':
            nonce = _.replace(nonce, '_', '/');
            nonce = _.replace(nonce, '^', '+');
            const bytes  = CryptoJS.AES.decrypt(nonce, nonceObj.key);
            const decrypt = bytes.toString(CryptoJS.enc.Utf8);
            const re = new RegExp(decrypt);
            userId = decrypt;
            valid = (re.test(nonceObj.key));
            break;
        }
        resolve({ valid, userId, nonce: nonceObj });
      } catch (error) {
        reject([ 'nonce', 'controller', 1005, error ]);
      }
    });
  }

  find (queries = {}, type = 'all') {
    if (_.isEmpty(queries)) {
      return Promise.reject([ 'nonce', 'controller', 1006 ]);
    }
    
    return nonceModel.find(queries, type);
  }

  update (idOrObj, values = {}, options = {}) {
    if (_.isEmpty(idOrObj) || _.isEmpty(values)) {
      return Promise.reject([ 'nonce', 'controller', 1007 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        let nonceObj;
        if (_.isString(idOrObj)) {
          nonceObj = await nonceModel.find(idOrObj, 'id');
        } else if (_.isObject(idOrObj) && !_.isArray(idOrObj)) {
          nonceObj = idOrObj;
        }

        if (_.isEmpty(nonceObj)) {
          return Promise.reject([ 'nonce', 'controller', 1008 ]);
        }

        const result = await nonceModel.update(nonceObj, values, options);
        resolve(result);
      } catch (error) {
        reject([ 'nonce', 'controller', 1009, error ]);
      }
    });
  }

  remove (idOrObj, options = {}) {
    if (_.isEmpty(idOrObj)) {
      return Promise.reject([ 'nonce', 'controller', 1010 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        let nonceObj;
        if (_.isString(idOrObj)) {
          nonceObj = await nonceModel.find(idOrObj, 'id');
        } else if (_.isObject(idOrObj) && !_.isArray(idOrObj)) {
          nonceObj = idOrObj;
        }

        if (_.isEmpty(nonceObj)) {
          return Promise.reject([ 'nonce', 'controller', 1011 ]);
        }

        const result = await nonceModel.remove(nonceObj, options);
        resolve(result);
      } catch (error) {
        reject([ 'nonce', 'controller', 1012, error ]);
      }
    });
  }
};