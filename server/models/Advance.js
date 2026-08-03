const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Advance extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

Advance.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  personType: {
    type: DataTypes.ENUM('staff', 'student', 'other'),
    allowNull: false,
  },
  personName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  adjustedAmount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('pending', 'partially_adjusted', 'adjusted'),
    allowNull: false,
    defaultValue: 'pending',
  }
}, {
  sequelize,
  modelName: 'Advance',
  tableName: 'advances',
});

module.exports = Advance;
