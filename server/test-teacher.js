async function run() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@madrasah.com',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    
    const res = await fetch('http://localhost:5000/api/v1/teachers', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        firstName: 'শাইখ',
        lastName: 'আহমদ',
        email: 'ahmad' + Date.now() + '@madrasah.com',
        phone: '01711223344',
        teacherId: 'TCH-' + Date.now(),
        designation: 'প্রধান শিক্ষক',
        teacherType: 'regular'
      })
    });
    
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
run();
