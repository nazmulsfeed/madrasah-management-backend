require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Institution = require('./models/Institution');
const Branch = require('./models/Branch');
const AcademicYear = require('./models/AcademicYear');
const ClassLevel = require('./models/ClassLevel');
const Section = require('./models/Section');
const Student = require('./models/Student');
const StudentEnrollment = require('./models/StudentEnrollment');

const seed = async () => {
  await connectDB.connectDB();

  // পুরনো ডাটা মুছুন
  await User.deleteMany({});
  await Institution.deleteMany({});
  await Branch.deleteMany({});
  await AcademicYear.deleteMany({});
  await ClassLevel.deleteMany({});
  await Section.deleteMany({});
  await Student.deleteMany({});
  await StudentEnrollment.deleteMany({});

  console.log('🗑️  পুরনো ডাটা মুছে ফেলা হয়েছে');

  // প্রতিষ্ঠান তৈরি
  const institution = await Institution.create({
    name: 'দারুল উলূম মাদ্রাসা',
    code: 'DUM',
    registrationNumber: 'MAD-2024-001',
    email: 'info@darululoom.edu.bd',
    phone: '০১৭১২-৩৪৫६৭৮',
    address: '১২৩, মিরপুর রোড, ঢাকা-১২১৬',
    website: 'https://darululoom.edu.bd',
    establishedDate: new Date('2010-01-15'),
  });
  console.log('🏫 প্রতিষ্ঠান তৈরি হয়েছে');

  // শাখা তৈরি (বালক এবং বালিকা শাখা)
  const boysBranch = await Branch.create({
    institution: institution._id,
    name: 'বালক শাখা',
    code: 'BOYS',
    address: '১২৩, মিরপুর রোড, ঢাকা',
    phone: '০১৭১২-৩৪৫৬৭৮',
    email: 'boys@darululoom.edu.bd',
  });
  const girlsBranch = await Branch.create({
    institution: institution._id,
    name: 'বালিকা শাখা',
    code: 'GIRLS',
    address: '১২৩, মিরপুর রোড, ঢাকা',
    phone: '০১৭১২-৩৪৫৬৭৮',
    email: 'girls@darululoom.edu.bd',
  });
  console.log('🏢 শাখা তৈরি হয়েছে');

  // শিক্ষাবর্ষ তৈরি
  const academicYear = await AcademicYear.create({
    institution: institution._id,
    name: '২০২৬',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isCurrent: true,
  });
  console.log('📅 শিক্ষাবর্ষ তৈরি হয়েছে');

  // শ্রেণি তৈরি
  const classNames = [
    { name: 'প্লে (নুরানি)', code: 'PLAY', order: 1, educationStream: 'general' },
    { name: 'নার্সারী (নুরানি)', code: 'NURSERY', order: 2, educationStream: 'general' },
    { name: 'নুরানি ১ম শ্রেণি', code: 'N_C1', order: 3, educationStream: 'general' },
    { name: 'নুরানি ২য় শ্রেণি', code: 'N_C2', order: 4, educationStream: 'general' },
    { name: 'নুরানি ৩য় শ্রেণি', code: 'N_C3', order: 5, educationStream: 'general' },
    { name: 'প্রি-হিফজ (নাজেরা)', code: 'PRE_HIFZ', order: 6, educationStream: 'hifz' },
    { name: 'হিফজ ১ম শ্রেণি', code: 'H_C1', order: 7, educationStream: 'hifz' },
    { name: 'হিফজ ২য় শ্রেণি', code: 'H_C2', order: 8, educationStream: 'hifz' },
    { name: 'হিফজ ৩য় শ্রেণি', code: 'H_C3', order: 9, educationStream: 'hifz' },
    { name: 'হিফজ ৪র্থ শ্রেণি', code: 'H_C4', order: 10, educationStream: 'hifz' },
    { name: 'হিফজ ৫ম শ্রেণি', code: 'H_C5', order: 11, educationStream: 'hifz' },
    { name: 'হিফজ ৬ষ্ঠ শ্রেণি', code: 'H_C6', order: 12, educationStream: 'hifz' },
    { name: 'হিফজ ৭ম শ্রেণি', code: 'H_C7', order: 13, educationStream: 'hifz' },
    { name: 'হিফজ ৮ম শ্রেণি', code: 'H_C8', order: 14, educationStream: 'hifz' },
    { name: 'হিফজ ৯ম শ্রেণি', code: 'H_C9', order: 15, educationStream: 'hifz' },
    { name: 'হিফজ ১০ম শ্রেণি', code: 'H_C10', order: 16, educationStream: 'hifz' },
    { name: 'হিফজ (শুনানী)', code: 'HIFZ_SHUNANI', order: 17, educationStream: 'hifz' },
    { name: 'মুসাবাকাহ (প্রতিযোগিতা)', code: 'MUSABAQAH', order: 18, educationStream: 'hifz' },
  ];

  const classes = await ClassLevel.insertMany(
    classNames.map((c) => ({
      ...c,
      institution: institution._id,
      branch: boysBranch._id, // default reference branch
    }))
  );
  console.log('📚 শ্রেণি তৈরি হয়েছে');

  // সেকশন তৈরি
  const sectionNames = ['ক', 'খ'];
  const sections = [];
  for (const cls of classes) {
    // বালক শাখার সেকশন
    for (const sName of sectionNames) {
      const secBoys = await Section.create({
        institution: institution._id,
        branch: boysBranch._id,
        classLevel: cls._id,
        name: `${sName} (বালক)`,
        capacity: 40,
      });
      sections.push(secBoys);
    }

    // বালিকা শাখার সেকশন
    for (const sName of sectionNames) {
      const secGirls = await Section.create({
        institution: institution._id,
        branch: girlsBranch._id,
        classLevel: cls._id,
        name: `${sName} (বালিকা)`,
        capacity: 40,
      });
      sections.push(secGirls);
    }
  }
  console.log('📋 সেকশন তৈরি হয়েছে');

  // সুপার অ্যাডমিন তৈরি
  const superAdmin = await User.create({
    username: 'admin',
    email: 'admin@madrasah.com',
    password: 'admin123',
    firstName: 'মোহাম্মদ',
    lastName: 'আলী',
    phone: '০১৭০০-০০০০০০',
    userType: 'super_admin',
    institution: institution._id,
    branch: boysBranch._id,
  });
  console.log('👤 সুপার অ্যাডমিন তৈরি হয়েছে: admin@madrasah.com / admin123');

  // প্রিন্সিপাল তৈরি
  await User.create({
    username: 'principal',
    email: 'principal@madrasah.com',
    password: 'admin123',
    firstName: 'আবদুল',
    lastName: 'করিম',
    phone: '০১৭০০-১১১১১১',
    userType: 'principal',
    institution: institution._id,
    branch: boysBranch._id,
  });
  console.log('👤 প্রিন্সিপাল তৈরি হয়েছে');

  // শিক্ষক তৈরি
  await User.create({
    username: 'teacher1',
    email: 'teacher1@madrasah.com',
    password: 'admin123',
    firstName: 'আবু',
    lastName: 'বকর',
    phone: '০১৭০০-২২২২২২',
    userType: 'teacher',
    institution: institution._id,
    branch: boysBranch._id,
  });
  console.log('👤 শিক্ষক তৈরি হয়েছে');

  // ডেমো ছাত্র/ছাত্রী তৈরি
  const studentNames = [
    { firstName: 'আহমাদ', lastName: 'হাসান', gender: 'পুরুষ' },
    { firstName: 'ফাতিমা', lastName: 'আক্তার', gender: 'মহিলা' },
    { firstName: 'ইব্রাহীম', lastName: 'খলিল', gender: 'পুরুষ' },
    { firstName: 'আয়েশা', lastName: 'সিদ্দিকা', gender: 'মহিলা' },
    { firstName: 'ওমর', lastName: 'ফারুক', gender: 'পুরুষ' },
    { firstName: 'খাদিজা', lastName: 'বেগম', gender: 'মহিলা' },
    { firstName: 'আলী', lastName: 'আহমেদ', gender: 'পুরুষ' },
    { firstName: 'মারিয়াম', lastName: 'জাহান', gender: 'মহিলা' },
    { firstName: 'হাসান', lastName: 'মাহমুদ', gender: 'পুরুষ' },
    { firstName: 'সুমাইয়া', lastName: 'ইসলাম', gender: 'মহিলা' },
    { firstName: 'ইউসুফ', lastName: 'আলম', gender: 'পুরুষ' },
    { firstName: 'রুকাইয়া', lastName: 'পারভীন', gender: 'মহিলা' },
    { firstName: 'আবদুল্লাহ', lastName: 'রহমান', gender: 'পুরুষ' },
    { firstName: 'হাফসা', lastName: 'নাহার', gender: 'মহিলা' },
    { firstName: 'জায়েদ', lastName: 'হোসেন', gender: 'পুরুষ' },
  ];

  for (let i = 0; i < studentNames.length; i++) {
    const s = studentNames[i];
    const classIdx = i % classes.length;
    const isMale = s.gender === 'পুরুষ';
    const activeBranch = isMale ? boysBranch : girlsBranch;
    const branchLabel = isMale ? 'বালক' : 'বালিকা';

    // find matching section for this class and branch
    const secForStudent = sections.find(
      (sec) =>
        sec.classLevel.toString() === classes[classIdx]._id.toString() &&
        sec.branch.toString() === activeBranch._id.toString() &&
        sec.name === (i % 2 === 0 ? `ক (${branchLabel})` : `খ (${branchLabel})`)
    );

    const user = await User.create({
      username: `student${i + 1}`,
      email: `student${i + 1}@madrasah.com`,
      password: 'student123',
      firstName: s.firstName,
      lastName: s.lastName,
      userType: 'student',
      institution: institution._id,
      branch: activeBranch._id,
    });

    const residentialOptions = ['residential', 'non-residential', 'day-care'];
    const selectedResStatus = residentialOptions[i % 3];

    const student = await Student.create({
      user: user._id,
      institution: institution._id,
      branch: activeBranch._id,
      admissionNumber: `ADM-2026-${String(i + 1).padStart(4, '0')}`,
      studentId: `STU-${String(i + 1).padStart(5, '0')}`,
      dateOfBirth: new Date(2012 + (i % 6), i % 12, (i % 28) + 1),
      gender: s.gender,
      residentialStatus: selectedResStatus,
      bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-'][i % 6],
      admissionDate: new Date('2026-01-15'),
      createdBy: superAdmin._id,
    });

    const enrollment = await StudentEnrollment.create({
      student: student._id,
      institution: institution._id,
      branch: activeBranch._id,
      academicYear: academicYear._id,
      classLevel: classes[classIdx]._id,
      section: secForStudent._id,
      rollNumber: String(Math.floor(i / classes.length) + 1),
      startDate: new Date('2026-01-15'),
      createdBy: superAdmin._id,
    });

    student.currentEnrollment = enrollment._id;
    await student.save();
  }
  console.log(`🎓 ${studentNames.length} জন ছাত্র/ছাত্রী তৈরি হয়েছে`);

  console.log('\n✅ সিড সম্পন্ন!');
  console.log('📧 অ্যাডমিন লগ ইন: admin@madrasah.com / admin123');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ সিড ব্যর্থ:', err);
  process.exit(1);
});
