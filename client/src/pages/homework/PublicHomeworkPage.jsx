import { useState, useEffect } from 'react';
import { BookOpen, FileText, Calendar, ShieldAlert, Search, Sun, Moon, Download } from 'lucide-react';
import api from '../../api/axios';
import { SECTION_OPTIONS } from '../../utils/constants';

export default function PublicHomeworkPage() {
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(null);
  const [institutionName, setInstitutionName] = useState('দারুল উলূম মাদ্রাসা');
  
  // Theme State
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Filter States
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [loadingHomeworks, setLoadingHomeworks] = useState(false);

  useEffect(() => {
    const checkSettingsAndLoad = async () => {
      try {
        const settingsRes = await api.get('/homework/public/settings');
        const allowed = settingsRes.data.data.isHomeworkPublic;
        setIsPublic(allowed);
        if (settingsRes.data.data.institutionName) {
          setInstitutionName(settingsRes.data.data.institutionName);
        }

        if (allowed) {
          // Fetch once to populate dropdown filter choices
          const res = await api.get('/homework/public?limit=1000');
          if (res.data.success) {
            const list = res.data.data || [];
            setClasses(Array.from(new Set(list.map(h => h.classLevel).filter(Boolean))));
            setSubjects(Array.from(new Set(list.map(h => h.subject).filter(Boolean))));
            setSections(Array.from(new Set(list.map(h => h.section).filter(Boolean))));
          }
        }
      } catch (err) {
        console.error('Failed to load public settings', err);
        setIsPublic(false);
      } finally {
        setLoading(false);
      }
    };
    checkSettingsAndLoad();
  }, []);

  useEffect(() => {
    if (isPublic !== true) return;

    const fetchFilteredHomeworks = async () => {
      setLoadingHomeworks(true);
      try {
        const params = {};
        if (dateFilter === 'today') {
          params.dateFilter = 'today';
        } else if (dateFilter === 'custom' && customDate) {
          params.dateFilter = customDate;
        } else {
          params.dateFilter = 'all';
        }

        if (classFilter) params.classLevel = classFilter;
        if (sectionFilter) params.section = sectionFilter;
        if (subjectFilter) params.subject = subjectFilter;
        if (statusFilter) params.status = statusFilter;
        if (searchQuery) params.search = searchQuery;

        params.limit = 1000;

        const res = await api.get('/homework/public', { params });
        if (res.data.success) {
          setHomeworks(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load filtered homeworks', err);
      } finally {
        setLoadingHomeworks(false);
      }
    };

    fetchFilteredHomeworks();
  }, [isPublic, dateFilter, customDate, classFilter, sectionFilter, subjectFilter, statusFilter, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(search);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const filteredHomeworks = homeworks;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="spinner"></div>
        <span style={{ marginLeft: '12px' }}>তথ্য লোড হচ্ছে...</span>
      </div>
    );
  }

  if (isPublic === false) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '20px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>পাবলিক অ্যাক্সেস নিষ্ক্রিয়</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '0.9rem' }}>
          {institutionName}-এর হোমওয়ার্ক তালিকাটি বর্তমানে সর্বসাধারণের জন্য উন্মুক্ত নয়। অনুগ্রহ করে আপনার অ্যাকাউন্টে লগ ইন করে চেক করুন।
        </p>
        <a href="/login" className="btn btn-primary" style={{ marginTop: '24px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', height: '42px', padding: '0 24px', borderRadius: '8px' }}>
          লগ ইন পেজে যান
        </a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '40px 20px', transition: 'background 0.3s, color 0.3s' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '6px' }}>
              <BookOpen size={16} /> {institutionName}
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>আজকের হোমওয়ার্ক ও অ্যাসাইনমেন্ট</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontSize: '0.95rem' }}>অফিসিয়াল ড্যাশবোর্ড থেকে রিয়েল-টাইমে প্রকাশিত ও উন্মুক্ত হোমওয়ার্কসমূহ</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showInstallBtn && (
              <button 
                onClick={handleInstallClick} 
                title="অ্যাপ ইনস্টল করুন"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '42px',
                  padding: '0 16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Download size={16} />
                <span>অ্যাপ ইনস্টল করুন</span>
              </button>
            )}
            <button 
              onClick={toggleTheme} 
              title="থিম পরিবর্তন করুন"
              style={{
                width: '42px',
                height: '42px',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <a href="/login" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 20px', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              ড্যাশবোর্ডে লগ ইন
            </a>
          </div>
        </div>

        {/* Filter Bar (Premium Styling Matching Screenshot) */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '16px 20px', 
          marginBottom: '32px', 
          backdropFilter: 'blur(10px)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="বিষয় বা শিরোনাম দিয়ে খুঁজুন..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ 
                    width: '100%',
                    padding: '8px 12px 8px 36px', 
                    background: 'var(--bg-input)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    color: 'var(--text-primary)', 
                    fontSize: '0.875rem',
                    outline: 'none'
                  }} 
                />
              </div>
              <button 
                type="submit" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)',
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  fontSize: '0.875rem', 
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <Search size={14} /> অনুসন্ধান
              </button>
            </form>

            {/* Dropdown 1: Date Filter */}
            <select 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)} 
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <option value="today">আজকের হোমওয়ার্ক</option>
              <option value="all">সকল হোমওয়ার্ক</option>
              <option value="custom">নির্দিষ্ট তারিখ</option>
            </select>

            {/* Custom Date Input */}
            {dateFilter === 'custom' && (
              <input 
                type="date" 
                value={customDate} 
                onChange={e => setCustomDate(e.target.value)} 
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', outline: 'none', fontSize: '0.875rem' }}
              />
            )}

            {/* Dropdown 2: Subject Filter */}
            <select 
              value={subjectFilter} 
              onChange={e => setSubjectFilter(e.target.value)} 
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <option value="">সকল বিষয়</option>
              {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>

            {/* Dropdown 3: Class Filter */}
            <select 
              value={classFilter} 
              onChange={e => setClassFilter(e.target.value)} 
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <option value="">সকল শ্রেণী</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Dropdown 4: Section Filter */}
            <select 
              value={sectionFilter} 
              onChange={e => setSectionFilter(e.target.value)} 
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <option value="">সকল সেকশন</option>
              {SECTION_OPTIONS.map((sec, idx) => (
                <option key={idx} value={sec}>{sec}</option>
              ))}
            </select>

            {/* Dropdown 5: Status Filter */}
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <option value="">সকল স্ট্যাটাস</option>
              <option value="active">সক্রিয়</option>
              <option value="closed">বন্ধ</option>
            </select>

            {/* Clear Filters Link */}
            {(classFilter || sectionFilter || subjectFilter || dateFilter !== 'today' || statusFilter || searchQuery) && (
              <button 
                onClick={() => { 
                  setClassFilter(''); 
                  setSectionFilter(''); 
                  setSubjectFilter(''); 
                  setDateFilter('today'); 
                  setCustomDate('');
                  setStatusFilter('');
                  setSearch('');
                  setSearchQuery('');
                }} 
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
              >
                ফিল্টার মুছুন
              </button>
            )}

            <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              মোট হোমওয়ার্ক: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{filteredHomeworks.length}</span> টি
            </div>
          </div>
        </div>

        {/* Homework Grid */}
        {filteredHomeworks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>কোনো সক্রিয় হোমওয়ার্ক পাওয়া যায়নি</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>ফিল্টারের মানদণ্ড অনুযায়ী কোনো সক্রিয় হোমওয়ার্ক পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
            {filteredHomeworks.map(hw => (
              <div 
                key={hw._id} 
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '16px', 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column',
                  height: '280px',
                  transition: 'transform 0.2s, border-color 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{hw.subject || 'অজানা বিষয়'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{hw.classLevel} • {hw.section}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '20px' }}>
                    শিক্ষক: {hw.assignedBy?.fullName || 'অজানা'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 10px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {hw.title}
                  {hw.isKhataHomework && (
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-300)', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 500 }}>
                      খাতায় লেখার কাজ দেওয়া হয়েছে
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: 1.6, flex: 1, whiteSpace: 'pre-line', overflowY: 'auto' }}>{hw.description}</p>
                
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} />
                    <span>পোস্ট: {new Date(hw.assignDate || hw.createdAt).toLocaleDateString('bn-BD')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600 }}>
                    <Calendar size={13} />
                    <span>জমা: {new Date(hw.dueDate).toLocaleDateString('bn-BD')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
