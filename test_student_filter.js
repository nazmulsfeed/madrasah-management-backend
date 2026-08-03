const db = require('./config/db');
const StudentEnrollment = require('./models/StudentEnrollment');
const Student = require('./models/Student');

const run = async () => {
  await db.connectDB();
  const classL = await require('./models/ClassLevel').findOne();
  if (!classL) {
    console.log("No class level found");
    process.exit(0);
  }
  
  console.log("Testing filter with classLevel:", classL._id);
  
  const enrollmentFilter = { classLevel: classL._id };
  const enrollments = await StudentEnrollment.find(enrollmentFilter).select('student');
  const studentIds = enrollments.map((e) => e.student);
  
  console.log("Student IDs from enrollments:", studentIds);
  
  const filter = { _id: { $in: studentIds }, isDeleted: { $ne: true } };
  
  try {
    const students = await Student.find(filter)
      .populate('user', 'firstName lastName email phone photo fullName')
      .populate({
        path: 'currentEnrollment',
        select: 'classLevel section academicYear rollNumber enrollmentStatus',
      });
      
    console.log("Found students:", students.length);
  } catch (err) {
    console.error("Error fetching students:", err);
  }
  process.exit(0);
};

run();
