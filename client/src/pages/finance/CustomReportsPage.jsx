import { useState } from 'react';
import { Filter, Download, FileText, Table as TableIcon, Loader, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

export default function CustomReportsPage() {
  const [reportData, setReportData] = useState([]);
  const [reportType, setReportType] = useState('journal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [filterData, setFilterData] = useState({
    startDate: '',
    endDate: '',
    type: 'journal'
  });

  const handleFilter = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/finance/reports/custom', { params: filterData });
      if (res.data.success) {
        setReportData(res.data.data.data);
        setReportType(res.data.data.type);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'রিপোর্ট জেনারেট করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Custom Report - ${reportType.toUpperCase()}`, 14, 15);
    
    let head = [];
    let body = [];

    if (reportType === 'journal') {
      head = [['Date', 'Reference', 'Description']];
      body = reportData.map(item => [
        new Date(item.date).toLocaleDateString(), 
        item.reference, 
        item.description
      ]);
    } else if (reportType === 'invoices') {
      head = [['Date', 'Invoice No', 'Student', 'Payable', 'Status']];
      body = reportData.map(item => [
        new Date(item.createdAt).toLocaleDateString(), 
        item.invoiceNumber, 
        item.student?.studentId || '-', 
        item.payableTotal,
        item.status
      ]);
    } else if (reportType === 'payments') {
      head = [['Date', 'Payment No', 'Amount', 'Method', 'Status']];
      body = reportData.map(item => [
        new Date(item.createdAt).toLocaleDateString(), 
        item.paymentNumber, 
        item.amount,
        item.method,
        item.status
      ]);
    }

    doc.autoTable({ head, body, startY: 20 });
    doc.save(`custom_report_${reportType}.pdf`);
  };

  const exportToExcel = () => {
    let wsData = [];
    
    if (reportType === 'journal') {
      wsData = [['Date', 'Reference', 'Description']];
      reportData.forEach(item => wsData.push([
        new Date(item.date).toLocaleDateString(), 
        item.reference, 
        item.description
      ]));
    } else if (reportType === 'invoices') {
      wsData = [['Date', 'Invoice No', 'Student', 'Payable', 'Status']];
      reportData.forEach(item => wsData.push([
        new Date(item.createdAt).toLocaleDateString(), 
        item.invoiceNumber, 
        item.student?.studentId || '-', 
        item.payableTotal,
        item.status
      ]));
    } else if (reportType === 'payments') {
      wsData = [['Date', 'Payment No', 'Amount', 'Method', 'Status']];
      reportData.forEach(item => wsData.push([
        new Date(item.createdAt).toLocaleDateString(), 
        item.paymentNumber, 
        item.amount,
        item.method,
        item.status
      ]));
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `custom_report_${reportType}.xlsx`);
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Filter className="text-primary" size={28} />
            কাস্টম রিপোর্ট (Custom Reports)
          </h1>
          <p className="page-subtitle">ফিল্টার প্রয়োগ করে ডাইনামিক রিপোর্ট তৈরি করুন</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost flex-center gap-8" onClick={exportToPDF} disabled={reportData.length === 0}>
            <Download size={18} /> পিডিএফ
          </button>
          <button className="btn btn-primary flex-center gap-8" onClick={exportToExcel} disabled={reportData.length === 0}>
            <TableIcon size={18} /> এক্সেল
          </button>
        </div>
      </div>

      <div className="card mb-24">
        <form onSubmit={handleFilter} className="grid grid-4" style={{ gap: '16px', alignItems: 'end' }}>
          <div className="form-group">
            <label>রিপোর্টের ধরন</label>
            <select className="input" value={filterData.type} onChange={e => setFilterData({...filterData, type: e.target.value})}>
              <option value="journal">জার্নাল এন্ট্রি (Journal)</option>
              <option value="invoices">ইনভয়েস (Invoices)</option>
              <option value="payments">পেমেন্ট (Payments)</option>
              <option value="expenses">খরচ/ভাউচার (Expenses)</option>
            </select>
          </div>
          <div className="form-group">
            <label>শুরুর তারিখ</label>
            <input type="date" className="input" value={filterData.startDate} onChange={e => setFilterData({...filterData, startDate: e.target.value})} />
          </div>
          <div className="form-group">
            <label>শেষ তারিখ</label>
            <input type="date" className="input" value={filterData.endDate} onChange={e => setFilterData({...filterData, endDate: e.target.value})} />
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary w-full flex-center gap-8">
              <FileText size={18} /> রিপোর্ট দেখুন
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-danger mb-24 flex-center gap-8">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ height: '300px' }}>
          <Loader className="spin text-primary" size={40} />
        </div>
      ) : (
        <div className="card table-responsive">
          <table className="table">
            <thead>
              {reportType === 'journal' && (
                <tr>
                  <th>তারিখ</th>
                  <th>রেফারেন্স</th>
                  <th>বিবরণ</th>
                </tr>
              )}
              {reportType === 'invoices' && (
                <tr>
                  <th>তারিখ</th>
                  <th>ইনভয়েস নং</th>
                  <th>শিক্ষার্থী আইডি</th>
                  <th className="text-right">মোট (৳)</th>
                  <th className="text-center">স্ট্যাটাস</th>
                </tr>
              )}
              {reportType === 'payments' && (
                <tr>
                  <th>তারিখ</th>
                  <th>পেমেন্ট নং</th>
                  <th className="text-right">পরিমাণ (৳)</th>
                  <th>মাধ্যম</th>
                  <th className="text-center">স্ট্যাটাস</th>
                </tr>
              )}
              {reportType === 'expenses' && (
                <tr>
                  <th>তারিখ</th>
                  <th>ভাউচার নং</th>
                  <th>খাত</th>
                  <th className="text-right">পরিমাণ (৳)</th>
                  <th className="text-center">স্ট্যাটাস</th>
                </tr>
              )}
            </thead>
            <tbody>
              {reportData.length > 0 ? (
                reportData.map((item, idx) => (
                  <tr key={idx}>
                    {reportType === 'journal' && (
                      <>
                        <td>{new Date(item.date).toLocaleDateString()}</td>
                        <td>{item.reference}</td>
                        <td>{item.description}</td>
                      </>
                    )}
                    {reportType === 'invoices' && (
                      <>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="font-mono">{item.invoiceNumber}</td>
                        <td>{item.student?.studentId || '—'}</td>
                        <td className="text-right font-mono font-bold">৳{item.payableTotal?.toLocaleString()}</td>
                        <td className="text-center">
                          <span className={`badge badge-${item.status === 'paid' ? 'success' : 'warning'}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {reportType === 'payments' && (
                      <>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="font-mono">{item.paymentNumber}</td>
                        <td className="text-right font-mono font-bold">৳{item.amount?.toLocaleString()}</td>
                        <td>{item.method}</td>
                        <td className="text-center">
                          <span className={`badge badge-${item.status === 'success' ? 'success' : 'primary'}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {reportType === 'expenses' && (
                      <>
                        <td>{new Date(item.date).toLocaleDateString()}</td>
                        <td className="font-mono">{item.voucherNumber}</td>
                        <td>{item.category?.name || '—'}</td>
                        <td className="text-right font-mono font-bold">৳{item.amount?.toLocaleString()}</td>
                        <td className="text-center">
                          <span className={`badge badge-${item.status === 'approved' ? 'success' : 'warning'}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-24 text-muted">কোনো ডেটা পাওয়া যায়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
