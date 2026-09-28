const { Op } = require('sequelize');
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const ClassLevel = require('../models/ClassLevel');
const Invoice = require('../models/Invoice');
const Guardian = require('../models/Guardian');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Notice = require('../models/Notice');
const { sendTargetedPush } = require('./pushHelper');

const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

/**
 * চলতি মাসের মাসিক বেতন ইনভয়েস অটোমেটিক তৈরি (প্রতি মাসের ৫ তারিখ)
 */
async function generateMonthlyInvoicesForCurrentMonth(month, year, targetInstitution = null) {
  try {
    const instFilter = targetInstitution ? { _id: targetInstitution } : { status: 'active' };
    const institutions = await Institution.findAll({ where: instFilter });

    let totalGenerated = 0;

    for (const inst of institutions) {
      const instId = inst._id;
      const title = `মাসিক বেতন - ${month} ${year}`;

      // সব সক্রিয় শিক্ষার্থী খোঁজা
      const students = await Student.findAll({
        where: {
          institution: instId,
          status: 'active',
          isDeleted: false,
        }
      });

      if (!students || students.length === 0) continue;

      let instCount = 0;
      const notifiedStudentIds = [];
      const notifiedUserIds = [];

      for (const student of students) {
        try {
          // সক্রিয় এনরোলমেন্ট ও ক্লাস লেভেল বের করা
          let enrollment = null;
          if (student.currentEnrollment) {
            enrollment = await StudentEnrollment.findOne({ where: { _id: student.currentEnrollment } });
          }
          if (!enrollment) {
            enrollment = await StudentEnrollment.findOne({
              where: {
                student: student._id,
                enrollmentStatus: 'active'
              },
              order: [['createdAt', 'DESC']]
            });
          }

          if (!enrollment || !enrollment.classLevel) continue;

          const classLevel = await ClassLevel.findOne({ where: { _id: enrollment.classLevel } });
          if (!classLevel) continue;

          const monthlyFee = Number(classLevel.monthlyFee) || 0;
          if (monthlyFee <= 0) continue; // কোনো ফি নির্ধারিত না থাকলে ইনভয়েস হবে না

          // ইতিমধ্যে ইনভয়েস তৈরি হয়েছে কিনা চেক করা (ডুপ্লিকেট প্রতিরোধ)
          const existing = await Invoice.findOne({
            where: {
              student: student._id,
              [Op.or]: [
                { title: title },
                {
                  [Op.and]: [
                    {
                      [Op.or]: [
                        { title: { [Op.like]: `%মাসিক বেতন%` } },
                        { feeCategory: { [Op.like]: `%মাসিক বেতন%` } }
                      ]
                    },
                    { title: { [Op.like]: `%${month}%` } }
                  ]
                }
              ]
            }
          });

          if (!existing) {
            // ৫ তারিখে তৈরি হলে ডিফল্ট শেষ তারিখ হবে ওই মাসের ১৫ তারিখ (১০ দিন সময়)
            const today = new Date();
            const yearNum = parseInt(year, 10) || today.getFullYear();
            const monthIdx = MONTHS.indexOf(month) !== -1 ? MONTHS.indexOf(month) : today.getMonth();
            const dueDate = new Date(yearNum, monthIdx, 15, 23, 59, 59);

            const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

            await Invoice.create({
              institution: instId,
              student: student._id,
              academicYear: enrollment.academicYear || '',
              invoiceNumber,
              title,
              feeCategory: 'মাসিক বেতন',
              dueDate,
              subtotal: monthlyFee,
              payableTotal: monthlyFee,
              balance: monthlyFee,
              status: 'unpaid',
            });

            instCount++;
            notifiedStudentIds.push(String(student._id));
            if (student.user) notifiedUserIds.push(String(student.user));
          }
        } catch (studentErr) {
          console.error(`[Invoice Scheduler] Error generating invoice for student ${student._id}:`, studentErr.message);
        }
      }

      totalGenerated += instCount;
      console.log(`[Invoice Scheduler] ✅ Generated ${instCount} monthly invoices for ${inst.name} (${month} ${year})`);

      // অভিভাবকদের কাছে নতুন ইনভয়েস নোটিফিকেশন পাঠানো
      if (instCount > 0 && notifiedStudentIds.length > 0) {
        try {
          await sendTargetedPush({
            userIds: notifiedUserIds,
            studentIds: notifiedStudentIds,
            payload: {
              title: '📄 নতুন মাসিক বেতনের ইনভয়েস তৈরি হয়েছে',
              body: `আসসালামু আলাইকুম, ${month} মাসের বেতন ইনভয়েস তৈরি হয়েছে। নির্ধারিত শেষ তারিখের (১৫ তারিখ) মধ্যে পরিশোধ করার অনুরোধ করা হলো।`,
              url: '/fees',
            }
          });
        } catch (notifErr) {
          console.error('[Invoice Scheduler] New invoice push error:', notifErr.message);
        }
      }
    }

    return totalGenerated;
  } catch (err) {
    console.error('[Invoice Scheduler] Error in generateMonthlyInvoicesForCurrentMonth:', err);
    throw err;
  }
}

