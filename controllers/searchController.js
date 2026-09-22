const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const StudentEnrollment = require('../models/StudentEnrollment');
const ClassLevel = require('../models/ClassLevel');
const Section = require('../models/Section');

// @desc    Global search across students, teachers, etc.
// @route   GET /api/v1/search/global?q=...
// @access  Private
exports.globalSearch = async (req, res) => {
  try {
    const rawQuery = (req.query.q || '').trim();
    if (!rawQuery || rawQuery.length < 2) {
      return res.json({
        success: true,
        data: {
          students: [],
          teachers: [],
        },
      });
    }

    const institutionId = req.user.institution;
    const searchRegex = new RegExp(rawQuery, 'i');
    const searchWords = rawQuery.split(/\s+/).filter(Boolean);

    // 1. MATCH USERS
    const userOrConditions = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { phone: searchRegex },
      { username: searchRegex },
    ];
    if (User.rawAttributes && User.rawAttributes.firstNameEn) {
      userOrConditions.push({ firstNameEn: searchRegex });
    }
    if (User.rawAttributes && User.rawAttributes.lastNameEn) {
      userOrConditions.push({ lastNameEn: searchRegex });
    }
    if (searchWords.length > 1) {
      searchWords.forEach(word => {
        const wordRegex = new RegExp(word, 'i');
        userOrConditions.push({ firstName: wordRegex }, { lastName: wordRegex });
      });
    }

    const matchedUsers = await User.find({
      institution: institutionId,
      $or: userOrConditions,
    }).select('_id firstName lastName firstNameEn lastNameEn phone username photo');

    const matchedUserMap = new Map();
    matchedUsers.forEach(u => {
      matchedUserMap.set(String(u._id), u);
    });
    const matchedUserIds = Array.from(matchedUserMap.keys());

    // 2. SEARCH STUDENTS
    const studentOrConditions = [
      { studentId: searchRegex },
      { admissionNumber: searchRegex },
      { fatherName: searchRegex },
      { motherName: searchRegex },
      { village: searchRegex },
    ];
    if (matchedUserIds.length > 0) {
      studentOrConditions.push({ user: { $in: matchedUserIds } });
    }

    const students = await Student.find({
      institution: institutionId,
      isDeleted: { $ne: true },
      $or: studentOrConditions,
    })
      .populate('user', 'firstName lastName firstNameEn lastNameEn phone photo username')
      .limit(8);

    // Fetch active enrollment for matching students to display class & section
    const studentIds = students.map(s => s._id);
    let enrollmentMap = {};
    if (studentIds.length > 0) {
      try {
        const enrollments = await StudentEnrollment.find({
          student: { $in: studentIds },
          enrollmentStatus: { $ne: 'inactive' },
        })
          .populate('classLevel', 'name')
          .populate('section', 'name');

        enrollments.forEach(e => {
          const sId = String(e.student);
          if (!enrollmentMap[sId]) {
            enrollmentMap[sId] = {
              className: e.classLevel?.name || '',
              sectionName: e.section?.name || '',
              rollNumber: e.rollNumber || '',
            };
          }
        });
      } catch (_) {}
    }

    const formattedStudents = students.map(s => {
      const user = s.user || matchedUserMap.get(String(s.user)) || {};
      const fullName = (user.firstName || user.lastName)
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : (user.username || s.studentId);
      const enrl = enrollmentMap[String(s._id)] || {};

      return {
        id: s._id,
        studentId: s.studentId,
        admissionNumber: s.admissionNumber,
        name: fullName,
        phone: user.phone || '',
        photo: user.photo || s.photo || '',
        fatherName: s.fatherName || '',
        className: enrl.className || '',
        sectionName: enrl.sectionName || '',
        rollNumber: enrl.rollNumber || '',
      };
    });

    // 3. SEARCH TEACHERS
    const teacherOrConditions = [
      { designation: searchRegex },
      { qualification: searchRegex },
      { employeeId: searchRegex },
    ];
    if (matchedUserIds.length > 0) {
      teacherOrConditions.push({ user: { $in: matchedUserIds } });
    }

    const teachers = await Teacher.find({
      institution: institutionId,
      $or: teacherOrConditions,
    })
      .populate('user', 'firstName lastName phone email photo')
      .limit(6);

    const formattedTeachers = teachers.map(t => {
      const user = t.user || matchedUserMap.get(String(t.user)) || {};
      const fullName = (user.firstName || user.lastName)
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : 'শিক্ষক';

      return {
        id: t._id,
        name: fullName,
        designation: t.designation || 'শিক্ষক',
        phone: user.phone || '',
        photo: user.photo || '',
      };
    });

    return res.json({
      success: true,
      data: {
        students: formattedStudents,
        teachers: formattedTeachers,
      },
    });
  } catch (error) {
    console.error('Global search error:', error);
    return res.status(500).json({
      success: false,
      message: 'সার্চ করতে সমস্যা হয়েছে',
      error: error.message,
    });
  }
};
