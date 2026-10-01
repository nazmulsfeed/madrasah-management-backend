const { Op } = require('sequelize');
const StudentAttendance = require('../models/StudentAttendance');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const RolePermission = require('../models/RolePermission');
const ClassLevel = require('../models/ClassLevel');
const Section = require('../models/Section');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const TeacherAttendance = require('../models/TeacherAttendance');
const Institution = require('../models/Institution');
const StudentEnrollment = require('../models/StudentEnrollment');
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
    const { date, dates, classLevel, section, students, branch } = req.body;

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
          branch: s.branch || branch || '',
          date: targetDate,
          status: studentStatus,
          remarks: studentRemarks,
          markedBy: req.user._id,
        };

        const updateFilter = { student: record.student, date: targetDate };
        if (record.branch) {
          updateFilter.branch = record.branch;
        }

        totalRecords++;
        bulkOps.push({
          updateOne: {
            filter: updateFilter,
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
    const { date, startDate, endDate, classLevel, section, branch } = req.query;

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
    if (branch && branch !== 'all') filter.branch = branch;
    if (req.query.sections) {
      const secIds = req.query.sections.split(',').filter(Boolean);
      if (secIds.length > 0 && !secIds.includes('all')) {
        filter.section = { $in: secIds };
      }
    }

    // --- Student/Guardian data scoping & student filter ---
    const userType = req.user.userType;
    
    if (req.query.student) {
      if (userType === 'student') {
        const studentDoc = await Student.findOne({ user: req.user._id });
        if (studentDoc) {
          filter.student = studentDoc._id;
        } else {
          return ApiResponse.success(res, { records: [] });
        }
      } else if (userType === 'guardian') {
        const guardian = await Guardian.findOne({ user: req.user._id });
        const linkedStudentIds = (guardian && guardian.students && guardian.students.length > 0)
          ? guardian.students.map(s => s.student)
          : [];
        if (linkedStudentIds.includes(req.query.student)) {
          filter.student = req.query.student;
        } else {
          filter.student = { $in: linkedStudentIds };
        }
      } else {
        filter.student = req.query.student;
      }
    } else if (userType === 'student' || userType === 'guardian') {
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

    if (req.query.history === 'true' || req.query.student) {
      const limitCount = parseInt(req.query.limit, 10) || 100;
      recordsQuery.sort({ date: -1 }).limit(limitCount);
    }

    const records = await recordsQuery.exec();

    ApiResponse.success(res, { records });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ZKTeco & Virtual Android Simulator Engine
// ==========================================

const { sendTargetedPush } = require('../utils/pushHelper');

/**
 * স্টুডেন্টের উপস্থিতি পাঞ্চ প্রসেস করে এবং নির্দিষ্ট অভিভাবককে নোটিফিকেশন পাঠায়
 */
async function processAttendancePunch({ institutionId, deviceUserId, punchTime, source = 'device', forcePush = false }) {
  let punchDate;
  if (!punchTime) {
    punchDate = new Date();
  } else if (punchTime instanceof Date) {
    punchDate = punchTime;
  } else if (typeof punchTime === 'string') {
    // যদি "YYYY-MM-DD HH:mm:ss" ফরম্যাটে থাকে যাতে টাইমজোন ছাড়া লোকাল টাইম বোঝায়
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(punchTime) && !punchTime.includes('Z') && !/[+-]\d{2}/.test(punchTime)) {
      punchDate = new Date(punchTime.replace(' ', 'T') + '+06:00');
    } else {
      punchDate = new Date(punchTime);
    }
  } else {
    punchDate = new Date(punchTime);
  }

  // বাংলাদেশের ক্যালেন্ডার তারিখ (YYYY-MM-DD)
  const dateStr = punchDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const targetDate = new Date(dateStr + 'T00:00:00.000Z');

  // সময় ফরম্যাট (১২ ঘন্টা ফরম্যাট, যেমন: 08:30 AM — নিশ্চিত বাংলাদেশ সময়)
  const timeString = punchDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  });

  const { Op } = require('sequelize');

  // Debug: validate and log punch details
  if (isNaN(punchDate.getTime())) {
    console.error('[Punch] INVALID punchDate for input: ' + JSON.stringify(punchTime));
    return { success: false, message: 'Invalid punchTime could not parse date' };
  }
  console.log('[Punch] Source=' + source + ' | ID=' + deviceUserId + ' | BD_Date=' + dateStr + ' | BD_Time=' + timeString + ' | UTC=' + targetDate.toISOString());

  // ১. ডিভাইস আইডি বা স্টুডেন্ট আইডি দিয়ে ছাত্র খুঁজে বের করা
  const cleanId = String(deviceUserId || '').trim();
  if (!cleanId) {
    return { success: false, message: 'Invalid deviceUserId' };
  }

  // প্রথমে প্রদত্ত প্রতিষ্ঠানে খুঁজবে, না পেলে যেকোনো প্রতিষ্ঠানে খুঁজবে
  let student = await Student.findOne({
    where: {
      institution: institutionId,
      [Op.or]: [
        { deviceUserId: cleanId },
        { studentId: cleanId },
        { admissionNumber: cleanId },
      ],
    },
  });

  if (!student) {
    student = await Student.findOne({
      where: {
        [Op.or]: [
          { deviceUserId: cleanId },
          { studentId: cleanId },
          { admissionNumber: cleanId },
        ],
      },
    });
  }

  if (!student) {
    // যদি ছাত্র না পাওয়া যায়, তবে শিক্ষকের আইডি বা ডিভাইস আইডি দিয়ে খোঁজা
    const Teacher = require('../models/Teacher');
    const TeacherAttendance = require('../models/TeacherAttendance');

    let teacher = await Teacher.findOne({
      where: {
        institution: institutionId,
        [Op.or]: [
          { deviceUserId: cleanId },
          { employeeId: cleanId },
          { _id: cleanId },
        ],
      },
    });

    if (!teacher) {
      teacher = await Teacher.findOne({
        where: {
          [Op.or]: [
            { deviceUserId: cleanId },
            { employeeId: cleanId },
            { _id: cleanId },
          ],
        },
      });
    }

    if (!teacher) {
      const userMatch = await User.findOne({
        where: {
          [Op.or]: [{ phone: cleanId }, { _id: cleanId }, { username: cleanId }],
          userType: { [Op.in]: ['teacher', 'hifz_teacher', 'principal', 'vice_principal'] },
        },
      });
      if (userMatch) {
        teacher = await Teacher.findOne({ where: { user: userMatch._id } });
      }
    }

    if (teacher) {
      console.log(`[Punch] 👨‍🏫 Teacher FOUND with ID: "${cleanId}" (_id: ${teacher._id})`);
      const teacherUser = await User.findOne({ where: { _id: teacher.user } });
      const teacherName = teacherUser
        ? `${teacherUser.firstName || ''} ${teacherUser.lastName || ''}`.trim() || teacherUser.username
        : (teacher.employeeId || 'শিক্ষক');

      await TeacherAttendance.sync({ alter: true }).catch(() => {});

      let tAttendance = await TeacherAttendance.findOne({
        where: {
          teacher: teacher._id,
          date: targetDate,
        },
      });

      let isFirst = false;
      if (!tAttendance) {
        isFirst = true;
        tAttendance = await TeacherAttendance.create({
          institution: teacher.institution || institutionId,
          teacher: teacher._id,
          date: targetDate,
          status: 'present',
          inTime: timeString,
          outTime: '',
          punchCount: 1,
          punchTimes: JSON.stringify([timeString]),
          punchTime: punchDate,
          source,
          remarks: `বায়োমেট্রিক পাঞ্চ (${source})`,
        });
      } else {
        tAttendance.status = 'present';
        let timesList = [];
        try {
          timesList = tAttendance.punchTimes ? JSON.parse(tAttendance.punchTimes) : [];
        } catch (_) { timesList = []; }
        timesList.push(timeString);
        tAttendance.punchTimes = JSON.stringify(timesList);
        tAttendance.punchCount = (tAttendance.punchCount || 1) + 1;
        tAttendance.outTime = timeString;
        tAttendance.punchTime = punchDate;
        await tAttendance.save();
      }

      return {
        success: true,
        isTeacher: true,
        teacherName,
        teacherId: teacher._id,
        punchTime: timeString,
        isFirstPunch: isFirst,
        message: `শিক্ষক ${teacherName}-এর পাঞ্চ সফল হয়েছে (${timeString})`,
      };
    }

    console.warn(`[Punch] ❌ Neither Student nor Teacher FOUND with ID: "${cleanId}" (institutionId: ${institutionId})`);
    return { success: false, message: `Student or Teacher not found with ID: ${cleanId}` };
  }
  console.log(`[Punch] ✅ Student found: ${student.studentId} (_id: ${student._id}, institution: ${student.institution})`);

  // ছাত্র যে প্রতিষ্ঠানের অন্তর্ভুক্ত, উপস্থিতি সেই প্রতিষ্ঠানের অধীনেই রেকর্ড হবে
  const targetInstitutionId = student.institution || institutionId;

  // ছাত্রের ইউজার ডাটা (নাম পাওয়ার জন্য)
  const studentUser = await User.findOne({ where: { _id: student.user } });
  const studentName = studentUser ? (studentUser.fullName || `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim() || student.studentId) : student.studentId;

  // ছাত্রের এনরোলমেন্ট ডাটা
  const enrollment = await StudentEnrollment.findOne({
    where: { student: student._id, enrollmentStatus: 'active' },
  });

  // আজকের উপস্থিতি চেক করা
  let attendance = await StudentAttendance.findOne({
    where: {
      student: student._id,
      date: targetDate,
    },
  });

  let isFirstPunch = false;
  let isOutPunch = false;

  if (!attendance) {
    isFirstPunch = true;
    console.log(`[Punch] 🆕 No existing record → Creating new attendance for student ${student._id} on ${dateStr}`);
    attendance = await StudentAttendance.create({
      institution: targetInstitutionId,
      student: student._id,
      classLevel: enrollment ? enrollment.classLevel : '',
      section: enrollment ? enrollment.section : '',
      branch: student.branch || '',
      date: targetDate,
      status: 'present',
      inTime: timeString,
      outTime: '',
      punchCount: 1,
      punchTimes: JSON.stringify([timeString]),
      punchTime: punchDate,
      source,
      remarks: `বায়োমেট্রিক পাঞ্চ (${source})`,
    });
    console.log(`[Punch] ✅ Attendance record created with _id: ${attendance._id}`);
  } else {
    // ইতোমধ্যে যে স্ট্যাটাসই থাকুক না কেন, পাঞ্চ করলেই নিশ্চিতভাবে "উপস্থিত" হবে
    const wasNotPresent = attendance.status !== 'present';
    attendance.status = 'present';
    
    // পাঞ্চ সংখ্যা ও পাঞ্চ লগ আপডেট করা
    let timesList = [];
    try {
      timesList = attendance.punchTimes ? JSON.parse(attendance.punchTimes) : [];
      if (!Array.isArray(timesList)) timesList = [];
    } catch {
      timesList = [];
    }

    if (!attendance.inTime) {
      attendance.inTime = timeString;
      isFirstPunch = true;
    } else {
      // এটি দ্বিতীয় বা পরবর্তী পাঞ্চ (আউট-টাইম)
      attendance.outTime = timeString;
      isOutPunch = true;
    }

    timesList.push(timeString);
    attendance.punchTimes = JSON.stringify(timesList);
    attendance.punchCount = (attendance.punchCount || 0) + 1;
    attendance.punchTime = punchDate;
    attendance.source = source;
    attendance.remarks = wasNotPresent ? `দেরিতে পাঞ্চ (${source})` : attendance.remarks || `বায়োমেট্রিক পাঞ্চ (${source})`;
    await attendance.save();

    if (wasNotPresent) {
      isFirstPunch = true;
    }
  }

  // ২. শুধুমাত্র সংশ্লিষ্ট স্টুডেন্ট/অভিভাবকের ফোনে টার্গেটেড পুশ নোটিফিকেশন পাঠানো
  const isSimulator = source === 'mobile_simulator';

  let pushResultInfo = { attempted: false, sentCount: 0, subscribersFound: 0, reason: '' };

  try {
    const inst = await Institution.findOne({ where: { _id: targetInstitutionId } });
    const pushEnabled = inst ? Boolean(inst.attendancePushNotifEnabled) : false;
    const outTimePushEnabled = inst ? Boolean(inst.outTimePushEnabled) : false;
    const testUserIdFilter = inst?.testDeviceUserId ? String(inst.testDeviceUserId).trim() : '';

    const isTestMatch = testUserIdFilter !== '' && (
      testUserIdFilter === String(student.studentId) || 
      testUserIdFilter === String(cleanId) || 
      testUserIdFilter === String(student.admissionNumber) || 
      testUserIdFilter === String(student.deviceUserId)
    );

    const isAllowedForPush = pushEnabled || isTestMatch;

    // কোন ধরনের নোটিফিকেশন পাঠানো হবে:
    // ক) প্রথম পাঞ্চে: উপস্থিতি নোটিফিকেশন
    // খ) পরবর্তী পাঞ্চে (যদি outTimePushEnabled অন থাকে): প্রস্থান/ছুটি নোটিফিকেশন
    let shouldSendPush = false;
    let pushTitle = '✅ উপস্থিতি নিশ্চিতকরণ';
    let pushBody = `আসসালামু আলাইকুম, (${studentName}) আজ ${timeString}-এ মাদরাসায় উপস্থিত হয়েছে।`;

    if (isFirstPunch || isSimulator || forcePush) {
      shouldSendPush = true;
    } else if (isOutPunch && outTimePushEnabled) {
      shouldSendPush = true;
      pushTitle = '🔔 মাদরাসা ছুটির নোটিশ';
      pushBody = `আসসালামু আলাইকুম, (${studentName}) আজ ${timeString}-এ মাদরাসা থেকে প্রস্থান/ছুটি নিয়েছে।`;
    }

    if (isAllowedForPush && shouldSendPush) {
      const targetUserIds = [];
      if (student.user) targetUserIds.push(String(student.user));
      if (studentUser && studentUser._id) targetUserIds.push(String(studentUser._id));
      if (studentUser && studentUser.username) targetUserIds.push(String(studentUser.username));

      // অভিভাবক খুঁজে বের করা
      const allGuardians = await Guardian.findAll({ where: { institution: targetInstitutionId } });
      allGuardians.forEach((g) => {
        if (g.students && Array.isArray(g.students)) {
          const isLinked = g.students.some((s) => String(s.student) === String(student._id));
          if (isLinked && g.user) {
            targetUserIds.push(String(g.user));
          }
        }
      });

      const targetStudentIdentifiers = [
        String(student.studentId),
        String(student._id),
        String(cleanId),
        student.admissionNumber ? String(student.admissionNumber) : null,
        student.deviceUserId ? String(student.deviceUserId) : null,
      ].filter(Boolean);

      const pushRes = await sendTargetedPush({
        userIds: Array.from(new Set(targetUserIds)),
        studentIds: Array.from(new Set(targetStudentIdentifiers)),
        payload: {
          title: pushTitle,
          body: pushBody,
          url: '/attendance',
        },
      });

      const successCount = (pushRes || []).filter(r => r.status === 'success').length;
      pushResultInfo = {
        attempted: true,
        sentCount: successCount,
        subscribersFound: pushRes ? pushRes.length : 0,
        reason: successCount > 0 
          ? `✅ ${successCount} টি ডিভাইসে পুশ নোটিফিকেশন সফলভাবে পৌঁছেছে (${pushTitle})` 
          : (pushRes && pushRes.length > 0 
              ? '⚠️ পুশ ডেলিভারি ত্রুটি (ডিভাইসে পৌঁছায়নি)' 
              : '⚠️ এই ছাত্র বা অভিভাবকের অ্যাকাউন্টে কোনো ব্রাউজার/ফোনে পুশ নোটিফিকেশন সক্রিয় করা নেই। ফোনে লগইন করে "নোটিফিকেশন চালু করুন" বাটনে ক্লিক করুন।')
      };
    } else {
      pushResultInfo = {
        attempted: false,
        sentCount: 0,
        subscribersFound: 0,
        reason: 'অভিভাবক পুশ নোটিফিকেশন বন্ধ রাখা আছে এবং টেস্ট আইডি ফিল্টারের সাথে মিলেনি'
      };
      console.log(`[Attendance Push] Skipped: push notifications to guardians are OFF in settings.`);
    }
  } catch (notifErr) {
    console.error('[Punch Notif Error]:', notifErr.message);
    pushResultInfo = {
      attempted: true,
      sentCount: 0,
      subscribersFound: 0,
      reason: 'Error: ' + notifErr.message
    };
  }

  let parsedTimes = [];
  try {
    parsedTimes = attendance.punchTimes ? JSON.parse(attendance.punchTimes) : [];
  } catch {
    parsedTimes = [];
  }

  return {
    success: true,
    studentName,
    studentId: student.studentId,
    inTime: attendance.inTime || timeString,
    outTime: attendance.outTime || '',
    punchCount: attendance.punchCount || 1,
    punchTimes: parsedTimes,
    status: attendance.status,
    isFirstPunch,
    isOutPunch,
    pushResultInfo,
  };
}

// @desc    অ্যান্ড্রয়েড ফোন সিমুলেটর দিয়ে উপস্থিতি টেস্ট (শুধুমাত্র সুপার অ্যাডমিন)
// @route   POST /api/v1/attendance/device-push-test
exports.simulateDevicePush = async (req, res, next) => {
  try {
    const { deviceUserId, punchTime } = req.body;
    if (!deviceUserId) {
      return ApiResponse.error(res, 'ছাত্র আইডি বা বায়োমেট্রিক আইডি দিন', 400);
    }

    const institutionId = req.user.institution;
    const result = await processAttendancePunch({
      institutionId,
      deviceUserId,
      punchTime: punchTime || new Date(),
      source: 'mobile_simulator',
      forcePush: true,
    });

    if (!result.success) {
      return ApiResponse.error(res, result.message, 404);
    }

    ApiResponse.success(res, result, `পাঞ্চ সফল! (${result.studentName}) — ${result.pushResultInfo?.reason || ''}`);
  } catch (error) {
    next(error);
  }
};

// @desc    পুশ নোটিফিকেশন ডায়াগনস্টিক ও সরাসরি টেস্ট পাঠানো (শুধুমাত্র সুপার অ্যাডমিন)
// @route   POST /api/v1/attendance/test-push-diagnostics
exports.testPushDiagnostics = async (req, res, next) => {
  try {
    const { deviceUserId } = req.body;
    const cleanId = String(deviceUserId || '').trim();
    if (!cleanId) {
      return ApiResponse.error(res, 'ছাত্র আইডি দিন', 400);
    }

    const institutionId = req.user.institution;
    const { Op } = require('sequelize');
    const PushSubscription = require('../models/PushSubscription');

    const student = await Student.findOne({
      where: {
        institution: institutionId,
        [Op.or]: [
          { deviceUserId: cleanId },
          { studentId: cleanId },
          { admissionNumber: cleanId },
        ],
      },
    });

    if (!student) {
      return ApiResponse.error(res, `আইডি ${cleanId} দিয়ে কোনো ছাত্র খুঁজে পাওয়া যায়নি।`, 404);
    }

    const studentUser = await User.findOne({ where: { _id: student.user } });
    const studentName = studentUser ? (studentUser.fullName || `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim() || student.studentId) : student.studentId;

    const targetUserIds = [];
    if (student.user) targetUserIds.push(String(student.user));
    if (studentUser && studentUser._id) targetUserIds.push(String(studentUser._id));
    if (studentUser && studentUser.username) targetUserIds.push(String(studentUser.username));

    // অভিভাবক
    const allGuardians = await Guardian.findAll({ where: { institution: institutionId } });
    allGuardians.forEach((g) => {
      if (g.students && Array.isArray(g.students)) {
        const isLinked = g.students.some((s) => String(s.student) === String(student._id));
        if (isLinked && g.user) {
          targetUserIds.push(String(g.user));
        }
      }
    });

    const targetStudentIdentifiers = [
      String(student.studentId),
      String(student._id),
      String(cleanId),
      student.admissionNumber ? String(student.admissionNumber) : null,
      student.deviceUserId ? String(student.deviceUserId) : null,
    ].filter(Boolean);

    const cleanUserIds = Array.from(new Set(targetUserIds));
    const cleanStudentIds = Array.from(new Set(targetStudentIdentifiers));

    const whereConditions = [];
    if (cleanUserIds.length > 0) {
      whereConditions.push({ userId: { [Op.in]: cleanUserIds } });
    }
    if (cleanStudentIds.length > 0) {
      whereConditions.push({ studentId: { [Op.in]: cleanStudentIds } });
    }

    const matchedSubs = await PushSubscription.findAll({
      where: { [Op.or]: whereConditions },
    });

    const totalSystemSubs = await PushSubscription.count();

    let pushResults = [];
    if (matchedSubs.length > 0) {
      pushResults = await sendTargetedPush({
        userIds: cleanUserIds,
        studentIds: cleanStudentIds,
        payload: {
          title: '🔔 টেস্ট পুশ সফল!',
          body: `আসসালামু আলাইকুম! আইডি (${student.studentId}) এর জন্য টেস্ট পুশ নোটিফিকেশন সফলভাবে গৃহীত হয়েছে।`,
          url: '/attendance',
        },
      });
    }

    const deliveredCount = (pushResults || []).filter(r => r.status === 'success').length;

    ApiResponse.success(res, {
      student: {
        id: student._id,
        studentId: student.studentId,
        admissionNumber: student.admissionNumber,
        deviceUserId: student.deviceUserId,
        name: studentName,
        userLinked: Boolean(student.user),
        username: studentUser?.username || null,
      },
      diagnostic: {
        matchedSubscriptionsCount: matchedSubs.length,
        totalSystemSubscriptions: totalSystemSubs,
        searchedUserIds: cleanUserIds,
        searchedStudentIds: cleanStudentIds,
        pushResults,
        pushDelivered: deliveredCount,
      }
    }, matchedSubs.length > 0 ? `ডায়াগনস্টিক সম্পন্ন: ${matchedSubs.length} টি সাবস্ক্রিপশন পাওয়া গেছে এবং টেস্ট পুশ পাঠানো হয়েছে!` : 'ডায়াগনস্টিক সম্পন্ন: এই আইডির কোনো ফোনে নোটিফিকেশন চালু করা নেই।');
  } catch (error) {
    next(error);
  }
};

