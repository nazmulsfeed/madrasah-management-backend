const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homeworkController');
const { protect } = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/rbac');

router.get('/public/settings', homeworkController.getPublicHomeworkSettings);
router.get('/public', homeworkController.getPublicHomeworks);
router.post('/public/toggle', protect, homeworkController.togglePublicHomework);

router.use(protect);

router
  .route('/')
  .get(checkPermission('can_view_homework'), homeworkController.getHomeworks)
  .post(
    checkPermission('can_create_homework'),
    homeworkController.createHomework
  );

router
  .route('/:id')
  .get(checkPermission('can_view_homework'), homeworkController.getHomework)
  .patch(
    checkPermission('can_edit_homework'),
    homeworkController.updateHomework
  )
  .delete(
    checkPermission('can_delete_homework'),
    homeworkController.deleteHomework
  );

module.exports = router;
