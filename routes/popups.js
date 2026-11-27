const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/apiResponse');
const { protect } = require('../middleware/auth');
const {
  getActivePopups,
  getPopupAudio,
  getPopupTts,
  getManagePopups,
  createPopup,
  updatePopup,
  deletePopup,
  pushNoticeToPopup,
  getDueSetting,
  updateDueSetting,
} = require('../controllers/popupController');

const requireSuperOrCoSuper = (req, res, next) => {
  const u = req.user;
  if (
    u?.userType === 'super_admin' ||
    u?.userType === 'co_super_admin' ||
    u?.adminRole === 'co_super_admin'
  ) {
    return next();
  }
  return ApiResponse.forbidden(res, 'শুধুমাত্র সুপার অ্যাডমিন ও কো-সুপার অ্যাডমিন এটি পরিচালনা করতে পারবেন');
};

router.use(protect);

// সকল লগইন ইউজারের জন্য সক্রিয় পপ-আপ ও অডিও/টিটিএস
router.get('/active', getActivePopups);
router.get('/:id/audio', getPopupAudio);
router.get('/:id/tts', getPopupTts);

// শুধুমাত্র super_admin ও co_super_admin-এর জন্য ম্যানেজমেন্ট ও টগল
router.get('/manage', requireSuperOrCoSuper, getManagePopups);
router.post('/', requireSuperOrCoSuper, createPopup);
router.patch('/:id', requireSuperOrCoSuper, updatePopup);
router.delete('/:id', requireSuperOrCoSuper, deletePopup);
router.post('/push-notice/:noticeId', requireSuperOrCoSuper, pushNoticeToPopup);
router.get('/due-setting', requireSuperOrCoSuper, getDueSetting);
router.put('/due-setting', requireSuperOrCoSuper, updateDueSetting);

module.exports = router;
