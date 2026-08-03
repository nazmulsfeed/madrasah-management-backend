const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const StudentAttendance = require('../models/StudentAttendance');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const StudentEnrollment = require('../models/StudentEnrollment');
const Notice = require('../models/Notice');
const Account = require('../models/Account');
const Income = require('../models/Income');
const Voucher = require('../models/Voucher');
const ApiResponse = require('../utils/apiResponse');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    console.log('--- DASHBOARD SUMMARY REQUEST ---', req.user ? { _id: req.user._id, username: req.user.username, institution: req.user.institution } : null);
    const instFilter = req.user.institution ? { institution: req.user.institution } : {};

    // 1. Students Count
    const totalStudents = await Student.countDocuments({ ...instFilter, isDeleted: { $ne: true } });
    const activeStudents = await Student.countDocuments({ ...instFilter, status: 'active', isDeleted: { $ne: true } });
    const graduatedStudents = await Student.countDocuments({ ...instFilter, status: 'graduated', isDeleted: { $ne: true } });

    // 2. Teachers Count
    const staffTypes = [
      'principal', 'vice_principal', 'teacher', 'hifz_teacher', 
      'accountant', 'admission_officer', 'hostel_manager', 'library_manager'
    ];
    const totalTeachers = await User.countDocuments({ ...instFilter, userType: { $in: staffTypes } });

    // 3. Monthly Collection
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyPayments = await Payment.find({
      ...instFilter,
      status: 'success',
      paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const monthlyCollection = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 4. Attendance Rate (This Month)
    const totalAttendance = await StudentAttendance.countDocuments({
      ...instFilter,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const presentAttendance = await StudentAttendance.countDocuments({
      ...instFilter,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $in: ['present', 'late'] }
    });
    const attendanceRate = totalAttendance > 0
      ? Math.round((presentAttendance / totalAttendance) * 100)
      : 0;

    // 5. Due Invoice Info
    const dueInvoices = await Invoice.find({
      ...instFilter,
      status: { $in: ['unpaid', 'partial'] }
    });
    const dueAmount = dueInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const dueStudentsSet = new Set(dueInvoices.map(inv => inv.student.toString()));
    const dueCount = dueStudentsSet.size;

    // 6. Finance Specific Stats (Module 16)
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Today's Income (Other Incomes + Payments)
    const todaysIncomes = await Income.find({
      ...instFilter,
      status: 'approved',
      date: { $gte: startOfToday, $lte: endOfToday }
    });
    const todaysPayments = await Payment.find({
      ...instFilter,
      status: 'success',
      paymentDate: { $gte: startOfToday, $lte: endOfToday }
    });
    
    let todayIncomeTotal = todaysIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    let todayPaymentTotal = todaysPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    todayIncomeTotal += todayPaymentTotal;
    
    const todayPayingStudentsSet = new Set(todaysPayments.filter(p => p.student).map(p => p.student.toString()));
    const todayPayingStudentsCount = todayPayingStudentsSet.size;

    // Monthly Total Income (Other Incomes + Payments)
    const monthlyIncomes = await Income.find({
      ...instFilter,
      status: 'approved',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    let monthlyIncomeTotal = monthlyIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    monthlyIncomeTotal += monthlyCollection; // add fees

    // Today's Expense
    const todaysExpenses = await Voucher.find({
      ...instFilter,
      status: 'approved',
      date: { $gte: startOfToday, $lte: endOfToday }
    });
    const todayExpenseTotal = todaysExpenses.reduce((sum, v) => sum + (v.amount || 0), 0);
    
    // Monthly Expense
    const monthlyExpenses = await Voucher.find({
      ...instFilter,
      status: 'approved',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const monthlyExpenseTotal = monthlyExpenses.reduce((sum, v) => sum + (v.amount || 0), 0);

    const assetAccounts = await Account.find({ ...instFilter, type: 'Asset' });
    let totalCashBalance = 0;
    let totalBankBalance = 0;
    let totalWalletBalance = 0;
    
    assetAccounts.forEach(acc => {
      const nameStr = acc.name.toLowerCase();
      if (nameStr.includes('cash') || acc.name === 'ক্যাশ' || acc.name.includes('নগদ') && !acc.name.includes('nagad')) {
        // Special case: 'নগদ' could mean Cash or the Nagad wallet. Usually 'নগদ (Cash)' is cash.
        if (nameStr.includes('nagad') || acc.name === 'নগদ') {
          totalWalletBalance += acc.balance; // Nagad wallet
        } else {
          totalCashBalance += acc.balance; // Cash
        }
      } else if (nameStr.includes('bkash') || nameStr.includes('বিকাশ') || nameStr.includes('rocket') || nameStr.includes('রকেট') || nameStr.includes('upay') || nameStr.includes('উপায়') || nameStr.includes('nagad') || acc.name === 'নগদ') {
        totalWalletBalance += acc.balance;
      } else {
        totalBankBalance += acc.balance;
      }
    });

    // 7. Recent Activities
    const activities = [];

    // - Recent Enrollments
    const recentEnrollments = await StudentEnrollment.find(instFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName fullName' }
      })
      .populate('classLevel', 'name');

    recentEnrollments.forEach(e => {
      if (e.student && e.student.user) {
        const studentName = e.student.user.fullName || `${e.student.user.firstName || ''} ${e.student.user.lastName || ''}`.trim();
        const className = e.classLevel ? e.classLevel.name : '';
        activities.push({
          text: `${studentName} ${className ? `${className}-এ` : ''} ভর্তি হয়েছে`,
          date: e.createdAt,
          color: 'teal'
        });
      }
    });

    // - Recent Attendance Marked
    const recentAttendance = await StudentAttendance.find(instFilter)
      .sort({ date: -1 })
      .limit(3)
      .populate('classLevel', 'name');

    recentAttendance.forEach(att => {
      const className = att.classLevel ? att.classLevel.name : '';
      activities.push({
        text: `${className ? `${className} শ্রেণির ` : ''}উপস্থিতি চিহ্নিত করা হয়েছে`,
        date: att.createdAt || att.date,
        color: 'blue'
      });
    });

    // - Recent Invoices Created
    const recentInvoices = await Invoice.find(instFilter)
      .sort({ createdAt: -1 })
      .limit(3)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName fullName' }
      });

    recentInvoices.forEach(inv => {
      const studentName = inv.student && inv.student.user
        ? (inv.student.user.fullName || `${inv.student.user.firstName || ''} ${inv.student.user.lastName || ''}`.trim())
        : 'ছাত্র';
      activities.push({
        text: `${studentName} এর জন্য "${inv.title}" ফি চালান তৈরি হয়েছে`,
        date: inv.createdAt,
        color: 'amber'
      });
    });

    // - Recent Notices
    const recentNotices = await Notice.find(instFilter)
      .sort({ createdAt: -1 })
      .limit(3);

    recentNotices.forEach(n => {
      activities.push({
        text: `নোটিশ প্রকাশিত: "${n.title}"`,
        date: n.createdAt,
        color: 'green'
      });
    });

    // Sort all activities by date descending
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const sortedActivities = activities.slice(0, 5); // top 5

    ApiResponse.success(res, {
      stats: {
        totalStudents,
        activeStudents,
        totalTeachers,
        monthlyCollection, // Total fees this month
        attendanceRate,
        dueAmount,
        dueCount,
        hifzCompleted: graduatedStudents,
        
        // Finance metrics
        todayIncome: todayIncomeTotal,
        todayExpense: todayExpenseTotal,
        todayPayingStudents: todayPayingStudentsCount,
        monthlyIncome: monthlyIncomeTotal,
        monthlyExpense: monthlyExpenseTotal,
        cashBalance: totalCashBalance,
        bankBalance: totalBankBalance,
        walletBalance: totalWalletBalance,
        surplus: monthlyIncomeTotal - monthlyExpenseTotal
      },
      activities: sortedActivities
    });

  } catch (error) {
    next(error);
  }
};
