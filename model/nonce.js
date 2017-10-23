const _ = require('lodash');
const { Nonce } = require('./schema.js');
const { replaceIncludeModel } = require('./common.js');

module.exports = class NonceModel {
  create (values = {}, options = {}) {
    if (_.isEmpty(values)) {
      return Promise.reject([ 'nonce', 'model', 1000 ]);
    }

    if (_.isEmpty(options)) {
      return Nonce.create(values);
    } else {
      return Nonce.create(values, options);
    }
  }

  find (queries = {}, type = 'all') {
    if (_.isEmpty(queries)) {
      return Promise.reject([ 'nonce', 'model', 1001 ]);
    }

    if (_.has(queries, 'include')) {
      queries.include = replaceIncludeModel(queries.include);
    }
    
    let promise;
    switch (type) {
      case 'fac':
        promise = Nonce.findAndCountAll(queries);
        break;
      case 'id':
        promise = Nonce.findById(queries);
        break;
      case 'one':
        promise = Nonce.findOne(queries);
        break;
      case 'foc':
        promise = Nonce.findOrCreate(queries);
        break;
      case 'max':
        promise = Nonce.max(queries);
        break;
      case 'min':
        promise = Nonce.min(queries);
        break;
      case 'sum':
        promise = Nonce.sum(queries);
        break;
      case 'count':
        promise = Nonce.count(queries);
        break;
      case 'all':
      default:
        promise = Nonce.findAll(queries);
        break;
    }

    return promise;
  }

  update (obj, values = {}, options = {}) {
    if (_.isEmpty(obj) || _.isEmpty(values)) {
      return Promise.reject([ 'nonce', 'model', 1002 ]);
    }

    if (_.isEmpty(options)) {
      return obj.update(values);
    } else {
      return obj.update(values, options);
    }
  }

  remove (obj, options = {}) {
    if (_.isEmpty(obj)) {
      return Promise.reject([ 'nonce', 'model', 1003 ]);
    }

    if (_.isEmpty(options)) {
      return obj.destroy(options);
    } else {
      return obj.destroy();
    }
  }
};