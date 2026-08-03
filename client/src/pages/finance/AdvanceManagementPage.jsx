import { useState, useEffect } from 'react';
import { HandCoins, Plus, AlertCircle, Loader, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';

export default function AdvanceManagementPage() {
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ personType: 'staff', personName: '', amount: '', date: '', reason: '' });

  useEffect(() => {
    fetchAdvances();
  }, []);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/advances');
      if (res.data.success) {
        setAdvances(res.data.data.advances);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ডেটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/advances', formData);
      if (res.data.success) {
        setShowModal(false);
        setFormData({ personType: 'staff', personName: '', amount: '', date: '', reason: '' });
        fetchAdvances();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'সেভ করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <HandCoins className="text-primary" size={28} />
            অগ্রিম ও সমন্বয় (Advance & Adjustment)
          </h1>
          <p className="page-subtitle">স্টাফদের অগ্রিম বেতন বা অন্যান্য অগ্রিম পেমেন্টের হিসাব</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => setShowModal(true)}>
          <Plus size={18} /> নতুন অগ্রিম এন্ট্রি
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
                <th>ব্যক্তির ধরন</th>
                <th>নাম</th>
                <th>তারিখ</th>
                <th>কারণ</th>
                <th className="text-right">পরিমাণ</th>
                <th className="text-right">সমন্বয় করা হয়েছে</th>
                <th className="text-center">স্ট্যাটাস</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {advances.length > 0 ? (
                advances.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <span className="badge badge-primary">{a.personType.toUpperCase()}</span>
                    </td>
                    <td>{a.personName}</td>
                    <td>{new Date(a.date).toLocaleDateString('bn-BD')}</td>
                    <td>{a.reason || '—'}</td>
                    <td className="text-right font-mono font-bold">৳{a.amount.toLocaleString('en-IN')}</td>
                    <td className="text-right font-mono text-success">৳{a.adjustedAmount.toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <span className={`badge ${a.status === 'adjusted' ? 'badge-success' : 'badge-warning'}`}>
                        {a.status === 'adjusted' ? 'সম্পূর্ণ সমন্বয়' : a.status === 'pending' ? 'পেন্ডিং' : 'আংশিক সমন্বয়'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button className="btn-icon text-primary"><Edit size={16} /></button>
                      <button className="btn-icon text-danger ml-8"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-24 text-muted">কোনো অগ্রিমের তথ্য পাওয়া যায়নি</td>
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
              <h3>নতুন অগ্রিম এন্ট্রি করুন</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>ব্যক্তির ধরন</label>
                  <select className="input" value={formData.personType} onChange={e => setFormData({...formData, personType: e.target.value})}>
                    <option value="staff">স্টাফ (Staff)</option>
                    <option value="student">শিক্ষার্থী (Student)</option>
                    <option value="other">অন্যান্য (Other)</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>নাম</label>
                  <input type="text" className="input" value={formData.personName} onChange={e => setFormData({...formData, personName: e.target.value})} required placeholder="যার কাছে অগ্রিম দেওয়া হয়েছে" />
                </div>
                <div className="form-group">
                  <label>পরিমাণ (৳)</label>
                  <input type="number" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required min="1" />
                </div>
                <div className="form-group">
                  <label>তারিখ</label>
                  <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>কারণ (Reason)</label>
                  <input type="text" className="input" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="যেমন: উৎসব ভাতা" />
                </div>
                <div className="flex-end gap-16" style={{ gridColumn: 'span 2' }}>
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
