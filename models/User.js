const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const bcrypt = require('bcryptjs');

class User extends Model {
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    delete values.plainPassword;
    return values;
  }
}

User.init({
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  userType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  adminRole: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  photo: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    defaultValue: '',
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dbResetPassword: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '0000',
  },
  plainPassword: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
});

User.beforeSave(async (user) => {
  if (user.changed('password')) {
    // Store plain password for admin view before hashing
    user.plainPassword = user.password;
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.associate = function(models) {
};

module.exports = User;
