const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { DB_RESET_PASSWORD, SUPERADMIN_USERNAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = require('../config/systemConstants');

router.use(protect);

// @desc    সকল ব্যবহারকারীর তালিকা
// @route   GET /api/v1/users
router.get('/', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.user.institution) filter.institution = req.user.institution;
    if (req.query.userType) {
      if (req.query.userType === 'staff') {
        filter.userType = { $nin: ['student', 'guardian'] };
      } else {
        filter.userType = req.query.userType;
      }
    }
    if (req.query.search) {
      const s = new RegExp(req.query.search, 'i');
      filter.$or = [{ username: s }, { email: s }, { firstName: s }, { lastName: s }];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .populate('institution', 'name code')
      .populate('branch', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    ApiResponse.paginated(res, users, page, limit, total);
  } catch (error) {
    next(error);
  }
});

// @desc    ব্যবহারকারীর বিস্তারিত
// @route   GET /api/v1/users/:id
router.get('/:id', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('institution', 'name code')
      .populate('branch', 'name code');

    if (!user) return ApiResponse.notFound(res, 'ব্যবহারকারী পাওয়া যায়নি');
    ApiResponse.success(res, { user });
  } catch (error) {
    next(error);
  }
});

// @desc    ব্যবহারকারীর রোল পরিবর্তন (Promote/Demote)
// @route   PATCH /api/v1/users/:id/role
// @access  Private (Super Admin and Co-Super Admin only)
router.patch('/:id/role', authorize('super_admin', 'co_super_admin'), async (req, res, next) => {
  try {
    const { newRole } = req.body;
    if (newRole === undefined) {
      return ApiResponse.error(res, 'নতুন রোল (newRole) প্রদান করা আবশ্যক', 400);
    }

    if (newRole !== '' && !['admin', 'co_super_admin'].includes(newRole)) {
      return ApiResponse.error(res, 'ভুল রোল নির্বাচন করা হয়েছে', 400);
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return ApiResponse.notFound(res, 'ব্যবহারকারী পাওয়া যায়নি');
    }

    if (targetUser.userType === 'super_admin') {
      return ApiResponse.error(res, 'সুপার অ্যাডমিনের রোল পরিবর্তন করা সম্ভব নয়', 403);
    }

    const isTargetCoSuper = targetUser.userType === 'co_super_admin' || targetUser.adminRole === 'co_super_admin';
    const isRequesterSuper = req.user.userType === 'super_admin';
    if (isTargetCoSuper && !isRequesterSuper) {
      return ApiResponse.error(res, 'কো-সুপার অ্যাডমিনের রোল পরিবর্তন করার ক্ষমতা শুধুমাত্র সুপার অ্যাডমিনের রয়েছে', 403);
    }

    const oldRole = targetUser.adminRole || 'none';
    targetUser.adminRole = newRole;
    await targetUser.save();

    ApiResponse.success(
      res,
      { user: targetUser },
      `ব্যবহারকারীর অতিরিক্ত রোল সফলভাবে '${oldRole}' থেকে '${newRole || 'none'}' এ পরিবর্তন করা হয়েছে`
    );
  } catch (error) {
    next(error);
  }
});

