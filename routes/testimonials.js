const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonialController');
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

router.get('/students', authorize(...allowedRoles), testimonialController.getStudentsWithTestimonials);
router.post('/', authorize(...allowedRoles), testimonialController.saveOrUpdateTestimonial);
router.patch('/:studentId/toggle-taken', authorize(...allowedRoles), testimonialController.toggleTakenStatus);

module.exports = router;
