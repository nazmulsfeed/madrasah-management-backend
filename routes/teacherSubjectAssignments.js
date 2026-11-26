const express = require('express');
const router = express.Router();
const controller = require('../controllers/teacherSubjectAssignmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All assignment management endpoints require authentication
router.use(protect);

// Strict Admin-Only Authorization (Super Admin, Co-Super Admin, Admin, Principal)
const adminOnly = authorize(
  'super_admin',
  'co_super_admin',
  'admin',
  'principal'
);

// 1. Create & List Assignments
router
  .route('/')
  .post(adminOnly, controller.createAssignment)
  .get(adminOnly, controller.listAssignments);

// 2. Details & Update
router
  .route('/:id')
  .get(adminOnly, controller.getAssignmentDetails)
  .put(adminOnly, controller.updateAssignment);

// 3. Lifecycle Transitions
router.patch('/:id/approve', adminOnly, controller.approveAssignment);
router.patch('/:id/deactivate', adminOnly, controller.deactivateAssignment);
router.patch('/:id/reactivate', adminOnly, controller.reactivateAssignment);

module.exports = router;
