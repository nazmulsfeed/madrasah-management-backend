const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Budget extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

Budget.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fiscalYear: {
    type: DataTypes.STRING, // e.g., '2026-2027'
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING, // Usually refers to IncomeCategory or generic string
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  }
}, {
  sequelize,
  modelName: 'Budget',
  tableName: 'budgets',
});

module.exports = Budget;
