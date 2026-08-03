const http = require('http');

const data = JSON.stringify({
  email: 'admin',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let responseData = '';

  res.on('data', d => {
    responseData += d;
  });

  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', error => {
  console.error('Request Error:', error.message);
});

req.write(data);
req.end();
