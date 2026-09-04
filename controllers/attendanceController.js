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
    const { date, dates, classLevel, section, students } = req.body;

    // Support single date or multiple dates
    const dateList = Array.isArray(dates) && dates.length > 0 ? dates : (date ? [date] : []);

    if (dateList.length === 0 || !students || students.length === 0) {
      return ApiResponse.error(res, 'তারিখ এবং ছাত্র তালিকা প্রয়োজন', 400);
    }

    const bulkOps = [];
    let totalRecords = 0;

    dateList.forEach(dStr => {
      const targetDate = new Date(dStr + 'T00:00:00.000Z');
      students.forEach((s) => {
        // Allow per-date status override if passed as { [studentId]: { [date]: status } }
        const studentStatus = s.statuses ? (s.statuses[dStr] || 'present') : (s.status || 'present');
        const studentRemarks = s.remarksMap ? (s.remarksMap[dStr] || '') : (s.remarks || '');

        const record = {
          institution: req.user.institution,
          student: s.studentId,
          classLevel: s.classLevel || (classLevel !== 'all' ? classLevel : ''),
          section: s.section || (section !== 'all' ? section : '') || '',
          date: targetDate,
          status: studentStatus,
          remarks: studentRemarks,
          markedBy: req.user._id,
        };

        totalRecords++;
        bulkOps.push({
          updateOne: {
            filter: { student: record.student, date: targetDate },
            update: { $set: record },
            upsert: true,
          },
        });
      });
    });

    if (bulkOps.length > 0) {
      await StudentAttendance.bulkWrite(bulkOps);
    }

    ApiResponse.success(res, { count: totalRecords }, 'উপস্থিতি সফলভাবে রেকর্ড করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    একটি নির্দিষ্ট দিনের বা তারিখের ব্যাপ্তির ক্লাসের উপস্থিতি দেখা
// @route   GET /api/v1/attendance
exports.getAttendance = async (req, res, next) => {
  try {
    const { date, startDate, endDate, classLevel, section } = req.query;

    const filter = {
      institution: req.user.institution,
    };

    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      filter.date = { $gte: start, $lte: end };
    } else if (date) {
      const { start, end } = getDayRange(date);
      filter.date = { $gte: start, $lte: end };
    }

    if (classLevel && classLevel !== 'all') filter.classLevel = classLevel;
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
