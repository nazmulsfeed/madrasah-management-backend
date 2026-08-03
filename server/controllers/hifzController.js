const HifzDailyProgress = require('../models/HifzDailyProgress');
const ApiResponse = require('../utils/apiResponse');

// Drop old unique index if it exists, to allow multiple progress entries per student per day.
if (HifzDailyProgress.collection) {
  HifzDailyProgress.collection.dropIndex('student_1_date_1').catch(() => {});
}

// @desc    হিফজ অগ্রগতি দেখা
// @route   GET /api/v1/hifz
exports.getHifzProgress = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    
    if (req.query.student) filter.student = req.query.student;
    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      targetDate.setHours(0, 0, 0, 0);
      filter.date = targetDate;
    }

    const progress = await HifzDailyProgress.find(filter)
      .populate({
        path: 'student',
        select: 'user studentId',
        populate: {
          path: 'user',
          select: 'firstName lastName fullName'
        }
      })
      .populate('teacher', 'firstName lastName')
      .sort({ date: -1 });

    ApiResponse.success(res, { progress });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন হিফজ অগ্রগতি যোগ করা
// @route   POST /api/v1/hifz
exports.saveHifzProgress = async (req, res, next) => {
  try {
    const { student, date, sabaq, sabqi, manzil, quality, mistakesCount, remarks } = req.body;
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const transactionId = 'HZ' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();

    const record = {
      institution: req.user.institution,
      student,
      date: targetDate,
      transactionId,
      sabaq,
      sabqi,
      manzil,
      quality,
      mistakesCount,
      remarks,
      teacher: req.user._id,
    };

    const newProgress = await HifzDailyProgress.create(record);

    const populatedProgress = await HifzDailyProgress.findById(newProgress._id)
      .populate({
        path: 'student',
        select: 'user studentId',
        populate: {
          path: 'user',
          select: 'firstName lastName fullName'
        }
      })
      .populate('teacher', 'firstName lastName');

    ApiResponse.success(res, { progress: populatedProgress }, 'হিফজ অগ্রগতি সফলভাবে রেকর্ড করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হিফজ অগ্রগতি আপডেট করা
// @route   PATCH /api/v1/hifz/:id
exports.updateHifzProgress = async (req, res, next) => {
  try {
    const { sabaq, sabqi, manzil, quality, mistakesCount, remarks } = req.body;
    const progress = await HifzDailyProgress.findOneAndUpdate(
      { _id: req.params.id, institution: req.user.institution },
      { $set: { sabaq, sabqi, manzil, quality, mistakesCount, remarks } },
      { new: true }
    ).populate({
      path: 'student',
      select: 'user studentId',
      populate: {
        path: 'user',
        select: 'firstName lastName fullName'
      }
    });

    if (!progress) {
      return ApiResponse.notFound(res, 'হিফজ রেকর্ড পাওয়া যায়নি');
    }

    ApiResponse.success(res, { progress }, 'হিফজ অগ্রগতি সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হিফজ অগ্রগতি মুছে ফেলা
// @route   DELETE /api/v1/hifz/:id
exports.deleteHifzProgress = async (req, res, next) => {
  try {
    const progress = await HifzDailyProgress.findOneAndDelete({
      _id: req.params.id,
      institution: req.user.institution
    });

    if (!progress) {
      return ApiResponse.notFound(res, 'হিফজ রেকর্ড পাওয়া যায়নি');
    }

    ApiResponse.success(res, null, 'হিফজ অগ্রগতি সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};
