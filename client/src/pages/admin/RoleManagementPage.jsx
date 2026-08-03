import { useState, useEffect } from 'react';
import { Shield, Save, CheckCircle, AlertCircle, RefreshCw, Users, Search, GraduationCap, UserCheck, Check, RotateCcw, X } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

const roles = [
  { value: 'co_super_admin', label: 'কো-সুপার অ্যাডমিন' },
  { value: 'admin', label: 'অ্যাডমিন' },
  { value: 'principal', label: 'প্রিন্সিপাল' },
  { value: 'vice_principal', label: 'ভাইস প্রিন্সিপাল' },
  { value: 'teacher', label: 'শিক্ষক' },
  { value: 'hifz_teacher', label: 'হিফজ শিক্ষক' },
  { value: 'accountant', label: 'হিসাবরক্ষক' },
  { value: 'admission_officer', label: 'ভর্তি কর্মকর্তা' },
  { value: 'hostel_manager', label: 'হোস্টেল ম্যানেজার' },
  { value: 'library_manager', label: 'লাইব্রেরি ম্যানেজার' },
  { value: 'student', label: 'ছাত্র/ছাত্রী' },
  { value: 'guardian', label: 'অভিভাবক' },
];

const permissionCategories = [
  {
    category: 'হোমওয়ার্ক',
    permissions: [
      { key: 'can_view_homework', label: 'নিজের হোমওয়ার্ক দেখতে পারবে' },
      { key: 'can_view_all_homework', label: 'সকলের হোমওয়ার্ক দেখতে পারবে' },
      { key: 'can_create_homework', label: 'নতুন হোমওয়ার্ক তৈরি করতে পারবে' },
      { key: 'can_edit_homework', label: 'হোমওয়ার্ক এডিট করতে পারবে' },
      { key: 'can_delete_homework', label: 'হোমওয়ার্ক মুছতে পারবে' },
    ]
  },
  {
    category: 'উপস্থিতি (Attendance)',
    permissions: [
      { key: 'can_view_attendance', label: 'নিজের উপস্থিতি দেখতে পারবে' },
      { key: 'can_view_all_attendance', label: 'সকলের উপস্থিতি দেখতে পারবে' },
      { key: 'can_mark_attendance', label: 'উপস্থিতি নিতে পারবে' },
    ]
  },
  {
    category: 'পরীক্ষা ও ফলাফল',
    permissions: [
      { key: 'can_view_exams', label: 'পরীক্ষা দেখতে পারবে' },
      { key: 'can_manage_exams', label: 'পরীক্ষা পরিচালনা করতে পারবে' },
    ]
  },
  {
    category: 'আর্থিক হিসাব (Finance)',
    permissions: [
      { key: 'can_view_finance', label: 'ফি / বেতন মডিউল দেখতে পারবে (অন/অফ)' },
      { key: 'can_manage_finance', label: 'আর্থিক লেনদেন পরিচালনা করতে পারবে' },
    ]
  },
  {
    category: 'ব্যবহারকারী পরিচালনা',
    permissions: [
      { key: 'can_view_users', label: 'স্টাফ তালিকা দেখতে পারবে' },
      { key: 'can_view_students', label: 'ছাত্র/ছাত্রী দেখতে পারবে' },
      { key: 'can_manage_users', label: 'ব্যবহারকারী তৈরি/এডিট করতে পারবে' },
    ]
  },
  {
    category: 'নোটিশ বোর্ড',
    permissions: [
      { key: 'can_view_notice', label: 'নোটিশ মডিউল দেখতে পারবে (অন/অফ)' },
      { key: 'can_manage_notice', label: 'নোটিশ তৈরি ও মুছতে পারবে' },
    ]
  },
  {
    category: 'হোস্টেল',
    permissions: [
      { key: 'can_view_hostel', label: 'হোস্টেল মডিউল দেখতে পারবে (অন/অফ)' },
      { key: 'can_manage_hostel', label: 'হোস্টেল পরিচালনা করতে পারবে' },
    ]
  },
  {
    category: 'লাইব্রেরি',
    permissions: [
      { key: 'can_view_library', label: 'লাইব্রেরি মডিউল দেখতে পারবে (অন/অফ)' }
    ]
  },
  {
    category: 'সিস্টেম সেটিংস',
    permissions: [
      { key: 'can_view_settings', label: 'সেটিংস মডিউল দেখতে পারবে (অন/অফ)' }
    ]
  },
  {
    category: 'শিক্ষক ও যোগাযোগ মডিউল',
    permissions: [
      { key: 'can_grade_exams', label: 'খাতা মূল্যায়ন ও মার্কস দিতে পারবে' },
      { key: 'can_add_syllabus', label: 'সিলেবাস যোগ করতে পারবে' },
      { key: 'can_communicate_parents', label: 'অভিভাবকদের সাথে মেসেজ করতে পারবে' },
      { key: 'can_take_live_class', label: 'অনলাইন লাইভ ক্লাস নিতে পারবে' },
      { key: 'can_use_messaging', label: 'মেসেজিং সিস্টেম ব্যবহার করতে পারবে' },
    ]
  },
  {
    category: 'হিফজ মডিউল (Hifz Specific)',
    permissions: [
      { key: 'can_manage_hifz', label: 'হিফজ অগ্রগতি এডিট ও ডিলিট করতে পারবে' }
    ]
  },
  {
    category: 'রিপোর্ট ও বিশ্লেষণ (Reports)',
    permissions: [
      { key: 'can_view_reports', label: 'সকল রিপোর্ট দেখতে পারবে এবং PDF ডাউনলোড করতে পারবে' }
    ]
  }
];

