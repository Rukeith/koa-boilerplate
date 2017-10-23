const _ = require('lodash');
const PermissionModel = require('../model/permission.js');
const permissionModel = new PermissionModel();

module.exports = class PermissionController {
  create (values = {}, options = {}) {
    if (_.isEmpty(values)) {
      return Promise.reject([ 'permission', 'controller', 1000 ]);
    }

    return permissionModel.create(values, options);
  }

  find (queries = {}, type = 'all') {
    if (_.isEmpty(queries)) {
      return Promise.reject([ 'permission', 'controller', 1001 ]);
    }
    
    return permissionModel.find(queries, type);
  }

  update (idOrObj, values = {}, options = {}) {
    if (_.isEmpty(idOrObj) || _.isEmpty(values)) {
      return Promise.reject([ 'permission', 'controller', 1002 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        let permissionObj;
        if (_.isString(idOrObj)) {
          permissionObj = await permissionModel.find(idOrObj, 'id');
        } else if (_.isObject(idOrObj) && !_.isArray(idOrObj)) {
          permissionObj = idOrObj;
        }

        if (_.isEmpty(permissionObj)) {
          return Promise.reject([ 'permission', 'controller', 1003 ]);
        }

        const result = await permissionModel.update(permissionObj, values, options);
        resolve(result);
      } catch (error) {
        reject([ 'permission', 'controller', 1004, error ]);
      }
    });
  }

  remove (idOrObj, options = {}) {
    if (_.isEmpty(idOrObj)) {
      return Promise.reject([ 'permission', 'controller', 1005 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        let permissionObj;
        if (_.isString(idOrObj)) {
          permissionObj = await permissionModel.find(idOrObj, 'id');
        } else if (_.isObject(idOrObj) && !_.isArray(idOrObj)) {
          permissionObj = idOrObj;
        }

        if (_.isEmpty(permissionObj)) {
          return Promise.reject([ 'permission', 'controller', 1006 ]);
        }

        const result = await permissionModel.remove(permissionObj, options);
        resolve(result);
      } catch (error) {
        reject([ 'permission', 'controller', 1007, error ]);
      }
    });
  }
};