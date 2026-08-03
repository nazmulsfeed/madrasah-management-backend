const mongoose = require('mongoose');
const User = require('./models/User');

const run = async () => {
  await mongoose.connect('mongodb://localhost:27017/madrasah_management');
  
  const users = await User.find({});
  console.log('--- Users ---');
  users.forEach(u => {
    console.log(`Username: ${u.username} - Type: ${u.userType} - Institution: ${u.institution}`);
  });

  await mongoose.disconnect();
};

run();
