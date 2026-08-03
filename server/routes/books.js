const express = require('express');
const router = express.Router();
const { getBooks, createBook, updateBook, deleteBook } = require('../controllers/bookController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getBooks)
  .post(createBook);

router.route('/:id')
  .patch(updateBook)
  .delete(deleteBook);

module.exports = router;
