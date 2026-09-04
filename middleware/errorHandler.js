const ApiResponse = require('../utils/apiResponse');
const fs = require('fs');
const path = require('path');

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'error.log'), `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${err.message}\n${err.stack}\n\n`);
  } catch (e) {
    console.error('Failed to write log file:', e);
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return ApiResponse.error(res, 'অবৈধ JSON ডেটা', 400);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return ApiResponse.error(res, 'ভ্যালিডেশন ত্রুটি', 400, messages);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'ক্ষেত্র';
    return ApiResponse.error(res, `${field} ইতিমধ্যে ব্যবহৃত হয়েছে`, 400);
  }

  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    return ApiResponse.error(res, 'ভ্যালিডেশন ত্রুটি', 400, messages);
  }

  if (err.name === 'SequelizeDatabaseError') {
    return ApiResponse.error(res, `ডাটাবেস ত্রুটি: ${err.message}`, 500);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return ApiResponse.error(res, `${field} ইতিমধ্যে ব্যবহৃত হয়েছে`, 400);
  }

  if (err.name === 'CastError') {
    return ApiResponse.error(res, 'অবৈধ আইডি ফরম্যাট', 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'অবৈধ টোকেন');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'টোকেনের মেয়াদ শেষ হয়ে গেছে');
  }

  return ApiResponse.error(
    res,
    err.message || 'সার্ভারে একটি সমস্যা হয়েছে',
    err.statusCode || 500
  );
};

module.exports = errorHandler;

