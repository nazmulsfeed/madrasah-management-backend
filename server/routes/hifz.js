const express = require('express');
const router = express.Router();
const hifzController = require('../controllers/hifzController');
const { protect } = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/rbac');

router.use(protect);

router.get('/', authorize('super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian'), hifzController.getHifzProgress);
router.post('/', authorize('super_admin', 'admin', 'principal', 'teacher'), hifzController.saveHifzProgress);
router.patch('/:id', checkPermission('can_manage_hifz'), hifzController.updateHifzProgress);
router.delete('/:id', checkPermission('can_manage_hifz'), hifzController.deleteHifzProgress);

module.exports = router;
