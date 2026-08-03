import { useState, useEffect } from 'react';
import { Calendar, Plus, AlertCircle, Loader, Edit, Power, CheckCircle } from 'lucide-react';
import api from '../../api/axios';

export default function FinancialYearPage() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ yearName: '', startDate: '', endDate: '', isCurrent: false });

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/financial-years');
      if (res.data.success) {
        setYears(res.data.data.years);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'অর্থবছরের তথ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/financial-years', formData);
      if (res.data.success) {
        setShowModal(false);
        setFormData({ yearName: '', startDate: '', endDate: '', isCurrent: false });
        fetchYears();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'অর্থবছর সেভ করতে সমস্যা হয়েছে');
    }
  };

  const handleCloseYear = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বছরটি ক্লোজ করতে চান? ক্লোজ করা বছর পুনরায় একটিভ করা যাবে না।')) return;
    try {
      const res = await api.put(`/finance/financial-years/${id}/close`);
      if (res.data.success) {
        fetchYears();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'বছর ক্লোজ করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Calendar className="text-primary" size={28} />
            Financial Year ও Year Closing
          </h1>
          <p className="page-subtitle">অর্থবছর পরিচালনা এবং হিসাব ক্লোজিং</p>
        </div>
        <button className="btn btn-primary flex-center gap-8" onClick={() => setShowModal(true)}>
          <Plus size={18} /> নতুন অর্থবছর
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
                <th>শুরুর তারিখ</th>
                <th>শেষের তারিখ</th>
                <th className="text-center">স্ট্যাটাস</th>
                <th className="text-center">বর্তমান?</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {years.length > 0 ? (
                years.map((y) => (
                  <tr key={y._id}>
                    <td className="font-bold">{y.yearName}</td>
                    <td>{new Date(y.startDate).toLocaleDateString('bn-BD')}</td>
                    <td>{new Date(y.endDate).toLocaleDateString('bn-BD')}</td>
                    <td className="text-center">
                      <span className={`badge ${y.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {y.status === 'active' ? 'চলমান (Active)' : 'বন্ধ (Closed)'}
                      </span>
                    </td>
                    <td className="text-center">
                      {y.isCurrent ? <CheckCircle className="text-success inline-block" size={20} /> : '-'}
                    </td>
                    <td className="text-center">
                      {y.status === 'active' && (
                        <button className="btn btn-sm btn-danger flex-center gap-4 mx-auto" onClick={() => handleCloseYear(y._id)}>
                          <Power size={14} /> Close Year
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-24 text-muted">কোনো অর্থবছর পাওয়া যায়নি</td>
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
              <h3>নতুন অর্থবছর তৈরি করুন</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>বছরের নাম (e.g. 2026-2027)</label>
                  <input type="text" className="input" value={formData.yearName} onChange={e => setFormData({...formData, yearName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>শুরুর তারিখ</label>
                  <input type="date" className="input" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>শেষের তারিখ</label>
                  <input type="date" className="input" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="flex-center gap-8" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.isCurrent} onChange={e => setFormData({...formData, isCurrent: e.target.checked})} />
                    এটি কি বর্তমান অর্থবছর?
                  </label>
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
