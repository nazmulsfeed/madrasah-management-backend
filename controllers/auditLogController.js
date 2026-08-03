const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');

// @desc    Get all audit logs
// @route   GET /api/v1/audit-logs
exports.getAuditLogs = async (req, res, next) => {
  try {
    const filter = { institution: req.user.institution };
    
    if (req.query.module) filter.module = req.query.module;
    if (req.query.action) filter.action = req.query.action;
    
    if (req.query.startDate && req.query.endDate) {
       filter.createdAt = { 
           $gte: new Date(req.query.startDate), 
           $lte: new Date(new Date(req.query.endDate).setHours(23, 59, 59, 999)) 
       };
    }

    const logs = await AuditLog.find(filter)
      .populate('user', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(500); // Limit to recent 500 logs for performance

    ApiResponse.success(res, { logs });
  } catch (error) {
    next(error);
  }
};

// Helper function to log actions from other controllers
exports.logAction = async (institution, userId, action, moduleName, documentId, description, previousData = null, currentData = null) => {
  try {
    await AuditLog.create({
      institution,
      user: userId,
      action,
      module: moduleName,
      documentId,
      description,
      previousData,
      currentData
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};
