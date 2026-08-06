const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { protect } = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/rbac');

router.get('/public', noticeController.getPublicNotices);

router.use(protect);

router.get('/', noticeController.getNotices);
router.post('/', checkPermission('can_manage_notice'), noticeController.createNotice);
router.put('/:id', checkPermission('can_manage_notice'), noticeController.updateNotice);
router.delete('/:id', checkPermission('can_manage_notice'), noticeController.deleteNotice);

module.exports = router;
