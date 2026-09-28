const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const StudentAttendance = require('../models/StudentAttendance');
const Exam = require('../models/Exam');
const MarkEntry = require('../models/MarkEntry');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const ClassLevel = require('../models/ClassLevel');
const ApiResponse = require('../utils/apiResponse');

// @desc    Aggregated reports summary
// @route   GET /api/v1/reports/summary
// @access  Private (users with can_view_reports)
exports.getSummary = async (req, res, next) => {
  const fs = require('fs');
  const log = (msg) => {
    try { fs.appendFileSync('C:\\Users\\Nazmul\\.gemini\\antigravity-ide\\brain\\87dd51c6-8e83-4392-aad8-4cfdb121e2fc\\get_summary_debug.txt', `${new Date().toISOString()} - ${msg}\n`); } catch(e) {}
  };
  try {
    log("Started getSummary");
    const instFilter = req.user.institution ? { institution: req.user.institution } : {};
    log(`instFilter: ${JSON.stringify(instFilter)}`);

    // ── Students ──────────────────────────────────────────────
    log("Querying totalStudents");
    const totalStudents = await Student.countDocuments({ ...instFilter, isDeleted: { $ne: true } });
    log(`totalStudents: ${totalStudents}`);
    log("Querying activeStudents");
    const activeStudents = await Student.countDocuments({ ...instFilter, status: 'active', isDeleted: { $ne: true } });
    log(`activeStudents: ${activeStudents}`);
    log("Querying inactiveStudents");
    const inactiveStudents = await Student.countDocuments({ ...instFilter, status: 'inactive', isDeleted: { $ne: true } });
    log(`inactiveStudents: ${inactiveStudents}`);
    log("Querying maleStudents");
    const maleStudents = await Student.countDocuments({ ...instFilter, gender: { $in: ['male', 'পুরুষ'] }, isDeleted: { $ne: true } });
    log(`maleStudents: ${maleStudents}`);
    log("Querying femaleStudents");
    const femaleStudents = await Student.countDocuments({ ...instFilter, gender: { $in: ['female', 'মহিলা'] }, isDeleted: { $ne: true } });
    log(`femaleStudents: ${femaleStudents}`);

    // Students per class
    log("Querying studentsByClass");
    const enrollments = await require('../models/StudentEnrollment').find({ ...instFilter, enrollmentStatus: 'active' })
      .populate('classLevel', 'name');
    const classCountMap = {};
    enrollments.forEach(e => {
      if (e.classLevel) {
        const idStr = e.classLevel._id ? e.classLevel._id.toString() : 'unknown';
        const name = e.classLevel.name || 'অজানা';
        if (!classCountMap[idStr]) classCountMap[idStr] = { className: name, count: 0 };
        classCountMap[idStr].count++;
      }
    });
    const studentsByClass = Object.keys(classCountMap).map(k => ({
      _id: { classId: k, className: classCountMap[k].className },
      count: classCountMap[k].count
    })).sort((a, b) => a._id.className.localeCompare(b._id.className));
    log(`studentsByClass count: ${studentsByClass.length}`);

    // ── Teachers ──────────────────────────────────────────────
    log("Querying teachers");
    const totalTeachers = await Teacher.countDocuments(instFilter);
    const activeTeachers = await Teacher.countDocuments({ ...instFilter, status: 'active' });
    const regularTeachers = await Teacher.countDocuments({ ...instFilter, teacherType: 'regular' });
    const hifzTeachers = await Teacher.countDocuments({ ...instFilter, teacherType: 'hifz' });
    log(`teachers count: total=${totalTeachers}, active=${activeTeachers}`);

    // ── Attendance ─────────────────────────────────────────────
    log("Querying attendance");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayAttendanceRecords = await StudentAttendance.find({
      date: { $gte: today, $lt: tomorrow }
    });
    const todayPresent = todayAttendanceRecords.filter(r => r.status === 'present').length;
    const todayAbsent = todayAttendanceRecords.filter(r => r.status === 'absent').length;
    const todayLate = todayAttendanceRecords.filter(r => r.status === 'late').length;
    const todayTotal = todayAttendanceRecords.length;
    log(`todayAttendance: total=${todayTotal}, present=${todayPresent}`);

    // This month attendance rate
    log("Querying monthAttendance");
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthAttendanceRecords = await StudentAttendance.find({
      date: { $gte: monthStart, $lt: tomorrow }
    });
    
    let mTotal = 0, mPresent = 0, mAbsent = 0, mLate = 0;
    monthAttendanceRecords.forEach(r => {
      mTotal++;
      if (r.status === 'present') mPresent++;
      else if (r.status === 'absent') mAbsent++;
      else if (r.status === 'late') mLate++;
    });
    const monthStats = { total: mTotal, present: mPresent, absent: mAbsent, late: mLate };
    log(`monthStats: total=${monthStats.total}, present=${monthStats.present}`);

    // ── Exams ──────────────────────────────────────────────────
    log("Querying exams");
    const totalExams = await Exam.countDocuments(instFilter);
    const upcomingExams = await Exam.countDocuments({ ...instFilter, status: 'upcoming' });
    const completedExams = await Exam.countDocuments({ ...instFilter, status: { $in: ['completed', 'published'] } });
    const ongoingExams = await Exam.countDocuments({ ...instFilter, status: 'ongoing' });
    log(`exams: total=${totalExams}`);

    // Grade distribution from all mark entries
    log("Querying gradeDistribution");
    const markEntries = await MarkEntry.find({});
    let gTotal = 0, gAvgSum = 0, passCount = 0, failCount = 0;
    let aPlus = 0, a = 0, aMinus = 0, b = 0, c = 0, d = 0;
    
    markEntries.forEach(m => {
      const marks = m.marksObtained || 0;
      gTotal++;
      gAvgSum += marks;
      if (marks >= 33) passCount++; else failCount++;
      
      if (marks >= 80) aPlus++;
      else if (marks >= 70) a++;
      else if (marks >= 60) aMinus++;
      else if (marks >= 50) b++;
      else if (marks >= 40) c++;
      else if (marks >= 33) d++;
    });
    const grades = {
      totalEntries: gTotal,
      avgMarks: gTotal > 0 ? (gAvgSum / gTotal) : 0,
      passCount, failCount, aPlus, a, aMinus, b, c, d
    };
    log(`grades: totalEntries=${grades.totalEntries}`);

    // ── Finance ────────────────────────────────────────────────
    log("Querying finance");
    const allInvoices = await Invoice.find({});
    let invoicedAmount = 0;
    allInvoices.forEach(inv => { invoicedAmount += Number(inv.totalAmount) || 0; });
    
    const allPayments = await Payment.find({ status: 'completed' });
    let paidAmount = 0;
    allPayments.forEach(p => { paidAmount += Number(p.amount) || 0; });
    
    const outstandingAmount = invoicedAmount - paidAmount;
    log(`finance: invoiced=${invoicedAmount}, paid=${paidAmount}`);

    // Recent exams list (up to 5)
    log("Querying recentExams");
    const recentExams = await Exam.find(instFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('classLevel', 'name');
    log(`recentExams: ${recentExams.length}`);

    const Institution = require('../models/Institution');
    let instRecord = null;
    try {
      if (req.user?.institution) {
        instRecord = await Institution.findOne({ where: { _id: req.user.institution } });
      }
      if (!instRecord) {
        instRecord = await Institution.findOne();
      }
    } catch (e) {}

    ApiResponse.success(res, {
      institution: {
        name: instRecord?.name || 'আন্-নূর ইসলামিক একাডেমি',
        branchName: instRecord?.branchName || 'প্রধান শাখা',
      },
      students: {
        total: totalStudents,
        active: activeStudents,
        inactive: inactiveStudents,
        male: maleStudents,
        female: femaleStudents,
        byClass: studentsByClass.map(s => ({
          className: s._id.className || 'অজানা',
          count: s.count
        }))
      },
      teachers: {
        total: totalTeachers,
        active: activeTeachers,
        regular: regularTeachers,
        hifz: hifzTeachers
      },
      attendance: {
        today: {
          total: todayTotal,
          present: todayPresent,
          absent: todayAbsent,
          late: todayLate,
          rate: todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0
        },
        thisMonth: {
          total: monthStats.total,
          present: monthStats.present,
          absent: monthStats.absent,
          late: monthStats.late,
          rate: monthStats.total > 0 ? Math.round((monthStats.present / monthStats.total) * 100) : 0
        }
      },
      exams: {
        total: totalExams,
        upcoming: upcomingExams,
        ongoing: ongoingExams,
        completed: completedExams,
        gradeDistribution: {
          totalEntries: grades.totalEntries,
          avgMarks: grades.avgMarks ? Math.round(grades.avgMarks * 10) / 10 : 0,
          passCount: grades.passCount,
          failCount: grades.failCount,
          aPlus: grades.aPlus,
          a: grades.a,
          aMinus: grades.aMinus,
          b: grades.b,
          c: grades.c,
          d: grades.d,
        },
        recent: recentExams
      },
      finance: {
        invoiced: invoicedAmount,
        paid: paidAmount,
        outstanding: outstandingAmount,
        collectionRate: invoicedAmount > 0 ? Math.round((paidAmount / invoicedAmount) * 100) : 0
      },
      generatedAt: new Date()
    });
  } catch (error) {
    try {
      fs.appendFileSync('C:\\Users\\Nazmul\\.gemini\\antigravity-ide\\brain\\87dd51c6-8e83-4392-aad8-4cfdb121e2fc\\get_summary_debug.txt', `${new Date().toISOString()} - ERROR in getSummary: ${error.message}\n${error.stack}\n`);
    } catch(e) {}
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Individual student attendance for a month
// @route   GET /api/v1/reports/student-attendance
// @access  Private
exports.getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId, month, year } = req.query;
    if (!studentId) return ApiResponse.error(res, 'ছাত্র আইডি প্রয়োজন', 400);

    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const records = await StudentAttendance.find({
      student: studentId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const summary = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, total: records.length };
    records.forEach(r => { if (summary[r.status] !== undefined) summary[r.status]++; });

    // Get student name
    const student = await Student.findById(studentId).populate('user', 'firstName lastName');

    ApiResponse.success(res, {
      student: student ? {
        _id: student._id,
        name: student.user ? `${student.user.firstName} ${student.user.lastName}` : 'অজানা',
        studentId: student.studentId
      } : null,
      month: m,
      year: y,
      records: records.map(r => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks
      })),
      summary
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Individual teacher attendance for a month
// @route   GET /api/v1/reports/teacher-attendance
// @access  Private
exports.getTeacherAttendance = async (req, res, next) => {
  try {
    const TeacherAttendance = require('../models/TeacherAttendance');
    const { teacherId, month, year } = req.query;
    if (!teacherId) return ApiResponse.error(res, 'শিক্ষক আইডি প্রয়োজন', 400);

    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const records = await TeacherAttendance.find({
      teacher: teacherId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const summary = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, total: records.length };
    records.forEach(r => { if (summary[r.status] !== undefined) summary[r.status]++; });

    const teacher = await Teacher.findById(teacherId).populate('user', 'firstName lastName');

    ApiResponse.success(res, {
      teacher: teacher ? {
        _id: teacher._id,
        name: teacher.user ? `${teacher.user.firstName} ${teacher.user.lastName}` : 'অজানা',
        employeeId: teacher.employeeId
      } : null,
      month: m,
      year: y,
      records: records.map(r => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks
      })),
      summary
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Individual student marks per exam
// @route   GET /api/v1/reports/student-marks
// @access  Private
exports.getStudentMarks = async (req, res, next) => {
  try {
    const { studentId, examId } = req.query;
    if (!studentId) return ApiResponse.error(res, 'ছাত্র আইডি প্রয়োজন', 400);

    const filter = { student: studentId };
    if (examId) filter.exam = examId;

    const marks = await MarkEntry.find(filter)
      .populate('exam', 'name startDate status')
      .populate('subject', 'name code')
      .sort({ 'exam.startDate': -1 });

    // Group by exam
    const examMap = {};
    marks.forEach(m => {
      const eid = m.exam?._id?.toString() || 'unknown';
      if (!examMap[eid]) {
        examMap[eid] = {
          exam: m.exam ? { _id: m.exam._id, name: m.exam.name, status: m.exam.status } : null,
          subjects: [],
          totalMarks: 0,
          totalObtained: 0
        };
      }
      examMap[eid].subjects.push({
        subject: m.subject ? { name: m.subject.name, code: m.subject.code } : { name: 'অজানা' },
        marksObtained: m.marksObtained,
        totalMarks: m.totalMarks,
        grade: m.grade,
        percentage: m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0
      });
      examMap[eid].totalMarks += m.totalMarks;
      examMap[eid].totalObtained += m.marksObtained;
    });

    const student = await Student.findById(studentId).populate('user', 'firstName lastName');

    ApiResponse.success(res, {
      student: student ? {
        _id: student._id,
        name: student.user ? `${student.user.firstName} ${student.user.lastName}` : 'অজানা',
        studentId: student.studentId
      } : null,
      examResults: Object.values(examMap).map(e => ({
        ...e,
        overallPercentage: e.totalMarks > 0 ? Math.round((e.totalObtained / e.totalMarks) * 100) : 0
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Get Financial Report (Overview & Month Breakdown)
// @route   GET /api/v1/reports/finance
// @access  Private
exports.getFinanceReport = async (req, res, next) => {
  try {
    const Income = require('../models/Income');
    const IncomeCategory = require('../models/IncomeCategory');
    const Voucher = require('../models/Voucher');
    const Invoice = require('../models/Invoice');
    const Payment = require('../models/Payment');
    const Account = require('../models/Account');
    const User = require('../models/User');
    const Student = require('../models/Student');
    const Institution = require('../models/Institution');
    const { Op } = require('sequelize');

    const institution = req.user.institution;
    const instFilter = institution ? { institution } : {};

    // Selected Month & Year
    const today = new Date();
    const queryMonth = req.query.month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [qYear, qMonth] = queryMonth.split('-').map(Number);

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const startOfMonth = new Date(qYear || today.getFullYear(), (qMonth ? qMonth - 1 : today.getMonth()), 1, 0, 0, 0);
    const endOfMonth = new Date(qYear || today.getFullYear(), (qMonth ? qMonth : today.getMonth() + 1), 0, 23, 59, 59, 999);
    const startOfYear = new Date(qYear || today.getFullYear(), 0, 1, 0, 0, 0);
    const endOfYear = new Date(qYear || today.getFullYear(), 11, 31, 23, 59, 59, 999);

    // 1. Parallel fetch of all required records safely
    const [
      otherIncomesRaw,
      incomeCategoriesRaw,
      paymentsRaw,
      vouchersRaw,
      accountsRaw,
      invoicesRaw,
      usersRaw,
      studentsRaw,
      instRecord
    ] = await Promise.all([
      Income.findAll({ where: { ...instFilter, status: 'approved' } }).catch(() => []),
      IncomeCategory.findAll({ where: instFilter }).catch(() => []),
      Payment.findAll({ where: { ...instFilter, status: 'success' } }).catch(() => []),
      Voucher.findAll({ where: { ...instFilter, status: 'approved' } }).catch(() => []),
      Account.findAll({ where: instFilter }).catch(() => []),
      Invoice.findAll({ where: { ...instFilter, status: { [Op.in]: ['unpaid', 'partial'] } } }).catch(() => []),
      User.findAll({ where: instFilter }).catch(() => []),
      Student.findAll({ where: { ...instFilter, isDeleted: { [Op.ne]: true } } }).catch(() => []),
      institution ? Institution.findOne({ where: { _id: institution } }).catch(() => null) : Institution.findOne().catch(() => null),
    ]);

    // Fast Lookup Maps
    const categoryMap = new Map();
    incomeCategoriesRaw.forEach(c => categoryMap.set(String(c._id), c));

    const accountMap = new Map();
    accountsRaw.forEach(a => accountMap.set(String(a._id), a));

    const userMap = new Map();
    usersRaw.forEach(u => userMap.set(String(u._id), u));

    const studentMap = new Map();
    studentsRaw.forEach(s => studentMap.set(String(s._id), s));

    // 2. Income Aggregations
    let todayIncome = 0;
    let monthIncome = 0;
    let yearIncome = 0;
    let totalLifetimeIncome = 0;
    let totalDonation = 0;
    let studentFeeIncome = 0;

    otherIncomesRaw.forEach(inc => {
      const date = new Date(inc.date || inc.createdAt);
      const amt = Number(inc.amount) || 0;
      totalLifetimeIncome += amt;

      const cat = categoryMap.get(String(inc.category));
      if (cat?.type === 'donation') {
        totalDonation += amt;
      }

      if (date >= startOfToday) todayIncome += amt;
      if (date >= startOfMonth && date <= endOfMonth) monthIncome += amt;
      if (date >= startOfYear && date <= endOfYear) yearIncome += amt;
    });

    const studentPaymentsMap = {};
    paymentsRaw.forEach(p => {
      const date = new Date(p.paymentDate || p.createdAt);
      const amt = Number(p.amount) || 0;
      totalLifetimeIncome += amt;
      studentFeeIncome += amt;

      if (date >= startOfToday) todayIncome += amt;
      if (date >= startOfMonth && date <= endOfMonth) monthIncome += amt;
      if (date >= startOfYear && date <= endOfYear) yearIncome += amt;

      // Group by Student Name
      const studentObj = studentMap.get(String(p.student));
      let sName = 'সাধারণ শিক্ষার্থী';
      if (studentObj) {
        const u = userMap.get(String(studentObj.user));
        sName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (studentObj.name || 'শিক্ষার্থী');
      }
      studentPaymentsMap[sName] = (studentPaymentsMap[sName] || 0) + amt;
    });

    // Top Paying Students
    const studentWise = Object.keys(studentPaymentsMap)
      .map(k => ({ student: k, totalPaid: studentPaymentsMap[k] }))
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 10);

    // 3. Expense Aggregations (Vouchers)
    let todayExpense = 0;
    let monthExpense = 0;
    let yearExpense = 0;
    let totalLifetimeExpense = 0;

    const categoryExpenseMap = {};
    const teacherSalaryMap = {};

    vouchersRaw.forEach(v => {
      const date = new Date(v.date || v.createdAt);
      const amt = Number(v.amount) || 0;
      totalLifetimeExpense += amt;

      if (date >= startOfToday) todayExpense += amt;
      if (date >= startOfMonth && date <= endOfMonth) monthExpense += amt;
      if (date >= startOfYear && date <= endOfYear) yearExpense += amt;

      // Expense Account details
      const expAcc = accountMap.get(String(v.expenseAccount));
      const accName = expAcc ? expAcc.name : 'অন্যান্য ব্যয়';
      categoryExpenseMap[accName] = (categoryExpenseMap[accName] || 0) + amt;

      // Teacher Salary Aggregation
      const isSalary = (expAcc && (expAcc.code === '5001' || expAcc.name.includes('বেতন') || expAcc.name.toLowerCase().includes('salary'))) ||
        (v.description && (v.description.includes('বেতন') || v.description.toLowerCase().includes('salary')));

      if (isSalary) {
        const payee = v.payeeName ? v.payeeName.trim() : 'অজানা শিক্ষক/স্টাফ';
        if (!teacherSalaryMap[payee]) {
          teacherSalaryMap[payee] = {
            teacher: payee,
            totalPaid: 0,
            monthPaid: 0,
            lastDate: date,
            voucherCount: 0
          };
        }
        teacherSalaryMap[payee].totalPaid += amt;
        teacherSalaryMap[payee].voucherCount++;
        if (date >= startOfMonth && date <= endOfMonth) {
          teacherSalaryMap[payee].monthPaid += amt;
        }
        if (date > new Date(teacherSalaryMap[payee].lastDate)) {
          teacherSalaryMap[payee].lastDate = date;
        }
      }
    });

    const teacherSalary = Object.values(teacherSalaryMap).sort((a, b) => b.totalPaid - a.totalPaid);

    // 4. Invoices / Total Dues
    const totalDues = invoicesRaw.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);

    ApiResponse.success(res, {
      institution: {
        name: instRecord?.name || 'আন্-নূর ইসলামিক একাডেমি',
        branchName: instRecord?.branchName || 'প্রধান শাখা',
      },
      selectedMonth: queryMonth,
      daily: { income: todayIncome, expense: todayExpense, surplus: todayIncome - todayExpense },
      monthly: { income: monthIncome, expense: monthExpense, surplus: monthIncome - monthExpense },
      yearly: { income: yearIncome, expense: yearExpense, surplus: yearIncome - yearExpense },
      lifetime: { income: totalLifetimeIncome, expense: totalLifetimeExpense, surplus: totalLifetimeIncome - totalLifetimeExpense },
      categoryExpense: Object.keys(categoryExpenseMap).map(k => ({ category: k, amount: categoryExpenseMap[k] })),
      totalDues,
      totalDonation,
      studentFeeIncome,
      studentWise,
      teacherSalary
    });
  } catch (error) {
    console.error('getFinanceReport error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Get Monthly Teacher & Staff Salary Sheet (Payroll)
// @route   GET /api/v1/reports/teacher-salary-sheet
// @access  Private
exports.getTeacherSalarySheet = async (req, res, next) => {
  try {
    const Teacher = require('../models/Teacher');
    const User = require('../models/User');
    const Voucher = require('../models/Voucher');
    const Account = require('../models/Account');
    const { Op } = require('sequelize');

    const institution = req.user.institution;
    const instFilter = institution ? { institution } : {};

    const today = new Date();
    const queryMonth = req.query.month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [qYear, qMonth] = queryMonth.split('-').map(Number);

    const startOfMonth = new Date(qYear, qMonth - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(qYear, qMonth, 0, 23, 59, 59, 999);

    // 1. Fetch Teachers & Staff Users
    const staffTypes = [
      'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher',
      'hifz_teacher', 'accountant', 'admission_officer', 'hostel_manager', 'library_manager', 'staff'
    ];

    const [teachersRaw, usersRaw, vouchersRaw, accountsRaw] = await Promise.all([
      Teacher.findAll({ where: instFilter }).catch(() => []),
      User.findAll({
        where: {
          ...instFilter,
          [Op.or]: [
            { userType: { [Op.in]: staffTypes } },
            { adminRole: { [Op.in]: ['co_super_admin', 'admin'] } }
          ]
        }
      }).catch(() => []),
      Voucher.findAll({
        where: {
          ...instFilter,
          status: 'approved',
          date: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      }).catch(() => []),
      Account.findAll({ where: instFilter }).catch(() => [])
    ]);

    const accountMap = new Map();
    accountsRaw.forEach(a => accountMap.set(String(a._id), a));

    // Combine Teachers and Staff into unified list
    const teacherMapByUser = new Map();
    teachersRaw.forEach(t => {
      if (t.user) teacherMapByUser.set(String(t.user), t);
    });

    const staffList = usersRaw.map(u => {
      const t = teacherMapByUser.get(String(u._id));
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
      const designation = t?.designation || u.designation || (
        u.userType === 'principal' ? 'প্রিন্সিপাল' :
          u.userType === 'vice_principal' ? 'ভাইস প্রিন্সিপাল' :
            u.userType === 'accountant' ? 'হিসাবরক্ষক' :
              u.userType === 'hifz_teacher' ? 'হিফজ শিক্ষক' :
                u.userType === 'teacher' ? 'শিক্ষক' : (u.adminRole || 'স্টাফ')
      );

      return {
        _id: u._id,
        teacherId: t?._id || null,
        name: fullName,
        designation,
        phone: u.phone || t?.phone || '—',
        userType: u.userType,
        baseSalary: Number(t?.baseSalary) || Number(u.baseSalary) || 0,
      };
    });

    // Match vouchers to each staff member for the selected month
    let totalSalaryPaid = 0;
    let paidCount = 0;

    const salarySheet = staffList.map(staff => {
      const staffNameLower = staff.name.toLowerCase();

      // Find vouchers for this staff
      const staffVouchers = vouchersRaw.filter(v => {
        const payee = (v.payeeName || '').toLowerCase().trim();
        const desc = (v.description || '').toLowerCase();
        const expAcc = accountMap.get(String(v.expenseAccount));
        const isSalaryAcc = expAcc && (expAcc.code === '5001' || expAcc.name.includes('বেতন') || expAcc.name.toLowerCase().includes('salary'));

        const nameMatch = payee.includes(staffNameLower) || staffNameLower.includes(payee) || desc.includes(staffNameLower);
        return nameMatch && (isSalaryAcc || desc.includes('বেতন') || payee.includes('বেতন'));
      });

      const paidAmount = staffVouchers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
      const isPaid = paidAmount > 0;
      if (isPaid) {
        paidCount++;
        totalSalaryPaid += paidAmount;
      }

      const lastVoucher = staffVouchers[staffVouchers.length - 1] || null;

      return {
        ...staff,
        paidAmount,
        status: isPaid ? 'paid' : 'unpaid',
        paymentDate: lastVoucher ? lastVoucher.date : null,
        paymentMethod: lastVoucher ? lastVoucher.paymentMethod : null,
        voucherNumber: lastVoucher ? lastVoucher.voucherNumber : null,
        voucherId: lastVoucher ? lastVoucher._id : null,
        vouchers: staffVouchers.map(v => ({
          _id: v._id,
          voucherNumber: v.voucherNumber,
          amount: v.amount,
          date: v.date,
          method: v.paymentMethod,
        }))
      };
    });

    ApiResponse.success(res, {
      month: queryMonth,
      stats: {
        totalStaff: staffList.length,
        paidCount,
        unpaidCount: staffList.length - paidCount,
        totalSalaryPaid,
      },
      salarySheet
    });
  } catch (error) {
    console.error('getTeacherSalarySheet error:', error);
    next(error);
  }
};

