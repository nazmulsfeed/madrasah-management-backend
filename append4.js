const fs = require('fs');
const code = `
// --- Custom Reports ---
exports.getCustomReports = async (req, res, next) => {
  try {
    const institution = req.user.institution;
    const { startDate, endDate, type } = req.query;
    
    let filter = { institution };
    
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let data = [];
    if (type === 'invoices') {
      const Invoice = require('../models/Invoice');
      data = await Invoice.find(filter).populate('student', 'studentId').sort({ createdAt: -1 });
    } else if (type === 'payments') {
      const Payment = require('../models/Payment');
      data = await Payment.find(filter).populate('invoice', 'invoiceNumber').sort({ createdAt: -1 });
    } else if (type === 'expenses') {
      const Voucher = require('../models/Voucher');
      data = await Voucher.find(filter).sort({ createdAt: -1 });
    } else {
      // Default to journal entries
      const JournalEntry = require('../models/JournalEntry');
      // JournalEntry uses 'date' instead of 'createdAt' for accounting
      if (startDate && endDate) {
        filter.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
        delete filter.createdAt;
      }
      data = await JournalEntry.find(filter).sort({ date: -1 });
    }
    
    ApiResponse.success(res, { type, data });
  } catch (error) { next(error); }
};
`;
fs.appendFileSync('server/controllers/financeController.js', code);
