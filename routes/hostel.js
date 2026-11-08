const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostelController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

const authorityRoles = [
  'super_admin',
  'co_super_admin',
  'admin',
  'principal',
  'vice_principal',
  'teacher',
  'hifz_teacher',
  'hostel_manager',
  'can_manage_hostel'
];

router
  .route('/meal-routine')
  .get(hostelController.getMealRoutines)
  .post(
    authorize(...authorityRoles),
    hostelController.saveMealRoutines
  );

router
  .route('/')
  .get(hostelController.getHostels)
  .post(
    authorize(...authorityRoles),
    hostelController.createHostel
  );

router
  .route('/:id')
  .patch(
    authorize(...authorityRoles),
    hostelController.updateHostel
  )
  .delete(
    authorize(...authorityRoles),
    hostelController.deleteHostel
  );

module.exports = router;
