/**
 * পপ-আপ সেটিংস মডেল (PopupSetting.js)
 * প্রতি মাসের ৪ থেকে ১০ তারিখ পর্যন্ত বকেয়া বেতনধারী ছাত্র ও অভিভাবক আইডিতে
 * অটোমেটিক পপ-আপ নোটিফিকেশন চালু/বন্ধ করার টগল সংরক্ষণ করে।
 */
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class PopupSetting extends Model {}

PopupSetting.init(
  {
    institution: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
      unique: true,
    },
    autoDuePopupEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'PopupSetting',
    tableName: 'popup_settings',
    timestamps: true,
  }
);

module.exports = PopupSetting;
