const Sequelize = require('sequelize');
const config = require('../config.js');
const sequelize = new Sequelize(config.mysqlName, config.mysqlUsername, config.mysqlPassword, config.mysqlOptions);
sequelize
  .authenticate()
  .then(async () => {
    // const Model = require('./schema.js');
    // await Model.Nonce.sync({ force: true });
    // await Model.User.sync({ force: true });
    // await Model.Permission.sync({ force: true });
    console.info('Connection has been established successfully.');
  })
  .catch(error => {
    console.error('Unable to connect to the database:', error);
  });

module.exports = sequelize;