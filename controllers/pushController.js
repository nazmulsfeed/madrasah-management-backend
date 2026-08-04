const PushSubscription = require('../models/PushSubscription');
const ApiResponse = require('../utils/apiResponse');

// @desc    নতুন পুশ সাবস্ক্রিপশন সেভ করা
// @route   POST /api/v1/push/subscribe
exports.subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys) {
      return ApiResponse.error(res, 'endpoint এবং keys আবশ্যক', 400);
    }

    // যদি আগে থেকে সেভ করা থাকে, নতুন করে সেভ না করা
    await PushSubscription.upsert({ endpoint, keys });

    res.status(201).json({ success: true, message: 'নোটিফিকেশন সাবস্ক্রিপশন সফলভাবে সেভ হয়েছে।' });
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
