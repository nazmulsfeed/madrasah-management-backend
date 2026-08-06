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

const defaultRolePermissions = {
  teacher: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_view_notice: true, can_manage_notice: true,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_view_students: true, can_view_library: true
  },
  hifz_teacher: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_view_notice: true, can_manage_notice: true,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_manage_hifz: true, can_view_students: true, can_view_library: true
  }
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

      const rolePerms = await RolePermission.findAll({ where: { role: rolesToCheck } });
      
      let hasExplicitPermission = false;
      let hasExplicitDenial = false;

      for (const rp of rolePerms) {
        let perms = rp.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) {}
        }
        if (perms && typeof perms === 'object') {
          if (perms[permissionKey] === true || perms[permissionKey] === 'true') {
            hasExplicitPermission = true;
          } else if (perms[permissionKey] === false || perms[permissionKey] === 'false') {
            hasExplicitDenial = true;
          }
        }
      }

      if (hasExplicitPermission) {
        return next();
      }

      if (hasExplicitDenial) {
        return ApiResponse.forbidden(
          res,
          `এই কার্যক্রমের জন্য আপনার (${getUserTypeLabel(req.user.userType)}) অনুমতি নেই`
        );
      }

      const isAllowedByDefault = rolesToCheck.some(r => defaultRolePermissions[r]?.[permissionKey] === true);
      if (isAllowedByDefault) {
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
