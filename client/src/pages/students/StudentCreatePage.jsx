import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, GraduationCap, Save, CheckCircle, 
  AlertCircle, Loader, User, BookOpen, Key, Calendar 
} from 'lucide-react';
import api from '../../api/axios';
import { SECTION_OPTIONS } from '../../utils/constants';

export default function StudentCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Dropdown lists
  const [academicYears, setAcademicYears] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [stream, setStream] = useState('noorani'); // 'noorani' or 'hifz'


  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    admissionNumber: '',
    studentId: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    admissionDate: new Date().toISOString().split('T')[0],
    classLevelId: '',
    sectionId: '',
    academicYearId: '',
    rollNumber: '',
    branchId: '',
    residentialStatus: 'non-residential',
    hifzProgramType: '',
    department: ''
  });

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load initial dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [yearsRes, classesRes, branchesRes] = await Promise.all([
          api.get('/students/academic-years'),
          api.get('/students/classes'),
          api.get('/students/branches')
        ]);
        if (yearsRes.data.success) {
          const list = yearsRes.data.data.academicYears || [];
          setAcademicYears(list);
          // Auto select current year
          const currentYear = list.find(y => y.isCurrent);
          if (currentYear) {
            setFormData(prev => ({ ...prev, academicYearId: currentYear._id }));
          }
        }
        if (classesRes.data.success) {
          setClassLevels(classesRes.data.data.classes || []);
        }
        if (branchesRes.data.success) {
          const list = branchesRes.data.data.branches || [];
          setBranches(list);
          if (list.length > 0) {
            setFormData(prev => ({ ...prev, branchId: list[0]._id }));
          }
        }
      } catch (err) {
        console.error('Failed to load dropdowns', err);
      }
    };
    fetchDropdowns();
  }, []);

  // Automatically select the DB branch (Boys/Girls Branch) based on selected gender
  useEffect(() => {
    if (branches.length > 0) {
      const match = branches.find(b => 
        formData.gender === 'male' ? b.name.includes('বালক') : b.name.includes('বালিকা')
      );
      if (match) {
        setFormData(prev => ({ ...prev, branchId: match._id }));
      }
    }
  }, [formData.gender, branches]);

  const handleStreamChange = (val) => {
    setStream(val);
    setFormData(prev => ({ 
      ...prev, 
      classLevelId: '', 
      sectionId: '', 
      rollNumber: '',
      hifzProgramType: val === 'hifz' ? 'only_hifz' : ''
    }));
  };

  const filteredClassLevels = (() => {
    const filtered = classLevels.filter(c => {
      const name = c.name || '';
      const isHifz = name.includes('হিফজ') || name.includes('নাজেরা') || name.includes('শুনানী') || name.includes('মুসাবাকাহ');
      const isNoorani = name.includes('নুরানি') || name.includes('নুরানী') || name.includes('প্লে') || name.includes('নার্সারী');
      
      if (stream === 'noorani') {
        return isNoorani || !isHifz;
      } else {
        return isHifz;
      }
    });
    return filtered.length > 0 ? filtered : classLevels;
  })();

  // Automatically update sectionId when it is missing
  useEffect(() => {
    if (!formData.sectionId) {
      setFormData(prev => ({ ...prev, sectionId: '' }));
    }
  }, []);

  // Dynamically load next roll number when classLevelId, sectionId, or academicYearId changes
  useEffect(() => {
    if (!formData.classLevelId || !formData.sectionId || !formData.academicYearId) {
      return;
    }

    const fetchNextRoll = async () => {
      try {
        const res = await api.get(`/students/next-roll?classLevelId=${formData.classLevelId}&sectionId=${formData.sectionId}&academicYearId=${formData.academicYearId}`);
        if (res.data.success) {
          const nextRoll = res.data.data.nextRollNumber;
          setFormData(prev => ({ ...prev, rollNumber: String(nextRoll) }));
        }
      } catch (err) {
        console.error('Failed to load next roll number', err);
      }
    };
    fetchNextRoll();
  }, [formData.classLevelId, formData.sectionId, formData.academicYearId]);

  // Auto-generate username from email or studentId if empty on blur
  const handleAutoFill = () => {
    if (!formData.username) {
      if (formData.studentId) {
        setFormData(prev => ({ ...prev, username: prev.studentId }));
      } else if (formData.email) {
        const pre = formData.email.split('@')[0];
        setFormData(prev => ({ ...prev, username: pre }));
      }
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.firstName || !formData.lastName) {
      setToast({ type: 'error', message: 'অনুগ্রহ করে ছাত্র/ছাত্রীর নাম প্রদান করুন' });
      return;
    }
    if (!formData.academicYearId) {
      setToast({ type: 'error', message: 'একাডেমিক এনরোলমেন্টের "শিক্ষাবর্ষ" নির্বাচন করা আবশ্যক' });
      return;
    }
    if (!formData.classLevelId) {
      setToast({ type: 'error', message: 'একাডেমিক এনরোলমেন্টের "শ্রেণি" নির্বাচন করা আবশ্যক' });
      return;
    }
    if (!formData.sectionId) {
      setToast({ type: 'error', message: 'একাডেমিক এনরোলমেন্টের "সেকশন" নির্বাচন করা আবশ্যক। অনুগ্রহ করে সেকশনটি আবার সিলেক্ট করুন।' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/students', formData);
      if (res.data.success) {
        setToast({ type: 'success', message: 'নতুন ছাত্র/ছাত্রী সফলভাবে নিবন্ধিত হয়েছে!' });
        setTimeout(() => {
          navigate('/students');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'নিবন্ধন করতে সমস্যা হয়েছে। ইমেইল বা ইউজারনেম ইতোমধ্যে ব্যবহৃত হতে পারে।';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
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

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="flex gap-12" style={{ alignItems: 'center' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/students')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">নতুন ছাত্র/ছাত্রী ভর্তি</h1>
            <p className="page-subtitle">নতুন শিক্ষার্থীর জন্য পোর্টাল অ্যাকাউন্ট ও ক্লাস এনরোলমেন্ট তৈরি করুন</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-3" style={{ gap: '24px', alignItems: 'start' }}>
          
          {/* Main Form Fields (2 columns) */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Account Details */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} style={{ color: 'var(--primary)' }} />
                অ্যাকাউন্ট বিবরণী (Account Details)
              </h2>

              <div className="grid grid-2" style={{ gap: '16px 20px' }}>
                <div>
                  <label className="form-label">ইমেইল ঠিকানা (ঐচ্ছিক, স্বয়ংক্রিয়ভাবে তৈরি হবে)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="student@madrasah.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onBlur={handleAutoFill}
                  />
                </div>

                <div>
                  <label className="form-label">ব্যবহারকারীর নাম (ঐচ্ছিক, স্বয়ংক্রিয়ভাবে তৈরি হবে)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="যেমন: unique_username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">পাসওয়ার্ড (খালি রাখলে default: madrasah123)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="******"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">ফোন নম্বর</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="01XXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Profile details */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} style={{ color: 'var(--primary)' }} />
                ব্যক্তিগত তথ্য (Personal Profile)
              </h2>

              <div className="grid grid-2" style={{ gap: '16px 20px' }}>
                <div>
                  <label className="form-label">নামের প্রথম অংশ (First Name) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="যেমন: আহমাদ"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">নামের শেষ অংশ (Last Name) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="যেমন: হাসান"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">ভর্তি নম্বর (ঐচ্ছিক, স্বয়ংক্রিয়ভাবে তৈরি হবে)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="যেমন: ADM202601"
                    value={formData.admissionNumber}
                    onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">ছাত্র আইডি (ঐচ্ছিক, স্বয়ংক্রিয়ভাবে তৈরি হবে)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="যেমন: ST26001"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    onBlur={handleAutoFill}
                  />
                </div>

                <div>
                  <label className="form-label">জন্ম তারিখ</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">ভর্তির তারিখ</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">লিঙ্গ</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="radio" name="gender" checked={formData.gender === 'male'} onChange={() => setFormData({ ...formData, gender: 'male' })} />
                      <span>ছাত্র (Male)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="radio" name="gender" checked={formData.gender === 'female'} onChange={() => setFormData({ ...formData, gender: 'female' })} />
                      <span>ছাত্রী (Female)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="form-label">রক্তের গ্রুপ</label>
                  <select className="form-select form-input" value={formData.bloodGroup} onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}>
                    <option value="">-- রক্তের গ্রুপ বাছুন --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Academic Details & Submit Banner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Academic details */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} style={{ color: 'var(--primary)' }} />
                একাডেমিক এনরোলমেন্ট
              </h2>
              <div className="flex-column gap-12">
                <div>
                  <label className="form-label">শিক্ষাবর্ষ *</label>
                  <select className="form-select form-input" value={formData.academicYearId} onChange={e => setFormData({ ...formData, academicYearId: e.target.value })} required>
                    <option value="">-- শিক্ষাবর্ষ নির্বাচন করুন --</option>
                    {academicYears.map(y => (
                      <option key={y._id} value={y._id}>{y.name} {y.isCurrent ? '(চলতি)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">শিক্ষা বিভাগ (Stream) *</label>
                  <select className="form-select form-input" value={stream} onChange={e => handleStreamChange(e.target.value)} required>
                    <option value="noorani">নুরানী (Noorani)</option>
                    <option value="hifz">হিফজ (Hifz)</option>
                  </select>
                </div>

                {stream === 'hifz' && (
                  <>
                    <div>
                      <label className="form-label">হিফজ প্রোগ্রামের ধরন *</label>
                      <select 
                        className="form-select form-input" 
                        value={formData.hifzProgramType} 
                        onChange={e => setFormData({ ...formData, hifzProgramType: e.target.value })} 
                        required
                      >
                        <option value="only_hifz">শুধু হিফজ (Only Hifz)</option>
                        <option value="hifz_aliya">হিফজ + আলিয়া (Hifz + Aliya)</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">শাখা *</label>
                      <select 
                        className="form-select form-input" 
                        value={formData.branchId} 
                        onChange={e => {
                          const selectedBranch = branches.find(b => b._id === e.target.value);
                          const gender = selectedBranch && selectedBranch.name.includes('বালিকা') ? 'female' : 'male';
                          setFormData({ ...formData, branchId: e.target.value, gender });
                        }} 
                        required
                      >
                        <option value="">-- শাখা নির্বাচন করুন --</option>
                        {branches.map(b => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {formData.branchId && (
                      <div>
                        <label className="form-label">বিভাগ *</label>
                        <select 
                          className="form-select form-input" 
                          value={formData.department} 
                          onChange={e => setFormData({ ...formData, department: e.target.value })} 
                          required
                        >
                          <option value="">-- বিভাগ নির্বাচন করুন --</option>
                          <option value="মক্তব বিভাগ">মক্তব বিভাগ</option>
                          <option value="নাজেরা বিভাগ">নাজেরা বিভাগ</option>
                          <option value="হিফজ বিভাগ">হিফজ বিভাগ</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="form-label">শ্রেণি *</label>
                  <select className="form-select form-input" value={formData.classLevelId} onChange={e => setFormData({ ...formData, classLevelId: e.target.value })} required>
                    <option value="">-- শ্রেণি নির্বাচন করুন --</option>
                    {filteredClassLevels.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">সেকশন (Section) *</label>
                  <select 
                    className="form-select form-input" 
                    value={formData.sectionId} 
                    onChange={e => setFormData(prev => ({ ...prev, sectionId: e.target.value }))} 
                    required
                  >
                    <option value="">-- সেকশন নির্বাচন করুন --</option>
                    {SECTION_OPTIONS.map((sec, idx) => (
                      <option key={idx} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">রোল নম্বর (খালি রাখলে স্বয়ংক্রিয় বসবে)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="যেমন: 1"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">আবাসিক অবস্থা (Residential Status) *</label>
                  <select className="form-select form-input" value={formData.residentialStatus} onChange={e => setFormData({ ...formData, residentialStatus: e.target.value })} required>
                    <option value="non-residential">অনাবাসিক (Non-Residential)</option>
                    <option value="residential">আবাসিক (Residential)</option>
                    <option value="day-care">ডে-কেয়ার (Day-Care)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Banner */}
            <div className="card" style={{ background: 'rgba(20,184,166,0.03)', border: '1px solid var(--primary-100)' }}>
              <p className="text-sm text-muted mb-16">অনুগ্রহ করে ভর্তির তথ্য জমা দেওয়ার পূর্বে রিচেক করুন।</p>
              <div className="flex-column gap-8">
                <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                  {submitting ? <Loader className="animate-spin" size={16} /> : <><Save size={16} /> ভর্তি সম্পন্ন করুন</>}
                </button>
                <button type="button" className="btn btn-secondary w-full" onClick={() => navigate('/students')}>
                  বাতিল
                </button>
              </div>
            </div>

          </div>

        </div>
      </form>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
