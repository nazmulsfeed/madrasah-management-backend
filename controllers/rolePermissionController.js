const RolePermission = require('../models/RolePermission');
const ApiResponse = require('../utils/apiResponse');

// @desc    Get all role permissions
// @route   GET /api/v1/permissions
// @access  Private (Super Admin only)
exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await RolePermission.find();
    ApiResponse.success(res, permissions);
  } catch (error) {
    next(error);
  }
};

// @desc    Update or create permissions for a role
// @route   PUT /api/v1/permissions/:role
// @access  Private (Super Admin only)
exports.updateRolePermissions = async (req, res, next) => {
  try {
    const { role } = req.params;
    const updates = req.body; // should be an object of permission keys

    let rolePerm = await RolePermission.findOne({ role });

    if (!rolePerm) {
      rolePerm = new RolePermission({ role, permissions: updates });
    } else {
      rolePerm.permissions = { ...rolePerm.permissions.toObject(), ...updates };
    }

    await rolePerm.save();

    ApiResponse.success(res, rolePerm, `${role} এর পারমিশন আপডেট করা হয়েছে`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get my permissions
// @route   GET /api/v1/permissions/me
// @access  Private (Logged in users)
exports.getMyPermissions = async (req, res, next) => {
  try {
    // Super Admin & Co-Super Admin get all permissions by default
    if (req.user.userType === 'super_admin' || req.user.userType === 'co_super_admin' || req.user.adminRole === 'co_super_admin') {
      return ApiResponse.success(res, {
        can_view_homework: true,
        can_create_homework: true,
        can_edit_homework: true,
        can_delete_homework: true,
        can_view_attendance: true,
        can_mark_attendance: true,
        can_view_exams: true,
        can_manage_exams: true,
        can_view_finance: true,
        can_manage_finance: true,
        can_view_users: true,
        can_manage_users: true,
        can_view_notice: true,
        can_manage_notice: true,
        can_grade_exams: true,
        can_add_syllabus: true,
        can_communicate_parents: true,
        can_take_live_class: true,
        can_view_reports: true,
        can_manage_hifz: true,
      });
    }

    const rolesToCheck = [req.user.userType];
    if (req.user.adminRole) rolesToCheck.push(req.user.adminRole);

    const rolePerms = await RolePermission.find({ role: { $in: rolesToCheck } });
    const permissions = {};
    
    for (const rp of rolePerms) {
      if (rp.permissions) {
        const permObj = rp.permissions.toObject();
        Object.keys(permObj).forEach(key => {
          if (permObj[key] === true) {
            permissions[key] = true;
          }
        });
      }
    }

    ApiResponse.success(res, permissions);
  } catch (error) {
    next(error);
  }
};
