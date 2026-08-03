import { useState, useEffect } from 'react';
import { Briefcase, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api/axios';

export default function BankReconciliationPage() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPendingChecks();
  }, []);

  const fetchPendingChecks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/checks');
      if (res.data.success) {
        // Filter only pending checks for reconciliation
        setChecks(res.data.data.checks.filter(c => c.status === 'pending'));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ডেটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (id, status) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে চেকটির স্ট্যাটাস ${status} করতে চান?`)) return;
    try {
      const res = await api.put(`/finance/checks/${id}`, { status });
      if (res.data.success) {
        fetchPendingChecks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'আপডেট করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Briefcase className="text-primary" size={28} />
            ব্যাংক Reconciliation
          </h1>
          <p className="page-subtitle">ব্যাংকের স্টেটমেন্টের সাথে পেন্ডিং চেক/ট্রানজেকশন মেলানো</p>
        </div>
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
                <th>তারিখ</th>
                <th>ধরন</th>
                <th className="text-right">পরিমাণ</th>
                <th className="text-center">অ্যাকশন (Reconcile)</th>
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
                      <button className="btn btn-sm btn-success flex-center gap-4 mx-auto" onClick={() => handleReconcile(c._id, 'cleared')}>
                        <CheckCircle size={14} /> Mark as Cleared
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-24 text-muted">কোনো পেন্ডিং ট্রানজেকশন নেই (All caught up!)</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
