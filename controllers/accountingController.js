const { Op } = require('sequelize');
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const ApiResponse = require('../utils/apiResponse');
const auditLogger = require('./auditLogController');

// --- Chart of Accounts ---

// @desc    Get all accounts
// @route   GET /api/v1/accounting/accounts
exports.getAccounts = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    if (req.query.type) {
      filter.type = req.query.type;
    }

    let accounts = await Account.find(filter).sort({ code: 1, name: 1 });

    let seededNew = false;

    // Auto-seed default asset accounts (Bank & Digital Wallets) if none exist
    const assetCount = await Account.countDocuments({ institution: req.user.institution, type: 'Asset' });
    if (assetCount === 0) {
      const defaultAssets = [
        { name: 'নগদ (Cash)', code: '1001', type: 'Asset' },
        { name: 'সোনালী ব্যাংক (Bank)', code: '1002', type: 'Asset' },
        { name: 'বিকাশ (bKash)', code: '1003', type: 'Asset' },
        { name: 'নগদ (Nagad)', code: '1004', type: 'Asset' },
        { name: 'রকেট (Rocket)', code: '1005', type: 'Asset' }
      ];
      
      for (const asset of defaultAssets) {
        await Account.create({
          institution: req.user.institution,
          name: asset.name,
          code: asset.code,
          type: asset.type,
          balance: 0,
          isActive: true
        });
      }
      seededNew = true;
    }

    // Auto-seed default revenue accounts (Income heads) if none exist
    const revenueCount = await Account.countDocuments({ institution: req.user.institution, type: 'Revenue' });
    if (revenueCount === 0) {
      const defaultRevenues = [
        { name: 'শিক্ষার্থী মাসিক বেতন আয় (Tuition Fee)', code: '4001', type: 'Revenue' },
        { name: 'ভর্তি ও সেশন ফি আয় (Admission & Session)', code: '4002', type: 'Revenue' },
        { name: 'পরীক্ষা ফি আয় (Exam Fee)', code: '4003', type: 'Revenue' },
        { name: 'বই-খাতা ও শিক্ষা উপকরণ ফি (Books & Supplies)', code: '4004', type: 'Revenue' },
        { name: 'দান ও সদকা তহবিল (Donation / Sadaqah)', code: '4005', type: 'Revenue' },
        { name: 'বিবিধ সাধারণ আয় (Miscellaneous Income)', code: '4006', type: 'Revenue' }
      ];

      for (const rev of defaultRevenues) {
        await Account.create({
          institution: req.user.institution,
          name: rev.name,
          code: rev.code,
          type: rev.type,
          balance: 0,
          isActive: true
        });
      }
      seededNew = true;
    }

    // Auto-seed default expense accounts (Expense heads) if none exist
    const expenseCount = await Account.countDocuments({ institution: req.user.institution, type: 'Expense' });
    if (expenseCount === 0) {
      const defaultExpenses = [
        { name: 'শিক্ষক ও স্টাফ বেতন-ভাতা (Salary & Allowance)', code: '5001', type: 'Expense' },
        { name: 'বই-খাতা ও শিক্ষা উপকরণ ক্রয় (Books & Educational Supplies)', code: '5002', type: 'Expense' },
        { name: 'মুদ্রণ ও স্টেশনারি খরচ (Printing & Stationery)', code: '5003', type: 'Expense' },
        { name: 'বিদ্যুৎ, গ্যাস ও পানি বিল (Utility Bills)', code: '5004', type: 'Expense' },
        { name: 'লিল্লাহ বোর্ডিং ও মেস খাদ্য খরচ (Food & Mess)', code: '5005', type: 'Expense' },
        { name: 'ভবন সংস্কার ও রক্ষণাবেক্ষণ (Building Maintenance)', code: '5006', type: 'Expense' },
        { name: 'অফিস ও বিবিধ প্রশাসনিক খরচ (Office & Admin)', code: '5007', type: 'Expense' },
        { name: 'যাতায়াত ও পরিবহন খরচ (Travel & Conveyance)', code: '5008', type: 'Expense' },
        { name: 'শিক্ষক নাস্তা ও আপ্যায়ন খরচ (Entertainment & Snacks)', code: '5009', type: 'Expense' },
      ];

      for (const exp of defaultExpenses) {
        await Account.create({
          institution: req.user.institution,
          name: exp.name,
          code: exp.code,
          type: exp.type,
          balance: 0,
          isActive: true
        });
      }
      seededNew = true;
    }

    if (seededNew) {
      accounts = await Account.find(filter).sort({ code: 1, name: 1 });
    }

    ApiResponse.success(res, { accounts });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed default accounts (Assets, Revenues, Expenses)
