const Voucher = require('../models/Voucher');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const auditLogger = require('./auditLogController');
const { Op } = require('sequelize');

// Helper to check management permission
const hasAdminRole = (user) => {
  const role = user?.userType || user?.adminRole || '';
  return ['super_admin', 'co_super_admin', 'admin', 'principal'].includes(role);
};

// @desc    Get all vouchers with filters & stats
// @route   GET /api/v1/vouchers
exports.getVouchers = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { status, from, to, search } = req.query;

    const where = { institution };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (from && to) {
      where.date = {
        [Op.between]: [new Date(`${from}T00:00:00.000Z`), new Date(`${to}T23:59:59.999Z`)]
      };
    } else if (from) {
      where.date = { [Op.gte]: new Date(`${from}T00:00:00.000Z`) };
    } else if (to) {
      where.date = { [Op.lte]: new Date(`${to}T23:59:59.999Z`) };
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { voucherNumber: { [Op.like]: q } },
        { payeeName: { [Op.like]: q } },
        { description: { [Op.like]: q } },
      ];
    }

    const vouchers = await Voucher.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    // Bulk load accounts & users for fast enrichment
    const [accounts, users] = await Promise.all([
      Account.findAll({ where: { institution } }),
      User.findAll({ where: { institution } }),
    ]);

    const accountMap = new Map();
    accounts.forEach(a => {
      const aObj = typeof a.toJSON === 'function' ? a.toJSON() : a;
      accountMap.set(String(aObj._id), aObj);
    });

    const userMap = new Map();
    users.forEach(u => {
      const uObj = typeof u.toJSON === 'function' ? u.toJSON() : u;
      userMap.set(String(uObj._id), uObj);
    });

    let totalAmount = 0;
    let approvedAmount = 0;
    let pendingAmount = 0;

    const populatedVouchers = vouchers.map(v => {
      const vObj = typeof v.toJSON === 'function' ? v.toJSON() : { ...v };
      const amount = Number(vObj.amount) || 0;
      totalAmount += amount;

      if (vObj.status === 'approved') {
        approvedAmount += amount;
      } else if (vObj.status === 'pending' || vObj.status === 'level_1_approved') {
        pendingAmount += amount;
      }

      const prepUser = userMap.get(String(vObj.preparedBy));
      const appUser = userMap.get(String(vObj.approvedBy));
      const verUser = userMap.get(String(vObj.verifiedBy));

      return {
        ...vObj,
        expenseAccountDetails: accountMap.get(String(vObj.expenseAccount)) || { name: 'ব্যয়ের খাত' },
        fundAccountDetails: accountMap.get(String(vObj.fundAccount)) || { name: 'তহবিল খাত' },
        preparedByName: prepUser ? `${prepUser.firstName || ''} ${prepUser.lastName || ''}`.trim() || prepUser.username : 'অফিস স্টাফ',
        approvedByName: appUser ? `${appUser.firstName || ''} ${appUser.lastName || ''}`.trim() || appUser.username : null,
        verifiedByName: verUser ? `${verUser.firstName || ''} ${verUser.lastName || ''}`.trim() || verUser.username : null,
      };
    });

    ApiResponse.success(res, {
      vouchers: populatedVouchers,
      stats: {
        totalCount: vouchers.length,
        totalAmount,
        approvedAmount,
        pendingAmount,
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single voucher by ID
// @route   GET /api/v1/vouchers/:id
exports.getVoucherById = async (req, res, next) => {
  try {
    const voucher = await Voucher.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });
    if (!voucher) return ApiResponse.notFound(res, 'ভাউচার পাওয়া যায়নি');
    ApiResponse.success(res, { voucher });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new voucher
// @route   POST /api/v1/vouchers
exports.createVoucher = async (req, res, next) => {
  try {
    const {
      date,
      payeeName,
      expenseAccount,
      fundAccount,
      amount,
      paymentMethod,
      description,
      attachment,
      autoApprove = false,
    } = req.body;

    if (!payeeName || !expenseAccount || !fundAccount || !amount) {
      return ApiResponse.error(res, 'প্রাপকের নাম, ব্যয়ের খাত, ফান্ড খাত এবং টাকার পরিমাণ আবশ্যক', 400);
    }

    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) {
      return ApiResponse.error(res, 'টাকার পরিমাণ শূন্যের বেশি হতে হবে', 400);
    }

    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const voucherNumber = `VCH-${Date.now().toString().slice(-6)}-${randSuffix}`;

    const isAdmin = hasAdminRole(req.user);
    const shouldApprove = autoApprove && isAdmin;

    const voucher = await Voucher.create({
      institution: req.user.institution,
      voucherNumber,
      date: date || new Date(),
      payeeName: payeeName.trim(),
      expenseAccount,
      fundAccount,
      amount: numAmount,
      paymentMethod: paymentMethod || 'cash',
      description: description ? description.trim() : '',
      attachment: attachment || null,
      status: shouldApprove ? 'approved' : 'pending',
      approvalLevel: shouldApprove ? 2 : 0,
      preparedBy: req.user._id,
      approvedBy: shouldApprove ? req.user._id : null,
    });

    let journal = null;
    if (shouldApprove) {
      try {
        const entries = [
          { account: expenseAccount, debit: numAmount, credit: 0 },
          { account: fundAccount, debit: 0, credit: numAmount }
        ];

        journal = await JournalEntry.create({
          institution: req.user.institution,
          date: voucher.date,
          reference: voucher.voucherNumber,
          description: `ভাউচার পেমেন্ট: ${voucher.payeeName} - ${voucher.description || ''}`,
          entries
        });

        // Update Account Balances
        const expAcc = await Account.findOne({ where: { _id: expenseAccount, institution: req.user.institution } });
        if (expAcc) {
          expAcc.balance = (Number(expAcc.balance) || 0) + numAmount;
          await expAcc.save();
        }

        const fundAcc = await Account.findOne({ where: { _id: fundAccount, institution: req.user.institution } });
        if (fundAcc) {
          fundAcc.balance = (Number(fundAcc.balance) || 0) - numAmount;
          await fundAcc.save();
        }
      } catch (e) {
        console.error('Voucher auto-approval journal creation error:', e);
      }
    }

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'create',
      'Voucher',
      voucher._id,
      `ভাউচার তৈরি করা হয়েছে: ${voucherNumber} - ৳${numAmount}${shouldApprove ? ' (স্বয়ংক্রিয় অনুমোদিত)' : ''}`,
      null,
      voucher
    );

    const message = shouldApprove
      ? 'ভাউচার সফলভাবে তৈরি এবং অনুমোদিত হয়েছে'
      : 'ভাউচার সফলভাবে তৈরি করা হয়েছে এবং অনুমোদনের অপেক্ষায় আছে';

    ApiResponse.created(res, { voucher, journal }, message);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify voucher (Super/Principal level)
// @route   POST /api/v1/vouchers/:id/verify
exports.verifyVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });
    if (!voucher) return ApiResponse.notFound(res, 'ভাউচার পাওয়া যায়নি');

    if (voucher.status !== 'pending') {
      return ApiResponse.error(res, 'শুধুমাত্র অপেক্ষাধীন ভাউচার যাচাই করা যাবে', 400);
    }

    voucher.status = 'level_1_approved';
    voucher.approvalLevel = 1;
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
      { status: 'level_1_approved', verifiedBy: req.user._id }
    );

    ApiResponse.success(res, { voucher }, 'ভাউচার যাচাই (Level-1 Approved) করা হয়েছে, চূড়ান্ত অনুমোদনের অপেক্ষায় আছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Approve voucher
// @route   POST /api/v1/vouchers/:id/approve
exports.approveVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });
    if (!voucher) return ApiResponse.notFound(res, 'ভাউচার পাওয়া যায়নি');

    if (voucher.status === 'approved') {
      return ApiResponse.error(res, 'এই ভাউচারটি ইতিমধ্যে অনুমোদিত হয়েছে', 400);
    }

    voucher.status = 'approved';
    voucher.approvalLevel = 2;
    voucher.approvedBy = req.user._id;
    await voucher.save();

    const numAmount = Number(voucher.amount) || 0;

    // Create Double Entry Journal
    const entries = [
      { account: voucher.expenseAccount, debit: numAmount, credit: 0 },
      { account: voucher.fundAccount, debit: 0, credit: numAmount }
    ];

    const journal = await JournalEntry.create({
      institution: req.user.institution,
      date: voucher.date,
      reference: voucher.voucherNumber,
      description: `ভাউচার পেমেন্ট: ${voucher.payeeName} - ${voucher.description || ''}`,
      entries
    });

    // Update balances
    const expAcc = await Account.findOne({ where: { _id: voucher.expenseAccount, institution: req.user.institution } });
    if (expAcc) {
      expAcc.balance = (Number(expAcc.balance) || 0) + numAmount;
      await expAcc.save();
    }

    const fundAcc = await Account.findOne({ where: { _id: voucher.fundAccount, institution: req.user.institution } });
    if (fundAcc) {
      fundAcc.balance = (Number(fundAcc.balance) || 0) - numAmount;
      await fundAcc.save();
    }

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'approve',
      'Voucher',
      voucher._id,
      `ভাউচার চূড়ান্ত অনুমোদন (Approve) করা হয়েছে: ${voucher.voucherNumber}`,
      { status: 'pending' },
      { status: 'approved', approvedBy: req.user._id }
    );

    ApiResponse.success(res, { voucher, journal }, 'ভাউচার সফলভাবে অনুমোদিত হয়েছে এবং হিসাব খতিয়ানে যুক্ত করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Reject voucher
// @route   POST /api/v1/vouchers/:id/reject
exports.rejectVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });
    if (!voucher) return ApiResponse.notFound(res, 'ভাউচার পাওয়া যায়নি');

    if (voucher.status === 'approved') {
      return ApiResponse.error(res, 'অনুমোদিত ভাউচার সরাসরি বাতিল করা যায় না', 400);
    }

    const prevStatus = voucher.status;
    voucher.status = 'rejected';
    await voucher.save();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'reject',
      'Voucher',
      voucher._id,
      `ভাউচার বাতিল (Reject) করা হয়েছে: ${voucher.voucherNumber}`,
      { status: prevStatus },
      { status: 'rejected' }
    );

    ApiResponse.success(res, { voucher }, 'ভাউচারটি সফলভাবে বাতিল করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete voucher
// @route   DELETE /api/v1/vouchers/:id
exports.deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findOne({
      where: { _id: req.params.id, institution: req.user.institution }
    });
    if (!voucher) return ApiResponse.notFound(res, 'ভাউচার পাওয়া যায়নি');

    const numAmount = Number(voucher.amount) || 0;

    // If voucher was approved, reverse accounting balances and delete journal
    if (voucher.status === 'approved') {
      try {
        const expAcc = await Account.findOne({ where: { _id: voucher.expenseAccount, institution: req.user.institution } });
        if (expAcc) {
          expAcc.balance = Math.max(0, (Number(expAcc.balance) || 0) - numAmount);
          await expAcc.save();
        }

        const fundAcc = await Account.findOne({ where: { _id: voucher.fundAccount, institution: req.user.institution } });
        if (fundAcc) {
          fundAcc.balance = (Number(fundAcc.balance) || 0) + numAmount;
          await fundAcc.save();
        }

        await JournalEntry.destroy({
          where: { reference: voucher.voucherNumber, institution: req.user.institution }
        });
      } catch (e) {
        console.error('Error reverting journal on voucher delete:', e);
      }
    }

    const voucherNum = voucher.voucherNumber;
    await voucher.destroy();

    await auditLogger.logAction(
      req.user.institution,
      req.user._id,
      'delete',
      'Voucher',
      voucher._id,
      `ভাউচার মুছে ফেলা হয়েছে: ${voucherNum}`,
      voucher,
      null
    );

    ApiResponse.success(res, null, 'ভাউচার সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};
