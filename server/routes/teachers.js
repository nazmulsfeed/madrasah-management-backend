const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router
  .route('/')
  .get(teacherController.getTeachers)
  .post(
    authorize('super_admin', 'admin', 'principal'),
    teacherController.createTeacher
  );

router
  .route('/:id')
  .get(teacherController.getTeacher)
  .patch(
    authorize('super_admin', 'admin', 'principal'),
    teacherController.updateTeacher
  )
  .delete(
    authorize('super_admin', 'admin', 'principal'),
    teacherController.deleteTeacher
  );

module.exports = router;
