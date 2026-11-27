const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/apiResponse');
const { protect } = require('../middleware/auth');
const { getExpiries, upsertExpiry } = require('../controllers/infrastructureController');

const requireSuperOrCoSuper = (req, res, next) => {
  const u = req.user;
  if (
    u?.userType === 'super_admin' ||
    u?.userType === 'co_super_admin' ||
    u?.adminRole === 'co_super_admin'
  ) {
    return next();
  }
  return ApiResponse.forbidden(res, 'শুধুমাত্র সুপার অ্যাডমিন ও কো-সুপার অ্যাডমিন এটি দেখতে পারবেন');
};

router.use(protect);
router.use(requireSuperOrCoSuper);

router.get('/', getExpiries);
router.put('/', upsertExpiry);

module.exports = router;
