import { useState, useEffect } from 'react';
import { Undo2, Plus, AlertCircle, Loader, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';

export default function RefundManagementPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ personName: '', originalPaymentRef: '', amount: '', date: '', reason: '' });

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/refunds');
      if (res.data.success) {
        setRefunds(res.data.data.refunds);
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
      const res = await api.post('/finance/refunds', formData);
      if (res.data.success) {
        setShowModal(false);
        setFormData({ personName: '', originalPaymentRef: '', amount: '', date: '', reason: '' });
        fetchRefunds();
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
            <Undo2 className="text-primary" size={28} />
            Refund (রিফান্ড ব্যবস্থাপনা)
          </h1>
          <p className="page-subtitle">শিক্ষার্থী বা অন্যান্য পার্টিকে দেওয়া রিফান্ডের হিসাব</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => setShowModal(true)}>
          <Plus size={18} /> নতুন রিফান্ড এন্ট্রি
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
                <th>প্রাপকের নাম</th>
                <th>মূল পেমেন্ট রেফারেন্স</th>
                <th>তারিখ</th>
                <th>কারণ</th>
                <th className="text-right">রিফান্ডের পরিমাণ</th>
                <th className="text-center">স্ট্যাটাস</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length > 0 ? (
                refunds.map((r) => (
                  <tr key={r._id}>
                    <td className="font-bold">{r.personName}</td>
                    <td className="font-mono text-muted">{r.originalPaymentRef || '—'}</td>
                    <td>{new Date(r.date).toLocaleDateString('bn-BD')}</td>
                    <td>{r.reason || '—'}</td>
                    <td className="text-right font-mono font-bold text-danger">৳{r.amount.toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                        {r.status === 'completed' ? 'সম্পন্ন' : 'পেন্ডিং'}
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
                  <td colSpan="7" className="text-center py-24 text-muted">কোনো রিফান্ডের তথ্য পাওয়া যায়নি</td>
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
              <h3>নতুন রিফান্ড এন্ট্রি করুন</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>প্রাপকের নাম (যাকে রিফান্ড দেওয়া হচ্ছে)</label>
                  <input type="text" className="input" value={formData.personName} onChange={e => setFormData({...formData, personName: e.target.value})} required placeholder="যেমন: শিক্ষার্থীর নাম" />
                </div>
                <div className="form-group">
                  <label>মূল পেমেন্ট রেফারেন্স (ঐচ্ছিক)</label>
                  <input type="text" className="input" value={formData.originalPaymentRef} onChange={e => setFormData({...formData, originalPaymentRef: e.target.value})} placeholder="যেমন: PAY-12345" />
                </div>
                <div className="form-group">
                  <label>রিফান্ডের পরিমাণ (৳)</label>
                  <input type="number" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required min="1" />
                </div>
                <div className="form-group">
                  <label>তারিখ</label>
                  <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>কারণ (Reason)</label>
                  <input type="text" className="input" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required placeholder="যেমন: অতিরিক্ত ফি জমা" />
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
