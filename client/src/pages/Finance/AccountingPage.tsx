import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  FileDown,
  FileSpreadsheet,
  Lock,
  Receipt,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { createReport } from '@/services/reports';
import { getFinanceSnapshot, getPayrollSnapshot, getTenantBillingSnapshot } from '@/services/finance';
import { getMeetingRoomBookings } from '@/services/meeting-room-bookings';
import { DEFAULT_FISCAL_YEAR, getFiscalYearOptions } from '@/features/finance/utils/fiscalYear';
import { downloadReportFile } from '@/utils/report-download';
import PageFrame from '@/components/Pages/PageFrame';

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FISCAL_YEAR_OPTIONS = getFiscalYearOptions();

const money = (value: number = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

const text = (value: string = '') => String(value || '').trim().toLowerCase();

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function padMonth(value: number | string): string {
  return String(value).padStart(2, '0');
}

function getCurrentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${padMonth(now.getMonth() + 1)}`;
}

function parseFiscalYears(value: string = '') {
  const match = String(value).match(/FY\s*(\d{2,4})\s*-\s*(\d{2,4})/i);
  if (!match) {
    const year = new Date().getFullYear();
    return { startYear: year, endYear: year + 1 };
  }
  const normalizeYear = (input: string) => {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) return new Date().getFullYear();
    return parsed < 100 ? 2000 + parsed : parsed;
  };
  return {
    startYear: normalizeYear(match[1]),
    endYear: normalizeYear(match[2]),
  };
}

function getFiscalYearBounds(value: string = '') {
  const { startYear } = parseFiscalYears(value);
  const endYear = startYear + 1;
  return {
    start: new Date(startYear, 3, 1, 0, 0, 0, 0),
    end: new Date(endYear, 2, 31, 23, 59, 59, 999),
  };
}

function isDateInFiscalYear(value: string | Date | null | undefined, fiscalYear: string): boolean {
  const date = toDate(value);
  if (!date) return false;
  const { start, end } = getFiscalYearBounds(fiscalYear);
  return date >= start && date <= end;
}

function buildFiscalPeriods(value: string = '') {
  const { startYear, endYear } = parseFiscalYears(value);
  const periods: Array<{ value: string; label: string }> = [];
  for (let month = 3; month < 12; month += 1) {
    periods.push({
      value: `${startYear}-${padMonth(month + 1)}`,
      label: `${MONTH_SHORT_NAMES[month]} ${startYear}`,
    });
  }
  for (let month = 0; month < 3; month += 1) {
    periods.push({
      value: `${endYear}-${padMonth(month + 1)}`,
      label: `${MONTH_SHORT_NAMES[month]} ${endYear}`,
    });
  }
  return periods;
}

function formatPeriodLabel(value: string = '') {
  const [year, month] = String(value || '').split('-');
  const monthIndex = Number(month) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return value || 'Selected Month';
  return `${MONTH_SHORT_NAMES[monthIndex]} ${year}`;
}

function buildPeriodOptions(value: string = '') {
  const optionMap = new Map<string, { value: string; label: string }>();
  buildFiscalPeriods(value).forEach((period) => {
    optionMap.set(period.value, period);
  });
  const currentPeriodKey = getCurrentPeriodKey();
  if (!optionMap.has(currentPeriodKey)) {
    optionMap.set(currentPeriodKey, {
      value: currentPeriodKey,
      label: formatPeriodLabel(currentPeriodKey),
    });
  }
  return Array.from(optionMap.values()).sort((a, b) => b.value.localeCompare(a.value));
}

const MONTH_OPTIONS = MONTH_SHORT_NAMES.map((label, index) => ({
  value: index + 1,
  label,
}));

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const DEFAULT_MONTH = new Date().getMonth() + 1;
const DEFAULT_YEAR = CURRENT_YEAR;

function periodKeyFromValue(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${padMonth(isoMatch[2])}`;
  }
  const slashMatch = raw.match(/^(\d{4})\/(\d{1,2})$/);
  if (slashMatch) {
    return `${slashMatch[1]}-${padMonth(slashMatch[2])}`;
  }
  const date = toDate(raw);
  if (date) {
    return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}`;
  }
  const normalized = raw.replace(/[-_/]+/g, ' ');
  const namedMatch = normalized.match(/([a-z]{3,9})\s+(\d{4})/i);
  if (namedMatch) {
    const monthIndex = MONTH_SHORT_NAMES.findIndex((m) => m.toLowerCase() === namedMatch[1].slice(0, 3).toLowerCase());
    if (monthIndex >= 0) {
      return `${namedMatch[2]}-${padMonth(monthIndex + 1)}`;
    }
  }
  return '';
}

function getPeriodLabel(month: number | string, year: number | string): string {
  const monthLabel = MONTH_SHORT_NAMES[Number(month) - 1] || 'Selected Month';
  return `${monthLabel} ${year || ''}`.trim();
}

function getSelectedPeriodKey(month: number | string, year: number | string): string {
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  if (!monthNumber || !yearNumber) return '';
  return `${yearNumber}-${padMonth(monthNumber)}`;
}

function labelDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : String(value || '--');
}

function deptKey(value: string = ''): string {
  return text(value).replace(/[\s_]+/g, '-');
}

function resolvedExpenseAmount(expense: Record<string, unknown> = {}): number {
  const actualAmount = Number(expense?.actualAmount || 0);
  if (Number.isFinite(actualAmount) && actualAmount > 0) return actualAmount;
  const status = text(String(expense?.paymentStatus || expense?.status || ''));
  const isPaid = status.includes('paid') || status.includes('done');
  if (!isPaid) return 0;
  return Number(expense?.projectedAmount ?? expense?.amount ?? expense?.requestedAmount ?? expense?.estimatedAmount ?? 0);
}

function getBudgetUsedAmount(request: Record<string, unknown> = {}): number {
  const breakdownUsed = Array.isArray(request?.monthlyBreakdown)
    ? (request.monthlyBreakdown as Array<Record<string, unknown>>).reduce((sum, month) => sum + Number(month?.actualSpent || 0), 0)
    : 0;
  if (breakdownUsed > 0) return breakdownUsed;
  return Number(request?.actualSpent ?? request?.spentYTD ?? request?.previousSpend ?? (request?.budgetStats as Record<string, unknown>)?.used ?? 0);
}

interface LedgerEntry {
  id: string;
  postedAt: Date | null;
  periodKey: string;
  date: string;
  type: string;
  source: string;
  entity: string;
  dept: string;
  amount: number;
  ref: string;
  status: string;
}

function ledgerRow({
  id, date, type, source, entity, dept, amount, ref, status, periodKey,
}: {
  id?: string; date?: string | Date; type?: string; source?: string; entity?: string;
  dept?: string; amount?: number; ref?: string; status?: string; periodKey?: string;
}): LedgerEntry {
  const resolvedDate = toDate(date as string | Date | undefined);
  return {
    id: String(id || `${source}-${entity}-${ref}`),
    postedAt: resolvedDate,
    periodKey: periodKey || (resolvedDate ? `${resolvedDate.getFullYear()}-${padMonth(resolvedDate.getMonth() + 1)}` : ''),
    date: labelDate(date as string | Date | undefined),
    type: type || '',
    source: source || '',
    entity: entity || '',
    dept: dept || '--',
    amount: Number(amount || 0),
    ref: ref || '--',
    status: status || '',
  };
}

interface DepartmentRow {
  id: string;
  name: string;
  assigned: number;
  used: number;
  extra: number;
  remaining: number;
  usage: number;
  monthKey: string;
}

interface PnlData {
  revenueBookings: number;
  revenueTenant: number;
  revenueOther: number;
  revenueTotal: number;
  cogsDepartment: number;
  cogsExtra: number;
  cogsTotal: number;
  payroll: number;
  admin: number;
  opexTotal: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
}



function PnlSection({ title, tone, icon: Icon, rows, totalLabel, totalValue }: {
  title: string; tone: string; icon: React.ComponentType<{ size?: number }>;
  rows: [string, number][]; totalLabel: string; totalValue: number;
}) {
  const toneClass = tone === 'green' ? 'text-green-600 border-green-200' : tone === 'orange' ? 'text-orange-600 border-orange-200' : 'text-red-600 border-red-200';
  const totalClass = tone === 'green' ? 'text-green-700' : tone === 'orange' ? 'text-orange-700' : 'text-red-700';
  return (
    <div>
      <h3 className={`mb-3 flex items-center gap-1 border-b-2 pb-2 text-[10px] font-black uppercase tracking-widest sm:mb-4 sm:text-xs ${toneClass}`}>
        <Icon size={14} /> {title}
      </h3>
      <div className="space-y-2 sm:space-y-3">
        {rows.map(([label, amount]) => (
          <div key={label} className="flex justify-between text-xs font-bold text-gray-700 sm:text-sm">
            <span>{label}</span>
            <span>{money(amount)}</span>
          </div>
        ))}
        <div className={`flex justify-between border-t border-gray-100 pt-2 text-sm font-black sm:pt-3 sm:text-lg ${totalClass}`}>
          <span>{totalLabel}</span>
          <span>{money(totalValue)}</span>
        </div>
      </div>
    </div>
  );
}

export default function AccountingPage(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('ledger');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(DEFAULT_FISCAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(String(DEFAULT_MONTH));
  const [selectedYear, setSelectedYear] = useState(String(DEFAULT_YEAR));
  const [ledgerFilter, setLedgerFilter] = useState('All Types');
  const [data, setData] = useState<{
    finance: Record<string, unknown>;
    tenantBills: Record<string, unknown>[];
    payroll: Record<string, unknown>;
    bookings: Record<string, unknown>[];
  }>({
    finance: {},
    tenantBills: [],
    payroll: {},
    bookings: [],
  });

  const activeAccountingReportLabel = activeTab === 'ledger' ? 'Ledger' : activeTab === 'departments' ? 'Departments' : 'P&L';

  const loadData = useCallback(
    async ({ quiet = false, payrollMonth = selectedMonth, payrollYear = selectedYear, fiscalYear = selectedFiscalYear } = {}) => {
      setIsRefreshing(true);
      setLoadError('');
      try {
        const [financeRes, tenantRes, payrollRes, bookingRes] = await Promise.all([
          getFinanceSnapshot(fiscalYear),
          getTenantBillingSnapshot({ fiscalYear }),
          getPayrollSnapshot({ month: Number(payrollMonth), year: Number(payrollYear) }),
          getMeetingRoomBookings({ fiscalYear }),
        ]);
        setData({
          finance: (financeRes?.data as Record<string, unknown>) || {},
          tenantBills: Array.isArray((tenantRes?.data as Record<string, unknown>)?.tenantBills) ? (tenantRes.data as Record<string, unknown>).tenantBills as Record<string, unknown>[] : [],
          payroll: (payrollRes?.data as Record<string, unknown>) || {},
          bookings: Array.isArray((bookingRes?.data as Record<string, unknown>)?.bookings) ? (bookingRes.data as Record<string, unknown>).bookings as Record<string, unknown>[] : [],
        });
      } catch (error: unknown) {
        const message = (error as Error)?.message || 'Failed to load accounting data.';
        setLoadError(message);
        if (!quiet) toast.error(message);
      } finally {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [selectedFiscalYear, selectedMonth, selectedYear],
  );

  useEffect(() => {
    loadData({ quiet: true });
  }, [loadData]);

  useEffect(() => {
    const syncPayroll = async () => {
      try {
        const payrollRes = await getPayrollSnapshot({ month: Number(selectedMonth), year: Number(selectedYear) });
        setData((current) => ({ ...current, payroll: (payrollRes?.data as Record<string, unknown>) || {} }));
      } catch (error: unknown) {
        setLoadError((error as Error)?.message || 'Failed to load payroll data.');
      }
    };
    syncPayroll();
  }, [selectedMonth, selectedYear]);

  const ledger: LedgerEntry[] = useMemo(() => {
    const rows: LedgerEntry[] = [];
    const withinSelectedFiscalYear = (value: string | Date | null | undefined) => isDateInFiscalYear(value, selectedFiscalYear);

    (data.tenantBills || []).forEach((bill) => {
      if (text(String(bill?.securityDepositPaidStatus || '')).toLowerCase() !== 'paid') return;
      const postedAt = (bill?.invoiceGeneratedAt || bill?.invoiceSentAt || bill?.startDate) as string | undefined;
      if (!withinSelectedFiscalYear(postedAt)) return;
      rows.push(ledgerRow({
        id: bill?.recordId as string || bill?.id as string,
        date: postedAt,
        type: 'Income',
        source: 'Tenant Company Onboarding',
        entity: bill?.companyName as string || 'Tenant Company',
        dept: 'Sales',
        amount: bill?.securityDepositAmount as number || bill?.amount as number || 0,
        ref: bill?.invoiceNumber as string || bill?.id as string,
        status: (bill?.invoiceStatus as string) || 'Paid',
      }));
    });

    (data.bookings || []).forEach((booking) => {
      const bookingType = text(String(booking?.bookingType || ''));
      if (!['external', 'tenant'].includes(bookingType)) return;
      const amount = Number(booking?.totalAmount || 0);
      if (amount <= 0) return;
      const postedAt = (booking?.invoiceGeneratedAt || booking?.invoiceSentAt || booking?.date) as string | undefined;
      if (!withinSelectedFiscalYear(postedAt)) return;
      rows.push(ledgerRow({
        id: booking?.recordId as string || booking?.id as string,
        date: postedAt,
        type: 'Income',
        source: bookingType === 'tenant' ? 'Tenant Booking' : 'Walk-in Booking',
        entity: booking?.clientCompany as string || booking?.bookedByName as string || 'Booking',
        dept: (booking?.department as string) || 'Front Desk',
        amount,
        ref: (booking?.invoiceNumber as string) || (booking?.bookingCode as string) || (booking?.id as string),
        status: (booking?.invoiceStatus as string) || (booking?.financeStatus as string) || (booking?.paymentStatus as string) || 'Booked',
      }));
    });

    const payrollCycles: Array<Record<string, unknown>> = [
      ...((data.payroll?.currentCycle ? [data.payroll.currentCycle] : []) as Array<Record<string, unknown>>),
      ...(Array.isArray(data.payroll?.history) ? data.payroll.history as Array<Record<string, unknown>> : []),
    ];

    payrollCycles.forEach((cycle) => {
      ((cycle?.employees || []) as Array<Record<string, unknown>>).forEach((employee) => {
        if (text(String((employee?.financials as Record<string, unknown>)?.paymentStatus || '')).toLowerCase() !== 'paid') return;
        const amount = Number((employee?.financials as Record<string, unknown>)?.netSalary || 0);
        const paidAt = ((employee?.financials as Record<string, unknown>)?.paidAt || cycle?.paidAt || cycle?.processedOn || cycle?.updatedAt) as string | undefined;
        if (amount <= 0 || !paidAt) return;
        if (!withinSelectedFiscalYear(paidAt)) return;
        rows.push(ledgerRow({
          id: ((employee?.financials as Record<string, unknown>)?.paymentRecordId as string) || ((employee?.financials as Record<string, unknown>)?.paymentTransactionId as string) || `${cycle?.cycleKey || 'payroll'}-${employee?.profileId || employee?.id || employee?.employeeId || employee?.employeeName || 'employee'}`,
          date: paidAt,
          type: 'Expense',
          source: 'Payroll Expense',
          entity: (employee?.employeeName || employee?.fullName || employee?.name || 'Employee') as string,
          dept: (employee?.department as string) || 'Payroll',
          amount,
          ref: ((employee?.financials as Record<string, unknown>)?.paymentTransactionId as string) || ((employee?.financials as Record<string, unknown>)?.paymentRecordId as string) || (cycle?.cycleKey as string) || '--',
          status: ((employee?.financials as Record<string, unknown>)?.paymentStatus as string) || 'Paid',
        }));
      });
    });

    ((data.finance?.departmentFinance || []) as Array<Record<string, unknown>>).forEach((plan) => {
      ((plan?.monthlyPlan || []) as Array<Record<string, unknown>>).forEach((month) => {
        ((month?.expenses || []) as Array<Record<string, unknown>>).forEach((expense) => {
          const amount = resolvedExpenseAmount(expense);
          if (amount <= 0) return;
          const expenseDate = (expense?.date || expense?.paidAt || expense?.invoiceDate || month?.date || month?.monthKey || month?.month) as string | undefined;
          if (!withinSelectedFiscalYear(expenseDate)) return;
          rows.push(ledgerRow({
            id: (expense?.id as string) || `${plan?.department}-${month?.monthKey || month?.month}`,
            date: expenseDate,
            type: 'Expense',
            source: expense?.expenseTag === 'Add-on' ? 'Extra Budget Expense' : 'Department Budget Expense',
            entity: (expense?.vendorName as string) || (expense?.title as string) || 'Department expense',
            dept: (plan?.department as string) || 'Department',
            amount,
            ref: (expense?.invoiceNumber as string) || (expense?.id as string) || '',
            status: String(expense?.paymentStatus || '') || 'Approved',
          }));
        });
      });
    });

    return rows
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => (b.postedAt?.getTime?.() || 0) - (a.postedAt?.getTime?.() || 0));
  }, [data, selectedFiscalYear]);

  const selectedLedger = useMemo(() => {
    const month = Number(selectedMonth);
    const year = Number(selectedYear);
    if (!month || !year) return ledger;
    return ledger.filter((entry) => {
      const posted = entry.postedAt;
      const matchesDate = posted && posted.getMonth() + 1 === month && posted.getFullYear() === year;
      const matchesPeriodKey = entry.periodKey === `${year}-${padMonth(month)}`;
      return matchesDate || matchesPeriodKey;
    });
  }, [ledger, selectedMonth, selectedYear]);

  const selectedPeriodKey = useMemo(() => getSelectedPeriodKey(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const selectedPeriodLabel = getPeriodLabel(selectedMonth, selectedYear);

  const departmentRows: DepartmentRow[] = useMemo(() => {
    const extraRequests = Array.isArray(data.finance?.extraRequests) ? data.finance.extraRequests as Array<Record<string, unknown>> : [];
    const annualRequests = Array.isArray(data.finance?.annualRequests) ? data.finance.annualRequests as Array<Record<string, unknown>> : [];
    const departmentSource = Array.isArray(data.finance?.departments) && (data.finance.departments as Array<unknown>).length > 0
      ? data.finance.departments as Array<Record<string, unknown>>
      : [];
    const departmentPlans = Array.isArray(data.finance?.departmentFinance) ? data.finance.departmentFinance as Array<Record<string, unknown>> : [];
    const departmentRequestMap = new Map<string, Array<Record<string, unknown>>>();
    annualRequests.forEach((request) => {
      const key = deptKey(String(request?.department || ''));
      if (!key) return;
      const current = departmentRequestMap.get(key) || [];
      current.push(request);
      departmentRequestMap.set(key, current);
    });
    const departmentPlanMap = new Map<string, Record<string, unknown>>();
    departmentPlans.forEach((plan) => {
      const key = deptKey(String(plan?.department || plan?.name || ''));
      if (!key) return;
      departmentPlanMap.set(key, plan);
    });
    const baseRows = departmentSource.length > 0
      ? departmentSource
      : Array.from(new Set([...departmentRequestMap.keys(), ...departmentPlanMap.keys()])).map((key) => ({
          department: (departmentPlanMap.get(key)?.department || (departmentRequestMap.get(key)?.[0]?.department) || key) as string,
        }));

    return baseRows.map((plan, index) => {
      const departmentName = String(plan?.department || plan?.name || 'Department');
      const departmentKey = deptKey(departmentName);
      const matchingRequests = departmentRequestMap.get(departmentKey) || [];
      const matchingRequest = matchingRequests[0] || null;
      const matchingPlan = departmentPlanMap.get(departmentKey) || null;
      const assigned = Number(
        plan?.approvedBudget ?? plan?.approvedAnnualBudget ?? plan?.annualBudgetRequested ??
        (plan?.budgetStats as Record<string, unknown>)?.total ?? matchingRequest?.requestedBudget ??
        matchingPlan?.approvedAnnualBudget ?? matchingPlan?.annualBudgetRequested ??
        (matchingPlan?.budgetStats as Record<string, unknown>)?.total ?? 0,
      );
      const usedFromRequest = matchingRequest ? getBudgetUsedAmount(matchingRequest) : 0;
      const used = Number(usedFromRequest) || Number(plan?.spentYTD || plan?.used || (plan?.budgetStats as Record<string, unknown>)?.used || plan?.actualSpent || 0) ||
        Number(matchingPlan?.spentYTD || (matchingPlan?.budgetStats as Record<string, unknown>)?.used || 0) ||
        Number(Array.isArray(matchingPlan?.monthlyPlan) ? (matchingPlan.monthlyPlan as Array<Record<string, unknown>>).reduce((sum, m) => sum + Number(m?.actualSpent || 0), 0) : 0);
      const extra = Number(
        plan?.extraGrantedYTD ?? matchingPlan?.extraGrantedYTD ??
        extraRequests.filter((r) => deptKey(String(r?.department || '')) === departmentKey).filter((r) => text(String(r?.status || '')) === 'approved').reduce((sum, r) => sum + Number(r?.amount || 0), 0),
      );
      const total = assigned + extra;
      const remaining = total - used;
      const usage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
      return {
        id: String(plan?.id || `DEPT-${index + 1}`),
        name: departmentName,
        assigned, used, extra, remaining, usage,
        monthKey: selectedPeriodKey,
      };
    });
  }, [data, selectedPeriodKey]);

  const departmentSpendLedgerRows: LedgerEntry[] = useMemo(() => {
    return departmentRows
      .filter((dept) => Number(dept.used || 0) > 0)
      .map((dept) => ledgerRow({
        id: `DEPT-SPEND-${dept.id}-${selectedPeriodKey || 'current'}`,
        date: `${selectedYear}-${padMonth(selectedMonth)}-01`,
        type: 'Expense',
        source: 'Department Spend',
        entity: dept.name,
        dept: dept.name,
        amount: Number(dept.used || 0),
        ref: selectedPeriodLabel,
        status: 'Recorded',
        periodKey: selectedPeriodKey,
      }))
      .filter((entry) => isDateInFiscalYear(entry.postedAt, selectedFiscalYear));
  }, [departmentRows, selectedPeriodKey, selectedMonth, selectedYear, selectedPeriodLabel, selectedFiscalYear]);

  const displayLedger: LedgerEntry[] = useMemo(() => {
    const departmentExpenseSources = ['department budget expense', 'extra budget expense', 'department spend'];
    const baseLedger = selectedLedger.filter((entry) => !departmentExpenseSources.some((source) => text(entry.source).includes(source)));
    return [...baseLedger, ...departmentSpendLedgerRows].sort((a, b) => (b.postedAt?.getTime?.() || 0) - (a.postedAt?.getTime?.() || 0));
  }, [departmentSpendLedgerRows, selectedLedger]);

  const pnlData: PnlData = useMemo(() => {
    const income = displayLedger.filter((entry) => entry.type === 'Income');
    const expense = displayLedger.filter((entry) => entry.type === 'Expense');
    const directCostDepartments = new Set(['maintenance', 'it', 'tech', 'operations', 'facilities', 'infrastructure']);
    const isDepartmentCost = (entry: LedgerEntry) =>
      directCostDepartments.has(deptKey(entry.dept)) || text(entry.source).includes('department spend') ||
      text(entry.source).includes('department budget expense') || text(entry.source).includes('extra budget expense');
    const total = (items: LedgerEntry[]) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const revenueBookings = total(income.filter((item) => text(item.source).includes('booking')));
    const revenueTenant = total(income.filter((item) => text(item.source).includes('tenant')));
    const revenueOther = total(income) - revenueBookings - revenueTenant;
    const cogsDepartment = total(expense.filter((item) => isDepartmentCost(item)));
    const cogsExtra = total(expense.filter((item) => text(item.source).includes('extra budget')));
    const payroll = total(expense.filter((item) => text(item.source).includes('payroll')));
    const admin = total(expense) - cogsDepartment - cogsExtra - payroll;
    const revenueTotal = revenueBookings + revenueTenant + revenueOther;
    const cogsTotal = cogsDepartment + cogsExtra;
    const opexTotal = payroll + Math.max(0, admin);
    const grossProfit = revenueTotal - cogsTotal;
    const netProfitVal = grossProfit - opexTotal;
    const margin = revenueTotal > 0 ? Math.round((netProfitVal / revenueTotal) * 100) : 0;
    return {
      revenueBookings, revenueTenant, revenueOther, revenueTotal,
      cogsDepartment, cogsExtra, cogsTotal, payroll, admin: Math.max(0, admin),
      opexTotal, grossProfit, netProfit: netProfitVal, margin,
    };
  }, [displayLedger]);

  const totalRevenue = useMemo(() => displayLedger.filter((e) => e.type === 'Income').reduce((s, e) => s + Number(e.amount || 0), 0), [displayLedger]);
  const totalExpenses = useMemo(() => displayLedger.filter((e) => e.type === 'Expense').reduce((s, e) => s + Number(e.amount || 0), 0), [displayLedger]);
  const payrollExpenses = useMemo(() => displayLedger.filter((e) => text(e.source).includes('payroll')).reduce((s, e) => s + Number(e.amount || 0), 0), [displayLedger]);
  const departmentExpenses = useMemo(() => departmentRows.reduce((s, d) => s + Number(d.used || 0), 0), [departmentRows]);
  const pendingPayments = useMemo(() => displayLedger.filter((e) => e.type === 'Expense' && !text(e.status).includes('paid')).reduce((s, e) => s + Number(e.amount || 0), 0), [displayLedger]);
  const netProfitVal = totalRevenue - totalExpenses;

  const filteredLedger = useMemo(() => {
    const q = text(searchQuery);
    return displayLedger.filter((entry) => {
      const matchesSearch = !q || text(`${entry.entity} ${entry.ref} ${entry.source} ${entry.dept}`).includes(q);
      const matchesType = ledgerFilter === 'All Types' || entry.type === ledgerFilter;
      return matchesSearch && matchesType;
    });
  }, [ledgerFilter, searchQuery, displayLedger]);

  const handleExportAccountingReport = useCallback(
    async (format: string = 'PDF') => {
      const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
      const reportMonth = new Date().toISOString().slice(0, 7);
      const fiscalYearLabel = selectedFiscalYear || DEFAULT_FISCAL_YEAR;
      const getReportConfig = () => {
        if (activeTab === 'ledger') {
          return {
            title: `Accounting Ledger - ${fiscalYearLabel}`,
            period: `${fiscalYearLabel} Ledger`,
            description: `Accounting ledger export for ${fiscalYearLabel}.`,
            sourceRef: 'accounting-ledger',
            reportRows: [
              { label: 'Report Scope', value: 'Ledger' },
              { label: 'Fiscal Year', value: fiscalYearLabel },
              { label: 'Record Count', value: String(displayLedger.length) },
              { label: 'Revenue', value: money(totalRevenue) },
              { label: 'Expenses', value: money(totalExpenses) },
              { label: 'Net Profit', value: money(netProfitVal) },
              ...displayLedger.map((entry, index) => ({
                label: `${index + 1}. ${entry.date} | ${entry.type} | ${entry.source}`,
                value: [`Entity: ${entry.entity}`, `Department: ${entry.dept}`, `Amount: ${money(entry.amount)}`, `Ref: ${entry.ref}`, entry.status ? `Status: ${entry.status}` : ''].filter(Boolean).join(' | '),
              })),
            ],
            monthlyData: displayLedger.map((entry) => ({ month: entry.date || '', metric: entry.entity || entry.source || 'Ledger Entry', value: money(entry.amount || 0) })),
          };
        }
        if (activeTab === 'departments') {
          return {
            title: `Accounting Departments - ${fiscalYearLabel}`,
            period: `${fiscalYearLabel} Department Spend`,
            description: `Department spending summary for ${fiscalYearLabel}.`,
            sourceRef: 'accounting-departments',
            reportRows: [
              { label: 'Report Scope', value: 'Departments' },
              { label: 'Fiscal Year', value: fiscalYearLabel },
              { label: 'Department Count', value: String(departmentRows.length) },
              { label: 'Total Assigned', value: money(departmentRows.reduce((s, d) => s + Number(d.assigned || 0), 0)) },
              { label: 'Total Used', value: money(departmentExpenses) },
              ...departmentRows.map((dept) => ({
                label: dept.name,
                value: [`Assigned: ${money(dept.assigned)}`, `Used: ${money(dept.used)}`, `Extra: ${money(dept.extra)}`, `Remaining: ${money(dept.remaining)}`].join(' | '),
              })),
            ],
            monthlyData: departmentRows.map((dept) => ({ month: selectedPeriodLabel, metric: dept.name, value: money(dept.used || 0) })),
          };
        }
        return {
          title: `Accounting P&L - ${fiscalYearLabel}`,
          period: `${fiscalYearLabel} Profit & Loss`,
          description: `Profit and loss summary for ${fiscalYearLabel}.`,
          sourceRef: 'accounting-pnl',
          reportRows: [
            { label: 'Report Scope', value: 'Profit & Loss' },
            { label: 'Fiscal Year', value: fiscalYearLabel },
            { label: 'Revenue', value: money(pnlData.revenueTotal) },
            { label: 'COGS', value: money(pnlData.cogsTotal) },
            { label: 'Gross Profit', value: money(pnlData.grossProfit) },
            { label: 'OPEX', value: money(pnlData.opexTotal) },
            { label: 'Net Profit', value: money(pnlData.netProfit) },
            { label: 'Margin', value: `${pnlData.margin}%` },
          ],
          monthlyData: displayLedger.map((entry) => ({ month: entry.date || '', metric: entry.type || 'P&L Entry', value: money(entry.amount || 0) })),
        };
      };
      const selectedReport = getReportConfig();
      if (!selectedReport.reportRows.length) {
        toast.error(`There is no ${activeAccountingReportLabel.toLowerCase()} data to export for ${fiscalYearLabel}.`);
        return;
      }
      try {
        const response = await createReport({
          title: selectedReport.title, department: 'Finance', category: 'Financial',
          dataWindow: 'Annual', reportMonth, period: selectedReport.period,
          generatedBy: 'Accounting Team', format: reportFormat,
          description: selectedReport.description, sourceType: 'custom',
          sourceRef: selectedReport.sourceRef, reportRows: selectedReport.reportRows,
          monthlyData: selectedReport.monthlyData,
        });
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
        window.dispatchEvent(new Event('reports:refresh'));
        toast.success(`${activeAccountingReportLabel} report saved to Reports.`);
      } catch (error: unknown) {
        toast.error((error as Error)?.message || `Failed to export ${activeAccountingReportLabel.toLowerCase()}.`);
      }
    },
    [activeAccountingReportLabel, activeTab, departmentExpenses, departmentRows, displayLedger, netProfitVal, pnlData, selectedFiscalYear, selectedPeriodLabel, totalExpenses, totalRevenue],
  );

  if (isLoading) return <TablePageSkeleton rows={6} columns={6} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ═══ HEADER ═══ */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Accounting
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">Core Module | Ledger, department budgets & P&amp;L reports</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm">
                <Calendar size={14} className="text-[#2563EB]" />
                <select
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none"
                >
                  {FISCAL_YEAR_OPTIONS.map((fy: string) => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
              </div>
              <button
                                type="button"
                                // onClick={handleExportPDF}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileDown size={16} className="text-red-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
                              </button>
                              <button
                                type="button"
                                // onClick={handleExportExcel}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileSpreadsheet size={16} className="text-emerald-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
                              </button>
            </div>
          </div>

          {/* ═══ ERROR BANNER ═══ */}
          {loadError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle size={14} /> {loadError}
            </div>
          )}

          {/* ═══ PILL TABS (DESIGN.md: pill-style with blue active bg) ═══ */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {([
              ['ledger', Receipt, 'Ledger'],
              ['departments', Building2, 'Departments'],
              ['pnl', BarChart3, 'P&L'],
            ] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === id
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* ═══ STAT CARDS (DESIGN.md: border-l-4 accent per card, tab-aware) ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {(activeTab === 'ledger'
              ? [
                  { key: 'revenue', label: 'Revenue', value: money(totalRevenue), isCurrency: true, icon: ArrowUpRight },
                  { key: 'expenses', label: 'Expenses', value: money(totalExpenses), isCurrency: true, icon: ArrowDownRight },
                  { key: 'netProfit', label: 'Net Profit', value: money(netProfitVal), isCurrency: true, icon: TrendingUp },
                  { key: 'transactions', label: 'Transactions', value: String(displayLedger.length), icon: Receipt },
                ]
              : activeTab === 'departments'
                ? [
                    { key: 'totalAssigned', label: 'Total Assigned', value: money(departmentRows.reduce((s, d) => s + Number(d.assigned || 0), 0)), isCurrency: true, icon: Building2 },
                    { key: 'totalUsed', label: 'Total Used', value: money(departmentExpenses), isCurrency: true, icon: ArrowDownRight },
                    { key: 'departments', label: 'Departments', value: String(departmentRows.length), icon: Building2 },
                    { key: 'avgUsage', label: 'Avg Usage', value: departmentRows.length > 0 ? `${Math.round(departmentRows.reduce((s, d) => s + d.usage, 0) / departmentRows.length)}%` : '0%', icon: TrendingUp },
                  ]
                : [
                    { key: 'pnlRevenue', label: 'Revenue', value: money(pnlData.revenueTotal), isCurrency: true, icon: ArrowUpRight },
                    { key: 'grossProfit', label: 'Gross Profit', value: money(pnlData.grossProfit), isCurrency: true, icon: TrendingUp },
                    { key: 'pnlNetProfit', label: 'Net Profit', value: money(pnlData.netProfit), isCurrency: true, icon: TrendingUp },
                    { key: 'margin', label: 'Margin', value: `${pnlData.margin}%`, icon: BarChart3 },
                  ]).map((card, idx) => {
              const Icon = card.icon;
              const borderColors = ['', 'border-l-4 border-l-amber-500', 'border-l-4 border-l-blue-500', 'border-l-4 border-l-emerald-500'];
              const iconClasses = ['bg-slate-50 text-slate-600', 'bg-amber-50 text-amber-600', 'bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600'];
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${borderColors[idx] || ''}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className={`text-[15px] font-black ${card.isCurrency ? 'text-blue-600' : 'text-slate-900'}`}>{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${iconClasses[idx] || 'bg-slate-50 text-slate-600'} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ DATA PANEL ═══ */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* ── Panel Header ── */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
              {activeTab === 'ledger' && (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <select className="w-auto rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[10px] font-bold text-blue-700 shadow-sm outline-none" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                    {MONTH_OPTIONS.map((m) => (<option key={m.value} value={String(m.value)}>{m.label}</option>))}
                  </select>
                  <select className="w-auto rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[10px] font-bold text-blue-700 shadow-sm outline-none" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    {YEAR_OPTIONS.map((y) => (<option key={y} value={String(y)}>{y}</option>))}
                  </select>
                  <select className="w-auto rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[10px] font-bold text-gray-700 shadow-sm outline-none" value={ledgerFilter} onChange={(e) => setLedgerFilter(e.target.value)}>
                    <option>All Types</option>
                    <option>Income</option>
                    <option>Expense</option>
                  </select>
                  <div className="relative w-full min-w-[220px] sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search entity, ref, department..."
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-[11px] font-bold outline-none shadow-sm focus:ring-2 focus:ring-[#2563EB]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'pnl' && (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <select className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[10px] font-bold text-blue-700 shadow-sm outline-none" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                    {MONTH_OPTIONS.map((m) => (<option key={m.value} value={String(m.value)}>{m.label}</option>))}
                  </select>
                  <select className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[10px] font-bold text-blue-700 shadow-sm outline-none" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    {YEAR_OPTIONS.map((y) => (<option key={y} value={String(y)}>{y}</option>))}
                  </select>
                </div>
              )}
            </div>

            {/* ── Tab Content ── */}
            <div className="flex-1 overflow-x-auto">
              {activeTab === 'ledger' && (
                <table className="min-w-[900px] w-full text-left">
                  <thead className="sticky top-0 z-10 border-b border-gray-100 bg-white text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <tr>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Date & ID</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Type</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Source</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Entity</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Department</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLedger.map((entry) => (
                      <tr key={entry.id} className="transition hover:bg-slate-50">
                        <td className="space-y-0.5 px-4 py-4 sm:px-6 sm:py-5">
                          <p className="flex items-center gap-1 text-xs font-bold text-gray-900">
                            <Calendar size={10} /> {entry.date}
                          </p>
                          <p className="text-[8px] font-black uppercase text-gray-500 sm:text-[9px]">{entry.id}</p>
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-5">
                          <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${entry.type === 'Income' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            {entry.type === 'Income' ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-5">
                          <p className="text-xs font-bold text-gray-800">{entry.source}</p>
                          <p className="mt-0.5 text-[8px] font-bold uppercase text-gray-500">Ref: {entry.ref}</p>
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-5">
                          <p className="text-xs font-bold text-gray-900">{entry.entity}</p>
                          {entry.status ? <p className="mt-0.5 text-[9px] font-bold text-blue-600">{entry.status}</p> : null}
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-5">
                          <p className="text-xs font-bold text-gray-700">{entry.dept}</p>
                        </td>
                        <td className={`px-4 py-4 text-right text-base font-black sm:px-6 sm:py-5 ${entry.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.type === 'Income' ? '+' : '-'}{money(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'departments' && (
                <table className="min-w-[800px] w-full text-left">
                  <thead className="sticky top-0 z-10 border-b border-gray-100 bg-white text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <tr>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Department</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Assigned</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Used</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5">Extra</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-center">Usage</th>
                      <th className="px-4 py-4 sm:px-6 sm:py-5 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {departmentRows.map((dept) => {
                      const danger = dept.usage >= 90 || dept.remaining < 0;
                      return (
                        <tr key={dept.id} className="transition hover:bg-blue-50/30">
                          <td className="px-4 py-4 sm:px-6 sm:py-5">
                            <p className="flex items-center gap-2 text-xs font-black text-gray-900 sm:text-sm">
                              <Building2 size={14} className="text-blue-600" />
                              {dept.name}
                            </p>
                            <p className="mt-0.5 text-[8px] font-bold uppercase text-gray-400">{dept.id}</p>
                          </td>
                          <td className="px-4 py-4 sm:px-6 sm:py-5 text-xs font-black text-gray-900 sm:text-sm">{money(dept.assigned)}</td>
                          <td className="px-4 py-4 sm:px-6 sm:py-5 text-xs font-black text-gray-900 sm:text-sm">{money(dept.used)}</td>
                          <td className="px-4 py-4 sm:px-6 sm:py-5 text-center">
                            {dept.extra > 0
                              ? <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">{money(dept.extra)}</span>
                              : <span className="text-xs font-bold text-gray-400">--</span>}
                          </td>
                          <td className="px-4 py-4 sm:px-6 sm:py-5">
                            <div className="mb-1.5 flex justify-between text-[9px] font-bold uppercase tracking-widest">
                              <span className="text-gray-500">Used</span>
                              <span className={danger ? 'text-red-600' : 'text-green-600'}>{Math.round(dept.usage)}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                              <div className={`h-full rounded-full ${danger ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${dept.usage}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-xs font-black sm:px-6 sm:py-5 sm:text-sm">
                            <span className={dept.remaining < 0 ? 'text-red-600' : 'text-slate-900'}>{money(dept.remaining)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {activeTab === 'pnl' && (
                <div className="flex justify-center bg-slate-50 p-4 sm:p-6 md:p-10">
                  <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">
                    <div className="bg-slate-900 p-6 text-center text-white sm:p-8">
                      <h2 className="mb-1 flex items-center justify-center gap-2 text-lg font-black uppercase tracking-widest sm:text-2xl">
                        <BarChart3 size={20} /> Profit & Loss
                      </h2>
                      <p className="text-xs font-bold text-slate-400 sm:text-sm">{selectedPeriodLabel} Report</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 border-b border-blue-100 bg-blue-50 p-2 text-[10px] font-bold text-blue-800 sm:text-xs">
                      <ShieldCheck size={14} className="text-blue-600" />
                      Read only. Auto-compiled from the live ledger for {selectedPeriodLabel}.
                    </div>
                    <div className="space-y-6 p-4 sm:space-y-8 sm:p-6 md:p-8">
                      <PnlSection title="Revenue" tone="green" icon={ArrowUpRight} rows={[['Walk-in / Bookings', pnlData.revenueBookings], ['Tenant Onboarding', pnlData.revenueTenant], ['Other Income', pnlData.revenueOther]]} totalLabel="Total Income" totalValue={pnlData.revenueTotal} />
                      <PnlSection title="COGS" tone="orange" icon={Building2} rows={[['Department Costs', pnlData.cogsDepartment], ['Extra Budget Costs', pnlData.cogsExtra]]} totalLabel="Total COGS" totalValue={pnlData.cogsTotal} />
                      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-100 p-3 sm:p-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 sm:text-xs">Gross Profit</span>
                        <span className="text-lg font-black text-gray-900 sm:text-xl">{money(pnlData.grossProfit)}</span>
                      </div>
                      <PnlSection title="OPEX" tone="red" icon={ArrowDownRight} rows={[['Payroll', pnlData.payroll], ['Admin / Other', pnlData.admin]]} totalLabel="Total Expenses" totalValue={pnlData.opexTotal} />
                      <div className={`flex flex-col gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${pnlData.netProfit >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div>
                          <span className={`text-xs font-black uppercase tracking-widest sm:text-sm ${pnlData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>Net Profit</span>
                          <p className={`mt-1 text-[10px] font-bold uppercase ${pnlData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Margin: {pnlData.margin}%</p>
                        </div>
                        <span className={`text-2xl font-black tracking-tight sm:text-4xl ${pnlData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{money(pnlData.netProfit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </PageFrame>
    </div>
  );
}
