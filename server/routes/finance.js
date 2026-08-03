const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.route('/invoices')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant', 'student', 'guardian'), financeController.getInvoices)
  .post(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.createInvoice);

// Budgets
router.route('/budgets')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getBudgets)
  .post(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.createBudget);

router.route('/budgets/:id')
  .put(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.updateBudget);

// Assets
router.route('/assets')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getAssets)
  .post(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.createAsset);

router.route('/assets/:id')
  .put(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.updateAsset);

// Loans
router.route('/loans')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getLoans)
  .post(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.createLoan);

router.route('/loans/:id')
  .put(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.updateLoan);

// Checks
router.route('/checks')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getChecks)
  .post(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.createCheck);

router.route('/checks/:id')
  .put(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.updateCheck);

// Financial Years
router.route('/financial-years')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getFinancialYears)
  .post(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.createFinancialYear);

router.route('/financial-years/:id/close')
  .put(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.closeFinancialYear);

// Advances
router.route('/advances')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getAdvances)
  .post(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.createAdvance);

router.route('/advances/:id')
  .put(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.updateAdvance);

// Refunds
router.route('/refunds')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getRefunds)
  .post(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.createRefund);

// Custom Reports
router.get('/reports/custom', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getCustomReports);

// Backup & Restore
router.get('/backup', authorize('super_admin'), financeController.downloadBackup);
router.post('/restore', authorize('super_admin'), financeController.restoreBackup);

router.post('/invoices/generate-monthly', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.generateMonthlyInvoices);
router.post('/invoices/generate-category', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.generateCategoryInvoices);
router.post('/payments', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant', 'student', 'guardian'), financeController.receivePayment);

// Payment Verification Routes
router.get('/payments/pending', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.getPendingPayments);
router.post('/payments/:id/verify', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.verifyPayment);
router.post('/payments/:id/reject', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), financeController.rejectPayment);

module.exports = router;
