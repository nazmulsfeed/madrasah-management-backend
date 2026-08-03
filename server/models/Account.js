const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Account extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Account.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false, // Asset, Liability, Equity, Revenue, Expense
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  }
}, {
  sequelize,
  modelName: 'Account',
  tableName: 'accounts',
});

Account.associate = function(models) {
};

module.exports = Account;
