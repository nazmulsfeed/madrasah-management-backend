const ApiResponse = require('../utils/apiResponse');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'অনুগ্রহ করে লগ ইন করুন');
    }

    const hasRole = roles.includes(req.user.userType) || (req.user.adminRole && roles.includes(req.user.adminRole));

    if (!hasRole) {
      return ApiResponse.forbidden(
        res,
        `এই কার্যক্রমের জন্য আপনার (${getUserTypeLabel(req.user.userType)}) অনুমতি নেই`
      );
    }

    next();
  };
};

const RolePermission = require('../models/RolePermission');

const getUserTypeLabel = (type) => {
  const labels = {
    super_admin: 'সুপার অ্যাডমিন',
    co_super_admin: 'কো-সুপার অ্যাডমিন',
    admin: 'অ্যাডমিন',
    principal: 'প্রিন্সিপাল',
    vice_principal: 'ভাইস প্রিন্সিপাল',
    teacher: 'শিক্ষক',
    hifz_teacher: 'হিফজ শিক্ষক',
    accountant: 'হিসাবরক্ষক',
    admission_officer: 'ভর্তি কর্মকর্তা',
    hostel_manager: 'হোস্টেল ম্যানেজার',
    library_manager: 'লাইব্রেরি ম্যানেজার',
    student: 'ছাত্র/ছাত্রী',
    guardian: 'অভিভাবক',
  };
  return labels[type] || type;
};

const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'অনুগ্রহ করে লগ ইন করুন');
    }

    const isSuperOrCoSuper = 
      req.user.userType === 'super_admin' || 
      req.user.userType === 'co_super_admin' ||
      req.user.adminRole === 'co_super_admin';

    if (isSuperOrCoSuper) {
      return next();
    }

    try {
      const rolesToCheck = [req.user.userType];
      if (req.user.adminRole) rolesToCheck.push(req.user.adminRole);

      const rolePerms = await RolePermission.find({ role: { $in: rolesToCheck } });
      const hasPermission = rolePerms.some(rp => rp.permissions && rp.permissions[permissionKey] === true);

      if (hasPermission) {
        return next();
      }

      return ApiResponse.forbidden(
        res,
        `এই কার্যক্রমের জন্য আপনার (${getUserTypeLabel(req.user.userType)}) অনুমতি নেই`
      );
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authorize, checkPermission, getUserTypeLabel };
