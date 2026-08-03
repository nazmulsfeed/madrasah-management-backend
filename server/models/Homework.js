const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Homework extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Homework.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  classLevel: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  assignedBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  assignDate: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  attachments: {
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
  modelName: 'Homework',
  tableName: 'homeworks',
});

Homework.associate = function(models) {
};

module.exports = Homework;
