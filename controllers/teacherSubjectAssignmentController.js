const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const ClassLevel = require('../models/ClassLevel');
const Section = require('../models/Section');
const AcademicYear = require('../models/AcademicYear');
const Institution = require('../models/Institution');
const ApiResponse = require('../utils/apiResponse');

/**
 * Resolves and validates the tenant institution.
 * Validates Super Admin's explicitly supplied institution against the Institutions table.
 * Non-super-admins are strictly pinned to req.user.institution.
 */
async function resolveAndValidateInstitution(req, overrideInst = null, transaction = null) {
  const isSuperOrCoSuper =
    req.user.userType === 'super_admin' ||
    req.user.userType === 'co_super_admin' ||
    req.user.adminRole === 'co_super_admin';

  let targetInst = null;
  if (isSuperOrCoSuper && overrideInst) {
    targetInst = String(overrideInst).trim();
    // Validate Super Admin's override institution against Institutions table
    const instRecord = await Institution.findOne({
      attributes: ['_id', 'name', 'code'],
      where: {
        [Op.or]: [{ _id: targetInst }, { name: targetInst }, { code: targetInst }],
      },
      transaction,
    });
    if (!instRecord) {
      return {
        valid: false,
        status: 404,
        message: 'নির্বাচিত প্রতিষ্ঠানটি (institution) ডাটাবেজে খুঁজে পাওয়া যায়নি',
      };
    }
    targetInst = instRecord._id;
  } else {
    targetInst = req.user.institution;
  }

  if (!targetInst) {
    return {
      valid: false,
      status: 400,
      message: 'প্রতিষ্ঠানের আইডি (institution) নির্ধারণ করা যায়নি',
    };
  }

  return { valid: true, institution: targetInst };
}

/**
 * Validates tenant relationships and entity active statuses.
 * Fails closed if any entity is missing, cross-institution, or inactive.
 */
