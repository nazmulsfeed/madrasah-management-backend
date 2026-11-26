const path = require('path');
const mysql = require('mysql2/promise');
const { verifySafetyGatekeeper } = require('../tests/safetyGatekeeper');

async function runMigrations(action = 'up') {
  const envTestPath = path.join(__dirname, '..', '.env.test');
  require('dotenv').config({ path: envTestPath });

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    allowPublicKeyRetrieval: true,
  });

  try {
    // 1. Mandatory Gatekeeper Assertion
    await verifySafetyGatekeeper(connection);
    console.log(`[MigrationRunner] Safety gatekeeper verified. Executing "${action}" on ${process.env.DB_NAME}...`);

    const m1 = require('./20261121_01_init_test_dependencies');
    const m2 = require('./20261121_02_create_teacher_subject_assignments');

    if (action === 'up') {
      const res1 = await m1.up(connection);
      console.log(`[MigrationRunner] 01_init_test_dependencies up: ${res1.message}`);

      const res2 = await m2.up(connection);
      console.log(`[MigrationRunner] 02_create_teacher_subject_assignments up: ${res2.message}`);
    } else if (action === 'down') {
      const res2 = await m2.down(connection);
      console.log(`[MigrationRunner] 02_create_teacher_subject_assignments down: ${res2.message}`);

      const res1 = await m1.down(connection);
      console.log(`[MigrationRunner] 01_init_test_dependencies down: ${res1.message}`);
    } else {
      throw new Error(`Invalid migration action: ${action}`);
    }

    return { success: true };
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  const action = process.argv[2] || 'up';
  runMigrations(action)
    .then(() => {
      console.log(`[MigrationRunner] Migrations (${action}) completed successfully.`);
      process.exit(0);
    })
    .catch(err => {
      console.error(`[MigrationRunner] Migration failed:`, err.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
