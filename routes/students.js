const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/stats', studentController.getStudentStats);
router.get('/classes', studentController.getClassLevels);
router.post('/classes', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'class.create'), studentController.createClassLevel);
router.patch('/classes/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'class.update'), studentController.updateClassLevel);
router.delete('/classes/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'class.delete'), studentController.deleteClassLevel);
router.get('/sections', studentController.getSections);
router.get('/subjects', studentController.getSubjects);
router.get('/academic-years', studentController.getAcademicYears);
router.post('/academic-years', authorize('super_admin', 'co_super_admin', 'admin', 'principal'), studentController.createAcademicYear);
router.patch('/academic-years/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal'), studentController.updateAcademicYear);
router.delete('/academic-years/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal'), studentController.deleteAcademicYear);
router.get('/promotion-candidates', studentController.getPromotionCandidates);
router.get('/next-roll', studentController.getNextRollNumber);
router.get('/branches', studentController.getBranches);
router.post('/promote', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'student.promote'), studentController.promoteStudents);
router.post('/subjects', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'subject.create'), studentController.createSubject);
router.patch('/subjects/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'subject.update'), studentController.updateSubject);
router.delete('/subjects/:id', authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'subject.delete'), studentController.deleteSubject);
router.post('/class-subjects', authorize('super_admin', 'co_super_admin', 'admin', 'principal'), studentController.updateClassSubjects);

router
  .route('/')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'student.view'), studentController.getStudents)
  .post(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'student.create'),
    studentController.createStudent
  );

router.get(
  '/:id/show-password',
  authorize('super_admin', 'co_super_admin', 'admin', 'principal'),
  studentController.getStudentPassword
);

router
  .route('/:id')
  .get(authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'student.view'), studentController.getStudent)
  .patch(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'student.update'),
    studentController.updateStudent
  )
  .delete(
    authorize('super_admin', 'co_super_admin', 'admin', 'principal', 'student.delete'),
    studentController.deleteStudent
  );

module.exports = router;
