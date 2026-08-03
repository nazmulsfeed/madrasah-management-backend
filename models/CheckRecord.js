const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class CheckRecord extends Model {
  toJSON() {
    return { ...this.get() };
  }
}

CheckRecord.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  checkNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('received', 'issued'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'cleared', 'bounced'),
    allowNull: false,
    defaultValue: 'pending',
  }
}, {
  sequelize,
  modelName: 'CheckRecord',
  tableName: 'check_records',
});

module.exports = CheckRecord;
