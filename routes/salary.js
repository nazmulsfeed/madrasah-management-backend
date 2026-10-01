const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Sheet & Generation
router.get('/sheet', salaryController.getSalarySheet);
router.post('/generate', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), salaryController.generateSalarySheet);

// Disbursements
router.post('/pay', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), salaryController.paySalary);
router.post('/bulk-pay', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), salaryController.bulkPaySalary);

// Payslip
router.get('/payslip/:id', salaryController.getPayslip);

// Individual Record CRUD
router.route('/:id')
  .put(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'), salaryController.updateSalaryRecord)
  .delete(authorize('super_admin', 'co_super_admin', 'admin'), salaryController.deleteSalaryRecord);

module.exports = router;
