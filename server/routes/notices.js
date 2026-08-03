const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', noticeController.getNotices);
router.post('/', authorize('super_admin', 'admin', 'principal', 'vice_principal'), noticeController.createNotice);

module.exports = router;
