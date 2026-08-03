import { useState, useEffect } from 'react';
import { Plus, Edit, RefreshCw, FileText, Loader, CheckCircle, Package } from 'lucide-react';
import api from '../../api/axios';

export default function QurbaniSkinsPage() {
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    donorName: '',
    donorPhone: '',
    donorAddress: '',
    animalType: 'cow',
    quantity: 1,
    condition: 'good'
  });

  const [sellData, setSellData] = useState({
    soldAmount: '',
    soldDate: new Date().toISOString().split('T')[0],
    buyerName: '',
    fundAccount: 'lillah'
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
      const res = await api.get('/madrasah/qurbani-skins');
      if (res.data.success) setSkins(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post('/madrasah/qurbani-skins', formData);
      if (res.data.success) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error(error);
      alert('রেকর্ড তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.put(`/madrasah/qurbani-skins/${selectedSkin._id}`, {
        ...sellData,
        status: 'sold'
      });
      if (res.data.success) {
        setShowSellModal(false);
        fetchData();
      }
    } catch (error) {
      console.error(error);
      alert('বিক্রয় সম্পন্ন করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const openSellModal = (skin) => {
    setSelectedSkin(skin);
    setShowSellModal(true);
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Package className="text-primary" size={28} />
            কুরবানির চামড়া হিসাব
          </h1>
          <p className="page-subtitle">সংগৃহীত চামড়ার হিসাব এবং বিক্রয় ট্র্যাকিং</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => {
          setFormData({
            date: new Date().toISOString().split('T')[0],
            donorName: '',
            donorPhone: '',
            donorAddress: '',
            animalType: 'cow',
            quantity: 1,
            condition: 'good'
          });
          setShowModal(true);
        }}>
          <Plus size={18} /> নতুন সংগ্রহ
        </button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>দাতার নাম</th>
                <th>পশুর ধরন</th>
                <th>সংখ্যা</th>
                <th>স্ট্যাটাস</th>
                <th>বিক্রয় মূল্য</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {skins.map(s => (
                <tr key={s._id}>
                  <td>{new Date(s.date).toLocaleDateString('bn-BD')}</td>
                  <td>
                    <div className="font-bold">{s.donorName || 'অজ্ঞাত'}</div>
                    <div className="text-xs text-muted">{s.donorPhone}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{s.animalType}</td>
                  <td className="font-bold">{s.quantity} টি</td>
                  <td>
                    <span className={`badge badge-${s.status === 'sold' ? 'success' : 'warning'}`}>
                      {s.status === 'sold' ? 'Sold' : 'Collected'}
                    </span>
                  </td>
                  <td className="font-bold text-success">
                    {s.soldAmount ? `৳ ${s.soldAmount.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td>
                    {s.status !== 'sold' && (
                      <button className="btn btn-outline btn-sm flex-center gap-4" onClick={() => openSellModal(s)}>
                        বিক্রয় করুন
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {skins.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-24">কোনো চামড়া সংগ্রহের রেকর্ড পাওয়া যায়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>নতুন চামড়া সংগ্রহ</h2>
              <button className="btn-icon text-muted" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-2" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">তারিখ</label>
                    <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">পশুর ধরন</label>
                    <select className="input" value={formData.animalType} onChange={e => setFormData({...formData, animalType: e.target.value})}>
                      <option value="cow">গরু (Cow)</option>
                      <option value="goat">ছাগল (Goat)</option>
                      <option value="sheep">ভেড়া (Sheep)</option>
                      <option value="buffalo">মহিষ (Buffalo)</option>
                      <option value="other">অন্যান্য</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-2" style={{ gap: '16px', marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">সংখ্যা</label>
                    <input type="number" className="input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required min="1" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">অবস্থা (Condition)</label>
                    <input type="text" className="input" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} placeholder="e.g. Good" />
                  </div>
                </div>
                <div className="form-group mt-16">
                  <label className="form-label">দাতার নাম (ঐচ্ছিক)</label>
                  <input type="text" className="input" value={formData.donorName} onChange={e => setFormData({...formData, donorName: e.target.value})} />
                </div>
                <div className="form-group mt-16">
                  <label className="form-label">দাতার ফোন (ঐচ্ছিক)</label>
                  <input type="text" className="input" value={formData.donorPhone} onChange={e => setFormData({...formData, donorPhone: e.target.value})} />
                </div>
                
                <div className="flex-end gap-12 mt-24">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>বাতিল</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>সংরক্ষণ করুন</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSellModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>চামড়া বিক্রয় ও ফান্ডে জমা</h2>
              <button className="btn-icon text-muted" onClick={() => setShowSellModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSellSubmit}>
                <div className="form-group">
                  <label className="form-label">বিক্রয় মূল্য</label>
                  <input type="number" className="input" value={sellData.soldAmount} onChange={e => setSellData({...sellData, soldAmount: e.target.value})} required />
                </div>
                <div className="form-group mt-16">
                  <label className="form-label">যে ফান্ডে জমা হবে</label>
                  <select className="input" value={sellData.fundAccount} onChange={e => setSellData({...sellData, fundAccount: e.target.value})} required>
                    {Object.entries(fundLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group mt-16">
                  <label className="form-label">ক্রেতার নাম (ঐচ্ছিক)</label>
                  <input type="text" className="input" value={sellData.buyerName} onChange={e => setSellData({...sellData, buyerName: e.target.value})} />
                </div>
                
                <div className="flex-end gap-12 mt-24">
                  <button type="button" className="btn btn-outline" onClick={() => setShowSellModal(false)}>বাতিল</button>
                  <button type="submit" className="btn btn-success" disabled={loading}>বিক্রয় নিশ্চিত করুন</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
