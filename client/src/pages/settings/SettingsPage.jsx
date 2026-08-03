import { useState } from 'react';
import { 
  Building2, 
  Palette, 
  Shield, 
  Database, 
  Bell, 
  User as UserIcon,
  X
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../api/axios';

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, isLoading } = useAuthStore();
  const [activeSection, setActiveSection] = useState('profile');

  // Profile Form State
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });

  // Institution Form State
  const [instData, setInstData] = useState({
    name: user?.institution?.name || '',
    email: user?.institution?.email || '',
    phone: user?.institution?.phone || '',
    address: user?.institution?.address || '',
    website: user?.institution?.website || '',
    registrationNumber: user?.institution?.registrationNumber || '',
  });

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Modals visibility state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState(null);
  const [pendingRestoreInputRef, setPendingRestoreInputRef] = useState(null);

  // Modal Inputs State
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetPasswordChangeData, setResetPasswordChangeData] = useState({
    currentPassword: '',
    newPassword: '',
  });

  // Feedback Alerts State
  const [profileAlert, setProfileAlert] = useState(null);
  const [instAlert, setInstAlert] = useState(null);
  const [passwordAlert, setPasswordAlert] = useState(null);
  const [backupAlert, setBackupAlert] = useState(null);
  const [resetAlert, setResetAlert] = useState(null);

  const [isActionLoading, setIsActionLoading] = useState(false);

  const sections = [
    { key: 'profile', label: 'ব্যক্তিগত প্রোফাইল', icon: UserIcon },
    { key: 'institution', label: 'প্রতিষ্ঠান তথ্য', icon: Building2 },
    { key: 'appearance', label: 'ডিজাইন ও থিম', icon: Palette },
    { key: 'notifications', label: 'নোটিফিকেশন', icon: Bell },
    { key: 'security', label: 'নিরাপত্তা ও পাসওয়ার্ড', icon: Shield },
    { key: 'backup', label: 'ব্যাকআপ ও ডেটা', icon: Database },
  ];

  // Handle Profile Update Submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileAlert(null);

    if (!profileData.firstName.trim()) {
      setProfileAlert({ type: 'error', message: 'প্রথম নাম প্রদান করা আবশ্যক' });
      return;
    }

    const result = await updateProfile(profileData);
    if (result.success) {
      setProfileAlert({ type: 'success', message: result.message });
    } else {
      setProfileAlert({ type: 'error', message: result.message });
    }
  };

  // Handle Institution Update Submit
  const handleInstSubmit = async (e) => {
    e.preventDefault();
    setInstAlert(null);
    setIsActionLoading(true);

    if (!instData.name.trim()) {
      setInstAlert({ type: 'error', message: 'প্রতিষ্ঠানের নাম প্রদান করা আবশ্যক' });
      setIsActionLoading(false);
      return;
    }

    try {
      const res = await api.patch('/users/institution/update', instData);
      setInstAlert({ type: 'success', message: 'প্রতিষ্ঠানের তথ্য সফলভাবে আপডেট করা হয়েছে' });
      
      // Update local authStore state
      const currentUser = useAuthStore.getState().user;
      const updatedUser = { 
        ...currentUser, 
        institution: currentUser.institution && typeof currentUser.institution === 'object'
          ? { ...currentUser.institution, ...res.data.data.institution } 
          : res.data.data.institution
      };
      useAuthStore.setState({ user: updatedUser });
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      setInstAlert({ type: 'error', message: err.response?.data?.message || 'প্রতিষ্ঠানের তথ্য আপডেট ব্যর্থ হয়েছে' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Password Change Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordAlert(null);

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'সবগুলো পাসওয়ার্ড ফিল্ড পূরণ করুন' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordAlert({ type: 'error', message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি' });
      return;
    }

    const result = await updatePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });

    if (result.success) {
      setPasswordAlert({ type: 'success', message: result.message });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } else {
      setPasswordAlert({ type: 'error', message: result.message });
    }
  };

  // Handle Database Reset Password Change Submit (Modal)
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetAlert(null);

    if (!resetPasswordChangeData.currentPassword || !resetPasswordChangeData.newPassword) {
      setResetAlert({ type: 'error', message: 'বর্তমান এবং নতুন রিসেট পাসওয়ার্ড উভয়ই প্রদান করুন' });
      return;
    }

    setIsActionLoading(true);
    try {
      await api.put('/users/db/reset-password', {
        currentPassword: resetPasswordChangeData.currentPassword,
        newPassword: resetPasswordChangeData.newPassword
      });
      setResetAlert({ type: 'success', message: 'ডাটাবেজ রিসেট পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে' });
      setResetPasswordChangeData({ currentPassword: '', newPassword: '' });
      setIsResetPasswordModalOpen(false);
    } catch (err) {
      setResetAlert({ type: 'error', message: err.response?.data?.message || 'রিসেট পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle DB Backup
  const handleBackup = async () => {
    setBackupAlert(null);
    setIsActionLoading(true);
    try {
      const response = await api.get('/users/db/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'madrasah_backup.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setBackupAlert({ type: 'success', message: 'ডাটাবেজ ব্যাকআপ সফলভাবে ডাউনলোড করা হয়েছে' });
    } catch (err) {
      setBackupAlert({ type: 'error', message: 'ডাটাবেজ ব্যাকআপ ব্যর্থ হয়েছে' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle DB Restore — ফাইল সিলেক্ট হলে কাস্টম কনফার্ম মডাল দেখাই
  const handleRestore = (e) => {
    const inputElement = e.target;
    const file = inputElement.files[0];
    if (!file) return;
    setPendingRestoreFile(file);
    setPendingRestoreInputRef(inputElement);
    setIsRestoreConfirmOpen(true);
  };

  // রিস্টোর কনফার্ম হলে এই ফাংশন চলবে
  const doRestore = async () => {
    setIsRestoreConfirmOpen(false);
    const file = pendingRestoreFile;
    const inputElement = pendingRestoreInputRef;
    if (!file) return;

    setBackupAlert(null);
    setIsActionLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        const res = await api.post('/users/db/restore', backupData);
        if (res.data.success) {
          setBackupAlert({ type: 'success', message: 'ডাটাবেজ ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে!' });
        } else {
          setBackupAlert({ type: 'error', message: res.data.message || 'রিস্টোর ব্যর্থ হয়েছে' });
        }
      } catch (err) {
        console.error('Restore error:', err);
        const errorMsg = err.response?.data?.message || err.message || 'অজানা ত্রুটি';
        setBackupAlert({ type: 'error', message: `রিস্টোর ব্যর্থ হয়েছে: ${errorMsg}` });
      } finally {
        setIsActionLoading(false);
        if (inputElement) inputElement.value = '';
        setPendingRestoreFile(null);
        setPendingRestoreInputRef(null);
      }
    };

    reader.onerror = () => {
      setBackupAlert({ type: 'error', message: 'ফাইল পড়তে সমস্যা হয়েছে' });
      setIsActionLoading(false);
      if (inputElement) inputElement.value = '';
    };

    reader.readAsText(file);
  };

  // রিস্টোর বাতিল
  const cancelRestore = () => {
    setIsRestoreConfirmOpen(false);
    if (pendingRestoreInputRef) pendingRestoreInputRef.value = '';
    setPendingRestoreFile(null);
    setPendingRestoreInputRef(null);
  };


  // Handle DB Reset (Modal Submit)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetConfirmPassword.trim()) {
      alert('রিসেট পাসওয়ার্ড দেওয়া আবশ্যক!');
      return;
    }

    setResetAlert(null);
    setIsActionLoading(true);
    try {
      await api.post('/users/db/reset', { password: resetConfirmPassword });
      setResetAlert({ type: 'success', message: 'ডাটাবেজ সফলভাবে রিসেট এবং নতুন সুপার এডমিন সীড করা হয়েছে। পুনরায় লগইন করুন।' });
      setIsResetModalOpen(false);
      setResetConfirmPassword('');
      setTimeout(() => {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      setResetAlert({ type: 'error', message: err.response?.data?.message || 'ডাটাবেজ রিসেট ব্যর্থ হয়েছে' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const isSuperAdmin = user?.userType === 'super_admin';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">সেটিংস</h1>
          <p className="page-subtitle">সিস্টেম কনফিগারেশন, প্রোফাইল সেটিংস এবং প্রাতিষ্ঠানিক তথ্য</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        {/* Settings Navigation */}
        <div className="card" style={{ padding: '8px' }}>
          {sections.map((sec) => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                background: activeSection === sec.key ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: activeSection === sec.key ? 'var(--primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeSection === sec.key ? 600 : 400,
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <sec.icon size={18} />
              {sec.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="card">
          
          {/* 1. PERSONAL PROFILE SECTION */}
          {activeSection === 'profile' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>ব্যক্তিগত প্রোফাইল তথ্য</h2>
              
              {profileAlert && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  backgroundColor: profileAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: profileAlert.type === 'success' ? '#10b981' : '#ef4444',
                  border: profileAlert.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                  fontSize: '0.9rem'
                }}>
                  {profileAlert.message}
                </div>
              )}

              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-2" style={{ gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">ব্যবহারকারীর নাম (Username)</label>
                    <input 
                      type="text" 
                      className="form-input text-muted" 
                      value={user?.username || ''} 
                      disabled 
                      style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ইমেইল এড্রেস</label>
                    <input 
                      type="text" 
                      className="form-input text-muted" 
                      value={user?.email || ''} 
                      disabled 
                      style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">প্রথম নাম (First Name)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={profileData.firstName} 
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      placeholder="প্রথম নাম লিখুন..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">শেষ নাম (Last Name)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={profileData.lastName} 
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      placeholder="শেষ নাম লিখুন..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ফোন নম্বর</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={profileData.phone} 
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="ফোন নম্বর লিখুন..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">পদবি / রোল</label>
                    <input 
                      type="text" 
                      className="form-input text-muted" 
                      value={useAuthStore.getState().getUserTypeLabel()} 
                      disabled 
                      style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. INSTITUTION INFORMATION (READ-WRITE FOR ADMINS) */}
          {activeSection === 'institution' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>প্রতিষ্ঠান তথ্য</h2>

              {instAlert && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  backgroundColor: instAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: instAlert.type === 'success' ? '#10b981' : '#ef4444',
                  border: instAlert.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                  fontSize: '0.9rem'
                }}>
                  {instAlert.message}
                </div>
              )}

              <form onSubmit={handleInstSubmit}>
                <div className="grid grid-2" style={{ gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">প্রতিষ্ঠানের নাম</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={instData.name} 
                      onChange={(e) => setInstData({ ...instData, name: e.target.value })}
                      placeholder="প্রতিষ্ঠানের নাম..."
                      disabled={!isSuperAdmin && user?.userType !== 'admin'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">রেজিস্ট্রেশন নম্বর (EIIN/Reg No)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={instData.registrationNumber} 
                      onChange={(e) => setInstData({ ...instData, registrationNumber: e.target.value })}
                      placeholder="রেজিস্ট্রেশন নম্বর..."
                      disabled={!isSuperAdmin && user?.userType !== 'admin'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ইমেইল</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={instData.email} 
                      onChange={(e) => setInstData({ ...instData, email: e.target.value })}
                      placeholder="ইমেইল..."
                      disabled={!isSuperAdmin && user?.userType !== 'admin'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ফোন নম্বর</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={instData.phone} 
                      onChange={(e) => setInstData({ ...instData, phone: e.target.value })}
                      placeholder="ফোন নম্বর..."
                      disabled={!isSuperAdmin && user?.userType !== 'admin'}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">ওয়েবসাইট</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={instData.website} 
                      onChange={(e) => setInstData({ ...instData, website: e.target.value })}
                      placeholder="ওয়েবসাইট লিঙ্ক..."
                      disabled={!isSuperAdmin && user?.userType !== 'admin'}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">ঠিকানা</label>
                    <textarea 
                      className="form-input" 
                      rows="3" 
                      value={instData.address} 
                      onChange={(e) => setInstData({ ...instData, address: e.target.value })}
                      placeholder="ঠিকানা..."
                      disabled={!isSuperAdmin && user?.userType !== 'admin'}
                    ></textarea>
                  </div>
                </div>
                {(isSuperAdmin || user?.userType === 'admin') && (
                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* 3. APPEARANCE DESIGN & THEME */}
          {activeSection === 'appearance' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>ডিজাইন ও থিম</h2>
              <div className="form-group">
                <label className="form-label">থিম</label>
                <div className="flex gap-16">
                  <div style={{ padding: '20px 30px', borderRadius: '12px', background: '#0f172a', border: '2px solid var(--primary)', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>ডার্ক</div>
                    <div style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>বর্তমান</div>
                  </div>
                  <div style={{ padding: '20px 30px', borderRadius: '12px', background: '#f8fafc', border: '2px solid transparent', cursor: 'pointer', textAlign: 'center', opacity: 0.5 }}>
                    <div style={{ color: '#1e293b', fontWeight: 600 }}>লাইট</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>শীঘ্রই আসছে</div>
                  </div>
                </div>
              </div>
              <div className="form-group mt-24">
                <label className="form-label">প্রাইমারি কালার</label>
                <div className="flex gap-12">
                  {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'].map((color) => (
                    <div
                      key={color}
                      style={{
                        width: '40px', height: '40px', borderRadius: '50%', background: color,
                        cursor: 'pointer', border: color === '#10b981' ? '3px solid #fff' : '3px solid transparent',
                        boxShadow: color === '#10b981' ? `0 0 0 2px ${color}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>নোটিফিকেশন সেটিংস</h2>
              {[
                { label: 'নতুন ভর্তির আবেদন', desc: 'যখন নতুন ছাত্র ভর্তির আবেদন আসবে' },
                { label: 'পেমেন্ট নোটিফিকেশন', desc: 'যখন ফি গ্রহণ বা বকেয়া হবে' },
                { label: 'উপস্থিতি এলার্ট', desc: 'যখন কোনো ছাত্র ৩ দিনের বেশি অনুপস্থিত থাকবে' },
                { label: 'পরীক্ষার ফলাফল', desc: 'পরীক্ষার ফলাফল প্রকাশিত হলে' },
              ].map((item, i) => (
                <div key={i} className="flex-between" style={{ padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-sm text-muted mt-4">{item.desc}</div>
                  </div>
                  <label style={{ position: 'relative', width: '44px', height: '24px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ display: 'none' }} />
                    <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: 'var(--primary)', position: 'relative', transition: 'background 0.3s' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', right: '3px', transition: 'all 0.3s' }}></div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* 5. SECURITY & PASSWORD CHANGE */}
          {activeSection === 'security' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>নিরাপত্তা ও পাসওয়ার্ড পরিবর্তন</h2>
              
              {passwordAlert && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  backgroundColor: passwordAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: passwordAlert.type === 'success' ? '#10b981' : '#ef4444',
                  border: passwordAlert.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                  fontSize: '0.9rem'
                }}>
                  {passwordAlert.message}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label className="form-label">বর্তমান পাসওয়ার্ড</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="বর্তমান পাসওয়ার্ড লিখুন..." 
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="grid grid-2" style={{ gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">নতুন পাসওয়ার্ড</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="নতুন পাসওয়ার্ড..." 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">পাসওয়ার্ড নিশ্চিত করুন</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="আবার লিখুন..." 
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 6. BACKUP & SYSTEM DATA (ONLY SUPER ADMIN) */}
          {activeSection === 'backup' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>ব্যাকআপ ও ডেটা</h2>

              {backupAlert && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  backgroundColor: backupAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: backupAlert.type === 'success' ? '#10b981' : '#ef4444',
                  border: backupAlert.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                  fontSize: '0.9rem'
                }}>
                  {backupAlert.message}
                </div>
              )}

              {resetAlert && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  backgroundColor: resetAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: resetAlert.type === 'success' ? '#10b981' : '#ef4444',
                  border: resetAlert.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                  fontSize: '0.9rem'
                }}>
                  {resetAlert.message}
                </div>
              )}
              
              <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: '20px' }}>
                <div className="flex-between">
                  <div>
                    <div className="font-semibold">সম্পূর্ণ ডাটাবেজ ব্যাকআপ</div>
                    <div className="text-sm text-muted mt-4">ডাটাবেজের সব কালেকশন একটি JSON ফাইল আকারে ডাউনলোড করুন।</div>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={handleBackup}
                    disabled={isActionLoading || !isSuperAdmin}
                    style={{ opacity: !isSuperAdmin ? 0.5 : 1, cursor: !isSuperAdmin ? 'not-allowed' : 'pointer' }}
                  >
                    {isActionLoading ? 'ডাউনলোড হচ্ছে...' : 'ব্যাকআপ ডাউনলোড করুন'}
                  </button>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: '20px' }}>
                <div className="flex-between">
                  <div>
                    <div className="font-semibold">ডাটাবেজ রিস্টোর করুন</div>
                    <div className="text-sm text-muted mt-4">পূর্বে ডাউনলোড করা JSON ব্যাকআপ ফাইলটি আপলোড করে ডাটাবেজ রিস্টোর করুন।</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleRestore}
                      onClick={(e) => { e.target.value = null }}
                      disabled={isActionLoading || !isSuperAdmin}
                      style={{ display: 'none' }}
                      id="db-restore-file-input"
                    />
                    <label 
                      htmlFor="db-restore-file-input"
                      className="btn btn-secondary"
                      style={{ 
                        opacity: !isSuperAdmin ? 0.5 : 1, 
                        cursor: !isSuperAdmin || isActionLoading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 0
                      }}
                    >
                      {isActionLoading ? 'রিস্টোর হচ্ছে...' : 'রিস্টোর করুন'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: '20px' }}>
                <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="font-semibold" style={{ color: 'var(--danger)' }}>ডাটা রিসেট</div>
                    <div className="text-sm text-muted mt-4">সতর্কতা: এটি সম্পূর্ণ সিস্টেম ডেটা মুছে নতুন করে সুপার এডমিন রিলোড করবে। এই অপারেশন অপরিবর্তনীয়।</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button 
                      className="btn" 
                      onClick={() => setIsResetModalOpen(true)}
                      disabled={isActionLoading || !isSuperAdmin}
                      style={{ 
                        background: 'var(--danger)', 
                        color: '#fff', 
                        opacity: !isSuperAdmin ? 0.5 : 1, 
                        cursor: !isSuperAdmin ? 'not-allowed' : 'pointer' 
                      }}
                    >
                      রিসেট করুন
                    </button>
                    {isSuperAdmin && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setIsResetPasswordModalOpen(true)}
                        disabled={isActionLoading}
                      >
                        রিসেট পাসওয়ার্ড পরিবর্তন
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CONFIRM RESET PASSWORD MODAL (RESTORE POPUP) */}
      {/* ======================================================== */}
      {isResetModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000
        }}>
          <div className="card animate-scale-up" style={{ width: '450px', padding: '24px', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              onClick={() => { setIsResetModalOpen(false); setResetConfirmPassword(''); }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '12px' }}>ডাটা রিসেট নিশ্চিতকরণ</h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              ডাটাবেজ রিসেট করতে চাইলে সিকিউর রিসেট পাসওয়ার্ডটি (ডিফল্ট: 0000) দিন। এই অ্যাকশনের পর সিস্টেমের সব ডাটা মুছে যাবে এবং রি-লগইন করতে হবে।
            </p>
            <form onSubmit={handleResetSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">রিসেট পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="রিসেট পাসওয়ার্ড লিখুন..." 
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => { setIsResetModalOpen(false); setResetConfirmPassword(''); }}
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="btn" 
                  style={{ background: 'var(--danger)', color: '#fff' }}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? 'রিসেট হচ্ছে...' : 'রিসেট নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHANGE RESET PASSWORD MODAL (POPUP) */}
      {/* ======================================================== */}
      {isResetPasswordModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000
        }}>
          <div className="card animate-scale-up" style={{ width: '450px', padding: '24px', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              onClick={() => { setIsResetPasswordModalOpen(false); setResetPasswordChangeData({ currentPassword: '', newPassword: '' }); }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>ডাটা রিসেট পাসওয়ার্ড পরিবর্তন</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
              রিসেট পাসওয়ার্ড পরিবর্তন করতে পূর্বের পাসওয়ার্ড এবং নতুন পাসওয়ার্ডটি প্রদান করুন।
            </p>
            <form onSubmit={handleResetPasswordSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">বর্তমান রিসেট পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="বর্তমান রিসেট পাসওয়ার্ড..." 
                  value={resetPasswordChangeData.currentPassword}
                  onChange={(e) => setResetPasswordChangeData({ ...resetPasswordChangeData, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">নতুন রিসেট পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="নতুন রিসেট পাসওয়ার্ড..." 
                  value={resetPasswordChangeData.newPassword}
                  onChange={(e) => setResetPasswordChangeData({ ...resetPasswordChangeData, newPassword: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => { setIsResetPasswordModalOpen(false); setResetPasswordChangeData({ currentPassword: '', newPassword: '' }); }}
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isActionLoading}
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RESTORE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isRestoreConfirmOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000
        }}>
          <div className="card animate-scale-up" style={{ width: '460px', padding: '28px', position: 'relative' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                ডাটাবেজ রিস্টোর করবেন?
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6 }}>
                ব্যাকআপ ফাইলের ডেটা দিয়ে ডাটাবেজ আপডেট করা হবে। 
                <br/>একই আইডি থাকলে ডেটা <strong style={{ color: '#10b981' }}>রিপ্লেস/আপডেট</strong> হবে, নতুন ডেটা যোগ হবে এবং আগের কোনো ডেটা ডিলিট হবে না।
              </p>
              {pendingRestoreFile && (
                <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(100,116,139,0.15)', borderRadius: '6px', fontSize: '0.82rem', color: '#94a3b8' }}>
                  📄 {pendingRestoreFile.name}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelRestore}
                disabled={isActionLoading}
              >
                বাতিল
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff', minWidth: '140px' }}
                onClick={doRestore}
                disabled={isActionLoading}
              >
                {isActionLoading ? 'রিস্টোর হচ্ছে...' : 'হ্যাঁ, রিস্টোর করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
