const mongoose = require('mongoose');
const Section = require('./models/Section');
const ClassLevel = require('./models/ClassLevel');

const run = async () => {
  await mongoose.connect('mongodb://localhost:27017/madrasah_management');

  const filter = {
    institution: '6a360adfa2848e1320bd658b',
    classLevel: '6a360adfa2848e1320bd6598'
  };

  const sections = await Section.find(filter).populate('classLevel', 'name');
  console.log('Query filter:', filter);
  console.log('Found sections count:', sections.length);
  sections.forEach(s => {
    console.log(`Section: ${s.name} (${s._id}) - ClassLevel populated name: ${s.classLevel?.name}`);
  });

  await mongoose.disconnect();
};

run();
