import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Wallet, TrendingDown, TrendingUp, AlertCircle,
  Send, Plus, Eye, Receipt, UserPlus, UploadCloud,
  CheckCircle2, Clock, Check, Loader2, X, FileText, FileWarning, Search, FileDown, FileSpreadsheet, Calendar
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
  submitExtraBudget,
  submitVendor,
  updateMonthlyExpenseStatus,
  uploadInvoice,
} from '@/services/finance';
import { downloadReportFile } from '@/utils/report-download';
import { extractDepartmentLabel, titleCase } from '@/utils/user-helpers';
import { DEFAULT_FISCAL_YEAR, getFiscalYearOptions } from '@/features/finance/utils/fiscalYear';
import { statusPillClass } from '@/lib/status-pill';
import PageFrame from '@/components/Pages/PageFrame';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency, getWorkspaceCurrencySymbol } from '@/lib/workspaceLocalization';

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
  vendorId?: string;
  vendorName?: string;
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

interface ExtraBudgetRequest {
  id: string;
  month: string;
  monthKey: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface DraftExpense {
  id: string;
  title: string;
  projectedAmount: number;
  dueDate: string;
  description: string;
}

interface DraftMonth {
  id: string;
  month: string;
  monthKey: string;
  title: string;
  expenses: DraftExpense[];
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
  extraRequests: ExtraBudgetRequest[];
  recentActivity: any[];
  status: string;
  notes: string;
  plan?: { _id?: string } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const monthKeys = [
  'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar',
];

const monthLabels: Record<string, string> = {
  apr: 'April', may: 'May', jun: 'June', jul: 'July', aug: 'August', sep: 'September',
  oct: 'October', nov: 'November', dec: 'December', jan: 'January', feb: 'February', mar: 'March',
};

const generateId = () => Math.random().toString(36).substring(2, 9).toUpperCase();

// ─── Component ──────────────────────────────────────────────────────────────

export function DepartmentFinancePageV2() {
  const currentUser = getStoredUser();
  const userRole = normalizeUserRole(currentUser?.workspaceMembership?.role || currentUser?.role || '');
  const storedDepartment =
    currentUser?.department ||
    currentUser?.workspaceMembership?.department ||
    currentUser?.workspaceMembership?.departments?.[0]?.name ||
    currentUser?.workspaceMembership?.departments?.[0]?.label ||
    currentUser?.workspaceMembership?.departments?.[0] ||
    '';
  const departmentLabel = extractDepartmentLabel(
    typeof storedDepartment === 'string' ? storedDepartment : storedDepartment?.name || storedDepartment?.label || '',
  );
  const fiscalYearOptions = getFiscalYearOptions();
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useAppConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspacePreferences = useWorkspacePreferences();
  const currency = workspacePreferences.currency;
  const currencySymbol = getWorkspaceCurrencySymbol(currency);
  const formatCurrency = (amount: number) =>
    formatWorkspaceCurrency(Number(amount || 0), currency, { maximumFractionDigits: 0 });

  const [selectedFY, setSelectedFY] = useState(DEFAULT_FISCAL_YEAR);
  const [activeTab, setActiveTab] = useState('projected');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [financeData, setFinanceData] = useState<DepartmentFinanceData | null>(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyPlan[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [extraRequests, setExtraRequests] = useState<ExtraBudgetRequest[]>([]);

  // Modal state
  const [viewingExpense, setViewingExpense] = useState<{ month: MonthlyPlan; expense: ExpenseData } | null>(null);
  const [viewingVendor, setViewingVendor] = useState<VendorData | null>(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExtraBudgetForm, setShowExtraBudgetForm] = useState(false);
  const [showVendorList, setShowVendorList] = useState(false);
  const [selectedVendorToLink, setSelectedVendorToLink] = useState('');
  const [actualAmountToPay, setActualAmountToPay] = useState('');
  const [isLinkingVendor, setIsLinkingVendor] = useState(false);

  // Draft annual budget builder (month-by-month, pre-submission)
  const [draftMonths, setDraftMonths] = useState<DraftMonth[]>([]);
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);

  const [extraBudgetForm, setExtraBudgetForm] = useState({ monthKey: '', amount: '', reason: '' });
  const [isSubmittingExtraBudget, setIsSubmittingExtraBudget] = useState(false);

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
        setMonthlyExpenses(Array.isArray(data.monthlyPlan) ? data.monthlyPlan : []);
        if (!data.annualRequest && Array.isArray(data.monthlyPlan)) {
          setDraftMonths(data.monthlyPlan.map((month: any, index: number) => ({
            id: String(month?.monthKey || month?.month || index),
            month: String(month?.month || monthLabels[month?.monthKey] || ''),
            monthKey: String(month?.monthKey || month?.month || ''),
            title: String(month?.title || ''),
            expenses: (Array.isArray(month?.expenses) ? month.expenses : []).map((expense: any, expenseIndex: number) => ({
              id: String(expense?.id || expense?.expenseKey || `${index}-${expenseIndex}`),
              title: String(expense?.title || expense?.expenseLabel || ''),
              projectedAmount: Number(expense?.projectedAmount || 0),
              dueDate: String(expense?.dueDate || ''),
              description: String(expense?.description || expense?.details || ''),
            })),
          })));
        } else {
          setDraftMonths([]);
        }
        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
        setExtraRequests(Array.isArray(data.extraRequests) ? data.extraRequests : []);
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

  const paidExpenseHistory = useMemo(() => {
    const rows: { month: MonthlyPlan; expense: ExpenseData }[] = [];
    monthlyExpenses.forEach((month) => {
      (month.expenses || []).forEach((expense) => {
        if (String(expense.paymentStatus || expense.status || '').toLowerCase() === 'paid') {
          rows.push({ month, expense });
        }
      });
    });
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      ({ month, expense }) =>
        expense.title?.toLowerCase().includes(q) ||
        month.month?.toLowerCase().includes(q) ||
        expense.invoiceNumber?.toLowerCase().includes(q),
    );
  }, [monthlyExpenses, searchQuery]);

  const totalSavings = useMemo(
    () =>
      monthlyExpenses.reduce(
        (sum, m) =>
          sum +
          (m.expenses || []).reduce(
            (s, e) => s + Math.max(0, Number(e.projectedAmount || 0) - Number(e.actualSpent || 0)),
            0,
          ),
        0,
      ),
    [monthlyExpenses],
  );

  const invoicePendingCount = useMemo(() => {
    let count = 0;
    monthlyExpenses.forEach((month) => {
      (month.expenses || []).forEach((expense) => {
        if (expense.status === 'Paid' && !expense.invoiceUrl) count += 1;
      });
    });
    return count;
  }, [monthlyExpenses]);

  const extraRequestsFiltered = useMemo(() => {
    if (!searchQuery.trim()) return extraRequests;
    const q = searchQuery.toLowerCase();
    return extraRequests.filter(
      (r) =>
        r.reason?.toLowerCase().includes(q) ||
        r.month?.toLowerCase().includes(q) ||
        r.monthKey?.toLowerCase().includes(q),
    );
  }, [extraRequests, searchQuery]);

  const totalExtraRequested = useMemo(
    () => extraRequests.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [extraRequests],
  );
  const approvedExtraRequests = useMemo(
    () => extraRequests.filter((r) => r.status?.toLowerCase() === 'approved'),
    [extraRequests],
  );
  const pendingExtraRequests = useMemo(
    () => extraRequests.filter((r) => r.status?.toLowerCase() === 'pending'),
    [extraRequests],
  );
  const approvedExtraTotal = useMemo(
    () => approvedExtraRequests.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [approvedExtraRequests],
  );

  const totalPaidHistory = useMemo(
    () => paidExpenseHistory.reduce((sum, { expense }) => sum + Number(expense.actualSpent || 0), 0),
    [paidExpenseHistory],
  );
  const invoicedHistoryCount = useMemo(
    () => paidExpenseHistory.filter(({ expense }) => Boolean(expense.invoiceUrl)).length,
    [paidExpenseHistory],
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleAddMonth = () => {
    const usedMonths = new Set(draftMonths.map((m) => m.month.toLowerCase()));
    const nextKey = monthKeys.find((key) => !usedMonths.has(monthLabels[key].toLowerCase()));
    if (!nextKey) {
      toast.info('All fiscal months are already added.');
      return;
    }
    setDraftMonths((prev) => [
      ...prev,
      { id: generateId(), month: monthLabels[nextKey], monthKey: nextKey, title: 'Untitled Budget', expenses: [] },
    ]);
  };

  const updateDraftMonthField = (monthId: string, field: 'month' | 'title', value: string) => {
    setDraftMonths((prev) =>
      prev.map((m) =>
        m.id === monthId
          ? {
              ...m,
              [field]: value,
              ...(field === 'month'
                ? { monthKey: monthKeys.find((key) => monthLabels[key] === value) || m.monthKey }
                : {}),
            }
          : m,
      ),
    );
  };

  const handleAddExpenseToMonth = (monthId: string) => {
    setDraftMonths((prev) =>
      prev.map((m) =>
        m.id === monthId
          ? { ...m, expenses: [...m.expenses, { id: generateId(), title: '', projectedAmount: 0, dueDate: '', description: '' }] }
          : m,
      ),
    );
  };

  const updateDraftExpenseField = (monthId: string, expenseId: string, field: keyof DraftExpense, value: string) => {
    setDraftMonths((prev) =>
      prev.map((m) =>
        m.id === monthId
          ? {
              ...m,
              expenses: m.expenses.map((e) =>
                e.id === expenseId ? { ...e, [field]: field === 'projectedAmount' ? Number(value || 0) : value } : e,
              ),
            }
          : m,
      ),
    );
  };

  const removeDraftExpense = (monthId: string, expenseId: string) => {
    setDraftMonths((prev) =>
      prev.map((m) => (m.id === monthId ? { ...m, expenses: m.expenses.filter((e) => e.id !== expenseId) } : m)),
    );
  };

  const handleSubmitAnnualBudget = async () => {
    if (draftMonths.length === 0 || draftMonths.some((m) => m.expenses.length === 0)) {
      toast.error('Please add at least one expense to all months before submitting.');
      return;
    }
    const invalidExpense = draftMonths
      .flatMap((m) => m.expenses.map((e) => ({ month: m.month, expense: e })))
      .find(({ expense }) => !expense.title.trim() || expense.projectedAmount <= 0);
    if (invalidExpense) {
      toast.error(`Please enter a valid title and amount for each expense in ${invalidExpense.month}.`);
      return;
    }

    setIsSubmittingBudget(true);
    try {
      const annualBudgetRequested = draftMonths.reduce(
        (sum, m) => sum + m.expenses.reduce((s, e) => s + Number(e.projectedAmount || 0), 0),
        0,
      );
      await submitBudgetRequest({
        fiscalYear: selectedFY,
        department: departmentLabel,
        annualBudgetRequested,
        monthlyPlan: draftMonths.map((m) => ({
          month: m.month,
          monthKey: m.monthKey,
          title: m.title,
          projectedBudget: m.expenses.reduce((s, e) => s + Number(e.projectedAmount || 0), 0),
          expenses: m.expenses.map((e) => ({
            title: e.title,
            projectedAmount: e.projectedAmount,
            dueDate: e.dueDate,
            description: e.description,
          })),
        })),
      });
      toast.success('Budget sent for approval!');
      setDraftMonths([]);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit annual budget.');
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
        planId: financeData?.plan?._id,
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

  const handleSubmitExtraBudgetRequest = async () => {
    if (!financeData?.plan?._id) {
      toast.error('Submit the annual budget before requesting an extra budget.');
      return;
    }
    if (!extraBudgetForm.monthKey) {
      toast.error('Please select a month.');
      return;
    }
    if (!extraBudgetForm.amount || Number(extraBudgetForm.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    setIsSubmittingExtraBudget(true);
    try {
      await submitExtraBudget({
        planId: financeData?.plan?._id,
        fiscalYear: selectedFY,
        department: departmentLabel,
        monthKey: extraBudgetForm.monthKey,
        month: monthLabels[extraBudgetForm.monthKey] || extraBudgetForm.monthKey,
        amount: Number(extraBudgetForm.amount),
        reason: extraBudgetForm.reason,
      });
      toast.success('Extra budget request submitted successfully.');
      setShowExtraBudgetForm(false);
      setExtraBudgetForm({ monthKey: '', amount: '', reason: '' });
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit extra budget request.');
    } finally {
      setIsSubmittingExtraBudget(false);
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
        planId: financeData?.plan?._id,
        fiscalYear: selectedFY,
        monthKey: month.monthKey,
        expenseId: expense.id,
        expenseKey: expense.id,
        status: 'Paid',
        paymentStatus: 'Paid',
      });
      toast.success('Expense marked as paid.');
      setViewingExpense(null);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update payment status.');
    }
  };

  const handleLinkVendor = async (month: MonthlyPlan, expense: ExpenseData) => {
    const vendor = vendors.find((v) => v.id === selectedVendorToLink);
    if (!vendor) {
      toast.error('Select a vendor to link.');
      return;
    }
    setIsLinkingVendor(true);
    try {
      await submitVendor({
        planId: financeData?.plan?._id,
        fiscalYear: selectedFY,
        department: departmentLabel,
        monthKey: month.monthKey,
        expenseId: expense.id,
        vendorId: vendor.id,
        name: vendor.name,
        contactPerson: vendor.contactPerson,
        phone: vendor.phone,
        email: vendor.email,
        address: vendor.address,
        paymentTerms: vendor.paymentTerms,
        category: vendor.category,
        gstin: vendor.gstin,
        panNumber: vendor.panNumber,
        bankName: vendor.bankName,
        accountName: vendor.accountName,
        accountNumber: vendor.accountNumber,
        ifscCode: vendor.ifscCode,
        upiId: vendor.upiId,
        website: vendor.website,
        notes: vendor.notes,
        actualAmount: Number(actualAmountToPay || 0),
      });
      toast.success(`${vendor.name} linked to this expense.`);
      setSelectedVendorToLink('');
      setActualAmountToPay('');
      setViewingExpense(null);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to link vendor.');
    } finally {
      setIsLinkingVendor(false);
    }
  };

  const handleSendReminder = async () => {
    setIsSendingReminder(true);
    try {
      await sendReminder({ planId: financeData?.plan?._id, fiscalYear: selectedFY, department: departmentLabel });
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
      formData.append('planId', String(financeData?.plan?._id || ''));
      formData.append('expenseKey', expense.id);
      formData.append('invoiceNumber', expense.invoiceNumber || file.name);
      await uploadInvoice(formData);
      toast.success('Invoice uploaded successfully.');
      setViewingExpense(null);
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload invoice.');
    }
  };

  const handleGenerateReport = async (format: string = 'PDF') => {
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    const fiscalYearLabel = selectedFY || '';

    const expenseRows = monthlyExpenses.flatMap((month) =>
      month.expenses.map((expense) => ({
        label: `${month.month || month.title || ''} — ${expense.title}`,
        value: `Projected: ${formatCurrency(expense.projectedAmount)} | Actual: ${formatCurrency(expense.actualSpent)} | Status: ${expense.paymentStatus || expense.status}`,
      })),
    );
    const vendorRows = vendors.map((vendor: any) => ({
      label: vendor.name || vendor.vendorName || 'Vendor',
      value: `Contact: ${vendor.contactPerson || '—'} | Email: ${vendor.email || '—'}`,
    }));
    const reportRows = [...expenseRows, ...vendorRows];

    if (!reportRows.length) {
      toast.error(`There is no ${departmentLabel} finance data to export for ${fiscalYearLabel}.`);
      return;
    }

    try {
      const response = await createReport({
        title: `${departmentLabel} Finance - ${fiscalYearLabel}`,
        department: departmentLabel,
        category: 'Financial',
        dataWindow: 'Annual',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: `${fiscalYearLabel} Department Finance`,
        generatedBy: (currentUser?.name as string) || 'Department Manager',
        format: reportFormat,
        description: `Department finance report for ${departmentLabel}, fiscal year ${fiscalYearLabel}.`,
        sourceType: 'custom',
        sourceRef: 'department-finance',
        reportRows,
        monthlyData: monthlyExpenses.map((month) => ({
          month: month.month || month.title || '',
          metric: `${departmentLabel} projected`,
          value: formatCurrency(month.projectedAmount),
        })),
      });
      if (reportFormat === 'PDF') await downloadReportFile(response?.data?.download?.url, { openInNewTab: false });
      const createdReportId = response?.data?.report?.recordId;
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Report saved to Reports.' : 'Report saved to Reports. Preview it before downloading.');
      navigate(createdReportId ? `/extra-common-modules/reports?reportId=${createdReportId}` : '/extra-common-modules/reports');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate report.');
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────

  if (isLoading) return <DepartmentFinanceSkeleton />;

  // ─── Render ─────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'projected', label: 'Projected Budget' },
    { key: 'extra', label: 'Extra Requested' },
    { key: 'history', label: 'History' },
  ];

  const isBudgetRejected = financeData?.status?.toLowerCase() === 'rejected';
  const isBudgetPending = financeData?.status?.toLowerCase() === 'pending';
  const isBudgetApproved = financeData?.status?.toLowerCase() === 'approved';
  const isDraftBudget = !financeData?.annualRequest;
  const draftTotalProjected = draftMonths.reduce(
    (sum, m) => sum + m.expenses.reduce((s, e) => s + Number(e.projectedAmount || 0), 0),
    0,
  );

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                
                {departmentLabel} Finance Management
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Track projected budgets, extra requests, and expense history for your department for {selectedFY}.
              </p>
              {financeData?.healthStatus && (
                <span className={statusPillClass(financeData.healthStatus)}>
                  {financeData.healthStatus}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {errorMessage && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-semibold border border-red-200">
                  {errorMessage}
                </div>
              )}
              <button
                onClick={() => setShowImportModal(true)}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-blue-50 hover:border-blue-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                title="Bulk Upload"
              >
                <UploadCloud size={15} />
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-[#2563EB] text-white px-1.5 py-0.5 rounded">Bulk Upload</span>
              </button>
              <button
                onClick={() => handleGenerateReport('PDF')}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-rose-50 hover:border-rose-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                title="Export as PDF"
              >
                <FileDown size={15} />
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-rose-500 text-white px-1.5 py-0.5 rounded">Export PDF</span>
              </button>
              <button
                onClick={() => handleGenerateReport('Excel')}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                title="Export as Excel"
              >
                <FileSpreadsheet size={15} />
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">Export Excel</span>
              </button>
            </div>
          </div>

          {/* MAIN TABS */}
          <div data-tour="dept-finance-tabs" className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* STAT CARDS (tab-aware) */}
          <div data-tour="dept-finance-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {activeTab === 'projected' && (
              <>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Projected Annual</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalProjected)}</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Wallet size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-orange-400">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-orange-500 uppercase tracking-widest mb-1">Total Paid / Spent</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalActual)}</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-orange-50 text-orange-500 shrink-0"><TrendingDown size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Total Savings</p>
                    <p className="text-[15px] font-pmedium text-emerald-600">{formatCurrency(totalSavings)}</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><TrendingUp size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Invoices Pending</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{invoicePendingCount} Items</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-amber-50 text-amber-500 shrink-0"><FileWarning size={16} /></div>
                </div>
              </>
            )}

