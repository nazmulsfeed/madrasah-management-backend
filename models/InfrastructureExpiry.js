/**
 * ডোমেইন ও হোস্টিংয়ের মেয়াদ (InfrastructureExpiry) সংরক্ষণের মডেল।
 * শুধুমাত্র super_admin এই তথ্য দেখতে, এডিট করতে ও ৩০/৭/১ দিন আগে স্বয়ংক্রিয় নোটিফিকেশন পাবেন।
 */
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class InfrastructureExpiry extends Model {}

InfrastructureExpiry.init(
  {
    institution: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    serviceType: {
      type: DataTypes.ENUM('domain', 'hosting'),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notifiedMilestones: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'InfrastructureExpiry',
    tableName: 'infrastructure_expiries',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['institution', 'serviceType'],
        name: 'infrastructure_expiries_unique_idx',
      },
    ],
  }
);

module.exports = InfrastructureExpiry;
