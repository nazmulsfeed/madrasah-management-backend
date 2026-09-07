const permissionCategories = [
  {
    category: 'Student Management',
    permissions: [
      { key: 'student.view', label: 'View Students' },
      { key: 'student.create', label: 'Create Student' },
      { key: 'student.update', label: 'Update Student' },
      { key: 'student.delete', label: 'Delete Student' },
      { key: 'student.restore', label: 'Restore Student' },
      { key: 'student.approve', label: 'Approve Student' },
      { key: 'student.export', label: 'Export Students' },
      { key: 'student.import', label: 'Import Students' },
      { key: 'student.transfer', label: 'Transfer Student' },
      { key: 'student.promote', label: 'Promote Student' },
      { key: 'student.archive', label: 'Archive Student' },
      { key: 'student.documents.view', label: 'View Student Documents' },
      { key: 'student.documents.manage', label: 'Manage Student Documents' }
    ]
  },
  {
    category: 'Teacher Management',
    permissions: [
      { key: 'teacher.view', label: 'View Teachers' },
      { key: 'teacher.create', label: 'Create Teacher' },
      { key: 'teacher.update', label: 'Update Teacher' },
      { key: 'teacher.delete', label: 'Delete Teacher' },
      { key: 'teacher.assign_class', label: 'Assign Class to Teacher' },
      { key: 'teacher.assign_subject', label: 'Assign Subject to Teacher' },
      { key: 'teacher.promote', label: 'Promote Teacher' },
      { key: 'teacher.demote', label: 'Demote Teacher' },
      { key: 'teacher.export', label: 'Export Teachers' },
      { key: 'teacher.documents.view', label: 'View Teacher Documents' },
      { key: 'teacher.documents.manage', label: 'Manage Teacher Documents' }
    ]
  },
  {
    category: 'Admission',
    permissions: [
      { key: 'admission.view', label: 'View Admissions' },
      { key: 'admission.create', label: 'Create Admission' },
      { key: 'admission.update', label: 'Update Admission' },
      { key: 'admission.delete', label: 'Delete Admission' },
      { key: 'admission.approve', label: 'Approve Admission' },
      { key: 'admission.reject', label: 'Reject Admission' },
      { key: 'admission.export', label: 'Export Admissions' },
      { key: 'admission.manage_documents', label: 'Manage Admission Documents' }
    ]
  },
  {
    category: 'Attendance',
    permissions: [
      { key: 'attendance.view', label: 'View Attendance' },
      { key: 'attendance.create', label: 'Mark/Create Attendance' },
      { key: 'attendance.update', label: 'Update Attendance' },
      { key: 'attendance.delete', label: 'Delete Attendance' },
      { key: 'attendance.approve', label: 'Approve Attendance' },
      { key: 'attendance.export', label: 'Export Attendance' },
      { key: 'attendance.report', label: 'View Attendance Reports' }
    ]
  },
  {
    category: 'Academic & Class',
    permissions: [
      { key: 'class.view', label: 'View Classes' },
      { key: 'class.create', label: 'Create Class' },
      { key: 'class.update', label: 'Update Class' },
      { key: 'class.delete', label: 'Delete Class' },
      { key: 'subject.view', label: 'View Subjects' },
      { key: 'subject.create', label: 'Create Subject' },
      { key: 'subject.update', label: 'Update Subject' },
      { key: 'subject.delete', label: 'Delete Subject' },
      { key: 'class.assign_teacher', label: 'Assign Teacher to Class' },
      { key: 'class.assign_student', label: 'Assign Student to Class' },
      { key: 'routine.view', label: 'View Class Routine' },
      { key: 'routine.create', label: 'Create Routine' },
      { key: 'routine.update', label: 'Update Routine' },
      { key: 'routine.delete', label: 'Delete Routine' }
    ]
  },
  {
    category: 'Fee Management',
    permissions: [
      { key: 'fee.view', label: 'View Fees' },
      { key: 'fee.create', label: 'Create Fee Type' },
      { key: 'fee.update', label: 'Update Fee Type' },
      { key: 'fee.delete', label: 'Delete Fee Type' },
      { key: 'fee.assign', label: 'Assign Fees' },
      { key: 'fee.approve', label: 'Approve Fees' },
      { key: 'fee.export', label: 'Export Fees' },
      { key: 'fee.report', label: 'Fee Reports' }
    ]
  },
  {
    category: 'Student Fee / Assignment',
    permissions: [
      { key: 'student_fee.view', label: 'View Student Fees' },
      { key: 'student_fee.create', label: 'Assign Fee to Student' },
      { key: 'student_fee.update', label: 'Update Student Fee' },
      { key: 'student_fee.delete', label: 'Delete Student Fee' },
      { key: 'student_fee.adjust', label: 'Adjust Student Fee' },
      { key: 'student_fee.discount', label: 'Apply Discount' },
      { key: 'student_fee.waiver', label: 'Apply Waiver' },
      { key: 'student_fee.export', label: 'Export Student Fees' }
    ]
  },
  {
    category: 'Payment Collection',
    permissions: [
      { key: 'payment.view', label: 'View Payments' },
      { key: 'payment.create', label: 'Create Payment' },
      { key: 'payment.update', label: 'Update Payment' },
      { key: 'payment.delete', label: 'Delete Payment' },
      { key: 'payment.collect', label: 'Collect Payment' },
      { key: 'payment.confirm', label: 'Confirm Payment' },
      { key: 'payment.cancel', label: 'Cancel Payment' },
      { key: 'payment.approve', label: 'Approve Payment' },
      { key: 'payment.export', label: 'Export Payments' },
      { key: 'payment.print_receipt', label: 'Print Receipt' }
    ]
  },
  {
    category: 'Payment Transaction',
    permissions: [
      { key: 'transaction.view', label: 'View Transactions' },
      { key: 'transaction.create', label: 'Create Transaction' },
      { key: 'transaction.update', label: 'Update Transaction' },
      { key: 'transaction.delete', label: 'Delete Transaction' },
      { key: 'transaction.approve', label: 'Approve Transaction' },
      { key: 'transaction.cancel', label: 'Cancel Transaction' },
      { key: 'transaction.reverse', label: 'Reverse Transaction' },
      { key: 'transaction.export', label: 'Export Transactions' },
      { key: 'transaction.report', label: 'Transaction Reports' }
    ]
  },
  {
    category: 'Due Management',
    permissions: [
      { key: 'payment_due.view', label: 'View Dues' },
      { key: 'payment_due.create', label: 'Create Due' },
      { key: 'payment_due.update', label: 'Update Due' },
      { key: 'payment_due.adjust', label: 'Adjust Due' },
      { key: 'payment_due.waive', label: 'Waive Due' },
      { key: 'payment_due.discount', label: 'Discount Due' },
      { key: 'payment_due.collect', label: 'Collect Due' },
      { key: 'payment_due.export', label: 'Export Dues' },
      { key: 'payment_due.report', label: 'Due Reports' }
    ]
  },
  {
    category: 'Discount / Scholarship / Waiver',
    permissions: [
      { key: 'discount.view', label: 'View Discounts' },
      { key: 'discount.create', label: 'Create Discount' },
      { key: 'discount.update', label: 'Update Discount' },
      { key: 'discount.delete', label: 'Delete Discount' },
      { key: 'discount.approve', label: 'Approve Discount' },
      { key: 'scholarship.view', label: 'View Scholarships' },
      { key: 'scholarship.create', label: 'Create Scholarship' },
      { key: 'scholarship.update', label: 'Update Scholarship' },
      { key: 'scholarship.delete', label: 'Delete Scholarship' },
      { key: 'scholarship.approve', label: 'Approve Scholarship' },
      { key: 'waiver.view', label: 'View Waivers' },
      { key: 'waiver.create', label: 'Create Waiver' },
      { key: 'waiver.update', label: 'Update Waiver' },
      { key: 'waiver.delete', label: 'Delete Waiver' },
      { key: 'waiver.approve', label: 'Approve Waiver' }
    ]
  },
  {
    category: 'Refund',
    permissions: [
      { key: 'refund.view', label: 'View Refunds' },
      { key: 'refund.create', label: 'Create Refund' },
      { key: 'refund.request', label: 'Request Refund' },
      { key: 'refund.approve', label: 'Approve Refund' },
      { key: 'refund.reject', label: 'Reject Refund' },
      { key: 'refund.process', label: 'Process Refund' },
      { key: 'refund.cancel', label: 'Cancel Refund' },
      { key: 'refund.export', label: 'Export Refunds' }
    ]
  },
  {
    category: 'Invoice & Receipt',
    permissions: [
      { key: 'invoice.view', label: 'View Invoices' },
      { key: 'invoice.create', label: 'Create Invoice' },
      { key: 'invoice.update', label: 'Update Invoice' },
      { key: 'invoice.delete', label: 'Delete Invoice' },
      { key: 'invoice.cancel', label: 'Cancel Invoice' },
      { key: 'invoice.generate', label: 'Generate Invoice' },
      { key: 'invoice.download', label: 'Download Invoice' },
      { key: 'invoice.print', label: 'Print Invoice' },
      { key: 'invoice.export', label: 'Export Invoices' },
      { key: 'receipt.view', label: 'View Receipts' },
      { key: 'receipt.create', label: 'Create Receipt' },
      { key: 'receipt.update', label: 'Update Receipt' },
      { key: 'receipt.delete', label: 'Delete Receipt' },
      { key: 'receipt.generate', label: 'Generate Receipt' },
      { key: 'receipt.print', label: 'Print Receipt' },
      { key: 'receipt.download', label: 'Download Receipt' },
      { key: 'receipt.reprint', label: 'Reprint Receipt' }
    ]
  },
  {
    category: 'Payment Method & Gateway',
    permissions: [
      { key: 'payment_method.view', label: 'View Payment Methods' },
      { key: 'payment_method.create', label: 'Create Payment Method' },
      { key: 'payment_method.update', label: 'Update Payment Method' },
      { key: 'payment_method.delete', label: 'Delete Payment Method' },
      { key: 'payment_method.activate', label: 'Activate Payment Method' },
      { key: 'payment_method.deactivate', label: 'Deactivate Payment Method' },
      { key: 'gateway.view', label: 'View Gateway Settings' },
      { key: 'gateway.create', label: 'Create Gateway' },
      { key: 'gateway.update', label: 'Update Gateway' },
      { key: 'gateway.delete', label: 'Delete Gateway' },
      { key: 'gateway.configure', label: 'Configure Gateway' },
      { key: 'gateway.activate', label: 'Activate Gateway' },
      { key: 'gateway.deactivate', label: 'Deactivate Gateway' },
      { key: 'gateway.test', label: 'Test Gateway' }
    ]
  },
  {
    category: 'Financial Reports',
    permissions: [
      { key: 'financial_report.view', label: 'View Financial Reports' },
      { key: 'financial_report.generate', label: 'Generate Financial Reports' },
      { key: 'financial_report.export', label: 'Export Financial Reports' },
      { key: 'financial_report.print', label: 'Print Financial Reports' }
    ]
  },
  {
    category: 'Role & User Management',
    permissions: [
      { key: 'role.view', label: 'View Roles' },
      { key: 'role.create', label: 'Create Role' },
      { key: 'role.update', label: 'Update Role' },
      { key: 'role.delete', label: 'Delete Role' },
      { key: 'role.assign', label: 'Assign Roles' },
      { key: 'permission.view', label: 'View Permissions' },
      { key: 'permission.update', label: 'Update Permissions' },
      { key: 'user.view', label: 'View Users' },
      { key: 'user.create', label: 'Create User' },
      { key: 'user.update', label: 'Update User' },
      { key: 'user.delete', label: 'Delete User' },
      { key: 'user.role.update', label: 'Update User Role' }
    ]
  },
  {
    category: 'Other Modules (Legacy/General)',
    permissions: [
      { key: 'notice.view', label: 'View Notices' },
      { key: 'notice.create', label: 'Create Notice' },
      { key: 'notice.update', label: 'Update Notice' },
      { key: 'notice.delete', label: 'Delete Notice' },
      { key: 'homework.view', label: 'View Homework' },
      { key: 'homework.create', label: 'Create Homework' },
      { key: 'homework.update', label: 'Update Homework' },
      { key: 'homework.delete', label: 'Delete Homework' },
      { key: 'homework.view_all', label: 'View All Homework' },
      { key: 'exam.view', label: 'View Exams' },
      { key: 'exam.manage', label: 'Manage Exams' },
      { key: 'exam.grade', label: 'Grade Exams' },
      { key: 'hifz.view', label: 'View Hifz' },
      { key: 'hifz.manage', label: 'Manage Hifz' },
      { key: 'hostel.view', label: 'View Hostel' },
      { key: 'hostel.manage', label: 'Manage Hostel' },
      { key: 'library.view', label: 'View Library' },
      { key: 'library.manage', label: 'Manage Library' },
      { key: 'system.settings.view', label: 'View Settings' },
      { key: 'system.settings.update', label: 'Update Settings' },
      { key: 'messaging.use', label: 'Use Messaging' }
    ]
  }
];

