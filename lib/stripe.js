const _ = require('lodash');
const env = require('../config.js');
const stripe = require('stripe')(env.stripeKey);

module.exports = {
  /**
   *
   * Create stripe customer
   * @desc See more details https://stripe.com/docs/api/node#create_customer
   * @param {Object} options - The stripe customer parameters
   * @param @requires {String} options.email - This customer's email address
   * @param {String} options.description - This customer's description
   * @param {String} options.metadata
   **/
  createCustomer: (options = {}) => {
    if (_.isEmpty(options)) {
      return Promise.reject([ 'stripe', 'lib', 1000 ]);
    }
    return stripe.customers.create(options);
  },

  /**
   * Get stripe customer
   * @param @requires {String} customerId - Stripe customer's id
   **/
  getCustomer: (customerId) => {
    if (_.isEmpty(customerId)) {
      return Promise.reject([ 'stripe', 'lib', 1001 ]);
    }
    return stripe.customers.retrieve(customerId);
  },

  /**
   * Update stripe customer
   * @param @requires {String} customerId - Stripe customer's id
   * @param {Object} options - The stripe customer parameters
   * @param @requires {String} options.email - This customer's email address
   * @param {String} options.description - This customer's description
   * @param {String} options.metadata
   **/
  updateCustomer: (customerId, options = {}) => {
    if (_.isEmpty(customerId) || _.isEmpty(options)) {
      return Promise.reject([ 'stripe', 'lib', 1002 ]);
    }
    return stripe.customers.update(customerId, options);
  },

  /**
   * Delete stripe customer
   * @param @requires {String} customerId - Stripe customer's id
   **/
  removeCustomer: (customerId) => {
    if (_.isEmpty(customerId)) {
      return Promise.reject([ 'stripe', 'lib', 1003 ]);
    }
    return stripe.customers.del(customerId);
  },

  createCharge: (options = {}) => {
    if (_.isEmpty(options)) {
      return Promise.reject([ 'stripe', 'lib', 1004 ]);
    }
    return stripe.charges.create(options);
  },

  /**
   * Create token
   * @desc Tokenization is the process Stripe uses to collect sensitive card
   *  or bank account details, or personally identifiable information (PII),
   *  directly from your customers in a secure manner.
   * @param @requires {String} type - card, bank_account and pii
   * @param @requires {Object} options - The parameters to create token
   **/
  createToken: (type = 'card', options = {}) => {
    if (type !== 'card' && type !== 'bank_account' && type !== 'pii') {
      return Promise.reject([ 'stripe', 'lib', 1005 ]);
    }
    if (_.isEmpty(options)) {
      return Promise.reject([ 'stripe', 'lib', 1006 ]);
    }

    let params = {};
    switch (type) {
      case 'bank_account':
        params.bank_account = options;
        break;
      case 'pii':
        params.pii = options;
        break;
      case 'card':
      default:
        params.card = options;
        break;
    }

    return stripe.tokens.create(params);
  },

  /**
   * Get token
   * @desc Tokenization is the process Stripe uses to collect sensitive card
   *  or bank account details, or personally identifiable information (PII),
   *  directly from your customers in a secure manner.
   * @param @requires {String} type - card, bank_account and pii
   * @param @requires {Object} options - The parameters to create token
   **/
  getToken: (token) => {
    if (_.isEmpty(token)) {
      return Promise.reject([ 'stripe', 'lib', 1007 ]);
    }
    return stripe.tokens.retrieve(token);
  },

  /**
   * Create source
   * @desc Use createToken first, createSource to create sourceId
   * @param @requires {String} customerId - Stripe customer id
   * @param @requires {String} type - card, bank_account and pii
   * @param @requires {Object} options - The parameters to create token
   **/
  createSource: (customerId, type = 'card', options = {}) => {
    if (_.isEmpty(customerId)) {
      return Promise.reject([ 'stripe', 'lib', 1008 ]);
    }
    if (type !== 'card' && type !== 'bank_account' && type !== 'pii') {
      return Promise.reject([ 'stripe', 'lib', 1009 ]);
    }
    if (_.isEmpty(options)) {
      return Promise.reject([ 'stripe', 'lib', 1010 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        let card;
        if (type === 'card') {
          const { exp_month, exp_year, cvc, number } = options;
          if (_.isEmpty(exp_month) || _.isEmpty(exp_year) || _.isEmpty(cvc) || _.isEmpty(number)) {
            return reject([ 'stripe', 'lib', 1011 ]);
          }

          card = await stripe.customers.createSource(customerId, { source: { object: 'card', cvc, number, exp_year, exp_month, default_for_currency: true }});
        } else {
          const token = await this.createToken(type, options);
          if (_.isEmpty(token)) {
            return reject([ 'stripe', 'lib', 1012 ]);
          }
          card = await stripe.customers.createSource(customerId, { source: token.id });
        }

        if (_.isEmpty(card)) {
          return reject([ 'stripe', 'lib', 1013 ]);
        }
        resolve(card);
      } catch (error) {
        reject([ 'stripe', 'lib', 1014, error ]);
      }
    });
  },

  /**
   * Get card
   * @desc Get customer's card information
   * @param @requires {String} customerId - Stripe customer id
   * @param @requires {String} cardId - Stripe card id
   **/
  getCard: (customerId, cardId) => {
    if (_.isEmpty(customerId) || _.isEmpty(cardId)) {
      return Promise.reject([ 'stripe', 'lib', 1015 ]);
    }
    return stripe.customers.retrieveCard(customerId, cardId);
  },

  /**
   * Delete card
   * @desc Delete customer's card
   * @param @requires {String} customerId - Stripe customer id
   * @param @requires {String} cardId - Stripe card id
   **/
  removeCard: (customerId, cardId) => {
    if (_.isEmpty(customerId) || _.isEmpty(cardId)) {
      return Promise.reject([ 'stripe', 'lib', 1016 ]);
    }
    return stripe.customers.deleteCard(customerId, cardId);
  },

  /**
   * Resend charge receipt
   * @desc Resend receipt by replace email
   * @param @requires {String} email - The receipt want to send to which email
   * @param @requires {String} customerId - Stripe customer id
   * @param @requires {String} chargeId - Stripe charge id
   **/
  resendReceipt: (email, customerId, chargeId) => {
    if (_.isEmpty(email) || _.isEmpty(customerId) || _.isEmpty(chargeId)) {
      return Promise.reject([ 'stripe', 'lib', 1017 ]);
    }

    return new Promise(async (resolve, reject) => {
      try {
        // 需要更改 email 才會重新寄發，所以先改成 null 再改回來
        await stripe.charges.update(chargeId, { receipt_email: null });
        const result = await stripe.charges.update(chargeId, { receipt_email: email });
        resolve(result);
      } catch (error) {
        reject([ 'stripe', 'lib', 1018, error ]);
      }
    });
  },

  getInvoices: (options) => {
    if (_.isEmpty(options)) {
      return Promise.reject([ 'stripe', 'lib', 1019 ]);
    }

    return stripe.charges.list(options);
  }
};
