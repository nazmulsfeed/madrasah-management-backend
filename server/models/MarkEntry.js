const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class MarkEntry extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

MarkEntry.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  exam: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  student: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  marksObtained: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  totalMarks: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 100,
  },
  grade: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  enteredBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'draft',
  },
}, {
  sequelize,
  modelName: 'MarkEntry',
  tableName: 'markentrys',
});

MarkEntry.associate = function(models) {
};

module.exports = MarkEntry;
