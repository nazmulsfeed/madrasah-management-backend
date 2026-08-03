import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, AlertCircle, Save, Users, Plus, Edit, Trash2, X, Settings } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function ClassSubjectsPage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  // Class Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [classForm, setClassForm] = useState({
    name: '',
    code: '',
    order: ''
  });

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    subjectType: 'mandatory',
    isHifzSubject: false
  });

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch initial classes and all subjects
  const fetchData = async () => {
    setLoading(true);
    try {
      const classesRes = await api.get('/students/classes');
      const classList = classesRes.data.data.classes || [];
      setClasses(classList);
      if (classList.length > 0 && !selectedClassId) {
        setSelectedClassId(classList[0]._id);
      }

      const subjectsRes = await api.get('/students/subjects');
      setSubjects(subjectsRes.data.data.subjects || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setToast({ type: 'error', message: 'ডাটা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch subjects of selected class and students in selected class
  useEffect(() => {
    if (!selectedClassId) return;

    // Set selected checkboxes based on current mapping
    const classSubjects = subjects.filter(s => 
      s.classLevels?.some(c => (typeof c === 'object' ? c._id : c) === selectedClassId)
    );
    setSelectedSubjectIds(classSubjects.map(s => s._id));

    // Fetch students of selected class
    const fetchStudentsOfClass = async () => {
      setLoadingStudents(true);
      try {
        const res = await api.get('/students', {
          params: { classLevel: selectedClassId, limit: 100 }
        });
        setStudents(res.data.data || []);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudentsOfClass();
  }, [selectedClassId, subjects]);

  const handleCheckboxChange = (subjectId) => {
    setSelectedSubjectIds(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSaveMapping = async () => {
    if (!selectedClassId) {
      setToast({ type: 'error', message: 'অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/students/class-subjects', {
        classLevelId: selectedClassId,
        subjectIds: selectedSubjectIds
      });

      if (res.data.success) {
        setToast({ type: 'success', message: 'বিষয় ম্যাপিং সফলভাবে সংরক্ষণ করা হয়েছে!' });
        
        // Refresh subjects list
        const subjectsRes = await api.get('/students/subjects');
        setSubjects(subjectsRes.data.data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to save class subjects:', error);
      setToast({ type: 'error', message: 'সংরক্ষণ করতে সমস্যা হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  // Class Level Handlers
  const handleClassFormChange = (e) => {
    setClassForm({ ...classForm, [e.target.name]: e.target.value });
  };

  const handleAddClassClick = () => {
    setClassForm({ name: '', code: '', order: '' });
    setIsEditingClass(false);
    setEditingClassId(null);
    setIsClassModalOpen(true);
  };

  const handleEditClassClick = (cls) => {
    setClassForm({
      name: cls.name,
      code: cls.code,
      order: cls.order || ''
    });
    setIsEditingClass(true);
    setEditingClassId(cls._id);
    setIsClassModalOpen(true);
  };

  const handleDeleteClassClick = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই শ্রেণিটি মুছে ফেলতে চান? এর সাথে সম্পর্কিত বিষয় ম্যাপিংও মুছে যাবে।')) return;
    try {
      const res = await api.delete(`/students/classes/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'শ্রেণি সফলভাবে মুছে ফেলা হয়েছে!' });
        if (selectedClassId === id) {
          setSelectedClassId('');
        }
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete class level:', error);
      setToast({ type: 'error', message: 'শ্রেণি মুছতে সমস্যা হয়েছে' });
    }
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (isEditingClass) {
        res = await api.patch(`/students/classes/${editingClassId}`, classForm);
      } else {
        res = await api.post('/students/classes', classForm);
      }

      if (res.data.success) {
        setToast({
          type: 'success',
          message: isEditingClass ? 'শ্রেণি সফলভাবে আপডেট করা হয়েছে!' : 'শ্রেণি সফলভাবে তৈরি করা হয়েছে!'
        });
        setIsClassModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save class level:', error);
      const errMsg = error.response?.data?.message || 'শ্রেণি সংরক্ষণ করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Subject Creation Handlers
  const handleSubjectFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSubjectForm({
      ...subjectForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEditSubjectClick = (subject) => {
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      subjectType: subject.subjectType || 'mandatory',
      isHifzSubject: !!subject.isHifzSubject
    });
    setIsEditingSubject(true);
    setEditingSubjectId(subject._id);
    setIsSubjectModalOpen(true);
  };

  const handleDeleteSubjectClick = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বিষয়টি মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/students/subjects/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'বিষয় সফলভাবে মুছে ফেলা হয়েছে!' });
        const subjectsRes = await api.get('/students/subjects');
        setSubjects(subjectsRes.data.data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to delete subject:', error);
      setToast({ type: 'error', message: 'বিষয় মুছতে সমস্যা হয়েছে' });
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (isEditingSubject) {
        res = await api.patch(`/students/subjects/${editingSubjectId}`, subjectForm);
      } else {
        const payload = {
          ...subjectForm,
          classLevels: [selectedClassId]
        };
        res = await api.post('/students/subjects', payload);
      }

      if (res.data.success) {
        setToast({ 
          type: 'success', 
          message: isEditingSubject ? 'বিষয় সফলভাবে আপডেট করা হয়েছে!' : 'নতুন বিষয় সফলভাবে তৈরি এবং ম্যাপিং করা হয়েছে!' 
        });
        setIsSubjectModalOpen(false);
        setSubjectForm({ name: '', code: '', subjectType: 'mandatory', isHifzSubject: false });
        setIsEditingSubject(false);
        setEditingSubjectId(null);
        
        // Refresh subjects
        const subjectsRes = await api.get('/students/subjects');
        setSubjects(subjectsRes.data.data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to save subject:', error);
      const errMsg = error.response?.data?.message || 'বিষয় সংরক্ষণ করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClass = classes.find(c => c._id === selectedClassId);
  const mappedSubjects = subjects.filter(s => selectedSubjectIds.includes(s._id));

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
          <h1 className="page-title">শ্রেণি ও বিষয় কনফিগারেশন</h1>
          <p className="page-subtitle">নতুন শ্রেণি তৈরি করুন, বিষয় ম্যাপিং করুন এবং শিক্ষার্থীদের অর্পিত বিষয়সমূহ দেখুন</p>
        </div>
        {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
          <button className="btn btn-primary" onClick={handleAddClassClick}>
            <Plus size={16} /> নতুন শ্রেণি তৈরি
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="grid grid-2" style={{ gap: '24px', alignItems: 'start' }}>
          {/* LEFT PANEL: CLASS MANAGEMENT */}
          <div className="card">
            <h3 className="mb-16" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} className="text-primary" /> শ্রেণিসমূহ
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {classes.length === 0 ? (
                <div className="text-center text-muted py-24">কোনো শ্রেণি পাওয়া যায়নি।</div>
              ) : (
                classes.map(cls => {
                  const isSelected = cls._id === selectedClassId;
                  return (
                    <div 
                      key={cls._id} 
                      onClick={() => setSelectedClassId(cls._id)}
                      style={{ 
                        padding: '14px', 
                        borderRadius: '12px', 
                        background: isSelected ? 'rgba(20, 184, 166, 0.08)' : 'var(--bg-secondary)', 
                        border: isSelected ? '1px solid var(--primary-400)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>
                        <div className="font-semibold text-sm">{cls.name}</div>
                        <div className="text-xs text-muted mt-2">কোড: {cls.code} • ক্রম: {cls.order}</div>
                      </div>
                      
                      {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                        <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ padding: '6px' }}
                            onClick={() => handleEditClassClick(cls)}
                            title="শ্রেণি এডিট"
                          >
                            <Edit size={14} style={{ color: 'var(--primary-400)' }} />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ padding: '6px' }}
                            onClick={() => handleDeleteClassClick(cls._id)}
                            title="শ্রেণি ডিলিট"
                          >
                            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: SUBJECTS & STUDENTS VIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {selectedClassId ? (
              <>
                {/* Subject Mapping Card */}
                <div className="card">
                  <div className="flex-between mb-16" style={{ alignItems: 'center' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                      <BookOpen size={20} className="text-primary" /> {selectedClass?.name} - এর বিষয় ম্যাপিং
                    </h3>
                    {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => {
                          setSubjectForm({ name: '', code: '', subjectType: 'mandatory', isHifzSubject: false });
                          setIsEditingSubject(false);
                          setEditingSubjectId(null);
                          setIsSubjectModalOpen(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Plus size={14} /> নতুন বিষয় তৈরি
                      </button>
                    )}
                  </div>

                  <div className="mb-16">
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="বিষয় খুঁজুন (নাম বা কোড দিয়ে)..." 
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px',
                    border: '1px solid var(--border-color)', maxHeight: '250px', overflowY: 'auto',
                    marginBottom: '20px'
                  }}>
                    {(() => {
                      const filteredSubjects = subjects.filter(s => 
                        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
                        (s.code && s.code.toLowerCase().includes(subjectSearch.toLowerCase()))
                      );

                      if (filteredSubjects.length === 0) {
                        return <div className="text-center text-muted py-16">কোনো বিষয় খুঁজে পাওয়া যায়নি।</div>;
                      }

                      return filteredSubjects.map(s => {
                        const isChecked = selectedSubjectIds.includes(s._id);
                        return (
                          <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 12px', borderRadius: '8px', background: isChecked ? 'rgba(20, 184, 166, 0.04)' : 'transparent' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleCheckboxChange(s._id)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span className="font-semibold text-sm">{s.name}</span>
                                <span className="badge badge-muted text-xs" style={{ padding: '2px 6px' }}>{s.code}</span>
                                {s.classLevels && s.classLevels.length > 0 && (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                                    {s.classLevels.map(c => {
                                      const classObj = typeof c === 'object' ? c : classes.find(cl => cl._id === c);
                                      if (!classObj) return null;
                                      return <span key={classObj._id} className="badge badge-info text-xs" style={{ fontSize: '0.65rem' }}>{classObj.name}</span>;
                                    })}
                                  </div>
                                )}
                              </div>
                            </label>
                            
                            {/* Action Buttons for Subject */}
                            {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  className="btn btn-ghost btn-sm" 
                                  style={{ padding: '4px' }} 
                                  onClick={() => handleEditSubjectClick(s)}
                                  title="বিষয় এডিট"
                                >
                                  <Edit size={14} style={{ color: 'var(--primary-400)' }} />
                                </button>
                                <button 
                                  className="btn btn-ghost btn-sm" 
                                  style={{ padding: '4px' }} 
                                  onClick={() => handleDeleteSubjectClick(s._id)}
                                  title="বিষয় ডিলিট"
                                >
                                  <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="flex justify-end">
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveMapping}
                      disabled={submitting}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Save size={16} /> ম্যাপিং সংরক্ষণ করুন
                    </button>
                  </div>
                </div>

                {/* Students List Card */}
                <div className="card">
                  <h3 className="mb-16" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} className="text-primary" /> {selectedClass?.name} - এর শিক্ষার্থী ও অর্পিত বিষয়সমূহ
                  </h3>

                  {loadingStudents ? (
                    <div className="flex-center py-24">
                      <div className="spinner"></div>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="empty-state py-16">
                      <p className="text-muted text-sm">এই শ্রেণিতে কোনো শিক্ষার্থী ভর্তি নেই।</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                      {students.map(student => {
                        const studentName = student.user?.fullName || `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim();
                        return (
                          <div key={student._id} style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <div className="flex-between">
                              <span className="font-semibold text-sm">{studentName} (রোল: {student.currentEnrollment?.rollNumber || '—'})</span>
                              <span className="text-xs text-muted">আইডি: {student.studentId}</span>
                            </div>
                            <div className="mt-8 pt-6 style={{ borderTop: '1px dotted var(--border-color)' }}">
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {mappedSubjects.length === 0 ? (
                                  <span className="text-xs text-danger">কোনো বিষয় নির্ধারিত নেই</span>
                                ) : (
                                  mappedSubjects.map(sub => (
                                    <span key={sub._id} className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                      {sub.name}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card text-center text-muted py-24">বাম পাশ থেকে একটি শ্রেণি সিলেক্ট করুন।</div>
            )}
          </div>
        </div>
      )}

      {/* CREATE/EDIT CLASS MODAL */}
      {isClassModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsClassModalOpen(false); }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontSize: '1.25rem' }}>{isEditingClass ? 'শ্রেণির তথ্য সংশোধন' : 'নতুন শ্রেণি তৈরি করুন'}</h2>
              <button className="btn-icon" onClick={() => setIsClassModalOpen(false)} type="button">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleClassSubmit}>
              <div className="form-group">
                <label className="form-label">শ্রেণির নাম *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="form-input" 
                  required 
                  value={classForm.name} 
                  onChange={handleClassFormChange} 
                  placeholder="যেমন: একাদশ শ্রেণি" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">শ্রেণির কোড *</label>
                <input 
                  type="text" 
                  name="code" 
                  className="form-input" 
                  required 
                  value={classForm.code} 
                  onChange={handleClassFormChange} 
                  placeholder="যেমন: CLASS_11" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">ক্রম (Order/Serial Number)</label>
                <input 
                  type="number" 
                  name="order" 
                  className="form-input" 
                  value={classForm.order} 
                  onChange={handleClassFormChange} 
                  placeholder="যেমন: 11" 
                />
              </div>

              <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsClassModalOpen(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {isSubjectModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsSubjectModalOpen(false); }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontSize: '1.25rem' }}>{isEditingSubject ? 'বিষয়ের তথ্য সংশোধন' : `${selectedClass?.name} - এ নতুন বিষয় যুক্ত করুন`}</h2>
              <button className="btn-icon" onClick={() => setIsSubjectModalOpen(false)} type="button">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubjectSubmit}>
              <div className="form-group">
                <label className="form-label">বিষয়ের নাম *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="form-input" 
                  required 
                  value={subjectForm.name} 
                  onChange={handleSubjectFormChange} 
                  placeholder="যেমন: উর্দু সাহিত্য" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">বিষয় কোড (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  name="code" 
                  className="form-input" 
                  value={subjectForm.code} 
                  onChange={handleSubjectFormChange} 
                  placeholder="যেমন: ENG-1 (যদি দিতে চান)" 
                />
              </div>

              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">বিষয়ের ধরন</label>
                  <select 
                    name="subjectType" 
                    className="form-input form-select" 
                    value={subjectForm.subjectType} 
                    onChange={handleSubjectFormChange}
                  >
                    <option value="mandatory">বাধ্যতামূলক (Mandatory)</option>
                    <option value="optional">ঐচ্ছিক (Optional)</option>
                    <option value="practical">ব্যবহারিক (Practical)</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '20px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '12px' }}>
                    <input 
                      type="checkbox" 
                      name="isHifzSubject" 
                      checked={subjectForm.isHifzSubject} 
                      onChange={handleSubjectFormChange} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>এটি হিফজ বিষয়</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsSubjectModalOpen(false)}>বাতিল</button>
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
