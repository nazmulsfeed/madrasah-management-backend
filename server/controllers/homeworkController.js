const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const StudentEnrollment = require('../models/StudentEnrollment');
const RolePermission = require('../models/RolePermission');
const ApiResponse = require('../utils/apiResponse');

// @desc    সকল হোমওয়ার্ক তালিকা
// @route   GET /api/v1/homework
exports.getHomeworks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const filter = {};
    // super_admin হলে institution ফিল্টার প্রযোজ্য হবে না (সব দেখতে পারবে)
    if (req.user.userType !== 'super_admin' && req.user.institution) {
      filter.institution = req.user.institution;
    }
    
    console.log('GET /homework - UserType:', req.user.userType, 'Institution:', req.user.institution);
    console.log('GET /homework - Filter before query:', filter);
    
    // ফিল্টার: classLevel, section, subject
    if (req.query.classLevel) filter.classLevel = req.query.classLevel;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.status) filter.status = req.query.status;

    // ডেট ফিল্টার
    if (req.query.dateFilter === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      filter.assignDate = { $gte: startOfToday, $lte: endOfToday };
    } else if (req.query.dateFilter && req.query.dateFilter !== 'all') {
      const selectedDate = new Date(req.query.dateFilter);
      if (!isNaN(selectedDate.getTime())) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.assignDate = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    // সার্চ ফিল্টার
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { subject: searchRegex }
      ];
    }

    // --- Student/Guardian class scoping ---
    const userType = req.user.userType;

    if (userType === 'student' || userType === 'guardian') {
      let hasFullAccess = false;
      const rolePerm = await RolePermission.findOne({ role: userType });
      if (rolePerm && rolePerm.permissions && rolePerm.permissions.can_view_all_homework) {
        hasFullAccess = true;
      }

      if (!hasFullAccess) {
        let classLevelNames = [];

        if (userType === 'student') {
          const student = await Student.findOne({ user: req.user._id });
          if (student && student.currentEnrollment) {
            const enrollment = await StudentEnrollment.findById(student.currentEnrollment).populate('classLevel');
            if (enrollment && enrollment.classLevel) {
              classLevelNames = [enrollment.classLevel.name];
            }
          }
          filter.status = 'active';
        } else if (userType === 'guardian') {
          const guardian = await Guardian.findOne({ user: req.user._id });
          if (guardian && guardian.students && guardian.students.length > 0) {
            const linkedStudentIds = guardian.students.map(s => s.student);
            const students = await Student.find({ _id: { $in: linkedStudentIds } });
            const enrollmentIds = students.filter(s => s.currentEnrollment).map(s => s.currentEnrollment);
            const enrollments = await StudentEnrollment.find({ _id: { $in: enrollmentIds } }).populate('classLevel');
            classLevelNames = [...new Set(enrollments.map(e => e.classLevel?.name).filter(Boolean))];
          }
          filter.status = 'active';
        }

        if (classLevelNames.length > 0 && !filter.classLevel) {
          filter.classLevel = { $in: classLevelNames };
        } else if (classLevelNames.length === 0) {
          return ApiResponse.paginated(res, [], page, limit, 0);
        }
      }
    } else if (userType === 'student') {
      // Fallback: if student type without scoping above
      filter.status = 'active';
    }

    const total = await Homework.countDocuments(filter);
    const homeworks = await Homework.find(filter)
      .populate('assignedBy', 'firstName lastName fullName')
      .sort({ assignDate: -1 })
      .skip(skip)
      .limit(limit);

    ApiResponse.paginated(res, homeworks, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন হোমওয়ার্ক তৈরি
// @route   POST /api/v1/homework
exports.createHomework = async (req, res, next) => {
  try {
    const { title, description, subject, classLevel, section, dueDate, status } = req.body;

    const homework = await Homework.create({
      institution: req.user.institution,
      title,
      description,
      subject,
      classLevel,
      section,
      dueDate,
      status: status || 'active',
      assignedBy: req.user._id,
    });

    const populatedHomework = await Homework.findById(homework._id)
      .populate('assignedBy', 'fullName');

    ApiResponse.created(res, { homework: populatedHomework }, 'হোমওয়ার্ক সফলভাবে দেওয়া হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হোমওয়ার্ক বিস্তারিত
// @route   GET /api/v1/homework/:id
exports.getHomework = async (req, res, next) => {
  try {
    const homework = await Homework.findById(req.params.id)
      .populate('assignedBy', 'firstName lastName fullName');

    if (!homework) {
      return ApiResponse.notFound(res, 'হোমওয়ার্ক পাওয়া যায়নি');
    }

    ApiResponse.success(res, { homework });
  } catch (error) {
    next(error);
  }
};

// @desc    হোমওয়ার্ক আপডেট
// @route   PATCH /api/v1/homework/:id
exports.updateHomework = async (req, res, next) => {
  try {
    const homework = await Homework.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!homework) {
      return ApiResponse.notFound(res, 'হোমওয়ার্ক পাওয়া যায়নি');
    }

    ApiResponse.success(res, { homework }, 'হোমওয়ার্ক আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হোমওয়ার্ক ডিলিট
// @route   DELETE /api/v1/homework/:id
exports.deleteHomework = async (req, res, next) => {
  try {
    const homework = await Homework.findById(req.params.id);
    if (!homework) {
      return ApiResponse.notFound(res, 'হোমওয়ার্ক পাওয়া যায়নি');
    }

    // শুধু যে homework দিয়েছে সে delete করতে পারবে,
    // তবে super_admin ও admin সবসময় delete করতে পারবে
    const isOwner = homework.assignedBy.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'admin'].includes(req.user.userType);

    if (!isOwner && !isAdmin) {
      return ApiResponse.forbidden(res, 'আপনি শুধুমাত্র নিজের দেওয়া হোমওয়ার্ক মুছতে পারবেন');
    }

    await homework.deleteOne();

    // হোমওয়ার্ক সাবমিশনগুলোও মুছে ফেলতে হবে
    await HomeworkSubmission.deleteMany({ homework: req.params.id });

    ApiResponse.success(res, null, 'হোমওয়ার্ক সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    পাবলিক হোমওয়ার্ক সেটিংস
// @route   GET /api/v1/homework/public/settings
exports.getPublicHomeworkSettings = async (req, res, next) => {
  try {
    const Institution = require('../models/Institution');
    const inst = await Institution.findOne();
    const isPublic = inst ? inst.isHomeworkPublic : false;
    ApiResponse.success(res, { isHomeworkPublic: isPublic });
  } catch (error) {
    next(error);
  }
};

// @desc    পাবলিক হোমওয়ার্ক তালিকা
// @route   GET /api/v1/homework/public
exports.getPublicHomeworks = async (req, res, next) => {
  try {
    const Institution = require('../models/Institution');
    const inst = await Institution.findOne();
    if (!inst || !inst.isHomeworkPublic) {
      return ApiResponse.forbidden(res, 'পাবলিক হোমওয়ার্ক ভিউ নিষ্ক্রিয় রয়েছে');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = 'active';
    }
    if (req.query.classLevel) filter.classLevel = req.query.classLevel;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.subject) filter.subject = req.query.subject;

    // ডেট ফিল্টার
    if (req.query.dateFilter === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      filter.assignDate = { $gte: startOfToday, $lte: endOfToday };
    } else if (req.query.dateFilter && req.query.dateFilter !== 'all') {
      const selectedDate = new Date(req.query.dateFilter);
      if (!isNaN(selectedDate.getTime())) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.assignDate = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    // সার্চ ফিল্টার
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { subject: searchRegex }
      ];
    }

    const total = await Homework.countDocuments(filter);
    const homeworks = await Homework.find(filter)
      .populate('assignedBy', 'firstName lastName fullName')
      .sort({ assignDate: -1 })
      .skip(skip)
      .limit(limit);

    ApiResponse.paginated(res, homeworks, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc    পাবলিক হোমওয়ার্ক টগল করুন (super_admin শুধুমাত্র)
// @route   POST /api/v1/homework/public/toggle
exports.togglePublicHomework = async (req, res, next) => {
  try {
    if (req.user.userType !== 'super_admin') {
      return ApiResponse.forbidden(res, 'শুধুমাত্র সুপার এডমিন এই পরিবর্তন করতে পারবেন');
    }

    const Institution = require('../models/Institution');
    const inst = await Institution.findOne();
    if (!inst) {
      return ApiResponse.notFound(res, 'প্রতিষ্ঠান পাওয়া যায়নি');
    }

    inst.isHomeworkPublic = req.body.isHomeworkPublic === true;
    await inst.save();

    ApiResponse.success(res, { isHomeworkPublic: inst.isHomeworkPublic }, 'পাবলিক সেটিংস আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};
