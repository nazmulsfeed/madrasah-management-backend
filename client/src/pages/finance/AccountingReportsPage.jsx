import { useState, useEffect } from 'react';
import { PieChart, Download, FileText, Search, Loader, Filter, Table as TableIcon, BookOpen, Printer, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

export default function AccountingReportsPage() {
  const [activeTab, setActiveTab] = useState('trialBalance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [trialBalanceData, setTrialBalanceData] = useState(null);
  const [balanceSheetData, setBalanceSheetData] = useState(null);
  const [incomeStatementData, setIncomeStatementData] = useState(null);

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab, customStart, customEnd) => {
    setLoading(true);
    setError('');
    const sDate = customStart || startDate;
    const eDate = customEnd || endDate;
    
    try {
      const params = { startDate: sDate, endDate: eDate };
      if (tab === 'trialBalance') {
        const res = await api.get('/accounting/trial-balance', { params });
        if (res.data.success) setTrialBalanceData(res.data.data);
      } else if (tab === 'balanceSheet') {
        const res = await api.get('/accounting/balance-sheet', { params });
        if (res.data.success) setBalanceSheetData(res.data.data);
      } else if (tab === 'incomeStatement') {
        const res = await api.get('/accounting/income-statement', { params });
        if (res.data.success) setIncomeStatementData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ডেটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Accounting Report - ${activeTab}`, 14, 15);
    
    let head = [];
    let body = [];
    
    if (activeTab === 'trialBalance' && trialBalanceData) {
      head = [['Code', 'Account', 'Debit', 'Credit']];
      body = trialBalanceData.trialBalance.map(item => [item.code, item.name, item.debit, item.credit]);
    } else if (activeTab === 'incomeStatement' && incomeStatementData) {
      head = [['Account', 'Amount']];
      body = [...incomeStatementData.revenues, ...incomeStatementData.expenses].map(item => [item.name, item.balance]);
    } else if (activeTab === 'balanceSheet' && balanceSheetData) {
      head = [['Account', 'Amount']];
      body = [...balanceSheetData.assets, ...balanceSheetData.liabilities].map(item => [item.name, item.balance]);
    }

    doc.autoTable({ head, body, startY: 20 });
    doc.save(`report_${activeTab}.pdf`);
  };

  const exportToExcel = () => {
    let wsData = [];
    
    if (activeTab === 'trialBalance' && trialBalanceData) {
      wsData = [['Code', 'Account', 'Debit', 'Credit']];
      trialBalanceData.trialBalance.forEach(item => wsData.push([item.code, item.name, item.debit, item.credit]));
    } else if (activeTab === 'incomeStatement' && incomeStatementData) {
      wsData = [['Account', 'Amount']];
      [...incomeStatementData.revenues, ...incomeStatementData.expenses].forEach(item => wsData.push([item.name, item.balance]));
    } else if (activeTab === 'balanceSheet' && balanceSheetData) {
      wsData = [['Account', 'Amount']];
      [...balanceSheetData.assets, ...balanceSheetData.liabilities].forEach(item => wsData.push([item.name, item.balance]));
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `report_${activeTab}.xlsx`);
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchData(activeTab);
  };

  const formatMoney = (amount) => {
    return '৳' + Number(amount || 0).toLocaleString('en-IN');
  };

  const renderTrialBalance = () => {
    if (!trialBalanceData) return null;
    return (
      <div className="card print-area">
        <div className="text-center mb-24 border-bottom pb-16">
          <h2 className="mb-8">রেওয়ামিল (Trial Balance)</h2>
          <p className="text-muted">তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th className="text-left">হিসাবের কোড (Code)</th>
              <th className="text-left">হিসাবের নাম (Account Name)</th>
              <th className="text-right">ডেবিট (Debit)</th>
              <th className="text-right">ক্রেডিট (Credit)</th>
            </tr>
          </thead>
          <tbody>
            {trialBalanceData.trialBalance.map((item, idx) => (
              <tr key={idx}>
                <td className="text-left font-mono">{item.code}</td>
                <td className="text-left">{item.name} <small className="text-muted">({item.type})</small></td>
                <td className="text-right font-mono text-success">{item.debit > 0 ? formatMoney(item.debit) : '-'}</td>
                <td className="text-right font-mono text-danger">{item.credit > 0 ? formatMoney(item.credit) : '-'}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: 'var(--surface-hover)', fontWeight: 'bold' }}>
              <td colSpan="2" className="text-right">মোট (Total):</td>
              <td className="text-right font-mono">{formatMoney(trialBalanceData.totals.debit)}</td>
              <td className="text-right font-mono">{formatMoney(trialBalanceData.totals.credit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!balanceSheetData) return null;
    return (
      <div className="card print-area">
        <div className="text-center mb-24 border-bottom pb-16">
          <h2 className="mb-8">উদ্বৃত্তপত্র (Balance Sheet)</h2>
          <p className="text-muted">তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
        </div>
        
        <div className="grid grid-2" style={{ gap: '24px', alignItems: 'start' }}>
          {/* Assets Side */}
          <div>
            <h3 className="mb-16 border-bottom pb-8" style={{ color: 'var(--success)' }}>সম্পদ (Assets)</h3>
            <table className="table">
              <tbody>
                {balanceSheetData.assets.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-left">{item.name}</td>
                    <td className="text-right font-mono">{formatMoney(item.balance)}</td>
                  </tr>
                ))}
                {balanceSheetData.assets.length === 0 && (
                  <tr><td colSpan="2" className="text-center text-muted">কোনো ডেটা নেই</td></tr>
                )}
                <tr style={{ backgroundColor: 'var(--surface-hover)', fontWeight: 'bold' }}>
                  <td className="text-right">মোট সম্পদ:</td>
                  <td className="text-right font-mono">{formatMoney(balanceSheetData.totalAssets)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Liabilities & Equity Side */}
          <div>
            <h3 className="mb-16 border-bottom pb-8" style={{ color: 'var(--danger)' }}>দায় ও মূলধন (Liabilities & Equity)</h3>
            <table className="table mb-16">
              <thead>
                <tr>
                  <th colSpan="2" className="text-left" style={{ backgroundColor: '#f9fafb' }}>দায় (Liabilities)</th>
                </tr>
              </thead>
              <tbody>
                {balanceSheetData.liabilities.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-left">{item.name}</td>
                    <td className="text-right font-mono">{formatMoney(item.balance)}</td>
                  </tr>
                ))}
                {balanceSheetData.liabilities.length === 0 && (
                  <tr><td colSpan="2" className="text-center text-muted">কোনো ডেটা নেই</td></tr>
                )}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2" className="text-left" style={{ backgroundColor: '#f9fafb' }}>মূলধন (Equity) ও অন্যান্য</th>
                </tr>
              </thead>
              <tbody>
                {balanceSheetData.equities.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-left">{item.name}</td>
                    <td className="text-right font-mono">{formatMoney(item.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="text-left">নিট আয় (Net Income)</td>
                  <td className="text-right font-mono" style={{ color: balanceSheetData.netIncome >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatMoney(balanceSheetData.netIncome)}
                  </td>
                </tr>
                <tr style={{ backgroundColor: 'var(--surface-hover)', fontWeight: 'bold' }}>
                  <td className="text-right">মোট দায় ও মূলধন:</td>
                  <td className="text-right font-mono">{formatMoney(balanceSheetData.totalLiabilitiesAndEquity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderIncomeStatement = () => {
    if (!incomeStatementData) return null;
    return (
      <div className="card print-area" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="text-center mb-24 border-bottom pb-16">
          <h2 className="mb-8">আয়-ব্যয় বিবরণী (Income Statement)</h2>
          <p className="text-muted">তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
        </div>

        <table className="table mb-24">
          <thead>
            <tr>
              <th colSpan="2" className="text-left text-success" style={{ fontSize: '1.1rem' }}>আয় (Revenues)</th>
            </tr>
          </thead>
          <tbody>
            {incomeStatementData.revenues.map((item, idx) => (
              <tr key={idx}>
                <td className="text-left">{item.name}</td>
                <td className="text-right font-mono">{formatMoney(item.balance)}</td>
              </tr>
            ))}
            {incomeStatementData.revenues.length === 0 && (
              <tr><td colSpan="2" className="text-center text-muted">কোনো আয় নেই</td></tr>
            )}
            <tr style={{ backgroundColor: 'var(--surface-hover)', fontWeight: 'bold' }}>
              <td className="text-right">মোট আয়:</td>
              <td className="text-right font-mono text-success">{formatMoney(incomeStatementData.totalRevenue)}</td>
            </tr>
          </tbody>
        </table>

        <table className="table mb-24">
          <thead>
            <tr>
              <th colSpan="2" className="text-left text-danger" style={{ fontSize: '1.1rem' }}>ব্যয় (Expenses)</th>
            </tr>
          </thead>
          <tbody>
            {incomeStatementData.expenses.map((item, idx) => (
              <tr key={idx}>
                <td className="text-left">{item.name}</td>
                <td className="text-right font-mono">{formatMoney(item.balance)}</td>
              </tr>
            ))}
            {incomeStatementData.expenses.length === 0 && (
              <tr><td colSpan="2" className="text-center text-muted">কোনো ব্যয় নেই</td></tr>
            )}
            <tr style={{ backgroundColor: 'var(--surface-hover)', fontWeight: 'bold' }}>
              <td className="text-right">মোট ব্যয়:</td>
              <td className="text-right font-mono text-danger">{formatMoney(incomeStatementData.totalExpense)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex-between p-16" style={{ backgroundColor: incomeStatementData.netIncome >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: `1px solid ${incomeStatementData.netIncome >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
          <strong style={{ fontSize: '1.2rem' }}>নিট আয় (Net Income):</strong>
          <strong className="font-mono" style={{ fontSize: '1.2rem', color: incomeStatementData.netIncome >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatMoney(incomeStatementData.netIncome)}
          </strong>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header print-hidden">
        <div>
          <h1 className="page-title flex-center gap-8">
            <PieChart className="text-primary" size={28} />
            অ্যাকাউন্টিং রিপোর্টস (Core Accounting)
          </h1>
          <p className="page-subtitle">রেওয়ামিল, উদ্বৃত্তপত্র এবং আয়-ব্যয় বিবরণী</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost flex-center gap-8" onClick={exportToPDF}>
            <Download size={18} /> পিডিএফ
          </button>
          <button className="btn btn-primary flex-center gap-8" onClick={exportToExcel}>
            <TableIcon size={18} /> এক্সেল
          </button>
          <button className="btn btn-outline flex-center gap-8" onClick={() => window.print()}>
            <Printer size={18} /> প্রিন্ট
          </button>
        </div>
      </div>

      <div className="tabs mb-24 print-hidden" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
        <button 
          className={`btn ${activeTab === 'trialBalance' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('trialBalance')}
        >
          <BookOpen size={16} className="mr-8" /> রেওয়ামিল
        </button>
        <button 
          className={`btn ${activeTab === 'balanceSheet' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('balanceSheet')}
        >
          <FileText size={16} className="mr-8" /> উদ্বৃত্তপত্র
        </button>
        <button 
          className={`btn ${activeTab === 'incomeStatement' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('incomeStatement')}
        >
          <PieChart size={16} className="mr-8" /> আয়-ব্যয় বিবরণী
        </button>
      </div>

      <div className="card mb-24 print-hidden">
        <form onSubmit={handleFilter} className="grid grid-4" style={{ gap: '16px', alignItems: 'end' }}>
          <div className="form-group">
            <label>শুরুর তারিখ</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>শেষ তারিখ</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <button type="submit" className="btn btn-primary w-full">ফিল্টার করুন</button>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-danger mb-24 print-hidden flex-center gap-8">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ height: '300px' }}>
          <Loader className="spin text-primary" size={40} />
        </div>
      ) : (
        <div className="reports-container">
          {activeTab === 'trialBalance' && renderTrialBalance()}
          {activeTab === 'balanceSheet' && renderBalanceSheet()}
          {activeTab === 'incomeStatement' && renderIncomeStatement()}
        </div>
      )}

      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          .page-container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          .card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>
    </div>
  );
}
