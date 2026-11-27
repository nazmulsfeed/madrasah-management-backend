const axios = require('axios');
const { Op } = require('sequelize');
const PopupAnnouncement = require('../models/PopupAnnouncement');
const PopupSetting = require('../models/PopupSetting');
const Notice = require('../models/Notice');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const Invoice = require('../models/Invoice');
const ApiResponse = require('../utils/apiResponse');
const { parseNoticeAudience, filterNoticesForUser } = require('../utils/noticeTargeting');

let popupTablesSynced = false;
async function ensurePopupTables() {
  if (!popupTablesSynced) {
    await PopupAnnouncement.sync();
    await PopupSetting.sync();
    popupTablesSynced = true;
  }
}

function splitTtsChunks(text, maxLen = 175) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[।!?.,\n])\s+/);
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if (!s) continue;
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        const words = s.split(/\s+/);
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = (sub + ' ' + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w.slice(0, maxLen);
          }
        }
        current = sub;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * প্রতি মাসের ৪ থেকে ১০ তারিখ পর্যন্ত বকেয়া বেতনধারী student/guardian-এর জন্য
 * স্বয়ংক্রিয় বকেয়া পপ-আপ তৈরি করে (ইনভয়েস পরিশোধ হয়ে গেলে অটো বন্ধ হয়)।
 */
async function computeAutoDuePopupForUser(user, todayBDStrOverride = null) {
  if (!user || !['student', 'guardian'].includes(user.userType)) return null;

  await ensurePopupTables();
  const institution = user.institution || '';
  const setting = await PopupSetting.findOne({ where: { institution } });
  const autoDueEnabled = setting ? Boolean(setting.autoDuePopupEnabled) : true;
  if (!autoDueEnabled) return null;

  const todayBDStr =
    todayBDStrOverride || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const dayOfMonth = parseInt(todayBDStr.split('-')[2], 10);
  if (Number.isNaN(dayOfMonth) || dayOfMonth < 4 || dayOfMonth > 10) {
    return null;
  }

  const candidateUserIds = [
    user._id ? String(user._id) : '',
    user.id !== undefined && user.id !== null ? String(user.id) : '',
  ].filter(Boolean);

  const studentIds = new Set();

  if (user.userType === 'student') {
    const stu = await Student.findOne({
      where: {
        user: { [Op.in]: candidateUserIds },
        isDeleted: { [Op.ne]: true },
      },
    });
    if (stu?._id) studentIds.add(String(stu._id));
    if (stu?.id) studentIds.add(String(stu.id));
  } else if (user.userType === 'guardian') {
    const gWhere = { user: { [Op.in]: candidateUserIds } };
    const guardians = await Guardian.findAll({ where: gWhere });
    for (const g of guardians) {
      let sList = g.students;
      if (typeof sList === 'string') {
        try { sList = JSON.parse(sList); } catch { sList = [sList]; }
      }
      if (Array.isArray(sList)) {
        for (const item of sList) {
          const sid = typeof item === 'string'
            ? item
            : (item?.student || item?.studentId || item?._id || item?.id);
          if (sid) studentIds.add(String(sid));
        }
      }
    }
  }

  if (studentIds.size === 0) return null;

  const unpaidInvoices = await Invoice.findAll({
    where: {
      student: { [Op.in]: [...studentIds] },
      balance: { [Op.gt]: 0 },
      status: { [Op.notIn]: ['paid', 'cancelled'] },
    },
    order: [['dueDate', 'ASC']],
  });

  if (!unpaidInvoices || unpaidInvoices.length === 0) return null;

  const totalDue = unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
  if (totalDue <= 0) return null;

  const invoiceTitles = unpaidInvoices.slice(0, 3).map((i) => i.title).filter(Boolean).join(', ');
  const totalBn = Number(totalDue).toLocaleString('bn-BD');
  const countBn = Number(unpaidInvoices.length).toLocaleString('bn-BD');

  return {
    id: `auto-due-${todayBDStr}`,
    _id: `auto-due-${todayBDStr}`,
    type: 'auto_due',
    title: '⚠️ মাসিক বেতন ও বকেয়া পরিশোধের তাগিদ',
    author: 'হিসাব ও অর্থ বিভাগ',
    content: `আসসালামু আলাইকুম, আপনার ${countBn}টি বকেয়া ইনভয়েসে মোট ৳${totalBn} টাকা বকেয়া রয়েছে${invoiceTitles ? ` (${invoiceTitles})` : ''}। অনুগ্রহ করে চলতি মাসের ১০ তারিখের মধ্যে নির্ধারিত বেতন পরিশোধ করুন। বেতন পরিশোধ করার সাথে সাথেই এই বার্তাটি স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে।`,
    hasAudio: false,
    audience: ['student', 'guardian'],
    createdAt: new Date().toISOString(),
    isAutoDue: true,
    totalDue,
    unpaidCount: unpaidInvoices.length,
  };
}

