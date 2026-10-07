const { Op } = require('sequelize');
const SalaryPayment = require('../models/SalaryPayment');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Voucher = require('../models/Voucher');
const Account = require('../models/Account');
const Advance = require('../models/Advance');
const TeacherAttendance = require('../models/TeacherAttendance');
const Institution = require('../models/Institution');
const ApiResponse = require('../utils/apiResponse');

// Helper to generate unique voucher number
async function generateVoucherNumber(institution) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `VCH-${dateStr}-`;
  const latest = await Voucher.findOne({
    where: {
      institution,
      voucherNumber: { [Op.like]: `${prefix}%` }
    },
    order: [['voucherNumber', 'DESC']]
  });

  let seq = 1;
  if (latest && latest.voucherNumber) {
    const parts = latest.voucherNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) seq = lastNum + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// Helper to convert number to words in Bengali
function numberToBanglaWords(num) {
  if (!num || isNaN(num)) return 'শূন্য টাকা মাত্র';
  const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ', 
    'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
    'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'ঊনত্রিশ', 'ত্রিশ',
    'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ',
    'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ',
    'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট',
    'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর',
    'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আঠাত্তর', 'ঊনআশি', 'আশি',
    'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'অষ্টআশি', 'ঊননব্বই', 'নব্বই',
    'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'];

  function convertChunk(n) {
    let res = '';
    if (n >= 10000000) {
      res += convertChunk(Math.floor(n / 10000000)) + ' কোটি ';
      n %= 10000000;
    }
    if (n >= 100000) {
      res += convertChunk(Math.floor(n / 100000)) + ' লক্ষ ';
      n %= 100000;
    }
    if (n >= 1000) {
      res += convertChunk(Math.floor(n / 1000)) + ' হাজার ';
      n %= 1000;
    }
    if (n >= 100) {
      res += units[Math.floor(n / 100)] + ' শত ';
      n %= 100;
    }
    if (n > 0) {
      res += units[Math.floor(n)] + ' ';
    }
    return res.trim();
  }

  const intPart = Math.floor(num);
  const words = convertChunk(intPart);
  return `${words} টাকা মাত্র`.replace(/\s+/g, ' ');
}

