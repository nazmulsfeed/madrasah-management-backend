const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'verify', 'approve', 'reject'],
    required: true
  },
  module: {
    type: String, // e.g., 'Voucher', 'Income', 'Payment', 'Invoice', 'Account'
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId, // ID of the affected document
    required: true
  },
  description: {
    type: String,
    required: true
  },
  previousData: {
    type: mongoose.Schema.Types.Mixed, // JSON representation of previous state
    default: null
  },
  currentData: {
    type: mongoose.Schema.Types.Mixed, // JSON representation of current state
    default: null
  }
}, { timestamps: true });

// Index for faster queries
auditLogSchema.index({ institution: 1, module: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