// @desc    ZKTeco MB560-VL আসল ডিভাইসের ADMS লিসেনার রুট
// @route   ALL /api/v1/attendance/iclock/cdata এবং /iclock/cdata
exports.zktecoADMSListener = async (req, res) => {
  try {
    const query = req.query || {};
    const method = req.method;

    console.log(`[ZKTeco ADMS] ${method} Received. Query:`, query);

    // হ্যান্ডশেক অথবা পিং রিকোয়েস্ট (ডিভাইস চালু হলে বা কনফিগারেশন চেক করলে)
    if (method === 'GET') {
      res.set('Content-Type', 'text/plain');
      return res.status(200).send('OK');
    }

    // পাঞ্চ লগ পুশ (ডিভাইস থেকে POST রিকোয়েস্টে লগ আসে)
    let rawData = '';
    if (typeof req.body === 'string' && req.body.trim()) {
      rawData = req.body.trim();
    } else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      if (req.body.data) rawData = String(req.body.data);
      else rawData = Object.keys(req.body)[0] || JSON.stringify(req.body);
    }
    if (req.rawBody) rawData = req.rawBody;

    // Fallback: যদি কোনো কারণে মিডলওয়্যার বডি না ধরে, সরাসরি রিকোয়েস্ট স্ট্রিম রিড করা
    if (!rawData) {
      rawData = await new Promise((resolve) => {
        let buffer = '';
        req.on('data', (chunk) => { buffer += chunk.toString(); });
        req.on('end', () => resolve(buffer.trim()));
        req.on('error', () => resolve(''));
        if (req.readableEnded) resolve(buffer.trim());
      });
    }

    console.log('[ZKTeco ADMS POST Raw Data]:', rawData);

    // সক্রিয় প্রতিষ্ঠান খুঁজে বের করা (বা যেকোনো প্রথম প্রতিষ্ঠান)
    let defaultInst = await Institution.findOne({ where: { status: 'active' } });
    if (!defaultInst) {
      defaultInst = await Institution.findOne();
    }

    if (defaultInst && rawData) {
      const lines = rawData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      console.log(`[ZKTeco ADMS] Found ${lines.length} punch line(s). Processing...`);

      for (const line of lines) {
        // ZKTeco স্ট্যান্ডার্ড ট্যাব (\t), কমা (,), বা স্পেস ফরম্যাট
        let parts = line.split('\t');
        if (parts.length < 2) parts = line.split(',');
        if (parts.length < 2) parts = line.split(/\s{2,}/);

        let deviceUserId = parts[0]?.trim();
        let punchTimeStr = parts[1]?.trim();

        // যদি স্পেস দিয়ে আলাদা থাকে (যেমন: "999 2026-09-27 08:30:00 0 1")
        if (!punchTimeStr && deviceUserId.includes(' ')) {
          const spaceParts = deviceUserId.split(' ');
          deviceUserId = spaceParts[0];
          punchTimeStr = spaceParts.slice(1, 3).join(' ');
        }

        if (deviceUserId) {
          console.log(`[ZKTeco ADMS] Saving Punch -> User: ${deviceUserId}, TimeStr: ${punchTimeStr || 'LIVE'}`);

          const punchResult = await processAttendancePunch({
            institutionId: defaultInst._id,
            deviceUserId,
            punchTime: punchTimeStr || new Date(),
            source: 'zkteco_device',
            forcePush: true,
          });

          console.log(`[ZKTeco ADMS] Punch processed result:`, punchResult?.success, punchResult?.studentName);
        }
      }
    } else {
      console.warn('[ZKTeco ADMS] No raw data or institution found! RawData was empty.');
    }

    // ZKTeco পুশ প্রোটোকল অবশ্যই 'OK' টেক্সট রেসপন্স আশা করে
    res.set('Content-Type', 'text/plain');
    res.status(200).send('OK');
  } catch (error) {
    console.error('[ZKTeco ADMS Error]:', error.message);
    res.set('Content-Type', 'text/plain');
    res.status(200).send('OK');
  }
};

