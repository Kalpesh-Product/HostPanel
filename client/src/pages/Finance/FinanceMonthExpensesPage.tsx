import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Eye,
  Receipt,
  Search,
  X,
} from 'lucide-react';
import { getFinanceSnapshot } from '@/services/finance';
import { DEFAULT_FISCAL_YEAR } from '@/features/finance/utils/fiscalYear';
import PageFrame from '@/components/Pages/PageFrame';
import { formatFinancePaymentStatus } from '@/features/finance/utils/paymentStatus';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import {
  enrichAnnualRequestWithDepartmentPlan,
  getDepartmentFinancePlan,
  mapAnnualRequestToBudget,
} from './ExpensesBudgetPage';

type ReviewerVariant = 'owner' | 'financeManager';

const FOUNDER_LIST_PATH = '/extra-common-modules/finance-management';
const FM_LIST_PATH = '/department-accesses/finance-department/expenses-budget';

const EXPENSE_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'planned', label: 'Planned' },
  { key: 'payment pending', label: 'Payment Pending' },
  { key: 'payment done - invoice pending', label: 'Payment Done' },
  { key: 'invoice shared', label: 'Invoice Shared' },
];

type MonthEntry = {
  key: string;
  label: string;
  title: string;
  projected: number;
  actualSpent: number;
  expenses: any[];
};

/**
 * Per-month expense breakdown for an annual budget request — reached from the
 * month row's "View" action on FinanceBudgetReviewPage.tsx, so this page stays
 * a proper flat table instead of nesting an expense table inside a month row.
 */
