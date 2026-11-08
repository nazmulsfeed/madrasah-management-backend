const { Op } = require('sequelize');
const HifzDailyProgress = require('../models/HifzDailyProgress');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const ApiResponse = require('../utils/apiResponse');

// Drop old unique index if it exists, to allow multiple progress entries per student per day.
if (HifzDailyProgress.collection) {
  HifzDailyProgress.collection.dropIndex('student_1_date_1').catch(() => {});
}

// @desc    হিফজ/নাজেরা/মক্তব অগ্রগতি ও পড়া দেখা
// @route   GET /api/v1/hifz
exports.getHifzProgress = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.userType !== 'super_admin' && req.user.institution) {
      filter.institution = req.user.institution;
    }

    const userType = req.user.userType;
    if (userType === 'student') {
      const userIdentifier = req.user._id ? req.user._id.toString() : '';
      const studentDoc = await Student.findOne({
        where: {
          user: userIdentifier,
          isDeleted: { [Op.ne]: true }
        }
      });
      if (studentDoc) {
        filter.student = studentDoc._id ? studentDoc._id.toString() : studentDoc.id.toString();
      } else {
        return ApiResponse.success(res, { progress: [] });
      }
    } else if (userType === 'guardian') {
      const userIdentifier = req.user._id ? req.user._id.toString() : '';
      const guardianDoc = await Guardian.findOne({
        where: { user: userIdentifier }
      });
      if (guardianDoc && guardianDoc.students && guardianDoc.students.length > 0) {
        filter.student = { $in: guardianDoc.students };
      } else {
        return ApiResponse.success(res, { progress: [] });
      }
    } else {
      if (req.query.student) filter.student = req.query.student;
    }

    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }

    if (req.query.dateFilter === 'today') {
      const now = new Date();
      // UTC+6 (Bangladesh)
      const bdDateStr = new Date(now.getTime() + (6 * 60 * 60 * 1000)).toISOString().slice(0, 10);
      const targetDate = new Date(bdDateStr);
      targetDate.setHours(0, 0, 0, 0);
      filter.date = targetDate;
    } else if (req.query.date) {
      const targetDate = new Date(req.query.date);
      targetDate.setHours(0, 0, 0, 0);
      filter.date = targetDate;
    }

    const progress = await HifzDailyProgress.find(filter)
      .populate({
        path: 'student',
        select: 'user studentId roll photo bloodGroup currentEnrollment',
        populate: {
          path: 'user',
          select: 'firstName lastName fullName'
        }
      })
      .populate('teacher', 'firstName lastName fullName')
      .sort({ date: -1 });

    ApiResponse.success(res, { progress });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন হিফজ/নাজেরা/মক্তব অগ্রগতি ও পড়া যোগ করা
