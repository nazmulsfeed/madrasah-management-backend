const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class SalaryPayment extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

SalaryPayment.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  month: {
    type: DataTypes.STRING, // Format: YYYY-MM
    allowNull: false,
  },
  staffId: {
    type: DataTypes.STRING, // User _id or Teacher _id
    allowNull: false,
  },
  teacherId: {
    type: DataTypes.STRING, // Optional Teacher _id
    allowNull: true,
  },
  staffName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'স্টাফ',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  userType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'teacher',
  },

  // Base Salary
  baseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },

  // Allowances (ভাতা সমূহ)
  houseRent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  medicalAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  transportAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  festivalBonus: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  specialAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  totalAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },

  // Deductions (কর্তন সমূহ)
  absentDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  absentDeduction: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  advanceDeduction: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  advanceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  providentFund: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  otherDeduction: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  totalDeduction: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },

  // Net Calculation (নিট প্রদেয় বেতন)
  netSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },

  // Payment Status & Details
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  dueAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
    defaultValue: 'unpaid',
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'cash',
  },
  fundAccountId: {
    type: DataTypes.STRING, // Ref to Account _id
    allowNull: true,
  },
  voucherId: {
    type: DataTypes.STRING, // Ref to Voucher _id
    allowNull: true,
  },
  voucherNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  disbursedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'SalaryPayment',
  tableName: 'salary_payments',
  indexes: [
    { fields: ['institution', 'month'] },
    { fields: ['staffId', 'month'] },
  ],
});

module.exports = SalaryPayment;
