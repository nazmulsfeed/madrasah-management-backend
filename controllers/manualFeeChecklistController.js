/**
 * ============================================================================
 * স্বতন্ত্র কন্ট্রোলার: ম্যানুয়াল বেতন চেকলিস্ট (manualFeeChecklistController.js)
 * ============================================================================
 * উদ্দেশ্য (Purpose):
 * - পরিচালকের বিশেষ অনুরোধে তৈরি স্বতন্ত্র ম্যানুয়াল বেতন চেকলিস্ট এপিআই।
 * - এর মাধ্যমে মাস ও বছর অনুযায়ী ছাত্রদের বেতন পরিশোধ হয়েছে কিনা তা
 *   ম্যানুয়ালি টিকমার্ক দিয়ে সংরক্ষণ ও প্রদর্শন করা হয়।
 * - এটি মূল ফি (FeeInvoice / Payment) এবং অ্যাকাউন্টিং সিস্টেম থেকে
 *   সম্পূর্ণ আলাদা ও স্বাধীন; কোনো আর্থিক লেজার বা ব্যালেন্স পরিবর্তন করে না।
 * - অ্যাক্সেস কন্ট্রোল: শুধুমাত্র 'super_admin' এবং রোল পারমিশনে
 *   'finance.manual_fee_checklist' অনুমতিপ্রাপ্ত শিক্ষক/ব্যবহারকারীই
 *   এই এপিআই ব্যবহার করতে পারবেন।
 * ============================================================================
 */
const { Op } = require('sequelize');
const ManualFeeChecklist = require('../models/ManualFeeChecklist');
const ManualFeeChecklistAccess = require('../models/ManualFeeChecklistAccess');
const RolePermission = require('../models/RolePermission');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

let tableSynced = false;
async function ensureChecklistTable() {
  if (!tableSynced) {
    await ManualFeeChecklist.sync();
    await ManualFeeChecklistAccess.sync();
    tableSynced = true;
  }
}

/**
 * Middleware: শুধুমাত্র super_admin অথবা 'finance.manual_fee_checklist' পারমিশনপ্রাপ্ত ইউজার
 */
exports.requireChecklistAccess = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return ApiResponse.unauthorized(res, 'অনুগ্রহ করে লগইন করুন');
    }

    if (user.userType === 'super_admin') {
      return next();
    }

    await ensureChecklistTable();
    const candidateIds = [
      user.id !== undefined && user.id !== null ? String(user.id) : '',
      user._id ? String(user._id) : '',
    ].filter(Boolean);

    if (candidateIds.length > 0) {
      const specificAccess = await ManualFeeChecklistAccess.findOne({
        where: {
          userId: { [Op.in]: candidateIds },
        },
      });
      if (specificAccess) {
        return next();
      }
    }

    // Check user-level permissions if present
    let userPerms = user.permissions || {};
    if (typeof userPerms === 'string') {
      try { userPerms = JSON.parse(userPerms); } catch { userPerms = {}; }
    }
    if (userPerms['finance.manual_fee_checklist'] || userPerms?.finance?.manual_fee_checklist) {
      return next();
    }

    // Check RolePermission table for userType / customRole / adminRole
    const roleNames = [user.userType, user.customRole, user.adminRole].filter(Boolean);
    for (const rName of roleNames) {
      const rp = await RolePermission.findOne({ where: { role: rName } });
      if (rp) {
        let perms = rp.permissions || {};
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch { perms = {}; }
        }
        if (perms['finance.manual_fee_checklist'] || perms?.finance?.manual_fee_checklist) {
          return next();
        }
      }
    }

    return ApiResponse.forbidden(res, 'এই পেজ ব্যবহার করার অনুমতি আপনার নেই');
  } catch (error) {
    next(error);
  }
};

// @desc    মাস ও বছর অনুযায়ী সংরক্ষিত ম্যানুয়াল বেতন চেকলিস্ট দেখা
// @route   GET /api/v1/manual-fee-checklist?month=11&year=2026
exports.getChecklist = async (req, res, next) => {
  try {
    await ensureChecklistTable();

    const now = new Date();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const institution = req.user.institution || '';

    const records = await ManualFeeChecklist.findAll({
      where: { institution, month, year },
      order: [['updatedAt', 'DESC']]
    });

    ApiResponse.success(res, { records, month, year });
  } catch (error) {
    next(error);
  }
};