export function FinanceMonthExpensesPage() {
  const { requestId = '', monthKey = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState: {
    month?: MonthEntry;
    request?: any;
    reviewer?: ReviewerVariant;
    revealPaymentColumns?: boolean;
    extraRequests?: any[];
    fiscalYear?: string;
    requestId?: string;
  } = (location.state || {}) as any;

  const reviewer: ReviewerVariant = routeState.reviewer
    || (location.pathname.startsWith(FOUNDER_LIST_PATH) ? 'owner' : 'financeManager');
  const listPath = reviewer === 'owner' ? FOUNDER_LIST_PATH : FM_LIST_PATH;
  const fiscalYear = routeState.fiscalYear || DEFAULT_FISCAL_YEAR;

  const [month, setMonth] = useState<MonthEntry | null>(routeState.month || null);
  const [request, setRequest] = useState<any>(routeState.request || null);
  const [extraRequests, setExtraRequests] = useState<any[]>(routeState.extraRequests || []);
  const [revealPaymentColumns, setRevealPaymentColumns] = useState<boolean>(!!routeState.revealPaymentColumns);
  const [isLoading, setIsLoading] = useState(!routeState.month);
  const [loadError, setLoadError] = useState('');
  const [viewingExpenseDetails, setViewingExpenseDetails] = useState<any>(null);
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');

  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = useCallback(
    (val: number) => formatWorkspaceCurrency(Number(val || 0), workspacePreferences.currency, { maximumFractionDigits: 0 }),
    [workspacePreferences.currency],
  );

  // Deep link / refresh fallback — router state only gives an instant first
  // paint, so re-derive the month from the snapshot when state is missing.
  useEffect(() => {
    if (routeState.month) return;
    let alive = true;
    const loadMonth = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const payload = await getFinanceSnapshot(fiscalYear);
        if (!alive) return;
        const annualRequests = Array.isArray(payload?.annualRequests) ? payload.annualRequests : [];
        const matched = annualRequests
          .map((r: any) => ({ ...r, id: r?.id || r?._id || '' }))
          .find((r: any) => String(r.id) === String(requestId));
        if (!matched) {
          setMonth(null);
          setRequest(null);
          return;
        }
        const extras = Array.isArray(payload?.extraRequests) ? payload.extraRequests : [];
        setExtraRequests(extras);
        const deptName = String(matched.department || '');

        if (reviewer === 'financeManager') {
          const plan = getDepartmentFinancePlan(payload, deptName);
          const budget = mapAnnualRequestToBudget(enrichAnnualRequestWithDepartmentPlan(matched, plan));
          setRequest(budget);
          setRevealPaymentColumns(String(budget?.status || '') === 'Active');
          const found = (Array.isArray(budget.monthlyBreakdown) ? budget.monthlyBreakdown : [])
            .find((m: any) => String(m?.monthKey || m?.month || '') === String(monthKey));
          setMonth(found ? {
            key: found.monthKey || found.month,
            label: found.month || found.title || '',
            title: found.title || '',
            projected: Number(found.projectedBudget ?? found.amount ?? 0),
            actualSpent: Number(found.actualSpent ?? 0),
            expenses: [
              ...(Array.isArray(found.expenses) ? found.expenses : []),
              ...(Array.isArray(found.extraExpenses) ? found.extraExpenses.map((e: any) => ({ ...e, _isExtra: true })) : []),
            ],
          } : null);
        } else {
          setRequest(matched);
          setRevealPaymentColumns(String(matched?.status || '').toLowerCase() === 'approved');
          const departmentFinance = Array.isArray(payload?.departmentFinance) ? payload.departmentFinance : [];
          const plan = departmentFinance.find((p: any) => p?.department === deptName);
          const fallbackMonths = Array.isArray(matched.monthlyBreakdown)
            ? matched.monthlyBreakdown
            : Array.isArray(matched.monthlyPlan)
              ? matched.monthlyPlan
              : [];
          const sourceMonths = Array.isArray(plan?.monthlyPlan) && plan.monthlyPlan.length > 0 ? plan.monthlyPlan : fallbackMonths;
          const found = sourceMonths.find((m: any) => String(m?.monthKey || m?.month || '') === String(monthKey));
          setMonth(found ? {
            key: found.monthKey || found.month,
            label: found.month || found.title || '',
            title: found.title || '',
            projected: Number(found.projectedBudget ?? found.amount ?? 0),
            actualSpent: Number(found.actualSpent ?? 0),
            expenses: (Array.isArray(found.expenses) ? found.expenses : []).filter((e: any) => {
              const tag = String(e?.expenseTag || '').toLowerCase();
              if (tag !== 'add-on') return true;
              return extras.some((r: any) =>
                String(r?.status || '').toLowerCase() === 'approved' &&
                String(r?.department || '') === deptName &&
                String(r?.monthKey || r?.month || '').toLowerCase() === String(found?.monthKey || found?.month || '').toLowerCase(),
              );
            }),
          } : null);
        }
      } catch (error: any) {
        if (alive) setLoadError(error?.message || 'Failed to load this month’s expenses.');
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    loadMonth();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, monthKey, fiscalYear, reviewer]);

  const exitToBack = () => {
    const historyState: any = window.history?.state || {};
    if (typeof historyState.idx === 'number' && historyState.idx > 0) navigate(-1);
    else navigate(`${listPath}/review/annual/${encodeURIComponent(requestId)}`, { replace: true, state: { fiscalYear } });
  };

  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <TablePageSkeleton rows={8} columns={6} />
      </div>
    );
  }

  if (!month || !request) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-pmedium text-slate-700">
              {loadError || 'This month’s expense breakdown could not be found.'}
            </p>
            <button onClick={exitToBack} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all">
              <ArrowLeft size={13} /> Back to Budget Review
            </button>
          </div>
        </PageFrame>
      </div>
    );
  }

  const expenses = Array.isArray(month.expenses) ? month.expenses : [];
  const filteredExpenses = expenses.filter((exp: any) => {
    const matchesStatus = !revealPaymentColumns || expenseStatusFilter === 'all'
      || String(exp.paymentStatus || 'Planned').trim().toLowerCase() === expenseStatusFilter;
    const query = expenseSearchQuery.trim().toLowerCase();
    const matchesSearch = !query || `${exp.title || exp.expenseLabel || ''} ${exp.description || ''}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

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
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                {month.label}{month.title ? ` — ${month.title}` : ''}
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {request.department} | Monthly Expense Detail
              </p>
            </div>
          </div>

          {/* Month stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-blue-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Projected</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(month.projected)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Calendar size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-emerald-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Actual</p>
                <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(month.actualSpent)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><Calendar size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-slate-500 flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Expenses</p>
                <p className="text-[15px] font-pmedium text-slate-900">{expenses.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Receipt size={16} /></div>
            </div>
          </div>

          {/* Expense table */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {revealPaymentColumns && EXPENSE_STATUS_FILTERS.map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setExpenseStatusFilter(pill.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      expenseStatusFilter === pill.key
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
                  type="text" placeholder="Search expense..."
                  value={expenseSearchQuery} onChange={(e) => setExpenseSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              {expenses.length === 0 ? (
                <p className="m-4 rounded-xl border border-slate-200 bg-white p-4 text-xs font-pmedium text-slate-400">No expenses listed for this month.</p>
              ) : (
                    <table className="w-full table-fixed text-left" style={reviewer === 'financeManager' ? { minWidth: revealPaymentColumns ? '1440px' : '1080px' } : undefined}>
                      <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                        <tr>
                          <th className="w-[50px] px-5 py-4 text-center">Sr No</th>
                          <th className="w-[200px] px-5 py-4">Expense</th>
                          <th className="w-[180px] px-5 py-4">Description</th>
                          <th className="w-[110px] px-5 py-4 text-right">Projected</th>
                          <th className="w-[110px] px-5 py-4 text-right">Actual</th>
                          <th className="w-[100px] px-5 py-4">Due</th>
                          {revealPaymentColumns && reviewer === 'financeManager' && <>
                            <th className="w-[180px] px-5 py-4">Vendor</th>
                            <th className="w-[140px] px-5 py-4">Payment</th>
                            <th className="w-[140px] px-5 py-4">Invoice</th>
                          </>}
                          {revealPaymentColumns && reviewer === 'owner' && <>
                            <th className="w-[130px] px-5 py-4">Payment</th>
                            <th className="w-[70px] px-5 py-4 text-center">View</th>
                          </>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {filteredExpenses.length === 0 && (
                          <tr>
                            <td colSpan={1 + (revealPaymentColumns ? (reviewer === 'owner' ? 7 : 8) : 5)} className="text-center py-16 text-slate-400 font-pmedium text-xs">No expenses match this filter.</td>
                          </tr>
                        )}
                        {filteredExpenses.map((exp: any, eIdx: number) => {
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
                            <tr key={`exp-${exp.id || eIdx}`} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-5 py-4 text-center align-top">
                                <p className="text-xs font-pmedium text-slate-400">{eIdx + 1}</p>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <div className="flex items-start gap-2">
                                  {(String(exp.expenseTag || '').toLowerCase() === 'add-on' || exp._isExtra) && (
                                    <span className="mt-0.5 shrink-0 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-amber-700">Extra</span>
                                  )}
                                  <p className="min-w-0 break-words text-xs font-pmedium leading-snug text-slate-900">{exp.title || exp.expenseLabel || `Expense ${eIdx + 1}`}</p>
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
                              <td className="px-5 py-4 align-top">
                                <p className="break-words text-[11px] font-pmedium leading-relaxed text-slate-500">{exp.description || '—'}</p>
                              </td>
                              <td className="px-5 py-4 text-right align-top">
                                {approvedIncrease > 0 ? (
                                  <div title={`Current projection: ${formatCurrency(currentProjection)}`}>
                                    <p className="whitespace-nowrap text-xs font-pmedium text-slate-900">
                                      {formatCurrency(originalProjection)} <span className="text-blue-600">+ {formatCurrency(approvedIncrease)}</span>
                                    </p>
                                    <span className="mt-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-widest text-blue-700">Projection Increased</span>
                                  </div>
                                ) : (
                                  <p className="whitespace-nowrap text-xs font-pmedium text-slate-900">{formatCurrency(currentProjection)}</p>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right align-top">
                                <p className={`whitespace-nowrap text-xs font-pmedium ${actualAmount > currentProjection ? 'text-rose-600' : actualAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {formatCurrency(actualAmount)}
                                </p>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <p className="text-xs font-pmedium text-slate-600">{exp.dueDate || '—'}</p>
                              </td>
                              {revealPaymentColumns && reviewer === 'financeManager' && <>
                                <td className="px-5 py-4 align-top">
                                  {exp.vendorName ? (
                                    <div className="min-w-0">
                                      <p className="break-words text-xs font-pmedium text-slate-900">{exp.vendorName}</p>
                                      {exp.vendorContactPerson && <p className="mt-0.5 break-words text-[10px] font-pmedium text-slate-400">{exp.vendorContactPerson}</p>}
                                    </div>
                                  ) : (
                                    <span className="text-[9px] font-pmedium uppercase tracking-widest text-slate-300">Not Assigned</span>
                                  )}
                                </td>
                                <td className="px-5 py-4 align-top">
                                  <span className={`inline-flex whitespace-normal px-2.5 py-1 rounded-lg text-[9px] font-pmedium uppercase tracking-widest ${paymentStatus.includes('Done') || paymentStatus.includes('Paid') ? 'bg-green-50 text-green-700 border border-green-200' : paymentStatus.includes('Invoice') ? 'bg-blue-50 text-blue-700 border border-blue-200' : paymentStatus.includes('Pending') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                    {formatFinancePaymentStatus(exp.paymentStatus)}
                                  </span>
                                </td>
                                <td className="px-5 py-4 align-top">
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
                                            <span className="min-w-0 truncate font-pmedium">{label}</span>
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
                              {revealPaymentColumns && reviewer === 'owner' && <>
                                <td className="px-5 py-4 align-top">
                                  <span className={`inline-flex whitespace-normal px-2.5 py-1 rounded-lg text-[9px] font-pmedium uppercase tracking-widest ${paymentStatus.includes('Done') || paymentStatus.includes('Paid') ? 'bg-green-50 text-green-700 border border-green-200' : paymentStatus.includes('Invoice') ? 'bg-blue-50 text-blue-700 border border-blue-200' : paymentStatus.includes('Pending') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                    {formatFinancePaymentStatus(exp.paymentStatus)}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-center align-top">
                                  <button
                                    type="button"
                                    onClick={() => setViewingExpenseDetails({ ...exp, invoices })}
                                    className="mx-auto flex items-center justify-center p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                                    title="View Expense"
                                  >
                                    <Eye size={14} />
                                  </button>
                                </td>
                              </>}
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

      {viewingExpenseDetails && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div className="min-w-0">
                <p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-600">Expense Details</p>
                <h3 className="mt-1 text-lg font-pmedium text-slate-900 truncate">{viewingExpenseDetails.title || viewingExpenseDetails.expenseLabel || 'Expense'}</h3>
              </div>
              <button type="button" onClick={() => setViewingExpenseDetails(null)} className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110" aria-label="Close expense details">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Vendor</p>
                  <p className="mt-1 text-sm font-pmedium text-slate-900">{viewingExpenseDetails.vendorName || 'Not assigned'}</p>
                  {viewingExpenseDetails.vendorContactPerson && <p className="mt-1 text-xs font-pmedium text-slate-500">{viewingExpenseDetails.vendorContactPerson}</p>}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Payment Status</p>
                  <p className="mt-1 text-sm font-pmedium text-slate-900">{formatFinancePaymentStatus(viewingExpenseDetails.paymentStatus)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Projected</p>
                  <p className="mt-1 text-sm font-pmedium text-slate-900">{formatCurrency(Number(viewingExpenseDetails.projectedAmount || 0))}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Actual</p>
                  <p className="mt-1 text-sm font-pmedium text-emerald-600">{formatCurrency(Number(viewingExpenseDetails.actualAmount ?? viewingExpenseDetails.actualSpent ?? 0))}</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Description</p>
                <p className="mt-1 text-xs font-pmedium leading-relaxed text-slate-600">{viewingExpenseDetails.description || 'No description provided.'}</p>
              </div>
              <div>
                <p className="mb-2 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Invoices</p>
                {Array.isArray(viewingExpenseDetails.invoices) && viewingExpenseDetails.invoices.length > 0 ? (
                  <div className="space-y-2">
                    {viewingExpenseDetails.invoices.map((invoice: any, invoiceIndex: number) => {
                      const fileUrl = invoice?.invoiceUrl || invoice?.url || invoice?.invoiceFile || '';
                      const label = invoice?.invoiceNumber || `Invoice ${invoiceIndex + 1}`;
                      return fileUrl ? (
                        <a key={invoice?.invoiceKey || `${label}-${invoiceIndex}`} href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-pmedium text-blue-700 hover:bg-blue-100">
                          <Receipt size={13} /> {label}
                          {Number(invoice?.amount || 0) > 0 && <span className="ml-auto">{formatCurrency(invoice.amount)}</span>}
                        </a>
                      ) : (
                        <div key={invoice?.invoiceKey || `${label}-${invoiceIndex}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-pmedium text-slate-600">
                          <Receipt size={13} /> {label}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-pmedium text-slate-400">No invoice attached.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => setViewingExpenseDetails(null)} className="rounded-xl bg-slate-100 px-6 py-2.5 text-xs font-pmedium text-slate-700 hover:bg-slate-200">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
