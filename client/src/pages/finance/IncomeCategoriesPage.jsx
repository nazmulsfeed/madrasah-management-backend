import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader, List } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function IncomeCategoriesPage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    description: '',
  });

  const canManage = [
    'super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'
  ].includes(user?.userType) || [
    'co_super_admin', 'admin'
  ].includes(user?.adminRole);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/income-categories');
      if (res.data.success) {
        setCategories(res.data.data.categories || []);
      }
    } catch (error) {
      setToast({ type: 'error', message: 'খাত তালিকা লোড করতে ব্যর্থ হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        description: category.description || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'other', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingCategory) {
        const res = await api.put(`/finance/income-categories/${editingCategory._id}`, formData);
        if (res.data.success) {
          setToast({ type: 'success', message: 'খাত সফলভাবে আপডেট করা হয়েছে' });
        }
      } else {
        const res = await api.post('/finance/income-categories', formData);
        if (res.data.success) {
          setToast({ type: 'success', message: 'নতুন খাত তৈরি করা হয়েছে' });
        }
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'কোনো সমস্যা হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই খাতটি মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/finance/income-categories/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'খাত সফলভাবে মুছে ফেলা হয়েছে' });
        fetchCategories();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'মুছে ফেলতে সমস্যা হয়েছে' });
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'student_fee': return 'শিক্ষার্থী ফিস';
      case 'donation': return 'দান ও অনুদান';
      case 'other': return 'অন্যান্য';
      default: return type;
    }
  };

  return (
    <div className="page-container">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">আয়ের খাত</h1>
          <p className="page-subtitle">প্রতিষ্ঠানের সকল আয়ের খাত পরিচালনা করুন</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            নতুন খাত যোগ করুন
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">
            <Loader className="spin" size={40} />
            <p>লোড হচ্ছে...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <List size={48} />
            <p>কোনো আয়ের খাত পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>খাতের নাম</th>
                  <th>ধরণ</th>
                  <th>বর্ণনা</th>
                  {canManage && <th style={{ textAlign: 'right' }}>অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category._id}>
                    <td><strong>{category.name}</strong></td>
                    <td>
                      <span className={`badge ${category.type === 'donation' ? 'badge-info' : category.type === 'student_fee' ? 'badge-primary' : 'badge-warning'}`}>
                        {getTypeLabel(category.type)}
                      </span>
                    </td>
                    <td>{category.description || '-'}</td>
                    {canManage && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon btn-ghost" 
                            title="এডিট করুন"
                            onClick={() => handleOpenModal(category)}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="btn-icon btn-ghost" 
                            title="মুছে ফেলুন"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDelete(category._id)}
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
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingCategory ? 'খাত এডিট করুন' : 'নতুন খাত তৈরি করুন'}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="form-group">
                <div className="form-field">
                  <label>খাতের নাম <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="যেমন: মাসিক ফি, সাধারণ দান, দোকান ভাড়া"
                    className="input-field"
                  />
                </div>
                
                <div className="form-field">
                  <label>খাতের ধরণ <span className="required">*</span></label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="student_fee">শিক্ষার্থী ফিস (Student Fee)</option>
                    <option value="donation">দান ও অনুদান (Donation)</option>
                    <option value="other">অন্যান্য (Other)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>বর্ণনা (ঐচ্ছিক)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows="3"
                  ></textarea>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                    বাতিল
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
