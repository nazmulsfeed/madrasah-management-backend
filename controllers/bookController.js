const Book = require('../models/Book');
const ApiResponse = require('../utils/apiResponse');

// @desc    Get all books
// @route   GET /api/v1/books
// @access  Private
exports.getBooks = async (req, res, next) => {
  try {
    const filter = {
      institution: req.user.institution,
      isDeleted: { $ne: true }
    };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { title: searchRegex },
        { author: searchRegex }
      ];
    }

    const books = await Book.find(filter).sort({ createdAt: -1 });

    ApiResponse.success(res, { books });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new book
// @route   POST /api/v1/books
// @access  Private (super_admin, admin, principal, librarian, etc.)
exports.createBook = async (req, res, next) => {
  try {
    const { title, author, category, copies, available } = req.body;

    if (!title) {
      return ApiResponse.error(res, 'বইয়ের শিরোনাম আবশ্যক', 400);
    }

    const book = await Book.create({
      institution: req.user.institution,
      title,
      author: author || '',
      category: category || 'অন্যান্য',
      copies: Number(copies) || 1,
      available: Number(available !== undefined ? available : copies) || 1,
      createdBy: req.user._id
    });

    ApiResponse.created(res, { book }, 'বইটি সফলভাবে তৈরি হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Update a book
// @route   PATCH /api/v1/books/:id
// @access  Private
exports.updateBook = async (req, res, next) => {
  try {
    const { title, author, category, copies, available } = req.body;

    const book = await Book.findOne({
      _id: req.params.id,
      institution: req.user.institution,
      isDeleted: { $ne: true }
    });

    if (!book) {
      return ApiResponse.notFound(res, 'বইটি পাওয়া যায়নি');
    }

    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (category !== undefined) book.category = category;
    if (copies !== undefined) book.copies = Number(copies);
    if (available !== undefined) book.available = Number(available);

    await book.save();

    ApiResponse.success(res, { book }, 'বইটির তথ্য সফলভাবে আপডেট হয়েছে');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a book (soft delete)
// @route   DELETE /api/v1/books/:id
// @access  Private
exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id,
      institution: req.user.institution,
      isDeleted: { $ne: true }
    });

    if (!book) {
      return ApiResponse.notFound(res, 'বইটি পাওয়া যায়নি');
    }

    book.isDeleted = true;
    await book.save();

    ApiResponse.success(res, null, 'বইটি সফলভাবে মুছে ফেলা হয়েছে');
  } catch (error) {
    next(error);
  }
};
