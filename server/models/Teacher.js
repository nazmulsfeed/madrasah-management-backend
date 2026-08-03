const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Teacher extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Teacher.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  teacherType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'regular',
  },
  joiningDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  qualification: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active',
  },
}, {
  sequelize,
  modelName: 'Teacher',
  tableName: 'teachers',
});

Teacher.associate = function(models) {
};

module.exports = Teacher;
