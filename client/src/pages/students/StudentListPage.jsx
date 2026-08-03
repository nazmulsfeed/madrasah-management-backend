import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react';
import api from '../../api/axios';
import { SECTION_OPTIONS } from '../../utils/constants';

const statusLabels = {
  active: { label: 'সক্রিয়', class: 'badge-active' },
  inactive: { label: 'নিষ্ক্রিয়', class: 'badge-inactive' },
  graduated: { label: 'স্নাতক', class: 'badge-info' },
  transferred: { label: 'স্থানান্তরিত', class: 'badge-warning' },
  suspended: { label: 'স্থগিত', class: 'badge-danger' },
};

export default function StudentListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  
  // Metadata state for dropdowns
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [branches, setBranches] = useState([]);
  
  // Active filters
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [selectedSectionName, setSelectedSectionName] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      setSelectedIds([]);
      const params = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (classFilter) params.classLevel = classFilter;
      if (branchFilter) params.branch = branchFilter;

      if (sectionFilter) {
        if (sectionFilter.includes(',')) {
          params.sections = sectionFilter;
        } else {
          params.section = sectionFilter;
        }
      }

      const res = await api.get('/students', { params });
      if (res.data.success !== false) {
        setStudents(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.error('Fetch students error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [resClasses, resSections, resBranches] = await Promise.all([
          api.get('/students/classes'),
          api.get('/students/sections'),
          api.get('/students/branches'),
        ]);
        if (resClasses.data.success) setClasses(resClasses.data.data.classes || []);
        if (resSections.data.success) setSections(resSections.data.data.sections || []);
        if (resBranches.data.success) setBranches(resBranches.data.data.branches || []);
      } catch (err) {
        console.error('Failed to fetch filter metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (!selectedSectionName) {
      setSectionFilter('');
      return;
    }

    const matchedSections = sections.filter(s => {
      const sName = s.name.trim();
      const sClassId = s.classLevel?._id || s.classLevel;
      const sBranchId = s.branch?._id || s.branch;

      const isClassMatch = !classFilter || (sClassId && sClassId.toString() === classFilter.toString());
      const isBranchMatch = !branchFilter || (sBranchId && sBranchId.toString() === branchFilter.toString());

      if (!isClassMatch || !isBranchMatch) return false;

      if (selectedSectionName === 'কোন সেকশন নাই') {
        return sName.includes('কোন সেকশন নাই') || sName.includes('কোন শাখা নাই') || sName.includes('নাই') || sName === 'no_section' || sName.includes('No Section');
      }
      return sName.startsWith(selectedSectionName) || sName === selectedSectionName;
    });

    const ids = matchedSections.map(s => s._id);
    if (ids.length > 0) {
      setSectionFilter(ids.join(','));
    } else {
      setSectionFilter('none_matched');
    }
  }, [selectedSectionName, classFilter, branchFilter, sections]);

  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, [page, limit, statusFilter, classFilter, sectionFilter, branchFilter]);

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ছাত্র/ছাত্রীকে মুছে ফেলতে চান?')) return;
    try {
      await api.delete(`/students/${id}`);
      setSelectedIds(prev => prev.filter(item => item !== id));
      fetchStudents();
    } catch (err) {
      alert('মুছে ফেলা ব্যর্থ হয়েছে');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে বাছাইকৃত ${selectedIds.length} জন ছাত্র/ছাত্রীকে মুছে ফেলতে চান?`)) return;
    try {
      setLoading(true);
      await Promise.all(selectedIds.map(id => api.delete(`/students/${id}`)));
      setSelectedIds([]);
      fetchStudents();
    } catch (err) {
      alert('কিছু ছাত্র/ছাত্রী মুছে ফেলা যায়নি');
      fetchStudents();
    }
  };

  const getAvatarColor = (name) => {
    const colors = [
      'linear-gradient(135deg, #14b8a6, #0f766e)',
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      'linear-gradient(135deg, #ec4899, #be185d)',
      'linear-gradient(135deg, #22c55e, #15803d)',
    ];
    const index = (name || '').charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="animate-fade-in">
      {/* পেজ হেডার */}
      <div className="page-header">
        <div>
          <h1 className="page-title">ছাত্র/ছাত্রী তালিকা</h1>
          <p className="page-subtitle">
            মোট {pagination.total} জন ছাত্র/ছাত্রী নিবন্ধিত
          </p>
        </div>
        <div className="flex gap-12">
          {selectedIds.length > 0 && (
            <button className="btn btn-danger" onClick={handleBulkDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={16} /> বাছাইকৃতগুলো মুছুন ({selectedIds.length})
            </button>
          )}
          <button className="btn btn-secondary btn-sm">
            <Download size={16} /> রপ্তানি
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/students/promote')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <GraduationCap size={16} /> শ্রেণি উত্তীর্ণ করুন (Promotion)
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/students/new')}
          >
            <Plus size={16} /> নতুন ছাত্র/ছাত্রী
          </button>
        </div>
      </div>

      {/* ফিল্টার বার */}
      <div className="card mb-24" style={{ padding: '16px 20px' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <form onSubmit={handleSearch} className="flex gap-8" style={{ flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="নাম, ভর্তি নম্বর বা আইডি দিয়ে অনুসন্ধান..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              <Search size={14} /> অনুসন্ধান
            </button>
          </form>

          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            <select
              className="form-input form-select"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: '130px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল শ্রেণি</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={selectedSectionName}
              onChange={(e) => {
                setSelectedSectionName(e.target.value);
                setPage(1);
              }}
              style={{ width: '120px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল সেকশন</option>
              {SECTION_OPTIONS.map((sec, idx) => (
                <option key={idx} value={sec}>{sec}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: '140px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল শাখা</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: '130px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল স্ট্যাটাস</option>
              <option value="active">সক্রিয়</option>
              <option value="inactive">নিষ্ক্রিয়</option>
              <option value="graduated">স্নাতক</option>
              <option value="transferred">স্থানান্তরিত</option>
            </select>
          </div>
        </div>
      </div>

      {/* টেবিল */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="flex-center" style={{ padding: '60px' }}>
            <div className="spinner"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <GraduationCap size={48} />
            </div>
            <div className="empty-state-title">কোনো ছাত্র/ছাত্রী পাওয়া যায়নি</div>
            <p className="text-muted text-sm mt-4">
              নতুন ছাত্র/ছাত্রী যোগ করতে "নতুন ছাত্র/ছাত্রী" বোতামে ক্লিক করুন
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={students.length > 0 && selectedIds.length === students.length} 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(students.map(s => s._id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th style={{ textAlign: 'left' }}>ছাত্র/ছাত্রী</th>
                    <th>ভর্তি নম্বর</th>
                    <th>শ্রেণি</th>
                    <th>সেকশন</th>
                    <th>রোল</th>
                    <th>স্ট্যাটাস</th>
                    <th style={{ textAlign: 'center' }}>কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const name = student.user?.fullName ||
                      `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() ||
                      'N/A';
                    const enrollment = student.currentEnrollment;
                    const st = statusLabels[student.status] || statusLabels.active;

                    return (
                      <tr key={student._id}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(student._id)} 
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, student._id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== student._id));
                              }
                            }}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td>
                          <div className="flex gap-12" style={{ alignItems: 'center' }}>
                            <div
                              className="avatar"
                              style={{ background: getAvatarColor(name) }}
                            >
                              {name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold">{name}</div>
                              <div className="text-sm text-muted">
                                {student.user?.email || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                            {student.admissionNumber}
                          </span>
                        </td>
                        <td>{enrollment?.classLevel?.name || '—'}</td>
                        <td>{enrollment?.section?.name || '—'}</td>
                        <td>
                          <span style={{ fontFamily: 'Inter' }}>
                            {enrollment?.rollNumber || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${st.class}`}>{st.label}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex-center gap-8">
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="বিস্তারিত"
                              onClick={() => navigate(`/students/${student._id}`)}
                              style={{ width: 32, height: 32 }}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="সম্পাদনা"
                              onClick={() => navigate(`/students/${student._id}`, { state: { edit: true } })}
                              style={{ width: 32, height: 32 }}
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              title="মুছুন"
                              onClick={() => handleDelete(student._id)}
                              style={{ width: 32, height: 32, color: 'var(--danger)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                {pagination.pages > 1 && (
                  <div className="pagination" style={{ margin: 0, justifyContent: 'flex-start' }}>
                    <button
                      className="pagination-btn"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                    {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          className={`pagination-btn ${p === page ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      className="pagination-btn"
                      disabled={page >= pagination.pages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span>প্রতি পেজে প্রদর্শন:</span>
                <select 
                  className="form-input form-select" 
                  value={limit} 
                  onChange={(e) => handleLimitChange(Number(e.target.value))} 
                  style={{ width: '80px', padding: '6px 24px 6px 12px', fontSize: '0.875rem' }}
                >
                  <option value={15}>১৫</option>
                  <option value={25}>২৫</option>
                  <option value={50}>৫০</option>
                  <option value={100}>১০০</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
