const mongoose = require('mongoose');
const { connectDB } = require('./config/db');

// Import all Sequelize models
const User = require('./models/User');
const RolePermission = require('./models/RolePermission');
const Institution = require('./models/Institution');
const Branch = require('./models/Branch');
const AcademicYear = require('./models/AcademicYear');
const ClassLevel = require('./models/ClassLevel');
const Section = require('./models/Section');
const Student = require('./models/Student');
const StudentEnrollment = require('./models/StudentEnrollment');
const Teacher = require('./models/Teacher');
const Guardian = require('./models/Guardian');
const Subject = require('./models/Subject');
const StudentAttendance = require('./models/StudentAttendance');
const Homework = require('./models/Homework');
const HomeworkSubmission = require('./models/HomeworkSubmission');
const Exam = require('./models/Exam');
const MarkEntry = require('./models/MarkEntry');
const HifzDailyProgress = require('./models/HifzDailyProgress');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');
const Notice = require('./models/Notice');
const TeacherAttendance = require('./models/TeacherAttendance');
const Book = require('./models/Book');
const Hostel = require('./models/Hostel');

// Mongoose schema definitions (just simple Schemas to fetch data from MongoDB)
const getMongoModel = (name) => {
  if (mongoose.models[name]) return mongoose.models[name];
  return mongoose.model(name, new mongoose.Schema({}, { strict: false, collection: name.toLowerCase() + 's' }));
};

const runMigration = async () => {
  try {
    // 1. Connect to MySQL & MongoDB
    await connectDB();
    await mongoose.connect('mongodb://127.0.0.1:27017/annurisl_madrasah');
    console.log('🔌 Connected to MongoDB and MySQL');

    // Order of migration (dependencies first)
    const migrationQueue = [
      { name: 'Institution', seq: Institution },
      { name: 'Branch', seq: Branch },
      { name: 'AcademicYear', seq: AcademicYear },
      { name: 'ClassLevel', seq: ClassLevel },
      { name: 'Section', seq: Section },
      { name: 'User', seq: User },
      { name: 'Teacher', seq: Teacher },
      { name: 'Guardian', seq: Guardian },
      { name: 'Student', seq: Student },
      { name: 'StudentEnrollment', seq: StudentEnrollment },
      { name: 'Subject', seq: Subject },
      { name: 'StudentAttendance', seq: StudentAttendance },
      { name: 'Homework', seq: Homework },
      { name: 'HomeworkSubmission', seq: HomeworkSubmission },
      { name: 'RolePermission', seq: RolePermission },
      { name: 'Exam', seq: Exam },
      { name: 'MarkEntry', seq: MarkEntry },
      { name: 'HifzDailyProgress', seq: HifzDailyProgress },
      { name: 'Invoice', seq: Invoice },
      { name: 'Payment', seq: Payment },
      { name: 'Notice', seq: Notice },
      { name: 'TeacherAttendance', seq: TeacherAttendance },
      { name: 'Book', seq: Book },
      { name: 'Hostel', seq: Hostel }
    ];

    // Truncate all tables first to avoid unique key conflicts
    console.log('🔄 Truncating existing MySQL tables...');
    for (let i = migrationQueue.length - 1; i >= 0; i--) {
      const item = migrationQueue[i];
      await item.seq.destroy({ where: {}, truncate: false, cascade: true });
      console.log(`  Cleared ${item.name}`);
    }

    // Migrate each collection
    for (const item of migrationQueue) {
      console.log(`📦 Migrating ${item.name}...`);
      const MongoModel = getMongoModel(item.name);
      const docs = await MongoModel.find({}).lean();
      console.log(`  Found ${docs.length} documents in MongoDB.`);

      if (docs.length === 0) continue;

      const recordsToInsert = docs.map(doc => {
        const record = { ...doc };
        
        // Map _id from Object to String
        if (record._id) {
          record._id = record._id.toString();
        }

        // Convert any ObjectId reference properties to string
        Object.keys(record).forEach(key => {
          if (record[key] && record[key].constructor && record[key].constructor.name === 'ObjectId') {
            record[key] = record[key].toString();
          } else if (Array.isArray(record[key])) {
            record[key] = record[key].map(val => {
              if (val && val.constructor && val.constructor.name === 'ObjectId') {
                return val.toString();
              }
              return val;
            });
          }
        });

        // Specific mappings
        if (item.name === 'User' && record.password) {
          // Passwords in MongoDB are already hashed, we should save them raw without triggers hashing them again
        }

        return record;
      });

      // Insert records using bulkCreate (bypass hooks for password hashing since they are already hashed in MongoDB!)
      await item.seq.bulkCreate(recordsToInsert, { hooks: false });
      console.log(`  Successfully inserted ${recordsToInsert.length} records into MySQL.`);
    }

    console.log('🎉 Data migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    process.exit(1);
  }
};

runMigration();