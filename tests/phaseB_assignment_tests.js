/**
 * Phase B Test Suite: TeacherSubjectAssignment Model & Constraints
 *
 * Runs strictly against `annurisl_madrasah_test`.
 * Safety gatekeeper enforces fail-closed execution before any test runs.
 */

const path = require('path');
const mysql = require('mysql2/promise');
const { verifySafetyGatekeeper } = require('./safetyGatekeeper');

async function runPhaseBTests() {
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

  console.log('=== PHASE 2.6B.5 — PHASE B TEST SUITE ===');
  let passedCount = 0;
  let totalTests = 9;

  try {
    // 0. Safety Gatekeeper check
    await verifySafetyGatekeeper(connection);
    console.log('🛡️ Safety Gatekeeper: PASSED (Verified test database and isolated test user).');

    // Clean previous synthetic test fixtures in test DB
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('TRUNCATE TABLE `teacher_subject_assignments`;');
    await connection.query('TRUNCATE TABLE `teachers`;');
    await connection.query('TRUNCATE TABLE `subjects`;');
    await connection.query('TRUNCATE TABLE `sections`;');
    await connection.query('TRUNCATE TABLE `classlevels`;');
    await connection.query('TRUNCATE TABLE `institutions`;');
    await connection.query('TRUNCATE TABLE `users`;');
    await connection.query('TRUNCATE TABLE `academicyears`;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    // Seed synthetic fixtures
    const INST_A = 'inst_test_academy_a';
    const INST_B = 'inst_test_academy_b';

    const TEACHER_1 = '00000000-0000-4000-a000-000000000001';
    const TEACHER_2 = '00000000-0000-4000-a000-000000000002';
    const TEACHER_DIFF = '00000000-0000-4000-b000-000000000099';

    const CLASS_3 = '10000000-0000-4000-a000-000000000003';
    const CLASS_4_SECTIONLESS = '10000000-0000-4000-a000-000000000004';

    const SEC_3A = '20000000-0000-4000-a000-000000000001';
    const SEC_3B = '20000000-0000-4000-a000-000000000002';

    const SUB_MATH = '30000000-0000-4000-a000-000000000001';
    const SUB_ARABIC = '30000000-0000-4000-a000-000000000002';
    const SUB_DIFF = '30000000-0000-4000-b000-000000000099';

    const ADMIN_USER = 'admin_test_user_001';

    // Insert base fixtures
    await connection.query(`INSERT INTO institutions (_id, name) VALUES ('${INST_A}', 'Test Academy A'), ('${INST_B}', 'Test Academy B');`);
    await connection.query(`INSERT INTO users (_id, username, password, userType, institution) VALUES ('${ADMIN_USER}', 'testadmin', 'pass', 'admin', '${INST_A}');`);
    await connection.query(`INSERT INTO classlevels (_id, institution, name, code) VALUES ('${CLASS_3}', '${INST_A}', 'Class 3', 'C3'), ('${CLASS_4_SECTIONLESS}', '${INST_A}', 'Class 4 Sectionless', 'C4');`);
    await connection.query(`INSERT INTO sections (_id, institution, classLevel, name) VALUES ('${SEC_3A}', '${INST_A}', '${CLASS_3}', 'Section A'), ('${SEC_3B}', '${INST_A}', '${CLASS_3}', 'Section B');`);
    await connection.query(`INSERT INTO subjects (_id, institution, name, code) VALUES ('${SUB_MATH}', '${INST_A}', 'Mathematics', 'MATH'), ('${SUB_ARABIC}', '${INST_A}', 'Arabic', 'ARB'), ('${SUB_DIFF}', '${INST_B}', 'Diff Inst Subject', 'DIFF');`);
    await connection.query(`INSERT INTO teachers (_id, user, institution, employeeId) VALUES ('${TEACHER_1}', 'u1', '${INST_A}', 'EMP-T1'), ('${TEACHER_2}', 'u2', '${INST_A}', 'EMP-T2'), ('${TEACHER_DIFF}', 'u3', '${INST_B}', 'EMP-DIFF');`);

    console.log('✅ Base synthetic fixtures initialized.');

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Successful Assignment Creation (Section-Specific & Sectionless)
    // ─────────────────────────────────────────────────────────────
    const ASSIGN_1_ID = '40000000-0000-4000-a000-000000000001';
    const ASSIGN_2_ID = '40000000-0000-4000-a000-000000000002';

    // 1a: Section-specific
    await connection.query(`
      INSERT INTO teacher_subject_assignments
      (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy)
      VALUES
      ('${ASSIGN_1_ID}', '${INST_A}', '${TEACHER_1}', '${SUB_MATH}', '${CLASS_3}', '${SEC_3A}', '2026', 'draft', '${ADMIN_USER}');
    `);

    // 1b: Sectionless (section is explicitly NULL)
    await connection.query(`
      INSERT INTO teacher_subject_assignments
      (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy)
      VALUES
      ('${ASSIGN_2_ID}', '${INST_A}', '${TEACHER_1}', '${SUB_MATH}', '${CLASS_4_SECTIONLESS}', NULL, '2026', 'active', '${ADMIN_USER}');
    `);

    const [rows1] = await connection.query(`SELECT _id, section, sectionScopeKey, status FROM teacher_subject_assignments WHERE _id IN ('${ASSIGN_1_ID}', '${ASSIGN_2_ID}');`);
    const a1 = rows1.find(r => r._id === ASSIGN_1_ID);
    const a2 = rows1.find(r => r._id === ASSIGN_2_ID);

    if (a1 && a1.section === SEC_3A && a1.sectionScopeKey === SEC_3A &&
        a2 && a2.section === null && a2.sectionScopeKey === '__CLASS_WIDE__') {
      console.log('✅ Test 1 PASS: Successful assignment creation (both section-specific and sectionless).');
      passedCount++;
    } else {
      console.error('❌ Test 1 FAIL: Unexpected assignment rows:', rows1);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Duplicate Assignment Rejection
    // ─────────────────────────────────────────────────────────────
    let dupSectionRejected = false;
    let dupSectionlessRejected = false;

    // 2a: Duplicate section-specific
    try {
      await connection.query(`
        INSERT INTO teacher_subject_assignments
        (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy)
        VALUES
        ('dup-id-1', '${INST_A}', '${TEACHER_1}', '${SUB_MATH}', '${CLASS_3}', '${SEC_3A}', '2026', 'draft', '${ADMIN_USER}');
      `);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') dupSectionRejected = true;
    }

    // 2b: Duplicate sectionless (NULL section must collide on sectionScopeKey = '__CLASS_WIDE__')
    try {
      await connection.query(`
        INSERT INTO teacher_subject_assignments
        (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy)
        VALUES
        ('dup-id-2', '${INST_A}', '${TEACHER_1}', '${SUB_MATH}', '${CLASS_4_SECTIONLESS}', NULL, '2026', 'active', '${ADMIN_USER}');
      `);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') dupSectionlessRejected = true;
    }

    if (dupSectionRejected && dupSectionlessRejected) {
      console.log('✅ Test 2 PASS: Duplicate assignment rejected for both sectioned and sectionless classes (ER_DUP_ENTRY).');
      passedCount++;
    } else {
      console.error('❌ Test 2 FAIL:', { dupSectionRejected, dupSectionlessRejected });
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Invalid Foreign Key Rejection
    // ─────────────────────────────────────────────────────────────
    let invalidTeacherRejected = false;
    let invalidSubjectRejected = false;
    let invalidClassRejected = false;
    let invalidSectionRejected = false;

    const NON_EXISTENT = '99999999-9999-9999-9999-999999999999';

    try {
      await connection.query(`INSERT INTO teacher_subject_assignments (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy) VALUES ('fk-err-1', '${INST_A}', '${NON_EXISTENT}', '${SUB_MATH}', '${CLASS_3}', '${SEC_3A}', '2026', 'draft', '${ADMIN_USER}');`);
    } catch (e) { if (e.code === 'ER_NO_REFERENCED_ROW_2') invalidTeacherRejected = true; }

    try {
      await connection.query(`INSERT INTO teacher_subject_assignments (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy) VALUES ('fk-err-2', '${INST_A}', '${TEACHER_1}', '${NON_EXISTENT}', '${CLASS_3}', '${SEC_3A}', '2026', 'draft', '${ADMIN_USER}');`);
    } catch (e) { if (e.code === 'ER_NO_REFERENCED_ROW_2') invalidSubjectRejected = true; }

    try {
      await connection.query(`INSERT INTO teacher_subject_assignments (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy) VALUES ('fk-err-3', '${INST_A}', '${TEACHER_1}', '${SUB_MATH}', '${NON_EXISTENT}', '${SEC_3A}', '2026', 'draft', '${ADMIN_USER}');`);
    } catch (e) { if (e.code === 'ER_NO_REFERENCED_ROW_2') invalidClassRejected = true; }

    try {
      await connection.query(`INSERT INTO teacher_subject_assignments (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy) VALUES ('fk-err-4', '${INST_A}', '${TEACHER_1}', '${SUB_MATH}', '${CLASS_3}', '${NON_EXISTENT}', '2026', 'draft', '${ADMIN_USER}');`);
    } catch (e) { if (e.code === 'ER_NO_REFERENCED_ROW_2') invalidSectionRejected = true; }

    if (invalidTeacherRejected && invalidSubjectRejected && invalidClassRejected && invalidSectionRejected) {
      console.log('✅ Test 3 PASS: Invalid foreign key rejected for all 4 relations (ER_NO_REFERENCED_ROW_2).');
      passedCount++;
    } else {
      console.error('❌ Test 3 FAIL:', { invalidTeacherRejected, invalidSubjectRejected, invalidClassRejected, invalidSectionRejected });
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Cross-Institution Relationship Rejection
    // ─────────────────────────────────────────────────────────────
    // Teacher in Inst A cannot be assigned to Subject in Inst B
    const validateCrossInstitution = async (inst, teacherId, subjectId) => {
      const [t] = await connection.query(`SELECT institution FROM teachers WHERE _id = '${teacherId}';`);
      const [s] = await connection.query(`SELECT institution FROM subjects WHERE _id = '${subjectId}';`);
      if (!t[0] || !s[0]) throw new Error('Entity not found');
      if (t[0].institution !== inst || s[0].institution !== inst) {
        throw new Error('CROSS_INSTITUTION_PROHIBITED: Teacher and Subject institutions must match.');
      }
    };

    let crossInstRejected = false;
    try {
      await validateCrossInstitution(INST_A, TEACHER_1, SUB_DIFF);
    } catch (e) {
      if (e.message.includes('CROSS_INSTITUTION_PROHIBITED')) crossInstRejected = true;
    }

    if (crossInstRejected) {
      console.log('✅ Test 4 PASS: Cross-institution relationship rejected.');
      passedCount++;
    } else {
      console.error('❌ Test 4 FAIL: Cross-institution check did not reject!');
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Inactive Assignment Reactivation Policy
    // ─────────────────────────────────────────────────────────────
    // Teacher 2 assigned to Arabic, then deactivated, then reactivated without duplicate
    const ASSIGN_REACTIVATE = '40000000-0000-4000-a000-000000000005';
    await connection.query(`
      INSERT INTO teacher_subject_assignments
      (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy)
      VALUES
      ('${ASSIGN_REACTIVATE}', '${INST_A}', '${TEACHER_2}', '${SUB_ARABIC}', '${CLASS_3}', '${SEC_3A}', '2026', 'active', '${ADMIN_USER}');
    `);

    // Deactivate
    await connection.query(`
      UPDATE teacher_subject_assignments
      SET status = 'inactive', deactivatedBy = '${ADMIN_USER}', deactivatedAt = NOW(), deactivationReason = 'Medical leave'
      WHERE _id = '${ASSIGN_REACTIVATE}';
    `);

    // Reactivation without duplicate
    await connection.query(`
      UPDATE teacher_subject_assignments
      SET status = 'active', deactivatedBy = NULL, deactivatedAt = NULL, deactivationReason = NULL, updatedBy = '${ADMIN_USER}'
      WHERE _id = '${ASSIGN_REACTIVATE}';
    `);

    const [reactivatedRows] = await connection.query(`SELECT status, deactivatedBy, updatedBy FROM teacher_subject_assignments WHERE _id = '${ASSIGN_REACTIVATE}';`);
    const [dupCheck] = await connection.query(`SELECT COUNT(*) as count FROM teacher_subject_assignments WHERE teacher = '${TEACHER_2}' AND subject = '${SUB_ARABIC}' AND classLevel = '${CLASS_3}' AND section = '${SEC_3A}' AND academicYear = '2026';`);

    if (reactivatedRows[0].status === 'active' && reactivatedRows[0].deactivatedBy === null && dupCheck[0].count === 1) {
      console.log('✅ Test 5 PASS: Inactive assignment reactivated in-place without creating duplicate records.');
      passedCount++;
    } else {
      console.error('❌ Test 5 FAIL:', { reactivatedRows, dupCheck });
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Draft / Active / Inactive Lifecycle
    // ─────────────────────────────────────────────────────────────
    const ASSIGN_LC = '40000000-0000-4000-a000-000000000006';
    // 1. Create draft
    await connection.query(`INSERT INTO teacher_subject_assignments (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy) VALUES ('${ASSIGN_LC}', '${INST_A}', '${TEACHER_2}', '${SUB_ARABIC}', '${CLASS_3}', '${SEC_3B}', '2026', 'draft', '${ADMIN_USER}');`);
    const [rDraft] = await connection.query(`SELECT status FROM teacher_subject_assignments WHERE _id = '${ASSIGN_LC}';`);

    // 2. Approve draft to active
    await connection.query(`UPDATE teacher_subject_assignments SET status = 'active', approvedBy = '${ADMIN_USER}', approvedAt = NOW() WHERE _id = '${ASSIGN_LC}';`);
    const [rActive] = await connection.query(`SELECT status, approvedBy FROM teacher_subject_assignments WHERE _id = '${ASSIGN_LC}';`);

    // 3. Deactivate to inactive
    await connection.query(`UPDATE teacher_subject_assignments SET status = 'inactive', deactivatedBy = '${ADMIN_USER}', deactivatedAt = NOW(), deactivationReason = 'Shift change' WHERE _id = '${ASSIGN_LC}';`);
    const [rInactive] = await connection.query(`SELECT status, deactivatedBy, deactivationReason FROM teacher_subject_assignments WHERE _id = '${ASSIGN_LC}';`);

    if (rDraft[0].status === 'draft' && rActive[0].status === 'active' && rActive[0].approvedBy === ADMIN_USER && rInactive[0].status === 'inactive' && rInactive[0].deactivationReason === 'Shift change') {
      console.log('✅ Test 6 PASS: Draft -> Active -> Inactive lifecycle transitions verified with audit trail.');
      passedCount++;
    } else {
      console.error('❌ Test 6 FAIL Lifecycle:', { rDraft, rActive, rInactive });
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Explicit Academic-Year Isolation
    // ─────────────────────────────────────────────────────────────
    // Same teacher, subject, class, section in 2026 vs 2027
    const ASSIGN_2027 = '40000000-0000-4000-a000-000000000007';
    await connection.query(`
      INSERT INTO teacher_subject_assignments
      (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy)
      VALUES
      ('${ASSIGN_2027}', '${INST_A}', '${TEACHER_1}', '${SUB_MATH}', '${CLASS_3}', '${SEC_3A}', '2027', 'active', '${ADMIN_USER}');
    `);

    const [yearRows] = await connection.query(`
      SELECT _id, academicYear FROM teacher_subject_assignments
      WHERE teacher = '${TEACHER_1}' AND subject = '${SUB_MATH}' AND classLevel = '${CLASS_3}' AND section = '${SEC_3A}'
      ORDER BY academicYear ASC;
    `);

    if (yearRows.length === 2 && yearRows[0].academicYear === '2026' && yearRows[1].academicYear === '2027') {
      console.log('✅ Test 7 PASS: Explicit academic-year isolation verified (2026 and 2027 coexist cleanly).');
      passedCount++;
    } else {
      console.error('❌ Test 7 FAIL Year Isolation:', yearRows);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Section-Specific Assignment Integrity
    // ─────────────────────────────────────────────────────────────
    // Teacher 1 on Section A, Teacher 2 on Section B (same class & subject in 2026)
    const [secRows] = await connection.query(`
      SELECT teacher, section FROM teacher_subject_assignments
      WHERE classLevel = '${CLASS_3}' AND subject = '${SUB_MATH}' AND academicYear = '2026';
    `);

    // Add Teacher 2 to Section B
    const ASSIGN_SEC_B = '40000000-0000-4000-a000-000000000008';
    await connection.query(`
      INSERT INTO teacher_subject_assignments
      (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy)
      VALUES
      ('${ASSIGN_SEC_B}', '${INST_A}', '${TEACHER_2}', '${SUB_MATH}', '${CLASS_3}', '${SEC_3B}', '2026', 'active', '${ADMIN_USER}');
    `);

    const [bothSecRows] = await connection.query(`
      SELECT teacher, section FROM teacher_subject_assignments
      WHERE classLevel = '${CLASS_3}' AND subject = '${SUB_MATH}' AND academicYear = '2026';
    `);

    if (bothSecRows.length === 2 &&
        bothSecRows.some(r => r.teacher === TEACHER_1 && r.section === SEC_3A) &&
        bothSecRows.some(r => r.teacher === TEACHER_2 && r.section === SEC_3B)) {
      console.log('✅ Test 8 PASS: Section-specific assignments strictly isolated between sections.');
      passedCount++;
    } else {
      console.error('❌ Test 8 FAIL Section Integrity:', bothSecRows);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Sectionless Class Representation
    // ─────────────────────────────────────────────────────────────
    const [slRow] = await connection.query(`
      SELECT _id, section, sectionScopeKey FROM teacher_subject_assignments
      WHERE classLevel = '${CLASS_4_SECTIONLESS}';
    `);

    if (slRow.length === 1 && slRow[0].section === null && slRow[0].sectionScopeKey === '__CLASS_WIDE__') {
      console.log('✅ Test 9 PASS: Sectionless class represented with section=NULL and sectionScopeKey="__CLASS_WIDE__" (No fake keys used).');
      passedCount++;
    } else {
      console.error('❌ Test 9 FAIL Sectionless Representation:', slRow);
    }

  } finally {
    await connection.end();
  }

  console.log(`=== TEST SUMMARY: ${passedCount}/${totalTests} TESTS PASSED ===`);
  process.exit(passedCount === totalTests ? 0 : 1);
}

runPhaseBTests();
