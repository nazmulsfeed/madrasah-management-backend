import { useState, useEffect, useRef } from 'react';
import {
  BarChart2, Users, GraduationCap, ClipboardCheck, FileText, CreditCard,
  Download, RefreshCw, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Award,
  Search, ChevronLeft, ChevronRight, BookOpen
} from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

// Helper: format number as BDT
const formatTaka = (amount) => {
  if (!amount) return '৳০';
  return '৳' + Number(amount).toLocaleString('en-IN');
};

const MONTHS_BN = ['', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const STATUS_LABELS = { present: 'উপস্থিত', absent: 'অনুপস্থিত', late: 'বিলম্বিত', half_day: 'অর্ধদিন', on_leave: 'ছুটি' };
const STATUS_COLORS = { present: '#22c55e', absent: '#ef4444', late: '#f59e0b', half_day: '#3b82f6', on_leave: '#8b5cf6' };

// Stat Card Component
function StatCard({ icon: Icon, title, value, sub, color = 'teal' }) {
  const colors = {
    teal: { bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' },
    blue: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    amber: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    green: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
    red: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    purple: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  };
  const c = colors[color] || colors.teal;
  return (
    <div className="stats-card">
      <div className="stats-card-icon" style={{ background: c.bg, color: c.color }}>
        <Icon size={22} />
      </div>
      <div className="stats-card-value">{value}</div>
      <div className="stats-card-label">{title}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

// Progress Bar
function ProgressBar({ value, max, color = '#14b8a6', label }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value} ({pct}%)</span>
      </div>
      <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '100px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: '100px', transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  );
}

// Donut chart using SVG
function DonutChart({ segments, size = 100 }) {
  const radius = 38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--border-color)" strokeWidth="16" />
      {segments.map((seg, i) => {
        if (total === 0) return null;
        const dashLen = (seg.value / total) * circumference;
        const dashOffset = circumference - offset;
        offset += dashLen;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset}
          />
        );
      })}
    </svg>
  );
}

