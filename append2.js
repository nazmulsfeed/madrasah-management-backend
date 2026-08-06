const fs = require('fs');
const code = `
const Loan = require('../models/Loan');
const CheckRecord = require('../models/CheckRecord');

// @desc    Get all loans
// @route   GET /api/v1/finance/loans
exports.getLoans = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const loans = await Loan.find({ institution }).sort({ date: -1 });
    ApiResponse.success(res, { loans });
  } catch (error) { next(error); }
};

// @desc    Create a loan
// @route   POST /api/v1/finance/loans
exports.createLoan = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { type, personName, amount, date } = req.body;
    if (!type || !personName || amount === undefined || !date) {
      return ApiResponse.error(res, 'Type, Person Name, Amount, and Date are required', 400);
    }
    const loan = await Loan.create({ institution, type, personName, amount, remainingBalance: amount, date });
    ApiResponse.created(res, { loan }, 'ঋণ সফলভাবে যুক্ত করা হয়েছে');
  } catch (error) { next(error); }
};

// @desc    Update a loan
// @route   PUT /api/v1/finance/loans/:id
exports.updateLoan = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { id } = req.params;
    const { remainingBalance, status } = req.body;
    const loan = await Loan.findOne({ _id: id, institution });
    if (!loan) return ApiResponse.error(res, 'ঋণ পাওয়া যায়নি', 404);
    if (remainingBalance !== undefined) loan.remainingBalance = remainingBalance;
    if (status !== undefined) loan.status = status;
    if (loan.remainingBalance <= 0) loan.status = 'paid';
    await loan.save();
    ApiResponse.success(res, { loan }, 'ঋণ আপডেট করা হয়েছে');
  } catch (error) { next(error); }
};

// @desc    Get all check records
// @route   GET /api/v1/finance/checks
exports.getChecks = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const checks = await CheckRecord.find({ institution }).sort({ issueDate: -1 });
    ApiResponse.success(res, { checks });
  } catch (error) { next(error); }
};

// @desc    Create a check record
// @route   POST /api/v1/finance/checks
exports.createCheck = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { checkNumber, bankName, amount, issueDate, type } = req.body;
    if (!checkNumber || !bankName || amount === undefined || !issueDate || !type) {
      return ApiResponse.error(res, 'Check Number, Bank Name, Amount, Issue Date, and Type are required', 400);
    }
    const check = await CheckRecord.create({ institution, checkNumber, bankName, amount, issueDate, type });
    ApiResponse.created(res, { check }, 'চেক সফলভাবে যুক্ত করা হয়েছে');
  } catch (error) { next(error); }
};

// @desc    Update a check record
// @route   PUT /api/v1/finance/checks/:id
exports.updateCheck = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { id } = req.params;
    const { status } = req.body;
    const check = await CheckRecord.findOne({ _id: id, institution });
    if (!check) return ApiResponse.error(res, 'চেক পাওয়া যায়নি', 404);
    if (status !== undefined) check.status = status;
    await check.save();
    ApiResponse.success(res, { check }, 'চেক আপডেট করা হয়েছে');
  } catch (error) { next(error); }
};
`;
fs.appendFileSync('server/controllers/financeController.js', code);
