import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2, Wallet, TrendingDown, TrendingUp, AlertCircle,
  Send, Plus, Eye, Receipt, UserPlus, UploadCloud,
  CheckCircle2, Clock, Check, X, FileText, ChevronRight, FileWarning, Search, Box, CheckCircle, FileDown, FileSpreadsheet, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppConfirm } from '@/components/app/AppConfirmProvider';
import { getStoredUser, normalizeUserRole } from '@/lib/auth-session';
import { DepartmentFinanceSkeleton } from '@/components/ui/Skeleton';
import { createReport } from '@/services/reports';
import {
  getDepartmentFinanceData,
  importFinanceSnapshot,
  resetRejectedAnnualBudget,
  sendReminder,
  submitBudgetRequest,
  submitVendor,
  updateMonthlyExpenseStatus,
  uploadInvoice,
} from '@/services/finance';
import { downloadReportFile } from '@/utils/report-download';
import { extractDepartmentLabel, titleCase } from '@/utils/user-helpers';
import { DEFAULT_FISCAL_YEAR, getFiscalYearOptions } from '@/features/finance/utils/fiscalYear';
import { statusPillClass } from '@/lib/status-pill';
import PageFrame from '@/components/Pages/PageFrame';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VendorData {
  id: string;
  importKey: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  category: string;
  gstin: string;
  panNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  website: string;
  notes: string;
  createdAtLabel: string;
}

interface ExpenseData {
  id: string;
  importKey: string;
  title: string;
  description: string;
  details: string;
  justificationDetails: string;
  projectedAmount: number;
  actualSpent: number;
  variance: number;
  status: string;
  paymentStatus: string;
  invoiceNumber: string;
  invoiceUrl: string;
  invoiceFile: string;
  invoiceDate: string;
  expenseTag: string;
}

interface MonthlyPlan {
  month: string;
  monthKey: string;
  title: string;
  projectedAmount: number;
  actualSpent: number;
  status: string;
  expenses: ExpenseData[];
}

interface BudgetRequest {
  id: string;
  department: string;
  requestedBudget: number;
  previousSpend: number;
  status: string;
  reason: string;
  breakdown: string;
  approvalFlow: any;
  createdAt: string;
}

