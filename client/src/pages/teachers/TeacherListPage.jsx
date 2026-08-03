import { useState, useEffect } from 'react';
import { Plus, Users, User, Phone, Mail, X, CheckCircle, AlertCircle, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function TeacherListPage() {
  const { user } = useAuthStore();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');

  const designations = Array.from(new Set(teachers.map(t => t.designation).filter(Boolean)));

  const filteredTeachers = teachers.filter((teacher) => {
    const fullName = `${teacher.user?.firstName || ''} ${teacher.user?.lastName || ''}`.toLowerCase();
    const email = (teacher.user?.email || '').toLowerCase();
    const phone = (teacher.user?.phone || '').toLowerCase();
    const designation = (teacher.designation || '').toLowerCase();
    const searchLower = search.toLowerCase();

    const matchesSearch = 
      !search ||
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      phone.includes(searchLower) ||
      designation.includes(searchLower);

    const matchesType = !typeFilter || teacher.teacherType === typeFilter;
    const matchesDesignation = !designationFilter || teacher.designation === designationFilter;
    const matchesRole = !roleFilter || teacher.user?.userType === roleFilter;

    return matchesSearch && matchesType && matchesDesignation && matchesRole;
  });

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredTeachers.length / limit);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, roleFilter, designationFilter]);

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    teacherId: '',
    teacherType: 'regular',
    userType: 'teacher',
    designation: '',
    password: ''
  });

  const userTypeLabels = {
    principal: 'প্রিন্সিপাল',
    vice_principal: 'ভাইস প্রিন্সিপাল',
    teacher: 'শিক্ষক',
    hifz_teacher: 'হিফজ শিক্ষক',
    accountant: 'হিসাবরক্ষক',
    admission_officer: 'ভর্তি কর্মকর্তা',
    hostel_manager: 'হোস্টেল ম্যানেজার',
    library_manager: 'লাইব্রেরি ম্যানেজার',
  };

  const teacherTypeLabels = {
    regular: 'জেনারেল',
    hifz: 'হিফজ',
    guest: 'গেস্ট',
    staff: 'স্টাফ',
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      setSelectedIds([]);
      const res = await api.get('/teachers', { params: { limit: 1000 } });
      // paginated response: { success, data: [...], pagination }
      if (res.data.success) {
        setTeachers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch teachers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      firstName: '', lastName: '', email: '', phone: '',
      username: '', teacherId: '', teacherType: 'regular', userType: 'teacher', designation: '', password: ''
    });
  };

  const handleEditClick = (teacher) => {
    setFormData({
      firstName: teacher.user?.firstName || '',
      lastName: teacher.user?.lastName || '',
      username: teacher.user?.username || '',
      email: teacher.user?.email || '',
      phone: teacher.user?.phone || '',
      teacherId: teacher.employeeId || '',
      teacherType: teacher.teacherType || 'regular',
      userType: teacher.user?.userType || 'teacher',
      designation: teacher.designation || '',
      password: ''
    });
    setEditingId(teacher._id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    try {
      if (isEditing) {
        const res = await api.patch(`/teachers/${editingId}`, formData);
        if (res.data.success) {
          setIsModalOpen(false);
          resetForm();
          setIsEditing(false);
          setEditingId(null);
          setToast({ type: 'success', message: 'স্টাফ/শিক্ষকের তথ্য সফলভাবে আপডেট করা হয়েছে!' });
          fetchTeachers();
        }
      } else {
        const res = await api.post('/teachers', formData);
        if (res.data.success) {
          setIsModalOpen(false);
          resetForm();
          setToast({ type: 'success', message: 'স্টাফ/শিক্ষক সফলভাবে যোগ করা হয়েছে!' });
          fetchTeachers();
        }
      }
    } catch (err) {
      console.error('Failed to create teacher', err);
      const errMsg = err.response?.data?.message || 
                     err.response?.data?.errors?.join(', ') ||
                     'স্টাফ/শিক্ষক সংরক্ষণ করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState([]);

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই স্টাফ/শিক্ষককে মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/teachers/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'স্টাফ/শিক্ষক সফলভাবে মুছে ফেলা হয়েছে!' });
        setSelectedIds(prev => prev.filter(item => item !== id));
        fetchTeachers();
      }
    } catch (err) {
      console.error('Failed to delete teacher', err);
      const errMsg = err.response?.data?.message || 'স্টাফ/শিক্ষক মুছে ফেলতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে বাছাইকৃত ${selectedIds.length} জন স্টাফ/শিক্ষককে মুছে ফেলতে চান?`)) return;
    try {
      setLoading(true);
      await Promise.all(selectedIds.map(id => api.delete(`/teachers/${id}`)));
      setSelectedIds([]);
      setToast({ type: 'success', message: 'বাছাইকৃত স্টাফ/শিক্ষক সফলভাবে মুছে ফেলা হয়েছে!' });
      fetchTeachers();
    } catch (err) {
      console.error('Failed bulk delete teachers', err);
      setToast({ type: 'error', message: 'কিছু স্টাফ/শিক্ষক মুছে ফেলা যায়নি' });
      fetchTeachers();
    }
  };

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 2000,
          padding: '14px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          animation: 'slideDown 0.3s ease-out',
          maxWidth: '400px',
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem' }}>{toast.message}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">শিক্ষকমণ্ডলী ও স্টাফ</h1>
          <p className="page-subtitle">মাদ্রাসার সকল শিক্ষক ও কর্মকর্তা-কর্মচারীদের তালিকা</p>
        </div>
        {(user?.userType === 'super_admin' || user?.userType === 'admin') && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> নতুন স্টাফ/শিক্ষক
          </button>
        )}
      </div>

      {/* ফিল্টার বার */}
      <div className="card mb-24" style={{ padding: '16px 20px' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="flex gap-8" style={{ flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="নাম, পদবি বা ফোন দিয়ে খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            <select
              className="form-input form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '150px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল বিভাগ</option>
              <option value="regular">জেনারেল</option>
              <option value="hifz">হিফজ</option>
              <option value="guest">গেস্ট</option>
              <option value="staff">স্টাফ</option>
            </select>

            <select
              className="form-input form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ width: '150px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল রোল</option>
              {Object.entries(userTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              style={{ width: '160px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল পদবি</option>
              {designations.map(des => (
                <option key={des} value={des}>{des}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {(user?.userType === 'super_admin' || user?.userType === 'admin') && filteredTeachers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', background: 'var(--bg-card)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', marginBottom: 0 }}>
            <input 
              type="checkbox" 
              checked={filteredTeachers.length > 0 && selectedIds.length === filteredTeachers.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(filteredTeachers.map(t => t._id));
                } else {
                  setSelectedIds([]);
                }
              }}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <span>সব সিলেক্ট করুন ({filteredTeachers.length} জনের মধ্যে)</span>
          </label>
          {selectedIds.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={14} /> বাছাইকৃতগুলো মুছুন ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="spinner"></div>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="card empty-state">
          <Users size={48} style={{ opacity: 0.3 }} />
          <div className="empty-state-title mt-16">কোনো স্টাফ বা শিক্ষক পাওয়া যায়নি</div>
          <p className="text-muted text-sm mt-8">"নতুন স্টাফ/শিক্ষক" বাটনে ক্লিক করে যোগ করুন অথবা অনুসন্ধান পরিবর্তন করুন</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {paginatedTeachers.map((teacher) => (
            <div key={teacher._id} className="card animate-slide-up" style={{ textAlign: 'center', position: 'relative' }}>
              {(user?.userType === 'super_admin' || user?.userType === 'admin') && (
                <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 10 }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(teacher._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(prev => [...prev, teacher._id]);
                      } else {
                        setSelectedIds(prev => prev.filter(id => id !== teacher._id));
                      }
                    }}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                </div>
              )}
              {(user?.userType === 'super_admin' || user?.userType === 'admin') && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleEditClick(teacher)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(20, 184, 166, 0.8)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#14b8a6'; e.currentTarget.style.background = 'rgba(20, 184, 166, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(20, 184, 166, 0.8)'; e.currentTarget.style.background = 'transparent'; }}
                    title="সম্পাদনা করুন"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(teacher._id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(239, 68, 68, 0.8)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239, 68, 68, 0.8)'; e.currentTarget.style.background = 'transparent'; }}
                    title="ডিলিট করুন"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-secondary)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={32} style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem' }}>{teacher.user?.firstName} {teacher.user?.lastName}</h3>
              <p className="text-sm text-primary mb-4">{teacher.designation || userTypeLabels[teacher.user?.userType] || 'স্টাফ'}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span className="badge badge-info" style={{ fontSize: '0.688rem', padding: '2px 8px' }}>
                  রোল: {userTypeLabels[teacher.user?.userType] || 'শিক্ষক'}
                </span>
                <span className="badge badge-muted" style={{ fontSize: '0.688rem', padding: '2px 8px' }}>
                  বিভাগ: {teacherTypeLabels[teacher.teacherType] || 'জেনারেল'}
                </span>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div className="flex gap-8 text-sm text-muted">
                  <Phone size={14} /> <span>{teacher.user?.phone || 'N/A'}</span>
                </div>
                {teacher.user?.email && (
                  <div className="flex gap-8 text-sm text-muted">
                    <Mail size={14} /> <span>{teacher.user?.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredTeachers.length > 0 && (
        <div className="card mt-24" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            {totalPages > 1 && (
              <div className="pagination" style={{ margin: 0, justifyContent: 'flex-start' }}>
                <button
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronRight size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      className={`pagination-btn ${p === page ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  className="pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>প্রতি পেজে প্রদর্শন:</span>
            <select 
              className="form-input form-select" 
              value={limit} 
              onChange={(e) => handleLimitChange(Number(e.target.value))} 
              style={{ width: '80px', padding: '6px 24px 6px 12px', fontSize: '0.875rem' }}
            >
              <option value={15}>১৫</option>
              <option value={25}>২৫</option>
              <option value={50}>৫০</option>
              <option value={100}>১০০</option>
            </select>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '600px', margin: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontSize: '1.25rem' }}>{isEditing ? 'স্টাফ/শিক্ষকের তথ্য সংশোধন করুন' : 'নতুন স্টাফ/শিক্ষক যোগ করুন'}</h2>
              <button className="btn-icon" onClick={() => { setIsModalOpen(false); resetForm(); setIsEditing(false); }} type="button">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">নামের প্রথমাংশ *</label>
                  <input type="text" name="firstName" className="form-input" required value={formData.firstName} onChange={handleChange} placeholder="যেমন: মোহাম্মদ" />
                </div>
                <div className="form-group">
                  <label className="form-label">নামের শেষাংশ *</label>
                  <input type="text" name="lastName" className="form-input" required value={formData.lastName} onChange={handleChange} placeholder="যেমন: আহমদ" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">স্টাফ/টিচার আইডি (ঐচ্ছিক)</label>
                  <input type="text" name="teacherId" className="form-input" value={formData.teacherId} onChange={handleChange} placeholder="যেমন: STF-1001" />
                </div>
                <div className="form-group">
                  <label className="form-label">পদবি</label>
                  <input type="text" name="designation" className="form-input" placeholder="যেমন: লাইব্রেরিয়ান / হিসাবরক্ষক" value={formData.designation} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">বিভাগ / ধরন *</label>
                  <select name="teacherType" className="form-input" required value={formData.teacherType} onChange={handleChange}>
                    <option value="regular">জেনারেল (General)</option>
                    <option value="hifz">হিফজ (Hifz)</option>
                    <option value="guest">গেস্ট (Guest)</option>
                    <option value="staff">স্টাফ (Staff)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">সিস্টেম রোল (Role) *</label>
                  <select name="userType" className="form-input" required value={formData.userType} onChange={handleChange}>
                    <option value="teacher">শিক্ষক (Teacher)</option>
                    <option value="hifz_teacher">হিফজ শিক্ষক (Hifz Teacher)</option>
                    <option value="principal">প্রিন্সিপাল (Principal)</option>
                    <option value="vice_principal">ভাইস প্রিন্সিপাল (Vice Principal)</option>
                    <option value="accountant">হিসাবরক্ষক (Accountant)</option>
                    <option value="admission_officer">ভর্তি কর্মকর্তা (Admission Officer)</option>
                    <option value="hostel_manager">হোস্টেল ম্যানেজার (Hostel Manager)</option>
                    <option value="library_manager">লাইব্রেরি ম্যানেজার (Library Manager)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ফোন নম্বর *</label>
                  <input type="text" name="phone" className="form-input" required value={formData.phone} onChange={handleChange} placeholder="যেমন: 01711223344" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">ইউজারনেম (Username)</label>
                  <input type="text" name="username" className="form-input" value={formData.username} onChange={handleChange} placeholder="যেমন: library_manager1" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">ইমেইল (ঐচ্ছিক)</label>
                  <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} placeholder="যেমন: library@madrasah.com" />
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">পাসওয়ার্ড</label>
                  <input type="text" name="password" className="form-input" placeholder="ফাঁকা রাখলে 'teacher123' হবে" value={formData.password} onChange={handleChange} />
                </div>
              </div>

              <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>বাতিল</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
