import React, { useEffect, useState } from 'react';
import {
  Search, DollarSign, TrendingUp, CheckCircle2, Clock, AlertCircle,
  Eye, X, Check, MessageSquare, Building2,
  Calendar, Filter, Plus, FileText, Receipt, FileWarning, Download,
  AlertTriangle, XCircle, PieChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth-session';
import { applyFinanceApprovalDecision, getFinanceSnapshot, updateMonthlyExpenseStatus } from '@/services/finance';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { DEFAULT_FISCAL_YEAR, getFiscalYearOptions } from '@/features/finance/utils/fiscalYear';
import PageFrame from '@/components/Pages/PageFrame';
import { statusPillClass } from '../../lib/status-pill';
import { ApprovalFlowBadges, hasApprovalProgress } from '../../components/finance/ApprovalFlowBadges';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import { formatFinancePaymentStatus } from '@/features/finance/utils/paymentStatus';

// Axios errors carry the API's real message inside response.data.message.
function getApiErrorMessage(error: any, fallback: string): string {
  const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  const raw = typeof error?.message === 'string' ? error.message : '';
  if (raw && !/^request failed/i.test(raw)) return raw;
  return fallback;
}

export function FinancePage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const profile = {
    name:
      currentUser?.fullName ||
      [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
      currentUser?.name ||
      'Founder',
    role: currentUser?.role || currentUser?.designation || 'Founder',
  };
  const normalizedCurrentUserRole = String(
    currentUser?.workspaceMembership?.role ||
    currentUser?.role ||
    currentUser?.designation ||
    '',
  )
    .trim()
    .toLowerCase();
  const isFinanceManagerUser = normalizedCurrentUserRole === 'finance-manager';

  // --- STATE ---
  const fiscalYearOptions = getFiscalYearOptions();
  const [selectedFY, setSelectedFY] = useState(DEFAULT_FISCAL_YEAR);
  const [activeTab, setActiveTab] = useState('approvals');
  const [approvalSubTab, setApprovalSubTab] = useState('annual');
  const [isLoadingFinance, setIsLoadingFinance] = useState(false);
  const [hasLoadedFinanceSnapshot, setHasLoadedFinanceSnapshot] = useState(false);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionPrompt, setDecisionPrompt] = useState<{ action: 'Rejected' | 'Discuss'; request: any } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  
  // Modal States
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [viewingDeptOverview, setViewingDeptOverview] = useState<any>(null);
  const [viewingExpense, setViewingExpense] = useState<any>(null);

  const [departments, setDepartments] = useState<any[]>([]);
  const [annualRequests, setAnnualRequests] = useState<any[]>([]);
  const [extraRequests, setExtraRequests] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [departmentFinance, setDepartmentFinance] = useState<any[]>([]);

  const normalizeDepartmentKey = (value = '') =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

  const buildDepartmentsWithApprovedRequests = (departmentsList = [], annualRequestsList = [], departmentFinanceList = []) => {
    const approvedRequestsByDepartment = new Map();
    const approvedRequestsById = new Map();
    const departmentFinanceByDepartment = new Map();

    annualRequestsList
      .filter((request: any) =>
        String(request?.status || '').toLowerCase() === 'approved' ||
        String(request?.approvalFlow?.owner?.status || '').toLowerCase() === 'approved',
      )
      .forEach((request: any) => {
        const key = normalizeDepartmentKey(request?.department || '');
        if (!key) return;
        approvedRequestsByDepartment.set(key, request);
        if (request?.id) approvedRequestsById.set(String(request.id), request);
      });

    departmentFinanceList.forEach((plan: any) => {
      const key = normalizeDepartmentKey(plan?.department || '');
      if (!key) return;
      departmentFinanceByDepartment.set(key, plan);
    });

    const baseRows = departmentsList.length > 0 ? departmentsList : departmentFinanceList;

    return baseRows.map((department: any) => {
      const key = normalizeDepartmentKey(department?.name || department?.department || '');
      const departmentPlan = departmentFinanceByDepartment.get(key) || null;
      const requestFromDepartment = approvedRequestsByDepartment.get(key) || null;
      const requestFromPlan = departmentPlan?.requestId ? approvedRequestsById.get(String(departmentPlan.requestId)) : null;
      const approvedAnnualRequest =
        requestFromDepartment ||
        requestFromPlan ||
        (departmentPlan?.annualBudgetRequested
          ? {
              id: departmentPlan.requestId || '',
              department: departmentPlan.department || department?.name || department?.department || '',
              requestedBudget: Number(departmentPlan.annualBudgetRequested || 0),
              previousSpend: Number(departmentPlan.previousSpend || 0),
              status: departmentPlan.status || 'Pending',
              breakdown: departmentPlan.notes || '',
              approvalFlow: departmentPlan.approvalFlow || {},
              approvalStateLabel:
                departmentPlan.approvalStateLabel || departmentPlan.approvalFlow?.finalStatus || 'Pending',
            }
          : null);

      return {
        ...department,
        id: department?.id || departmentPlan?.id || key || department?.department || department?.name || '',
        name: department?.name || department?.department || departmentPlan?.department || '',
        department: department?.department || department?.name || departmentPlan?.department || '',
        approvedBudget: Number(
          department?.approvedBudget ||
          departmentPlan?.approvedAnnualBudget ||
          approvedAnnualRequest?.requestedBudget ||
          departmentPlan?.annualBudgetRequested ||
          0,
        ),
        spentYTD: Number(
          department?.spentYTD ||
          (Array.isArray(departmentPlan?.monthlyPlan)
            ? departmentPlan.monthlyPlan.reduce((sum: number, month: any) => sum + Number(month?.actualSpent || 0), 0)
            : 0),
        ),
        extraGrantedYTD: Number(department?.extraGrantedYTD || 0),
        health: department?.health || 'Healthy',
        approvedAnnualRequest: approvedAnnualRequest || department?.approvedAnnualRequest || null,
      };
    });
  };

  const applyFinanceData = (payload: any) => {
    if (!payload || typeof payload !== 'object') return;
    const withUiId = (request: any) => ({
      ...request,
      id: request?.id || request?._id || '',
    });
    const nextAnnualRequests = Array.isArray(payload.annualRequests)
      ? payload.annualRequests.map(withUiId)
      : [];
    const nextExtraRequests = Array.isArray(payload.extraRequests)
      ? payload.extraRequests.map(withUiId)
      : [];
    const nextDepartmentFinance = Array.isArray(payload.departmentFinance) ? payload.departmentFinance : [];
    const nextDepartments = Array.isArray(payload.departments) ? payload.departments : [];

    setDepartments(
      nextDepartments.length > 0 || nextDepartmentFinance.length > 0
        ? buildDepartmentsWithApprovedRequests(nextDepartments, nextAnnualRequests, nextDepartmentFinance)
        : [],
    );
    setAnnualRequests(nextAnnualRequests);
    setExtraRequests(nextExtraRequests);
    setDepartmentFinance(nextDepartmentFinance);
    setAuditTrail(Array.isArray(payload.auditTrail) ? payload.auditTrail : []);
  };

  useEffect(() => {
    let isMounted = true;

    const loadFinance = async () => {
      setIsLoadingFinance(true);
      setErrorMessage('');
      try {
        const response = await getFinanceSnapshot(selectedFY);
        if (isMounted) applyFinanceData(response || {});
      } catch (error: any) {
        if (isMounted) setErrorMessage(getApiErrorMessage(error, 'Failed to load finance dashboard data.'));
      } finally {
        if (isMounted) {
          setHasLoadedFinanceSnapshot(true);
          setIsLoadingFinance(false);
        }
      }
    };

    loadFinance();
    const handleFinanceSnapshotUpdated = () => loadFinance();
    window.addEventListener('finance:snapshot-updated', handleFinanceSnapshotUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('finance:snapshot-updated', handleFinanceSnapshotUpdated);
    };
  }, [selectedFY]);

  // --- STATS ---
  const totalAllocated = departments.reduce((acc, curr) => acc + (curr.approvedBudget || 0) + (curr.extraGrantedYTD || 0), 0);
  const totalSpent = departments.reduce((acc, curr) => acc + curr.spentYTD, 0);
  const isActionableFinanceRequest = (request: any = {}) => ['pending', 'discuss'].includes(String(request?.status || '').toLowerCase());
  
  const pendingAnnualRequests = annualRequests.filter(isActionableFinanceRequest);
  const visibleAnnualRequests = annualRequests;
  const pendingExtraRequests = extraRequests.filter(isActionableFinanceRequest);
  const visibleExtraRequests = extraRequests;
  const pendingActions = pendingAnnualRequests.length + pendingExtraRequests.length;

  const departmentInvoiceEntries = viewingDeptOverview
    ? departmentFinance
        .filter((plan) => plan?.department === viewingDeptOverview.name)
        .flatMap((plan) =>
          Array.isArray(plan?.monthlyPlan)
            ? plan.monthlyPlan.flatMap((month: any) =>
                Array.isArray(month?.expenses)
                  ? month.expenses
                      .filter((exp: any) => exp?.invoiceUrl || exp?.invoiceFile || exp?.invoiceNumber)
                      .map((exp: any, idx: number) => ({
                        expenseId: exp.id || '',
                        id: exp.id || `${plan.department}-${month.monthKey || month.month || 'month'}`,
                        month: month.month || '',
                        monthKey: month.monthKey || '',
                        title: exp.title || month.title || '',
                        monthTitle: month.title || '',
                        expenseLabel: exp.expenseLabel || `Expense ${idx + 1}`,
                        invoiceNumber: exp.invoiceNumber || '',
                        invoiceUrl: exp.invoiceUrl || exp.invoiceFile || '',
                        expenseTag: exp.expenseTag || '',
                      }))
                  : [],
              )
            : [],
        )
    : [];

  const viewingDepartmentFinancePlan = viewingDeptOverview
    ? departmentFinance.find((plan) => plan?.department === viewingDeptOverview.name)
    : null;

  // Full month-by-month detail for the request the founder is reviewing.
  // Prefers the department plan (expenses are joined server-side), falls back
  // to whatever breakdown was stored on the annual request itself.
  const viewingRequestDetail = React.useMemo(() => {
    if (!viewingRequest) return null;
    const plan = departmentFinance.find((p: any) => p?.department === viewingRequest.department);
    const fallbackMonths = Array.isArray(viewingRequest.monthlyBreakdown)
      ? viewingRequest.monthlyBreakdown
      : Array.isArray(viewingRequest.monthlyPlan)
        ? viewingRequest.monthlyPlan
        : [];
    const sourceMonths =
      Array.isArray(plan?.monthlyPlan) && plan.monthlyPlan.length > 0 ? plan.monthlyPlan : fallbackMonths;
    const deptName = String(viewingRequest.department || '');
    const months = sourceMonths.map((m: any, idx: number) => ({
      key: m?.monthKey || m?.month || `m-${idx}`,
      label: m?.month || m?.title || `Month ${idx + 1}`,
      title: m?.title || '',
      projected: Number(m?.projectedBudget ?? m?.amount ?? 0),
      actualSpent: Number(m?.actualSpent ?? 0),
      expenses: (Array.isArray(m?.expenses) ? m.expenses : []).filter((e: any) => {
        const tag = String(e?.expenseTag || '').toLowerCase();
        if (tag !== 'add-on') return true;
        // Approved extras surface as sanctioned lines.
        return extraRequests.some((r: any) =>
          String(r?.status || '').toLowerCase() === 'approved' &&
          String(r?.department || '') === deptName &&
          String(r?.monthKey || r?.month || '').toLowerCase() === String(m?.monthKey || m?.month || '').toLowerCase()
        );
      }),
    }));
    return { plan: plan || null, months };
  }, [viewingRequest, departmentFinance, extraRequests]);

  // Approved requests reveal vendor / payment / invoice detail columns,
  // mirroring the finance manager's Budget Review modal.
  const isViewingApprovedRequest = String(viewingRequest?.status || '').toLowerCase() === 'approved';

  // Which approval step does the CURRENT user own? Founder/owner-side roles act on the
  // "owner" step; finance managers act on the "financeManager" step.
  const viewingUserScope = /finance[-_ ]?manager|^finance$/.test(normalizedCurrentUserRole)
    ? 'financeManager'
    : 'owner';
  // Role strings can be unreliable, so first check which steps THIS user id
  // actually decided (approverUserId is stamped server-side on every decision).
  const currentApproverUserId = String(currentUser?._id || currentUser?.id || '');
  const viewingMyStepStatus = (() => {
    const flow: any = viewingRequest?.approvalFlow;
    if (!flow) return '';
    for (const key of ['owner', 'financeManager']) {
      const step = flow[key];
      const status = String(step?.status || '').toLowerCase();
      if (
        (status === 'approved' || status === 'rejected') &&
        currentApproverUserId &&
        String(step?.approverUserId || '') === currentApproverUserId
      ) {
        return status;
      }
    }
    return String(flow[viewingUserScope]?.status || '').toLowerCase();
  })();
  // Only a real decision (approved/rejected) locks the current user out of acting again.
  const viewingHasDecided = viewingMyStepStatus === 'approved' || viewingMyStepStatus === 'rejected';

  const departmentRegisteredVendors = Array.isArray(viewingDepartmentFinancePlan?.vendors)
    ? viewingDepartmentFinancePlan.vendors
    : [];

  // Month-by-month detail for the department overview modal (Overview tab eye
  // icon) — mirrors the request review table so the founder sees projected vs
  // actual spend for every month and every expense line.
  const overviewDetail = React.useMemo(() => {
    if (!viewingDeptOverview) return null;
    const plan = viewingDepartmentFinancePlan || departmentFinance.find((p: any) => p?.department === viewingDeptOverview.name) || null;
    const sourceMonths = Array.isArray(plan?.monthlyPlan) ? plan.monthlyPlan : [];
    const deptName = String(viewingDeptOverview?.name || '');
    const months = sourceMonths.map((m: any, idx: number) => ({
      key: m?.monthKey || m?.month || `m-${idx}`,
      label: m?.month || m?.title || `Month ${idx + 1}`,
      title: m?.title || '',
      allocated: Number(m?.allocatedBudget ?? m?.projectedBudget ?? 0),
      projected: Number(m?.projectedBudget ?? 0),
      actualSpent: Number(m?.actualSpent ?? 0),
      expenses: (Array.isArray(m?.expenses) ? m.expenses : []).filter((e: any) => {
        const tag = String(e?.expenseTag || '').toLowerCase();
        if (tag !== 'add-on') return true;
        // Approved extras surface as sanctioned lines.
        return extraRequests.some((r: any) =>
          String(r?.status || '').toLowerCase() === 'approved' &&
          String(r?.department || '') === deptName &&
          String(r?.monthKey || r?.month || '').toLowerCase() === String(m?.monthKey || m?.month || '').toLowerCase()
        );
      }),
    }));
    return {
      plan,
      planStatus: String(plan?.status || '').toLowerCase(),
      months,
    };
  }, [viewingDeptOverview, viewingDepartmentFinancePlan, departmentFinance]);

  // --- HANDLERS ---
  const handleAction = async (type: string, id: string, action: string, note = '') => {
    setIsSavingDecision(true);
    setErrorMessage('');
    try {
      await applyFinanceApprovalDecision(type, id, { status: action, fiscalYear: selectedFY, note });
      const response = await getFinanceSnapshot(selectedFY);
      applyFinanceData(response || {});
      setViewingRequest(null);
      setDecisionPrompt(null);
      setDecisionComment('');
    } catch (error: any) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to update approval decision.'));
    } finally {
      setIsSavingDecision(false);
    }
  };

  const handleMarkPaid = async (expense: any = {}) => {
    if (!isFinanceManagerUser) {
      setErrorMessage('Only the finance manager can mark expenses as paid.');
      return;
    }
    const monthKey = expense?.monthKey || expense?.month || viewingExpense?.monthKey || viewingExpense?.month || '';
    const expenseId = expense?.id || viewingExpense?.id || '';
    if (!monthKey || !expenseId) {
      setErrorMessage('Unable to identify the selected expense for payment.');
      return;
    }
    setIsMarkingPaid(true);
    setErrorMessage('');
    try {
      await updateMonthlyExpenseStatus({ fiscalYear: selectedFY, monthKey, expenseId, status: 'Paid' });
      const response = await getFinanceSnapshot(selectedFY);
      applyFinanceData(response || {});
      setViewingExpense((current: any) => (current ? { ...current, paymentStatus: 'Paid', status: 'Paid' } : current));
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to update payment status.');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (amount: number) =>
    formatWorkspaceCurrency(Number(amount || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });
  const getDepartmentActualSpend = (departmentName = '') => {
    const plan = departmentFinance.find(
      (item: any) => normalizeDepartmentKey(item?.department || '') === normalizeDepartmentKey(departmentName),
    );
    if (!Array.isArray(plan?.monthlyPlan)) return 0;

    return plan.monthlyPlan.reduce((yearTotal: number, month: any) => {
      if (!Array.isArray(month?.expenses)) return yearTotal + Number(month?.actualSpent || 0);
      const monthActual = month.expenses.reduce(
        (monthTotal: number, expense: any) => monthTotal + Number(expense?.actualAmount ?? expense?.actualSpent ?? 0),
        0,
      );
      return yearTotal + monthActual;
    }, 0);
  };

  // Shared UI logic
  const tabs = [
    { key: 'approvals', label: 'Approval Center' },
    { key: 'overview', label: 'Master Overview' },
  ];

  const subTabsApprovals = [
    { key: 'annual', label: 'Projected Annual Budget Requests' },
    { key: 'extra', label: 'Extra Budget Requests' },
  ];

  if (!hasLoadedFinanceSnapshot && isLoadingFinance) {
    return <TablePageSkeleton rows={5} columns={5} />;
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          
          {/* HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Executive Finance Hub
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Master control over budgets, spending audits, and document tracking.
              </p>
            </div>
            {errorMessage && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-semibold border border-red-200">
                {errorMessage}
              </div>
            )}
          </div>

          {/* MAIN TABS */}
          <div data-tour="finance-tabs" className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm shrink-0">
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

          {/* STAT CARDS */}
          <div data-tour="finance-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Total Budget</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalAllocated)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><DollarSign size={16}/></div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Spent (YTD)</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><TrendingUp size={16}/></div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Action Required</p>
                <p className="text-[15px] font-pmedium text-slate-900">{pendingActions} Req</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><AlertCircle size={16}/></div>
            </div>
            
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Financial Year</p>
                <p className="text-[15px] font-pmedium text-slate-900">{selectedFY}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Calendar size={16}/></div>
            </div>
          </div>

          {/* DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* INNER TABS & ACTION BAR */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              
              {/* Inner Tabs for Approvals, or Title for Overview */}
              {activeTab === 'approvals' ? (
                <div data-tour="finance-sub-tabs" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden w-full xl:w-auto">
                  {subTabsApprovals.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setApprovalSubTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                        approvalSubTab === tab.key
                          ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                          : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex bg-slate-100/50 p-1 rounded-xl w-full xl:w-auto relative border border-slate-200/50">
                   <div className="px-4 py-2 font-bold text-[13px] text-[#0F172A]">Company Budget Health Tracker</div>
                </div>
              )}

              {/* SEARCH & FILTERS */}
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    data-tour="finance-search"
                    type="text" placeholder="Search..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                  <select
                    data-tour="finance-fy-select"
                    value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                  >
                    {fiscalYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* CONTENT AREA / TABLES */}
            <div className="flex-1 overflow-x-auto">
              
              {/* TAB: APPROVALS */}
              {activeTab === 'approvals' && (
                <table data-tour="finance-table" className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    {approvalSubTab === 'annual' ? (
                      <tr>
                        <th className="px-5 py-4">Department</th>
                        <th className="px-5 py-4">Total Requested Budget</th>
                        <th className="px-5 py-4">Actual Spend (FY)</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-center">Action</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-5 py-4">Date & Dept</th>
                        <th className="px-5 py-4">Amount Requested</th>
                        <th className="px-5 py-4">Justification</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-center">Action</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {approvalSubTab === 'annual' ? (
                      visibleAnnualRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="font-pmedium text-slate-900 flex items-center gap-2"><Building2 size={14} className="text-[#2563EB]"/> {req.department}</div>
                            <div className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest mt-1">REF: {req.requestKey || req.id}</div>
                          </td>
                          <td className="px-5 py-4 font-pmedium text-[#2563EB] text-lg">{formatCurrency(req.requestedBudget)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-500">{formatCurrency(getDepartmentActualSpend(req.department))}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-start gap-1">
                              {hasApprovalProgress(req.approvalFlow)
                                ? <ApprovalFlowBadges flow={req.approvalFlow} />
                                : <span className={statusPillClass(req.status)}>{req.status}</span>}
                              {req.isHistorical && (
                                <span className="inline-flex px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[8px] font-pmedium uppercase tracking-wider">Historical</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => navigate(`/extra-common-modules/finance-management/review/annual/${encodeURIComponent(req.id)}`, { state: { request: req, fiscalYear: selectedFY } })} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg text-[9px] sm:text-[10px] font-pmedium uppercase transition-all shadow-sm flex items-center gap-1 mx-auto" title="View Request">
                              <Eye size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      visibleExtraRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="font-pmedium text-slate-900">{req.department}</div>
                            <div className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mt-1">{req.date}</div>
                          </td>
                          <td className="px-5 py-4 font-pmedium text-[#2563EB] text-base">{formatCurrency(req.amount)}</td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-pmedium text-slate-800 max-w-[250px] truncate">{req.title || req.targetTitle || 'Extra Budget'}</div>
                            <div className="mt-1 text-[10px] text-slate-500 max-w-[250px] truncate">{req.reason}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-start gap-1">
                              {hasApprovalProgress(req.approvalFlow)
                                ? <ApprovalFlowBadges flow={req.approvalFlow} />
                                : <span className={statusPillClass(req.status)}>{req.status}</span>}
                              {req.isHistorical && (
                                <span className="inline-flex px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[8px] font-pmedium uppercase tracking-wider">Historical</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => setViewingRequest({ ...req, type: 'extra' })} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg text-[9px] sm:text-[10px] font-pmedium uppercase transition-all shadow-sm flex items-center gap-1 mx-auto" title="View Request">
                              <Eye size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                    {((approvalSubTab === 'annual' && visibleAnnualRequests.length === 0) || (approvalSubTab === 'extra' && visibleExtraRequests.length === 0)) && (
                       <tr>
                         <td colSpan={5} className="text-center py-20 text-slate-400 font-pmedium">
                           No items found.
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <table data-tour="finance-table" className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Department Name</th>
                      <th className="px-5 py-4">Approved Annual Budget</th>
                      <th className="px-5 py-4">Total Spent (YTD)</th>
                      <th className="px-5 py-4">Remaining Balance</th>
                      <th className="px-5 py-4">Health Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {departments.map((dept) => {
                      const approvedBudget = Number(dept.approvedBudget || dept.approvedAnnualRequest?.requestedBudget || 0);
                      const remaining = approvedBudget + dept.extraGrantedYTD - dept.spentYTD;
                      const spentPercent = (dept.spentYTD / (approvedBudget + dept.extraGrantedYTD)) * 100;
                      
                      return (
                        <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 font-pmedium text-slate-900"><Building2 size={14} className="inline mr-2 text-slate-400"/>{dept.name}</td>
                          <td className="px-5 py-4">
                            <div className="font-pmedium text-slate-700">{formatCurrency(approvedBudget)}</div>
                            {dept.extraGrantedYTD > 0 && <div className="text-[10px] font-pmedium text-slate-500">+ {formatCurrency(dept.extraGrantedYTD)} Extra</div>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-pmedium text-slate-700">{formatCurrency(dept.spentYTD)}</div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 max-w-[120px]">
                              <div className={`h-1.5 rounded-full ${spentPercent > 90 ? 'bg-red-500' : spentPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(spentPercent, 100)}%` }}></div>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-pmedium text-slate-900">{formatCurrency(remaining)}</td>
                          <td className="px-5 py-4">
                            <span className={statusPillClass(dept.health)}>
                              {dept.health}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => setViewingDeptOverview(dept)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all mx-auto block" title="View Details">
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {departments.length === 0 && (
                       <tr>
                         <td colSpan={6} className="text-center py-20 text-slate-400 font-pmedium">
                           No departments found.
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
              )}

            </div>
          </div>

        </div>
      </PageFrame>
      
      {/* MODALS */}
      {viewingRequest && viewingRequest.type === 'extra' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2.5rem] w-full max-w-lg sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 lg:p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2"><AlertCircle size={18} className="sm:w-5 sm:h-5" /> Extra Budget</h2>
                <p className="text-[9px] sm:text-[10px] font-pmedium text-slate-400 uppercase">REF: {viewingRequest.requestKey || viewingRequest.id} • Revision {Number(viewingRequest.revision || 1)}</p>
              </div>
              <button onClick={() => setViewingRequest(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all"><X size={16} /></button>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1 bg-white space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-pmedium text-gray-500 uppercase mb-1">Department</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2"><Building2 size={16} className="sm:w-5 sm:h-5 text-amber-500" /> {viewingRequest.department}</p>
                  <p className="mt-1 text-[10px] font-pmedium text-gray-400">Submitted by {viewingRequest.submittedByName || 'Dept. Manager'} {viewingRequest.date || viewingRequest.submittedAtLabel ? `• ${viewingRequest.date || viewingRequest.submittedAtLabel}` : ''}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[9px] sm:text-[10px] font-pmedium text-gray-500 uppercase mb-1">Requested</p>
                  <p className="text-2xl sm:text-3xl font-black text-amber-600">{formatCurrency(viewingRequest.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-pmedium text-gray-500 uppercase mb-2">Expense Title</p>
                  <p className="text-sm font-black text-gray-900">{viewingRequest.title || viewingRequest.targetTitle || 'Extra Budget'}</p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-pmedium text-gray-500 uppercase mb-2">Requested Month</p>
                  <p className="text-sm font-black text-gray-900">{viewingRequest.month || viewingRequest.monthKey || '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] sm:text-[10px] font-pmedium text-gray-500 uppercase mb-2 flex items-center gap-1.5"><FileText size={12} className="sm:w-3.5 sm:h-3.5" /> Justification</p>
                <div className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed bg-gray-50 border border-gray-200 p-3 sm:p-5 rounded-xl whitespace-pre-line">
                  {viewingRequest.reason || viewingRequest.breakdown || 'No additional justification provided.'}
                </div>
              </div>

              <div>
                <p className="text-[9px] sm:text-[10px] font-pmedium text-gray-500 uppercase mb-2">Approval Status</p>
                {hasApprovalProgress(viewingRequest.approvalFlow)
                  ? <ApprovalFlowBadges flow={viewingRequest.approvalFlow} />
                  : <span className={statusPillClass(viewingRequest.status)}>{viewingRequest.status}</span>}
              </div>
            </div>

            {(() => {
              const requestStatus = String(viewingRequest.status || '').toLowerCase();
              const actionable = requestStatus === 'pending' && !viewingHasDecided;
              if (actionable) {
                return (
                  <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
                    <button disabled={isSavingDecision} onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Discuss', request: viewingRequest }); }} className="min-w-0 px-3 py-3 bg-white border border-blue-200 text-blue-600 rounded-xl font-pmedium hover:bg-blue-50 transition-all text-[11px] flex items-center justify-center gap-1.5">
                      <MessageSquare size={14} /> REQUEST CHANGES
                    </button>
                    <button disabled={isSavingDecision} onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Rejected', request: viewingRequest }); }} className="min-w-0 px-3 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-pmedium hover:bg-red-50 transition-all text-[11px] flex items-center justify-center gap-1.5">
                      <XCircle size={14} /> REJECT
                    </button>
                    <button disabled={isSavingDecision} onClick={() => handleAction('extra', viewingRequest.id, 'Approved')} className="min-w-0 px-3 py-3 bg-green-600 text-white rounded-xl font-pmedium shadow-sm hover:bg-green-700 transition-all text-[11px] flex items-center justify-center gap-1.5">
                      APPROVE <CheckCircle2 size={14} />
                    </button>
                  </div>
                );
              }
              if (viewingMyStepStatus === 'approved' || viewingMyStepStatus === 'rejected') {
                return (
                  <div className="p-4 sm:p-6 bg-emerald-50/60 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                    <span className="flex items-center gap-2 text-[11px] font-pmedium uppercase tracking-wider text-emerald-700"><CheckCircle2 size={14} /> You have already {viewingMyStepStatus} this request.</span>
                    <button onClick={() => setViewingRequest(null)} className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-pmedium hover:bg-gray-200 transition-all text-sm">CLOSE</button>
                  </div>
                );
              }
              return <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100"><button onClick={() => setViewingRequest(null)} className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-pmedium hover:bg-gray-100 transition-all text-sm">CLOSE</button></div>;
            })()}
          </div>
        </div>
      )}

      {viewingRequest && viewingRequest.type === 'annual' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full sm:w-[95vw] max-w-[1500px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded border text-[9px] font-pmedium uppercase tracking-widest bg-blue-500/20 text-blue-300 border-blue-400/30 mb-2 inline-block">
                  {viewingRequest.type === 'annual' ? 'Annual Budget Request' : 'Extra Budget Request'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1">
                  <PieChart size={20} /> Budget Review
                </h2>
                <p className="text-[10px] font-pmedium text-slate-400 uppercase mt-0.5">REF: {viewingRequest.requestKey || viewingRequest.id} • Revision {Number(viewingRequest.revision || 1)}</p>
              </div>
              <button onClick={() => setViewingRequest(null)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
              <div className="px-6 sm:px-8 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-gray-100 bg-white">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Department</p>
                  <p className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-1.5 mt-0.5">
                    <Building2 size={14} className="text-[#2563EB] shrink-0" /> {viewingRequest.department}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-600">Total Requested</p>
                  <p className="text-xl sm:text-2xl font-black text-blue-900 mt-0.5">{formatCurrency(viewingRequest.type === 'annual' ? viewingRequest.requestedBudget : viewingRequest.amount)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Submitted By</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">{viewingRequest.submittedByName || 'Dept. Manager'}</p>
                  <p className="text-[10px] font-pmedium text-gray-400">{viewingRequest.date || viewingRequest.submittedAtLabel || ''}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Status</p>
                  {hasApprovalProgress(viewingRequest.approvalFlow) ? (
                    <span className="mt-1"><ApprovalFlowBadges flow={viewingRequest.approvalFlow} /></span>
                  ) : (
                    <span className={`mt-1 inline-flex w-fit px-2.5 py-1 rounded-lg text-[9px] font-pmedium uppercase tracking-widest border ${String(viewingRequest.status).toLowerCase() === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : String(viewingRequest.status).toLowerCase() === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{viewingRequest.status}</span>
                  )}
                </div>
              </div>

              <div className="px-6 sm:px-8 py-4 border-b border-gray-100 bg-white">
                <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <FileText size={11} /> Business Justification
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-700 leading-relaxed">
                  {viewingRequest.reason || viewingRequest.breakdown || 'No additional justification provided.'}
                </p>
              </div>

              <div className="px-4 sm:px-8 py-6">
              {viewingRequest.type === 'annual' && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-[10px] sm:text-xs font-pmedium uppercase tracking-widest text-gray-900">
                    <Calendar size={13} className="text-[#2563EB]" /> Monthly Expense Plan
                    {viewingRequestDetail && viewingRequestDetail.months.length > 0 && (
                      <span className="ml-1 text-gray-400 font-bold normal-case tracking-normal">({viewingRequestDetail.months.length} months)</span>
                    )}
                  </h4>
                  {!viewingRequestDetail || viewingRequestDetail.months.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400">No monthly breakdown has been submitted for this request.</p>
                  ) : (
                    <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed text-left" style={{ minWidth: isViewingApprovedRequest ? '1410px' : '1050px' }}>
                          <thead className="sticky top-0 z-10">
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="w-[290px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Expense</th>
                              <th className="px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Description</th>
                              <th className="w-[130px] px-4 py-3.5 text-right text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Projected</th>
                              <th className="w-[130px] px-4 py-3.5 text-right text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Actual</th>
                              <th className="w-[120px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Due</th>
                              {isViewingApprovedRequest && <>
                                <th className="w-[220px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Vendor</th>
                                <th className="w-[160px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Payment</th>
                                <th className="w-[160px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Invoice</th>
                              </>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {viewingRequestDetail.months.map((month) => {
                              const expenses = Array.isArray(month.expenses) ? month.expenses : [];
                              const colSpan = isViewingApprovedRequest ? 8 : 5;
                              return (
                                <React.Fragment key={month.key}>
                                  <tr className="border-y border-blue-100 bg-blue-50/80">
                                    <td colSpan={colSpan} className="px-4 py-3">
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <span className="flex min-w-0 items-center gap-2 text-[11px] font-pmedium uppercase tracking-widest text-slate-900">
                                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm">
                                            <Calendar size={13} />
                                          </span>
                                          {month.label}{month.title ? ` — ${month.title}` : ''}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-pmedium text-slate-700">
                                            Projected <span className="text-[#2563EB]">{formatCurrency(month.projected)}</span>
                                          </span>
                                          {isViewingApprovedRequest && month.actualSpent > 0 && (
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-pmedium text-emerald-700">
                                              Used {formatCurrency(month.actualSpent)}
                                            </span>
                                          )}
                                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                                            {expenses.length} planned
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  {expenses.length === 0 ? (
                                    <tr className="bg-white">
                                      <td colSpan={colSpan} className="px-4 py-5 text-center text-[11px] font-bold text-slate-400">
                                        No expenses listed for this month.
                                      </td>
                                    </tr>
                                  ) : (
                                    expenses.map((exp: any, eIdx: number) => {
                                      const invoiceUrl = exp.invoiceUrl || exp.invoiceFile || '';
                                      const invoices = Array.isArray(exp.invoices) && exp.invoices.length > 0
                                        ? exp.invoices
                                        : (exp.invoiceNumber || invoiceUrl
                                          ? [{ invoiceNumber: exp.invoiceNumber, amount: exp.invoiceAmount, invoiceUrl }]
                                          : []);
                                      const paymentStatus = String(exp.paymentStatus || '');
                                      const approvedIncrease = (Array.isArray(extraRequests) ? extraRequests : [])
                                        .filter((request: any) =>
                                          String(request?.status || '').toLowerCase() === 'approved' &&
                                          String(request?.type || '').toLowerCase() === 'increase' &&
                                          String(request?.appliedExpenseId || '') === String(exp?._id || exp?.id || ''))
                                        .reduce((sum: number, request: any) => sum + Number(request?.amount || 0), 0);
                                      const currentProjection = Number(exp.projectedAmount || 0);
                                      const originalProjection = Math.max(0, currentProjection - approvedIncrease);
                                      const actualAmount = Number(exp.actualAmount ?? exp.actualSpent ?? 0);
                                      return (
                                        <tr key={`${month.key}-exp-${exp.id || eIdx}`} className="border-b border-slate-100 bg-white transition-colors hover:bg-blue-50/40">
                                        <td className="px-4 py-4 align-top">
                                          <div className="flex items-start gap-2">
                                            {String(exp.expenseTag || '').toLowerCase() === 'add-on' && (
                                              <span className="mt-0.5 shrink-0 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-amber-700">Extra</span>
                                            )}
                                            <p className="min-w-0 break-words text-xs font-black leading-snug text-slate-900 sm:text-sm">{exp.title || exp.expenseLabel || `Expense ${eIdx + 1}`}</p>
                                          </div>
                                          {(() => {
                                            const projectedAmt = Number(exp.projectedAmount ?? 0);
                                            const over = Number(exp.actualAmount ?? exp.actualSpent ?? 0) - projectedAmt;
                                            if (over <= 0.009) return null;
                                            const approvedExtra = (Array.isArray(extraRequests) ? extraRequests : [])
                                              .filter((r: any) =>
                                                String(r?.status || '').toLowerCase() === 'approved' &&
                                                String(r?.department || '') === String(viewingRequest?.department || '') &&
                                                String(r?.monthKey || r?.month || '').toLowerCase() === month.key.toLowerCase())
                                              .reduce((sum: number, r: any) => sum + Number(r?.amount || 0), 0);
                                            if (approvedExtra + 0.009 < over) return null;
                                            return (
                                              <span className="mt-2 inline-flex max-w-full items-center gap-1.5 whitespace-normal rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-blue-700">
                                                {formatCurrency(over)} via extra budget
                                              </span>
                                            );
                                          })()}
                                        </td>
                                          <td className="px-4 py-4 align-top">
                                            <p className="break-words text-[11px] font-medium leading-relaxed text-slate-500 sm:text-xs">{exp.description || '—'}</p>
                                          </td>
                                          <td className="px-4 py-4 text-right align-top">
                                            {approvedIncrease > 0 ? (
                                              <div title={`Current projection: ${formatCurrency(currentProjection)}`}>
                                                <p className="whitespace-nowrap text-xs font-black text-slate-700 sm:text-sm">
                                                  {formatCurrency(originalProjection)} <span className="text-[#2563EB]">+ {formatCurrency(approvedIncrease)}</span>
                                                </p>
                                                <span className="mt-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-blue-700">Projection Increased</span>
                                              </div>
                                            ) : (
                                              <p className="whitespace-nowrap text-xs font-black text-[#2563EB] sm:text-sm">{formatCurrency(currentProjection)}</p>
                                            )}
                                          </td>
                                          <td className="px-4 py-4 text-right align-top">
                                            <p className={`whitespace-nowrap text-xs font-black sm:text-sm ${actualAmount > currentProjection ? 'text-rose-600' : actualAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                              {formatCurrency(actualAmount)}
                                            </p>
                                          </td>
                                          <td className="px-4 py-4 align-top">
                                            <p className="text-xs font-bold text-slate-600">{exp.dueDate || '—'}</p>
                                          </td>
                                          {isViewingApprovedRequest && <>
                                            <td className="px-4 py-4 align-top">
                                              {exp.vendorName ? (
                                                <div className="min-w-0">
                                                  <p className="break-words text-xs font-black text-slate-900">{exp.vendorName}</p>
                                                  {exp.vendorContactPerson && <p className="mt-0.5 break-words text-[10px] font-medium text-slate-400">{exp.vendorContactPerson}</p>}
                                                </div>
                                              ) : (
                                                <span className="text-[9px] font-pmedium uppercase tracking-widest text-slate-300">Not Assigned</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                              <span className={`inline-flex whitespace-normal px-2.5 py-1 rounded-lg text-[9px] font-pmedium uppercase tracking-widest ${paymentStatus.includes('Done') || paymentStatus.includes('Paid') ? 'bg-green-50 text-green-700 border border-green-200' : paymentStatus.includes('Invoice') ? 'bg-blue-50 text-blue-700 border border-blue-200' : paymentStatus.includes('Pending') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                {formatFinancePaymentStatus(exp.paymentStatus)}
                                              </span>
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                              {invoices.length > 0 ? (
                                                <div className="space-y-2">
                                                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                                                    {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
                                                  </p>
                                                  {invoices.map((invoice: any, invoiceIndex: number) => {
                                                    const fileUrl = invoice?.invoiceUrl || invoice?.url || invoice?.invoiceFile || '';
                                                    const label = invoice?.invoiceNumber || `Invoice ${invoiceIndex + 1}`;
                                                    const content = (
                                                      <>
                                                        <Receipt size={11} className="shrink-0" />
                                                        <span className="min-w-0 truncate font-black">{label}</span>
                                                        {Number(invoice?.amount || 0) > 0 && <span className="ml-auto shrink-0">{formatCurrency(invoice.amount)}</span>}
                                                      </>
                                                    );
                                                    return fileUrl ? (
                                                      <a key={invoice?.invoiceKey || `${label}-${invoiceIndex}`} href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[10px] text-blue-700 transition-colors hover:bg-blue-100" title={`View ${label}`}>
                                                        {content}
                                                      </a>
                                                    ) : (
                                                      <div key={invoice?.invoiceKey || `${label}-${invoiceIndex}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] text-slate-600">
                                                        {content}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <span className="text-[9px] font-pmedium uppercase tracking-widest text-slate-300">No Invoice</span>
                                              )}
                                            </td>
                                          </>}
                                        </tr>
                                      );
                                    })
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewingRequest.type === 'extra' && viewingRequest.monthKey && (
                <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-pmedium text-amber-800">
                  <Clock size={13} /> Requested for month: <span className="uppercase tracking-wider">{viewingRequest.month}</span> ({viewingRequest.monthKey})
                </p>
              )}
              {viewingRequest.type === 'extra' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Expense Title</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{viewingRequest.title || viewingRequest.targetTitle || 'Extra Budget'}</p>
                </div>
              )}
              </div>
            </div>

            {(() => {
              const requestStatus = String(viewingRequest.status || '').toLowerCase();
              const actionable = requestStatus === 'pending' && !viewingHasDecided;
              if (actionable) {
                return (
                  <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex gap-3 sm:gap-4 shrink-0">
                    <button disabled={isSavingDecision} onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Discuss', request: viewingRequest }); }} className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-pmedium hover:bg-slate-50 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                      <MessageSquare size={14} /> DISCUSS
                    </button>
                    <button disabled={isSavingDecision} onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Rejected', request: viewingRequest }); }} className="flex-1 py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-pmedium hover:bg-red-50 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                      <XCircle size={14} /> REJECT REQUEST
                    </button>
                    <button disabled={isSavingDecision} onClick={() => handleAction(viewingRequest.type, viewingRequest.id, 'Approved')} className="flex-[2] py-3.5 bg-green-600 text-white rounded-xl font-pmedium shadow-lg shadow-green-200 hover:bg-green-700 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                      APPROVE BUDGET <CheckCircle2 size={14} />
                    </button>
                  </div>
                );
              }
              if (viewingMyStepStatus === 'approved' || viewingMyStepStatus === 'rejected') {
                return (
                  <div className="px-6 sm:px-8 py-4 bg-emerald-50/60 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                    <span className="flex items-center gap-2 text-[11px] font-pmedium uppercase tracking-wider text-emerald-700">
                      <CheckCircle2 size={14} /> You have already {viewingMyStepStatus === 'approved' ? 'approved' : 'rejected'} this request.
                    </span>
                    <button onClick={() => setViewingRequest(null)} className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-pmedium hover:bg-gray-200 transition-all text-sm">CLOSE</button>
                  </div>
                );
              }
              return (
                <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex justify-end shrink-0">
                  <button onClick={() => setViewingRequest(null)} className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-pmedium hover:bg-gray-200 transition-all text-sm">CLOSE</button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {viewingDeptOverview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full sm:w-[95vw] max-w-[1500px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded border text-[9px] font-pmedium uppercase tracking-widest bg-blue-500/20 text-blue-300 border-blue-400/30 mb-2 inline-block">
                  Department Budget Overview
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1">
                  <Building2 size={20} /> {viewingDeptOverview.name}
                </h2>
                <p className="text-[10px] font-pmedium text-slate-400 uppercase mt-0.5">
                  {overviewDetail?.plan?.fiscalYear || selectedFY}
                  {overviewDetail?.planStatus ? ` • ${overviewDetail.planStatus}` : ''}
                </p>
              </div>
              <button onClick={() => setViewingDeptOverview(null)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
              <div className="px-6 sm:px-8 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-gray-100 bg-white">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Total Budget</p>
                  <p className="text-xl font-black text-gray-900">{formatCurrency((viewingDeptOverview.approvedBudget || 0) + (viewingDeptOverview.extraGrantedYTD || 0))}</p>
                  {(viewingDeptOverview.extraGrantedYTD || 0) > 0 && (
                    <p className="text-[9px] font-pmedium text-amber-600 uppercase tracking-wider">+{formatCurrency(viewingDeptOverview.extraGrantedYTD)} extra granted</p>
                  )}
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-600">Spent YTD</p>
                  <p className="text-xl font-black text-blue-900">{formatCurrency(viewingDeptOverview.spentYTD)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">Remaining</p>
                  <p className="text-xl font-black text-emerald-700">
                    {formatCurrency(Math.max(0, (viewingDeptOverview.approvedBudget || 0) + (viewingDeptOverview.extraGrantedYTD || 0) - (viewingDeptOverview.spentYTD || 0)))}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Months Tracked</p>
                  <p className="text-xl font-black text-gray-900">{overviewDetail?.months.length || 0}</p>
                </div>
              </div>

              <div className="px-4 sm:px-8 py-6">
                <h4 className="mb-3 flex items-center gap-2 text-[10px] sm:text-xs font-pmedium uppercase tracking-widest text-gray-900">
                  <Calendar size={13} className="text-[#2563EB]" /> Month-wise Spend
                  {overviewDetail && overviewDetail.months.length > 0 && (
                    <span className="ml-1 text-gray-400 font-bold normal-case tracking-normal">({overviewDetail.months.length} months)</span>
                  )}
                </h4>
                {!overviewDetail || overviewDetail.months.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400">No monthly budget data recorded for this department yet.</p>
                ) : (
                  <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed text-left" style={{ minWidth: '1580px' }}>
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="w-[280px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Expense</th>
                            <th className="w-[260px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Description</th>
                            <th className="w-[130px] px-4 py-3.5 text-right text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Projected</th>
                            <th className="w-[130px] px-4 py-3.5 text-right text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Actual</th>
                            <th className="w-[120px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Due</th>
                            <th className="w-[200px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Vendor</th>
                            <th className="w-[140px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Payment</th>
                            <th className="w-[220px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overviewDetail.months.map((month) => {
                            const expenses = Array.isArray(month.expenses) ? month.expenses : [];
                            const monthVariance = month.projected - month.actualSpent;
                            return (
                              <React.Fragment key={month.key}>
                                <tr className="border-y border-blue-100 bg-blue-50/80">
                                  <td colSpan={8} className="px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <span className="flex min-w-0 items-center gap-2 text-[11px] font-pmedium uppercase tracking-widest text-slate-900">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm">
                                          <Calendar size={13} />
                                        </span>
                                        {month.label}{month.title ? ` — ${month.title}` : ''}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-pmedium text-slate-700">
                                          Projected <span className="text-[#2563EB]">{formatCurrency(month.projected)}</span>
                                        </span>
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-pmedium ${monthVariance >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                          Actual <span className="font-black">{formatCurrency(month.actualSpent)}</span>
                                          {month.actualSpent > 0 && (
                                            <span className="ml-1 opacity-80">({monthVariance >= 0 ? `${formatCurrency(monthVariance)} left` : `${formatCurrency(Math.abs(monthVariance))} over`})</span>
                                          )}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                                          {expenses.length} expense{expenses.length === 1 ? '' : 's'}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                                {expenses.length === 0 ? (
                                  <tr className="bg-white">
                                    <td colSpan={8} className="px-4 py-5 text-center text-[11px] font-bold text-slate-400">
                                      No expenses recorded for this month.
                                    </td>
                                  </tr>
                                ) : (
                                  expenses.map((exp: any, eIdx: number) => {
                                    const invoiceUrl = exp.invoiceUrl || exp.invoiceFile || '';
                                    const invoices = Array.isArray(exp.invoices) && exp.invoices.length > 0
                                      ? exp.invoices
                                      : (exp.invoiceNumber || invoiceUrl
                                        ? [{ invoiceNumber: exp.invoiceNumber, amount: exp.invoiceAmount, invoiceUrl }]
                                        : []);
                                    const projected = Number(exp.projectedAmount ?? 0);
                                    const actual = Number(exp.actualAmount ?? exp.actualSpent ?? 0);
                                    const variance = projected - actual;
                                    const approvedIncrease = (Array.isArray(extraRequests) ? extraRequests : [])
                                      .filter((request: any) =>
                                        String(request?.status || '').toLowerCase() === 'approved' &&
                                        String(request?.type || '').toLowerCase() === 'increase' &&
                                        String(request?.appliedExpenseId || '') === String(exp?._id || exp?.id || ''))
                                      .reduce((sum: number, request: any) => sum + Number(request?.amount || 0), 0);
                                    const originalProjection = Math.max(0, projected - approvedIncrease);
                                    return (
                                      <tr key={`${month.key}-exp-${exp.id || eIdx}`} className="border-b border-slate-100 bg-white transition-colors hover:bg-blue-50/40">
                                        <td className="px-4 py-4 align-top">
                                          <div className="flex items-start gap-2">
                                            {String(exp.expenseTag || '').toLowerCase() === 'add-on' && (
                                              <span className="mt-0.5 shrink-0 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-amber-700">Extra</span>
                                            )}
                                            <p className="min-w-0 break-words text-xs font-black leading-snug text-slate-900 sm:text-sm">{exp.title || exp.expenseLabel || `Expense ${eIdx + 1}`}</p>
                                          </div>
                                          {variance < 0 && (() => {
                                            const over = Math.abs(variance);
                                            const approvedExtra = (Array.isArray(extraRequests) ? extraRequests : [])
                                              .filter((r: any) =>
                                                String(r?.status || '').toLowerCase() === 'approved' &&
                                                String(r?.department || '') === String(viewingDeptOverview?.name || '') &&
                                                String(r?.monthKey || r?.month || '').toLowerCase() === month.key.toLowerCase())
                                              .reduce((sum: number, r: any) => sum + Number(r?.amount || 0), 0);
                                            if (approvedExtra + 0.009 < over) return null;
                                            return (
                                              <span className="mt-2 inline-flex max-w-full items-center gap-1.5 whitespace-normal rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-blue-700">
                                                {formatCurrency(over)} via extra budget
                                              </span>
                                            );
                                          })()}
                                          {exp.vendorName && (
                                            <span className="mt-2 inline-flex max-w-full items-center gap-1.5 whitespace-normal rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-600">Vendor Linked</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                          <p className="break-words text-[11px] font-medium leading-relaxed text-slate-500 sm:text-xs">{exp.description || '—'}</p>
                                        </td>
                                        <td className="px-4 py-4 text-right align-top">
                                          {approvedIncrease > 0 ? (
                                            <div title={`Current projection: ${formatCurrency(projected)}`}>
                                              <p className="whitespace-nowrap text-xs font-black text-slate-700 sm:text-sm">
                                                {formatCurrency(originalProjection)} <span className="text-[#2563EB]">+ {formatCurrency(approvedIncrease)}</span>
                                              </p>
                                              <span className="mt-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-blue-700">Projection Increased</span>
                                            </div>
                                          ) : (
                                            <p className="whitespace-nowrap text-xs font-black text-[#2563EB] sm:text-sm">{formatCurrency(projected)}</p>
                                          )}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                          <p className={`whitespace-nowrap text-xs font-black sm:text-sm ${actual > projected ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(actual)}</p>
                                          {actual > 0 && (
                                            <p className="mt-0.5 text-[9px] font-pmedium uppercase tracking-wider text-slate-400">
                                              {variance >= 0 ? `${formatCurrency(variance)} saved` : `${formatCurrency(Math.abs(variance))} over`}
                                            </p>
                                          )}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                          <p className="text-xs font-bold text-slate-600">{exp.dueDate || '—'}</p>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                          {exp.vendorName ? (
                                            <div className="min-w-0">
                                              <p className="break-words text-xs font-black text-slate-900">{exp.vendorName}</p>
                                              {exp.vendorContactPerson && <p className="mt-0.5 break-words text-[10px] font-medium text-slate-400">{exp.vendorContactPerson}</p>}
                                            </div>
                                          ) : (
                                            <span className="text-[9px] font-pmedium uppercase tracking-widest text-slate-300">Not Assigned</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                          <span className={`inline-flex whitespace-normal px-2.5 py-1 rounded-lg text-[9px] font-pmedium uppercase tracking-widest ${(exp.paymentStatus || '').includes('Done') || (exp.paymentStatus || '').includes('Paid') ? 'bg-green-50 text-green-700 border border-green-200' : (exp.paymentStatus || '').includes('Invoice') ? 'bg-blue-50 text-blue-700 border border-blue-200' : (exp.paymentStatus || '').includes('Pending') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                            {formatFinancePaymentStatus(exp.paymentStatus)}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                          {invoices.length > 0 ? (
                                            <div className="space-y-2">
                                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                                                {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
                                              </p>
                                              {invoices.map((invoice: any, invoiceIndex: number) => {
                                                const fileUrl = invoice?.invoiceUrl || invoice?.url || invoice?.invoiceFile || '';
                                                const label = invoice?.invoiceNumber || `Invoice ${invoiceIndex + 1}`;
                                                const content = (
                                                  <>
                                                    <Receipt size={11} className="shrink-0" />
                                                    <span className="min-w-0 truncate font-black">{label}</span>
                                                    {Number(invoice?.amount || 0) > 0 && <span className="ml-auto shrink-0">{formatCurrency(invoice.amount)}</span>}
                                                  </>
                                                );
                                                return fileUrl ? (
                                                  <a key={invoice?.invoiceKey || `${label}-${invoiceIndex}`} href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[10px] text-blue-700 transition-colors hover:bg-blue-100" title={`View ${label}`}>
                                                    {content}
                                                  </a>
                                                ) : (
                                                  <div key={invoice?.invoiceKey || `${label}-${invoiceIndex}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] text-slate-600">
                                                    {content}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <span className="text-[9px] font-pmedium uppercase tracking-widest text-slate-300">No Invoice</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex justify-end shrink-0">
              <button onClick={() => setViewingDeptOverview(null)} className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-pmedium hover:bg-gray-200 transition-all text-sm">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {decisionPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F172A]/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className={`px-6 py-5 text-white ${decisionPrompt.action === 'Rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
              <h3 className="text-lg font-black">{decisionPrompt.action === 'Rejected' ? 'Reject Budget Request' : 'Request Changes'}</h3>
              <p className="mt-1 text-xs opacity-80">{decisionPrompt.request.department}</p>
            </div>
            <form
              className="space-y-4 p-6"
              onSubmit={(event) => {
                event.preventDefault();
                const comment = decisionComment.trim();
                if (!comment) return;
                handleAction(decisionPrompt.request.type, decisionPrompt.request.id, decisionPrompt.action, comment);
              }}
            >
              <div>
                <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  {decisionPrompt.action === 'Rejected' ? 'Reason for rejection' : 'Changes required'} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={decisionComment}
                  onChange={(event) => setDecisionComment(event.target.value)}
                  placeholder={decisionPrompt.action === 'Rejected' ? 'Explain why this budget is rejected…' : 'Explain what the manager must revise…'}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setDecisionPrompt(null); setDecisionComment(''); }} className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-pmedium text-slate-700">Cancel</button>
                <button disabled={isSavingDecision || !decisionComment.trim()} type="submit" className={`flex-[2] rounded-xl py-3 text-xs font-pmedium text-white disabled:opacity-50 ${decisionPrompt.action === 'Rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
                  {isSavingDecision ? 'Saving…' : decisionPrompt.action === 'Rejected' ? 'Confirm Rejection' : 'Send Back for Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
