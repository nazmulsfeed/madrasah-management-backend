import { useState, useEffect } from 'react';
import { BookOpen, Plus, Clock, Calendar, Edit, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function AcademicsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Academic Year State
  const [academicYears, setAcademicYears] = useState([]);
  const [isAYModalOpen, setIsAYModalOpen] = useState(false);
  const [aySubmitting, setAYSubmitting] = useState(false);
  const [editAYId, setEditAYId] = useState(null);
  const [ayForm, setAYForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  });

  // Subjects Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subjectType: 'mandatory',
    isHifzSubject: false,
    classLevels: []
  });

  // Timetable State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [timetable, setTimetable] = useState({});
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [editTimetableIndex, setEditTimetableIndex] = useState(null);
  const [timetableForm, setTimetableForm] = useState({
    time: '',
    sat: { subject: '', teacher: '' },
    sun: { subject: '', teacher: '' },
    mon: { subject: '', teacher: '' },
    tue: { subject: '', teacher: '' },
    wed: { subject: '', teacher: '' },
    thu: { subject: '', teacher: '' }
  });

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [editCalendarMonth, setEditCalendarMonth] = useState('');
  const [editCalendarEventIndex, setEditCalendarEventIndex] = useState(null);
  const [calendarForm, setCalendarForm] = useState({
    month: 'জানুয়ারি',
    event: ''
  });

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch subjects, classes, and teachers
  const fetchSubjects = async () => {
    try {
      const res = await api.get('/students/subjects');
      if (res.data.success) {
        setSubjects(res.data.data.subjects || []);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setToast({ type: 'error', message: 'বিষয়ের তালিকা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/students/classes');
      if (res.data.success) {
        const classList = res.data.data.classes || [];
        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClassId(classList[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/teachers', { params: { limit: 100 } });
      if (res.data.success) {
        setTeachers(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/students/academic-years');
      if (res.data.success) {
        setAcademicYears(res.data.data.academicYears || []);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  // Initialize Timetable and Calendar from LocalStorage
  useEffect(() => {
    fetchSubjects();
    fetchClasses();
    fetchTeachers();
    fetchAcademicYears();

    // Timetable Initialization
    const savedTimetable = localStorage.getItem('timetable_data');
    if (savedTimetable) {
      try {
        setTimetable(JSON.parse(savedTimetable));
      } catch (e) {
        console.error(e);
      }
    }

    // Calendar Initialization
    const savedCalendar = localStorage.getItem('calendar_data');
    if (savedCalendar) {
      try {
        setCalendarEvents(JSON.parse(savedCalendar));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultCalendar = [
        { month: 'জানুয়ারি', events: ['০১ - নতুন বছর শুরু', '১৫ - ভর্তি পরীক্ষা'] },
        { month: 'ফেব্রুয়ারি', events: ['২১ - ভাষা দিবস ছুটি'] },
        { month: 'মার্চ', events: ['২৬ - স্বাধীনতা দিবস ছুটি'] },
        { month: 'এপ্রিল', events: ['০১ - প্রথম সাময়িক পরীক্ষা শুরু', '১৪ - বাংলা নববর্ষ ছুটি'] },
        { month: 'জুন', events: ['গ্রীষ্মকালীন ছুটি'] },
        { month: 'ডিসেম্বর', events: ['০১ - বার্ষিক পরীক্ষা শুরু', '১৬ - বিজয় দিবস ছুটি'] },
      ];
      setCalendarEvents(defaultCalendar);
      localStorage.setItem('calendar_data', JSON.stringify(defaultCalendar));
    }
  }, []);

  // Sync Timetable and Calendar to LocalStorage
  const saveTimetableToLocalStorage = (data) => {
    setTimetable(data);
    localStorage.setItem('timetable_data', JSON.stringify(data));
  };

  const saveCalendarToLocalStorage = (data) => {
    setCalendarEvents(data);
    localStorage.setItem('calendar_data', JSON.stringify(data));
  };

  // Subject Form Handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleClassCheckboxChange = (classId) => {
    setFormData(prev => {
      const classLevels = prev.classLevels.includes(classId)
        ? prev.classLevels.filter(id => id !== classId)
        : [...prev.classLevels, classId];
      return { ...prev, classLevels };
    });
  };

  const handleEditSubject = (sub) => {
    setEditSubjectId(sub._id);
    setFormData({
      name: sub.name,
      code: sub.code,
      subjectType: sub.subjectType || 'mandatory',
      isHifzSubject: !!sub.isHifzSubject,
      classLevels: sub.classLevels?.map(c => typeof c === 'object' ? c._id : c) || []
    });
    setIsModalOpen(true);
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বিষয়টি মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/students/subjects/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'বিষয় সফলভাবে মুছে ফেলা হয়েছে!' });
        fetchSubjects();
      }
    } catch (error) {
      console.error('Failed to delete subject', error);
      setToast({ type: 'error', message: 'বিষয় মুছতে সমস্যা হয়েছে' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (editSubjectId) {
        res = await api.patch(`/students/subjects/${editSubjectId}`, formData);
      } else {
        res = await api.post('/students/subjects', formData);
      }
      
      if (res.data.success) {
        setIsModalOpen(false);
        setEditSubjectId(null);
        setFormData({
          name: '',
          code: '',
          subjectType: 'mandatory',
          isHifzSubject: false,
          classLevels: []
        });
        setToast({ 
          type: 'success', 
          message: editSubjectId ? 'বিষয় সফলভাবে আপডেট করা হয়েছে!' : 'বিষয় সফলভাবে তৈরি করা হয়েছে!' 
        });
        fetchSubjects();
      }
    } catch (error) {
      console.error('Failed to save subject', error);
      setToast({ type: 'error', message: 'বিষয় সংরক্ষণ করতে সমস্যা হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditSubjectId(null);
    setFormData({
      name: '',
      code: '',
      subjectType: 'mandatory',
      isHifzSubject: false,
      classLevels: []
    });
  };

  const handleAYSubmit = async (e) => {
    e.preventDefault();
    setAYSubmitting(true);
    try {
      let res;
      if (editAYId) {
        res = await api.patch(`/students/academic-years/${editAYId}`, ayForm);
      } else {
        res = await api.post('/students/academic-years', ayForm);
      }
      if (res.data.success) {
        setIsAYModalOpen(false);
        setEditAYId(null);
        setAYForm({ name: '', startDate: '', endDate: '', isCurrent: false });
        setToast({
          type: 'success',
          message: editAYId ? 'শিক্ষাবর্ষ সফলভাবে আপডেট করা হয়েছে!' : 'শিক্ষাবর্ষ সফলভাবে তৈরি করা হয়েছে!'
        });
        fetchAcademicYears();
      }
    } catch (error) {
      console.error('Failed to save academic year', error);
      setToast({ type: 'error', message: 'শিক্ষাবর্ষ সংরক্ষণ করতে সমস্যা হয়েছে' });
    } finally {
      setAYSubmitting(false);
    }
  };

  const handleAYDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই শিক্ষাবর্ষটি মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/students/academic-years/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'শিক্ষাবর্ষ সফলভাবে মুছে ফেলা হয়েছে!' });
        fetchAcademicYears();
      }
    } catch (error) {
      console.error('Failed to delete academic year', error);
      setToast({ type: 'error', message: 'শিক্ষাবর্ষ মুছতে সমস্যা হয়েছে' });
    }
  };

  const handleAYToggleCurrent = async (id, isCurrent) => {
    if (isCurrent) return;
    try {
      const res = await api.patch(`/students/academic-years/${id}`, { isCurrent: true });
      if (res.data.success) {
        setToast({ type: 'success', message: 'চলতি শিক্ষাবর্ষ পরিবর্তন করা হয়েছে!' });
        fetchAcademicYears();
      }
    } catch (error) {
      console.error('Failed to toggle current academic year', error);
      setToast({ type: 'error', message: 'চলতি শিক্ষাবর্ষ পরিবর্তন করতে সমস্যা হয়েছে' });
    }
  };

  const getDefaultTimetable = () => [
    { time: '০৮:০০ - ০৮:৪৫', sat: 'কুরআন', sun: 'হাদিস', mon: 'কুরআন', tue: 'ফিকহ', wed: 'কুরআন', thu: 'আরবি' },
    { time: '০৮:৪৫ - ০৯:৩০', sat: 'আরবি', sun: 'কুরআন', mon: 'হাদিস', tue: 'কুরআন', wed: 'আরবি', thu: 'হাদিস' },
    { time: '০৯:৩০ - ১০:১৫', sat: 'বাংলা', sun: 'গণিত', mon: 'ইংরেজি', tue: 'বাংলা', wed: 'গণিত', thu: 'বিজ্ঞান' },
    { time: '১০:৩০ - ১১:১৫', sat: 'গণিত', sun: 'ইংরেজি', mon: 'বাংলা', tue: 'গণিত', wed: 'বিজ্ঞান', thu: 'বাংলা' },
    { time: '১১:১৫ - ১২:০০', sat: 'ইংরেজি', sun: 'বিজ্ঞান', mon: 'গণিত', tue: 'ইংরেজি', wed: 'বাংলা', thu: 'গণিত' },
  ];

  // Timetable Handlers
  const handleEditTimetable = (index, row) => {
    setEditTimetableIndex(index);
    // Ensure all days have the object structure for subject and teacher
    const formattedRow = {
      time: row.time,
      sat: typeof row.sat === 'object' ? { ...row.sat } : { subject: row.sat || '', teacher: '' },
      sun: typeof row.sun === 'object' ? { ...row.sun } : { subject: row.sun || '', teacher: '' },
      mon: typeof row.mon === 'object' ? { ...row.mon } : { subject: row.mon || '', teacher: '' },
      tue: typeof row.tue === 'object' ? { ...row.tue } : { subject: row.tue || '', teacher: '' },
      wed: typeof row.wed === 'object' ? { ...row.wed } : { subject: row.wed || '', teacher: '' },
      thu: typeof row.thu === 'object' ? { ...row.thu } : { subject: row.thu || '', teacher: '' }
    };
    setTimetableForm(formattedRow);
    setIsTimetableModalOpen(true);
  };

  const handleDeleteTimetable = (index) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই রুটিন স্লটটি মুছে ফেলতে চান?')) return;
    const currentList = timetable[selectedClassId] !== undefined
      ? [...timetable[selectedClassId]]
      : getDefaultTimetable();
    currentList.splice(index, 1);
    const updated = { ...timetable, [selectedClassId]: currentList };
    saveTimetableToLocalStorage(updated);
    setToast({ type: 'success', message: 'রুটিন স্লট সফলভাবে মুছে ফেলা হয়েছে!' });
  };

  const handleTimetableSubmit = (e) => {
    e.preventDefault();
    if (!timetableForm.time) {
      setToast({ type: 'error', message: 'সময় রুটিনের জন্য আবশ্যক' });
      return;
    }

    const currentList = timetable[selectedClassId] !== undefined
      ? [...timetable[selectedClassId]]
      : getDefaultTimetable();

    if (editTimetableIndex !== null) {
      currentList[editTimetableIndex] = timetableForm;
    } else {
      currentList.push(timetableForm);
    }

    const updated = { ...timetable, [selectedClassId]: currentList };
    saveTimetableToLocalStorage(updated);
    setIsTimetableModalOpen(false);
    setEditTimetableIndex(null);
    setTimetableForm({
      time: '',
      sat: { subject: '', teacher: '' },
      sun: { subject: '', teacher: '' },
      mon: { subject: '', teacher: '' },
      tue: { subject: '', teacher: '' },
      wed: { subject: '', teacher: '' },
      thu: { subject: '', teacher: '' }
    });
    setToast({ type: 'success', message: 'রুটিন সফলভাবে সংরক্ষণ করা হয়েছে!' });
  };

  const handleCloseTimetableModal = () => {
    setIsTimetableModalOpen(false);
    setEditTimetableIndex(null);
    setTimetableForm({
      time: '',
      sat: { subject: '', teacher: '' },
      sun: { subject: '', teacher: '' },
      mon: { subject: '', teacher: '' },
      tue: { subject: '', teacher: '' },
      wed: { subject: '', teacher: '' },
      thu: { subject: '', teacher: '' }
    });
  };

  // Calendar Handlers
  const handleCalendarChange = (e) => {
    setCalendarForm({ ...calendarForm, [e.target.name]: e.target.value });
  };

  const handleEditCalendarEvent = (month, index, eventText) => {
    setEditCalendarMonth(month);
    setEditCalendarEventIndex(index);
    setCalendarForm({
      month: month,
      event: eventText
    });
    setIsCalendarModalOpen(true);
  };

  const handleDeleteCalendarEvent = (month, index) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ইভেন্টটি মুছে ফেলতে চান?')) return;
    const updated = calendarEvents.map(m => {
      if (m.month === month) {
        const events = [...m.events];
        events.splice(index, 1);
        return { ...m, events };
      }
      return m;
    }).filter(m => m.events.length > 0);
    
    saveCalendarToLocalStorage(updated);
    setToast({ type: 'success', message: 'ক্যালেন্ডার ইভেন্ট সফলভাবে মুছে ফেলা হয়েছে!' });
  };

  const handleCalendarSubmit = (e) => {
    e.preventDefault();
    if (!calendarForm.event) {
      setToast({ type: 'error', message: 'ইভেন্ট বিবরণ আবশ্যক' });
      return;
    }

    let updated = [];
    if (editCalendarMonth) {
      updated = calendarEvents.map(m => {
        if (m.month === editCalendarMonth) {
          const events = [...m.events];
          if (editCalendarEventIndex !== null) {
            events[editCalendarEventIndex] = calendarForm.event;
          }
          return { ...m, events };
        }
        return m;
      });
    } else {
      const monthExists = calendarEvents.some(m => m.month === calendarForm.month);
      if (monthExists) {
        updated = calendarEvents.map(m => {
          if (m.month === calendarForm.month) {
            return { ...m, events: [...m.events, calendarForm.event] };
          }
          return m;
        });
      } else {
        updated = [...calendarEvents, { month: calendarForm.month, events: [calendarForm.event] }];
      }
    }

    const monthOrder = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    updated.sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    saveCalendarToLocalStorage(updated);
    setIsCalendarModalOpen(false);
    setEditCalendarMonth('');
    setEditCalendarEventIndex(null);
    setCalendarForm({ month: 'জানুয়ারি', event: '' });
    setToast({ type: 'success', message: 'ক্যালেন্ডার ইভেন্ট সফলভাবে সংরক্ষণ করা হয়েছে!' });
  };

  const handleCloseCalendarModal = () => {
    setIsCalendarModalOpen(false);
    setEditCalendarMonth('');
    setEditCalendarEventIndex(null);
    setCalendarForm({ month: 'জানুয়ারি', event: '' });
  };

  // Get current timetable list
  const getCurrentTimetable = () => {
    const list = timetable[selectedClassId];
    if (list === undefined) {
      return getDefaultTimetable();
    }
    return list;
  };

  const renderTimetableCell = (cell) => {
    if (typeof cell === 'object' && cell !== null && cell.subject) {
      return (
        <div>
          <div className="font-semibold">{cell.subject}</div>
          {cell.teacher && <div className="text-xs text-muted" style={{ marginTop: '2px' }}>{cell.teacher}</div>}
        </div>
      );
    }
    return typeof cell === 'string' ? cell : '—';
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
          <h1 className="page-title">একাডেমিক</h1>
          <p className="page-subtitle">বিষয়, সিলেবাস এবং ক্লাস রুটিন ব্যবস্থাপনা</p>
        </div>
        {activeTab === 'subjects' && ['super_admin', 'admin', 'principal'].includes(user?.userType) && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> নতুন বিষয় তৈরি
          </button>
        )}
        {activeTab === 'timetable' && ['super_admin', 'admin', 'principal'].includes(user?.userType) && (
          <button className="btn btn-primary" onClick={() => setIsTimetableModalOpen(true)}>
            <Plus size={16} /> নতুন রুটিন স্লট
          </button>
        )}
        {activeTab === 'calendar' && ['super_admin', 'admin', 'principal'].includes(user?.userType) && (
          <button className="btn btn-primary" onClick={() => setIsCalendarModalOpen(true)}>
            <Plus size={16} /> নতুন ইভেন্ট যুক্ত করুন
          </button>
        )}
        {activeTab === 'academicYears' && ['super_admin', 'admin', 'principal'].includes(user?.userType) && (
          <button className="btn btn-primary" onClick={() => setIsAYModalOpen(true)}>
            <Plus size={16} /> নতুন শিক্ষাবর্ষ যুক্ত করুন
          </button>
        )}
      </div>

      {/* ট্যাব */}
      <div className="flex gap-8 mb-24">
        {[
          { key: 'subjects', label: 'বিষয়সমূহ', icon: BookOpen },
          { key: 'timetable', label: 'ক্লাস রুটিন', icon: Clock },
          { key: 'calendar', label: 'একাডেমিক ক্যালেন্ডার', icon: Calendar },
          { key: 'academicYears', label: 'শিক্ষাবর্ষ', icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'subjects' && (
        loading ? (
          <div className="card flex-center" style={{ padding: '60px' }}>
            <div className="spinner"></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="card empty-state">
            <BookOpen size={48} style={{ opacity: 0.3 }} />
            <div className="empty-state-title mt-16">কোনো বিষয় পাওয়া যায়নি</div>
            <p className="text-muted mt-8">এখনও কোনো বিষয় যুক্ত করা হয়নি।</p>
          </div>
        ) : (
          <div className="card table-container" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>কোড</th>
                  <th>বিষয়ের নাম</th>
                  <th>ধরন</th>
                  <th>প্রযোজ্য শ্রেণি</th>
                  {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                    <th style={{ width: '150px', textAlign: 'center' }}>অ্যাকশন</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub) => (
                  <tr key={sub._id}>
                    <td><span className="badge badge-active">{sub.code}</span></td>
                    <td className="font-semibold">{sub.name} {sub.isHifzSubject && <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 6px', marginLeft: '6px' }}>হিফজ</span>}</td>
                    <td>
                      <span className={`badge ${sub.subjectType === 'mandatory' ? 'badge-active' : 'badge-warning'}`}>
                        {sub.subjectType === 'mandatory' ? 'বাধ্যতামূলক' : sub.subjectType === 'optional' ? 'ঐচ্ছিক' : 'ব্যবহারিক'}
                      </span>
                    </td>
                    <td className="text-muted">
                      {sub.classLevels && sub.classLevels.length > 0 
                        ? sub.classLevels.map(c => c.name).join(', ') 
                        : 'সকল শ্রেণি'}
                    </td>
                    {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                      <td>
                        <div className="flex-center gap-8">
                          <button className="btn btn-ghost btn-sm" onClick={() => handleEditSubject(sub)} title="সম্পাদনা">
                            <Edit size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteSubject(sub._id)} title="মুছে ফেলুন">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === 'timetable' && (
        <div className="card table-container">
          <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <h3>ক্লাস রুটিন — {classes.find(c => c._id === selectedClassId)?.name || 'লোডিং...'}</h3>
            <select 
              className="form-input" 
              style={{ width: 'auto', marginBottom: 0 }}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>সময়</th>
                <th>শনি</th>
                <th>রবি</th>
                <th>সোম</th>
                <th>মঙ্গল</th>
                <th>বুধ</th>
                <th>বৃহ</th>
                {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                  <th style={{ width: '150px', textAlign: 'center' }}>অ্যাকশন</th>
                )}
              </tr>
            </thead>
            <tbody>
              {getCurrentTimetable().map((row, i) => (
                <tr key={i}>
                  <td className="font-semibold text-primary">{row.time}</td>
                  <td>{renderTimetableCell(row.sat)}</td>
                  <td>{renderTimetableCell(row.sun)}</td>
                  <td>{renderTimetableCell(row.mon)}</td>
                  <td>{renderTimetableCell(row.tue)}</td>
                  <td>{renderTimetableCell(row.wed)}</td>
                  <td>{renderTimetableCell(row.thu)}</td>
                  {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                    <td>
                      <div className="flex-center gap-8">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEditTimetable(i, row)} title="সম্পাদনা">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteTimetable(i)} title="মুছে ফেলুন">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="grid grid-2">
          {calendarEvents.map((m) => (
            <div key={m.month} className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="text-primary mb-16" style={{ fontSize: '1.125rem' }}>{m.month}</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {m.events.map((ev, i) => (
                  <div key={i} className="flex gap-8" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-500)', flexShrink: 0 }}></div>
                      <span className="text-sm">{ev}</span>
                    </div>
                    {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                      <div className="flex gap-4">
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => handleEditCalendarEvent(m.month, i, ev)} title="সম্পাদনা">
                          <Edit size={12} />
                        </button>
                        <button className="btn btn-ghost btn-sm text-danger" style={{ padding: '2px 6px' }} onClick={() => handleDeleteCalendarEvent(m.month, i)} title="মুছে ফেলুন">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'academicYears' && (
        <div className="card table-container" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>শিক্ষাবর্ষের নাম</th>
                <th>শুরুর তারিখ</th>
                <th>শেষের তারিখ</th>
                <th>অবস্থা (Status)</th>
                {['super_admin', 'admin', 'principal'].includes(user?.userType) && <th style={{ width: '150px', textAlign: 'center' }}>অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody>
              {academicYears.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }} className="text-muted">
                    কোনো শিক্ষাবর্ষ পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                academicYears.map(ay => (
                  <tr key={ay._id}>
                    <td style={{ fontWeight: '600' }}>{ay.name}</td>
                    <td>{new Date(ay.startDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    <td>{new Date(ay.endDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    <td>
                      <span className={`badge ${ay.isCurrent ? 'badge-success' : 'badge-secondary'}`} style={{ cursor: 'pointer' }} onClick={() => handleAYToggleCurrent(ay._id, ay.isCurrent)}>
                        {ay.isCurrent ? 'চলতি শিক্ষাবর্ষ' : 'সাধারণ শিক্ষাবর্ষ (ক্লিক করে চলতি করুন)'}
                      </span>
                    </td>
                    {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                      <td>
                        <div className="flex-center gap-8">
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setEditAYId(ay._id);
                            setAYForm({
                              name: ay.name,
                              startDate: ay.startDate.split('T')[0],
                              endDate: ay.endDate.split('T')[0],
                              isCurrent: ay.isCurrent
                            });
                            setIsAYModalOpen(true);
                          }}>
                            <Edit size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleAYDelete(ay._id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create or Edit Subject Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '520px', margin: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontSize: '1.25rem' }}>{editSubjectId ? 'বিষয়ের তথ্য সম্পাদন' : 'নতুন বিষয় যুক্ত করুন'}</h2>
              <button className="btn-icon" onClick={handleCloseModal} type="button">
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">विषয়ের নাম *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="form-input" 
                  required 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="যেমন: আল-আকাইদ ওয়াল-ফিকহ" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">বিষয় কোড *</label>
                <input 
                  type="text" 
                  name="code" 
                  className="form-input" 
                  required 
                  value={formData.code} 
                  onChange={handleChange} 
                  placeholder="যেমন: AQF" 
                />
              </div>

              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">বিষয়ের ধরন</label>
                  <select 
                    name="subjectType" 
                    className="form-input form-select" 
                    value={formData.subjectType} 
                    onChange={handleChange}
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
                      checked={formData.isHifzSubject} 
                      onChange={handleChange} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>এটি হিফজ বিষয়</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">প্রযোজ্য শ্রেণি (কোনোটি সিলেক্ট না করলে 'সকল শ্রেণি' বোঝাবে)</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px',
                  background: 'var(--bg-input)', padding: '12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', maxHeight: '150px', overflowY: 'auto'
                }}>
                  {classes.map(c => {
                    const isChecked = formData.classLevels.includes(c._id);
                    return (
                      <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleClassCheckboxChange(c._id)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>বাতিল</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create or Edit Timetable Modal */}
      {isTimetableModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseTimetableModal(); }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '700px', margin: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontSize: '1.25rem' }}>{editTimetableIndex !== null ? 'রুটিন তথ্য সম্পাদন' : 'নতুন রুটিন স্লট যুক্ত করুন'}</h2>
              <button className="btn-icon" onClick={handleCloseTimetableModal} type="button">
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <form onSubmit={handleTimetableSubmit}>
              <div className="form-group">
                <label className="form-label">সময় স্লট *</label>
                <input 
                  type="text" 
                  name="time" 
                  className="form-input" 
                  required 
                  value={timetableForm.time} 
                  onChange={(e) => setTimetableForm({ ...timetableForm, time: e.target.value })} 
                  placeholder="যেমন: ০৮:০০ - ০৮:৪৫" 
                />
              </div>

              <h4 className="mb-12 text-primary" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>দিন ভিত্তিক বিষয় ও শিক্ষক নির্বাচন</h4>

              {/* Saturday to Thursday Rows */}
              {['sat', 'sun', 'mon', 'tue', 'wed', 'thu'].map(day => {
                const dayLabel = day === 'sat' ? 'শনিবার (Sat)' :
                                 day === 'sun' ? 'রবিবার (Sun)' :
                                 day === 'mon' ? 'সোমবার (Mon)' :
                                 day === 'tue' ? 'মঙ্গলবার (Tue)' :
                                 day === 'wed' ? 'বুধবার (Wed)' : 'বৃহস্পতিবার (Thu)';
                
                return (
                  <div key={day} className="grid grid-3" style={{ gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                    <div className="font-semibold text-sm">{dayLabel}</div>
                    <select
                      className="form-input form-select"
                      style={{ marginBottom: 0 }}
                      value={timetableForm[day]?.subject || ''}
                      onChange={(e) => setTimetableForm({
                        ...timetableForm,
                        [day]: { ...timetableForm[day], subject: e.target.value }
                      })}
                    >
                      <option value="">বিষয় নির্বাচন করুন</option>
                      {subjects.map(s => (
                        <option key={s._id} value={s.name}>{s.name}</option>
                      ))}
                    </select>

                    <select
                      className="form-input form-select"
                      style={{ marginBottom: 0 }}
                      value={timetableForm[day]?.teacher || ''}
                      onChange={(e) => setTimetableForm({
                        ...timetableForm,
                        [day]: { ...timetableForm[day], teacher: e.target.value }
                      })}
                    >
                      <option value="">শিক্ষক নির্বাচন করুন</option>
                      {teachers.map(t => {
                        const name = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim();
                        return <option key={t._id} value={name}>{name} ({t.employeeId})</option>;
                      })}
                    </select>
                  </div>
                );
              })}

              <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseTimetableModal}>বাতিল</button>
                <button type="submit" className="btn btn-primary">সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create or Edit Calendar Modal */}
      {isCalendarModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseCalendarModal(); }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontSize: '1.25rem' }}>{editCalendarEventIndex !== null ? 'ইভেন্ট বিবরণ সম্পাদন' : 'নতুন ক্যালেন্ডার ইভেন্ট'}</h2>
              <button className="btn-icon" onClick={handleCloseCalendarModal} type="button">
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <form onSubmit={handleCalendarSubmit}>
              <div className="form-group">
                <label className="form-label">মাস</label>
                <select 
                  name="month" 
                  className="form-input form-select" 
                  disabled={editCalendarMonth !== ''}
                  value={calendarForm.month} 
                  onChange={handleCalendarChange}
                >
                  {['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ইভেন্টের নাম / বিবরণ *</label>
                <input 
                  type="text" 
                  name="event" 
                  className="form-input" 
                  required 
                  value={calendarForm.event} 
                  onChange={handleCalendarChange} 
                  placeholder="যেমন: ১৬ - বিজয় দিবস ছুটি" 
                />
              </div>

              <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseCalendarModal}>বাতিল</button>
                <button type="submit" className="btn btn-primary">সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Academic Year Modal */}
      {isAYModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setIsAYModalOpen(false); setEditAYId(null); setAYForm({ name: '', startDate: '', endDate: '', isCurrent: false }); } }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
            <div className="flex-between mb-24">
              <h3 style={{ fontSize: '1.25rem' }}>{editAYId ? 'শিক্ষাবর্ষ সম্পাদন করুন' : 'নতুন শিক্ষাবর্ষ যুক্ত করুন'}</h3>
              <button className="btn-icon" onClick={() => {
                setIsAYModalOpen(false);
                setEditAYId(null);
                setAYForm({ name: '', startDate: '', endDate: '', isCurrent: false });
              }} type="button">
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <form onSubmit={handleAYSubmit}>
              <div className="form-group mb-16">
                <label className="form-label">শিক্ষাবর্ষের নাম (যেমন: ২০২৭ শিক্ষাবর্ষ) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="যেমন: ২০২৭ শিক্ষাবর্ষ"
                  value={ayForm.name}
                  onChange={e => setAYForm({ ...ayForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group mb-16">
                <label className="form-label">শুরুর তারিখ *</label>
                <input
                  type="date"
                  className="form-input"
                  value={ayForm.startDate}
                  onChange={e => setAYForm({ ...ayForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group mb-16">
                <label className="form-label">শেষের তারিখ *</label>
                <input
                  type="date"
                  className="form-input"
                  value={ayForm.endDate}
                  onChange={e => setAYForm({ ...ayForm, endDate: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center gap-8 mt-16 mb-24">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={ayForm.isCurrent}
                  onChange={e => setAYForm({ ...ayForm, isCurrent: e.target.checked })}
                />
                <label htmlFor="isCurrent" className="form-label mb-0" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  এটিই চলতি শিক্ষাবর্ষ (Current Academic Year) হিসেবে সেট করুন
                </label>
              </div>
              <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsAYModalOpen(false);
                    setEditAYId(null);
                    setAYForm({ name: '', startDate: '', endDate: '', isCurrent: false });
                  }}
                >
                  বাতিল
                </button>
                <button type="submit" className="btn btn-primary" disabled={aySubmitting}>
                  {aySubmitting ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
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
