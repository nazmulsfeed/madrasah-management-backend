const fs = require('fs');
const code = `

// @desc    Get all budgets
// @route   GET /api/v1/finance/budgets
exports.getBudgets = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { fiscalYear } = req.query;
    
    const filter = { institution };
    if (fiscalYear) filter.fiscalYear = fiscalYear;

    const budgets = await Budget.find(filter).sort({ category: 1 });
    ApiResponse.success(res, { budgets });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a budget
// @route   POST /api/v1/finance/budgets
exports.createBudget = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { fiscalYear, category, amount } = req.body;

    if (!fiscalYear || !category || amount === undefined) {
      return ApiResponse.error(res, 'Fiscal Year, Category, and Amount are required', 400);
    }

    const budget = await Budget.create({
      institution,
      fiscalYear,
      category,
      amount
    });

    ApiResponse.created(res, { budget }, 'বাজেট সফলভাবে তৈরি করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Update a budget
// @route   PUT /api/v1/finance/budgets/:id
exports.updateBudget = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { id } = req.params;
    const { amount } = req.body;

    const budget = await Budget.findOne({ _id: id, institution });
    if (!budget) {
      return ApiResponse.error(res, 'বাজেট পাওয়া যায়নি', 404);
    }

    if (amount !== undefined) budget.amount = amount;
    await budget.save();

    ApiResponse.success(res, { budget }, 'বাজেট আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Get all assets
// @route   GET /api/v1/finance/assets
exports.getAssets = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const assets = await Asset.find({ institution }).sort({ purchaseDate: -1 });
    ApiResponse.success(res, { assets });
  } catch (error) {
    next(error);
  }
};

// @desc    Create an asset
// @route   POST /api/v1/finance/assets
exports.createAsset = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { name, purchaseDate, cost, depreciationRate, currentValue } = req.body;

    if (!name || !purchaseDate || cost === undefined) {
      return ApiResponse.error(res, 'Name, Purchase Date, and Cost are required', 400);
    }

    const asset = await Asset.create({
      institution,
      name,
      purchaseDate,
      cost,
      depreciationRate: depreciationRate || 0,
      currentValue: currentValue !== undefined ? currentValue : cost
    });

    ApiResponse.created(res, { asset }, 'সম্পদ সফলভাবে যুক্ত করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Update an asset
// @route   PUT /api/v1/finance/assets/:id
exports.updateAsset = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { id } = req.params;
    const { currentValue, depreciationRate } = req.body;

    const asset = await Asset.findOne({ _id: id, institution });
    if (!asset) {
      return ApiResponse.error(res, 'সম্পদ পাওয়া যায়নি', 404);
    }

    if (currentValue !== undefined) asset.currentValue = currentValue;
    if (depreciationRate !== undefined) asset.depreciationRate = depreciationRate;
    await asset.save();

    ApiResponse.success(res, { asset }, 'সম্পদ আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
`;
fs.appendFileSync('server/controllers/financeController.js', code);
