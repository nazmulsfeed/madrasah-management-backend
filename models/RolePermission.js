const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class RolePermission extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

RolePermission.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
}, {
  sequelize,
  modelName: 'RolePermission',
  tableName: 'rolepermissions',
});

RolePermission.associate = function(models) {
};

module.exports = RolePermission;