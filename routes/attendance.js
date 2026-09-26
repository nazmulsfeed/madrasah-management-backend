const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// ZKTeco ADMS Webhook রুট (ডিভাইস পুশ করবে সরাসরি — কোনো টোকেন ছাড়া)
router.all('/iclock/cdata', attendanceController.zktecoADMSListener);

router.use(protect);

// সুপার অ্যাডমিন স্পেশাল বায়োমেট্রিক ও সিমুলেটর রাউট (অন্য কেউ এক্সেস পাবে না)
router.post(
  '/device-push-test',
  authorize('super_admin'),
  attendanceController.simulateDevicePush
);

router.post(
  '/test-push-diagnostics',
  authorize('super_admin'),
  attendanceController.testPushDiagnostics
);

router.post(
  '/auto-absent-check',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal'),
  attendanceController.runAutoAbsentCheck
);

router
  .route('/biometric-settings')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal'), attendanceController.getBiometricSettings)
  .patch(authorize('super_admin', 'co_super_admin', 'admin', 'principal'), attendanceController.updateBiometricSettings);

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
