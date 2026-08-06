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
      return ApiResponse.error(res, 'ইমেইল ও পাসওয়ার্ড দিন', 400);
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { phone: email },
          { username: email }
        ]
      }
    });
    if (!user) {
      return ApiResponse.error(res, 'ইমেইল, ফোন নম্বর বা পাসওয়ার্ড ভুল', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.error(res, 'ইমেইল বা পাসওয়ার্ড ভুল', 401);
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 'আপনার একাউন্ট নিষ্ক্রিয়', 403);
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    let permissions = {};
    if (user.userType === 'super_admin') {
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
        can_view_all_attendance: true, can_view_all_homework: true, can_use_messaging: true, can_manage_hostel: true
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

    ApiResponse.success(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        userType: user.userType,
        photo: user.photo,
        institution: user.institution,
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
      .populate('institution', 'name code logo')
      .populate('branch', 'name code');

    let permissions = {};
    if (user.userType === 'super_admin') {
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
        can_view_all_attendance: true, can_view_all_homework: true, can_use_messaging: true, can_manage_hostel: true
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
    
    // Check hifz eligibility for students and guardians
    let isHifzEligible = false;
    
    if (user.userType === 'student') {
      const student = await Student.findOne({ user: user._id });
      if (student && student.currentEnrollment) {
        const enrollment = await StudentEnrollment.findById(student.currentEnrollment).populate('classLevel');
        if (enrollment && enrollment.classLevel && enrollment.classLevel.educationStream === 'hifz') {
          isHifzEligible = true;
        }
      }
    } else if (user.userType === 'guardian') {
      const guardian = await Guardian.findOne({ user: user._id });
      if (guardian && guardian.students && guardian.students.length > 0) {
        const linkedStudentIds = guardian.students.map(s => s.student);
        const students = await Student.find({ _id: { $in: linkedStudentIds } });
        
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

    ApiResponse.success(res, { user: { ...user.toJSON(), permissions, isHifzEligible } });
  } catch (error) {
    next(error);
  }
};

// @desc    প্রোফাইল আপডেট
// @route   PATCH /api/v1/auth/me
exports.updateMe = async (req, res, next) => {
  try {
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
