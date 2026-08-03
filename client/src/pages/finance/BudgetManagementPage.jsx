import { useState, useEffect } from 'react';
import { Target, Plus, AlertCircle, Loader, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';

export default function BudgetManagementPage() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ fiscalYear: '2026-2027', category: '', amount: '' });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/budgets');
      if (res.data.success) {
        setBudgets(res.data.data.budgets);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'বাজেট লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/budgets', formData);
      if (res.data.success) {
        setShowModal(false);
        setFormData({ fiscalYear: '2026-2027', category: '', amount: '' });
        fetchBudgets();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'বাজেট সেভ করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Target className="text-primary" size={28} />
            বাজেট ব্যবস্থাপনা (Budget Management)
          </h1>
          <p className="page-subtitle">খাত অনুযায়ী বাজেট সেট ও ট্র্যাক করুন</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => setShowModal(true)}>
          <Plus size={18} /> নতুন বাজেট
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-24 flex-center gap-8">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ height: '50vh' }}>
          <Loader className="spin text-primary" size={40} />
        </div>
      ) : (
        <div className="card table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>অর্থবছর</th>
                <th>খাতের নাম</th>
                <th className="text-right">বরাদ্দকৃত বাজেট</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length > 0 ? (
                budgets.map((b) => (
                  <tr key={b._id}>
                    <td>{b.fiscalYear}</td>
                    <td>{b.category}</td>
                    <td className="text-right font-mono">৳{b.amount.toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <button className="btn-icon text-primary"><Edit size={16} /></button>
                      <button className="btn-icon text-danger ml-8"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-24 text-muted">কোনো বাজেট পাওয়া যায়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop fade-in">
          <div className="modal slide-in">
            <div className="modal-header">
              <h3>নতুন বাজেট সেট করুন</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-16">
                  <label>অর্থবছর</label>
                  <input type="text" className="input" value={formData.fiscalYear} onChange={e => setFormData({...formData, fiscalYear: e.target.value})} required />
                </div>
                <div className="form-group mb-16">
                  <label>খাতের নাম</label>
                  <input type="text" className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required placeholder="যেমন: শিক্ষক বেতন" />
                </div>
                <div className="form-group mb-24">
                  <label>পরিমাণ (৳)</label>
                  <input type="number" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required min="0" />
                </div>
                <div className="flex-end gap-16">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>বাতিল</button>
                  <button type="submit" className="btn btn-primary">সেভ করুন</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
