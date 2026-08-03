const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class HifzDailyProgress extends Model {
  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

HifzDailyProgress.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  student: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  teacher: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  sabaq: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sabqi: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  manzil: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quality: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'good',
  },
  mistakesCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  remarks: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'HifzDailyProgress',
  tableName: 'hifzdailyprogresss',
});

HifzDailyProgress.associate = function(models) {
};

module.exports = HifzDailyProgress;