// @route   POST /api/v1/accounting/accounts/seed-defaults
exports.seedDefaultAccounts = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const defaultAssets = [
      { name: 'নগদ (Cash)', code: '1001', type: 'Asset' },
      { name: 'সোনালী ব্যাংক (Bank)', code: '1002', type: 'Asset' },
      { name: 'বিকাশ (bKash)', code: '1003', type: 'Asset' },
      { name: 'নগদ (Nagad)', code: '1004', type: 'Asset' },
      { name: 'রকেট (Rocket)', code: '1005', type: 'Asset' }
    ];

    const defaultRevenues = [
      { name: 'শিক্ষার্থী মাসিক বেতন আয় (Tuition Fee)', code: '4001', type: 'Revenue' },
      { name: 'ভর্তি ও সেশন ফি আয় (Admission & Session)', code: '4002', type: 'Revenue' },
      { name: 'পরীক্ষা ফি আয় (Exam Fee)', code: '4003', type: 'Revenue' },
      { name: 'বই-খাতা ও শিক্ষা উপকরণ ফি (Books & Supplies)', code: '4004', type: 'Revenue' },
      { name: 'দান ও সদকা তহবিল (Donation / Sadaqah)', code: '4005', type: 'Revenue' },
      { name: 'বিবিধ সাধারণ আয় (Miscellaneous Income)', code: '4006', type: 'Revenue' }
    ];

    const defaultExpenses = [
      { name: 'শিক্ষক ও স্টাফ বেতন-ভাতা (Salary & Allowance)', code: '5001', type: 'Expense' },
      { name: 'বই-খাতা ও শিক্ষা উপকরণ ক্রয় (Books & Educational Supplies)', code: '5002', type: 'Expense' },
      { name: 'মুদ্রণ ও স্টেশনারি খরচ (Printing & Stationery)', code: '5003', type: 'Expense' },
      { name: 'বিদ্যুৎ, গ্যাস ও পানি বিল (Utility Bills)', code: '5004', type: 'Expense' },
      { name: 'লিল্লাহ বোর্ডিং ও মেস খাদ্য খরচ (Food & Mess)', code: '5005', type: 'Expense' },
      { name: 'ভবন সংস্কার ও রক্ষণাবেক্ষণ (Building Maintenance)', code: '5006', type: 'Expense' },
      { name: 'অফিস ও বিবিধ প্রশাসনিক খরচ (Office & Admin)', code: '5007', type: 'Expense' },
      { name: 'যাতায়াত ও পরিবহন খরচ (Travel & Conveyance)', code: '5008', type: 'Expense' },
      { name: 'শিক্ষক নাস্তা ও আপ্যায়ন খরচ (Entertainment & Snacks)', code: '5009', type: 'Expense' },
    ];

    let createdCount = 0;
    for (const acc of [...defaultAssets, ...defaultRevenues, ...defaultExpenses]) {
      const exists = await Account.findOne({ institution, code: acc.code });
      if (!exists) {
        await Account.create({
          institution,
          name: acc.name,
          code: acc.code,
          type: acc.type,
          balance: 0,
          isActive: true
        });
        createdCount++;
      }
    }

    const accounts = await Account.find({ institution }).sort({ code: 1, name: 1 });
    ApiResponse.success(res, { message: `${createdCount} টি ডিফল্ট একাউন্ট যুক্ত করা হয়েছে`, accounts });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new account
