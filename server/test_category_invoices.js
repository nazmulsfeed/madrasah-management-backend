const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Student = require('./models/Student');
const StudentEnrollment = require('./models/StudentEnrollment');
const ClassLevel = require('./models/ClassLevel');
const Invoice = require('./models/Invoice');
const { generateCategoryInvoicesForCurrentMonth } = require('./utils/invoiceScheduler');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/madrasah_management');
    console.log('Connected to DB');

    // Update the first ClassLevel's examFee to 500
    const cl = await ClassLevel.findOne({});
    if (cl) {
      cl.examFee = 500;
      await cl.save();
      console.log(`Updated class ${cl.name} examFee to 500`);
    }

    // Run the scheduler method
    const count = await generateCategoryInvoicesForCurrentMonth('examFee', 'জুন', '2026');
    console.log(`Success generating category invoices! Count: ${count}`);
  } catch (err) {
    console.error('Caught error during generation:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
