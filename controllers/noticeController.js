const { Op } = require('sequelize');
const Notice = require('../models/Notice');
const ApiResponse = require('../utils/apiResponse');
const { broadcastNotification, sendNoticePush } = require('../utils/pushHelper');

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
      where.institution = {
        [Op.or]: [req.user.institution, null, '']
      };
    }
    
    // Role based filtering
    if (!['super_admin', 'admin', 'principal', 'co_super_admin'].includes(req.user.userType)) {
      where.isPublished = true;
    }

    const notices = await Notice.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    const { enrichWithUsers } = require('../utils/userEnricher');
    const enrichedNotices = await enrichWithUsers(notices, ['publishedBy']);

    // Fetch this user's seen notices from database
    const NoticeRead = require('../models/NoticeRead');
    const userReads = await NoticeRead.findAll({
      where: { user: req.user._id },
      attributes: ['notice']
    });
    const seenNoticeIds = new Set(userReads.map(r => String(r.notice)));

    const noticesWithSeenState = enrichedNotices.map(notice => {
      const noticeObj = typeof notice.toJSON === 'function' ? notice.toJSON() : { ...notice };
      const id = String(noticeObj._id || noticeObj.id);
      noticeObj.isSeen = seenNoticeIds.has(id);
      return noticeObj;
    });

    const unseenCount = noticesWithSeenState.filter(n => !n.isSeen).length;

    ApiResponse.success(res, { notices: noticesWithSeenState, unseenCount });
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

    // ব্যাকগ্রাউন্ডে নোটিফিকেশন পাঠানো হচ্ছে (পাবলিক ভিউ অন থাকলে ব্রডকাস্ট, অফ থাকলে শুধু সংশ্লিষ্ট লগইন করা ইউজাররা পাবে)
    sendNoticePush({
      notice,
      payload: {
        title: `📢 নতুন নোটিশ: ${title}`,
        body: content ? content.substring(0, 100) : 'একটি নতুন নোটিশ পোস্ট করা হয়েছে।',
      }
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

// @desc    নির্দিষ্ট নোটিশ পড়া হয়েছে হিসেবে চিহ্নিত করা (Mark single notice as seen)
// @route   POST /api/v1/notices/:id/seen
exports.markNoticeAsSeen = async (req, res, next) => {
  try {
    const noticeId = req.params.id;
    const userId = req.user._id;

    const NoticeRead = require('../models/NoticeRead');
    await NoticeRead.findOrCreate({
      where: { notice: noticeId, user: userId },
      defaults: {
        notice: noticeId,
        user: userId,
        readAt: new Date()
      }
    });

    ApiResponse.success(res, { noticeId, isSeen: true }, 'নোটিশটি পড়া হয়েছে হিসেবে চিহ্নিত হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    সকল নোটিশ পড়া হয়েছে হিসেবে চিহ্নিত করা (Mark all notices as seen)
// @route   POST /api/v1/notices/mark-all-seen
exports.markAllNoticesAsSeen = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const where = {};
    if (req.user.userType !== 'super_admin' && req.user.institution) {
      where.institution = {
        [Op.or]: [req.user.institution, null, '']
      };
    }
    if (!['super_admin', 'admin', 'principal', 'co_super_admin'].includes(req.user.userType)) {
      where.isPublished = true;
    }

    const allNotices = await Notice.findAll({
      where,
      attributes: ['_id', 'id']
    });

    const NoticeRead = require('../models/NoticeRead');
    const records = allNotices.map(n => ({
      notice: String(n._id || n.id),
      user: userId,
      readAt: new Date()
    }));

    for (const rec of records) {
      await NoticeRead.findOrCreate({
        where: { notice: rec.notice, user: rec.user },
        defaults: rec
      }).catch(() => {});
    }

    ApiResponse.success(res, { count: records.length }, 'সকল নোটিশ পড়া হয়েছে হিসেবে চিহ্নিত হয়েছে');
  } catch (error) {
    next(error);
  }
};

