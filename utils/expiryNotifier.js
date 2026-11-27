/**
 * ডোমেইন ও হোস্টিংয়ের মেয়াদ শেষ হওয়ার ৩০, ৭ এবং ১ দিন আগে
 * শুধুমাত্র super_admin আইডিতে স্বয়ংক্রিয় ব্যক্তিগত নোটিশ ও পুশ নোটিফিকেশন পাঠানোর শিডিউলার।
 */
const { Op } = require('sequelize');
const InfrastructureExpiry = require('../models/InfrastructureExpiry');
const User = require('../models/User');
const { createPersonalNoticeAndPush } = require('./noticeTargeting');

let expiryTableSynced = false;
async function ensureExpiryTable() {
  if (!expiryTableSynced) {
    await InfrastructureExpiry.sync();
    expiryTableSynced = true;
  }
}

function parseMilestones(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function checkAndNotifyInfrastructureExpiries() {
  try {
    await ensureExpiryTable();
    const records = await InfrastructureExpiry.findAll();
    if (!records || records.length === 0) return;

    const superAdmins = await User.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { userType: 'super_admin' },
          { userType: 'co_super_admin' },
          { adminRole: 'co_super_admin' },
        ],
      },
      attributes: ['id', '_id', 'institution'],
    });
    if (!superAdmins || superAdmins.length === 0) return;

    const nowMs = Date.now();

    for (const row of records) {
      if (!row.expiryDate) continue;
      const expiryMs = new Date(row.expiryDate).getTime();
      if (Number.isNaN(expiryMs)) continue;

      const diffMs = expiryMs - nowMs;
      if (diffMs <= 0) {
        // মেয়াদ শেষ হয়ে গেলে টাইমার 0 তে থেমে থাকবে, নতুন নোটিফিকেশন পাঠাবে না
        continue;
      }

      const daysLeft = Math.ceil(diffMs / 86400000);
      let milestone = null;
      if (daysLeft <= 1) milestone = 1;
      else if (daysLeft <= 7) milestone = 7;
      else if (daysLeft <= 30) milestone = 30;

      if (!milestone) continue; // ৩০ দিনের বেশি বাকি থাকলে কোনো নোটিফিকেশন নয়

      const sent = parseMilestones(row.notifiedMilestones);
      if (sent.includes(milestone)) continue;

      const targetAdmins = superAdmins.filter(
        (u) => !row.institution || !u.institution || u.institution === row.institution
      );
      const userIds = targetAdmins
        .flatMap((u) => [u._id ? String(u._id) : '', u.id !== undefined ? String(u.id) : ''])
        .filter(Boolean);

      if (userIds.length === 0) continue;

      const serviceLabelBn = row.serviceType === 'domain' ? 'ডোমেইন' : 'হোস্টিং';
      const namePart = row.label ? ` (${row.label})` : '';
      const formattedDate = new Date(expiryMs).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const title = `⚠️ ${serviceLabelBn} মেয়াদ সতর্কতা: আর মাত্র ${milestone === 1 ? '১ দিন' : milestone === 7 ? '৭ দিন' : '৩০ দিন'} বাকি`;
      const content = `${serviceLabelBn}${namePart}${row.provider ? ` [${row.provider}]` : ''}-এর মেয়াদ আগামী ${formattedDate} তারিখে শেষ হবে (আনুমানিক ${daysLeft} দিন বাকি)। অনুগ্রহ করে সময়মতো নবায়ন (Renew) করুন।`;

      await createPersonalNoticeAndPush({
        institution: row.institution || '',
        publishedBy: null,
        userIds,
        title,
        content,
        priority: milestone <= 7 ? 'urgent' : 'high',
        url: '/dashboard',
      });

      const updatedMilestones = [...new Set([...sent, milestone])];
      await row.update({ notifiedMilestones: updatedMilestones });
    }
  } catch (err) {
    console.error('[ExpiryNotifier] Error checking infrastructure expiries:', err.message);
  }
}

function startExpiryScheduler() {
  setTimeout(() => {
    checkAndNotifyInfrastructureExpiries();
  }, 15000);

  // প্রতি ৬ ঘণ্টায় একবার মেয়াদ যাচাই করবে
  setInterval(() => {
    checkAndNotifyInfrastructureExpiries();
  }, 6 * 60 * 60 * 1000);
}

module.exports = {
  ensureExpiryTable,
  checkAndNotifyInfrastructureExpiries,
  startExpiryScheduler,
};
