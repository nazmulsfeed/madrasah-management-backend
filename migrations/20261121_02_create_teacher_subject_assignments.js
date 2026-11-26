/**
 * Migration: 20261121_02_create_teacher_subject_assignments
 *
 * Creates the teacher_subject_assignments table with:
 * - Foreign keys to teachers, subjects, classlevels, sections (_id)
 * - Stored generated column sectionScopeKey for normalized sectionless uniqueness
 * - Unique constraint preventing duplicates per (institution, teacher, subject, classLevel, sectionScopeKey, academicYear)
 * - Safe rollback in down()
 */

const { verifySafetyGatekeeper } = require('../tests/safetyGatekeeper');

async function up(connection) {
  // Gatekeeper assertion: MUST pass before executing any DDL
  await verifySafetyGatekeeper(connection);

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS \`teacher_subject_assignments\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`_id\` CHAR(36) NOT NULL UNIQUE,
      \`institution\` VARCHAR(255) NOT NULL,
      \`teacher\` CHAR(36) NOT NULL,
      \`subject\` CHAR(36) NOT NULL,
      \`classLevel\` CHAR(36) NOT NULL,
      \`section\` CHAR(36) NULL DEFAULT NULL,
      \`sectionScopeKey\` VARCHAR(50) GENERATED ALWAYS AS (COALESCE(\`section\`, '__CLASS_WIDE__')) STORED,
      \`academicYear\` VARCHAR(50) NOT NULL,
      \`status\` ENUM('draft', 'active', 'inactive') NOT NULL DEFAULT 'draft',
      \`assignedBy\` VARCHAR(255) NOT NULL,
      \`updatedBy\` VARCHAR(255) NULL,
      \`approvedBy\` VARCHAR(255) NULL,
      \`approvedAt\` DATETIME NULL,
      \`deactivatedBy\` VARCHAR(255) NULL,
      \`deactivatedAt\` DATETIME NULL,
      \`deactivationReason\` VARCHAR(255) NULL,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`uniq_tsa_assignment\` (\`institution\`, \`teacher\`, \`subject\`, \`classLevel\`, \`sectionScopeKey\`, \`academicYear\`),
      INDEX \`idx_tsa_auth_lookup\` (\`institution\`, \`teacher\`, \`status\`, \`academicYear\`),
      INDEX \`idx_tsa_subject_class\` (\`institution\`, \`subject\`, \`classLevel\`, \`sectionScopeKey\`),
      CONSTRAINT \`fk_tsa_teacher\` FOREIGN KEY (\`teacher\`) REFERENCES \`teachers\` (\`_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT \`fk_tsa_subject\` FOREIGN KEY (\`subject\`) REFERENCES \`subjects\` (\`_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT \`fk_tsa_classLevel\` FOREIGN KEY (\`classLevel\`) REFERENCES \`classlevels\` (\`_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT \`fk_tsa_section\` FOREIGN KEY (\`section\`) REFERENCES \`sections\` (\`_id\`) ON DELETE RESTRICT ON UPDATE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.query(createTableSql);
  return { success: true, message: 'Table teacher_subject_assignments created successfully.' };
}

async function down(connection) {
  // Gatekeeper assertion
  await verifySafetyGatekeeper(connection);

  await connection.query('DROP TABLE IF EXISTS `teacher_subject_assignments`;');
  return { success: true, message: 'Table teacher_subject_assignments dropped successfully.' };
}

module.exports = { up, down };
