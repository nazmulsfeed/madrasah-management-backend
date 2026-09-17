const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian', 'exam.view'), examController.getExams);
router.post('/', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'exam.create'), examController.createExam);
router.patch('/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'exam.update'), examController.updateExam);
router.delete('/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'exam.delete'), examController.deleteExam);
router.get('/marks', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian', 'exam.grade'), examController.getMarks);
router.post('/marks', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'exam.grade'), examController.saveMarks);

module.exports = router;
