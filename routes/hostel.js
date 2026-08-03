const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostelController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(protect);

router
  .route('/')
  .get(hostelController.getHostels)
  .post(
    checkPermission('can_manage_hostel'),
    hostelController.createHostel
  );

router
  .route('/:id')
  .patch(
    checkPermission('can_manage_hostel'),
    hostelController.updateHostel
  )
  .delete(
    checkPermission('can_manage_hostel'),
    hostelController.deleteHostel
  );

module.exports = router;
