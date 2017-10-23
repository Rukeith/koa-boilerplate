const _ = require('lodash');
const env = process.env.NODE_ENV;
const basic = {
  port: process.env.PORT || 5000
};

let envConfig;
switch (env) {
  case 'production':
  case 'development':
  default:
    envConfig = {
      backendUrl: 'your site',
      frontendUrl: 'your site',
      firebaseKeyFile: '/path/file',
      firebaseProjectId: 'project-id',
      sendgridApiKey: 'xxxxxxx',
      sentryKey: 'xxxxx',
      stripeKey: 'xxxxx',
      mysqlName: 'root',
      mysqlUsername: 'root',
      mysqlPassword: '',
      mysqlOptions: {
        // logging: console.log,
        host: '127.0.0.1',
        port: '3306',
        dialect: 'mysql'
      }
    };
    break;
}

const config = _.merge(basic, envConfig);
console.info('env =', env);
console.info('config =', config);
module.exports = config;