const allPermissionKeys = permissionCategories.flatMap(cat => cat.permissions.map(p => p.key));

const defaultRolePermissions = {
  super_admin: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_manage_exams: true,
    can_view_finance: true, can_manage_finance: true,
    can_view_users: true, can_view_students: true, can_manage_users: true,
    can_view_notice: true, can_manage_notice: true,
    can_view_hostel: true, can_manage_hostel: true,
    can_view_library: true,
    can_view_settings: true,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_manage_hifz: true,
    can_view_reports: true
  },
  co_super_admin: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_manage_exams: true,
    can_view_finance: true, can_manage_finance: true,
    can_view_users: true, can_view_students: true, can_manage_users: true,
    can_view_notice: true, can_manage_notice: true,
    can_view_hostel: true, can_manage_hostel: true,
    can_view_library: true,
    can_view_settings: true,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_manage_hifz: true,
    can_view_reports: true
  },
  admin: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_manage_exams: true,
    can_view_finance: true, can_manage_finance: true,
    can_view_users: true, can_view_students: true, can_manage_users: true,
    can_view_notice: true, can_manage_notice: true,
    can_view_hostel: true, can_manage_hostel: true,
    can_view_library: true,
    can_view_settings: true,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_manage_hifz: true,
    can_view_reports: true
  },
  principal: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_manage_exams: true,
    can_view_finance: true, can_manage_finance: true,
    can_view_users: true, can_view_students: true, can_manage_users: true,
    can_view_notice: true, can_manage_notice: true,
    can_view_hostel: true, can_manage_hostel: true,
    can_view_library: true,
    can_view_settings: true,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_manage_hifz: true,
    can_view_reports: true
  },
  vice_principal: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_manage_exams: true,
    can_view_finance: true, can_manage_finance: false,
    can_view_users: true, can_view_students: true, can_manage_users: true,
    can_view_notice: true, can_manage_notice: true,
    can_view_hostel: true, can_manage_hostel: true,
    can_view_library: true,
    can_view_settings: true,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_manage_hifz: true,
    can_view_reports: true
  },
  teacher: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_manage_exams: false,
    can_view_finance: false, can_manage_finance: false,
    can_view_users: false, can_view_students: true, can_manage_users: false,
    can_view_notice: true, can_manage_notice: false,
    can_view_hostel: false, can_manage_hostel: false,
    can_view_library: true,
    can_view_settings: false,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_manage_hifz: false,
    can_view_reports: false
  },
  hifz_teacher: {
    can_view_homework: true, can_view_all_homework: true, can_create_homework: true, can_edit_homework: true, can_delete_homework: true,
    can_view_attendance: true, can_view_all_attendance: true, can_mark_attendance: true,
    can_view_exams: true, can_manage_exams: false,
    can_view_finance: false, can_manage_finance: false,
    can_view_users: false, can_view_students: true, can_manage_users: false,
    can_view_notice: true, can_manage_notice: false,
    can_view_hostel: false, can_manage_hostel: false,
    can_view_library: true,
    can_view_settings: false,
    can_grade_exams: true, can_add_syllabus: true, can_communicate_parents: true, can_take_live_class: true, can_use_messaging: true,
    can_manage_hifz: true,
    can_view_reports: false
  },
  accountant: {
    can_view_homework: false, can_view_all_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
    can_view_attendance: true, can_view_all_attendance: false, can_mark_attendance: false,
    can_view_exams: false, can_manage_exams: false,
    can_view_finance: true, can_manage_finance: true,
    can_view_users: true, can_view_students: true, can_manage_users: false,
    can_view_notice: true, can_manage_notice: false,
    can_view_hostel: false, can_manage_hostel: false,
    can_view_library: true,
    can_view_settings: false,
    can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false, can_use_messaging: true,
    can_manage_hifz: false,
    can_view_reports: true
  },
  admission_officer: {
    can_view_homework: false, can_view_all_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
    can_view_attendance: true, can_view_all_attendance: false, can_mark_attendance: false,
    can_view_exams: false, can_manage_exams: false,
    can_view_finance: false, can_manage_finance: false,
    can_view_users: false, can_view_students: true, can_manage_users: true,
    can_view_notice: true, can_manage_notice: false,
    can_view_hostel: false, can_manage_hostel: false,
    can_view_library: true,
    can_view_settings: false,
    can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false, can_use_messaging: true,
    can_manage_hifz: false,
    can_view_reports: false
  },
  hostel_manager: {
    can_view_homework: false, can_view_all_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
    can_view_attendance: true, can_view_all_attendance: false, can_mark_attendance: false,
    can_view_exams: false, can_manage_exams: false,
    can_view_finance: false, can_manage_finance: false,
    can_view_users: false, can_view_students: true, can_manage_users: false,
    can_view_notice: true, can_manage_notice: false,
    can_view_hostel: true, can_manage_hostel: true,
    can_view_library: true,
    can_view_settings: false,
    can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false, can_use_messaging: true,
    can_manage_hifz: false,
    can_view_reports: false
  },
  library_manager: {
    can_view_homework: false, can_view_all_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
    can_view_attendance: true, can_view_all_attendance: false, can_mark_attendance: false,
    can_view_exams: false, can_manage_exams: false,
    can_view_finance: false, can_manage_finance: false,
    can_view_users: false, can_view_students: true, can_manage_users: false,
    can_view_notice: true, can_manage_notice: false,
    can_view_hostel: false, can_manage_hostel: false,
    can_view_library: true,
    can_view_settings: false,
    can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false, can_use_messaging: true,
    can_manage_hifz: false,
    can_view_reports: false
  },
  student: {
    can_view_homework: true, can_view_all_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
    can_view_attendance: true, can_view_all_attendance: false, can_mark_attendance: false,
    can_view_exams: true, can_manage_exams: false,
    can_view_finance: true, can_manage_finance: false,
    can_view_users: false, can_view_students: false, can_manage_users: false,
    can_view_notice: true, can_manage_notice: false,
    can_view_hostel: true, can_manage_hostel: false,
    can_view_library: true,
    can_view_settings: false,
    can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false, can_use_messaging: true,
    can_manage_hifz: false,
    can_view_reports: false
  },
  guardian: {
    can_view_homework: true, can_view_all_homework: false, can_create_homework: false, can_edit_homework: false, can_delete_homework: false,
    can_view_attendance: true, can_view_all_attendance: false, can_mark_attendance: false,
    can_view_exams: true, can_manage_exams: false,
    can_view_finance: true, can_manage_finance: false,
    can_view_users: false, can_view_students: false, can_manage_users: false,
    can_view_notice: true, can_manage_notice: false,
    can_view_hostel: true, can_manage_hostel: false,
    can_view_library: true,
    can_view_settings: false,
    can_grade_exams: false, can_add_syllabus: false, can_communicate_parents: false, can_take_live_class: false, can_use_messaging: true,
    can_manage_hifz: false,
    can_view_reports: false
  }
};

