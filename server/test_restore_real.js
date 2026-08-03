require('dotenv').config();
const http = require('http');
const fs = require('fs');

const loginData = JSON.stringify({ email: 'admin', password: 'admin123' });
const loginOpts = {
  hostname: '127.0.0.1', port: 5000,
  path: '/api/v1/auth/login', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
};

const lr = http.request(loginOpts, (r) => {
  let b = ''; r.on('data', c => b += c);
  r.on('end', () => {
    const parsed = JSON.parse(b);
    if (!parsed.success) { console.error('Login failed:', parsed.message); process.exit(1); }
    const token = parsed.data.token;
    
    // Test restore with the real backup file
    const restoreBody = fs.readFileSync('d:/madrasah management system/madrasah_backup.json');
    const restoreOpts = {
      hostname: '127.0.0.1', port: 5000,
      path: '/api/v1/users/db/restore', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': restoreBody.length,
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
      });
    });
    rr.write(restoreBody);
    rr.end();
  });
});
lr.write(loginData);
lr.end();
