import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  UserCheck,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  ClipboardCheck,
  FileText,
  BookOpenCheck,
  ArrowUpRight,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../api/axios';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, getUserTypeLabel } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalStudents: 0,
      activeStudents: 0,
      totalTeachers: 0,
      monthlyCollection: 0,
      attendanceRate: 0,
      dueAmount: 0,
      dueCount: 0,
      hifzCompleted: 0,
    },
    activities: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        if (res.data.success) {
          setDashboardData(res.data.data);
        }
      } catch (err) {
        console.log('Dashboard summary fetch failed');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'সুপ্রভাত';
    if (hour < 17) return 'শুভ অপরাহ্ন';
    if (hour < 20) return 'শুভ সন্ধ্যা';
    return 'শুভ রাত্রি';
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'এইমাত্র';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'গতকাল';
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' });
  };

  const userName = user?.fullName || user?.firstName || user?.username || '';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* স্বাগত বার্তা */}
      <div className="dashboard-welcome">
        <h2>{greeting()}, {userName}! 👋</h2>
        <p>
          আজকের তারিখ: {new Date().toLocaleDateString('bn-BD', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {' • '}
          ভূমিকা: {getUserTypeLabel()}
        </p>

        <div className="dashboard-quick-actions">
          <button className="quick-action-btn" onClick={() => navigate('/students/new')}>
            <Plus size={14} /> নতুন ছাত্র ভর্তি
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/attendance')}>
            <ClipboardCheck size={14} /> উপস্থিতি চিহ্নিত
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/exams')}>
            <FileText size={14} /> নম্বর এন্ট্রি
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/hifz')}>
            <BookOpenCheck size={14} /> হিফজ অগ্রগতি
          </button>
        </div>
      </div>

      {/* পরিসংখ্যান কার্ড */}
      <div className="grid grid-4 mb-24">
        <div className="stats-card animate-slide-up stagger-1">
          <div className="stats-card-icon teal">
            <GraduationCap size={24} />
          </div>
          <div className="stats-card-value">{dashboardData.stats.totalStudents}</div>
          <div className="stats-card-label">মোট ছাত্র/ছাত্রী</div>
          <div className="stats-card-trend up">
            <TrendingUp size={12} /> বাস্তব তথ্য
          </div>
        </div>

        <div className="stats-card animate-slide-up stagger-2">
          <div className="stats-card-icon green">
            <UserCheck size={24} />
          </div>
          <div className="stats-card-value">{dashboardData.stats.activeStudents}</div>
          <div className="stats-card-label">সক্রিয় ছাত্র/ছাত্রী</div>
          <div className="stats-card-trend up">
            <TrendingUp size={12} /> বাস্তব তথ্য
          </div>
        </div>

        <div className="stats-card animate-slide-up stagger-3">
          <div className="stats-card-icon blue">
            <Users size={24} />
          </div>
          <div className="stats-card-value">{dashboardData.stats.totalTeachers}</div>
          <div className="stats-card-label">মোট শিক্ষক</div>
          <div className="stats-card-trend up">
            <TrendingUp size={12} /> বাস্তব তথ্য
          </div>
        </div>

        <div className="stats-card animate-slide-up stagger-4">
          <div className="stats-card-icon amber">
            <CreditCard size={24} />
          </div>
          <div className="stats-card-value">৳{Number(dashboardData.stats.monthlyCollection).toLocaleString('en-IN')}</div>
          <div className="stats-card-label">এ মাসের আদায়</div>
          <div className="stats-card-trend up">
            <TrendingUp size={12} /> বাস্তব তথ্য
          </div>
        </div>
        </div>

      {/* Finance Specific Section (Only for Admins and Accountants) */}
      {['super_admin', 'co_super_admin', 'admin', 'accountant', 'principal'].includes(user?.userType) && (
        <>
          <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '1.25rem', color: 'var(--text)' }}>আর্থিক ওভারভিউ (Finance Summary)</h3>
          
          <div className="grid grid-3 mb-16">
            <div className="stats-card animate-slide-up" style={{ borderLeft: '4px solid var(--success)' }}>
              <div className="stats-card-label text-success font-medium">আজকের আয় (Today Income)</div>
              <div className="stats-card-value font-mono">৳{Number(dashboardData.stats.todayIncome).toLocaleString('en-IN')}</div>
              <div className="stats-card-trend"><TrendingUp size={12} /> ফি এবং অন্যান্য আয়</div>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ borderLeft: '4px solid var(--danger)', animationDelay: '0.1s' }}>
              <div className="stats-card-label text-danger font-medium">আজকের ব্যয় (Today Expense)</div>
              <div className="stats-card-value font-mono">৳{Number(dashboardData.stats.todayExpense).toLocaleString('en-IN')}</div>
              <div className="stats-card-trend"><TrendingDown size={12} /> ভাউচার পেমেন্ট</div>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ borderLeft: '4px solid var(--primary-500)', animationDelay: '0.2s' }}>
              <div className="stats-card-label text-primary font-medium">বর্তমান নগদ (Cash Balance)</div>
              <div className="stats-card-value font-mono">৳{Number(dashboardData.stats.cashBalance).toLocaleString('en-IN')}</div>
              <div className="stats-card-trend"><CreditCard size={12} /> ক্যাশ ইন হ্যান্ড</div>
            </div>
          </div>
          
          <div className="grid grid-4 mb-24">
            <div className="stats-card animate-slide-up" style={{ borderLeft: '4px solid #8b5cf6', animationDelay: '0.3s' }}>
              <div className="stats-card-label font-medium" style={{ color: '#8b5cf6' }}>ব্যাংক ব্যালেন্স</div>
              <div className="stats-card-value font-mono">৳{Number(dashboardData.stats.bankBalance).toLocaleString('en-IN')}</div>
              <div className="stats-card-trend"><BookOpenCheck size={12} /> ব্যাংকে জমা</div>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ borderLeft: '4px solid #ec4899', animationDelay: '0.4s' }}>
              <div className="stats-card-label font-medium" style={{ color: '#ec4899' }}>ডিজিটাল ওয়ালেট</div>
              <div className="stats-card-value font-mono">৳{Number(dashboardData.stats.walletBalance).toLocaleString('en-IN')}</div>
              <div className="stats-card-trend"><CreditCard size={12} /> বিকাশ, নগদ, রকেট</div>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ borderLeft: '4px solid #f59e0b', animationDelay: '0.5s' }}>
              <div className="stats-card-label text-warning font-medium">মোট বকেয়া (Total Due)</div>
              <div className="stats-card-value font-mono">৳{Number(dashboardData.stats.dueAmount).toLocaleString('en-IN')}</div>
              <div className="stats-card-trend"><TrendingUp size={12} /> {dashboardData.stats.dueCount} জন শিক্ষার্থীর কাছে পাওনা</div>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ borderLeft: '4px solid #14b8a6', animationDelay: '0.6s' }}>
              <div className="stats-card-label text-teal font-medium">আজকের জমাদানকারী শিক্ষার্থী</div>
              <div className="stats-card-value font-mono">{Number(dashboardData.stats.todayPayingStudents).toLocaleString('bn-BD')} জন</div>
              <div className="stats-card-trend"><BookOpenCheck size={12} /> যারা ফি দিয়েছে</div>
            </div>
          </div>

          <div className="grid grid-3 mb-24">
            <div className="card text-center" style={{ padding: '16px', background: 'rgba(20, 184, 166, 0.05)' }}>
              <div className="text-muted text-sm mb-4">মাসিক আয়</div>
              <div className="font-mono font-bold text-success" style={{ fontSize: '1.2rem' }}>৳{Number(dashboardData.stats.monthlyIncome).toLocaleString('en-IN')}</div>
            </div>
            <div className="card text-center" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div className="text-muted text-sm mb-4">মাসিক ব্যয়</div>
              <div className="font-mono font-bold text-danger" style={{ fontSize: '1.2rem' }}>৳{Number(dashboardData.stats.monthlyExpense).toLocaleString('en-IN')}</div>
            </div>
            <div className="card text-center" style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.05)' }}>
              <div className="text-muted text-sm mb-4">উদ্বৃত্ত/ঘাটতি</div>
              <div className="font-mono font-bold" style={{ fontSize: '1.2rem', color: dashboardData.stats.surplus >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                ৳{Number(dashboardData.stats.surplus).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </>
      )}

      {/* নিচের সেকশন */}
      <div className="grid grid-2">
        {/* সাম্প্রতিক কার্যক্রম */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="card-header">
            <h3 className="card-title">সাম্প্রতিক কার্যক্রম</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>সব দেখুন</button>
          </div>
          <div>
            {dashboardData.activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                কোনো সাম্প্রতিক কার্যক্রম নেই
              </div>
            ) : (
              dashboardData.activities.map((act, i) => (
                <div key={i} className="activity-item">
                  <div className={`activity-dot ${act.color || 'teal'}`}></div>
                  <div>
                    <div className="activity-text">{act.text}</div>
                    <div className="activity-time">{formatTimeAgo(act.date)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* দ্রুত তথ্য */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <h3 className="card-title">আজকের সারসংক্ষেপ</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'rgba(20, 184, 166, 0.06)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid rgba(20, 184, 166, 0.1)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                  উপস্থিতির হার
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Inter' }}>
                  {dashboardData.stats.attendanceRate}%
                </div>
              </div>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: `conic-gradient(var(--primary-500) ${dashboardData.stats.attendanceRate}%, var(--border-color) 0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.688rem',
                  fontWeight: 700,
                  color: 'var(--primary-400)',
                }}>
                  {dashboardData.stats.attendanceRate}%
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'rgba(245, 158, 11, 0.06)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid rgba(245, 158, 11, 0.1)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                  বকেয়া ফি
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Inter' }}>
                  ৳{Number(dashboardData.stats.dueAmount).toLocaleString('en-IN')}
                </div>
              </div>
              <span className="badge badge-warning">{dashboardData.stats.dueCount} জন</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'rgba(34, 197, 94, 0.06)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid rgba(34, 197, 94, 0.1)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                  হিফজ সম্পন্ন (এ বছর)
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Inter' }}>
                  {dashboardData.stats.hifzCompleted} জন
                </div>
              </div>
              <span className="badge badge-success">🎉 মাশাআল্লাহ</span>
            </div>

            <button
              className="btn btn-secondary w-full mt-8"
              onClick={() => navigate('/students')}
            >
              ছাত্র তালিকা দেখুন <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
