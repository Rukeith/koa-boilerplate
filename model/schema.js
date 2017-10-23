const validator = require('validator');
const Sequelize = require('sequelize');
const sequelize = require('./init.js'); 

const Nonce = sequelize.define('nonce', {
  id: {
    unique: true,
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    validate: { isUUID: 4, notEmpty: true }
  },
  key: {
    type: Sequelize.STRING,
  },
  nonce: {
    type: Sequelize.STRING,
  },
  action: {
    allowNull: false,
    defaultValue: 'verify-email',
    type: Sequelize.ENUM,
    validate: { notEmpty: true, isLowercase: true },
    values: [ 'forget-password', 'verify-email', 'pass-review', 'unpass-review' ]
  },
  used_at: {
    type: Sequelize.DATE,
    validate: { isDate: true }
  }
}, {
  // add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,

  // support emoji storage
  charset: 'utf8mb4',

  // don't delete database entries but set the newly added attribute deletedAt
  // to the current date (when deletion was done). paranoid will only work if
  // timestamps are enabled
  paranoid: true,

  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true,

  // disable the modification of table names; By default, sequelize will automatically
  // transform all passed model names (first parameter of define) into plural.
  // if you don't want that, set the following
  freezeTableName: true,

  // define the table's name
  tableName: 'nonce',

  // Enable optimistic locking.  When enabled, sequelize will add a version count attribute
  // to the model and throw an OptimisticLockingError error when stale instances are saved.
  // Set to true or a string with the attribute name you want to use to enable.
  version: true
});

