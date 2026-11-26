/**
 * Migration: 20261121_01_init_test_dependencies
 *
 * Sets up dependency tables in the isolated test database ONLY.
 * Strict fail-closed check ensures this NEVER runs on production.
 */

const { verifySafetyGatekeeper } = require('../tests/safetyGatekeeper');

async function up(connection) {
  // Safety Gatekeeper assertion: MUST pass before executing any DDL
  await verifySafetyGatekeeper(connection);

  // 1. institutions
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`institutions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`name\` VARCHAR(255) NOT NULL,
      \`branchName\` VARCHAR(255) NULL DEFAULT 'প্রধান শাখা',
      \`code\` VARCHAR(50) NULL,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. users
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`username\` VARCHAR(255) NULL UNIQUE,
      \`email\` VARCHAR(255) NULL UNIQUE,
      \`password\` VARCHAR(255) NOT NULL,
      \`userType\` VARCHAR(50) NOT NULL,
      \`institution\` VARCHAR(255) NOT NULL,
      \`branch\` VARCHAR(255) NULL,
      \`isActive\` TINYINT(1) DEFAULT 1,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. teachers
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`teachers\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`user\` VARCHAR(255) NOT NULL,
      \`institution\` VARCHAR(255) NOT NULL,
      \`branch\` VARCHAR(255) NULL,
      \`employeeId\` VARCHAR(255) NOT NULL UNIQUE,
      \`teacherType\` VARCHAR(50) DEFAULT 'regular',
      \`gender\` VARCHAR(20) DEFAULT 'male',
      \`joiningDate\` DATETIME NULL,
      \`qualification\` VARCHAR(255) NULL,
      \`specialization\` VARCHAR(255) NULL,
      \`designation\` VARCHAR(255) NULL,
      \`baseSalary\` DECIMAL(12,2) DEFAULT 0,
      \`deviceUserId\` VARCHAR(255) NULL,
      \`deviceSyncStatus\` VARCHAR(50) DEFAULT 'not_uploaded',
      \`deviceLastSyncedAt\` DATETIME NULL,
      \`deviceSyncedDevices\` TEXT NULL,
      \`status\` VARCHAR(50) DEFAULT 'active',
      \`createdBy\` VARCHAR(255) NULL,
      \`updatedBy\` VARCHAR(255) NULL,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. classlevels
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`classlevels\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`institution\` VARCHAR(255) NOT NULL,
      \`branch\` VARCHAR(255) NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`code\` VARCHAR(50) NOT NULL,
      \`order\` INT DEFAULT 0,
      \`educationStream\` VARCHAR(50) DEFAULT 'general',
      \`monthlyFee\` FLOAT DEFAULT 0,
      \`admissionFee\` FLOAT DEFAULT 0,
      \`sessionFee\` FLOAT DEFAULT 0,
      \`examFee\` FLOAT DEFAULT 0,
      \`isActive\` TINYINT(1) DEFAULT 1,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. sections
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`sections\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`institution\` VARCHAR(255) NOT NULL,
      \`branch\` VARCHAR(255) NULL,
      \`classLevel\` VARCHAR(255) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`capacity\` INT DEFAULT 0,
      \`classTeacher\` VARCHAR(255) NULL,
      \`isActive\` TINYINT(1) DEFAULT 1,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. subjects
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`subjects\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`institution\` VARCHAR(255) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`branchName\` VARCHAR(255) NULL DEFAULT 'প্রধান শাখা',
      \`code\` VARCHAR(50) NULL,
      \`subjectType\` VARCHAR(50) DEFAULT 'mandatory',
      \`isHifzSubject\` TINYINT(1) DEFAULT 0,
      \`classLevels\` LONGTEXT NULL,
      \`totalMarks\` FLOAT DEFAULT 100,
      \`status\` VARCHAR(50) DEFAULT 'active',
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. academicyears
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`academicyears\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`institution\` VARCHAR(255) NOT NULL,
      \`name\` VARCHAR(50) NOT NULL,
      \`startDate\` DATETIME NULL,
      \`endDate\` DATETIME NULL,
      \`isCurrent\` TINYINT(1) DEFAULT 0,
      \`isActive\` TINYINT(1) DEFAULT 1,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. rolepermissions
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`rolepermissions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`role\` VARCHAR(255) NOT NULL UNIQUE,
      \`permissions\` LONGTEXT NOT NULL,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  return { success: true, message: 'Test dependency tables initialized successfully.' };
}

async function down(connection) {
  await verifySafetyGatekeeper(connection);
  // Rollback drops dependencies in reverse order
  const tables = ['rolepermissions', 'academicyears', 'subjects', 'sections', 'classlevels', 'teachers', 'users', 'institutions'];
  for (const table of tables) {
    await connection.query(`DROP TABLE IF EXISTS \`${table}\`;`);
  }
  return { success: true, message: 'Test dependency tables dropped.' };
}

module.exports = { up, down };
