const express = require('express');
const router = express.Router();
const { subscribe, unsubscribe, getVapidKey } = require('../controllers/pushController');
const { broadcastNotification } = require('../utils/pushHelper');

// VAPID public key (ফ্রন্টএন্ড থেকে অ্যাক্সেসযোগ্য)
router.get('/vapid-key', getVapidKey);

// সাবস্ক্রাইব ও আনসাবস্ক্রাইব (কোনো auth দরকার নেই, পাবলিক রাউট)
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

// ডিবাগ টেস্ট রাউট — সরাসরি ব্রাউজারে রেজাল্ট দেখাবে
router.get('/test-send', async (req, res) => {
  const results = await broadcastNotification({
    title: '🔔 টেস্ট নোটিফিকেশন',
    body: 'এটি একটি টেস্ট নোটিফিকেশন — সার্ভার থেকে সরাসরি পাঠানো হয়েছে।',
    url: '/public',
  });
  res.json({ success: true, results });
});

module.exports = router;
