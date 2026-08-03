const db = require('./config/db');
const User = require('./models/User');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const run = async () => {
  await db.connectDB();
  
  const email = 'admin'; // Assume username admin
  const password = 'password123'; // whatever the admin password is
  
  const user = await User.findOne({
    where: {
      [Op.or]: [
        { email: email.toLowerCase() },
        { phone: email },
        { username: email }
      ]
    }
  });
  
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  console.log('User found:', user.username);
  
  const isMatch = await user.comparePassword(password);
  console.log('Password match?', isMatch);
  
  process.exit(0);
};

run();