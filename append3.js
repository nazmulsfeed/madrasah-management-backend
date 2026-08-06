const fs = require('fs');
const code = `
const FinancialYear = require('../models/FinancialYear');
const Advance = require('../models/Advance');
const Refund = require('../models/Refund');

// --- Financial Year ---
exports.getFinancialYears = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const years = await FinancialYear.find({ institution }).sort({ startDate: -1 });
    ApiResponse.success(res, { years });
  } catch (error) { next(error); }
};

exports.createFinancialYear = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { yearName, startDate, endDate, isCurrent } = req.body;
    
    if (isCurrent) {
      await FinancialYear.updateMany({ institution }, { isCurrent: false });
    }
    
    const year = await FinancialYear.create({ institution, yearName, startDate, endDate, isCurrent });
    ApiResponse.created(res, { year }, 'অর্থবছর সফলভাবে তৈরি করা হয়েছে');
  } catch (error) { next(error); }
};

exports.closeFinancialYear = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { id } = req.params;
    
    const year = await FinancialYear.findOne({ _id: id, institution });
    if (!year) return ApiResponse.error(res, 'অর্থবছর পাওয়া যায়নি', 404);
    
    year.status = 'closed';
    year.isCurrent = false;
    await year.save();
    
    // NOTE: Actual accounting closing logic (Retained Earnings) would go here
    // For now we just mark it as closed.
    
    ApiResponse.success(res, { year }, 'অর্থবছর সফলভাবে ক্লোজ করা হয়েছে');
  } catch (error) { next(error); }
};

// --- Advances ---
exports.getAdvances = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const advances = await Advance.find({ institution }).sort({ date: -1 });
    ApiResponse.success(res, { advances });
  } catch (error) { next(error); }
};

exports.createAdvance = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { personType, personName, amount, date, reason } = req.body;
    const advance = await Advance.create({ institution, personType, personName, amount, date, reason });
    ApiResponse.created(res, { advance }, 'অগ্রিম সফলভাবে যুক্ত করা হয়েছে');
  } catch (error) { next(error); }
};

exports.updateAdvance = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { id } = req.params;
    const { adjustedAmount, status } = req.body;
    
    const advance = await Advance.findOne({ _id: id, institution });
    if (!advance) return ApiResponse.error(res, 'অগ্রিম পাওয়া যায়নি', 404);
    
    if (adjustedAmount !== undefined) advance.adjustedAmount = adjustedAmount;
    if (status !== undefined) advance.status = status;
    
    if (advance.adjustedAmount >= advance.amount) advance.status = 'adjusted';
    
    await advance.save();
    ApiResponse.success(res, { advance }, 'অগ্রিম আপডেট করা হয়েছে');
  } catch (error) { next(error); }
};

// --- Refunds ---
exports.getRefunds = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const refunds = await Refund.find({ institution }).sort({ date: -1 });
    ApiResponse.success(res, { refunds });
  } catch (error) { next(error); }
};

exports.createRefund = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { personName, originalPaymentRef, amount, date, reason } = req.body;
    const refund = await Refund.create({ institution, personName, originalPaymentRef, amount, date, reason });
    ApiResponse.created(res, { refund }, 'রিফান্ড সফলভাবে যুক্ত করা হয়েছে');
  } catch (error) { next(error); }
};
`;
fs.appendFileSync('server/controllers/financeController.js', code);