exports.computeAutoDuePopupForUser = computeAutoDuePopupForUser;

// @desc    সক্রিয় পপ-আপ (নসিহত + পুশ করা নোটিশ + ৪–১০ তারিখ বকেয়া পপ-আপ)
// @route   GET /api/v1/popups/active
exports.getActivePopups = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const institution = req.user?.institution || '';

    const where = { isActive: true };
    if (req.user?.userType !== 'super_admin' && institution) {
      where.institution = { [Op.or]: [institution, '', null] };
    }

    const allActive = await PopupAnnouncement.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const filtered = await filterNoticesForUser(allActive, req.user);
    const items = filtered.map((row) => {
      const obj = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
      return {
        id: String(obj._id || obj.id),
        _id: String(obj._id || obj.id),
        type: obj.type || 'nasihot',
        sourceNoticeId: obj.sourceNoticeId || '',
        title: obj.title,
        author: obj.author || '',
        content: obj.content,
        hasAudio: Boolean(obj.audioData && obj.audioData.trim().length > 0),
        audience: parseNoticeAudience(obj.audience).roles,
        createdAt: obj.createdAt,
        isAutoDue: false,
      };
    });

    // ৪–১০ তারিখের মধ্যে student/guardian-এর বকেয়া বেতন থাকলে তালিকায় যুক্ত করা
    const duePopup = await computeAutoDuePopupForUser(req.user);
    if (duePopup) {
      items.push(duePopup);
    }

    ApiResponse.success(res, { popups: items });
  } catch (error) {
    next(error);
  }
};

// @desc    আপলোডকৃত অডিও ফাইল স্ট্রিম
// @route   GET /api/v1/popups/:id/audio
exports.getPopupAudio = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const id = req.params.id;
    const item = await PopupAnnouncement.findOne({
      where: { [Op.or]: [{ _id: id }, ...(Number.isInteger(Number(id)) ? [{ id: Number(id) }] : [])] },
    });

    if (!item || !item.audioData) {
      return ApiResponse.notFound(res, 'অডিও পাওয়া যায়নি');
    }

    const raw = item.audioData.trim();
    const match = raw.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      const mimeType = match[1] || 'audio/mpeg';
      const buf = Buffer.from(match[2], 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buf.length);
      return res.send(buf);
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return res.redirect(raw);
    }

    return ApiResponse.notFound(res, 'অবৈধ অডিও ফরম্যাট');
  } catch (error) {
    next(error);
  }
};

