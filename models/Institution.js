const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Institution extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Institution.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  registrationNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  logo: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  establishedDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  timezone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Asia/Dhaka',
  },
  defaultLanguage: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'bn',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active',
  },
  isHomeworkPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
}, {
  sequelize,
  modelName: 'Institution',
  tableName: 'institutions',
});

Institution.associate = function(models) {
};

module.exports = Institution;
