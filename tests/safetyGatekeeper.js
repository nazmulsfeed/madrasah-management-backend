/**
 * Safety Gatekeeper for Isolated Test Environment
 *
 * Enforces strict fail-closed guarantees to ensure test code NEVER executes
 * against development, staging, or production databases.
 */

const EXPECTED_TEST_DB = 'annurisl_madrasah_test';
const EXACT_TEST_USER_ALLOWLIST = Object.freeze(['madrasah_test_user@127.0.0.1']);

/**
 * Asserts that the current runtime environment and database connection are completely isolated.
 * Fails closed (throws Error) if ANY safety condition is violated.
 *
 * @param {import('sequelize').Sequelize | import('mysql2/promise').Connection} connection
 * @returns {Promise<{ isSafe: boolean, database: string, currentUser: string }>}
 */
async function verifySafetyGatekeeper(connection) {
  // Check 1: NODE_ENV must be explicitly 'test'
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `FATAL SAFETY VIOLATION: NODE_ENV is "${process.env.NODE_ENV}". Tests may only run when NODE_ENV="test".`
    );
  }

  // Check 2: Configured DB_NAME must be exactly 'annurisl_madrasah_test'
  if (process.env.DB_NAME !== EXPECTED_TEST_DB) {
    throw new Error(
      `FATAL SAFETY VIOLATION: process.env.DB_NAME is "${process.env.DB_NAME}". Expected exactly "${EXPECTED_TEST_DB}".`
    );
  }

  // Check 3: Runtime SELECT DATABASE() and CURRENT_USER()
  let currentDb = null;
  let currentUser = null;

  if (typeof connection.query === 'function') {
    // Works with both Sequelize and mysql2/promise
    const result = await connection.query('SELECT DATABASE() AS currentDb, CURRENT_USER() AS currentUser;');
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : (Array.isArray(result) ? result : []);
    const row = rows[0] || (result[0] && typeof result[0] === 'object' ? result[0] : {});

    currentDb = row.currentDb || (Array.isArray(row) ? row[0] : null);
    currentUser = row.currentUser || (Array.isArray(row) ? row[1] : null);
  } else {
    throw new Error('FATAL SAFETY VIOLATION: Invalid database connection object provided to safety gatekeeper.');
  }

  if (currentDb !== EXPECTED_TEST_DB) {
    throw new Error(
      `FATAL SAFETY VIOLATION: Connected MySQL database is "${currentDb}". Expected strictly "${EXPECTED_TEST_DB}".`
    );
  }

  // Exact account allowlist check (NO startsWith)
  if (!currentUser || !EXACT_TEST_USER_ALLOWLIST.includes(String(currentUser))) {
    throw new Error(
      `FATAL SAFETY VIOLATION: Connected MySQL user is "${currentUser}". Expected exact allowlisted identity in [${EXACT_TEST_USER_ALLOWLIST.join(', ')}].`
    );
  }

  // Check 4: Active Negative Probe - Test user MUST be denied access to production database 'annurisl_madrasah'
  let productionLeaked = false;
  try {
    if (typeof connection.query === 'function') {
      await connection.query('SELECT 1 FROM `annurisl_madrasah`.`users` LIMIT 1;');
      productionLeaked = true;
    }
  } catch (probeErr) {
    // Inspect underlying error (Sequelize wraps driver error in .original or .parent)
    const underlying = probeErr.original || probeErr.parent || probeErr;
    const errno = underlying.errno !== undefined ? underlying.errno : probeErr.errno;
    const code = underlying.code || probeErr.code;

    // STRICT CHECK: Only specific Access Denied error codes count as successful production denial
    const isExactAccessDenied =
      errno === 1044 ||
      errno === 1142 ||
      code === 'ER_DBACCESS_DENIED_ERROR' ||
      code === 'ER_TABLEACCESS_DENIED_ERROR';

    if (!isExactAccessDenied) {
      // Any other unexpected error (network error, syntax error, host unreachable, etc.) must fail closed
      throw new Error(
        `FATAL SAFETY VIOLATION: Unexpected error while probing production isolation (must fail closed): [${code} / ${errno}] ${probeErr.message}`
      );
    }
  }

  if (productionLeaked) {
    throw new Error(
      'FATAL SAFETY VIOLATION: Test user HAS ACCESS to production database "annurisl_madrasah"! Halting execution immediately.'
    );
  }

  return {
    isSafe: true,
    database: currentDb,
    currentUser: currentUser,
  };
}

module.exports = {
  verifySafetyGatekeeper,
  EXPECTED_TEST_DB,
  EXACT_TEST_USER_ALLOWLIST,
};
