const mongoose = require('mongoose');
const User = require('./models/User');

const run = async () => {
  await mongoose.connect('mongodb://localhost:27017/madrasah_management');
  console.log('Connected to DB');

  const testUser = await User.findOne({ username: 'principal' });
  if (testUser) {
    console.log('Original adminRole:', testUser.adminRole);
    testUser.adminRole = 'admin';
    await testUser.save();
    
    const reFetched = await User.findOne({ username: 'principal' });
    console.log('Re-fetched adminRole:', reFetched.adminRole);
  } else {
    console.log('User principal not found');
  }

  await mongoose.disconnect();
};

run().catch(console.error);