async function validateAssignmentEntities({
  institution,
  teacherId,
  subjectId,
  classLevelId,
  sectionId,
  academicYear,
  transaction,
}) {
  if (!institution) {
    return { valid: false, status: 400, message: 'প্রতিষ্ঠানের আইডি (institution) নির্ধারণ করা যায়নি' };
  }

  // 1. Teacher validation
  const teacher = await Teacher.findOne({
    where: { _id: teacherId },
    transaction,
  });
  if (!teacher) {
    return { valid: false, status: 404, message: 'শিক্ষক পাওয়া যায়নি' };
  }
  if (teacher.institution !== institution) {
    return {
      valid: false,
      status: 403,
      message: 'ক্রস-ইনস্টিটিউশন শিক্ষক নিষিদ্ধ: শিক্ষক এই প্রতিষ্ঠানের অন্তর্ভুক্ত নন',
    };
  }
  if (teacher.status && teacher.status !== 'active') {
    return { valid: false, status: 400, message: 'অ্যাসাইনকৃত শিক্ষক বর্তমানে সক্রিয় (active) নন' };
  }

  // 2. Subject validation
  const subject = await Subject.findOne({
    where: { _id: subjectId },
    transaction,
  });
  if (!subject) {
    return { valid: false, status: 404, message: 'বিষয় পাওয়া যায়নি' };
  }
  if (subject.institution !== institution) {
    return {
      valid: false,
      status: 403,
      message: 'ক্রস-ইনস্টিটিউশন বিষয় নিষিদ্ধ: বিষয় এই প্রতিষ্ঠানের অন্তর্ভুক্ত নয়',
    };
  }
  if (subject.status && subject.status !== 'active') {
    return { valid: false, status: 400, message: 'অ্যাসাইনকৃত বিষয় বর্তমানে সক্রিয় (active) নয়' };
  }

  // 3. ClassLevel validation
  const classLevel = await ClassLevel.findOne({
    where: { _id: classLevelId },
    transaction,
  });
  if (!classLevel) {
    return { valid: false, status: 404, message: 'শ্রেণি পাওয়া যায়নি' };
  }
  if (classLevel.institution !== institution) {
    return {
      valid: false,
      status: 403,
      message: 'ক্রস-ইনস্টিটিউশন শ্রেণি নিষিদ্ধ: শ্রেণি এই প্রতিষ্ঠানের অন্তর্ভুক্ত নয়',
    };
  }
  if (classLevel.isActive === false || classLevel.isActive === 0) {
    return { valid: false, status: 400, message: 'অ্যাসাইনকৃত শ্রেণি বর্তমানে সক্রিয় নয়' };
  }

  // 4. Section validation
  let validatedSectionId = null;
  if (sectionId && String(sectionId).trim() !== '' && String(sectionId).trim().toLowerCase() !== 'null') {
    const section = await Section.findOne({
      where: { _id: String(sectionId).trim() },
      transaction,
    });
    if (!section) {
      return { valid: false, status: 404, message: 'শাখা পাওয়া যায়নি' };
    }
    if (section.institution !== institution) {
      return {
        valid: false,
        status: 403,
        message: 'ক্রস-ইনস্টিটিউশন শাখা নিষিদ্ধ: শাখা এই প্রতিষ্ঠানের অন্তর্ভুক্ত নয়',
      };
    }
    if (
      section.classLevel !== classLevel._id &&
      section.classLevel !== classLevel.code &&
      section.classLevel !== classLevel.name
    ) {
      return { valid: false, status: 400, message: 'শাখাটি নির্বাচিত শ্রেণির অন্তর্ভুক্ত নয়' };
    }
    if (section.isActive === false || section.isActive === 0) {
      return { valid: false, status: 400, message: 'নির্বাচিত শাখাটি সক্রিয় নয়' };
    }
    validatedSectionId = section._id;
  }

  // 5. AcademicYear Fail-Closed Validation
  const yearStr = String(academicYear || '').trim();
  const yearRegex = /^\d{4}(-\d{4})?$/;
  if (!yearStr || !yearRegex.test(yearStr)) {
    return {
      valid: false,
      status: 400,
      message: 'অবৈধ শিক্ষাবর্ষ। শিক্ষাবর্ষ চার সংখ্যার বছর (যেমন: 2026) অথবা সাল-পরিসীমা (যেমন: 2025-2026) হতে হবে।',
    };
  }

  // Exact database record required: must exist and match institution
  const existingAy = await AcademicYear.findOne({
    where: { institution, name: yearStr },
    transaction,
  });

  // Fail-closed: missing academic year records must be rejected
  if (!existingAy) {
    return {
      valid: false,
      status: 404,
      message: `শিক্ষাবর্ষ '${yearStr}' ডাটাবেজে খুঁজে পাওয়া যায়নি বা এই প্রতিষ্ঠানের অন্তর্ভুক্ত নয়`,
    };
  }

  // Fail-closed: inactive academic years must be rejected
  if (existingAy.isActive === false || existingAy.isActive === 0) {
    return {
      valid: false,
      status: 400,
      message: `নির্বাচিত শিক্ষাবর্ষ '${yearStr}' বর্তমানে নিষ্ক্রিয় অবস্থায় আছে`,
    };
  }

  return {
    valid: true,
    teacher,
    subject,
    classLevel,
    sectionId: validatedSectionId,
    academicYear: yearStr,
  };
}

/**
 * 1. Create Assignment
 * POST /api/v1/teacher-subject-assignments
 * Strict Draft-Only Policy: Always creates in 'draft' status. Ignores client-supplied status.
 */