            {activeTab === 'extra' && (
              <>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Total Extra Requested</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalExtraRequested)}</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><TrendingUp size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Approved Extra</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(approvedExtraTotal)}</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Pending Requests</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{pendingExtraRequests.length} Items</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-amber-50 text-amber-500 shrink-0"><Clock size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Total Requests</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{extraRequests.length} Items</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><FileText size={16} /></div>
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Total Paid</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalPaidHistory)}</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Wallet size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Expenses Paid</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{paidExpenseHistory.length} Items</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Invoices Uploaded</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{invoicedHistoryCount} Items</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-amber-50 text-amber-500 shrink-0"><FileText size={16} /></div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500">
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Avg. Payment</p>
                    <p className="text-[15px] font-pmedium text-slate-900">
                      {formatCurrency(paidExpenseHistory.length ? totalPaidHistory / paidExpenseHistory.length : 0)}
                    </p>
                  </div>
                  <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Receipt size={16} /></div>
                </div>
              </>
            )}
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

          {/* DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* SUB TABS / LABEL + SEARCH + FILTERS */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex bg-slate-100/50 p-1 rounded-xl w-full xl:w-auto relative border border-slate-200/50">
                <div className="px-4 py-2 font-bold text-[13px] text-[#0F172A] flex items-center gap-2">
                  {activeTab === 'projected' && (<><Wallet size={14} className="text-[#2563EB]" /> Monthly Plan</>)}
                  {activeTab === 'extra' && (<><TrendingUp size={14} className="text-[#2563EB]" /> Extra Budget Requests</>)}
                  {activeTab === 'history' && (<><CheckCircle2 size={14} className="text-[#2563EB]" /> Paid Expenses History</>)}
                </div>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    data-tour="dept-finance-search"
                    type="text" placeholder="Search..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                  <select
                    data-tour="dept-finance-fy-select"
                    value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                  >
                    {fiscalYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {activeTab === 'projected' && (
                  <>
                    {isDraftBudget && (
                      <button
                        onClick={handleSubmitAnnualBudget}
                        disabled={isSubmittingBudget}
                        className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={14} /> {isSubmittingBudget ? 'Submitting...' : 'Submit Annual Budget'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowVendorList(true)}
                      className="bg-white border border-slate-200/60 text-slate-600 px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <UserPlus size={14} /> Vendors
                    </button>
                  </>
                )}
                {activeTab === 'extra' && (
                  <button
                    onClick={() => setShowExtraBudgetForm(true)}
                    className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Plus size={14} /> Extra Budget Request
                  </button>
                )}
              </div>
            </div>

            {/* Tab 1: Projected Budget */}
            {activeTab === 'projected' && isDraftBudget && (
              <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Drafting banner */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-pmedium uppercase tracking-widest mb-2 inline-block">Drafting Phase</span>
                    <h3 className="text-base font-pmedium text-slate-900 flex items-center gap-2"><Building2 size={16} className="text-[#2563EB]" /> Set Projected Annual Budget</h3>
                    <p className="text-xs font-pmedium text-slate-500 mt-1 max-w-xl">Add months, plot projected expenses for each, and submit for approval.</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-start sm:items-end shrink-0">
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Wallet size={11} /> Total Projected</span>
                    <span className="text-lg font-pmedium text-slate-900">{formatCurrency(draftTotalProjected)}</span>
                  </div>
                </div>

                {/* Month blocks */}
                <div className="space-y-5">
                  {draftMonths.map((m, idx) => {
                    const mTotal = m.expenses.reduce((sum, e) => sum + Number(e.projectedAmount || 0), 0);
                    return (
                      <div key={m.id} className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm">
                        <div className="bg-slate-50/80 border-b border-slate-100 p-4 sm:p-5 flex flex-col xl:flex-row justify-between gap-4">
                          <div className="flex gap-4 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 font-pmedium text-sm flex items-center justify-center shrink-0">
                              {idx + 1}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                              <div className="space-y-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Target Month</label>
                                <select
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200/60 outline-none text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                                  value={m.month}
                                  onChange={(e) => updateDraftMonthField(m.id, 'month', e.target.value)}
                                >
                                  {monthKeys.map((key) => (
                                    <option key={key} value={monthLabels[key]}>{monthLabels[key]}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Monthly Budget Title</label>
                                <input
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200/60 outline-none text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                                  value={m.title}
                                  onChange={(e) => updateDraftMonthField(m.id, 'title', e.target.value)}
                                  placeholder="E.g., Hardware Upgrades Budget"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-start xl:items-end justify-center min-w-[180px] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <div className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5 flex items-center gap-1"><Wallet size={11} /> Month Total Allocation</div>
                            <div className="text-base font-pmedium text-[#2563EB]">{formatCurrency(mTotal)}</div>
                            <div className="mt-0.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                              {m.expenses.length} Item{m.expenses.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 sm:p-5 bg-white">
                          <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                            <h4 className="text-xs font-pmedium text-slate-700 uppercase tracking-widest flex items-center gap-2"><Receipt size={14} className="text-slate-400" /> Projected Expenses</h4>
                            <button
                              onClick={() => handleAddExpenseToMonth(m.id)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-[#2563EB] hover:text-white rounded-lg text-[10px] font-pmedium uppercase tracking-widest transition-all flex items-center gap-1.5"
                            >
                              <Plus size={13} /> Add New Expense
                            </button>
                          </div>

                          <div className="space-y-3">
                            {m.expenses.length === 0 && (
                              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50">
                                <p className="text-xs font-pmedium text-slate-500">No expenses plotted for {m.month} yet.</p>
                                <p className="text-[10px] font-pmedium text-slate-400 mt-1">Start allocating funds to specific items or services.</p>
                                <button
                                  onClick={() => handleAddExpenseToMonth(m.id)}
                                  className="mt-3 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-pmedium uppercase hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
                                >
                                  Add First Expense
                                </button>
                              </div>
                            )}
                            {m.expenses.map((exp, eIdx) => (
                              <div key={exp.id} className="relative bg-[#F8FAFC] border border-slate-200/60 rounded-2xl p-4 sm:p-5">
                                <button
                                  onClick={() => removeDraftExpense(m.id, exp.id)}
                                  className="absolute top-3 right-3 w-7 h-7 bg-white text-red-400 border border-red-100 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                  title="Remove Expense"
                                >
                                  <X size={13} />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pr-8">
                                  <div className="md:col-span-12">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-pmedium uppercase tracking-widest">
                                      #{String(eIdx + 1).padStart(2, '0')}
                                    </span>
                                  </div>
                                  <div className="md:col-span-4 space-y-1">
                                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Expense Title</label>
                                    <input
                                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200/60 outline-none text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                                      placeholder="e.g. Server Hosting"
                                      value={exp.title}
                                      onChange={(e) => updateDraftExpenseField(m.id, exp.id, 'title', e.target.value)}
                                    />
                                  </div>
                                  <div className="md:col-span-4 space-y-1">
                                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Estimated Amount</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px] font-pmedium">{currencySymbol}</span>
                                      <input
                                        className="w-full pl-7 pr-3 py-2 rounded-lg bg-white border border-slate-200/60 outline-none text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                                        type="number"
                                        placeholder="0.00"
                                        value={exp.projectedAmount || ''}
                                        onChange={(e) => updateDraftExpenseField(m.id, exp.id, 'projectedAmount', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="md:col-span-4 space-y-1">
                                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Expected Due Date</label>
                                    <input
                                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200/60 outline-none text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                                      type="date"
                                      value={exp.dueDate}
                                      onChange={(e) => updateDraftExpenseField(m.id, exp.id, 'dueDate', e.target.value)}
                                    />
                                  </div>
                                  <div className="md:col-span-12 space-y-1">
                                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Justification / Details</label>
                                    <input
                                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200/60 outline-none text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                                      placeholder="Why is this expense necessary?"
                                      value={exp.description}
                                      onChange={(e) => updateDraftExpenseField(m.id, exp.id, 'description', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleAddMonth}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:text-[#2563EB] hover:border-blue-300 hover:bg-blue-50/50 transition-all font-pmedium text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add Another Budget Month
                </button>
              </div>
            )}

            {activeTab === 'projected' && !isDraftBudget && (
              <div className="flex-1 overflow-x-auto">
                {financeData?.annualRequest && (
                  <div className="m-4 sm:m-6 mb-0 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Requested</p>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(financeData.annualRequest.requestedBudget)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Previous Spend</p>
                        <p className="text-sm font-bold text-slate-500">{formatCurrency(financeData.annualRequest.previousSpend)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Status</p>
                        <span className={statusPillClass(financeData.annualRequest.status)}>{financeData.annualRequest.status}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Submitted</p>
                        <p className="text-xs font-pmedium text-slate-700">{financeData.annualRequest.createdAt || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
                <table data-tour="dept-finance-table" className="w-full text-left min-w-[900px]">
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
            )}

            {/* Tab 2: Extra Requested */}
            {activeTab === 'extra' && (
              <div className="flex-1 overflow-x-auto">
                <table data-tour="dept-finance-table" className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Month</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Reason</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {extraRequestsFiltered.map((request) => (
                      <tr key={request.id} className="hover:bg-blue-50/30 transition-all">
                        <td className="px-5 py-4 font-pmedium text-slate-900">{monthLabels[request.monthKey] || request.month}</td>
                        <td className="px-5 py-4 font-pmedium text-slate-700">{formatCurrency(request.amount)}</td>
                        <td className="px-5 py-4 text-xs text-slate-600 max-w-[300px] truncate">{request.reason || '-'}</td>
                        <td className="px-5 py-4">
                          <span className={statusPillClass(request.status)}>{request.status}</span>
                        </td>
                        <td className="px-5 py-4 font-pmedium text-slate-700">{request.createdAt || 'N/A'}</td>
                      </tr>
                    ))}
                    {extraRequestsFiltered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-semibold">
                          No extra budget requests submitted for this fiscal year.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: History */}
            {activeTab === 'history' && (
              <div className="flex-1 overflow-x-auto">
                <table data-tour="dept-finance-table" className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Month</th>
                      <th className="px-5 py-4">Expense Title</th>
                      <th className="px-5 py-4">Actual Paid</th>
                      <th className="px-5 py-4">Invoice</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {paidExpenseHistory.map(({ month, expense }) => (
                      <tr key={`${month.monthKey}-${expense.id}`} className="hover:bg-blue-50/30 transition-all">
                        <td className="px-5 py-4 font-pmedium text-slate-900">{monthLabels[month.monthKey] || month.month}</td>
                        <td className="px-5 py-4 font-pmedium text-slate-900">{expense.title || 'Untitled'}</td>
                        <td className="px-5 py-4 font-pmedium text-emerald-600">{formatCurrency(expense.actualSpent)}</td>
                        <td className="px-5 py-4 font-pmedium text-slate-700">{expense.invoiceNumber || '-'}</td>
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
                    ))}
                    {paidExpenseHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-semibold">
                          No paid expenses yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                <div>
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Vendor</p>
                  {viewingExpense.expense.vendorName ? (
                    <p className="text-sm font-bold text-slate-900">{viewingExpense.expense.vendorName}</p>
                  ) : vendors.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedVendorToLink}
                        onChange={(e) => setSelectedVendorToLink(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Select a registered vendor…</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                      </select>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                          Actual Vendor Cost / Amount to Pay
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={actualAmountToPay}
                          onChange={(e) => setActualAmountToPay(e.target.value)}
                          placeholder={`Projected: ${formatCurrency(viewingExpense.expense.projectedAmount || viewingExpense.expense.amount || 0)}`}
                          className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                        />
                        <p className="text-[10px] text-slate-400">This value becomes the expense Actual and monthly Actual Spent.</p>
                      </div>
                      <button
                        type="button"
                        disabled={!selectedVendorToLink || !actualAmountToPay || Number(actualAmountToPay) < 0 || isLinkingVendor}
                        onClick={() => handleLinkVendor(viewingExpense.month, viewingExpense.expense)}
                        className="px-4 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isLinkingVendor ? 'Linking…' : 'Link Vendor'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No vendors registered yet — add one first, then link it here.</p>
                  )}
                </div>
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
      <AnimatePresence>
        {viewingVendor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-sm"
            onClick={() => setViewingVendor(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white font-pmedium shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><UserPlus size={17} /></div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-pmedium text-slate-900">{viewingVendor.name}</h2>
                    <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">{viewingVendor.category || 'Vendor'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingVendor(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <div key={field.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400">{field.label}</p>
                      <p className="mt-1 text-[12px] text-slate-800">{field.value}</p>
                    </div>
                  ))}
                </div>
                {viewingVendor.notes && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400">Notes</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-5 text-slate-700">{viewingVendor.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extra Budget Request Form Modal */}
      <AnimatePresence>
        {showExtraBudgetForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm"
            onClick={() => setShowExtraBudgetForm(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div>
                  <h2 className="text-lg font-pmedium text-slate-900">Submit Extra Budget Request</h2>
                  <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Spend beyond the approved annual budget</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExtraBudgetForm(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-4 p-5 font-pmedium">
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Month</label>
                  <select
                    value={extraBudgetForm.monthKey}
                    onChange={(e) => setExtraBudgetForm((prev) => ({ ...prev, monthKey: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select month</option>
                    {monthKeys.map((key) => (
                      <option key={key} value={key}>{monthLabels[key]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Requested Amount ({currency})</label>
                  <input
                    type="number"
                    value={extraBudgetForm.amount}
                    onChange={(e) => setExtraBudgetForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Reason</label>
                  <textarea
                    value={extraBudgetForm.reason}
                    onChange={(e) => setExtraBudgetForm((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Explain why this extra budget is needed"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setShowExtraBudgetForm(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitExtraBudgetRequest}
                  disabled={isSubmittingExtraBudget}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingExtraBudget ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {isSubmittingExtraBudget ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vendor List Modal */}
      <AnimatePresence>
        {showVendorList && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm"
            onClick={() => setShowVendorList(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div>
                  <h2 className="text-lg font-pmedium text-slate-900">Registered Vendors</h2>
                  <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{vendors.length} vendor{vendors.length === 1 ? '' : 's'} on file</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowVendorList(false); setShowVendorForm(true); }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    <Plus size={13} /> Add Vendor
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVendorList(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-auto font-pmedium">
                <table className="w-full min-w-[700px] text-left">
                  <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-500">
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
                    {vendors.map((vendor) => (
                      <tr key={vendor.id} className="transition-all hover:bg-blue-50/30">
                        <td className="px-5 py-4">
                          <div className="text-slate-900">{vendor.name}</div>
                          {vendor.email && <div className="mt-0.5 text-[9px] text-slate-400">{vendor.email}</div>}
                        </td>
                        <td className="px-5 py-4 text-slate-700">{vendor.contactPerson || '-'}</td>
                        <td className="px-5 py-4 text-slate-700">{vendor.phone || '-'}</td>
                        <td className="px-5 py-4 text-slate-700">{vendor.category || '-'}</td>
                        <td className="px-5 py-4 text-slate-700">{vendor.paymentTerms || '-'}</td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => setViewingVendor(vendor)}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition-all hover:bg-blue-100 hover:text-blue-700"
                            title="View Details"
                          >
                            <Eye size={15} strokeWidth={2.5} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {vendors.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                          No vendors registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vendor Form Modal */}
      <AnimatePresence>
        {showVendorForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm"
            onClick={() => setShowVendorForm(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div>
                  <h2 className="text-lg font-pmedium text-slate-900">Add Vendor</h2>
                  <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Register a new vendor for this department</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVendorForm(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitVendor(); }} className="flex-1 space-y-4 overflow-y-auto p-5 font-pmedium">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">{field.label}</label>
                      <input
                        type={field.type}
                        value={(vendorForm as any)[field.key]}
                        onChange={(e) => setVendorForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Address</label>
                  <textarea
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Notes</label>
                  <textarea
                    value={vendorForm.notes}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVendorForm(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingVendor}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmittingVendor ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {isSubmittingVendor ? 'Registering...' : 'Register Vendor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
