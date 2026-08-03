const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Payment extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Payment.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  student: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  invoice: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  method: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'cash',
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  feeMonth: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gatewayCharge: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  advancePaid: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  balanceAfterPayment: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  receivedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fundAccount: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  revenueAccount: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'success',
  },
}, {
  sequelize,
  modelName: 'Payment',
  tableName: 'payments',
});

Payment.associate = function(models) {
};

module.exports = Payment;
