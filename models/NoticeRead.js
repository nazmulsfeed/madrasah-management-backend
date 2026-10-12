const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class NoticeRead extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

NoticeRead.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  notice: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  readAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'NoticeRead',
  tableName: 'notice_reads',
  indexes: [
    {
      unique: true,
      fields: ['notice', 'user'],
    },
    {
      fields: ['user'],
    },
  ],
});

module.exports = NoticeRead;
