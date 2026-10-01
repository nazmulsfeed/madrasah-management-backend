const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class AssemblyAttendance extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

AssemblyAttendance.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  student: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  classLevel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  section: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'present', // present, absent, late, excused
  },
  inTime: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  markedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  remarks: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'AssemblyAttendance',
  tableName: 'assembly_attendances',
  indexes: [
    { fields: ['institution', 'date'] },
    { fields: ['student', 'date'] },
    { fields: ['classLevel', 'date'] },
  ],
});

module.exports = AssemblyAttendance;
