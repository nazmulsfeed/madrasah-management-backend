const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Protect all routes
router.use(protect);
router.use(authorize('super_admin', 'co_super_admin', 'admin', 'principal'));

router.route('/')
  .get(auditLogController.getAuditLogs);

module.exports = router;
