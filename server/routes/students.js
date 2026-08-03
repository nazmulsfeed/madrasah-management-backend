const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/stats', studentController.getStudentStats);
router.get('/classes', studentController.getClassLevels);
router.post('/classes', authorize('super_admin', 'admin', 'principal'), studentController.createClassLevel);
router.patch('/classes/:id', authorize('super_admin', 'admin', 'principal'), studentController.updateClassLevel);
router.delete('/classes/:id', authorize('super_admin', 'admin', 'principal'), studentController.deleteClassLevel);
router.get('/sections', studentController.getSections);
router.get('/subjects', studentController.getSubjects);
router.get('/academic-years', studentController.getAcademicYears);
router.get('/promotion-candidates', studentController.getPromotionCandidates);
router.get('/next-roll', studentController.getNextRollNumber);
router.get('/branches', studentController.getBranches);
router.post('/promote', authorize('super_admin', 'admin', 'principal'), studentController.promoteStudents);
router.post('/subjects', authorize('super_admin', 'admin', 'principal'), studentController.createSubject);
router.patch('/subjects/:id', authorize('super_admin', 'admin', 'principal'), studentController.updateSubject);
router.delete('/subjects/:id', authorize('super_admin', 'admin', 'principal'), studentController.deleteSubject);
router.post('/class-subjects', authorize('super_admin', 'admin', 'principal'), studentController.updateClassSubjects);

router
  .route('/')
  .get(studentController.getStudents)
  .post(
    authorize('super_admin', 'admin', 'principal', 'admission_officer'),
    studentController.createStudent
  );

router
  .route('/:id')
  .get(studentController.getStudent)
  .patch(
    authorize('super_admin', 'admin', 'principal', 'vice_principal'),
    studentController.updateStudent
  )
  .delete(
    authorize('super_admin', 'admin'),
    studentController.deleteStudent
  );

module.exports = router;
