const { Op } = require('sequelize');
const sequelize = require('../config/db');
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
    const bnToEn = { '০':'0', '১':'1', '২':'2', '৩':'3', '৪':'4', '৫':'5', '৬':'6', '৭':'7', '৮':'8', '৯':'9' };
    const enToBn = { '0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯' };
    const enDigits = rawQuery.replace(/[০-৯]/g, d => bnToEn[d]);
    const bnDigits = rawQuery.replace(/[0-9]/g, d => enToBn[d]);
    const cleanDigits = enDigits.replace(/[^0-9]/g, '');
    const words = rawQuery.split(/\s+/).filter(Boolean);

    // 1. MATCH USERS
    const userOrConditions = [
      { firstName: { [Op.like]: `%${rawQuery}%` } },
      { lastName: { [Op.like]: `%${rawQuery}%` } },
      { username: { [Op.like]: `%${rawQuery}%` } },
      { phone: { [Op.like]: `%${rawQuery}%` } },
      { phone: { [Op.like]: `%${enDigits}%` } },
      { phone: { [Op.like]: `%${bnDigits}%` } },
      sequelize.where(
        sequelize.fn('concat', sequelize.fn('coalesce', sequelize.col('firstName'), ''), ' ', sequelize.fn('coalesce', sequelize.col('lastName'), '')),
        { [Op.like]: `%${rawQuery}%` }
      ),
    ];

    if (cleanDigits.length >= 3) {
      userOrConditions.push(
        sequelize.where(
          sequelize.fn('replace', sequelize.fn('replace', sequelize.col('phone'), '-', ''), ' ', ''),
          { [Op.like]: `%${cleanDigits}%` }
        )
      );
      const bnClean = cleanDigits.replace(/[0-9]/g, d => enToBn[d]);
      userOrConditions.push(
        sequelize.where(
          sequelize.fn('replace', sequelize.fn('replace', sequelize.col('phone'), '-', ''), ' ', ''),
          { [Op.like]: `%${bnClean}%` }
        )
      );
    }

    if (User.rawAttributes && User.rawAttributes.firstNameEn) {
      userOrConditions.push(
        { firstNameEn: { [Op.like]: `%${rawQuery}%` } },
        sequelize.where(
          sequelize.fn('concat', sequelize.fn('coalesce', sequelize.col('firstNameEn'), ''), ' ', sequelize.fn('coalesce', sequelize.col('lastNameEn'), '')),
          { [Op.like]: `%${rawQuery}%` }
        )
      );
    }
    if (User.rawAttributes && User.rawAttributes.lastNameEn) {
      userOrConditions.push({ lastNameEn: { [Op.like]: `%${rawQuery}%` } });
    }

    if (words.length > 1) {
      words.forEach(word => {
        userOrConditions.push(
          { firstName: { [Op.like]: `%${word}%` } },
          { lastName: { [Op.like]: `%${word}%` } }
        );
      });
    }

    let matchedUsers = [];
    try {
      matchedUsers = await User.findAll({
        where: { [Op.or]: userOrConditions },
        attributes: ['_id', 'firstName', 'lastName', 'firstNameEn', 'lastNameEn', 'phone', 'username', 'photo'],
        raw: true,
      });
    } catch (uErr) {
      console.error('User search error in globalSearch:', uErr.message);
    }

    const matchedUserMap = new Map();
    matchedUsers.forEach(u => {
      matchedUserMap.set(String(u._id), u);
    });
    const matchedUserIds = Array.from(matchedUserMap.keys());

    // Lookup students from matching guardians (e.g. searching guardian phone or name)
    let guardianStudentIds = [];
    if (matchedUserIds.length > 0) {
      try {
        const Guardian = require('../models/Guardian');
        const matchedGuardians = await Guardian.findAll({
          where: {
            user: { [Op.in]: matchedUserIds },
          },
          attributes: ['students'],
          raw: true,
        });
        matchedGuardians.forEach(g => {
          let arr = g.students;
          if (typeof arr === 'string') {
            try { arr = JSON.parse(arr); } catch (_) { arr = []; }
          }
          if (Array.isArray(arr)) {
            arr.forEach(item => {
              if (typeof item === 'string') {
                guardianStudentIds.push(item);
              } else if (item && typeof item === 'object') {
                const sid = item.student || item.studentId || item._id || item.id;
                if (sid) guardianStudentIds.push(String(typeof sid === 'object' ? (sid._id || sid.id) : sid));
              }
            });
          }
        });
        guardianStudentIds = [...new Set(guardianStudentIds)];
      } catch (_) {}
    }

    // 2. SEARCH STUDENTS
    const studentOrConditions = [
      { studentId: new RegExp(rawQuery, 'i') },
      { studentId: new RegExp(enDigits, 'i') },
      { admissionNumber: new RegExp(rawQuery, 'i') },
      { admissionNumber: new RegExp(enDigits, 'i') },
      { fatherName: new RegExp(rawQuery, 'i') },
      { motherName: new RegExp(rawQuery, 'i') },
      { village: new RegExp(rawQuery, 'i') },
    ];
    if (words.length > 1) {
      words.forEach(word => {
        studentOrConditions.push(
          { fatherName: new RegExp(word, 'i') },
          { motherName: new RegExp(word, 'i') }
        );
      });
    }
    if (matchedUserIds.length > 0) {
      studentOrConditions.push({ user: { $in: matchedUserIds } });
    }
    if (guardianStudentIds.length > 0) {
      studentOrConditions.push({ _id: { $in: guardianStudentIds } });
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
      { designation: new RegExp(rawQuery, 'i') },
      { qualification: new RegExp(rawQuery, 'i') },
      { employeeId: new RegExp(rawQuery, 'i') },
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
