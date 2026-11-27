/**
 * ============================================================================
 * স্বতন্ত্র মডেল: ম্যানুয়াল বেতন চেকলিস্ট অ্যাক্সেস (ManualFeeChecklistAccess.js)
 * ============================================================================
 * উদ্দেশ্য (Purpose):
 * - পরিচালকের অনুরোধে তৈরি /manual-fee-checklist পেজটি বাই ডিফল্ট শুধুমাত্র
 *   'super_admin' ব্যবহার করতে পারবেন।
 * - super_admin চাইলে নির্দিষ্ট ১-২ জন শিক্ষক বা স্টাফকে এই পেজের অ্যাক্সেস
 *   দিতে পারবেন — পুরো 'teacher' রোলকে নয়।
 * - এই টেবিল (manual_fee_checklist_access) শুধুমাত্র সেই অনুমোদিত userId
 *   তালিকা সংরক্ষণ করে, মূল রোল-পারমিশন বা ইউজার টেবিলে কোনো পরিবর্তন করে না।
 * ============================================================================
 */
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class ManualFeeChecklistAccess extends Model {}

ManualFeeChecklistAccess.init(
  {
    institution: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    grantedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'ManualFeeChecklistAccess',
    tableName: 'manual_fee_checklist_access',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['institution', 'userId'],
        name: 'manual_fee_checklist_access_unique_idx',
      },
    ],
  }
);

module.exports = ManualFeeChecklistAccess;
