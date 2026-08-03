const mongoose = require('mongoose');
const RolePermission = require('./models/RolePermission');

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

const run = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/madrasah_management');
    console.log('🔌 Connected to MongoDB');

    console.log('🗑️ Removing old role permissions...');
    await RolePermission.deleteMany({});

    console.log('➕ Seeding default role permissions...');
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
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during role permissions seeding:', error);
    process.exit(1);
  }
};

run();
