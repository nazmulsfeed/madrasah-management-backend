const Institution = require('../models/Institution');
const Student = require('../models/Student');
const StudentAttendance = require('../models/StudentAttendance');
const Guardian = require('../models/Guardian');
const User = require('../models/User');
const { sendTargetedPush } = require('./pushHelper');

// ট্র্যাক করার জন্য শেষ কোন দিনে কোন প্রতিষ্ঠানে অটো-অনুপস্থিত চালানো হয়েছে (e.g. "institutionId_YYYY-MM-DD")
const executedDailyChecks = new Set();

/**
 * সকল প্রতিষ্ঠানের জন্য কাট-অফ টাইম চেক করে অনুপস্থিত ছাত্র চিহ্নিত করা ও নোটিফিকেশন পাঠানো
 */
async function checkAndMarkAbsentStudents() {
  try {
    const now = new Date();
    // ঢাকা টাইমজোনে বর্তমান সময় বের করা
    const dhakaTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }); // e.g. "09:35"

    const [currentHour, currentMinute] = dhakaTimeStr.split(':').map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const targetDate = new Date(dateStr + 'T00:00:00.000Z');

    const institutions = await Institution.findAll({
      where: { status: 'active' },
    });

    for (const inst of institutions) {
      if (inst.autoAbsentEnabled === false) continue;

      const cutoff = inst.attendanceCutoffTime || '09:30';
      const [cutHour, cutMinute] = cutoff.split(':').map(Number);
      const cutoffTotalMinutes = cutHour * 60 + cutMinute;

      const checkKey = `${inst._id}_${dateStr}`;

      // যদি কাট-অফ টাইম পার হয়ে যায় এবং আজকের দিনে এই প্রতিষ্ঠানের জন্য এখনো অটো-চেক না চালানো হয়ে থাকে
      if (currentTotalMinutes >= cutoffTotalMinutes && !executedDailyChecks.has(checkKey)) {
        console.log(`[Attendance Scheduler] ⏰ Running auto-absent check for institution: ${inst.name} (${inst._id}) at ${dhakaTimeStr}`);
        
        executedDailyChecks.add(checkKey);

        const allStudents = await Student.findAll({
          where: { institution: inst._id, isDeleted: false, status: 'active' },
        });

        if (allStudents.length === 0) continue;

        const todayAttendances = await StudentAttendance.findAll({
          where: {
            institution: inst._id,
            date: targetDate,
          },
        });

        const presentStudentIds = new Set(
          todayAttendances
            .filter((a) => a.status === 'present')
            .map((a) => String(a.student))
        );

        const absentStudents = allStudents.filter((s) => !presentStudentIds.has(String(s._id)));
        const allGuardians = await Guardian.findAll({ where: { institution: inst._id } });

        let absentCount = 0;
        for (const student of absentStudents) {
          const existingRecord = todayAttendances.find((a) => String(a.student) === String(student._id));
          if (!existingRecord) {
            await StudentAttendance.create({
              institution: inst._id,
              student: student._id,
              classLevel: '',
              section: '',
              branch: student.branch || '',
              date: targetDate,
              status: 'absent',
              source: 'auto_cron',
              remarks: `কাট-অফ সময় (${cutoff}) পার হওয়ায় স্বয়ংক্রিয় অনুপস্থিত`,
            });
          }

          const studentUser = await User.findOne({ where: { _id: student.user } });
          const studentName = studentUser ? (studentUser.fullName || studentUser.firstName || student.studentId) : student.studentId;

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

          try {
            const pushEnabled = Boolean(inst.attendancePushNotifEnabled);
            const testUserIdFilter = inst.testDeviceUserId ? String(inst.testDeviceUserId).trim() : '';

            // শুধুমাত্র তখনই নোটিফিকেশন যাবে যদি:
            // ১) পুশ নোটিফিকেশন অন থাকে, অথবা
            // ২) নির্দিষ্ট টেস্ট ছাত্রের আইডির সাথে মেলে
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
          } catch (pushErr) {
            console.error('[Attendance Scheduler] Push error:', pushErr.message);
          }
          absentCount++;
        }

        console.log(`[Attendance Scheduler] ✅ Marked ${absentCount} students as absent for ${inst.name}`);
      }
    }
  } catch (error) {
    console.error('[Attendance Scheduler] Execution error:', error.message);
  }
}

