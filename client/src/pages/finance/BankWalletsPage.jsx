import { useState, useEffect } from 'react';
import { Wallet, Landmark, CreditCard, Plus, ArrowRight, Loader, Smartphone } from 'lucide-react';
import api from '../../api/axios';
import { Link } from 'react-router-dom';

export default function BankWalletsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounting/accounts');
      if (res.data.success) {
        // Filter only Asset accounts (Banks, Wallets, Cash)
        const accountsData = res.data.data?.accounts || res.data.accounts || [];
        const assetAccounts = accountsData.filter(a => a.type === 'Asset');
        setAccounts(assetAccounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bank') || lowerName.includes('ব্যাংক')) return <Landmark size={24} />;
    if (lowerName.includes('bkash') || lowerName.includes('nagad') || lowerName.includes('rocket') || lowerName.includes('বিকাশ') || lowerName.includes('নগদ') || lowerName.includes('রকেট')) return <Smartphone size={24} />;
    if (lowerName.includes('cash') || lowerName.includes('ক্যাশ')) return <Wallet size={24} />;
    return <CreditCard size={24} />;
  };

  const getColor = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bkash') || lowerName.includes('বিকাশ')) return '#e2136e';
    if (lowerName.includes('nagad') || lowerName.includes('নগদ')) return '#f37021';
    if (lowerName.includes('rocket') || lowerName.includes('রকেট')) return '#8c1561';
    if (lowerName.includes('bank') || lowerName.includes('ব্যাংক')) return '#3b82f6';
    if (lowerName.includes('cash') || lowerName.includes('ক্যাশ')) return '#22c55e';
    return 'var(--primary)';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">ব্যাংক ও ডিজিটাল ওয়ালেট</h1>
          <p className="page-subtitle">প্রতিষ্ঠানের সকল ব্যাংক একাউন্ট এবং মোবাইল ওয়ালেটের বর্তমান ব্যালেন্স</p>
        </div>
        <Link to="/finance/chart-of-accounts" className="btn btn-primary flex-center gap-4">
          <Plus size={18} /> নতুন ফান্ড / একাউন্ট যুক্ত করুন
        </Link>
      </div>

      {loading ? (
        <div className="flex-center" style={{ minHeight: '300px' }}>
          <Loader className="spinner" size={32} />
        </div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">
          <Wallet size={48} />
          <p>কোনো ব্যাংক বা ওয়ালেট একাউন্ট পাওয়া যায়নি</p>
          <Link to="/finance/chart-of-accounts" className="btn btn-primary mt-16">
            একাউন্ট তৈরি করুন
          </Link>
        </div>
      ) : (
        <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {accounts.map(account => (
            <div key={account._id} className="card" style={{ padding: '24px', borderTop: `4px solid ${getColor(account.name)}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    background: `${getColor(account.name)}20`, 
                    color: getColor(account.name),
                    padding: '12px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getIcon(account.name)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{account.name}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'Inter' }}>কোড: {account.code}</div>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>বর্তমান ব্যালেন্স</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Inter', color: account.balance < 0 ? 'var(--danger)' : 'inherit' }}>
                  ৳ {account.balance?.toLocaleString('en-IN') || 0}
                </div>
              </div>
              
              <Link 
                to={`/finance/journal-ledger?account=${account._id}`} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', 
                  color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, marginTop: '8px' 
                }}
              >
                বিস্তারিত লেজার দেখুন <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
