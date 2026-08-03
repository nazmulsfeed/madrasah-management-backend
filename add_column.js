const db = require('./server/config/db');

(async () => {
  try {
    await db.connectDB();
    console.log('Adding feeCategory column to invoices table...');
    await db.query("ALTER TABLE `invoices` ADD COLUMN `feeCategory` VARCHAR(255) DEFAULT NULL;");
    console.log('Column added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.log('Fatal Error:', err);
    }
  } finally {
    process.exit(0);
  }
})();
