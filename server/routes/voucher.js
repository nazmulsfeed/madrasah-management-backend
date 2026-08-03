const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.route('/')
  .get(voucherController.getVouchers)
  .post(voucherController.createVoucher);

router.post('/:id/verify', authorize('super_admin', 'co_super_admin', 'admin', 'principal'), voucherController.verifyVoucher);
router.post('/:id/approve', authorize('super_admin', 'co_super_admin', 'admin'), voucherController.approveVoucher);
router.post('/:id/reject', authorize('super_admin', 'co_super_admin', 'admin', 'principal'), voucherController.rejectVoucher);

module.exports = router;
