const express = require('express');
const router = express.Router();
const {
  getIncomeCategories,
  createIncomeCategory,
  updateIncomeCategory,
  deleteIncomeCategory,
  getIncomes,
  createIncome,
  deleteIncome,
  approveIncome,
  rejectIncome
} = require('../controllers/incomeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'));

// Income Categories Routes
router.route('/income-categories')
  .get(getIncomeCategories)
  .post(createIncomeCategory);

router.route('/income-categories/:id')
  .put(updateIncomeCategory)
  .delete(deleteIncomeCategory);

// Incomes Routes
router.route('/incomes')
  .get(getIncomes)
  .post(createIncome);

router.route('/incomes/:id')
  .delete(deleteIncome);

router.post('/incomes/:id/approve', authorize('super_admin', 'co_super_admin', 'admin', 'principal'), approveIncome);
router.post('/incomes/:id/reject', authorize('super_admin', 'co_super_admin', 'admin', 'principal'), rejectIncome);

module.exports = router;
