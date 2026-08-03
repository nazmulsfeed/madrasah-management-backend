const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'annurisl_madrasah',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // Set to console.log if debugging SQL queries
    define: {
      timestamps: true,
    },
  }
);

const mysql = require('mysql2/promise');

const connectDB = async () => {
  try {
    // Auto-create database if it doesn't exist
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'annurisl_madrasah'}\`;`);
    await connection.end();

    await sequelize.authenticate();
    console.log('✅ MySQL/Sequelize সংযুক্ত হয়েছে');

    // Wrap toJSON to handle populated mongooseCompat associations & run associations
    Object.keys(sequelize.models).forEach((modelName) => {
      const model = sequelize.models[modelName];
      
      const origToJSON = model.prototype.toJSON;
      model.prototype.toJSON = function() {
        let values;
        if (origToJSON) {
          values = origToJSON.call(this);
        } else {
          values = { ...this.get() };
        }
        Object.keys(values).forEach((key) => {
          if (key.endsWith('_populated')) {
            const origKey = key.replace('_populated', '');
            values[origKey] = values[key];
            delete values[key];
          }
        });
        return values;
      };

      if (model.associate) {
        model.associate(sequelize.models);
      }
    });

    // Sync database — নতুন table তৈরি করবে, existing table পরিবর্তন করবে না
    await sequelize.sync({ force: false });
    console.log('✅ ডাটাবেস টেবিলগুলো সফলভাবে সিঙ্ক করা হয়েছে');
  } catch (error) {
    console.error(`❌ MySQL সংযোগ বা সিঙ্ক ব্যর্থ: ${error.message}`);
    process.exit(1);
  }
};

sequelize.connectDB = connectDB;
module.exports = sequelize;

// require mongooseCompat at the bottom to avoid circular dependencies
require('../utils/mongooseCompat');