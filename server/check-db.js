const mongoose = require('mongoose');
const ClassLevel = require('./models/ClassLevel');
const Section = require('./models/Section');
const Student = require('./models/Student');
const StudentEnrollment = require('./models/StudentEnrollment');

const run = async () => {
  await mongoose.connect('mongodb://localhost:27017/madrasah_management');
  console.log('Connected to DB');

  const classes = await ClassLevel.find({});
  console.log('--- Class Levels ---');
  classes.forEach(c => {
    console.log(`Class: ${c.name} (${c._id}) - Institution: ${c.institution}`);
  });

  const sections = await Section.find({});
  console.log('--- Sections ---');
  sections.forEach(s => {
    console.log(`Section: ${s.name} (${s._id}) - ClassLevel: ${s.classLevel} - Institution: ${s.institution}`);
  });

  const enrollments = await StudentEnrollment.find({});
  console.log(`--- Enrollments Count: ${enrollments.length} ---`);

  const students = await Student.find({});
  console.log(`--- Students Count: ${students.length} ---`);

  await mongoose.disconnect();
};

run();
