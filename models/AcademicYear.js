const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class AcademicYear extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

AcademicYear.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'AcademicYear',
  tableName: 'academicyears',
});

AcademicYear.associate = function(models) {
};

module.exports = AcademicYear;
