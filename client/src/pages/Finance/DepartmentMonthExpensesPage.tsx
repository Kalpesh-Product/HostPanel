import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Receipt,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStoredUser, normalizeUserRole } from '@/lib/auth-session';
import { extractDepartmentLabel } from '@/utils/user-helpers';
import {
  getDepartmentFinanceData,
  recordAdditionalExpensePayment,
  submitVendor,
  updateMonthlyExpenseStatus,
  uploadInvoice,
} from '@/services/finance';
import { DEFAULT_FISCAL_YEAR } from '@/features/finance/utils/fiscalYear';
import { formatFinancePaymentStatus } from '@/features/finance/utils/paymentStatus';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import PageFrame from '@/components/Pages/PageFrame';
import { statusPillClass } from '@/lib/status-pill';

const LIST_PATH = '/extra-common-modules/finance-management';

// "admin" is deliberately excluded — marking an expense paid is Finance/Founder-only.
const FINANCE_PAYMENT_ROLES = ['owner', 'founder', 'super_admin', 'finance_manager', 'finance'];

const monthLabels: Record<string, string> = {
  apr: 'April', may: 'May', jun: 'June', jul: 'July', aug: 'August', sep: 'September',
  oct: 'October', nov: 'November', dec: 'December', jan: 'January', feb: 'February', mar: 'March',
};

interface VendorData {
  id: string;
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
}

interface ExpenseInvoice {
  invoiceKey: string;
  invoiceNumber: string;
  amount: number;
  invoiceUrl?: string;
  invoiceFile?: string;
  uploadedAtLabel?: string;
}

interface ExpenseData {
  _id?: string;
  id: string;
  title: string;
  description: string;
  dueDate: string;
  projectedAmount: number;
  actualSpent: number;
  status: string;
  paymentStatus: string;
  invoiceNumber: string;
  invoiceUrl: string;
  invoiceFile: string;
  invoiceDate: string;
  invoices?: ExpenseInvoice[];
  expenseTag: string;
  vendorId?: string;
  vendorName?: string;
  vendorContactPerson?: string;
}

interface MonthlyPlan {
  month: string;
  monthKey: string;
  title: string;
  expenses: ExpenseData[];
}

function getExpenseInvoices(expense?: ExpenseData | null): ExpenseInvoice[] {
  if (!expense) return [];
  if (Array.isArray(expense.invoices) && expense.invoices.length > 0) return expense.invoices;
  const legacyUrl = expense.invoiceUrl || expense.invoiceFile || '';
  if (!expense.invoiceNumber && !legacyUrl) return [];
  return [{
    invoiceKey: `legacy-${expense.id}`,
    invoiceNumber: expense.invoiceNumber || 'Legacy Invoice',
    amount: Number(expense.actualSpent || 0),
    invoiceUrl: legacyUrl,
    invoiceFile: expense.invoiceFile || '',
    uploadedAtLabel: expense.invoiceDate || '',
  }];
}

function getApiErrorMessage(error: any, fallback: string): string {
  const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  const raw = typeof error?.message === 'string' ? error.message : '';
  if (raw && !/^request failed/i.test(raw)) return raw;
  return fallback;
}

function deriveDepartmentFallback(currentUser: any): string {
  const rawList = currentUser?.workspaceMembership?.departments;
  const fromList = Array.isArray(rawList)
    ? rawList.map((d: any) => (typeof d === 'string' ? d : d?.name || d?.label || '')).filter(Boolean).map((d: string) => extractDepartmentLabel(d))
    : [];
  if (fromList.length > 0) return fromList[0];
  const single = currentUser?.department || currentUser?.workspaceMembership?.department || '';
  return extractDepartmentLabel(typeof single === 'string' ? single : single?.name || single?.label || '');
}

/**
 * Full-page "view/edit a month's expenses" screen for the Finance Manager's own
 * department budget — record actual amounts, link vendors, mark expenses paid,
 * and upload invoices. Reached from DepartmentFinancePageV2's Projected tab.
 */