// ট্র্যাক করার জন্য শেষ কোন দিনে কোন প্রতিষ্ঠানে শিক্ষকদের অটো-অনুপস্থিত চালানো হয়েছে
const executedTeacherDailyChecks = new Set();

/**
 * সকল প্রতিষ্ঠানের জন্য কাট-অফ টাইম চেক করে অনুপস্থিত শিক্ষক চিহ্নিত করা
 */
async function checkAndMarkAbsentTeachers() {
  try {
    const Teacher = require('../models/Teacher');
    const TeacherAttendance = require('../models/TeacherAttendance');
    const { Op } = require('sequelize');
    const { getDayRange } = require('./dateUtils');

    const now = new Date();
    const dhakaTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const [currentHour, currentMinute] = dhakaTimeStr.split(':').map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const targetDate = new Date(dateStr + 'T00:00:00.000Z');
    const { start, end } = getDayRange(dateStr);

    const institutions = await Institution.findAll({
      where: { status: 'active' },
    });

    for (const inst of institutions) {
      if (!inst.teacherAutoAbsentEnabled) continue;

      const cutoff = inst.teacherCutoffTime || '08:45';
      const [cutHour, cutMinute] = cutoff.split(':').map(Number);
      const cutoffTotalMinutes = cutHour * 60 + cutMinute;

      const checkKey = `teacher_${inst._id}_${dateStr}`;

      if (currentTotalMinutes >= cutoffTotalMinutes && !executedTeacherDailyChecks.has(checkKey)) {
        console.log(`[Teacher Attendance Scheduler] ⏰ Running auto-absent check for institution: ${inst.name} (${inst._id}) at ${dhakaTimeStr}`);
        executedTeacherDailyChecks.add(checkKey);

        const allTeachers = await Teacher.findAll({
          where: {
            institution: inst._id,
            status: { [Op.or]: ['active', null, ''] },
          },
        });

        if (allTeachers.length === 0) continue;

        const todayAttendances = await TeacherAttendance.findAll({
          where: {
            institution: inst._id,
            date: { [Op.between]: [start, end] },
          },
        });

        const attendedTeacherIds = new Set(
          todayAttendances
            .filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'on_leave')
            .map((a) => String(a.teacher))
        );

        let absentCount = 0;
        for (const teacher of allTeachers) {
          if (!attendedTeacherIds.has(String(teacher._id))) {
            const existingRecord = todayAttendances.find((a) => String(a.teacher) === String(teacher._id));
            if (!existingRecord) {
              await TeacherAttendance.create({
                institution: inst._id,
                teacher: teacher._id,
                date: targetDate,
                status: 'absent',
                source: 'auto_cron',
                remarks: `কাট-অফ সময় (${cutoff}) পার হওয়ায় স্বয়ংক্রিয় অনুপস্থিত`,
              });
              absentCount++;
            }
          }
        }

        console.log(`[Teacher Attendance Scheduler] ✅ Marked ${absentCount} teachers as absent for ${inst.name}`);
      }
    }
  } catch (error) {
    console.error('[Teacher Attendance Scheduler] Execution error:', error.message);
  }
}

/**
 * অটো-অ্যাটেনডেন্স শিডিউলার শুরু করা (প্রতি ১ মিনিট পর পর চেক করে)
 */
function startAttendanceScheduler() {
  console.log('[Attendance Scheduler] 🚀 ZKTeco & Biometric Auto-Absent Scheduler started.');
  // সার্ভার চালুর ৫ সেকেন্ড পর ১ম বার চেক
  setTimeout(() => {
    checkAndMarkAbsentStudents();
    checkAndMarkAbsentTeachers();
  }, 5000);
  // প্রতি ১ মিনিট অন্তর চলবে
  setInterval(() => {
    checkAndMarkAbsentStudents();
    checkAndMarkAbsentTeachers();
  }, 60 * 1000);
}

module.exports = {
  startAttendanceScheduler,
  checkAndMarkAbsentStudents,
  checkAndMarkAbsentTeachers,
};
