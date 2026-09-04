const StudentAttendance = require('../models/StudentAttendance');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const RolePermission = require('../models/RolePermission');
const ApiResponse = require('../utils/apiResponse');

// Helper: date string থেকে UTC start/end of day তৈরি করা
const getDayRange = (dateStr) => {
  const start = new Date(dateStr + 'T00:00:00.000Z');
  const end = new Date(dateStr + 'T23:59:59.999Z');
  return { start, end };
};

// @desc    ছাত্রদের উপস্থিতি রেকর্ড করা
// @route   POST /api/v1/attendance
exports.markAttendance = async (req, res, next) => {
  try {
    const { date, classLevel, section, students } = req.body;

    if (!date || !students || students.length === 0) {
      return ApiResponse.error(res, 'তারিখ এবং ছাত্র তালিকা প্রয়োজন', 400);
    }

    const targetDate = new Date(date + 'T00:00:00.000Z');

    const attendanceRecords = students.map((s) => ({
      institution: req.user.institution,
      student: s.studentId,
      classLevel: s.classLevel || classLevel,
      section: s.section || section || '',
      date: targetDate,
      status: s.status,
      remarks: s.remarks || '',
      markedBy: req.user._id,
    }));

    const bulkOps = attendanceRecords.map((record) => ({
      updateOne: {
        filter: { student: record.student, date: targetDate },
        update: { $set: record },
        upsert: true,
      },
    }));

    await StudentAttendance.bulkWrite(bulkOps);

    ApiResponse.success(res, { count: students.length }, 'উপস্থিতি সফলভাবে রেকর্ড করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    একটি নির্দিষ্ট দিনের ক্লাসের উপস্থিতি দেখা
// @route   GET /api/v1/attendance
exports.getAttendance = async (req, res, next) => {
  try {
    const { date, classLevel, section } = req.query;

    const filter = {
      institution: req.user.institution,
    };

    if (date) {
      const { start, end } = getDayRange(date);
      filter.date = { $gte: start, $lte: end };
    }

    if (classLevel) filter.classLevel = classLevel;
    if (section && section !== 'all') filter.section = section;
    if (req.query.sections) {
      const secIds = req.query.sections.split(',').filter(Boolean);
      if (secIds.length > 0 && !secIds.includes('all')) {
        filter.section = { $in: secIds };
      }
    }

    // --- Student/Guardian data scoping ---
    const userType = req.user.userType;
    
    if (userType === 'student' || userType === 'guardian') {
      let hasFullAccess = false;
      const rolePerm = await RolePermission.findOne({ where: { role: userType } });
      if (rolePerm && rolePerm.permissions && rolePerm.permissions.can_view_all_attendance) {
        hasFullAccess = true;
      }

      if (!hasFullAccess) {
        if (userType === 'student') {
          const student = await Student.findOne({ user: req.user._id });
          if (student) {
            filter.student = student._id;
          } else {
            return ApiResponse.success(res, { records: [] });
          }
        } else if (userType === 'guardian') {
          const guardian = await Guardian.findOne({ user: req.user._id });
          if (guardian && guardian.students && guardian.students.length > 0) {
            const linkedStudentIds = guardian.students.map(s => s.student);
            filter.student = { $in: linkedStudentIds };
          } else {
            return ApiResponse.success(res, { records: [] });
          }
        }
      }
    }

    if (req.query.history === 'true') {
      delete filter.date; // Remove date filter for history view
    }

    const recordsQuery = StudentAttendance.find(filter)
      .populate({
        path: 'student',
        select: 'studentId user',
        populate: { path: 'user', select: 'firstName lastName fullName' },
      })
      .populate('markedBy', 'firstName lastName fullName');

    if (req.query.history === 'true') {
      recordsQuery.sort({ date: -1 }).limit(100); // Last 100 records
    }

    const records = await recordsQuery.exec();

    ApiResponse.success(res, { records });
  } catch (error) {
    next(error);
  }
};
