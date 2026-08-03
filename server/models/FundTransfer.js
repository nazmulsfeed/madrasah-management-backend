const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FundTransfer = sequelize.define('FundTransfer', {
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
  fromFund: {
    type: DataTypes.STRING, // Sub-account or Category (e.g., Zakat, Lillah)
    allowNull: false,
  },
  toFund: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  approvedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'fund_transfers',
  timestamps: true,
});

module.exports = FundTransfer;
