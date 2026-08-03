import { useState, useEffect } from 'react';
import { Loader, Book } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function JournalLedgerPage() {
  const { user } = useAuthStore();
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filter, setFilter] = useState({
    account: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchAccounts();
    fetchJournals();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounting/accounts');
      if (res.data.success) {
        setAccounts(res.data.data.accounts || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.account) params.account = filter.account;
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;

      const res = await api.get('/accounting/journals', { params });
      if (res.data.success) {
        setJournals(res.data.data.journals || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchJournals();
  };

  // We will render entries inline directly in the tbody to use proper table rows

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">জার্নাল ও লেজার (Journal & Ledger)</h1>
          <p className="page-subtitle">প্রতিষ্ঠানের সকল ডাবল-এন্ট্রি লেনদেনের রেকর্ড</p>
        </div>
      </div>

      <div className="card mb-16">
        <form onSubmit={handleFilter} className="flex gap-16" style={{ alignItems: 'flex-end' }}>
          <div className="flex-1">
            <label className="form-label text-xs">একাউন্ট (খাতা)</label>
            <select 
              className="form-select form-input"
              value={filter.account}
              onChange={(e) => setFilter({ ...filter, account: e.target.value })}
            >
              <option value="">সকল একাউন্ট (General Journal)</option>
              {accounts.map(a => (
                <option key={a._id} value={a._id}>{a.name} ({a.code}) - {a.type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label text-xs">শুরুর তারিখ</label>
            <input 
              type="date"
              className="form-input"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label text-xs">শেষ তারিখ</label>
            <input 
              type="date"
              className="form-input"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary h-100">
            ফিল্টার
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">
            <Loader className="spin" size={40} />
            <p>লোড হচ্ছে...</p>
          </div>
        ) : journals.length === 0 ? (
          <div className="empty-state">
            <Book size={48} />
            <p>কোনো লেনদেনের রেকর্ড পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>তারিখ</th>
                  <th style={{ width: '150px' }}>রেফারেন্স / ভাউচার</th>
                  <th>বিবরণ ও হিসাবের খাত</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>ডেবিট (Dr)</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>ক্রেডিট (Cr)</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((journal) => (
                  <React.Fragment key={journal._id}>
                    {journal.entries.map((entry, idx) => (
                      <tr key={`${journal._id}-${idx}`} style={{ borderBottom: idx === journal.entries.length - 1 ? '2px solid var(--border-color)' : 'none' }}>
                        {idx === 0 && (
                          <>
                            <td rowSpan={journal.entries.length} style={{ verticalAlign: 'top', borderRight: '1px solid var(--border-color)' }}>
                              <div className="font-bold">{new Date(journal.date).toLocaleDateString('bn-BD')}</div>
                              <div className="text-xs text-muted mt-4" style={{ fontFamily: 'Inter' }}>
                                {new Date(journal.date).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td rowSpan={journal.entries.length} className="text-sm font-semibold" style={{ verticalAlign: 'top', borderRight: '1px solid var(--border-color)', fontFamily: 'Inter' }}>
                              {journal.reference || '-'}
                            </td>
                          </>
                        )}
                        <td>
                          {idx === 0 && <div className="text-xs text-muted mb-4 italic">{journal.description}</div>}
                          <div className="text-sm font-medium" style={{ paddingLeft: entry.credit > 0 ? '20px' : '0' }}>
                            {entry.accountDetails?.name} {entry.accountDetails?.code ? `(${entry.accountDetails.code})` : ''}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'Inter', color: entry.debit > 0 ? 'var(--text-color)' : 'transparent' }}>
                          {entry.debit > 0 ? entry.debit.toLocaleString('en-IN') : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'Inter', color: entry.credit > 0 ? 'var(--text-color)' : 'transparent' }}>
                          {entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
