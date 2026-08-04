const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class PushSubscription extends Model {}

PushSubscription.init({
  endpoint: {
    type: DataTypes.STRING(700),
    primaryKey: true,
    allowNull: false,
  },
  keys: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'PushSubscription',
  tableName: 'push_subscriptions',
});

module.exports = PushSubscription;
