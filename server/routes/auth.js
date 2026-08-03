const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, authController.updateMe);
router.put('/password', protect, authController.updatePassword);

module.exports = router;
