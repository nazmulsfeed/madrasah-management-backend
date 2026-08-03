const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Invoice extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Invoice.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  student: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  feeCategory: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  discountTotal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  discountType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fineTotal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  payableTotal: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  paidTotal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  balance: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'unpaid',
  },
}, {
  sequelize,
  modelName: 'Invoice',
  tableName: 'invoices',
});

Invoice.associate = function(models) {
};

module.exports = Invoice;
