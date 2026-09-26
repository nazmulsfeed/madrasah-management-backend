const PushSubscription = require('../models/PushSubscription');
const ApiResponse = require('../utils/apiResponse');

// @desc    নতুন পুশ সাবস্ক্রিপশন সেভ করা
// @route   POST /api/v1/push/subscribe
exports.subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys, userId, studentId } = req.body;

    if (!endpoint || !keys) {
      return ApiResponse.error(res, 'endpoint এবং keys আবশ্যক', 400);
    }

    let finalUserId = userId ? String(userId) : null;
    let finalStudentId = studentId ? String(studentId) : null;

    // যদি Authorization হেডার থাকে কিন্তু userId পাঠানো না হয়ে থাকে
    if (!finalUserId && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'annur-islamic-academy-super-secure-key-2026');
        if (decoded && decoded.id) {
          finalUserId = String(decoded.id);
        }
      } catch (_) {}
    }

    // যদি userId থাকে কিন্তু studentId না থাকে, তবে Student মডেল থেকে খুঁজে বের করা
    if (finalUserId && !finalStudentId) {
      try {
        const Student = require('../models/Student');
        const student = await Student.findOne({ where: { user: finalUserId } });
        if (student) {
          finalStudentId = String(student.studentId || student._id);
        }
      } catch (_) {}
    }

    const payload = { endpoint, keys };
    if (finalUserId) payload.userId = finalUserId;
    if (finalStudentId) payload.studentId = finalStudentId;

    // যদি আগে থেকে সেভ করা থাকে, আপডেট/আপসার্ট করা
    await PushSubscription.upsert(payload);

    res.status(201).json({ 
      success: true, 
      message: 'নোটিফিকেশন সাবস্ক্রিপশন সফলভাবে সেভ হয়েছে।',
      data: { userId: finalUserId, studentId: finalStudentId }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    পুশ সাবস্ক্রিপশন ডিলিট করা (Unsubscribe)
// @route   POST /api/v1/push/unsubscribe
exports.unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return ApiResponse.error(res, 'endpoint আবশ্যক', 400);
    }

    await PushSubscription.destroy({ where: { endpoint } });

    res.json({ success: true, message: 'নোটিফিকেশন সাবস্ক্রিপশন বাতিল হয়েছে।' });
  } catch (error) {
    next(error);
  }
};

// @desc    VAPID Public Key পাঠানো (ফ্রন্টএন্ডের জন্য)
// @route   GET /api/v1/push/vapid-key
exports.getVapidKey = (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY });
};
