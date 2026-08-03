const User = require('../models/User');
const RolePermission = require('../models/RolePermission');
const Institution = require('../models/Institution');
const Branch = require('../models/Branch');
const AcademicYear = require('../models/AcademicYear');
const ClassLevel = require('../models/ClassLevel');
const Section = require('../models/Section');
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');

const defaultRolePermissions = [
  {
    role: 'super_admin',
    permissions: {
      can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
      can_view_attendance: true, can_mark_attendance: true,
      can_view_exams: true, can_manage_exams: true,
      can_view_finance: true, can_manage_finance: true,
      can_view_users: true, can_manage_users: true,
      can_view_notice: true, can_manage_notice: true,
      can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true,
      can_view_reports: true,
      can_manage_hifz: true,
      can_view_students: true,
      can_view_all_attendance: true,
      can_view_all_homework: true,
      can_use_messaging: true,
      can_manage_hostel: true
    }
  },
  {
    role: 'co_super_admin',
    permissions: {
      can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
      can_view_attendance: true, can_mark_attendance: true,
      can_view_exams: true, can_manage_exams: true,
      can_view_finance: true, can_manage_finance: true,
      can_view_users: true, can_manage_users: true,
      can_view_notice: true, can_manage_notice: true,
      can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true,
      can_view_reports: true,
      can_manage_hifz: true,
      can_view_students: true,
      can_view_all_attendance: true,
      can_view_all_homework: true,
      can_use_messaging: true,
      can_manage_hostel: true
    }
  },
  {
    role: 'admin',
    permissions: {
      can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
      can_view_attendance: true, can_mark_attendance: true,
      can_view_exams: true, can_manage_exams: true,
      can_view_finance: true, can_manage_finance: true,
      can_view_users: true, can_manage_users: true,
      can_view_notice: true, can_manage_notice: true,
      can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true,
      can_view_reports: true,
      can_manage_hifz: true,
      can_view_students: true,
      can_view_all_attendance: true,
      can_view_all_homework: true,
      can_use_messaging: true,
      can_manage_hostel: true
    }
  },
  {
    role: 'principal',
    permissions: {
      can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
      can_view_attendance: true, can_mark_attendance: true,
      can_view_exams: true, can_manage_exams: true,
      can_view_finance: true, can_manage_finance: true,
      can_view_users: true, can_manage_users: true,
      can_view_notice: true, can_manage_notice: true,
      can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true,
      can_view_reports: true,
      can_manage_hifz: true,
      can_view_students: true,
      can_view_all_attendance: true,
      can_view_all_homework: true,
      can_use_messaging: true,
      can_manage_hostel: true
    }
  },
  {
    role: 'vice_principal',
    permissions: {
      can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
      can_view_attendance: true, can_mark_attendance: true,
      can_view_exams: true, can_manage_exams: true,
      can_view_finance: true, can_manage_finance: false,
      can_view_users: true, can_manage_users: true,
      can_view_notice: true, can_manage_notice: true,
      can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true,
      can_view_reports: true,
      can_manage_hifz: true,
      can_view_students: true,
      can_view_all_attendance: true,
      can_view_all_homework: true,
      can_use_messaging: true,
      can_manage_hostel: true
    }
  },
  {
    role: 'teacher',
    permissions: {
      can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
      can_view_attendance: true, can_mark_attendance: true,
      can_view_exams: true, can_manage_exams: false,
      can_view_finance: false, can_manage_finance: false,
      can_view_users: false, can_manage_users: false,
      can_view_notice: true, can_manage_notice: false,
      can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true,
      can_view_reports: false,
      can_manage_hifz: false,
      can_view_students: true,
      can_view_all_attendance: true,
      can_view_all_homework: true,
      can_use_messaging: true,
      can_manage_hostel: false
    }
  },
  {
    role: 'hifz_teacher',
    permissions: {
      can_view_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
      can_view_attendance: true, can_mark_attendance: true,
      can_view_exams: true, can_manage_exams: false,
      can_view_finance: false, can_manage_finance: false,
      can_view_users: false, can_manage_users: false,
      can_view_notice: true, can_manage_notice: false,
      can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true,
      can_view_reports: false,
      can_manage_hifz: true,
      can_view_students: true,
      can_view_all_attendance: true,
      can_view_all_homework: true,
      can_use_messaging: true,
      can_manage_hostel: false
    }
  },
  {
    role: 'accountant',
    permissions: {
      can_view_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
      can_view_attendance: true, can_mark_attendance: false,
      can_view_exams: false, can_manage_exams: false,
      can_view_finance: true, can_manage_finance: true,
      can_view_users: true, can_manage_users: false,
      can_view_notice: true, can_manage_notice: false,
      can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false,
      can_view_reports: true,
      can_manage_hifz: false,
      can_view_students: true,
      can_view_all_attendance: false,
      can_view_all_homework: false,
      can_use_messaging: true,
      can_manage_hostel: false
    }
  },
  {
    role: 'admission_officer',
    permissions: {
      can_view_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
      can_view_attendance: true, can_mark_attendance: false,
      can_view_exams: false, can_manage_exams: false,
      can_view_finance: false, can_manage_finance: false,
      can_view_users: true, can_manage_users: true,
      can_view_notice: true, can_manage_notice: false,
      can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false,
      can_view_reports: false,
      can_manage_hifz: false,
      can_view_students: true,
      can_view_all_attendance: false,
      can_view_all_homework: false,
      can_use_messaging: true,
      can_manage_hostel: false
    }
  },
  {
    role: 'hostel_manager',
    permissions: {
      can_view_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
      can_view_attendance: true, can_mark_attendance: false,
      can_view_exams: false, can_manage_exams: false,
      can_view_finance: false, can_manage_finance: false,
      can_view_users: true, can_manage_users: false,
      can_view_notice: true, can_manage_notice: false,
      can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false,
      can_view_reports: false,
      can_manage_hifz: false,
      can_view_students: true,
      can_view_all_attendance: false,
      can_view_all_homework: false,
      can_use_messaging: true,
      can_manage_hostel: true
    }
  },
  {
    role: 'library_manager',
    permissions: {
      can_view_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
      can_view_attendance: true, can_mark_attendance: false,
      can_view_exams: false, can_manage_exams: false,
      can_view_finance: false, can_manage_finance: false,
      can_view_users: true, can_manage_users: false,
      can_view_notice: true, can_manage_notice: false,
      can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false,
      can_view_reports: false,
      can_manage_hifz: false,
      can_view_students: false,
      can_view_all_attendance: false,
      can_view_all_homework: false,
      can_use_messaging: true,
      can_manage_hostel: false
    }
  },
  {
    role: 'student',
    permissions: {
      can_view_homework: true, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
      can_view_attendance: true, can_mark_attendance: false,
      can_view_exams: true, can_manage_exams: false,
      can_view_finance: false, can_manage_finance: false,
      can_view_users: false, can_manage_users: false,
      can_view_notice: true, can_manage_notice: false,
      can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false,
      can_view_reports: false,
      can_manage_hifz: false,
      can_view_students: false,
      can_view_all_attendance: false,
      can_view_all_homework: false,
      can_use_messaging: false,
      can_manage_hostel: false
    }
  },
  {
    role: 'guardian',
    permissions: {
      can_view_homework: true, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
      can_view_attendance: true, can_mark_attendance: false,
      can_view_exams: true, can_manage_exams: false,
      can_view_finance: false, can_manage_finance: false,
      can_view_users: false, can_manage_users: false,
      can_view_notice: true, can_manage_notice: false,
      can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false,
      can_view_reports: false,
      can_manage_hifz: false,
      can_view_students: false,
      can_view_all_attendance: false,
      can_view_all_homework: false,
      can_use_messaging: false,
      can_manage_hostel: false
    }
  }
];

