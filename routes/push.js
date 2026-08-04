const express = require('express');
const router = express.Router();
const { subscribe, unsubscribe, getVapidKey } = require('../controllers/pushController');

// VAPID public key (ফ্রন্টএন্ড থেকে অ্যাক্সেসযোগ্য)
router.get('/vapid-key', getVapidKey);

// সাবস্ক্রাইব ও আনসাবস্ক্রাইব (কোনো auth দরকার নেই, পাবলিক রাউট)
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

module.exports = router;
