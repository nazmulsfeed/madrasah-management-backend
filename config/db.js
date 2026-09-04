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
    dialectOptions: {
      // Required for MySQL 8.4 caching_sha2_password plugin in local dev
      allowPublicKeyRetrieval: true,
      ssl: false,
      charset: 'utf8mb4',
    },
    define: {
      timestamps: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  }
);

const mysql = require('mysql2/promise');

const connectDB = async () => {
  try {
    let dbUser = process.env.DB_USER || 'root';
    let dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';

    // Auto-create database if it doesn't exist
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: dbUser,
        password: dbPassword,
        allowPublicKeyRetrieval: true,
        ssl: false,
      });
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'annurisl_madrasah'}\`;`);
      await connection.end();
    } catch (createErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Primary DB user connect failed, trying fallback root user for local dev...');
        dbUser = 'root';
        dbPassword = '';
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST || '127.0.0.1',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          user: dbUser,
          password: dbPassword,
          allowPublicKeyRetrieval: true,
          ssl: false,
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'annurisl_madrasah'}\`;`);
        await connection.end();
        sequelize.config.username = dbUser;
        sequelize.config.password = dbPassword;
      } else {
        throw createErr;
      }
    }

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

    // Fix collation mismatch — সকল টেবিল ও কলাম utf8mb4_unicode_ci তে কনভার্ট
    try {
      const dbName = process.env.DB_NAME || 'annurisl_madrasah';
      await sequelize.query(`ALTER DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      const [tables] = await sequelize.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_TYPE = 'BASE TABLE';`);
      for (const row of tables) {
        const tableName = row.TABLE_NAME;
        try {
          await sequelize.query(`ALTER TABLE \`${tableName}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        } catch (tableErr) {
          console.warn(`⚠️ টেবিল ${tableName} কনভার্ট করতে ব্যর্থ:`, tableErr.message);
        }
      }
      console.log('✅ ডাটাবেস collation utf8mb4_unicode_ci তে কনভার্ট করা হয়েছে');
    } catch (collationErr) {
      console.warn('⚠️ Collation ফিক্স করতে ব্যর্থ:', collationErr.message);
    }

    // Sync database — নতুন table তৈরি করবে, existing table-এ নতুন কলাম যোগ করবে
    await sequelize.sync({ alter: true });
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