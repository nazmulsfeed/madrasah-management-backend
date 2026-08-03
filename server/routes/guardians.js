const express = require('express');
const router = express.Router();
const guardianController = require('../controllers/guardianController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router
  .route('/')
  .get(
    authorize('super_admin', 'admin', 'principal', 'vice_principal', 'teacher'),
    guardianController.getGuardians
  )
  .post(
    authorize('super_admin', 'admin', 'principal', 'vice_principal'),
    guardianController.createGuardian
  );

router
  .route('/:id')
  .get(
    authorize('super_admin', 'admin', 'principal', 'vice_principal', 'teacher'),
    guardianController.getGuardian
  )
  .patch(
    authorize('super_admin', 'admin', 'principal', 'vice_principal'),
    guardianController.updateGuardian
  )
  .delete(
    authorize('super_admin', 'admin', 'principal', 'vice_principal'),
    guardianController.deleteGuardian
  );

module.exports = router;