export default function RoleManagementPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' or 'roleUpdate'
  
  // Permissions State
  const [selectedRole, setSelectedRole] = useState(roles[4].value); // Default to teacher
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  // Role Update State
  const [usersList, setUsersList] = useState([]);
  const [userTypeFilter, setUserTypeFilter] = useState('staff'); // 'staff', 'guardian', 'student'
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  
  const [toast, setToast] = useState(null);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Permissions when selectedRole changes
  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchPermissions();
    }
  }, [selectedRole, activeTab]);

  // Load Users when roleUpdate tab or userTypeFilter changes
  useEffect(() => {
    if (activeTab === 'roleUpdate') {
      fetchUsers();
    }
  }, [activeTab, userTypeFilter]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/permissions');
      if (res.data.success) {
        const rolePerm = res.data.data.find(p => p.role === selectedRole);
        if (rolePerm && rolePerm.permissions) {
          setPermissions(rolePerm.permissions);
        } else {
          setPermissions({});
        }
      }
    } catch (error) {
      console.error('Failed to fetch permissions', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setSearching(true);
    try {
      const res = await api.get('/users', { 
        params: { 
          search: searchQuery, 
          userType: userTypeFilter,
          limit: 50 
        } 
      });
      if (res.data.success) {
        setUsersList(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setSearching(false);
    }
  };

  const handleToggle = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    const updated = {};
    allPermissionKeys.forEach(key => {
      updated[key] = true;
    });
    setPermissions(updated);
  };

  const handleDeselectAll = () => {
    const updated = {};
    allPermissionKeys.forEach(key => {
      updated[key] = false;
    });
    setPermissions(updated);
  };

  const handleRestoreDefault = () => {
    const defaults = defaultRolePermissions[selectedRole] || {};
    const updated = {};
    allPermissionKeys.forEach(key => {
      updated[key] = defaults[key] || false;
    });
    setPermissions(updated);
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/permissions/${selectedRole}`, permissions);
      if (res.data.success) {
        setToast({ type: 'success', message: `${roles.find(r => r.value === selectedRole)?.label} এর পারমিশন সফলভাবে সেভ হয়েছে!` });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'পারমিশন সেভ করতে সমস্যা হয়েছে' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (userId, targetUserType, targetAdminRole, newAdminRole) => {
    // Basic Rules Validation (super_admin check, self check)
    if (userId === currentUser._id) {
      setToast({ type: 'error', message: 'আপনি নিজের রোল পরিবর্তন করতে পারবেন না' });
      return;
    }
    if (targetUserType === 'super_admin') {
      setToast({ type: 'error', message: 'সুপার অ্যাডমিনের রোল পরিবর্তন করা সম্ভব নয়' });
      return;
    }
    if (newAdminRole === 'super_admin') {
      setToast({ type: 'error', message: 'কাউকে সুপার অ্যাডমিন রোলে উন্নীত করা সম্ভব নয়' });
      return;
    }
    if (targetAdminRole === 'co_super_admin' && currentUser.userType !== 'super_admin') {
      setToast({ type: 'error', message: 'কো-সুপার অ্যাডমিনকে ডিমোট করার ক্ষমতা শুধুমাত্র সুপার অ্যাডমিনের আছে' });
      return;
    }

    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই ব্যবহারকারীর অতিরিক্ত রোল পরিবর্তন করতে চান?')) return;

    setUpdatingUserId(userId);
    try {
      const res = await api.patch(`/users/${userId}/role`, { newRole: newAdminRole });
      if (res.data.success) {
        setToast({ type: 'success', message: 'ব্যবহারকারীর প্রশাসনিক রোল সফলভাবে পরিবর্তন করা হয়েছে!' });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      const errMsg = error.response?.data?.message || 'রোল পরিবর্তন করতে ব্যর্থ হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getCombinedRoleLabel = (primaryRole, adminRole) => {
    const pLabel = roles.find(r => r.value === primaryRole)?.label || primaryRole;
    if (!adminRole) return pLabel;
    const aLabel = adminRole === 'co_super_admin' ? 'কো-সুপার অ্যাডমিন' : 'অ্যাডমিন';
    return `${pLabel} + ${aLabel}`;
  };

  return (
    <div className="animate-fade-in" style={{ position: 'relative', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '14px 22px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title flex gap-8 items-center"><Shield size={24} style={{ color: 'var(--primary)' }} /> রোল ও পারমিশন কন্ট্রোল</h1>
          <p className="page-subtitle">রোলের অ্যাক্সেস এবং ব্যবহারকারীদের রোল প্রোমোশন/ডিমোশন পরিচালনা করুন</p>
        </div>
        {activeTab === 'permissions' && (
          <button className="btn btn-primary" onClick={handleSavePermissions} disabled={saving || loading}>
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} 
            {saving ? 'সেভ হচ্ছে...' : 'পারমিশন সেভ করুন'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-8 mb-24" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setActiveTab('permissions')}
          style={{
            borderBottom: activeTab === 'permissions' ? '2px solid var(--primary-500)' : '2px solid transparent',
            borderRadius: 0,
            color: activeTab === 'permissions' ? 'var(--primary-400)' : 'var(--text-secondary)',
            paddingBottom: '12px',
            fontWeight: 600
          }}
        >
          <Shield size={16} /> পারমিশন সেটআপ
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setActiveTab('roleUpdate')}
          style={{
            borderBottom: activeTab === 'roleUpdate' ? '2px solid var(--primary-500)' : '2px solid transparent',
            borderRadius: 0,
            color: activeTab === 'roleUpdate' ? 'var(--primary-400)' : 'var(--text-secondary)',
            paddingBottom: '12px',
            fontWeight: 600
          }}
        >
          <Users size={16} /> রোল পরিবর্তন (Promote/Demote)
        </button>
      </div>

      {activeTab === 'permissions' ? (
        <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: '24px' }}>
          {/* Sidebar: Role List */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', fontWeight: 700 }}>রোল নির্বাচন করুন</h3>
            <div className="flex flex-col gap-4">
              {roles.map(r => (
                <button
                  key={r.value}
                  onClick={() => setSelectedRole(r.value)}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    borderRadius: '8px',
                    background: selectedRole === r.value ? 'var(--primary-600)' : 'transparent',
                    color: selectedRole === r.value ? '#fff' : 'var(--text-color)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: selectedRole === r.value ? '500' : 'normal',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content: Permissions List */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="flex-between mb-24 pb-16" style={{ borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {roles.find(r => r.value === selectedRole)?.label} এর পারমিশন সেটআপ
              </h2>
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleRestoreDefault}
                  style={{ border: '1px solid var(--border-color)', padding: '6px 12px', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="ডিফল্ট পারমিশন রিস্টোর করুন"
                >
                  <RotateCcw size={14} /> ডিফল্ট সেট করুন
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleSelectAll}
                  style={{ border: '1px solid var(--border-color)', padding: '6px 12px', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-400)' }}
                  title="সবগুলো পারমিশন টিক দিন"
                >
                  <Check size={14} /> সবগুলো সিলেক্ট করুন
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleDeselectAll}
                  style={{ border: '1px solid var(--border-color)', padding: '6px 12px', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}
                  title="সবগুলো পারমিশন টিক তুলে নিন"
                >
                  <X size={14} /> সবগুলো আন-সিলেক্ট করুন
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-center py-32"><div className="spinner"></div></div>
            ) : (
              <div className="grid" style={{ gap: '24px' }}>
                {permissionCategories.map(cat => {
                  const isSpecial = cat.category.includes('Hifz') || cat.category.includes('Teacher');
                  return (
                    <div key={cat.category} style={{
                      background: isSpecial ? 'rgba(20, 184, 166, 0.03)' : 'var(--bg-secondary)', 
                      padding: '20px', 
                      borderRadius: '12px',
                      border: isSpecial ? '1px solid var(--primary-600)' : '1px solid var(--border-color)'
                    }}>
                      <h3 style={{ 
                        fontSize: '0.95rem', 
                        marginBottom: '16px', 
                        color: isSpecial ? 'var(--primary-400)' : 'var(--text-color)',
                        fontWeight: 700
                      }}>
                        {cat.category}
                      </h3>
                      <div className="grid grid-2" style={{ gap: '16px' }}>
                        {cat.permissions.map(perm => (
                          <label key={perm.key} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                            padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px',
                            border: '1px solid var(--border-color)'
                          }}>
                            <input
                              type="checkbox"
                              checked={permissions[perm.key] || false}
                              onChange={() => handleToggle(perm.key)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-color)' }}>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab: Promote / Demote */
        <div>
          {/* Sub tabs to separate Teacher, Guardian and Student */}
          <div className="flex gap-8 mb-20" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0px' }}>
            {[
              { id: 'staff', label: 'শিক্ষক ও স্টাফ (Staff/Teachers)', icon: Users },
              { id: 'guardian', label: 'অভিভাবক (Guardians)', icon: UserCheck },
              { id: 'student', label: 'ছাত্র/ছাত্রী (Students)', icon: GraduationCap },
            ].map((subTab) => (
              <button
                key={subTab.id}
                className="btn btn-ghost"
                onClick={() => setUserTypeFilter(subTab.id)}
                style={{
                  borderBottom: userTypeFilter === subTab.id ? '2px solid var(--primary-500)' : '2px solid transparent',
                  borderRadius: 0,
                  color: userTypeFilter === subTab.id ? 'var(--primary-400)' : 'var(--text-secondary)',
                  paddingBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                <subTab.icon size={14} /> {subTab.label}
              </button>
            ))}
          </div>

          <div className="card">
            <div className="flex gap-12 mb-20">
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={`${userTypeFilter === 'staff' ? 'শিক্ষক/স্টাফের' : userTypeFilter === 'guardian' ? 'অভিভাবকের' : 'ছাত্র/ছাত্রীর'} নাম, ইউজারনেম বা ইমেইল দিয়ে খুঁজুন...`} 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '38px', marginBottom: 0 }}
                />
              </div>
              <button className="btn btn-secondary" onClick={fetchUsers} disabled={searching}>
                {searching ? <RefreshCw size={16} className="spin" /> : 'খুঁজুন'}
              </button>
            </div>

            {searching ? (
              <div className="flex-center py-32"><div className="spinner"></div></div>
            ) : usersList.length === 0 ? (
              <div className="empty-state py-32">
                <Users size={40} style={{ opacity: 0.3 }} />
                <div className="empty-state-title mt-12">কোনো ব্যবহারকারী পাওয়া যায়নি</div>
              </div>
            ) : (
              <div className="table-container" style={{ padding: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ব্যবহারকারী</th>
                      <th>ইউজারনেম</th>
                      <th>রোল ও প্রশাসনিক স্ট্যাটাস</th>
                      <th style={{ width: '280px' }}>অতিরিক্ত রোল যোগ করুন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(u => {
                      const isSelf = u._id === currentUser?._id;
                      const isSuper = u.userType === 'super_admin';
                      const isCoSuper = u.adminRole === 'co_super_admin' || u.userType === 'co_super_admin';
                      
                      // Disable conditions: 
                      // 1. Yourself
                      // 2. The super admin
                      // 3. Co-super admins if you are not super_admin yourself
                      const isDisabled = isSelf || isSuper || (isCoSuper && currentUser?.userType !== 'super_admin');

                      return (
                        <tr key={u._id}>
                          <td>
                            <div className="font-semibold">{u.firstName} {u.lastName}</div>
                            <div className="text-xs text-muted">{u.email || '—'}</div>
                          </td>
                          <td style={{ fontFamily: 'Inter' }}>{u.username || '—'}</td>
                          <td>
                            <span className={`badge ${
                              isSuper ? 'badge-active' : 
                              isCoSuper ? 'badge-info' : 'badge-inactive'
                            }`}>
                              {getCombinedRoleLabel(u.userType, u.adminRole)}
                            </span>
                          </td>
                          <td>
                            {isSuper ? (
                              <span className="text-xs text-muted">পরিবর্তনযোগ্য নয়</span>
                            ) : isSelf ? (
                              <span className="text-xs text-muted">নিজের রোল</span>
                            ) : (
                              <select
                                className="form-select form-input"
                                style={{ padding: '4px 8px', fontSize: '0.85rem', marginBottom: 0 }}
                                value={u.adminRole || ''}
                                disabled={isDisabled || updatingUserId === u._id}
                                onChange={e => handleUpdateRole(u._id, u.userType, u.adminRole || '', e.target.value)}
                              >
                                <option value="">None (কোনো অতিরিক্ত রোল নেই)</option>
                                <option value="admin">অ্যাডমিন (Admin)</option>
                                <option value="co_super_admin">কো-সুপার অ্যাডমিন (Co-Super Admin)</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
