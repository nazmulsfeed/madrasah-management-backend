const InfrastructureExpiry = require('../models/InfrastructureExpiry');
const ApiResponse = require('../utils/apiResponse');
const {
  ensureExpiryTable,
  checkAndNotifyInfrastructureExpiries,
} = require('../utils/expiryNotifier');

// @desc    ডোমেইন ও হোস্টিং মেয়াদের তথ্য আনা (শুধু super_admin)
// @route   GET /api/v1/infrastructure-expiry
exports.getExpiries = async (req, res, next) => {
  try {
    await ensureExpiryTable();
    const institution = req.user?.institution || '';

    const rows = await InfrastructureExpiry.findAll({
      where: { institution },
    });

    const domain = rows.find((r) => r.serviceType === 'domain') || null;
    const hosting = rows.find((r) => r.serviceType === 'hosting') || null;

    ApiResponse.success(res, { domain, hosting });
  } catch (error) {
    next(error);
  }
};

// @desc    ডোমেইন বা হোস্টিং মেয়াদের তারিখ ও তথ্য সেট/নবায়ন করা (শুধু super_admin)
// @route   PUT /api/v1/infrastructure-expiry
exports.upsertExpiry = async (req, res, next) => {
  try {
    await ensureExpiryTable();
    const institution = req.user?.institution || '';
    const { serviceType, label, provider, expiryDate } = req.body;

    if (!['domain', 'hosting'].includes(serviceType)) {
      return ApiResponse.badRequest(res, 'সঠিক serviceType (domain বা hosting) দিন');
    }

    if (!expiryDate) {
      return ApiResponse.badRequest(res, 'মেয়াদ শেষ হওয়ার তারিখ নির্বাচন করুন');
    }

    const parsedDate = new Date(expiryDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return ApiResponse.badRequest(res, 'অবৈধ তারিখ দেওয়া হয়েছে');
    }

    // দিনের শেষ সময় (23:59:59) পর্যন্ত গণনা রাখতে চাইলে যদি শুধু YYYY-MM-DD আসে
    if (typeof expiryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiryDate.trim())) {
      parsedDate.setHours(23, 59, 59, 999);
    }

    const updatedBy = String(req.user._id || req.user.id || '');
    const existing = await InfrastructureExpiry.findOne({
      where: { institution, serviceType },
    });

    let saved;
    if (existing) {
      const oldTime = existing.expiryDate ? new Date(existing.expiryDate).getTime() : null;
      const dateChanged = oldTime !== parsedDate.getTime();
      await existing.update({
        label: label !== undefined ? String(label).trim() : existing.label,
        provider: provider !== undefined ? String(provider).trim() : existing.provider,
        expiryDate: parsedDate,
        notifiedMilestones: dateChanged ? [] : existing.notifiedMilestones,
        updatedBy,
      });
      saved = existing;
    } else {
      saved = await InfrastructureExpiry.create({
        institution,
        serviceType,
        label: String(label || '').trim(),
        provider: String(provider || '').trim(),
        expiryDate: parsedDate,
        notifiedMilestones: [],
        updatedBy,
      });
    }

    // যদি নতুন তারিখ ৩০ দিনের ভেতরে হয় তবে তাৎক্ষণিক নোটিফিকেশন যাচাই করবে;
    // ৩০ দিনের বেশি হলে কোনো নোটিফিকেশন যাবে না।
    checkAndNotifyInfrastructureExpiries().catch(() => {});

    ApiResponse.success(
      res,
      saved,
      `${serviceType === 'domain' ? 'ডোমেইন' : 'হোস্টিং'} মেয়াদের তথ্য সংরক্ষণ করা হয়েছে`
    );
  } catch (error) {
    next(error);
  }
};
