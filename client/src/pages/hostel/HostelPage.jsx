import { useState, useEffect } from 'react';
import { Home, Plus, Users, Bed, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function HostelPage() {
  const { user, permissions } = useAuthStore();
  const canManageHostel = user?.userType === 'super_admin' || permissions?.can_manage_hostel;

  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editHostelId, setEditHostelId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'ছাত্র',
    capacity: 0,
    rooms: 0,
    address: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchHostels = async () => {
    try {
      const res = await api.get('/hostels');
      if (res.data.success) {
        setHostels(res.data.data.hostels || []);
      }
    } catch (error) {
      console.error('Failed to load hostels', error);
      setToast({ type: 'error', message: 'হোস্টেল তালিকা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleEdit = (hostel) => {
    setEditHostelId(hostel._id);
    setFormData({
      name: hostel.name,
      type: hostel.type,
      capacity: hostel.capacity,
      rooms: hostel.rooms,
      address: hostel.address || '',
      description: hostel.description || '',
      status: hostel.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই হোস্টেলটি মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/hostels/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'হোস্টেল সফলভাবে মুছে ফেলা হয়েছে' });
        fetchHostels();
      }
    } catch (error) {
      console.error('Failed to delete hostel', error);
      setToast({ type: 'error', message: 'হোস্টেল মুছতে সমস্যা হয়েছে' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (editHostelId) {
        res = await api.patch(`/hostels/${editHostelId}`, formData);
      } else {
        res = await api.post('/hostels', formData);
      }
      
      if (res.data.success) {
        setIsModalOpen(false);
        setEditHostelId(null);
        setFormData({ name: '', type: 'ছাত্র', capacity: 0, rooms: 0, address: '', description: '', status: 'active' });
        setToast({ type: 'success', message: `হোস্টেল সফলভাবে ${editHostelId ? 'আপডেট' : 'তৈরি'} হয়েছে` });
        fetchHostels();
      }
    } catch (error) {
      console.error('Failed to save hostel', error);
      setToast({ type: 'error', message: error.response?.data?.message || 'হোস্টেল সংরক্ষণ করতে সমস্যা হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditHostelId(null);
    setFormData({ name: '', type: 'ছাত্র', capacity: 0, rooms: 0, address: '', description: '', status: 'active' });
  };

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
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
          <h1 className="page-title">হোস্টেল</h1>
          <p className="page-subtitle">আবাসন ব্যবস্থাপনা ও রুম বরাদ্দ</p>
        </div>
        {canManageHostel && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> নতুন হোস্টেল
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="spinner"></div>
        </div>
      ) : hostels.length === 0 ? (
        <div className="card empty-state">
          <Home size={48} style={{ opacity: 0.3 }} />
          <div className="empty-state-title mt-16">কোনো হোস্টেল পাওয়া যায়নি</div>
          <p className="text-muted mt-8">এখনও কোনো হোস্টেলের তথ্য যোগ করা হয়নি।</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {hostels.map((hostel) => {
            const occupancyRate = hostel.capacity > 0 ? Math.round((hostel.occupied / hostel.capacity) * 100) : 0;
            return (
              <div key={hostel._id} className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="flex-between mb-16">
                  <div>
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {hostel.name}
                      {hostel.status === 'inactive' && <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>নিষ্ক্রিয়</span>}
                    </h3>
                  </div>
                  <span className={`badge ${hostel.type === 'ছাত্রী' ? 'badge-info' : 'badge-active'}`}>{hostel.type}</span>
                </div>

                <div className="grid grid-3 mb-16">
                  <div className="text-center">
                    <div className="text-muted text-sm">মোট আসন</div>
                    <div className="font-semibold" style={{ fontSize: '1.5rem' }}>{hostel.capacity}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted text-sm">বর্তমান আবাসিক</div>
                    <div className="font-semibold" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{hostel.occupied}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted text-sm">খালি আসন</div>
                    <div className="font-semibold" style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{hostel.capacity - hostel.occupied}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div className="flex-between text-sm mb-8">
                    <span className="text-muted">অকুপেন্সি রেট</span>
                    <span className="font-semibold">{occupancyRate}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--bg-secondary)' }}>
                    <div style={{ width: `${Math.min(occupancyRate, 100)}%`, height: '100%', borderRadius: '4px', background: occupancyRate >= 100 ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>

                <div className="flex gap-8 mt-auto" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button 
                    className="btn btn-secondary flex-1" 
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => setToast({ type: 'success', message: 'রুম বিবরণ ফিচারটি তৈরি হচ্ছে' })}
                  >
                    <Bed size={14} /> রুমসমূহ ({hostel.rooms})
                  </button>
                  <button 
                    className="btn btn-primary flex-1" 
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => setToast({ type: 'success', message: 'আবাসিকরা ফিচারটি তৈরি হচ্ছে' })}
                  >
                    <Users size={14} /> আবাসিক তালিকা
                  </button>
                  
                  {canManageHostel && (
                    <>
                      <button className="btn btn-secondary btn-icon" onClick={() => handleEdit(hostel)} title="সম্পাদনা">
                        <Edit size={16} />
                      </button>
                      <button className="btn btn-secondary btn-icon text-danger" onClick={() => handleDelete(hostel._id)} title="মুছে ফেলুন">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
        >
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '500px', margin: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between mb-24">
              <h2 style={{ fontSize: '1.25rem' }}>{editHostelId ? 'হোস্টেল তথ্য সম্পাদন' : 'নতুন হোস্টেল যোগ করুন'}</h2>
              <button className="btn-icon" onClick={handleCloseModal} type="button">
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">হোস্টেলের নাম *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="form-input" 
                  required 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="যেমন: দারুস সালাম হোস্টেল" 
                />
              </div>

              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">ধরন</label>
                  <select 
                    name="type" 
                    className="form-input form-select" 
                    value={formData.type} 
                    onChange={handleChange}
                  >
                    <option value="ছাত্র">ছাত্র</option>
                    <option value="ছাত্রী">ছাত্রী</option>
                    <option value="শিক্ষক">শিক্ষক</option>
                    <option value="স্টাফ">স্টাফ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">মোট ধারণক্ষমতা (আসন)</label>
                  <input 
                    type="number" 
                    name="capacity" 
                    className="form-input" 
                    min="0"
                    value={formData.capacity} 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">মোট রুম</label>
                  <input 
                    type="number" 
                    name="rooms" 
                    className="form-input" 
                    min="0"
                    value={formData.rooms} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">অবস্থা (Status)</label>
                  <select 
                    name="status" 
                    className="form-input form-select" 
                    value={formData.status} 
                    onChange={handleChange}
                  >
                    <option value="active">সক্রিয়</option>
                    <option value="inactive">নিষ্ক্রিয়</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ঠিকানা (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  name="address" 
                  className="form-input" 
                  value={formData.address} 
                  onChange={handleChange} 
                  placeholder="হোস্টেলের ঠিকানা" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">বিবরণ (ঐচ্ছিক)</label>
                <textarea 
                  name="description" 
                  className="form-input" 
                  rows="3"
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="অন্যান্য তথ্য..."
                ></textarea>
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

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
