const ApiResponse = require('../utils/apiResponse');
const RolePermission = require('../models/RolePermission');
const { defaultRolePermissions, legacyToGranularMap } = require('../utils/permissions');

// Simple in-memory cache for permissions with 30s TTL
let permissionCache = new Map();
let cacheTimestamps = new Map();
const CACHE_TTL = 30 * 1000;

const clearPermissionCache = (role) => {
  if (role) {
    permissionCache.delete(role);
    cacheTimestamps.delete(role);
  } else {
    permissionCache.clear();
    cacheTimestamps.clear();
  }
};

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
    cashier: 'ক্যাশিয়ার',
    admission_officer: 'ভর্তি কর্মকর্তা',
    hostel_manager: 'হোস্টেল ম্যানেজার',
    library_manager: 'লাইব্রেরি ম্যানেজার',
    student: 'ছাত্র/ছাত্রী',
    guardian: 'অভিভাবক',
  };
  return labels[type] || type;
};

// Dynamic role and permission-based authorization
const authorize = (...rolesOrPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'অনুগ্রহ করে লগ ইন করুন');
    }

    // Super Admin & Co-Super Admin bypass all checks
    const isSuperOrCoSuper = req.user.userType === 'super_admin' || 
                             req.user.userType === 'co_super_admin' || 
                             req.user.adminRole === 'co_super_admin';
    if (isSuperOrCoSuper) {
      return next();
    }

    const hasRole = rolesOrPermissions.includes(req.user.userType) || 
                    (req.user.adminRole && rolesOrPermissions.includes(req.user.adminRole));

    if (hasRole) {
      return next();
    }

    // If role check didn't pass, evaluate any permission keys provided in the argument list
    const permissionKeys = rolesOrPermissions.filter(item => item.includes('.') || item.startsWith('can_'));
    for (const key of permissionKeys) {
      const allowed = await evaluateUserPermission(req.user, key);
      if (allowed) {
        return next();
      }
    }

    return ApiResponse.forbidden(
      res,
      `এই কার্যক্রমের জন্য আপনার (${getUserTypeLabel(req.user.userType)}) অনুমতি নেই`
    );
  };
};

// Helper to evaluate if a user has a specific permission (with cache & mapping)
const evaluateUserPermission = async (user, permissionKey) => {
  try {
    const rolesToCheck = [user.userType];
    if (user.adminRole) rolesToCheck.push(user.adminRole);

    let cacheMiss = false;
    const now = Date.now();
    for (const role of rolesToCheck) {
      if (!permissionCache.has(role) || (now - (cacheTimestamps.get(role) || 0)) > CACHE_TTL) {
        cacheMiss = true;
        break;
      }
    }

    if (cacheMiss) {
      const rolePerms = await RolePermission.findAll({ where: { role: rolesToCheck } });
      for (const role of rolesToCheck) {
        const rp = rolePerms.find(p => p.role === role);
        let perms = {};
        if (rp) {
          perms = rp.permissions;
          if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) { perms = {}; }
          }
        }
        const defaults = defaultRolePermissions[role] || {};
        const mergedPerms = { ...defaults, ...(perms || {}) };
        permissionCache.set(role, mergedPerms);
        cacheTimestamps.set(role, now);
      }
    }

    let hasExplicitPermission = false;
    for (const role of rolesToCheck) {
      const perms = permissionCache.get(role);
      if (perms) {
        // If explicitly set to false, do NOT allow via legacy fallback
        if (perms[permissionKey] === false || perms[permissionKey] === 'false') {
          continue;
        }

        if (perms[permissionKey] === true || perms[permissionKey] === 'true') {
          hasExplicitPermission = true;
          break;
        }

        // Granular <-> Legacy mapping check
        if (legacyToGranularMap[permissionKey]) {
          const mappedKeys = legacyToGranularMap[permissionKey];
          if (mappedKeys.some(k => perms[k] === true || perms[k] === 'true')) {
            hasExplicitPermission = true;
            break;
          }
        }

        for (const [legacyKey, granularKeys] of Object.entries(legacyToGranularMap)) {
          if (granularKeys.includes(permissionKey)) {
            if (perms[legacyKey] === true || perms[legacyKey] === 'true') {
              hasExplicitPermission = true;
              break;
            }
          }
        }
        if (hasExplicitPermission) break;
      }
    }

    return hasExplicitPermission;
  } catch (err) {
    console.error('Error evaluating user permission:', err);
    return false;
  }
};