const Permission = sequelize.define('permission', {
  id: {
    unique: true,
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    validate: { isUUID: 4, notEmpty: true }
  },
  owner_id: {
    allowNull: false,
    type: Sequelize.UUID,
    validate: { isUUID: 4, notEmpty: true },
    references: { key: 'id', model: 'user' }
  },
  expired_at: {
    allowNull: false,
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  info_unread_message: {
    allowNull: false,
    defaultValue: true,
    type: Sequelize.BOOLEAN,
    validate: { notEmpty: true }
  },
  info_see_profile: {
    allowNull: false,
    defaultValue: true,
    type: Sequelize.BOOLEAN,
    validate: { notEmpty: true }
  },
  warning: {
    allowNull: false,
    defaultValue: false,
    type: Sequelize.BOOLEAN,
    validate: { notEmpty: true }
  },
  under_review: {
    allowNull: false,
    defaultValue: true,
    type: Sequelize.BOOLEAN,
    validate: { notEmpty: true }
  },
  preferneces: {
    allowNull: false,
    type: Sequelize.STRING,
    validate: { notEmpty: true },
    defaultValue: '{"country":"","locality":"","administrative_area_level_1":"","administrative_area_level_2":"","sex":"all","distance":"120m","age":{"max":35,"min":20}}'
  }
}, {
  // add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,

  // don't delete database entries but set the newly added attribute deletedAt
  // to the current date (when deletion was done). paranoid will only work if
  // timestamps are enabled
  paranoid: true,

  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true,

  // disable the modification of table names; By default, sequelize will automatically
  // transform all passed model names (first parameter of define) into plural.
  // if you don't want that, set the following
  freezeTableName: true,

  // define the table's name
  tableName: 'permission',

  // Enable optimistic locking.  When enabled, sequelize will add a version count attribute
  // to the model and throw an OptimisticLockingError error when stale instances are saved.
  // Set to true or a string with the attribute name you want to use to enable.
  version: true
});

const User = sequelize.define('user', {
  id: {
    unique: true,
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    validate: { isUUID: 4, notEmpty: true }
  },
  email: {
    type: Sequelize.STRING(50),
    validate: { isLowercase: true, isEmail: true, notEmpty: true }
  },
  email_verified: {
    defaultValue: false,
    type: Sequelize.BOOLEAN
  },
  password: {
    allowNull: false,
    type: Sequelize.STRING,
    validate: { notEmpty: true }
  },
  salt: {
    allowNull: false,
    type: Sequelize.STRING,
    validate: { notEmpty: true }
  },
  session_token: {
    defaultValue: null,
    type: Sequelize.STRING
  },
  introduction: { type: Sequelize.STRING },
  display_name: { type: Sequelize.STRING },
  phone: {
    type: Sequelize.INTEGER,
    validate: {
      isInt: true,
      isPhone(value) {
        const check = validator.isMobilePhone(value);
        if (!check) {
          throw new Error('Phone number is invalid !');
        }
      }
    }
  },
  phone_verified: {
    defaultValue: false,
    type: Sequelize.BOOLEAN
  },
  stripe_customer_id: {
    unique: true,
    type: Sequelize.CHAR(20)
  },
  country: {
    type: Sequelize.CHAR(3),
    validate: { isUppercase: true }
  },
  locality: { type: Sequelize.STRING },
  administrative_area_level_1: { type: Sequelize.STRING },
  administrative_area_level_2: { type: Sequelize.STRING },
  geometry: {
    allowNull: false,
    type: Sequelize.GEOMETRY
  },
  birth: {
    allowNull: false,
    type: Sequelize.STRING,
    validate: { notEmpty: true }
  },
  age: {
    allowNull: false,
    defaultValue: 18,
    type: Sequelize.INTEGER(2),
    validate: { notEmpty: true, isInt: true, isNumeric: true, max: 80, min: 18 }
  },
  sex: {
    allowNull: false,
    defaultValue: 'male',
    type: Sequelize.ENUM,
    values: [ 'male', 'female' ],
    validate: { notEmpty: true, isLowercase: true }
  },
  role: {
    allowNull: false,
    defaultValue: 'baby',
    type: Sequelize.ENUM,
    values: [ 'baby', 'daddy', 'admin' ],
    validate: { notEmpty: true, isLowercase: true }
  },
  candy: {
    defaultValue: 0,
    allowNull: false,
    type: Sequelize.INTEGER,
    validate: { notEmpty: true, isInt: true, isNumeric: true, min: 0 }
  },
  body_type: {
    allowNull: false,
    defaultValue: 'Fit',
    type: Sequelize.ENUM,
    validate: { notEmpty: true },
    values: [ 'Slim', 'Fit', 'Muscular', 'Average', 'A Few Extra Pounds', 'Curvy', 'Full Figured' ]
  },
  height: {
    type: Sequelize.FLOAT(4),
    validate: { isFloat: true }
  },
  height_unit: {
    type: Sequelize.ENUM,
    values: [ 'ft', 'in', 'cm' ],
    validate: { isLowercase: true }
  },
  education: {
    type: Sequelize.ENUM,
    values: [ 'High School', 'Some College', 'Associates Degree', 'Bachelors Degree', 'Graduate Degree', 'PhD/ Post Doctoral' ]
  },
  annual_income: {
    defaultValue: 0,
    validate: { isFloat: true },
    type: Sequelize.FLOAT(12, 2)
  },
  annual_income_currency: {
    defaultValue: 'USD',
    type: Sequelize.CHAR(3),
    validate: { isUppercase: true }
  },
  net_worth: {
    defaultValue: 0,
    validate: { isFloat: true },
    type: Sequelize.FLOAT(12, 2)
  },
  net_worth_currency: {
    defaultValue: 'USD',
    type: Sequelize.CHAR(3),
    validate: { isUppercase: true }
  },
  budget_expectation: {
    defaultValue: 0,
    validate: { isFloat: true },
    type: Sequelize.FLOAT(12, 2)
  },
  budget_expectation_currency: {
    defaultValue: 'USD',
    type: Sequelize.CHAR(3),
    validate: { isUppercase: true }
  },
  relationship: {
    allowNull: false,
    type: Sequelize.ENUM,
    defaultValue: 'Single',
    validate: { notEmpty: true },
    values: [ 'Single', 'Divorced', 'Separated', 'Married But Looking', 'Open Relationship', 'Widowed' ]
  },
  ethnicity: {
    allowNull: false,
    type: Sequelize.ENUM,
    defaultValue: 'Other',
    validate: { notEmpty: true },
    values: [ 'Asian', 'Black/ African Descent ', 'Latin/ Hispanic', 'East Indian', 'Middle Eastern', 'Mixed', 'Native American', 'Pacific Islander', 'White/ Caucasian', 'Other' ]
  },
  smoke: {
    allowNull: false,
    type: Sequelize.ENUM,
    defaultValue: 'Non Smoker',
    validate: { notEmpty: true },
    values: [ 'Non Smoker', 'Light Smoker', 'Heavy Smoker' ]
  },
  drink: {
    allowNull: false,
    type: Sequelize.ENUM,
    defaultValue: 'Non Drinker',
    validate: { notEmpty: true },
    values: [ 'Non Drinker', 'Social Drinker', 'Heavy Drinker' ]
  },
  nationality: { type: Sequelize.STRING },
  occupation: { type: Sequelize.STRING }
}, {
  // add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,

  // support emoji storage
  charset: 'utf8mb4',

  // don't delete database entries but set the newly added attribute deletedAt
  // to the current date (when deletion was done). paranoid will only work if
  // timestamps are enabled
  paranoid: true,

  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true,

  // disable the modification of table names; By default, sequelize will automatically
  // transform all passed model names (first parameter of define) into plural.
  // if you don't want that, set the following
  freezeTableName: true,

  // define the table's name
  tableName: 'user',

  // Enable optimistic locking.  When enabled, sequelize will add a version count attribute
  // to the model and throw an OptimisticLockingError error when stale instances are saved.
  // Set to true or a string with the attribute name you want to use to enable.
  version: true
});

User.hasOne(Permission, { foreignKey: 'owner_id' });
Permission.belongsTo(User, { foreignKey: 'owner_id' });

module.exports = {
  Nonce,
  Permission,
  User
};