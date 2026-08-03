import { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Loader, FileText, Check, X, Calendar, DollarSign } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function ExpenseVouchersPage() {
  const { user } = useAuthStore();
  const [vouchers, setVouchers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [activeTab, setActiveTab] = useState('all'); // all, pending, approved, rejected
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    payeeName: '',
    expenseAccount: '',
    fundAccount: '',
    amount: '',
    paymentMethod: 'cash',
    description: '',
    attachment: null,
  });

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const canManage = [
    'super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'
  ].includes(user?.userType) || [
    'co_super_admin', 'admin'
  ].includes(user?.adminRole);

  const canVerify = ['super_admin', 'co_super_admin', 'admin', 'principal'].includes(user?.userType);
  const canApprove = ['super_admin', 'admin'].includes(user?.userType);

  const methodMap = {
    cash: 'নগদ',
    bank: 'ব্যাংক',
    bkash: 'বিকাশ',
    nagad: 'নগদ (Nagad)',
    rocket: 'রকেট',
    cheque: 'চেক',
    online: 'অনলাইন',
    mobile_banking: 'মোবাইল ব্যাংকিং'
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      
      const [vouchersRes, accountsRes] = await Promise.all([
        api.get('/vouchers', { params }),
        api.get('/accounting/accounts')
      ]);
      
      if (vouchersRes.data.success) {
        setVouchers(vouchersRes.data.data.vouchers || []);
      }
      if (accountsRes.data.success) {
        setAccounts(accountsRes.data.data.accounts || []);
      }
    } catch (error) {
      setToast({ type: 'error', message: 'ডাটা লোড করতে ব্যর্থ হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/vouchers', {
        ...formData,
        amount: Number(formData.amount)
      });
      if (res.data.success) {
        setToast({ type: 'success', message: 'ভাউচার সফলভাবে তৈরি করা হয়েছে' });
        setIsModalOpen(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          payeeName: '',
          expenseAccount: '',
          fundAccount: '',
          amount: '',
          paymentMethod: 'cash',
          description: '',
          attachment: null,
        });
        fetchData();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'কোনো সমস্যা হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id) => {
    if (!window.confirm('আপনি কি এই ভাউচারটি যাচাই (Verify) করতে নিশ্চিত?')) return;
    try {
      const res = await api.post(`/vouchers/${id}/verify`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'ভাউচার যাচাই (Verify) করা হয়েছে' });
        fetchData();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'যাচাই করতে সমস্যা হয়েছে' });
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('আপনি কি এই ভাউচারটি অনুমোদন করতে নিশ্চিত?')) return;
    try {
      const res = await api.post(`/vouchers/${id}/approve`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'ভাউচার অনুমোদিত হয়েছে এবং লেজারে যুক্ত হয়েছে' });
        fetchData();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'অনুমোদনে সমস্যা হয়েছে' });
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('আপনি কি এই ভাউচারটি বাতিল করতে নিশ্চিত?')) return;
    try {
      const res = await api.post(`/vouchers/${id}/reject`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'ভাউচার বাতিল করা হয়েছে' });
        fetchData();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'বাতিল করতে সমস্যা হয়েছে' });
    }
  };

  const expenseAccounts = accounts.filter(a => a.type === 'Expense');
  const fundAccounts = accounts.filter(a => a.type === 'Asset'); // Usually Cash or Bank

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setToast({ type: 'error', message: 'ফাইলের আকার ২MB এর বেশি হতে পারবে না' });
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, attachment: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const openPrintModal = (voucher) => {
    setSelectedVoucher(voucher);
    setIsPrintModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">ব্যয় ও ভাউচার (Expenses & Vouchers)</h1>
          <p className="page-subtitle">প্রতিষ্ঠানের সকল খরচের ভাউচার তৈরি ও অনুমোদন করুন</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            নতুন ভাউচার তৈরি
          </button>
        )}
      </div>

      <div className="tabs mb-16">
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>সকল ভাউচার</button>
        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>অপেক্ষাধীন (Pending)</button>
        <button className={`tab ${activeTab === 'approved' ? 'active' : ''}`} onClick={() => setActiveTab('approved')}>অনুমোদিত (Approved)</button>
        <button className={`tab ${activeTab === 'rejected' ? 'active' : ''}`} onClick={() => setActiveTab('rejected')}>বাতিলকৃত (Rejected)</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">
            <Loader className="spin" size={40} />
            <p>লোড হচ্ছে...</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>কোনো ভাউচার পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>তারিখ / ভাউচার নং</th>
                  <th>প্রাপক (Payee)</th>
                  <th>ব্যয়ের খাত (Debit)</th>
                  <th>তহবিল খাত (Credit)</th>
                  <th>বিবরণ</th>
                  <th style={{ textAlign: 'right' }}>পরিমাণ</th>
                  <th style={{ textAlign: 'center' }}>স্ট্যাটাস</th>
                  {(canApprove || canVerify) && <th style={{ textAlign: 'right' }}>অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <div className="font-bold">{new Date(v.date).toLocaleDateString('bn-BD')}</div>
                      <div className="text-xs text-muted" style={{ fontFamily: 'Inter' }}>{v.voucherNumber}</div>
                    </td>
                    <td><strong>{v.payeeName}</strong></td>
                    <td><span className="badge badge-warning">{v.expenseAccountDetails?.name}</span></td>
                    <td><span className="badge badge-success">{v.fundAccountDetails?.name}</span></td>
                    <td className="text-sm">{v.description || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontFamily: 'Inter', color: 'var(--danger)' }}>
                      ৳ {v.amount?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge badge-${v.status === 'approved' ? 'success' : v.status === 'level_1_approved' ? 'primary' : v.status === 'rejected' ? 'danger' : 'warning'}`}>
                        {v.status === 'approved' ? 'Approved (চূড়ান্ত)' : v.status === 'level_1_approved' ? 'Level-1 Approved' : v.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </td>
                    {(canApprove || canVerify) && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                          {(v.status === 'pending' || v.status === 'level_1_approved') && (
                            <>
                              <button className="btn-icon text-success ml-8" title="Approve" onClick={() => handleApprove(v._id, 'approved')}>
                                <CheckCircle size={16} />
                              </button>
                              <button className="btn-icon text-danger ml-8" title="Reject" onClick={() => handleReject(v._id)}>
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          {v.status === 'approved' && (
                            <button 
                              className="btn btn-secondary btn-sm flex-center gap-4"
                              onClick={() => openPrintModal(v)}
                              style={{ padding: '4px 8px' }}
                              title="Print Voucher"
                            >
                              Print 
                            </button>
                          )}
                          {v.attachment && (
                            <a
                              href={v.attachment}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline btn-sm flex-center gap-4"
                              style={{ padding: '4px 8px' }}
                              title="View Attachment"
                            >
                              📎
                            </a>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>নতুন খরচের ভাউচার তৈরি করুন</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="form-group">
                
                <div className="form-grid">
                  <div className="form-field">
                    <label>তারিখ <span className="required">*</span></label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-field">
                    <label>প্রাপক (Payee Name) <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="যাকে টাকা দেওয়া হচ্ছে"
                      value={formData.payeeName}
                      onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>ব্যয়ের খাত (Expense Account - Debit) <span className="required">*</span></label>
                    <select
                      required
                      value={formData.expenseAccount}
                      onChange={(e) => setFormData({ ...formData, expenseAccount: e.target.value })}
                      className="input-field"
                    >
                      <option value="">-- খাত নির্বাচন করুন --</option>
                      {expenseAccounts.map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>তহবিল খাত (Fund/Asset Account - Credit) <span className="required">*</span></label>
                    <select
                      required
                      value={formData.fundAccount}
                      onChange={(e) => setFormData({ ...formData, fundAccount: e.target.value })}
                      className="input-field"
                    >
                      <option value="">-- ফান্ড নির্বাচন করুন --</option>
                      {fundAccounts.map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>পরিমাণ (৳) <span className="required">*</span></label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-field">
                    <label>পেমেন্ট মাধ্যম</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="input-field"
                    >
                      <option value="cash">নগদ (Cash)</option>
                      <option value="bank">ব্যাংক (Bank)</option>
                      <option value="bkash">বিকাশ (bKash)</option>
                      <option value="nagad">নগদ (Nagad)</option>
                      <option value="rocket">রকেট (Rocket)</option>
                      <option value="cheque">চেক (Cheque)</option>
                      <option value="online">অনলাইন পেমেন্ট</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>বিবরণ / নোট (ঐচ্ছিক)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-field"
                      rows="2"
                      placeholder="খরচের বিস্তারিত বিবরণ..."
                    ></textarea>
                  </div>
                  <div className="form-field">
                    <label>প্রমাণপত্র / রসিদ ছবি (ঐচ্ছিক)</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="input-field"
                      style={{ padding: '8px' }}
                    />
                    <small className="text-muted">সর্বোচ্চ ২MB (Image/PDF)</small>
                  </div>
                </div>

                <div className="modal-actions mt-16">
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                    বাতিল
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'ভাউচার তৈরি হচ্ছে...' : 'ভাউচার তৈরি করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && selectedVoucher && (
        <div className="modal-overlay print-modal-overlay">
          <div className="modal print-receipt-card" style={{ maxWidth: '600px', backgroundColor: '#fff' }}>
            <div className="modal-header no-print">
              <h2>ভাউচার প্রিন্ট</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsPrintModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body print-area" style={{ padding: '30px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #333', paddingBottom: '16px' }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>মাদ্রাসা ম্যানেজমেন্ট সিস্টেম</h1>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#555' }}>খরচের ভাউচার (Expense Voucher)</h3>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <strong>ভাউচার নং:</strong> {selectedVoucher.voucherNumber}<br/>
                  <strong>তারিখ:</strong> {new Date(selectedVoucher.date).toLocaleDateString('bn-BD')}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>স্ট্যাটাস:</strong> {selectedVoucher.status === 'approved' ? 'অনুমোদিত' : 'অপেক্ষাধীন'}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', width: '30%' }}>প্রাপকের নাম</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedVoucher.payeeName}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>ব্যয়ের খাত</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedVoucher.expenseAccountDetails?.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>তহবিল খাত</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedVoucher.fundAccountDetails?.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>পেমেন্ট মাধ্যম</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{methodMap[selectedVoucher.paymentMethod] || selectedVoucher.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>বিবরণ</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedVoucher.description || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>পরিমাণ</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '18px', fontWeight: 'bold' }}>৳ {selectedVoucher.amount?.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
                <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '8px', width: '200px' }}>
                  <strong>প্রস্তুতকারী:</strong> {selectedVoucher.preparedByName || 'N/A'}<br/>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>(স্বাক্ষর)</span>
                </div>
                <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '8px', width: '200px' }}>
                  <strong>অনুমোদনকারী:</strong> {selectedVoucher.approvedByName || 'N/A'}<br/>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>(স্বাক্ষর)</span>
                </div>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '32px', padding: '0 24px 24px 24px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPrintModalOpen(false)}>
                বন্ধ করুন
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePrint}>
                <FileText size={16} /> প্রিন্ট ভাউচার
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS for Print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            background: none !important;
            backdrop-filter: none !important;
            display: block !important;
            width: 100% !important;
          }
          .print-receipt-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            position: static !important;
            transform: none !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
