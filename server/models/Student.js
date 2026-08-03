const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Student extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Student.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  admissionNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  currentEnrollment: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  residentialStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  bloodGroup: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  photo: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active',
  },
  admissionDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  admissionSource: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  hifzProgramType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  previousInstitution: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Student',
  tableName: 'students',
});

Student.associate = function(models) {
};

module.exports = Student;
