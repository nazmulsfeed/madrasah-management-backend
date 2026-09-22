const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/global', searchController.globalSearch);

module.exports = router;
