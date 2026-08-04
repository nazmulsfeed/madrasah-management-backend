const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * সকল সাবস্ক্রাইবারকে পুশ নোটিফিকেশন পাঠায়।
 * এটি সম্পূর্ণ ব্যাকগ্রাউন্ডে কাজ করে, সার্ভারের মূল প্রসেসে কোনো প্রভাব পড়ে না।
 * @param {object} payload - { title, body, url }
 */
async function broadcastNotification(payload) {
  const results = [];
  try {
    const PushSubscription = require('../models/PushSubscription');
    const subscriptions = await PushSubscription.findAll();

    if (subscriptions.length === 0) {
      console.log('[Push] No subscribers found.');
      return results;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'নতুন আপডেট',
      body: payload.body || 'মাদ্রাসা থেকে একটি নতুন আপডেট এসেছে।',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: payload.url || '/public-homework',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };
      try {
        await webpush.sendNotification(subscription, notificationPayload);
        console.log('[Push] ✅ Sent to:', sub.endpoint.substring(0, 60));
        results.push({ endpoint: sub.endpoint.substring(0, 60), status: 'success' });
      } catch (err) {
        console.error('[Push] ❌ Error sending to:', sub.endpoint.substring(0, 60));
        console.error('[Push] Error statusCode:', err.statusCode);
        console.error('[Push] Error message:', err.message);
        results.push({ endpoint: sub.endpoint.substring(0, 60), status: 'error', statusCode: err.statusCode, message: err.message });
        // সাবস্ক্রিপশন এক্সপায়ার্ড বা ইনভ্যালিড হলে ডিলিট করা হয়
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.destroy({ where: { endpoint: sub.endpoint } });
          console.log('[Push] Removed expired subscription.');
        }
      }
    });

    await Promise.allSettled(sendPromises);
    console.log(`[Push] Broadcast complete. ${subscriptions.length} subscriber(s) processed.`);
  } catch (error) {
    console.error('[Push] Fatal error in broadcastNotification:', error.message);
    results.push({ status: 'fatal', message: error.message });
  }
  return results;
}

module.exports = { broadcastNotification };
