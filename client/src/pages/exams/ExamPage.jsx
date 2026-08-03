import { useState, useEffect } from 'react';
import { Plus, FileText, CheckCircle, AlertCircle, ArrowLeft, Save, Search, ChevronDown, Check, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { SECTION_OPTIONS } from '../../utils/constants';

export default function ExamPage() {
  const { user } = useAuthStore();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Exam Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editExamId, setEditExamId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    classLevel: '',
    startDate: '',
    endDate: '',
    status: 'upcoming'
  });

  // Mark Entry Mode State
  const [selectedExam, setSelectedExam] = useState(null); // Exam object
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({}); // { [studentId]: marksObtained }
  const [savingMarks, setSavingMarks] = useState(false);
  const [studentResults, setStudentResults] = useState([]); // Array of marks for student/guardian

  const isStudentOrGuardian = user?.userType === 'student' || user?.userType === 'guardian';

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch initial exams and classes
  const fetchExams = async () => {
    try {
      const res = await api.get('/exams');
      if (res.data.success) {
        setExams(res.data.data.exams || []);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      setToast({ type: 'error', message: 'পরীক্ষার তালিকা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/students/classes');
      if (res.data.success) {
        setClasses(res.data.data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, []);

  // Handle Exam Form Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Edit Exam Action
  const handleEditExam = (exam) => {
    setEditExamId(exam._id);
    setFormData({
      name: exam.name,
      classLevel: exam.classLevel?._id || '',
      startDate: exam.startDate ? exam.startDate.split('T')[0] : '',
      endDate: exam.endDate ? exam.endDate.split('T')[0] : '',
      status: exam.status
    });
    setIsModalOpen(true);
  };

  // Handle Delete Exam Action
  const handleDeleteExam = async (examId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই পরীক্ষাটি মুছে ফেলতে চান? এর সাথে যুক্ত সমস্ত নম্বর এন্ট্রিও মুছে যাবে।')) return;
    try {
      const res = await api.delete(`/exams/${examId}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'পরীক্ষা সফলভাবে মুছে ফেলা হয়েছে!' });
        fetchExams();
      }
    } catch (error) {
      console.error('Failed to delete exam', error);
      const errMsg = error.response?.data?.message || 'পরীক্ষা মুছতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    }
  };

  // Handle Exam Create or Edit Submit
  const handleExamSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (editExamId) {
        res = await api.patch(`/exams/${editExamId}`, formData);
      } else {
        res = await api.post('/exams', formData);
      }
      
      if (res.data.success) {
        setIsModalOpen(false);
        setEditExamId(null);
        setFormData({
          name: '',
          classLevel: '',
          startDate: '',
          endDate: '',
          status: 'upcoming'
        });
        setToast({ 
          type: 'success', 
          message: editExamId ? 'পরীক্ষা সফলভাবে আপডেট করা হয়েছে!' : 'পরীক্ষা সফলভাবে তৈরি করা হয়েছে!' 
        });
        fetchExams();
      }
    } catch (error) {
      console.error('Failed to submit exam', error);
      const errMsg = error.response?.data?.message || 'পরীক্ষা সংরক্ষণ করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // Mark Entry / Result View: Fetch subjects and sections when exam is selected
  const handleMarkEntryStart = async (exam) => {
    setSelectedExam(exam);
    setSelectedSubject('');
    setSelectedSection('');
    setStudents([]);
    setMarksData({});
    setStudentResults([]);
    
    if (isStudentOrGuardian) {
      setLoadingStudents(true);
      try {
        const marksRes = await api.get('/exams/marks', {
          params: { exam: exam._id }
        });
        setStudentResults(marksRes.data.data.marks || []);
      } catch (error) {
        console.error('Failed to load student marks', error);
        setToast({ type: 'error', message: 'ফলাফল লোড করতে সমস্যা হয়েছে' });
      } finally {
        setLoadingStudents(false);
      }
      return;
    }

    if (!exam.classLevel?._id) return;
    
    try {
      // 1. Fetch subjects for the classLevel
      const subjectsRes = await api.get(`/students/subjects?classLevel=${exam.classLevel._id}`);
      if (subjectsRes.data.success) {
        setSubjects(subjectsRes.data.data.subjects || []);
      }
      
      // 2. Fetch sections for the classLevel
      const sectionsRes = await api.get(`/students/sections?classLevel=${exam.classLevel._id}`);
      if (sectionsRes.data.success) {
        setSections(sectionsRes.data.data.sections || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects/sections for mark entry', error);
    }
  };

  // Fetch students list for mark entry
  const loadStudentsForMarks = async () => {
    if (!selectedSubject || !selectedSection) {
      setToast({ type: 'error', message: 'অনুগ্রহ করে বিষয় এবং সেকশন নির্বাচন করুন' });
      return;
    }
    setLoadingStudents(true);
    try {
      // 1. Get students enrolled in selected class & section
      const params = { classLevel: selectedExam.classLevel._id, limit: 100 };
      if (selectedSection !== 'all') {
        params.section = selectedSection;
      }
      const studentsRes = await api.get('/students', { params });
      const studentList = studentsRes.data.data || [];
      
      // Sort students by roll number
      studentList.sort((a, b) => {
        const rollA = parseInt(a.currentEnrollment?.rollNumber) || 0;
        const rollB = parseInt(b.currentEnrollment?.rollNumber) || 0;
        return rollA - rollB;
      });
      
      setStudents(studentList);

      // 2. Load existing marks for this exam
      const marksParams = { exam: selectedExam._id };
      if (selectedSubject !== 'all') {
        marksParams.subject = selectedSubject;
      }
      const marksRes = await api.get('/exams/marks', { params: marksParams });
      const existingMarks = marksRes.data.data.marks || [];

      if (selectedSubject === 'all') {
        // Group existing marks by studentId
        const marksByStudent = {};
        studentList.forEach(s => {
          marksByStudent[s._id] = [];
        });
        existingMarks.forEach(record => {
          const sId = typeof record.student === 'object' ? record.student?._id : record.student;
          if (sId && marksByStudent[sId]) {
            marksByStudent[sId].push({
              subjectName: record.subject?.name || 'অজানা বিষয়',
              marksObtained: record.marksObtained,
              grade: record.grade
            });
          }
        });
        setMarksData(marksByStudent);
      } else {
        // Map existing marks to marksData state
        const initialMarks = {};
        studentList.forEach(s => {
          initialMarks[s._id] = '';
        });
        existingMarks.forEach(record => {
          const sId = typeof record.student === 'object' ? record.student?._id : record.student;
          if (sId) {
            initialMarks[sId] = record.marksObtained ?? '';
          }
        });
        setMarksData(initialMarks);
      }
    } catch (error) {
      console.error('Failed to load students for marks entry', error);
      setToast({ type: 'error', message: 'শিক্ষার্থী তালিকা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const calculateGrade = (val) => {
    const marks = parseFloat(val);
    if (isNaN(marks)) return '—';
    if (marks >= 80) return 'A+';
    if (marks >= 70) return 'A';
    if (marks >= 60) return 'A-';
    if (marks >= 50) return 'B';
    if (marks >= 40) return 'C';
    if (marks >= 33) return 'D';
    return 'F';
  };

  const getGradeBadgeClass = (grade) => {
    if (grade === 'A+' || grade === 'A' || grade === 'A-') return 'badge-active';
    if (grade === 'F') return 'badge-danger';
    if (grade === '—') return 'badge-muted';
    return 'badge-warning';
  };

  const saveMarks = async () => {
    const studentMarksPayload = Object.keys(marksData)
      .map(studentId => ({
        studentId,
        marksObtained: marksData[studentId] === '' ? null : parseFloat(marksData[studentId])
      }));

    if (studentMarksPayload.length === 0) {
      setToast({ type: 'error', message: 'সংরক্ষণ করার মতো কোনো নম্বর দেওয়া হয়নি' });
      return;
    }

    setSavingMarks(true);
    try {
      const payload = {
        exam: selectedExam._id,
        subject: selectedSubject,
        marks: studentMarksPayload
      };
      const res = await api.post('/exams/marks', payload);
      if (res.data.success) {
        setToast({ type: 'success', message: 'নম্বরসমূহ সফলভাবে সংরক্ষণ করা হয়েছে!' });
      }
    } catch (error) {
      console.error('Failed to save marks', error);
      setToast({ type: 'error', message: 'নম্বর সংরক্ষণ করতে সমস্যা হয়েছে' });
    } finally {
      setSavingMarks(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'upcoming': return 'আসন্ন';
      case 'ongoing': return 'চলমান';
      case 'completed': return 'সমাপ্ত';
      case 'published': return 'ফলাফল প্রকাশিত';
      default: return 'অজানা';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'published': return 'badge-active';
      case 'completed': return 'badge-info';
      case 'ongoing': return 'badge-warning';
      default: return 'badge-muted';
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditExamId(null);
    setFormData({
      name: '',
      classLevel: '',
      startDate: '',
      endDate: '',
      status: 'upcoming'
    });
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

      {selectedExam ? (
        // MARK ENTRY WORKSPACE
        <div className="animate-fade-in">
          <div className="page-header">
            <div className="flex gap-16" style={{ alignItems: 'center' }}>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedExam(null)}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="page-title">{isStudentOrGuardian ? 'ফলাফল' : 'নম্বর এন্ট্রি'}</h1>
                <p className="page-subtitle">{selectedExam.name} • {selectedExam.classLevel?.name || 'অজানা শ্রেণি'}</p>
              </div>
            </div>
          </div>

          {!isStudentOrGuardian && (
            <div className="card mb-24">
              <div className="flex gap-16" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                  <label className="form-label">বিষয় (Subject)</label>
                  <select 
                    className="form-input form-select"
                    value={selectedSubject}
                    onChange={(e) => { setSelectedSubject(e.target.value); setStudents([]); }}
                  >
                    <option value="">বিষয় নির্বাচন করুন</option>
                    <option value="all">সকল বিষয়</option>
                    {subjects.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                  <label className="form-label">সেকশন (Section)</label>
                  <select 
                    className="form-input form-select"
                    value={selectedSection}
                    onChange={(e) => { setSelectedSection(e.target.value); setStudents([]); }}
                  >
                    <option value="">সেকশন নির্বাচন করুন</option>
                    <option value="all">সকল সেকশন</option>
                    {SECTION_OPTIONS.map((sec, idx) => (
                      <option key={idx} value={sec}>সেকশন {sec}</option>
                    ))}
                  </select>
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={loadStudentsForMarks}
                  disabled={loadingStudents || !selectedSubject || !selectedSection}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Search size={16} /> লোড করুন
                </button>
              </div>
            </div>
          )}

          {loadingStudents ? (
            <div className="card flex-center" style={{ padding: '60px' }}>
              <div className="spinner"></div>
            </div>
          ) : isStudentOrGuardian ? (
            studentResults.length === 0 ? (
              <div className="card empty-state">
                <FileText size={48} style={{ opacity: 0.3 }} />
                <div className="empty-state-title mt-16">ফলাফল পাওয়া যায়নি</div>
                <p className="text-muted text-sm mt-8">এখনও এই পরীক্ষার কোনো ফলাফল প্রকাশ হয়নি।</p>
              </div>
            ) : (
              <div className="animate-slide-up">
                <div className="card table-container" style={{ padding: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        {user?.userType === 'guardian' && <th>শিক্ষার্থীর নাম</th>}
                        <th>বিষয়</th>
                        <th style={{ width: '150px', textAlign: 'center' }}>প্রাপ্ত নম্বর</th>
                        <th style={{ width: '150px', textAlign: 'center' }}>গ্রেড</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentResults.map(res => {
                        const marks = res.marksObtained;
                        const grade = calculateGrade(marks);
                        return (
                          <tr key={res._id}>
                            {user?.userType === 'guardian' && (
                              <td>
                                <div className="font-semibold">{res.student?.firstName} {res.student?.lastName}</div>
                              </td>
                            )}
                            <td className="font-semibold">{res.subject?.name}</td>
                            <td style={{ textAlign: 'center', fontFamily: 'Inter' }}>{marks}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${getGradeBadgeClass(grade)}`} style={{ fontSize: '0.85rem', width: '45px', justifyContent: 'center' }}>
                                {grade}
                              </span>
                            </td>
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
              <FileText size={48} style={{ opacity: 0.3 }} />
              <div className="empty-state-title mt-16">কোনো শিক্ষার্থীর তথ্য পাওয়া যায়নি</div>
              <p className="text-muted text-sm mt-8">বিষয় ও সেকশন নির্বাচন করে "লোড করুন" বাটনে ক্লিক করুন</p>
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="card table-container" style={{ padding: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '100px', textAlign: 'center' }}>রোল নম্বর</th>
                      <th>• শিক্ষার্থীর নাম ও আইডি</th>
                      <th style={{ width: '200px', textAlign: 'center' }}>প্রাপ্ত নম্বর (Marks)</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>গ্রেড (Grade)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const studentId = student._id;
                      const roll = student.currentEnrollment?.rollNumber || '—';
                      const studentName = student.user?.fullName || 
                        `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim();

                      if (selectedSubject === 'all') {
                        const studentMarksList = Array.isArray(marksData[studentId]) ? marksData[studentId] : [];
                        return (
                          <tr key={studentId}>
                            <td style={{ textAlign: 'center', fontFamily: 'Inter', fontWeight: 600 }}>{roll}</td>
                            <td>
                              <div className="font-semibold">{studentName}</div>
                              <div className="text-xs text-muted">{student.studentId}</div>
                            </td>
                            <td colSpan={2}>
                              {studentMarksList.length === 0 ? (
                                <span className="text-muted text-xs">কোনো নম্বর পাওয়া যায়নি</span>
                              ) : (
                                <div className="flex gap-8" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                  {studentMarksList.map((m, idx) => (
                                    <span key={idx} className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                                      {m.subjectName}: {m.marksObtained} ({m.grade})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      }

                      const currentMarks = marksData[studentId] ?? '';
                      const grade = calculateGrade(currentMarks);

                      return (
                        <tr key={studentId}>
                          <td style={{ textAlign: 'center', fontFamily: 'Inter', fontWeight: 600 }}>{roll}</td>
                          <td>
                            <div className="font-semibold">{studentName}</div>
                            <div className="text-xs text-muted">{student.studentId}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '120px', margin: '0 auto', textAlign: 'center', marginBottom: 0 }}
                              placeholder="০ - ১০০"
                              min="0"
                              max="100"
                              value={currentMarks}
                              onChange={(e) => handleMarkChange(studentId, e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${getGradeBadgeClass(grade)}`} style={{ fontSize: '0.85rem', width: '45px', justifyContent: 'center' }}>
                              {grade}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {selectedSubject !== 'all' && (
                  <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-secondary)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={saveMarks}
                      disabled={savingMarks}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Save size={16} /> {savingMarks ? 'সংরক্ষণ হচ্ছে...' : 'নম্বর সংরক্ষণ করুন'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // EXAMS LIST
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">পরীক্ষা ও ফলাফল</h1>
              <p className="page-subtitle">মাদ্রাসার সমস্ত পরীক্ষা এবং পরীক্ষার ফলাফল পরিচালনা</p>
            </div>
            {['super_admin', 'admin', 'principal', 'teacher'].includes(user?.userType) && (
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> নতুন পরীক্ষা তৈরি
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex-center" style={{ padding: '60px' }}>
              <div className="spinner"></div>
            </div>
          ) : exams.length === 0 ? (
            <div className="card empty-state">
              <FileText size={48} style={{ opacity: 0.3 }} />
              <div className="empty-state-title mt-16">কোনো পরীক্ষা পাওয়া যায়নি</div>
              <p className="text-muted mt-8">এখনও কোনো পরীক্ষা শিডিউল করা হয়নি।</p>
            </div>
          ) : (
            <div className="grid grid-2">
              {exams.map((exam) => (
                <div key={exam._id} className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="flex-between">
                    <div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{exam.name}</h3>
                      <div className="text-sm text-muted">শ্রেণি: {exam.classLevel?.name || 'সকল শ্রেণি'}</div>
                    </div>
                    <span className={`badge ${getStatusBadgeClass(exam.status)}`}>
                      {getStatusLabel(exam.status)}
                    </span>
                  </div>
                  
                  <div className="flex gap-16 text-sm text-muted">
                    <span>শুরু: {exam.startDate ? new Date(exam.startDate).toLocaleDateString('bn-BD') : 'অজানা'}</span>
                    {exam.endDate && <span>শেষ: {new Date(exam.endDate).toLocaleDateString('bn-BD')}</span>}
                  </div>
                  
                  <div className="flex gap-12" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
                    <button className="btn btn-primary flex-1" onClick={() => handleMarkEntryStart(exam)}>
                      {isStudentOrGuardian ? 'ফলাফল দেখুন' : 'নম্বর এন্ট্রি'}
                    </button>
                    {['super_admin', 'admin', 'principal', 'teacher'].includes(user?.userType) && (
                      <button className="btn btn-secondary btn-icon" onClick={() => handleEditExam(exam)} title="সম্পাদনা">
                        <Edit size={16} />
                      </button>
                    )}
                    {['super_admin', 'admin', 'principal'].includes(user?.userType) && (
                      <button className="btn btn-secondary btn-icon text-danger" onClick={() => handleDeleteExam(exam._id)} title="মুছে ফেলুন">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create or Edit Exam Modal */}
          {isModalOpen && (
            <div
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                backdropFilter: 'blur(4px)'
              }}
              onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
            >
              <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '520px', margin: '20px' }}>
                <div className="flex-between mb-24">
                  <h2 style={{ fontSize: '1.25rem' }}>{editExamId ? 'পরীক্ষার তথ্য সম্পাদন' : 'নতুন পরীক্ষা শিডিউল করুন'}</h2>
                  <button className="btn-icon" onClick={handleCloseModal} type="button">
                    <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                </div>
                
                <form onSubmit={handleExamSubmit}>
                  <div className="form-group">
                    <label className="form-label">পরীক্ষার নাম *</label>
                    <input 
                      type="text" 
                      name="name" 
                      className="form-input" 
                      required 
                      value={formData.name} 
                      onChange={handleChange} 
                      placeholder="যেমন: প্রথম সাময়িক পরীক্ষা ২০২৪" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">শ্রেণি</label>
                    <select 
                      name="classLevel" 
                      className="form-input form-select" 
                      value={formData.classLevel} 
                      onChange={handleChange}
                    >
                      <option value="">সকল শ্রেণি / শ্রেণি নির্বাচন করুন</option>
                      {classes.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-2" style={{ gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">শুরুর তারিখ</label>
                      <input 
                        type="date" 
                        name="startDate" 
                        className="form-input" 
                        value={formData.startDate} 
                        onChange={handleChange} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">শেষের তারিখ</label>
                      <input 
                        type="date" 
                        name="endDate" 
                        className="form-input" 
                        value={formData.endDate} 
                        onChange={handleChange} 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">অবস্থা (Status)</label>
                    <select 
                      name="status" 
                      className="form-input form-select" 
                      value={formData.status} 
                      onChange={handleChange}
                    >
                      <option value="upcoming">আসন্ন (Upcoming)</option>
                      <option value="ongoing">চলমান (Ongoing)</option>
                      <option value="completed">সমাপ্ত (Completed)</option>
                      <option value="published">ফলাফল প্রকাশিত (Published)</option>
                    </select>
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