exports.createAssignment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { teacher, subject, classLevel, section, academicYear, institution: bodyInst } = req.body;

    const instCheck = await resolveAndValidateInstitution(req, bodyInst, t);
    if (!instCheck.valid) {
      await t.rollback();
      return ApiResponse.error(res, instCheck.message, instCheck.status);
    }
    const institution = instCheck.institution;

    if (!teacher || !subject || !classLevel || !academicYear) {
      await t.rollback();
      return ApiResponse.error(
        res,
        'শিক্ষক (teacher), বিষয় (subject), শ্রেণি (classLevel), এবং শিক্ষাবর্ষ (academicYear) আবশ্যক',
        400
      );
    }

    const validation = await validateAssignmentEntities({
      institution,
      teacherId: teacher,
      subjectId: subject,
      classLevelId: classLevel,
      sectionId: section,
      academicYear,
      transaction: t,
    });

    if (!validation.valid) {
      await t.rollback();
      return ApiResponse.error(res, validation.message, validation.status);
    }

    const finalSection = validation.sectionId;
    const finalYear = validation.academicYear;
    const sectionScope = finalSection || '__CLASS_WIDE__';

    // Duplicate check
    const existing = await TeacherSubjectAssignment.findOne({
      where: {
        institution,
        teacher,
        subject,
        classLevel,
        sectionScopeKey: sectionScope,
        academicYear: finalYear,
      },
      transaction: t,
    });

    if (existing) {
      await t.rollback();
      if (existing.status === 'inactive') {
        return ApiResponse.error(
          res,
          'এই শিক্ষক ও বিষয়ের জন্য একটি নিষ্ক্রিয় অ্যাসাইনমেন্ট রয়েছে। অনুগ্রহ করে বিদ্যমান রেকর্ডটি পুনরায় সক্রিয় (reactivate) করুন।',
          409
        );
      }
      return ApiResponse.error(res, 'এই শিক্ষক, শ্রেণি ও বিষয়ের জন্য অ্যাসাইনমেন্ট ইতিমধ্যেই বিদ্যমান', 409);
    }

    // STRICT DRAFT-ONLY POLICY: Status is ALWAYS 'draft' upon creation.
    // Client-supplied status is completely ignored. approvedBy and approvedAt are null.
    const newAssignment = await TeacherSubjectAssignment.create(
      {
        _id: uuidv4(),
        institution,
        teacher,
        subject,
        classLevel,
        section: finalSection,
        academicYear: finalYear,
        status: 'draft',
        assignedBy: req.user._id,
        updatedBy: req.user._id,
        approvedBy: null,
        approvedAt: null,
      },
      { transaction: t }
    );

    await t.commit();
    return ApiResponse.created(res, newAssignment, 'শিক্ষক সাবজেক্ট অ্যাসাইনমেন্ট ড্রাফট হিসেবে তৈরি হয়েছে');
  } catch (error) {
    await t.rollback();
    if (error.name === 'SequelizeUniqueConstraintError' || error.original?.code === 'ER_DUP_ENTRY') {
      return ApiResponse.error(res, 'ডুপ্লিকেট অ্যাসাইনমেন্ট কলিশন: অ্যাসাইনমেন্ট ইতিমধ্যেই বিদ্যমান', 409);
    }
    return ApiResponse.error(res, error.message || 'অ্যাসাইনমেন্ট তৈরি করতে ব্যর্থ হয়েছে', 500);
  }
};

/**
 * 2. List Assignments with Pagination & Filters
 * GET /api/v1/teacher-subject-assignments
 */
exports.listAssignments = async (req, res) => {
  try {
    const instCheck = await resolveAndValidateInstitution(req, req.query.institution);
    if (!instCheck.valid) {
      return ApiResponse.error(res, instCheck.message, instCheck.status);
    }
    const institution = instCheck.institution;

    // Boundary sanitization for page and limit
    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = 20;
    } else if (limit > 100) {
      limit = 100; // Hard max cap
    }

    const offset = (page - 1) * limit;

    const where = { institution };

    if (req.query.teacher) where.teacher = req.query.teacher;
    if (req.query.subject) where.subject = req.query.subject;
    if (req.query.classLevel) where.classLevel = req.query.classLevel;
    if (req.query.academicYear) where.academicYear = req.query.academicYear;
    if (req.query.status) where.status = req.query.status;

    if (req.query.section !== undefined) {
      if (req.query.section === 'null' || req.query.section === '') {
        where.section = null;
      } else {
        where.section = req.query.section;
      }
    }

    const { rows, count } = await TeacherSubjectAssignment.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return ApiResponse.paginated(res, rows, page, limit, count);
  } catch (error) {
    return ApiResponse.error(res, error.message || 'তালিকা আনতে ব্যর্থ হয়েছে', 500);
  }
};

