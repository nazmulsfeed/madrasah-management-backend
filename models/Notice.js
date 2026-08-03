const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Notice extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Notice.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  audience: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  priority: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'medium',
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  publishedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Notice',
  tableName: 'notices',
});

Notice.associate = function(models) {
};

module.exports = Notice;
