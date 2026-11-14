const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const examRoutineController = require('../controllers/examRoutineController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Exam Routine routes
router.get('/routines', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher', 'student', 'guardian', 'exam.view'), examRoutineController.getExamRoutines);
router.get('/routines/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher', 'student', 'guardian', 'exam.view'), examRoutineController.getExamRoutineById);
router.post('/routines', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher', 'exam.create', 'exam.update', 'academic.manage'), examRoutineController.createOrUpdateExamRoutine);
router.delete('/routines/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher', 'exam.delete', 'academic.manage'), examRoutineController.deleteExamRoutine);
router.get('/student-routine', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'hifz_teacher', 'student', 'guardian', 'exam.view'), examRoutineController.getStudentExamRoutine);

router.get('/', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian', 'exam.view'), examController.getExams);
router.post('/', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'exam.create'), examController.createExam);
router.patch('/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'exam.update'), examController.updateExam);
router.delete('/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'exam.delete'), examController.deleteExam);
router.get('/annual-rankings', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian', 'exam.view'), examController.getAnnualCombinedRankings);
router.get('/student-results/:studentId?', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian', 'exam.view'), examController.getStudentExamResults);
router.get('/:id/rankings', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian', 'exam.view'), examController.getExamRankings);
router.get('/marks', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'student', 'guardian', 'exam.grade'), examController.getMarks);
router.post('/marks', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'teacher', 'exam.grade'), examController.saveMarks);

module.exports = router;
