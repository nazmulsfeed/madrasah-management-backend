const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const RolePermission = require('../models/RolePermission');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const StudentEnrollment = require('../models/StudentEnrollment');
const ClassLevel = require('../models/ClassLevel');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    লগ ইন
// @route   POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return ApiResponse.error(res, 'ইমেইল/ছাত্র আইডি ও পাসওয়ার্ড দিন', 400);
    }

    let user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { phone: email },
          { username: email }
        ],
        isActive: true
      },
      order: [['createdAt', 'DESC']]
    });

    // Fallback: If not found among active users, check if an inactive user exists with these credentials
    if (!user) {
      user = await User.findOne({
        where: {
          [Op.or]: [
            { email: email.toLowerCase() },
            { phone: email },
            { username: email }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
    }

    // If not found by email/phone/username, try finding by active studentId
    if (!user) {
      const studentRecord = await Student.findOne({
        where: {
          studentId: email,
          isDeleted: { [Op.ne]: true }
        }
      });
      if (studentRecord) {
        user = await User.findOne({ where: { _id: studentRecord.user } });
      }
    }

    if (!user) {
      return ApiResponse.error(res, 'ইমেইল, ফোন নম্বর, ছাত্র আইডি বা পাসওয়ার্ড ভুল', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.error(res, 'ইমেইল বা পাসওয়ার্ড ভুল', 401);
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 'আপনার একাউন্ট নিষ্ক্রিয়', 403);
    }

    if (user.userType === 'student') {
      const studentProfile = await Student.findOne({
        where: {
          user: user._id,
          isDeleted: { [Op.ne]: true }
        }
      });
      if (!studentProfile || studentProfile.status === 'inactive') {
        return ApiResponse.error(res, 'এই শিক্ষার্থী অ্যাকাউন্টটি নিষ্ক্রিয় বা মুছে ফেলা হয়েছে', 403);
      }
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    let permissions = {};
    const isSuperOrCoSuper = user.userType === 'super_admin' || user.userType === 'co_super_admin' || user.adminRole === 'co_super_admin' || user.adminRole === 'admin' || user.userType === 'admin';
    if (isSuperOrCoSuper) {
      permissions = {
        can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
        can_view_attendance: true, can_mark_attendance: true,
        can_view_exams: true, can_manage_exams: true,
        can_view_finance: true, can_manage_finance: true,
        can_view_users: true, can_manage_users: true,
        can_view_notice: true, can_manage_notice: true,
        can_grade_exams: true, can_add_syllabus: true,
        can_communicate_parents: true, can_take_live_class: true,
        can_view_reports: true, can_manage_hifz: true, can_view_students: true,
        can_view_all_attendance: true, can_view_all_homework: true, can_use_messaging: true, can_manage_hostel: true,
        can_view_library: true, can_view_settings: true
      };
    } else {
      const rolesToCheck = [user.userType];
      if (user.adminRole) rolesToCheck.push(user.adminRole);
      const rolePerms = await RolePermission.findAll({ where: { role: rolesToCheck } });
      rolePerms.forEach(rp => {
        let perms = rp.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) {}
        }
        if (perms && typeof perms === 'object') {
          Object.assign(permissions, perms);
        }
      });
    }

    const token = generateToken(user._id);

    let instData = null;
    try {
      const Institution = require('../models/Institution');
      if (user.institution) {
        instData = await Institution.findOne({ where: { _id: user.institution } });
      }
      if (!instData) {
        instData = await Institution.findOne();
      }
    } catch (e) {}

    const institutionPayload = instData ? {
      _id: instData._id,
      name: instData.name,
      branchName: instData.branchName || 'প্রধান শাখা',
      code: instData.code,
      logo: instData.logo,
      email: instData.email,
      phone: instData.phone,
      address: instData.address,
      website: instData.website,
      registrationNumber: instData.registrationNumber,
    } : (user.institution || null);

    ApiResponse.success(res, {
      token,
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        userType: user.userType,
        adminRole: user.adminRole || '',
        photo: user.photo,
        institution: institutionPayload,
        branch: user.branch,
        permissions,
      },
    }, 'সফলভাবে লগ ইন হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    রেজিস্ট্রেশন
// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, userType, phone, institution, branch } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return ApiResponse.error(res, 'এই ইমেইল বা ব্যবহারকারীর নাম ইতিমধ্যে বিদ্যমান', 400);
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      userType: userType || 'student',
      phone: phone || '',
      institution: institution || null,
      branch: branch || null,
    });

    const token = generateToken(user._id);

    ApiResponse.created(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        userType: user.userType,
      },
    }, 'সফলভাবে নিবন্ধন হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    বর্তমান ব্যবহারকারীর তথ্য
