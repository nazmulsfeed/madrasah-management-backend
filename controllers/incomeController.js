const { Op } = require('sequelize');
const IncomeCategory = require('../models/IncomeCategory');
const Income = require('../models/Income');
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const auditLogger = require('./auditLogController');

// --- Income Categories ---

// @desc    Get all income categories
// @route   GET /api/v1/finance/income-categories
exports.getIncomeCategories = async (req, res, next) => {
  try {
    const where = { institution: req.user.institution };
    if (req.query.type) {
      where.type = req.query.type;
    }

    const categories = await IncomeCategory.findAll({
      where,
      order: [['name', 'ASC']]
    });
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
    if (!name || name.trim() === '') {
      return ApiResponse.error(res, 'খাতের নাম আবশ্যক', 400);
    }
    
    // Check if category exists
    const existing = await IncomeCategory.findOne({
      where: { 
        name: name.trim(), 
        institution: req.user.institution, 
        type: type || 'other' 
      }
    });
    if (existing) {
      return ApiResponse.error(res, 'এই নামের খাতটি ইতিমধ্যে বিদ্যমান', 400);
    }

    const category = await IncomeCategory.create({
      institution: req.user.institution,
      name: name.trim(),
      type: type || 'other',
      description: description || ''
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
    
    const category = await IncomeCategory.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });
    if (!category) return ApiResponse.notFound(res, 'খাত পাওয়া যায়নি');

    category.name = name ? name.trim() : category.name;
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
    const category = await IncomeCategory.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });
    if (!category) return ApiResponse.notFound(res, 'খাত পাওয়া যায়নি');

    // check if it is used in incomes
    const usedCount = await Income.count({ where: { category: category._id } });
    if (usedCount > 0) {
      return ApiResponse.error(res, 'এই খাতটিতে আয় এন্ট্রি রয়েছে, তাই এটি মুছে ফেলা যাবে না', 400);
    }

    await category.destroy();
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
    const institution = req.user.institution;
    const where = { institution };

    if (req.query.startDate && req.query.endDate) {
      where.date = {
        [Op.gte]: new Date(req.query.startDate),
        [Op.lte]: new Date(req.query.endDate)
      };
    }
    
    if (req.query.category) {
      where.category = req.query.category;
    }

    if (req.query.status && req.query.status !== 'all') {
      where.status = req.query.status;
    }

    const rawIncomes = await Income.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    const categoryIds = [...new Set(rawIncomes.map(i => i.category).filter(Boolean))];
    const userIds = [...new Set(rawIncomes.map(i => i.receivedBy).concat(rawIncomes.map(i => i.approvedBy)).filter(Boolean))];
    const accountIds = [...new Set(rawIncomes.map(i => i.fundAccount).concat(rawIncomes.map(i => i.revenueAccount)).filter(Boolean))];

    const [categories, users, accounts] = await Promise.all([
      categoryIds.length > 0 ? IncomeCategory.findAll({ where: { _id: { [Op.in]: categoryIds } } }) : [],
      userIds.length > 0 ? User.findAll({ where: { _id: { [Op.in]: userIds } }, attributes: ['_id', 'firstName', 'lastName'] }) : [],
      accountIds.length > 0 ? Account.findAll({ where: { _id: { [Op.in]: accountIds } }, attributes: ['_id', 'name', 'code', 'type'] }) : []
    ]);

    const catMap = {};
    categories.forEach(c => { catMap[String(c._id)] = c.toJSON ? c.toJSON() : c; });

    const userMap = {};
    users.forEach(u => { userMap[String(u._id)] = u.toJSON ? u.toJSON() : u; });

    const accMap = {};
    accounts.forEach(a => { accMap[String(a._id)] = a.toJSON ? a.toJSON() : a; });

    const incomes = rawIncomes.map(inc => {
      const incJson = inc.toJSON ? inc.toJSON() : inc;
      return {
        ...incJson,
        category: catMap[String(inc.category)] || (inc.category ? { _id: inc.category, name: inc.category } : null),
        receivedBy: userMap[String(inc.receivedBy)] || null,
        approvedBy: userMap[String(inc.approvedBy)] || null,
        fundAccountDoc: accMap[String(inc.fundAccount)] || null,
        revenueAccountDoc: accMap[String(inc.revenueAccount)] || null
      };
    });

    ApiResponse.success(res, { incomes });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new income
