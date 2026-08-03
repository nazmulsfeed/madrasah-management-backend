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
      
      accounts = await Account.find(filter).sort({ code: 1, name: 1 });
    }

    ApiResponse.success(res, { accounts });
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
    const { name, code, type, isActive } = req.body;
    
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
    
    await account.save();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'update',
      'Account',
      account._id,
      `হিসাব খাত (Account) আপডেট করা হয়েছে: ${account.name}`,
      null,
      account
    );

    ApiResponse.success(res, { account }, 'একাউন্ট আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// --- Journal Entries (Ledger) ---

// @desc    Get journal entries / ledger for an account
// @route   GET /api/v1/accounting/journals
exports.getJournals = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    
    if (req.query.startDate && req.query.endDate) {
       filter.date = { 
           $gte: new Date(req.query.startDate), 
           $lte: new Date(req.query.endDate) 
       };
    }

    const journals = await JournalEntry.find(filter).sort({ date: -1 });

    // Filter by accountId if provided
    const accountId = req.query.account;
    
    let result = journals;
    if (accountId) {
      result = journals.filter(j => {
        return j.entries.some(entry => entry.account === accountId);
      });
    }

    // Populate account details manually since entries is stored as JSON text
    const accounts = await Account.find({ institution: req.user.institution });
    const accountMap = {};
    accounts.forEach(acc => accountMap[acc._id.toString()] = acc);

    const populatedResult = result.map(j => {
      const jObj = typeof j.toJSON === 'function' ? j.toJSON() : j;
      jObj.entries = jObj.entries.map(e => ({
        ...e,
        accountDetails: accountMap[e.account] || { name: 'Unknown' }
      }));
      return jObj;
    });

    ApiResponse.success(res, { journals: populatedResult });
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
    
    let dateFilter = {};
    if (req.query.startDate && req.query.endDate) {
      const endOfDay = new Date(req.query.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      dateFilter = {
        $gte: new Date(req.query.startDate),
        $lte: endOfDay
      };
    }

    // 1. Fetch Incomes
    const incomeFilter = { institution, status: 'approved' };
    if (dateFilter.$gte) incomeFilter.date = dateFilter;
    const incomes = await Income.find(incomeFilter);
    
    // 2. Fetch Payments (Student Fees)
    const paymentFilter = { institution, status: 'success' };
    if (dateFilter.$gte) paymentFilter.paymentDate = dateFilter;
    const payments = await Payment.find(paymentFilter);
    
    // 3. Fetch Vouchers (Expenses)
    const voucherFilter = { institution, status: 'approved' };
    if (dateFilter.$gte) voucherFilter.date = dateFilter;
    const vouchers = await Voucher.find(voucherFilter);

    // 4. Calculate Opening Balance (if startDate is provided)
    let openingBalance = 0;
    if (req.query.startDate) {
      const beforeStart = { $lt: new Date(req.query.startDate) };
      
      const prevIncomes = await Income.aggregate([
        { $match: { institution, status: 'approved', date: beforeStart } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const prevIncomeTotal = prevIncomes[0]?.total || 0;

      const prevPayments = await Payment.aggregate([
        { $match: { institution, status: 'success', paymentDate: beforeStart } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const prevPaymentTotal = prevPayments[0]?.total || 0;

      const prevVouchers = await Voucher.aggregate([
        { $match: { institution, status: 'approved', date: beforeStart } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const prevVoucherTotal = prevVouchers[0]?.total || 0;

      openingBalance = (prevIncomeTotal + prevPaymentTotal) - prevVoucherTotal;
    }

    // Fetch related data for formatting
    const accounts = await Account.find({ institution });
    const accountMap = {};
    accounts.forEach(a => accountMap[a._id.toString()] = a.name);

    const incomeCategories = await IncomeCategory.find({ institution });
    const incCatMap = {};
    incomeCategories.forEach(c => incCatMap[c._id.toString()] = c.name);

    const students = await Student.find({ institution });
    const studentMap = {};
    students.forEach(s => studentMap[s._id.toString()] = s);
    
    const users = await User.find({ institution });
    const userMap = {};
    users.forEach(u => userMap[u._id.toString()] = u);

    let transactions = [];

    // Format Incomes
    incomes.forEach(inc => {
      transactions.push({
        id: inc._id,
        date: inc.date,
        type: 'income',
        category: incCatMap[inc.category] || 'Unknown Income',
        description: inc.donorName || inc.notes || 'Donation / Income',
        amount: inc.amount,
        method: inc.paymentMethod,
        reference: inc.transactionReference || '-'
      });
    });

    // Format Payments
    payments.forEach(pay => {
      const stu = studentMap[pay.student];
      let stuName = 'Unknown Student';
      if (stu && userMap[stu.user]) {
        stuName = `${userMap[stu.user].firstName} ${userMap[stu.user].lastName || ''}`.trim();
      }
      transactions.push({
        id: pay._id,
        date: pay.paymentDate,
        type: 'income',
        category: 'শিক্ষার্থী ফি (Student Fee)',
        description: `${stuName} - ${pay.feeMonth}`,
        amount: pay.amount,
        method: pay.method,
        reference: pay.paymentNumber
      });
    });

    // Format Vouchers
    vouchers.forEach(vch => {
      transactions.push({
        id: vch._id,
        date: vch.date,
        type: 'expense',
        category: accountMap[vch.expenseAccount] || 'Unknown Expense',
        description: `${vch.payeeName} - ${vch.description || ''}`.trim(),
        amount: vch.amount,
        method: vch.paymentMethod,
        reference: vch.voucherNumber
      });
    });

    // Sort descending by date
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    ApiResponse.success(res, { transactions, openingBalance });
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