const allPermissionKeys = permissionCategories.flatMap(cat => cat.permissions.map(p => p.key));

// Helper to generate full permissions
const getFullPermissions = () => {
  const perms = {};
  allPermissionKeys.forEach(key => perms[key] = true);
  return perms;
};

// Helper to generate specific permissions
const getPermissionsForKeys = (keys) => {
  const perms = {};
  allPermissionKeys.forEach(key => perms[key] = false);
  keys.forEach(key => {
    if (perms[key] !== undefined) perms[key] = true;
  });
  return perms;
};

const defaultRolePermissions = {
  super_admin: getFullPermissions(),
  co_super_admin: getFullPermissions(),
  admin: getPermissionsForKeys([
    'student.view', 'student.create', 'student.update',
    'teacher.view', 'teacher.create', 'teacher.update',
    'attendance.view', 'attendance.create', 'attendance.update',
    'class.view', 'subject.view', 'routine.view',
    'payment.view', 'payment.collect', 'payment.confirm', 'receipt.generate', 'receipt.print',
    'payment_due.view', 'invoice.view',
    'notice.view', 'notice.create', 'notice.update',
    'homework.view', 'homework.view_all', 'exam.view', 'hifz.view',
    'user.view', 'messaging.use'
  ]),
  principal: getPermissionsForKeys([
    'student.view', 'teacher.view', 'attendance.view', 'class.view', 'subject.view',
    'routine.view', 'payment.view', 'payment_due.view', 'financial_report.view',
    'notice.view', 'notice.create', 'homework.view', 'exam.view', 'hifz.view',
    'user.view', 'messaging.use'
  ]),
  vice_principal: getPermissionsForKeys([
    'student.view', 'teacher.view', 'attendance.view', 'class.view', 'subject.view',
    'routine.view', 'notice.view', 'notice.create', 'homework.view', 'exam.view', 'hifz.view',
    'user.view', 'messaging.use'
  ]),
  teacher: getPermissionsForKeys([
    'student.view', 'attendance.view', 'attendance.create',
    'homework.view', 'homework.create', 'homework.update', 'homework.delete',
    'exam.view', 'exam.grade', 'notice.view', 'messaging.use'
  ]),
  hifz_teacher: getPermissionsForKeys([
    'student.view', 'attendance.view', 'attendance.create',
    'homework.view', 'homework.create', 'hifz.view', 'hifz.manage',
    'notice.view', 'messaging.use'
  ]),
  accountant: getPermissionsForKeys([
    'student.view', 'fee.view', 'student_fee.view', 'student_fee.adjust',
    'payment.view', 'payment.collect', 'payment.confirm',
    'transaction.view', 'transaction.export',
    'payment_due.view', 'payment_due.adjust', 'payment_due.collect',
    'discount.view', 'discount.create',
    'refund.view', 'refund.create', 
    'invoice.view', 'invoice.create', 'invoice.generate', 'invoice.print', 'invoice.download',
    'receipt.view', 'receipt.create', 'receipt.generate', 'receipt.print', 'receipt.download',
    'financial_report.view', 'financial_report.export', 'financial_report.generate'
  ]),
  cashier: getPermissionsForKeys([
    'payment.view', 'payment.collect', 'payment.confirm',
    'receipt.view', 'receipt.generate', 'receipt.print', 'receipt.download',
    'payment_due.view', 'payment_due.collect',
    'invoice.view', 'invoice.print'
  ]),
  admission_officer: getPermissionsForKeys([
    'student.view', 'student.create', 'admission.view', 'admission.create', 'admission.update',
    'notice.view', 'messaging.use'
  ]),
  hostel_manager: getPermissionsForKeys([
    'student.view', 'hostel.view', 'hostel.manage', 'notice.view'
  ]),
  library_manager: getPermissionsForKeys([
    'library.view', 'library.manage', 'notice.view'
  ]),
  student: getPermissionsForKeys([
    'homework.view', 'exam.view', 'notice.view', 'payment.view', 'invoice.view', 'receipt.view'
  ]),
  guardian: getPermissionsForKeys([
    'student.view', 'homework.view', 'exam.view', 'notice.view', 'payment.view', 'invoice.view', 'receipt.view'
  ])
};

