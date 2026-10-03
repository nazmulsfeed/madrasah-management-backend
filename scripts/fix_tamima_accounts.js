require('dotenv').config();
const db = require('../config/db');
const User = require('../models/User');
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const ClassLevel = require('../models/ClassLevel');
const { Op } = require('sequelize');

async function fixAccounts() {
  await db.authenticate();
  console.log('Connected to MySQL.');

  // 1. Deactivate users of ALL deleted students across the database
  const deletedStudents = await Student.findAll({
    where: { isDeleted: true }
  });
  console.log(`Found ${deletedStudents.length} deleted students.`);
  for (const s of deletedStudents) {
    if (s.user) {
      await User.update({ isActive: false }, { where: { _id: s.user } });
      console.log(`Deactivated user ${s.user} for deleted student ${s.studentId || s.admissionNumber}`);
    }
  }

  // 2. Specific fix for Tamima Tasnim's accounts (phone: 01798257474)
  const phone = '01798257474';
  const matchingUsers = await User.findAll({
    where: { phone }
  });
  console.log(`Found ${matchingUsers.length} users with phone ${phone}:`);
  for (const u of matchingUsers) {
    const student = await Student.findOne({ where: { user: u._id } });
    console.log(`- User _id: ${u._id}, username: ${u.username}, isActive: ${u.isActive}, linkedStudent: ${student ? student.studentId : 'NONE'}`);
  }

  // For User 35 (linked to active student ANG20261)
  const activeStudent = await Student.findOne({
    where: { studentId: 'ANG20261', isDeleted: { [Op.ne]: true } }
  });

  if (activeStudent) {
    const activeUser = await User.findOne({ where: { _id: activeStudent.user } });
    if (activeUser) {
      console.log(`Active student ANG20261 user: ${activeUser.username}`);
      if (activeUser.username === 'ANB20264') {
        let newUsername = 'tamimatasnim';
        const existing = await User.findOne({ where: { username: newUsername, _id: { [Op.ne]: activeUser._id } } });
        if (existing) {
          newUsername = 'tamimatasnim26';
        }
        activeUser.username = newUsername;
        activeUser.isActive = true;
        await activeUser.save();
        console.log(`✅ Updated active student's username from ANB20264 to: ${newUsername}`);
      }
    }
  }

  // 3. Deactivate any orphaned student users with phone 01798257474 who have no active student
  for (const u of matchingUsers) {
    if (activeStudent && u._id === activeStudent.user) continue;
    u.isActive = false;
    await u.save();
    console.log(`✅ Deactivated old/duplicate user ${u._id} (${u.username}) with phone ${phone}`);
  }

  // 4. Verify homework class resolution for Tamima Tasnim
  if (activeStudent) {
    const enr = await StudentEnrollment.findOne({ where: { _id: activeStudent.currentEnrollment } });
    if (enr) {
      const cls = await ClassLevel.findOne({ where: { _id: enr.classLevel } });
      console.log(`✅ Verification: Student ${activeStudent.studentId} (${activeStudent.admissionNumber}) is enrolled in Class: "${cls ? cls.name : 'Unknown'}" (Section ${enr.section})`);
    }
  }

  console.log('\n🎉 Cleanup script completed successfully!');
}

fixAccounts().catch(e => {
  console.error('Error running fix:', e);
  process.exit(1);
}).finally(() => process.exit(0));
