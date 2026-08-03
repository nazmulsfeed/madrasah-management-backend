const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Branch extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Branch.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  head: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'Branch',
  tableName: 'branches',
});

Branch.associate = function(models) {
};

module.exports = Branch;