const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'অনুগ্রহ করে লগ ইন করুন');
    }

    // Super Admin & Co-Super Admin have full system access, bypass all checks
    const isSuperOrCoSuper = req.user.userType === 'super_admin' || 
                             req.user.userType === 'co_super_admin' || 
                             req.user.adminRole === 'co_super_admin';
    if (isSuperOrCoSuper) {
      return next();
    }

    try {
      const rolesToCheck = [req.user.userType];
      if (req.user.adminRole) rolesToCheck.push(req.user.adminRole);

      // Check cache first for performance
      let userPermissions = {};
      let cacheMiss = false;

      for (const role of rolesToCheck) {
        if (!permissionCache.has(role)) {
          cacheMiss = true;
          break;
        }
      }

      if (cacheMiss) {
        // Fetch from DB
        const rolePerms = await RolePermission.findAll({ where: { role: rolesToCheck } });
        
        for (const role of rolesToCheck) {
          const rp = rolePerms.find(p => p.role === role);
          let perms = {};
          
          if (rp) {
             perms = rp.permissions;
             if (typeof perms === 'string') {
               try { perms = JSON.parse(perms); } catch (e) { perms = {}; }
             }
          }
          
          // Merge with defaults if not in DB
          const defaults = defaultRolePermissions[role] || {};
          const mergedPerms = { ...defaults, ...(perms || {}) };
          
          permissionCache.set(role, mergedPerms);
        }
      }

      // Consolidate permissions from all roles the user has
      let hasExplicitPermission = false;
      let hasExplicitDenial = false;

      // Handle legacy keys mapping
      let keysToCheck = [permissionKey];
      // Reverse lookup: if checking granular, does the legacy permission allow it?
      // Actually, it's better to just check the requested key. If the system is requesting a legacy key, we check the legacy key.
      
      for (const role of rolesToCheck) {
        const perms = permissionCache.get(role);
        
        if (perms) {
          // 1. Direct check
          if (perms[permissionKey] === true || perms[permissionKey] === 'true') {
            hasExplicitPermission = true;
          } else if (perms[permissionKey] === false || perms[permissionKey] === 'false') {
            hasExplicitDenial = true;
          }

          // 2. Check mapping if direct check didn't pass
          if (!hasExplicitPermission) {
            // Case A: System requests a legacy key (e.g., 'can_view_homework'), and role has granular keys (e.g. 'homework.view')
            if (legacyToGranularMap[permissionKey]) {
              const mappedGranularKeys = legacyToGranularMap[permissionKey];
              if (mappedGranularKeys.some(k => perms[k] === true || perms[k] === 'true')) {
                hasExplicitPermission = true;
              }
            }

            // Case B: System requests a granular key (e.g., 'homework.view'), and role has legacy key (e.g. 'can_view_homework')
            if (!hasExplicitPermission) {
              for (const [legacyKey, granularKeys] of Object.entries(legacyToGranularMap)) {
                if (granularKeys.includes(permissionKey)) {
                  if (perms[legacyKey] === true || perms[legacyKey] === 'true') {
                    hasExplicitPermission = true;
                    break;
                  }
                }
              }
            }
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

      // If we reach here, neither allowed nor denied explicitly in DB or Defaults
      return ApiResponse.forbidden(
        res,
        `এই কার্যক্রমের জন্য আপনার (${getUserTypeLabel(req.user.userType)}) অনুমতি নেই`
      );
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authorize, checkPermission, getUserTypeLabel, clearPermissionCache, evaluateUserPermission };
