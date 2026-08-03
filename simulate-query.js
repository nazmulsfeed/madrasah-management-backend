const mongoose = require('mongoose');
const ClassLevel = require('./models/ClassLevel');
const Section = require('./models/Section');
const Student = require('./models/Student');
const StudentEnrollment = require('./models/StudentEnrollment');

const run = async () => {
  await mongoose.connect('mongodb://localhost:27017/madrasah_management');

  const institutionId = '6a360adfa2848e1320bd658b'; // from our diagnostic logs
  const classLevel = '6a360adfa2848e1320bd6596'; // Class 3
  const sections = '6a360adfa2848e1320bd65af'; // Class 3 Section B (খ) only

  const enrollmentFilter = { institution: institutionId };
  enrollmentFilter.classLevel = classLevel;
  const secIds = sections.split(',').filter(Boolean);
  enrollmentFilter.section = { $in: secIds };
  enrollmentFilter.enrollmentStatus = 'active';

  console.log('Query enrollmentFilter:', enrollmentFilter);
  const enrollments = await StudentEnrollment.find(enrollmentFilter).select('student');
  console.log('Found enrollments:', enrollments);
  const studentIds = enrollments.map((e) => e.student);
  console.log('Student IDs:', studentIds);

  const filter = { institution: institutionId };
  filter._id = { $in: studentIds };

  const students = await Student.find(filter)
    .populate({
      path: 'currentEnrollment',
      populate: [
        { path: 'classLevel', select: 'name code order' },
        { path: 'section', select: 'name' }
      ]
    });

  console.log('Found students count:', students.length);
  students.forEach(s => {
    console.log(`Student ID: ${s.studentId} - Section Name: ${s.currentEnrollment?.section?.name}`);
  });

  await mongoose.disconnect();
};

run();
