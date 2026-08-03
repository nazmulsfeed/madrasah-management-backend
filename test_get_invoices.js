// test_get_invoices.js
// Instead, I'll write a script that connects to DB and runs financeController.getInvoices directly.

const db = require('./server/config/db');
const financeController = require('./server/controllers/financeController');
const User = require('./server/models/User');

(async () => {
  try {
    await db.connectDB();
    const admin = await User.findOne({ where: { userType: 'super_admin' } });
    if (!admin) {
      console.log('No super admin found');
      return;
    }
    
    const req = {
      user: admin,
      query: {}
    };
    const res = {
      status: (code) => ({ json: (data) => console.log('RESPONSE:', code, data) }),
      json: (data) => console.log('RESPONSE:', data)
    };
    const next = (err) => console.log('ERROR THROWN:', err);
    
    console.log('Calling getInvoices...');
    await financeController.getInvoices(req, res, next);
    console.log('Done');
  } catch (err) {
    console.log('Fatal Error:', err);
  } finally {
    process.exit(0);
  }
})();
