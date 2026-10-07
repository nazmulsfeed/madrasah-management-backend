const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * সকল সাবস্ক্রাইবারকে পুশ নোটিফিকেশন পাঠায়।
 * এটি সম্পূর্ণ ব্যাকগ্রাউন্ডে কাজ করে, সার্ভারের মূল প্রসেসে কোনো প্রভাব পড়ে না।
 * @param {object} payload - { title, body, url }
 */
async function broadcastNotification(payload) {
  const results = [];
  try {
    const PushSubscription = require('../models/PushSubscription');
    const subscriptions = await PushSubscription.findAll();

    if (subscriptions.length === 0) {
      console.log('[Push] No subscribers found.');
      return results;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'নতুন আপডেট',
      body: payload.body || 'মাদ্রাসা থেকে একটি নতুন আপডেট এসেছে।',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: payload.url || '/public-homework',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };
      try {
        await webpush.sendNotification(subscription, notificationPayload);
        console.log('[Push] ✅ Sent to:', sub.endpoint.substring(0, 60));
        results.push({ endpoint: sub.endpoint.substring(0, 60), status: 'success' });
      } catch (err) {
        console.error('[Push] ❌ Error sending to:', sub.endpoint.substring(0, 60));
        console.error('[Push] Error statusCode:', err.statusCode);
        console.error('[Push] Error message:', err.message);
        results.push({ endpoint: sub.endpoint.substring(0, 60), status: 'error', statusCode: err.statusCode, message: err.message });
        // সাবস্ক্রিপশন এক্সপায়ার্ড বা ইনভ্যালিড হলে ডিলিট করা হয়
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.destroy({ where: { endpoint: sub.endpoint } });
          console.log('[Push] Removed expired subscription.');
        }
      }
    });

    await Promise.allSettled(sendPromises);
    console.log(`[Push] Broadcast complete. ${subscriptions.length} subscriber(s) processed.`);
  } catch (error) {
    console.error('[Push] Fatal error in broadcastNotification:', error.message);
    results.push({ status: 'fatal', message: error.message });
  }
  return results;
}

/**
 * নির্দিষ্ট ইউজার অথবা নির্দিষ্ট ছাত্রের অভিভাবককে পুশ নোটিফিকেশন পাঠায়।
 * @param {object} params - { userIds: string[], studentIds: string[], payload: { title, body, url } }
 */
