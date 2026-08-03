import { useState, useEffect } from 'react';
import { Plus, UserCheck, Phone, Users, Trash2, X, CheckCircle, AlertCircle, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function GuardianListPage() {
  const { user } = useAuthStore();
  const [guardians, setGuardians] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Filter states
  const [search, setSearch] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const occupations = Array.from(new Set(guardians.map(g => g.occupation).filter(Boolean)));

  const filteredGuardians = guardians.filter((guardian) => {
    const fullName = `${guardian.user?.firstName || ''} ${guardian.user?.lastName || ''}`.toLowerCase();
    const phone = (guardian.user?.phone || '').toLowerCase();
    const guardianId = (guardian.guardianId || '').toLowerCase();
    const occupation = (guardian.occupation || '').toLowerCase();
    const searchLower = search.toLowerCase();

    const matchesSearch = 
      !search ||
      fullName.includes(searchLower) ||
      phone.includes(searchLower) ||
      guardianId.includes(searchLower) ||
      occupation.includes(searchLower);

    const matchesOccupation = !occupationFilter || guardian.occupation === occupationFilter;
    const matchesStatus = !statusFilter || guardian.status === statusFilter;

    return matchesSearch && matchesOccupation && matchesStatus;
  });

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedGuardians = filteredGuardians.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredGuardians.length / limit);

  useEffect(() => {
    setPage(1);
  }, [search, occupationFilter, statusFilter]);

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    guardianId: '',
    occupation: '',
    nationalId: '',
    relationshipLabel: 'পিতা',
    studentId: '',
  });

  const fetchGuardians = async () => {
    setLoading(true);
    try {
      setSelectedIds([]);
      const res = await api.get('/guardians', { params: { limit: 1000 } });
      if (res.data.success) {
        setGuardians(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch guardians', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students', { params: { limit: 100 } });
      if (res.data.success) {
        setStudentsList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  useEffect(() => {
    fetchGuardians();
    fetchStudents();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      guardianId: '',
      occupation: '',
      nationalId: '',
      relationshipLabel: 'পিতা',
      studentId: '',
    });
  };

  const handleEditClick = (guardian) => {
    setFormData({
      firstName: guardian.user?.firstName || '',
      lastName: guardian.user?.lastName || '',
      username: guardian.user?.username || '',
      email: guardian.user?.email || '',
      phone: guardian.user?.phone || '',
      password: '',
      guardianId: guardian.guardianId || '',
      occupation: guardian.occupation || '',
      nationalId: guardian.nationalId || '',
      relationshipLabel: guardian.relationshipLabel || 'পিতা',
      studentId: guardian.students && guardian.students.length > 0 ? guardian.students[0].student?._id || guardian.students[0].student : '',
    });
    setEditingId(guardian._id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        guardianId: formData.guardianId,
        occupation: formData.occupation,
        nationalId: formData.nationalId,
        relationshipLabel: formData.relationshipLabel,
      };

      if (formData.studentId) {
        payload.students = [
          {
            student: formData.studentId,
            relationship: formData.relationshipLabel,
            isPrimary: true,
          },
        ];
      }

      if (isEditing) {
        const res = await api.patch(`/guardians/${editingId}`, payload);
        if (res.data.success) {
          setIsModalOpen(false);
          resetForm();
          setIsEditing(false);
          setEditingId(null);
          setToast({ type: 'success', message: 'অভিভাবকের তথ্য সফলভাবে আপডেট করা হয়েছে!' });
          fetchGuardians();
        }
      } else {
        const res = await api.post('/guardians', payload);
        if (res.data.success) {
          setIsModalOpen(false);
          resetForm();
          setToast({ type: 'success', message: 'অভিভাবক সফলভাবে যোগ করা হয়েছে!' });
          fetchGuardians();
        }
      }
    } catch (err) {
      console.error('Failed to create/update guardian', err);
      const errMsg = err.response?.data?.message || 'অভিভাবক তথ্য সংরক্ষণ করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState([]);

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই অভিভাবককে মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/guardians/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'অভিভাবক সফলভাবে মুছে ফেলা হয়েছে!' });
        setSelectedIds(prev => prev.filter(item => item !== id));
        fetchGuardians();
      }
    } catch (err) {
      console.error('Failed to delete guardian', err);
      const errMsg = err.response?.data?.message || 'অভিভাবক মুছে ফেলতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: errMsg });
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে বাছাইকৃত ${selectedIds.length} জন অভিভাবককে মুছে ফেলতে চান?`)) return;
    try {
      setLoading(true);
      await Promise.all(selectedIds.map(id => api.delete(`/guardians/${id}`)));
      setSelectedIds([]);
      setToast({ type: 'success', message: 'বাছাইকৃত অভিভাবক সফলভাবে মুছে ফেলা হয়েছে!' });
      fetchGuardians();
    } catch (err) {
      console.error('Failed bulk delete guardians', err);
      setToast({ type: 'error', message: 'কিছু অভিভাবক মুছে ফেলা যায়নি' });
      fetchGuardians();
    }
  };

  const isAllowedToManage = user?.userType === 'super_admin' || user?.userType === 'admin' || user?.userType === 'principal';

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
          <h1 className="page-title">অভিভাবক</h1>
          <p className="page-subtitle">শিক্ষার্থীদের অভিভাবকদের তথ্য ও তালিকা</p>
        </div>
        <div className="flex gap-12">
          {isAllowedToManage && selectedIds.length > 0 && (
            <button className="btn btn-danger" onClick={handleBulkDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={16} /> বাছাইকৃতগুলো মুছুন ({selectedIds.length})
            </button>
          )}
          {isAllowedToManage && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> নতুন অভিভাবক
            </button>
          )}
        </div>
      </div>

      {/* ফিল্টার বার */}
      <div className="card mb-24" style={{ padding: '16px 20px' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="flex gap-8" style={{ flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="নাম, আইডি বা ফোন দিয়ে খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            <select
              className="form-input form-select"
              value={occupationFilter}
              onChange={(e) => setOccupationFilter(e.target.value)}
              style={{ width: '160px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল পেশা</option>
              {occupations.map(occ => (
                <option key={occ} value={occ}>{occ}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '140px', padding: '8px 36px 8px 12px' }}
            >
              <option value="">সকল স্ট্যাটাস</option>
              <option value="active">সক্রিয়</option>
              <option value="inactive">নিষ্ক্রিয়</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="spinner"></div>
        </div>
      ) : filteredGuardians.length === 0 ? (
        <div className="card empty-state">
          <UserCheck size={48} style={{ opacity: 0.3 }} />
          <div className="empty-state-title mt-16">কোনো অভিভাবক পাওয়া যায়নি</div>
          {isAllowedToManage && (
            <p className="text-muted text-sm mt-8">"নতুন অভিভাবক" বাটনে ক্লিক করে অভিভাবক যোগ করুন অথবা অনুসন্ধান পরিবর্তন করুন</p>
          )}
        </div>
      ) : (
        <div className="card table-container">
          <table className="table">
            <thead>
              <tr>
                {isAllowedToManage && (
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={filteredGuardians.length > 0 && selectedIds.length === filteredGuardians.length} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredGuardians.map(g => g._id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th>অভিভাবকের নাম</th>
                <th>ফোন নম্বর</th>
                <th>পেশা</th>
                <th>ছাত্র/ছাত্রী নাম & আইডি</th>
                <th>সম্পর্ক</th>
                <th>স্ট্যাটাস</th>
                {isAllowedToManage && <th style={{ textAlign: 'center' }}>অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedGuardians.map((guardian) => (
                <tr key={guardian._id}>
                  {isAllowedToManage && (
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(guardian._id)} 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, guardian._id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== guardian._id));
                          }
                        }}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                  )}
                  <td>
                    <div className="font-semibold">{guardian.user?.firstName} {guardian.user?.lastName}</div>
                    <div className="text-sm text-muted">{guardian.guardianId}</div>
                  </td>
                  <td>{guardian.user?.phone || '-'}</td>
                  <td>{guardian.occupation || '-'}</td>
                  <td>
                    {guardian.students && guardian.students.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {guardian.students.map((s, idx) => {
                          const name = `${s.student?.user?.firstName || s.student?.firstName || ''} ${s.student?.user?.lastName || s.student?.lastName || ''}`.trim();
                          return (
                            <div key={idx} style={{ minHeight: '38px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div className="font-semibold">{name}</div>
                              <div className="text-xs text-muted">ID: {s.student?.studentId || 'N/A'}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted">কোনো শিক্ষার্থী সংযুক্ত নেই</span>
                    )}
                  </td>
                  <td>
                    {guardian.students && guardian.students.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {guardian.students.map((s, idx) => (
                          <div key={idx} style={{ minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                            <span>{s.relationship || guardian.relationshipLabel || '-'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>{guardian.relationshipLabel || '-'}</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${guardian.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                      {guardian.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </td>
                  {isAllowedToManage && (
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex-center gap-8">
                        <button
                          onClick={() => handleEditClick(guardian)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#14b8a6',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          title="সম্পাদনা করুন"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(guardian._id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              {totalPages > 1 && (
                <div className="pagination" style={{ margin: 0, justifyContent: 'flex-start' }}>
                  <button
                    className="pagination-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => {
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
                    disabled={page >= totalPages}
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
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '600px', margin: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontSize: '1.25rem' }}>{isEditing ? 'অভিভাবকের তথ্য সংশোধন করুন' : 'নতুন অভিভাবক যোগ করুন'}</h2>
              <button className="btn-icon" onClick={() => { setIsModalOpen(false); resetForm(); setIsEditing(false); }} type="button">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">নামের প্রথমাংশ *</label>
                  <input type="text" name="firstName" className="form-input" required value={formData.firstName} onChange={handleChange} placeholder="যেমন: মোহাম্মদ" />
                </div>
                <div className="form-group">
                  <label className="form-label">নামের শেষাংশ *</label>
                  <input type="text" name="lastName" className="form-input" required value={formData.lastName} onChange={handleChange} placeholder="যেমন: আলী" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">অভিভাবক আইডি (ঐচ্ছিক)</label>
                  <input type="text" name="guardianId" className="form-input" value={formData.guardianId} onChange={handleChange} placeholder="যেমন: GRD-1001" />
                </div>
                <div className="form-group">
                  <label className="form-label">পেশা</label>
                  <input type="text" name="occupation" className="form-input" placeholder="যেমন: ব্যবসায়ী" value={formData.occupation} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">জাতীয় পরিচয়পত্র নং (NID) (ঐচ্ছিক)</label>
                  <input type="text" name="nationalId" className="form-input" placeholder="NID নম্বর" value={formData.nationalId} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">ফোন নম্বর *</label>
                  <input type="text" name="phone" className="form-input" required value={formData.phone} onChange={handleChange} placeholder="যেমন: 01711223344" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">ইউজারনেম (Username)</label>
                  <input type="text" name="username" className="form-input" value={formData.username} onChange={handleChange} placeholder="যেমন: guardian1" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">ইমেইল (ঐচ্ছিক)</label>
                  <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} placeholder="যেমন: guardian@email.com" />
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">পাসওয়ার্ড</label>
                  <input type="text" name="password" className="form-input" placeholder="ফাঁকা রাখলে 'guardian123' হবে" value={formData.password} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">শিক্ষার্থী নির্বাচন করুন</label>
                  <select name="studentId" className="form-input" value={formData.studentId} onChange={handleChange}>
                    <option value="">নির্বাচন করুন</option>
                    {studentsList.map(student => (
                      <option key={student._id} value={student._id}>
                        {student.user?.firstName} {student.user?.lastName} ({student.studentId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">শিক্ষার্থীর সাথে সম্পর্ক</label>
                  <select name="relationshipLabel" className="form-input" value={formData.relationshipLabel} onChange={handleChange}>
                    <option value="পিতা">পিতা</option>
                    <option value="মাতা">মাতা</option>
                    <option value="ভাই">ভাই</option>
                    <option value="বোন">বোন</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); resetForm(); setIsEditing(false); }}>বাতিল</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
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
