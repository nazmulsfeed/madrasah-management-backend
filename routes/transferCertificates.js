const express = require('express');
const router = express.Router();
const transferCertificateController = require('../controllers/transferCertificateController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

const allowedRoles = [
  'super_admin',
  'co_super_admin',
  'admin',
  'principal',
  'vice_principal',
  'teacher',
  'student.view',
  'student.update',
];

router.get('/students', authorize(...allowedRoles), transferCertificateController.getStudentsWithTC);
router.post('/', authorize(...allowedRoles), transferCertificateController.saveOrUpdateTC);
router.patch('/:studentId/toggle-taken', authorize(...allowedRoles), transferCertificateController.toggleTakenStatus);

module.exports = router;
