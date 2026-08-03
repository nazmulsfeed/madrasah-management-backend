import { useState, useEffect } from 'react';
import { 
  Library as LibraryIcon, Plus, Search, BookOpen, Edit, Trash2, 
  CheckCircle, AlertCircle, X, Loader, BookMarked, Hash 
} from 'lucide-react';
import api from '../../api/axios';

const CATEGORIES = ['তাফসীর', 'হাদিস', 'ফিকহ', 'আরবি ব্যাকরণ', 'আরবি ভাষা', 'সীরাত', 'অন্যান্য'];

const CATEGORY_COLORS = {
  'তাফসীর': { bg: 'rgba(20, 184, 166, 0.12)', text: '#0d9488', border: 'rgba(20, 184, 166, 0.2)' },
  'হাদিস': { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.2)' },
  'ফিকহ': { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.2)' },
  'আরবি ব্যাকরণ': { bg: 'rgba(139, 92, 246, 0.12)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.2)' },
  'আরবি ভাষা': { bg: 'rgba(236, 72, 153, 0.12)', text: '#db2777', border: 'rgba(236, 72, 153, 0.2)' },
  'সীরাত': { bg: 'rgba(34, 197, 94, 0.12)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.2)' },
  'অন্যান্য': { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569', border: 'rgba(100, 116, 139, 0.2)' }
};

export default function LibraryPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [toast, setToast] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingBookId, setEditingBookId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'অন্যান্য',
    copies: 1,
    available: 1
  });

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch books
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/books');
      if (res.data.success) {
        setBooks(res.data.data.books || []);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
      setToast({ type: 'error', message: 'বইয়ের তালিকা লোড করতে সমস্যা হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Filter books
  const filteredBooks = books.filter((book) => {
    const matchesSearch = 
      book.title.toLowerCase().includes(search.toLowerCase()) || 
      (book.author && book.author.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Open modal for Create
  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      title: '',
      author: '',
      category: 'অন্যান্য',
      copies: 1,
      available: 1
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (book) => {
    setModalMode('edit');
    setEditingBookId(book._id);
    setFormData({
      title: book.title,
      author: book.author || '',
      category: book.category || 'অন্যান্য',
      copies: book.copies,
      available: book.available
    });
    setIsModalOpen(true);
  };

  // Delete Book
  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বইটি ডিলিট করতে চান?')) return;
    try {
      const res = await api.delete(`/books/${bookId}`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'বইটি সফলভাবে মুছে ফেলা হয়েছে!' });
        fetchBooks();
      }
    } catch (err) {
      console.error('Error deleting book:', err);
      setToast({ type: 'error', message: 'বইটি মুছতে সমস্যা হয়েছে' });
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setToast({ type: 'error', message: 'বইয়ের শিরোনাম আবশ্যক' });
      return;
    }
    if (formData.copies < 0 || formData.available < 0) {
      setToast({ type: 'error', message: 'কপি সংখ্যা নেতিবাচক (negative) হতে পারে না' });
      return;
    }
    if (Number(formData.available) > Number(formData.copies)) {
      setToast({ type: 'error', message: 'উপলব্ধ কপি মোট কপির চেয়ে বেশি হতে পারে না' });
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const res = await api.post('/books', formData);
        if (res.data.success) {
          setToast({ type: 'success', message: 'নতুন বই সফলভাবে যুক্ত হয়েছে!' });
          setIsModalOpen(false);
          fetchBooks();
        }
      } else {
        const res = await api.patch(`/books/${editingBookId}`, formData);
        if (res.data.success) {
          setToast({ type: 'success', message: 'বইয়ের তথ্য সফলভাবে আপডেট হয়েছে!' });
          setIsModalOpen(false);
          fetchBooks();
        }
      }
    } catch (err) {
      console.error('Error saving book:', err);
      setToast({ type: 'error', message: 'তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  const getBadgeStyle = (cat) => {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS['অন্যান্য'];
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '14px 22px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">লাইব্রেরি ও বই ব্যবস্থাপনা</h1>
          <p className="page-subtitle">মাদ্রাসার সকল বইপত্রের তালিকা ও কপি ট্র্যাকিং সিস্টেম</p>
        </div>
        <button className="btn btn-primary btn-icon" onClick={handleOpenCreate}>
          <Plus size={18} /> নতুন বই যুক্ত করুন
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-24" style={{ padding: '18px 24px' }}>
        <div className="flex gap-16" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="বইয়ের নাম অথবা লেখক দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '44px', borderRadius: '10px' }}
            />
          </div>
          <select 
            className="form-input" 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: 'auto', minWidth: '180px', borderRadius: '10px' }}
          >
            <option value="">সকল ক্যাটাগরি</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Books Display */}
      {loading ? (
        <div className="flex-center" style={{ minHeight: '40vh', flexDirection: 'column', gap: '16px' }}>
          <div className="spinner" />
          <p className="text-muted">লাইব্রেরি লোড হচ্ছে...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="card empty-state" style={{ minHeight: '35vh' }}>
          <BookMarked size={48} style={{ opacity: 0.25, color: 'var(--primary)' }} />
          <div className="empty-state-title mt-16" style={{ fontSize: '1.1rem', fontWeight: 600 }}>কোনো বই পাওয়া যায়নি</div>
          <p className="text-muted text-sm mt-8">অনুগ্রহ করে ভিন্ন কোনো সার্চ কি-ওয়ার্ড ব্যবহার করুন অথবা নতুন বই যুক্ত করুন।</p>
          <button className="btn btn-secondary mt-16" onClick={handleOpenCreate}>নতুন বই যুক্ত করুন</button>
        </div>
      ) : (
        <div className="grid grid-3">
          {filteredBooks.map((book) => {
            const catStyle = getBadgeStyle(book.category);
            return (
              <div key={book._id} className="card animate-slide-up hover-lift" style={{ 
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                padding: '24px', position: 'relative', border: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ 
                      width: '48px', height: '62px', borderRadius: '8px', 
                      background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(20, 184, 166, 0.2)'
                    }}>
                      <BookOpen size={20} style={{ color: '#fff' }} />
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-8">
                      <button 
                        onClick={() => handleOpenEdit(book)}
                        className="btn-icon" 
                        title="সম্পাদনা করুন"
                        style={{ 
                          width: '32px', height: '32px', borderRadius: '8px', background: 'var(--card-bg)',
                          border: '1px solid var(--border-color)', color: 'var(--text-secondary)'
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteBook(book._id)}
                        className="btn-icon text-danger" 
                        title="মুছে ফেলুন"
                        style={{ 
                          width: '32px', height: '32px', borderRadius: '8px', background: 'var(--danger-bg)',
                          border: 'none', color: 'var(--danger)'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', lineHeight: 1.4 }}>{book.title}</h3>
                  <p className="text-sm text-muted mb-12" style={{ fontWeight: 500 }}>{book.author || 'অজানা লেখক'}</p>
                  
                  <span style={{ 
                    display: 'inline-block', fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', 
                    borderRadius: '6px', background: catStyle.bg, color: catStyle.text,
                    border: `1px solid ${catStyle.border}`, marginBottom: '16px'
                  }}>
                    {book.category}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Hash size={14} /> মোট: {book.copies} টি
                  </span>
                  <span className="text-sm" style={{ 
                    fontWeight: 600, 
                    color: book.available > 0 ? 'var(--success)' : 'var(--danger)',
                    background: book.available > 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    padding: '3px 8px', borderRadius: '6px'
                  }}>
                    {book.available > 0 ? `উপলব্ধ: ${book.available} টি` : 'বুকড / স্টকআউট'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Book Mutation Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '520px', padding: '32px', borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', position: 'relative'
          }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={22} style={{ color: 'var(--primary)' }} />
              {modalMode === 'create' ? 'নতুন বই যুক্ত করুন' : 'বইয়ের তথ্য সম্পাদন'}
            </h2>

            <form onSubmit={handleSubmit} className="flex-column gap-16">
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>বইয়ের শিরোনাম *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="যেমন: তাফসীরে ইবনে কাসীর (১ম খণ্ড)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>লেখক / সংকলক</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="যেমন: ইমাম ইবনে কাসীর"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>ক্যাটাগরি</label>
                <select
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>মোট সংখ্যা (Total Copies)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.copies}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      // Auto align available if creating or if copies changed
                      setFormData(prev => ({
                        ...prev,
                        copies: val,
                        available: modalMode === 'create' ? val : prev.available
                      }));
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>উপলব্ধ সংখ্যা (Available)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  বাতিল
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader className="animate-spin" size={16} /> : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.15) !important;
        }
      `}</style>
    </div>
  );
}
