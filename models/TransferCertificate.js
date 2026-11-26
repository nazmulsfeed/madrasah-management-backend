const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class TransferCertificate extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

TransferCertificate.init({
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
  serialNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isTaken: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  takenAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  leaveDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resultStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'উত্তীর্ণ হইয়াছে',
  },
  promotedClass: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  duePaidYear: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  reasons: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  customData: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  issuedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'TransferCertificate',
  tableName: 'transfer_certificates',
  indexes: [
    {
      unique: true,
      fields: ['institution', 'student'],
    },
    {
      fields: ['institution', 'serialNumber'],
    },
  ],
});

module.exports = TransferCertificate;
