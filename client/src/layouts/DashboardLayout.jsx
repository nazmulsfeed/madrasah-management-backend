import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  FileText,
  CreditCard,
  Bell,
  MessageSquare,
  Library,
  Home,
  Settings,
  LogOut,
  Search,
  Moon,
  Sun,
  ChevronLeft,
  Menu,
  BookOpenCheck,
  UserCheck,
  Building2,
  Shield,
  BarChart2,
  Wallet,
  List,
  Book,
  FileText as FileTextIcon,
  Activity,
  PieChart,
  Target,
  Package,
  Calendar,
  Briefcase,
  HandCoins,
  Undo2,
  Filter,
  Database,
  ChevronDown,
  Star
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const menuItems = [
  {
    group: 'প্রধান',
    items: [
      { path: '/dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    ],
  },
  {
    group: 'শিক্ষা ব্যবস্থাপনা',
    items: [
      { path: '/students', label: 'ছাত্র/ছাত্রী', icon: GraduationCap },
      { path: '/teachers', label: 'শিক্ষকমণ্ডলী', icon: Users },
      { path: '/guardians', label: 'অভিভাবক', icon: UserCheck },
      { path: '/academics', label: 'একাডেমিক', icon: BookOpen },
      { path: '/academics/class-subjects', label: 'শ্রেণি বিষয় ম্যাপিং', icon: BookOpenCheck },
      { path: '/attendance', label: 'উপস্থিতি', icon: ClipboardCheck },
      { path: '/homework', label: 'হোমওয়ার্ক', icon: FileText },
      { path: '/exams', label: 'পরীক্ষা ও ফলাফল', icon: FileText },
      { path: '/hifz', label: 'হিফজ অগ্রগতি', icon: BookOpenCheck },
    ],
  },
  {
    group: 'আর্থিক',
    items: [
      { path: '/fees', label: 'ফি / বেতন', icon: CreditCard },
      { path: '/bank-wallets', label: 'ব্যাংক ও ওয়ালেট', icon: Wallet },
      { path: '/daily-transactions', label: 'দৈনিক লেনদেন (Cash Book)', icon: Activity },
      { path: '/income-categories', label: 'আয়ের খাত', icon: List },
      { path: '/incomes', label: 'অন্যান্য আয়', icon: Wallet },
      { path: '/expense-vouchers', label: 'ব্যয় ও ভাউচার', icon: FileTextIcon },
      { path: '/chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen },
      { path: '/journal-ledger', label: 'জার্নাল ও লেজার', icon: Book },
      { path: '/accounting-reports', label: 'অ্যাকাউন্টিং রিপোর্টস', icon: PieChart },
      { path: '/budget-management', label: 'বাজেট ব্যবস্থাপনা', icon: Target },
      { path: '/asset-management', label: 'সম্পদ ব্যবস্থাপনা', icon: Package },
      { path: '/loan-management', label: 'ঋণ ও পাওনা-দেনা', icon: CreditCard },
      { path: '/check-management', label: 'চেক ব্যবস্থাপনা', icon: FileTextIcon },
      { path: '/advance-management', label: 'অগ্রিম ও সমন্বয়', icon: HandCoins },
      { path: '/refund-management', label: 'রিফান্ড', icon: Undo2 },
      { path: '/bank-reconciliation', label: 'ব্যাংক Reconciliation', icon: Briefcase },
      { path: '/financial-years', label: 'Financial Year', icon: Calendar },
      { path: '/finance/reports', label: 'আর্থিক রিপোর্ট', icon: BarChart2 },
      { path: '/finance/custom-reports', label: 'কাস্টম রিপোর্ট', icon: Filter },
      { path: '/finance/backup-restore', label: 'ব্যাকআপ ও রিস্টোর', icon: Database },
      { path: '/finance/audit-logs', label: 'অডিট লগ', icon: Shield },
    ],
  },
  {
    group: 'মাদ্রাসা বিশেষ',
    items: [
      { path: '/madrasah-funds', label: 'তহবিল ব্যবস্থাপনা', icon: Star },
      { path: '/qurbani-skins', label: 'কুরবানির চামড়া হিসাব', icon: Package },
    ],
  },
  {
    group: 'যোগাযোগ',
    items: [
      { path: '/notices', label: 'নোটিশ', icon: Bell },
      { path: '/messaging', label: 'মেসেজিং', icon: MessageSquare },
    ],
  },
  {
    group: 'অন্যান্য',
    items: [
      { path: '/library', label: 'লাইব্রেরি', icon: Library },
      { path: '/hostel', label: 'হোস্টেল', icon: Home },
      { path: '/settings', label: 'সেটিংস', icon: Settings },
    ],
  },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getUserTypeLabel, fetchMe } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [myPermissions, setMyPermissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('userPermissions') || '{}'); } catch { return {}; }
  });

  const handleSwitchBranch = async (branchName) => {
    try {
      const api = (await import('../api/axios')).default;
      const res = await api.post('/users/change-branch', { branch: branchName });
      if (res.data.success) {
        window.location.reload(); // Reload to refresh user context and data
      }
    } catch (error) {
      alert('Failed to switch branch');
    }
    setBranchMenuOpen(false);
  };

  // Fetch latest user info on layout mount to sync updates (e.g. Institution Name)
  useEffect(() => {
    if (user) {
      fetchMe();
    }
  }, []);

  // Handle theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch and cache user permissions
  useEffect(() => {
    const fetchPerms = async () => {
      try {
        const res = await api.get('/permissions/me');
        if (res.data.success) {
          const perms = res.data.data;
          localStorage.setItem('userPermissions', JSON.stringify(perms));
          setMyPermissions(perms);
        }
      } catch (_) {}
    };
    if (user) fetchPerms();
  }, [user]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('userPermissions');
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith('/reports')) return 'রিপোর্ট ও বিশ্লেষণ';
    for (const group of menuItems) {
      for (const item of group.items) {
        if (location.pathname.startsWith(item.path)) {
          return item.label;
        }
      }
    }
    return 'ড্যাশবোর্ড';
  };

  const userInitial = user?.firstName
    ? user.firstName.charAt(0)
    : user?.username?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div>
      {/* সাইডবার */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">م</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">মাদ্রাসা ERP</div>
            <div className="sidebar-brand-sub">ম্যানেজমেন্ট সিস্টেম</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((group) => {
            let items = group.items;
            
            // Apply permission-based filtering
            items = items.filter(item => {
              const isGuardianOrStudent = user?.userType === 'guardian' || user?.userType === 'student';
              
              if (item.path === '/students') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_view_students;
              }
              
              if (item.path === '/teachers') {
                if (user?.userType === 'super_admin') return true;
                if (isGuardianOrStudent) return false;
                return myPermissions.can_view_users;
              }
              
              if (item.path === '/guardians') {
                if (user?.userType === 'super_admin') return true;
                if (isGuardianOrStudent) return false;
                return myPermissions.can_view_users || myPermissions.can_communicate_parents;
              }
              
              if (item.path === '/academics') {
                if (user?.userType === 'super_admin') return true;
                if (isGuardianOrStudent) return false;
                return myPermissions.can_add_syllabus || myPermissions.can_view_users;
              }

              if (item.path === '/academics/class-subjects') {
                if (user?.userType === 'super_admin') return true;
                if (isGuardianOrStudent) return false;
                return myPermissions.can_add_syllabus || myPermissions.can_view_users;
              }

              if (item.path === '/attendance') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_view_all_attendance || myPermissions.can_mark_attendance || myPermissions.can_view_attendance;
              }

              if (item.path === '/exams') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_view_exams || myPermissions.can_manage_exams || myPermissions.can_grade_exams;
              }
              
              if (item.path === '/messaging') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_use_messaging;
              }
              
              if (item.path === '/hifz') {
                if (user?.userType === 'super_admin' || myPermissions.can_manage_hifz) return true;
                if (isGuardianOrStudent) return user?.isHifzEligible;
                return false; 
              }

              if (item.path === '/homework') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_view_homework || myPermissions.can_view_all_homework;
              }

              if (item.path === '/fees' || item.path === '/daily-transactions' || item.path === '/income-categories' || item.path === '/incomes' || item.path === '/expense-vouchers' || item.path === '/chart-of-accounts' || item.path === '/journal-ledger' || item.path === '/finance/audit-logs' || item.path === '/finance/reports' || item.path === '/finance/custom-reports' || item.path === '/finance/backup-restore' || item.path === '/accounting-reports' || item.path === '/budget-management' || item.path === '/asset-management' || item.path === '/loan-management' || item.path === '/check-management' || item.path === '/advance-management' || item.path === '/refund-management' || item.path === '/bank-reconciliation' || item.path === '/financial-years' || item.path === '/madrasah-funds' || item.path === '/qurbani-skins') {
                const hasFinanceAccess = (user.userType === 'super_admin' || user.userType === 'co_super_admin' || user.userType === 'admin' || user.userType === 'principal' || user.userType === 'accountant') || (myPermissions && myPermissions.finance && myPermissions.finance.view);
                if (!hasFinanceAccess) return null;
              }

              if (item.path === '/notices') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_view_notice;
              }

              if (item.path === '/library') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_view_library;
              }

              if (item.path === '/hostel') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_view_hostel;
              }

              if (item.path === '/settings') {
                if (user?.userType === 'super_admin') return true;
                return myPermissions.can_view_settings;
              }

              return true;
            });

            if (group.group === 'অন্যান্য') {
              if (user?.userType === 'super_admin' || user?.userType === 'co_super_admin') {
                items = [
                  ...items,
                  { path: '/reports', label: 'রিপোর্ট ও বিশ্লেষণ', icon: BarChart2 },
                  { path: '/role-management', label: 'রোল ও পারমিশন', icon: Shield },
                ];
              } else if (myPermissions.can_view_reports) {
                items = [...items, { path: '/reports', label: 'রিপোর্ট ও বিশ্লেষণ', icon: BarChart2 }];
              }
            }
            
            if (items.length === 0) return null;

            return (
              <div key={group.group} className="sidebar-nav-group">
                <div className="sidebar-nav-group-title">{group.group}</div>
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-nav-item ${isActive ? 'active' : ''}`
                    }
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{userInitial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user?.fullName || user?.firstName || user?.username}
              </div>
              <div className="sidebar-user-role">{getUserTypeLabel()}</div>
            </div>
            <button
              className="btn-ghost btn-icon"
              onClick={handleLogout}
              title="লগ আউট"
              style={{ marginRight: 'auto' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* টপবার */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="topbar-icon-btn"
            onClick={() => {
              if (window.innerWidth <= 768) {
                setMobileOpen(!mobileOpen);
              }
            }}
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
          >
            <Menu size={20} />
          </button>

          <div className="topbar-breadcrumb">
            <Building2 size={16} />
            {user?.institution?.name || 'দারুল উলূম মাদ্রাসা'}
            <ChevronLeft size={14} style={{ opacity: 0.4 }} />
            <span>{getPageTitle()}</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-search">
            <Search size={16} />
            <input type="text" placeholder="অনুসন্ধান করুন..." />
          </div>

          <button className="topbar-icon-btn">
            <Bell size={20} />
            <span className="notification-dot"></span>
          </button>

          {user?.userType === 'super_admin' && (
            <div className="dropdown" style={{ position: 'relative' }}>
              <button 
                className="btn btn-outline flex-center gap-8" 
                onClick={() => setBranchMenuOpen(!branchMenuOpen)}
              >
                <Building2 size={16} /> 
                {user?.institution?.name || 'ব্রাঞ্চ নির্বাচন'} 
                <ChevronDown size={14} />
              </button>
              {branchMenuOpen && (
                <div className="dropdown-menu shadow animate-scale-in" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10 }}>
                  <button className="dropdown-item" onClick={() => handleSwitchBranch('Dhaka Main Branch')}>Dhaka Main Branch</button>
                  <button className="dropdown-item" onClick={() => handleSwitchBranch('Chittagong Branch')}>Chittagong Branch</button>
                  <button className="dropdown-item" onClick={() => handleSwitchBranch('Sylhet Branch')}>Sylhet Branch</button>
                </div>
              )}
            </div>
          )}

          <button className="topbar-icon-btn" onClick={toggleTheme} title="থিম পরিবর্তন করুন">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* মেইন কন্টেন্ট */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* মোবাইল overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
