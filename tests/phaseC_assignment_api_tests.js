/**
 * Phase C Test Suite: Admin Teacher-Subject Assignment Management API
 *
 * Runs strictly against `annurisl_madrasah_test` with `madrasah_test_user@127.0.0.1`.
 * Safety gatekeeper enforces fail-closed execution before any test runs.
 */

const path = require('path');
const dotenv = require('dotenv');

const envTestPath = path.join(__dirname, '..', '.env.test');
dotenv.config({ path: envTestPath });

const { verifySafetyGatekeeper } = require('./safetyGatekeeper');
const sequelize = require('../config/db');
const controller = require('../controllers/teacherSubjectAssignmentController');
const { authorize } = require('../middleware/rbac');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');

// Mock express req / res generator for Controller-level Integration Testing
function createMockReqRes({ user, body = {}, query = {}, params = {}, headers = {} }) {
  const req = {
    user: user || null,
    body: { ...body },
    query: { ...query },
    params: { ...params },
    headers: { ...headers },
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

// Helper to execute Express middleware
async function runMiddleware(middleware, req) {
  let nextCalled = false;
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
  };

  await middleware(req, res, () => {
    nextCalled = true;
  });

  return { nextCalled, statusCode, responseData };
}

async function runPhaseCTests() {
  console.log('=== PHASE 2.6B.6.2 — PHASE C SECURITY HARDENED TEST SUITE ===');
  let passedCount = 0;
  const totalTests = 22;

  try {
    // 0. Safety Gatekeeper check
    await verifySafetyGatekeeper(sequelize);
    console.log('🛡️ Safety Gatekeeper: PASSED (Verified exact account madrasah_test_user@127.0.0.1 on annurisl_madrasah_test).');

    // Clean previous synthetic test fixtures in test DB
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await sequelize.query('TRUNCATE TABLE `teacher_subject_assignments`;');
    await sequelize.query('TRUNCATE TABLE `teachers`;');
    await sequelize.query('TRUNCATE TABLE `subjects`;');
    await sequelize.query('TRUNCATE TABLE `sections`;');
    await sequelize.query('TRUNCATE TABLE `classlevels`;');
    await sequelize.query('TRUNCATE TABLE `institutions`;');
    await sequelize.query('TRUNCATE TABLE `users`;');
    await sequelize.query('TRUNCATE TABLE `academicyears`;');
    await sequelize.query('TRUNCATE TABLE `rolepermissions`;');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    // Synthetic Fixture IDs
    const INST_A = 'inst_academy_alpha';
    const INST_B = 'inst_academy_beta';

    const USER_SUPER = '00000000-0000-4000-u000-000000000000';
    const USER_ADMIN_A = '00000000-0000-4000-u000-000000000001';
    const USER_PRINCIPAL_A = '00000000-0000-4000-u000-000000000002';
    const USER_TEACHER_A = '00000000-0000-4000-u000-000000000003';
    const USER_STUDENT_A = '00000000-0000-4000-u000-000000000004';
    const USER_ADMIN_B = '00000000-0000-4000-u000-000000000005';

    const TEACHER_A1 = '00000000-0000-4000-a000-000000000001';
    const TEACHER_A2 = '00000000-0000-4000-a000-000000000002';
    const TEACHER_A3 = '00000000-0000-4000-a000-000000000003';
    const TEACHER_B1 = '00000000-0000-4000-b000-000000000001';

    const SUB_A_MATH = '30000000-0000-4000-a000-000000000001';
    const SUB_A_ARABIC = '30000000-0000-4000-a000-000000000002';
    const SUB_B_MATH = '30000000-0000-4000-b000-000000000001';

    const CLASS_A_3 = '10000000-0000-4000-a000-000000000003';
    const CLASS_A_4 = '10000000-0000-4000-a000-000000000004';
    const CLASS_B_3 = '10000000-0000-4000-b000-000000000003';

    const SEC_A_3A = '20000000-0000-4000-a000-000000000001';
    const SEC_A_3B = '20000000-0000-4000-a000-000000000002';
    const SEC_A_4A = '20000000-0000-4000-a000-000000000004';
    const SEC_B_3A = '20000000-0000-4000-b000-000000000001';

    // Seed fixtures
    await sequelize.query(`INSERT INTO institutions (_id, name, code) VALUES 
      ('${INST_A}', 'Academy Alpha', 'ALPHA'), 
      ('${INST_B}', 'Academy Beta', 'BETA');`);

    await sequelize.query(`INSERT INTO users (_id, username, password, userType, institution) VALUES 
      ('${USER_SUPER}', 'superadmin', 'pass', 'super_admin', ''),
      ('${USER_ADMIN_A}', 'admin_alpha', 'pass', 'admin', '${INST_A}'),
      ('${USER_PRINCIPAL_A}', 'principal_alpha', 'pass', 'principal', '${INST_A}'),
      ('${USER_TEACHER_A}', 'teacher_alpha', 'pass', 'teacher', '${INST_A}'),
      ('${USER_STUDENT_A}', 'student_alpha', 'pass', 'student', '${INST_A}'),
      ('${USER_ADMIN_B}', 'admin_beta', 'pass', 'admin', '${INST_B}');`);

    await sequelize.query(`INSERT INTO classlevels (_id, institution, name, code, isActive) VALUES 
      ('${CLASS_A_3}', '${INST_A}', 'Class 3 Alpha', 'C3', 1),
      ('${CLASS_A_4}', '${INST_A}', 'Class 4 Alpha', 'C4', 1),
      ('${CLASS_B_3}', '${INST_B}', 'Class 3 Beta', 'C3B', 1);`);

    await sequelize.query(`INSERT INTO sections (_id, institution, classLevel, name, isActive) VALUES 
      ('${SEC_A_3A}', '${INST_A}', '${CLASS_A_3}', 'Section 3A', 1),
      ('${SEC_A_3B}', '${INST_A}', '${CLASS_A_3}', 'Section 3B', 1),
      ('${SEC_A_4A}', '${INST_A}', '${CLASS_A_4}', 'Section 4A', 1),
      ('${SEC_B_3A}', '${INST_B}', '${CLASS_B_3}', 'Section B3A', 1);`);

    await sequelize.query(`INSERT INTO subjects (_id, institution, name, code, status) VALUES 
      ('${SUB_A_MATH}', '${INST_A}', 'Mathematics A', 'MATH-A', 'active'),
      ('${SUB_A_ARABIC}', '${INST_A}', 'Arabic A', 'ARB-A', 'active'),
      ('${SUB_B_MATH}', '${INST_B}', 'Mathematics B', 'MATH-B', 'active');`);

    await sequelize.query(`INSERT INTO teachers (_id, user, institution, employeeId, status) VALUES 
      ('${TEACHER_A1}', '${USER_TEACHER_A}', '${INST_A}', 'EMP-A1', 'active'),
      ('${TEACHER_A2}', 'u-ext-2', '${INST_A}', 'EMP-A2', 'active'),
      ('${TEACHER_A3}', 'u-ext-3', '${INST_A}', 'EMP-A3', 'active'),
      ('${TEACHER_B1}', 'u-ext-b', '${INST_B}', 'EMP-B1', 'active');`);

    await sequelize.query(`INSERT INTO academicyears (_id, institution, name, isActive) VALUES 
      ('ay-alpha-2026', '${INST_A}', '2026', 1),
      ('ay-alpha-2027', '${INST_A}', '2027', 1),
      ('ay-alpha-2025-inactive', '${INST_A}', '2025', 0),
      ('ay-beta-2026', '${INST_B}', '2026', 1);`);

    console.log('✅ Synthetic test fixtures initialized.');

    const superUser = { _id: USER_SUPER, userType: 'super_admin', institution: '' };
    const adminUser = { _id: USER_ADMIN_A, userType: 'admin', institution: INST_A };
    const principalUser = { _id: USER_PRINCIPAL_A, userType: 'principal', institution: INST_A };
    const teacherUser = { _id: USER_TEACHER_A, userType: 'teacher', institution: INST_A };
    const studentUser = { _id: USER_STUDENT_A, userType: 'student', institution: INST_A };
    const adminUserB = { _id: USER_ADMIN_B, userType: 'admin', institution: INST_B };

    const adminOnlyMiddleware = authorize('super_admin', 'co_super_admin', 'admin', 'principal');

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Strict Draft-Only Creation (POST ignores client status: 'active')
    // ─────────────────────────────────────────────────────────────
    let createdAssignmentId = null;
    {
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_A1,
          subject: SUB_A_MATH,
          classLevel: CLASS_A_3,
          section: SEC_A_3A,
          academicYear: '2026',
          status: 'active', // Caller attempts to bypass draft approval
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();

      // Must be created as draft, approvedBy and approvedAt must be null
      if (res.getStatusCode() === 201 &&
          data.success &&
          data.data.status === 'draft' &&
          data.data.approvedBy === null &&
          data.data.approvedAt === null) {
        createdAssignmentId = data.data._id;
        console.log('✅ Test 1 PASS: Strict Draft-Only creation enforced. Client status "active" ignored (HTTP 201).');
        passedCount++;
      } else {
        console.error('❌ Test 1 FAIL:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Unauthorized role cannot create an assignment
    // ─────────────────────────────────────────────────────────────
    {
      const { req: teacherReq } = createMockReqRes({ user: teacherUser });
      const teacherRes = await runMiddleware(adminOnlyMiddleware, teacherReq);

      const { req: studentReq } = createMockReqRes({ user: studentUser });
      const studentRes = await runMiddleware(adminOnlyMiddleware, studentReq);

      if (!teacherRes.nextCalled && teacherRes.statusCode === 403 &&
          !studentRes.nextCalled && studentRes.statusCode === 403) {
        console.log('✅ Test 2 PASS: Unauthorized roles (teacher, student) blocked by RBAC middleware (HTTP 403).');
        passedCount++;
      } else {
        console.error('❌ Test 2 FAIL:', { teacherRes, studentRes });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Cross-institution teacher is rejected
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_B1, // Belongs to Inst B
          subject: SUB_A_MATH,
          classLevel: CLASS_A_3,
          section: SEC_A_3A,
          academicYear: '2026',
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 403 && data.success === false && data.message.includes('ক্রস-ইনস্টিটিউশন শিক্ষক')) {
        console.log('✅ Test 3 PASS: Cross-institution teacher rejected (HTTP 403).');
        passedCount++;
      } else {
        console.error('❌ Test 3 FAIL:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Cross-institution subject is rejected
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_A1,
          subject: SUB_B_MATH, // Belongs to Inst B
          classLevel: CLASS_A_3,
          section: SEC_A_3A,
          academicYear: '2026',
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 403 && data.success === false && data.message.includes('ক্রস-ইনস্টিটিউশন বিষয়')) {
        console.log('✅ Test 4 PASS: Cross-institution subject rejected (HTTP 403).');
        passedCount++;
      } else {
        console.error('❌ Test 4 FAIL:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Cross-institution class is rejected
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_A1,
          subject: SUB_A_MATH,
          classLevel: CLASS_B_3, // Belongs to Inst B
          section: null,
          academicYear: '2026',
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 403 && data.success === false && data.message.includes('ক্রস-ইনস্টিটিউশন শ্রেণি')) {
        console.log('✅ Test 5 PASS: Cross-institution class rejected (HTTP 403).');
        passedCount++;
      } else {
        console.error('❌ Test 5 FAIL:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Section from another institution is rejected
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_A1,
          subject: SUB_A_MATH,
          classLevel: CLASS_A_3,
          section: SEC_B_3A, // Belongs to Inst B
          academicYear: '2026',
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 403 && data.success === false && data.message.includes('ক্রস-ইনস্টিটিউশন শাখা')) {
        console.log('✅ Test 6 PASS: Section from another institution rejected (HTTP 403).');
        passedCount++;
      } else {
        console.error('❌ Test 6 FAIL:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Section belonging to another class is rejected
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_A1,
          subject: SUB_A_MATH,
          classLevel: CLASS_A_3, // Class 3
          section: SEC_A_4A,     // Section belongs to Class 4!
          academicYear: '2026',
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 400 && data.success === false && data.message.includes('শাখাটি নির্বাচিত শ্রেণির অন্তর্ভুক্ত নয়')) {
        console.log('✅ Test 7 PASS: Section belonging to another class rejected (HTTP 400).');
        passedCount++;
      } else {
        console.error('❌ Test 7 FAIL:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Fail-Closed AcademicYear: Missing record in DB is rejected
    // ─────────────────────────────────────────────────────────────
    {
      // 8a: Regex matches valid format '2099', but record does NOT exist in academicyears table
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_A1,
          subject: SUB_A_MATH,
          classLevel: CLASS_A_3,
          section: SEC_A_3A,
          academicYear: '2099', // Missing in DB!
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 404 && data.success === false && data.message.includes('খুঁজে পাওয়া যায়নি বা এই প্রতিষ্ঠানের অন্তর্ভুক্ত নয়')) {
        console.log('✅ Test 8 PASS: Missing AcademicYear record rejected fail-closed (HTTP 404). Regex alone never authorizes.');
        passedCount++;
      } else {
        console.error('❌ Test 8 FAIL Missing Year:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Inactive AcademicYear is rejected
    // ─────────────────────────────────────────────────────────────
    {
      // '2025' exists in DB but isActive is 0
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_A1,
          subject: SUB_A_MATH,
          classLevel: CLASS_A_3,
          section: SEC_A_3A,
          academicYear: '2025',
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 400 && data.success === false && data.message.includes('নিষ্ক্রিয় অবস্থায় আছে')) {
        console.log('✅ Test 9 PASS: Inactive AcademicYear rejected (HTTP 400).');
        passedCount++;
      } else {
        console.error('❌ Test 9 FAIL Inactive Year:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Duplicate assignment is rejected
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: adminUser,
        body: {
          teacher: TEACHER_A1,
          subject: SUB_A_MATH,
          classLevel: CLASS_A_3,
          section: SEC_A_3A,
          academicYear: '2026',
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 409 && data.success === false && data.message.includes('ইতিমধ্যেই বিদ্যমান')) {
        console.log('✅ Test 10 PASS: Duplicate assignment rejected (HTTP 409).');
        passedCount++;
      } else {
        console.error('❌ Test 10 FAIL:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Valid assignment listing is institution-scoped
    // ─────────────────────────────────────────────────────────────
    let bAssignmentId = null;
    {
      // Create a valid draft assignment in Inst B by admin B
      const { req: bReq, res: bRes } = createMockReqRes({
        user: adminUserB,
        body: {
          teacher: TEACHER_B1,
          subject: SUB_B_MATH,
          classLevel: CLASS_B_3,
          section: SEC_B_3A,
          academicYear: '2026',
        },
      });
      await controller.createAssignment(bReq, bRes);
      bAssignmentId = bRes.getData().data._id;

      // List as Admin A
      const { req: listAReq, res: listARes } = createMockReqRes({
        user: adminUser,
        query: { page: 1, limit: 50 },
      });
      await controller.listAssignments(listAReq, listARes);
      const dataA = listARes.getData();

      // List as Admin B
      const { req: listBReq, res: listBRes } = createMockReqRes({
        user: adminUserB,
        query: { page: 1, limit: 50 },
      });
      await controller.listAssignments(listBReq, listBRes);
      const dataB = listBRes.getData();

      const allAInInstA = dataA.data.every(item => item.institution === INST_A);
      const allBInInstB = dataB.data.every(item => item.institution === INST_B);

      if (allAInInstA && allBInInstB && dataA.data.length >= 1 && dataB.data.length === 1) {
        console.log('✅ Test 11 PASS: Assignment listing strictly scoped to user institution (no leakage).');
        passedCount++;
      } else {
        console.error('❌ Test 11 FAIL Listing Scoping:', { dataA, dataB });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Draft approval works (Authorized Principal)
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: principalUser, // Principal approves
        params: { id: createdAssignmentId },
      });

      await controller.approveAssignment(req, res);
      const data = res.getData();

      if (res.getStatusCode() === 200 &&
          data.success &&
          data.data.status === 'active' &&
          data.data.approvedBy === USER_PRINCIPAL_A &&
          data.data.approvedAt !== null) {
        console.log('✅ Test 12 PASS: Draft assignment approved by authorized principal (HTTP 200).');
        passedCount++;
      } else {
        console.error('❌ Test 12 FAIL Approval:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Unauthorized role cannot approve assignment
    // ─────────────────────────────────────────────────────────────
    {
      const { req: teacherReq } = createMockReqRes({ user: teacherUser, params: { id: createdAssignmentId } });
      const teacherRes = await runMiddleware(adminOnlyMiddleware, teacherReq);

      if (!teacherRes.nextCalled && teacherRes.statusCode === 403) {
        console.log('✅ Test 13 PASS: Unauthorized role cannot approve assignment (HTTP 403 blocked by RBAC).');
        passedCount++;
      } else {
        console.error('❌ Test 13 FAIL Unauthorized Approval:', teacherRes);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Deactivation strictly requires reason
    // ─────────────────────────────────────────────────────────────
    {
      // 14a: Deactivate without reason (should fail)
      const { req: noReasonReq, res: noReasonRes } = createMockReqRes({
        user: adminUser,
        params: { id: createdAssignmentId },
        body: { reason: '' },
      });
      await controller.deactivateAssignment(noReasonReq, noReasonRes);

      // 14b: Deactivate with valid reason (should succeed)
      const { req: validReasonReq, res: validReasonRes } = createMockReqRes({
        user: adminUser,
        params: { id: createdAssignmentId },
        body: { reason: 'Teacher medical leave for 2 months' },
      });
      await controller.deactivateAssignment(validReasonReq, validReasonRes);
      const passData = validReasonRes.getData();

      if (noReasonRes.getStatusCode() === 400 &&
          validReasonRes.getStatusCode() === 200 &&
          passData.data.status === 'inactive' &&
          passData.data.deactivationReason === 'Teacher medical leave for 2 months' &&
          passData.data.deactivatedBy === USER_ADMIN_A) {
        console.log('✅ Test 14 PASS: Deactivation strictly requires reason (HTTP 400 on empty, HTTP 200 with audit on valid).');
        passedCount++;
      } else {
        console.error('❌ Test 14 FAIL Deactivation:', { noReasonRes, passData });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Reactivation follows the existing unique-record policy
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: principalUser,
        params: { id: createdAssignmentId },
      });

      await controller.reactivateAssignment(req, res);
      const data = res.getData();

      const [rows] = await sequelize.query(`SELECT COUNT(*) as count FROM teacher_subject_assignments WHERE _id = '${createdAssignmentId}';`);

      if (res.getStatusCode() === 200 &&
          data.success &&
          data.data.status === 'active' &&
          data.data.deactivatedBy === null &&
          data.data.deactivationReason === null &&
          rows[0].count === 1) {
        console.log('✅ Test 15 PASS: Inactive assignment reactivated in-place without creating duplicate rows.');
        passedCount++;
      } else {
        console.error('❌ Test 15 FAIL Reactivation:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Audit fields record the correct actor and timestamps
    // ─────────────────────────────────────────────────────────────
    {
      const assignment = await TeacherSubjectAssignment.findOne({ where: { _id: createdAssignmentId } });
      if (assignment.assignedBy === USER_ADMIN_A &&
          assignment.approvedBy === USER_PRINCIPAL_A &&
          assignment.approvedAt !== null &&
          assignment.updatedBy === USER_PRINCIPAL_A) {
        console.log('✅ Test 16 PASS: Full audit fields (assignedBy, approvedBy, approvedAt, updatedBy) recorded correctly.');
        passedCount++;
      } else {
        console.error('❌ Test 16 FAIL Audit Fields:', assignment.toJSON());
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 17: Super Admin selecting invalid institution is rejected
    // ─────────────────────────────────────────────────────────────
    {
      const { req, res } = createMockReqRes({
        user: superUser,
        body: {
          institution: 'non_existent_inst_999',
          teacher: TEACHER_A1,
          subject: SUB_A_MATH,
          classLevel: CLASS_A_3,
          academicYear: '2026',
        },
      });

      await controller.createAssignment(req, res);
      const data = res.getData();
      if (res.getStatusCode() === 404 && data.success === false && data.message.includes('প্রতিষ্ঠানটি (institution) ডাটাবেজে খুঁজে পাওয়া যায়নি')) {
        console.log('✅ Test 17 PASS: Super Admin invalid institution rejected against Institutions table (HTTP 404).');
        passedCount++;
      } else {
        console.error('❌ Test 17 FAIL Super Admin Inst Validation:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 18: Cross-tenant GET detail is rejected (404 Not Found)
    // ─────────────────────────────────────────────────────────────
    {
      // Admin A attempts to fetch assignment belonging to Inst B
      const { req, res } = createMockReqRes({
        user: adminUser,
        params: { id: bAssignmentId },
      });

      await controller.getAssignmentDetails(req, res);
      const data = res.getData();

      if (res.getStatusCode() === 404 && data.success === false) {
        console.log('✅ Test 18 PASS: Cross-tenant GET detail blocked. Returns 404 Not Found.');
        passedCount++;
      } else {
        console.error('❌ Test 18 FAIL Cross-tenant GET detail:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 19: Cross-tenant PUT update is rejected (404 Not Found)
    // ─────────────────────────────────────────────────────────────
    {
      // Admin A attempts to update assignment belonging to Inst B
      const { req, res } = createMockReqRes({
        user: adminUser,
        params: { id: bAssignmentId },
        body: { academicYear: '2027' },
      });

      await controller.updateAssignment(req, res);
      const data = res.getData();

      if (res.getStatusCode() === 404 && data.success === false) {
        console.log('✅ Test 19 PASS: Cross-tenant PUT update blocked. Returns 404 Not Found.');
        passedCount++;
      } else {
        console.error('❌ Test 19 FAIL Cross-tenant PUT update:', res.getStatusCode(), data);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 20: Mass-Assignment Protection on PUT
    // ─────────────────────────────────────────────────────────────
    {
      // Create a new draft assignment to test PUT updates
      const DRAFT_PUT_ID = '40000000-0000-4000-a000-000000000020';
      await sequelize.query(`
        INSERT INTO teacher_subject_assignments
        (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy, updatedBy)
        VALUES
        ('${DRAFT_PUT_ID}', '${INST_A}', '${TEACHER_A2}', '${SUB_A_ARABIC}', '${CLASS_A_3}', '${SEC_A_3B}', '2026', 'draft', '${USER_ADMIN_A}', '${USER_ADMIN_A}');
      `);

      // Malicious payload attempting to alter status, assignedBy, approvedBy, institution
      const { req, res } = createMockReqRes({
        user: adminUser,
        params: { id: DRAFT_PUT_ID },
        body: {
          academicYear: '2027', // Valid update field
          status: 'active',     // FORBIDDEN mass-assignment
          assignedBy: 'hacked_admin', // FORBIDDEN
          approvedBy: 'fake_approver', // FORBIDDEN
          institution: INST_B, // FORBIDDEN
        },
      });

      await controller.updateAssignment(req, res);
      const data = res.getData();

      const [updatedRow] = await sequelize.query(`SELECT * FROM teacher_subject_assignments WHERE _id = '${DRAFT_PUT_ID}';`);
      const row = updatedRow[0];

      if (res.getStatusCode() === 200 &&
          row.academicYear === '2027' &&
          row.status === 'draft' && // Protected!
          row.assignedBy === USER_ADMIN_A && // Protected!
          row.approvedBy === null && // Protected!
          row.institution === INST_A) { // Protected!
        console.log('✅ Test 20 PASS: Protected fields (status, assignedBy, approvedBy, institution) immune to mass-assignment injection.');
        passedCount++;
      } else {
        console.error('❌ Test 20 FAIL Mass Assignment:', row);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 21: Reactivation Conflict Protection
    // ─────────────────────────────────────────────────────────────
    {
      // 1. Deactivate Teacher 1 on Section A
      await sequelize.query(`UPDATE teacher_subject_assignments SET status = 'inactive' WHERE _id = '${createdAssignmentId}';`);

      // 2. Assign Teacher 3 to the exact same slot (Section A) and approve to active
      const REPLACEMENT_ID = '40000000-0000-4000-a000-000000000021';
      await sequelize.query(`
        INSERT INTO teacher_subject_assignments
        (_id, institution, teacher, subject, classLevel, section, academicYear, status, assignedBy, approvedBy, approvedAt)
        VALUES
        ('${REPLACEMENT_ID}', '${INST_A}', '${TEACHER_A3}', '${SUB_A_MATH}', '${CLASS_A_3}', '${SEC_A_3A}', '2026', 'active', '${USER_ADMIN_A}', '${USER_PRINCIPAL_A}', NOW());
      `);

      // 3. Now attempt to reactivate Teacher 1 while Teacher 3 is active in that slot!
      const { req, res } = createMockReqRes({
        user: principalUser,
        params: { id: createdAssignmentId },
      });

      await controller.reactivateAssignment(req, res);
      const data = res.getData();

      // Must be rejected with 409 Conflict because Teacher 3 occupies that slot
      if (res.getStatusCode() === 409 && data.success === false && data.message.includes('ইতিমধ্যে অপর একজন শিক্ষক সক্রিয় অ্যাসাইনমেন্টে নিয়োজিত')) {
        console.log('✅ Test 21 PASS: Reactivation conflict rejected when another active teacher occupies slot (HTTP 409).');
        passedCount++;
      } else {
        console.error('❌ Test 21 FAIL Reactivation Conflict:', res.getStatusCode(), data);
      }

      // Cleanup replacement
      await sequelize.query(`DELETE FROM teacher_subject_assignments WHERE _id = '${REPLACEMENT_ID}';`);
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 22: Pagination Boundaries Sanitization
    // ─────────────────────────────────────────────────────────────
    {
      // Test page: 0, negative limits, excessively large limits (> 100)
      const { req: p0Req, res: p0Res } = createMockReqRes({
        user: adminUser,
        query: { page: -5, limit: -10 },
      });
      await controller.listAssignments(p0Req, p0Res);
      const data0 = p0Res.getData();

      const { req: pLargeReq, res: pLargeRes } = createMockReqRes({
        user: adminUser,
        query: { page: 'invalid', limit: 999999 },
      });
      await controller.listAssignments(pLargeReq, pLargeRes);
      const dataLarge = pLargeRes.getData();

      if (data0.pagination.page === 1 && data0.pagination.limit === 20 &&
          dataLarge.pagination.page === 1 && dataLarge.pagination.limit === 100) {
        console.log('✅ Test 22 PASS: Pagination boundaries safely sanitized (page: 1, max limit capped at 100).');
        passedCount++;
      } else {
        console.error('❌ Test 22 FAIL Pagination Sanitization:', { data0: data0.pagination, dataLarge: dataLarge.pagination });
      }
    }

  } finally {
    await sequelize.close();
  }

  console.log(`=== TEST SUMMARY: ${passedCount}/${totalTests} TESTS PASSED ===`);
  process.exit(passedCount === totalTests ? 0 : 1);
}

runPhaseCTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