// @desc    বাংলা টেক্সট থেকে TTS অডিও স্ট্রিম (MP3)
// @route   GET /api/v1/popups/:id/tts
exports.getPopupTts = async (req, res) => {
  try {
    await ensurePopupTables();
    const id = req.params.id;
    const item = await PopupAnnouncement.findOne({
      where: { [Op.or]: [{ _id: id }, ...(Number.isInteger(Number(id)) ? [{ id: Number(id) }] : [])] },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'পপ-আপ পাওয়া যায়নি' });
    }

    const fullText = `${item.title || ''}। ${item.content || ''}`;
    const chunks = splitTtsChunks(fullText, 170).slice(0, 15);
    if (chunks.length === 0) {
      return res.status(400).json({ success: false, message: 'পাঠ করার মতো টেক্সট নেই' });
    }

    const buffers = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=bn&client=tw-ob`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://translate.google.com/',
        },
      });
      buffers.push(Buffer.from(response.data));
    }

    const combined = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', combined.length);
    return res.send(combined);
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'অনলাইন TTS অডিও অনুপলব্ধ — ব্রাউজার ভয়েস ব্যবহার করুন',
    });
  }
};

// @desc    সংরক্ষিত সকল নসিহত ও পপ-আপ তালিকা দেখা (শুধু super_admin / co_super_admin)
// @route   GET /api/v1/popups/manage
exports.getManagePopups = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const institution = req.user?.institution || '';
    const where = {};
    if (req.user?.userType !== 'super_admin' && institution) {
      where.institution = { [Op.or]: [institution, '', null] };
    }

    const rows = await PopupAnnouncement.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const setting = await PopupSetting.findOne({ where: { institution } });
    const autoDuePopupEnabled = setting ? Boolean(setting.autoDuePopupEnabled) : true;

    const popups = rows.map((r) => {
      const obj = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
      return {
        ...obj,
        id: String(obj._id || obj.id),
        _id: String(obj._id || obj.id),
        hasAudio: Boolean(obj.audioData && obj.audioData.trim().length > 0),
        audioData: undefined,
      };
    });

    const pushedNoticeIds = popups
      .filter((p) => p.type === 'notice_push' && p.isActive && p.sourceNoticeId)
      .map((p) => String(p.sourceNoticeId));

    ApiResponse.success(res, { popups, pushedNoticeIds, autoDuePopupEnabled });
  } catch (error) {
    next(error);
  }
};

// @desc    নতুন নসিহত বা পপ-আপ পোস্ট করা (শুধু super_admin / co_super_admin)
// @route   POST /api/v1/popups
exports.createPopup = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const { title, author, content, audioData, audience, isActive } = req.body;

    if (!title || !String(title).trim()) {
      return ApiResponse.badRequest(res, 'শিরোনাম দেওয়া আবশ্যক');
    }
    if (!content || !String(content).trim()) {
      return ApiResponse.badRequest(res, 'বিস্তারিত লেখা দেওয়া আবশ্যক');
    }

    const created = await PopupAnnouncement.create({
      institution: req.user?.institution || '',
      type: 'nasihot',
      sourceNoticeId: '',
      title: String(title).trim(),
      author: String(author || '').trim(),
      content: String(content).trim(),
      audioData: audioData ? String(audioData) : '',
      audience: Array.isArray(audience) && audience.length > 0 ? audience : ['all'],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: String(req.user?._id || req.user?.id || ''),
    });

    const obj = created.toJSON();
    ApiResponse.created(
      res,
      { ...obj, hasAudio: Boolean(obj.audioData), audioData: undefined },
      'নসিহত সফলভাবে পপ-আপে সংরক্ষণ ও প্রকাশ করা হয়েছে'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    নসিহত/পপ-আপ আপডেট বা টগল করা
// @route   PATCH /api/v1/popups/:id
exports.updatePopup = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const id = req.params.id;
    const item = await PopupAnnouncement.findOne({
      where: { [Op.or]: [{ _id: id }, ...(Number.isInteger(Number(id)) ? [{ id: Number(id) }] : [])] },
    });
    if (!item) return ApiResponse.notFound(res, 'পপ-আপ পাওয়া যায়নি');

    const { title, author, content, audioData, audience, isActive } = req.body;
    await item.update({
      title: title !== undefined ? String(title).trim() : item.title,
      author: author !== undefined ? String(author).trim() : item.author,
      content: content !== undefined ? String(content).trim() : item.content,
      audioData: audioData !== undefined ? String(audioData) : item.audioData,
      audience: audience !== undefined ? audience : item.audience,
      isActive: isActive !== undefined ? Boolean(isActive) : item.isActive,
    });

    const obj = item.toJSON();
    ApiResponse.success(
      res,
      { ...obj, hasAudio: Boolean(obj.audioData), audioData: undefined },
      'পপ-আপ আপডেট করা হয়েছে'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    নসিহত/পপ-আপ মুছে ফেলা
// @route   DELETE /api/v1/popups/:id
exports.deletePopup = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const id = req.params.id;
    const item = await PopupAnnouncement.findOne({
      where: { [Op.or]: [{ _id: id }, ...(Number.isInteger(Number(id)) ? [{ id: Number(id) }] : [])] },
    });
    if (!item) return ApiResponse.notFound(res, 'পপ-আপ পাওয়া যায়নি');

    await item.destroy();
    ApiResponse.success(res, null, 'পপ-আপ তালিকা থেকে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    বিদ্যমান নোটিশকে পপ-আপে পুশ বা টগল করা (শুধু super_admin / co_super_admin)
// @route   POST /api/v1/popups/push-notice/:noticeId
exports.pushNoticeToPopup = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const noticeId = req.params.noticeId;
    const notice = await Notice.findOne({
      where: {
        [Op.or]: [
          { _id: noticeId },
          ...(Number.isInteger(Number(noticeId)) ? [{ id: Number(noticeId) }] : []),
        ],
      },
    });
    if (!notice) {
      return ApiResponse.notFound(res, 'নোটিশ পাওয়া যায়নি');
    }

    const nIdStr = String(notice._id || notice.id);
    const existing = await PopupAnnouncement.findOne({
      where: { type: 'notice_push', sourceNoticeId: nIdStr },
    });

    let isInPopup = true;
    let saved;

    if (existing) {
      isInPopup = !existing.isActive;
      await existing.update({
        title: notice.title,
        content: notice.content,
        audience: notice.audience || ['all'],
        isActive: isInPopup,
      });
      saved = existing;
    } else {
      saved = await PopupAnnouncement.create({
        institution: notice.institution || req.user?.institution || '',
        type: 'notice_push',
        sourceNoticeId: nIdStr,
        title: notice.title,
        author: 'নোটিশ বোর্ড',
        content: notice.content,
        audioData: '',
        audience: notice.audience || ['all'],
        isActive: true,
        createdBy: String(req.user?._id || req.user?.id || ''),
      });
    }

    ApiResponse.success(
      res,
      { isInPopup, popup: saved },
      isInPopup ? 'নোটিশটি পপ-আপে যুক্ত করা হয়েছে' : 'নোটিশটি পপ-আপ থেকে সরানো হয়েছে'
    );
  } catch (error) {
    next(error);
  }
};

// @desc    ৪–১০ তারিখ অটো বকেয়া পপ-আপ সেটিংস দেখা
// @route   GET /api/v1/popups/due-setting
exports.getDueSetting = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const institution = req.user?.institution || '';
    const setting = await PopupSetting.findOne({ where: { institution } });
    ApiResponse.success(res, {
      autoDuePopupEnabled: setting ? Boolean(setting.autoDuePopupEnabled) : true,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    ৪–১০ তারিখ অটো বকেয়া পপ-আপ অন/অফ টগল করা
// @route   PUT /api/v1/popups/due-setting
exports.updateDueSetting = async (req, res, next) => {
  try {
    await ensurePopupTables();
    const institution = req.user?.institution || '';
    const enabled = Boolean(req.body?.autoDuePopupEnabled);
    const updatedBy = String(req.user?._id || req.user?.id || '');

    const existing = await PopupSetting.findOne({ where: { institution } });
    if (existing) {
      await existing.update({ autoDuePopupEnabled: enabled, updatedBy });
    } else {
      await PopupSetting.create({
        institution,
        autoDuePopupEnabled: enabled,
        updatedBy,
      });
    }

    ApiResponse.success(
      res,
      { autoDuePopupEnabled: enabled },
      enabled
        ? '৪–১০ তারিখের অটো বকেয়া বেতন পপ-আপ চালু করা হয়েছে'
        : '৪–১০ তারিখের অটো বকেয়া বেতন পপ-আপ বন্ধ করা হয়েছে'
    );
  } catch (error) {
    next(error);
  }
};
