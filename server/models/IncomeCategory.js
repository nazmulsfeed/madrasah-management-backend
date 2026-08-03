const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class IncomeCategory extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

IncomeCategory.init({
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
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'other', // student_fee, donation, other
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'IncomeCategory',
  tableName: 'income_categories',
});

IncomeCategory.associate = function(models) {
};

module.exports = IncomeCategory;
