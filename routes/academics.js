const express = require('express');
const router = express.Router();
const academicsController = require('../controllers/academicsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Public endpoints (Accessible by everyone without login)
router.get('/public/timetable', academicsController.getPublicTimetable);
router.get('/public/calendar', academicsController.getPublicCalendar);

// Protected endpoints (Admins and Principals only)
router.put('/timetable', protect, authorize('super_admin', 'co_super_admin', 'admin', 'principal'), academicsController.saveTimetable);
router.put('/calendar', protect, authorize('super_admin', 'co_super_admin', 'admin', 'principal'), academicsController.saveCalendar);

module.exports = router;