interface DepartmentFinanceData {
  department: string;
  fiscalYear: string;
  annualBudgetRequested: number;
  approvedAnnualBudget: number;
  previousSpend: number;
  totalSpentYTD: number;
  remainingBalance: number;
  healthStatus: string;
  monthlyPlan: MonthlyPlan[];
  vendors: VendorData[];
  annualRequest: BudgetRequest | null;
  recentActivity: any[];
  status: string;
  notes: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const monthKeys = [
  'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar',
];

const monthLabels: Record<string, string> = {
  apr: 'April', may: 'May', jun: 'June', jul: 'July', aug: 'August', sep: 'September',
  oct: 'October', nov: 'November', dec: 'December', jan: 'January', feb: 'February', mar: 'March',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function DepartmentFinancePageV2() {
  const currentUser = getStoredUser();
  const userRole = normalizeUserRole(currentUser?.workspaceMembership?.role || currentUser?.role || '');
  const departmentLabel = extractDepartmentLabel(currentUser?.department || currentUser?.workspaceMembership?.department || '');
  const fiscalYearOptions = getFiscalYearOptions();
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useAppConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFY, setSelectedFY] = useState(DEFAULT_FISCAL_YEAR);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [financeData, setFinanceData] = useState<DepartmentFinanceData | null>(null);
  const [annualRequests, setAnnualRequests] = useState<BudgetRequest[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyPlan[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);

  // Modal state
  const [viewingExpense, setViewingExpense] = useState<{ month: MonthlyPlan; expense: ExpenseData } | null>(null);
  const [viewingVendor, setViewingVendor] = useState<VendorData | null>(null);
  const [showBudgetRequestForm, setShowBudgetRequestForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form state
  const [budgetRequestAmount, setBudgetRequestAmount] = useState('');
  const [budgetRequestReason, setBudgetRequestReason] = useState('');
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);

  const [vendorForm, setVendorForm] = useState({
    name: '', contactPerson: '', phone: '', email: '', address: '',
    paymentTerms: '', category: '', gstin: '', panNumber: '',
    bankName: '', accountName: '', accountNumber: '', ifscCode: '', upiId: '',
    website: '', notes: '',
  });
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isResettingBudget, setIsResettingBudget] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── Data Loading ───────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await getDepartmentFinanceData(selectedFY, departmentLabel);
        if (!isMounted) return;
        const data = response?.data || response || {};
        setFinanceData(data);
        setAnnualRequests(Array.isArray(data.annualRequests) ? data.annualRequests : []);
        setMonthlyExpenses(Array.isArray(data.monthlyPlan) ? data.monthlyPlan : []);
        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
      } catch (error: any) {
        if (isMounted) setErrorMessage(error?.message || 'Failed to load department finance data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [selectedFY, departmentLabel, refreshKey]);

  // ─── Computed ───────────────────────────────────────────────────────────

  const totalProjected = useMemo(
    () => monthlyExpenses.reduce((sum, m) => sum + Number(m.projectedAmount || 0), 0),
    [monthlyExpenses],
  );

  const totalActual = useMemo(
    () => monthlyExpenses.reduce((sum, m) => sum + Number(m.actualSpent || 0), 0),
    [monthlyExpenses],
  );

  const remainingBudget = useMemo(
    () => (financeData?.approvedAnnualBudget || 0) - totalActual,
    [financeData, totalActual],
  );

  const approvedBudget = financeData?.approvedAnnualBudget || 0;

  const filteredMonthlyExpenses = useMemo(() => {
    if (!searchQuery.trim()) return monthlyExpenses;
    const q = searchQuery.toLowerCase();
    return monthlyExpenses.filter(
      (m) =>
        m.title?.toLowerCase().includes(q) ||
        m.month?.toLowerCase().includes(q) ||
        m.monthKey?.toLowerCase().includes(q) ||
        m.expenses?.some((e) => e.title?.toLowerCase().includes(q)),
    );
  }, [monthlyExpenses, searchQuery]);

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.contactPerson?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q),
    );
  }, [vendors, searchQuery]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSubmitBudgetRequest = async () => {
    if (!budgetRequestAmount || Number(budgetRequestAmount) <= 0) {
      toast.error('Please enter a valid budget amount.');
      return;
    }
    setIsSubmittingBudget(true);
    try {
      await submitBudgetRequest({
        fiscalYear: selectedFY,
        department: departmentLabel,
        requestedBudget: Number(budgetRequestAmount),
        reason: budgetRequestReason,
      });
      toast.success('Budget request submitted successfully.');
      setShowBudgetRequestForm(false);
      setBudgetRequestAmount('');
      setBudgetRequestReason('');
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit budget request.');
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  const handleSubmitVendor = async () => {
    if (!vendorForm.name.trim()) {
      toast.error('Vendor name is required.');
      return;
    }
    setIsSubmittingVendor(true);
    try {
      await submitVendor({
        fiscalYear: selectedFY,
        department: departmentLabel,
        ...vendorForm,
      });
      toast.success('Vendor registered successfully.');
      setShowVendorForm(false);
      setVendorForm({
        name: '', contactPerson: '', phone: '', email: '', address: '',
        paymentTerms: '', category: '', gstin: '', panNumber: '',
        bankName: '', accountName: '', accountNumber: '', ifscCode: '', upiId: '',
        website: '', notes: '',
      });
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to register vendor.');
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  const handleImportFile = async () => {
    if (!importFile) {
      toast.error('Please select a file to import.');
      return;
    }
    setIsImporting(true);
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      await importFinanceSnapshot({
        fiscalYear: selectedFY,
        department: departmentLabel,
        records: jsonData,
      });
      toast.success(`Imported ${jsonData.length} records successfully.`);
      setShowImportModal(false);
      setImportFile(null);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to import data.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleMarkPaid = async (month: MonthlyPlan, expense: ExpenseData) => {
    try {
      await updateMonthlyExpenseStatus({
        fiscalYear: selectedFY,
        monthKey: month.monthKey,
        expenseId: expense.id,
        status: 'Paid',
      });
      toast.success('Expense marked as paid.');
      setViewingExpense(null);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update payment status.');
    }
  };

  const handleSendReminder = async () => {
    setIsSendingReminder(true);
    try {
      await sendReminder({ fiscalYear: selectedFY, department: departmentLabel });
      toast.success('Reminder sent to finance team.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send reminder.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleResetRejectedBudget = async () => {
    const ok = await confirm({
      title: 'Reset Rejected Budget',
      message: 'This will reset your rejected annual budget request so you can resubmit. Continue?',
      confirmLabel: 'Reset',
    });
    if (!ok) return;
    setIsResettingBudget(true);
    try {
      await resetRejectedAnnualBudget({ fiscalYear: selectedFY, department: departmentLabel });
      toast.success('Budget request reset. You can now resubmit.');
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset budget request.');
    } finally {
      setIsResettingBudget(false);
    }
  };

  const handleUploadInvoice = async (month: MonthlyPlan, expense: ExpenseData, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fiscalYear', selectedFY);
      formData.append('monthKey', month.monthKey);
      formData.append('expenseId', expense.id);
      formData.append('department', departmentLabel);
      await uploadInvoice(formData);
      toast.success('Invoice uploaded successfully.');
      setViewingExpense(null);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload invoice.');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const payload = {
        type: 'department-finance',
        department: departmentLabel,
        fiscalYear: selectedFY,
        data: { financeData, monthlyExpenses, vendors },
      };
      const response = await createReport(payload);
      const downloadUrl = response?.data?.downloadUrl || response?.downloadUrl;
      if (downloadUrl) {
        await downloadReportFile(downloadUrl);
        toast.success('Report downloaded.');
      } else {
        toast.success('Report generated successfully.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate report.');
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────

  if (isLoading) return <DepartmentFinanceSkeleton />;

  // ─── Render ─────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'expenses', label: 'Monthly Expenses' },
    { key: 'budget', label: 'Budget Requests' },
    { key: 'vendors', label: 'Vendors' },
  ];

  const isBudgetRejected = financeData?.status?.toLowerCase() === 'rejected';
  const isBudgetPending = financeData?.status?.toLowerCase() === 'pending';
  const isBudgetApproved = financeData?.status?.toLowerCase() === 'approved';

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                <Building2 size={18} className="text-[#2563EB]" />
                Department Finance
              </h2>
              <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-1">
                {departmentLabel} &middot; {selectedFY}
              </p>
              {financeData?.healthStatus && (
                <span className={statusPillClass(financeData.healthStatus)}>
                  {financeData.healthStatus}
                </span>
              )}
            </div>
            {errorMessage && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-semibold border border-red-200">
                {errorMessage}
              </div>
            )}
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Approved Budget</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(approvedBudget)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Wallet size={16} /></div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Spent (YTD)</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalActual)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><TrendingUp size={16} /></div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Projected</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalProjected)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><TrendingDown size={16} /></div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(remainingBudget)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Box size={16} /></div>
            </div>
          </div>

          {/* REJECTED BANNER */}
          {isBudgetRejected && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700 flex items-center gap-3">
              <AlertCircle size={18} className="shrink-0" />
              <div className="flex-1">
                <span className="font-black">Budget Request Rejected</span> — Your annual budget request was rejected. You can reset and resubmit.
              </div>
              <button
                onClick={handleResetRejectedBudget}
                disabled={isResettingBudget}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[10px] font-pmedium uppercase tracking-wider hover:bg-rose-50 transition-all shrink-0"
              >
                {isResettingBudget ? 'Resetting...' : 'Reset & Resubmit'}
              </button>
            </div>
          )}

          {/* PENDING BANNER */}
          {isBudgetPending && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-bold text-amber-700 flex items-center gap-3">
              <Clock size={18} className="shrink-0" />
              <div className="flex-1">
                <span className="font-black">Budget Request Pending</span> — Your annual budget request is awaiting approval.
              </div>
              <button
                onClick={handleSendReminder}
                disabled={isSendingReminder}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-[10px] font-pmedium uppercase tracking-wider hover:bg-amber-50 transition-all shrink-0 flex items-center gap-1.5"
              >
                <Send size={12} /> {isSendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            </div>
          )}

          {/* TAB CONTENT */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* INNER TABS & ACTION BAR */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden w-full xl:w-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      activeTab === tab.key
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text" placeholder="Search..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                  <select
                    value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                  >
                    {fiscalYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowBudgetRequestForm(true)}
                  disabled={isBudgetPending}
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Budget Request
                </button>
                <button
                  onClick={() => setShowVendorForm(true)}
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                >
                  <UserPlus size={14} /> Add Vendor
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                  title="Export Report"
                >
                  <FileDown size={15} />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">Export</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-blue-50 hover:border-blue-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                  title="Import Data"
                >
                  <FileSpreadsheet size={15} />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-[#2563EB] text-white px-1.5 py-0.5 rounded">Import</span>
                </button>
              </div>
            </div>
            {activeTab === 'overview' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Budget Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3 mb-4">
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Wallet size={16} /></span>
                      <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Budget Summary</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-pmedium text-slate-500">Approved Annual Budget</span>
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(approvedBudget)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-pmedium text-slate-500">Total Spent (YTD)</span>
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(totalActual)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-pmedium text-slate-500">Projected Spend</span>
                        <span className="text-sm font-bold text-amber-600">{formatCurrency(totalProjected)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                        <span className="text-xs font-pmedium text-slate-700">Remaining Balance</span>
                        <span className={`text-sm font-bold ${remainingBudget >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(remainingBudget)}
                        </span>
                      </div>
                      {approvedBudget > 0 && (
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${totalActual / approvedBudget > 0.9 ? 'bg-red-500' : totalActual / approvedBudget > 0.75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min((totalActual / approvedBudget) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Budget Request Status */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3 mb-4">
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><FileText size={16} /></span>
                      <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Annual Budget Request</span>
                    </h4>
                    {financeData?.annualRequest ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-pmedium text-slate-500">Requested Amount</span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(financeData.annualRequest.requestedBudget)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-pmedium text-slate-500">Previous Year Spend</span>
                          <span className="text-sm font-bold text-slate-500">
                            {formatCurrency(financeData.annualRequest.previousSpend)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-pmedium text-slate-500">Status</span>
                          <span className={statusPillClass(financeData.annualRequest.status)}>
                            {financeData.annualRequest.status}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400 font-pmedium">No budget request submitted yet.</p>
                        <button
                          onClick={() => setShowBudgetRequestForm(true)}
                          className="mt-3 px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-pmedium uppercase hover:bg-blue-700 transition-colors"
                        >
                          Submit Request
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Overview */}
                <div className="mt-6">
                  <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3 mb-4">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Receipt size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Monthly Overview</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                      <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                        <tr>
                          <th className="px-5 py-4">Month</th>
                          <th className="px-5 py-4">Projected</th>
                          <th className="px-5 py-4">Actual Spent</th>
                          <th className="px-5 py-4">Variance</th>
                          <th className="px-5 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {monthlyExpenses.map((month) => {
                          const variance = Number(month.projectedAmount || 0) - Number(month.actualSpent || 0);
                          return (
                            <tr key={month.monthKey} className="hover:bg-blue-50/30 transition-all">
                              <td className="px-5 py-4 font-pmedium text-slate-900">{monthLabels[month.monthKey] || month.month}</td>
                              <td className="px-5 py-4 font-pmedium text-slate-700">{formatCurrency(month.projectedAmount)}</td>
                              <td className="px-5 py-4 font-pmedium text-slate-700">{formatCurrency(month.actualSpent)}</td>
                              <td className="px-5 py-4 font-pmedium">
                                <span className={variance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                  {formatCurrency(Math.abs(variance))} {variance >= 0 ? 'under' : 'over'}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={statusPillClass(month.status)}>{month.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                        {monthlyExpenses.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-semibold">
                              No monthly data available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MONTHLY EXPENSES TAB */}
            {activeTab === 'expenses' && (
              <div className="flex flex-col h-full">
                <div className="p-3 sm:p-4 border-b border-slate-100/60 bg-slate-50/50">
                  <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search expenses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left min-w-[900px]">
                    <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-5 py-4">Month</th>
                        <th className="px-5 py-4">Expense Title</th>
                        <th className="px-5 py-4">Projected</th>
                        <th className="px-5 py-4">Actual</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Payment</th>
                        <th className="px-5 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {filteredMonthlyExpenses.flatMap((month) =>
                        month.expenses && month.expenses.length > 0
                          ? month.expenses.map((expense) => (
                              <tr key={`${month.monthKey}-${expense.id}`} className="hover:bg-blue-50/30 transition-all">
                                <td className="px-5 py-4 font-pmedium text-slate-900">{monthLabels[month.monthKey] || month.month}</td>
                                <td className="px-5 py-4">
                                  <div className="font-pmedium text-slate-900">{expense.title || 'Untitled'}</div>
                                  {expense.invoiceNumber && (
                                    <div className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest mt-0.5">
                                      INV: {expense.invoiceNumber}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-4 font-pmedium text-slate-700">{formatCurrency(expense.projectedAmount)}</td>
                                <td className="px-5 py-4 font-pmedium text-slate-700">{formatCurrency(expense.actualSpent)}</td>
                                <td className="px-5 py-4">
                                  <span className={statusPillClass(expense.status)}>{expense.status || 'Pending'}</span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={statusPillClass(expense.paymentStatus)}>{expense.paymentStatus || 'Unpaid'}</span>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <button
                                    onClick={() => setViewingExpense({ month, expense })}
                                    className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                                    title="View Details"
                                  >
                                    <Eye size={15} strokeWidth={2.5} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          : [
                              <tr key={`empty-${month.monthKey}`} className="hover:bg-blue-50/30 transition-all">
                                <td className="px-5 py-4 font-pmedium text-slate-900">{monthLabels[month.monthKey] || month.month}</td>
                                <td colSpan={5} className="px-5 py-4 text-slate-400 font-pmedium text-xs">No expenses recorded</td>
                                <td className="px-5 py-4 text-center">
                                  <span className={statusPillClass(month.status)}>{month.status}</span>
                                </td>
                              </tr>,
                            ]
                      )}
                      {filteredMonthlyExpenses.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-semibold">
                            No expenses found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BUDGET REQUESTS TAB */}
            {activeTab === 'budget' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><FileText size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Annual Budget Request</span>
                  </h4>
                  {!isBudgetPending && !isBudgetApproved && (
                    <button
                      onClick={() => setShowBudgetRequestForm(true)}
                      className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Plus size={14} /> New Request
                    </button>
                  )}
                </div>

                {financeData?.annualRequest ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Requested</p>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(financeData.annualRequest.requestedBudget)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Previous Spend</p>
                        <p className="text-lg font-black text-slate-500">{formatCurrency(financeData.annualRequest.previousSpend)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Status</p>
                        <span className={statusPillClass(financeData.annualRequest.status)}>
                          {financeData.annualRequest.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Submitted</p>
                        <p className="text-sm font-pmedium text-slate-700">{financeData.annualRequest.createdAt || 'N/A'}</p>
                      </div>
                    </div>
                    {financeData.annualRequest.reason && (
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Justification</p>
                        <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 italic">
                          "{financeData.annualRequest.reason}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
                      <FileText className="text-slate-400" size={24} />
                    </div>
                    <p className="text-slate-500 font-pmedium mb-1">No budget request submitted for this fiscal year.</p>
                    <p className="text-slate-400 text-[13px] mb-4">Submit a budget request to get started.</p>
                    <button
                      onClick={() => setShowBudgetRequestForm(true)}
                      className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 mx-auto"
                    >
                      Submit Budget Request
                    </button>
                  </div>
                )}

                {annualRequests.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-[12px] font-pmedium text-slate-700 uppercase tracking-widest mb-3">Request History</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                          <tr>
                            <th className="px-5 py-4">Amount</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                          {annualRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-blue-50/30 transition-all">
                              <td className="px-5 py-4 font-pmedium text-slate-900">{formatCurrency(req.requestedBudget)}</td>
                              <td className="px-5 py-4">
                                <span className={statusPillClass(req.status)}>{req.status}</span>
                              </td>
                              <td className="px-5 py-4 text-xs text-slate-600 max-w-[300px] truncate">{req.reason || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VENDORS TAB */}
            {activeTab === 'vendors' && (
              <div className="flex flex-col h-full">
                <div className="p-3 sm:p-4 border-b border-slate-100/60 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    onClick={() => setShowVendorForm(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-pmedium text-xs uppercase hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <UserPlus size={14} /> Add Vendor
                  </button>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-5 py-4">Vendor Name</th>
                        <th className="px-5 py-4">Contact Person</th>
                        <th className="px-5 py-4">Phone</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4">Payment Terms</th>
                        <th className="px-5 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {filteredVendors.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-blue-50/30 transition-all">
                          <td className="px-5 py-4">
                            <div className="font-pmedium text-slate-900">{vendor.name}</div>
                            {vendor.email && <div className="text-[9px] text-slate-400 mt-0.5">{vendor.email}</div>}
                          </td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{vendor.contactPerson || '-'}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{vendor.phone || '-'}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{vendor.category || '-'}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{vendor.paymentTerms || '-'}</td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => setViewingVendor(vendor)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredVendors.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">
                            No vendors registered.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageFrame>

      {/* ═══════════════════════════ MODALS ═══════════════════════════ */}

      {/* Expense Detail Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Receipt size={20} className="text-[#2563EB]" /> Expense Details
              </h2>
              <button onClick={() => setViewingExpense(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto bg-white space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Month</p>
                  <p className="text-lg font-black text-slate-900">
                    {monthLabels[viewingExpense.month.monthKey] || viewingExpense.month.month}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Status</p>
                  <span className={statusPillClass(viewingExpense.expense.status)}>
                    {viewingExpense.expense.status || 'Pending'}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Title</p>
                  <p className="text-sm font-bold text-slate-900">{viewingExpense.expense.title || 'Untitled'}</p>
                </div>
                {viewingExpense.expense.description && (
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Description</p>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {viewingExpense.expense.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Projected</p>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(viewingExpense.expense.projectedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Actual Spent</p>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(viewingExpense.expense.actualSpent)}</p>
                  </div>
                </div>
                {viewingExpense.expense.invoiceNumber && (
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Invoice Number</p>
                    <p className="text-sm font-bold text-slate-900">{viewingExpense.expense.invoiceNumber}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex gap-3 sm:gap-4 shrink-0">
              {viewingExpense.expense.paymentStatus !== 'Paid' && (
                <button
                  onClick={() => handleMarkPaid(viewingExpense.month, viewingExpense.expense)}
                  className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Mark as Paid
                </button>
              )}
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.jpg,.jpeg,.png';
                  input.onchange = (e: any) => {
                    const file = e.target?.files?.[0];
                    if (file) handleUploadInvoice(viewingExpense.month, viewingExpense.expense, file);
                  };
                  input.click();
                }}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <UploadCloud size={14} /> Upload Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Detail Modal */}
      {viewingVendor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <UserPlus size={20} className="text-emerald-600" /> {viewingVendor.name}
              </h2>
              <button onClick={() => setViewingVendor(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto bg-white space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Contact Person', value: viewingVendor.contactPerson },
                  { label: 'Phone', value: viewingVendor.phone },
                  { label: 'Email', value: viewingVendor.email },
                  { label: 'Address', value: viewingVendor.address },
                  { label: 'Category', value: viewingVendor.category },
                  { label: 'Payment Terms', value: viewingVendor.paymentTerms },
                  { label: 'GSTIN', value: viewingVendor.gstin },
                  { label: 'PAN', value: viewingVendor.panNumber },
                  { label: 'Bank Name', value: viewingVendor.bankName },
                  { label: 'Account Name', value: viewingVendor.accountName },
                  { label: 'Account Number', value: viewingVendor.accountNumber },
                  { label: 'IFSC', value: viewingVendor.ifscCode },
                  { label: 'UPI ID', value: viewingVendor.upiId },
                  { label: 'Website', value: viewingVendor.website },
                ].filter((f) => f.value).map((field) => (
                  <div key={field.label}>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">{field.label}</p>
                    <p className="text-sm font-bold text-slate-900">{field.value}</p>
                  </div>
                ))}
              </div>
              {viewingVendor.notes && (
                <div className="mt-4">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">{viewingVendor.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Budget Request Form Modal */}
      {showBudgetRequestForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-[#2563EB]" /> Submit Budget Request
              </h2>
              <button onClick={() => setShowBudgetRequestForm(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 space-y-5">
              <div>
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1 block">Requested Amount (INR)</label>
                <input
                  type="number"
                  value={budgetRequestAmount}
                  onChange={(e) => setBudgetRequestAmount(e.target.value)}
                  placeholder="Enter budget amount"
                  className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1 block">Justification / Reason</label>
                <textarea
                  value={budgetRequestReason}
                  onChange={(e) => setBudgetRequestReason(e.target.value)}
                  placeholder="Explain why this budget is needed"
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex gap-3 sm:gap-4 shrink-0">
              <button
                onClick={() => setShowBudgetRequestForm(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBudgetRequest}
                disabled={isSubmittingBudget}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingBudget ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Form Modal */}
      {showVendorForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <UserPlus size={20} className="text-emerald-600" /> Add Vendor
              </h2>
              <button onClick={() => setShowVendorForm(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Vendor Name *', type: 'text' },
                  { key: 'contactPerson', label: 'Contact Person', type: 'text' },
                  { key: 'phone', label: 'Phone', type: 'text' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { key: 'category', label: 'Category', type: 'text' },
                  { key: 'paymentTerms', label: 'Payment Terms', type: 'text' },
                  { key: 'gstin', label: 'GSTIN', type: 'text' },
                  { key: 'panNumber', label: 'PAN Number', type: 'text' },
                  { key: 'bankName', label: 'Bank Name', type: 'text' },
                  { key: 'accountName', label: 'Account Name', type: 'text' },
                  { key: 'accountNumber', label: 'Account Number', type: 'text' },
                  { key: 'ifscCode', label: 'IFSC Code', type: 'text' },
                  { key: 'upiId', label: 'UPI ID', type: 'text' },
                  { key: 'website', label: 'Website', type: 'text' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1 block">{field.label}</label>
                    <input
                      type={field.type}
                      value={(vendorForm as any)[field.key]}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1 block">Address</label>
                <textarea
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1 block">Notes</label>
                <textarea
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex gap-3 sm:gap-4 shrink-0">
              <button
                onClick={() => setShowVendorForm(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitVendor}
                disabled={isSubmittingVendor}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingVendor ? 'Registering...' : 'Register Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-[#2563EB]" /> Import Finance Data
              </h2>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 space-y-5">
              <p className="text-xs text-slate-600">
                Upload an Excel or CSV file with your department's finance data. Columns will be mapped to expenses, budgets, or vendors based on headers.
              </p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-[#2563EB] hover:bg-blue-50/30 transition-all"
              >
                <FileSpreadsheet size={32} className="mx-auto text-slate-400 mb-2" />
                {importFile ? (
                  <p className="text-sm font-bold text-slate-900">{importFile.name}</p>
                ) : (
                  <p className="text-xs text-slate-500">Click to select a file (.xlsx, .csv)</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex gap-3 sm:gap-4 shrink-0">
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); }}
                className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImportFile}
                disabled={isImporting || !importFile}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <UploadCloud size={14} /> {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentFinancePageV2;
