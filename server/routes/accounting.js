const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accountingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'));

router.route('/accounts')
  .get(accountingController.getAccounts)
  .post(accountingController.createAccount);

router.route('/accounts/:id')
  .put(accountingController.updateAccount);

router.route('/journals')
  .get(accountingController.getJournals);

router.route('/transactions')
  .get(accountingController.getTransactions);

router.route('/trial-balance')
  .get(accountingController.getTrialBalance);

router.route('/balance-sheet')
  .get(accountingController.getBalanceSheet);

router.route('/income-statement')
  .get(accountingController.getIncomeStatement);

module.exports = router;
