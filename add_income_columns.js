const db = require('./server/config/db');

(async () => {
  try {
    await db.connectDB();
    console.log('Adding status and approvedBy columns to incomes table...');
    await db.query("ALTER TABLE `incomes` ADD COLUMN `status` VARCHAR(255) DEFAULT 'pending';");
    await db.query("ALTER TABLE `incomes` ADD COLUMN `approvedBy` VARCHAR(255) DEFAULT NULL;");
    console.log('Columns added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.log('Fatal Error:', err);
    }
  } finally {
    process.exit(0);
  }
})();
