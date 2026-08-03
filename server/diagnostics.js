const db = require('./config/db');

const modelsToTest = [
  { name: 'User', modelPath: './models/User', test: async (m) => await m.find({}).limit(1) },
  { name: 'Branch', modelPath: './models/Branch', test: async (m) => await m.find({}).limit(1) },
  { name: 'AcademicYear', modelPath: './models/AcademicYear', test: async (m) => await m.find({}).limit(1) },
  { name: 'ClassLevel', modelPath: './models/ClassLevel', test: async (m) => await m.find({}).limit(1) },
  { name: 'Section', modelPath: './models/Section', test: async (m) => await m.find({}).populate('classLevel').limit(1) },
  { name: 'Student', modelPath: './models/Student', test: async (m) => await m.find({}).populate('user').populate('branch').limit(1) },
  { name: 'StudentEnrollment', modelPath: './models/StudentEnrollment', test: async (m) => await m.find({}).populate('student').populate('classLevel').populate('section').limit(1) },
  { name: 'Teacher', modelPath: './models/Teacher', test: async (m) => await m.find({}).populate('user').limit(1) },
  { name: 'Guardian', modelPath: './models/Guardian', test: async (m) => await m.find({}).limit(1) },
  { name: 'Subject', modelPath: './models/Subject', test: async (m) => await m.find({}).populate('classLevels').limit(1) },
  { name: 'StudentAttendance', modelPath: './models/StudentAttendance', test: async (m) => await m.find({}).limit(1) },
  { name: 'Homework', modelPath: './models/Homework', test: async (m) => await m.find({}).limit(1) },
  { name: 'HomeworkSubmission', modelPath: './models/HomeworkSubmission', test: async (m) => await m.find({}).limit(1) },
  { name: 'RolePermission', modelPath: './models/RolePermission', test: async (m) => await m.find({}).limit(1) },
  { name: 'Exam', modelPath: './models/Exam', test: async (m) => await m.find({}).limit(1) },
  { name: 'MarkEntry', modelPath: './models/MarkEntry', test: async (m) => await m.find({}).limit(1) },
  { name: 'HifzDailyProgress', modelPath: './models/HifzDailyProgress', test: async (m) => await m.find({}).limit(1) },
  { name: 'Invoice', modelPath: './models/Invoice', test: async (m) => await m.find({}).limit(1) },
  { name: 'Payment', modelPath: './models/Payment', test: async (m) => await m.find({}).limit(1) },
  { name: 'Notice', modelPath: './models/Notice', test: async (m) => await m.find({}).limit(1) },
  { name: 'Book', modelPath: './models/Book', test: async (m) => await m.find({}).limit(1) },
  { name: 'Hostel', modelPath: './models/Hostel', test: async (m) => await m.find({}).limit(1) }
];

const run = async () => {
  await db.connectDB();
  
  console.log('\n======================================================');
  console.log('    DATABASE DIAGNOSTICS - MODEL COMPATIBILITY CHECK');
  console.log('======================================================\n');
  
  const failed = [];
  
  for (const item of modelsToTest) {
    try {
      const model = require(item.modelPath);
      await item.test(model);
      console.log(`✅ Model ${item.name}: OK`);
    } catch (err) {
      console.log(`❌ Model ${item.name}: FAILED`);
      console.log(`   ↳ Error: ${err.message}`);
      failed.push({ name: item.name, error: err.message });
    }
  }
  
  console.log('\n======================================================');
  console.log('                   DIAGNOSTICS REPORT');
  console.log('======================================================\n');
  
  if (failed.length === 0) {
    console.log('🎉 All model queries are working perfectly! No errors found.');
  } else {
    console.log(`⚠️ Found ${failed.length} failing models:\n`);
    failed.forEach(f => {
      console.log(`- ${f.name}`);
      console.log(`  Details: ${f.error}\n`);
    });
  }
  
  process.exit(0);
};

run().catch(err => {
  console.error('Diagnostics failed:', err);
  process.exit(1);
});