export function DepartmentMonthExpensesPage() {
  const { monthKey = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState: { fiscalYear?: string; department?: string } = (location.state || {}) as any;

  const currentUser: any = getStoredUser();
  const userRole = normalizeUserRole(currentUser?.workspaceMembership?.role || currentUser?.role || '');
  const departmentLabel = routeState.department || deriveDepartmentFallback(currentUser);
  const fiscalYear = routeState.fiscalYear || DEFAULT_FISCAL_YEAR;
  const canManagePayments = FINANCE_PAYMENT_ROLES.includes(userRole);

  const workspacePreferences = useWorkspacePreferences();
  const currency = workspacePreferences.currency;
  const formatCurrency = (amount: number) =>
    formatWorkspaceCurrency(Number(amount || 0), currency, { maximumFractionDigits: 0 });

  const [financeData, setFinanceData] = useState<any>(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyPlan[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [extraRequests, setExtraRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const response = await getDepartmentFinanceData(fiscalYear, departmentLabel);
        if (!alive) return;
        const data = response?.data || response || {};
        setFinanceData(data);
        setMonthlyExpenses(Array.isArray(data.monthlyPlan) ? data.monthlyPlan : []);
        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
        setExtraRequests(Array.isArray(data.extraRequests) ? data.extraRequests : []);
      } catch (error: any) {
        if (alive) setLoadError(getApiErrorMessage(error, 'Failed to load department finance data.'));
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [fiscalYear, departmentLabel, refreshKey]);

  const month = monthlyExpenses.find((m) => String(m.monthKey || m.month || '').trim().toLowerCase() === monthKey.toLowerCase()) || null;

  // Keep an open expense modal in sync with fresh data after a mutation.
  const [viewingExpense, setViewingExpense] = useState<{ month: MonthlyPlan; expense: ExpenseData } | null>(null);
  useEffect(() => {
    if (!viewingExpense) return;
    const freshMonth = monthlyExpenses.find((m) => String(m.monthKey || m.month) === String(viewingExpense.month.monthKey || viewingExpense.month.month));
    const freshExpense = freshMonth?.expenses.find((e) => e.id === viewingExpense.expense.id);
    if (freshMonth && freshExpense) setViewingExpense({ month: freshMonth, expense: freshExpense });
    else setViewingExpense(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyExpenses]);

  const [selectedVendorToLink, setSelectedVendorToLink] = useState('');
  const [actualAmountToPay, setActualAmountToPay] = useState('');
  const [isLinkingVendor, setIsLinkingVendor] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [isRecordingAdditional, setIsRecordingAdditional] = useState(false);

  const [invoiceTarget, setInvoiceTarget] = useState<{ month: MonthlyPlan; expense: ExpenseData } | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: '', amount: '', file: null as File | null });
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const invoiceExistingTotal = getExpenseInvoices(invoiceTarget?.expense).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const invoiceEnteredAmount = Number(invoiceForm.amount || 0);
  const invoiceApprovedProjection = Number(invoiceTarget?.expense?.projectedAmount || 0);
  const invoiceVendorActual = Number(invoiceTarget?.expense?.actualSpent || 0);
  const invoiceLimit = invoiceVendorActual > 0 ? invoiceVendorActual : invoiceApprovedProjection;
  const invoiceNextTotal = invoiceExistingTotal + (Number.isFinite(invoiceEnteredAmount) ? invoiceEnteredAmount : 0);
  const invoiceExcessAmount = Math.max(0, invoiceNextTotal - invoiceLimit);
  const invoiceRemainingAmount = Math.max(0, invoiceLimit - invoiceNextTotal);
  const invoiceExceedsProjection = Boolean(invoiceTarget && invoiceExcessAmount > 0.009);

  const getApprovedExtraForMonth = (mKey: any) =>
    (Array.isArray(extraRequests) ? extraRequests : [])
      .filter((r: any) =>
        String(r?.status || '').toLowerCase() === 'approved' &&
        String(r?.monthKey || r?.month || '').toLowerCase() === String(mKey || '').toLowerCase())
      .reduce((sum: number, r: any) => sum + Number(r?.amount || 0), 0);

  const isBudgetApproved = String(financeData?.status || '').toLowerCase() === 'approved';
  // Vendor linking / recording actuals is locked until the annual budget is
  // approved — no role bypass, this applies regardless of who's viewing.
  const canRecordSpend = isBudgetApproved;

  const expenseDetail = viewingExpense?.expense;
  const expenseProjected = Number(expenseDetail?.projectedAmount ?? (expenseDetail as any)?.amount ?? 0);
  const openMonth: any = viewingExpense?.month || null;
  const openMonthKeyNorm = String(openMonth?.monthKey || openMonth?.month || '').toLowerCase();
  const approvedExtraForMonth = getApprovedExtraForMonth(openMonthKeyNorm);
  const hasLinkedExtraRequests = extraRequests.some((r: any) => Boolean(r?.appliedExpenseId));
  const viewingIsAddOn = String(expenseDetail?.expenseTag || '').toLowerCase() === 'add-on';
  const viewingHasApprovedRequest = extraRequests.some((r: any) =>
    String(r?.status || '').toLowerCase() === 'approved' && String(r?.appliedExpenseId || '') === String((expenseDetail as any)?._id || ''));
  const addonLinkLocked = viewingIsAddOn && (hasLinkedExtraRequests ? !viewingHasApprovedRequest : approvedExtraForMonth <= 0);
  const maxActualAllowed = expenseProjected;
  const actualOverProjected = !!expenseDetail && actualAmountToPay !== '' && Number(actualAmountToPay) > maxActualAllowed + 0.009;
  const expenseActualRecorded = Number((expenseDetail as any)?.actualAmount ?? 0);
  const expenseRemaining = Math.max(0, expenseProjected - expenseActualRecorded);
  const canRecordAdditionalPayment = !!expenseDetail && canRecordSpend && !addonLinkLocked && expenseRemaining > 0.009;

  const exitToBack = () => {
    const historyState: any = window.history?.state || {};
    if (typeof historyState.idx === 'number' && historyState.idx > 0) navigate(-1);
    else navigate(LIST_PATH, { replace: true });
  };

  const handleMarkPaid = async (m: MonthlyPlan, expense: ExpenseData) => {
    try {
      await updateMonthlyExpenseStatus({
        planId: financeData?.plan?._id,
        fiscalYear,
        monthKey: m.monthKey,
        expenseId: expense.id,
        expenseKey: expense.id,
        status: 'Paid',
        paymentStatus: 'Paid',
      } as any);
      toast.success('Expense marked as paid.');
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to update payment status.'));
    }
  };

  const handleLinkVendor = async (m: MonthlyPlan, expense: ExpenseData) => {
    const vendor = vendors.find((v) => v.id === selectedVendorToLink);
    if (!vendor) { toast.error('Select a vendor to link.'); return; }
    setIsLinkingVendor(true);
    try {
      await submitVendor({
        planId: financeData?.plan?._id,
        fiscalYear,
        department: departmentLabel,
        monthKey: m.monthKey,
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
      } as any);
      toast.success(`${vendor.name} linked to this expense.`);
      setSelectedVendorToLink('');
      setActualAmountToPay('');
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to link vendor.'));
    } finally {
      setIsLinkingVendor(false);
    }
  };

  const handleRecordAdditionalPayment = async () => {
    const amount = Number(additionalAmount || 0);
    if (!additionalAmount || amount <= 0) { toast.error('Enter the additional payment amount.'); return; }
    if (!viewingExpense) return;
    setIsRecordingAdditional(true);
    try {
      await recordAdditionalExpensePayment({
        planId: String(financeData?.plan?._id || ''),
        fiscalYear,
        monthKey: viewingExpense.month?.monthKey || '',
        expenseId: viewingExpense.expense.id,
        amount,
      } as any);
      toast.success('Additional payment recorded. The line is back in Payment Pending for Finance.');
      setAdditionalAmount('');
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to record additional payment.'));
    } finally {
      setIsRecordingAdditional(false);
    }
  };

  const openInvoiceForm = (m: MonthlyPlan, expense: ExpenseData) => {
    setInvoiceTarget({ month: m, expense });
    setInvoiceForm({ invoiceNumber: '', amount: '', file: null });
  };

  const handleUploadInvoice = async () => {
    if (!invoiceTarget) return;
    const { month: m, expense } = invoiceTarget;
    const amount = Number(invoiceForm.amount);
    if (!invoiceForm.invoiceNumber.trim()) { toast.error('Enter the invoice number.'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid invoice amount.'); return; }
    if (!invoiceForm.file) { toast.error('Select an invoice file.'); return; }
    const currentInvoiceTotal = getExpenseInvoices(expense).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const invLimit = Number(expense.actualSpent || 0) > 0 ? Number(expense.actualSpent) : Number(expense.projectedAmount || 0);
    if (currentInvoiceTotal + amount > invLimit + 0.009) {
      toast.error(`Invoice total exceeds the ${Number(expense.actualSpent || 0) > 0 ? 'vendor actual amount' : 'approved projection'}.`);
      return;
    }
    setIsUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('file', invoiceForm.file);
      formData.append('fiscalYear', fiscalYear);
      formData.append('monthKey', m.monthKey);
      formData.append('expenseId', expense.id);
      formData.append('department', departmentLabel);
      formData.append('planId', String(financeData?.plan?._id || ''));
      formData.append('expenseKey', expense.id);
      formData.append('invoiceNumber', invoiceForm.invoiceNumber.trim());
      formData.append('invoiceAmount', String(amount));
      await uploadInvoice(formData);
      toast.success('Invoice added successfully.');
      setInvoiceTarget(null);
      setViewingExpense(null);
      setInvoiceForm({ invoiceNumber: '', amount: '', file: null });
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to add invoice.'));
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  if (isLoading && !month) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <TablePageSkeleton rows={8} columns={6} />
      </div>
    );
  }

  if (!month) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-pmedium text-slate-700">
              {loadError || 'This month could not be found.'}
            </p>
            <button onClick={exitToBack} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all">
              <ArrowLeft size={13} /> Back to Finance Management
            </button>
          </div>
        </PageFrame>
      </div>
    );
  }

  const approvedMonthExpenses = (month.expenses || []).filter((expense) => {
    if (String(expense.expenseTag || '').toLowerCase() !== 'add-on') return true;
    if (hasLinkedExtraRequests) {
      return extraRequests.some((r: any) =>
        String(r?.status || '').toLowerCase() === 'approved' &&
        String(r?.appliedExpenseId || '') === String((expense as any)?._id || ''));
    }
    return getApprovedExtraForMonth(month.monthKey || month.month) > 0;
  });
  const monthProjectedTotal = approvedMonthExpenses.reduce((sum, expense) => sum + Number(expense.projectedAmount || 0), 0);
  const monthActualTotal = approvedMonthExpenses.reduce((sum, expense) => sum + Number(expense.actualSpent || 0), 0);

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* Header — back arrow beside title */}
          <div className="flex items-center gap-3">
            <button onClick={exitToBack} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm" title="Back">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5 truncate">
                {monthLabels[month.monthKey] || month.month}{month.title ? ` (${month.title})` : ''}
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">{departmentLabel || 'Department'} | Monthly Expense Detail</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-blue-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Projected</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(monthProjectedTotal)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Calendar size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-emerald-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Actual</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(monthActualTotal)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><Calendar size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-slate-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Expenses</p>
                <p className="text-[15px] font-pmedium text-slate-900">{approvedMonthExpenses.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Receipt size={16} /></div>
            </div>
          </div>

          {/* Expense table */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50">
              <h4 className="text-[10px] sm:text-xs font-pmedium text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Receipt size={13} className="text-[#2563EB]" /> Expense Line Items
              </h4>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="w-[50px] px-5 py-4 text-center">Sr No</th>
                    <th className="px-5 py-4">Expense</th>
                    <th className="px-5 py-4 text-right">Projected</th>
                    <th className="px-5 py-4 text-right">Actual</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {approvedMonthExpenses.map((expense, eIdx) => (
                    <tr key={expense.id || eIdx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4 text-center">
                        <p className="text-xs font-pmedium text-slate-400">{eIdx + 1}</p>
                      </td>
                      <td className="px-5 py-4 font-pmedium text-slate-900">{expense.title || 'Untitled'}</td>
                      <td className="px-5 py-4 text-right font-pmedium text-slate-900 whitespace-nowrap">{formatCurrency(expense.projectedAmount)}</td>
                      <td className="px-5 py-4 text-right font-pmedium text-emerald-600 whitespace-nowrap">{formatCurrency(expense.actualSpent)}</td>
                      <td className="px-5 py-4">
                        <span className={statusPillClass(formatFinancePaymentStatus(expense.paymentStatus, 'Unpaid'))}>{formatFinancePaymentStatus(expense.paymentStatus, 'Unpaid')}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => setViewingExpense({ month, expense })}
                          className="mx-auto flex items-center justify-center p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {approvedMonthExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-400 font-pmedium text-xs">No expenses listed for this month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageFrame>

      {/* Expense Detail Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="bg-white rounded-[1.75rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-pmedium text-slate-900 flex items-center gap-2">
                <Receipt size={20} className="text-[#2563EB]" /> Expense Details
              </h2>
              <button onClick={() => setViewingExpense(null)} className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto bg-white space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Month</p>
                  <p className="text-lg font-pmedium text-slate-900">{monthLabels[viewingExpense.month.monthKey] || viewingExpense.month.month}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Status</p>
                  <span className={statusPillClass(formatFinancePaymentStatus(viewingExpense.expense.paymentStatus || viewingExpense.expense.status, 'Pending'))}>
                    {formatFinancePaymentStatus(viewingExpense.expense.paymentStatus || viewingExpense.expense.status, 'Pending')}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Title</p>
                  <p className="text-sm font-pmedium text-slate-900">{viewingExpense.expense.title || 'Untitled'}</p>
                </div>
                {viewingExpense.expense.description && (
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Description</p>
                    <p className="text-xs font-pmedium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {viewingExpense.expense.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Projected</p>
                    <p className="text-lg font-pmedium text-slate-900">{formatCurrency(viewingExpense.expense.projectedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Vendor Actual</p>
                    <p className="text-lg font-pmedium text-slate-900">{formatCurrency(viewingExpense.expense.actualSpent)}</p>
                  </div>
                  {(() => {
                    const invoiced = getExpenseInvoices(viewingExpense.expense).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
                    const difference = Number(viewingExpense.expense.actualSpent || 0) - invoiced;
                    return (
                      <>
                        <div><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Total Invoiced</p><p className="text-lg font-pmedium text-slate-900">{formatCurrency(invoiced)}</p></div>
                        <div><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Difference</p><p className={`text-lg font-pmedium ${difference < -0.009 ? 'text-red-600' : difference > 0.009 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrency(Math.abs(difference))}{difference < -0.009 ? ' over' : difference > 0.009 ? ' remaining' : ' matched'}</p></div>
                      </>
                    );
                  })()}
                  {(() => {
                    const over = Number(viewingExpense.expense.actualSpent || 0) - Number(expenseProjected || 0);
                    if (over <= 0.009) return null;
                    if (approvedExtraForMonth + 0.009 < over) return null;
                    return (
                      <div className="col-span-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-pmedium uppercase tracking-wider text-blue-700">
                          {formatCurrency(over)} via extra budget
                        </span>
                      </div>
                    );
                  })()}
                </div>
                {getExpenseInvoices(viewingExpense.expense).length > 0 && (
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-2">Invoices</p>
                    <div className="space-y-2">
                      {getExpenseInvoices(viewingExpense.expense).map((invoice) => {
                        const url = invoice.invoiceUrl || invoice.invoiceFile || '';
                        return (
                          <div key={invoice.invoiceKey} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div>
                              <p className="text-sm font-pmedium text-slate-900">{invoice.invoiceNumber}</p>
                              <p className="mt-0.5 text-[10px] font-pmedium text-slate-500">{formatCurrency(invoice.amount)}{invoice.uploadedAtLabel ? ` • ${invoice.uploadedAtLabel}` : ''}</p>
                            </div>
                            {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100"><FileText size={12} /> View</a>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Vendor</p>
                  {viewingExpense.expense.vendorName ? (
                    <div className="space-y-3">
                      <p className="text-sm font-pmedium text-slate-900">{viewingExpense.expense.vendorName}</p>
                      {canRecordAdditionalPayment && (
                        <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                          <p className="text-[10px] font-pmedium uppercase tracking-wider text-blue-700">
                            Remaining projected: {formatCurrency(expenseRemaining)} — record another payment against this line.
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={additionalAmount}
                              onChange={(e) => setAdditionalAmount(e.target.value)}
                              placeholder={`Remaining: ${formatCurrency(expenseRemaining)}`}
                              className="w-full sm:flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
                            />
                            <button
                              type="button"
                              disabled={!additionalAmount || Number(additionalAmount) <= 0 || Number(additionalAmount) > expenseRemaining + 0.009 || isRecordingAdditional}
                              onClick={handleRecordAdditionalPayment}
                              className="shrink-0 px-4 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isRecordingAdditional ? 'Recording…' : 'Record Additional Payment'}
                            </button>
                          </div>
                          <p className="text-[9px] font-pmedium text-slate-500">
                            The amount adds to this line's Actual and the line re-enters Payment Pending until Finance executes it.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : vendors.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {!canRecordSpend && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-amber-700">
                          Budget must be approved before linking a vendor.
                        </p>
                      )}
                      {addonLinkLocked && (
                        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-blue-700">
                          Extra budgets are amendments, not spendable expenses — record the actual cost against your regular expense line for this month.
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                            Select a registered vendor
                          </label>
                          <select
                            value={selectedVendorToLink}
                            onChange={(e) => setSelectedVendorToLink(e.target.value)}
                            disabled={!canRecordSpend || addonLinkLocked}
                            className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            <option value="">Select a registered vendor…</option>
                            {vendors.map((vendor) => (
                              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                            ))}
                          </select>
                        </div>
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
                            disabled={!canRecordSpend || addonLinkLocked}
                            placeholder={`Projected: ${formatCurrency(viewingExpense.expense.projectedAmount || (viewingExpense.expense as any).amount || 0)}`}
                            className={`w-full rounded-xl border px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
                              actualOverProjected
                                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
                                : 'border-blue-200 bg-blue-50 focus:border-[#2563EB] focus:ring-blue-500/10'
                            }`}
                          />
                          {actualOverProjected ? (
                            <p className="text-[10px] font-pmedium text-red-500">
                              {viewingIsAddOn
                                ? `Actual cost cannot exceed this Add-on line's approved amount of ${formatCurrency(maxActualAllowed)}. File a new extra request for more.`
                                : `Actual cannot exceed the projected amount (${formatCurrency(expenseProjected)}). File an extra budget request for the additional funds.`}
                            </p>
                          ) : (
                            <p className="text-[10px] font-pmedium text-slate-400">This value becomes the expense Actual and monthly Actual Spent.</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!selectedVendorToLink || !actualAmountToPay || Number(actualAmountToPay) < 0 || isLinkingVendor || !canRecordSpend || actualOverProjected || addonLinkLocked}
                        onClick={() => handleLinkVendor(viewingExpense.month, viewingExpense.expense)}
                        className="px-4 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isLinkingVendor ? 'Linking…' : 'Link Vendor'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-pmedium text-slate-500">No vendors registered yet — add one first, then link it here.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center gap-3 sm:gap-4 shrink-0">
              {canManagePayments && viewingExpense.expense.paymentStatus !== 'Paid' && (
                <button
                  onClick={() => handleMarkPaid(viewingExpense.month, viewingExpense.expense)}
                  className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Mark as Paid
                </button>
              )}
              <button
                onClick={() => openInvoiceForm(viewingExpense.month, viewingExpense.expense)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <UploadCloud size={14} />
                Add Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {invoiceTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-pmedium text-slate-900">Add Invoice</h2>
                <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{invoiceTarget.expense.title}</p>
              </div>
              <button type="button" onClick={() => setInvoiceTarget(null)} className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                <div><p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-500">Approved Projection</p><p className="mt-1 text-sm font-pmedium text-blue-900">{formatCurrency(invoiceTarget.expense.projectedAmount)}</p></div>
                <div><p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-500">Vendor Actual</p><p className="mt-1 text-sm font-pmedium text-blue-900">{formatCurrency(invoiceVendorActual)}</p></div>
                <div><p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-500">Already Invoiced</p><p className="mt-1 text-sm font-pmedium text-blue-900">{formatCurrency(invoiceExistingTotal)}</p></div>
                <div><p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-500">Remaining to Invoice</p><p className="mt-1 text-sm font-pmedium text-blue-900">{formatCurrency(Math.max(0, invoiceLimit - invoiceExistingTotal))}</p></div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Invoice Number *</label>
                <input
                  value={invoiceForm.invoiceNumber}
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                  maxLength={120}
                  placeholder="Example: INV-2026-0042"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Invoice Amount ({currency}) *</label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter this invoice amount"
                  className={`w-full rounded-xl border px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:ring-4 ${invoiceExceedsProjection ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#2563EB] focus:ring-blue-500/10'}`}
                />
                {invoiceForm.amount && invoiceEnteredAmount > 0 && (
                  <div className={`mt-2 rounded-xl border p-3 text-[10px] font-pmedium ${invoiceExceedsProjection ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    {invoiceExceedsProjection
                      ? `Invoice total exceeds the ${invoiceVendorActual > 0 ? 'vendor actual amount' : 'approved projection'} by ${formatCurrency(invoiceExcessAmount)}.`
                      : `${formatCurrency(invoiceRemainingAmount)} will remain after adding this invoice.`}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Invoice File *</label>
                <input
                  type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="w-full text-[11px] font-pmedium text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-[10px] file:font-pmedium file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button type="button" onClick={() => setInvoiceTarget(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 hover:bg-slate-100">Cancel</button>
              <button
                type="button"
                onClick={handleUploadInvoice}
                disabled={isUploadingInvoice || invoiceExceedsProjection}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploadingInvoice ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                {isUploadingInvoice ? 'Uploading...' : 'Add Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
