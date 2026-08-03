const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', authorize('super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian'), examController.getExams);
router.post('/', authorize('super_admin', 'admin', 'principal', 'teacher'), examController.createExam);
router.patch('/:id', authorize('super_admin', 'admin', 'principal', 'teacher'), examController.updateExam);
router.delete('/:id', authorize('super_admin', 'admin', 'principal'), examController.deleteExam);
router.get('/marks', authorize('super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian'), examController.getMarks);
router.post('/marks', authorize('super_admin', 'admin', 'principal', 'teacher'), examController.saveMarks);

module.exports = router;
