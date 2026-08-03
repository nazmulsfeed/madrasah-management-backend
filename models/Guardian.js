const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Guardian extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Guardian.init({
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
    allowNull: false,
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  guardianId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  occupation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nationalId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  relationshipLabel: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'পিতা/মাতা',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'active',
  },
  students: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Guardian',
  tableName: 'guardians',
});

Guardian.associate = function(models) {
};

module.exports = Guardian;
