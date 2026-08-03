require('dotenv').config();
const db = require('./config/db');
const http = require('http');

db.connectDB().then(async () => {
  // First get backup
  const Institution = require('./models/Institution');
  const User = require('./models/User');
  
  const insts = await Institution.findAll({ raw: true });
  const users = await User.findAll({ raw: true });
  
  const backupData = {
    Institution: insts,
    Branch: [],
    AcademicYear: [],
    ClassLevel: [],
    Section: [],
    User: users,
    Teacher: [],
    Student: [],
    Guardian: [],
    StudentEnrollment: [],
    Subject: [],
    Homework: [],
    HomeworkSubmission: [],
    Notice: [],
    Exam: [],
    MarkEntry: [],
    Hostel: [],
    Book: [],
    Invoice: [],
    Payment: [],
    TeacherAttendance: [],
    StudentAttendance: [],
    HifzDailyProgress: []
  };
  
  console.log('Institution count:', insts.length);
  console.log('User count:', users.length);
  console.log('First user keys:', users[0] ? Object.keys(users[0]).join(', ') : 'none');
  
  // Now test restore via HTTP
  // First login
  const loginData = JSON.stringify({ email: 'admin', password: 'admin123' });
  const loginOpts = {
    hostname: '127.0.0.1', port: 5000,
    path: '/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
  };
  
  const lr = http.request(loginOpts, (r) => {
    let b = ''; r.on('data', c => b += c);
    r.on('end', async () => {
      const parsed = JSON.parse(b);
      if (!parsed.success) { console.error('Login failed:', parsed.message); process.exit(1); }
      const token = parsed.data.token;
      
      // Test restore
      const restoreBody = JSON.stringify(backupData);
      const restoreOpts = {
        hostname: '127.0.0.1', port: 5000,
        path: '/api/v1/users/db/restore', method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(restoreBody),
          'Authorization': 'Bearer ' + token
        }
      };
      
      const rr = http.request(restoreOpts, (r2) => {
        let b2 = ''; r2.on('data', c => b2 += c);
        r2.on('end', () => {
          console.log('Restore response status:', r2.statusCode);
          const resp = JSON.parse(b2);
          console.log('Restore success:', resp.success);
          console.log('Restore message:', resp.message);
          if (!resp.success) {
            console.log('Full response:', JSON.stringify(resp, null, 2));
          }
          process.exit(0);
        });
      });
      rr.on('error', e => { console.error('Restore request error:', e.message); process.exit(1); });
      rr.write(restoreBody);
      rr.end();
    });
  });
  lr.on('error', e => { console.error('Login error:', e.message); process.exit(1); });
  lr.write(loginData);
  lr.end();
});
