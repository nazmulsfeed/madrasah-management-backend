const { Op } = require('sequelize');
const sequelize = require('../config/db');
const TransferCertificate = require('../models/TransferCertificate');
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const User = require('../models/User');
const ClassLevel = require('../models/ClassLevel');
const ApiResponse = require('../utils/apiResponse');

const safeJsonParse = (str, fallback) => {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

let tcTableSynced = false;
const ensureTCTable = async () => {
  if (!tcTableSynced) {
    await TransferCertificate.sync();
    tcTableSynced = true;
  }
};

const getNextSerialForInstitution = async (institutionId, transaction = null) => {
  const maxSerial = await TransferCertificate.max('serialNumber', {
    where: { institution: institutionId },
    transaction,
  });
  return (Number(maxSerial) || 0) + 1;
};

/**
 * GET /api/v1/transfer-certificates/students
 * Returns all non-deleted students for the institution along with their enrollment info
 * (className, section, rollNumber) and any existing TransferCertificate record.
 */
exports.getStudentsWithTC = async (req, res, next) => {
  try {
    await ensureTCTable();
    const institutionId = req.user.institution;

    const [students, tcRecords, enrollments, classLevels] = await Promise.all([
      Student.findAll({
        where: {
          institution: institutionId,
          [Op.or]: [{ isDeleted: false }, { isDeleted: null }],
        },
        order: [['createdAt', 'DESC']],
      }),
      TransferCertificate.findAll({
        where: { institution: institutionId },
      }),
      StudentEnrollment.findAll({
        where: { institution: institutionId },
        order: [['createdAt', 'DESC']],
      }),
      ClassLevel.findAll({
        where: { institution: institutionId },
      }),
    ]);

    const userIds = [...new Set(students.map((s) => s.user).filter(Boolean))];
    const users = userIds.length > 0
      ? await User.findAll({
          where: { _id: userIds },
          attributes: ['_id', 'firstName', 'lastName', 'phone', 'email', 'photo'],
        })
      : [];

    const userMap = new Map(users.map((u) => [u._id, u.toJSON()]));
    const classMap = new Map(classLevels.map((c) => [c._id, c.toJSON()]));

    // Map enrollment by _id and also keep latest active enrollment per student
    const enrollmentById = new Map();
    const enrollmentByStudent = new Map();
    for (const enr of enrollments) {
      const e = enr.toJSON();
      enrollmentById.set(e._id, e);
      if (!enrollmentByStudent.has(e.student) || e.enrollmentStatus === 'active') {
        if (!enrollmentByStudent.has(e.student)) {
          enrollmentByStudent.set(e.student, e);
        } else if (e.enrollmentStatus === 'active' && enrollmentByStudent.get(e.student).enrollmentStatus !== 'active') {
          enrollmentByStudent.set(e.student, e);
        }
      }
    }

    const tcMap = new Map();
    let maxSerial = 0;
    for (const tc of tcRecords) {
      const t = tc.toJSON();
      if (Number(t.serialNumber) > maxSerial) maxSerial = Number(t.serialNumber);
      tcMap.set(t.student, {
        ...t,
        reasons: safeJsonParse(t.reasons, ['ক) অভিভাবকের অভিপ্রায়।']),
        customData: safeJsonParse(t.customData, {}),
      });
    }

    const formatted = students.map((st) => {
      const s = st.toJSON();
      const u = userMap.get(s.user) || {};
      const enr = (s.currentEnrollment && enrollmentById.get(s.currentEnrollment)) || enrollmentByStudent.get(s._id) || null;
      const cls = enr && enr.classLevel ? classMap.get(enr.classLevel) : null;

      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      return {
        _id: s._id,
        studentId: s.studentId || '',
        admissionNumber: s.admissionNumber || '',
        name: fullName,
        phone: u.phone || '',
        photo: s.photo || u.photo || '',
        fatherName: s.fatherName || '',
        motherName: s.motherName || '',
        village: s.village || '',
        postOffice: s.postOffice || '',
        upazila: s.upazila || '',
        district: s.district || '',
        division: s.division || '',
        nationalId: s.nationalIdOrBirthCertNo || '',
        dateOfBirth: s.dateOfBirth || null,
        gender: s.gender || '',
        status: s.status || 'active',
        admissionDate: s.admissionDate || null,
        className: cls?.name || '',
        classLevelId: cls?._id || enr?.classLevel || '',
        section: enr?.section || '',
        rollNumber: enr?.rollNumber || '',
        tc: tcMap.get(s._id) || null,
      };
    });

    return ApiResponse.success(
      res,
      {
        students: formatted,
        nextSerial: maxSerial + 1,
      },
      'ছাড়পত্রের জন্য শিক্ষার্থী তালিকা পাওয়া গেছে'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/transfer-certificates
 * Creates or updates a TransferCertificate record (serial, custom edited fields, reasons, etc.).
 */
exports.saveOrUpdateTC = async (req, res, next) => {
  try {
    await ensureTCTable();
    const institutionId = req.user.institution;
    const {
      studentId,
      serialNumber,
      issueDate,
      leaveDate,
      resultStatus,
      promotedClass,
      duePaidYear,
      reasons,
      customData,
    } = req.body;

    if (!studentId) {
      return ApiResponse.error(res, 'শিক্ষার্থী আইডি প্রয়োজন', 400);
    }

    const student = await Student.findOne({
      where: { _id: studentId, institution: institutionId },
    });
    if (!student) {
      return ApiResponse.error(res, 'শিক্ষার্থী পাওয়া যায়নি', 404);
    }

    let tc = await TransferCertificate.findOne({
      where: { institution: institutionId, student: studentId },
    });

    const parsedSerial = Number(serialNumber);
    if (!tc) {
      const nextSerial = parsedSerial > 0 ? parsedSerial : await getNextSerialForInstitution(institutionId);
      tc = await TransferCertificate.create({
        institution: institutionId,
        student: studentId,
        serialNumber: nextSerial,
        isTaken: false,
        takenAt: null,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        leaveDate: leaveDate ? new Date(leaveDate) : new Date(),
        resultStatus: resultStatus || 'উত্তীর্ণ হইয়াছে',
        promotedClass: promotedClass || '',
        duePaidYear: duePaidYear || '',
        reasons: JSON.stringify(Array.isArray(reasons) ? reasons : ['ক) অভিভাবকের অভিপ্রায়।']),
        customData: JSON.stringify(customData && typeof customData === 'object' ? customData : {}),
        issuedBy: req.user._id,
        updatedBy: req.user._id,
      });
    } else {
      await tc.update({
        ...(parsedSerial > 0 ? { serialNumber: parsedSerial } : {}),
        ...(issueDate ? { issueDate: new Date(issueDate) } : {}),
        ...(leaveDate ? { leaveDate: new Date(leaveDate) } : {}),
        ...(resultStatus !== undefined ? { resultStatus } : {}),
        ...(promotedClass !== undefined ? { promotedClass } : {}),
        ...(duePaidYear !== undefined ? { duePaidYear } : {}),
        ...(Array.isArray(reasons) ? { reasons: JSON.stringify(reasons) } : {}),
        ...(customData && typeof customData === 'object' ? { customData: JSON.stringify(customData) } : {}),
        updatedBy: req.user._id,
      });
    }

    const result = tc.toJSON();
    return ApiResponse.success(
      res,
      {
        ...result,
        reasons: safeJsonParse(result.reasons, []),
        customData: safeJsonParse(result.customData, {}),
      },
      'ছাড়পত্রের তথ্য সংরক্ষণ করা হয়েছে'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/transfer-certificates/:studentId/toggle-taken
 * Toggles isTaken status and automatically updates Student.status ('transferred' / 'active').
 */
exports.toggleTakenStatus = async (req, res, next) => {
  await ensureTCTable();
  const transaction = await sequelize.transaction();
  try {
    const institutionId = req.user.institution;
    const { studentId } = req.params;
    const { isTaken } = req.body;
    const checked = Boolean(isTaken);

    const student = await Student.findOne({
      where: { _id: studentId, institution: institutionId },
      transaction,
    });
    if (!student) {
      await transaction.rollback();
      return ApiResponse.error(res, 'শিক্ষার্থী পাওয়া যায়নি', 404);
    }

    let tc = await TransferCertificate.findOne({
      where: { institution: institutionId, student: studentId },
      transaction,
    });

    if (checked) {
      if (!tc) {
        const nextSerial = await getNextSerialForInstitution(institutionId, transaction);
        tc = await TransferCertificate.create(
          {
            institution: institutionId,
            student: studentId,
            serialNumber: nextSerial,
            isTaken: true,
            takenAt: new Date(),
            issueDate: new Date(),
            leaveDate: new Date(),
            issuedBy: req.user._id,
            updatedBy: req.user._id,
          },
          { transaction }
        );
      } else {
        await tc.update(
          {
            isTaken: true,
            takenAt: tc.takenAt || new Date(),
            updatedBy: req.user._id,
          },
          { transaction }
        );
      }

      await student.update(
        {
          status: 'transferred',
          updatedBy: req.user._id,
        },
        { transaction }
      );
    } else {
      if (tc) {
        await tc.update(
          {
            isTaken: false,
            takenAt: null,
            updatedBy: req.user._id,
          },
          { transaction }
        );
      }

      await student.update(
        {
          status: 'active',
          updatedBy: req.user._id,
        },
        { transaction }
      );
    }

    await transaction.commit();

    const tcJson = tc ? tc.toJSON() : null;
    const nextSerial = await getNextSerialForInstitution(institutionId);

    return ApiResponse.success(
      res,
      {
        tc: tcJson
          ? {
              ...tcJson,
              reasons: safeJsonParse(tcJson.reasons, ['ক) অভিভাবকের অভিপ্রায়।']),
              customData: safeJsonParse(tcJson.customData, {}),
            }
          : null,
        studentStatus: checked ? 'transferred' : 'active',
        nextSerial,
      },
      checked
        ? 'ছাড়পত্র গৃহীত হিসেবে চিহ্নিত হয়েছে এবং শিক্ষার্থীর স্ট্যাটাস Transferred করা হয়েছে'
        : 'ছাড়পত্রের গৃহীত অবস্থা বাতিল করা হয়েছে এবং শিক্ষার্থীর স্ট্যাটাস Active করা হয়েছে'
    );
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
