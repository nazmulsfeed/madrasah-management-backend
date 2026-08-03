import { useState, useEffect } from 'react';
import { CreditCard, Plus, AlertCircle, Loader, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';

export default function LoanManagementPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ type: 'given', personName: '', amount: '', date: '' });

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/loans');
      if (res.data.success) {
        setLoans(res.data.data.loans);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ঋণের তথ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/loans', formData);
      if (res.data.success) {
        setShowModal(false);
        setFormData({ type: 'given', personName: '', amount: '', date: '' });
        fetchLoans();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ঋণের তথ্য সেভ করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <CreditCard className="text-primary" size={28} />
            ঋণ ও পাওনা-দেনা (Loans & Advances)
          </h1>
          <p className="page-subtitle">প্রতিষ্ঠান প্রদত্ত বা গৃহীত ঋণের হিসাব</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => setShowModal(true)}>
          <Plus size={18} /> নতুন ঋণ এন্ট্রি
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
                <th>ধরন</th>
                <th>ব্যক্তির নাম</th>
                <th>তারিখ</th>
                <th className="text-right">মোট পরিমাণ</th>
                <th className="text-right">বকেয়া</th>
                <th className="text-center">স্ট্যাটাস</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loans.length > 0 ? (
                loans.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <span className={`badge ${l.type === 'given' ? 'badge-primary' : 'badge-warning'}`}>
                        {l.type === 'given' ? 'প্রদত্ত ঋণ (Given)' : 'গৃহীত ঋণ (Taken)'}
                      </span>
                    </td>
                    <td>{l.personName}</td>
                    <td>{new Date(l.date).toLocaleDateString('bn-BD')}</td>
                    <td className="text-right font-mono">৳{l.amount.toLocaleString('en-IN')}</td>
                    <td className="text-right font-mono font-bold text-danger">৳{l.remainingBalance.toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <span className={`badge ${l.status === 'paid' ? 'badge-success' : 'badge-primary'}`}>
                        {l.status === 'paid' ? 'পরিশোধিত' : 'চলমান'}
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
                  <td colSpan="7" className="text-center py-24 text-muted">কোনো ঋণের তথ্য পাওয়া যায়নি</td>
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
              <h3>নতুন ঋণ এন্ট্রি করুন</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>ঋণের ধরন</label>
                  <select className="input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="given">প্রদত্ত ঋণ (Loan Given to others)</option>
                    <option value="taken">গৃহীত ঋণ (Loan Taken from others)</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>ব্যক্তি/প্রতিষ্ঠানের নাম</label>
                  <input type="text" className="input" value={formData.personName} onChange={e => setFormData({...formData, personName: e.target.value})} required placeholder="যার কাছে পাওনা বা দেনা" />
                </div>
                <div className="form-group">
                  <label>পরিমাণ (৳)</label>
                  <input type="number" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required min="1" />
                </div>
                <div className="form-group">
                  <label>তারিখ</label>
                  <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
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