// @desc    ম্যানুয়াল বেতন চেকলিস্ট সংরক্ষণ/আপডেট করা (ব্যাচ বা একক)
// @route   POST /api/v1/manual-fee-checklist/save
exports.saveChecklist = async (req, res, next) => {
  try {
    await ensureChecklistTable();

    const institution = req.user.institution || '';
    const month = parseInt(req.body.month, 10);
    const year = parseInt(req.body.year, 10);
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];

    if (!month || month < 1 || month > 12 || !year) {
      return ApiResponse.error(res, 'সঠিক মাস ও বছর প্রদান করুন', 400);
    }
    if (entries.length === 0) {
      return ApiResponse.error(res, 'সংরক্ষণের জন্য কোনো তথ্য পাওয়া যায়নি', 400);
    }

    const markedBy = String(req.user._id || req.user.id || '');
    const markedAt = new Date();

    for (const item of entries) {
      const studentId = String(item.studentId || '').trim();
      if (!studentId) continue;
      const isPaid = Boolean(item.isPaid);
      const note = item.note !== undefined ? String(item.note).trim() : null;

      const existing = await ManualFeeChecklist.findOne({
        where: { institution, studentId, month, year }
      });

      if (existing) {
        await existing.update({
          isPaid,
          note: note !== null ? note : existing.note,
          markedBy,
          markedAt
        });
      } else {
        await ManualFeeChecklist.create({
          institution,
          studentId,
          month,
          year,
          isPaid,
          note: note || '',
          markedBy,
          markedAt
        });
      }
    }

    ApiResponse.success(res, { savedCount: entries.length }, 'ম্যানুয়াল বেতন চেকলিস্ট সফলভাবে সংরক্ষিত হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    নির্দিষ্ট টিচার/স্টাফদের অ্যাক্সেস তালিকা দেখা (শুধু super_admin)
// @route   GET /api/v1/manual-fee-checklist/access-users
exports.getAccessUsers = async (req, res, next) => {
  try {
    if (req.user?.userType !== 'super_admin') {
      return ApiResponse.forbidden(res, 'শুধুমাত্র সুপার অ্যাডমিন অ্যাক্সেস পরিচালনা করতে পারবেন');
    }

    await ensureChecklistTable();
    const institution = req.user.institution || '';

    const userWhere = {
      userType: {
        [Op.notIn]: ['student', 'guardian', 'super_admin'],
      },
    };
    if (institution) {
      userWhere[Op.or] = [
        { institution },
        { institution: '' },
        { institution: null },
      ];
    }

    const users = await User.findAll({
      where: userWhere,
      attributes: ['id', '_id', 'username', 'firstName', 'lastName', 'phone', 'userType', 'isActive'],
      order: [['firstName', 'ASC'], ['username', 'ASC']],
    });

    const accessRows = await ManualFeeChecklistAccess.findAll();
    const grantedIds = accessRows.map((row) => String(row.userId));

    ApiResponse.success(res, { users, grantedIds });
  } catch (error) {
    next(error);
  }
};

// @desc    নির্দিষ্ট ১-২ জন বা নির্বাচিত টিচারকে অ্যাক্সেস দেওয়া/হালনাগাদ করা (শুধু super_admin)
// @route   POST /api/v1/manual-fee-checklist/access-users
exports.saveAccessUsers = async (req, res, next) => {
  try {
    if (req.user?.userType !== 'super_admin') {
      return ApiResponse.forbidden(res, 'শুধুমাত্র সুপার অ্যাডমিন অ্যাক্সেস পরিচালনা করতে পারবেন');
    }

    await ensureChecklistTable();
    const institution = req.user.institution || '';
    const { userIds } = req.body;
    const cleanIds = Array.isArray(userIds)
      ? [...new Set(userIds.map((id) => String(id).trim()).filter(Boolean))]
      : [];

    await ManualFeeChecklistAccess.destroy({ where: { institution } });

    const grantedBy = String(req.user.id || req.user._id || '');
    for (const uid of cleanIds) {
      await ManualFeeChecklistAccess.create({
        institution,
        userId: uid,
        grantedBy,
      });
    }

    ApiResponse.success(
      res,
      { grantedIds: cleanIds },
      `${cleanIds.length} জন টিচার/স্টাফকে ম্যানুয়াল বেতন চেকলিস্টের অ্যাক্সেস দেওয়া হয়েছে`
    );
  } catch (error) {
    next(error);
  }
};