async function sendTargetedPush({ userIds = [], studentIds = [], payload = {} }) {
  const results = [];
  try {
    const PushSubscription = require('../models/PushSubscription');
    const { Op } = require('sequelize');

    const cleanUserIds = (userIds || []).filter(Boolean).map(String);
    const cleanStudentIds = (studentIds || []).filter(Boolean).map(String);

    if (cleanUserIds.length === 0 && cleanStudentIds.length === 0) {
      return results;
    }

    const whereConditions = [];
    if (cleanUserIds.length > 0) {
      whereConditions.push({ userId: { [Op.in]: cleanUserIds } });
    }
    if (cleanStudentIds.length > 0) {
      whereConditions.push({ studentId: { [Op.in]: cleanStudentIds } });
    }

    const subscriptions = await PushSubscription.findAll({
      where: {
        [Op.or]: whereConditions,
      },
    });

    if (subscriptions.length === 0) {
      console.log('[Push-Targeted] No matching subscriptions found for targets.');
      return results;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'উপস্থিতি আপডেট 🔔',
      body: payload.body || 'আপনার সন্তানের উপস্থিতি সংক্রান্ত তথ্য।',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: payload.url || '/attendance',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };
      try {
        await webpush.sendNotification(subscription, notificationPayload);
        console.log('[Push-Targeted] ✅ Sent to target:', sub.endpoint.substring(0, 60));
        results.push({ endpoint: sub.endpoint.substring(0, 60), status: 'success' });
      } catch (err) {
        console.error('[Push-Targeted] ❌ Error sending:', err.message);
        results.push({ endpoint: sub.endpoint.substring(0, 60), status: 'error', message: err.message });
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.destroy({ where: { endpoint: sub.endpoint } });
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error('[Push-Targeted] Error in sendTargetedPush:', error.message);
  }
  return results;
}

/**
 * নির্দিষ্ট ক্লাসের (এবং অপশনাল সেকশনের) শিক্ষার্থী ও অভিভাবকদের কাছে পুশ পাঠায়।
 * শুধুমাত্র লগইন করা এবং সাবস্ক্রাইব করা ডিভাইসগুলোতেই নোটিফিকেশন যাবে।
 */
async function sendClassHomeworkPush({ homework, payload = {} }) {
  try {
    const Institution = require('../models/Institution');
    const StudentEnrollment = require('../models/StudentEnrollment');
    const Student = require('../models/Student');
    const Guardian = require('../models/Guardian');
    const ClassLevel = require('../models/ClassLevel');
    const { Op } = require('sequelize');

    const inst = await Institution.findOne();
    const isPublic = inst ? Boolean(inst.isHomeworkPublic) : false;

    let classLevelIds = [];
    if (homework.classLevel) {
      classLevelIds.push(String(homework.classLevel));
      const matchedClasses = await ClassLevel.findAll({
        where: {
          [Op.or]: [
            { _id: String(homework.classLevel) },
            { name: String(homework.classLevel) }
          ]
        }
      });
      matchedClasses.forEach(c => {
        if (c._id) classLevelIds.push(String(c._id));
        if (c.name) classLevelIds.push(String(c.name));
      });
      classLevelIds = [...new Set(classLevelIds)];
    }

    const enrollmentWhere = {
      enrollmentStatus: 'active'
    };
    if (classLevelIds.length > 0) {
      enrollmentWhere.classLevel = { [Op.in]: classLevelIds };
    }
    if (homework.section) {
      enrollmentWhere.section = homework.section;
    }

    const enrollments = await StudentEnrollment.findAll({
      where: enrollmentWhere,
      attributes: ['_id', 'student', 'classLevel', 'section']
    });

    const enrolledStudentIds = enrollments.map(e => e.student).filter(Boolean);
    const enrollmentIds = enrollments.map(e => e._id).filter(Boolean);

    const studentWhere = {
      isDeleted: { [Op.ne]: true }
    };
    if (enrolledStudentIds.length > 0 || enrollmentIds.length > 0) {
      studentWhere[Op.or] = [
        ...(enrolledStudentIds.length > 0 ? [{ _id: { [Op.in]: enrolledStudentIds } }] : []),
        ...(enrollmentIds.length > 0 ? [{ currentEnrollment: { [Op.in]: enrollmentIds } }] : [])
      ];
    } else {
      console.log('[Push-Homework] No active enrollments found for class:', homework.classLevel);
      return [];
    }

    const students = await Student.findAll({
      where: studentWhere,
      attributes: ['_id', 'user', 'studentId']
    });

    const targetUserIds = new Set();
    const targetStudentIds = new Set();

    students.forEach(st => {
      if (st.user) targetUserIds.add(String(st.user));
      if (st.studentId) targetStudentIds.add(String(st.studentId));
      if (st._id) targetStudentIds.add(String(st._id));
    });

    const allGuardians = await Guardian.findAll({
      where: { status: 'active' },
      attributes: ['user', 'students']
    });

    const studentIdStrings = new Set(students.map(s => String(s._id)));
    const customStudentIdStrings = new Set(students.map(s => String(s.studentId)).filter(Boolean));

    allGuardians.forEach(g => {
      if (!g.students || !Array.isArray(g.students)) return;
      const hasChild = g.students.some(s => {
        const sid = typeof s === 'string' ? s : (s.student || s.studentId);
        return sid && (studentIdStrings.has(String(sid)) || customStudentIdStrings.has(String(sid)));
      });
      if (hasChild && g.user) {
        targetUserIds.add(String(g.user));
      }
    });

    console.log(`[Push-Homework] Target recipients: ${targetUserIds.size} users, ${targetStudentIds.size} student IDs.`);

    // ক্লিক URL: পাবলিক ভিউ অন থাকলে /public-homework, অফ থাকলে লগইন পেজ /homework
    const clickUrl = isPublic ? '/public-homework' : '/homework';

    return await sendTargetedPush({
      userIds: Array.from(targetUserIds),
      studentIds: Array.from(targetStudentIds),
      payload: {
        title: payload.title || `📚 নতুন হোমওয়ার্ক: ${homework.title}`,
        body: payload.body || (homework.description ? homework.description.substring(0, 100) : `বিষয়: ${homework.subject || ''} | শ্রেণী: ${homework.classLevel || ''}`),
        url: clickUrl
      }
    });
  } catch (error) {
    console.error('[Push-Homework] Error sending class homework push:', error.message);
    return [];
  }
}

/**
 * নোটিশের পুশ নোটিফিকেশন পাঠায়।
 * যদি পাবলিক ভিউ বন্ধ থাকে, তবে কোনো পাবলিক ব্রডকাস্ট হবে না—শুধুমাত্র লগইন করা সংশ্লিষ্ট অডিয়েন্স পাবে।
 * যদি পাবলিক ভিউ চালু থাকে এবং অডিয়েন্স 'all' হয়, তবে সবার জন্য ব্রডকাস্ট পাঠানো হবে।
 */
async function sendNoticePush({ notice, payload = {} }) {
  try {
    const Institution = require('../models/Institution');
    const PushSubscription = require('../models/PushSubscription');
    const User = require('../models/User');
    const { Op } = require('sequelize');

    const inst = await Institution.findOne();
    const isPublic = inst ? Boolean(inst.isHomeworkPublic) : false;

    const audience = Array.isArray(notice.audience) ? notice.audience : (notice.audience ? [notice.audience] : ['all']);
    const isAllAudience = audience.includes('all') || audience.length === 0;

    // যদি পাবলিক ভিউ অন থাকে এবং অডিয়েন্স 'all' হয়, তবে সবার জন্য ব্রডকাস্ট
    if (isPublic && isAllAudience) {
      return await broadcastNotification({
        title: payload.title || `📢 নতুন নোটিশ: ${notice.title}`,
        body: payload.body || (notice.content ? notice.content.substring(0, 100) : 'একটি নতুন নোটিশ পোস্ট করা হয়েছে।'),
        url: '/public-homework'
      });
    }

    // অন্যথায় (পাবলিক ভিউ অফ থাকলে অথবা নির্দিষ্ট অডিয়েন্স থাকলে): শুধুমাত্র লগইন করা ইউজারদের টার্গেট করা হবে
    let targetUserIds = [];

    if (isAllAudience) {
      // সকল লগইন করা ইউজার যাদের পুশ সাবস্ক্রিপশন আছে
      const subsWithUser = await PushSubscription.findAll({
        where: {
          userId: { [Op.ne]: null }
        },
        attributes: ['userId']
      });
      targetUserIds = subsWithUser.map(s => s.userId).filter(Boolean);
    } else {
      // নির্দিষ্ট রোলের ইউজারদের খোঁজা
      const allowedRoles = [];
      if (audience.includes('students')) allowedRoles.push('student');
      if (audience.includes('guardians')) allowedRoles.push('guardian');
      if (audience.includes('teachers')) allowedRoles.push('teacher', 'principal', 'vice_principal');
      if (audience.includes('staff')) allowedRoles.push('staff', 'accountant');

      const matchingUsers = await User.findAll({
        where: {
          userType: { [Op.in]: allowedRoles },
          status: 'active'
        },
        attributes: ['_id']
      });
      targetUserIds = matchingUsers.map(u => String(u._id));
    }

    if (targetUserIds.length === 0) {
      console.log('[Push-Notice] No target users found for notice.');
      return [];
    }

    const clickUrl = isPublic ? '/public-homework' : '/notices';

    return await sendTargetedPush({
      userIds: targetUserIds,
      payload: {
        title: payload.title || `📢 নতুন নোটিশ: ${notice.title}`,
        body: payload.body || (notice.content ? notice.content.substring(0, 100) : 'একটি নতুন নোটিশ পোস্ট করা হয়েছে।'),
        url: clickUrl
      }
    });
  } catch (error) {
    console.error('[Push-Notice] Error in sendNoticePush:', error.message);
    return [];
  }
}

module.exports = { broadcastNotification, sendTargetedPush, sendClassHomeworkPush, sendNoticePush };

