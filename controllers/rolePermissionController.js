const RolePermission = require('../models/RolePermission');
const ApiResponse = require('../utils/apiResponse');
const { clearPermissionCache } = require('../middleware/rbac');
const { defaultRolePermissions, allPermissionKeys } = require('../utils/permissions');
const { logAction } = require('../middleware/audit');

// @desc    Get all role permissions
// @route   GET /api/v1/permissions
// @access  Private (Super Admin only)
exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await RolePermission.findAll();
    const result = permissions.map(p => {
      const item = p.toJSON();
      if (typeof item.permissions === 'string') {
        try { item.permissions = JSON.parse(item.permissions); } catch (e) {}
      }
      // Merge with defaults
      const roleDefaults = defaultRolePermissions[item.role] || {};
      item.permissions = { ...roleDefaults, ...(item.permissions || {}) };
      return item;
    });

    // Ensure all defined roles have at least their default permissions returned
    const rolesWithDbEntries = result.map(r => r.role);
    Object.keys(defaultRolePermissions).forEach(role => {
      if (!rolesWithDbEntries.includes(role)) {
        result.push({
          role,
          permissions: defaultRolePermissions[role]
        });
      }
    });

    ApiResponse.success(res, result);
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

    let rolePerm = await RolePermission.findOne({ where: { role } });
    let currentPerms = {};

    if (!rolePerm) {
      rolePerm = await RolePermission.create({ role, permissions: updates });
    } else {
      currentPerms = rolePerm.permissions;
      if (typeof currentPerms === 'string') {
        try { currentPerms = JSON.parse(currentPerms); } catch (e) { currentPerms = {}; }
      }
      
      const cleanPerms = {};
      if (currentPerms && typeof currentPerms === 'object') {
        Object.keys(currentPerms).forEach(k => {
          if (isNaN(k)) cleanPerms[k] = currentPerms[k];
        });
      }
      rolePerm.permissions = { ...cleanPerms, ...updates };
      rolePerm.changed('permissions', true);
      await rolePerm.save();
    }

    // Invalidate cache for this role
    clearPermissionCache(role);

    await logAction(req, 'Permission', 'update', `Updated permissions for role: ${role}`, null, currentPerms, rolePerm.permissions);

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
    // Super Admin gets all permissions
    if (req.user.userType === 'super_admin') {
      const allPerms = {};
      allPermissionKeys.forEach(k => allPerms[k] = true);
      return ApiResponse.success(res, allPerms);
    }

    const rolesToCheck = [req.user.userType];
    if (req.user.adminRole) rolesToCheck.push(req.user.adminRole);

    const rolePerms = await RolePermission.findAll({ where: { role: rolesToCheck } });
    const permissions = {};
    
    for (const role of rolesToCheck) {
      const rp = rolePerms.find(p => p.role === role);
      let permObj = {};
      if (rp && rp.permissions) {
        permObj = rp.permissions;
        if (typeof permObj === 'string') {
          try { permObj = JSON.parse(permObj); } catch (e) { permObj = {}; }
        }
      }

      // Merge defaults
      const defaults = defaultRolePermissions[role] || {};
      const mergedPerms = { ...defaults, ...(permObj || {}) };

      // Apply to user permissions
      Object.keys(mergedPerms).forEach(key => {
        if (mergedPerms[key] === true || mergedPerms[key] === 'true') {
          permissions[key] = true;
        }
      });
    }

    ApiResponse.success(res, permissions);
  } catch (error) {
    next(error);
  }
};
