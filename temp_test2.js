require('dotenv').config();
const mongoose = require('mongoose');

require('./models/Institution');
require('./models/Branch');
require('./models/AcademicYear');
require('./models/ClassLevel');
require('./models/Section');
require('./models/User');
const Student = require('./models/Student');
require('./models/StudentEnrollment');
const Teacher = require('./models/Teacher');
require('./models/Guardian');
require('./models/Subject');
const StudentAttendance = require('./models/StudentAttendance');
require('./models/Homework');
require('./models/HomeworkSubmission');
require('./models/RolePermission');

const Exam = require('./models/Exam');
const MarkEntry = require('./models/MarkEntry');
require('./models/HifzDailyProgress');

const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Use ACTUAL institution ID from debug log
  const institutionId = new mongoose.Types.ObjectId('6a360adfa2848e1320bd658b');
  const instFilter = { institution: institutionId };

  try {
    console.log("1. totalStudents with institution filter...");
    const totalStudents = await Student.countDocuments({ ...instFilter, isDeleted: { $ne: true } });
    console.log("totalStudents:", totalStudents);

    console.log("2. femaleStudents...");
    const femaleStudents = await Student.countDocuments({ ...instFilter, gender: 'female', isDeleted: { $ne: true } });
    console.log("femaleStudents:", femaleStudents);

    console.log("3. studentsByClass aggregate with institution filter...");
    const studentsByClass = await Student.aggregate([
      { $match: { ...instFilter, isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: 'studentenrollments',
          localField: 'currentEnrollment',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: { path: '$enrollment', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'classlevels',
          localField: 'enrollment.classLevel',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { classId: '$classInfo._id', className: '$classInfo.name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.className': 1 } }
    ]);
    console.log("studentsByClass:", studentsByClass.length, "results");

    console.log("4. totalTeachers...");
    const totalTeachers = await Teacher.countDocuments(instFilter);
    console.log("totalTeachers:", totalTeachers);

    console.log("5. todayAttendance...");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayAttendanceRecords = await StudentAttendance.find({
      date: { $gte: today, $lt: tomorrow }
    });
    console.log("todayAttendance:", todayAttendanceRecords.length);

    console.log("6. monthAttendance...");
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthAttendance = await StudentAttendance.aggregate([
      { $match: { date: { $gte: monthStart, $lt: tomorrow } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
        }
      }
    ]);
    console.log("monthAttendance:", monthAttendance);

    console.log("7. totalExams...");
    const totalExams = await Exam.countDocuments(instFilter);
    console.log("totalExams:", totalExams);

    console.log("8. gradeDistribution...");
    const gradeDistribution = await MarkEntry.aggregate([
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          avgMarks: { $avg: '$marksObtained' },
          passCount: { $sum: { $cond: [{ $gte: ['$marksObtained', 33] }, 1, 0] } },
          failCount: { $sum: { $cond: [{ $lt: ['$marksObtained', 33] }, 1, 0] } },
          aPlus: { $sum: { $cond: [{ $gte: ['$marksObtained', 80] }, 1, 0] } },
          a: { $sum: { $cond: [{ $and: [{ $gte: ['$marksObtained', 70] }, { $lt: ['$marksObtained', 80] }] }, 1, 0] } },
        }
      }
    ]);
    console.log("gradeDistribution:", gradeDistribution);

    console.log("9. recentExams with populate...");
    const recentExams = await Exam.find(instFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('classLevel', 'name');
    console.log("recentExams:", recentExams.length);
    
    console.log("10. finance...");
    const totalInvoiced = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalPaid = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log("finance:", totalInvoiced, totalPaid);
    
    console.log("11. Building response object...");
    const response = {
      students: {
        total: totalStudents,
        active: 10,
        inactive: 0,
        male: 0,
        female: femaleStudents,
        byClass: studentsByClass.map(s => ({
          className: s._id.className || 'অজানা',
          count: s.count
        }))
      },
      teachers: { total: totalTeachers, active: 1, regular: 1, hifz: 0 },
      attendance: {
        today: { total: 0, present: 0, absent: 0, late: 0, rate: 0 },
        thisMonth: { total: 0, present: 0, absent: 0, late: 0, rate: 0 }
      },
      exams: {
        total: totalExams,
        upcoming: 0, ongoing: 0, completed: 0,
        gradeDistribution: { totalEntries: 0, avgMarks: 0, passCount: 0, failCount: 0, aPlus: 0, a: 0, aMinus: 0, b: 0, c: 0, d: 0 },
        recent: recentExams
      },
      finance: { invoiced: 0, paid: 0, outstanding: 0, collectionRate: 0 },
      generatedAt: new Date()
    };
    
    console.log("12. JSON.stringify test...");
    const jsonStr = JSON.stringify(response);
    console.log("JSON length:", jsonStr.length, "SERIALIZATION SUCCESS");
    
  } catch (err) {
    console.error("ERROR EXECUTING QUERY:", err);
    console.error("Stack:", err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("Done");
  }
}

test();
