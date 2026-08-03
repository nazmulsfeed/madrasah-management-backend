const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class HomeworkSubmission extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

HomeworkSubmission.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  homework: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  student: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  submissionText: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'submitted',
  },
  grade: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  teacherRemarks: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gradedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gradedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'HomeworkSubmission',
  tableName: 'homeworksubmissions',
});

HomeworkSubmission.associate = function(models) {
};

module.exports = HomeworkSubmission;
