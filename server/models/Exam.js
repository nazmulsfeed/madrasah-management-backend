const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Exam extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Exam.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  classLevel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'upcoming',
  },
}, {
  sequelize,
  modelName: 'Exam',
  tableName: 'exams',
});

Exam.associate = function(models) {
};

module.exports = Exam;