// @route   POST /api/v1/finance/incomes
exports.createIncome = async (req, res, next) => {
  try {
    const { category, amount, date, donorName, donorPhone, paymentMethod, transactionReference, notes, fundAccount, revenueAccount, autoApprove } = req.body;
    
    if (!category) {
      return ApiResponse.error(res, 'আয়ের খাত নির্বাচন আবশ্যক', 400);
    }
    if (!amount || Number(amount) <= 0) {
      return ApiResponse.error(res, 'সঠিক টাকার পরিমাণ আবশ্যক', 400);
    }

    // Check if category exists
    let cat = await IncomeCategory.findOne({ where: { _id: category } });
    if (!cat) {
      cat = await IncomeCategory.findOne({ where: { name: category, institution: req.user.institution } });
    }

    const canAutoApprove = ['super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'].includes(req.user.userType) ||
                          ['co_super_admin', 'admin'].includes(req.user.adminRole);

    const shouldApprove = autoApprove !== undefined ? Boolean(autoApprove) : canAutoApprove;

    const income = await Income.create({
      institution: req.user.institution,
      category: cat ? cat._id : category,
      amount: Number(amount),
      date: date || new Date(),
      donorName: donorName ? String(donorName).trim() : '',
      donorPhone: donorPhone ? String(donorPhone).trim() : '',
      paymentMethod: paymentMethod || 'cash',
      transactionReference: transactionReference ? String(transactionReference).trim() : '',
      receivedBy: req.user._id,
      notes: notes ? String(notes).trim() : '',
      fundAccount: fundAccount || null,
      revenueAccount: revenueAccount || null,
      status: shouldApprove ? 'approved' : 'pending',
      approvedBy: shouldApprove ? req.user._id : null
    });

    // If auto-approved and accounts provided, create Double Entry Journal & update balances
    if (shouldApprove && fundAccount && revenueAccount) {
      const entries = [
        { account: fundAccount, debit: Number(amount), credit: 0 },
        { account: revenueAccount, debit: 0, credit: Number(amount) }
      ];

      await JournalEntry.create({
        institution: req.user.institution,
        date: income.date,
        reference: `INC-${income._id.toString().substring(0, 8)}`,
        description: `আয় এন্ট্রি: ${cat ? cat.name : 'Unknown'} ${income.donorName ? '- ' + income.donorName : ''}`,
        entries
      }).catch(err => console.error('Auto Journal error:', err));

      // Update balances
      const fundAcc = await Account.findOne({ where: { _id: fundAccount } });
      if (fundAcc) { 
        fundAcc.balance = (fundAcc.balance || 0) + Number(amount); 
        await fundAcc.save().catch(() => {}); 
      }
      
      const revAcc = await Account.findOne({ where: { _id: revenueAccount } });
      if (revAcc) { 
        revAcc.balance = (revAcc.balance || 0) + Number(amount); 
        await revAcc.save().catch(() => {}); 
      }
    }

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

    const message = shouldApprove 
      ? 'আয় সফলভাবে রেকর্ড ও অনুমোদিত হয়েছে' 
      : 'আয় সফলভাবে রেকর্ড করা হয়েছে এবং অনুমোদনের জন্য অপেক্ষাধীন';

    ApiResponse.created(res, { income }, message);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve Income (Create Journal)
// @route   POST /api/v1/finance/incomes/:id/approve
exports.approveIncome = async (req, res, next) => {
  try {
    const income = await Income.findOne({ where: { _id: req.params.id } });
    if (!income) return ApiResponse.notFound(res, 'আয়ের রেকর্ড পাওয়া যায়নি');
    if (income.institution !== req.user.institution) return ApiResponse.error(res, 'Unauthorised', 403);
    
    if (income.status === 'approved') return ApiResponse.error(res, 'এই আয় ইতিমধ্যে অনুমোদিত', 400);

    income.status = 'approved';
    income.approvedBy = req.user._id;
    await income.save();

    const cat = await IncomeCategory.findOne({ where: { _id: income.category } });

    // Create Double Entry Journal if accounts exist
    if (income.fundAccount && income.revenueAccount) {
      const entries = [
        { account: income.fundAccount, debit: income.amount, credit: 0 },
        { account: income.revenueAccount, debit: 0, credit: income.amount }
      ];

      await JournalEntry.create({
        institution: req.user.institution,
        date: income.date,
        reference: `INC-${income._id.toString().substring(0, 8)}`,
        description: `আয় এন্ট্রি: ${cat ? cat.name : 'Unknown'} ${income.donorName ? '- ' + income.donorName : ''}`,
        entries
      }).catch(err => console.error('Approve Journal error:', err));

      // Update balances
      const fundAcc = await Account.findOne({ where: { _id: income.fundAccount } });
      if (fundAcc) { fundAcc.balance = (fundAcc.balance || 0) + Number(income.amount); await fundAcc.save(); }
      
      const revAcc = await Account.findOne({ where: { _id: income.revenueAccount } });
      if (revAcc) { revAcc.balance = (revAcc.balance || 0) + Number(income.amount); await revAcc.save(); }
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
    const income = await Income.findOne({ where: { _id: req.params.id } });
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
    const income = await Income.findOne({ where: { _id: req.params.id } });
    if (!income) return ApiResponse.notFound(res, 'আয়ের রেকর্ড পাওয়া যায়নি');
    
    if (income.institution !== req.user.institution) {
       return ApiResponse.error(res, 'Unauthorised', 403);
    }

    // Reverse Double Entry if it exists and was approved
    if (income.status === 'approved' && income.fundAccount && income.revenueAccount) {
      const fundAcc = await Account.findOne({ where: { _id: income.fundAccount } });
      if (fundAcc) { fundAcc.balance = (fundAcc.balance || 0) - Number(income.amount); await fundAcc.save(); }
      
      const revAcc = await Account.findOne({ where: { _id: income.revenueAccount } });
      if (revAcc) { revAcc.balance = (revAcc.balance || 0) - Number(income.amount); await revAcc.save(); }
      
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
