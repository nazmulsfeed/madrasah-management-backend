const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class MealRoutine extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

MealRoutine.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dayOfWeek: {
    type: DataTypes.STRING,
    allowNull: false, // 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
  },
  breakfast: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  lunch: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  snacks: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  dinner: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  specialNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'MealRoutine',
  tableName: 'meal_routines',
  timestamps: true,
});

MealRoutine.associate = function(models) {
};

module.exports = MealRoutine;
