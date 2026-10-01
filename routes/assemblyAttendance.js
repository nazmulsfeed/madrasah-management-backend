const express = require('express');
const router = express.Router();
const assemblyAttendanceController = require('../controllers/assemblyAttendanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.route('/')
  .get(assemblyAttendanceController.getAssemblyAttendance)
  .post(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'hifz_teacher', 'accountant'),
    assemblyAttendanceController.saveAssemblyAttendance
  );

module.exports = router;
