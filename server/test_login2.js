const db = require('./config/db');
const User = require('./models/User');

const run = async () => {
  await db.connectDB();
  const admin = await User.findOne({ where: { username: 'admin' } });
  console.log('Admin password field:', admin.password);
  process.exit(0);
};

run();