// Legacy permission mapping (for backward compatibility during transition)
const legacyToGranularMap = {
  can_manage_notice: ['notice.create', 'notice.update', 'notice.delete'],
  can_view_notice: ['notice.view'],
  can_manage_hostel: ['hostel.manage'],
  can_view_hostel: ['hostel.view'],
  can_manage_hifz: ['hifz.manage'],
  can_view_hifz: ['hifz.view'],
  can_create_homework: ['homework.create'],
  can_edit_homework: ['homework.update'],
  can_delete_homework: ['homework.delete'],
  can_view_homework: ['homework.view'],
  can_view_all_homework: ['homework.view_all'],
  can_manage_exams: ['exam.manage'],
  can_grade_exams: ['exam.grade'],
  can_view_exams: ['exam.view'],
  can_manage_finance: ['payment.collect', 'payment.confirm', 'fee.assign'],
  can_view_finance: ['payment.view', 'fee.view'],
  can_mark_attendance: ['attendance.create', 'attendance.update'],
  can_view_attendance: ['attendance.view'],
  can_manage_users: ['user.create', 'user.update', 'user.delete'],
  can_view_users: ['user.view', 'teacher.view'],
  can_view_students: ['student.view']
};

module.exports = {
  permissionCategories,
  allPermissionKeys,
  defaultRolePermissions,
  legacyToGranularMap
};
