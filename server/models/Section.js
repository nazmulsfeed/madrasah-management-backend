const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Section extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Section.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  classLevel: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  classTeacher: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'Section',
  tableName: 'sections',
});

Section.associate = function(models) {
};

module.exports = Section;
