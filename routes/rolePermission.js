const express = require('express');
const router = express.Router();
const rolePermissionController = require('../controllers/rolePermissionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// My permissions
router.get('/me', rolePermissionController.getMyPermissions);

// Super admin & co-super admin routes
router.use(authorize('super_admin', 'co_super_admin', 'admin'));
router.get('/', rolePermissionController.getAllPermissions);
router.put('/:role', rolePermissionController.updateRolePermissions);

module.exports = router;
