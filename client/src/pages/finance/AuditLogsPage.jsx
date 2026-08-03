import { useState, useEffect } from 'react';
import { Shield, Clock, Search, Loader, RefreshCw, FileText } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function AuditLogsPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const canManage = ['super_admin', 'co_super_admin', 'admin'].includes(user?.userType) || ['co_super_admin', 'admin'].includes(user?.adminRole);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterModule) params.module = filterModule;
      if (filterAction) params.action = filterAction;

      const res = await api.get('/audit-logs', { params });
      if (res.data.success) {
        setLogs(res.data.data.logs);
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'ডেটা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterModule, filterAction]);

  if (!canManage) {
    return (
      <div className="page-container flex-center" style={{ height: '70vh' }}>
        <div className="text-center">
          <Shield size={64} className="text-muted mb-16" style={{ margin: '0 auto', color: 'var(--danger)' }} />
          <h2>অনুমতি নেই</h2>
          <p className="text-muted">এই পেজটি দেখার জন্য আপনার পর্যাপ্ত অনুমতি নেই।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Shield className="text-primary" size={28} />
            অডিট লগ (Audit Log)
          </h1>
          <p className="page-subtitle">সিস্টেমের গুরুত্বপূর্ণ আর্থিক পরিবর্তনের রেকর্ড</p>
        </div>
        <button className="btn btn-outline flex-center gap-8" onClick={fetchData}>
          <RefreshCw size={18} /> রিফ্রেশ
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="লগ খুঁজুন..." 
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select 
            value={filterModule} 
            onChange={(e) => setFilterModule(e.target.value)}
            className="filter-select"
          >
            <option value="">সব মডিউল</option>
            <option value="Voucher">ভাউচার (Voucher)</option>
            <option value="Income">আয় (Income)</option>
            <option value="Payment">পেমেন্ট (Payment)</option>
            <option value="Invoice">ইনভয়েস (Invoice)</option>
          </select>
          
          <select 
            value={filterAction} 
            onChange={(e) => setFilterAction(e.target.value)}
            className="filter-select"
          >
            <option value="">সব অ্যাকশন</option>
            <option value="create">তৈরি (Create)</option>
            <option value="verify">যাচাই (Verify)</option>
            <option value="approve">অনুমোদন (Approve)</option>
            <option value="reject">বাতিল (Reject)</option>
            <option value="update">আপডেট (Update)</option>
            <option value="delete">ডিলিট (Delete)</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">
            <Loader className="spin" size={40} />
            <p>লোড হচ্ছে...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>কোনো অডিট লগ পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>তারিখ ও সময়</th>
                  <th style={{ width: '120px' }}>ব্যবহারকারী</th>
                  <th style={{ width: '100px' }}>মডিউল</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>অ্যাকশন</th>
                  <th>বিস্তারিত বিবরণ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="font-bold">{new Date(log.createdAt).toLocaleDateString('bn-BD')}</div>
                      <div className="text-xs text-muted font-mono">{new Date(log.createdAt).toLocaleTimeString('bn-BD')}</div>
                    </td>
                    <td>
                      <strong>{log.user?.firstName || 'System'} {log.user?.lastName || ''}</strong>
                      <div className="text-xs text-muted">{log.user?.username || ''}</div>
                    </td>
                    <td><span className="badge badge-secondary">{log.module}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${
                        log.action === 'approve' ? 'badge-success' : 
                        log.action === 'reject' || log.action === 'delete' ? 'badge-danger' : 
                        log.action === 'verify' ? 'badge-warning' : 
                        log.action === 'create' ? 'badge-active' : 'badge-info'
                      }`}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm font-medium">{log.description}</div>
                      {log.previousData && (
                        <div className="text-xs text-muted mt-4 font-mono bg-gray-50 p-8 rounded border" style={{ maxHeight: '60px', overflowY: 'auto' }}>
                          <strong>পূর্বের তথ্য (Previous):</strong> {JSON.stringify(log.previousData)}
                        </div>
                      )}
                      {log.currentData && (
                        <div className="text-xs text-muted mt-4 font-mono bg-blue-50 p-8 rounded border" style={{ maxHeight: '60px', overflowY: 'auto' }}>
                          <strong>বর্তমান তথ্য (Current):</strong> {JSON.stringify(log.currentData)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
