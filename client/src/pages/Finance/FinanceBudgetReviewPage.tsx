import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  MessageSquare,
  PieChart,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { applyFinanceApprovalDecision, getFinanceSnapshot } from '@/services/finance';
import { getStoredUser } from '@/lib/auth-session';
import { DEFAULT_FISCAL_YEAR } from '@/features/finance/utils/fiscalYear';
import PageFrame from '@/components/Pages/PageFrame';
import { ApprovalFlowBadges, hasApprovalProgress } from '@/components/finance/ApprovalFlowBadges';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import {
  enrichAnnualRequestWithDepartmentPlan,
  getDepartmentFinancePlan,
  getMyApprovalDecision,
  mapAnnualRequestToBudget,
  type Budget,
} from './ExpensesBudgetPage';

type ReviewerVariant = 'owner' | 'financeManager';

const FOUNDER_LIST_PATH = '/extra-common-modules/finance-management';
const FM_LIST_PATH = '/department-accesses/finance-department/expenses-budget';

const MONTH_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'not-started', label: 'Not Started' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'over-budget', label: 'Over Budget' },
];

/**
 * Full-page annual budget review used by both approvers:
 * - Founder/Owner on /extra-common-modules/finance-management/review/annual/:requestId
 * - Finance Manager on /department-accesses/finance-department/expenses-budget/review/annual/:requestId
 *
 * Replaces the near-full-screen review modal for annual budgets. All approval
 * guardrails (dual approval, Pending-only actions, FM temporary override) are
 * preserved; the backend still derives the decision scope from the session.
 */
