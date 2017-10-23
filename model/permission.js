const _ = require('lodash');
const { Permission } = require('./schema.js');
const { replaceIncludeModel } = require('./common.js');

module.exports = class PermissionModel {
  create (values = {}, options = {}) {
    if (_.isEmpty(values)) {
      return Promise.reject([ 'permission', 'model', 1000 ]);
    }

    if (_.isEmpty(options)) {
      return Permission.create(values);
    } else {
      return Permission.create(values, options);
    }
  }

  find (queries = {}, type = 'all') {
    if (_.isEmpty(queries)) {
      return Promise.reject([ 'permission', 'model', 1001 ]);
    }

    if (_.has(queries, 'include')) {
      queries.include = replaceIncludeModel(queries.include);
    }
    
    let promise;
    switch (type) {
      case 'fac':
        promise = Permission.findAndCountAll(queries);
        break;
      case 'id':
        promise = Permission.findById(queries);
        break;
      case 'one':
        promise = Permission.findOne(queries);
        break;
      case 'foc':
        promise = Permission.findOrCreate(queries);
        break;
      case 'max':
        promise = Permission.max(queries);
        break;
      case 'min':
        promise = Permission.min(queries);
        break;
      case 'sum':
        promise = Permission.sum(queries);
        break;
      case 'count':
        promise = Permission.count(queries);
        break;
      case 'all':
      default:
        promise = Permission.findAll(queries);
        break;
    }

    return promise;
  }

  update (obj, values = {}, options = {}) {
    if (_.isEmpty(obj) || _.isEmpty(values)) {
      return Promise.reject([ 'permission', 'model', 1002 ]);
    }

    if (_.isEmpty(options)) {
      return obj.update(values);
    } else {
      return obj.update(values, options);
    }
  }

  remove (obj, options = {}) {
    if (_.isEmpty(obj)) {
      return Promise.reject([ 'permission', 'model', 1003 ]);
    }

    if (_.isEmpty(options)) {
      return obj.destroy(options);
    } else {
      return obj.destroy();
    }
  }
};