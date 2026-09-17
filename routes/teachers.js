const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router
  .route('/')
  .get(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher.view', 'user.view', 'can_view_users'),
    teacherController.getTeachers
  )
  .post(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher.create', 'user.create', 'can_manage_users'),
    teacherController.createTeacher
  );

router
  .route('/:id')
  .get(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher.view', 'user.view', 'can_view_users'),
    teacherController.getTeacher
  )
  .patch(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher.update', 'user.update', 'can_manage_users'),
    teacherController.updateTeacher
  )
  .delete(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher.delete', 'user.delete', 'can_manage_users'),
    teacherController.deleteTeacher
  );

module.exports = router;
