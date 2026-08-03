import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, BookOpen, FileText, X, CheckCircle, AlertCircle, Trash2, Edit } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { SECTION_OPTIONS } from '../../utils/constants';

export default function HomeworkPage() {
  const { user } = useAuthStore();
  const [myPermissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('userPermissions') || '{}'); } catch { return {}; }
  });
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  
  const [isPublic, setIsPublic] = useState(false);

  // Fetch public settings once on load
  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const res = await api.get('/homework/public/settings');
        if (res.data.success) {
          setIsPublic(res.data.data.isHomeworkPublic);
        }
      } catch (err) {
        console.error('Failed to fetch public homework settings', err);
      }
    };
    fetchPublicSettings();
  }, []);

  const handleTogglePublic = async () => {
    try {
      const res = await api.post('/homework/public/toggle', { isHomeworkPublic: !isPublic });
      if (res.data.success) {
        setIsPublic(res.data.data.isHomeworkPublic);
        setToast({
          type: 'success',
          message: res.data.data.isHomeworkPublic
            ? 'হোমওয়ার্ক সফলভাবে সবার জন্য উন্মুক্ত (Public) করা হয়েছে!'
            : 'পাবলিক হোমওয়ার্ক সেটিংস বন্ধ করা হয়েছে।'
        });
      }
    } catch (err) {
      console.error('Failed to toggle public homework', err);
      setToast({ type: 'error', message: 'সেটিংস টগল করতে ব্যর্থ হয়েছে' });
    }
  };

  // Filter States
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState({ classes: [], sections: [], subjects: [] });

  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  // Classes & Subjects for mapping inside the Modal form
  const [classes, setClasses] = useState([]);
  const [modalSubjects, setModalSubjects] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    classLevel: '',
    section: '',
    dueDate: '',
    status: 'active',
    isKhataHomework: false
  });

  const fetchHomeworks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/homework', { 
        params: { 
          page, 
          limit: 10, 
          search,
          classLevel: classFilter,
          section: sectionFilter,
          subject: subjectFilter,
          status: statusFilter,
          dateFilter: dateFilter === 'custom' ? customDate : dateFilter
        } 
      });
      if (res.data.success) {
        setHomeworks(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch homeworks', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/homework', { params: { limit: 1000 } });
      if (res.data.success && res.data.data) {
        const list = res.data.data;
        setFilterOptions({
          classes: Array.from(new Set(list.map(h => h.classLevel).filter(Boolean))),
          sections: Array.from(new Set(list.map(h => h.section).filter(Boolean))),
          subjects: Array.from(new Set(list.map(h => h.subject).filter(Boolean)))
        });
      }
    } catch (err) {
      console.error('Failed to fetch filter options', err);
    }
  };

  // Fetch unique options once on load to populate filter dropdowns dynamically
  useEffect(() => {
    fetchFilterOptions();
    // Load classes for the creation form dropdown
    const fetchClasses = async () => {
      try {
        const res = await api.get('/students/classes');
        if (res.data.success) {
          setClasses(res.data.data.classes || []);
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      }
    };
    fetchClasses();
  }, []);

  // Load subjects based on selected class Level in creation/edit modal
  useEffect(() => {
    const selectedClass = classes.find(c => c.name === formData.classLevel);
    if (!selectedClass) {
      setModalSubjects([]);
      return;
    }
    const fetchSubjectsForClass = async () => {
      try {
        const res = await api.get(`/students/subjects?classLevel=${selectedClass._id}`);
        if (res.data.success) {
          setModalSubjects(res.data.data.subjects || []);
        }
      } catch (err) {
        console.error('Failed to fetch subjects for class:', err);
      }
    };
    fetchSubjectsForClass();
  }, [formData.classLevel, classes]);

  useEffect(() => {
    fetchHomeworks();
  }, [page, classFilter, sectionFilter, subjectFilter, statusFilter, dateFilter, customDate]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHomeworks();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', subject: '', classLevel: '', section: '', dueDate: '', status: 'active', isKhataHomework: false
    });
  };

  const handleEditClick = (hw) => {
    const dateObj = new Date(hw.dueDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    setFormData({
      title: hw.title || '',
      description: hw.description || '',
      subject: hw.subject || '',
      classLevel: hw.classLevel || '',
      section: hw.section || '',
      dueDate: formattedDate,
      status: hw.status || 'active',
      isKhataHomework: hw.isKhataHomework || false
    });
    setEditingId(hw._id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        const res = await api.patch(`/homework/${editingId}`, formData);
        if (res.data.success) {
          setIsModalOpen(false);
          resetForm();
          setIsEditing(false);
          setEditingId(null);
          setToast({ type: 'success', message: 'হোমওয়ার্ক সফলভাবে সংশোধন করা হয়েছে!' });
          fetchHomeworks();
          fetchFilterOptions();
        }
      } else {
        const res = await api.post('/homework', formData);
        if (res.data.success) {
          setIsModalOpen(false);
          resetForm();
          setToast({ type: 'success', message: 'হোমওয়ার্ক সফলভাবে দেওয়া হয়েছে!' });
          fetchHomeworks();
          fetchFilterOptions();
        }
      }
    } catch (err) {
      console.error('Failed to save homework', err);
      const errMsg = err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'হোমওয়ার্ক সংরক্ষণ করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই হোমওয়ার্কটি মুছে ফেলতে চান?')) return;
    try {
      await api.delete(`/homework/${id}`);
      setToast({ type: 'success', message: 'হোমওয়ার্ক সফলভাবে মুছে ফেলা হয়েছে!' });
      fetchHomeworks();
      fetchFilterOptions();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'হোমওয়ার্ক মুছতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-active">সক্রিয়</span>;
      case 'draft':
        return <span className="badge badge-warning">খসড়া</span>;
      case 'closed':
        return <span className="badge badge-inactive">বন্ধ</span>;
      default:
        return null;
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
          <h1 className="page-title">হোমওয়ার্ক</h1>
          <p className="page-subtitle">শিক্ষার্থীদের দেওয়া সকল হোমওয়ার্ক ও অ্যাসাইনমেন্ট</p>
        </div>
        <div className="flex gap-12" style={{ alignItems: 'center' }}>
          {user?.userType === 'super_admin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span className="text-sm font-semibold">পাবলিক ভিউ:</span>
              <label style={{ position: 'relative', width: '40px', height: '20px', cursor: 'pointer', display: 'block', marginBottom: 0 }}>
                <input type="checkbox" checked={isPublic} onChange={handleTogglePublic} style={{ display: 'none' }} />
                <div style={{ width: '40px', height: '20px', borderRadius: '10px', background: isPublic ? 'var(--primary-500)' : 'var(--border-color)', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: isPublic ? '23px' : '3px', transition: 'all 0.3s' }}></div>
                </div>
              </label>
            </div>
          )}
          {myPermissions?.can_create_homework && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> নতুন হোমওয়ার্ক
            </button>
          )}
        </div>
      </div>

      <div className="card mb-24" style={{ padding: '16px 20px' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <form onSubmit={handleSearch} className="flex gap-8" style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" placeholder="বিষয় বা শিরোনাম দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} /> অনুসন্ধান
            </button>
          </form>

          <div className="flex gap-8" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="form-input form-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ width: '150px', padding: '8px 32px 8px 12px' }}
            >
              <option value="today">আজকের হোমওয়ার্ক</option>
              <option value="all">সকল হোমওয়ার্ক</option>
              <option value="custom">নির্দিষ্ট তারিখ</option>
            </select>

            {dateFilter === 'custom' && (
              <input
                type="date"
                className="form-input"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{ width: '150px', padding: '6px 12px' }}
              />
            )}

            <select
              className="form-input form-select"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              style={{ width: '130px', padding: '8px 32px 8px 12px' }}
            >
              <option value="">সকল বিষয়</option>
              {filterOptions.subjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              style={{ width: '120px', padding: '8px 32px 8px 12px' }}
            >
              <option value="">সকল শ্রেণী</option>
              {filterOptions.classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              style={{ width: '110px', padding: '8px 32px 8px 12px' }}
            >
              <option value="">সকল সেকশন</option>
              {filterOptions.sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '120px', padding: '8px 32px 8px 12px' }}
            >
              <option value="">সকল স্ট্যাটাস</option>
              <option value="active">সক্রিয়</option>
              <option value="draft">খসড়া</option>
              <option value="closed">বন্ধ</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="spinner"></div>
        </div>
      ) : homeworks.length === 0 ? (
        <div className="card empty-state">
          <BookOpen size={48} style={{ opacity: 0.3 }} />
          <div className="empty-state-title mt-16">কোনো হোমওয়ার্ক পাওয়া যায়নি</div>
          <p className="text-muted text-sm mt-4">
            নতুন হোমওয়ার্ক তৈরি করতে "নতুন হোমওয়ার্ক" বোতামে ক্লিক করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-3" style={{ alignItems: 'stretch' }}>
          {homeworks.map((hw) => (
            <div key={hw._id} className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: '280px' }}>
              <div className="flex-between mb-16">
                <div className="flex gap-8" style={{ alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(20, 184, 166, 0.1)', color: 'var(--primary-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{hw.subject || 'অজানা বিষয়'}</div>
                    <div className="text-muted" style={{ fontSize: '0.688rem' }}>
                      {hw.classLevel} • {hw.section}
                    </div>
                  </div>
                </div>
                <div className="flex" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                  {getStatusBadge(hw.status)}
                  <div className="text-muted mt-4" style={{ fontSize: '0.75rem' }}>
                    শিক্ষক: {hw.assignedBy?.fullName || 'অজানা'}
                  </div>
                </div>
              </div>
              
              <h3 style={{ fontSize: '1.063rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {hw.title}
                {hw.isKhataHomework && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-300)', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 500 }}>
                    খাতায় লেখার কাজ দেওয়া হয়েছে
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted mb-16" style={{ flex: 1, overflowY: 'auto' }}>{hw.description}</p>
              
              <div className="flex-between mt-auto" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div className="flex" style={{ flexDirection: 'column', gap: '4px' }}>
                  <div className="flex gap-8 text-xs text-muted" style={{ alignItems: 'center' }}>
                    <Calendar size={12} />
                    <span>পোস্ট: {new Date(hw.assignDate || hw.createdAt).toLocaleDateString('bn-BD')}</span>
                  </div>
                  <div className="flex gap-8 text-sm text-muted" style={{ alignItems: 'center' }}>
                    <Calendar size={14} style={{ color: 'var(--primary-400)' }} />
                    <span className="font-semibold">জমা: {new Date(hw.dueDate).toLocaleDateString('bn-BD')}</span>
                  </div>
                </div>
                <div className="flex gap-8">
                  {(myPermissions?.can_edit_homework || 
                    hw.assignedBy?._id?.toString() === user?._id?.toString() ||
                    hw.assignedBy?.toString() === user?._id?.toString()) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEditClick(hw)} style={{ color: 'var(--primary-400)' }} title="সংশোধন করুন">
                      <Edit size={14} /> এডিট
                    </button>
                  )}
                  {(myPermissions?.can_delete_homework || 
                    hw.assignedBy?._id?.toString() === user?._id?.toString() ||
                    hw.assignedBy?.toString() === user?._id?.toString()) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(hw._id)} style={{ color: 'var(--danger)' }} title="মুছে ফেলুন">
                      <Trash2 size={14} /> মুছুন
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
              <h2 style={{ fontSize: '1.25rem' }}>{isEditing ? 'হোমওয়ার্ক সংশোধন করুন' : 'নতুন হোমওয়ার্ক দিন'}</h2>
              <button className="btn-icon" onClick={() => { setIsModalOpen(false); resetForm(); setIsEditing(false); setEditingId(null); }} type="button">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">শিরোনাম *</label>
                <input type="text" name="title" className="form-input" required value={formData.title} onChange={handleChange} placeholder="যেমন: বীজগণিত প্রথম অধ্যায়" />
              </div>

              <div className="form-group">
                <label className="form-label">বর্ণনা *</label>
                <textarea name="description" className="form-input" required value={formData.description} onChange={handleChange} placeholder="হোমওয়ার্কের বিস্তারিত লিখুন" rows="4" />
              </div>

              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">শ্রেণী *</label>
                  <select name="classLevel" className="form-input form-select" required value={formData.classLevel} onChange={handleChange}>
                    <option value="">শ্রেণি নির্বাচন করুন</option>
                    {classes.map(c => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">বিষয় *</label>
                  <select name="subject" className="form-input form-select" required value={formData.subject} onChange={handleChange} disabled={!formData.classLevel}>
                    <option value="">বিষয় নির্বাচন করুন</option>
                    {modalSubjects.map(s => (
                      <option key={s._id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">সেকশন *</label>
                  <select name="section" className="form-input form-select" required value={formData.section} onChange={handleChange}>
                    <option value="">সেকশন নির্বাচন করুন</option>
                    {SECTION_OPTIONS.map((sec, idx) => (
                      <option key={idx} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">জমা দেওয়ার শেষ তারিখ *</label>
                  <input type="date" name="dueDate" className="form-input" required value={formData.dueDate} onChange={handleChange} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">স্ট্যাটাস</label>
                  <select name="status" className="form-input" value={formData.status} onChange={handleChange}>
                    <option value="active">সক্রিয়</option>
                    <option value="draft">খসড়া</option>
                    <option value="closed">বন্ধ</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(30, 41, 59, 0.3)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: '2px', cursor: 'pointer' }}>খাতায় লেখার হোমওয়ার্ক</label>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>এটি অন করলে হোমওয়ার্কের সাথে "খাতায় লেখার কাজ" নির্দেশক যুক্ত হবে</span>
                  </div>
                  <label style={{ position: 'relative', width: '40px', height: '20px', cursor: 'pointer', display: 'block', marginBottom: 0 }}>
                    <input 
                      type="checkbox" 
                      name="isKhataHomework"
                      checked={formData.isKhataHomework} 
                      onChange={(e) => setFormData({ ...formData, isKhataHomework: e.target.checked })} 
                      style={{ display: 'none' }} 
                    />
                    <div style={{ width: '40px', height: '20px', borderRadius: '10px', background: formData.isKhataHomework ? 'var(--primary-500)' : 'var(--border-color)', position: 'relative', transition: 'background 0.3s' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: formData.isKhataHomework ? '23px' : '3px', transition: 'all 0.3s' }}></div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); resetForm(); setIsEditing(false); setEditingId(null); }}>বাতিল</button>
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
