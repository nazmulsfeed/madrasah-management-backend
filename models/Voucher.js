const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Voucher extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Voucher.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  voucherNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  payeeName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  expenseAccount: {
    type: DataTypes.STRING, // Ref Account _id
    allowNull: false,
  },
  fundAccount: {
    type: DataTypes.STRING, // Ref Account _id (Cash/Bank)
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'cash',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  attachment: {
    type: DataTypes.TEXT('long'), // For Base64 images
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'level_1_approved', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  approvalLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0, // 0 = pending, 1 = level 1 approved, 2 = fully approved
  },
  preparedBy: {
    type: DataTypes.STRING, // User _id
    allowNull: true,
  },
  approvedBy: {
    type: DataTypes.STRING, // User _id
    allowNull: true,
  },
  verifiedBy: {
    type: DataTypes.STRING, // User _id
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Voucher',
  tableName: 'vouchers',
});

Voucher.associate = function(models) {
};

module.exports = Voucher;