// @desc    কাট-অফ টাইম অনুযায়ী অনুপস্থিত স্টুডেন্টদের মার্ক করা ও অভিভাবককে নোটিফিকেশন পাঠানো
// @route   POST /api/v1/attendance/auto-absent-check
exports.runAutoAbsentCheck = async (req, res, next) => {
  try {
    const institutionId = req.user.institution;
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const targetDate = new Date(dateStr + 'T00:00:00.000Z');

    // প্রতিষ্ঠানের সকল সক্রিয় ছাত্র বের করা
    const allStudents = await Student.findAll({
      where: { institution: institutionId, isDeleted: false, status: 'active' },
    });

    if (allStudents.length === 0) {
      return ApiResponse.success(res, { absentCount: 0 }, 'কোন সক্রিয় ছাত্র পাওয়া যায়নি।');
    }

    // আজকের উপস্থিতি রেকর্ডগুলো আনা
    const todayAttendances = await StudentAttendance.findAll({
      where: {
        institution: institutionId,
        date: targetDate,
      },
    });

    const presentStudentIds = new Set(
      todayAttendances
        .filter((a) => a.status === 'present')
        .map((a) => String(a.student))
    );

    // যারা প্রেজেন্ট নেই তাদের তালিকা
    const absentStudents = allStudents.filter((s) => !presentStudentIds.has(String(s._id)));
    const allGuardians = await Guardian.findAll({ where: { institution: institutionId } });

    let count = 0;
    for (const student of absentStudents) {
      // যদি আগে থেকে রেকর্ড না থাকে তবে অনুপস্থিত রেকর্ড তৈরি করা
      const existingRecord = todayAttendances.find((a) => String(a.student) === String(student._id));
      if (!existingRecord) {
        await StudentAttendance.create({
          institution: institutionId,
          student: student._id,
          classLevel: '',
          section: '',
          branch: student.branch || '',
          date: targetDate,
          status: 'absent',
          source: 'auto_cron',
          remarks: 'নির্ধারিত সময় পার হওয়ায় অনুপস্থিত গণ্য',
        });
      }

      // স্টুডেন্টের নাম আনা
      const studentUser = await User.findOne({ where: { _id: student.user } });
      const studentName = studentUser ? (studentUser.fullName || studentUser.firstName || student.studentId) : student.studentId;

      // অভিভাবকের ইউজার আইডি খুঁজে বের করা
      const targetUserIds = [];
      if (student.user) targetUserIds.push(String(student.user));

      allGuardians.forEach((g) => {
        if (g.students && Array.isArray(g.students)) {
          const isLinked = g.students.some((s) => String(s.student) === String(student._id));
          if (isLinked && g.user) {
            targetUserIds.push(String(g.user));
          }
        }
      });

      // অনুপস্থিতির নোটিফিকেশন পাঠানো (যদি পুশ সেটিংস অন থাকে)
      try {
        const inst = await Institution.findOne({ where: { _id: institutionId } });
        const pushEnabled = inst ? Boolean(inst.attendancePushNotifEnabled) : false;
        const testUserIdFilter = inst?.testDeviceUserId ? String(inst.testDeviceUserId).trim() : '';

        const isAllowedForPush = pushEnabled || (testUserIdFilter !== '' && (testUserIdFilter === String(student.studentId) || testUserIdFilter === String(student._id)));

        if (isAllowedForPush) {
          await sendTargetedPush({
            userIds: targetUserIds,
            studentIds: [String(student.studentId), String(student._id)],
            payload: {
              title: '⚠️ অনুপস্থিতির নোটিশ (পরীক্ষামূলক)',
              body: `আসসালামু আলাইকুম, আপনার সন্তান (${studentName}) আজ মাদরাসায় অনুপস্থিত রয়েছে।`,
              url: '/attendance',
            },
          });
        }
      } catch (e) {
        console.error('Absent push error:', e.message);
      }
      count++;
    }

    ApiResponse.success(
      res,
      { totalStudents: allStudents.length, absentCount: count },
      `${count} জন ছাত্রকে অনুপস্থিত হিসেবে চিহ্নিত করা হয়েছে এবং অভিভাবকদের নোটিফিকেশন পাঠানো হয়েছে।`
    );
  } catch (error) {
    next(error);
  }
};