/**
 * 3. Get Assignment Details
 * GET /api/v1/teacher-subject-assignments/:id
 */
exports.getAssignmentDetails = async (req, res) => {
  try {
    const instCheck = await resolveAndValidateInstitution(req, req.query.institution);
    if (!instCheck.valid) {
      return ApiResponse.error(res, instCheck.message, instCheck.status);
    }
    const institution = instCheck.institution;

    const assignment = await TeacherSubjectAssignment.findOne({
      where: {
        _id: req.params.id,
        institution,
      },
    });

    if (!assignment) {
      return ApiResponse.notFound(res, 'অ্যাসাইনমেন্ট পাওয়া যায়নি');
    }

    return ApiResponse.success(res, assignment);
  } catch (error) {
    return ApiResponse.error(res, error.message || 'বিবরণ আনতে ব্যর্থ হয়েছে', 500);
  }
};

/**
 * 4. Update Permitted Assignment Fields
 * PUT /api/v1/teacher-subject-assignments/:id
 * Protected Fields: institution, status, assignedBy, approvedBy, approvedAt, deactivatedBy, deactivatedAt, deactivationReason cannot be mass-assigned.
 */
exports.updateAssignment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const instCheck = await resolveAndValidateInstitution(req, req.body.institution, t);
    if (!instCheck.valid) {
      await t.rollback();
      return ApiResponse.error(res, instCheck.message, instCheck.status);
    }
    const institution = instCheck.institution;

    const assignment = await TeacherSubjectAssignment.findOne({
      where: {
        _id: req.params.id,
        institution,
      },
      transaction: t,
    });

    if (!assignment) {
      await t.rollback();
      return ApiResponse.notFound(res, 'অ্যাসাইনমেন্ট পাওয়া যায়নি');
    }

    if (assignment.status === 'inactive') {
      await t.rollback();
      return ApiResponse.error(
        res,
        'নিষ্ক্রিয় অ্যাসাইনমেন্ট সরাসরি আপডেট করা যাবে না। প্রথমে পুনরায় সক্রিয় (reactivate) করুন।',
        400
      );
    }

    if (assignment.status === 'active') {
      const { teacher, subject, classLevel, academicYear } = req.body;
      const isCoreTupleChanged =
        (teacher && teacher !== assignment.teacher) ||
        (subject && subject !== assignment.subject) ||
        (classLevel && classLevel !== assignment.classLevel) ||
        (academicYear && academicYear !== assignment.academicYear);

      if (isCoreTupleChanged) {
        await t.rollback();
        return ApiResponse.error(
          res,
          'সক্রিয় অ্যাসাইনমেন্টের শিক্ষক, বিষয়, শ্রেণি বা শিক্ষাবর্ষ সরাসরি পরিবর্তন করা যাবে না। অনুগ্রহ করে এটি নিষ্ক্রিয় করে নতুন অ্যাসাইনমেন্ট তৈরি করুন।',
          400
        );
      }
    }

    // In draft state, updating core tuple is allowed with tenant validation
    const newTeacher = req.body.teacher || assignment.teacher;
    const newSubject = req.body.subject || assignment.subject;
    const newClassLevel = req.body.classLevel || assignment.classLevel;
    const newSection = req.body.section !== undefined ? req.body.section : assignment.section;
    const newAcademicYear = req.body.academicYear || assignment.academicYear;

    const validation = await validateAssignmentEntities({
      institution,
      teacherId: newTeacher,
      subjectId: newSubject,
      classLevelId: newClassLevel,
      sectionId: newSection,
      academicYear: newAcademicYear,
      transaction: t,
    });

    if (!validation.valid) {
      await t.rollback();
      return ApiResponse.error(res, validation.message, validation.status);
    }

    // MASS-ASSIGNMENT PROTECTION: Protected fields are completely ignored
    assignment.teacher = newTeacher;
    assignment.subject = newSubject;
    assignment.classLevel = newClassLevel;
    assignment.section = validation.sectionId;
    assignment.academicYear = validation.academicYear;
    assignment.updatedBy = req.user._id;

    await assignment.save({ transaction: t });
    await t.commit();

    return ApiResponse.success(res, assignment, 'অ্যাসাইনমেন্ট সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    await t.rollback();
    if (error.name === 'SequelizeUniqueConstraintError' || error.original?.code === 'ER_DUP_ENTRY') {
      return ApiResponse.error(res, 'ডুপ্লিকেট অ্যাসাইনমেন্ট কলিশন: অ্যাসাইনমেন্ট ইতিমধ্যেই বিদ্যমান', 409);
    }
    return ApiResponse.error(res, error.message || 'আপডেট ব্যর্থ হয়েছে', 500);
  }
};

