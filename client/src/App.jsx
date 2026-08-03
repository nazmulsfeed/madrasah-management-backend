import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import InstallPrompt from './components/InstallPrompt';
import LoginPage from './pages/auth/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import StudentListPage from './pages/students/StudentListPage';
import StudentDetailPage from './pages/students/StudentDetailPage';
import StudentPromotionPage from './pages/students/StudentPromotionPage';
import StudentCreatePage from './pages/students/StudentCreatePage';


import HomeworkPage from './pages/homework/HomeworkPage';
import PublicHomeworkPage from './pages/homework/PublicHomeworkPage';
import TeacherListPage from './pages/teachers/TeacherListPage';
import GuardianListPage from './pages/guardians/GuardianListPage';
import AttendancePage from './pages/attendance/AttendancePage';
import ExamPage from './pages/exams/ExamPage';
import HifzPage from './pages/hifz/HifzPage';
import FeesPage from './pages/finance/FeesPage';
import FinanceReportsPage from './pages/finance/FinanceReportsPage';
import IncomeCategoriesPage from './pages/finance/IncomeCategoriesPage';
import AuditLogsPage from './pages/finance/AuditLogsPage';
import BankWalletsPage from './pages/finance/BankWalletsPage';
import IncomesPage from './pages/finance/IncomesPage';
import ChartOfAccountsPage from './pages/finance/ChartOfAccountsPage';
import ExpenseVouchersPage from './pages/finance/ExpenseVouchersPage';
import JournalLedgerPage from './pages/finance/JournalLedgerPage';
import DailyTransactionsPage from './pages/finance/DailyTransactionsPage';
import AccountingReportsPage from './pages/finance/AccountingReportsPage';
import BudgetManagementPage from './pages/finance/BudgetManagementPage';
import AssetManagementPage from './pages/finance/AssetManagementPage';
import LoanManagementPage from './pages/finance/LoanManagementPage';
import CheckManagementPage from './pages/finance/CheckManagementPage';
import FinancialYearPage from './pages/finance/FinancialYearPage';
import BankReconciliationPage from './pages/finance/BankReconciliationPage';
import AdvanceManagementPage from './pages/finance/AdvanceManagementPage';
import RefundManagementPage from './pages/finance/RefundManagementPage';
import CustomReportsPage from './pages/finance/CustomReportsPage';
import BackupRestorePage from './pages/finance/BackupRestorePage';
import MadrasahFundsPage from './pages/finance/MadrasahFundsPage';
import QurbaniSkinsPage from './pages/finance/QurbaniSkinsPage';
import NoticesPage from './pages/notices/NoticesPage';
import AcademicsPage from './pages/academics/AcademicsPage';
import ClassSubjectsPage from './pages/academics/ClassSubjectsPage';
import MessagingPage from './pages/messaging/MessagingPage';
import LibraryPage from './pages/library/LibraryPage';
import HostelPage from './pages/hostel/HostelPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProtectedRoute from './components/shared/ProtectedRoute';
import RoleManagementPage from './pages/admin/RoleManagementPage';
import ReportsPage from './pages/reports/ReportsPage';

export default function App() {
  return (
    <BrowserRouter>
      <InstallPrompt />
      <Routes>
        {/* পাবলিক */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/public-homework" element={<PublicHomeworkPage />} />

        {/* ড্যাশবোর্ড (প্রোটেক্টেড) */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/students" element={<StudentListPage />} />
          <Route path="/students/promote" element={<StudentPromotionPage />} />
          <Route path="/students/new" element={<StudentCreatePage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />


          <Route path="/teachers" element={<TeacherListPage />} />
          <Route path="/guardians" element={<GuardianListPage />} />
          <Route path="/academics" element={<AcademicsPage />} />
          <Route path="/academics/class-subjects" element={<ClassSubjectsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/exams" element={<ExamPage />} />
          <Route path="/hifz" element={<HifzPage />} />
          <Route path="/fees" element={<FeesPage />} />
          <Route path="finance/incomes" element={<IncomesPage />} />
          <Route path="finance/income-categories" element={<IncomeCategoriesPage />} />
          <Route path="finance/audit-logs" element={<AuditLogsPage />} />
          <Route path="finance/reports" element={<FinanceReportsPage />} />
          <Route path="/bank-wallets" element={<BankWalletsPage />} />
          <Route path="/incomes" element={<IncomesPage />} />
          <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
          <Route path="/expense-vouchers" element={<ExpenseVouchersPage />} />
          <Route path="/journal-ledger" element={<JournalLedgerPage />} />
          <Route path="/daily-transactions" element={<DailyTransactionsPage />} />
          <Route path="/accounting-reports" element={<AccountingReportsPage />} />
          <Route path="/budget-management" element={<BudgetManagementPage />} />
          <Route path="/asset-management" element={<AssetManagementPage />} />
          <Route path="/loan-management" element={<LoanManagementPage />} />
          <Route path="/check-management" element={<CheckManagementPage />} />
          <Route path="/financial-years" element={<FinancialYearPage />} />
          <Route path="/bank-reconciliation" element={<BankReconciliationPage />} />
          <Route path="/advance-management" element={<AdvanceManagementPage />} />
          <Route path="/refund-management" element={<RefundManagementPage />} />
          <Route path="/finance/custom-reports" element={<CustomReportsPage />} />
          <Route path="/finance/backup-restore" element={<BackupRestorePage />} />
          <Route path="/madrasah-funds" element={<MadrasahFundsPage />} />
          <Route path="/qurbani-skins" element={<QurbaniSkinsPage />} />
          <Route path="/notices" element={<NoticesPage />} />
          <Route path="/messaging" element={<MessagingPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/homework" element={<HomeworkPage />} />
          <Route path="/hostel" element={<HostelPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/role-management" element={<RoleManagementPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>

        {/* রিডাইরেক্ট */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
