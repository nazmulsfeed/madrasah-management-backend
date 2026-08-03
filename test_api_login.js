require('dotenv').config();
const db = require('./config/db');
const authController = require('./controllers/authController');

const run = async () => {
  await db.connectDB();
  
  const req = {
    body: {
      email: 'admin',
      password: 'password123'
    }
  };
  
  const res = {
    status: (code) => {
      console.log('Status set to:', code);
      return res;
    },
    json: (data) => {
      console.log('Response JSON:', data);
    }
  };
  
  const next = (err) => {
    console.error('Error in next():', err);
  };
  
  await authController.login(req, res, next);
  process.exit(0);
};

run();
