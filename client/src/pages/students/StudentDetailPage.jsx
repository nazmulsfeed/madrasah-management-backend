import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Mail, Phone, Calendar, BookOpen, CreditCard,
  ClipboardCheck, GraduationCap, Edit, User, X, Loader, Save, CheckCircle, AlertCircle
} from 'lucide-react';
import api from '../../api/axios';

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [toast, setToast] = useState(null);
  const [branches, setBranches] = useState([]);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    status: 'active',
    branchId: '',
    residentialStatus: 'non-residential'
  });

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchStudent = async () => {
    try {
      const res = await api.get(`/students/${id}`);
      if (res.data.success) {
        setStudent(res.data.data.student);
      }
    } catch (err) {
      console.error('Fetch student error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/students/branches');
      if (res.data.success) {
        setBranches(res.data.data.branches || []);
      }
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  useEffect(() => {
    fetchStudent();
    fetchBranches();
  }, [id]);

  useEffect(() => {
    if (student && location.state?.edit) {
      handleOpenEdit();
      // Clear the state so it doesn't open again on subsequent updates/reloads
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [student, location.state]);

  const handleOpenEdit = () => {
    if (!student) return;
    setEditFormData({
      firstName: student.user?.firstName || '',
      lastName: student.user?.lastName || '',
      email: student.user?.email || '',
      phone: student.user?.phone || '',
      username: student.user?.username || '',
      password: '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      gender: student.gender || 'male',
      bloodGroup: student.bloodGroup || '',
      status: student.status || 'active',
      branchId: student.branch?._id || student.branch || '',
      residentialStatus: student.residentialStatus || 'non-residential'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.patch(`/students/${id}`, editFormData);
      if (res.data.success) {
        setToast({ type: 'success', message: 'শিক্ষার্থীর তথ্য সফলভাবে আপডেট হয়েছে!' });
        setIsEditModalOpen(false);
        fetchStudent();
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'তথ্য আপডেট করতে ব্যর্থ হয়েছে' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">ছাত্র/ছাত্রী পাওয়া যায়নি</div>
        <button className="btn btn-primary mt-16" onClick={() => navigate('/students')}>
          <ArrowRight size={16} /> তালিকায় ফিরে যান
        </button>
      </div>
    );
  }

  const name = student.user?.fullName ||
    `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim();
  const enrollment = student.currentEnrollment;

  const tabs = [
    { id: 'info', label: 'ব্যক্তিগত তথ্য', icon: User },
    { id: 'academic', label: 'একাডেমিক', icon: BookOpen },
    { id: 'attendance', label: 'উপস্থিতি', icon: ClipboardCheck },
    { id: 'fees', label: 'ফি', icon: CreditCard },
  ];

  const statusMap = {
    active: { label: 'সক্রিয়', class: 'badge-active' },
    inactive: { label: 'নিষ্ক্রিয়', class: 'badge-inactive' },
    graduated: { label: 'স্নাতক', class: 'badge-info' },
  };
  const st = statusMap[student.status] || statusMap.active;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
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

      {/* ব্যাক + হেডার */}
      <div className="page-header">
        <div className="flex gap-16" style={{ alignItems: 'center' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/students')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">শিক্ষার্থীর প্রোফাইল</h1>
            <p className="page-subtitle">বিস্তারিত একাডেমিক ও ব্যক্তিগত বিবরণী</p>
          </div>
        </div>
        <button className="btn btn-primary btn-icon" onClick={handleOpenEdit}>
          <Edit size={16} /> তথ্য সম্পাদনা
        </button>
      </div>

      {/* প্রোফাইল কার্ড */}
      <div className="card mb-24">
        <div className="flex gap-24" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* অ্যাভাটার */}
          <div
            className="avatar xl"
            style={{
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
              fontSize: '2rem',
              flexShrink: 0,
            }}
          >
            {name.charAt(0)}
          </div>

          {/* তথ্য */}
          <div style={{ flex: 1 }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <div>
                <h2 style={{ marginBottom: '4px' }}>{name}</h2>
                <div className="flex gap-12 text-sm text-muted">
                  <span>আইডি: {student.studentId}</span>
                  <span>•</span>
                  <span>ভর্তি: {student.admissionNumber}</span>
                </div>
              </div>
              <span className={`badge ${st.class}`}>{st.label}</span>
            </div>

            <div
              className="grid grid-4 mt-16"
              style={{ gap: '16px' }}
            >
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm">{student.user?.email || '—'}</span>
              </div>
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm">{student.user?.phone || '—'}</span>
              </div>
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <GraduationCap size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm">
                  {enrollment?.classLevel?.name || '—'} ({enrollment?.section?.name || '—'})
                </span>
              </div>
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm">
                  ভর্তি: {student.admissionDate
                    ? new Date(student.admissionDate).toLocaleDateString('bn-BD')
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ট্যাব */}
      <div className="flex gap-8 mb-24" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`btn btn-ghost`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-500)' : '2px solid transparent',
              borderRadius: 0,
              color: activeTab === tab.id ? 'var(--primary-400)' : 'var(--text-secondary)',
              paddingBottom: '12px',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ট্যাব কন্টেন্ট */}
      <div className="card animate-slide-up">
        {activeTab === 'info' && (
          <div>
            <h4 className="mb-16">ব্যক্তিগত তথ্য</h4>
            <div className="grid grid-2" style={{ gap: '20px' }}>
              <div>
                <div className="text-sm text-muted mb-4">পুরো নাম</div>
                <div className="font-semibold">{name}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">ব্যবহারকারীর নাম (Username)</div>
                <div className="font-semibold" style={{ fontFamily: 'Inter' }}>{student.user?.username || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">জন্ম তারিখ</div>
                <div className="font-semibold">
                  {student.dateOfBirth
                    ? new Date(student.dateOfBirth).toLocaleDateString('bn-BD')
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">লিঙ্গ</div>
                <div className="font-semibold">{student.gender === 'male' ? 'ছাত্র (Male)' : student.gender === 'female' ? 'ছাত্রী (Female)' : '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">রক্তের গ্রুপ</div>
                <div className="font-semibold">{student.bloodGroup || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">ইমেইল</div>
                <div className="font-semibold">{student.user?.email || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">ফোন</div>
                <div className="font-semibold">{student.user?.phone || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">আবাসিক অবস্থা (Residential Status)</div>
                <div className="font-semibold">
                  {student.residentialStatus === 'residential' ? 'আবাসিক (Residential)' : student.residentialStatus === 'non-residential' ? 'অনাবাসিক (Non-Residential)' : student.residentialStatus === 'day-care' ? 'ডে-কেয়ার (Day-Care)' : '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div>
            <h4 className="mb-16">একাডেমিক তথ্য</h4>
            <div className="grid grid-2" style={{ gap: '20px' }}>
              <div>
                <div className="text-sm text-muted mb-4">শিক্ষাবর্ষ</div>
                <div className="font-semibold">{enrollment?.academicYear?.name || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">শ্রেণি</div>
                <div className="font-semibold">{enrollment?.classLevel?.name || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">শ্রেণির সেকশন (Section)</div>
                <div className="font-semibold">{enrollment?.section?.name || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">শাখা (Branch)</div>
                <div className="font-semibold">{student.branch?.name || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-4">রোল নম্বর</div>
                <div className="font-semibold" style={{ fontFamily: 'Inter' }}>{enrollment?.rollNumber || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="empty-state">
            <ClipboardCheck size={48} style={{ opacity: 0.3 }} />
            <div className="empty-state-title mt-16">উপস্থিতি তথ্য</div>
            <p className="text-muted text-sm mt-4">
              এই বৈশিষ্ট্যটি পরবর্তী আপডেটে যোগ করা হবে
            </p>
          </div>
        )}

        {activeTab === 'fees' && (
          <div className="empty-state">
            <CreditCard size={48} style={{ opacity: 0.3 }} />
            <div className="empty-state-title mt-16">ফি তথ্য</div>
            <p className="text-muted text-sm mt-4">
              এই বৈশিষ্ট্যটি পরবর্তী আপডেটে যোগ করা হবে
            </p>
          </div>
        )}
      </div>

      {/* Edit Student Profile Modal */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
            padding: '32px', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)', animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsEditModalOpen(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit size={22} style={{ color: 'var(--primary)' }} />
              ছাত্র/ছাত্রীর তথ্য ও অ্যাকাউন্ট সম্পাদনা
            </h2>

            <form onSubmit={handleUpdateSubmit} className="flex-column gap-20">
              
              {/* Profile Details Block */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--primary-400)' }}>ব্যক্তিগত বিবরণী</h3>
                <div className="grid grid-2" style={{ gap: '12px 16px' }}>
                  <div>
                    <label className="form-label">নামের প্রথম অংশ *</label>
                    <input 
                      type="text" className="form-input" required
                      value={editFormData.firstName} 
                      onChange={e => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">নামের শেষ অংশ *</label>
                    <input 
                      type="text" className="form-input" required
                      value={editFormData.lastName} 
                      onChange={e => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">জন্ম তারিখ</label>
                    <input 
                      type="date" className="form-input" 
                      value={editFormData.dateOfBirth} 
                      onChange={e => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">রক্তের গ্রুপ</label>
                    <select 
                      className="form-select form-input" 
                      value={editFormData.bloodGroup} 
                      onChange={e => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                    >
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
                  <div>
                    <label className="form-label">লিঙ্গ</label>
                    <select 
                      className="form-select form-input" 
                      value={editFormData.gender} 
                      onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })}
                    >
                      <option value="male">ছাত্র (Male)</option>
                      <option value="female">ছাত্রী (Female)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">স্ট্যাটাস</label>
                    <select 
                      className="form-select form-input" 
                      value={editFormData.status} 
                      onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      <option value="active">সক্রিয় (Active)</option>
                      <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                      <option value="graduated">স্নাতক (Graduated)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">শাখা (Branch)</label>
                    <select 
                      className="form-select form-input" 
                      value={editFormData.branchId} 
                      onChange={e => setEditFormData({ ...editFormData, branchId: e.target.value })}
                    >
                      <option value="">-- শাখা নির্বাচন করুন --</option>
                      {branches.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">আবাসিক অবস্থা (Residential Status)</label>
                    <select 
                      className="form-select form-input" 
                      value={editFormData.residentialStatus} 
                      onChange={e => setEditFormData({ ...editFormData, residentialStatus: e.target.value })}
                    >
                      <option value="non-residential">অনাবাসিক (Non-Residential)</option>
                      <option value="residential">আবাসিক (Residential)</option>
                      <option value="day-care">ডে-কেয়ার (Day-Care)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Account Credentials Block */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--primary-400)' }}>পোর্টাল লগইন বিবরণী</h3>
                <div className="grid grid-2" style={{ gap: '12px 16px' }}>
                  <div>
                    <label className="form-label">ইমেইল ঠিকানা</label>
                    <input 
                      type="email" className="form-input" 
                      value={editFormData.email} 
                      onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">ফোন নম্বর</label>
                    <input 
                      type="text" className="form-input" 
                      value={editFormData.phone} 
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">ব্যবহারকারীর নাম (Username)</label>
                    <input 
                      type="text" className="form-input" 
                      value={editFormData.username} 
                      onChange={e => setEditFormData({ ...editFormData, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">নতুন পাসওয়ার্ড (পরিবর্তন করতে চাইলে)</label>
                    <input 
                      type="password" className="form-input" placeholder="খালি রাখলে আগের পাসওয়ার্ড থাকবে"
                      value={editFormData.password} 
                      onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  বাতিল
                </button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? <Loader className="animate-spin" size={16} /> : <><Save size={16} /> আপডেট করুন</>}
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
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
