import { useState, useEffect } from 'react';
import { 
  Plus, CreditCard, Receipt, Search, X, CheckCircle, AlertCircle, 
  Loader, Eye, DollarSign, Calendar, FileText, Printer, Check, Trash2, Settings
} from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export default function FeesPage() {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Tabs: 'invoices' or 'pending' (pending tab is admin/staff only)
  const [activeTab, setActiveTab] = useState('invoices');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [isClassFeeModalOpen, setIsClassFeeModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPendingPayment, setSelectedPendingPayment] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ fundAccount: '', revenueAccount: '' });

  // Class fees editing temp state (object of objects: { [classId]: { monthlyFee, admissionFee, sessionFee, examFee } })
  const [classFeeInputs, setClassFeeInputs] = useState({});

  // Unified Invoice & Payment Form State
  const [unifiedForm, setUnifiedForm] = useState({
    student: '',
    category: 'মাসিক বেতন',
    selectedMonths: [],
    dueDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0],
    subtotal: 0,
    discountTotal: 0,
    fineTotal: 0,
    payNow: true,
    paymentAmount: 0,
    method: 'bkash',
    transactionReference: '',
    fundAccount: '',
    revenueAccount: '',
  });

  // Payment Form State (For paying an EXISTING invoice from the list)
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'bkash',
    transactionReference: '',
    feeMonth: MONTHS[new Date().getMonth()],
    fundAccount: '',
    revenueAccount: '',
  });

  // Invoice Generator Form State
  const [generatorForm, setGeneratorForm] = useState({
    category: 'examFee',
    month: MONTHS[new Date().getMonth()],
    year: String(new Date().getFullYear()),
  });

  // Permissions helpers
  const canManage = [
    'super_admin', 'co_super_admin', 'admin', 'principal', 'accountant'
  ].includes(user?.userType) || [
    'co_super_admin', 'admin'
  ].includes(user?.adminRole);

  const isSuperAdmin = user?.userType === 'super_admin';

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/invoices');
      if (res.data.success) {
        setInvoices(res.data.data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setToast({ type: 'error', message: 'ইনভয়েস তালিকা লোড করতে ব্যর্থ হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students', { params: { limit: 1000 } });
      if (res.data.success) {
        setStudents(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/students/classes');
      if (res.data.success) {
        setClasses(res.data.data.classes || []);
        const fees = {};
        res.data.data.classes.forEach(c => {
          fees[c._id] = {
            monthlyFee: c.monthlyFee || 0,
            admissionFee: c.admissionFee || 0,
            sessionFee: c.sessionFee || 0,
            examFee: c.examFee || 0
          };
        });
        setClassFeeInputs(fees);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchPendingPayments = async () => {
    if (!canManage) return;
    try {
      setPendingLoading(true);
      const res = await api.get('/finance/payments/pending');
      if (res.data.success) {
        setPendingPayments(res.data.data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchIncomeCategories = async () => {
    try {
      const res = await api.get('/finance/income-categories', { params: { type: 'student_fee' } });
      if (res.data.success) {
        setIncomeCategories(res.data.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching income categories:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounting/accounts');
      if (res.data.success) {
        setAccounts(res.data.data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchStudents();
    fetchClasses();
    fetchIncomeCategories();
    fetchAccounts();
    if (canManage) {
      fetchPendingPayments();
    }
  }, [user]);

  // Set default student if user is a student or guardian
  useEffect(() => {
    if (students.length > 0) {
      if (user?.userType === 'student') {
        const studentDoc = students.find(s => s._id === user.profileId || s.user?._id === user._id);
        if (studentDoc) {
          setUnifiedForm(prev => ({ ...prev, student: studentDoc._id }));
        }
      } else if (user?.userType === 'guardian') {
        setUnifiedForm(prev => ({ ...prev, student: students[0]?._id || '' }));
      }
    }
  }, [students, user]);

  // Invoice calculations
  const totalInvoiced = invoices.length;
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidTotal || 0), 0);
  const totalDue = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const studentName = inv.student?.user ? `${inv.student.user.firstName || ''} ${inv.student.user.lastName || ''}`.toLowerCase() : '';
    const studentId = (inv.student?.studentId || '').toLowerCase();
    const guardianName = (inv.guardian?.name || '').toLowerCase();
    const invoiceTitle = (inv.title || '').toLowerCase();
    const invoiceNum = (inv.invoiceNumber || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = 
      studentName.includes(query) || 
      studentId.includes(query) || 
      guardianName.includes(query) || 
      invoiceTitle.includes(query) || 
      invoiceNum.includes(query);

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'paid' && inv.status === 'paid') ||
      (statusFilter === 'partial' && inv.status === 'partial') ||
      (statusFilter === 'unpaid' && inv.status === 'unpaid');

    return matchesSearch && matchesStatus;
  });

  // Open Unified Modal
  const handleOpenUnifiedModal = () => {
    const isStaff = canManage;
    const defaultStudent = user?.userType === 'student' ? (students.find(s => s._id === user.profileId)?._id || '') : (students[0]?._id || '');
    
    setUnifiedForm({
      student: defaultStudent,
      category: 'মাসিক বেতন',
      selectedMonths: [],
      dueDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0],
      subtotal: 0,
      discountTotal: 0,
      discountType: 'সম্পূর্ণ ফ্রি',
      fineTotal: 0,
      payNow: true,
      paymentAmount: 0,
      method: isStaff ? 'cash' : 'bkash',
      transactionReference: '',
    });
    setIsInvoiceModalOpen(true);
  };

  const handleOpenPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.balance,
      method: canManage ? 'cash' : 'bkash',
      transactionReference: '',
      feeMonth: MONTHS[new Date().getMonth()],
    });
    setIsPaymentModalOpen(true);
  };

  const handleOpenSlipModal = (invoice) => {
    setSelectedInvoice(invoice);
    setIsSlipModalOpen(true);
  };

  const handleOpenClassFeeModal = () => {
    fetchClasses();
    setIsClassFeeModalOpen(true);
  };

  const handleOpenGeneratorModal = () => {
    setGeneratorForm({
      category: 'examFee',
      month: MONTHS[new Date().getMonth()],
      year: String(new Date().getFullYear()),
    });
    setIsGeneratorModalOpen(true);
  };

  // Batch update all class fees at once
  const handleSaveAllClassFees = async () => {
    setSubmitting(true);
    try {
      const promises = Object.keys(classFeeInputs).map(classId => {
        const fees = classFeeInputs[classId];
        return api.patch(`/students/classes/${classId}`, {
          monthlyFee: Number(fees.monthlyFee) || 0,
          admissionFee: Number(fees.admissionFee) || 0,
          sessionFee: Number(fees.sessionFee) || 0,
          examFee: Number(fees.examFee) || 0
        });
      });

      await Promise.all(promises);
      setToast({ type: 'success', message: 'সকল শ্রেণির ফি সফলভাবে সংরক্ষণ করা হয়েছে' });
      setIsClassFeeModalOpen(false);
      fetchClasses();
      fetchStudents();
    } catch (error) {
      console.error('Error saving all class fees:', error);
      setToast({ type: 'error', message: 'ফি সংরক্ষণ করতে সমস্যা হয়েছে' });
    } finally {
      setSubmitting(false);
    }
  };

  // Batch generate monthly tuition invoices
  const handleGenerateMonthlyInvoices = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/finance/invoices/generate-monthly', {
        month: generatorForm.month,
        year: generatorForm.year
      });
      if (res.data.success) {
        setToast({ type: 'success', message: res.data.message });
        setIsGeneratorModalOpen(false);
        fetchInvoices();
      }
    } catch (error) {
      console.error(error);
      setToast({ type: 'error', message: 'মাসিক বেতনের ইনভয়েস জেনারেট করতে সমস্যা হয়েছে।' });
    } finally {
      setSubmitting(false);
    }
  };

  // Batch generate exam/session/admission invoices
  const handleGenerateCategoryInvoices = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/finance/invoices/generate-category', {
        category: generatorForm.category,
        month: generatorForm.month,
        year: generatorForm.year
      });
      if (res.data.success) {
        setToast({ type: 'success', message: res.data.message });
        setIsGeneratorModalOpen(false);
        fetchInvoices();
      }
    } catch (error) {
      console.error(error);
      setToast({ type: 'error', message: 'ইনভয়েস জেনারেট করতে সমস্যা হয়েছে।' });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Unified Form (Creates Invoice and optionally creates Payment Request)
  const handleSubmitUnified = async (e) => {
    e.preventDefault();
    if (!unifiedForm.student) {
      setToast({ type: 'error', message: 'অনুগ্রহ করে ছাত্র নির্বাচন করুন' });
      return;
    }

    const selectedStudentDoc = students.find(s => s._id === unifiedForm.student);
    const classLevel = selectedStudentDoc?.currentEnrollment?.classLevel;
    
    let invoiceTitle = unifiedForm.category;
    let computedDue = 0;

    if (unifiedForm.category === 'মাসিক বেতন') {
      if (unifiedForm.selectedMonths.length === 0) {
        setToast({ type: 'error', message: 'অনুগ্রহ করে কমপক্ষে এক বা একাধিক মাস নির্বাচন করুন' });
        return;
      }
      invoiceTitle = `মাসিক বেতন (${unifiedForm.selectedMonths.join(', ')})`;
      computedDue = (classLevel?.monthlyFee || 0) * unifiedForm.selectedMonths.length;
    } else if (unifiedForm.category === 'ভর্তি ফি') {
      computedDue = classLevel?.admissionFee || 0;
    } else if (unifiedForm.category === 'সেশন ফি') {
      computedDue = classLevel?.sessionFee || 0;
    } else if (unifiedForm.category === 'পরীক্ষা ফি') {
      computedDue = classLevel?.examFee || 0;
    } else {
      computedDue = Number(unifiedForm.subtotal) || 0;
    }

    if (computedDue <= 0 && !canManage && !unifiedForm.subtotal) {
      setToast({ type: 'error', message: 'শ্রেণির জন্য কোনো ফি নির্ধারণ করা নেই' });
      return;
    }

    const payableTotal = (computedDue + Number(unifiedForm.fineTotal || 0)) - Number(unifiedForm.discountTotal || 0);

    if (unifiedForm.payNow && unifiedForm.paymentAmount <= 0) {
      setToast({ type: 'error', message: 'পরিশোধের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে' });
      return;
    }

    const isMobileBanking = ['bkash', 'rocket', 'nagad'].includes(unifiedForm.method);
    if (unifiedForm.payNow && isMobileBanking && !unifiedForm.transactionReference.trim()) {
      setToast({ type: 'error', message: 'মোবাইল ব্যাংকিং পেমেন্টের জন্য ট্রানজেকশন আইডি আবশ্যক' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Invoice
      const invoicePayload = {
        student: unifiedForm.student,
        title: invoiceTitle,
        feeCategory: unifiedForm.category,
        dueDate: unifiedForm.dueDate,
        subtotal: computedDue,
        discountTotal: Number(unifiedForm.discountTotal || 0),
        discountType: unifiedForm.discountTotal > 0 ? unifiedForm.discountType : null,
        fineTotal: Number(unifiedForm.fineTotal || 0),
      };

      const invoiceRes = await api.post('/finance/invoices', invoicePayload);
      if (invoiceRes.data.success) {
        const createdInvoice = invoiceRes.data.data.invoice;

        // 2. Create Payment Request if payNow is true
        if (unifiedForm.payNow) {
          const paymentPayload = {
            invoiceId: createdInvoice._id,
            amount: Number(unifiedForm.paymentAmount),
            method: unifiedForm.method,
            transactionReference: isMobileBanking ? unifiedForm.transactionReference : '',
            feeMonth: unifiedForm.category === 'মাসিক বেতন' ? unifiedForm.selectedMonths.join(', ') : unifiedForm.category,
          };

          const paymentRes = await api.post('/finance/payments', paymentPayload);
          if (paymentRes.data.success) {
            setToast({
              type: 'success',
              message: paymentRes.data.message || 'ইনভয়েস তৈরি এবং পেমেন্ট রিকোয়েস্ট জমা দেওয়া হয়েছে।'
            });
            setIsInvoiceModalOpen(false);
            fetchInvoices();
            if (canManage) fetchPendingPayments();
            return;
          }
        }

        setToast({ type: 'success', message: 'ইনভয়েস সফলভাবে তৈরি করা হয়েছে।' });
        setIsInvoiceModalOpen(false);
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error in unified invoice submission:', error);
      const msg = error.response?.data?.message || 'ইনভয়েস ও পেমেন্ট রিকোয়েস্ট তৈরি করতে সমস্যা হয়েছে';
      setToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceivePaymentOnExisting = async (e) => {
    e.preventDefault();
    if (paymentForm.amount <= 0) {
      setToast({ type: 'error', message: 'পেমেন্ট পরিমাণ অবশ্যই ০ এর বেশি হতে হবে' });
      return;
    }

    const isMobileBanking = ['bkash', 'rocket', 'nagad'].includes(paymentForm.method);
    if (isMobileBanking && !paymentForm.transactionReference.trim()) {
      setToast({ type: 'error', message: 'মোবাইল ব্যাংকিং পেমেন্টের জন্য ট্রানজেকশন আইডি আবশ্যক' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoiceId: selectedInvoice._id,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        transactionReference: isMobileBanking ? paymentForm.transactionReference : '',
        feeMonth: paymentForm.feeMonth,
      };

      const res = await api.post('/finance/payments', payload);
      if (res.data.success) {
        setToast({ 
          type: 'success', 
          message: res.data.message || 'পেমেন্ট সফলভাবে সম্পন্ন হয়েছে' 
        });
        setIsPaymentModalOpen(false);
        fetchInvoices();
        if (canManage) fetchPendingPayments();
      }
    } catch (error) {
      console.error('Error receiving payment:', error);
      const msg = error.response?.data?.message || 'পেমেন্ট গ্রহণে সমস্যা হয়েছে';
      setToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPending = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post(`/finance/payments/${selectedPendingPayment._id}/verify`, {
        fundAccount: verifyForm.fundAccount,
        revenueAccount: verifyForm.revenueAccount
      });
      if (res.data.success) {
        setToast({ type: 'success', message: 'পেমেন্ট রিকোয়েস্টটি সফলভাবে ভেরিফাই করা হয়েছে।' });
        setIsVerifyModalOpen(false);
        fetchPendingPayments();
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setToast({ type: 'error', message: 'ভেরিফাই করতে সমস্যা হয়েছে।' });
    } finally {
      setSubmitting(false);
    }
  };

  const openVerifyModal = (payment) => {
    setSelectedPendingPayment(payment);
    setVerifyForm({ fundAccount: '', revenueAccount: '' });
    setIsVerifyModalOpen(true);
  };

  const handleRejectPending = async (paymentId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই পেমেন্ট রিকোয়েস্টটি বাতিল (Reject) করতে চান?')) return;
    try {
      const res = await api.post(`/finance/payments/${paymentId}/reject`);
      if (res.data.success) {
        setToast({ type: 'warning', message: 'পেমেন্ট রিকোয়েস্টটি বাতিল করা হয়েছে।' });
        fetchPendingPayments();
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      setToast({ type: 'error', message: 'বাতিল করতে সমস্যা হয়েছে।' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getMethodLabel = (m) => {
    const labels = {
      cash: 'নগদ (Cash)',
      bank: 'ব্যাংক ট্রান্সফার',
      online: 'অনলাইন পেমেন্ট',
      bkash: 'bKash (বিকাশ)',
      nagad: 'Nagad (নগদ)',
      rocket: 'Rocket (রকেট)',
      mobile_banking: 'মোবাইল ব্যাংকিং'
    };
    return labels[m] || m;
  };

  // Unified Form Live Calculations
  const activeStudentDoc = students.find(s => s._id === unifiedForm.student);
  const activeClassFeeConfig = activeStudentDoc?.currentEnrollment?.classLevel;
  const unifiedMonthsCount = unifiedForm.selectedMonths.length;
  
  let computedUnifiedSubtotal = 0;
  if (unifiedForm.category === 'মাসিক বেতন') {
    computedUnifiedSubtotal = (activeClassFeeConfig?.monthlyFee || 0) * unifiedMonthsCount;
  } else if (unifiedForm.category === 'ভর্তি ফি') {
    computedUnifiedSubtotal = activeClassFeeConfig?.admissionFee || 0;
  } else if (unifiedForm.category === 'সেশন ফি') {
    computedUnifiedSubtotal = activeClassFeeConfig?.sessionFee || 0;
  } else if (unifiedForm.category === 'পরীক্ষা ফি') {
    computedUnifiedSubtotal = activeClassFeeConfig?.examFee || 0;
  }

  const computedUnifiedPayable = (computedUnifiedSubtotal + Number(unifiedForm.fineTotal || 0)) - Number(unifiedForm.discountTotal || 0);

  const directPayAmount = Number(unifiedForm.paymentAmount) || 0;
  const directGatewayCharge = ['bkash', 'rocket', 'nagad'].includes(unifiedForm.method) ? directPayAmount * 0.02 : 0;
  const directTotalWithCharge = directPayAmount + directGatewayCharge;

  const directRemainingDue = Math.max(0, computedUnifiedPayable - directPayAmount);
  const directAdvancePayment = Math.max(0, directPayAmount - computedUnifiedPayable);

  // Auto calculate total to pay on category changes or student changes
  useEffect(() => {
    setUnifiedForm(prev => ({
      ...prev,
      paymentAmount: computedUnifiedSubtotal
    }));
  }, [unifiedForm.category, unifiedForm.student, unifiedMonthsCount]);

  // Existing Invoice Payment Calculations
  const activeMethod = paymentForm.method;
  const enteredAmount = Number(paymentForm.amount) || 0;
  const gatewayCharge = ['bkash', 'rocket', 'nagad'].includes(activeMethod) ? enteredAmount * 0.02 : 0;
  const totalAmountToPay = enteredAmount + gatewayCharge;

  const currentBalance = selectedInvoice ? selectedInvoice.balance : 0;
  const remainingBalance = Math.max(0, currentBalance - enteredAmount);
  const advancePayment = Math.max(0, enteredAmount - currentBalance);

  const toggleMonth = (m) => {
    setUnifiedForm(prev => {
      const idx = prev.selectedMonths.indexOf(m);
      let list = [...prev.selectedMonths];
      if (idx > -1) {
        list.splice(idx, 1);
      } else {
        list.push(m);
      }
      list.sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
      
      const totalDue = (activeClassFeeConfig?.monthlyFee || 0) * list.length;
      return {
        ...prev,
        selectedMonths: list,
        paymentAmount: totalDue
      };
    });
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '14px 22px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : toast.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(239, 68, 68, 0.95)',
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
          <h1 className="page-title">ফি ও বেতন ব্যবস্থাপনা</h1>
          <p className="page-subtitle">ছাত্রদের ফি গ্রহণ, ভেরিফিকেশন এবং ইনভয়েস ম্যানেজমেন্ট</p>
        </div>
        <div className="flex gap-16">
          {isSuperAdmin && (
            <button className="btn btn-secondary flex-center gap-4" onClick={handleOpenClassFeeModal}>
              <Settings size={16} /> শ্রেণি ফি নির্ধারণ
            </button>
          )}
          {canManage && (
            <button className="btn btn-secondary flex-center gap-4" onClick={handleOpenGeneratorModal}>
              <Receipt size={16} /> ইনভয়েস জেনারেটর
            </button>
          )}
          <button className="btn btn-primary flex-center gap-4" onClick={handleOpenUnifiedModal}>
            <Plus size={16} /> নতুন ইনভয়েস ও পেমেন্ট
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-3 mb-24">
        <div className="card text-center hover-lift" style={{ borderLeft: '5px solid var(--success)', padding: '20px' }}>
          <h3 className="text-muted text-sm mb-8" style={{ fontWeight: 600 }}>সর্বমোট আদায়</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
            ৳{totalPaid.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card text-center hover-lift" style={{ borderLeft: '5px solid var(--danger)', padding: '20px' }}>
          <h3 className="text-muted text-sm mb-8" style={{ fontWeight: 600 }}>সর্বমোট বকেয়া</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
            ৳{totalDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card text-center hover-lift" style={{ borderLeft: '5px solid var(--primary)', padding: '20px' }}>
          <h3 className="text-muted text-sm mb-8" style={{ fontWeight: 600 }}>সর্বমোট ইনভয়েস</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
            {totalInvoiced}
          </div>
        </div>
      </div>

      {/* Tab Switcher for Admins/Staff */}
      {canManage && (
        <div className="flex gap-16 mb-16 border-b" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <button 
            className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('invoices')}
            style={{ borderRadius: '8px 8px 0 0', padding: '10px 20px' }}
          >
            ইনভয়েস তালিকা
          </button>
          <button 
            className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setActiveTab('pending');
              fetchPendingPayments();
            }}
            style={{ borderRadius: '8px 8px 0 0', padding: '10px 20px', position: 'relative' }}
          >
            অপেক্ষাধীন পেমেন্ট ভেরিফিকেশন
            {pendingPayments.length > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: 'var(--danger)', color: '#fff', fontSize: '0.75rem',
                borderRadius: '50%', padding: '2px 6px', fontWeight: 'bold'
              }}>
                {pendingPayments.length}
              </span>
            )}
          </button>
        </div>
      )}

      {activeTab === 'invoices' ? (
        <>
          {/* Search and Filters */}
          <div className="card mb-24" style={{ padding: '18px 24px' }}>
            <div className="flex gap-16" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="ছাত্রের নাম, অভিভাবকের নাম, আইডি অথবা ইনভয়েস নং..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '44px', borderRadius: '10px' }}
                />
              </div>
              <select 
                className="form-input form-select" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '180px', borderRadius: '10px' }}
              >
                <option value="all">সকল ইনভয়েস</option>
                <option value="paid">পরিশোধিত</option>
                <option value="partial">আংশিক বকেয়া</option>
                <option value="unpaid">সম্পূর্ণ বকেয়া</option>
              </select>
            </div>
          </div>

          {/* Invoices List */}
          {loading ? (
            <div className="flex-center" style={{ padding: '60px', flexDirection: 'column', gap: '12px' }}>
              <div className="spinner"></div>
              <span className="text-muted text-sm">ইনভয়েস লোড হচ্ছে...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="card empty-state">
              <CreditCard size={48} style={{ opacity: 0.3, color: 'var(--primary)' }} />
              <div className="empty-state-title mt-16" style={{ fontSize: '1.1rem', fontWeight: 600 }}>কোনো ইনভয়েস খুঁজে পাওয়া যায়নি</div>
            </div>
          ) : (
            <div className="card table-container" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ইনভয়েস নং</th>
                    <th>ছাত্রের নাম (আইডি / অভিভাবক)</th>
                    <th>শ্রেণি ও সেকশন</th>
                    <th>বিবরণ</th>
                    <th>ইস্যু ডেট</th>
                    <th>টোটাল (৳)</th>
                    <th>বকেয়া (৳)</th>
                    <th>স্ট্যাটাস</th>
                    <th style={{ width: '180px', textAlign: 'center' }}>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const sName = inv.student?.user ? `${inv.student.user.firstName || ''} ${inv.student.user.lastName || ''}`.trim() : 'অজানা';
                    const classNameVal = inv.student?.currentEnrollment?.classLevel?.name || '—';
                    const sectionNameVal = inv.student?.currentEnrollment?.section?.name || '—';

                    return (
                      <tr key={inv._id}>
                        <td className="font-semibold" style={{ fontFamily: 'Inter' }}>{inv.invoiceNumber}</td>
                        <td>
                          <div className="font-bold text-primary" style={{ fontSize: '0.95rem' }}>{sName}</div>
                          <div className="text-xs text-secondary" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                            আইডি: {inv.student?.studentId || '—'}
                          </div>
                          {inv.guardian && (
                            <div className="text-xs text-muted font-medium" style={{ marginTop: '2px' }}>
                              অভিভাবক: {inv.guardian.name} ({inv.guardian.relationship})
                            </div>
                          )}
                        </td>
                        <td><span className="text-sm font-medium">{classNameVal} ({sectionNameVal})</span></td>
                        <td>{inv.title}</td>
                        <td>{new Date(inv.issueDate).toLocaleDateString('bn-BD')}</td>
                        <td className="font-semibold" style={{ fontFamily: 'Inter' }}>{inv.payableTotal}</td>
                        <td className="font-semibold" style={{ color: inv.balance > 0 ? 'var(--danger)' : 'var(--success)', fontFamily: 'Inter' }}>
                          {inv.balance}
                        </td>
                        <td>
                          <span className={`badge ${inv.status === 'paid' ? 'badge-active' : inv.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                            {inv.status === 'paid' ? 'পরিশোধিত' : inv.status === 'partial' ? 'আংশিক' : 'বকেয়া'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-8 justify-center">
                            <button 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => handleOpenSlipModal(inv)} 
                              title="রসিদ দেখুন"
                            >
                              <Eye size={14} /> রসিদ
                            </button>
                            {inv.status !== 'paid' && (
                              <button 
                                className="btn btn-primary btn-sm" 
                                onClick={() => handleOpenPaymentModal(inv)}
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              >
                                <DollarSign size={12} /> পেমেন্ট
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Pending Verification Tab */
        <>
          {pendingLoading ? (
            <div className="flex-center" style={{ padding: '60px' }}>
              <div className="spinner"></div>
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="card empty-state">
              <CheckCircle size={48} style={{ opacity: 0.3, color: 'var(--success)' }} />
              <div className="empty-state-title mt-16" style={{ fontSize: '1.1rem', fontWeight: 600 }}>কোনো অপেক্ষাধীন পেমেন্ট নেই</div>
              <p className="text-muted text-sm mt-8">সব পেমেন্ট ভেরিফাই করা হয়েছে।</p>
            </div>
          ) : (
            <div className="card table-container" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ছাত্র আইডি / নাম (অভিভাবক)</th>
                    <th>ইনভয়েস নং (বকেয়া)</th>
                    <th>টাকা পরিশোধের মাস / বিবরণ</th>
                    <th>পেমেন্ট মাধ্যম</th>
                    <th>ট্রানজেকশন আইডি</th>
                    <th>পেমেন্ট পরিমাণ (৳)</th>
                    <th>চার্জ (৳)</th>
                    <th>সর্বমোট (৳)</th>
                    <th style={{ width: '220px', textAlign: 'center' }}>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((pay) => {
                    const sName = pay.student?.user ? `${pay.student.user.firstName || ''} ${pay.student.user.lastName || ''}`.trim() : 'অজানা';
                    return (
                      <tr key={pay._id}>
                        <td>
                          <div className="font-bold">{sName}</div>
                          <div className="text-xs text-muted" style={{ fontFamily: 'Inter' }}>আইডি: {pay.student?.studentId}</div>
                          {pay.guardian && (
                            <div className="text-xs text-muted">অভিভাবক: {pay.guardian.name}</div>
                          )}
                        </td>
                        <td>
                          <div>{pay.invoice?.invoiceNumber}</div>
                          <div className="text-xs text-muted">বকেয়া: ৳{pay.invoice?.balance}</div>
                        </td>
                        <td>
                          <div className="font-medium text-primary">{pay.feeMonth}</div>
                          <div className="text-xs text-muted">{pay.invoice?.title}</div>
                        </td>
                        <td><span className="font-semibold text-primary">{getMethodLabel(pay.method)}</span></td>
                        <td className="font-semibold" style={{ fontFamily: 'Inter' }}>{pay.transactionReference || '—'}</td>
                        <td className="font-semibold" style={{ fontFamily: 'Inter' }}>{pay.amount}</td>
                        <td className="text-muted" style={{ fontFamily: 'Inter' }}>{pay.gatewayCharge}</td>
                        <td className="font-bold" style={{ color: 'var(--primary)', fontFamily: 'Inter' }}>{pay.amount + (pay.gatewayCharge || 0)}</td>
                        <td>
                          <div className="flex gap-8 justify-center">
                            <button 
                              className="btn btn-success btn-sm flex-center gap-4" 
                              onClick={() => openVerifyModal(pay)}
                              style={{ padding: '4px 8px' }}
                              title="ভেরিফাই করুন"
                            >
                              <CheckCircle size={14} /> 
                            </button>
                            <button 
                              className="btn btn-danger btn-sm flex-center gap-4" 
                              onClick={() => handleRejectPending(pay._id)}
                              style={{ padding: '6px 10px' }}
                            >
                              <X size={14} /> বাতিল
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Set Class Fees Modal (Superadmin Only) */}
      {isClassFeeModalOpen && isSuperAdmin && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto',
            padding: '30px', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsClassFeeModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={22} style={{ color: 'var(--primary)' }} />
              শ্রেণি ভিত্তিক সকল ফি নির্ধারণ
            </h2>

            <div className="flex-column gap-16">
              {classes.map(c => (
                <div key={c._id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div className="font-bold text-primary mb-8" style={{ fontSize: '1rem' }}>{c.name} ({c.code})</div>
                  <div className="grid grid-4" style={{ gap: '12px' }}>
                    <div>
                      <label className="form-label text-xs">মাসিক বেতন (৳)</label>
                      <input 
                        type="number"
                        className="form-input text-sm"
                        value={classFeeInputs[c._id]?.monthlyFee || 0}
                        onChange={(e) => setClassFeeInputs({
                          ...classFeeInputs,
                          [c._id]: { ...classFeeInputs[c._id], monthlyFee: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">ভর্তি ফি (৳)</label>
                      <input 
                        type="number"
                        className="form-input text-sm"
                        value={classFeeInputs[c._id]?.admissionFee || 0}
                        onChange={(e) => setClassFeeInputs({
                          ...classFeeInputs,
                          [c._id]: { ...classFeeInputs[c._id], admissionFee: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">সেশন ফি (৳)</label>
                      <input 
                        type="number"
                        className="form-input text-sm"
                        value={classFeeInputs[c._id]?.sessionFee || 0}
                        onChange={(e) => setClassFeeInputs({
                          ...classFeeInputs,
                          [c._id]: { ...classFeeInputs[c._id], sessionFee: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">পরীক্ষা ফি (৳)</label>
                      <input 
                        type="number"
                        className="form-input text-sm"
                        value={classFeeInputs[c._id]?.examFee || 0}
                        onChange={(e) => setClassFeeInputs({
                          ...classFeeInputs,
                          [c._id]: { ...classFeeInputs[c._id], examFee: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', marginTop: '24px', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setIsClassFeeModalOpen(false)}>বাতিল</button>
              <button className="btn btn-primary" onClick={handleSaveAllClassFees} disabled={submitting}>
                {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সব ফি একসাথে সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Generator Modal (Staff Only) */}
      {isGeneratorModalOpen && canManage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '520px', padding: '30px', borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsGeneratorModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={22} style={{ color: 'var(--primary)' }} />
              ইনভয়েস জেনারেটর (ব্যাচ প্রসেস)
            </h2>

            <div className="flex-column gap-16">
              {/* Option B: Category Fee (Admission/Session/Exam Fee) Generation */}
              <div>
                <p className="text-xs text-muted mb-12">ভর্তি, সেশন বা পরীক্ষা ফি নির্ধারণ করা থাকলে সকল সক্রিয় শিক্ষার্থীর জন্য ইনভয়েস তৈরি করুন।</p>
                
                <div className="grid grid-3 mb-12" style={{ gap: '8px' }}>
                  <div>
                    <label className="form-label text-xs">ফি ক্যাটাগরি</label>
                    <select 
                      className="form-select form-input"
                      value={generatorForm.category}
                      onChange={(e) => setGeneratorForm({ ...generatorForm, category: e.target.value })}
                    >
                      <option value="examFee">পরীক্ষা ফি</option>
                      <option value="sessionFee">সেশন ফি</option>
                      <option value="admissionFee">ভর্তি ফি</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">মাস</label>
                    <select 
                      className="form-select form-input"
                      value={generatorForm.month}
                      onChange={(e) => setGeneratorForm({ ...generatorForm, month: e.target.value })}
                    >
                      {MONTHS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">বছর</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={generatorForm.year}
                      onChange={(e) => setGeneratorForm({ ...generatorForm, year: e.target.value })}
                    />
                  </div>
                </div>
                <button 
                  className="btn btn-success w-full"
                  onClick={handleGenerateCategoryInvoices}
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  {submitting ? 'জেনারেট হচ্ছে...' : 'ইনভয়েস তৈরি করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified New Invoice & Payment Modal */}
      {isInvoiceModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto',
            padding: '30px', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)', position: 'relative'
          }}>
            <button 
              onClick={() => setIsInvoiceModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={22} style={{ color: 'var(--primary)' }} />
              নতুন ইনভয়েস ও ফি পরিশোধ
            </h2>

            <form onSubmit={handleSubmitUnified} className="flex-column gap-16">
              
              {/* Student Selector */}
              {user?.userType !== 'student' ? (
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>শিক্ষার্থী নির্বাচন করুন *</label>
                  <select
                    className="form-select form-input"
                    value={unifiedForm.student}
                    onChange={(e) => setUnifiedForm({ ...unifiedForm, student: e.target.value, selectedMonths: [], paymentAmount: 0 })}
                    required
                  >
                    <option value="">-- শিক্ষার্থী বাছুন --</option>
                    {students.map(s => {
                      const sName = s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : 'অজানা';
                      const cName = s.currentEnrollment?.classLevel?.name || '—';
                      return (
                        <option key={s._id} value={s._id}>{sName} ({s.studentId}) - {cName}</option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="card font-medium" style={{ background: 'var(--body-bg)', padding: '12px 16px' }}>
                  <strong>শিক্ষার্থী:</strong> {activeStudentDoc?.user ? `${activeStudentDoc.user.firstName || ''} ${activeStudentDoc.user.lastName || ''}`.trim() : ''} ({activeStudentDoc?.studentId})
                  <br /><strong>শ্রেণি:</strong> {activeStudentDoc?.currentEnrollment?.classLevel?.name || '—'}
                </div>
              )}

              {/* Category selector */}
              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>ফি ক্যাটাগরি / বিবরণ *</label>
                  <select
                    className="form-select form-input"
                    value={unifiedForm.category}
                    onChange={(e) => setUnifiedForm({ ...unifiedForm, category: e.target.value, selectedMonths: [], paymentAmount: 0, subtotal: 0 })}
                    required
                  >
                    <option value="মাসিক বেতন">মাসিক বেতন</option>
                    <option value="ভর্তি ফি">ভর্তি ফি</option>
                    <option value="পরীক্ষা ফি">পরীক্ষা ফি</option>
                    <option value="সেশন ফি">সেশন ফি</option>
                    {incomeCategories.map(c => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>পরিশোধের শেষ তারিখ *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={unifiedForm.dueDate}
                    onChange={(e) => setUnifiedForm({ ...unifiedForm, dueDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Monthly Tuition Fee month checklist */}
              {unifiedForm.category === 'মাসিক বেতন' ? (
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                    বেতনের মাস নির্বাচন করুন (এক বা একাধিক মাস সিলেক্ট করুন) *
                    {activeClassFeeConfig?.monthlyFee > 0 && <span style={{ color: 'var(--primary)', marginLeft: '8px' }}>(মাসিক ফি: ৳{activeClassFeeConfig.monthlyFee})</span>}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {MONTHS.map(m => {
                      const isChecked = unifiedForm.selectedMonths.includes(m);
                      return (
                        <button
                          type="button"
                          key={m}
                          onClick={() => toggleMonth(m)}
                          style={{
                            padding: '6px 4px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer',
                            border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                            background: isChecked ? 'rgba(20, 184, 166, 0.12)' : 'var(--card-bg)',
                            color: isChecked ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: isChecked ? 'bold' : 'normal',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Other Categories: Subtotal editable for staff, input total for student/guardian */
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>ইনভয়েস সাবটোটাল পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={computedUnifiedSubtotal}
                    onChange={(e) => setUnifiedForm({ ...unifiedForm, subtotal: parseFloat(e.target.value) || 0, paymentAmount: parseFloat(e.target.value) || 0 })}
                    disabled={!canManage}
                    required
                  />
                </div>
              )}

              {/* Fine and Discount (Staff Only) */}
              {canManage && (
                <div className="grid grid-2" style={{ gap: '16px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>ডিসকাউন্ট / ছাড় (৳)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={unifiedForm.discountTotal}
                        onChange={(e) => setUnifiedForm({ ...unifiedForm, discountTotal: parseFloat(e.target.value) || 0 })}
                      />
                      <select 
                        className="form-select form-input" 
                        style={{ flex: 1 }}
                        value={unifiedForm.discountType}
                        onChange={(e) => setUnifiedForm({ ...unifiedForm, discountType: e.target.value })}
                        disabled={unifiedForm.discountTotal <= 0}
                      >
                        <option value="সম্পূর্ণ ফ্রি">সম্পূর্ণ ফ্রি</option>
                        <option value="শতকরা ছাড়">শতকরা ছাড়</option>
                        <option value="এতিম">এতিম</option>
                        <option value="হাফেজ">হাফেজ</option>
                        <option value="শিক্ষক সন্তান">শিক্ষক সন্তান</option>
                        <option value="বিশেষ ছাড়">বিশেষ ছাড়</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>জরিমানা / অতিরিক্ত (৳)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={unifiedForm.fineTotal}
                      onChange={(e) => setUnifiedForm({ ...unifiedForm, fineTotal: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}

              {/* Pay Now Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                {canManage ? (
                  <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      id="payNowCheck"
                      checked={unifiedForm.payNow} 
                      onChange={(e) => setUnifiedForm({ ...unifiedForm, payNow: e.target.checked })} 
                    />
                    <label htmlFor="payNowCheck" className="font-semibold" style={{ cursor: 'pointer' }}>ইনভয়েস তৈরির সাথে সাথে এখনই পেমেন্ট গ্রহণ করতে চান?</label>
                  </div>
                ) : (
                  <div className="mb-8 font-semibold text-muted text-sm">পেমেন্ট রিকোয়েস্ট তৈরি করা হচ্ছে:</div>
                )}

                {unifiedForm.payNow && (
                  <div className="flex-column gap-16 animate-fade-in">
                    <div className="grid grid-2" style={{ gap: '16px' }}>
                      <div>
                        <label className="form-label" style={{ fontWeight: 600 }}>পরিশোধের পরিমাণ (৳) *</label>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={unifiedForm.paymentAmount}
                          onChange={(e) => setUnifiedForm({ ...unifiedForm, paymentAmount: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontWeight: 600 }}>পেমেন্ট মাধ্যম *</label>
                        <select
                          className="form-select form-input"
                          value={unifiedForm.method}
                          onChange={(e) => setUnifiedForm({ ...unifiedForm, method: e.target.value })}
                          required
                        >
                          {canManage && <option value="cash">নগদ (Cash)</option>}
                          {canManage && <option value="bank">ব্যাংক ট্রান্সফার</option>}
                          {canManage && <option value="cheque">চেক (Cheque)</option>}
                          <option value="bkash">bKash (বিকাশ)</option>
                          <option value="nagad">Nagad (নগদ)</option>
                          <option value="rocket">Rocket (রকেট)</option>
                          <option value="online">অনলাইন পেমেন্ট</option>
                        </select>
                      </div>
                    </div>

                    {canManage && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label className="form-label" style={{ fontWeight: 600 }}>জমা ফান্ড (Debit Account)</label>
                          <select
                            className="form-input"
                            value={unifiedForm.fundAccount}
                            onChange={(e) => setUnifiedForm({ ...unifiedForm, fundAccount: e.target.value })}
                          >
                            <option value="">-- ফান্ড নির্বাচন করুন --</option>
                            {accounts.filter(a => a.type === 'Asset').map(a => (
                              <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontWeight: 600 }}>আয়ের খাত (Credit Account)</label>
                          <select
                            className="form-input"
                            value={unifiedForm.revenueAccount}
                            onChange={(e) => setUnifiedForm({ ...unifiedForm, revenueAccount: e.target.value })}
                          >
                            <option value="">-- আয়ের খাত নির্বাচন করুন --</option>
                            {accounts.filter(a => a.type === 'Revenue').map(a => (
                              <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Transaction Reference for mobile banking */}
                    {['bkash', 'rocket', 'nagad'].includes(unifiedForm.method) && (
                      <div>
                        <label className="form-label" style={{ fontWeight: 600 }}>ট্রানজেকশন আইডি (TxnID) *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="যেমন: K28D83JS8"
                          value={unifiedForm.transactionReference}
                          onChange={(e) => setUnifiedForm({ ...unifiedForm, transactionReference: e.target.value })}
                          required
                        />
                      </div>
                    )}

                    {/* Unified calculations display */}
                    <div className="card" style={{ background: 'var(--body-bg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                      <div className="flex justify-between">
                        <span>মোট প্রদেয় ফি (Payable):</span>
                        <span style={{ fontFamily: 'Inter', fontWeight: 600 }}>৳{computedUnifiedPayable.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>পেমেন্ট পরিমাণ:</span>
                        <span style={{ fontFamily: 'Inter' }}>৳{directPayAmount.toFixed(2)}</span>
                      </div>
                      {directGatewayCharge > 0 && (
                        <div className="flex justify-between" style={{ color: 'var(--danger)' }}>
                          <span>গেটওয়ে চার্জ (২%):</span>
                          <span style={{ fontFamily: 'Inter' }}>৳{directGatewayCharge.toFixed(2)}</span>
                        </div>
                      )}
                      {directRemainingDue > 0 && (
                        <div className="flex justify-between text-muted">
                          <span>পেমেন্ট পরবর্তীতে বকেয়া থাকবে:</span>
                          <span style={{ fontFamily: 'Inter' }}>৳{directRemainingDue.toFixed(2)}</span>
                        </div>
                      )}
                      {directAdvancePayment > 0 && (
                        <div className="flex justify-between" style={{ color: 'var(--success)', fontWeight: 600 }}>
                          <span>অগ্রিম হিসেবে জমা থাকবে:</span>
                          <span style={{ fontFamily: 'Inter' }}>৳{directAdvancePayment.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t pt-8" style={{ fontSize: '0.95rem', borderTop: '1px solid var(--border-color)' }}>
                        <span>সর্বমোট পরিশোধ পরিমাণ (চার্জ সহ):</span>
                        <span style={{ color: 'var(--primary)', fontFamily: 'Inter' }}>৳{directTotalWithCharge.toFixed(2)}</span>
                      </div>
                    </div>

                    {['bkash', 'rocket', 'nagad'].includes(unifiedForm.method) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: '0.8rem' }}>
                        <AlertCircle size={16} />
                        <span>মোবাইল ব্যাংকিং পেমেন্ট এডমিন ভেরিফাই না করা পর্যন্ত পেন্ডিং থাকবে।</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsInvoiceModalOpen(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader className="animate-spin" size={16} /> : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Existing Invoice Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '480px', padding: '30px', borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsPaymentModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={22} style={{ color: 'var(--success)' }} />
              পেমেন্ট গ্রহণ করুন
            </h2>

            <div className="mb-16" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div><strong>ইনভয়েস নম্বর:</strong> {selectedInvoice.invoiceNumber}</div>
              <div><strong>শিক্ষার্থী:</strong> {selectedInvoice.student?.user ? `${selectedInvoice.student.user.firstName || ''} ${selectedInvoice.student.user.lastName || ''}`.trim() : 'অজানা'}</div>
              <div><strong>বিবরণ:</strong> {selectedInvoice.title}</div>
              {selectedInvoice.guardian && <div><strong>অভিভাবক:</strong> {selectedInvoice.guardian.name}</div>}
              <div className="mt-8" style={{ color: 'var(--danger)', fontWeight: 700 }}>
                <strong>মোট বকেয়া:</strong> ৳{selectedInvoice.balance}
              </div>
            </div>

            <form onSubmit={handleReceivePaymentOnExisting} className="flex-column gap-16">
              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>পরিশোধের মাস *</label>
                  <select
                    className="form-select form-input"
                    value={paymentForm.feeMonth}
                    onChange={(e) => setPaymentForm({ ...paymentForm, feeMonth: e.target.value })}
                    required
                  >
                    {MONTHS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>পেমেন্ট মাধ্যম *</label>
                  <select
                    className="form-select form-input"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    required
                  >
                    {canManage && <option value="cash">নগদ (Cash)</option>}
                    {canManage && <option value="bank">ব্যাংক ট্রান্সফার</option>}
                    {canManage && <option value="cheque">চেক (Cheque)</option>}
                    <option value="bkash">bKash (বিকাশ)</option>
                    <option value="nagad">Nagad (নগদ)</option>
                    <option value="rocket">Rocket (রকেট)</option>
                    <option value="online">অনলাইন পেমেন্ট</option>
                  </select>
                </div>
              </div>

              {canManage && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>জমা ফান্ড (Debit Account)</label>
                    <select
                      className="form-input"
                      value={paymentForm.fundAccount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, fundAccount: e.target.value })}
                    >
                      <option value="">-- ফান্ড নির্বাচন করুন --</option>
                      {accounts.filter(a => a.type === 'Asset').map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>আয়ের খাত (Credit Account)</label>
                    <select
                      className="form-input"
                      value={paymentForm.revenueAccount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, revenueAccount: e.target.value })}
                    >
                      <option value="">-- আয়ের খাত নির্বাচন করুন --</option>
                      {accounts.filter(a => a.type === 'Revenue').map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>পেমেন্ট পরিমাণ (৳) *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              {['bkash', 'rocket', 'nagad'].includes(activeMethod) && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>ট্রানজেকশন আইডি (TxnID) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="যেমন: K28D83JS8"
                    value={paymentForm.transactionReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="card" style={{ background: 'var(--body-bg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div className="flex justify-between">
                  <span>পরিশোধের পরিমাণ:</span>
                  <span style={{ fontFamily: 'Inter' }}>৳{enteredAmount.toFixed(2)}</span>
                </div>
                {gatewayCharge > 0 && (
                  <div className="flex justify-between" style={{ color: 'var(--danger)' }}>
                    <span>গেটওয়ে চার্জ (২%):</span>
                    <span style={{ fontFamily: 'Inter' }}>৳{gatewayCharge.toFixed(2)}</span>
                  </div>
                )}
                {remainingBalance > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>পেমেন্ট পরবর্তীতে বকেয়া থাকবে:</span>
                    <span style={{ fontFamily: 'Inter' }}>৳{remainingBalance.toFixed(2)}</span>
                  </div>
                )}
                {advancePayment > 0 && (
                  <div className="flex justify-between" style={{ color: 'var(--success)', fontWeight: 600 }}>
                    <span>অগ্রিম হিসেবে জমা হবে:</span>
                    <span style={{ fontFamily: 'Inter' }}>৳{advancePayment.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-8" style={{ fontSize: '0.95rem', borderTop: '1px solid var(--border-color)' }}>
                  <span>সর্বমোট প্রদেয় (চার্জ সহ):</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'Inter' }}>৳{totalAmountToPay.toFixed(2)}</span>
                </div>
              </div>

              {['bkash', 'rocket', 'nagad'].includes(activeMethod) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: '0.8rem' }}>
                  <AlertCircle size={16} />
                  <span>মোবাইল ব্যাংকিং পেমেন্ট এডমিন ভেরিফাই না করা পর্যন্ত পেন্ডিং থাকবে।</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>বাতিল</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? <Loader className="animate-spin" size={16} /> : 'পেমেন্ট জমা দিন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slip / Receipt View Modal */}
      {isSlipModalOpen && selectedInvoice && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 0.2s ease-out'
        }} className="print-modal-overlay">
          <div className="card print-receipt-card" style={{
            width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
            padding: '40px', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)', position: 'relative'
          }}>
            <button 
              onClick={() => setIsSlipModalOpen(false)}
              className="no-print"
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <div className="print-area">
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>মাদরাসা ফিস ও বেতন রসিদ</h2>
                <p className="text-muted text-sm">ইনভয়েস স্লিপ</p>
              </div>

              {/* Receipt Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ marginBottom: '4px' }}><strong>ইনভয়েস নং:</strong> <span style={{ fontFamily: 'Inter' }}>{selectedInvoice.invoiceNumber}</span></div>
                  <div style={{ marginBottom: '4px' }}><strong>তারিখ:</strong> {new Date(selectedInvoice.issueDate).toLocaleDateString('bn-BD')}</div>
                  <div><strong>শেষ তারিখ:</strong> {new Date(selectedInvoice.dueDate).toLocaleDateString('bn-BD')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>ছাত্রের নাম:</strong> {selectedInvoice.student?.user ? `${selectedInvoice.student.user.firstName || ''} ${selectedInvoice.student.user.lastName || ''}`.trim() : 'অজানা'}
                  </div>
                  <div style={{ marginBottom: '4px' }}><strong>ছাত্র আইডি:</strong> <span style={{ fontFamily: 'Inter' }}>{selectedInvoice.student?.studentId}</span></div>
                  <div style={{ marginBottom: '4px' }}><strong>শ্রেণি:</strong> {selectedInvoice.student?.currentEnrollment?.classLevel?.name || '—'} ({selectedInvoice.student?.currentEnrollment?.section?.name || '—'})</div>
                  {selectedInvoice.guardian && (
                    <div><strong>অভিভাবকের নাম:</strong> {selectedInvoice.guardian.name} ({selectedInvoice.guardian.relationship})</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 0' }}>বিবরণ / ক্যাটাগরি</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 0' }}>{selectedInvoice.title}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontFamily: 'Inter' }}>{selectedInvoice.subtotal.toFixed(2)}</td>
                  </tr>
                  {selectedInvoice.fineTotal > 0 && (
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', color: 'var(--danger)' }}>জরিমানা (+)</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--danger)', fontFamily: 'Inter' }}>{selectedInvoice.fineTotal.toFixed(2)}</td>
                    </tr>
                  )}
                  {selectedInvoice.discountTotal > 0 && (
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 0', color: 'var(--success)' }}>
                        ছাড় (-) {selectedInvoice.discountType && <span style={{ fontSize: '0.8rem', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>{selectedInvoice.discountType}</span>}
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--success)', fontFamily: 'Inter' }}>{selectedInvoice.discountTotal.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: 'bold', fontSize: '1.05rem', borderBottom: '2px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 0' }}>সর্বমোট প্রদেয়</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', color: 'var(--primary)', fontFamily: 'Inter' }}>{selectedInvoice.payableTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: 'var(--success)', fontWeight: 'bold' }}>সর্বমোট পরিশোধিত (Paid Total)</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--success)', fontFamily: 'Inter', fontWeight: 'bold' }}>{selectedInvoice.paidTotal.toFixed(2)}</td>
                  </tr>
                  <tr style={{ fontWeight: 'bold' }}>
                    <td style={{ padding: '8px 0', color: 'var(--danger)' }}>বকেয়া (Balance Due)</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--danger)', fontFamily: 'Inter' }}>{selectedInvoice.balance.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Payments History Ledger */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>পরিশোধের ইতিহাস (Payment Logs)</h4>
                {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '6px 0', textAlign: 'left' }}>তারিখ</th>
                        <th style={{ padding: '6px 0', textAlign: 'left' }}>মাস</th>
                        <th style={{ padding: '6px 0', textAlign: 'left' }}>পেমেন্ট মাধ্যম</th>
                        <th style={{ padding: '6px 0', textAlign: 'left' }}>রেফারেন্স / TxnID</th>
                        <th style={{ padding: '6px 0', textAlign: 'right' }}>পরিমাণ (৳)</th>
                        <th style={{ padding: '6px 0', textAlign: 'center' }}>স্ট্যাটাস</th>
                        <th style={{ padding: '6px 0', textAlign: 'right' }}>ভেরিফায়র / স্টাফ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.payments.map((p) => {
                        const verifiedStaff = p.receivedBy ? `${p.receivedBy.firstName || ''} ${p.receivedBy.lastName || ''}`.trim() : '—';
                        return (
                          <tr key={p._id} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                            <td style={{ padding: '8px 0', fontFamily: 'Inter' }}>{new Date(p.paymentDate).toLocaleDateString('bn-BD')}</td>
                            <td style={{ padding: '8px 0' }}>{p.feeMonth}</td>
                            <td style={{ padding: '8px 0' }}>{getMethodLabel(p.method)}</td>
                            <td style={{ padding: '8px 0', fontFamily: 'Inter' }}>{p.transactionReference || '—'}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'Inter' }}>{p.amount.toFixed(2)}</td>
                            <td style={{ padding: '8px 0', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                                background: p.status === 'success' ? 'rgba(34, 197, 94, 0.12)' : p.status === 'pending' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: p.status === 'success' ? '#16a34a' : p.status === 'pending' ? '#d97706' : '#dc2626'
                              }}>
                                {p.status === 'success' ? 'সফল' : p.status === 'pending' ? 'পেন্ডিং' : 'বাতিল'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--primary)' }}>{verifiedStaff}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted text-xs" style={{ fontStyle: 'italic' }}>এখনও কোনো পেমেন্ট রেকর্ড নেই।</p>
                )}
              </div>

              {/* Status footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                <span className={`badge ${selectedInvoice.status === 'paid' ? 'badge-active' : selectedInvoice.status === 'partial' ? 'badge-warning' : 'badge-danger'}`} style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
                  {selectedInvoice.status === 'paid' ? 'সম্পূর্ণ পরিশোধিত' : selectedInvoice.status === 'partial' ? 'আংশিক পরিশোধিত' : 'পরিশোধহীন'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>রসিদ প্রিন্ট করার জন্য পাশে ক্লিক করুন।</span>
              </div>

              {/* Signature footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', width: '200px' }}>
                  <strong>প্রদানকারী / ছাত্র</strong><br/>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(স্বাক্ষর)</span>
                </div>
                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', width: '200px' }}>
                  <strong>গ্রহণকারী (Received By)</strong><br/>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(স্বাক্ষর ও সিল)</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsSlipModalOpen(false)}>
                বন্ধ করুন
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} /> প্রিন্ট রসিদ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Payment Modal */}
      {isVerifyModalOpen && selectedPendingPayment && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>পেমেন্ট ভেরিফাই করুন</h2>
              <button className="btn-icon btn-ghost" onClick={() => setIsVerifyModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form className="modal-body" onSubmit={handleVerifyPending}>
              <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                <strong>শিক্ষার্থী:</strong> {selectedPendingPayment.student?.user?.firstName} {selectedPendingPayment.student?.user?.lastName} <br />
                <strong>পরিমাণ:</strong> ৳ {selectedPendingPayment.amount?.toLocaleString('en-IN')} <br />
                <strong>মাধ্যম:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedPendingPayment.method}</span> <br />
                <strong>TxnID:</strong> {selectedPendingPayment.transactionReference}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>জমা ফান্ড (Debit Account) *</label>
                  <select
                    className="form-input"
                    value={verifyForm.fundAccount}
                    onChange={(e) => setVerifyForm({ ...verifyForm, fundAccount: e.target.value })}
                    required
                  >
                    <option value="">-- ফান্ড নির্বাচন করুন --</option>
                    {accounts.filter(a => a.type === 'Asset').map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>আয়ের খাত (Credit Account) *</label>
                  <select
                    className="form-input"
                    value={verifyForm.revenueAccount}
                    onChange={(e) => setVerifyForm({ ...verifyForm, revenueAccount: e.target.value })}
                    required
                  >
                    <option value="">-- আয়ের খাত নির্বাচন করুন --</option>
                    {accounts.filter(a => a.type === 'Revenue').map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsVerifyModalOpen(false)}>বাতিল</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? <Loader className="animate-spin" size={16} /> : 'ভেরিফাই করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scoped CSS styling */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.12) !important;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            background: none !important;
            backdrop-filter: none !important;
            display: block !important;
            width: 100% !important;
          }
          .print-receipt-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            position: static !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
