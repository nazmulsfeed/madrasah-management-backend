import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader, BookOpen } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function ChartOfAccountsPage() {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Asset',
    balance: 0,
    isActive: true,
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

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounting/accounts');
      if (res.data.success) {
        setAccounts(res.data.data.accounts || []);
      }
    } catch (error) {
      setToast({ type: 'error', message: 'একাউন্ট তালিকা লোড করতে ব্যর্থ হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        code: account.code,
        type: account.type,
        balance: account.balance,
        isActive: account.isActive,
      });
    } else {
      setEditingAccount(null);
      setFormData({ name: '', code: '', type: 'Asset', balance: 0, isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingAccount) {
        const res = await api.put(`/accounting/accounts/${editingAccount._id}`, formData);
        if (res.data.success) {
          setToast({ type: 'success', message: 'একাউন্ট সফলভাবে আপডেট করা হয়েছে' });
        }
      } else {
        const res = await api.post('/accounting/accounts', formData);
        if (res.data.success) {
          setToast({ type: 'success', message: 'নতুন একাউন্ট তৈরি করা হয়েছে' });
        }
      }
      setIsModalOpen(false);
      fetchAccounts();
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'কোনো সমস্যা হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'Asset': return 'সম্পদ (Asset)';
      case 'Liability': return 'দায় (Liability)';
      case 'Equity': return 'মূলধন (Equity)';
      case 'Revenue': return 'আয় (Revenue)';
      case 'Expense': return 'ব্যয় (Expense)';
      default: return type;
    }
  };

  const getTypeBadgeClass = (type) => {
    switch(type) {
      case 'Asset': return 'badge-success';
      case 'Liability': return 'badge-danger';
      case 'Equity': return 'badge-info';
      case 'Revenue': return 'badge-primary';
      case 'Expense': return 'badge-warning';
      default: return 'badge-primary';
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
          <h1 className="page-title">Chart of Accounts (হিসাবের খাতা)</h1>
          <p className="page-subtitle">প্রতিষ্ঠানের সকল হিসাবের খাতা পরিচালনা করুন</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            নতুন খাতা যোগ করুন
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">
            <Loader className="spin" size={40} />
            <p>লোড হচ্ছে...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <p>কোনো হিসাবের খাতা পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>একাউন্ট কোড</th>
                  <th>একাউন্টের নাম</th>
                  <th>ধরণ (Type)</th>
                  <th style={{ textAlign: 'right' }}>বর্তমান জের (Balance)</th>
                  {canManage && <th style={{ textAlign: 'right' }}>অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account._id} style={{ opacity: account.isActive ? 1 : 0.5 }}>
                    <td style={{ fontFamily: 'Inter', fontWeight: 600 }}>{account.code}</td>
                    <td><strong>{account.name}</strong> {!account.isActive && '(নিষ্ক্রিয়)'}</td>
                    <td>
                      <span className={`badge ${getTypeBadgeClass(account.type)}`}>
                        {getTypeLabel(account.type)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontFamily: 'Inter' }}>
                      ৳ {account.balance?.toLocaleString('en-IN') || 0}
                    </td>
                    {canManage && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon btn-ghost" 
                            title="এডিট করুন"
                            onClick={() => handleOpenModal(account)}
                          >
                            <Edit size={16} />
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
              <h2>{editingAccount ? 'একাউন্ট এডিট করুন' : 'নতুন একাউন্ট তৈরি করুন'}</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="form-group">
                <div className="form-grid">
                  <div className="form-field">
                    <label>একাউন্ট কোড <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="যেমন: 1001, 2001, 4001, 5001"
                      className="input-field"
                    />
                  </div>
                  
                  <div className="form-field">
                    <label>একাউন্টের নাম <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="যেমন: Cash, Bank, Salary"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>একাউন্টের ধরণ (Type) <span className="required">*</span></label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="input-field"
                      disabled={!!editingAccount} // Normally account types shouldn't be changed after creation
                    >
                      <option value="Asset">সম্পদ (Asset - যেমন: Cash, Bank)</option>
                      <option value="Liability">দায় (Liability - যেমন: Loan, Payable)</option>
                      <option value="Equity">মূলধন (Equity - যেমন: Capital, Fund)</option>
                      <option value="Revenue">আয় (Revenue - যেমন: Tuition Fee, Donation)</option>
                      <option value="Expense">ব্যয় (Expense - যেমন: Salary, Bill)</option>
                    </select>
                  </div>

                  {!editingAccount && (
                    <div className="form-field">
                      <label>প্রারম্ভিক জের (Opening Balance)</label>
                      <input
                        type="number"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>

                {editingAccount && (
                  <div className="form-field flex" style={{ alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <label htmlFor="isActive" style={{ margin: 0, cursor: 'pointer' }}>সক্রিয় (Active)</label>
                  </div>
                )}

                <div className="modal-actions mt-16">
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
