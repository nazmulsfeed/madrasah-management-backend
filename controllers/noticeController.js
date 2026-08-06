const { Op } = require('sequelize');
const Notice = require('../models/Notice');
const ApiResponse = require('../utils/apiResponse');
const { broadcastNotification } = require('../utils/pushHelper');

// @desc    পাবলিক নোটিশ তালিকা
// @route   GET /api/v1/notices/public
exports.getPublicNotices = async (req, res, next) => {
  try {
    const Institution = require('../models/Institution');
    const inst = await Institution.findOne();
    if (!inst || !inst.isHomeworkPublic) {
      return ApiResponse.forbidden(res, 'পাবলিক ভিউ নিষ্ক্রিয় রয়েছে');
    }

    const notices = await Notice.findAll({
      where: { isPublished: true },
      order: [['createdAt', 'DESC']]
    });

    ApiResponse.success(res, { notices });
  } catch (error) {
    next(error);
  }
};

// @desc    সকল নোটিশ দেখা
// @route   GET /api/v1/notices
exports.getNotices = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.userType !== 'super_admin' && req.user.institution) {
      where.institution = req.user.institution;
    }
    
    // Role based filtering
    if (!['super_admin', 'admin', 'principal', 'co_super_admin'].includes(req.user.userType)) {
      where.isPublished = true;
    }

    const notices = await Notice.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    ApiResponse.success(res, { notices });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন নোটিশ তৈরি
// @route   POST /api/v1/notices
exports.createNotice = async (req, res, next) => {
  try {
    const { title, content, audience, priority, isPublished } = req.body;

    const notice = await Notice.create({
      institution: req.user.institution,
      title,
      content,
      audience: audience || ['all'],
      priority: priority || 'normal',
      isPublished: isPublished !== undefined ? isPublished : true,
      publishedBy: req.user._id,
    });

    ApiResponse.created(res, { notice }, 'নোটিশ সফলভাবে তৈরি করা হয়েছে');

    // ব্যাকগ্রাউন্ডে নোটিফিকেশন পাঠানো হচ্ছে (await ব্যবহার না করায় সার্ভার ব্লক হবে না)
    broadcastNotification({
      title: `📢 নতুন নোটিশ: ${title}`,
      body: content ? content.substring(0, 100) : 'একটি নতুন নোটিশ পোস্ট করা হয়েছে।',
      url: '/public-homework',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    নোটিশ ডিলিট
// @route   DELETE /api/v1/notices/:id
exports.deleteNotice = async (req, res, next) => {
  try {
    const isNumeric = /^\d+$/.test(req.params.id);
    const notice = isNumeric
      ? await Notice.findByPk(req.params.id)
      : await Notice.findOne({ where: { _id: req.params.id } });

    if (!notice) {
      return ApiResponse.notFound(res, 'নোটিশ পাওয়া যায়নি');
    }

    await notice.destroy();
    ApiResponse.success(res, null, 'নোটিশ মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};
// @desc    নোটিশ আপডেট
// @route   PUT /api/v1/notices/:id
exports.updateNotice = async (req, res, next) => {
  try {
    const isNumeric = /^\d+$/.test(req.params.id);
    const notice = isNumeric
      ? await Notice.findByPk(req.params.id)
      : await Notice.findOne({ where: { _id: req.params.id } });

    if (!notice) {
      return ApiResponse.notFound(res, 'নোটিশ পাওয়া যায়নি');
    }

    const { title, content, audience, priority, isPublished } = req.body;

    if (title !== undefined) notice.title = title;
    if (content !== undefined) notice.content = content;
    if (audience !== undefined) notice.audience = audience;
    if (priority !== undefined) notice.priority = priority;
    if (isPublished !== undefined) notice.isPublished = isPublished;

    await notice.save();
    
    ApiResponse.success(res, { notice }, 'নোটিশ সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
