import { useState, useEffect } from 'react';
import { Plus, Bell } from 'lucide-react';
import api from '../../api/axios';

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await api.get('/notices');
        if (res.data.success) {
          setNotices(res.data.data.notices);
        }
      } catch (error) {
        console.error('Error fetching notices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">নোটিশ বোর্ড</h1>
          <p className="page-subtitle">মাদ্রাসার সমস্ত ঘোষণা এবং নোটিশ</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> নতুন নোটিশ
        </button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="spinner"></div>
        </div>
      ) : notices.length === 0 ? (
        <div className="card empty-state">
          <Bell size={48} style={{ opacity: 0.3 }} />
          <div className="empty-state-title mt-16">কোনো নোটিশ পাওয়া যায়নি</div>
        </div>
      ) : (
        <div className="grid grid-2">
          {notices.map((notice) => (
            <div key={notice._id} className="card animate-slide-up" style={{ borderLeft: `4px solid ${notice.priority === 'urgent' ? 'var(--danger)' : notice.priority === 'high' ? 'var(--warning)' : 'var(--primary)'}` }}>
              <div className="flex-between mb-16">
                <span className="text-sm text-muted">
                  {new Date(notice.publishedAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className={`badge badge-active`}>
                  {notice.audience.includes('all') ? 'সকলের জন্য' : notice.audience.join(', ')}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>{notice.title}</h3>
              <p className="text-muted" style={{ lineHeight: '1.6' }}>
                {notice.content.length > 150 ? notice.content.substring(0, 150) + '...' : notice.content}
              </p>
              
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm">বিস্তারিত পড়ুন</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
