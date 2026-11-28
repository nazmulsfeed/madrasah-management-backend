const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Testimonial = require('../models/Testimonial');
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

let tableSynced = false;
const ensureTestimonialTable = async () => {
  if (!tableSynced) {
    await Testimonial.sync();
    tableSynced = true;
  }
};

const getNextSerialForInstitution = async (institutionId, transaction = null) => {
  const maxSerial = await Testimonial.max('serialNumber', {
    where: { institution: institutionId },
    transaction,
  });
  return (Number(maxSerial) || 0) + 1;
};

// GET /api/v1/testimonials/students
exports.getStudentsWithTestimonials = async (req, res, next) => {
  try {
    await ensureTestimonialTable();
    const institutionId = req.user.institution;

    const [students, records, enrollments, classLevels] = await Promise.all([
      Student.findAll({
        where: {
          institution: institutionId,
          [Op.or]: [{ isDeleted: false }, { isDeleted: null }],
        },
        order: [['createdAt', 'DESC']],
      }),
      Testimonial.findAll({
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

    const enrollmentById = new Map();
    const enrollmentByStudent = new Map();
    for (const enr of enrollments) {
      const e = enr.toJSON();
      enrollmentById.set(e._id, e);
      if (!enrollmentByStudent.has(e.student)) {
        enrollmentByStudent.set(e.student, e);
      } else if (e.enrollmentStatus === 'active' && enrollmentByStudent.get(e.student).enrollmentStatus !== 'active') {
        enrollmentByStudent.set(e.student, e);
      }
    }

    const recordMap = new Map();
    let maxSerial = 0;
    for (const rec of records) {
      const t = rec.toJSON();
      if (Number(t.serialNumber) > maxSerial) maxSerial = Number(t.serialNumber);
      recordMap.set(t.student, {
        ...t,
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
        testimonial: recordMap.get(s._id) || null,
      };
    });

    return ApiResponse.success(
      res,
      {
        students: formatted,
        nextSerial: maxSerial + 1,
      },
      'প্রত্যয়নপত্রের জন্য শিক্ষার্থী তালিকা পাওয়া গেছে'
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/testimonials
exports.saveOrUpdateTestimonial = async (req, res, next) => {
  try {
    await ensureTestimonialTable();
    const institutionId = req.user.institution;
    const { studentId, serialNumber, issueDate, customData, isTaken } = req.body;

    if (!studentId) {
      return ApiResponse.error(res, 'শিক্ষার্থী নির্বাচন আবশ্যক', 400);
    }

    const savedRecord = await sequelize.transaction(async (t) => {
      let existing = await Testimonial.findOne({
        where: { institution: institutionId, student: studentId },
        transaction: t,
      });

      const resolvedSerial =
        Number(serialNumber) > 0
          ? Number(serialNumber)
          : existing?.serialNumber || (await getNextSerialForInstitution(institutionId, t));

      const payload = {
        institution: institutionId,
        student: studentId,
        serialNumber: resolvedSerial,
        issueDate: issueDate ? new Date(issueDate) : existing?.issueDate || new Date(),
        customData: JSON.stringify(customData || {}),
        updatedBy: req.user._id,
      };

      if (typeof isTaken === 'boolean') {
        payload.isTaken = isTaken;
        payload.takenAt = isTaken ? (existing?.takenAt || new Date()) : null;
      }

      if (existing) {
        await existing.update(payload, { transaction: t });
        return existing;
      }

      return Testimonial.create(
        {
          ...payload,
          issuedBy: req.user._id,
          isTaken: typeof isTaken === 'boolean' ? isTaken : false,
          takenAt: isTaken ? new Date() : null,
        },
        { transaction: t }
      );
    });

    const out = savedRecord.toJSON();
    out.customData = safeJsonParse(out.customData, {});

    return ApiResponse.success(res, { testimonial: out }, 'প্রত্যয়নপত্র সফলভাবে সংরক্ষিত হয়েছে');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/testimonials/:studentId/toggle-taken
exports.toggleTakenStatus = async (req, res, next) => {
  try {
    await ensureTestimonialTable();
    const institutionId = req.user.institution;
    const { studentId } = req.params;
    const { isTaken } = req.body;

    const existing = await Testimonial.findOne({
      where: { institution: institutionId, student: studentId },
    });

    let updated;
    if (existing) {
      const nextTaken = typeof isTaken === 'boolean' ? isTaken : !existing.isTaken;
      await existing.update({
        isTaken: nextTaken,
        takenAt: nextTaken ? new Date() : null,
        updatedBy: req.user._id,
      });
      updated = existing;
    } else {
      const nextSerial = await getNextSerialForInstitution(institutionId);
      const nextTaken = typeof isTaken === 'boolean' ? isTaken : true;
      updated = await Testimonial.create({
        institution: institutionId,
        student: studentId,
        serialNumber: nextSerial,
        isTaken: nextTaken,
        takenAt: nextTaken ? new Date() : null,
        issueDate: new Date(),
        customData: JSON.stringify({}),
        issuedBy: req.user._id,
        updatedBy: req.user._id,
      });
    }

    const out = updated.toJSON();
    out.customData = safeJsonParse(out.customData, {});
    return ApiResponse.success(res, { testimonial: out }, 'গৃহীত স্ট্যাটাস আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};
