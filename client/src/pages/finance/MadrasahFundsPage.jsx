import { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, ArrowRight, Save, X, Loader, Wallet, Send, CheckCircle, Clock } from 'lucide-react';
import api from '../../api/axios';

export default function MadrasahFundsPage() {
  const [funds, setFunds] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const [formData, setFormData] = useState({
    fromFund: '',
    toFund: '',
    amount: '',
    reason: ''
  });

  const fundLabels = {
    'zakat': 'যাকাত তহবিল',
    'fitra': 'ফিতরা তহবিল',
    'sadaqah': 'সদকা/লিল্লাহ তহবিল',
    'yatim': 'এতিম তহবিল',
    'masjid': 'মসজিদ তহবিল',
    'nirman': 'নির্মাণ তহবিল',
    'general': 'সাধারণ তহবিল'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res1 = await api.get('/madrasah/funds/balances');
      const res2 = await api.get('/madrasah/funds/transfers');
      if (res1.data.success) setFunds(res1.data.data);
      if (res2.data.success) setTransfers(res2.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post('/madrasah/funds/transfers', formData);
      if (res.data.success) {
        setShowTransferModal(false);
        setFormData({ fromFund: '', toFund: '', amount: '', reason: '' });
        fetchData();
      }
    } catch (error) {
      console.error(error);
      alert('ট্রান্সফার সম্পন্ন করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      const res = await api.put(`/madrasah/funds/transfers/${id}/approve`);
      if (res.data.success) {
        fetchData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Wallet className="text-primary" size={28} />
            মাদ্রাসার বিশেষ তহবিল (Funds)
          </h1>
          <p className="page-subtitle">যাকাত, ফিতরা, এতিম ও অন্যান্য তহবিলের ব্যালেন্স</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => setShowTransferModal(true)}>
          <Send size={18} />
          ফান্ড ট্রান্সফার করুন
        </button>
      </div>

      <div className="grid grid-4 mb-24" style={{ gap: '16px' }}>
        {Object.entries(fundLabels).map(([key, label]) => (
          <div key={key} className="card dashboard-stat-card">
            <div className="stat-content">
              <div className="stat-title">{label}</div>
              <div className="stat-value text-primary">
                ৳ {(funds[key] || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="stat-icon" style={{ opacity: 0.1 }}><Database size={40} /></div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="mb-16">ফান্ড ট্রান্সফার রেকর্ডস</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>হতে (From)</th>
                <th>প্রতি (To)</th>
                <th>পরিমাণ</th>
                <th>কারণ</th>
                <th>স্ট্যাটাস</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t._id}>
                  <td>{new Date(t.date).toLocaleDateString('bn-BD')}</td>
                  <td><span className="badge badge-warning">{fundLabels[t.fromFund] || t.fromFund}</span></td>
                  <td><span className="badge badge-success">{fundLabels[t.toFund] || t.toFund}</span></td>
                  <td className="font-bold text-primary">৳ {t.amount.toLocaleString('en-IN')}</td>
                  <td>{t.reason || '-'}</td>
                  <td>
                    <span className={`badge badge-${t.status === 'approved' ? 'success' : 'warning'}`}>
                      {t.status === 'approved' ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {t.status === 'pending' && (
                      <button className="btn btn-success btn-sm flex-center gap-4" onClick={() => handleApprove(t._id)}>
                        <CheckCircle size={14} /> Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-24">কোনো রেকর্ড পাওয়া যায়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showTransferModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>ফান্ড ট্রান্সফার</h2>
              <button className="btn-icon text-muted" onClick={() => setShowTransferModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleTransferSubmit}>
                <div className="form-group">
                  <label className="form-label">যে ফান্ড থেকে কাটবে (From)</label>
                  <select 
                    className="input" 
                    value={formData.fromFund} 
                    onChange={e => setFormData({...formData, fromFund: e.target.value})} 
                    required
                  >
                    <option value="">নির্বাচন করুন</option>
                    {Object.entries(fundLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">যে ফান্ডে জমা হবে (To)</label>
                  <select 
                    className="input" 
                    value={formData.toFund} 
                    onChange={e => setFormData({...formData, toFund: e.target.value})} 
                    required
                  >
                    <option value="">নির্বাচন করুন</option>
                    {Object.entries(fundLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">পরিমাণ (Amount)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">কারণ / বিবরণ</label>
                  <textarea 
                    className="input" 
                    value={formData.reason} 
                    onChange={e => setFormData({...formData, reason: e.target.value})} 
                    rows="2"
                    required
                  ></textarea>
                </div>
                <div className="flex-end gap-12 mt-24">
                  <button type="button" className="btn btn-outline" onClick={() => setShowTransferModal(false)}>বাতিল</button>
                  <button type="submit" className="btn btn-primary flex-center gap-8" disabled={loading}>
                    {loading ? <Loader className="spin" size={18} /> : <Save size={18} />} ট্রান্সফার করুন
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
