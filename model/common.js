const _ = require('lodash');
const schema = require('./schema.js');
const Nonce = schema.Nonce;
const Permission = schema.Permission;
const User = schema.User;

const replaceIncludeModel = (includeList) => {
  const includes = [];

  _.forEach(includeList, value => {
    let model;
    switch (value.model) {
      case 'nonce':
        model = Nonce;
        break;
      case 'permission':
        model = Permission;
        break;
      case 'user':
        model = User;
        break;
    }

    const _value = _.cloneDeep(value);
    _value.model = model;
    if (_.has(value, 'include')) {
      _value.include = replaceIncludeModel(value.include);
    }
    includes.push(_value);
  });

  return includes;
};

module.exports = {
  replaceIncludeModel
};