// @route   POST /api/v1/accounting/accounts
exports.createAccount = async (req, res, next) => {
  try {
    const { name, code, type, balance } = req.body;
    
    const existing = await Account.findOne({ code, institution: req.user.institution });
    if (existing) {
      return ApiResponse.error(res, 'এই কোডের একটি একাউন্ট ইতিমধ্যে বিদ্যমান', 400);
    }

    const account = await Account.create({
      institution: req.user.institution,
      name,
      code,
      type,
      balance: balance || 0,
      isActive: true
    });

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'create',
      'Account',
      account._id,
      `নতুন হিসাব খাত (Account) তৈরি করা হয়েছে: ${name} (${code})`,
      null,
      account
    );

    ApiResponse.created(res, { account }, 'একাউন্ট সফলভাবে তৈরি করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Update account
// @route   PUT /api/v1/accounting/accounts/:id
exports.updateAccount = async (req, res, next) => {
  try {
    const { name, code, type, isActive, balance } = req.body;
    
    const account = await Account.findById(req.params.id);
    if (!account) return ApiResponse.notFound(res, 'একাউন্ট পাওয়া যায়নি');
    if (account.institution !== req.user.institution) return ApiResponse.error(res, 'Unauthorised', 403);

    if (code && code !== account.code) {
      const existing = await Account.findOne({ code, institution: req.user.institution });
      if (existing) return ApiResponse.error(res, 'এই কোডটি অন্য একটি একাউন্টে ব্যবহৃত হচ্ছে', 400);
    }

    account.name = name || account.name;
    account.code = code || account.code;
    account.type = type || account.type;
    if (isActive !== undefined) account.isActive = isActive;
    if (balance !== undefined && !isNaN(Number(balance))) {
      account.balance = Number(balance);
    }
    
    await account.save();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'update',
      'Account',
      account._id,
      `হিসাব খাত (Account) আপডেট করা হয়েছে: ${account.name} (ব্যালেন্স: ৳ ${account.balance})`,
      null,
      account
    );

    ApiResponse.success(res, { account }, 'একাউন্ট সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হিসাব খাতের ব্যালেন্স লাইভ লেনদেন অনুযায়ী রিক্যালকুলেট করুন
// @route   POST /api/v1/accounting/accounts/recalculate-balances
exports.recalculateBalances = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const accounts = await Account.find({ institution });
    
    const Payment = require('../models/Payment');
    const Income = require('../models/Income');
    const Voucher = require('../models/Voucher');

    const [payments, incomes, vouchers] = await Promise.all([
      Payment.findAll({ where: { institution, status: 'success' } }).catch(() => []),
      Income.findAll({ where: { institution, status: 'approved' } }).catch(() => []),
      Voucher.findAll({ where: { institution, status: 'approved' } }).catch(() => [])
    ]);

    for (const acc of accounts) {
      const accId = String(acc._id);

      if (acc.type === 'Asset') {
        const payTotal = payments
          .filter(p => String(p.fundAccount) === accId)
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const incTotal = incomes
          .filter(i => String(i.fundAccount) === accId)
          .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

        const expTotal = vouchers
          .filter(v => String(v.fundAccount) === accId)
          .reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

        acc.balance = (payTotal + incTotal) - expTotal;
        await acc.save();
      }
    }

    const updatedAccounts = await Account.find({ institution }).sort({ code: 1, name: 1 });
    ApiResponse.success(res, { accounts: updatedAccounts }, 'সকল একাউন্টের ব্যালেন্স সফলভাবে হালনাগাদ করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account
// @route   DELETE /api/v1/accounting/accounts/:id
exports.deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ where: { _id: req.params.id, institution: req.user.institution } });
    if (!account) return ApiResponse.notFound(res, 'একাউন্ট পাওয়া যায়নি');

    // Prevent deleting accounts with non-zero balance
    if (Math.abs(Number(account.balance) || 0) > 0.01) {
      return ApiResponse.error(res, 'যেসব একাউন্টে ব্যালেন্স রয়েছে সেগুলো সরাসরি মুছে ফেলা যাবে না। প্রয়োজনে নিষ্ক্রিয় (Inactive) করুন।', 400);
    }

    const accName = account.name;
    await account.destroy();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'delete',
      'Account',
      account._id,
      `হিসাব খাত (Account) মুছে ফেলা হয়েছে: ${accName}`,
      account,
      null
    );

    ApiResponse.success(res, null, 'একাউন্ট সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// --- Journal Entries (Ledger) ---

// @desc    Get journal entries / ledger for an account
// @route   GET /api/v1/accounting/journals
exports.getJournals = async (req, res, next) => {
  try {
    const Invoice = require('../models/Invoice');
    const Payment = require('../models/Payment');
    const Voucher = require('../models/Voucher');
    const Student = require('../models/Student');
    const User = require('../models/User');
    const ClassLevel = require('../models/ClassLevel');
    const Section = require('../models/Section');

    const institution = req.user.institution;
    let where = { institution };
    
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(req.query.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { [Op.between]: [startDate, endOfDay] };
    } else if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0);
      where.date = { [Op.gte]: startDate };
    } else if (req.query.endDate) {
      const endOfDay = new Date(req.query.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { [Op.lte]: endOfDay };
    }

    const journals = await JournalEntry.findAll({ where, order: [['date', 'DESC']] });

    // Filter by accountId if provided
    const accountId = req.query.account;
    
    let result = journals;
    if (accountId) {
      result = journals.filter(j => {
        let entries = j.entries;
        if (typeof entries === 'string') {
          try { entries = JSON.parse(entries); } catch (e) { entries = []; }
        }
        return Array.isArray(entries) && entries.some(entry => entry.account && entry.account.toString() === accountId.toString());
      });
    }

    // 1. Fetch matching Accounts
    const accounts = await Account.findAll({ where: { institution } }).catch(() => []);
    const accountMap = {};
    accounts.forEach(acc => accountMap[acc._id.toString()] = acc);

    // 2. Collect references to identify payments, vouchers, invoices
    const payRefs = result.map(j => j.reference).filter(Boolean);
    const payments = payRefs.length > 0 
      ? await Payment.findAll({ where: { institution, paymentNumber: { [Op.in]: payRefs } } }).catch(() => []) 
      : [];
    const paymentMap = {};
    payments.forEach(p => { paymentMap[p.paymentNumber] = p; });

    // 3. Collect Invoice numbers & IDs
    const invoiceIds = payments.map(p => p.invoice).filter(Boolean);
    const invoiceNumberSet = new Set();
    result.forEach(j => {
      const match = (j.description || '').match(/INV-[A-Za-z0-9_-]+/i);
      if (match) invoiceNumberSet.add(match[0]);
      if (j.reference && j.reference.startsWith('INV-')) invoiceNumberSet.add(j.reference);
    });
    const invNumbers = Array.from(invoiceNumberSet);

    const invoiceWhere = { institution, [Op.or]: [] };
    if (invoiceIds.length > 0) invoiceWhere[Op.or].push({ _id: { [Op.in]: invoiceIds } });
    if (invNumbers.length > 0) invoiceWhere[Op.or].push({ invoiceNumber: { [Op.in]: invNumbers } });

    const invoices = invoiceWhere[Op.or].length > 0 
      ? await Invoice.findAll({ where: invoiceWhere }).catch(() => []) 
      : [];
    const invoiceMap = {};
    invoices.forEach(inv => {
      if (inv._id) invoiceMap[inv._id.toString()] = inv;
      if (inv.invoiceNumber) invoiceMap[inv.invoiceNumber] = inv;
    });

    // 4. Collect student IDs from payments & invoices
    const studentIdSet = new Set();
    payments.forEach(p => { if (p.student) studentIdSet.add(p.student.toString()); });
    invoices.forEach(inv => { if (inv.student) studentIdSet.add(inv.student.toString()); });
    const studentIds = Array.from(studentIdSet);

    let studentMap = {};
    let userMap = {};
    let classMap = {};
    let sectionMap = {};

    if (studentIds.length > 0) {
      const students = await Student.findAll({
        where: {
          institution,
          [Op.or]: [
            { _id: { [Op.in]: studentIds } },
            { user: { [Op.in]: studentIds } },
            { studentId: { [Op.in]: studentIds } }
          ]
        }
      }).catch(() => []);

      const userIds = students.map(s => s.user).filter(Boolean);
      studentIds.forEach(id => userIds.push(id));

      const [users, classLevels, sections] = await Promise.all([
        userIds.length > 0 ? User.findAll({ where: { institution, _id: { [Op.in]: userIds } } }).catch(() => []) : [],
        ClassLevel.findAll({ where: { institution } }).catch(() => []),
        Section.findAll({ where: { institution } }).catch(() => [])
      ]);

      users.forEach(u => { userMap[u._id.toString()] = u; });
      classLevels.forEach(c => { classMap[c._id.toString()] = c.name; });
      sections.forEach(s => { sectionMap[s._id.toString()] = s.name; });

      students.forEach(s => {
        if (s._id) studentMap[s._id.toString()] = s;
        if (s.user) studentMap[s.user.toString()] = s;
        if (s.studentId) studentMap[s.studentId.toString()] = s;
      });
    }

    // 5. Match vouchers
    const vouchers = payRefs.length > 0 
      ? await Voucher.findAll({ where: { institution, voucherNumber: { [Op.in]: payRefs } } }).catch(() => []) 
      : [];
    const voucherMap = {};
    vouchers.forEach(v => { voucherMap[v.voucherNumber] = v; });

    // 6. Build enriched journals
    const populatedResult = result.map(j => {
      const jObj = typeof j.toJSON === 'function' ? j.toJSON() : { ...j.get ? j.get() : j };
      let entries = jObj.entries;
      if (typeof entries === 'string') {
        try { entries = JSON.parse(entries); } catch (e) { entries = []; }
      }
      if (!Array.isArray(entries)) entries = [];
      jObj.entries = entries.map(e => ({
        ...e,
        accountDetails: accountMap[e.account] || { name: 'অজানা হিসাব', code: '' }
      }));

      // Enrich source party details
      const pay = paymentMap[j.reference];
      let inv = null;
      if (pay && pay.invoice) inv = invoiceMap[pay.invoice.toString()];
      if (!inv) {
        const match = (j.description || '').match(/INV-[A-Za-z0-9_-]+/i);
        if (match && invoiceMap[match[0]]) inv = invoiceMap[match[0]];
      }

      if (pay || inv) {
        const targetStudentId = (pay && pay.student) || (inv && inv.student);
        const stu = targetStudentId ? studentMap[targetStudentId.toString()] : null;
        let uInfo = null;
        if (stu && stu.user && userMap[stu.user.toString()]) {
          uInfo = userMap[stu.user.toString()];
        } else if (targetStudentId && userMap[targetStudentId.toString()]) {
          uInfo = userMap[targetStudentId.toString()];
        }

        const studentName = uInfo 
          ? `${uInfo.firstName || ''} ${uInfo.lastName || ''}`.trim() 
          : (stu ? (stu.name || 'শিক্ষার্থী') : 'শিক্ষার্থী');
        const rollOrId = (stu && stu.studentId) || (stu && stu.rollNumber) || (uInfo && uInfo.username) || '';
        const className = (stu && classMap[stu.currentClass]) || '';
        const sectionName = (stu && sectionMap[stu.currentSection]) || '';
        const classSection = [className, sectionName ? `(${sectionName})` : ''].filter(Boolean).join(' ');

        const invNum = (inv && inv.invoiceNumber) || (j.description || '').match(/INV-[A-Za-z0-9_-]+/i)?.[0] || '';

        jObj.sourceDetails = {
          type: 'student_fee',
          partyRole: 'জমাদানকারী (শিক্ষার্থী)',
          partyName: studentName,
          studentId: rollOrId,
          classSection,
          invoiceNumber: invNum,
          invoiceTitle: inv ? inv.title : '',
          feeMonth: pay ? pay.feeMonth : '',
          paymentMethod: pay ? pay.method : 'cash',
          amount: pay ? pay.amount : (entries[0]?.debit || entries[0]?.credit || 0),
          linkUrl: invNum ? `/fees?search=${encodeURIComponent(invNum)}` : `/fees`,
          invoiceData: inv ? {
            _id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            title: inv.title,
            feeCategory: inv.feeCategory,
            payableTotal: inv.payableTotal,
            paidTotal: inv.paidTotal,
            balance: inv.balance,
            status: inv.status,
            dueDate: inv.dueDate,
            studentName,
            studentRollOrId: rollOrId,
            classSection
          } : null
        };
      } else if (voucherMap[j.reference]) {
        const vch = voucherMap[j.reference];
        jObj.sourceDetails = {
          type: 'expense_voucher',
          partyRole: 'গ্রহীতা (Payee)',
          partyName: vch.payeeName || 'অজানা ব্যক্তি/প্রতিষ্ঠান',
          notes: vch.description,
          linkUrl: '/expense-vouchers',
          amount: vch.amount
        };
      }

      return jObj;
    });

    ApiResponse.success(res, { journals: populatedResult });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete journal entry (Super Admin Only)
// @route   DELETE /api/v1/accounting/journals/:id
exports.deleteJournal = async (req, res, next) => {
  try {
    const journal = await JournalEntry.findOne({ where: { _id: req.params.id, institution: req.user.institution } });
    if (!journal) return ApiResponse.notFound(res, 'জার্নাল এন্ট্রি পাওয়া যায়নি');

    const ref = journal.reference || journal._id;
    await journal.destroy();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'delete',
      'JournalEntry',
      req.params.id,
      `জার্নাল এন্ট্রি মুছে ফেলা হয়েছে: ${ref}`,
      journal,
      null
    );

    ApiResponse.success(res, null, 'জার্নাল এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// --- Cash Book / Daily Transactions ---

// @desc    Get all daily transactions (Cash Book)
// @route   GET /api/v1/accounting/transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const Income = require('../models/Income');
    const Payment = require('../models/Payment');
    const Voucher = require('../models/Voucher');
    const IncomeCategory = require('../models/IncomeCategory');
    const Student = require('../models/Student');
    const User = require('../models/User');
    
    const institution = req.user.institution;
    
    let startDateObj = null;
    let endOfDayObj = null;
    if (req.query.startDate) {
      startDateObj = new Date(req.query.startDate);
      startDateObj.setHours(0, 0, 0, 0);
    }
    if (req.query.endDate) {
      endOfDayObj = new Date(req.query.endDate);
      endOfDayObj.setHours(23, 59, 59, 999);
    }

    // 1. Fetch Incomes
    let incomeWhere = { institution, status: 'approved' };
    if (startDateObj && endOfDayObj) {
      incomeWhere.date = { [Op.between]: [startDateObj, endOfDayObj] };
    } else if (startDateObj) {
      incomeWhere.date = { [Op.gte]: startDateObj };
    } else if (endOfDayObj) {
      incomeWhere.date = { [Op.lte]: endOfDayObj };
    }
    const incomes = await Income.findAll({ where: incomeWhere, order: [['date', 'DESC']] }).catch(() => []);
    
    // 2. Fetch Payments (Student Fees)
    let paymentWhere = { 
      institution, 
      status: { [Op.in]: ['success', 'paid'] } 
    };
    if (startDateObj && endOfDayObj) {
      paymentWhere[Op.or] = [
        { paymentDate: { [Op.between]: [startDateObj, endOfDayObj] } },
        { paymentDate: null, createdAt: { [Op.between]: [startDateObj, endOfDayObj] } }
      ];
    } else if (startDateObj) {
      paymentWhere[Op.or] = [
        { paymentDate: { [Op.gte]: startDateObj } },
        { paymentDate: null, createdAt: { [Op.gte]: startDateObj } }
      ];
    } else if (endOfDayObj) {
      paymentWhere[Op.or] = [
        { paymentDate: { [Op.lte]: endOfDayObj } },
        { paymentDate: null, createdAt: { [Op.lte]: endOfDayObj } }
      ];
    }
    const payments = await Payment.findAll({ where: paymentWhere, order: [['createdAt', 'DESC']] }).catch(() => []);
    
    // 3. Fetch Vouchers (Expenses)
    let voucherWhere = { institution, status: 'approved' };
    if (startDateObj && endOfDayObj) {
      voucherWhere.date = { [Op.between]: [startDateObj, endOfDayObj] };
    } else if (startDateObj) {
      voucherWhere.date = { [Op.gte]: startDateObj };
    } else if (endOfDayObj) {
      voucherWhere.date = { [Op.lte]: endOfDayObj };
    }
    const vouchers = await Voucher.findAll({ where: voucherWhere, order: [['date', 'DESC']] }).catch(() => []);

    // 4. Calculate Opening Balance (Prior to startDate)
    let openingBalance = 0;
    if (startDateObj) {
      const prevIncomes = await Income.findAll({
        where: {
          institution,
          status: 'approved',
          date: { [Op.lt]: startDateObj }
        },
        attributes: ['amount']
      }).catch(() => []);
      const prevIncomeTotal = prevIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);

      const prevPayments = await Payment.findAll({
        where: {
          institution,
          status: { [Op.in]: ['success', 'paid'] },
          [Op.or]: [
            { paymentDate: { [Op.lt]: startDateObj } },
            { paymentDate: null, createdAt: { [Op.lt]: startDateObj } }
          ]
        },
        attributes: ['amount']
      }).catch(() => []);
      const prevPaymentTotal = prevPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

      const prevVouchers = await Voucher.findAll({
        where: {
          institution,
          status: 'approved',
          date: { [Op.lt]: startDateObj }
        },
        attributes: ['amount']
      }).catch(() => []);
      const prevVoucherTotal = prevVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0);

      openingBalance = (prevIncomeTotal + prevPaymentTotal) - prevVoucherTotal;
    }

    const Branch = require('../models/Branch');
    const StudentEnrollment = require('../models/StudentEnrollment');
    const ClassLevel = require('../models/ClassLevel');

    const [accounts, incomeCategories, students, users, branches, enrollments, classLevels] = await Promise.all([
      Account.findAll({ where: { institution } }).catch(() => []),
      IncomeCategory.findAll({ where: { institution } }).catch(() => []),
      Student.findAll({ where: { institution } }).catch(() => []),
      User.findAll({ where: { institution } }).catch(() => []),
      Branch.findAll({ where: { institution } }).catch(() => []),
      StudentEnrollment.findAll({ where: { institution } }).catch(() => []),
      ClassLevel.findAll({ where: { institution } }).catch(() => [])
    ]);

    const accountMap = {};
    accounts.forEach(a => accountMap[a._id.toString()] = a.name);

    const incCatMap = {};
    incomeCategories.forEach(c => incCatMap[c._id.toString()] = c.name);

    const branchMap = {
      'BOYS': 'বালক শাখা',
      'GIRLS': 'বালিকা শাখা',
      'NOORANI': 'নুরানী শাখা',
      'BOYS_NOORANI': 'বালক শাখা + নুরানী',
      'GIRLS_NOORANI': 'বালিকা শাখা + নুরানী',
      'MAIN': 'প্রধান শাখা'
    };

    branches.forEach(b => {
      if (b._id) branchMap[String(b._id)] = b.name;
      if (b.code) branchMap[String(b.code)] = b.name;
      if (b.name) branchMap[String(b.name)] = b.name;
    });

    const classMap = {};
    classLevels.forEach(c => {
      if (c._id) classMap[String(c._id)] = c;
    });

    const enrollmentMap = {};
    enrollments.forEach(e => {
      if (e.student) enrollmentMap[String(e.student)] = e;
      if (e._id) enrollmentMap[String(e._id)] = e;
    });

    const studentMap = {};
    students.forEach(s => {
      if (s._id) studentMap[s._id.toString()] = s;
      if (s.user) studentMap[s.user.toString()] = s;
    });
    
    const userMap = {};
    users.forEach(u => userMap[u._id.toString()] = u);

    let transactions = [];

    // Format Incomes
    incomes.forEach(inc => {
      const rawIncBranch = inc.branch;
      const resolvedIncBranch = (rawIncBranch && branchMap[String(rawIncBranch)]) || rawIncBranch || 'প্রধান শাখা';
      transactions.push({
        id: inc._id,
        date: inc.date || inc.createdAt,
        type: 'income',
        category: incCatMap[inc.category] || 'সাধারণ আয় (Income)',
        description: inc.donorName || inc.notes || 'দান / বিবিধ আয়',
        amount: Number(inc.amount) || 0,
        method: inc.paymentMethod || 'cash',
        reference: inc.transactionReference || inc.receiptNumber || '-',
        branch: resolvedIncBranch
      });
    });

    // Format Payments
    payments.forEach(pay => {
      const stu = studentMap[pay.student];
      let stuName = 'শিক্ষার্থী';
      if (stu && userMap[stu.user]) {
        stuName = `${userMap[stu.user].firstName || ''} ${userMap[stu.user].lastName || ''}`.trim() || 'শিক্ষার্থী';
      } else if (userMap[pay.student]) {
        stuName = `${userMap[pay.student].firstName || ''} ${userMap[pay.student].lastName || ''}`.trim() || 'শিক্ষার্থী';
      }

      const curEnr = stu ? (enrollmentMap[String(stu._id)] || (stu.currentEnrollment ? enrollmentMap[String(stu.currentEnrollment)] : null)) : null;
      const cls = curEnr?.classLevel ? classMap[String(curEnr.classLevel)] : null;
      const rawBranch = stu?.branch || curEnr?.branch || cls?.branch;
      let sBranch = '';
      if (rawBranch) {
        sBranch = branchMap[String(rawBranch)] || rawBranch;
      }
      if (!sBranch || sBranch.trim() === '') {
        sBranch = 'প্রধান শাখা';
      }

      transactions.push({
        id: pay._id,
        date: pay.paymentDate || pay.createdAt,
        type: 'income',
        category: 'শিক্ষার্থী ফি (Student Fee)',
        description: `${stuName} - ${pay.feeMonth || 'বেতন'}`,
        amount: Number(pay.amount) || 0,
        method: pay.method || 'cash',
        reference: pay.paymentNumber || '-',
        branch: sBranch
      });
    });

    // Format Vouchers
    vouchers.forEach(vch => {
      const rawVchBranch = vch.branch;
      const resolvedVchBranch = (rawVchBranch && branchMap[String(rawVchBranch)]) || rawVchBranch || 'প্রধান শাখা';
      transactions.push({
        id: vch._id,
        date: vch.date || vch.createdAt,
        type: 'expense',
        category: accountMap[vch.expenseAccount] || 'সাধারণ ব্যয় (Expense)',
        description: `${vch.payeeName || ''} - ${vch.description || ''}`.trim() || 'ব্যয় ভাউচার',
        amount: Number(vch.amount) || 0,
        method: vch.paymentMethod || 'cash',
        reference: vch.voucherNumber || '-',
        branch: resolvedVchBranch
      });
    });

    // Sort descending by date
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const defaultBranchList = [
      'বালক শাখা',
      'বালিকা শাখা',
      'নুরানী শাখা',
      'বালক শাখা + নুরানী',
      'বালিকা শাখা + নুরানী',
      'প্রধান শাখা'
    ];
    const allBranchSet = new Set(defaultBranchList);
    branches.forEach(b => {
      if (b.name && b.name !== 'হিফজ শাখা') allBranchSet.add(b.name);
    });
    const allBranchNames = Array.from(allBranchSet);

    ApiResponse.success(res, { transactions, openingBalance, branches: allBranchNames });
  } catch (error) {
    next(error);
  }
};

// --- Module 19: Core Accounting Reports ---

// @desc    Get Trial Balance
// @route   GET /api/v1/accounting/trial-balance
exports.getTrialBalance = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { startDate, endDate } = req.query;
    
    // Get all accounts
    const accounts = await Account.find({ institution }).sort({ type: 1, name: 1 });
    
    const filter = { institution };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date.$lte = endOfDay;
      }
    }
    
    const journals = await JournalEntry.find(filter);
    
    const trialBalance = [];
    let totalDebit = 0;
    let totalCredit = 0;
    
    // Calculate net balance for each account
    accounts.forEach(acc => {
      let debit = 0;
      let credit = 0;
      
      journals.forEach(j => { let entries = j.entries; if (typeof entries === 'string') { try { entries = JSON.parse(entries); } catch (e) { entries = []; } } if (Array.isArray(entries)) { entries.forEach(entry => { if (entry.account && entry.account.toString() === acc._id.toString()) { debit += entry.debit || 0; credit += entry.credit || 0; } }); } });
      
      let balance = debit - credit;
      if (acc.type === 'Liability' || acc.type === 'Equity' || acc.type === 'Revenue') {
        balance = credit - debit;
      }
      
      // We'll show debit vs credit for the final Trial Balance format:
      // Asset/Expense normally have Debit balance
      // Liability/Equity/Revenue normally have Credit balance
      
      let finalDebit = 0;
      let finalCredit = 0;
      
      if (acc.type === 'Asset' || acc.type === 'Expense') {
        if (balance >= 0) finalDebit = balance;
        else finalCredit = Math.abs(balance);
      } else {
        if (balance >= 0) finalCredit = balance;
        else finalDebit = Math.abs(balance);
      }
      
      if (finalDebit > 0 || finalCredit > 0) {
        trialBalance.push({
          accountId: acc._id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          debit: finalDebit,
          credit: finalCredit
        });
        totalDebit += finalDebit;
        totalCredit += finalCredit;
      }
    });
    
    ApiResponse.success(res, { 
      trialBalance, 
      totals: { debit: totalDebit, credit: totalCredit } 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Balance Sheet
// @route   GET /api/v1/accounting/balance-sheet
exports.getBalanceSheet = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { startDate, endDate } = req.query;
    
    // Just reuse getTrialBalance logic internally to get net balances
    const accounts = await Account.find({ institution });
    
    const filter = { institution };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date.$lte = endOfDay;
      }
    }
    
    const journals = await JournalEntry.find(filter);
    
    const assets = [];
    const liabilities = [];
    const equities = [];
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquities = 0;
    
    // For net income calculation
    let totalRevenue = 0;
    let totalExpense = 0;
    
    accounts.forEach(acc => {
      let debit = 0;
      let credit = 0;
      
      journals.forEach(j => { let entries = j.entries; if (typeof entries === 'string') { try { entries = JSON.parse(entries); } catch (e) { entries = []; } } if (Array.isArray(entries)) { entries.forEach(entry => { if (entry.account && entry.account.toString() === acc._id.toString()) { debit += entry.debit || 0; credit += entry.credit || 0; } }); } });
      
      if (acc.type === 'Asset') {
        const balance = debit - credit;
        if (balance !== 0) {
          assets.push({ accountId: acc._id, name: acc.name, balance });
          totalAssets += balance;
        }
      } else if (acc.type === 'Liability') {
        const balance = credit - debit;
        if (balance !== 0) {
          liabilities.push({ accountId: acc._id, name: acc.name, balance });
          totalLiabilities += balance;
        }
      } else if (acc.type === 'Equity') {
        const balance = credit - debit;
        if (balance !== 0) {
          equities.push({ accountId: acc._id, name: acc.name, balance });
          totalEquities += balance;
        }
      } else if (acc.type === 'Revenue') {
        totalRevenue += (credit - debit);
      } else if (acc.type === 'Expense') {
        totalExpense += (debit - credit);
      }
    });
    
    const netIncome = totalRevenue - totalExpense;
    
    ApiResponse.success(res, {
      assets,
      liabilities,
      equities,
      netIncome,
      totalAssets,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquities + netIncome
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Income Statement
// @route   GET /api/v1/accounting/income-statement
exports.getIncomeStatement = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { startDate, endDate } = req.query;
    
    const accounts = await Account.find({ institution, type: { $in: ['Revenue', 'Expense'] } });
    
    const filter = { institution };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date.$lte = endOfDay;
      }
    }
    
    const journals = await JournalEntry.find(filter);
    
    const revenues = [];
    const expenses = [];
    let totalRevenue = 0;
    let totalExpense = 0;
    
    accounts.forEach(acc => {
      let debit = 0;
      let credit = 0;
      
      journals.forEach(j => { let entries = j.entries; if (typeof entries === 'string') { try { entries = JSON.parse(entries); } catch (e) { entries = []; } } if (Array.isArray(entries)) { entries.forEach(entry => { if (entry.account && entry.account.toString() === acc._id.toString()) { debit += entry.debit || 0; credit += entry.credit || 0; } }); } });
      
      if (acc.type === 'Revenue') {
        const balance = credit - debit;
        if (balance !== 0) {
          revenues.push({ accountId: acc._id, name: acc.name, balance });
          totalRevenue += balance;
        }
      } else if (acc.type === 'Expense') {
        const balance = debit - credit;
        if (balance !== 0) {
          expenses.push({ accountId: acc._id, name: acc.name, balance });
          totalExpense += balance;
        }
      }
    });
    
    ApiResponse.success(res, {
      revenues,
      expenses,
      totalRevenue,
      totalExpense,
      netIncome: totalRevenue - totalExpense
    });
  } catch (error) {
    next(error);
  }
};
