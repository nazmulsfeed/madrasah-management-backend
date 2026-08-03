const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class TeacherAttendance extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

TeacherAttendance.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  teacher: {
    type: DataTypes.STRING,
    allowNull: false,
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
  modelName: 'TeacherAttendance',
  tableName: 'teacherattendances',
});

TeacherAttendance.associate = function(models) {
};

module.exports = TeacherAttendance;
