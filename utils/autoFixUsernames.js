const db = require('../config/db');
const sequelize = db.sequelize || db;

/**
 * Automatically cleans up usernames containing spaces on server boot.
 * Strips all spaces, converts to lowercase, and resolves any duplicate collisions safely.
 */
async function autoFixUsernamesOnBoot() {
  try {
    const [usersWithSpaces] = await sequelize.query(
      "SELECT `_id`, `username`, `firstName`, `lastName` FROM `users` WHERE `username` LIKE '% %'"
    );

    if (!usersWithSpaces || usersWithSpaces.length === 0) {
      return;
    }

    console.log(`[Auto-Fix] 🔍 Found ${usersWithSpaces.length} usernames containing spaces. Cleaning up...`);

    let fixedCount = 0;

    for (const u of usersWithSpaces) {
      const oldUsername = u.username;
      let clean = oldUsername.toLowerCase().replace(/\s+/g, '');
      if (!clean) {
        clean = `user${String(u._id).substring(0, 6)}`;
      }

      let candidate = clean;
      let counter = 1;

      while (true) {
        const [conflict] = await sequelize.query(
          "SELECT `_id` FROM `users` WHERE `username` = :candidate AND `_id` != :id",
          {
            replacements: { candidate, id: u._id }
          }
        );

        if (!conflict || conflict.length === 0) {
          break;
        }

        candidate = `${clean}${counter}`;
        counter++;
      }

      await sequelize.query(
        "UPDATE `users` SET `username` = :candidate WHERE `_id` = :id",
        {
          replacements: { candidate, id: u._id }
        }
      );

      console.log(`[Auto-Fix] ✅ User '${oldUsername}' ➔ '${candidate}'`);
      fixedCount++;
    }

    console.log(`[Auto-Fix] 🎉 Successfully fixed ${fixedCount} usernames with spaces.`);
  } catch (err) {
    console.error('[Auto-Fix] ⚠️ Could not run automatic username cleanup:', err.message);
  }
}

module.exports = { autoFixUsernamesOnBoot };
