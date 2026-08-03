const mongoose = require('mongoose');
const ClassLevel = require('./models/ClassLevel');
const Section = require('./models/Section');
const Student = require('./models/Student');
const StudentEnrollment = require('./models/StudentEnrollment');

const run = async () => {
  await mongoose.connect('mongodb://localhost:27017/madrasah_management');
  
  const enrollments = await StudentEnrollment.find({ classLevel: '6a360adfa2848e1320bd6596' })
    .populate('student')
    .populate('section');
    
  console.log('--- Enrollments for Class 3 ---');
  enrollments.forEach(e => {
    console.log(`Student: ${e.student?.studentId} - Name: ${e.student?.fullName || ''} - Section: ${e.section?.name} (${e.section?._id}) - Status: ${e.enrollmentStatus}`);
  });

  const students = await Student.find({}).populate('currentEnrollment');
  console.log('--- Students currentEnrollment ---');
  students.forEach(s => {
    if (s.currentEnrollment) {
      console.log(`Student: ${s.studentId} - Current Enrollment ID: ${s.currentEnrollment._id} - Class: ${s.currentEnrollment.classLevel} - Section: ${s.currentEnrollment.section}`);
    }
  });

  await mongoose.disconnect();
};

run();