// @route   POST /api/v1/hifz
exports.saveHifzProgress = async (req, res, next) => {
  try {
    const { 
      student, 
      date, 
      category = 'hifz',
      hifzData = {}, 
      sabaq, 
      sabqi, 
      manzil, 
      quality = 'good', 
      mistakesCount = 0, 
      remarks = '' 
    } = req.body;
    
    if (!student) {
      return ApiResponse.badRequest(res, 'শিক্ষার্থী নির্বাচন করা আবশ্যক');
    }

    const targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);

    const transactionId = 'HZ' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();

    // Auto-generate summary for sabaq if not provided
    let computedSabaq = sabaq || '';
    if (!computedSabaq && hifzData) {
      if (category === 'hifz') {
        computedSabaq = [
          hifzData.sabaqPara ? `পারা: ${hifzData.sabaqPara}` : '',
          hifzData.sabaqDetails || ''
        ].filter(Boolean).join(' - ') || 'হিফজ পড়া';
      } else if (category === 'nazera') {
        computedSabaq = [
          hifzData.nazeraPara ? `পারা: ${hifzData.nazeraPara}` : '',
          hifzData.nazeraSurah || '',
          hifzData.nazeraPage ? `পৃষ্ঠা: ${hifzData.nazeraPage}` : '',
          hifzData.nazeraAyat ? `আয়াত: ${hifzData.nazeraAyat}` : '',
          hifzData.nazeraQaidaLesson ? `কায়দা: ${hifzData.nazeraQaidaLesson}` : ''
        ].filter(Boolean).join(' - ') || 'নাজেরা পড়া';
      } else if (category === 'maktab') {
        computedSabaq = [
          hifzData.maktabSurah ? `আমপারা: ${hifzData.maktabSurah}` : '',
          hifzData.maktabLesson ? `সবক: ${hifzData.maktabLesson}` : ''
        ].filter(Boolean).join(' - ') || 'মক্তব পড়া';
      }
    }

    const record = {
      institution: req.user.institution || '',
      student,
      date: targetDate,
      transactionId,
      category,
      hifzData,
      sabaq: computedSabaq,
      sabqi: sabqi || '',
      manzil: manzil || '',
      quality,
      mistakesCount: Number(mistakesCount) || 0,
      remarks,
      teacher: req.user._id ? req.user._id.toString() : '',
    };

    const newProgress = await HifzDailyProgress.create(record);

    const populatedProgress = await HifzDailyProgress.findById(newProgress._id)
      .populate({
        path: 'student',
        select: 'user studentId roll photo currentEnrollment',
        populate: {
          path: 'user',
          select: 'firstName lastName fullName'
        }
      })
      .populate('teacher', 'firstName lastName fullName');

    ApiResponse.success(res, { progress: populatedProgress }, 'পড়া ও অগ্রগতি সফলভাবে নির্ধারণ করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হিফজ অগ্রগতি আপডেট করা
// @route   PATCH /api/v1/hifz/:id
exports.updateHifzProgress = async (req, res, next) => {
  try {
    const { category, hifzData, sabaq, sabqi, manzil, quality, mistakesCount, remarks, date } = req.body;
    
    const updateFields = {};
    if (category !== undefined) updateFields.category = category;
    if (hifzData !== undefined) updateFields.hifzData = hifzData;
    if (sabaq !== undefined) updateFields.sabaq = sabaq;
    if (sabqi !== undefined) updateFields.sabqi = sabqi;
    if (manzil !== undefined) updateFields.manzil = manzil;
    if (quality !== undefined) updateFields.quality = quality;
    if (mistakesCount !== undefined) updateFields.mistakesCount = mistakesCount;
    if (remarks !== undefined) updateFields.remarks = remarks;
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      updateFields.date = targetDate;
    }

    const filter = { _id: req.params.id };
    if (req.user.userType !== 'super_admin' && req.user.institution) {
      filter.institution = req.user.institution;
    }

    const progress = await HifzDailyProgress.findOneAndUpdate(
      filter,
      { $set: updateFields },
      { new: true }
    ).populate({
      path: 'student',
      select: 'user studentId roll photo currentEnrollment',
      populate: {
        path: 'user',
        select: 'firstName lastName fullName'
      }
    });

    if (!progress) {
      return ApiResponse.notFound(res, 'হিফজ রেকর্ড পাওয়া যায়নি');
    }

    ApiResponse.success(res, { progress }, 'পড়া ও অগ্রগতি সফলভাবে আপডেট করা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    হিফজ অগ্রগতি মুছে ফেলা
// @route   DELETE /api/v1/hifz/:id
exports.deleteHifzProgress = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.userType !== 'super_admin' && req.user.institution) {
      filter.institution = req.user.institution;
    }

    const progress = await HifzDailyProgress.findOneAndDelete(filter);

    if (!progress) {
      return ApiResponse.notFound(res, 'হিফজ রেকর্ড পাওয়া যায়নি');
    }

    ApiResponse.success(res, null, 'পড়া ও অগ্রগতি সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};
