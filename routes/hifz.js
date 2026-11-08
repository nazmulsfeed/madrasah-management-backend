const express = require('express');
const router = express.Router();
const hifzController = require('../controllers/hifzController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'hifz_teacher', 'student', 'guardian'), hifzController.getHifzProgress);
router.post('/', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'hifz_teacher'), hifzController.saveHifzProgress);
router.patch('/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'hifz_teacher'), hifzController.updateHifzProgress);
router.delete('/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'hifz_teacher'), hifzController.deleteHifzProgress);

module.exports = router;
