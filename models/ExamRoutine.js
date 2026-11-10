const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class ExamRoutine extends Model {
  toJSON() {
    const values = { ...this.get() };
    if (typeof values.schedule === 'string') {
      try {
        values.schedule = JSON.parse(values.schedule);
      } catch (_) {
        values.schedule = [];
      }
    }
    return values;
  }
}

ExamRoutine.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  exam: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  examName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  classLevel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  className: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stream: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'all', // 'noorani', 'hifz', 'kitab', 'all'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'published', // 'draft', 'published'
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  schedule: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'ExamRoutine',
  tableName: 'exam_routines',
  timestamps: true,
});

module.exports = ExamRoutine;