// @route   GET /api/v1/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('institution', 'name branchName code logo address phone email')
      .populate('branch', 'name code');

    let permissions = {};
    const isSuperOrCoSuper = user.userType === 'super_admin' || user.userType === 'co_super_admin' || user.adminRole === 'co_super_admin' || user.adminRole === 'admin' || user.userType === 'admin';
    if (isSuperOrCoSuper) {
      permissions = {
        can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
        can_view_attendance: true, can_mark_attendance: true,
        can_view_exams: true, can_manage_exams: true,
        can_view_finance: true, can_manage_finance: true,
        can_view_users: true, can_manage_users: true,
        can_view_notice: true, can_manage_notice: true,
        can_grade_exams: true, can_add_syllabus: true,
        can_communicate_parents: true, can_take_live_class: true,
        can_view_reports: true, can_manage_hifz: true, can_view_students: true,
        can_view_all_attendance: true, can_view_all_homework: true, can_use_messaging: true, can_manage_hostel: true,
        can_view_library: true, can_view_settings: true
      };
    } else {
      const rolesToCheck = [user.userType];
      if (user.adminRole) rolesToCheck.push(user.adminRole);
      const rolePerms = await RolePermission.findAll({ where: { role: rolesToCheck } });
      rolePerms.forEach(rp => {
        let perms = rp.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) {}
        }
        if (perms && typeof perms === 'object') {
          Object.assign(permissions, perms);
        }
      });
    }
    
    // Check hifz eligibility and student/guardian identifiers
    let isHifzEligible = false;
    let studentId = null;
    let guardianStudents = [];
    
    if (user.userType === 'student') {
      const student = await Student.findOne({ user: user._id });
      if (student) {
        studentId = student._id;
        if (student.currentEnrollment) {
          const enrollment = await StudentEnrollment.findById(student.currentEnrollment).populate('classLevel');
          if (enrollment && enrollment.classLevel && enrollment.classLevel.educationStream === 'hifz') {
            isHifzEligible = true;
          }
        }
      }
    } else if (user.userType === 'guardian') {
      const guardian = await Guardian.findOne({ user: user._id });
      if (guardian && guardian.students && guardian.students.length > 0) {
        const linkedStudentIds = guardian.students.map(s => s.student);
        const students = await Student.find({ _id: { $in: linkedStudentIds } });
        guardianStudents = students.map(s => ({
          _id: s._id,
          studentId: s.studentId,
          admissionNumber: s.admissionNumber,
          user: s.user
        }));
        
        for (const student of students) {
          if (student.currentEnrollment) {
            const enrollment = await StudentEnrollment.findById(student.currentEnrollment).populate('classLevel');
            if (enrollment && enrollment.classLevel && enrollment.classLevel.educationStream === 'hifz') {
              isHifzEligible = true;
              break;
            }
          }
        }
      }
    }

    const userObj = user.toJSON();
    if (userObj.institution && typeof userObj.institution === 'object') {
      if (!userObj.institution.branchName) {
        userObj.institution.branchName = 'প্রধান শাখা';
      }
    }

    ApiResponse.success(res, { 
      user: { 
        ...userObj, 
        permissions, 
        isHifzEligible,
        studentId,
        guardianStudents
      } 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    প্রোফাইল আপডেট
// @route   PATCH /api/v1/auth/me
exports.updateMe = async (req, res, next) => {
  try {
    const isSuperOrCoSuper = req.user.userType === 'super_admin' || 
                             req.user.userType === 'co_super_admin' || 
                             req.user.adminRole === 'co_super_admin';

    // If updating photo, check profile.photo.update permission for student/guardian/restricted roles
    if (req.body.photo !== undefined && !isSuperOrCoSuper) {
      const { evaluateUserPermission } = require('../middleware/rbac');
      if (typeof evaluateUserPermission === 'function') {
        const canUpdatePhoto = await evaluateUserPermission(req.user, 'profile.photo.update');
        if (!canUpdatePhoto) {
          return ApiResponse.forbidden(res, 'প্রোফাইল ছবি পরিবর্তনের অনুমতি আপনার অ্যাকাউন্টের জন্য বন্ধ রাখা হয়েছে');
        }
      }
    }

    // If updating name/phone (only when values actually change), check profile.info.update permission
    const isFirstNameChanged = req.body.firstName !== undefined && (req.body.firstName || '').trim() !== (req.user.firstName || '').trim();
    const isLastNameChanged = req.body.lastName !== undefined && (req.body.lastName || '').trim() !== (req.user.lastName || '').trim();
    const isPhoneChanged = req.body.phone !== undefined && (req.body.phone || '').trim() !== (req.user.phone || '').trim();

    if ((isFirstNameChanged || isLastNameChanged || isPhoneChanged) && !isSuperOrCoSuper) {
      const { evaluateUserPermission } = require('../middleware/rbac');
      if (typeof evaluateUserPermission === 'function') {
        const canUpdateInfo = await evaluateUserPermission(req.user, 'profile.info.update');
        if (!canUpdateInfo) {
          return ApiResponse.forbidden(res, 'ব্যক্তিগত তথ্য পরিবর্তনের অনুমতি আপনার অ্যাকাউন্টের জন্য বন্ধ রাখা হয়েছে');
        }
      }
    }

    const allowedFields = ['firstName', 'lastName', 'phone', 'photo'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    // If photo is updated and user is a student, sync to Student table as well
    if (updates.photo !== undefined && req.user.userType === 'student') {
      try {
        const Student = require('../models/Student');
        await Student.update(
          { photo: updates.photo },
          { where: { user: req.user._id } }
        );
      } catch (syncErr) {
        console.error('Failed to sync photo to Student table:', syncErr);
      }
    }

    ApiResponse.success(res, { user }, 'প্রোফাইল আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    পাসওয়ার্ড পরিবর্তন
// @route   PATCH /api/v1/auth/password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.error(res, 'বর্তমান এবং নতুন পাসওয়ার্ড দিন', 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return ApiResponse.error(res, 'ইউজার পাওয়া যায়নি', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return ApiResponse.error(res, 'বর্তমান পাসওয়ার্ড ভুল', 401);
    }

    user.password = newPassword;
    await user.save();

    ApiResponse.success(res, null, 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
