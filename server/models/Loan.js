const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Loan extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

Loan.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('given', 'taken'), // given = loan given to staff, taken = loan taken from others
    allowNull: false,
  },
  personName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  remainingBalance: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'paid'),
    allowNull: false,
    defaultValue: 'active',
  }
}, {
  sequelize,
  modelName: 'Loan',
  tableName: 'loans',
});

module.exports = Loan;
