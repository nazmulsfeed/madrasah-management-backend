require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function fixUsernames() {
  console.log('🔄 Connecting to database...');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'annurisl_madrasah'
    });
    console.log('✅ Connected to database successfully.');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }

  try {
    // 1. Find all users whose username contains whitespace
    const [rows] = await conn.query("SELECT `_id`, `username`, `firstName`, `lastName`, `userType` FROM `users` WHERE `username` LIKE '% %'");
    
    console.log(`🔍 Found ${rows.length} users with spaces in their username.`);

    if (rows.length === 0) {
      console.log('✨ All usernames are already clean and have no spaces!');
      await conn.end();
      return;
    }

    let updatedCount = 0;

    for (const user of rows) {
      const oldUsername = user.username;
      // Strip all whitespace and lowercase
      let cleanUsername = oldUsername.toLowerCase().replace(/\s+/g, '');

      // Ensure it is not empty; if empty fallback to id or part of id
      if (!cleanUsername) {
        cleanUsername = `user${user._id.substring(0, 6)}`;
      }

      // Check collision
      let candidate = cleanUsername;
      let counter = 1;
      while (true) {
        const [existing] = await conn.query(
          "SELECT `_id` FROM `users` WHERE `username` = ? AND `_id` != ?",
          [candidate, user._id]
        );
        if (existing.length === 0) {
          break;
        }
        candidate = `${cleanUsername}${counter}`;
        counter++;
      }

      // Update user in DB
      await conn.query("UPDATE `users` SET `username` = ? WHERE `_id` = ?", [candidate, user._id]);
      console.log(`  [FIXED] ID: ${user._id} | '${oldUsername}' ➔ '${candidate}'`);
      updatedCount++;
    }

    console.log(`\n🎉 SUCCESS: ${updatedCount} usernames have been cleaned and updated!`);
  } catch (err) {
    console.error('❌ Error fixing usernames:', err);
  } finally {
    if (conn) await conn.end();
  }
}

fixUsernames();
