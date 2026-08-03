const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Asset extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

Asset.init({
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
  purchaseDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  cost: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  depreciationRate: {
    type: DataTypes.FLOAT, // e.g. 10 for 10%
    allowNull: false,
    defaultValue: 0,
  },
  currentValue: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  }
}, {
  sequelize,
  modelName: 'Asset',
  tableName: 'assets',
});

module.exports = Asset;
