const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class ClassLevel extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

ClassLevel.init({
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
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  educationStream: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'general',
  },
  monthlyFee: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  admissionFee: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  sessionFee: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  examFee: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'ClassLevel',
  tableName: 'classlevels',
});

ClassLevel.associate = function(models) {
};

module.exports = ClassLevel;
