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
    primaryKey: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
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
    defaultValue: 'present', // present, absent, late, on_leave
  },
  inTime: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  outTime: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  punchCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  punchTimes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
  },
  punchTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'manual', // manual, zkteco_device, rfid_card, face
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
  indexes: [
    { fields: ['institution', 'date'] },
    { fields: ['teacher', 'date'] },
  ],
});

TeacherAttendance.associate = function(models) {
};

module.exports = TeacherAttendance;
