const mongoose = require('mongoose');
const ClassLevel = require('./models/ClassLevel');
const Section = require('./models/Section');
const Branch = require('./models/Branch');
const Institution = require('./models/Institution');
const StudentEnrollment = require('./models/StudentEnrollment');
const Student = require('./models/Student');
const User = require('./models/User');

const run = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/madrasah_management');
    console.log('🔌 Connected to MongoDB');

    // 1. Get or create Institution
    let inst = await Institution.findOne();
    if (!inst) {
      inst = await Institution.create({
        name: 'দারুল উলূম মাদ্রাসা',
        code: 'DUM',
        registrationNumber: 'MAD-2024-001',
        email: 'info@darululoom.edu.bd',
        phone: '০১৭১২-৩৪৫৬৭৮',
        address: '১২৩, মিরপুর রোড, ঢাকা-১২১৬',
      });
      console.log('🏫 Created default Institution');
    }

    // 2. Ensure Branches
    console.log('🏢 Reorganizing Branches...');
    // Delete existing MAIN branch if it exists, or just disable/keep it. Let's make sure বালক & বালিকা exist.
    const branchData = [
      { name: 'বালক শাখা', code: 'BOYS', address: inst.address, phone: inst.phone },
      { name: 'বালিকা শাখা', code: 'GIRLS', address: inst.address, phone: inst.phone }
    ];

    const branches = [];
    for (const b of branchData) {
      let existingBranch = await Branch.findOne({ code: b.code, institution: inst._id });
      if (!existingBranch) {
        existingBranch = await Branch.create({
          institution: inst._id,
          ...b
        });
        console.log(`➕ Created branch: ${b.name}`);
      } else {
        console.log(`✔ Branch already exists: ${b.name}`);
      }
      branches.push(existingBranch);
    }

    // 3. Define new classes
    const classesToCreate = [
      // নুরানি
      { name: 'প্লে (নুরানি)', code: 'PLAY', order: 1, educationStream: 'general' },
      { name: 'নার্সারী (নুরানি)', code: 'NURSERY', order: 2, educationStream: 'general' },
      { name: 'নুরানি ১ম শ্রেণি', code: 'N_C1', order: 3, educationStream: 'general' },
      { name: 'নুরানি ২য় শ্রেণি', code: 'N_C2', order: 4, educationStream: 'general' },
      { name: 'নুরানি ৩য় শ্রেণি', code: 'N_C3', order: 5, educationStream: 'general' },
      // প্রি-হিফজ
      { name: 'প্রি-হিফজ (নাজেরা)', code: 'PRE_HIFZ', order: 6, educationStream: 'hifz' },
      // হিফজ ১ম থেকে ১০ম
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
      // হিফজ শুনানী
      { name: 'হিফজ (শুনানী)', code: 'HIFZ_SHUNANI', order: 17, educationStream: 'hifz' },
      // মুসাবাকাহ
      { name: 'মুসাবাকাহ (প্রতিযোগিতা)', code: 'MUSABAQAH', order: 18, educationStream: 'hifz' },
    ];

    console.log('🗑 Removing old ClassLevels and Sections...');
    await ClassLevel.deleteMany({ institution: inst._id });
    await Section.deleteMany({ institution: inst._id });

    console.log('📚 Creating new ClassLevels and Sections...');
    const classLevels = [];
    const sections = [];

    for (const c of classesToCreate) {
      const cls = await ClassLevel.create({
        ...c,
        institution: inst._id,
        branch: branches[0]._id // default to first branch (Boys) or null
      });
      classLevels.push(cls);
      console.log(`➕ Created class: ${cls.name}`);

      // Create sections 'ক' and 'খ' for each class
      for (const sName of ['ক', 'খ']) {
        const sec = await Section.create({
          institution: inst._id,
          branch: branches[0]._id,
          classLevel: cls._id,
          name: sName,
          capacity: 40
        });
        sections.push(sec);
      }
    }
    console.log(`✔ Created ${classLevels.length} classes and ${sections.length} sections.`);

    // 4. Update existing student enrollments to point to a valid ClassLevel/Section
    const enrollments = await StudentEnrollment.find({ institution: inst._id });
    if (enrollments.length > 0) {
      console.log(`🔄 Re-linking ${enrollments.length} student enrollments to Play class...`);
      const playClass = classLevels.find(c => c.code === 'PLAY');
      const playSection = sections.find(s => s.classLevel.toString() === playClass._id.toString() && s.name === 'ক');

      for (const enrollment of enrollments) {
        enrollment.classLevel = playClass._id;
        enrollment.section = playSection._id;
        enrollment.branch = branches[0]._id; // বালক শাখা
        await enrollment.save();
      }

      // Also update student branches to বালক শাখা (BOYS)
      await Student.updateMany({ institution: inst._id }, { branch: branches[0]._id });
      await User.updateMany({ institution: inst._id, userType: 'student' }, { branch: branches[0]._id });
      console.log('✔ Student enrollments updated successfully.');
    }

    console.log('🎉 Database structure successfully updated!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during update:', error);
    process.exit(1);
  }
};

run();
