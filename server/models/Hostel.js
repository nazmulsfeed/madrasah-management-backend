const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Hostel extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Hostel.init({
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
  type: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'ছাত্র',
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  occupied: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  rooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active',
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Hostel',
  tableName: 'hostels',
});

Hostel.associate = function(models) {
};

module.exports = Hostel;
