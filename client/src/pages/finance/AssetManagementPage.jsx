import { useState, useEffect } from 'react';
import { Package, Plus, AlertCircle, Loader, Edit, Trash2 } from 'lucide-react';
import api from '../../api/axios';

export default function AssetManagementPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', purchaseDate: '', cost: '', depreciationRate: '', currentValue: '' });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/assets');
      if (res.data.success) {
        setAssets(res.data.data.assets);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'সম্পদ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/assets', formData);
      if (res.data.success) {
        setShowModal(false);
        setFormData({ name: '', purchaseDate: '', cost: '', depreciationRate: '', currentValue: '' });
        fetchAssets();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'সম্পদ সেভ করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Package className="text-primary" size={28} />
            সম্পদ ব্যবস্থাপনা (Asset Management)
          </h1>
          <p className="page-subtitle">প্রতিষ্ঠানের স্থায়ী সম্পদ ও অবচয় ট্র্যাকিং</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => setShowModal(true)}>
          <Plus size={18} /> নতুন সম্পদ
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
                <th>সম্পদের নাম</th>
                <th>কেনার তারিখ</th>
                <th className="text-right">ক্রয়মূল্য</th>
                <th className="text-right">অবচয় হার (%)</th>
                <th className="text-right">বর্তমান মূল্য</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {assets.length > 0 ? (
                assets.map((a) => (
                  <tr key={a._id}>
                    <td>{a.name}</td>
                    <td>{new Date(a.purchaseDate).toLocaleDateString('bn-BD')}</td>
                    <td className="text-right font-mono">৳{a.cost.toLocaleString('en-IN')}</td>
                    <td className="text-right font-mono">{a.depreciationRate}%</td>
                    <td className="text-right font-mono font-bold">৳{a.currentValue.toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <button className="btn-icon text-primary"><Edit size={16} /></button>
                      <button className="btn-icon text-danger ml-8"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-24 text-muted">কোনো সম্পদ পাওয়া যায়নি</td>
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
              <h3>নতুন সম্পদ যুক্ত করুন</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>সম্পদের নাম</label>
                  <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="যেমন: কম্পিউটার, আসবাবপত্র" />
                </div>
                <div className="form-group">
                  <label>কেনার তারিখ</label>
                  <input type="date" className="input" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>ক্রয়মূল্য (৳)</label>
                  <input type="number" className="input" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value, currentValue: e.target.value})} required min="0" />
                </div>
                <div className="form-group">
                  <label>অবচয় হার (%)</label>
                  <input type="number" className="input" value={formData.depreciationRate} onChange={e => setFormData({...formData, depreciationRate: e.target.value})} required min="0" max="100" />
                </div>
                <div className="form-group">
                  <label>বর্তমান মূল্য (৳)</label>
                  <input type="number" className="input" value={formData.currentValue} onChange={e => setFormData({...formData, currentValue: e.target.value})} required min="0" />
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
