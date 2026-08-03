import { useState, useEffect } from 'react';
import { CreditCard, Plus, AlertCircle, Loader, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';

export default function CheckManagementPage() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ checkNumber: '', bankName: '', amount: '', issueDate: '', type: 'received' });

  useEffect(() => {
    fetchChecks();
  }, []);

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/checks');
      if (res.data.success) {
        setChecks(res.data.data.checks);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'চেকের তথ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/checks', formData);
      if (res.data.success) {
        setShowModal(false);
        setFormData({ checkNumber: '', bankName: '', amount: '', issueDate: '', type: 'received' });
        fetchChecks();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'চেক সেভ করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <CreditCard className="text-primary" size={28} />
            চেক ব্যবস্থাপনা (Check Management)
          </h1>
          <p className="page-subtitle">প্রাপ্ত এবং ইস্যুকৃত চেকের রেকর্ড</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => setShowModal(true)}>
          <Plus size={18} /> নতুন চেক এন্ট্রি
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
                <th>চেক নম্বর</th>
                <th>ব্যাংকের নাম</th>
                <th>ইস্যুর তারিখ</th>
                <th>ধরন</th>
                <th className="text-right">পরিমাণ</th>
                <th className="text-center">স্ট্যাটাস</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {checks.length > 0 ? (
                checks.map((c) => (
                  <tr key={c._id}>
                    <td className="font-mono">{c.checkNumber}</td>
                    <td>{c.bankName}</td>
                    <td>{new Date(c.issueDate).toLocaleDateString('bn-BD')}</td>
                    <td>
                      <span className={`badge ${c.type === 'received' ? 'badge-success' : 'badge-warning'}`}>
                        {c.type === 'received' ? 'প্রাপ্ত (Received)' : 'প্রদত্ত (Issued)'}
                      </span>
                    </td>
                    <td className="text-right font-mono font-bold">৳{c.amount.toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <span className={`badge ${c.status === 'cleared' ? 'badge-success' : c.status === 'bounced' ? 'badge-danger' : 'badge-primary'}`}>
                        {c.status === 'cleared' ? 'ক্লিয়ারড' : c.status === 'bounced' ? 'বাউন্সড' : 'পেন্ডিং'}
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
                  <td colSpan="7" className="text-center py-24 text-muted">কোনো চেকের তথ্য পাওয়া যায়নি</td>
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
              <h3>নতুন চেক এন্ট্রি করুন</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>চেকের ধরন</label>
                  <select className="input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="received">প্রাপ্ত চেক (Check Received)</option>
                    <option value="issued">ইস্যুকৃত চেক (Check Issued)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>চেক নম্বর</label>
                  <input type="text" className="input" value={formData.checkNumber} onChange={e => setFormData({...formData, checkNumber: e.target.value})} required placeholder="যেমন: CHK-12345" />
                </div>
                <div className="form-group">
                  <label>ব্যাংকের নাম</label>
                  <input type="text" className="input" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} required placeholder="যেমন: Islami Bank" />
                </div>
                <div className="form-group">
                  <label>পরিমাণ (৳)</label>
                  <input type="number" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required min="1" />
                </div>
                <div className="form-group">
                  <label>ইস্যুর তারিখ</label>
                  <input type="date" className="input" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} required />
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
