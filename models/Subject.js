const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Subject extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Subject.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subjectType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'mandatory',
  },
  isHifzSubject: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  classLevels: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active',
  },
}, {
  sequelize,
  modelName: 'Subject',
  tableName: 'subjects',
});

Subject.associate = function(models) {
};

module.exports = Subject;
