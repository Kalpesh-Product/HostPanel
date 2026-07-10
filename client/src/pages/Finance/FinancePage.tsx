import React, { useEffect, useState } from 'react';
import { 
  Search, DollarSign, TrendingUp, CheckCircle2, Clock, AlertCircle, 
  Eye, X, Check, MessageSquare, Building2,
  Calendar, Filter, Plus, FileText, Receipt, FileWarning, Download,
  AlertTriangle, XCircle
} from 'lucide-react';
import { getStoredUser } from '@/lib/auth-session';
import { applyFinanceApprovalDecision, getFinanceSnapshot, updateMonthlyExpenseStatus } from '@/services/finance';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { DEFAULT_FISCAL_YEAR, getFiscalYearOptions } from '@/features/finance/utils/fiscalYear';
import PageFrame from '@/components/Pages/PageFrame';

export function FinancePage() {
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
    const nextAnnualRequests = Array.isArray(payload.annualRequests) ? payload.annualRequests : [];
    const nextDepartmentFinance = Array.isArray(payload.departmentFinance) ? payload.departmentFinance : [];
    const nextDepartments = Array.isArray(payload.departments) ? payload.departments : [];

    setDepartments(
      nextDepartments.length > 0 || nextDepartmentFinance.length > 0
        ? buildDepartmentsWithApprovedRequests(nextDepartments, nextAnnualRequests, nextDepartmentFinance)
        : [],
    );
    setAnnualRequests(nextAnnualRequests);
    setExtraRequests(Array.isArray(payload.extraRequests) ? payload.extraRequests : []);
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
        if (isMounted) applyFinanceData(response?.data || {});
      } catch (error: any) {
        if (isMounted) setErrorMessage(error?.message || 'Failed to load finance dashboard data.');
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

  const departmentRegisteredVendors = Array.isArray(viewingDepartmentFinancePlan?.vendors)
    ? viewingDepartmentFinancePlan.vendors
    : [];

  // --- HANDLERS ---
  const handleAction = async (type: string, id: string, action: string) => {
    setIsSavingDecision(true);
    setErrorMessage('');
    try {
      const response = await applyFinanceApprovalDecision(type, id, { status: action, fiscalYear: selectedFY });
      applyFinanceData(response?.data || {});
      setViewingRequest(null);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to update approval decision.');
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
      applyFinanceData(response?.data || {});
      setViewingExpense((current: any) => (current ? { ...current, paymentStatus: 'Paid', status: 'Paid' } : current));
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to update payment status.');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  // Shared UI logic
  const tabs = [
    { key: 'approvals', label: 'Approval Center' },
    { key: 'overview', label: 'Master Overview' },
  ];

  const subTabsApprovals = [
    { key: 'annual', label: 'Projected Annual Budget Requests', count: pendingAnnualRequests.length },
    { key: 'extra', label: 'Extra Budget Requests', count: pendingExtraRequests.length },
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
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Total Budget</p>
                <p className="text-[15px] font-black text-slate-900">{formatCurrency(totalAllocated)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><DollarSign size={16}/></div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Spent (YTD)</p>
                <p className="text-[15px] font-black text-slate-900">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><TrendingUp size={16}/></div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Action Required</p>
                <p className="text-[15px] font-black text-slate-900">{pendingActions} Req</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><AlertCircle size={16}/></div>
            </div>
            
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Financial Year</p>
                <p className="text-[15px] font-black text-slate-900">{selectedFY}</p>
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
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100/70 p-1 overflow-x-auto w-full xl:w-auto">
                  {subTabsApprovals.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setApprovalSubTab(tab.key)}
                      className={`rounded-xl px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        approvalSubTab === tab.key
                          ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                          : 'bg-transparent text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                          approvalSubTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {tab.count}
                        </span>
                      )}
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
                    type="text" placeholder="Search..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                  <select 
                    value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
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
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    {approvalSubTab === 'annual' ? (
                      <tr>
                        <th className="px-5 py-4">Department</th>
                        <th className="px-5 py-4">Total Requested Budget</th>
                        <th className="px-5 py-4">Previous Year Spend</th>
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
                            <div className="font-bold text-slate-900 flex items-center gap-2"><Building2 size={14} className="text-[#2563EB]"/> {req.department}</div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {req.id}</div>
                          </td>
                          <td className="px-5 py-4 font-black text-[#2563EB] text-lg">{formatCurrency(req.requestedBudget)}</td>
                          <td className="px-5 py-4 font-bold text-slate-500">{formatCurrency(req.previousSpend)}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : req.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => setViewingRequest({ ...req, type: 'annual' })} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all mx-auto block" title="View Request">
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      pendingExtraRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900">{req.department}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{req.date}</div>
                          </td>
                          <td className="px-5 py-4 font-black text-[#2563EB] text-base">{formatCurrency(req.amount)}</td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-bold text-slate-600 max-w-[250px] truncate">{req.reason}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : req.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => setViewingRequest({ ...req, type: 'extra' })} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all mx-auto block" title="View Request">
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                    {((approvalSubTab === 'annual' && visibleAnnualRequests.length === 0) || (approvalSubTab === 'extra' && pendingExtraRequests.length === 0)) && (
                       <tr>
                         <td colSpan={5} className="text-center py-20 text-slate-400 font-semibold">
                           No items found.
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
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
                          <td className="px-5 py-4 font-bold text-slate-900"><Building2 size={14} className="inline mr-2 text-slate-400"/>{dept.name}</td>
                          <td className="px-5 py-4">
                            <div className="font-black text-slate-700">{formatCurrency(approvedBudget)}</div>
                            {dept.extraGrantedYTD > 0 && <div className="text-[10px] font-bold text-slate-500">+ {formatCurrency(dept.extraGrantedYTD)} Extra</div>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-indigo-600">{formatCurrency(dept.spentYTD)}</div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 max-w-[120px]">
                              <div className={`h-1.5 rounded-full ${spentPercent > 90 ? 'bg-red-500' : spentPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(spentPercent, 100)}%` }}></div>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-black text-slate-900">{formatCurrency(remaining)}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${dept.health === 'Healthy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : dept.health === 'Warning' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
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
                         <td colSpan={6} className="text-center py-20 text-slate-400 font-semibold">
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
      {viewingRequest && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Building2 size={20} className="text-[#2563EB]"/> {viewingRequest.department} Request
              </h2>
              <button onClick={() => setViewingRequest(null)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18}/></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-6 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Requested Amount</p>
                <p className="text-4xl font-black text-blue-900">{formatCurrency(viewingRequest.type === 'annual' ? viewingRequest.requestedBudget : viewingRequest.amount)}</p>
              </div>
              <p className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">"{viewingRequest.reason || 'No description provided.'}"</p>
            </div>
            {viewingRequest.status === 'Pending' && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                <button disabled={isSavingDecision} onClick={() => handleAction(viewingRequest.type, viewingRequest.id, 'Discuss')} className="btn-pill px-5 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors">Discuss</button>
                <button disabled={isSavingDecision} onClick={() => handleAction(viewingRequest.type, viewingRequest.id, 'Rejected')} className="btn-pill px-5 py-2.5 bg-red-100 text-red-600 hover:bg-red-200 transition-colors">Reject</button>
                <button disabled={isSavingDecision} onClick={() => handleAction(viewingRequest.type, viewingRequest.id, 'Approved')} className="btn-pill px-5 py-2.5 bg-[#2563EB] text-white hover:bg-blue-700 transition-colors shadow-sm">Approve</button>
              </div>
            )}
          </div>
        </div>
      )}

      {viewingDeptOverview && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Building2 size={20} className="text-[#2563EB]"/> {viewingDeptOverview.name} Details
              </h2>
              <button onClick={() => setViewingDeptOverview(null)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18}/></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Budget</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency((viewingDeptOverview.approvedBudget || 0) + (viewingDeptOverview.extraGrantedYTD || 0))}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Spent YTD</p>
                  <p className="text-xl font-black text-blue-900">{formatCurrency(viewingDeptOverview.spentYTD)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
