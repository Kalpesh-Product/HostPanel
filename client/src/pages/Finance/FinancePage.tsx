import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, DollarSign, TrendingUp, CheckCircle2, AlertCircle,
  Eye, X, Check, MessageSquare, Building2,
  Calendar, Filter, Plus, FileText, FileWarning, Download,
  AlertTriangle, XCircle
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth-session';
import { applyFinanceApprovalDecision, getFinanceSnapshot, updateMonthlyExpenseStatus } from '@/services/finance';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { DEFAULT_FISCAL_YEAR, getFiscalYearOptions } from '@/features/finance/utils/fiscalYear';
import PageFrame from '@/components/Pages/PageFrame';
import { statusPillClass } from '../../lib/status-pill';
import { ApprovalFlowBadges, hasApprovalProgress } from '../../components/finance/ApprovalFlowBadges';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';

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
  const location = useLocation();
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
  const [activeTab, setActiveTab] = useState((location.state as any)?.activeTab === 'overview' ? 'overview' : 'approvals');
  const [approvalSubTab, setApprovalSubTab] = useState('annual');
  const [isLoadingFinance, setIsLoadingFinance] = useState(false);
  const [hasLoadedFinanceSnapshot, setHasLoadedFinanceSnapshot] = useState(false);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [decisionPrompt, setDecisionPrompt] = useState<{ action: 'Rejected' | 'Discuss'; request: any } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState<any>(null);
  
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

  // Dual-approval requests read as bare "Pending" even after the Founder has
  // already acted — spell out whose turn it actually is. Used for both annual
  // and extra budget requests, which share the same approvalFlow shape.
  const getDualApprovalDisplayStatus = (request: any = {}) => {
    const overall = String(request?.status || '').trim();
    if (!['pending', 'discuss'].includes(overall.toLowerCase())) return overall;
    const ownerStatus = String(request?.approvalFlow?.owner?.status || '').toLowerCase();
    const fmStatus = String(request?.approvalFlow?.financeManager?.status || '').toLowerCase();
    if (ownerStatus === 'approved' && fmStatus !== 'approved') return `${overall} Finance Manager`;
    if (fmStatus === 'approved' && ownerStatus !== 'approved') return `${overall} Founder`;
    return overall;
  };

  const pendingAnnualRequests = annualRequests.filter(isActionableFinanceRequest);
  const pendingExtraRequests = extraRequests.filter(isActionableFinanceRequest);
  const pendingActions = pendingAnnualRequests.length + pendingExtraRequests.length;

  const departmentOptions = Array.from(
    new Set(departments.map((dept: any) => dept?.name).filter(Boolean)),
  ) as string[];

  const matchesDepartmentFilter = (departmentName = '') =>
    selectedDepartment === 'all' || normalizeDepartmentKey(departmentName) === normalizeDepartmentKey(selectedDepartment);

  const matchesSearchQuery = (departmentName = '', extra = '') => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return departmentName.toLowerCase().includes(query) || extra.toLowerCase().includes(query);
  };

  const matchesStatusFilter = (status = '') =>
    statusFilter === 'all' || String(status || '').toLowerCase() === statusFilter;

  const visibleAnnualRequests = annualRequests.filter(
    (req: any) =>
      matchesDepartmentFilter(req.department) &&
      matchesSearchQuery(req.department, req.requestKey || req.id) &&
      matchesStatusFilter(req.status),
  );
  const visibleExtraRequests = extraRequests.filter(
    (req: any) =>
      matchesDepartmentFilter(req.department) &&
      matchesSearchQuery(req.department, req.title || req.targetTitle || '') &&
      matchesStatusFilter(req.status),
  );
  const visibleDepartments = departments.filter(
    (dept: any) => matchesDepartmentFilter(dept.name) && matchesSearchQuery(dept.name || ''),
  );

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

  const statusFilterOptions = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'discuss', label: 'Discuss' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
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
          <div data-tour="finance-tabs" className="mb-3 flex w-full gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[160px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {activeTab === tab.key && (
                  <motion.div layoutId="financeMainTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />
                )}
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

          {/* SUB TABS (Approval Center only) — full width, same style as main tabs */}
          {activeTab === 'approvals' && (
            <div data-tour="finance-sub-tabs" className="mb-3 flex w-full gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {subTabsApprovals.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setApprovalSubTab(tab.key); setStatusFilter('all'); }}
                  className={`flex-1 min-w-[220px] py-2 px-4 rounded-full text-[10px] font-pmedium uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 whitespace-nowrap ${
                    approvalSubTab === tab.key
                      ? 'text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {approvalSubTab === tab.key && (
                    <motion.div layoutId="financeSubTabs" className="absolute inset-0 bg-[#2563EB] rounded-full shadow-sm z-[-1]" />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* STATUS FILTER + FILTERS & SEARCH — same line, just above the table (Meeting Rooms pattern) */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center gap-3">
              <div data-tour="finance-status-filter" className="flex flex-1 items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {activeTab === 'approvals' && statusFilterOptions.map(pill => (
                  <button
                    key={pill.key}
                    onClick={() => setStatusFilter(pill.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      statusFilter === pill.key
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                  <select
                    data-tour="finance-department-select"
                    value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[160px]"
                  >
                    <option value="all">All Departments</option>
                    {departmentOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
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

                <div data-tour="finance-search" className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text" placeholder="Search..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                  />
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
                        <th className="px-5 py-4">Department</th>
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
                          <td className="px-5 py-4 font-pmedium text-slate-900">{req.department}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-900">{formatCurrency(req.requestedBudget)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-500">{formatCurrency(getDepartmentActualSpend(req.department))}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className={statusPillClass(req.status)}>{getDualApprovalDisplayStatus(req)}</span>
                              {req.isHistorical && (
                                <span className="inline-flex px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[8px] font-pmedium uppercase tracking-wider">Historical</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => navigate(`/extra-common-modules/finance-management/review/annual/${encodeURIComponent(req.id)}`, { state: { request: req, fiscalYear: selectedFY } })} className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm" title="View Request">
                                <Eye size={14} />
                              </button>
                              {!['approved', 'rejected'].includes(String(req.approvalFlow?.owner?.status || '').toLowerCase()) && String(req.status || '').toLowerCase() !== 'rejected' && (
                                <>
                                  <button onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Discuss', request: { ...req, type: 'annual' } }); }} className="p-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-all shadow-sm" title="Discuss">
                                    <MessageSquare size={14} />
                                  </button>
                                  <button onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Rejected', request: { ...req, type: 'annual' } }); }} className="p-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm" title="Reject">
                                    <XCircle size={14} />
                                  </button>
                                  <button onClick={() => setShowApproveConfirm({ ...req, type: 'annual' })} className="p-2 bg-green-600 border border-green-600 text-white hover:bg-green-700 rounded-lg transition-all shadow-sm" title="Approve">
                                    <CheckCircle2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      visibleExtraRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 font-pmedium text-slate-900">{req.department}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-900">{formatCurrency(req.amount)}</td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-pmedium text-slate-800 max-w-[250px] truncate">{req.title || req.targetTitle || 'Extra Budget'}</div>
                            <div className="mt-1 text-[10px] text-slate-500 max-w-[250px] truncate">{req.reason}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className={statusPillClass(req.status)}>{getDualApprovalDisplayStatus(req)}</span>
                              {req.isHistorical && (
                                <span className="inline-flex px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[8px] font-pmedium uppercase tracking-wider">Historical</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => setViewingRequest({ ...req, type: 'extra' })} className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm" title="View Request">
                                <Eye size={14} />
                              </button>
                              {!['approved', 'rejected'].includes(String(req.approvalFlow?.owner?.status || '').toLowerCase()) && String(req.status || '').toLowerCase() !== 'rejected' && (
                                <>
                                  <button onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Discuss', request: { ...req, type: 'extra' } }); }} className="p-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-all shadow-sm" title="Discuss">
                                    <MessageSquare size={14} />
                                  </button>
                                  <button onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Rejected', request: { ...req, type: 'extra' } }); }} className="p-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm" title="Reject">
                                    <XCircle size={14} />
                                  </button>
                                  <button onClick={() => setShowApproveConfirm({ ...req, type: 'extra' })} className="p-2 bg-green-600 border border-green-600 text-white hover:bg-green-700 rounded-lg transition-all shadow-sm" title="Approve">
                                    <CheckCircle2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
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
                    {visibleDepartments.map((dept) => {
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
                            <button
                              onClick={() => {
                                const request = dept.approvedAnnualRequest;
                                const requestId = request?.id || request?._id;
                                if (!requestId) return;
                                navigate(`/extra-common-modules/finance-management/review/annual/${encodeURIComponent(requestId)}`, {
                                  state: { request, fiscalYear: selectedFY, returnTab: 'overview' },
                                });
                              }}
                              disabled={!dept.approvedAnnualRequest?.id && !dept.approvedAnnualRequest?._id}
                              className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm mx-auto disabled:cursor-not-allowed disabled:opacity-40"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {visibleDepartments.length === 0 && (
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-lg sm:max-w-2xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div className="min-w-0">
                <h2 className="text-lg font-pmedium text-slate-900">Extra Budget Request</h2>
                <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">• Revision {Number(viewingRequest.revision || 1)}</p>
              </div>
              <button onClick={() => setViewingRequest(null)} className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">Department</p>
                  <p className="text-lg font-pmedium text-slate-900 flex items-center gap-2"><Building2 size={16} className="text-amber-500" /> {viewingRequest.department}</p>
                  <p className="mt-1 text-[10px] font-pmedium text-slate-400">Submitted by {viewingRequest.submittedByName || 'Not available'} {viewingRequest.date || viewingRequest.submittedAtLabel ? `• ${viewingRequest.date || viewingRequest.submittedAtLabel}` : ''}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">Requested</p>
                  <p className="text-xl font-pmedium text-slate-900">{formatCurrency(viewingRequest.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">Expense Title</p>
                  <p className="text-sm font-pmedium text-slate-900">{viewingRequest.title || viewingRequest.targetTitle || 'Extra Budget'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">Requested Month</p>
                  <p className="text-sm font-pmedium text-slate-900">{viewingRequest.month || viewingRequest.monthKey || '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5"><FileText size={12} /> Justification</p>
                <p className="text-xs font-pmedium text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 p-3 rounded-xl whitespace-pre-line">
                  {viewingRequest.reason || viewingRequest.breakdown || 'No additional justification provided.'}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400 mb-1.5">Approval Status</p>
                {hasApprovalProgress(viewingRequest.approvalFlow)
                  ? <ApprovalFlowBadges flow={viewingRequest.approvalFlow} />
                  : <span className={statusPillClass(viewingRequest.status)}>{getDualApprovalDisplayStatus(viewingRequest)}</span>}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button onClick={() => setViewingRequest(null)} className="rounded-xl bg-slate-100 px-6 py-2.5 text-xs font-pmedium text-slate-700 hover:bg-slate-200">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {decisionPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div className="min-w-0">
                <h3 className={`text-lg font-pmedium ${decisionPrompt.action === 'Rejected' ? 'text-red-600' : 'text-blue-600'}`}>
                  {decisionPrompt.action === 'Rejected' ? 'Reject Budget Request' : 'Request Changes'}
                </h3>
                <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{decisionPrompt.request.department}</p>
              </div>
              <button type="button" onClick={() => { setDecisionPrompt(null); setDecisionComment(''); }} className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110" aria-label="Close">
                <X size={18} />
              </button>
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
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-pmedium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setDecisionPrompt(null); setDecisionComment(''); }} className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-pmedium text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button disabled={isSavingDecision || !decisionComment.trim()} type="submit" className={`flex-1 rounded-xl py-3 text-xs font-pmedium text-white disabled:opacity-50 ${decisionPrompt.action === 'Rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
                  {isSavingDecision ? 'Saving…' : decisionPrompt.action === 'Rejected' ? 'Confirm Rejection' : 'Send Back for Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showApproveConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div className="min-w-0">
                <h3 className="text-lg font-pmedium text-green-600">Approve Budget Request</h3>
                <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{showApproveConfirm.department}</p>
              </div>
              <button type="button" onClick={() => setShowApproveConfirm(null)} className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="text-xs font-pmedium leading-relaxed">
                  This will approve the {showApproveConfirm.type === 'extra' ? 'extra budget request' : 'full annual budget'} of <span className="font-pmedium">{formatCurrency(showApproveConfirm.type === 'extra' ? showApproveConfirm.amount : showApproveConfirm.requestedBudget)}</span> for <span className="font-pmedium">{showApproveConfirm.department}</span>. Once approved, this decision cannot be undone from this page.
                </p>
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setShowApproveConfirm(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-pmedium text-slate-600 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingDecision}
                  onClick={() => { const req = showApproveConfirm; setShowApproveConfirm(null); handleAction(req.type, req.id, 'Approved'); }}
                  className="flex-1 rounded-xl bg-green-600 py-3 text-xs font-pmedium text-white shadow-sm hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingDecision ? 'Approving…' : <>Approve Budget <CheckCircle2 size={14} /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
