const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry
 * @param {Object} req - The Express request object
 * @param {String} module - Module name (e.g., 'Role', 'Payment')
 * @param {String} action - Action name (e.g., 'update', 'approve')
 * @param {String} description - Human readable description
 * @param {String} documentId - ID of affected record (optional)
 * @param {Object} previousData - Previous state (optional)
 * @param {Object} currentData - New state (optional)
 */
const logAction = async (req, module, action, description, documentId = null, previousData = null, currentData = null) => {
  try {
    const userId = req.user ? req.user._id || req.user.username : 'System';
    const institution = req.user ? req.user.institution : null;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    await AuditLog.create({
      user: userId,
      institution,
      module,
      action,
      description,
      documentId,
      previousData,
      currentData,
      ipAddress
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
    // Don't fail the request if logging fails
  }
};

module.exports = { logAction };
