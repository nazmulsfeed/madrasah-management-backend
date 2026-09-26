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

// ==========================================
// ZKTeco & Virtual Android Simulator Engine
// ==========================================

const { sendTargetedPush } = require('../utils/pushHelper');
const User = require('../models/User');
const Institution = require('../models/Institution');
const StudentEnrollment = require('../models/StudentEnrollment');

/**
 * স্টুডেন্টের উপস্থিতি পাঞ্চ প্রসেস করে এবং নির্দিষ্ট অভিভাবককে নোটিফিকেশন পাঠায়
 */
async function processAttendancePunch({ institutionId, deviceUserId, punchTime, source = 'device' }) {
  const punchDate = punchTime ? new Date(punchTime) : new Date();
  const dateStr = punchDate.toISOString().split('T')[0];
  const targetDate = new Date(dateStr + 'T00:00:00.000Z');

  // সময় ফরম্যাট (১২ ঘন্টা ফরম্যাট, যেমন: 08:30 AM)
  const timeString = punchDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  });

  const { Op } = require('sequelize');

  // ১. ডিভাইস আইডি বা স্টুডেন্ট আইডি দিয়ে ছাত্র খুঁজে বের করা
  const cleanId = String(deviceUserId || '').trim();
  if (!cleanId) {
    return { success: false, message: 'Invalid deviceUserId' };
  }

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
    return { success: false, message: `Student not found with ID: ${cleanId}` };
  }

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
  if (!attendance) {
    isFirstPunch = true;
    attendance = await StudentAttendance.create({
      institution: institutionId,
      student: student._id,
      classLevel: enrollment ? enrollment.classLevel : '',
      section: enrollment ? enrollment.section : '',
      branch: student.branch || '',
      date: targetDate,
      status: 'present',
      inTime: timeString,
      punchTime: punchDate,
      source,
      remarks: `বায়োমেট্রিক পাঞ্চ (${source})`,
    });
  } else {
    // ইতোমধ্যে থাকলে শুধু পাঞ্চ টাইম আপডেট করা (যদি স্ট্যাটাস absent থাকে তবে present করে দেওয়া)
    if (attendance.status === 'absent') {
      attendance.status = 'present';
      attendance.inTime = timeString;
      attendance.source = source;
      attendance.remarks = `দেরিতে পাঞ্চ (${source})`;
      await attendance.save();
      isFirstPunch = true;
    }
  }

  // ২. শুধুমাত্র সংশ্লিষ্ট স্টুডেন্ট/অভিভাবকের ফোনে টার্গেটেড পুশ নোটিফিকেশন পাঠানো (যদি অ্যাডমিন সেটিংস অন রাখেন)
  if (isFirstPunch) {
    try {
      const inst = await Institution.findOne({ where: { _id: institutionId } });
      const pushEnabled = inst ? Boolean(inst.attendancePushNotifEnabled) : false;
      const testUserIdFilter = inst?.testDeviceUserId ? String(inst.testDeviceUserId).trim() : '';

      // নোটিফিকেশন তখনই যাবে যদি:
      // ১) পুশ নোটিফিকেশন অন থাকে, অথবা
      // ২) টেস্ট ফিল্টারে এই ছাত্রের আইডি নির্দিষ্ট করে দেওয়া থাকে (যাতে অন্য কোনো অভিভাবকের কাছে না যায়)
      const isAllowedForPush = pushEnabled || (testUserIdFilter !== '' && (testUserIdFilter === String(student.studentId) || testUserIdFilter === String(cleanId)));

      if (isAllowedForPush) {
        const targetUserIds = [];
        if (student.user) targetUserIds.push(String(student.user));

        // অভিভাবক খুঁজে বের করা
        const allGuardians = await Guardian.findAll({ where: { institution: institutionId } });
        allGuardians.forEach((g) => {
          if (g.students && Array.isArray(g.students)) {
            const isLinked = g.students.some((s) => String(s.student) === String(student._id));
            if (isLinked && g.user) {
              targetUserIds.push(String(g.user));
            }
          }
        });

        await sendTargetedPush({
          userIds: targetUserIds,
          studentIds: [String(student.studentId), String(student._id)],
          payload: {
            title: '✅ উপস্থিতি নিশ্চিতকরণ (পরীক্ষামূলক)',
            body: `আসসালামু আলাইকুম, আপনার সন্তান (${studentName}) আজ সকাল ${timeString}-এ মাদরাসায় উপস্থিত হয়েছে।`,
            url: '/attendance',
          },
        });
        console.log(`[Attendance Push] Notification sent for student: ${studentName}`);
      } else {
        console.log(`[Attendance Push] Skipped: push notifications to guardians are OFF in settings.`);
      }
    } catch (notifErr) {
      console.error('[Punch Notif Error]:', notifErr.message);
    }
  }

  return {
    success: true,
    studentName,
    studentId: student.studentId,
    inTime: timeString,
    status: attendance.status,
    isFirstPunch,
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
    });

    if (!result.success) {
      return ApiResponse.error(res, result.message, 404);
    }

    ApiResponse.success(res, result, `পাঞ্চ সফল! ${result.studentName}-এর উপস্থিতি ও অভিভাবকের ফোনে নোটিফিকেশন পাঠানো হয়েছে।`);
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
    // ফরম্যাট সাধারণত: 1\t2026-09-27 08:30:15\t0\t1 ... বা query table=ATTLOG
    let rawData = '';
    if (typeof req.body === 'string') {
      rawData = req.body;
    } else if (req.body && typeof req.body === 'object') {
      rawData = JSON.stringify(req.body);
    }
    if (req.rawBody) rawData = req.rawBody;

    console.log('[ZKTeco ADMS POST Data]:', rawData);

    // যদি ডিভাইস ডাটা পাঠায়, তবে ডিফল্ট প্রতিষ্ঠান দিয়ে লগ প্রসেস করা
    const defaultInst = await Institution.findOne({ where: { status: 'active' } });
    if (defaultInst) {
      // লাইন বাই লাইন ডাটা পার্স করা
      const lines = rawData.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        // ZKTeco স্ট্যান্ডার্ড ট্যাব বা স্পেস ফরম্যাট: PIN \t CheckTime
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const deviceUserId = parts[0].trim();
          const punchTimeStr = parts[1].trim();
          if (deviceUserId && !isNaN(Date.parse(punchTimeStr))) {
            await processAttendancePunch({
              institutionId: defaultInst._id,
              deviceUserId,
              punchTime: new Date(punchTimeStr),
              source: 'zkteco_device',
            });
          }
        }
      }
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
    const dateStr = today.toISOString().split('T')[0];
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
    if (testDeviceUserId !== undefined) institution.testDeviceUserId = String(testDeviceUserId).trim();

    await institution.save();

    ApiResponse.success(res, {
      attendanceCutoffTime: institution.attendanceCutoffTime,
      autoAbsentEnabled: institution.autoAbsentEnabled,
      biometricAttendanceEnabled: institution.biometricAttendanceEnabled,
      attendancePushNotifEnabled: institution.attendancePushNotifEnabled,
      testDeviceUserId: institution.testDeviceUserId,
    }, 'বায়োমেট্রিক ও উপস্থিতি কন্ট্রোল প্যানেল সেটিংস সফলভাবে আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};

