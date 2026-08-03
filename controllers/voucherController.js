const Voucher = require('../models/Voucher');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const ApiResponse = require('../utils/apiResponse');
const auditLogger = require('./auditLogController');

// @desc    Get all vouchers
// @route   GET /api/v1/vouchers
exports.getVouchers = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const vouchers = await Voucher.find(filter).sort({ date: -1 });
    
    // Manual populate for string references
    const accounts = await Account.find({ institution: req.user.institution });
    const accountMap = {};
    accounts.forEach(a => accountMap[a._id.toString()] = a);

    const User = require('../models/User');
    const users = await User.find({ institution: req.user.institution });
    const userMap = {};
    users.forEach(u => userMap[u._id.toString()] = u);

    const populatedVouchers = vouchers.map(v => {
      const vObj = typeof v.toJSON === 'function' ? v.toJSON() : v;
      const prepUser = userMap[vObj.preparedBy];
      const appUser = userMap[vObj.approvedBy];
      return {
        ...vObj,
        expenseAccountDetails: accountMap[vObj.expenseAccount] || { name: 'Unknown' },
        fundAccountDetails: accountMap[vObj.fundAccount] || { name: 'Unknown' },
        preparedByName: prepUser ? `${prepUser.firstName} ${prepUser.lastName || ''}`.trim() : 'System',
        approvedByName: appUser ? `${appUser.firstName} ${appUser.lastName || ''}`.trim() : 'N/A',
      };
    });

    ApiResponse.success(res, { vouchers: populatedVouchers });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new voucher
// @route   POST /api/v1/vouchers
exports.createVoucher = async (req, res, next) => {
  try {
    const { date, payeeName, expenseAccount, fundAccount, amount, paymentMethod, description, attachment } = req.body;
    
    const voucherNumber = `VCH-${Date.now()}`;

    const voucher = await Voucher.create({
      institution: req.user.institution,
      voucherNumber,
      date: date || new Date(),
      payeeName,
      expenseAccount,
      fundAccount,
      amount,
      paymentMethod,
      description,
      attachment,
      status: 'pending',
      preparedBy: req.user._id,
    });

    // Log the action
    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'create',
      'Voucher',
      voucher._id,
      `ভাউচার তৈরি করা হয়েছে: ${voucherNumber} - ৳${amount}`,
      null,
      voucher
    );

    ApiResponse.created(res, { voucher }, 'ভাউচার সফলভাবে তৈরি করা হয়েছে এবং অনুমোদনের অপেক্ষায় আছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Verify voucher (Super/Principal level)
// @route   POST /api/v1/vouchers/:id/verify
exports.verifyVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return ApiResponse.notFound(res, 'ভাউচার পাওয়া যায়নি');
    if (voucher.institution !== req.user.institution) return ApiResponse.error(res, 'Unauthorised', 403);
    
    if (voucher.status !== 'pending') return ApiResponse.error(res, 'শুধুমাত্র অপেক্ষাধীন ভাউচার যাচাই করা যাবে', 400);

    voucher.status = 'verified';
    voucher.verifiedBy = req.user._id;
    await voucher.save();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'verify',
      'Voucher',
      voucher._id,
      `ভাউচার যাচাই (Verify) করা হয়েছে: ${voucher.voucherNumber}`,
      { status: 'pending' },
      { status: 'verified', verifiedBy: req.user._id }
    );

    ApiResponse.success(res, { voucher }, 'ভাউচার যাচাই (Verify) করা হয়েছে, এখন চূড়ান্ত অনুমোদনের অপেক্ষায় আছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Approve voucher
// @route   POST /api/v1/vouchers/:id/approve
exports.approveVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return ApiResponse.notFound(res, 'ভাউচার পাওয়া যায়নি');
    if (voucher.institution !== req.user.institution) return ApiResponse.error(res, 'Unauthorised', 403);
    
    if (voucher.status === 'approved') return ApiResponse.error(res, 'এই ভাউচার ইতিমধ্যে অনুমোদিত', 400);

    if (voucher.status === 'pending' && req.user.userType !== 'super_admin') {
      return ApiResponse.error(res, 'ভাউচারটি চূড়ান্ত অনুমোদনের আগে যাচাই (Verify) করতে হবে', 400);
    }

    voucher.status = 'approved';
    voucher.approvedBy = req.user._id;
    await voucher.save();

    // Create Double Entry Journal
    const entries = [
      { account: voucher.expenseAccount, debit: voucher.amount, credit: 0 },
      { account: voucher.fundAccount, debit: 0, credit: voucher.amount }
    ];

    const journal = await JournalEntry.create({
      institution: req.user.institution,
      date: voucher.date,
      reference: voucher.voucherNumber,
      description: `ভাউচার পেমেন্ট: ${voucher.payeeName} - ${voucher.description || ''}`,
      entries
    });

    // Update balances
    const expAcc = await Account.findById(voucher.expenseAccount);
    if (expAcc) { expAcc.balance += voucher.amount; await expAcc.save(); }
    
    const fundAcc = await Account.findById(voucher.fundAccount);
    if (fundAcc) { fundAcc.balance -= voucher.amount; await fundAcc.save(); }

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'approve',
      'Voucher',
      voucher._id,
      `ভাউচার অনুমোদন (Approve) করা হয়েছে: ${voucher.voucherNumber}`,
      { status: 'verified' },
      { status: 'approved', approvedBy: req.user._id }
    );

    ApiResponse.success(res, { voucher, journal }, 'ভাউচার অনুমোদিত এবং একাউন্টিং এ রেকর্ড করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Reject voucher
// @route   POST /api/v1/vouchers/:id/reject
exports.rejectVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return ApiResponse.notFound(res, 'ভাউচার পাওয়া যায়নি');
    if (voucher.status !== 'pending') return ApiResponse.error(res, 'শুধুমাত্র পেন্ডিং ভাউচার বাতিল করা যাবে', 400);

    voucher.status = 'rejected';
    await voucher.save();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'reject',
      'Voucher',
      voucher._id,
      `ভাউচার বাতিল (Reject) করা হয়েছে: ${voucher.voucherNumber}`,
      { status: 'pending' },
      { status: 'rejected' }
    );

    ApiResponse.success(res, { voucher }, 'ভাউচার বাতিল করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
