require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixDB() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'annurisl_madrasah'
  });
  
  try {
    // Check if column exists
    const [cols] = await conn.query('SHOW COLUMNS FROM users LIKE "dbResetPassword"');
    if (cols.length === 0) {
      await conn.query('ALTER TABLE users ADD COLUMN dbResetPassword VARCHAR(255) DEFAULT "0000"');
      console.log('Column dbResetPassword added successfully');
    } else {
      console.log('Column dbResetPassword already exists');
    }
    
    // Update existing admin user to have dbResetPassword = 0000
    await conn.query('UPDATE users SET dbResetPassword = "0000" WHERE userType = "super_admin" AND (dbResetPassword IS NULL OR dbResetPassword = "")');
    console.log('Updated super_admin dbResetPassword to 0000');
    
  } finally {
    await conn.end();
  }
}

fixDB().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
