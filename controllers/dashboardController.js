const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
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
    const institution = req.user?.institution;
    const instFilter = institution ? { institution } : {};
    const hasInst = Boolean(institution);
    const replacements = hasInst ? { institution } : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const staffTypes = [
      'principal', 'vice_principal', 'teacher', 'hifz_teacher',
      'accountant', 'admission_officer', 'hostel_manager', 'library_manager'
    ];

    // Stage 1: Execute all aggregation queries in parallel
    const [
      studentStatsRes,
      teacherStatsRes,
      paymentStatsRes,
      attendanceStatsRes,
      dueInvoiceStatsRes,
      incomeStatsRes,
      expenseStatsRes,
      assetAccounts
    ] = await Promise.all([
      // 1. Students Count (total, active, graduated) in a single query
      sequelize.query(`
        SELECT
          COUNT(*) AS totalStudents,
          COUNT(CASE WHEN status = 'active' THEN 1 END) AS activeStudents,
          COUNT(CASE WHEN status = 'graduated' THEN 1 END) AS graduatedStudents
        FROM students
        WHERE (isDeleted IS NULL OR isDeleted != 1)
          ${hasInst ? 'AND institution = :institution' : ''}
      `, { replacements, type: QueryTypes.SELECT }),

      // 2. Teachers Count
      sequelize.query(`
        SELECT COUNT(*) AS totalTeachers
        FROM users
        WHERE userType IN (:staffTypes)
          ${hasInst ? 'AND institution = :institution' : ''}
      `, {
        replacements: { ...replacements, staffTypes },
        type: QueryTypes.SELECT
      }),

      // 3. Payment Aggregation (monthlyCollection, todayPaymentTotal, todayPayingStudentsCount)
      sequelize.query(`
        SELECT
          COALESCE(SUM(CASE WHEN paymentDate >= :startOfMonth AND paymentDate <= :endOfMonth THEN amount ELSE 0 END), 0) AS monthlyCollection,
          COALESCE(SUM(CASE WHEN paymentDate >= :startOfToday AND paymentDate <= :endOfToday THEN amount ELSE 0 END), 0) AS todayPaymentTotal,
          COUNT(DISTINCT CASE WHEN paymentDate >= :startOfToday AND paymentDate <= :endOfToday AND student IS NOT NULL AND student != '' THEN student END) AS todayPayingStudentsCount
        FROM payments
        WHERE status = 'success'
          AND paymentDate >= :startOfMonth AND paymentDate <= :endOfMonth
          ${hasInst ? 'AND institution = :institution' : ''}
      `, {
        replacements: { ...replacements, startOfMonth, endOfMonth, startOfToday, endOfToday },
        type: QueryTypes.SELECT
      }),

      // 4. Attendance Rate (totalAttendance, presentAttendance)
      sequelize.query(`
        SELECT
          COUNT(*) AS totalAttendance,
          COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) AS presentAttendance
        FROM studentattendances
        WHERE date >= :startOfMonth AND date <= :endOfMonth
          ${hasInst ? 'AND institution = :institution' : ''}
      `, {
        replacements: { ...replacements, startOfMonth, endOfMonth },
        type: QueryTypes.SELECT
      }),

      // 5. Due Invoices Aggregation (dueAmount, dueCount)
      sequelize.query(`
        SELECT
          COALESCE(SUM(balance), 0) AS dueAmount,
          COUNT(DISTINCT student) AS dueCount
        FROM invoices
        WHERE status IN ('unpaid', 'partial')
          ${hasInst ? 'AND institution = :institution' : ''}
      `, { replacements, type: QueryTypes.SELECT }),

      // 6. Income Aggregation (monthlyIncome, todayIncome)
      sequelize.query(`
        SELECT
          COALESCE(SUM(CASE WHEN date >= :startOfToday AND date <= :endOfToday THEN amount ELSE 0 END), 0) AS todayIncome,
          COALESCE(SUM(amount), 0) AS monthlyIncome
        FROM incomes
        WHERE status = 'approved'
          AND date >= :startOfMonth AND date <= :endOfMonth
          ${hasInst ? 'AND institution = :institution' : ''}
      `, {
        replacements: { ...replacements, startOfMonth, endOfMonth, startOfToday, endOfToday },
        type: QueryTypes.SELECT
      }),

      // 7. Expense Aggregation (monthlyExpense, todayExpense)
      sequelize.query(`
        SELECT
          COALESCE(SUM(CASE WHEN date >= :startOfToday AND date <= :endOfToday THEN amount ELSE 0 END), 0) AS todayExpenseTotal,
          COALESCE(SUM(amount), 0) AS monthlyExpenseTotal
        FROM vouchers
        WHERE status = 'approved'
          AND date >= :startOfMonth AND date <= :endOfMonth
          ${hasInst ? 'AND institution = :institution' : ''}
      `, {
        replacements: { ...replacements, startOfMonth, endOfMonth, startOfToday, endOfToday },
        type: QueryTypes.SELECT
      }),

      // 8. Asset Accounts
      Account.find({ ...instFilter, type: 'Asset' }).select('name balance')
    ]);

    // Extract student counts
    const sStats = studentStatsRes[0] || {};
    const totalStudents = Number(sStats.totalStudents || 0);
    const activeStudents = Number(sStats.activeStudents || 0);
    const graduatedStudents = Number(sStats.graduatedStudents || 0);

    // Extract teachers count
    const tStats = teacherStatsRes[0] || {};
    const totalTeachers = Number(tStats.totalTeachers || 0);

    // Extract payment metrics
    const pStats = paymentStatsRes[0] || {};
    const monthlyCollection = Number(pStats.monthlyCollection || 0);
    const todayPaymentTotal = Number(pStats.todayPaymentTotal || 0);
    const todayPayingStudentsCount = Number(pStats.todayPayingStudentsCount || 0);

    // Extract attendance rate
    const aStats = attendanceStatsRes[0] || {};
    const totalAttendance = Number(aStats.totalAttendance || 0);
    const presentAttendance = Number(aStats.presentAttendance || 0);
    const attendanceRate = totalAttendance > 0
      ? Math.round((presentAttendance / totalAttendance) * 100)
      : 0;

    // Extract due invoice metrics
    const invStats = dueInvoiceStatsRes[0] || {};
    const dueAmount = Number(invStats.dueAmount || 0);
    const dueCount = Number(invStats.dueCount || 0);

    // Combine income metrics
    const incStats = incomeStatsRes[0] || {};
    let todayIncomeTotal = Number(incStats.todayIncome || 0) + todayPaymentTotal;
    let monthlyIncomeTotal = Number(incStats.monthlyIncome || 0) + monthlyCollection;

    // Extract expense metrics
    const expStats = expenseStatsRes[0] || {};
    const todayExpenseTotal = Number(expStats.todayExpenseTotal || 0);
    const monthlyExpenseTotal = Number(expStats.monthlyExpenseTotal || 0);

    // Calculate asset balances
    let totalCashBalance = 0;
    let totalBankBalance = 0;
    let totalWalletBalance = 0;

    assetAccounts.forEach(acc => {
      const nameStr = (acc.name || '').toLowerCase();
      if (nameStr.includes('cash') || acc.name === 'ক্যাশ' || (acc.name.includes('নগদ') && !nameStr.includes('nagad'))) {
        if (nameStr.includes('nagad') || acc.name === 'নগদ') {
          totalWalletBalance += acc.balance || 0;
        } else {
          totalCashBalance += acc.balance || 0;
        }
      } else if (
        nameStr.includes('bkash') || nameStr.includes('বিকাশ') ||
        nameStr.includes('rocket') || nameStr.includes('রকেট') ||
        nameStr.includes('upay') || nameStr.includes('উপায়') ||
        nameStr.includes('nagad') || acc.name === 'নগদ'
      ) {
        totalWalletBalance += acc.balance || 0;
      } else {
        totalBankBalance += acc.balance || 0;
      }
    });

    // Stage 2: Fetch recent activities in parallel
    const [recentEnrollments, recentAttendance, recentInvoices, recentNotices] = await Promise.all([
      StudentEnrollment.find(instFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
          path: 'student',
          populate: { path: 'user', select: 'firstName lastName fullName' }
        })
        .populate('classLevel', 'name'),
      StudentAttendance.find(instFilter)
        .sort({ date: -1 })
        .limit(3)
        .populate('classLevel', 'name'),
      Invoice.find(instFilter)
        .sort({ createdAt: -1 })
        .limit(3)
        .populate({
          path: 'student',
          populate: { path: 'user', select: 'firstName lastName fullName' }
        }),
      Notice.find(instFilter)
        .sort({ createdAt: -1 })
        .limit(3)
    ]);

    const activities = [];

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

    recentAttendance.forEach(att => {
      const className = att.classLevel ? att.classLevel.name : '';
      activities.push({
        text: `${className ? `${className} শ্রেণির ` : ''}উপস্থিতি চিহ্নিত করা হয়েছে`,
        date: att.createdAt || att.date,
        color: 'blue'
      });
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

    recentNotices.forEach(n => {
      activities.push({
        text: `নোটিশ প্রকাশিত: "${n.title}"`,
        date: n.createdAt,
        color: 'green'
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const sortedActivities = activities.slice(0, 5);

    ApiResponse.success(res, {
      stats: {
        totalStudents,
        activeStudents,
        totalTeachers,
        monthlyCollection,
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
