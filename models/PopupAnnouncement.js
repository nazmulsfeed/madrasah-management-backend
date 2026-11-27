/**
 * পপ-আপ ঘোষণা ও নসিহতের মডেল (PopupAnnouncement.js)
 * - type: 'nasihot' (সরাসরি পোস্ট করা নসিহত, বাংলা ভয়েস/অডিওসহ) অথবা 'notice_push' (বিদ্যমান নোটিশ থেকে পপ-আপে পুশ করা)।
 * - সব লগইন করা প্রাপক (audience অনুযায়ী) অ্যাপে ঢুকলে পপ-আপে দেখতে পাবেন।
 */
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class PopupAnnouncement extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

PopupAnnouncement.init(
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    institution: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'nasihot', // 'nasihot' | 'notice_push'
    },
    sourceNoticeId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    audioData: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    audience: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'PopupAnnouncement',
    tableName: 'popup_announcements',
    timestamps: true,
  }
);

module.exports = PopupAnnouncement;