// ─── Attendance Calendar Grid ─────────────────────────────────
function AttendanceCalendar({ records, month, year }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const dayLabels = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

  // Build date→status map
  const statusMap = {};
  records.forEach(r => {
    const d = new Date(r.date);
    statusMap[d.getUTCDate()] = r.status;
  });

  const cells = [];
  // empty cells for offset
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} style={{ width: '36px', height: '36px' }} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const st = statusMap[d];
    const bg = st ? STATUS_COLORS[st] : 'var(--card-bg)';
    const border = st ? 'none' : '1px solid var(--border-color)';
    cells.push(
      <div key={d} title={st ? `${d} — ${STATUS_LABELS[st]}` : `${d}`} style={{
        width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.78rem', fontWeight: 600, background: bg, border, color: st ? '#fff' : 'var(--text-secondary)',
        cursor: 'default', transition: 'transform 0.15s', position: 'relative'
      }}>
        {d}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: '6px', marginBottom: '6px' }}>
        {dayLabels.map(l => (
          <div key={l} style={{ width: '36px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: '6px' }}>
        {cells}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: STATUS_COLORS[k] }} />
            <span style={{ color: 'var(--text-muted)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function ReportsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const printRef = useRef(null);

  // Individual report states
  const [studentsList, setStudentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [examsList, setExamsList] = useState([]);

  // Student Attendance
  const [selStudentAtt, setSelStudentAtt] = useState('');
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const [studentAttData, setStudentAttData] = useState(null);
  const [loadingStudentAtt, setLoadingStudentAtt] = useState(false);

  // Teacher Attendance
  const [selTeacherAtt, setSelTeacherAtt] = useState('');
  const [teacherAttMonth, setTeacherAttMonth] = useState(new Date().getMonth() + 1);
  const [teacherAttYear, setTeacherAttYear] = useState(new Date().getFullYear());
  const [teacherAttData, setTeacherAttData] = useState(null);
  const [loadingTeacherAtt, setLoadingTeacherAtt] = useState(false);

  // Student Marks
  const [selStudentMarks, setSelStudentMarks] = useState('');
  const [selExam, setSelExam] = useState('');
  const [studentMarksData, setStudentMarksData] = useState(null);
  const [loadingMarks, setLoadingMarks] = useState(false);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/summary');
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch report', err);
      setToast({ type: 'error', message: 'রিপোর্ট লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdowns
  useEffect(() => {
    fetchReport();
    const fetchLists = async () => {
      try {
        const [sRes, tRes, eRes] = await Promise.all([
          api.get('/students'),
          api.get('/teachers'),
          api.get('/exams')
        ]);
        if (sRes.data.success) setStudentsList(sRes.data.data || []);
        if (tRes.data.success) setTeachersList(tRes.data.data || []);
        if (eRes.data.success) setExamsList(eRes.data.data.exams || eRes.data.data || []);
      } catch (_) {}
    };
    fetchLists();
  }, []);

  // Fetch student attendance
  const fetchStudentAtt = async () => {
    if (!selStudentAtt) return;
    setLoadingStudentAtt(true);
    try {
      const res = await api.get(`/reports/student-attendance?studentId=${selStudentAtt}&month=${attMonth}&year=${attYear}`);
      if (res.data.success) setStudentAttData(res.data.data);
    } catch (err) {
      setToast({ type: 'error', message: 'উপস্থিতি ডেটা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoadingStudentAtt(false);
    }
  };

  // Fetch teacher attendance
  const fetchTeacherAtt = async () => {
    if (!selTeacherAtt) return;
    setLoadingTeacherAtt(true);
    try {
      const res = await api.get(`/reports/teacher-attendance?teacherId=${selTeacherAtt}&month=${teacherAttMonth}&year=${teacherAttYear}`);
      if (res.data.success) setTeacherAttData(res.data.data);
    } catch (err) {
      setToast({ type: 'error', message: 'শিক্ষক উপস্থিতি ডেটা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoadingTeacherAtt(false);
    }
  };

  // Fetch student marks
  const fetchStudentMarks = async () => {
    if (!selStudentMarks) return;
    setLoadingMarks(true);
    try {
      const params = `studentId=${selStudentMarks}${selExam ? `&examId=${selExam}` : ''}`;
      const res = await api.get(`/reports/student-marks?${params}`);
      if (res.data.success) setStudentMarksData(res.data.data);
    } catch (err) {
      setToast({ type: 'error', message: 'নম্বর ডেটা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoadingMarks(false);
    }
  };

  const handlePrint = () => { window.print(); };

  const changeMonth = (setter, yearSetter, currentMonth, currentYear, delta) => {
    let m = currentMonth + delta;
    let y = currentYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setter(m);
    yearSetter(y);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="spinner" />
        <p className="text-muted">রিপোর্ট তৈরি হচ্ছে...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card empty-state">
        <BarChart2 size={48} style={{ opacity: 0.3 }} />
        <div className="empty-state-title mt-16">রিপোর্ট লোড করা সম্ভব হয়নি</div>
        <button className="btn btn-primary mt-16" onClick={fetchReport}>পুনরায় চেষ্টা করুন</button>
      </div>
    );
  }

  const { students, teachers, attendance, exams, finance } = data;
  const todayAtt = attendance.today;
  const monthAtt = attendance.thisMonth;
  const grades = exams.gradeDistribution;

  const getStudentLabel = (s) => {
    const name = s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : '';
    return `${name} (${s.studentId || s.admissionNumber || ''})`;
  };
  const getTeacherLabel = (t) => {
    const name = t.user ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim() : '';
    return `${name} (${t.employeeId || ''})`;
  };

  return (
    <div className="animate-fade-in" ref={printRef}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 2000,
          padding: '14px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', maxWidth: '400px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem' }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">রিপোর্ট ও বিশ্লেষণ</h1>
          <p className="page-subtitle">
            সকল বিভাগের একত্রিত পরিসংখ্যান • সর্বশেষ আপডেট: {new Date(data.generatedAt).toLocaleString('bn-BD')}
          </p>
        </div>
        <div className="flex gap-12">
          <button className="btn btn-secondary" onClick={fetchReport}>
            <RefreshCw size={16} /> রিফ্রেশ
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Download size={16} /> PDF ডাউনলোড
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="print-only" style={{ marginBottom: '24px', borderBottom: '2px solid #14b8a6', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>মাদ্রাসা ম্যানেজমেন্ট সিস্টেম — সংযুক্ত রিপোর্ট</h1>
        <p style={{ color: '#666', marginTop: '4px', fontSize: '0.9rem' }}>
          তৈরির তারিখ: {new Date(data.generatedAt).toLocaleString('bn-BD')}
        </p>
      </div>

      {/* ═══════════ SUMMARY SECTIONS ═══════════ */}

      {/* Section 1: Students */}
      <section style={{ marginBottom: '32px' }}>
        <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
          <GraduationCap size={20} style={{ color: 'var(--primary-500)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>ছাত্র/ছাত্রী পরিসংখ্যান</h2>
        </div>
        <div className="grid grid-4">
          <StatCard icon={GraduationCap} title="মোট শিক্ষার্থী" value={students.total} color="teal" />
          <StatCard icon={CheckCircle} title="সক্রিয়" value={students.active} color="green" sub={`মোটের ${students.total > 0 ? Math.round(students.active / students.total * 100) : 0}%`} />
          <StatCard icon={Users} title="ছাত্র (ছেলে)" value={students.male} color="blue" />
          <StatCard icon={Users} title="ছাত্রী (মেয়ে)" value={students.female} color="purple" />
        </div>
        {students.byClass && students.byClass.length > 0 && (
          <div className="card mt-16">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>শ্রেণি অনুযায়ী শিক্ষার্থী সংখ্যা</h3>
            {students.byClass.map(cls => (
              <ProgressBar key={cls.className} label={cls.className} value={cls.count} max={students.total} color="#14b8a6" />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Teachers */}
      <section style={{ marginBottom: '32px' }}>
        <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
          <Users size={20} style={{ color: 'var(--primary-500)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>শিক্ষকমণ্ডলী পরিসংখ্যান</h2>
        </div>
        <div className="grid grid-4">
          <StatCard icon={Users} title="মোট শিক্ষক" value={teachers.total} color="teal" />
          <StatCard icon={CheckCircle} title="সক্রিয় শিক্ষক" value={teachers.active} color="green" />
          <StatCard icon={Users} title="জেনারেল বিভাগ" value={teachers.regular} color="blue" />
          <StatCard icon={Users} title="হিফজ বিভাগ" value={teachers.hifz} color="amber" />
        </div>
      </section>

      {/* Section 3: Overall Attendance */}
      <section style={{ marginBottom: '32px' }}>
        <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
          <ClipboardCheck size={20} style={{ color: 'var(--primary-500)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>সার্বিক উপস্থিতি</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--primary-400)' }}>আজকের উপস্থিতি</h3>
            {todayAtt.total === 0 ? (
              <p className="text-muted text-sm">আজকের কোনো উপস্থিতি ডেটা পাওয়া যায়নি</p>
            ) : (
              <div className="flex gap-16" style={{ alignItems: 'center' }}>
                <div>
                  <DonutChart segments={[
                    { value: todayAtt.present, color: '#22c55e' },
                    { value: todayAtt.absent, color: '#ef4444' },
                    { value: todayAtt.late, color: '#f59e0b' },
                  ]} size={110} />
                  <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, marginTop: '8px' }}>{todayAtt.rate}%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <ProgressBar label="উপস্থিত" value={todayAtt.present} max={todayAtt.total} color="#22c55e" />
                  <ProgressBar label="অনুপস্থিত" value={todayAtt.absent} max={todayAtt.total} color="#ef4444" />
                  <ProgressBar label="বিলম্বিত" value={todayAtt.late} max={todayAtt.total} color="#f59e0b" />
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--primary-400)' }}>এই মাসের উপস্থিতি</h3>
            {monthAtt.total === 0 ? (
              <p className="text-muted text-sm">এই মাসের কোনো উপস্থিতি ডেটা পাওয়া যায়নি</p>
            ) : (
              <div className="flex gap-16" style={{ alignItems: 'center' }}>
                <div>
                  <DonutChart segments={[
                    { value: monthAtt.present, color: '#22c55e' },
                    { value: monthAtt.absent, color: '#ef4444' },
                    { value: monthAtt.late, color: '#f59e0b' },
                  ]} size={110} />
                  <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, marginTop: '8px' }}>{monthAtt.rate}%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <ProgressBar label="উপস্থিত" value={monthAtt.present} max={monthAtt.total} color="#22c55e" />
                  <ProgressBar label="অনুপস্থিত" value={monthAtt.absent} max={monthAtt.total} color="#ef4444" />
                  <ProgressBar label="বিলম্বিত" value={monthAtt.late} max={monthAtt.total} color="#f59e0b" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 4: Exams Summary */}
      <section style={{ marginBottom: '32px' }}>
        <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
          <FileText size={20} style={{ color: 'var(--primary-500)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>পরীক্ষা ও ফলাফল</h2>
        </div>
        <div className="grid grid-4" style={{ marginBottom: '16px' }}>
          <StatCard icon={FileText} title="মোট পরীক্ষা" value={exams.total} color="teal" />
          <StatCard icon={TrendingUp} title="আসন্ন" value={exams.upcoming} color="blue" />
          <StatCard icon={RefreshCw} title="চলমান" value={exams.ongoing} color="amber" />
          <StatCard icon={CheckCircle} title="সমাপ্ত" value={exams.completed} color="green" />
        </div>
        {grades.totalEntries > 0 && (
          <div className="grid grid-2">
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>গ্রেড বিভাজন</h3>
              <ProgressBar label="A+ (৮০-১০০)" value={grades.aPlus} max={grades.totalEntries} color="#14b8a6" />
              <ProgressBar label="A (৭০-৭৯)" value={grades.a} max={grades.totalEntries} color="#3b82f6" />
              <ProgressBar label="A- (৬০-৬৯)" value={grades.aMinus} max={grades.totalEntries} color="#8b5cf6" />
              <ProgressBar label="B (৫০-৫৯)" value={grades.b} max={grades.totalEntries} color="#f59e0b" />
              <ProgressBar label="C (৪০-৪৯)" value={grades.c} max={grades.totalEntries} color="#f97316" />
              <ProgressBar label="D (৩৩-৩৯)" value={grades.d} max={grades.totalEntries} color="#64748b" />
              <ProgressBar label="F (০-৩২)" value={grades.failCount} max={grades.totalEntries} color="#ef4444" />
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>সার্বিক ফলাফল সারসংক্ষেপ</h3>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, background: 'var(--success-bg)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>{grades.passCount}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--success)' }}>উত্তীর্ণ</div>
                </div>
                <div style={{ flex: 1, background: 'var(--danger-bg)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)' }}>{grades.failCount}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>অনুত্তীর্ণ</div>
                </div>
              </div>
              <div style={{ background: 'var(--info-bg)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--info)' }}>{grades.avgMarks}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--info)' }}>গড় নম্বর (Avg Marks)</div>
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                মোট {grades.totalEntries} টি নম্বর এন্ট্রির উপর ভিত্তি করে
              </div>
            </div>
          </div>
        )}
        {exams.recent && exams.recent.length > 0 && (
          <div className="card table-container mt-16" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>সাম্প্রতিক পরীক্ষাসমূহ</h3>
            </div>
            <table className="table">
              <thead><tr><th>পরীক্ষার নাম</th><th>শ্রেণি</th><th>শুরুর তারিখ</th><th>অবস্থা</th></tr></thead>
              <tbody>
                {exams.recent.map(exam => (
                  <tr key={exam._id}>
                    <td className="font-semibold">{exam.name}</td>
                    <td>{exam.classLevel?.name || 'সকল শ্রেণি'}</td>
                    <td>{exam.startDate ? new Date(exam.startDate).toLocaleDateString('bn-BD') : '—'}</td>
                    <td>
                      <span className={`badge ${exam.status === 'published' ? 'badge-active' : exam.status === 'completed' ? 'badge-info' : exam.status === 'ongoing' ? 'badge-warning' : 'badge-muted'}`}>
                        {exam.status === 'upcoming' ? 'আসন্ন' : exam.status === 'ongoing' ? 'চলমান' : exam.status === 'completed' ? 'সমাপ্ত' : 'ফলাফল প্রকাশিত'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 5: Finance */}
      <section style={{ marginBottom: '32px' }}>
        <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
          <CreditCard size={20} style={{ color: 'var(--primary-500)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>আর্থিক সারসংক্ষেপ</h2>
        </div>
        <div className="grid grid-4">
          <StatCard icon={CreditCard} title="মোট বিল" value={formatTaka(finance.invoiced)} color="teal" />
          <StatCard icon={CheckCircle} title="সংগৃহীত" value={formatTaka(finance.paid)} color="green" />
          <StatCard icon={AlertCircle} title="বকেয়া" value={formatTaka(finance.outstanding)} color="red" />
          <StatCard icon={Award} title="সংগ্রহ হার" value={`${finance.collectionRate}%`} color="blue" />
        </div>
        <div className="card mt-16">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>আর্থিক সংগ্রহ অগ্রগতি</h3>
          <ProgressBar label="সংগৃহীত পরিমাণ" value={finance.paid} max={finance.invoiced} color="#22c55e" />
          <ProgressBar label="বকেয়া পরিমাণ" value={finance.outstanding} max={finance.invoiced} color="#ef4444" />
        </div>
      </section>

      {/* ═══════════ INDIVIDUAL REPORTS ═══════════ */}
      <div style={{ borderTop: '2px solid var(--primary-500)', marginBottom: '32px', paddingTop: '8px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-400)' }}>📋 ব্যক্তিগত রিপোর্ট</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>নির্দিষ্ট শিক্ষার্থী/শিক্ষকের উপস্থিতি ও নম্বর দেখুন</p>
      </div>

      {/* ── Individual Student Attendance ── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
          <ClipboardCheck size={20} style={{ color: '#22c55e' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>শিক্ষার্থীর ব্যক্তিগত উপস্থিতি</h2>
        </div>
        <div className="card">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label className="form-label">শিক্ষার্থী নির্বাচন করুন</label>
              <select className="form-select" value={selStudentAtt} onChange={e => setSelStudentAtt(e.target.value)}>
                <option value="">-- শিক্ষার্থী বাছুন --</option>
                {studentsList.map(s => (
                  <option key={s._id} value={s._id}>{getStudentLabel(s)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => changeMonth(setAttMonth, setAttYear, attMonth, attYear, -1)}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ minWidth: '140px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                {MONTHS_BN[attMonth]} {attYear}
              </span>
              <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => changeMonth(setAttMonth, setAttYear, attMonth, attYear, 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
            <button className="btn btn-primary" onClick={fetchStudentAtt} disabled={!selStudentAtt || loadingStudentAtt}>
              <Search size={16} /> {loadingStudentAtt ? 'অনুসন্ধান...' : 'দেখুন'}
            </button>
          </div>

          {studentAttData && (
            <div style={{ animation: 'slideDown 0.3s ease-out' }}>
              <div style={{ padding: '12px 16px', background: 'var(--primary-50)', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{studentAttData.student?.name}</span>
                  <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>({studentAttData.student?.studentId})</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{MONTHS_BN[studentAttData.month]} {studentAttData.year}</span>
              </div>
              <div className="grid grid-2" style={{ gap: '20px' }}>
                <AttendanceCalendar records={studentAttData.records} month={studentAttData.month} year={studentAttData.year} />
                <div>
                  <div className="grid grid-2" style={{ gap: '10px', marginBottom: '16px' }}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <div key={k} style={{ padding: '12px', borderRadius: '10px', background: `${STATUS_COLORS[k]}15`, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: STATUS_COLORS[k] }}>{studentAttData.summary[k] || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: STATUS_COLORS[k] }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {studentAttData.summary.total > 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', background: 'var(--success-bg)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
                        {Math.round((studentAttData.summary.present / studentAttData.summary.total) * 100)}%
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--success)' }}>উপস্থিতি হার</div>
                    </div>
                  )}
                  {studentAttData.summary.total === 0 && (
                    <p className="text-muted text-sm" style={{ textAlign: 'center' }}>এই মাসে কোনো উপস্থিতি ডেটা নেই</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Individual Teacher Attendance ── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
          <Users size={20} style={{ color: '#3b82f6' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>শিক্ষকের ব্যক্তিগত উপস্থিতি</h2>
        </div>
        <div className="card">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label className="form-label">শিক্ষক নির্বাচন করুন</label>
              <select className="form-select" value={selTeacherAtt} onChange={e => setSelTeacherAtt(e.target.value)}>
                <option value="">-- শিক্ষক বাছুন --</option>
                {teachersList.map(t => (
                  <option key={t._id} value={t._id}>{getTeacherLabel(t)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => changeMonth(setTeacherAttMonth, setTeacherAttYear, teacherAttMonth, teacherAttYear, -1)}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ minWidth: '140px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                {MONTHS_BN[teacherAttMonth]} {teacherAttYear}
              </span>
              <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => changeMonth(setTeacherAttMonth, setTeacherAttYear, teacherAttMonth, teacherAttYear, 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
            <button className="btn btn-primary" onClick={fetchTeacherAtt} disabled={!selTeacherAtt || loadingTeacherAtt}>
              <Search size={16} /> {loadingTeacherAtt ? 'অনুসন্ধান...' : 'দেখুন'}
            </button>
          </div>

          {teacherAttData && (
            <div style={{ animation: 'slideDown 0.3s ease-out' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{teacherAttData.teacher?.name}</span>
                  <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>({teacherAttData.teacher?.employeeId})</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{MONTHS_BN[teacherAttData.month]} {teacherAttData.year}</span>
              </div>
              <div className="grid grid-2" style={{ gap: '20px' }}>
                <AttendanceCalendar records={teacherAttData.records} month={teacherAttData.month} year={teacherAttData.year} />
                <div>
                  <div className="grid grid-2" style={{ gap: '10px', marginBottom: '16px' }}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <div key={k} style={{ padding: '12px', borderRadius: '10px', background: `${STATUS_COLORS[k]}15`, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: STATUS_COLORS[k] }}>{teacherAttData.summary[k] || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: STATUS_COLORS[k] }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {teacherAttData.summary.total > 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>
                        {Math.round((teacherAttData.summary.present / teacherAttData.summary.total) * 100)}%
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#3b82f6' }}>উপস্থিতি হার</div>
                    </div>
                  )}
                  {teacherAttData.summary.total === 0 && (
                    <p className="text-muted text-sm" style={{ textAlign: 'center' }}>এই মাসে কোনো উপস্থিতি ডেটা নেই</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Individual Student Marks ── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
          <BookOpen size={20} style={{ color: '#a855f7' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>শিক্ষার্থীর পরীক্ষার নম্বর</h2>
        </div>
        <div className="card">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label className="form-label">শিক্ষার্থী নির্বাচন করুন</label>
              <select className="form-select" value={selStudentMarks} onChange={e => setSelStudentMarks(e.target.value)}>
                <option value="">-- শিক্ষার্থী বাছুন --</option>
                {studentsList.map(s => (
                  <option key={s._id} value={s._id}>{getStudentLabel(s)}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label">পরীক্ষা (ঐচ্ছিক)</label>
              <select className="form-select" value={selExam} onChange={e => setSelExam(e.target.value)}>
                <option value="">সকল পরীক্ষা</option>
                {examsList.map(e => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={fetchStudentMarks} disabled={!selStudentMarks || loadingMarks}>
              <Search size={16} /> {loadingMarks ? 'অনুসন্ধান...' : 'দেখুন'}
            </button>
          </div>

          {studentMarksData && (
            <div style={{ animation: 'slideDown 0.3s ease-out' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(168,85,247,0.1)', borderRadius: '10px', marginBottom: '16px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{studentMarksData.student?.name}</span>
                <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>({studentMarksData.student?.studentId})</span>
              </div>

              {studentMarksData.examResults.length === 0 ? (
                <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px' }}>কোনো নম্বর এন্ট্রি পাওয়া যায়নি</p>
              ) : (
                studentMarksData.examResults.map((er, idx) => (
                  <div key={idx} className="card" style={{ marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{er.exam?.name || 'অজানা পরীক্ষা'}</h4>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className={`badge ${er.overallPercentage >= 80 ? 'badge-active' : er.overallPercentage >= 60 ? 'badge-info' : er.overallPercentage >= 33 ? 'badge-warning' : 'badge-danger'}`}>
                          সার্বিক: {er.overallPercentage}%
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {er.totalObtained}/{er.totalMarks}
                        </span>
                      </div>
                    </div>
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'center' }}>বিষয়</th>
                          <th style={{ textAlign: 'center' }}>প্রাপ্ত নম্বর</th>
                          <th style={{ textAlign: 'center' }}>মোট নম্বর</th>
                          <th style={{ textAlign: 'center' }}>শতাংশ</th>
                          <th style={{ textAlign: 'center' }}>গ্রেড</th>
                        </tr>
                      </thead>
                      <tbody>
                        {er.subjects.map((sub, si) => (
                          <tr key={si}>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{sub.subject?.name || '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontWeight: 700, color: sub.percentage >= 80 ? '#22c55e' : sub.percentage >= 60 ? '#3b82f6' : sub.percentage >= 33 ? '#f59e0b' : '#ef4444' }}>
                                {sub.marksObtained}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>{sub.totalMarks}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '50px', height: '6px', background: 'var(--border-color)', borderRadius: '100px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%', width: `${sub.percentage}%`, borderRadius: '100px',
                                    background: sub.percentage >= 80 ? '#22c55e' : sub.percentage >= 60 ? '#3b82f6' : sub.percentage >= 33 ? '#f59e0b' : '#ef4444'
                                  }} />
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{sub.percentage}%</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-muted">{sub.grade || '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          .sidebar, .topbar { display: none !important; }
          .main-content { margin: 0 !important; padding: 16px !important; }
          .card { background: white !important; border: 1px solid #ddd !important; break-inside: avoid; box-shadow: none !important; }
          .stats-card { background: white !important; border: 1px solid #ddd !important; break-inside: avoid; }
          .stats-card-value { -webkit-text-fill-color: black !important; color: black !important; }
          .badge { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}
