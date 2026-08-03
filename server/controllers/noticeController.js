const Notice = require('../models/Notice');
const ApiResponse = require('../utils/apiResponse');

// @desc    সকল নোটিশ দেখা
// @route   GET /api/v1/notices
exports.getNotices = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    
    // Role based filtering
    if (req.user.userType !== 'super_admin' && req.user.userType !== 'admin' && req.user.userType !== 'principal') {
      filter.isPublished = true;
      filter.$or = [
        { audience: 'all' },
        { audience: `${req.user.userType}s` } // e.g. 'students', 'teachers'
      ];
    }

    const notices = await Notice.find(filter)
      .populate('publishedBy', 'firstName lastName')
      .sort({ publishedAt: -1 });

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
      priority,
      isPublished: isPublished !== undefined ? isPublished : true,
      publishedBy: req.user._id,
    });

    ApiResponse.created(res, { notice }, 'নোটিশ সফলভাবে তৈরি করা হয়েছে');
  } catch (error) {
    next(error);
  }
};
