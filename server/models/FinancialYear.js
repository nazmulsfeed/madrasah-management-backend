const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class FinancialYear extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

FinancialYear.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  yearName: {
    type: DataTypes.STRING, // e.g., '2026-2027'
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'closed'),
    allowNull: false,
    defaultValue: 'active',
  }
}, {
  sequelize,
  modelName: 'FinancialYear',
  tableName: 'financial_years',
});

module.exports = FinancialYear;
