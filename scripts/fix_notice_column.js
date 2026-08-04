const sequelize = require('../config/db');

async function fixColumn() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    // Modify the content column of notices table to TEXT
    await sequelize.query('ALTER TABLE notices MODIFY COLUMN content TEXT');
    console.log('Successfully changed notices.content to TEXT');
  } catch (error) {
    console.error('Error modifying column:', error);
  } finally {
    process.exit();
  }
}

fixColumn();
