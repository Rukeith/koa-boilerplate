const _ = require('lodash');
const { User } = require('./schema.js');
const { replaceIncludeModel } = require('./common.js');

module.exports = class UserModel {
  create (values = {}, options = {}) {
    if (_.isEmpty(values)) {
      return Promise.reject([ 'user', 'model', 1000 ]);
    }

    if (_.isEmpty(options)) {
      return User.create(values);
    } else {
      return User.create(values, options);
    }
  }

  find (queries = {}, type = 'all') {
    if (_.isEmpty(queries)) {
      return Promise.reject([ 'user', 'model', 1001 ]);
    }

    if (_.has(queries, 'include')) {
      queries.include = replaceIncludeModel(queries.include);
    }

    let promise;
    switch (type) {
      case 'fac':
        promise = User.findAndCountAll(queries);
        break;
      case 'id':
        promise = User.findById(queries);
        break;
      case 'one':
        promise = User.findOne(queries);
        break;
      case 'foc':
        promise = User.findOrCreate(queries);
        break;
      case 'max':
        promise = User.max(queries);
        break;
      case 'min':
        promise = User.min(queries);
        break;
      case 'sum':
        promise = User.sum(queries);
        break;
      case 'count':
        promise = User.count(queries);
        break;
      case 'all':
      default:
        promise = User.findAll(queries);
        break;
    }

    return promise;
  }

  update (obj, values = {}, options = {}) {
    if (_.isEmpty(obj) || _.isEmpty(values)) {
      return Promise.reject([ 'user', 'model', 1002 ]);
    }

    if (_.isEmpty(options)) {
      return obj.update(values);
    } else {
      return obj.update(values, options);
    }
  }

  remove (obj, options = {}) {
    if (_.isEmpty(obj)) {
      return Promise.reject([ 'user', 'model', 1003 ]);
    }

    if (_.isEmpty(options)) {
      return obj.destroy(options);
    } else {
      return obj.destroy();
    }
  }
};