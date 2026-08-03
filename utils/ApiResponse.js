class ApiResponse {
  static success(res, data = null, message = 'সফল', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, data = null, message = 'সফলভাবে তৈরি হয়েছে') {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  static error(res, message = 'সার্ভার ত্রুটি', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static notFound(res, message = 'তথ্য পাওয়া যায়নি') {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  static unauthorized(res, message = 'অনুমতি নেই') {
    return res.status(401).json({
      success: false,
      message,
    });
  }

  static forbidden(res, message = 'প্রবেশাধিকার নেই') {
    return res.status(403).json({
      success: false,
      message,
    });
  }

  static paginated(res, data, page, limit, total) {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
}

module.exports = ApiResponse;
