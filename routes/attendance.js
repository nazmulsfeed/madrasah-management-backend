const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router
  .route('/')
  .get(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher', 'guardian', 'student'),
    attendanceController.getAttendance
  )
  .post(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher'),
    attendanceController.markAttendance
  );

module.exports = router;
