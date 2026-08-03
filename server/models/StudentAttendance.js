const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class StudentAttendance extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

StudentAttendance.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
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
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
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
  modelName: 'StudentAttendance',
  tableName: 'studentattendances',
});

StudentAttendance.associate = function(models) {
};

module.exports = StudentAttendance;
