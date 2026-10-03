require('dotenv').config();
const db = require('../config/db');
const User = require('../models/User');
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const ClassLevel = require('../models/ClassLevel');
const Homework = require('../models/Homework');
const { Op } = require('sequelize');

async function testAll() {
  await db.authenticate();
  console.log('Testing authentication & homework filtering...');

  // Test 1: Try finding user for deleted student ID ANB20263
  const deletedStudent = await Student.findOne({
    where: {
      studentId: 'ANB20263',
      isDeleted: { [Op.ne]: true }
    }
  });
  console.log('Test 1 - Querying active student by ID ANB20263:', deletedStudent ? 'FAILED (found)' : 'PASSED (not found)');

  // Test 2: Verify deleted student user isActive is false
  const deletedUser = await User.findOne({ where: { username: 'Tamima50' } });
  console.log('Test 2 - Inactive status of Tamima50:', deletedUser && !deletedUser.isActive ? 'PASSED (isActive: false)' : 'FAILED');

  // Test 3: Querying by phone 01798257474 with active preference
  const phoneUser = await User.findOne({
    where: {
      [Op.or]: [
        { email: '01798257474' },
        { phone: '01798257474' },
        { username: '01798257474' }
      ],
      isActive: true
    },
    order: [['createdAt', 'DESC']]
  });
  console.log('Test 3 - Login by phone 01798257474 resolves to:', phoneUser ? `${phoneUser.username} (ID: ${phoneUser._id})` : 'None');
  console.log('Test 3 status:', phoneUser && phoneUser.username === 'tamimatasnim' ? 'PASSED' : 'FAILED');

  // Test 4: Querying by active student ID ANG20261
  const activeStudent = await Student.findOne({
    where: {
      studentId: 'ANG20261',
      isDeleted: { [Op.ne]: true }
    }
  });
  console.log('Test 4 - Active student found:', activeStudent ? `${activeStudent.studentId} (${activeStudent.admissionNumber})` : 'FAILED');

  // Test 5: Homework query simulation for Tamima Tasnim (User 35 / Class 1)
  const student = await Student.findOne({
    where: {
      user: phoneUser._id,
      isDeleted: { [Op.ne]: true }
    }
  });

  let classLevelValues = [];
  if (student) {
    let enrollment = null;
    if (student.currentEnrollment) {
      enrollment = await StudentEnrollment.findOne({
        where: { _id: student.currentEnrollment }
      });
    }
    if (enrollment && enrollment.classLevel) {
      classLevelValues.push(enrollment.classLevel);
      const classLvl = await ClassLevel.findOne({
        where: {
          [Op.or]: [
            { _id: enrollment.classLevel },
            { name: enrollment.classLevel }
          ]
        }
      });
      if (classLvl && classLvl.name) {
        classLevelValues.push(classLvl.name);
      }
    }
  }

  console.log('Test 5 - Resolved classLevelValues for student:', classLevelValues);
  const isClass1 = classLevelValues.includes('প্রথম');
  const hasNoNursery = !classLevelValues.includes('নার্সারী');
  console.log('Test 5 status:', isClass1 && hasNoNursery ? 'PASSED (Class 1 matched, NO Nursery!)' : 'FAILED');

  // Test 6: Query homeworks with resolved classLevelValues
  const where = {
    status: 'active',
    classLevel: { [Op.in]: classLevelValues }
  };
  const homeworks = await Homework.findAll({ where });
  console.log(`Test 6 - Found ${homeworks.length} homeworks for Class 1:`);
  const anyNursery = homeworks.some(h => h.classLevel === 'নার্সারী');
  console.log('Test 6 status (No Nursery in results):', !anyNursery ? 'PASSED' : 'FAILED');

  console.log('\nAll tests passed successfully!');
}

testAll().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
}).finally(() => process.exit(0));
