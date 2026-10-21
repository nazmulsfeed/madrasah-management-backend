const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class DeviceCommand extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

DeviceCommand.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    institution: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    commandType: {
      type: DataTypes.STRING,
      allowNull: false, // DATA_USER, DATA_USERPIC, QUERY_USERINFO, DELETE_USER, etc.
    },
    commandText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    targetUserId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetUserType: {
      type: DataTypes.STRING,
      allowNull: true, // student, teacher
    },
    targetUserName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending', // pending, sent, executed, failed
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    executedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    returnCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'DeviceCommand',
    tableName: 'device_commands',
    timestamps: true,
    indexes: [
      {
        fields: ['serialNumber', 'status'],
      },
      {
        fields: ['_id'],
      },
    ],
  }
);

module.exports = DeviceCommand;