// @desc    প্রতিষ্ঠানের তথ্য আপডেট করুন
// @route   PATCH /api/v1/users/institution/update
router.patch('/institution/update', authorize('super_admin', 'admin', 'principal'), async (req, res, next) => {
  try {
    const institutionId = req.user.institution;
    if (!institutionId) {
      return ApiResponse.error(res, 'ইউজারের কোনো প্রতিষ্ঠান পাওয়া যায়নি', 400);
    }

    const Institution = require('../models/Institution');
    const institution = await Institution.findOne({ where: { _id: institutionId } });
    
    if (!institution) {
      return ApiResponse.notFound(res, 'প্রতিষ্ঠান পাওয়া যায়নি');
    }

    const { name, code, email, phone, address, website, establishedDate, registrationNumber } = req.body;
    
    if (name !== undefined) institution.name = name;
    if (code !== undefined) institution.code = code;
    if (email !== undefined) institution.email = email;
    if (phone !== undefined) institution.phone = phone;
    if (address !== undefined) institution.address = address;
    if (website !== undefined) institution.website = website;
    if (establishedDate !== undefined) institution.establishedDate = establishedDate;
    if (registrationNumber !== undefined) institution.registrationNumber = registrationNumber;

    await institution.save();

    ApiResponse.success(res, { institution }, 'প্রতিষ্ঠানের তথ্য সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
});

// @desc    ডাটাবেজ ব্যাকআপ ডাউনলোড করুন
// @route   GET /api/v1/users/db/backup
router.get('/db/backup', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const models = {
      Institution: require('../models/Institution'),
      Branch: require('../models/Branch'),
      AcademicYear: require('../models/AcademicYear'),
      ClassLevel: require('../models/ClassLevel'),
      Section: require('../models/Section'),
      User: require('../models/User'),
      Teacher: require('../models/Teacher'),
      Student: require('../models/Student'),
      Guardian: require('../models/Guardian'),
      StudentEnrollment: require('../models/StudentEnrollment'),
      Subject: require('../models/Subject'),
      Homework: require('../models/Homework'),
      HomeworkSubmission: require('../models/HomeworkSubmission'),
      Notice: require('../models/Notice'),
      Exam: require('../models/Exam'),
      MarkEntry: require('../models/MarkEntry'),
      Hostel: require('../models/Hostel'),
      Book: require('../models/Book'),
      Invoice: require('../models/Invoice'),
      Payment: require('../models/Payment'),
      TeacherAttendance: require('../models/TeacherAttendance'),
      StudentAttendance: require('../models/StudentAttendance'),
      HifzDailyProgress: require('../models/HifzDailyProgress')
    };

    const backupData = {};
    for (const [name, model] of Object.entries(models)) {
      backupData[name] = await model.findAll({ raw: true });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=madrasah_backup.json');
    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
});

// @desc    ডাটাবেজ ব্যাকআপ রিস্টোর করুন
// @route   POST /api/v1/users/db/restore
router.post('/db/restore', authorize('super_admin'), async (req, res, next) => {
  const sequelize = require('../config/db');
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return ApiResponse.error(res, 'সঠিক ব্যাকআপ ফাইল আপলোড করুন', 400);
    }

    const models = {
      Institution: require('../models/Institution'),
      Branch: require('../models/Branch'),
      AcademicYear: require('../models/AcademicYear'),
      ClassLevel: require('../models/ClassLevel'),
      Section: require('../models/Section'),
      User: require('../models/User'),
      Teacher: require('../models/Teacher'),
      Student: require('../models/Student'),
      Guardian: require('../models/Guardian'),
      StudentEnrollment: require('../models/StudentEnrollment'),
      Subject: require('../models/Subject'),
      Homework: require('../models/Homework'),
      HomeworkSubmission: require('../models/HomeworkSubmission'),
      Notice: require('../models/Notice'),
      Exam: require('../models/Exam'),
      MarkEntry: require('../models/MarkEntry'),
      Hostel: require('../models/Hostel'),
      Book: require('../models/Book'),
      Invoice: require('../models/Invoice'),
      Payment: require('../models/Payment'),
      TeacherAttendance: require('../models/TeacherAttendance'),
      StudentAttendance: require('../models/StudentAttendance'),
      HifzDailyProgress: require('../models/HifzDailyProgress')
    };

    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    const errors = [];
    try {
      for (const [name, model] of Object.entries(models)) {
        try {
          const records = backupData[name];
          if (records && Array.isArray(records) && records.length > 0) {
            // Filter only valid model columns — ignore unknown/MongoDB fields
            const validColumns = Object.keys(model.rawAttributes);
            const cleanRecords = records.map(record => {
              const clean = {};
              validColumns.forEach(col => {
                if (record[col] !== undefined) {
                  clean[col] = record[col];
                }
              });
              return clean;
            });

            const updateFields = validColumns.filter(col => col !== 'id');
            await model.bulkCreate(cleanRecords, {
              updateOnDuplicate: updateFields,
              hooks: false
            });
          }
        } catch (modelErr) {
          console.error(`Restore error for ${name}:`, modelErr.message);
          errors.push(`${name}: ${modelErr.message}`);
        }
      }
    } finally {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    if (errors.length > 0) {
      return ApiResponse.error(res, `কিছু ডেটা রিস্টোর হয়নি: ${errors.join('; ')}`, 500);
    }

    // Backup JSON-এ পাসওয়ার্ড থাকে না, তাই restore-এর পরে সবার পাসওয়ার্ড re-set করতে হবে
    const bcrypt = require('bcryptjs');
    const allUsers = await User.findAll();
    for (const u of allUsers) {
      const pwd = u.userType === 'super_admin' ? SUPERADMIN_PASSWORD : '123456';
      const hash = await bcrypt.hash(pwd, 10);
      const dbReset = u.userType === 'super_admin' ? DB_RESET_PASSWORD : u.dbResetPassword;
      await User.update(
        { password: hash, dbResetPassword: dbReset },
        { where: { id: u.id }, hooks: false }
      );
    }

    ApiResponse.success(res, null, 'ডাটাবেজ ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে!');
  } catch (error) {
    next(error);
  }
});

// @desc    ডাটাবেজ রিসেট করুন
// @route   POST /api/v1/users/db/reset
router.post('/db/reset', authorize('super_admin'), async (req, res, next) => {
  const sequelize = require('../config/db');
  
  try {
    const { password } = req.body;
    if (!password) {
      return ApiResponse.error(res, 'পাসওয়ার্ড প্রদান করা আবশ্যক', 400);
    }

    // Verify against the superadmin's stored dbResetPassword (default: '0000', changeable)
    const currentSuperAdmin = await User.findOne({ where: { userType: 'super_admin' } });
    const storedResetPwd = currentSuperAdmin ? currentSuperAdmin.dbResetPassword : DB_RESET_PASSWORD;
    if (password !== storedResetPwd) {
      return ApiResponse.error(res, 'ভুল রিসেট পাসওয়ার্ড!', 400);
    }

    const Institution = require('../models/Institution');
    const Branch = require('../models/Branch');
    const AcademicYear = require('../models/AcademicYear');
    const ClassLevel = require('../models/ClassLevel');
    const Section = require('../models/Section');
    const Student = require('../models/Student');
    const StudentEnrollment = require('../models/StudentEnrollment');
    const Guardian = require('../models/Guardian');
    const Teacher = require('../models/Teacher');
    const TeacherAttendance = require('../models/TeacherAttendance');
    const StudentAttendance = require('../models/StudentAttendance');
    const Subject = require('../models/Subject');
    const Homework = require('../models/Homework');
    const HomeworkSubmission = require('../models/HomeworkSubmission');
    const Notice = require('../models/Notice');
    const Exam = require('../models/Exam');
    const MarkEntry = require('../models/MarkEntry');
    const Hostel = require('../models/Hostel');
    const Book = require('../models/Book');
    const Invoice = require('../models/Invoice');
    const Payment = require('../models/Payment');
    const HifzDailyProgress = require('../models/HifzDailyProgress');

    const modelsList = [
      User, Institution, Branch, AcademicYear, ClassLevel, Section,
      Student, StudentEnrollment, Guardian, Teacher, TeacherAttendance,
      StudentAttendance, Subject, Homework, HomeworkSubmission, Notice,
      Exam, MarkEntry, Hostel, Book, Invoice, Payment, HifzDailyProgress
    ];

    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    try {
      // Truncate tables
      for (const model of modelsList) {
        await sequelize.query(`DELETE FROM \`${model.getTableName()}\``);
      }

      // 1. Create Institution
      const institution = await Institution.create({
        name: 'দারুল উলূম মাদ্রাসা',
        code: 'DUM',
        registrationNumber: 'MAD-2024-001',
        email: 'info@darululoom.edu.bd',
        phone: '০১৭১২-৩৪৫৬৭৮',
        address: '১২৩, মিরপুর রোড, ঢাকা-১২১৬',
        website: 'https://darululoom.edu.bd',
        establishedDate: new Date('2010-01-15'),
      });

      // 2. Create Branches
      const boysBranch = await Branch.create({
        institution: institution._id,
        name: 'বালক শাখা',
        code: 'BOYS',
        address: '১২৩, মিরপুর রোড, ঢাকা',
        phone: '০১৭১২-৩৪৫৬৭৮',
        email: 'boys@darululoom.edu.bd',
      });
      const girlsBranch = await Branch.create({
        institution: institution._id,
        name: 'বালিকা শাখা',
        code: 'GIRLS',
        address: '১২৩, মিরপুর রোড, ঢাকা',
        phone: '০১৭১২-৩৪৫৬৭৮',
        email: 'girls@darululoom.edu.bd',
      });

      // 3. Create Academic Year
      await AcademicYear.create({
        institution: institution._id,
        name: '২০২৬',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isCurrent: true,
      });

      // 4. Create Class Levels
      const classNames = [
        { name: 'প্লে (নুরানি)', code: 'PLAY', order: 1, educationStream: 'general' },
        { name: 'নার্সারী (নুরানি)', code: 'NURSERY', order: 2, educationStream: 'general' },
        { name: 'নুরানি ১ম শ্রেণি', code: 'N_C1', order: 3, educationStream: 'general' },
        { name: 'নুরানি ২য় শ্রেণি', code: 'N_C2', order: 4, educationStream: 'general' },
        { name: 'নুরানি ৩য় শ্রেণি', code: 'N_C3', order: 5, educationStream: 'general' },
        { name: 'প্রি-হিফজ (নাজেরা)', code: 'PRE_HIFZ', order: 6, educationStream: 'hifz' },
        { name: 'হিফজ ১ম শ্রেণি', code: 'H_C1', order: 7, educationStream: 'hifz' },
        { name: 'হিফজ ২য় শ্রেণি', code: 'H_C2', order: 8, educationStream: 'hifz' },
        { name: 'হিফজ ৩য় শ্রেণি', code: 'H_C3', order: 9, educationStream: 'hifz' },
        { name: 'হিফজ ৪র্থ শ্রেণি', code: 'H_C4', order: 10, educationStream: 'hifz' },
        { name: 'হিফজ ৫ম শ্রেণি', code: 'H_C5', order: 11, educationStream: 'hifz' },
        { name: 'হিফজ ৬ষ্ঠ শ্রেণি', code: 'H_C6', order: 12, educationStream: 'hifz' },
        { name: 'হিফজ ৭ম শ্রেণি', code: 'H_C7', order: 13, educationStream: 'hifz' },
        { name: 'হিফজ ৮ম শ্রেণি', code: 'H_C8', order: 14, educationStream: 'hifz' },
        { name: 'হিফজ ৯ম শ্রেণি', code: 'H_C9', order: 15, educationStream: 'hifz' },
        { name: 'হিফজ ১০ম শ্রেণি', code: 'H_C10', order: 16, educationStream: 'hifz' },
        { name: 'হিফজ (শুনানী)', code: 'HIFZ_SHUNANI', order: 17, educationStream: 'hifz' },
        { name: 'মুসাবাকাহ (প্রতিযোগিতা)', code: 'MUSABAQAH', order: 18, educationStream: 'hifz' },
      ];

      const classes = [];
      for (const c of classNames) {
        const clsObj = await ClassLevel.create({
          ...c,
          institution: institution._id,
          branch: boysBranch._id,
        });
        classes.push(clsObj);
      }

      // 5. Create Sections
      const sectionNames = ['ক', 'খ'];
      for (const cls of classes) {
        for (const sName of sectionNames) {
          await Section.create({
            institution: institution._id,
            branch: boysBranch._id,
            classLevel: cls._id,
            name: `${sName} (বালক)`,
            capacity: 40,
          });
        }
        for (const sName of sectionNames) {
          await Section.create({
            institution: institution._id,
            branch: girlsBranch._id,
            classLevel: cls._id,
            name: `${sName} (বালিকা)`,
            capacity: 40,
          });
        }
      }

      // 6. Create Super Admin — defaults restore হবে, পরে পরিবর্তনযোগ্য
      await User.create({
        _id: req.user._id,
        username: SUPERADMIN_USERNAME,
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        firstName: 'মোহাম্মদ',
        lastName: 'আলী',
        phone: '০১৭০০-০০০০০০',
        userType: 'super_admin',
        institution: institution._id,
        branch: boysBranch._id,
        dbResetPassword: DB_RESET_PASSWORD,
      });

    } finally {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    ApiResponse.success(res, null, 'ডাটাবেজ সফলভাবে রিসেট এবং নতুন সুপার এডমিন সীড করা হয়েছে।');
  } catch (error) {
    next(error);
  }
});

// @desc    ডাটাবেজ রিসেট পাসওয়ার্ড পরিবর্তন করুন (superadmin পরিবর্তন করতে পারবে)
// @route   PUT /api/v1/users/db/reset-password
// @access  Private (Super Admin only)
router.put('/db/reset-password', authorize('super_admin'), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.error(res, 'বর্তমান এবং নতুন রিসেট পাসওয়ার্ড প্রদান করা আবশ্যক', 400);
    }

    const superAdmin = await User.findOne({ where: { _id: req.user._id } });
    if (!superAdmin) {
      return ApiResponse.notFound(res, 'ব্যবহারকারী পাওয়া যায়নি');
    }

    // Verify current reset password (plain text, not hashed)
    if (superAdmin.dbResetPassword !== currentPassword) {
      return ApiResponse.error(res, 'বর্তমান রিসেট পাসওয়ার্ড ভুল', 400);
    }

    superAdmin.dbResetPassword = newPassword;
    await superAdmin.save({ hooks: false });

    ApiResponse.success(res, null, 'ডাটাবেজ রিসেট পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে');
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// Change Branch (Multi-Branch for super_admin)
router.post('/change-branch', protect, authorize('super_admin'), async (req, res, next) => {
  try {
    const { branch } = req.body;
    if (!branch) return res.status(400).json({ success: false, message: 'Branch name is required' });
    
    req.user.branch = branch;
    await req.user.save();
    
    res.status(200).json({ success: true, message: `Branch switched to ${branch}` });
  } catch (error) { next(error); }
});
