const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QurbaniSkin = sequelize.define('QurbaniSkin', {
  _id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  donorName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  donorPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  donorAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  animalType: {
    type: DataTypes.ENUM('cow', 'goat', 'sheep', 'buffalo', 'other'),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  condition: {
    type: DataTypes.STRING, // e.g. good, damaged
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('collected', 'processing', 'sold'),
    defaultValue: 'collected',
  },
  soldAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  soldDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  buyerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fundAccount: {
    type: DataTypes.STRING, // Lillah, Yatim etc. where money is deposited
    allowNull: true,
  }
}, {
  tableName: 'qurbani_skins',
  timestamps: true,
});

module.exports = QurbaniSkin;
