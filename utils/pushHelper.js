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
  try {
    const PushSubscription = require('../models/PushSubscription');
    const subscriptions = await PushSubscription.findAll();

    if (subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify({
      title: payload.title || 'নতুন আপডেট',
      body: payload.body || 'মাদ্রাসা থেকে একটি নতুন আপডেট এসেছে।',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      url: payload.url || '/',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };
      try {
        await webpush.sendNotification(subscription, notificationPayload);
      } catch (err) {
        // সাবস্ক্রিপশন এক্সপায়ার্ড বা ইনভ্যালিড হলে ডিলিট করা হয়
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.destroy({ where: { endpoint: sub.endpoint } });
          console.log('[Push] Removed expired subscription:', sub.endpoint.substring(0, 50));
        }
      }
    });

    // সকলকে একসাথে পাঠানো হচ্ছে (Promise.allSettled ব্যবহার করায় একটি ব্যর্থ হলেও বাকিগুলো যাবে)
    await Promise.allSettled(sendPromises);
    console.log(`[Push] Notification sent to ${subscriptions.length} subscriber(s).`);
  } catch (error) {
    console.error('[Push] Error broadcasting notification:', error.message);
  }
}

module.exports = { broadcastNotification };
