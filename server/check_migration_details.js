const { connectDB } = require('./config/db');
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Institution = require('./models/Institution');

const run = async () => {
  await connectDB();
  
  const insts = await Institution.findAll();
  console.log('--- Institutions ---');
  insts.forEach(i => console.log(`Inst ID: ${i._id} - Name: ${i.name}`));

  const users = await User.findAll();
  console.log('
--- Users ---');
  users.forEach(u => {
    console.log(`User ID: ${u._id} - Username: ${u.username} - Inst: ${u.institution} - Branch: ${u.branch}`);
  });

  const teachers = await Teacher.findAll();
  console.log('
--- Teachers ---');
  teachers.forEach(t => {
    console.log(`Teacher ID: ${t._id} - UserRef: ${t.user} - Inst: ${t.institution} - EmpId: ${t.employeeId}`);
  });

  process.exit(0);
};

run();