const autoSeed = async () => {
  try {
    // 1. Seed Role Permissions if missing
    const permissionCount = await RolePermission.countDocuments();
    if (permissionCount === 0) {
      console.log('➕ Database initialized: Seeding default role permissions...');
      const defaultRolePermissionsUpdated = defaultRolePermissions.map(item => {
        const role = item.role;
        const isAdmin = ['super_admin', 'co_super_admin', 'admin', 'principal', 'vice_principal'].includes(role);
        
        item.permissions.can_view_library = isAdmin || ['teacher', 'hifz_teacher', 'library_manager', 'student', 'guardian'].includes(role);
        item.permissions.can_view_hostel = isAdmin || ['hostel_manager'].includes(role);
        item.permissions.can_view_settings = isAdmin;
        
        return item;
      });
      await RolePermission.insertMany(defaultRolePermissionsUpdated);
      console.log('✅ Role permissions successfully seeded!');
    }

    // 2. Seed default data if no Users exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('➕ Database initialized: Seeding default users and system structures...');
      
      const fixedSuperAdminId = '652000000000000000000001';
      const fixedInstitutionId = '652000000000000000000002';
      const fixedBoysBranchId = '652000000000000000000003';
      const fixedGirlsBranchId = '652000000000000000000004';

      // Create Institution
      const institution = await Institution.create({
        _id: fixedInstitutionId,
        name: 'দারুল উলূম মাদ্রাসা',
        code: 'DUM',
        registrationNumber: 'MAD-2024-001',
        email: 'info@darululoom.edu.bd',
        phone: '০১৭১২-৩৪৫৬৭৮',
        address: '১২৩, মিরপুর রোড, ঢাকা-১২১৬',
        website: 'https://darululoom.edu.bd',
        establishedDate: new Date('2010-01-15'),
      });

      // Create Branches
      const boysBranch = await Branch.create({
        _id: fixedBoysBranchId,
        institution: institution._id,
        name: 'বালক শাখা',
        code: 'BOYS',
        address: '১২৩, মিরপুর রোড, ঢাকা',
        phone: '০১৭১২-৩৪৫৬৭৮',
        email: 'boys@darululoom.edu.bd',
      });
      await Branch.create({
        _id: fixedGirlsBranchId,
        institution: institution._id,
        name: 'বালিকা শাখা',
        code: 'GIRLS',
        address: '১২৩, মিরপুর রোড, ঢাকা',
        phone: '০১৭১২-৩৪৫৬৭৮',
        email: 'girls@darululoom.edu.bd',
      });

      // Create Super Admin
      await User.create({
        _id: fixedSuperAdminId,
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

      console.log('✅ Clean system structures and Super Admin successfully seeded!');
    }
  } catch (error) {
    console.error('❌ Auto-seeding failed:', error);
  }
};

module.exports = autoSeed;
