const { Op } = require('sequelize');
const AssemblyAttendance = require('../models/AssemblyAttendance');
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const ClassLevel = require('../models/ClassLevel');
const Section = require('../models/Section');
const Branch = require('../models/Branch');
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
    const { date, classLevel, section, branch, department } = req.query;

    if (!date) {
      return ApiResponse.error(res, 'তারিখ প্রদান করা আবশ্যক', 400);
    }

    // Auto-sync table safely
    await AssemblyAttendance.sync({ alter: true }).catch(() => {});

    const targetDate = new Date(date + 'T00:00:00.000Z');

    // 1. Fetch active students of the institution with smart branch and department filters
    const studentFilter = {
      institution,
      isDeleted: false,
      status: 'active',
    };

    if (branch && branch !== 'all') {
      const selectedBranchDoc = await Branch.findOne({
        where: {
          institution,
          [Op.or]: [{ _id: branch }, { name: branch }]
        }
      });
      if (selectedBranchDoc) {
        if (selectedBranchDoc.name === 'বালক শাখা') {
          const dualBoys = await Branch.findOne({ where: { institution, name: 'বালক শাখা + নুরানী' } });
          const branchIds = [selectedBranchDoc._id];
          if (dualBoys) branchIds.push(dualBoys._id);
          studentFilter.branch = { [Op.in]: branchIds };
        } else if (selectedBranchDoc.name === 'বালিকা শাখা') {
          const dualGirls = await Branch.findOne({ where: { institution, name: 'বালিকা শাখা + নুরানী' } });
          const branchIds = [selectedBranchDoc._id];
          if (dualGirls) branchIds.push(dualGirls._id);
          studentFilter.branch = { [Op.in]: branchIds };
        } else if (selectedBranchDoc.name === 'নুরানী শাখা') {
          const dualBoys = await Branch.findOne({ where: { institution, name: 'বালক শাখা + নুরানী' } });
          const dualGirls = await Branch.findOne({ where: { institution, name: 'বালিকা শাখা + নুরানী' } });
          const branchIds = [selectedBranchDoc._id];
          if (dualBoys) branchIds.push(dualBoys._id);
          if (dualGirls) branchIds.push(dualGirls._id);
          studentFilter.branch = { [Op.in]: branchIds };
        } else {
          studentFilter.branch = selectedBranchDoc._id;
        }
      } else {
        studentFilter.branch = branch;
      }
    }

    if (department && department !== 'all') {
      studentFilter.department = department.trim();
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

    // 2. Fetch Enrollments, Users, Guardians, Classes, Sections, Branches, and Existing Assembly Attendances
    const [enrollments, users, guardians, classes, sections, branches, existingAttendances] = await Promise.all([
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
        attributes: ['_id', 'firstName', 'lastName', 'username', 'phone', 'photo'],
      }),
      Guardian.findAll({
        where: { institution, status: 'active' },
      }),
      ClassLevel.findAll({ where: { institution } }),
      Section.findAll({ where: { institution } }),
      Branch.findAll({ where: { institution } }),
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
    const guardianStudentMap = new Map();
    guardians.forEach(g => {
      guardianMap.set(String(g._id), g);
      let arr = g.students;
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch (_) { arr = []; }
      }
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          let sid = null;
          if (typeof item === 'string') sid = item;
          else if (item && typeof item === 'object') {
            sid = item.student || item.studentId || item._id || item.id;
          }
          if (sid) {
            guardianStudentMap.set(String(typeof sid === 'object' ? (sid._id || sid.id) : sid), g);
          }
        });
      }
    });

    const classMap = new Map();
    const classOrderMap = new Map();
    const classNameToIdMap = new Map();
    classes.forEach(c => {
      const cIdStr = String(c._id);
      classMap.set(cIdStr, c.name);
      if (c.name) {
        classMap.set(c.name, c.name);
        classNameToIdMap.set(c.name.trim(), cIdStr);
      }
      if (c.code) {
        classMap.set(c.code, c.name);
        classNameToIdMap.set(c.code.trim(), cIdStr);
      }
      classOrderMap.set(cIdStr, typeof c.order === 'number' ? c.order : 99);
      if (c.name) classOrderMap.set(c.name.trim(), typeof c.order === 'number' ? c.order : 99);
    });

    const sectionMap = new Map();
    sections.forEach(s => {
      sectionMap.set(String(s._id), s.name);
      if (s.name) sectionMap.set(s.name, s.name);
    });

    const branchMap = new Map();
    branches.forEach(b => {
      branchMap.set(String(b._id), b.name);
      if (b.name) branchMap.set(b.name, b.name);
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

    // Determine target class info if classLevel is passed
    let filterClassDoc = null;
    let targetClassNames = [];
    if (classLevel && classLevel !== 'all') {
      filterClassDoc = classes.find(c => String(c._id) === String(classLevel) || c.name === classLevel || c.code === classLevel);
      if (filterClassDoc) {
        targetClassNames = [filterClassDoc.name.trim()];
      } else {
        targetClassNames = [String(classLevel).trim()];
      }
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

      let studentClassId = enr?.classLevel ? String(enr.classLevel) : '';
      let studentSectionVal = enr?.section ? String(enr.section) : '';

      // Check if student belongs to special department: 'মক্তব বিভাগ', 'নাজেরা বিভাগ', 'হিফজ বিভাগ'
      const studentDept = (student.department || '').trim();

      // Enrolled academic class
      const enrolledClassName = classMap.get(studentClassId) || '';
      // If student has an academic class, className is strictly that class (e.g. 'তৃতীয়').
      // If no enrolled class is found or it's empty, fallback to studentDept or '—'
      const effectiveClassName = enrolledClassName || studentDept || '—';
      const effectiveClassId = studentClassId || (studentDept && classNameToIdMap.get(studentDept)) || '';

      // Class filter: match either classLevel ID, enrolled classLevel, or department name
      if (classLevel && classLevel !== 'all') {
        const matchesClass = (
          studentClassId === String(classLevel) ||
          effectiveClassId === String(classLevel) ||
          effectiveClassName === String(classLevel) ||
          (filterClassDoc && (
            studentClassId === String(filterClassDoc._id) ||
            effectiveClassId === String(filterClassDoc._id) ||
            effectiveClassName === filterClassDoc.name.trim() ||
            studentDept === filterClassDoc.name.trim()
          ))
        );
        if (!matchesClass) continue;
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

      // Find linked guardian (from student.guardian or guardianStudentMap)
      let linkedGuardian = null;
      if (student.guardian) {
        linkedGuardian = guardianMap.get(String(student.guardian));
      }
      if (!linkedGuardian) {
        linkedGuardian = guardianStudentMap.get(String(student._id));
      }

      // Determine Father's Name (পিতার নাম)
      let fatherName = student.fatherName || '';
      if (!fatherName && linkedGuardian && linkedGuardian.user) {
        const gUser = userMap.get(String(linkedGuardian.user));
        if (gUser) {
          fatherName = `${gUser.firstName || ''} ${gUser.lastName || ''}`.trim();
        }
      }
      if (!fatherName) fatherName = '—';

      // Determine Guardian Phone (অভিভাবকের মোবাইল)
      let guardianPhone = '';
      if (linkedGuardian && linkedGuardian.user) {
        const gUser = userMap.get(String(linkedGuardian.user));
        if (gUser && gUser.phone) {
          guardianPhone = gUser.phone.trim();
        }
      }
      if (!guardianPhone && studentUser && studentUser.phone) {
        guardianPhone = studentUser.phone.trim();
      }
      if (!guardianPhone) guardianPhone = '—';

      // Determine Student Photo (প্রোফাইল ছবি)
      const photo = student.photo || studentUser?.photo || '';

      // Roll Number: check enr.rollNumber, fallback to student.rollNumber or admissionNumber
      let rollNumber = '';
      if (enr && enr.rollNumber !== null && enr.rollNumber !== undefined && String(enr.rollNumber).trim()) {
        rollNumber = String(enr.rollNumber).trim();
      } else if (student.rollNumber !== null && student.rollNumber !== undefined && String(student.rollNumber).trim()) {
        rollNumber = String(student.rollNumber).trim();
      } else if (student.admissionNumber) {
        rollNumber = String(student.admissionNumber).trim();
      }

      const className = effectiveClassName || classMap.get(studentClassId) || '—';
      const sectionName = sectionMap.get(studentSectionVal) || studentSectionVal || '—';
      const classOrder = classOrderMap.get(effectiveClassId) ?? classOrderMap.get(effectiveClassName) ?? 99;

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
        guardianPhone,
        photo,
        classLevelId: effectiveClassId || studentClassId,
        className,
        classOrder,
        department: studentDept,
        sectionId: studentSectionVal,
        sectionName,
        branch: student.branch || (enr?.branch || ''),
        branchName: branchMap.get(String(student.branch || (enr?.branch || ''))) || '—',
        status,
        inTime,
        remarks,
        isRecorded: Boolean(existing),
      });
    }

    // Default sort: Class order first, then Roll number, then Student name
    records.sort((a, b) => {
      if (a.classOrder !== b.classOrder) return a.classOrder - b.classOrder;
      if (a.rollNumeric !== b.rollNumeric) return a.rollNumeric - b.rollNumeric;
      return a.studentName.localeCompare(b.studentName, 'bn');
    });

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
