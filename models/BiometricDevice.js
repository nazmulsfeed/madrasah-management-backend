const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class BiometricDevice extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

BiometricDevice.init(
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    institution: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'ZKTeco Device',
    },
    deviceModel: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'MB560-VL',
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firmwareVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    fingerprintCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    faceCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    logCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'offline', // online, offline
    },
  },
  {
    sequelize,
    modelName: 'BiometricDevice',
    tableName: 'biometric_devices',
    timestamps: true,
  }
);

module.exports = BiometricDevice;
