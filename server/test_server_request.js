const http = require('http');

http.get('http://localhost:5000/api/v1/health', (res) => {
  console.log('Status Code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response Body:', data);
  });
}).on('error', (err) => {
  console.error('Error connecting to port 5000:', err.message);
});