// ──────────────────────────────────────────────────────────────
// @desc    Get Salary Sheet for a Month (with Auto-Preview)
// @route   GET /api/v1/salary/sheet?month=YYYY-MM
// ──────────────────────────────────────────────────────────────
exports.getSalarySheet = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const instFilter = institution ? { [Op.or]: [{ institution }, { institution: null }] } : {};

    const today = new Date();
    const queryMonth = req.query.month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [qYear, qMonth] = queryMonth.split('-').map(Number);

    const startOfMonth = new Date(qYear, qMonth - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(qYear, qMonth, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(qYear, qMonth, 0).getDate();

    // 0. Ensure salary_payments table exists (safe if already exists)
    await SalaryPayment.sync({ alter: true }).catch(() => {});

    // 1. Load Existing SalaryPayment records for this month
    const existingRecords = await SalaryPayment.findAll({
      where: {
        ...instFilter,
        month: queryMonth,
      },
      order: [['createdAt', 'ASC']],
    });

    const existingMap = new Map();
    existingRecords.forEach(r => {
      existingMap.set(String(r.staffId), r);
    });

    // 2. Load all active staff & teachers
    const [teachersRaw, usersRaw, advancesRaw, attendancesRaw, accountsRaw] = await Promise.all([
      Teacher.findAll({ where: { ...instFilter, status: 'active' } }).catch(() => []),
      User.findAll({
        where: {
          ...instFilter,
          isActive: true,
          userType: { [Op.notIn]: ['student', 'guardian', 'parent'] },
        },
      }).catch(() => []),
      Advance.findAll({
        where: {
          ...instFilter,
          personType: 'staff',
          status: { [Op.in]: ['pending', 'partially_adjusted'] },
        },
      }).catch(() => []),
      TeacherAttendance.findAll({
        where: {
          ...instFilter,
          date: { [Op.between]: [startOfMonth, endOfMonth] },
          status: 'absent',
        },
      }).catch(() => []),
      Account.findAll({ where: { ...instFilter, isActive: true } }).catch(() => []),
    ]);

    // Build Advance Map: staffName -> pending balance
    const advanceMap = new Map();
    advancesRaw.forEach(adv => {
      const pName = (adv.personName || '').toLowerCase().trim();
      const pending = Math.max(0, (Number(adv.amount) || 0) - (Number(adv.adjustedAmount) || 0));
      if (pending > 0) {
        if (!advanceMap.has(pName)) {
          advanceMap.set(pName, { advanceId: adv._id, pendingAmount: 0 });
        }
        advanceMap.get(pName).pendingAmount += pending;
      }
    });

    // Build Attendance Map: teacherId/userId -> absentDays
    const absentCountMap = new Map();
    attendancesRaw.forEach(att => {
      const tKey = String(att.teacher);
      absentCountMap.set(tKey, (absentCountMap.get(tKey) || 0) + 1);
    });

    // Map Teachers by user ID
    const teacherMapByUser = new Map();
    teachersRaw.forEach(t => {
      if (t.user) teacherMapByUser.set(String(t.user), t);
    });

    // Compile active staff list
    const staffMap = new Map();

    usersRaw.forEach(u => {
      const t = teacherMapByUser.get(String(u._id));
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
      const designation = t?.designation || u.designation || (
        u.userType === 'principal' ? 'প্রিন্সিপাল' :
        u.userType === 'vice_principal' ? 'ভাইস প্রিন্সিপাল' :
        u.userType === 'accountant' ? 'হিসাবরক্ষক' :
        u.userType === 'hifz_teacher' ? 'হিফজ শিক্ষক' :
        u.userType === 'teacher' ? 'শিক্ষক' : (u.adminRole || 'স্টাফ')
      );

      staffMap.set(String(u._id), {
        staffId: String(u._id),
        teacherId: t ? String(t._id) : null,
        staffName: fullName,
        designation,
        phone: u.phone || t?.phone || '',
        userType: u.userType || 'teacher',
        baseSalary: Number(t?.baseSalary) || Number(u.baseSalary) || 0,
      });
    });

    teachersRaw.forEach(t => {
      const uId = t.user ? String(t.user) : null;
      if (!uId || !staffMap.has(uId)) {
        const tName = t.name || t.fullName || 'শিক্ষক';
        staffMap.set(String(t._id), {
          staffId: String(t._id),
          teacherId: String(t._id),
          staffName: tName,
          designation: t.designation || 'শিক্ষক',
          phone: t.phone || '',
          userType: 'teacher',
          baseSalary: Number(t.baseSalary) || 0,
        });
      }
    });

    // Construct final list merging saved records with drafts
    const records = [];
    let totalStaff = 0;
    let totalNetPayable = 0;
    let totalPaid = 0;
    let totalDue = 0;

    for (const [staffId, staff] of staffMap.entries()) {
      totalStaff++;
      const saved = existingMap.get(staffId);

      const nameLower = staff.staffName.toLowerCase().trim();
      const advInfo = advanceMap.get(nameLower) || { advanceId: null, pendingAmount: 0 };
      const absentDays = absentCountMap.get(staffId) || (staff.teacherId ? absentCountMap.get(staff.teacherId) : 0) || 0;

      if (saved) {
        const sObj = saved.toJSON ? saved.toJSON() : saved;
        totalNetPayable += Number(sObj.netSalary) || 0;
        totalPaid += Number(sObj.paidAmount) || 0;
        totalDue += Number(sObj.dueAmount) || 0;

        records.push({
          ...sObj,
          isDraft: false,
          pendingAdvance: advInfo.pendingAmount,
          availableAdvanceId: advInfo.advanceId,
        });
      } else {
        // Compute suggested draft values
        const base = Number(staff.baseSalary) || 0;
        const perDayRate = daysInMonth > 0 ? (base / daysInMonth) : 0;
        const suggestedAbsentDeduction = Math.round(absentDays * perDayRate);
        const totalAllowance = 0;
        const totalDeduction = suggestedAbsentDeduction;
        const netSalary = Math.max(0, base - totalDeduction);

        totalNetPayable += netSalary;
        totalDue += netSalary;

        records.push({
          _id: `draft-${staffId}`,
          institution: institution || '',
          month: queryMonth,
          staffId,
          teacherId: staff.teacherId,
          staffName: staff.staffName,
          designation: staff.designation,
          phone: staff.phone,
          userType: staff.userType,
          baseSalary: base,
          houseRent: 0,
          medicalAllowance: 0,
          transportAllowance: 0,
          festivalBonus: 0,
          specialAllowance: 0,
          totalAllowance: 0,
          absentDays,
          absentDeduction: suggestedAbsentDeduction,
          advanceDeduction: 0,
          advanceId: advInfo.advanceId,
          providentFund: 0,
          otherDeduction: 0,
          totalDeduction,
          netSalary,
          paidAmount: 0,
          dueAmount: netSalary,
          status: 'unpaid',
          isDraft: true,
          pendingAdvance: advInfo.pendingAmount,
          availableAdvanceId: advInfo.advanceId,
        });
      }
    }

    const { enrichWithUsers } = require('../utils/userEnricher');
    const enrichedRecords = await enrichWithUsers(records, ['disbursedBy']);

    // Chart of Accounts helpers:
    // Salary expense account (code 5001 or name includes বেতন/salary)
    const salaryAccount = accountsRaw.find(a => 
      a.code === '5001' || 
      (a.type === 'Expense' && (a.name.includes('বেতন') || a.name.toLowerCase().includes('salary')))
    ) || accountsRaw.find(a => a.type === 'Expense') || null;

    // Fund accounts (type: 'Asset' like Cash in Hand, Bank Accounts, etc.)
    const fundAccounts = accountsRaw.filter(a => a.type === 'Asset');

    ApiResponse.success(res, {
      month: queryMonth,
      stats: {
        totalStaff,
        totalNetPayable: Math.round(totalNetPayable),
        totalPaid: Math.round(totalPaid),
        totalDue: Math.round(totalDue),
      },
      records: enrichedRecords,
      salaryAccount: salaryAccount ? { _id: salaryAccount._id, name: salaryAccount.name, code: salaryAccount.code } : null,
      fundAccounts: fundAccounts.map(f => ({ _id: f._id, name: f.name, code: f.code, balance: f.balance })),
    });
  } catch (error) {
    console.error('getSalarySheet error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Generate / Bulk Upsert Monthly Salary Records
// @route   POST /api/v1/salary/generate
// ──────────────────────────────────────────────────────────────
exports.generateSalarySheet = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { month, overwrite = false } = req.body;

    if (!month) {
      return ApiResponse.error(res, 'মাস (Month YYYY-MM) প্রদান করা আবশ্যক', 400);
    }

    const [qYear, qMonth] = month.split('-').map(Number);
    const startOfMonth = new Date(qYear, qMonth - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(qYear, qMonth, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(qYear, qMonth, 0).getDate();

    const instFilter = institution ? { [Op.or]: [{ institution }, { institution: null }] } : {};

    // Ensure table exists
    await SalaryPayment.sync({ alter: true }).catch(() => {});

    const [teachersRaw, usersRaw, attendancesRaw] = await Promise.all([
      Teacher.findAll({ where: { ...instFilter, status: 'active' } }),
      User.findAll({
        where: {
          ...instFilter,
          isActive: true,
          userType: { [Op.notIn]: ['student', 'guardian', 'parent'] },
        },
      }),
      TeacherAttendance.findAll({
        where: {
          ...instFilter,
          date: { [Op.between]: [startOfMonth, endOfMonth] },
          status: 'absent',
        },
      }),
    ]);

    const absentCountMap = new Map();
    attendancesRaw.forEach(att => {
      const tKey = String(att.teacher);
      absentCountMap.set(tKey, (absentCountMap.get(tKey) || 0) + 1);
    });

    const teacherMapByUser = new Map();
    teachersRaw.forEach(t => {
      if (t.user) teacherMapByUser.set(String(t.user), t);
    });

    const staffList = [];
    usersRaw.forEach(u => {
      const t = teacherMapByUser.get(String(u._id));
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
      const designation = t?.designation || u.designation || (u.adminRole || 'স্টাফ');
      staffList.push({
        staffId: String(u._id),
        teacherId: t ? String(t._id) : null,
        staffName: fullName,
        designation,
        phone: u.phone || t?.phone || '',
        userType: u.userType || 'teacher',
        baseSalary: Number(t?.baseSalary) || Number(u.baseSalary) || 0,
      });
    });

    teachersRaw.forEach(t => {
      const uId = t.user ? String(t.user) : null;
      if (!uId || !staffList.some(s => s.staffId === uId)) {
        staffList.push({
          staffId: String(t._id),
          teacherId: String(t._id),
          staffName: t.name || t.fullName || 'শিক্ষক',
          designation: t.designation || 'শিক্ষক',
          phone: t.phone || '',
          userType: 'teacher',
          baseSalary: Number(t.baseSalary) || 0,
        });
      }
    });

    let generatedCount = 0;
    for (const staff of staffList) {
      const existing = await SalaryPayment.findOne({
        where: {
          institution: institution || '',
          month,
          staffId: staff.staffId,
        },
      });

      if (existing && !overwrite) {
        continue;
      }

      const base = staff.baseSalary || 0;
      const absentDays = absentCountMap.get(staff.staffId) || (staff.teacherId ? absentCountMap.get(staff.teacherId) : 0) || 0;
      const perDayRate = daysInMonth > 0 ? (base / daysInMonth) : 0;
      const suggestedAbsentDeduction = Math.round(absentDays * perDayRate);
      const totalDeduction = suggestedAbsentDeduction;
      const netSalary = Math.max(0, base - totalDeduction);

      if (existing && overwrite && existing.status !== 'paid') {
        await existing.update({
          staffName: staff.staffName,
          designation: staff.designation,
          phone: staff.phone,
          baseSalary: base,
          absentDays,
          absentDeduction: suggestedAbsentDeduction,
          totalDeduction,
          netSalary,
          dueAmount: Math.max(0, netSalary - Number(existing.paidAmount || 0)),
        });
        generatedCount++;
      } else if (!existing) {
        await SalaryPayment.create({
          institution: institution || '',
          month,
          staffId: staff.staffId,
          teacherId: staff.teacherId,
          staffName: staff.staffName,
          designation: staff.designation,
          phone: staff.phone,
          userType: staff.userType,
          baseSalary: base,
          houseRent: 0,
          medicalAllowance: 0,
          transportAllowance: 0,
          festivalBonus: 0,
          specialAllowance: 0,
          totalAllowance: 0,
          absentDays,
          absentDeduction: suggestedAbsentDeduction,
          advanceDeduction: 0,
          providentFund: 0,
          otherDeduction: 0,
          totalDeduction,
          netSalary,
          paidAmount: 0,
          dueAmount: netSalary,
          status: 'unpaid',
        });
        generatedCount++;
      }
    }

    ApiResponse.success(res, {
      message: `${month} মাসের বেতন শিট সফলভাবে আপডেট করা হয়েছে`,
      generatedCount,
    });
  } catch (error) {
    console.error('generateSalarySheet error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Update Allowances, Deductions & Salary Details
// @route   PUT /api/v1/salary/:id
// ──────────────────────────────────────────────────────────────
exports.updateSalaryRecord = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { id } = req.params;
    await SalaryPayment.sync({ alter: true }).catch(() => {});
    let salary = await SalaryPayment.findOne({
      where: { _id: id, institution: institution || '' },
    });

    // If updating a draft, create it first
    if (!salary && id.startsWith('draft-')) {
      const staffId = id.replace('draft-', '');
      const {
        month, staffName, designation, phone, userType, teacherId
      } = req.body;

      salary = await SalaryPayment.create({
        institution: institution || '',
        month: month || new Date().toISOString().slice(0, 7),
        staffId,
        teacherId: teacherId || null,
        staffName: staffName || 'কর্মী',
        designation: designation || 'স্টাফ',
        phone: phone || '',
        userType: userType || 'teacher',
        baseSalary: Number(req.body.baseSalary) || 0,
        netSalary: Number(req.body.baseSalary) || 0,
        dueAmount: Number(req.body.baseSalary) || 0,
        status: 'unpaid',
      });
    }

    if (!salary) {
      return ApiResponse.notFound(res, 'বেতন রেকর্ড পাওয়া যায়নি');
    }

    const {
      baseSalary = salary.baseSalary,
      houseRent = salary.houseRent,
      medicalAllowance = salary.medicalAllowance,
      transportAllowance = salary.transportAllowance,
      festivalBonus = salary.festivalBonus,
      specialAllowance = salary.specialAllowance,
      absentDays = salary.absentDays,
      absentDeduction = salary.absentDeduction,
      advanceDeduction = salary.advanceDeduction,
      advanceId = salary.advanceId,
      providentFund = salary.providentFund,
      otherDeduction = salary.otherDeduction,
      notes = salary.notes,
    } = req.body;

    const base = Number(baseSalary) || 0;
    const hRent = Number(houseRent) || 0;
    const med = Number(medicalAllowance) || 0;
    const trans = Number(transportAllowance) || 0;
    const fest = Number(festivalBonus) || 0;
    const spec = Number(specialAllowance) || 0;
    const totalAllowance = hRent + med + trans + fest + spec;

    const absDed = Number(absentDeduction) || 0;
    const advDed = Number(advanceDeduction) || 0;
    const pf = Number(providentFund) || 0;
    const othDed = Number(otherDeduction) || 0;
    const totalDeduction = absDed + advDed + pf + othDed;

    const netSalary = Math.max(0, (base + totalAllowance) - totalDeduction);
    const paidAmount = Number(salary.paidAmount) || 0;
    const dueAmount = Math.max(0, netSalary - paidAmount);
    const status = dueAmount === 0 && netSalary > 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

    await salary.update({
      baseSalary: base,
      houseRent: hRent,
      medicalAllowance: med,
      transportAllowance: trans,
      festivalBonus: fest,
      specialAllowance: spec,
      totalAllowance,
      absentDays: Number(absentDays) || 0,
      absentDeduction: absDed,
      advanceDeduction: advDed,
      advanceId: advanceId || null,
      providentFund: pf,
      otherDeduction: othDed,
      totalDeduction,
      netSalary,
      dueAmount,
      status,
      notes,
    });

    ApiResponse.success(res, {
      message: 'বেতন ও ভাতার বিবরণ সফলভাবে সংরক্ষণ করা হয়েছে',
      salary,
    });
  } catch (error) {
    console.error('updateSalaryRecord error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Disburse Salary (Single Payment) & Create Voucher
// @route   POST /api/v1/salary/pay
// ──────────────────────────────────────────────────────────────
exports.paySalary = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const {
      salaryId,
      amount,
      paymentMethod = 'cash',
      fundAccountId,
      paymentDate = new Date(),
      notes,
    } = req.body;

    if (!salaryId || !fundAccountId || !amount || Number(amount) <= 0) {
      return ApiResponse.error(res, 'বেতন রেকর্ড, ফান্ড অ্যাকাউন্ট এবং সঠিক টাকার পরিমাণ প্রদান করুন', 400);
    }

    let salary = await SalaryPayment.findOne({
      where: { _id: salaryId, institution: institution || '' },
    });

    // If paying a draft, create record first
    if (!salary && salaryId.startsWith('draft-')) {
      const staffId = salaryId.replace('draft-', '');
      const { month, staffName, designation, phone, userType, teacherId, baseSalary } = req.body;
      const bSal = Number(baseSalary) || Number(amount);

      salary = await SalaryPayment.create({
        institution: institution || '',
        month: month || new Date().toISOString().slice(0, 7),
        staffId,
        teacherId: teacherId || null,
        staffName: staffName || 'কর্মী',
        designation: designation || 'স্টাফ',
        phone: phone || '',
        userType: userType || 'teacher',
        baseSalary: bSal,
        netSalary: bSal,
        dueAmount: bSal,
        status: 'unpaid',
      });
    }

    if (!salary) {
      return ApiResponse.notFound(res, 'বেতন রেকর্ড পাওয়া যায়নি');
    }

    // 1. Locate Chart of Accounts Salary Expense Account (Code 5001)
    let salaryAccount = await Account.findOne({
      where: {
        code: '5001',
        institution: { [Op.or]: [institution, null] },
      },
    });

    if (!salaryAccount) {
      salaryAccount = await Account.findOne({
        where: {
          type: 'Expense',
          name: { [Op.like]: '%বেতন%' },
          institution: { [Op.or]: [institution, null] },
        },
      });
    }

    // Fallback if not found
    if (!salaryAccount) {
      salaryAccount = await Account.create({
        institution: institution || '',
        name: 'শিক্ষক ও কর্মচারীদের বেতন ও ভাতা',
        code: '5001',
        type: 'Expense',
        isActive: true,
      });
    }

    // 2. Generate unique voucher number & create approved Voucher
    const voucherNumber = await generateVoucherNumber(institution || '');
    const voucher = await Voucher.create({
      institution: institution || '',
      voucherNumber,
      date: new Date(paymentDate),
      payeeName: salary.staffName,
      expenseAccount: salaryAccount._id,
      fundAccount: fundAccountId,
      amount: Number(amount),
      paymentMethod,
      description: `${salary.staffName} - ${salary.month} মাসের বেতন${notes ? ` (${notes})` : ''}`,
      status: 'approved',
      approvalLevel: 2,
      preparedBy: req.user._id,
      approvedBy: req.user._id,
    });

    // 3. Update Fund Account balance (Subtract disbursed amount)
    const fundAcc = await Account.findOne({ where: { _id: fundAccountId } });
    if (fundAcc) {
      const currentBal = Number(fundAcc.balance) || 0;
      await fundAcc.update({ balance: currentBal - Number(amount) });
    }

    // 4. Update Advance Adjustment if advance deduction was specified
    if (Number(salary.advanceDeduction) > 0 && salary.advanceId) {
      const adv = await Advance.findOne({ where: { _id: salary.advanceId } });
      if (adv) {
        const newAdj = (Number(adv.adjustedAmount) || 0) + Number(salary.advanceDeduction);
        const isFullyAdj = newAdj >= Number(adv.amount);
        await adv.update({
          adjustedAmount: newAdj,
          status: isFullyAdj ? 'adjusted' : 'partially_adjusted',
        });
      }
    }

    // 5. Update SalaryPayment record
    const newPaidAmount = (Number(salary.paidAmount) || 0) + Number(amount);
    const newDueAmount = Math.max(0, Number(salary.netSalary) - newPaidAmount);
    const newStatus = newDueAmount <= 0 ? 'paid' : 'partial';

    await salary.update({
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      status: newStatus,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      fundAccountId,
      voucherId: voucher._id,
      voucherNumber: voucher.voucherNumber,
      notes: notes || salary.notes,
      disbursedBy: req.user._id,
    });

    ApiResponse.success(res, {
      message: `${salary.staffName}-এর বেতন সফলভাবে পরিশোধ করা হয়েছে এবং ভাউচার (${voucher.voucherNumber}) তৈরি হয়েছে`,
      salary,
      voucher,
    });
  } catch (error) {
    console.error('paySalary error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Bulk Disburse Salaries for All or Selected Staff
// @route   POST /api/v1/salary/bulk-pay
// ──────────────────────────────────────────────────────────────
exports.bulkPaySalary = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const {
      month,
      salaryIds = [],
      fundAccountId,
      paymentMethod = 'cash',
      paymentDate = new Date(),
    } = req.body;

    if (!fundAccountId) {
      return ApiResponse.error(res, 'তহবিল (Fund Account) নির্বাচন করুন', 400);
    }

    // Find target salaries
    const where = {
      institution: institution || '',
      status: { [Op.ne]: 'paid' },
    };

    if (month) where.month = month;
    if (salaryIds.length > 0) where._id = { [Op.in]: salaryIds };

    const unpaidSalaries = await SalaryPayment.findAll({ where });

    if (unpaidSalaries.length === 0) {
      return ApiResponse.error(res, 'পরিশোধ করার মতো কোনো বকেয়া বেতন পাওয়া যায়নি', 400);
    }

    let salaryAccount = await Account.findOne({
      where: {
        code: '5001',
        institution: { [Op.or]: [institution, null] },
      },
    });
    if (!salaryAccount) {
      salaryAccount = await Account.findOne({
        where: { type: 'Expense', name: { [Op.like]: '%বেতন%' } },
      });
    }

    let totalPaidBulk = 0;
    let successCount = 0;

    for (const sal of unpaidSalaries) {
      const payable = Number(sal.dueAmount) || (Number(sal.netSalary) - Number(sal.paidAmount || 0));
      if (payable <= 0) continue;

      const vchNum = await generateVoucherNumber(institution || '');
      const voucher = await Voucher.create({
        institution: institution || '',
        voucherNumber: vchNum,
        date: new Date(paymentDate),
        payeeName: sal.staffName,
        expenseAccount: salaryAccount ? salaryAccount._id : fundAccountId,
        fundAccount: fundAccountId,
        amount: payable,
        paymentMethod,
        description: `${sal.staffName} - ${sal.month} মাসের এককালীন বেতন পরিশোধ`,
        status: 'approved',
        approvalLevel: 2,
        preparedBy: req.user._id,
        approvedBy: req.user._id,
      });

      // Update advance if applied
      if (Number(sal.advanceDeduction) > 0 && sal.advanceId) {
        const adv = await Advance.findOne({ where: { _id: sal.advanceId } });
        if (adv) {
          const newAdj = (Number(adv.adjustedAmount) || 0) + Number(sal.advanceDeduction);
          await adv.update({
            adjustedAmount: newAdj,
            status: newAdj >= Number(adv.amount) ? 'adjusted' : 'partially_adjusted',
          });
        }
      }

      await sal.update({
        paidAmount: (Number(sal.paidAmount) || 0) + payable,
        dueAmount: 0,
        status: 'paid',
        paymentDate: new Date(paymentDate),
        paymentMethod,
        fundAccountId,
        voucherId: voucher._id,
        voucherNumber: voucher.voucherNumber,
        disbursedBy: req.user._id,
      });

      totalPaidBulk += payable;
      successCount++;
    }

    // Deduct total from fund account
    const fundAcc = await Account.findOne({ where: { _id: fundAccountId } });
    if (fundAcc) {
      const currentBal = Number(fundAcc.balance) || 0;
      await fundAcc.update({ balance: currentBal - totalPaidBulk });
    }

    ApiResponse.success(res, {
      message: `সর্বমোট ${successCount} জন কর্মীর বেতন (মোট ৳${totalPaidBulk.toLocaleString('bn-BD')}) সফলভাবে পরিশোধ করা হয়েছে`,
      successCount,
      totalPaidBulk,
    });
  } catch (error) {
    console.error('bulkPaySalary error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Get Detailed Printable Payslip Data
// @route   GET /api/v1/salary/payslip/:id
// ──────────────────────────────────────────────────────────────
exports.getPayslip = async (req, res, next) => {
  try {
    const institutionId = req.user.institution;
    const { id } = req.params;

    const salary = await SalaryPayment.findOne({
      where: { _id: id, institution: institutionId || '' },
    });

    if (!salary) {
      return ApiResponse.notFound(res, 'বেতন রেকর্ড পাওয়া যায়নি');
    }

    const inst = await Institution.findOne({
      where: { _id: institutionId },
    }).catch(() => null);

    const salaryJson = salary.toJSON ? salary.toJSON() : { ...salary };
    if (salaryJson.disbursedBy) {
      const { getUserMap } = require('../utils/userEnricher');
      const userMap = await getUserMap([salaryJson.disbursedBy]);
      if (userMap[String(salaryJson.disbursedBy)]) {
        salaryJson.disbursedByUser = userMap[String(salaryJson.disbursedBy)];
      }
    }

    const payslipData = {
      institution: {
        name: inst?.name || 'আন্-নূর ইসলামিক একাডেমি',
        address: inst?.address || 'মাদানি এভিনিউ, ঢাকা',
        phone: inst?.phone || '০১৭xxxxxxxx',
        email: inst?.email || '',
        logo: inst?.logo || '',
      },
      salary: salaryJson,
      netSalaryInWords: numberToBanglaWords(Number(salary.netSalary)),
      paidAmountInWords: numberToBanglaWords(Number(salary.paidAmount)),
    };

    ApiResponse.success(res, payslipData);
  } catch (error) {
    console.error('getPayslip error:', error);
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// @desc    Delete Unpaid Draft Salary Record
// @route   DELETE /api/v1/salary/:id
// ──────────────────────────────────────────────────────────────
exports.deleteSalaryRecord = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { id } = req.params;

    const salary = await SalaryPayment.findOne({
      where: { _id: id, institution: institution || '' },
    });

    if (!salary) {
      return ApiResponse.notFound(res, 'রেকর্ড পাওয়া যায়নি');
    }

    if (salary.status === 'paid' || Number(salary.paidAmount) > 0) {
      return ApiResponse.error(res, 'পরিশোধিত বেতন রেকর্ড মুছে ফেলা সম্ভব নয়', 400);
    }

    await salary.destroy();
    ApiResponse.success(res, { message: 'বেতন রেকর্ড মুছে ফেলা হয়েছে' });
  } catch (error) {
    console.error('deleteSalaryRecord error:', error);
    next(error);
  }
};
