import { useState } from 'react';
import { Database, Download, Upload, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function BackupRestorePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState(null);

  if (user?.userType !== 'super_admin') {
    return (
      <div className="page-container flex-center" style={{ height: '50vh' }}>
        <h2 className="text-danger">Access Denied: Only Super Admin can access backup tools.</h2>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const res = await api.get('/finance/backup', { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('ব্যাকআপ ফাইল সফলভাবে ডাউনলোড করা হয়েছে।');
    } catch (err) {
      setError('ব্যাকআপ ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e) => {
    e.preventDefault();
    if (!file) return setError('দয়া করে একটি JSON ব্যাকআপ ফাইল নির্বাচন করুন।');
    
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি ব্যাকআপ রিস্টোর করতে চান? এটি বর্তমান ডেটা ওভাররাইট করতে পারে!')) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          const res = await api.post('/finance/restore', jsonData);
          if (res.data.success) {
            setSuccess('ডেটা সফলভাবে রিস্টোর করা হয়েছে!');
            setFile(null);
          }
        } catch (parseError) {
          setError('ফাইলটি সঠিক JSON ফরম্যাটে নেই।');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
      
    } catch (err) {
      setError(err.response?.data?.message || 'রিস্টোর করতে সমস্যা হয়েছে।');
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex-center gap-8">
            <Database className="text-primary" size={28} />
            ব্যাকআপ ও রিস্টোর (Backup & Restore)
          </h1>
          <p className="page-subtitle">প্রতিষ্ঠানের আর্থিক ডেটা সংরক্ষণ এবং পুনরুদ্ধার করুন</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-24 flex-center gap-8">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-24 flex-center gap-8">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      <div className="grid grid-2" style={{ gap: '24px', alignItems: 'start' }}>
        <div className="card">
          <h3 className="mb-16 border-bottom pb-8 flex-center gap-8">
            <Download className="text-success" /> ডেটা ব্যাকআপ নিন
          </h3>
          <p className="text-muted mb-16">
            এই অপশনটি ব্যবহার করে আপনি আপনার প্রতিষ্ঠানের সকল আর্থিক ট্রানজেকশন, জার্নাল এন্ট্রি এবং ভাউচারের সম্পূর্ণ ডেটাবেস JSON ফাইল হিসেবে ডাউনলোড করতে পারবেন।
          </p>
          <button 
            className="btn btn-success flex-center gap-8" 
            onClick={handleDownload} 
            disabled={loading}
          >
            {loading ? <Loader className="spin" size={18} /> : <Download size={18} />}
            ব্যাকআপ ডাউনলোড করুন
          </button>
        </div>

        <div className="card">
          <h3 className="mb-16 border-bottom pb-8 flex-center gap-8">
            <Upload className="text-danger" /> ডেটা রিস্টোর করুন
          </h3>
          <p className="text-muted mb-16">
            পূর্বে ডাউনলোড করা JSON ব্যাকআপ ফাইল আপলোড করে ডেটা রিস্টোর করুন। (সতর্কতা: রিস্টোর করলে বর্তমান ডেটা ওভাররাইট হতে পারে!)
          </p>
          <form onSubmit={handleRestore}>
            <div className="form-group mb-16">
              <input 
                type="file" 
                className="input" 
                accept=".json"
                onChange={(e) => setFile(e.target.files[0])}
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-danger flex-center gap-8" 
              disabled={loading || !file}
            >
              {loading ? <Loader className="spin" size={18} /> : <Upload size={18} />}
              রিস্টোর শুরু করুন
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