/**
 * নির্দিষ্ট ফি ক্যাটাগরির ইনভয়েস ব্যাচ তৈরি (ম্যানুয়াল ও অটো)
 */
async function generateCategoryInvoicesForCurrentMonth(category, month, year, institution) {
  try {
    const categoryLabels = {
      monthlyFee: 'মাসিক বেতন',
      admissionFee: 'ভর্তি ফি',
      sessionFee: 'সেশন ফি',
      examFee: 'পরীক্ষা ফি'
    };

    const label = categoryLabels[category];
    if (!label) throw new Error('Invalid fee category');

    const title = `${label} - ${month} ${year}`;
    const filter = { status: 'active', isDeleted: false };
    if (institution) filter.institution = institution;

    const students = await Student.findAll({ where: filter });
    let count = 0;

    for (const student of students) {
      let enrollment = null;
      if (student.currentEnrollment) {
        enrollment = await StudentEnrollment.findOne({ where: { _id: student.currentEnrollment } });
      }
      if (!enrollment) {
        enrollment = await StudentEnrollment.findOne({
          where: { student: student._id, enrollmentStatus: 'active' },
          order: [['createdAt', 'DESC']]
        });
      }
      if (!enrollment || !enrollment.classLevel) continue;

      const classLevel = await ClassLevel.findOne({ where: { _id: enrollment.classLevel } });
      if (!classLevel) continue;

      const feeAmount = Number(classLevel[category]) || 0;
      if (feeAmount <= 0) continue;

      const existing = await Invoice.findOne({
        where: {
          student: student._id,
          [Op.or]: [
            { title: title },
            {
              [Op.and]: [
                {
                  [Op.or]: [
                    { title: { [Op.like]: `%${label}%` } },
                    { feeCategory: { [Op.like]: `%${label}%` } }
                  ]
                },
                { title: { [Op.like]: `%${month}%` } }
              ]
            }
          ]
        }
      });

      if (!existing) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);

        await Invoice.create({
          institution: student.institution || institution,
          student: student._id,
          academicYear: enrollment.academicYear || '',
          invoiceNumber: `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title: title,
          feeCategory: label,
          dueDate: dueDate,
          subtotal: feeAmount,
          payableTotal: feeAmount,
          balance: feeAmount,
          status: 'unpaid'
        });
        count++;
      }
    }

    console.log(`[Invoice Scheduler] Generated ${count} invoices for ${title}`);
    return count;
  } catch (err) {
    console.error(`[Invoice Scheduler] Error generating invoices for ${category}:`, err);
    throw err;
  }
}

// ট্র্যাক করার জন্য শেষ কোন দিনে কোন ইনভয়েসে রিমাইন্ডার পাঠানো হয়েছে
const executedReminders = new Set();
const executedNotices = new Set();

/**
 * আর মাত্র ৩ দিন বাকি থাকা বকেয়া ইনভয়েসের জন্য অভিভাবকদের কাছে স্বয়ংক্রিয় নোটিফিকেশন পাঠানো
 * @param {string|null} targetInstitution - অপশনাল নির্দিষ্ট প্রতিষ্ঠান আইডি (ম্যানুয়াল ট্রিগারের জন্য)
 * @param {boolean} forceAllDue - true হলে ৩ দিনের শর্ত ছাড়াও সব বকেয়াধারীকে রিমাইন্ডার পাঠাবে (ম্যানুয়াল বাটন)
 */
async function sendDuePaymentReminders(targetInstitution = null, forceAllDue = false) {
  try {
    const now = new Date();
    const todayBDStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const todayBD = new Date(todayBDStr);

    const whereClause = {
      status: { [Op.in]: ['unpaid', 'partial'] },
      balance: { [Op.gt]: 0 },
    };
    if (targetInstitution) {
      whereClause.institution = targetInstitution;
    }

    const unpaidInvoices = await Invoice.findAll({
      where: whereClause,
      order: [['dueDate', 'ASC']]
    });

    if (unpaidInvoices.length === 0) {
      console.log('[Invoice Reminder] No unpaid invoices found.');
      return { totalChecked: 0, remindersSent: 0 };
    }

    let remindersSent = 0;
    const institutionRemindersCount = {};

    for (const inv of unpaidInvoices) {
      try {
        const dueBDStr = new Date(inv.dueDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
        const dueBD = new Date(dueBDStr);

        const diffTime = dueBD.getTime() - todayBD.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // শর্ত: আর ঠিক ৩ দিন বাকি আছে (diffDays === 3) অথবা ম্যানুয়াল ফোর্সের ক্ষেত্রে বকেয়া থাকলে
        const shouldSend = forceAllDue ? (diffDays >= 0 && diffDays <= 5) : (diffDays === 3);

        if (!shouldSend) continue;

        const reminderKey = `${inv._id}_${todayBDStr}_reminded`;
        if (executedReminders.has(reminderKey) && !forceAllDue) continue;

        // ছাত্রের তথ্য খোঁজা
        const student = await Student.findOne({ where: { _id: inv.student } });
        if (!student) continue;

        const studentUser = student.user ? await User.findOne({ where: { _id: student.user } }) : null;
        const studentName = studentUser ? `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim() : (student.studentId || 'শিক্ষার্থী');

        // অভিভাবকদের ইউজার আইডি সংগ্রহ করা
        const targetUserIds = [];
        if (student.user) targetUserIds.push(String(student.user));

        const guardians = await Guardian.findAll({
          where: { institution: inv.institution, status: 'active' }
        });

        for (const g of guardians) {
          let sList = [];
          if (Array.isArray(g.students)) sList = g.students;
          else if (typeof g.students === 'string') {
            try { sList = JSON.parse(g.students); } catch (e) { sList = [g.students]; }
          }
          if (sList.map(String).includes(String(student._id)) || sList.map(String).includes(String(student.studentId))) {
            if (g.user) targetUserIds.push(String(g.user));
          }
        }

        const formattedDueDate = new Date(inv.dueDate).toLocaleDateString('bn-BD', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const notifTitle = diffDays > 0 
          ? `⚠️ ফি পরিশোধের তাগিদ — আর মাত্র ${diffDays} দিন বাকি` 
          : `⚠️ ফি পরিশোধের শেষ তারিখ আজ!`;

        const notifBody = `আসসালামু আলাইকুম, ${studentName}-এর (${inv.title}) বকেয়া ৳${inv.balance.toLocaleString('en-IN')} পরিশোধের শেষ তারিখ ${formattedDueDate}। অনুগ্রহ করে নির্ধারিত সময়ের মধ্যে পরিশোধ করুন।`;

        await sendTargetedPush({
          userIds: targetUserIds,
          studentIds: [String(student.studentId), String(student._id)],
          payload: {
            title: notifTitle,
            body: notifBody,
            url: '/fees',
          }
        });

        executedReminders.add(reminderKey);
        remindersSent++;
        institutionRemindersCount[inv.institution] = (institutionRemindersCount[inv.institution] || 0) + 1;
      } catch (itemErr) {
        console.error(`[Invoice Reminder] Error sending reminder for invoice ${inv._id}:`, itemErr.message);
      }
    }

    // প্রতিষ্ঠানে সার্বিক নোটিশ তৈরি করা (যদি আজকের দিনে না গিয়ে থাকে)
    for (const [instId, count] of Object.entries(institutionRemindersCount)) {
      if (count > 0) {
        const noticeKey = `${instId}_${todayBDStr}_due_notice`;
        if (!executedNotices.has(noticeKey)) {
          executedNotices.add(noticeKey);
          try {
            await Notice.create({
              institution: instId,
              title: '⚠️ চলতি মাসের বেতন ও বকেয়া ফি পরিশোধের তাগিদ',
              content: `সম্মানিত অভিভাবকবৃন্দ, চলতি মাসের বেতন ও নির্ধারিত ফি পরিশোধের শেষ সময়সীমা ঘনিয়ে এসেছে (আর মাত্র ৩ দিন বাকি)। যাদের ফি এখনো বকেয়া রয়েছে, বিলম্ব ফি এড়াতে নির্ধারিত শেষ তারিখের মধ্যে পরিশোধ করার জন্য বিশেষভাবে অনুরোধ করা হলো।`,
              audience: ['guardian', 'student'],
              priority: 'urgent',
              isPublished: true,
              publishedAt: new Date(),
              publishedBy: 'সিস্টেম অটোমেশন'
            });
          } catch (notErr) {
            console.error('[Invoice Reminder] Notice creation error:', notErr.message);
          }
        }
      }
    }

    console.log(`[Invoice Reminder] 🔔 Successfully sent ${remindersSent} reminders out of ${unpaidInvoices.length} unpaid invoices.`);
    return { totalChecked: unpaidInvoices.length, remindersSent };
  } catch (err) {
    console.error('[Invoice Reminder] Error in sendDuePaymentReminders:', err);
    throw err;
  }
}

let lastRunMonthYear = '';
let lastReminderDate = '';

/**
 * অটোমেটিক শিডিউলার স্টার্ট করা
 */
function startInvoiceScheduler() {
  console.log('⏰ [Scheduler] Monthly tuition invoice (5th of month) & 3-day due reminder auto-scheduler started.');

  // প্রতি ২০ মিনিট পর পর চেক করা
  setInterval(async () => {
    try {
      const now = new Date();
      // বাংলাদেশ ঢাকা টাইমজোনে বর্তমান তারিখ ও দিন বের করা
      const todayBDStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      const currentDay = parseInt(todayBDStr.split('-')[2], 10);
      const currentMonthNum = parseInt(todayBDStr.split('-')[1], 10) - 1;
      const currentMonth = MONTHS[currentMonthNum] || MONTHS[now.getMonth()];
      const currentYear = todayBDStr.split('-')[0];
      const currentMonthYearKey = `${currentMonth}-${currentYear}`;

      // ১. প্রতি মাসের ৫ তারিখে স্বয়ংক্রিয়ভাবে চলতি মাসের বেতন ইনভয়েস তৈরি করা
      if (currentDay === 5 && lastRunMonthYear !== currentMonthYearKey) {
        console.log(`[Invoice Scheduler] 🗓️ Today is 5th of the month. Auto-generating monthly invoices for ${currentMonthYearKey}...`);
        await generateMonthlyInvoicesForCurrentMonth(currentMonth, currentYear);
        lastRunMonthYear = currentMonthYearKey;
      }

      // ২. প্রতিদিন সকাল ৯টা থেকে রাত ৯টার মধ্যে দিনে একবার বকেয়া ৩ দিনের রিমাইন্ডার পাঠানো
      const bdHour = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: false, hour: '2-digit' }), 10);
      if (bdHour >= 9 && lastReminderDate !== todayBDStr) {
        console.log(`[Invoice Scheduler] 📢 Running daily check for 3-day due payment reminders at ${todayBDStr} (${bdHour}:00 BD)...`);
        await sendDuePaymentReminders(null, false);
        lastReminderDate = todayBDStr;
      }
    } catch (err) {
      console.error('[Invoice Scheduler] Scheduler run error:', err);
    }
  }, 20 * 60 * 1000);

  // সার্ভার বুট হওয়ার ১ মিনিট পর প্রথম প্রাথমিক চেক চালানো
  setTimeout(async () => {
    try {
      const now = new Date();
      const todayBDStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      const currentDay = parseInt(todayBDStr.split('-')[2], 10);
      const currentMonthNum = parseInt(todayBDStr.split('-')[1], 10) - 1;
      const currentMonth = MONTHS[currentMonthNum];
      const currentYear = todayBDStr.split('-')[0];
      const currentMonthYearKey = `${currentMonth}-${currentYear}`;

      if (currentDay === 5 && lastRunMonthYear !== currentMonthYearKey) {
        console.log(`[Invoice Scheduler Startup] Running 5th-of-month check for ${currentMonthYearKey}...`);
        await generateMonthlyInvoicesForCurrentMonth(currentMonth, currentYear);
        lastRunMonthYear = currentMonthYearKey;
      }
    } catch (bootErr) {
      console.error('[Invoice Scheduler Startup] Error:', bootErr.message);
    }
  }, 60 * 1000);
}

module.exports = {
  startInvoiceScheduler,
  generateMonthlyInvoicesForCurrentMonth,
  generateCategoryInvoicesForCurrentMonth,
  sendDuePaymentReminders,
};
