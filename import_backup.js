require('dotenv').config();
const fs = require('fs');
const db = require('./config/db');

async function importBackup() {
  await db.connectDB();
  const sequelize = db;

  const backupData = JSON.parse(fs.readFileSync('d:/madrasah management system/madrasah_backup.json', 'utf8'));

  const models = {
    Institution: require('./models/Institution'),
    Branch: require('./models/Branch'),
    AcademicYear: require('./models/AcademicYear'),
    ClassLevel: require('./models/ClassLevel'),
    Section: require('./models/Section'),
    User: require('./models/User'),
    Teacher: require('./models/Teacher'),
    Student: require('./models/Student'),
    Guardian: require('./models/Guardian'),
    StudentEnrollment: require('./models/StudentEnrollment'),
    Subject: require('./models/Subject'),
    Homework: require('./models/Homework'),
    HomeworkSubmission: require('./models/HomeworkSubmission'),
    Notice: require('./models/Notice'),
    Exam: require('./models/Exam'),
    MarkEntry: require('./models/MarkEntry'),
    Hostel: require('./models/Hostel'),
    Book: require('./models/Book'),
    Invoice: require('./models/Invoice'),
    Payment: require('./models/Payment'),
    TeacherAttendance: require('./models/TeacherAttendance'),
    StudentAttendance: require('./models/StudentAttendance'),
    HifzDailyProgress: require('./models/HifzDailyProgress'),
  };

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  try {
    for (const [name, model] of Object.entries(models)) {
      const records = backupData[name];
      const tableName = model.getTableName();

      // Clear existing data
      await sequelize.query(`DELETE FROM \`${tableName}\``);

      if (!records || records.length === 0) {
        console.log(`⏭️  ${name}: কোনো ডেটা নেই`);
        continue;
      }

      // Filter only valid columns
      const validColumns = Object.keys(model.rawAttributes);
      const cleanRecords = records.map(record => {
        const clean = {};
        validColumns.forEach(col => {
          if (record[col] !== undefined) clean[col] = record[col];
        });
        return clean;
      });

      try {
        await model.bulkCreate(cleanRecords, { ignoreDuplicates: true, hooks: false });
        console.log(`✅ ${name}: ${cleanRecords.length} রেকর্ড import হয়েছে`);
      } catch (err) {
        console.error(`❌ ${name} error: ${err.message}`);
      }
    }
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  console.log('\n🎉 Import সম্পন্ন!');
}

importBackup().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
}).finally(() => process.exit(0));
