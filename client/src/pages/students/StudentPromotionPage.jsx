import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, GraduationCap, RefreshCw, CheckCircle, AlertCircle, 
  Search, Award, ShieldAlert, Star, TrendingUp, CheckSquare, Square 
} from 'lucide-react';
import api from '../../api/axios';
import { SECTION_OPTIONS } from '../../utils/constants';

export default function StudentPromotionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Lists
  const [academicYears, setAcademicYears] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [sections, setSections] = useState([]);

  // Source selection states
  const [sourceYear, setSourceYear] = useState('');
  const [sourceClass, setSourceClass] = useState('');
  const [sourceSection, setSourceSection] = useState('');

  // Destination selection states
  const [destYear, setDestYear] = useState('');
  const [destClass, setDestClass] = useState('');
  const [destSection, setDestSection] = useState('');

  // Candidates
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  
  // Selection/Input states
  const [selectedIds, setSelectedIds] = useState([]);
  const [customRolls, setCustomRolls] = useState({}); // { [studentId]: roll }
  const [rollOption, setRollOption] = useState('same'); // 'same', 'sequential', 'merit'
  
  // Filters
  const [search, setSearch] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('all'); // 'all', 'passed', 'failed', 'no_marks'

  // Load lists
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [yearsRes, classesRes, sectionsRes] = await Promise.all([
          api.get('/students/academic-years'),
          api.get('/students/classes'),
          api.get('/teachers') // we can get sections, wait let's query sections
        ]);

        if (yearsRes.data.success) setAcademicYears(yearsRes.data.data.academicYears || []);
        if (classesRes.data.success) setClassLevels(classesRes.data.data.classes || []);
        
        // Fetch sections
        const secRes = await api.get('/students/sections');
        if (secRes.data.success) setSections(secRes.data.data.sections || []);
      } catch (err) {
        console.error('Error loading promotion dropdowns', err);
      }
    };
    loadDropdowns();
  }, []);

  // Fetch candidates
  const handleLoadCandidates = async () => {
    if (!sourceYear || !sourceClass) {
      setToast({ type: 'error', message: 'অনুগ্রহ করে উৎস শিক্ষাবর্ষ ও শ্রেণি নির্বাচন করুন' });
      return;
    }
    setLoadingCandidates(true);
    setCandidates([]);
    setSelectedIds([]);
    try {
      const params = { academicYear: sourceYear, classLevel: sourceClass };
      if (sourceSection) params.section = sourceSection;

      const res = await api.get('/students/promotion-candidates', { params });
      if (res.data.success) {
        const list = res.data.data.candidates || [];
        setCandidates(list);
        // Default select all
        setSelectedIds(list.map(c => c.studentId));
        
        // Initial custom rolls mapping
        const rolls = {};
        list.forEach(c => {
          rolls[c.studentId] = c.rollNumber;
        });
        setCustomRolls(rolls);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'শিক্ষার্থী তালিকা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (studentId) => {
    if (selectedIds.includes(studentId)) {
      setSelectedIds(selectedIds.filter(id => id !== studentId));
    } else {
      setSelectedIds([...selectedIds, studentId]);
    }
  };

  const handleSelectAll = (visibleCandidates) => {
    const visibleIds = visibleCandidates.map(c => c.studentId);
    // If all visible are already selected, deselect them
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !visibleIds.includes(id)));
    } else {
      // Add missing ones
      const newSelect = [...selectedIds];
      visibleIds.forEach(id => {
        if (!newSelect.includes(id)) newSelect.push(id);
      });
      setSelectedIds(newSelect);
    }
  };

  // Apply auto-roll assignment based on selected option
  useEffect(() => {
    if (candidates.length === 0) return;
    const rolls = { ...customRolls };

    if (rollOption === 'same') {
      candidates.forEach(c => {
        rolls[c.studentId] = c.rollNumber;
      });
    } else if (rollOption === 'sequential') {
      // Sort selected candidates by their current roll (numerically)
      const sorted = [...candidates]
        .filter(c => selectedIds.includes(c.studentId))
        .sort((a, b) => (parseInt(a.rollNumber) || 999) - (parseInt(b.rollNumber) || 999));
      
      sorted.forEach((c, idx) => {
        rolls[c.studentId] = String(idx + 1);
      });
    } else if (rollOption === 'merit') {
      // Sort selected candidates by average percentage descending, putting no-marks at the end
      const sorted = [...candidates]
        .filter(c => selectedIds.includes(c.studentId))
        .sort((a, b) => {
          const aPct = a.avgPercentage !== null ? a.avgPercentage : -1;
          const bPct = b.avgPercentage !== null ? b.avgPercentage : -1;
          return bPct - aPct;
        });

      sorted.forEach((c, idx) => {
        rolls[c.studentId] = String(idx + 1);
      });
    }
    setCustomRolls(rolls);
  }, [rollOption, selectedIds, candidates]);

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.admissionNumber.includes(search);
    
    if (performanceFilter === 'all') return matchesSearch;
    if (performanceFilter === 'passed') return matchesSearch && c.avgPercentage !== null && c.avgPercentage >= 33;
    if (performanceFilter === 'failed') return matchesSearch && c.avgPercentage !== null && c.avgPercentage < 33;
    if (performanceFilter === 'no_marks') return matchesSearch && c.avgPercentage === null;
    return matchesSearch;
  });

  // Submit Promotion
  const handlePromote = async () => {
    if (selectedIds.length === 0) {
      setToast({ type: 'error', message: 'উত্তীর্ণ করার জন্য কমপক্ষে ১ জন শিক্ষার্থী নির্বাচন করুন' });
      return;
    }
    if (!destYear || !destClass || !destSection) {
      setToast({ type: 'error', message: 'গন্তব্য শিক্ষাবর্ষ, শ্রেণি এবং সেকশন নির্বাচন করুন' });
      return;
    }
    if (sourceYear === destYear && sourceClass === destClass && sourceSection === destSection) {
      setToast({ type: 'error', message: 'উৎস এবং গন্তব্য একই হতে পারে না' });
      return;
    }

    // Verify roll numbers
    const rollsArray = selectedIds.map(id => customRolls[id] || '');
    if (rollsArray.some(r => !r.trim())) {
      setToast({ type: 'error', message: 'নির্বাচিত সকল শিক্ষার্থীর জন্য রোল নম্বর প্রদান আবশ্যক' });
      return;
    }

    // Check duplicate rolls in destination
    const duplicates = rollsArray.filter((item, index) => rollsArray.indexOf(item) !== index);
    if (duplicates.length > 0) {
      if (!window.confirm(`সতর্কতা: গন্তব্যে একই রোল নম্বর একাধিকবার ব্যবহৃত হচ্ছে (যেমন: রোল ${duplicates[0]})। আপনি কি তাও এগিয়ে যেতে চান?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      // Build promotions payload
      const promotions = selectedIds.map(id => {
        const cand = candidates.find(c => c.studentId === id);
        return {
          studentId: id,
          enrollmentId: cand.enrollmentId,
          rollNumber: customRolls[id]
        };
      });

      const payload = {
        promotions,
        destClassLevelId: destClass,
        destSectionId: destSection,
        destAcademicYearId: destYear
      };

      const res = await api.post('/students/promote', payload);
      if (res.data.success) {
        setToast({ type: 'success', message: res.data.message || 'শিক্ষার্থীদের সফলভাবে উত্তীর্ণ করা হয়েছে!' });
        setTimeout(() => {
          navigate('/students');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'উত্তীর্ণ কার্যক্রম ব্যর্থ হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '50px' }}>
      {/* Toast */}
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
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div className="flex gap-12" style={{ alignItems: 'center' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/students')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">শিক্ষার্থী শ্রেণি উত্তীর্ণকরণ (Batch Promotion)</h1>
            <p className="page-subtitle">এক শিক্ষাবর্ষ/শ্রেণি থেকে শিক্ষার্থীদের পরবর্তী শ্রেণিতে উত্তীর্ণ করুন</p>
          </div>
        </div>
      </div>

      <div className="grid grid-3" style={{ gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Setup Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Panel 1: Source selection */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
              উৎস বিবরণী (Source Class)
            </h2>
            <div className="flex-column gap-12">
              <div>
                <label className="form-label">উৎস শিক্ষাবর্ষ *</label>
                <select className="form-select form-input" value={sourceYear} onChange={e => setSourceYear(e.target.value)}>
                  <option value="">-- শিক্ষাবর্ষ নির্বাচন করুন --</option>
                  {academicYears.map(y => (
                    <option key={y._id} value={y._id}>{y.name} {y.isCurrent ? '(চলতি)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">উৎস শ্রেণি *</label>
                <select className="form-select form-input" value={sourceClass} onChange={e => setSourceClass(e.target.value)}>
                  <option value="">-- শ্রেণি নির্বাচন করুন --</option>
                  {classLevels.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">উৎস সেকশন (ঐচ্ছিক)</label>
                <select className="form-select form-input" value={sourceSection} onChange={e => setSourceSection(e.target.value)}>
                  <option value="">সকল সেকশন</option>
                  {SECTION_OPTIONS.map((sec, idx) => (
                    <option key={idx} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <button className="btn btn-primary mt-8" onClick={handleLoadCandidates} disabled={loadingCandidates}>
                {loadingCandidates ? <RefreshCw className="animate-spin" size={16} /> : 'শিক্ষার্থী তালিকা লোড করুন'}
              </button>
            </div>
          </div>

          {/* Panel 2: Destination selection */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={18} style={{ color: 'var(--success)' }} />
              গন্তব্য বিবরণী (Destination Class)
            </h2>
            <div className="flex-column gap-12">
              <div>
                <label className="form-label">গন্তব্য শিক্ষাবর্ষ *</label>
                <select className="form-select form-input" value={destYear} onChange={e => setDestYear(e.target.value)}>
                  <option value="">-- শিক্ষাবর্ষ নির্বাচন করুন --</option>
                  {academicYears.map(y => (
                    <option key={y._id} value={y._id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">গন্তব্য শ্রেণি *</label>
                <select className="form-select form-input" value={destClass} onChange={e => setDestClass(e.target.value)}>
                  <option value="">-- শ্রেণি নির্বাচন করুন --</option>
                  {classLevels.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">গন্তব্য সেকশন *</label>
                <select className="form-select form-input" value={destSection} onChange={e => setDestSection(e.target.value)}>
                  <option value="">-- সেকশন নির্বাচন করুন --</option>
                  {SECTION_OPTIONS.map((sec, idx) => (
                    <option key={idx} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Panel 3: Auto-Roll Setting */}
          {candidates.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>রোল নম্বর অ্যাসাইনমেন্ট</h2>
              <p className="text-muted text-xs mb-16">উত্তীর্ণকরণের পর শিক্ষার্থীদের নতুন রোল কেমন হবে নির্বাচন করুন।</p>
              
              <div className="flex-column gap-12">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input type="radio" name="rollOpt" checked={rollOption === 'same'} onChange={() => setRollOption('same')} />
                  <span>পূর্বের রোল নম্বর বহাল রাখুন</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input type="radio" name="rollOpt" checked={rollOption === 'sequential'} onChange={() => setRollOption('sequential')} />
                  <span>ক্রমানুসারে রিসেট করুন (১, ২, ৩...)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--success)' }}>
                  <input type="radio" name="rollOpt" checked={rollOption === 'merit'} onChange={() => setRollOption('merit')} />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} /> মেধাভিত্তিক ক্রমানুসার (Sort by Avg Marks)
                  </span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Promotion Candidates List */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: 0 }}>
            
            {/* Candidates Toolbar */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>শিক্ষার্থী তালিকা</h3>
                {candidates.length > 0 && (
                  <span className="badge badge-active">নির্বাচিত: {selectedIds.length} / {candidates.length} জন</span>
                )}
              </div>

              {candidates.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="form-input form-input-sm" 
                      placeholder="নাম বা আইডি দিয়ে খুঁজুন..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ paddingLeft: '36px', height: '36px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <select 
                    className="form-input form-input-sm" 
                    value={performanceFilter}
                    onChange={e => setPerformanceFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: '160px', height: '36px', fontSize: '0.85rem' }}
                  >
                    <option value="all">সকল ফলাফল</option>
                    <option value="passed">উত্তীর্ণ শিক্ষার্থী (Avg &gt;= ৩৩%)</option>
                    <option value="failed">অনুত্তীর্ণ শিক্ষার্থী (Avg &lt; ৩৩%)</option>
                    <option value="no_marks">পরীক্ষার নম্বরহীন শিক্ষার্থী</option>
                  </select>
                </div>
              )}
            </div>

            {/* Candidate List Content */}
            {loadingCandidates ? (
              <div className="flex-center" style={{ minHeight: '30vh', flexDirection: 'column', gap: '12px' }}>
                <div className="spinner" />
                <p className="text-muted text-sm">শিক্ষার্থী ডেটা প্রসেস হচ্ছে...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="empty-state" style={{ minHeight: '40vh' }}>
                <GraduationCap size={44} style={{ opacity: 0.3, color: 'var(--primary)' }} />
                <div className="empty-state-title mt-12">কোনো শিক্ষার্থী পাওয়া যায়নি</div>
                <p className="text-muted text-sm mt-4">ডানে উৎস শিক্ষাবর্ষ ও শ্রেণি নির্বাচন করে লোড বোতামে চাপুন।</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => handleSelectAll(filteredCandidates)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', margin: 'auto', color: 'var(--primary)' }}
                          >
                            {filteredCandidates.every(c => selectedIds.includes(c.studentId)) ? (
                              <CheckSquare size={18} />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </th>
                        <th style={{ textAlign: 'left' }}>শিক্ষার্থী</th>
                        <th>ভর্তি নম্বর</th>
                        <th style={{ textAlign: 'center' }}>গড় নম্বর (%)</th>
                        <th>বর্তমান রোল</th>
                        <th style={{ width: '120px' }}>নতুন রোল</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((c) => {
                        const isSelected = selectedIds.includes(c.studentId);
                        
                        let performanceBadge = (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--border-color)', padding: '2px 8px', borderRadius: '4px' }}>
                            কোনো নম্বর নেই
                          </span>
                        );
                        if (c.avgPercentage !== null) {
                          const passed = c.avgPercentage >= 33;
                          performanceBadge = (
                            <span style={{ 
                              fontSize: '0.82rem', fontWeight: 700, 
                              color: passed ? 'var(--success)' : 'var(--danger)',
                              background: passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                              padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              {passed ? <Star size={12} fill="currentColor" /> : <ShieldAlert size={12} />}
                              {c.avgPercentage}% {passed ? 'উত্তীর্ণ' : 'ফেইল'}
                            </span>
                          );
                        }

                        return (
                          <tr key={c.studentId} style={{ opacity: isSelected ? 1 : 0.6, background: isSelected ? 'transparent' : 'var(--border-color)10' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => handleToggleSelect(c.studentId)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <div className="font-semibold">{c.name}</div>
                              <div className="text-xs text-muted">{c.email}</div>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter', fontWeight: 500 }}>{c.admissionNumber}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {performanceBadge}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'Inter' }}>{c.rollNumber}</span>
                            </td>
                            <td>
                              <input 
                                type="text"
                                className="form-input form-input-sm"
                                value={customRolls[c.studentId] || ''}
                                disabled={!isSelected}
                                onChange={(e) => setCustomRolls({ ...customRolls, [c.studentId]: e.target.value })}
                                style={{ height: '32px', fontSize: '0.85rem', width: '80px', fontFamily: 'Inter', textAlign: 'center' }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Final Promotion Action Banner */}
                <div style={{ padding: '24px', background: 'rgba(20,184,166,0.03)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                  <button className="btn btn-secondary" onClick={() => navigate('/students')}>
                    বাতিল করুন
                  </button>
                  <button className="btn btn-primary" onClick={handlePromote} disabled={loading || selectedIds.length === 0}>
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : 'শ্রেণি উত্তীর্ণ করুন (Confirm Promote)'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
