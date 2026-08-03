const Student = require('../models/Student');
const Invoice = require('../models/Invoice');
const ClassLevel = require('../models/ClassLevel');

const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

async function generateMonthlyInvoicesForCurrentMonth(month, year, institution) {
  try {
    const filter = { status: 'active', isDeleted: false };
    if (institution) filter.institution = institution;

    const students = await Student.find(filter)
      .populate({
        path: 'currentEnrollment',
        populate: { path: 'classLevel' }
      });

    let count = 0;
    const title = `মাসিক বেতন - ${month} ${year}`;

    for (const student of students) {
      const enrollment = student.currentEnrollment;
      if (!enrollment || !enrollment.classLevel) continue;

      const monthlyFee = enrollment.classLevel.monthlyFee || 0;
      if (monthlyFee <= 0) continue;

      // Check if invoice already exists
      const existing = await Invoice.findOne({
        student: student._id,
        title: title,
      });

      if (!existing) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15); // due in 15 days

        await Invoice.create({
          institution: student.institution || institution,
          student: student._id,
          invoiceNumber: `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title: title,
          dueDate: dueDate,
          subtotal: monthlyFee,
          payableTotal: monthlyFee,
          balance: monthlyFee,
          status: 'unpaid'
        });
        count++;
      }
    }
    console.log(`[Scheduler] Auto-generated ${count} monthly tuition invoices for ${month} ${year}`);
    return count;
  } catch (err) {
    console.error('[Scheduler] Error generating monthly invoices:', err);
    throw err;
  }
}

async function generateCategoryInvoicesForCurrentMonth(category, month, year, institution) {
  try {
    const filter = { status: 'active', isDeleted: false };
    if (institution) filter.institution = institution;

    const students = await Student.find(filter)
      .populate({
        path: 'currentEnrollment',
        populate: { path: 'classLevel' }
      });

    const categoryLabels = {
      admissionFee: 'ভর্তি ফি',
      sessionFee: 'সেশন ফি',
      examFee: 'পরীক্ষা ফি'
    };

    const label = categoryLabels[category];
    if (!label) throw new Error('Invalid fee category');

    const title = `${label} - ${month} ${year}`;
    let count = 0;

    for (const student of students) {
      const enrollment = student.currentEnrollment;
      if (!enrollment || !enrollment.classLevel) continue;

      const feeAmount = enrollment.classLevel[category] || 0;
      if (feeAmount <= 0) continue;

      // Check if invoice already exists
      const existing = await Invoice.findOne({
        student: student._id,
        title: title,
      });

      if (!existing) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);

        await Invoice.create({
          institution: student.institution || institution,
          student: student._id,
          invoiceNumber: `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title: title,
          dueDate: dueDate,
          subtotal: feeAmount,
          payableTotal: feeAmount,
          balance: feeAmount,
          status: 'unpaid'
        });
        count++;
      }
    }
    console.log(`[Scheduler] Generated ${count} invoices for ${title}`);
    return count;
  } catch (err) {
    console.error(`[Scheduler] Error generating invoices for ${category}:`, err);
    throw err;
  }
}

let lastRunMonthYear = '';

function startInvoiceScheduler() {
  console.log('[Scheduler] Monthly tuition invoice auto-scheduler started.');

  // Run checks every 12 hours
  setInterval(async () => {
    try {
      const today = new Date();
      const currentMonth = MONTHS[today.getMonth()];
      const currentYear = String(today.getFullYear());
      const currentMonthYear = `${currentMonth}-${currentYear}`;

      // Run on the 1st day of the month if not already executed
      if (today.getDate() === 1 && lastRunMonthYear !== currentMonthYear) {
        console.log(`[Scheduler] Auto-generating invoices for ${currentMonthYear}...`);
        await generateMonthlyInvoicesForCurrentMonth(currentMonth, currentYear);
        lastRunMonthYear = currentMonthYear;
      }
    } catch (err) {
      console.error('[Scheduler] Scheduler run error:', err);
    }
  }, 12 * 60 * 60 * 1000);
}

module.exports = {
  startInvoiceScheduler,
  generateMonthlyInvoicesForCurrentMonth,
  generateCategoryInvoicesForCurrentMonth
};
