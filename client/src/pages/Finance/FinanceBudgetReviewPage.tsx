import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  MessageSquare,
  PieChart,
  Receipt,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { applyFinanceApprovalDecision, getFinanceSnapshot } from '@/services/finance';
import { getStoredUser } from '@/lib/auth-session';
import { DEFAULT_FISCAL_YEAR } from '@/features/finance/utils/fiscalYear';
import PageFrame from '@/components/Pages/PageFrame';
import { formatFinancePaymentStatus } from '@/features/finance/utils/paymentStatus';
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
  const routeState: { request?: any; fiscalYear?: string } = (location.state || {}) as any;
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
          {/* Back — own row, top-left (matches other detail pages) */}
          <div className="flex items-center justify-between gap-3">
            <button onClick={exitToBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
              <ArrowLeft size={14} /> Back
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-blue-700">
              <Calendar size={12} /> {fiscalYear}
            </span>
          </div>

          {/* Header — standard page header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Annual Budget Review
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {reviewer === 'owner' ? 'Founder approval desk' : 'Finance Manager approval desk'} | {request.department}
              </p>
            </div>
          </div>

          {/* Summary stat cards (app stat-card pattern) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-blue-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Department</p>
                <p className="text-[15px] font-pmedium text-slate-900 truncate">{request.department}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Building2 size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-amber-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Total Requested</p>
                <p className="text-[15px] font-pmedium text-blue-600">{formatCurrency(totalRequested)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><PieChart size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-slate-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Submitted By</p>
                <p className="text-[15px] font-pmedium text-slate-900 truncate">{request.submittedByName || 'Dept. Manager'}</p>
                <p className="text-[10px] font-pmedium text-slate-400">{submittedLabel}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><FileText size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-emerald-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Status</p>
                {hasApprovalProgress(approvalFlow) ? (
                  <span className="block mt-1"><ApprovalFlowBadges flow={approvalFlow} /></span>
                ) : (
                  <span className={`inline-flex w-fit px-2.5 py-1 rounded-lg text-[9px] font-pmedium uppercase tracking-widest border ${overallStatus.toLowerCase() === 'approved' || overallStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : overallStatus.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{overallStatus || 'Pending'}</span>
                )}
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
          </div>

          {/* Business justification */}
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
              <FileText size={12} /> Business Justification
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600 leading-relaxed">
              {justification || 'No additional justification provided.'}
            </p>
          </div>

          {/* Monthly expense plan — data panel */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <h4 className="text-[10px] sm:text-xs font-pmedium text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={13} className="text-[#2563EB]" /> Monthly Expense Plan
                {months.length > 0 && (
                  <span className="ml-1 text-gray-400 font-bold normal-case tracking-normal">({months.length} months)</span>
                )}
              </h4>
              {reviewer === 'financeManager' && String(fmBudget?.status || '') === 'Pending Review' && (
                <span className="text-[9px] font-pmedium uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                  Vendor &amp; payment details unlock after approval
                </span>
              )}
            </div>
            <div className="p-3 sm:p-4 lg:p-5">
            {months.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400">No monthly breakdown has been submitted for this request.</p>
            ) : (
              <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-left" style={{ minWidth: revealPaymentColumns ? '1410px' : '1050px' }}>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="w-[290px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Expense</th>
                        <th className="px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Description</th>
                        <th className="w-[130px] px-4 py-3.5 text-right text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Projected</th>
                        <th className="w-[130px] px-4 py-3.5 text-right text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Actual</th>
                        <th className="w-[120px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Due</th>
                        {revealPaymentColumns && <>
                          <th className="w-[220px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Vendor</th>
                          <th className="w-[160px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Payment</th>
                          <th className="w-[160px] px-4 py-3.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Invoice</th>
                        </>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {months.map((month) => {
                        const expenses = Array.isArray(month.expenses) ? month.expenses : [];
                        const colSpan = revealPaymentColumns ? 8 : 5;
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
                                    {revealPaymentColumns && month.actualSpent > 0 && (
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
                                const approvedIncrease = extraRequests
                                  .filter((r: any) =>
                                    String(r?.status || '').toLowerCase() === 'approved' &&
                                    String(r?.type || '').toLowerCase() === 'increase' &&
                                    String(r?.appliedExpenseId || '') === String(exp?._id || exp?.id || ''))
                                  .reduce((sum: number, r: any) => sum + Number(r?.amount || 0), 0);
                                const currentProjection = Number(exp.projectedAmount || 0);
                                const originalProjection = Math.max(0, currentProjection - approvedIncrease);
                                const actualAmount = Number(exp.actualAmount ?? exp.actualSpent ?? 0);
                                return (
                                  <tr key={`${month.key}-exp-${exp.id || eIdx}`} className="border-b border-slate-100 bg-white transition-colors hover:bg-blue-50/40">
                                    <td className="px-4 py-4 align-top">
                                      <div className="flex items-start gap-2">
                                        {(String(exp.expenseTag || '').toLowerCase() === 'add-on' || exp._isExtra) && (
                                          <span className="mt-0.5 shrink-0 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-amber-700">Extra</span>
                                        )}
                                        <p className="min-w-0 break-words text-xs font-black leading-snug text-slate-900 sm:text-sm">{exp.title || exp.expenseLabel || `Expense ${eIdx + 1}`}</p>
                                      </div>
                                      {(() => {
                                        const over = actualAmount - currentProjection;
                                        if (over <= 0.009) return null;
                                        const approvedExtra = extraRequests
                                          .filter((r: any) =>
                                            String(r?.status || '').toLowerCase() === 'approved' &&
                                            String(r?.department || '') === String(request?.department || '') &&
                                            String(r?.monthKey || r?.month || '').toLowerCase() === String(month.key || '').toLowerCase())
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
                                    {revealPaymentColumns && <>
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
          </div>

          {/* Decision footer */}
        {(() => {
          if (actionable) {
            return (
              <div className="rounded-[2rem] border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
                {reviewer === 'financeManager' && !founderAlreadyApproved && (
                  <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    <input type="checkbox" checked={temporaryFounderOverride} onChange={(event) => setTemporaryFounderOverride(event.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-600" />
                    <span>
                      <span className="block text-[11px] font-pmedium">Founder is on leave — use temporary override</span>
                      <span className="mt-0.5 block text-[9px] font-medium text-amber-700">Approves both Founder and Finance steps under your user ID and records an audit warning.</span>
                    </span>
                  </label>
                )}
                <div className="flex gap-3 sm:gap-4">
                  <button disabled={isSavingDecision} onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Discuss' }); }} className="flex-1 py-3.5 bg-white border-2 border-blue-200 text-blue-600 rounded-xl font-pmedium hover:bg-blue-50 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                    <MessageSquare size={14} /> {reviewer === 'owner' ? 'DISCUSS' : 'REQUEST CHANGES'}
                  </button>
                  <button disabled={isSavingDecision} onClick={() => { setDecisionComment(''); setDecisionPrompt({ action: 'Rejected' }); }} className="flex-1 py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-pmedium hover:bg-red-50 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                    <XCircle size={14} /> REJECT REQUEST
                  </button>
                  <button disabled={isSavingDecision} onClick={() => submitDecision('Approved')} className="flex-[2] py-3.5 bg-green-600 text-white rounded-xl font-pmedium shadow-lg shadow-green-200 hover:bg-green-700 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                    APPROVE BUDGET <CheckCircle2 size={14} />
                  </button>
                </div>
              </div>
            );
          }
          if (hasDecided) {
            return (
              <div className="rounded-[2rem] border border-slate-100 bg-emerald-50/60 p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[11px] font-pmedium uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 size={14} /> You have already {myStepStatus === 'approved' ? 'approved' : 'rejected'} this request.
                </span>
                <button onClick={exitToBack} className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-pmedium hover:bg-gray-200 transition-all text-sm">BACK</button>
              </div>
            );
          }
          return (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-4 sm:p-5 shadow-sm flex justify-end">
              <button onClick={exitToBack} className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-pmedium hover:bg-gray-200 transition-all text-sm">BACK</button>
            </div>
          );
        })()}
        </div>
      </PageFrame>

      {/* Request changes / Reject dialog */}
      {decisionPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F172A]/85 backdrop-blur-md">
          <form
            onSubmit={(event) => { event.preventDefault(); submitDecision(decisionPrompt.action, decisionComment); }}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className={`flex justify-between items-start px-6 py-5 text-white ${decisionPrompt.action === 'Rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
              <div>
                <h3 className="text-lg font-black">{decisionPrompt.action === 'Rejected' ? 'Reject Budget Request' : 'Request Changes'}</h3>
                <p className="text-[10px] font-pmedium uppercase tracking-widest text-white/70 mt-0.5">{request?.department} • {refLabel}</p>
              </div>
              <button type="button" onClick={() => setDecisionPrompt(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all">
                <X size={14} />
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
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDecisionPrompt(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-pmedium text-slate-600 hover:bg-slate-50 transition-all">
                  CANCEL
                </button>
                <button disabled={isSavingDecision || !decisionComment.trim()} type="submit" className={`flex-[2] rounded-xl py-3 text-xs font-pmedium text-white disabled:opacity-50 ${decisionPrompt.action === 'Rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
                  {isSavingDecision ? 'Saving…' : decisionPrompt.action === 'Rejected' ? 'CONFIRM REJECTION' : 'SEND FOR CHANGES'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
