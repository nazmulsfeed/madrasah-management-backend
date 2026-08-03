const { Op } = require('sequelize');
const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const StudentEnrollment = require('../models/StudentEnrollment');
const RolePermission = require('../models/RolePermission');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User'); // Required for fetching assignedBy

// Helper function to map assignedByUser to assignedBy for frontend compatibility
const mapAssignedBy = (homeworks) => {
  return homeworks.map(hw => {
    const h = hw.toJSON();
    if (h.assignedByUser) {
      h.assignedBy = h.assignedByUser;
      delete h.assignedByUser;
    }
    return h;
  });
};

// @desc    সকল হোমওয়ার্ক তালিকা
// @route   GET /api/v1/homework
exports.getHomeworks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.userType !== 'super_admin' && req.user.institution) {
      where.institution = req.user.institution;
    }
    
    if (req.query.classLevel) where.classLevel = req.query.classLevel;
    if (req.query.section) where.section = req.query.section;
    if (req.query.subject) where.subject = req.query.subject;
    if (req.query.status) where.status = req.query.status;

    if (req.query.dateFilter === 'today') {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
      where.assignDate = { [Op.between]: [startOfToday, endOfToday] };
    } else if (req.query.dateFilter && req.query.dateFilter !== 'all') {
      const selectedDate = new Date(req.query.dateFilter);
      if (!isNaN(selectedDate.getTime())) {
        const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);
        where.assignDate = { [Op.between]: [startOfDay, endOfDay] };
      }
    }

    if (req.query.search) {
      const searchTerm = `%${req.query.search}%`;
      where[Op.or] = [
        { title: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } },
        { subject: { [Op.like]: searchTerm } }
      ];
    }

    const userType = req.user.userType;
    if (userType === 'student' || userType === 'guardian') {
      let hasFullAccess = false;
      const rolePerm = await RolePermission.findOne({ where: { role: userType } });
      if (rolePerm && rolePerm.permissions && rolePerm.permissions.can_view_all_homework) {
        hasFullAccess = true;
      }

      if (!hasFullAccess) {
        let classLevelNames = [];
        if (userType === 'student') {
          const student = await Student.findOne({ where: { user: req.user._id } });
          if (student && student.currentEnrollment) {
            const enrollment = await StudentEnrollment.findByPk(student.currentEnrollment);
            if (enrollment) { // Note: might need to fetch classLevel name manually
               const classLvl = await require('../models/ClassLevel').findByPk(enrollment.classLevel);
               if (classLvl) classLevelNames = [classLvl.name];
               else classLevelNames = [enrollment.classLevel];
            }
          }
          where.status = 'active';
        } else if (userType === 'guardian') {
          const guardian = await Guardian.findOne({ where: { user: req.user._id } });
          if (guardian && guardian.students && guardian.students.length > 0) {
            const linkedStudentIds = guardian.students.map(s => s.student);
            const students = await Student.findAll({ where: { _id: { [Op.in]: linkedStudentIds } } });
            const enrollmentIds = students.filter(s => s.currentEnrollment).map(s => s.currentEnrollment);
            const enrollments = await StudentEnrollment.findAll({ where: { _id: { [Op.in]: enrollmentIds } } });
            // Simplified: we'll use raw classLevel field from enrollments
            classLevelNames = [...new Set(enrollments.map(e => e.classLevel).filter(Boolean))];
          }
          where.status = 'active';
        }

        if (classLevelNames.length > 0 && !where.classLevel) {
          where.classLevel = { [Op.in]: classLevelNames };
        } else if (classLevelNames.length === 0) {
          return ApiResponse.paginated(res, [], page, limit, 0);
        }
      }
    } else if (userType === 'student') {
      where.status = 'active';
    }

    const total = await Homework.count({ where });
    
    // We will query User separately and attach manually to avoid missing associations
    const homeworksRaw = await Homework.findAll({
      where,
      order: [['assignDate', 'DESC']],
      offset: offset,
      limit: limit
    });
    
    // Fetch assignedBy users manually
    const userIds = [...new Set(homeworksRaw.map(h => h.assignedBy).filter(Boolean))];
    const users = await User.findAll({ where: { _id: { [Op.in]: userIds } }, attributes: ['_id', 'firstName', 'lastName'] });
    const userMap = {};
    users.forEach(u => {
      const userObj = u.toJSON();
      userObj.fullName = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim();
      userMap[userObj._id] = userObj;
    });
    
    const homeworks = homeworksRaw.map(hw => {
      const h = hw.toJSON();
      if (h.assignedBy && userMap[h.assignedBy]) {
        h.assignedBy = userMap[h.assignedBy];
      }
      return h;
    });

    ApiResponse.paginated(res, homeworks, page, limit, total);
  } catch (error) {
    next(error);
  }
};

