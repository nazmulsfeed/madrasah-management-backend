import { useState, useEffect } from 'react';
import { Plus, BookOpenCheck, CheckCircle, AlertCircle, X, Save, Search, Calendar, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { SECTION_OPTIONS } from '../../utils/constants';

export default function HifzPage() {
  const { user } = useAuthStore();
  const [progress, setProgress] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Permission Check
  const canManage = user?.userType === 'super_admin' || !!user?.permissions?.can_manage_hifz;

  // Metadata dropdown state
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  // Filters State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dateFilterType, setDateFilterType] = useState('all'); // 'all', 'today', 'custom'
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal selection helpers to filter student dropdown in modal
  const [modalClass, setModalClass] = useState('');
  const [modalSectionName, setModalSectionName] = useState('');
  const [modalBranch, setModalBranch] = useState('');

  const [formData, setFormData] = useState({
    student: '',
    date: new Date().toISOString().split('T')[0],
    sabaq: '',
    sabqi: '',
    manzil: '',
    quality: 'good',
    mistakesCount: 0,
    remarks: ''
  });

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchHifzProgress = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateFilterType === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (dateFilterType === 'custom' && dateFilter) {
        params.date = dateFilter;
      }
      if (selectedStudent) {
        params.student = selectedStudent;
      }
      
      const res = await api.get('/hifz', { params });
      if (res.data.success) {
        setProgress(res.data.data.progress || []);
      }
    } catch (error) {
      console.error('Error fetching hifz progress:', error);
      setToast({ type: 'error', message: 'অগ্রগতি তালিকা লোড করতে ব্যর্থ হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students', { params: { limit: 500 } });
      if (res.data.success) {
        setStudents(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [resClasses, resSections, resBranches] = await Promise.all([
        api.get('/students/classes'),
        api.get('/students/sections'),
        api.get('/students/branches')
      ]);
      if (resClasses.data.success) {
        setClasses(resClasses.data.data.classes || []);
      }
      if (resSections.data.success) {
        setSections(resSections.data.data.sections || []);
      }
      if (resBranches.data.success) {
        setBranches(resBranches.data.data.branches || []);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchHifzProgress();
  }, [dateFilter, dateFilterType, selectedStudent]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setModalClass('');
    setModalSectionName('');
    setModalBranch('');
    setFormData({
      student: '',
      date: new Date().toISOString().split('T')[0],
      sabaq: '',
      sabqi: '',
      manzil: '',
      quality: 'good',
      mistakesCount: 0,
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (record) => {
    setIsEditing(true);
    setEditingId(record._id);

    // Auto-resolve class & section of this student to populate modal filters
    const studentClassId = record.student?.currentEnrollment?.classLevel?._id || record.student?.currentEnrollment?.classLevel || '';
    const studentSectionNameVal = record.student?.currentEnrollment?.section?.name || '';
    
    setModalClass(studentClassId);
    const studentBranchId = record.student?.currentEnrollment?.section?.branch?._id || record.student?.currentEnrollment?.section?.branch || record.student?.branch?._id || record.student?.branch || '';
    setModalBranch(studentBranchId);
    
    if (studentSectionNameVal) {
      if (studentSectionNameVal.includes('ক')) setModalSectionName('ক');
      else if (studentSectionNameVal.includes('খ')) setModalSectionName('খ');
      else if (studentSectionNameVal.includes('গ')) setModalSectionName('গ');
      else if (studentSectionNameVal.includes('ঘ')) setModalSectionName('ঘ');
      else if (studentSectionNameVal.includes('কোন সেকশন নাই') || studentSectionNameVal.includes('কোন শাখা নাই') || studentSectionNameVal.includes('নাই')) setModalSectionName('কোন সেকশন নাই');
      else setModalSectionName(studentSectionNameVal);
    } else {
      setModalSectionName('');
    }

    setFormData({
      student: record.student?._id || record.student || '',
      date: record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0],
      sabaq: record.sabaq || '',
      sabqi: record.sabqi || '',
      manzil: record.manzil || '',
      quality: record.quality || 'good',
      mistakesCount: record.mistakesCount || 0,
      remarks: record.remarks || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই অগ্রগতি রেকর্ডটি মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/hifz/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'অগ্রগতি রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!' });
        fetchHifzProgress();
      }
    } catch (error) {
      console.error('Failed to delete progress', error);
      const errMsg = error.response?.data?.message || 'রেকর্ড মুছতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student) {
      setToast({ type: 'error', message: 'অনুগ্রহ করে ছাত্র নির্বাচন করুন' });
      return;
    }
    if (!formData.sabaq) {
      setToast({ type: 'error', message: 'সবক বিবরণ আবশ্যক' });
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (isEditing) {
        res = await api.patch(`/hifz/${editingId}`, formData);
      } else {
        res = await api.post('/hifz', formData);
      }

      if (res.data.success) {
        setToast({ 
          type: 'success', 
          message: isEditing ? 'হিফজ অগ্রগতি সফলভাবে আপডেট করা হয়েছে!' : 'হিফজ অগ্রগতি সফলভাবে যোগ করা হয়েছে!' 
        });
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingId(null);
        fetchHifzProgress();
      }
    } catch (error) {
      console.error('Error saving hifz progress:', error);
      const errMsg = error.response?.data?.message || 'সংরক্ষণ করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter student lists based on class & section & branch for filter dropdown
  const filteredStudentsForFilter = students.filter(s => {
    if (selectedClass && s.currentEnrollment?.classLevel?._id !== selectedClass && s.currentEnrollment?.classLevel !== selectedClass) return false;
    
    // Branch Match
    if (selectedBranch) {
      const sBranch = s.currentEnrollment?.section?.branch?._id || s.currentEnrollment?.section?.branch || s.branch?._id || s.branch || s.currentEnrollment?.branch?._id || s.currentEnrollment?.branch || '';
      if (sBranch?.toString() !== selectedBranch?.toString()) return false;
    }
    
    // Section Name Match
    if (selectedSectionName) {
      const sSecName = s.currentEnrollment?.section?.name || '';
      if (selectedSectionName === 'কোন সেকশন নাই') {
        const noSec = sSecName.includes('কোন সেকশন নাই') || sSecName.includes('কোন শাখা নাই') || sSecName.includes('নাই') || sSecName === 'no_section' || sSecName.includes('No Section');
        if (!noSec) return false;
      } else {
        if (!sSecName.startsWith(selectedSectionName) && sSecName !== selectedSectionName) return false;
      }
    }
    return true;
  });

  // Filter student lists based on class & section for modal dropdown
  const filteredStudentsForModal = students.filter(s => {
    if (modalClass && s.currentEnrollment?.classLevel?._id !== modalClass && s.currentEnrollment?.classLevel !== modalClass) return false;
    
    if (modalSectionName) {
      const sSecName = s.currentEnrollment?.section?.name || '';
      if (modalSectionName === 'কোন সেকশন নাই') {
        const noSec = sSecName.includes('কোন সেকশন নাই') || sSecName.includes('কোন শাখা নাই') || sSecName.includes('নাই') || sSecName === 'no_section' || sSecName.includes('No Section');
        if (!noSec) return false;
      } else {
        if (!sSecName.startsWith(modalSectionName) && sSecName !== modalSectionName) return false;
      }
    }
    if (modalBranch) {
      const sBranch = s.currentEnrollment?.section?.branch?._id || s.currentEnrollment?.section?.branch || s.branch?._id || s.branch || s.currentEnrollment?.branch?._id || s.currentEnrollment?.branch || '';
      if (sBranch?.toString() !== modalBranch?.toString()) return false;
    }
    return true;
  });

  // Filter progress lists based on frontend filters
  const filteredProgress = progress.filter(record => {
    const studentInfo = record.student;
    if (!studentInfo) return false;
    
    // Class filter
    if (selectedClass) {
      const sClass = studentInfo.currentEnrollment?.classLevel?._id || studentInfo.currentEnrollment?.classLevel;
      if (sClass !== selectedClass) return false;
    }

    // Branch Filter
    if (selectedBranch) {
      const sBranch = studentInfo.currentEnrollment?.section?.branch?._id || studentInfo.currentEnrollment?.section?.branch || studentInfo.branch?._id || studentInfo.branch || studentInfo.currentEnrollment?.branch?._id || studentInfo.currentEnrollment?.branch || '';
      if (sBranch?.toString() !== selectedBranch?.toString()) return false;
    }

    // Section filter
    if (selectedSectionName) {
      const sSecName = studentInfo.currentEnrollment?.section?.name || '';
      if (selectedSectionName === 'কোন সেকশন নাই') {
        const noSec = sSecName.includes('কোন সেকশন নাই') || sSecName.includes('কোন শাখা নাই') || sSecName.includes('নাই') || sSecName === 'no_section' || sSecName.includes('No Section');
        if (!noSec) return false;
      } else {
        if (!sSecName.startsWith(selectedSectionName) && sSecName !== selectedSectionName) return false;
      }
    }

    // Search query (ID or Name)
    const fullName = `${studentInfo.user?.firstName || ''} ${studentInfo.user?.lastName || ''}`.toLowerCase();
    const studentId = (studentInfo.studentId || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    if (query && !fullName.includes(query) && !studentId.includes(query)) return false;
    
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      {/* Toast Alert */}
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

      <div className="page-header">
        <div>
          <h1 className="page-title">হিফজ অগ্রগতি</h1>
          <p className="page-subtitle">ছাত্রদের দৈনন্দিন সবক, সবকী এবং মনজিলের রেকর্ড</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={16} /> অগ্রগতি যোগ করুন
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-24">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignItems: 'end' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">শ্রেণি ফিল্টার</label>
            <select
              className="form-input form-select"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStudent(''); // Reset student filter
              }}
            >
              <option value="">সকল শ্রেণি (All Classes)</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">সেকশন ফিল্টার</label>
            <select
              className="form-input form-select"
              value={selectedSectionName}
              onChange={(e) => {
                setSelectedSectionName(e.target.value);
                setSelectedStudent(''); // Reset student filter
              }}
            >
              <option value="">সকল সেকশন</option>
              {SECTION_OPTIONS.map((sec, idx) => (
                <option key={idx} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">শাখা ফিল্টার</label>
            <select
              className="form-input form-select"
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedStudent(''); // Reset student filter
              }}
            >
              <option value="">সকল শাখা</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ছাত্র নির্বাচন</label>
            <select
              className="form-input form-select"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">সকল ছাত্র (All Students)</option>
              {filteredStudentsForFilter.map(s => {
                const sName = s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : 'অজানা';
                return (
                  <option key={s._id} value={s._id}>
                    {sName} ({s.studentId})
                  </option>
                );
              })}
            </select>
          </div>


          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">তারিখ ফিল্টার</label>
            <select
              className="form-input form-select"
              value={dateFilterType}
              onChange={(e) => {
                setDateFilterType(e.target.value);
                if (e.target.value !== 'custom') {
                  setDateFilter('');
                }
              }}
            >
              <option value="all">সকল তারিখ (All Dates)</option>
              <option value="today">আজ (Today)</option>
              <option value="custom">নির্দিষ্ট তারিখ (Custom Date)</option>
            </select>
          </div>

        </div>

        {dateFilterType === 'custom' && (
          <div className="form-group mt-12" style={{ maxWidth: '280px', marginBottom: 0 }}>
            <label className="form-label">তারিখ নির্বাচন করুন</label>
            <input 
              type="date" 
              className="form-input" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        )}

        <div className="form-group mt-12" style={{ marginBottom: 0 }}>
          <label className="form-label">নাম বা আইডি দিয়ে খুঁজুন</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="ছাত্রের নাম বা আইডি দিয়ে খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="spinner"></div>
        </div>
      ) : filteredProgress.length === 0 ? (
        <div className="card empty-state">
          <BookOpenCheck size={48} style={{ opacity: 0.3 }} />
          <div className="empty-state-title mt-16">কোনো অগ্রগতি রেকর্ড পাওয়া যায়নি</div>
          <p className="text-muted text-sm mt-4">নতুন অগ্রগতি রেকর্ড যুক্ত করতে উপরে ক্লিক করুন।</p>
        </div>
      ) : (
        <div className="card table-container" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>আইডি / ট্রানজেকশন</th>
                <th>তারিখ</th>
                <th>শ্রেণি ও সেকশন</th>
                <th>ছাত্র আইডি</th>
                <th>ছাত্রের নাম</th>
                <th>সবক (Sabaq)</th>
                <th>সবকী (Sabqi)</th>
                <th>মনজিল (Manzil)</th>
                <th>ভুল সংখ্যা</th>
                <th>মান</th>
                <th>শিক্ষক (Teacher)</th>
                <th>মন্তব্য</th>
                {canManage && <th style={{ width: '120px', textAlign: 'center' }}>অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProgress.map((record) => {
                const sUser = record.student?.user;
                const name = sUser ? `${sUser.firstName || ''} ${sUser.lastName || ''}`.trim() : 'অজানা';
                
                const classNameVal = record.student?.currentEnrollment?.classLevel?.name || '—';
                const sectionNameVal = record.student?.currentEnrollment?.section?.name || '—';
                
                const tName = record.teacher ? `${record.teacher.firstName || ''} ${record.teacher.lastName || ''}`.trim() : '—';
                const txnId = record.transactionId || record._id.slice(-6).toUpperCase();

                return (
                  <tr key={record._id}>
                    <td><span className="badge badge-info" style={{ fontFamily: 'Inter', fontSize: '0.75rem' }}>{txnId}</span></td>
                    <td>{new Date(record.date).toLocaleDateString('bn-BD')}</td>
                    <td><span className="text-sm font-medium">{classNameVal} ({sectionNameVal})</span></td>
                    <td><span className="badge badge-active">{record.student?.studentId || '—'}</span></td>
                    <td className="font-semibold">{name}</td>
                    <td>{record.sabaq}</td>
                    <td>{record.sabqi || '—'}</td>
                    <td>{record.manzil || '—'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'Inter' }}>{record.mistakesCount || 0}</td>
                    <td>
                      <span className={`badge ${
                        record.quality === 'excellent' ? 'badge-active' : 
                        record.quality === 'good' ? 'badge-info' : 
                        record.quality === 'average' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {record.quality === 'excellent' ? 'চমৎকার' : 
                         record.quality === 'good' ? 'ভালো' : 
                         record.quality === 'average' ? 'চলনসই' : 'দুর্বল'}
                      </span>
                    </td>
                    <td><span className="text-sm font-medium text-primary">{tName}</span></td>
                    <td className="text-muted text-sm">{record.remarks || '—'}</td>
                    {canManage && (
                      <td>
                        <div className="flex-center gap-8">
                          <button className="btn btn-ghost btn-sm" onClick={() => handleEditClick(record)} title="সম্পাদনা">
                            <Edit size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(record._id)} title="মুছে ফেলুন">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto',
            padding: '30px', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpenCheck size={22} style={{ color: 'var(--primary)' }} />
              {isEditing ? 'হিফজ অগ্রগতি সম্পাদন করুন' : 'হিফজ অগ্রগতি যোগ করুন'}
            </h2>

            <form onSubmit={handleSubmit} className="flex-column gap-16">
              
              {!isEditing && (
                <div className="grid grid-3" style={{ gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">শ্রেণি ফিল্টার</label>
                    <select
                      className="form-input form-select"
                      value={modalClass}
                      onChange={(e) => {
                        setModalClass(e.target.value);
                        setFormData(prev => ({ ...prev, student: '' }));
                      }}
                    >
                      <option value="">সকল শ্রেণি (All Classes)</option>
                      {classes.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">সেকশন ফিল্টার</label>
                    <select
                      className="form-input form-select"
                      value={modalSectionName}
                      onChange={(e) => {
                        setModalSectionName(e.target.value);
                        setFormData(prev => ({ ...prev, student: '' }));
                      }}
                    >
                      <option value="">সকল সেকশন</option>
                      {SECTION_OPTIONS.map((sec, idx) => (
                        <option key={idx} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">শাখা ফিল্টার</label>
                    <select
                      className="form-input form-select"
                      value={modalBranch}
                      onChange={(e) => {
                        setModalBranch(e.target.value);
                        setFormData(prev => ({ ...prev, student: '' }));
                      }}
                    >
                      <option value="">সকল শাখা</option>
                      {branches.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">ছাত্র নির্বাচন করুন *</label>
                <select 
                  name="student" 
                  className="form-select form-input" 
                  value={formData.student} 
                  onChange={handleInputChange}
                  disabled={isEditing}
                  required
                >
                  <option value="">-- ছাত্র বাছুন --</option>
                  {filteredStudentsForModal.map(s => {
                    const sName = s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : 'অজানা';
                    return (
                      <option key={s._id} value={s._id}>
                        {sName} ({s.studentId})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">তারিখ *</label>
                <input 
                  type="date" 
                  name="date" 
                  className="form-input" 
                  value={formData.date} 
                  onChange={handleInputChange}
                  disabled={isEditing}
                  required
                />
              </div>

              <div className="grid grid-3" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">সবক (Sabaq) *</label>
                  <input 
                    type="text" 
                    name="sabaq" 
                    placeholder="যেমন: সূরা বাকারাহ ১-১০" 
                    className="form-input" 
                    value={formData.sabaq} 
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">সবকী (Sabqi)</label>
                  <input 
                    type="text" 
                    name="sabqi" 
                    placeholder="যেমন: সূরা বাকারাহ" 
                    className="form-input" 
                    value={formData.sabqi} 
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">মনজিল (Manzil)</label>
                  <input 
                    type="text" 
                    name="manzil" 
                    placeholder="যেমন: ১ পারা" 
                    className="form-input" 
                    value={formData.manzil} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">পাঠের মান (Quality)</label>
                  <select 
                    name="quality" 
                    className="form-select form-input" 
                    value={formData.quality} 
                    onChange={handleInputChange}
                  >
                    <option value="excellent">Excellent (চমৎকার)</option>
                    <option value="good">Good (ভালো)</option>
                    <option value="average">Average (চলনসই)</option>
                    <option value="poor">Poor (দুর্বল)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ভুলের সংখ্যা</label>
                  <input 
                    type="number" 
                    name="mistakesCount" 
                    min="0" 
                    className="form-input" 
                    value={formData.mistakesCount} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">মন্তব্য</label>
                <textarea 
                  name="remarks" 
                  rows="3" 
                  placeholder="কোনো অতিরিক্ত মন্তব্য থাকলে লিখুন..." 
                  className="form-input" 
                  value={formData.remarks} 
                  onChange={handleInputChange}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  বাতিল
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : <><Save size={16} /> সংরক্ষণ করুন</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
