const db = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const run = async () => {
  try {
    await db.connectDB();
    const admin = await User.findOne({ where: { username: 'admin' } });
    if (!admin) {
      console.log('Admin not found');
      return;
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Update directly without triggering hooks (to be safe)
    await User.update({ password: hashedPassword }, { where: { username: 'admin' } });
    console.log('Admin password updated to password123');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
};

run();