exports.createHomework = async (req, res, next) => {
  try {
    const { title, description, subject, classLevel, section, dueDate, status, isKhataHomework } = req.body;

    const homework = await Homework.create({
      institution: req.user.institution,
      title,
      description,
      subject,
      classLevel,
      section,
      dueDate,
      status: status || 'active',
      isKhataHomework: isKhataHomework === true || isKhataHomework === 'true',
      assignedBy: req.user._id,
    });
    
    const user = await User.findOne({ where: { _id: req.user._id }, attributes: ['_id', 'firstName', 'lastName'] });
    const h = homework.toJSON();
    if (user) {
      const uObj = user.toJSON();
      uObj.fullName = `${uObj.firstName || ''} ${uObj.lastName || ''}`.trim();
      h.assignedBy = uObj;
    }

    ApiResponse.created(res, { homework: h }, 'হোমওয়ার্ক সফলভাবে দেওয়া হয়েছে');
  } catch (error) {
    next(error);
  }
};

exports.getHomework = async (req, res, next) => {
  try {
    const homeworkRaw = await Homework.findByPk(req.params.id);

    if (!homeworkRaw) {
      return ApiResponse.notFound(res, 'হোমওয়ার্ক পাওয়া যায়নি');
    }
    
    const h = homeworkRaw.toJSON();
    if (h.assignedBy) {
       const user = await User.findOne({ where: { _id: h.assignedBy }, attributes: ['_id', 'firstName', 'lastName'] });
       if (user) {
         const uObj = user.toJSON();
         uObj.fullName = `${uObj.firstName || ''} ${uObj.lastName || ''}`.trim();
         h.assignedBy = uObj;
       }
    }

    ApiResponse.success(res, { homework: h });
  } catch (error) {
    next(error);
  }
};

exports.updateHomework = async (req, res, next) => {
  try {
    const homework = await Homework.findByPk(req.params.id);

    if (!homework) {
      return ApiResponse.notFound(res, 'হোমওয়ার্ক পাওয়া যায়নি');
    }
    
    await homework.update(req.body);

    ApiResponse.success(res, { homework }, 'হোমওয়ার্ক আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};

exports.deleteHomework = async (req, res, next) => {
  try {
    const homework = await Homework.findByPk(req.params.id);
    if (!homework) {
      return ApiResponse.notFound(res, 'হোমওয়ার্ক পাওয়া যায়নি');
    }

    const isOwner = homework.assignedBy === req.user._id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.userType);

    if (!isOwner && !isAdmin) {
      return ApiResponse.forbidden(res, 'আপনি শুধুমাত্র নিজের দেওয়া হোমওয়ার্ক মুছতে পারবেন');
    }

    await homework.destroy();

    await HomeworkSubmission.destroy({ where: { homework: req.params.id } });

    ApiResponse.success(res, null, 'হোমওয়ার্ক সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

exports.getPublicHomeworkSettings = async (req, res, next) => {
  try {
    const Institution = require('../models/Institution');
    const inst = await Institution.findOne(); // Assumes only one institution exists or needs order
    const isPublic = inst ? inst.isHomeworkPublic : false;
    ApiResponse.success(res, { isHomeworkPublic: isPublic });
  } catch (error) {
    next(error);
  }
};

exports.getPublicHomeworks = async (req, res, next) => {
  try {
    const Institution = require('../models/Institution');
    const inst = await Institution.findOne();
    if (!inst || !inst.isHomeworkPublic) {
      return ApiResponse.forbidden(res, 'পাবলিক হোমওয়ার্ক ভিউ নিষ্ক্রিয় রয়েছে');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    } else {
      where.status = 'active';
    }
    if (req.query.classLevel) where.classLevel = req.query.classLevel;
    if (req.query.section) where.section = req.query.section;
    if (req.query.subject) where.subject = req.query.subject;

    if (req.query.dateFilter === 'today') {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
      where.assignDate = { [Op.between]: [startOfToday, endOfToday] };
    } else if (req.query.dateFilter && req.query.dateFilter !== 'all') {
      const selectedDate = new Date(req.query.dateFilter);
      if (!isNaN(selectedDate.getTime())) {
        const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);
        where.assignDate = { [Op.between]: [startOfDay, endOfDay] };
      }
    }

    if (req.query.search) {
      const searchTerm = `%${req.query.search}%`;
      where[Op.or] = [
        { title: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } },
        { subject: { [Op.like]: searchTerm } }
      ];
    }

    const total = await Homework.count({ where });
    const homeworksRaw = await Homework.findAll({
      where,
      order: [['assignDate', 'DESC']],
      offset: offset,
      limit: limit
    });
    
    // Fetch assignedBy users manually
    const userIds = [...new Set(homeworksRaw.map(h => h.assignedBy).filter(Boolean))];
    const users = await User.findAll({ where: { _id: { [Op.in]: userIds } }, attributes: ['_id', 'firstName', 'lastName'] });
    const userMap = {};
    users.forEach(u => {
      const userObj = u.toJSON();
      userObj.fullName = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim();
      userMap[userObj._id] = userObj;
    });
    
    const homeworks = homeworksRaw.map(hw => {
      const h = hw.toJSON();
      if (h.assignedBy && userMap[h.assignedBy]) {
        h.assignedBy = userMap[h.assignedBy];
      }
      return h;
    });

    ApiResponse.paginated(res, homeworks, page, limit, total);
  } catch (error) {
    next(error);
  }
};

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
