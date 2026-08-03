import { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, CheckCircle, AlertCircle, Save, Search, ChevronDown, Check } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { SECTION_OPTIONS } from '../../utils/constants';

export default function AttendancePage() {
  const { user, permissions } = useAuthStore();
  const canMarkAttendance = user?.userType === 'super_admin' || permissions?.can_mark_attendance;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSections, setSelectedSections] = useState([]); // array of section IDs
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { [studentId]: { status: 'present'|'absent'|'late'|'on_leave', remarks: '' } }
  
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
  const [historyRecords, setHistoryRecords] = useState([]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Close section dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target)) {
        setSectionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial classes
  useEffect(() => {
    if (!canMarkAttendance) {
      setMetaLoading(false);
      return;
    }
    const fetchClasses = async () => {
      try {
        const res = await api.get('/students/classes');
        if (res.data.success) {
          const classList = res.data.data.classes || [];
          setClasses(classList);
          if (classList.length > 0) {
            setSelectedClass(classList[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch classes', err);
        setToast({ type: 'error', message: 'ক্লাস তালিকা লোড করতে সমস্যা হয়েছে' });
      } finally {
        setMetaLoading(false);
      }
    };
    fetchClasses();
  }, [canMarkAttendance]);

  // Fetch sections when class changes
  useEffect(() => {
    if (!selectedClass) return;
    const fetchSections = async () => {
      try {
        const res = await api.get(`/students/sections?classLevel=${selectedClass}`);
        if (res.data.success) {
          const sectionList = res.data.data.sections || [];
          setSections(sectionList);
          // Default: select 'ক' or first section prefix
          if (sectionList.length > 0) {
            const firstSecName = sectionList[0].name.trim();
            if (firstSecName.startsWith('ক')) setSelectedSectionName('ক');
            else if (firstSecName.startsWith('খ')) setSelectedSectionName('খ');
            else if (firstSecName.startsWith('গ')) setSelectedSectionName('গ');
            else if (firstSecName.startsWith('ঘ')) setSelectedSectionName('ঘ');
            else setSelectedSectionName('ক');
          } else {
            setSelectedSectionName('');
          }
        }
      } catch (err) {
        console.error('Failed to fetch sections', err);
      }
    };
    fetchSections();
    setStudents([]);
    setAttendance({});
  }, [selectedClass]);

  // Automatically update selectedSections (array of matching IDs) when selectedSectionName or sections change
  useEffect(() => {
    if (!selectedSectionName || sections.length === 0) {
      setSelectedSections([]);
      return;
    }

    const matched = sections.filter(s => {
      const sName = s.name.trim();
      if (selectedSectionName === 'কোন সেকশন নাই') {
        return sName.includes('কোন সেকশন নাই') || sName.includes('কোন শাখা নাই') || sName.includes('নাই') || sName === 'no_section' || sName.includes('No Section');
      }
      return sName.startsWith(selectedSectionName) || sName === selectedSectionName;
    });

    setSelectedSections(matched.map(s => s._id));
  }, [selectedSectionName, sections]);

  const loadAttendanceData = async () => {
    if (!selectedClass || selectedSections.length === 0) {
      setToast({ type: 'error', message: 'অনুগ্রহ করে শ্রেণি এবং অন্তত একটি সেকশন নির্বাচন করুন' });
      return;
    }
    setLoading(true);
    try {
      const sectionsParam = selectedSections.join(',');

      // 1. Fetch students in selected class/sections
      const studentsRes = await api.get('/students', {
        params: { classLevel: selectedClass, sections: sectionsParam, limit: 200 }
      });
      const studentsData = studentsRes.data.data || [];

      // Sort students by section name then roll number
      studentsData.sort((a, b) => {
        const secA = a.currentEnrollment?.section?.name || '';
        const secB = b.currentEnrollment?.section?.name || '';
        if (secA !== secB) return secA.localeCompare(secB, 'bn');
        const rollA = parseInt(a.currentEnrollment?.rollNumber) || 0;
        const rollB = parseInt(b.currentEnrollment?.rollNumber) || 0;
        return rollA - rollB;
      });

      setStudents(studentsData);

      // 2. Fetch existing attendance records for the date/class/sections
      const attendanceRes = await api.get('/attendance', {
        params: { date, classLevel: selectedClass, sections: sectionsParam }
      });
      const records = attendanceRes.data.data?.records || [];

      // 3. Map records to attendance state
      const initialAttendance = {};

      // Default all fetched students to not_assigned
      studentsData.forEach(student => {
        initialAttendance[student._id] = { status: 'not_assigned', remarks: '' };
      });

      // Override with database records if they exist
      records.forEach(rec => {
        const sId = typeof rec.student === 'object' ? rec.student?._id : rec.student;
        if (sId) {
          initialAttendance[sId] = {
            status: rec.status,
            remarks: rec.remarks || ''
          };
        }
      });

      setAttendance(initialAttendance);
      setToast({ type: 'success', message: `${studentsData.length} জন শিক্ষার্থীর ডাটা লোড হয়েছে` });
    } catch (err) {
      console.error('Failed to load attendance details', err);
      setToast({ type: 'error', message: 'ডাটা লোড করতে ব্যর্থ হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  const loadReadOnlyAttendanceData = async () => {
    setLoading(true);
    try {
      const attendanceRes = await api.get('/attendance', {
        params: { history: 'true' }
      });
      const records = attendanceRes.data.data?.records || [];
      setHistoryRecords(records);
    } catch (err) {
      console.error('Failed to load read-only attendance', err);
      setToast({ type: 'error', message: 'উপস্থিতি লোড করতে ব্যর্থ হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canMarkAttendance) {
      loadReadOnlyAttendanceData();
    }
  }, [canMarkAttendance]);

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  const markAllStatus = (status) => {
    const updated = { ...attendance };
    students.forEach(student => {
      updated[student._id] = {
        ...updated[student._id],
        status
      };
    });
    setAttendance(updated);
  };

  const saveAttendance = async () => {
    if (students.length === 0) {
      setToast({ type: 'error', message: 'সংরক্ষণ করার জন্য কোনো ছাত্র তালিকা নেই' });
      return;
    }
    setSubmitting(true);
    try {
      // Build one combined payload — backend uses per-student upsert anyway
      const studentsPayload = Object.keys(attendance).map(studentId => ({
        studentId,
        status: attendance[studentId].status,
        remarks: attendance[studentId].remarks
      }));

      const payload = {
        date,
        classLevel: selectedClass,
        section: selectedSections[0], // primary section for record-keeping
        students: studentsPayload
      };

      const res = await api.post('/attendance', payload);
      if (res.data.success) {
        setToast({ type: 'success', message: `${studentsPayload.length} জন শিক্ষার্থীর উপস্থিতি সংরক্ষণ হয়েছে!` });
      }
    } catch (err) {
      console.error('Failed to save attendance', err);
      const errMsg = err.response?.data?.message || 'উপস্থিতি সংরক্ষণ করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'present': return 'badge-active';
      case 'absent': return 'badge-danger';
      case 'late': return 'badge-warning';
      case 'on_leave': return 'badge-info';
      case 'not_assigned': return 'badge-inactive';
      default: return 'badge-inactive';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'present': return 'উপস্থিত';
      case 'absent': return 'অনুপস্থিত';
      case 'late': return 'বিলম্ব';
      case 'on_leave': return 'ছুটি';
      case 'not_assigned': return 'নির্ধারিত নয়';
      default: return 'অজানা';
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
          <h1 className="page-title">উপস্থিতি খাতা</h1>
          <p className="page-subtitle">
            {canMarkAttendance ? 'মাদ্রাসার শিক্ষার্থীদের দৈনিক উপস্থিতি রেকর্ড ও সংশোধন করুন' : 'আপনার শিক্ষার্থীর উপস্থিতি বিবরণী'}
          </p>
        </div>
      </div>

      {/* ফিল্টার এবং লোড কার্ড */}
      {canMarkAttendance && (
        <div className="card mb-24" style={{ position: 'relative', zIndex: 10 }}>
          {metaLoading ? (
            <div className="flex-center" style={{ padding: '10px' }}>
              <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
            </div>
          ) : (
            <div className="flex gap-16" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                <label className="form-label">তারিখ</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                <label className="form-label">শ্রেণি</label>
                <select 
                  className="form-input" 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Single Select Section Dropdown */}
              <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
                <label className="form-label">সেকশন *</label>
                <select 
                  className="form-input" 
                  value={selectedSectionName} 
                  onChange={(e) => setSelectedSectionName(e.target.value)}
                  disabled={!selectedClass}
                  required
                >
                  <option value="">-- সেকশন নির্বাচন করুন --</option>
                  {SECTION_OPTIONS.map((sec, idx) => (
                    <option key={idx} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={loadAttendanceData}
                disabled={loading || !selectedClass || selectedSections.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Search size={16} /> লোড করুন
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="card flex-center" style={{ padding: '60px' }}>
          <div className="spinner"></div>
          <span className="ml-12 text-muted">ডাটা লোড হচ্ছে...</span>
        </div>
      ) : !canMarkAttendance ? (
        historyRecords.length === 0 ? (
          <div className="card empty-state">
            <ClipboardCheck size={48} style={{ opacity: 0.3 }} />
            <div className="empty-state-title mt-16">কোনো উপস্থিতির তথ্য পাওয়া যায়নি</div>
          </div>
        ) : (
          <div className="animate-slide-up">
            <div className="card table-container" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>তারিখ</th>
                    <th>শিক্ষার্থীর নাম ও আইডি</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>স্ট্যাটাস</th>
                    <th>মন্তব্য</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map(rec => {
                    const studentName = rec.student?.user?.fullName || 
                      `${rec.student?.user?.firstName || ''} ${rec.student?.user?.lastName || ''}`.trim();
                    const formattedDate = new Date(rec.date).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    return (
                      <tr key={rec._id}>
                        <td style={{ fontFamily: 'Inter', fontWeight: 600 }}>{formattedDate}</td>
                        <td>
                          <div className="font-semibold">{studentName}</div>
                          <div className="text-xs text-muted">{rec.student?.studentId}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${getStatusBadgeClass(rec.status)}`}>
                            {getStatusLabel(rec.status)}
                          </span>
                        </td>
                        <td className="text-muted text-sm">{rec.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : students.length === 0 ? (
        <div className="card empty-state">
          <ClipboardCheck size={48} style={{ opacity: 0.3 }} />
          <div className="empty-state-title mt-16">কোনো শিক্ষার্থীর তথ্য পাওয়া যায়নি</div>
          <p className="text-muted text-sm mt-8">শ্রেণি ও সেকশন নির্বাচন করে "লোড করুন" বাটনে ক্লিক করুন</p>
        </div>
      ) : (
        <div className="animate-slide-up">
          {/* বাল্ক একশন কন্ট্রোল */}
          {canMarkAttendance && (
            <div className="flex-between mb-16" style={{ background: 'var(--bg-secondary)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <span className="text-sm font-semibold">মোট শিক্ষার্থী: {students.length} জন</span>
              <div className="flex gap-8">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm text-success" 
                  onClick={() => markAllStatus('present')}
                  style={{ fontSize: '0.85rem' }}
                >
                  সবাই উপস্থিত
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm text-danger" 
                  onClick={() => markAllStatus('absent')}
                  style={{ fontSize: '0.85rem' }}
                >
                  সবাই অনুপস্থিত
                </button>
              </div>
            </div>
          )}

          {/* উপস্থিতির মূল তালিকা */}
          <div className="card table-container" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>রোল</th>
                  <th>ছাত্রের নাম ও আইডি</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>স্ট্যাটাস</th>
                  <th style={{ textAlign: 'center' }}>উপস্থিতি নির্বাচন করুন</th>
                  <th style={{ width: '220px' }}>মন্তব্য (ঐচ্ছিক)</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const studentId = student._id;
                  const roll = student.currentEnrollment?.rollNumber || '—';
                  const studentName = student.user?.fullName || 
                    `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim();
                  const currentStatus = attendance[studentId]?.status || 'not_assigned';
                  const currentRemarks = attendance[studentId]?.remarks || '';

                  return (
                    <tr key={studentId}>
                      <td style={{ textAlign: 'center', fontFamily: 'Inter', fontWeight: 600 }}>{roll}</td>
                      <td>
                        <div className="font-semibold">{studentName}</div>
                        <div className="text-xs text-muted">{student.studentId}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${getStatusBadgeClass(currentStatus)}`}>
                          {getStatusLabel(currentStatus)}
                        </span>
                      </td>
                      <td>
                        {canMarkAttendance ? (
                          <div className="flex-center gap-4">
                            <button
                              type="button"
                              className={`btn btn-sm ${currentStatus === 'present' ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => handleStatusChange(studentId, 'present')}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                borderColor: currentStatus === 'present' ? 'var(--success)' : 'transparent',
                                background: currentStatus === 'present' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                color: currentStatus === 'present' ? '#10b981' : 'var(--text-secondary)'
                              }}
                            >
                              উপস্থিত
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${currentStatus === 'absent' ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => handleStatusChange(studentId, 'absent')}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                borderColor: currentStatus === 'absent' ? 'var(--danger)' : 'transparent',
                                background: currentStatus === 'absent' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                color: currentStatus === 'absent' ? '#ef4444' : 'var(--text-secondary)'
                              }}
                            >
                              অনুপস্থিত
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${currentStatus === 'late' ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => handleStatusChange(studentId, 'late')}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                borderColor: currentStatus === 'late' ? 'var(--warning)' : 'transparent',
                                background: currentStatus === 'late' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                color: currentStatus === 'late' ? '#f59e0b' : 'var(--text-secondary)'
                              }}
                            >
                              বিলম্ব
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${currentStatus === 'on_leave' ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => handleStatusChange(studentId, 'on_leave')}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                borderColor: currentStatus === 'on_leave' ? 'var(--info)' : 'transparent',
                                background: currentStatus === 'on_leave' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: currentStatus === 'on_leave' ? '#3b82f6' : 'var(--text-secondary)'
                              }}
                            >
                              ছুটি
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${currentStatus === 'not_assigned' ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => handleStatusChange(studentId, 'not_assigned')}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                borderColor: currentStatus === 'not_assigned' ? 'var(--border-color)' : 'transparent',
                                background: currentStatus === 'not_assigned' ? 'var(--bg-secondary)' : 'transparent',
                                color: currentStatus === 'not_assigned' ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}
                            >
                              নির্ধারিত নয়
                            </button>
                          </div>
                        ) : (
                          <div className="flex-center text-muted">
                            {getStatusLabel(currentStatus)}
                          </div>
                        )}
                      </td>
                      <td>
                        {canMarkAttendance ? (
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '0.85rem', marginBottom: 0 }}
                            placeholder="মন্তব্য..."
                            value={currentRemarks}
                            onChange={(e) => handleRemarksChange(studentId, e.target.value)}
                          />
                        ) : (
                          <div className="text-muted text-sm">{currentRemarks || '—'}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {canMarkAttendance && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-secondary)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={saveAttendance}
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Save size={16} /> {submitting ? 'সংরক্ষণ হচ্ছে...' : 'উপস্থিতি সংরক্ষণ করুন'}
                </button>
              </div>
            )}
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
