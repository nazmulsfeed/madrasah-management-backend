import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader, Wallet, Search, Calendar, FileText, Check, X } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function IncomesPage() {
  const { user } = useAuthStore();
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    donorName: '',
    donorPhone: '',
    paymentMethod: 'cash',
    transactionReference: '',
    notes: '',
    fundAccount: '',
    revenueAccount: '',
  });

  const [filterCategory, setFilterCategory] = useState('');

  const canManage = [
    'super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'
  ].includes(user?.userType) || [
    'co_super_admin', 'admin'
  ].includes(user?.adminRole);

  const canApprove = ['super_admin', 'co_super_admin', 'admin', 'principal'].includes(user?.userType);

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
      if (filterCategory) params.category = filterCategory;
      if (activeTab !== 'all') params.status = activeTab;

      const [incomesRes, categoriesRes, accountsRes] = await Promise.all([
        api.get('/finance/incomes', { params }),
        api.get('/finance/income-categories'),
        api.get('/accounting/accounts')
      ]);
      
      if (incomesRes.data.success) {
        setIncomes(incomesRes.data.data.incomes || []);
      }
      if (categoriesRes.data.success) {
        const filteredCats = (categoriesRes.data.data.categories || []).filter(c => c.type !== 'student_fee');
        setCategories(filteredCats);
        if (filteredCats.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: filteredCats[0]._id }));
        }
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
  }, [filterCategory, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/finance/incomes', {
        ...formData,
        amount: Number(formData.amount)
      });
      if (res.data.success) {
        setToast({ type: 'success', message: 'আয় সফলভাবে রেকর্ড করা হয়েছে' });
        setIsModalOpen(false);
        setFormData({
          category: categories.length > 0 ? categories[0]._id : '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          donorName: '',
          donorPhone: '',
          paymentMethod: 'cash',
          transactionReference: '',
          notes: '',
          fundAccount: '',
          revenueAccount: '',
        });
        fetchData();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'কোনো সমস্যা হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই রেকর্ডটি মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/finance/incomes/${id}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'রেকর্ড সফলভাবে মুছে ফেলা হয়েছে' });
        fetchData();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'মুছে ফেলতে সমস্যা হয়েছে' });
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('আপনি কি এই আয়টি অনুমোদন করতে নিশ্চিত?')) return;
    try {
      const res = await api.post(`/finance/incomes/${id}/approve`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'আয় অনুমোদিত হয়েছে এবং লেজারে যুক্ত হয়েছে' });
        fetchData();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'অনুমোদনে সমস্যা হয়েছে' });
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('আপনি কি এই আয়টি বাতিল করতে নিশ্চিত?')) return;
    try {
      const res = await api.post(`/finance/incomes/${id}/reject`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'আয় বাতিল করা হয়েছে' });
        fetchData();
      }
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'বাতিল করতে সমস্যা হয়েছে' });
    }
  };

  const openPrintModal = (income) => {
    setSelectedIncome(income);
    setIsPrintModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);

  return (
    <div className="page-container">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">অন্যান্য আয়</h1>
          <p className="page-subtitle">দান, অনুদান ও অন্যান্য আয়ের হিসাব</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            নতুন আয় এন্ট্রি
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>খাত অনুযায়ী ফিল্টার:</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field"
          >
            <option value="">সকল খাত</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="summary-stat" style={{ padding: '0.5rem 1rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px', fontWeight: 'bold' }}>
          মোট: ৳ {totalAmount.toLocaleString('en-IN')}
        </div>
      </div>

      <div className="tabs mb-16">
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>সকল আয়</button>
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
        ) : incomes.length === 0 ? (
          <div className="empty-state">
            <Wallet size={48} />
            <p>কোনো আয়ের রেকর্ড পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>খাত</th>
                  <th>বিবরণ / দাতা</th>
                  <th>পেমেন্ট মাধ্যম</th>
                  <th style={{ textAlign: 'right' }}>পরিমাণ</th>
                  <th style={{ textAlign: 'center' }}>স্ট্যাটাস</th>
                  {canManage && <th style={{ textAlign: 'right' }}>অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => (
                  <tr key={income._id}>
                    <td>
                      <div className="flex-align">
                        <Calendar size={14} style={{ marginRight: '4px', opacity: 0.5 }} />
                        {new Date(income.date).toLocaleDateString('bn-BD')}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{income.category?.name || 'অজানা'}</span>
                    </td>
                    <td>
                      {income.donorName && <div><strong>{income.donorName}</strong> {income.donorPhone && `(${income.donorPhone})`}</div>}
                      {income.notes && <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}><FileText size={12} style={{display:'inline'}}/> {income.notes}</div>}
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{income.paymentMethod}</span>
                      {income.transactionReference && <div style={{ fontSize: '0.8rem' }}>Ref: {income.transactionReference}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      ৳ {income.amount?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${income.status === 'approved' ? 'badge-active' : income.status === 'rejected' ? 'badge-danger' : 'badge-info'}`}>
                        {income.status === 'approved' ? 'অনুমোদিত' : income.status === 'rejected' ? 'বাতিল' : 'অপেক্ষাধীন'}
                      </span>
                    </td>
                    {canManage && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                          {canApprove && income.status === 'pending' && (
                            <>
                              <button 
                                className="btn btn-success btn-sm flex-center gap-4"
                                onClick={() => handleApprove(income._id)}
                                style={{ padding: '4px 8px' }}
                              >
                                <Check size={14} /> 
                              </button>
                              <button 
                                className="btn btn-danger btn-sm flex-center gap-4"
                                onClick={() => handleReject(income._id)}
                                style={{ padding: '4px 8px' }}
                              >
                                <X size={14} /> 
                              </button>
                            </>
                          )}
                          {income.status === 'approved' && (
                            <button 
                              className="btn btn-secondary btn-sm flex-center gap-4"
                              onClick={() => openPrintModal(income)}
                              style={{ padding: '4px 8px' }}
                              title="Print Receipt"
                            >
                              <FileText size={14} /> 
                            </button>
                          )}
                          <button 
                            className="btn-icon btn-ghost" 
                            title="মুছে ফেলুন"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDelete(income._id)}
                          >
                            <Trash2 size={16} />
                          </button>
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
              <h2>নতুন আয় এন্ট্রি</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="form-group">
                <div className="form-grid">
                  <div className="form-field">
                    <label>আয়ের খাত <span className="required">*</span></label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-field"
                    >
                      {categories.map(c => (
                        <option key={c._id} value={c._id}>{c.name} ({c.type === 'donation' ? 'দান' : 'অন্যান্য'})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-field">
                    <label>জমা ফান্ড (Fund Account - Debit) <span className="required">*</span></label>
                    <select
                      required
                      value={formData.fundAccount}
                      onChange={(e) => setFormData({ ...formData, fundAccount: e.target.value })}
                      className="input-field"
                    >
                      <option value="">-- ফান্ড নির্বাচন করুন --</option>
                      {accounts.filter(a => a.type === 'Asset').map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-field">
                    <label>আয়ের খাত (Revenue Account - Credit) <span className="required">*</span></label>
                    <select
                      required
                      value={formData.revenueAccount}
                      onChange={(e) => setFormData({ ...formData, revenueAccount: e.target.value })}
                      className="input-field"
                    >
                      <option value="">-- আয়ের খাত নির্বাচন করুন --</option>
                      {accounts.filter(a => a.type === 'Revenue').map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                  
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
                </div>

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
                    <label>পেমেন্ট মাধ্যম <span className="required">*</span></label>
                    <select
                      required
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="input-field"
                    >
                      <option value="cash">নগদ (Cash)</option>
                      <option value="bkash">বিকাশ (bKash)</option>
                      <option value="nagad">নগদ (Nagad)</option>
                      <option value="rocket">রকেট (Rocket)</option>
                      <option value="bank">ব্যাংক (Bank)</option>
                    </select>
                  </div>
                </div>

                {formData.paymentMethod !== 'cash' && (
                  <div className="form-field">
                    <label>ট্রানজেকশন / চেক নম্বর</label>
                    <input
                      type="text"
                      value={formData.transactionReference}
                      onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                      className="input-field"
                    />
                  </div>
                )}

                <div className="form-group-title" style={{ marginTop: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>দাতার তথ্য (ঐচ্ছিক)</div>
                <div className="form-grid">
                  <div className="form-field">
                    <label>দাতার নাম</label>
                    <input
                      type="text"
                      value={formData.donorName}
                      onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-field">
                    <label>দাতার মোবাইল</label>
                    <input
                      type="text"
                      value={formData.donorPhone}
                      onChange={(e) => setFormData({ ...formData, donorPhone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>বিবরণ / নোট</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-field"
                    rows="2"
                  ></textarea>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                    বাতিল
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting || categories.length === 0}>
                    {submitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && selectedIncome && (
        <div className="modal-overlay print-modal-overlay">
          <div className="modal print-receipt-card" style={{ maxWidth: '600px', backgroundColor: '#fff' }}>
            <div className="modal-header no-print">
              <h2>মানি রসিদ প্রিন্ট</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsPrintModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body print-area" style={{ padding: '30px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #333', paddingBottom: '16px' }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>মাদ্রাসা ম্যানেজমেন্ট সিস্টেম</h1>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#555' }}>মানি রসিদ (Money Receipt)</h3>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <strong>রসিদ নং:</strong> {selectedIncome._id.substring(18).toUpperCase()}<br/>
                  <strong>তারিখ:</strong> {new Date(selectedIncome.date).toLocaleDateString('bn-BD')}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>স্ট্যাটাস:</strong> {selectedIncome.status === 'approved' ? 'অনুমোদিত' : 'অপেক্ষাধীন'}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', width: '30%' }}>আয়ের খাত</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedIncome.category?.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>দাতার নাম</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedIncome.donorName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>দাতার মোবাইল</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedIncome.donorPhone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>পেমেন্ট মাধ্যম</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedIncome.paymentMethod} {selectedIncome.transactionReference ? `(Ref: ${selectedIncome.transactionReference})` : ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>বিবরণ</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{selectedIncome.notes || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>পরিমাণ</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '18px', fontWeight: 'bold' }}>৳ {selectedIncome.amount?.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
                <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '8px', width: '200px' }}>
                  <strong>প্রদানকারীর স্বাক্ষর</strong><br/>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>(Signature)</span>
                </div>
                <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '8px', width: '200px' }}>
                  <strong>গ্রহণকারীর স্বাক্ষর</strong><br/>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>(Signature)</span>
                </div>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '32px', padding: '0 24px 24px 24px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPrintModalOpen(false)}>
                বন্ধ করুন
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePrint}>
                <FileText size={16} /> প্রিন্ট রসিদ
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
