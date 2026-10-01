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

    // 1. Build enrollment filter
    const enrollmentWhere = {
      institution,
      enrollmentStatus: 'active',
    };
    if (classLevel && classLevel !== 'all') {
      enrollmentWhere.classLevel = classLevel;
    }
    if (section && section !== 'all') {
      enrollmentWhere.section = section;
    }

    const enrollments = await StudentEnrollment.findAll({
      where: enrollmentWhere,
      order: [['rollNumber', 'ASC']],
    });

    const studentIds = enrollments.map(e => e.student).filter(Boolean);

    // 2. Fetch Students, Users, and Guardians
    const [students, users, guardians, classes, sections, existingAttendances] = await Promise.all([
      Student.findAll({
        where: {
          institution,
          _id: { [Op.in]: studentIds },
          isDeleted: false,
          status: 'active',
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
    sections.forEach(s => sectionMap.set(String(s._id), s.name));

    const studentMap = new Map();
    students.forEach(s => studentMap.set(String(s._id), s));

    const existingMap = new Map();
    existingAttendances.forEach(a => existingMap.set(String(a.student), a));

    // 3. Compile merged records
    const records = [];
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    for (const enr of enrollments) {
      const student = studentMap.get(String(enr.student));
      if (!student) continue;

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

      const className = classMap.get(String(enr.classLevel)) || enr.classLevel || '—';
      const sectionName = sectionMap.get(String(enr.section)) || enr.section || '—';

      const existing = existingMap.get(String(student._id));
      const status = existing ? existing.status : 'present'; // Default to present for morning assembly
      const inTime = existing ? existing.inTime : '';
      const remarks = existing ? existing.remarks : '';

      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'excused') excusedCount++;

      records.push({
        _id: existing ? existing._id : `draft-${student._id}`,
        studentId: student._id,
        studentCode: student.studentId,
        admissionNumber: student.admissionNumber,
        rollNumber: parseInt(enr.rollNumber, 10) || 0,
        studentName,
        fatherName,
        classLevelId: enr.classLevel,
        className,
        sectionId: enr.section,
        sectionName,
        branch: student.branch || enr.branch || '',
        status,
        inTime,
        remarks,
        isRecorded: Boolean(existing),
      });
    }

    // Sort by roll number
    records.sort((a, b) => a.rollNumber - b.rollNumber);

    const totalStudents = records.length;
    const presentRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

    ApiResponse.success(res, {
      date,
      totalStudents,
      stats: {
        total: totalStudents,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
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
          status: item.status || 'present',
          inTime: item.inTime || '',
          markedBy: req.user._id,
          remarks: item.remarks || '',
        },
      });

      if (!created) {
        await record.update({
          status: item.status || 'present',
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