/**
 * 5. Approve Draft Assignment
 * PATCH /api/v1/teacher-subject-assignments/:id/approve
 */
exports.approveAssignment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const instCheck = await resolveAndValidateInstitution(req, req.body.institution, t);
    if (!instCheck.valid) {
      await t.rollback();
      return ApiResponse.error(res, instCheck.message, instCheck.status);
    }
    const institution = instCheck.institution;

    const assignment = await TeacherSubjectAssignment.findOne({
      where: {
        _id: req.params.id,
        institution,
      },
      transaction: t,
    });

    if (!assignment) {
      await t.rollback();
      return ApiResponse.notFound(res, 'অ্যাসাইনমেন্ট পাওয়া যায়নি');
    }

    if (assignment.status !== 'draft') {
      await t.rollback();
      return ApiResponse.error(
        res,
        `শুধুমাত্র ড্রাফট (draft) অ্যাসাইনমেন্ট অনুমোদন করা যাবে (বর্তমান অবস্থা: ${assignment.status})`,
        400
      );
    }

    // Re-verify that the assigned entities are still active before approving
    const validation = await validateAssignmentEntities({
      institution,
      teacherId: assignment.teacher,
      subjectId: assignment.subject,
      classLevelId: assignment.classLevel,
      sectionId: assignment.section,
      academicYear: assignment.academicYear,
      transaction: t,
    });

    if (!validation.valid) {
      await t.rollback();
      return ApiResponse.error(res, `অনুমোদন ব্যর্থ: ${validation.message}`, validation.status);
    }

    assignment.status = 'active';
    assignment.approvedBy = req.user._id;
    assignment.approvedAt = new Date();
    assignment.updatedBy = req.user._id;

    await assignment.save({ transaction: t });
    await t.commit();

    return ApiResponse.success(res, assignment, 'অ্যাসাইনমেন্ট সফলভাবে অনুমোদিত হয়েছে');
  } catch (error) {
    await t.rollback();
    return ApiResponse.error(res, error.message || 'অনুমোদন ব্যর্থ হয়েছে', 500);
  }
};

/**
 * 6. Deactivate Assignment
 * PATCH /api/v1/teacher-subject-assignments/:id/deactivate
 */
exports.deactivateAssignment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      await t.rollback();
      return ApiResponse.error(
        res,
        'নিষ্ক্রিয় করার সুনির্দিষ্ট কারণ (কারণ হিসেবে কমপক্ষে ৩ অক্ষর) উল্লেখ করা বাধ্যতামূলক',
        400
      );
    }

    const instCheck = await resolveAndValidateInstitution(req, req.body.institution, t);
    if (!instCheck.valid) {
      await t.rollback();
      return ApiResponse.error(res, instCheck.message, instCheck.status);
    }
    const institution = instCheck.institution;

    const assignment = await TeacherSubjectAssignment.findOne({
      where: {
        _id: req.params.id,
        institution,
      },
      transaction: t,
    });

    if (!assignment) {
      await t.rollback();
      return ApiResponse.notFound(res, 'অ্যাসাইনমেন্ট পাওয়া যায়নি');
    }

    if (assignment.status === 'inactive') {
      await t.rollback();
      return ApiResponse.error(res, 'অ্যাসাইনমেন্ট ইতিমধ্যেই নিষ্ক্রিয় অবস্থায় আছে', 400);
    }

    assignment.status = 'inactive';
    assignment.deactivatedBy = req.user._id;
    assignment.deactivatedAt = new Date();
    assignment.deactivationReason = reason.trim();
    assignment.updatedBy = req.user._id;

    await assignment.save({ transaction: t });
    await t.commit();

    return ApiResponse.success(res, assignment, 'অ্যাসাইনমেন্ট সফলভাবে নিষ্ক্রিয় করা হয়েছে');
  } catch (error) {
    await t.rollback();
    return ApiResponse.error(res, error.message || 'নিষ্ক্রিয় করতে ব্যর্থ হয়েছে', 500);
  }
};

