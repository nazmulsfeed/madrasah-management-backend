const db = require('./config/db');
const Student = require('./models/Student');

const run = async () => {
  try {
    await db.connectDB();
    const student = await Student.findOne();
    if (!student) {
      console.log('No student found');
      return;
    }
    
    console.log('Found student:', student._id);
    student.isDeleted = true;
    student.deletedAt = new Date();
    await student.save();
    console.log('Student marked as deleted successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
};

run();
