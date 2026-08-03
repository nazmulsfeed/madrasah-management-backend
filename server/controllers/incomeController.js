const IncomeCategory = require('../models/IncomeCategory');
const Income = require('../models/Income');
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const ApiResponse = require('../utils/apiResponse');
const mongooseCompat = require('../utils/mongooseCompat');
const auditLogger = require('./auditLogController');

// --- Income Categories ---

// @desc    Get all income categories
// @route   GET /api/v1/finance/income-categories
exports.getIncomeCategories = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const categories = await IncomeCategory.find(filter).sort({ name: 1 });
    ApiResponse.success(res, { categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new income category
// @route   POST /api/v1/finance/income-categories
exports.createIncomeCategory = async (req, res, next) => {
  try {
    const { name, type, description } = req.body;
    
    // Check if category exists
    const existing = await IncomeCategory.findOne({ name, institution: req.user.institution, type });
    if (existing) {
      return ApiResponse.error(res, 'এই নামের খাতটি ইতিমধ্যে বিদ্যমান', 400);
    }

    const category = await IncomeCategory.create({
      institution: req.user.institution,
      name,
      type: type || 'other',
      description
    });

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'create',
      'IncomeCategory',
      category._id,
      `নতুন আয়ের খাত তৈরি করা হয়েছে: ${name}`,
      null,
      category
    );

    ApiResponse.created(res, { category }, 'আয়ের খাত সফলভাবে তৈরি করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Update income category
// @route   PUT /api/v1/finance/income-categories/:id
exports.updateIncomeCategory = async (req, res, next) => {
  try {
    const { name, type, description } = req.body;
    
    const category = await IncomeCategory.findById(req.params.id);
    if (!category) return ApiResponse.notFound(res, 'খাত পাওয়া যায়নি');
    
    if (category.institution !== req.user.institution) {
       return ApiResponse.error(res, 'Unauthorised', 403);
    }

    category.name = name || category.name;
    category.type = type || category.type;
    category.description = description !== undefined ? description : category.description;
    
    await category.save();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'update',
      'IncomeCategory',
      category._id,
      `আয়ের খাত আপডেট করা হয়েছে: ${category.name}`,
      null,
      category
    );

    ApiResponse.success(res, { category }, 'খাত সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete income category
// @route   DELETE /api/v1/finance/income-categories/:id
exports.deleteIncomeCategory = async (req, res, next) => {
  try {
    const category = await IncomeCategory.findById(req.params.id);
    if (!category) return ApiResponse.notFound(res, 'খাত পাওয়া যায়নি');
    
    if (category.institution !== req.user.institution) {
       return ApiResponse.error(res, 'Unauthorised', 403);
    }

    // check if it is used in incomes
    const usedCount = await Income.countDocuments({ category: category._id });
    if (usedCount > 0) {
      return ApiResponse.error(res, 'এই খাতটিতে আয় এন্ট্রি রয়েছে, তাই এটি মুছে ফেলা যাবে না', 400);
    }

    await category.remove();
    ApiResponse.success(res, null, 'খাত সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// --- Incomes ---

// @desc    Get all incomes
// @route   GET /api/v1/finance/incomes
exports.getIncomes = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };

    if (req.query.startDate && req.query.endDate) {
       filter.date = { 
           $gte: new Date(req.query.startDate), 
           $lte: new Date(req.query.endDate) 
       };
    }
    
    if (req.query.category) {
       filter.category = req.query.category;
    }

    const incomes = await Income.find(filter)
      .populate('category', 'name type')
      .populate('receivedBy', 'firstName lastName')
      .sort({ date: -1 });

    ApiResponse.success(res, { incomes });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new income
// @route   POST /api/v1/finance/incomes
exports.createIncome = async (req, res, next) => {
  try {
    const { category, amount, date, donorName, donorPhone, paymentMethod, transactionReference, notes, fundAccount, revenueAccount } = req.body;
    
    // Check if category exists
    const cat = await IncomeCategory.findById(category);
    if (!cat) {
      return ApiResponse.error(res, 'আয়ের খাত পাওয়া যায়নি', 400);
    }
    
    // Basic validation
    if (!fundAccount || !revenueAccount) {
      // For backward compatibility, if double-entry fields aren't sent, just create Income normally
      // But it's highly recommended to enforce it. We'll make it required if the frontend is updated.
      // But let's allow it if it's missing just in case.
    }

    const income = await Income.create({
      institution: req.user.institution,
      category,
      amount,
      date: date || new Date(),
      donorName,
      donorPhone,
      paymentMethod,
      transactionReference,
      receivedBy: req.user._id,
      notes,
      fundAccount,
      revenueAccount,
      status: 'pending' // Initially pending
    });

    // Log the action
    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'create',
      'Income',
      income._id,
      `নতুন আয় এন্ট্রি করা হয়েছে: ৳${amount}`,
      null,
      income
    );

    ApiResponse.created(res, { income }, 'আয় সফলভাবে রেকর্ড করা হয়েছে এবং অনুমোদনের জন্য অপেক্ষাধীন');
  } catch (error) {
    next(error);
  }
};

// @desc    Approve Income (Create Journal)
// @route   POST /api/v1/finance/incomes/:id/approve
exports.approveIncome = async (req, res, next) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return ApiResponse.notFound(res, 'আয়ের রেকর্ড পাওয়া যায়নি');
    if (income.institution !== req.user.institution) return ApiResponse.error(res, 'Unauthorised', 403);
    
    if (income.status === 'approved') return ApiResponse.error(res, 'এই আয় ইতিমধ্যে অনুমোদিত', 400);

    income.status = 'approved';
    income.approvedBy = req.user._id;
    await income.save();

    const cat = await IncomeCategory.findById(income.category);

    // Create Double Entry Journal if accounts exist
    if (income.fundAccount && income.revenueAccount) {
      const entries = [
        { account: income.fundAccount, debit: income.amount, credit: 0 },
        { account: income.revenueAccount, debit: 0, credit: income.amount }
      ];

      const journal = await JournalEntry.create({
        institution: req.user.institution,
        date: income.date,
        reference: `INC-${income._id.toString().substring(0, 8)}`,
        description: `আয় এন্ট্রি: ${cat ? cat.name : 'Unknown'} ${income.donorName ? '- ' + income.donorName : ''}`,
        entries
      });

      // Update balances
      const fundAcc = await Account.findById(income.fundAccount);
      if (fundAcc) { fundAcc.balance += income.amount; await fundAcc.save(); }
      
      const revAcc = await Account.findById(income.revenueAccount);
      if (revAcc) { revAcc.balance += income.amount; await revAcc.save(); }
    }

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'approve',
      'Income',
      income._id,
      `আয় অনুমোদন করা হয়েছে: ৳${income.amount}`,
      { status: 'pending' },
      { status: 'approved', approvedBy: req.user._id }
    );

    ApiResponse.success(res, { income }, 'আয় অনুমোদিত এবং লেজারে যুক্ত করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Reject Income
// @route   POST /api/v1/finance/incomes/:id/reject
exports.rejectIncome = async (req, res, next) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return ApiResponse.notFound(res, 'আয়ের রেকর্ড পাওয়া যায়নি');
    if (income.institution !== req.user.institution) return ApiResponse.error(res, 'Unauthorised', 403);
    
    if (income.status !== 'pending') return ApiResponse.error(res, 'এই আয় অপেক্ষাধীন নয়', 400);

    income.status = 'rejected';
    income.approvedBy = req.user._id;
    await income.save();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'reject',
      'Income',
      income._id,
      `আয় বাতিল করা হয়েছে: ৳${income.amount}`,
      { status: 'pending' },
      { status: 'rejected', approvedBy: req.user._id }
    );

    ApiResponse.success(res, { income }, 'আয়ের রেকর্ড বাতিল করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete income
// @route   DELETE /api/v1/finance/incomes/:id
exports.deleteIncome = async (req, res, next) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return ApiResponse.notFound(res, 'আয়ের রেকর্ড পাওয়া যায়নি');
    
    if (income.institution !== req.user.institution) {
       return ApiResponse.error(res, 'Unauthorised', 403);
    }

    // Reverse Double Entry if it exists and was approved
    if (income.status === 'approved' && income.fundAccount && income.revenueAccount) {
      const fundAcc = await Account.findById(income.fundAccount);
      if (fundAcc) { fundAcc.balance -= income.amount; await fundAcc.save(); }
      
      const revAcc = await Account.findById(income.revenueAccount);
      if (revAcc) { revAcc.balance -= income.amount; await revAcc.save(); }
      
      // Attempt to delete associated JournalEntry by reference
      const reference = `INC-${income._id.toString().substring(0, 8)}`;
      await JournalEntry.destroy({ where: { reference } });
    }

    await income.destroy();
    ApiResponse.success(res, null, 'আয়ের রেকর্ড সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};
