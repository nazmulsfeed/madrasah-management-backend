const { Op } = require('sequelize');
const User = require('../models/User');

/**
 * Universal User Enricher / Audit Resolver Helper
 * Resolves user IDs into rich metadata objects { id, name, role, phone, avatar }
 * Optimized with batching to avoid N+1 queries.
 */

/**
 * Fetch a map of userId -> userInfo for an array or set of user IDs
 * @param {Array<string>} userIds 
 * @returns {Promise<Object>} Object mapping userId to user metadata
 */
async function getUserMap(userIds = []) {
  const cleanIds = Array.from(new Set(userIds.filter(id => id && typeof id === 'string' && id.trim() !== '')));
  if (cleanIds.length === 0) return {};

  try {
    const users = await User.findAll({
      where: {
        _id: { [Op.in]: cleanIds }
      },
      attributes: ['_id', 'firstName', 'lastName', 'username', 'userType', 'adminRole', 'phone', 'photo']
    });

    const map = {};
    users.forEach(u => {
      const idStr = String(u._id);
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'অজানা ব্যবহারকারী';
      const roleLabel = getRoleDisplayName(u.userType, u.adminRole);

      map[idStr] = {
        _id: u._id,
        name: fullName,
        username: u.username || '',
        userType: u.userType,
        roleLabel,
        phone: u.phone || '',
        photo: u.photo || ''
      };
    });

    return map;
  } catch (err) {
    console.error('Error in userEnricher.getUserMap:', err);
    return {};
  }
}

/**
 * Helper to get readable Bengali role label
 */
function getRoleDisplayName(userType, adminRole) {
  if (adminRole === 'super_admin' || userType === 'super_admin') return 'সুপার অ্যাডমিন';
  if (adminRole === 'co_super_admin' || userType === 'co_super_admin') return 'কো-সুপার অ্যাডমিন';
  if (adminRole === 'admin' || userType === 'admin') return 'অ্যাডমিন';
  if (userType === 'principal') return 'প্রিন্সিপাল';
  if (userType === 'vice_principal') return 'ভাইস প্রিন্সিপাল';
  if (userType === 'teacher') return 'শিক্ষক';
  if (userType === 'hifz_teacher') return 'হিফজ শিক্ষক';
  if (userType === 'accountant') return 'হিসাবরক্ষক';
  if (userType === 'cashier') return 'ক্যাশিয়ার';
  if (userType === 'admission_officer') return 'ভর্তি কর্মকর্তা';
  if (userType === 'hostel_manager') return 'হোস্টেল ম্যানেজার';
  if (userType === 'library_manager') return 'লাইব্রেরি ম্যানেজার';
  if (userType === 'student') return 'ছাত্র/ছাত্রী';
  if (userType === 'guardian') return 'অভিভাবক';
  return 'স্টাফ';
}

/**
 * Enrich an array of documents with user audit objects
 * @param {Array<Object>} list 
 * @param {Array<string>} fieldNames e.g. ['createdBy', 'updatedBy', 'receivedBy', 'publishedBy']
 * @returns {Promise<Array<Object>>}
 */
async function enrichWithUsers(list = [], fieldNames = ['createdBy']) {
  if (!Array.isArray(list) || list.length === 0) return list;

  const allIds = [];
  list.forEach(item => {
    fieldNames.forEach(f => {
      const val = item[f];
      if (val && typeof val === 'string') allIds.push(val);
      else if (val && typeof val === 'object' && val._id) allIds.push(val._id);
    });
  });

  const userMap = await getUserMap(allIds);

  return list.map(item => {
    const raw = item.toJSON ? item.toJSON() : { ...item };
    fieldNames.forEach(f => {
      const val = raw[f];
      const idKey = val && typeof val === 'object' ? String(val._id) : String(val || '');
      if (userMap[idKey]) {
        raw[`${f}User`] = userMap[idKey];
        raw[`${f}Details`] = userMap[idKey];
        // Also support createdUser / updatedUser variant
        const shortProp = f.replace(/By$/, 'User');
        raw[shortProp] = userMap[idKey];
      }
    });
    return raw;
  });
}

module.exports = {
  getUserMap,
  getRoleDisplayName,
  enrichWithUsers
};
