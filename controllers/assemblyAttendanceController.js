const { Op } = require('sequelize');
const AssemblyAttendance = require('../models/AssemblyAttendance');
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const ClassLevel = require('../models/ClassLevel');
const Section = require('../models/Section');
const User = require('../models/User');
const Guardian = require('../models/Guardian');
const ApiResponse = require('../utils/apiResponse');

// ──────────────────────────────────────────────────────────────
// @desc    Get Assembly Attendance for a specific date and class
// @route   GET /api/v1/attendance/assembly
// ──────────────────────────────────────────────────────────────
exports.getAssemblyAttendance = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { date, classLevel, section, branch } = req.query;

    if (!date) {
      return ApiResponse.error(res, 'তারিখ প্রদান করা আবশ্যক', 400);
    }

    // Auto-sync table safely
    await AssemblyAttendance.sync({ alter: true }).catch(() => {});

    const targetDate = new Date(date + 'T00:00:00.000Z');

    // 1. Fetch active students of the institution
    const studentFilter = {
      institution,
      isDeleted: false,
      status: 'active',
    };
    if (branch && branch !== 'all') {
      studentFilter.branch = branch;
    }

    const students = await Student.findAll({ where: studentFilter });
    if (!students || students.length === 0) {
      return ApiResponse.success(res, {
        date,
        totalStudents: 0,
        stats: { total: 0, present: 0, absent: 0, unmarked: 0, presentRate: 0 },
        records: [],
      });
    }

    const curEnrIds = students.map(s => s.currentEnrollment).filter(Boolean);
    const studentIds = students.map(s => s._id);

    // 2. Fetch Enrollments, Users, Guardians, Classes, Sections, and Existing Assembly Attendances
    const [enrollments, users, guardians, classes, sections, existingAttendances] = await Promise.all([
      StudentEnrollment.findAll({
        where: {
          institution,
          [Op.or]: [
            { _id: { [Op.in]: curEnrIds } },
            { student: { [Op.in]: studentIds } },
          ],
        },
      }),
      User.findAll({
        where: { institution },
        attributes: ['_id', 'firstName', 'lastName', 'username', 'phone'],
      }),
      Guardian.findAll({
        where: { institution, status: 'active' },
      }),
      ClassLevel.findAll({ where: { institution } }),
      Section.findAll({ where: { institution } }),
      AssemblyAttendance.findAll({
        where: {
          institution,
          date: targetDate,
          student: { [Op.in]: studentIds },
        },
      }),
    ]);

    const userMap = new Map();
    users.forEach(u => userMap.set(String(u._id), u));

    const guardianMap = new Map();
    guardians.forEach(g => guardianMap.set(String(g._id), g));

    const classMap = new Map();
    classes.forEach(c => classMap.set(String(c._id), c.name));

    const sectionMap = new Map();
    sections.forEach(s => {
      sectionMap.set(String(s._id), s.name);
      if (s.name) sectionMap.set(s.name, s.name);
    });

    // Map enrollment by enrollment ID and by student ID (latest preferred)
    const enrollmentMap = new Map();
    enrollments.forEach(e => {
      enrollmentMap.set(String(e._id), e);
      enrollmentMap.set(String(e.student), e);
    });

    const existingMap = new Map();
    existingAttendances.forEach(a => existingMap.set(String(a.student), a));

    // Section doc lookup if section is passed
    let filterSectionDoc = null;
    if (section && section !== 'all') {
      filterSectionDoc = sections.find(s => String(s._id) === String(section) || s.name === section);
    }

    // 3. Compile student records with proper filtering
    const records = [];
    let presentCount = 0;
    let absentCount = 0;
    let unmarkedCount = 0;

    for (const student of students) {
      // Find student's enrollment
      const enr = (student.currentEnrollment && enrollmentMap.get(String(student.currentEnrollment))) ||
        enrollmentMap.get(String(student._id)) || null;

      const studentClassId = enr?.classLevel ? String(enr.classLevel) : '';
      const studentSectionVal = enr?.section ? String(enr.section) : '';

      // Class filter
      if (classLevel && classLevel !== 'all') {
        if (studentClassId !== String(classLevel)) continue;
      }

      // Section filter: check by ID or section name
      if (section && section !== 'all') {
        const matchesSection = studentSectionVal === String(section) ||
          (filterSectionDoc && (studentSectionVal === String(filterSectionDoc._id) || studentSectionVal === filterSectionDoc.name));
        if (!matchesSection) continue;
      }

      // User / Student name
      const studentUser = userMap.get(String(student.user));
      const studentName = studentUser
        ? `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim() || studentUser.username
        : (student.studentId || 'শিক্ষার্থী');

      // Determine Father's Name (পিতার নাম)
      let fatherName = student.fatherName || '';
      if (!fatherName && student.guardian) {
        const g = guardianMap.get(String(student.guardian));
        if (g && g.user) {
          const gUser = userMap.get(String(g.user));
          if (gUser) {
            fatherName = `${gUser.firstName || ''} ${gUser.lastName || ''}`.trim();
          }
        }
      }
      if (!fatherName) fatherName = '—';

      // Roll Number: check enr.rollNumber, fallback to student.rollNumber or admissionNumber
      let rollNumber = '';
      if (enr && enr.rollNumber !== null && enr.rollNumber !== undefined && String(enr.rollNumber).trim()) {
        rollNumber = String(enr.rollNumber).trim();
      } else if (student.rollNumber !== null && student.rollNumber !== undefined && String(student.rollNumber).trim()) {
        rollNumber = String(student.rollNumber).trim();
      } else if (student.admissionNumber) {
        rollNumber = String(student.admissionNumber).trim();
      }

      const className = classMap.get(studentClassId) || '—';
      const sectionName = sectionMap.get(studentSectionVal) || studentSectionVal || '—';

      const existing = existingMap.get(String(student._id));
      // Status can be 'present', 'absent', or '' (unmarked / reset)
      const status = existing ? existing.status : '';
      const inTime = existing ? existing.inTime : '';
      const remarks = existing ? existing.remarks : '';

      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else unmarkedCount++;

      // Compute parsed numeric ID suffix for sorting (e.g. ANG2001 -> 1, ANB2023005 -> 23005)
      const cleanStudentCode = String(student.studentId || '').trim();
      let idNumericSuffix = 999999;
      const stripped = cleanStudentCode.replace(/^(?:ANG20|ANB20|ANG|ANB)/i, '');
      const numMatch = stripped.match(/(\d+)/);
      if (numMatch) {
        idNumericSuffix = parseInt(numMatch[1], 10);
      }

      records.push({
        _id: existing ? existing._id : `draft-${student._id}`,
        studentId: student._id,
        studentCode: cleanStudentCode,
        idNumericSuffix,
        admissionNumber: student.admissionNumber || '',
        rollNumber: rollNumber || '—',
        rollNumeric: parseInt(rollNumber, 10) || 999999,
        studentName,
        fatherName,
        classLevelId: studentClassId,
        className,
        sectionId: studentSectionVal,
        sectionName,
        branch: student.branch || (enr?.branch || ''),
        status,
        inTime,
        remarks,
        isRecorded: Boolean(existing),
      });
    }

    // Default sort: Roll number
    records.sort((a, b) => a.rollNumeric - b.rollNumeric || a.studentName.localeCompare(b.studentName, 'bn'));

    const totalStudents = records.length;
    const presentRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    ApiResponse.success(res, {
      date,
      totalStudents,
      stats: {
        total: totalStudents,
        present: presentCount,
        absent: absentCount,
        unmarked: unmarkedCount,
        presentRate,
      },
      records,
    });
  } catch (error) {
    console.error('getAssemblyAttendance error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Bulk Save / Update Assembly Attendance
// @route   POST /api/v1/attendance/assembly
// ──────────────────────────────────────────────────────────────
exports.saveAssemblyAttendance = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { date, attendances, classLevel, section } = req.body;

    if (!date || !Array.isArray(attendances) || attendances.length === 0) {
      return ApiResponse.error(res, 'তারিখ ও উপস্থিতি তালিকা প্রদান করা আবশ্যক', 400);
    }

    await AssemblyAttendance.sync({ alter: true }).catch(() => {});

    const targetDate = new Date(date + 'T00:00:00.000Z');
    let savedCount = 0;

    for (const item of attendances) {
      if (!item.studentId) continue;

      // If status is empty or 'reset', we can either remove or store as 'reset'
      const statusToSave = item.status && item.status.trim() ? item.status.trim() : 'reset';

      if (statusToSave === 'reset' || statusToSave === '') {
        // Delete or clear existing record
        await AssemblyAttendance.destroy({
          where: {
            institution,
            student: item.studentId,
            date: targetDate,
          },
        });
        savedCount++;
        continue;
      }

      const [record, created] = await AssemblyAttendance.findOrCreate({
        where: {
          institution,
          student: item.studentId,
          date: targetDate,
        },
        defaults: {
          institution,
          student: item.studentId,
          classLevel: item.classLevelId || classLevel || '',
          section: item.sectionId || section || '',
          branch: item.branch || '',
          date: targetDate,
          status: statusToSave,
          inTime: item.inTime || '',
          markedBy: req.user._id,
          remarks: item.remarks || '',
        },
      });

      if (!created) {
        await record.update({
          status: statusToSave,
          inTime: item.inTime || record.inTime || '',
          remarks: item.remarks !== undefined ? item.remarks : record.remarks,
          markedBy: req.user._id,
        });
      }

      savedCount++;
    }

    ApiResponse.success(res, { savedCount }, `${savedCount} জন শিক্ষার্থীর সমাবেশ উপস্থিতি সফলভাবে সংরক্ষিত হয়েছে`);
  } catch (error) {
    console.error('saveAssemblyAttendance error:', error);
    next(error);
  }
};
