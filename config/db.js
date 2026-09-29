const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'annurisl_madrasah',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    timezone: '+06:00', // Bangladesh Timezone (UTC+6)
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

    // Immediate safe migration for baseSalary before any model queries run
    try {
      await sequelize.query("ALTER TABLE `teachers` ADD COLUMN `baseSalary` DECIMAL(12,2) NULL DEFAULT 0").catch(() => {});
      await sequelize.query("ALTER TABLE `users` ADD COLUMN `baseSalary` DECIMAL(12,2) NULL DEFAULT 0").catch(() => {});
    } catch (migErr) {}

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

    // Collation fix already applied — skip on subsequent startups for fast boot

    // Sync database — নতুন table তৈরি করবে, existing table-এ নতুন কলাম যোগ করবে
    try {
      await sequelize.sync({ alter: true });
      console.log('✅ ডাটাবেস টেবিলগুলো সফলভাবে সিঙ্ক করা হয়েছে');
    } catch (syncErr) {
      console.error('⚠️ ডাটাবেস সিঙ্ক ব্যর্থ (সার্ভার চালু থাকবে):', syncErr.message);
    }

    // Auto-migrate newly added columns safely to users table
    try {
      const [colsFirst] = await sequelize.query("SHOW COLUMNS FROM `users` LIKE 'firstNameEn'");
      if (!colsFirst || colsFirst.length === 0) {
        await sequelize.query("ALTER TABLE `users` ADD COLUMN `firstNameEn` VARCHAR(255) NULL DEFAULT ''");
        console.log("✅ Added firstNameEn column to users table");
      }
      const [colsLast] = await sequelize.query("SHOW COLUMNS FROM `users` LIKE 'lastNameEn'");
      if (!colsLast || colsLast.length === 0) {
        await sequelize.query("ALTER TABLE `users` ADD COLUMN `lastNameEn` VARCHAR(255) NULL DEFAULT ''");
        console.log("✅ Added lastNameEn column to users table");
      }
      const [attCols] = await sequelize.query("SHOW COLUMNS FROM `studentattendances` LIKE 'branch'");
      if (!attCols || attCols.length === 0) {
        await sequelize.query("ALTER TABLE `studentattendances` ADD COLUMN `branch` VARCHAR(255) NULL DEFAULT ''");
        console.log("✅ Added branch column to studentattendances table");
      }
      const [inTimeCol] = await sequelize.query("SHOW COLUMNS FROM `studentattendances` LIKE 'inTime'");
      if (!inTimeCol || inTimeCol.length === 0) {
        await sequelize.query("ALTER TABLE `studentattendances` ADD COLUMN `inTime` VARCHAR(50) NULL DEFAULT ''");
        console.log("✅ Added inTime column to studentattendances table");
      }
      const [punchCol] = await sequelize.query("SHOW COLUMNS FROM `studentattendances` LIKE 'punchTime'");
      if (!punchCol || punchCol.length === 0) {
        await sequelize.query("ALTER TABLE `studentattendances` ADD COLUMN `punchTime` DATETIME NULL");
        console.log("✅ Added punchTime column to studentattendances table");
      }
      const [sourceCol] = await sequelize.query("SHOW COLUMNS FROM `studentattendances` LIKE 'source'");
      if (!sourceCol || sourceCol.length === 0) {
        await sequelize.query("ALTER TABLE `studentattendances` ADD COLUMN `source` VARCHAR(50) NULL DEFAULT 'manual'");
        console.log("✅ Added source column to studentattendances table");
      }
      const [devCol] = await sequelize.query("SHOW COLUMNS FROM `students` LIKE 'deviceUserId'");
      if (!devCol || devCol.length === 0) {
        await sequelize.query("ALTER TABLE `students` ADD COLUMN `deviceUserId` VARCHAR(100) NULL DEFAULT ''");
        console.log("✅ Added deviceUserId column to students table");
      }
      const [customFeeCol] = await sequelize.query("SHOW COLUMNS FROM `students` LIKE 'customMonthlyFee'");
      if (!customFeeCol || customFeeCol.length === 0) {
        await sequelize.query("ALTER TABLE `students` ADD COLUMN `customMonthlyFee` DOUBLE NULL DEFAULT NULL");
        console.log("✅ Added customMonthlyFee column to students table");
      }
      const [discountNoteCol] = await sequelize.query("SHOW COLUMNS FROM `students` LIKE 'feeDiscountNote'");
      if (!discountNoteCol || discountNoteCol.length === 0) {
        await sequelize.query("ALTER TABLE `students` ADD COLUMN `feeDiscountNote` VARCHAR(255) NULL DEFAULT ''");
        console.log("✅ Added feeDiscountNote column to students table");
      }
      const [subUserCol] = await sequelize.query("SHOW COLUMNS FROM `push_subscriptions` LIKE 'userId'");
      if (!subUserCol || subUserCol.length === 0) {
        await sequelize.query("ALTER TABLE `push_subscriptions` ADD COLUMN `userId` VARCHAR(255) NULL");
        console.log("✅ Added userId column to push_subscriptions table");
      }
      const [subStudentCol] = await sequelize.query("SHOW COLUMNS FROM `push_subscriptions` LIKE 'studentId'");
      if (!subStudentCol || subStudentCol.length === 0) {
        await sequelize.query("ALTER TABLE `push_subscriptions` ADD COLUMN `studentId` VARCHAR(255) NULL");
        console.log("✅ Added studentId column to push_subscriptions table");
      }
      const [instBranchCol] = await sequelize.query("SHOW COLUMNS FROM `institutions` LIKE 'branchName'");
      if (!instBranchCol || instBranchCol.length === 0) {
        await sequelize.query("ALTER TABLE `institutions` ADD COLUMN `branchName` VARCHAR(255) NULL DEFAULT 'প্রধান শাখা'");
        console.log("✅ Added branchName column to institutions table");
      }
      const [instCutoffCol] = await sequelize.query("SHOW COLUMNS FROM `institutions` LIKE 'attendanceCutoffTime'");
      if (!instCutoffCol || instCutoffCol.length === 0) {
        await sequelize.query("ALTER TABLE `institutions` ADD COLUMN `attendanceCutoffTime` VARCHAR(20) NULL DEFAULT '09:30'");
        console.log("✅ Added attendanceCutoffTime column to institutions table");
      }
      const [instAutoAbsCol] = await sequelize.query("SHOW COLUMNS FROM `institutions` LIKE 'autoAbsentEnabled'");
      if (!instAutoAbsCol || instAutoAbsCol.length === 0) {
        await sequelize.query("ALTER TABLE `institutions` ADD COLUMN `autoAbsentEnabled` TINYINT(1) NULL DEFAULT 0");
        console.log("✅ Added autoAbsentEnabled column to institutions table");
      }
      const [instBioCol] = await sequelize.query("SHOW COLUMNS FROM `institutions` LIKE 'biometricAttendanceEnabled'");
      if (!instBioCol || instBioCol.length === 0) {
        await sequelize.query("ALTER TABLE `institutions` ADD COLUMN `biometricAttendanceEnabled` TINYINT(1) NULL DEFAULT 0");
        console.log("✅ Added biometricAttendanceEnabled column to institutions table");
      }
      const [instPushCol] = await sequelize.query("SHOW COLUMNS FROM `institutions` LIKE 'attendancePushNotifEnabled'");
      if (!instPushCol || instPushCol.length === 0) {
        await sequelize.query("ALTER TABLE `institutions` ADD COLUMN `attendancePushNotifEnabled` TINYINT(1) NULL DEFAULT 0");
        console.log("✅ Added attendancePushNotifEnabled column to institutions table");
      }
      const [instTestCol] = await sequelize.query("SHOW COLUMNS FROM `institutions` LIKE 'testDeviceUserId'");
      if (!instTestCol || instTestCol.length === 0) {
        await sequelize.query("ALTER TABLE `institutions` ADD COLUMN `testDeviceUserId` VARCHAR(100) NULL DEFAULT ''");
        console.log("✅ Added testDeviceUserId column to institutions table");
      }
      const [instOutPushCol] = await sequelize.query("SHOW COLUMNS FROM `institutions` LIKE 'outTimePushEnabled'");
      if (!instOutPushCol || instOutPushCol.length === 0) {
        await sequelize.query("ALTER TABLE `institutions` ADD COLUMN `outTimePushEnabled` TINYINT(1) NULL DEFAULT 0");
        console.log("✅ Added outTimePushEnabled column to institutions table");
      }
      const [punchCountCol] = await sequelize.query("SHOW COLUMNS FROM `studentattendances` LIKE 'punchCount'");
      if (!punchCountCol || punchCountCol.length === 0) {
        await sequelize.query("ALTER TABLE `studentattendances` ADD COLUMN `punchCount` INT NULL DEFAULT 0");
        console.log("✅ Added punchCount column to studentattendances table");
      }
      const [punchTimesCol] = await sequelize.query("SHOW COLUMNS FROM `studentattendances` LIKE 'punchTimes'");
      if (!punchTimesCol || punchTimesCol.length === 0) {
        await sequelize.query("ALTER TABLE `studentattendances` ADD COLUMN `punchTimes` TEXT NULL");
        console.log("✅ Added punchTimes column to studentattendances table");
      }
      const [outTimeCol] = await sequelize.query("SHOW COLUMNS FROM `studentattendances` LIKE 'outTime'");
      if (!outTimeCol || outTimeCol.length === 0) {
        await sequelize.query("ALTER TABLE `studentattendances` ADD COLUMN `outTime` VARCHAR(50) NULL DEFAULT ''");
        console.log("✅ Added outTime column to studentattendances table");
      }
      const [teaDesigCol] = await sequelize.query("SHOW COLUMNS FROM `teachers` LIKE 'designation'");
      if (!teaDesigCol || teaDesigCol.length === 0) {
        await sequelize.query("ALTER TABLE `teachers` ADD COLUMN `designation` VARCHAR(255) NULL DEFAULT ''");
        console.log("✅ Added designation column to teachers table");
      }
      const [teaBranchCol] = await sequelize.query("SHOW COLUMNS FROM `teachers` LIKE 'branch'");
      if (!teaBranchCol || teaBranchCol.length === 0) {
        await sequelize.query("ALTER TABLE `teachers` ADD COLUMN `branch` VARCHAR(255) NULL DEFAULT ''");
        console.log("✅ Added branch column to teachers table");
      }
      const [teaSalaryCol] = await sequelize.query("SHOW COLUMNS FROM `teachers` LIKE 'baseSalary'");
      if (!teaSalaryCol || teaSalaryCol.length === 0) {
        await sequelize.query("ALTER TABLE `teachers` ADD COLUMN `baseSalary` DECIMAL(12,2) NULL DEFAULT 0");
        console.log("✅ Added baseSalary column to teachers table");
      }
      const [userSalaryCol] = await sequelize.query("SHOW COLUMNS FROM `users` LIKE 'baseSalary'");
      if (!userSalaryCol || userSalaryCol.length === 0) {
        await sequelize.query("ALTER TABLE `users` ADD COLUMN `baseSalary` DECIMAL(12,2) NULL DEFAULT 0");
        console.log("✅ Added baseSalary column to users table");
      }
      // Auto-clean any unwanted initial balance of 900 and normalize branch names
      try {
        await sequelize.query("UPDATE `accounts` SET `balance` = 0 WHERE (`code` = '1001' OR `name` LIKE '%নগদ%') AND `balance` = 900");
        await sequelize.query("UPDATE `institutions` SET `branchName` = 'প্রধান শাখা' WHERE `branchName` IN ('বালক শাখা', 'বালিকা শাখা')");
        await sequelize.query("UPDATE `users` SET `branch` = 'প্রধান শাখা' WHERE `branch` IN ('বালক শাখা', 'বালিকা শাখা')");
      } catch (cleanErr) {}
    } catch (colErr) {
      console.error("⚠️ Error auto-adding columns:", colErr.message);
    }
  } catch (error) {
    console.error(`❌ MySQL সংযোগ ব্যর্থ: ${error.message}`);
    process.exit(1);
  }
};

sequelize.connectDB = connectDB;
module.exports = sequelize;

// require mongooseCompat at the bottom to avoid circular dependencies
require('../utils/mongooseCompat');