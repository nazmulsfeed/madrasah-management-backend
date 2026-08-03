import { useState, useEffect } from 'react';
import { Calendar, DollarSign, ArrowUpRight, ArrowDownRight, FileText, Printer, Loader } from 'lucide-react';
import api from '../../api/axios';

export default function DailyTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'all' // all, income, expense
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounting/transactions', {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate
        }
      });
      if (res.data.success) {
        setTransactions(res.data.transactions);
        setOpeningBalance(res.data.openingBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line
  }, [filters.startDate, filters.endDate]);

  const filteredTransactions = transactions.filter(t => {
    if (filters.type !== 'all' && t.type !== filters.type) return false;
    return true;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const netBalance = totalIncome - totalExpense;
  const closingBalance = openingBalance + netBalance;

  const handlePrint = () => {
    window.print();
  };

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

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">দৈনিক লেনদেন (Cash Book)</h1>
          <p className="page-subtitle">প্রতিদিনের আয় ও ব্যয়ের বিস্তারিত হিসাব</p>
        </div>
        <button className="btn btn-secondary flex-center gap-4" onClick={handlePrint}>
          <Printer size={18} /> প্রিন্ট ক্যাশবুক
        </button>
      </div>

      <div className="card mb-24 no-print">
        <div className="card-body">
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="form-field">
              <label>শুরুর তারিখ</label>
              <div className="input-with-icon">
                <Calendar size={18} />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="form-field">
              <label>শেষের তারিখ</label>
              <div className="input-with-icon">
                <Calendar size={18} />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="form-field">
              <label>লেনদেনের ধরন</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="input-field"
              >
                <option value="all">সকল লেনদেন</option>
                <option value="income">শুধুমাত্র আয়</option>
                <option value="expense">শুধুমাত্র ব্যয়</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-stats no-print mb-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3 className="stat-title">শুরুর নগদ (Opening)</h3>
            <div className="stat-value text-warning">৳ {openingBalance.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <ArrowUpRight size={24} />
          </div>
          <div className="stat-info">
            <h3 className="stat-title">মোট আয় (Income)</h3>
            <div className="stat-value text-success">৳ {totalIncome.toLocaleString('en-IN')}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <ArrowDownRight size={24} />
          </div>
          <div className="stat-info">
            <h3 className="stat-title">মোট ব্যয় (Expense)</h3>
            <div className="stat-value text-danger">৳ {totalExpense.toLocaleString('en-IN')}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3 className="stat-title">সমাপনী নগদ (Closing)</h3>
            <div className={`stat-value ${closingBalance >= 0 ? 'text-success' : 'text-danger'}`}>
              ৳ {closingBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Print View Wrapper */}
      <div className="print-area">
        <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0' }}>দৈনিক ক্যাশবুক (Daily Cash Book)</h1>
          <p style={{ margin: '0' }}>
            তারিখ: {new Date(filters.startDate).toLocaleDateString('bn-BD')} হতে {new Date(filters.endDate).toLocaleDateString('bn-BD')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px', fontWeight: 'bold', fontSize: '14px', borderBottom: '2px solid #000', paddingBottom: '8px', borderTop: '2px solid #000', paddingTop: '8px' }}>
            <span>শুরুর নগদ: ৳ {openingBalance.toLocaleString('en-IN')}</span>
            <span>মোট আয়: ৳ {totalIncome.toLocaleString('en-IN')}</span>
            <span>মোট ব্যয়: ৳ {totalExpense.toLocaleString('en-IN')}</span>
            <span>সমাপনী নগদ: ৳ {closingBalance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header no-print">
            <h2 className="card-title">লেনদেনের তালিকা</h2>
          </div>
          {loading ? (
            <div className="flex-center" style={{ padding: '40px' }}>
              <Loader className="spinner" size={24} />
              <span style={{ marginLeft: '10px' }}>লোড হচ্ছে...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>কোনো লেনদেন পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>ধরন</th>
                    <th>খাত (Account)</th>
                    <th>বিবরণ (Description)</th>
                    <th style={{ textAlign: 'right' }}>টাকা (৳)</th>
                    <th>মাধ্যম</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t, idx) => (
                    <tr key={t.id || idx}>
                      <td>
                        <div className="font-bold">{new Date(t.date).toLocaleDateString('bn-BD')}</div>
                        <div className="text-xs text-muted" style={{ fontFamily: 'Inter' }}>{t.reference}</div>
                      </td>
                      <td>
                        <span className={`badge ${t.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                          {t.type === 'income' ? 'আয়' : 'ব্যয়'}
                        </span>
                      </td>
                      <td>{t.category}</td>
                      <td>{t.description}</td>
                      <td style={{ 
                        textAlign: 'right', 
                        fontWeight: 'bold', 
                        fontFamily: 'Inter',
                        color: t.type === 'income' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {t.type === 'income' ? '+' : '-'} {t.amount?.toLocaleString('en-IN')}
                      </td>
                      <td>{methodMap[t.method] || t.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="print-footer" style={{ display: 'none', justifyContent: 'space-between', marginTop: '60px' }}>
          <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '8px', width: '200px' }}>
            প্রস্তুতকারক
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '8px', width: '200px' }}>
            একাউন্ট্যান্ট / ক্যাশিয়ার
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '8px', width: '200px' }}>
            অধ্যক্ষ (Principal)
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .page-container {
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .print-header {
            display: block !important;
          }
          .print-footer {
            display: flex !important;
          }
          .no-print {
            display: none !important;
          }
          .card {
            box-shadow: none !important;
            border: none !important;
          }
          table {
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
