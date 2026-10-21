const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// ZKTeco ADMS Webhook রুট (ডিভাইস পুশ করবে সরাসরি — কোনো টোকেন ছাড়া)
router.all('/iclock/cdata', attendanceController.zktecoADMSListener);
router.all('/iclock/getrequest', attendanceController.zktecoADMSGetRequest);
router.all('/iclock/devicecmd', attendanceController.zktecoADMSDeviceCmd);
router.all('/iclock/fdata', attendanceController.zktecoADMSFData);

router.use(protect);

// বায়োমেট্রিক আইডি সিঙ্ক, ভেরিফিকেশন ও আপলোড রাউটসমূহ
router.get(
  '/biometric-users',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal'),
  attendanceController.getBiometricUsers
);
router.post(
  '/biometric-verify',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal'),
  attendanceController.verifyBiometricUsers
);
router.post(
  '/biometric-upload',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal'),
  attendanceController.uploadBiometricUsers
);
router.get(
  '/biometric-devices',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal'),
  attendanceController.getBiometricDevices
);
router.post(
  '/biometric-device-command',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal'),
  attendanceController.sendBiometricDeviceCommand
);

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


router.get(
  '/punch-report',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal'),
  attendanceController.getPunchReport
);

router.get(
  '/summary-report',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal'),
  attendanceController.getAttendanceSummaryReport
);

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

router
  .route('/teachers')
  .get(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher', 'accountant'),
    attendanceController.getTeacherAttendance
  )
  .post(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal'),
    attendanceController.saveTeacherAttendance
  );

router.post(
  '/teachers/card-punch',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher', 'accountant'),
  attendanceController.recordTeacherCardPunch
);

router.post(
  '/teachers/cutoff',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal'),
  attendanceController.saveTeacherCutoffTime
);

router.post(
  '/teachers/auto-absent-check',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal'),
  attendanceController.runTeacherAutoAbsentCheck
);

module.exports = router;
