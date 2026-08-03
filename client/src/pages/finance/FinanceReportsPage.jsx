import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, TrendingDown, CreditCard, DollarSign, Loader, Printer } from 'lucide-react';
import api from '../../api/axios';

export default function FinanceReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get('/reports/finance');
        if (res.data.success) {
          setReport(res.data.data);
        }
      } catch (err) {
        setError('রিপোর্ট লোড করতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-container flex-center" style={{ height: '70vh' }}>
        <Loader className="spin" size={40} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="page-container flex-center" style={{ height: '70vh' }}>
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header print-hidden">
        <div>
          <h1 className="page-title flex-center gap-8">
            <BarChart2 className="text-primary" size={28} />
            আর্থিক রিপোর্ট (Financial Reports)
          </h1>
          <p className="page-subtitle">আয়, ব্যয়, উদ্বৃত্ত এবং বকেয়া রিপোর্ট</p>
        </div>
        <button className="btn btn-outline flex-center gap-8" onClick={handlePrint}>
          <Printer size={18} /> প্রিন্ট করুন
        </button>
      </div>

      <div className="print-only mb-24 text-center">
        <h2>আর্থিক রিপোর্ট</h2>
        <p>তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
      </div>

      {/* Daily, Monthly, Yearly Comparison */}
      <h3 className="mb-16">সারসংক্ষেপ (আয় ও ব্যয়)</h3>
      <div className="grid grid-3 mb-24">
        <div className="card">
          <h4 className="border-bottom pb-8 mb-16">দৈনিক (Today)</h4>
          <div className="flex-between mb-8">
            <span className="text-success flex-center gap-4"><TrendingUp size={16}/> আয়:</span>
            <strong className="font-mono">৳{report.daily.income.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex-between mb-8">
            <span className="text-danger flex-center gap-4"><TrendingDown size={16}/> ব্যয়:</span>
            <strong className="font-mono">৳{report.daily.expense.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex-between border-top pt-8 mt-8">
            <span className="font-bold">উদ্বৃত্ত/ঘাটতি:</span>
            <strong className="font-mono">৳{report.daily.surplus.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div className="card">
          <h4 className="border-bottom pb-8 mb-16">মাসিক (This Month)</h4>
          <div className="flex-between mb-8">
            <span className="text-success flex-center gap-4"><TrendingUp size={16}/> আয়:</span>
            <strong className="font-mono">৳{report.monthly.income.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex-between mb-8">
            <span className="text-danger flex-center gap-4"><TrendingDown size={16}/> ব্যয়:</span>
            <strong className="font-mono">৳{report.monthly.expense.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex-between border-top pt-8 mt-8">
            <span className="font-bold">উদ্বৃত্ত/ঘাটতি:</span>
            <strong className="font-mono">৳{report.monthly.surplus.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div className="card">
          <h4 className="border-bottom pb-8 mb-16">বার্ষিক (This Year)</h4>
          <div className="flex-between mb-8">
            <span className="text-success flex-center gap-4"><TrendingUp size={16}/> আয়:</span>
            <strong className="font-mono">৳{report.yearly.income.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex-between mb-8">
            <span className="text-danger flex-center gap-4"><TrendingDown size={16}/> ব্যয়:</span>
            <strong className="font-mono">৳{report.yearly.expense.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex-between border-top pt-8 mt-8">
            <span className="font-bold">উদ্বৃত্ত/ঘাটতি:</span>
            <strong className="font-mono">৳{report.yearly.surplus.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-2 mb-24">
        <div className="card">
          <h3 className="mb-16 border-bottom pb-8 flex-center gap-8">
            <DollarSign size={20} className="text-primary"/> 
            খাতভিত্তিক ব্যয় (Category-wise Expense)
          </h3>
          <table className="table">
            <thead>
              <tr>
                <th>খাত (Category)</th>
                <th style={{textAlign: 'right'}}>পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              {report.categoryExpense.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.category}</td>
                  <td style={{textAlign: 'right'}} className="font-mono">৳{item.amount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {report.categoryExpense.length === 0 && (
                <tr>
                  <td colSpan="2" className="text-center text-muted">কোনো ডেটা নেই</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div className="stats-card mb-16" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div className="stats-card-label text-danger font-medium">শিক্ষার্থীদের মোট বকেয়া (Total Dues)</div>
            <div className="stats-card-value font-mono">৳{report.totalDues.toLocaleString('en-IN')}</div>
            <div className="stats-card-trend"><CreditCard size={12} /> আনপেইড ইনভয়েসসমূহ</div>
          </div>

          <div className="stats-card mb-24" style={{ borderLeft: '4px solid var(--success)' }}>
            <div className="stats-card-label text-success font-medium">মোট দান/অনুদান (Donations)</div>
            <div className="stats-card-value font-mono">৳{report.totalDonation.toLocaleString('en-IN')}</div>
            <div className="stats-card-trend"><TrendingUp size={12} /> অনুমোদিত আয়ের খাত</div>
          </div>
          
          <div className="card mb-24">
            <h3 className="mb-16 border-bottom pb-8 flex-center gap-8">
              <BarChart2 size={20} className="text-primary"/> 
              শিক্ষক বেতন রিপোর্ট (Teacher Salary)
            </h3>
            <table className="table">
              <thead>
                <tr>
                  <th>শিক্ষক/কর্মচারী</th>
                  <th style={{textAlign: 'right'}}>প্রদানকৃত (৳)</th>
                </tr>
              </thead>
              <tbody>
                {report.teacherSalary?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.teacher}</td>
                    <td style={{textAlign: 'right'}} className="font-mono text-danger">৳{item.totalPaid.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {(!report.teacherSalary || report.teacherSalary.length === 0) && (
                  <tr>
                    <td colSpan="2" className="text-center text-muted">কোনো ডেটা নেই</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card mb-24">
        <h3 className="mb-16 border-bottom pb-8 flex-center gap-8">
          <CreditCard size={20} className="text-primary"/> 
          শীর্ষ জমাদানকারী শিক্ষার্থী (Top Paying Students)
        </h3>
        <table className="table">
          <thead>
            <tr>
              <th>শিক্ষার্থীর নাম</th>
              <th style={{textAlign: 'right'}}>জমা পরিমাণ (৳)</th>
            </tr>
          </thead>
          <tbody>
            {report.studentWise?.map((item, idx) => (
              <tr key={idx}>
                <td>{item.student}</td>
                <td style={{textAlign: 'right'}} className="font-mono text-success">৳{item.totalPaid.toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {(!report.studentWise || report.studentWise.length === 0) && (
              <tr>
                <td colSpan="2" className="text-center text-muted">কোনো ডেটা নেই</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Print Signature Section */}
      <div className="print-only" style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ borderTop: '1px solid #000', paddingTop: '8px', width: '200px', textAlign: 'center' }}>হিসাবরক্ষক</div>
        <div style={{ borderTop: '1px solid #000', paddingTop: '8px', width: '200px', textAlign: 'center' }}>অধ্যক্ষ / সুপার</div>
      </div>
    </div>
  );
}
