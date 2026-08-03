const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Refund extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

Refund.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  personName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  originalPaymentRef: {
    type: DataTypes.STRING,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed'),
    allowNull: false,
    defaultValue: 'completed',
  }
}, {
  sequelize,
  modelName: 'Refund',
  tableName: 'refunds',
});

module.exports = Refund;
