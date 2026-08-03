const ApiResponse = require('../utils/apiResponse');
const fs = require('fs');

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);
  try {
    fs.appendFileSync('C:\\Users\\Nazmul\\.gemini\\antigravity-ide\\brain\\87dd51c6-8e83-4392-aad8-4cfdb121e2fc\\error_log_debug.txt', `${new Date().toISOString()} - ${err.message}\n${err.stack}\n\n`);
  } catch (e) {
    console.error('Failed to write log file:', e);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return ApiResponse.error(res, 'ভ্যালিডেশন ত্রুটি', 400, messages);
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
    process.env.NODE_ENV === 'development' ? err.message : 'সার্ভারে একটি সমস্যা হয়েছে',
    err.statusCode || 500
  );
};

module.exports = errorHandler;
