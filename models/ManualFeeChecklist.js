/**
 * ============================================================================
 * স্বতন্ত্র মডেল: ম্যানুয়াল বেতন চেকলিস্ট (ManualFeeChecklist)
 * ============================================================================
 * উদ্দেশ্য (Purpose):
 * - পরিচালকের বিশেষ অনুরোধে এই মডিউলটি সম্পূর্ণ আলাদাভাবে তৈরি করা হয়েছে।
 * - এর কাজ হলো শুধু মাস ও বছর অনুযায়ী কোন কোন ছাত্র বেতন দিয়েছে আর কে দেয়নি,
 *   তা ম্যানুয়ালি টিকমার্ক দিয়ে ডাটাবেজে সংরক্ষণ করা।
 * - গুরুত্বপূর্ণ: এটি মূল ফি ইনভয়েস (FeeInvoice), পেমেন্ট (Payment) বা
 *   অ্যাকাউন্টিং সিস্টেমের (JournalEntry/Account) সাথে কোনোভাবেই যুক্ত নয়
 *   এবং মূল সিস্টেমের কোনো হিসাব বা ডাটাকে প্রভাবিত করে না।
 * ============================================================================
 */
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class ManualFeeChecklist extends Model {}

ManualFeeChecklist.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  month: {
    type: DataTypes.INTEGER, // 1 to 12
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  note: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  markedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  markedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'ManualFeeChecklist',
  tableName: 'manual_fee_checklists',
  indexes: [
    {
      unique: true,
      fields: ['institution', 'studentId', 'month', 'year'],
      name: 'uniq_manual_fee_check_stu_month_year'
    }
  ]
});

module.exports = ManualFeeChecklist;
