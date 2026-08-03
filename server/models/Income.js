const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Income extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Income.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING, // Reference to IncomeCategory _id
    allowNull: false,
  },
  fundAccount: {
    type: DataTypes.STRING, // Reference to Account _id
    allowNull: true,
  },
  revenueAccount: {
    type: DataTypes.STRING, // Reference to Account _id
    allowNull: true,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  donorName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  donorPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'cash',
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  receivedBy: {
    type: DataTypes.STRING, // User _id
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'pending',
  },
  approvedBy: {
    type: DataTypes.STRING, // User _id
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Income',
  tableName: 'incomes',
});

Income.associate = function(models) {
};

module.exports = Income;
