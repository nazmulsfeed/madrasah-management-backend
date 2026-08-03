const express = require('express');
const router = express.Router();
const madrasahController = require('../controllers/madrasahController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'));

// Funds
router.get('/funds/balances', madrasahController.getFundBalances);
router.route('/funds/transfers')
  .get(madrasahController.getFundTransfers)
  .post(madrasahController.createFundTransfer);
router.put('/funds/transfers/:id/approve', madrasahController.approveFundTransfer);

// Qurbani Skins
router.route('/qurbani-skins')
  .get(madrasahController.getQurbaniSkins)
  .post(madrasahController.createQurbaniSkin);
router.put('/qurbani-skins/:id', madrasahController.updateQurbaniSkin);

module.exports = router;