export function FinanceBudgetReviewPage() {
  const { requestId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState: { request?: any; fiscalYear?: string; returnTab?: 'overview' } = (location.state || {}) as any;
  const reviewer: ReviewerVariant = location.pathname.startsWith(FOUNDER_LIST_PATH) ? 'owner' : 'financeManager';
  const listPath = reviewer === 'owner' ? FOUNDER_LIST_PATH : FM_LIST_PATH;

  const currentUser: any = getStoredUser();
  const currentApproverUserId = String(currentUser?._id || currentUser?.id || '');
  const normalizedCurrentUserRole = String(
    currentUser?.workspaceMembership?.role || currentUser?.role || currentUser?.designation || '',
  ).trim().toLowerCase();
  const userScope: 'owner' | 'financeManager' = /finance[-_ ]?manager|^finance$/.test(normalizedCurrentUserRole)
    ? 'financeManager'
    : 'owner';

  const [fiscalYear] = useState<string>(routeState.fiscalYear || DEFAULT_FISCAL_YEAR);
  const [rawRequest, setRawRequest] = useState<any>(reviewer === 'owner' ? routeState.request || null : null);
  const [fmBudget, setFmBudget] = useState<Budget | null>(
    reviewer === 'financeManager' ? routeState.request || null : null,
  );
  const [departmentFinance, setDepartmentFinance] = useState<any[]>([]);
  const [extraRequests, setExtraRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [temporaryFounderOverride, setTemporaryFounderOverride] = useState(false);
  const [decisionPrompt, setDecisionPrompt] = useState<{ action: 'Rejected' | 'Discuss' } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [monthStatusFilter, setMonthStatusFilter] = useState('all');
  const [monthSearchQuery, setMonthSearchQuery] = useState('');

  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = useCallback(
    (val: number) => formatWorkspaceCurrency(Number(val || 0), workspacePreferences.currency, { maximumFractionDigits: 0 }),
    [workspacePreferences.currency],
  );

  // Always re-validate against the snapshot: router state only gives an instant
  // first paint, refreshes and deep links must survive without it.
  useEffect(() => {
    let alive = true;
    const loadReview = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const payload = await getFinanceSnapshot(fiscalYear);
        if (!alive) return;
        const annualRequests = Array.isArray(payload?.annualRequests) ? payload.annualRequests : [];
        const matched =
          annualRequests
            .map((request: any) => ({ ...request, id: request?.id || request?._id || '' }))
            .find((request: any) => String(request.id) === String(requestId)) || null;
        if (!matched) {
          setRawRequest(null);
          setFmBudget(null);
        } else if (reviewer === 'financeManager') {
          const plan = getDepartmentFinancePlan(payload, matched.department || '');
          setFmBudget(mapAnnualRequestToBudget(enrichAnnualRequestWithDepartmentPlan(matched, plan)));
        } else {
          setRawRequest(matched);
        }
        setDepartmentFinance(Array.isArray(payload?.departmentFinance) ? payload.departmentFinance : []);
        setExtraRequests(Array.isArray(payload?.extraRequests) ? payload.extraRequests : []);
      } catch (error: any) {
        if (alive) setLoadError(error?.message || 'Failed to load the budget request.');
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    loadReview();
    return () => {
      alive = false;
    };
  }, [requestId, fiscalYear, reviewer]);

  const request: any = reviewer === 'financeManager' ? fmBudget : rawRequest;

  // Vendor / payment / invoice columns unlock only for fully approved requests.
  const revealPaymentColumns =
    reviewer === 'financeManager'
      ? String(fmBudget?.status || '') === 'Active'
      : String(rawRequest?.status || '').toLowerCase() === 'approved';

  // Owner variant: month detail prefers the department plan (server-joined
  // expenses), falls back to the breakdown stored on the annual request.
  const ownerMonths = useMemo(() => {
    if (reviewer !== 'owner' || !rawRequest) return [];
    const plan = departmentFinance.find((p: any) => p?.department === rawRequest.department);
    const fallbackMonths = Array.isArray(rawRequest.monthlyBreakdown)
      ? rawRequest.monthlyBreakdown
      : Array.isArray(rawRequest.monthlyPlan)
        ? rawRequest.monthlyPlan
        : [];
    const sourceMonths =
      Array.isArray(plan?.monthlyPlan) && plan.monthlyPlan.length > 0 ? plan.monthlyPlan : fallbackMonths;
    const deptName = String(rawRequest.department || '');
    return sourceMonths.map((m: any, idx: number) => ({
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
          String(r?.monthKey || r?.month || '').toLowerCase() === String(m?.monthKey || m?.month || '').toLowerCase(),
        );
      }),
    }));
  }, [reviewer, rawRequest, departmentFinance, extraRequests]);

  // FM variant: enriched budget breakdown, with sanctioned extra lines merged in.
  const fmMonths = useMemo(() => {
    if (reviewer !== 'financeManager' || !fmBudget) return [];
    return (Array.isArray(fmBudget.monthlyBreakdown) ? fmBudget.monthlyBreakdown : []).map((m: any, idx: number) => ({
      key: m?.monthKey || m?.month || `m-${idx}`,
      label: m?.month || m?.title || `Month ${idx + 1}`,
      title: m?.title || '',
      projected: Number(m?.projectedBudget ?? m?.amount ?? 0),
      actualSpent: Number(m?.actualSpent ?? 0),
      expenses: [
        ...(Array.isArray(m?.expenses) ? m.expenses : []),
        ...(Array.isArray(m?.extraExpenses) ? m.extraExpenses.map((e: any) => ({ ...e, _isExtra: true })) : []),
      ],
    }));
  }, [reviewer, fmBudget]);

  const months = reviewer === 'financeManager' ? fmMonths : ownerMonths;

  const getMonthStatusKey = (m: any) =>
    m.actualSpent > m.projected && m.projected > 0 ? 'over-budget' : m.actualSpent > 0 ? 'in-progress' : 'not-started';

  const filteredMonths = months.filter((m: any) => {
    const matchesStatus = monthStatusFilter === 'all' || getMonthStatusKey(m) === monthStatusFilter;
    const query = monthSearchQuery.trim().toLowerCase();
    const matchesSearch = !query || `${m.label} ${m.title}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const approvalFlow: any = (request as any)?.approvalFlow || {};
  const myStepStatus = (() => {
    if (reviewer === 'financeManager') return getMyApprovalDecision(approvalFlow);
    if (!approvalFlow) return '';
    // Role strings can be unreliable, so first check which steps THIS user id
    // actually decided (approverUserId is stamped server-side on every decision).
    for (const key of ['owner', 'financeManager']) {
      const step = approvalFlow[key];
      const status = String(step?.status || '').toLowerCase();
      if (
        (status === 'approved' || status === 'rejected') &&
        currentApproverUserId &&
        String(step?.approverUserId || '') === currentApproverUserId
      ) {
        return status;
      }
    }
    return String(approvalFlow[userScope]?.status || '').toLowerCase();
  })();
  const hasDecided = myStepStatus === 'approved' || myStepStatus === 'rejected';
  const overallStatus = reviewer === 'financeManager'
    ? String(fmBudget?.status || '')
    : String(rawRequest?.status || '');
  const actionable = !hasDecided && (reviewer === 'financeManager'
    ? overallStatus.toLowerCase() === 'pending review'
    : overallStatus.toLowerCase() === 'pending');
  const founderAlreadyApproved = String(approvalFlow?.owner?.status || '').toLowerCase() === 'approved';

  const exitToBack = () => {
    if (reviewer === 'owner' && routeState.returnTab === 'overview') {
      navigate(listPath, { replace: true, state: { activeTab: 'overview' } });
      return;
    }
    const historyState: any = window.history?.state || {};
    if (typeof historyState.idx === 'number' && historyState.idx > 0) navigate(-1);
    else navigate(listPath, { replace: true });
  };

  const submitDecision = async (decision: 'Approved' | 'Rejected' | 'Discuss', note = '') => {
    if (!request?.id) {
      toast.error('Budget request is not loaded yet.');
      return;
    }
    setIsSavingDecision(true);
    try {
      await applyFinanceApprovalDecision('annual', String(request.id), {
        status: decision,
        fiscalYear,
        note: note.trim(),
        temporaryFounderOverride: reviewer === 'financeManager' && decision === 'Approved' ? temporaryFounderOverride : undefined,
      });
      window.dispatchEvent(new Event('finance:snapshot-updated'));
      toast.success(
        decision === 'Approved'
          ? reviewer === 'financeManager'
            ? temporaryFounderOverride
              ? `Annual budget approved with temporary Founder override for ${request.department}.`
              : `Estimated annual budget approved for ${request.department}.`
            : `Annual budget approved for ${request.department}.`
          : decision === 'Discuss'
            ? `Changes requested from ${request.department}.`
            : `Request rejected for ${request.department}.`,
      );
      setDecisionPrompt(null);
      setDecisionComment('');
      setTemporaryFounderOverride(false);
      exitToBack();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to update approval decision.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  if (isLoading && !request) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <TablePageSkeleton rows={8} columns={5} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-pmedium text-slate-700">
              {loadError || 'This annual budget request could not be found. It may have been revised or removed.'}
            </p>
            <button onClick={exitToBack} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all">
              <ArrowLeft size={13} /> Back to {reviewer === 'owner' ? 'Finance Management' : 'Expenses & Budget'}
            </button>
          </div>
        </PageFrame>
      </div>
    );
  }

  const totalRequested = reviewer === 'financeManager'
    ? Number(fmBudget?.requested || 0)
    : Number(rawRequest?.requestedBudget || 0);
  const submittedLabel = reviewer === 'financeManager'
    ? String(fmBudget?.date || '')
    : String(rawRequest?.date || rawRequest?.submittedAtLabel || '');
  const refLabel = String(request.requestKey || request.id || requestId);
  const revisionLabel = Number(request.revision || 1);
  const justification = reviewer === 'financeManager'
    ? String(fmBudget?.details || '')
    : String(rawRequest?.reason || rawRequest?.breakdown || '');

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* Header — back arrow beside title (matches Visitor Management frontdesk pattern) */}
          <div className="flex items-center gap-3">
            <button onClick={exitToBack} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm" title="Back">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                {request.department} Annual Budget Review
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {reviewer === 'owner' ? 'Founder approval desk' : 'Finance Manager approval desk'} | {request.department}
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-blue-700 shrink-0">
              <Calendar size={12} /> {fiscalYear}
            </span>
          </div>

          {/* Summary stat cards (app stat-card pattern) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-blue-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Department</p>
                <p className="text-[15px] font-pmedium text-slate-900 truncate">{request.department}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Building2 size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-amber-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Total Requested</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(totalRequested)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><PieChart size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-slate-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Submitted By</p>
                <p className="text-[15px] font-pmedium text-slate-900 truncate">{request.submittedByName || 'Not available'}</p>
                <p className="text-[10px] font-pmedium text-slate-400">{submittedLabel}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><FileText size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-emerald-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Status</p>
                {hasApprovalProgress(approvalFlow) ? (
                  <span className="block mt-1"><ApprovalFlowBadges flow={approvalFlow} /></span>
                ) : (
                  <span className={`inline-flex w-fit px-2.5 py-1 rounded-lg text-[9px] font-pmedium uppercase tracking-widest border ${overallStatus.toLowerCase() === 'approved' || overallStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : overallStatus.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{overallStatus || 'Pending'}</span>
                )}
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
          </div>

          {/* Decision actions — right after the summary cards */}
          {(() => {
            if (actionable) {
              // return (
              //   <div className="rounded-[2rem] border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
              //     {reviewer === 'financeManager' && !founderAlreadyApproved && (
              //       <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              //         <input type="checkbox" checked={temporaryFounderOverride} onChange={(event) => setTemporaryFounderOverride(event.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-600" />
              //         <span>
              //           <span className="block text-[11px] font-pmedium">Founder is on leave — use temporary override</span>
              //           <span className="mt-0.5 block text-[9px] font-pmedium text-amber-700">Approves both Founder and Finance steps under your user ID and records an audit warning.</span>
              //         </span>
              //       </label>
              //     )}
              //     {/* <div className="flex gap-3 sm:gap-4">
              //       <button disabled={isSavingDecision} onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Discuss' }); }} className="flex-1 py-3.5 bg-white border-2 border-blue-200 text-blue-600 rounded-xl font-pmedium hover:bg-blue-50 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
              //         <MessageSquare size={14} /> {reviewer === 'owner' ? 'DISCUSS' : 'REQUEST CHANGES'}
              //       </button>
              //       <button disabled={isSavingDecision} onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Rejected' }); }} className="flex-1 py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-pmedium hover:bg-red-50 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
              //         <XCircle size={14} /> REJECT REQUEST
              //       </button>
              //       <button disabled={isSavingDecision} onClick={() => setShowApproveConfirm(true)} className="flex-[2] py-3.5 bg-green-600 text-white rounded-xl font-pmedium shadow-lg shadow-green-200 hover:bg-green-700 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
              //         APPROVE BUDGET <CheckCircle2 size={14} />
              //       </button>
              //     </div> */}
              //   </div>
              // );
            }
            if (hasDecided) {
              return (
                <div className="rounded-[2rem] border border-slate-100 bg-emerald-50/60 p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[11px] font-pmedium uppercase tracking-wider text-emerald-700">
                    <CheckCircle2 size={14} /> You have already {myStepStatus === 'approved' ? 'approved' : 'rejected'} this request.
                  </span>
                  {/* <button onClick={exitToBack} className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-pmedium hover:bg-gray-200 transition-all text-sm">BACK</button> */}
                </div>
              );
            }
            return null;
          })()}

          {/* Business justification — only shown when actually provided */}
          {justification.trim() && (
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={12} /> Business Justification
              </p>
              <p className="mt-2 text-xs font-pmedium text-slate-600 leading-relaxed">
                {justification}
              </p>
            </div>
          )}

          {/* Monthly expense plan — data panel */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            {reviewer === 'financeManager' && String(fmBudget?.status || '') === 'Pending Review' && (
              <div className="px-3 sm:px-4 lg:px-5 pt-3 sm:pt-4 lg:pt-5 bg-slate-50/50">
                <span className="inline-flex text-[9px] font-pmedium uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                  Vendor &amp; payment details unlock after approval
                </span>
              </div>
            )}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {MONTH_STATUS_FILTERS.map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setMonthStatusFilter(pill.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      monthStatusFilter === pill.key
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text" placeholder="Search month..."
                  value={monthSearchQuery} onChange={(e) => setMonthSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
            {months.length === 0 ? (
              <p className="m-4 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400">No monthly breakdown has been submitted for this request.</p>
            ) : (
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="w-[60px] px-5 py-4 text-center">Sr No</th>
                      <th className="px-5 py-4">Month</th>
                      <th className="w-[140px] px-5 py-4 text-right">Projected</th>
                      <th className="w-[140px] px-5 py-4 text-right">Actual</th>
                      <th className="w-[110px] px-5 py-4 text-center">Expenses</th>
                      <th className="w-[140px] px-5 py-4">Status</th>
                      <th className="w-[90px] px-5 py-4 text-center">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredMonths.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-slate-400 font-pmedium text-xs">No months match this filter.</td>
                      </tr>
                    )}
                    {filteredMonths.map((month, mIdx) => {
                      const expenses = Array.isArray(month.expenses) ? month.expenses : [];
                      const monthStatus = getMonthStatusKey(month) === 'over-budget'
                        ? { label: 'Over Budget', className: 'bg-rose-50 text-rose-700 border-rose-200' }
                        : getMonthStatusKey(month) === 'in-progress'
                          ? { label: 'In Progress', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                          : { label: 'Not Started', className: 'bg-slate-100 text-slate-500 border-slate-200' };
                      return (
                        <tr key={month.key} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 text-center">
                            <p className="text-xs font-pmedium text-slate-400">{mIdx + 1}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <Calendar size={13} />
                              </span>
                              <p className="text-xs font-pmedium text-slate-900">{month.label}{month.title ? ` — ${month.title}` : ''}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <p className="whitespace-nowrap text-xs font-pmedium text-slate-900">{formatCurrency(month.projected)}</p>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <p className={`whitespace-nowrap text-xs font-pmedium ${month.actualSpent > month.projected ? 'text-rose-600' : month.actualSpent > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {formatCurrency(month.actualSpent)}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <p className="text-xs font-pmedium text-slate-600">{expenses.length}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-pmedium uppercase tracking-widest border ${monthStatus.className}`}>{monthStatus.label}</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => navigate(`${listPath}/review/annual/${encodeURIComponent(requestId)}/month/${encodeURIComponent(month.key)}`, {
                                state: { month, request, reviewer, revealPaymentColumns, extraRequests, fiscalYear, requestId },
                              })}
                              className="mx-auto flex items-center justify-center p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                              title="View Month Expenses"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            )}
            </div>
          </div>

        </div>
      </PageFrame>

      {/* Request changes / Reject dialog */}
      {decisionPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md" role="dialog" aria-modal="true">
          <form
            onSubmit={(event) => { event.preventDefault(); submitDecision(decisionPrompt.action, decisionComment); }}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div className="min-w-0">
                <h3 className={`text-lg font-pmedium ${decisionPrompt.action === 'Rejected' ? 'text-red-600' : 'text-blue-600'}`}>
                  {decisionPrompt.action === 'Rejected' ? 'Reject Budget Request' : 'Request Changes'}
                </h3>
                {/* <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">{request?.department} • {refLabel}</p> */}
              </div>
              <button type="button" onClick={() => setDecisionPrompt(null)} className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block">
                <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  {decisionPrompt.action === 'Rejected' ? 'Reason for rejection' : 'Changes required'} *
                </span>
                <textarea
                  value={decisionComment}
                  onChange={(event) => setDecisionComment(event.target.value)}
                  rows={4}
                  required
                  placeholder={decisionPrompt.action === 'Rejected' ? 'Explain why this budget is rejected…' : 'Explain what the manager must revise…'}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-pmedium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDecisionPrompt(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-pmedium text-slate-600 hover:bg-slate-50 transition-all">
                  CANCEL
                </button>
                <button disabled={isSavingDecision || !decisionComment.trim()} type="submit" className={`flex-1 rounded-xl py-3 text-xs font-pmedium text-white disabled:opacity-50 ${decisionPrompt.action === 'Rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
                  {isSavingDecision ? 'Saving…' : decisionPrompt.action === 'Rejected' ? 'CONFIRM REJECTION' : 'SEND FOR CHANGES'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Approve confirmation — a budget approval is hard to walk back, so make the reviewer confirm */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div className="min-w-0">
                <h3 className="text-lg font-pmedium text-green-600">Approve Budget Request</h3>
                {/* <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">{request?.department} • {refLabel}</p> */}
              </div>
              <button type="button" onClick={() => setShowApproveConfirm(false)} className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="text-xs font-pmedium leading-relaxed">
                  This will approve the full annual budget of <span className="font-pmedium">{formatCurrency(totalRequested)}</span> for <span className="font-pmedium">{request?.department}</span>. Once approved, this decision cannot be undone from this page.
                </p>
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setShowApproveConfirm(false)} className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-pmedium text-slate-600 hover:bg-slate-50 transition-all">
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={isSavingDecision}
                  onClick={() => { setShowApproveConfirm(false); submitDecision('Approved'); }}
                  className="flex-1 rounded-xl bg-green-600 py-3 text-xs font-pmedium text-white shadow-sm hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingDecision ? 'Approving…' : <>APPROVE BUDGET <CheckCircle2 size={14} /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