/**
 * 7. Reactivate Inactive Assignment
 * PATCH /api/v1/teacher-subject-assignments/:id/reactivate
 * Conflict protection: Prevents reactivating if another active assignment already occupies the exact logical slot.
 */
exports.reactivateAssignment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const instCheck = await resolveAndValidateInstitution(req, req.body.institution, t);
    if (!instCheck.valid) {
      await t.rollback();
      return ApiResponse.error(res, instCheck.message, instCheck.status);
    }
    const institution = instCheck.institution;

    const assignment = await TeacherSubjectAssignment.findOne({
      where: {
        _id: req.params.id,
        institution,
      },
      transaction: t,
    });

    if (!assignment) {
      await t.rollback();
      return ApiResponse.notFound(res, 'অ্যাসাইনমেন্ট পাওয়া যায়নি');
    }

    if (assignment.status !== 'inactive') {
      await t.rollback();
      return ApiResponse.error(
        res,
        `শুধুমাত্র নিষ্ক্রিয় (inactive) অ্যাসাইনমেন্ট পুনরায় সক্রিয় করা সম্ভব (বর্তমান অবস্থা: ${assignment.status})`,
        400
      );
    }

    // Re-verify that entities are still valid and active
    const validation = await validateAssignmentEntities({
      institution,
      teacherId: assignment.teacher,
      subjectId: assignment.subject,
      classLevelId: assignment.classLevel,
      sectionId: assignment.section,
      academicYear: assignment.academicYear,
      transaction: t,
    });

    if (!validation.valid) {
      await t.rollback();
      return ApiResponse.error(res, `পুনরায় সক্রিয়করণ ব্যর্থ: ${validation.message}`, validation.status);
    }

    // C.4: Check for reactivation conflict: Does another active assignment occupy this exact slot?
    const sectionScope = assignment.section || '__CLASS_WIDE__';
    const activeConflict = await TeacherSubjectAssignment.findOne({
      where: {
        institution,
        subject: assignment.subject,
        classLevel: assignment.classLevel,
        sectionScopeKey: sectionScope,
        academicYear: assignment.academicYear,
        status: 'active',
        _id: { [Op.ne]: assignment._id },
      },
      transaction: t,
    });

    if (activeConflict) {
      await t.rollback();
      return ApiResponse.error(
        res,
        'পুনরায় সক্রিয়করণ সম্ভব নয়: এই বিষয় ও শ্রেণির জন্য ইতিমধ্যে অপর একজন শিক্ষক সক্রিয় অ্যাসাইনমেন্টে নিয়োজিত আছেন',
        409
      );
    }

    // In-place reactivation according to established unique-record policy
    assignment.status = 'active';
    assignment.deactivatedBy = null;
    assignment.deactivatedAt = null;
    assignment.deactivationReason = null;
    assignment.updatedBy = req.user._id;

    await assignment.save({ transaction: t });
    await t.commit();

    return ApiResponse.success(res, assignment, 'অ্যাসাইনমেন্ট পুনরায় সক্রিয় করা হয়েছে');
  } catch (error) {
    await t.rollback();
    return ApiResponse.error(res, error.message || 'পুনরায় সক্রিয় করতে ব্যর্থ হয়েছে', 500);
  }
};