// @desc    বায়োমেট্রিক ও কাট-অফ টাইম কনফিগারেশন আনা (শুধুমাত্র সুপার অ্যাডমিন)
// @route   GET /api/v1/attendance/biometric-settings
exports.getBiometricSettings = async (req, res, next) => {
  try {
    const institution = await Institution.findOne({ where: { _id: req.user.institution } });
    if (!institution) {
      return ApiResponse.notFound(res, 'প্রতিষ্ঠান পাওয়া যায়নি');
    }

    ApiResponse.success(res, {
      attendanceCutoffTime: institution.attendanceCutoffTime || '09:30',
      autoAbsentEnabled: Boolean(institution.autoAbsentEnabled),
      biometricAttendanceEnabled: Boolean(institution.biometricAttendanceEnabled),
      attendancePushNotifEnabled: Boolean(institution.attendancePushNotifEnabled),
      outTimePushEnabled: Boolean(institution.outTimePushEnabled),
      testDeviceUserId: institution.testDeviceUserId || '',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    বায়োমেট্রিক ও কাট-অফ টাইম কনফিগারেশন সংরক্ষণ (শুধুমাত্র সুপার অ্যাডমিন)
// @route   PATCH /api/v1/attendance/biometric-settings
exports.updateBiometricSettings = async (req, res, next) => {
  try {
    const { 
      attendanceCutoffTime, 
      autoAbsentEnabled, 
      biometricAttendanceEnabled, 
      attendancePushNotifEnabled, 
      outTimePushEnabled,
      testDeviceUserId 
    } = req.body;

    const institution = await Institution.findOne({ where: { _id: req.user.institution } });
    if (!institution) {
      return ApiResponse.notFound(res, 'প্রতিষ্ঠান পাওয়া যায়নি');
    }

    if (attendanceCutoffTime !== undefined) institution.attendanceCutoffTime = attendanceCutoffTime;
    if (autoAbsentEnabled !== undefined) institution.autoAbsentEnabled = Boolean(autoAbsentEnabled);
    if (biometricAttendanceEnabled !== undefined) institution.biometricAttendanceEnabled = Boolean(biometricAttendanceEnabled);
    if (attendancePushNotifEnabled !== undefined) institution.attendancePushNotifEnabled = Boolean(attendancePushNotifEnabled);
    if (outTimePushEnabled !== undefined) institution.outTimePushEnabled = Boolean(outTimePushEnabled);
    if (testDeviceUserId !== undefined) institution.testDeviceUserId = String(testDeviceUserId).trim();

    await institution.save();

    ApiResponse.success(res, {
      attendanceCutoffTime: institution.attendanceCutoffTime,
      autoAbsentEnabled: institution.autoAbsentEnabled,
      biometricAttendanceEnabled: institution.biometricAttendanceEnabled,
      attendancePushNotifEnabled: institution.attendancePushNotifEnabled,
      outTimePushEnabled: institution.outTimePushEnabled,
      testDeviceUserId: institution.testDeviceUserId,
    }, 'বায়োমেট্রিক ও উপস্থিতি কন্ট্রোল প্যানেল সেটিংস সফলভাবে আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};

// ==========================================
// Punch / Fingerprint Report API
// ==========================================

/**
 * @route   GET /api/v1/attendance/punch-report
 * @desc    Individual punch log — who punched, when, how many times
 */
exports.getPunchReport = async (req, res, next) => {
  try {
    const { startDate, endDate, date, classLevel, section, branch, studentId } = req.query;
    const filter = { institution: req.user.institution };

    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate + 'T00:00:00.000Z'), $lte: new Date(endDate + 'T23:59:59.999Z') };
    } else if (date) {
      filter.date = { $gte: new Date(date + 'T00:00:00.000Z'), $lte: new Date(date + 'T23:59:59.999Z') };
    } else {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      filter.date = { $gte: new Date(todayStr + 'T00:00:00.000Z'), $lte: new Date(todayStr + 'T23:59:59.999Z') };
    }

    if (classLevel && classLevel !== 'all') filter.classLevel = classLevel;
    if (section && section !== 'all') filter.section = section;
    if (branch && branch !== 'all') filter.branch = branch;
    if (studentId) filter.student = studentId;

    const rawRecords = await StudentAttendance.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const records = rawRecords.map(r => (typeof r.toJSON === 'function' ? r.toJSON() : { ...r }));

    // Gather distinct IDs to batch load associated models
    const studentIds = [...new Set(records.map(r => r.student).filter(Boolean))];
    const directClassIds = records.map(r => r.classLevel).filter(Boolean);
    const directSectionIds = records.map(r => r.section).filter(Boolean);
    const directBranchIds = records.map(r => r.branch).filter(Boolean);

    // Fetch Students
    const studentDocs = studentIds.length > 0
      ? await Student.findAll({ where: { _id: studentIds } })
      : [];
    const studentMap = new Map();
    const userIds = [];
    const enrollmentIds = [];
    const studentBranchIds = [];

    studentDocs.forEach(s => {
      const data = typeof s.toJSON === 'function' ? s.toJSON() : s;
      studentMap.set(String(data._id), data);
      if (data.user) userIds.push(data.user);
      if (data.currentEnrollment) enrollmentIds.push(data.currentEnrollment);
      if (data.branch) studentBranchIds.push(data.branch);
    });

    // Check if any student lacks currentEnrollment and lookup active enrollments
    const studentsWithoutEnrollment = studentDocs
      .map(s => (typeof s.toJSON === 'function' ? s.toJSON() : s))
      .filter(s => !s.currentEnrollment)
      .map(s => s._id);

    let activeEnrollmentsByStudent = [];
    if (studentsWithoutEnrollment.length > 0) {
      activeEnrollmentsByStudent = await StudentEnrollment.findAll({
        where: { student: studentsWithoutEnrollment, enrollmentStatus: 'active' },
        order: [['createdAt', 'DESC']]
      });
    }

    // Fetch Users & Enrollments
    const allEnrollmentIds = [...new Set(enrollmentIds)];
    const [userDocs, enrollmentDocs] = await Promise.all([
      userIds.length > 0 ? User.findAll({ where: { _id: [...new Set(userIds)] } }) : [],
      allEnrollmentIds.length > 0 ? StudentEnrollment.findAll({ where: { _id: allEnrollmentIds } }) : []
    ]);

    const userMap = new Map();
    userDocs.forEach(u => {
      const d = typeof u.toJSON === 'function' ? u.toJSON() : u;
      userMap.set(String(d._id), d);
    });

    const enrollmentMap = new Map();
    enrollmentDocs.forEach(e => {
      const d = typeof e.toJSON === 'function' ? e.toJSON() : e;
      enrollmentMap.set(String(d._id), d);
    });
    activeEnrollmentsByStudent.forEach(e => {
      const d = typeof e.toJSON === 'function' ? e.toJSON() : e;
      if (!enrollmentMap.has('student_' + d.student)) {
        enrollmentMap.set('student_' + d.student, d);
      }
    });

    // Gather all class, section, branch IDs
    const allEnrollmentsList = [...enrollmentDocs, ...activeEnrollmentsByStudent].map(e => (typeof e.toJSON === 'function' ? e.toJSON() : e));
    const allClassIds = [...new Set([...directClassIds, ...allEnrollmentsList.map(e => e.classLevel).filter(Boolean)])];
    const allSectionIds = [...new Set([...directSectionIds, ...allEnrollmentsList.map(e => e.section).filter(Boolean)])];
    const allBranchIds = [...new Set([...directBranchIds, ...studentBranchIds])];

    const [classDocs, sectionDocs, branchDocs] = await Promise.all([
      allClassIds.length > 0 ? ClassLevel.findAll({ where: { _id: allClassIds } }) : [],
      allSectionIds.length > 0 ? Section.findAll({ where: { _id: allSectionIds } }) : [],
      allBranchIds.length > 0 ? Branch.findAll({ where: { _id: allBranchIds } }) : []
    ]);

    const classMap = new Map();
    classDocs.forEach(c => {
      const d = typeof c.toJSON === 'function' ? c.toJSON() : c;
      classMap.set(String(d._id), d.name);
    });

    const sectionMap = new Map();
    sectionDocs.forEach(s => {
      const d = typeof s.toJSON === 'function' ? s.toJSON() : s;
      sectionMap.set(String(d._id), d.name);
    });

    const branchMap = new Map();
    branchDocs.forEach(b => {
      const d = typeof b.toJSON === 'function' ? b.toJSON() : b;
      branchMap.set(String(d._id), d.name);
    });

    const enriched = records.map(rec => {
      let punchTimes = [];
      try {
        punchTimes = typeof rec.punchTimes === 'string' ? JSON.parse(rec.punchTimes) : (Array.isArray(rec.punchTimes) ? rec.punchTimes : []);
      } catch { punchTimes = []; }
      const dateStr = rec.date ? new Date(rec.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) : '';

      const student = studentMap.get(String(rec.student));
      const user = student?.user ? userMap.get(String(student.user)) : null;
      const enrollment = student?.currentEnrollment
        ? enrollmentMap.get(String(student.currentEnrollment))
        : (student ? enrollmentMap.get('student_' + student._id) : null);

      const classLevelId = rec.classLevel || enrollment?.classLevel;
      const className = classLevelId ? (classMap.get(String(classLevelId)) || '') : '';

      const sectionId = rec.section || enrollment?.section;
      const sectionName = sectionId ? (sectionMap.get(String(sectionId)) || (typeof sectionId === 'string' && sectionId.length < 20 ? sectionId : '')) : '';

      const studentName = user
        ? (user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || student?.studentId || '—')
        : (student?.studentId || '—');

      const studentDisplayId = student?.studentId || student?.admissionNumber || student?.deviceUserId || '—';
      const branchName = branchMap.get(String(student?.branch || rec.branch)) || '';

      return {
        _id: rec._id,
        date: dateStr,
        status: rec.status,
        inTime: rec.inTime || '',
        outTime: rec.outTime || '',
        punchCount: rec.punchCount || punchTimes.length || (rec.inTime ? 1 : 0),
        punchTimes,
        remarks: rec.remarks || '',
        student: {
          _id: student?._id || rec.student,
          studentId: studentDisplayId,
          name: studentName,
          deviceUserId: student?.deviceUserId || '',
          className: className,
          section: sectionName,
          branch: branchName,
          rollNumber: enrollment?.rollNumber || ''
        }
      };
    });

    ApiResponse.success(res, { records: enriched, total: enriched.length });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/attendance/summary-report
 * @desc    Class-wise daily attendance summary
 */
exports.getAttendanceSummaryReport = async (req, res, next) => {
  try {
    const { startDate, endDate, date, classLevel, section, branch } = req.query;
    const filter = { institution: req.user.institution };

    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate + 'T00:00:00.000Z'), $lte: new Date(endDate + 'T23:59:59.999Z') };
    } else if (date) {
      filter.date = { $gte: new Date(date + 'T00:00:00.000Z'), $lte: new Date(date + 'T23:59:59.999Z') };
    } else {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      filter.date = { $gte: new Date(todayStr + 'T00:00:00.000Z'), $lte: new Date(todayStr + 'T23:59:59.999Z') };
    }

    if (classLevel && classLevel !== 'all') filter.classLevel = classLevel;
    if (section && section !== 'all') filter.section = section;
    if (branch && branch !== 'all') filter.branch = branch;

    const rawRecords = await StudentAttendance.find(filter)
      .select('date status classLevel section student inTime outTime punchCount punchTimes')
      .lean();

    const records = rawRecords.map(r => (typeof r.toJSON === 'function' ? r.toJSON() : { ...r }));

    // Find all distinct classLevel IDs and student IDs
    const classIds = [...new Set(records.map(r => r.classLevel).filter(Boolean))];
    const studentIds = [...new Set(records.filter(r => !r.classLevel).map(r => r.student).filter(Boolean))];

    // If some records don't have classLevel, find from their students' active enrollments
    const studentClassMap = new Map();
    if (studentIds.length > 0) {
      const enrollments = await StudentEnrollment.findAll({
        where: { student: studentIds, enrollmentStatus: 'active' },
        attributes: ['student', 'classLevel']
      });
      enrollments.forEach(e => {
        const d = typeof e.toJSON === 'function' ? e.toJSON() : e;
        if (d.classLevel) {
          studentClassMap.set(String(d.student), String(d.classLevel));
          classIds.push(d.classLevel);
        }
      });
    }

    // Fetch class names
    const uniqueClassIds = [...new Set(classIds)];
    const classDocs = uniqueClassIds.length > 0
      ? await ClassLevel.findAll({ where: { _id: uniqueClassIds }, attributes: ['_id', 'name'] })
      : [];
    const classNameMap = new Map();
    classDocs.forEach(c => {
      const d = typeof c.toJSON === 'function' ? c.toJSON() : c;
      classNameMap.set(String(d._id), d.name);
    });

    // Group by date then class
    const summaryMap = {};
    records.forEach(rec => {
      const dateStr = rec.date ? new Date(rec.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) : 'unknown';
      const cId = rec.classLevel || studentClassMap.get(String(rec.student));
      const clsName = cId ? (classNameMap.get(String(cId)) || 'অজানা শ্রেণি') : 'অজানা শ্রেণি';

      if (!summaryMap[dateStr]) summaryMap[dateStr] = {};
      if (!summaryMap[dateStr][clsName]) summaryMap[dateStr][clsName] = { total: 0, present: 0, absent: 0, late: 0, on_leave: 0, not_assigned: 0 };
      summaryMap[dateStr][clsName].total++;
      const st = rec.status || 'not_assigned';
      summaryMap[dateStr][clsName][st] = (summaryMap[dateStr][clsName][st] || 0) + 1;
    });

    const summary = [];
    Object.entries(summaryMap).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, classes]) => {
      Object.entries(classes).forEach(([cls, counts]) => {
        summary.push({ date, classLevel: cls, ...counts });
      });
    });

    const totals = { total: 0, present: 0, absent: 0, late: 0, on_leave: 0, not_assigned: 0 };
    records.forEach(r => {
      totals.total++;
      const st = r.status || 'not_assigned';
      totals[st] = (totals[st] || 0) + 1;
    });

    ApiResponse.success(res, { summary, totals, recordCount: records.length });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Get Teacher Daily Attendance
// ──────────────────────────────────────────────────────────────
// @desc    Get Teacher Daily Attendance
// ──────────────────────────────────────────────────────────────
// @desc    Get Teacher Daily or Date-Range Attendance
// @route   GET /api/v1/attendance/teachers
// ──────────────────────────────────────────────────────────────
exports.getTeacherAttendance = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { date, startDate, endDate } = req.query;

    await TeacherAttendance.sync({ alter: true }).catch(() => {});
    const sequelize = require('../config/db');
    await sequelize.query("ALTER TABLE `teachers` ADD COLUMN `deviceUserId` VARCHAR(255) NULL DEFAULT ''").catch(() => {});

    const isSuperOrCoSuper = req.user.userType === 'super_admin' || 
                             req.user.userType === 'co_super_admin' || 
                             req.user.adminRole === 'co_super_admin';

    const instFilter = (!isSuperOrCoSuper && institution)
      ? { [Op.or]: [{ institution }, { institution: null }, { institution: '' }] }
      : {};

    // 1. Fetch Teachers and Staff Users
    const [teachers, users] = await Promise.all([
      Teacher.findAll({
        where: {
          ...instFilter,
          status: { [Op.or]: ['active', null, ''] },
        },
      }).catch(async (err) => {
        if (err.message && err.message.includes('deviceUserId')) {
          return Teacher.findAll({
            attributes: ['_id', 'user', 'institution', 'branch', 'employeeId', 'designation', 'status'],
            where: {
              ...instFilter,
              status: { [Op.or]: ['active', null, ''] },
            },
          }).catch(() => []);
        }
        return [];
      }),
      User.findAll({
        where: {
          ...instFilter,
          isActive: true,
          userType: { [Op.notIn]: ['student', 'guardian', 'parent', 'super_admin'] },
        },
        attributes: ['_id', 'firstName', 'lastName', 'username', 'phone', 'userType', 'adminRole'],
      }),
    ]);

    const userMap = new Map();
    users.forEach(u => userMap.set(String(u._id), u));

    const teacherMap = new Map();

    teachers.forEach(t => {
      const u = userMap.get(String(t.user));
      const name = u
        ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username
        : (t.employeeId || 'শিক্ষক');
      teacherMap.set(String(t._id), {
        teacherId: String(t._id),
        userId: t.user,
        name,
        designation: t.designation || (u?.userType === 'principal' ? 'প্রিন্সিপাল' : (u?.adminRole === 'admin' ? 'অ্যাডমিন' : 'শিক্ষক')),
        phone: u?.phone || '',
        deviceUserId: t.deviceUserId || t.employeeId || '',
        userType: u?.userType || 'teacher',
      });
    });

    users.forEach(u => {
      const uId = String(u._id);
      const hasRecord = Array.from(teacherMap.values()).some(t => String(t.userId) === uId || String(t.teacherId) === uId);
      if (!hasRecord) {
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
        teacherMap.set(uId, {
          teacherId: uId,
          userId: uId,
          name,
          designation: u.userType === 'principal' ? 'প্রিন্সিপাল' : (u.adminRole === 'admin' ? 'অ্যাডমিন' : 'শিক্ষক'),
          phone: u.phone || '',
          deviceUserId: '',
          userType: u.userType,
        });
      }
    });

    const isRangeMode = Boolean(startDate && endDate);

    if (isRangeMode) {
      // ──────────────────────────────────────────
      // RANGE MODE: Fetch matrix for date interval
      // ──────────────────────────────────────────
      const startRange = new Date(startDate + 'T00:00:00.000Z');
      const endRange = new Date(endDate + 'T23:59:59.999Z');

      const existingAttendances = await TeacherAttendance.findAll({
        where: {
          ...instFilter,
          date: { [Op.between]: [startRange, endRange] },
        },
      });

      // Build dateRangeList
      const dateRangeList = [];
      const cur = new Date(startRange);
      while (cur <= endRange) {
        dateRangeList.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }

      // Matrix: { [teacherId]: { [dateStr]: record } }
      const matrix = {};
      teacherMap.forEach((_, tId) => { matrix[tId] = {}; });

      existingAttendances.forEach(a => {
        const tId = String(a.teacher);
        const dStr = new Date(a.date).toISOString().slice(0, 10);
        if (!matrix[tId]) matrix[tId] = {};
        let parsedTimes = [];
        try { parsedTimes = JSON.parse(a.punchTimes || '[]'); } catch (_) { parsedTimes = []; }
        matrix[tId][dStr] = {
          _id: a._id,
          status: a.status,
          inTime: a.inTime || '',
          outTime: a.outTime || '',
          punchCount: a.punchCount || 0,
          punchTimes: parsedTimes,
          source: a.source || 'manual',
          remarks: a.remarks || '',
        };
      });

      const records = Array.from(teacherMap.values()).map(t => ({
        teacherId: t.teacherId,
        name: t.name,
        designation: t.designation,
        phone: t.phone,
        deviceUserId: t.deviceUserId,
        userType: t.userType,
      }));
      records.sort((a, b) => a.name.localeCompare(b.name, 'bn'));

      return ApiResponse.success(res, {
        mode: 'range',
        startDate,
        endDate,
        dateRangeList,
        records,
        matrix,
      });
    }

    // ──────────────────────────────────────────
    // SINGLE DATE MODE
    // ──────────────────────────────────────────
    const targetDateStr = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const { start, end } = getDayRange(targetDateStr);
    const targetDate = new Date(targetDateStr + 'T00:00:00.000Z');

    const existingAttendances = await TeacherAttendance.findAll({
      where: {
        ...instFilter,
        date: { [Op.between]: [start, end] },
      },
    });

    const attendanceMap = new Map();
    existingAttendances.forEach(a => {
      if (a.teacher) {
        attendanceMap.set(String(a.teacher), a);
      }
    });

    const records = [];
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    for (const [tId, t] of teacherMap.entries()) {
      const att = attendanceMap.get(tId) || (t.userId ? attendanceMap.get(String(t.userId)) : null);
      const status = att ? att.status : 'present';
      const inTime = att ? (att.inTime || '') : '';
      const outTime = att ? (att.outTime || '') : '';
      const punchCount = att ? (att.punchCount || 0) : 0;
      const source = att ? (att.source || 'manual') : 'manual';
      const remarks = att ? (att.remarks || '') : '';

      let parsedPunchTimes = [];
      try {
        parsedPunchTimes = att && att.punchTimes ? JSON.parse(att.punchTimes) : [];
      } catch (_) { parsedPunchTimes = []; }

      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'on_leave') leaveCount++;

      records.push({
        _id: att ? att._id : `draft-${tId}`,
        teacherId: tId,
        name: t.name,
        designation: t.designation,
        phone: t.phone,
        deviceUserId: t.deviceUserId,
        status,
        inTime,
        outTime,
        punchCount,
        punchTimes: parsedPunchTimes,
        source,
        remarks,
        isRecorded: Boolean(att),
      });
    }

    records.sort((a, b) => a.name.localeCompare(b.name, 'bn'));

    const total = records.length;
    const presentRate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

    ApiResponse.success(res, {
      mode: 'single',
      date: targetDateStr,
      stats: {
        total,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        leave: leaveCount,
        presentRate,
      },
      records,
    });
  } catch (error) {
    console.error('getTeacherAttendance error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Bulk Save Teacher Attendance (Single Date or Multiple Dates)
// @route   POST /api/v1/attendance/teachers
// ──────────────────────────────────────────────────────────────
exports.saveTeacherAttendance = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { date, dates, attendances } = req.body;

    if (!Array.isArray(attendances) || attendances.length === 0) {
      return ApiResponse.error(res, 'শিক্ষক হাজিরা তালিকা প্রদান করা আবশ্যক', 400);
    }

    await TeacherAttendance.sync({ alter: true }).catch(() => {});

    // ──────────────────────────────────────────
    // MULTIPLE DATES RANGE SAVE
    // ──────────────────────────────────────────
    if (Array.isArray(dates) && dates.length > 0) {
      let savedRecords = 0;
      for (const dStr of dates) {
        const { start, end } = getDayRange(dStr);
        const targetDate = new Date(dStr + 'T00:00:00.000Z');

        for (const item of attendances) {
          if (!item.teacherId) continue;
          const status = item.statuses ? (item.statuses[dStr] || 'present') : (item.status || 'present');
          const remarks = item.remarksMap ? (item.remarksMap[dStr] || '') : (item.remarks || '');

          const [record, created] = await TeacherAttendance.findOrCreate({
            where: {
              teacher: item.teacherId,
              date: { [Op.between]: [start, end] },
            },
            defaults: {
              institution: institution || '',
              teacher: item.teacherId,
              date: targetDate,
              status,
              source: item.source || 'manual',
              markedBy: req.user._id,
              remarks,
            },
          });

          if (!created) {
            await record.update({
              status,
              remarks: remarks !== undefined ? remarks : record.remarks,
              markedBy: req.user._id,
            });
          }
          savedRecords++;
        }
      }

      return ApiResponse.success(res, { savedRecords, dateCount: dates.length }, `${dates.length} দিনের শিক্ষক হাজিরা সফলভাবে সংরক্ষিত হয়েছে`);
    }

    // ──────────────────────────────────────────
    // SINGLE DATE SAVE
    // ──────────────────────────────────────────
    if (!date) {
      return ApiResponse.error(res, 'তারিখ প্রদান করা আবশ্যক', 400);
    }

    const targetDate = new Date(date + 'T00:00:00.000Z');
    const { start, end } = getDayRange(date);
    let savedCount = 0;

    for (const item of attendances) {
      if (!item.teacherId) continue;

      const [record, created] = await TeacherAttendance.findOrCreate({
        where: {
          teacher: item.teacherId,
          date: { [Op.between]: [start, end] },
        },
        defaults: {
          institution: institution || '',
          teacher: item.teacherId,
          date: targetDate,
          status: item.status || 'present',
          inTime: item.inTime || '',
          outTime: item.outTime || '',
          source: item.source || 'manual',
          markedBy: req.user._id,
          remarks: item.remarks || '',
        },
      });

      if (!created) {
        await record.update({
          status: item.status || 'present',
          inTime: item.inTime !== undefined ? item.inTime : record.inTime,
          outTime: item.outTime !== undefined ? item.outTime : record.outTime,
          source: item.source || record.source,
          remarks: item.remarks !== undefined ? item.remarks : record.remarks,
          markedBy: req.user._id,
        });
      }

      savedCount++;
    }

    ApiResponse.success(res, { savedCount }, `${savedCount} জন শিক্ষকের হাজিরা সফলভাবে সংরক্ষিত হয়েছে`);
  } catch (error) {
    console.error('saveTeacherAttendance error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Quick USB RFID Card Punch for Teachers
// @route   POST /api/v1/attendance/teachers/card-punch
// ──────────────────────────────────────────────────────────────
exports.recordTeacherCardPunch = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { cardId } = req.body;

    if (!cardId || !cardId.trim()) {
      return ApiResponse.error(res, 'কার্ড আইডি প্রদান করা আবশ্যক', 400);
    }

    await TeacherAttendance.sync({ alter: true }).catch(() => {});
    const sequelize = require('../config/db');
    await sequelize.query("ALTER TABLE `teachers` ADD COLUMN `deviceUserId` VARCHAR(255) NULL DEFAULT ''").catch(() => {});

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const { start, end } = getDayRange(dateStr);
    const targetDate = new Date(dateStr + 'T00:00:00.000Z');
    const timeString = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const isSuperOrCoSuper = req.user.userType === 'super_admin' || 
                             req.user.userType === 'co_super_admin' || 
                             req.user.adminRole === 'co_super_admin';

    const instWhere = (!isSuperOrCoSuper && institution)
      ? { [Op.or]: [{ institution }, { institution: null }, { institution: '' }] }
      : {};

    let teacher = null;
    try {
      teacher = await Teacher.findOne({
        where: {
          ...instWhere,
          [Op.or]: [
            { deviceUserId: cleanCard },
            { employeeId: cleanCard },
            { _id: cleanCard },
          ],
        },
      });
    } catch (err) {
      if (err.message && err.message.includes('deviceUserId')) {
        teacher = await Teacher.findOne({
          where: {
            ...instWhere,
            [Op.or]: [
              { employeeId: cleanCard },
              { _id: cleanCard },
            ],
          },
        }).catch(() => null);
      } else {
        throw err;
      }
    }

    let teacherUser = null;
    if (!teacher) {
      const userMatch = await User.findOne({
        where: {
          ...instWhere,
          [Op.or]: [{ phone: cleanCard }, { username: cleanCard }, { _id: cleanCard }],
        },
      });
      if (userMatch) {
        teacherUser = userMatch;
        teacher = await Teacher.findOne({ where: { user: userMatch._id } });
      }
    }

    const teacherId = teacher ? String(teacher._id) : (teacherUser ? String(teacherUser._id) : null);
    if (!teacherId) {
      return ApiResponse.notFound(res, `"${cleanCard}" আইডিধারী কোনো শিক্ষক পাওয়া যায়নি`);
    }

    if (!teacherUser && teacher && teacher.user) {
      teacherUser = await User.findOne({ where: { _id: teacher.user } });
    }
    const teacherName = teacherUser
      ? `${teacherUser.firstName || ''} ${teacherUser.lastName || ''}`.trim() || teacherUser.username
      : (teacher?.employeeId || 'শিক্ষক');

    let [record, created] = await TeacherAttendance.findOrCreate({
      where: {
        teacher: teacherId,
        date: { [Op.between]: [start, end] },
      },
      defaults: {
        institution: institution || teacher?.institution || '',
        teacher: teacherId,
        date: targetDate,
        status: 'present',
        inTime: timeString,
        outTime: '',
        punchCount: 1,
        punchTimes: JSON.stringify([timeString]),
        punchTime: now,
        source: 'rfid_card',
        remarks: 'ইউএসবি কার্ড স্ক্যানার',
        markedBy: req.user._id,
      },
    });

    if (!created) {
      record.status = 'present';
      let timesList = [];
      try { timesList = JSON.parse(record.punchTimes || '[]'); } catch (_) { timesList = []; }
      timesList.push(timeString);
      record.punchTimes = JSON.stringify(timesList);
      record.punchCount = (record.punchCount || 1) + 1;
      record.outTime = timeString;
      record.punchTime = now;
      await record.save();
    }

    ApiResponse.success(res, {
      teacherName,
      designation: teacher?.designation || (teacherUser?.userType === 'principal' ? 'প্রিন্সিপাল' : 'শিক্ষক'),
      inTime: record.inTime,
      outTime: record.outTime,
      punchCount: record.punchCount,
      time: timeString,
    }, `${teacherName} — উপস্থিতি সফলভাবে রেকর্ড হয়েছে (${timeString})`);
  } catch (error) {
    console.error('recordTeacherCardPunch error:', error);
    next(error);
  }
};

