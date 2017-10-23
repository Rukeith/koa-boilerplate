const _ = require('lodash');
const sgMail = require('@sendgrid/mail');
const config = require('../config.js');
sgMail.setApiKey(config.sendgridApiKey);

const fromEmailList = {
  welcome: {
    from: {
      name: 'Admin',
      email: 'your@email.com'
    },
    subject: 'Welcome',
    categories: [ 'welcome' ],
    templateId: 'xxxx'
  },
  verifyEmail: {
    from: {
      name: 'Admin',
      email: 'your@email.com'
    },
    subject: 'Email verification',
    categories: [ 'verification', 'email' ],
    templateId: 'xxxx'
  }
};

module.exports = {
  /**
   * @function send
   * @desc Send email by sendgrid, see more detail https://github.com/sendgrid/sendgrid-nodejs/blob/master/packages/mail/USE_CASES.md
   * @param @requires {Boolean} isMultiple - 是否要分別寄送給不同信箱，預設 false
   * @param @requires {String} type - 這個信是哪個種類，ex：welcome、notification
   * @param @requires {Object} options - The parameters to send email
   * @param @requires {Object[]} options.to - 信件要寄送給哪個信箱
   * @param @requires {String} options.to[].name - 收信者的名字
   * @param @requires {String} options.to[].email - 收信者的信箱
   * @param @requires {Object} options.substitutions - 要替換的資料
   * @returns {String} Send email promise
   */
  send: (options = {}, type, isMultiple = false) => {
    /* istanbul ignore next */
    if (_.isEmpty(options) || _.isEmpty(type)) {
      return Promise.reject([ 'sendgrid', 'lib', 1000 ]);
    }

    if (!_.has(fromEmailList, type)) {
      return Promise.reject([ 'sendgrid', 'lib', 1001 ]);
    }

    options = _.merge(fromEmailList[type], options);
    if (isMultiple) {
      return sgMail.sendMultiple(options);
    } else {
      return sgMail.send(options);
    }
  }
};
