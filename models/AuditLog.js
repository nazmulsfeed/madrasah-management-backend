const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class AuditLog extends Model {}

AuditLog.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user: {
    type: DataTypes.STRING, // User ID or username
    allowNull: false
  },
  action: {
    type: DataTypes.STRING, // e.g., 'create', 'update', 'delete', 'promote', 'permission_change'
    allowNull: false
  },
  module: {
    type: DataTypes.STRING, // e.g., 'Role', 'Permission', 'Payment'
    allowNull: false
  },
  documentId: {
    type: DataTypes.STRING, // Affected ID
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  previousData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  currentData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'auditlogs',
  timestamps: true,
  indexes: [
    { fields: ['institution', 'module', 'action'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = AuditLog;
