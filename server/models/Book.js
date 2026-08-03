const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Book extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

Book.init({
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
  author: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'অন্যান্য',
  },
  copies: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  available: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
}, {
  sequelize,
  modelName: 'Book',
  tableName: 'books',
});

Book.associate = function(models) {
};

module.exports = Book;
