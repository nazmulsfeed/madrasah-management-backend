require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'annurisl_madrasah'
  });

  try {
    const [colsFirst] = await conn.query("SHOW COLUMNS FROM `users` LIKE 'firstNameEn'");
    if (colsFirst.length === 0) {
      await conn.query("ALTER TABLE `users` ADD COLUMN `firstNameEn` VARCHAR(255) NULL DEFAULT ''");
      console.log("✅ Column firstNameEn added to users table");
    } else {
      console.log("ℹ️ Column firstNameEn already exists");
    }

    const [colsLast] = await conn.query("SHOW COLUMNS FROM `users` LIKE 'lastNameEn'");
    if (colsLast.length === 0) {
      await conn.query("ALTER TABLE `users` ADD COLUMN `lastNameEn` VARCHAR(255) NULL DEFAULT ''");
      console.log("✅ Column lastNameEn added to users table");
    } else {
      console.log("ℹ️ Column lastNameEn already exists");
    }

    console.log("🎉 Migration finished successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
  } finally {
    await conn.end();
  }
}

migrate();
