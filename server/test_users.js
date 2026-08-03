const { connectDB } = require('./config/db');
const User = require('./models/User');

const run = async () => {
  await connectDB();
  const users = await User.findAll({});
  console.log('Migrated Users Count:', users.length);
  users.forEach(u => {
    console.log(`Username: ${u.username} - Email: ${u.email} - UserType: ${u.userType} - IsActive: ${u.isActive}`);
  });
  process.exit(0);
};

run();