import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingDown,
  AlertCircle,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  Building2,
  Receipt,
  PieChart,
  Eye,
  Calendar,
  Clock,
  DownloadCloud,
  FileWarning,
  Bell,
  DollarSign,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { applyFinanceApprovalDecision, getFinanceSnapshot, updateMonthlyExpenseStatus } from '@/services/finance';
import { createReport } from '@/services/reports';
import { downloadReportFile } from '@/utils/report-download';
import { getStoredUser } from '@/lib/auth-session';
import { DEFAULT_FISCAL_YEAR, getFiscalYearOptions } from '@/features/finance/utils/fiscalYear';
import PageFrame from '@/components/Pages/PageFrame';

/* ───────────────────── Types ───────────────────── */

interface ApprovalFlowEntry {
  status?: string;
  approverName?: string;
  decidedAtLabel?: string;
}

interface ApprovalFlow {
  owner?: ApprovalFlowEntry;
  financeManager?: ApprovalFlowEntry;
  finalStatus?: string;
  stateLabel?: string;
}

interface Expense {
  id?: string;
  title?: string;
  expenseLabel?: string;
  description?: string;
  details?: string;
  projectedAmount?: number;
  estimatedAmount?: number;
  amount?: number;
  requestedAmount?: number;
  actualAmount?: number;
  dueDate?: string;
  paymentStatus?: string;
  status?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  poId?: string;
  vendorId?: string;
  vendorName?: string;
  vendor?: string;
  vendorFilled?: boolean;
  vendorContact?: string;
  vendorContactPerson?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorAddress?: string;
  vendorCategory?: string;
  vendorPaymentTerms?: string;
  vendorGstin?: string;
  vendorPanNumber?: string;
  vendorBankName?: string;
  vendorAccountName?: string;
  vendorAccountNumber?: string;
  vendorIfscCode?: string;
  vendorUpiId?: string;
  vendorWebsite?: string;
  vendorCreatedByUserId?: string;
  vendorCreatedByName?: string;
  vendorNotes?: string;
  notes?: string;
  createdByUserId?: string;
  createdByName?: string;
  paidBy?: string;
  date?: string;
  monthKey?: string;
  month?: string;
  monthTitle?: string;
  department?: string;
  _isExtra?: boolean;
  savings?: number;
  projectedAmountPatched?: number;
  actualAmountPatched?: number;
}

interface MonthlyBreakdown {
  monthKey?: string;
  month?: string;
  title?: string;
  projectedBudget?: number;
  amount?: number;
  projectedTotal?: number;
  actualSpent?: number;
  status?: string;
  expenses?: Expense[];
  extraExpenses?: Expense[];
  savings?: number;
}

interface Budget {
  id: string;
  department: string;
  requested: number;
  approved: number;
  status: string;
  date: string;
  used: number;
  actualSpent: number;
  previousSpend: number;
  details: string;
  approvalFlow: ApprovalFlow;
  requestId: string;
  monthlyBreakdown: MonthlyBreakdown[];
  submittedByName: string;
  approvalStateLabel: string;
}

interface ExtraBudget {
  id: string;
  department: string;
  requested: number;
  approved: number;
  status: string;
  date: string;
  details: string;
  month: string;
  dueDate: string;
  approvalFlow: ApprovalFlow;
  requestId: string;
  submittedByName: string;
  approvalStateLabel: string;
}

interface LedgerEntry {
  id: string;
  refPoId: string;
  department: string;
  monthKey?: string;
  item: string;
  vendor: string;
  amount: number;
  projectedAmount?: number;
  actualAmount?: number;
  paidDate: string;
  dateLabel?: string;
  status: string;
  paymentStatus?: string;
  invoice: string | null;
  invoiceNumber?: string;
  invoiceUrl?: string;
  paidBy: string;
  month?: string;
  monthTitle?: string;
  expenseLabel?: string;
  title?: string;
  description?: string;
  vendorId?: string;
  vendorName?: string;
  vendorContactPerson?: string;
  vendorContact?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  vendorCategory?: string;
  vendorPaymentTerms?: string;
  vendorGstin?: string;
  vendorPanNumber?: string;
  vendorBankName?: string;
  vendorAccountName?: string;
  vendorAccountNumber?: string;
  vendorIfscCode?: string;
  vendorUpiId?: string;
  vendorWebsite?: string;
  vendorCreatedByUserId?: string;
  vendorCreatedByName?: string;
  notes?: string;
}

/* ───────────────────── Constants / Helpers ───────────────────── */

const FALLBACK_DEPARTMENTS = ["HR", "Administration", "Finance", "Sales & CRM", "Tech", "IT", "Maintenance"];

function formatDateLabel(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(String(value).slice(0, 10));
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalizeLookupKey(value = ''): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isPlaceholderVendorValue(value = ''): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || ['not assigned', 'unassigned', 'not set', 'n/a', 'na', 'none'].includes(normalized);
}

function isPaidLikeStatus(status = ''): boolean {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (!normalizedStatus || normalizedStatus === 'not paid' || normalizedStatus === 'unpaid') return false;
  return (
    normalizedStatus.includes('payment done') ||
    normalizedStatus.includes('invoice shared') ||
    normalizedStatus.includes('completed') ||
    normalizedStatus === 'paid'
  );
}

function normalizeApprovalFlow(flow: Partial<ApprovalFlow> = {}): ApprovalFlow {
  return {
    owner: {
      status: flow?.owner?.status || 'Pending',
      approverName: flow?.owner?.approverName || '',
      decidedAtLabel: flow?.owner?.decidedAtLabel || '',
    },
    financeManager: {
      status: flow?.financeManager?.status || 'Pending',
      approverName: flow?.financeManager?.approverName || '',
      decidedAtLabel: flow?.financeManager?.decidedAtLabel || '',
    },
    finalStatus: flow?.finalStatus || 'Pending',
    stateLabel: flow?.stateLabel || '',
  };
}

function getDepartmentFinancePlan(payload: any = {}, departmentName = ''): any {
  const targetKey = normalizeLookupKey(departmentName);
  return Array.isArray(payload.departmentFinance)
    ? payload.departmentFinance.find((plan: any) => normalizeLookupKey(plan?.department || plan?.name || '') === targetKey)
    : null;
}

function buildVendorLookup(departmentPlan: any = {}): Map<string, any> {
  const lookup = new Map<string, any>();
  const registerVendor = (vendor: any = {}) => {
    const keys = [vendor?.id, vendor?.vendorId, vendor?.name, vendor?.vendorName, vendor?.contactPerson, vendor?.email]
      .map(normalizeLookupKey)
      .filter(Boolean);
    keys.forEach((key) => { if (!lookup.has(key)) lookup.set(key, vendor); });
  };
  const registerExpenseVendor = (expense: any = {}) => {
    const vendorId = String(expense?.vendorId || '').trim();
    const vendorName = String(expense?.vendorName || expense?.vendor || '').trim();
    const contactPerson = String(expense?.vendorContactPerson || expense?.vendorContact || '').trim();
    const email = String(expense?.vendorEmail || '').trim();
    const phone = String(expense?.vendorPhone || '').trim();
    if (!vendorId && isPlaceholderVendorValue(vendorName) && !contactPerson && !email && !phone) return;
    registerVendor({
      vendorId, vendorName, name: isPlaceholderVendorValue(vendorName) ? '' : vendorName,
      contactPerson, email, phone, address: expense?.vendorAddress || '',
      category: expense?.vendorCategory || '', paymentTerms: expense?.vendorPaymentTerms || '',
      gstin: expense?.vendorGstin || '', panNumber: expense?.vendorPanNumber || '',
      bankName: expense?.vendorBankName || '', accountName: expense?.vendorAccountName || '',
      accountNumber: expense?.vendorAccountNumber || '', ifscCode: expense?.vendorIfscCode || '',
      upiId: expense?.vendorUpiId || '', website: expense?.vendorWebsite || '',
      createdByUserId: expense?.vendorCreatedByUserId || '', createdByName: expense?.vendorCreatedByName || '',
      notes: expense?.vendorNotes || expense?.notes || '',
    });
  };
  if (Array.isArray(departmentPlan?.vendors)) departmentPlan.vendors.forEach(registerVendor);
  const monthlyPlan = Array.isArray(departmentPlan?.monthlyPlan) ? departmentPlan.monthlyPlan : [];
  monthlyPlan.forEach((month: any) => {
    if (Array.isArray(month?.expenses)) month.expenses.forEach(registerExpenseVendor);
  });
  return lookup;
}

function mergeVendorDetails(expense: any = {}, vendor: any = null): any {
  if (!vendor) return expense;
  return {
    ...expense,
    vendorId: expense.vendorId || vendor.id || vendor.vendorId || '',
    vendorName: expense.vendorName || vendor.name || vendor.vendorName || '',
    vendor: expense.vendor || expense.vendorName || vendor.name || vendor.vendorName || '',
    vendorContact: expense.vendorContact || expense.vendorContactPerson || vendor.contactPerson || '',
    vendorContactPerson: expense.vendorContactPerson || vendor.contactPerson || '',
    vendorPhone: expense.vendorPhone || vendor.phone || '',
    vendorEmail: expense.vendorEmail || vendor.email || '',
    vendorAddress: expense.vendorAddress || vendor.address || '',
    vendorCategory: expense.vendorCategory || vendor.category || '',
    vendorPaymentTerms: expense.vendorPaymentTerms || vendor.paymentTerms || '',
    vendorGstin: expense.vendorGstin || vendor.gstin || '',
    vendorPanNumber: expense.vendorPanNumber || vendor.panNumber || '',
    vendorBankName: expense.vendorBankName || vendor.bankName || '',
    vendorAccountName: expense.vendorAccountName || vendor.accountName || '',
    vendorAccountNumber: expense.vendorAccountNumber || vendor.accountNumber || '',
    vendorIfscCode: expense.vendorIfscCode || vendor.ifscCode || '',
    vendorUpiId: expense.vendorUpiId || vendor.upiId || '',
    vendorWebsite: expense.vendorWebsite || vendor.website || '',
    vendorCreatedByUserId: expense.vendorCreatedByUserId || vendor.createdByUserId || '',
    vendorCreatedByName: expense.vendorCreatedByName || vendor.createdByName || '',
    vendorNotes: expense.vendorNotes || vendor.notes || '',
    notes: expense.notes || vendor.notes || '',
  };
}

function enrichMonthlyBreakdownWithDepartmentPlan(monthlyBreakdown: any[] = [], departmentPlan: any = null): MonthlyBreakdown[] {
  const vendorLookup = buildVendorLookup(departmentPlan || {});
  const sourceMonthlyPlan = Array.isArray(departmentPlan?.monthlyPlan) ? departmentPlan.monthlyPlan : [];
  return (Array.isArray(monthlyBreakdown) ? monthlyBreakdown : []).map((month: any) => {
    const monthKey = normalizeLookupKey(month?.monthKey || month?.month || '');
    const sourceMonth = sourceMonthlyPlan.find((candidate: any) => {
      const candidateKey = normalizeLookupKey(candidate?.monthKey || candidate?.month || '');
      return candidateKey === monthKey;
    });
    const sourceExpenses = Array.isArray(sourceMonth?.expenses) && sourceMonth.expenses.length > 0
      ? sourceMonth.expenses : Array.isArray(month?.expenses) ? month.expenses : [];
    const sourceExpenseLookup = new Map<string, any>();
    sourceExpenses.forEach((expense: any) => {
      const keys = [expense?.id, expense?.vendorId, expense?.vendorName, expense?.title].map(normalizeLookupKey).filter(Boolean);
      keys.forEach((key) => { if (!sourceExpenseLookup.has(key)) sourceExpenseLookup.set(key, expense); });
    });
    const baseExpenses = Array.isArray(month?.expenses) && month.expenses.length > 0 ? month.expenses : sourceExpenses;
    const mergedExpenses = baseExpenses.map((expense: any) => {
      const lookupKeys = [expense?.id, expense?.vendorId, expense?.vendorName, expense?.title].map(normalizeLookupKey).filter(Boolean);
      const sourceExpense = lookupKeys.map((key) => sourceExpenseLookup.get(key)).find(Boolean);
      const vendorRecord = lookupKeys.map((key) => vendorLookup.get(key)).find(Boolean);
      return mergeVendorDetails(sourceExpense ? { ...sourceExpense, ...expense } : expense, vendorRecord);
    });
    return { ...month, expenses: mergedExpenses };
  });
}

function enrichAnnualRequestWithDepartmentPlan(request: any = {}, departmentPlan: any = null): any {
  return {
    ...request,
    monthlyBreakdown: enrichMonthlyBreakdownWithDepartmentPlan(
      Array.isArray(request.monthlyBreakdown) ? request.monthlyBreakdown : Array.isArray(request.monthlyPlan) ? request.monthlyPlan : [],
      departmentPlan,
    ),
  };
}

function getBudgetExpenseAmount(expense: any = {}): number {
  return Number(expense.projectedAmount ?? expense.estimatedAmount ?? expense.amount ?? expense.requestedAmount ?? 0);
}

function getBudgetExpenseDetails(expense: any = {}): string {
  return String(expense.description ?? expense.details ?? expense.justificationDetails ?? expense.note ?? expense.reason ?? '').trim();
}

function getBudgetUsedAmount(request: any = {}): number {
  const breakdownUsed = Array.isArray(request.monthlyBreakdown)
    ? request.monthlyBreakdown.reduce((sum: number, month: any) => {
        const monthExpenses = [
          ...(Array.isArray(month?.expenses) ? month.expenses : []),
          ...(Array.isArray(month?.extraExpenses) ? month.extraExpenses : []),
        ];
        const monthActualFromExpenses = monthExpenses.reduce((expenseSum: number, expense: any) => expenseSum + Number(expense?.actualAmount || 0), 0);
        return sum + (monthActualFromExpenses > 0 ? monthActualFromExpenses : Number(month?.actualSpent || 0));
      }, 0)
    : 0;
  return breakdownUsed > 0 ? breakdownUsed : Number(request.actualSpent ?? request.previousSpend ?? 0);
}

function mapAnnualRequestToBudget(request: any = {}): Budget {
  const approvalFlow = normalizeApprovalFlow(request.approvalFlow || {});
  const status = request.status || approvalFlow.finalStatus || 'Pending';
  const used = getBudgetUsedAmount(request);
  return {
    id: request.id || '',
    department: request.department || 'Unassigned',
    requested: Number(request.requestedBudget || 0),
    approved: status === 'Approved' ? Number(request.requestedBudget || 0) : 0,
    status: status === 'Approved' ? 'Active' : status === 'Rejected' ? 'Rejected' : 'Pending Review',
    date: request.submittedAtLabel || request.submittedAt || '',
    used,
    actualSpent: used,
    previousSpend: Number(request.previousSpend || 0),
    details: request.breakdown || request.reason || request.description || '',
    approvalFlow,
    requestId: request.id || '',
    monthlyBreakdown: Array.isArray(request.monthlyBreakdown) ? request.monthlyBreakdown : Array.isArray(request.monthlyPlan) ? request.monthlyPlan : [],
    submittedByName: request.submittedByName || '',
    approvalStateLabel: request.approvalStateLabel || '',
  };
}

function mapExtraRequestToBudget(request: any = {}): ExtraBudget {
  const approvalFlow = normalizeApprovalFlow(request.approvalFlow || {});
  const status = request.status || approvalFlow.finalStatus || 'Pending';
  return {
    id: request.id || '',
    department: request.department || 'Unassigned',
    requested: Number(request.amount || 0),
    approved: status === 'Approved' ? Number(request.amount || 0) : 0,
    status: status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Pending Review',
    date: request.submittedAtLabel || request.date || '',
    details: request.reason || request.breakdown || request.description || '',
    month: request.month || '',
    dueDate: request.dueDate || '',
    approvalFlow,
    requestId: request.id || '',
    submittedByName: request.submittedByName || '',
    approvalStateLabel: request.approvalStateLabel || '',
  };
}

function mapTransactionToLedger(entry: any = {}): LedgerEntry {
  return {
    id: entry.id || '',
    refPoId: entry.po || '',
    department: entry.dept || '',
    item: entry.item || '',
    vendor: entry.vendor || '',
    amount: Number(entry.amount || 0),
    paidDate: entry.date || '',
    status: entry.invoice ? 'Invoice Uploaded' : 'Awaiting Dept Invoice',
    invoice: entry.invoice || null,
    paidBy: 'Finance Manager',
  };
}

function hasRealVendor(expense: any = {}): boolean {
  if (expense?.vendorFilled === false) return false;
  const vendorId = String(expense?.vendorId || '').trim();
  const vendorName = String(expense?.vendorName || '').trim();
  const vendorLabel = String(expense?.vendor || '').trim();
  const hasVisibleVendor = Boolean(vendorId) || (!isPlaceholderVendorValue(vendorName) && Boolean(vendorName)) || !isPlaceholderVendorValue(vendorLabel);
  if (expense?.vendorFilled === true) return hasVisibleVendor;
  return hasVisibleVendor;
}

function isManagerAddedVendorExpense(expense: any = {}, resolvedExpense?: any): boolean {
  const linkedExpense = resolveLinkedExpenseForPayment(expense) || null;
  const merged = mergeVendorDetails(expense, linkedExpense);
  const createdByUserId = String(merged?.vendorCreatedByUserId || merged?.createdByUserId || '').trim();
  const createdByName = String(merged?.vendorCreatedByName || merged?.createdByName || '').trim();
  return Boolean(createdByUserId || createdByName);
}

function isExpenseAwaitingFinancePayment(expense: any = {}, resolvedExpense?: any): boolean {
  const paymentStatus = String(expense?.paymentStatus || expense?.status || '').trim().toLowerCase();
  if (!paymentStatus || !hasRealVendor(expense)) return false;
  if (isPaidLikeStatus(paymentStatus)) return false;
  return paymentStatus.includes('pending') || paymentStatus === 'not paid' || paymentStatus === 'planned';
}

function canMarkExpenseAsPaid(expense: any = {}): boolean {
  const linkedExpense = resolveLinkedExpenseForPayment(expense);
  const resolvedExpense = mergeVendorDetails(expense, linkedExpense);
  return isExpenseAwaitingFinancePayment(resolvedExpense) && isManagerAddedVendorExpense(resolvedExpense);
}

function shouldIncludeExpenseInHistory(expense: any = {}): boolean {
  const paymentStatus = expense?.paymentStatus || expense?.status || '';
  return hasRealVendor(expense) && isPaidLikeStatus(paymentStatus);
}

function resolveLinkedExpenseForPayment(expense: any = {}, viewingBudget?: any, estimatedBudgets: Budget[] = []): any {
  const targetExpenseId = normalizeLookupKey(expense?.id || '');
  const targetVendorId = normalizeLookupKey(expense?.vendorId || '');
  const targetVendorName = normalizeLookupKey(expense?.vendorName || expense?.vendor || '');
  const targetMonthKey = normalizeLookupKey(expense?.monthKey || expense?.month || '');
  const targetDepartment = normalizeLookupKey(expense?.department || viewingBudget?.department || '');
  const budgetPool = [...(viewingBudget ? [viewingBudget] : []), ...estimatedBudgets];
  for (const budget of budgetPool) {
    const budgetDepartment = normalizeLookupKey(budget?.department || '');
    if (targetDepartment && budgetDepartment && budgetDepartment !== targetDepartment) continue;
    const monthlyBreakdown = Array.isArray(budget?.monthlyBreakdown) ? budget.monthlyBreakdown : [];
    for (const month of monthlyBreakdown) {
      const monthKey = normalizeLookupKey(month?.monthKey || month?.month || '');
      if (targetMonthKey && monthKey && monthKey !== targetMonthKey) continue;
      const monthExpenses = [...(Array.isArray(month?.expenses) ? month.expenses : []), ...(Array.isArray(month?.extraExpenses) ? month.extraExpenses : [])];
      const linkedExpense = monthExpenses.find((candidate: any) => {
        const candidateExpenseId = normalizeLookupKey(candidate?.id || '');
        const candidateVendorId = normalizeLookupKey(candidate?.vendorId || '');
        const candidateVendorName = normalizeLookupKey(candidate?.vendorName || candidate?.vendor || '');
        if (targetExpenseId) return candidateExpenseId === targetExpenseId;
        if (targetVendorId) return candidateVendorId === targetVendorId;
        if (targetVendorName && !isPlaceholderVendorValue(targetVendorName)) return candidateVendorName === targetVendorName;
        return false;
      });
      if (linkedExpense) return linkedExpense;
    }
  }
  return null;
}

function mergeExpenseWithLinkedVendorData(expense: any = {}, linkedExpense: any = null): any {
  if (!linkedExpense) return expense;
  const mergedExpense = { ...expense };
  const vendorFields = [
    'vendorId', 'vendorName', 'vendor', 'vendorContact', 'vendorContactPerson',
    'vendorPhone', 'vendorEmail', 'vendorAddress', 'vendorCategory', 'vendorPaymentTerms',
    'vendorGstin', 'vendorPanNumber', 'vendorBankName', 'vendorAccountName', 'vendorAccountNumber',
    'vendorIfscCode', 'vendorUpiId', 'vendorWebsite', 'vendorCreatedByUserId', 'vendorCreatedByName',
    'vendorNotes', 'notes',
  ];
  vendorFields.forEach((field) => {
    const expenseValue = (mergedExpense as any)?.[field];
    const linkedValue = (linkedExpense as any)?.[field];
    const shouldUseLinkedValue = typeof expenseValue === 'string' ? isPlaceholderVendorValue(expenseValue) : !expenseValue;
    if (shouldUseLinkedValue && linkedValue) (mergedExpense as any)[field] = linkedValue;
  });
  return mergedExpense;
}

/* ───────────────────── Report builders ───────────────────── */

function buildProjectedBudgetReportRows(budgets: Budget[], selectedFY: string, deptFilter: string, formatCurrency: (v: number) => string): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Report Scope', value: 'Projected Budget' },
    { label: 'Fiscal Year', value: selectedFY },
    { label: 'Department Filter', value: deptFilter || 'All' },
    { label: 'Record Count', value: String(budgets.length) },
  ];
  budgets.forEach((budget, budgetIndex) => {
    const monthlyBreakdown = Array.isArray(budget.monthlyBreakdown) ? budget.monthlyBreakdown : [];
    rows.push({
      label: `${budgetIndex + 1}. ${budget.department || 'Department'} | ${budget.id || 'Budget Request'}`,
      value: [
        `Requested: ${formatCurrency(budget.requested || 0)}`,
        `Approved: ${formatCurrency(budget.approved || 0)}`,
        `Used: ${formatCurrency(budget.used || 0)}`,
        `Status: ${budget.status || 'Pending Review'}`,
        budget.submittedByName ? `Submitted By: ${budget.submittedByName}` : '',
        budget.date ? `Submitted On: ${budget.date}` : '',
        budget.approvalStateLabel ? `Approval: ${budget.approvalStateLabel}` : '',
        budget.details ? `Notes: ${budget.details}` : '',
      ].filter(Boolean).join(' | '),
    });
    monthlyBreakdown.forEach((month, monthIndex) => {
      const monthExpenses = Array.isArray(month.expenses) ? month.expenses : [];
      const extraExpenses = Array.isArray(month.extraExpenses) ? month.extraExpenses : [];
      const combinedExpenses = [...monthExpenses, ...extraExpenses.map((expense: any) => ({ ...expense, _isExtra: true }))];
      rows.push({
        label: `${budgetIndex + 1}.${monthIndex + 1} ${month.month || month.title || 'Month'} Summary`,
        value: [
          `Projected: ${formatCurrency(month.projectedBudget ?? month.amount ?? month.projectedTotal ?? 0)}`,
          `Actual: ${formatCurrency(month.actualSpent || 0)}`,
          month.status ? `Status: ${month.status}` : '',
          `Items: ${combinedExpenses.length}`,
        ].filter(Boolean).join(' | '),
      });
      combinedExpenses.forEach((expense: any, expenseIndex: number) => {
        const details = getBudgetExpenseDetails(expense);
        rows.push({
          label: `${budgetIndex + 1}.${monthIndex + 1}.${expenseIndex + 1} ${expense.expenseLabel || expense.title || expense.description || 'Expense'}`,
          value: [
            `Projected: ${formatCurrency(getBudgetExpenseAmount(expense))}`,
            expense.actualAmount != null ? `Actual: ${formatCurrency(expense.actualAmount || 0)}` : '',
            expense.dueDate ? `Due: ${expense.dueDate}` : '',
            expense.paymentStatus ? `Payment: ${expense.paymentStatus}` : '',
            expense.invoiceNumber ? `Invoice: ${expense.invoiceNumber}` : '',
            expense.vendorName ? `Vendor: ${expense.vendorName}` : '',
            expense.vendorId ? `Vendor ID: ${expense.vendorId}` : '',
            expense.vendorContactPerson ? `Contact: ${expense.vendorContactPerson}` : '',
            expense.vendorPhone ? `Phone: ${expense.vendorPhone}` : '',
            expense.vendorEmail ? `Email: ${expense.vendorEmail}` : '',
            expense.vendorAddress ? `Address: ${expense.vendorAddress}` : '',
            expense.vendorCategory ? `Category: ${expense.vendorCategory}` : '',
            expense.vendorPaymentTerms ? `Terms: ${expense.vendorPaymentTerms}` : '',
            expense.vendorGstin ? `GSTIN: ${expense.vendorGstin}` : '',
            expense.vendorPanNumber ? `PAN: ${expense.vendorPanNumber}` : '',
            expense.vendorBankName ? `Bank: ${expense.vendorBankName}` : '',
            expense.vendorAccountName ? `Account Name: ${expense.vendorAccountName}` : '',
            expense.vendorAccountNumber ? `Account Number: ${expense.vendorAccountNumber}` : '',
            expense.vendorIfscCode ? `IFSC: ${expense.vendorIfscCode}` : '',
            expense.vendorUpiId ? `UPI: ${expense.vendorUpiId}` : '',
            expense.vendorWebsite ? `Website: ${expense.vendorWebsite}` : '',
            expense._isExtra ? 'Extra line item' : '',
            details ? `Notes: ${details}` : '',
          ].filter(Boolean).join(' | '),
        });
      });
    });
  });
  return rows.slice(0, 200);
}

function buildExtraBudgetReportRows(requests: ExtraBudget[], selectedFY: string, deptFilter: string, formatCurrency: (v: number) => string): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Report Scope', value: 'Extra Budget Requests' },
    { label: 'Fiscal Year', value: selectedFY },
    { label: 'Department Filter', value: deptFilter || 'All' },
    { label: 'Record Count', value: String(requests.length) },
  ];
  requests.forEach((request, requestIndex) => {
    rows.push({
      label: `${requestIndex + 1}. ${request.department || 'Department'} | ${request.id || 'Extra Request'}`,
      value: [
        `Requested: ${formatCurrency(request.requested || 0)}`,
        `Approved: ${formatCurrency(request.approved || 0)}`,
        `Status: ${request.status || 'Pending Review'}`,
        request.date ? `Submitted On: ${request.date}` : '',
        request.month ? `Month: ${request.month}` : '',
        request.dueDate ? `Due Date: ${request.dueDate}` : '',
        request.approvalFlow?.owner?.status ? `Founder: ${request.approvalFlow.owner.status}` : '',
        request.approvalFlow?.financeManager?.status ? `Finance: ${request.approvalFlow.financeManager.status}` : '',
        request.submittedByName ? `Submitted By: ${request.submittedByName}` : '',
        request.approvalStateLabel ? `Approval: ${request.approvalStateLabel}` : '',
        request.details ? `Reason: ${request.details}` : '',
      ].filter(Boolean).join(' | '),
    });
  });
  return rows.slice(0, 200);
}

function buildExpenseHistoryReportRows(entries: LedgerEntry[], selectedFY: string, deptFilter: string, searchQuery: string, formatCurrency: (v: number) => string): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Report Scope', value: 'Expense History' },
    { label: 'Fiscal Year', value: selectedFY },
    { label: 'Department Filter', value: deptFilter || 'All' },
    { label: 'Search Filter', value: searchQuery || 'All' },
    { label: 'Record Count', value: String(entries.length) },
  ];
  entries.forEach((entry, entryIndex) => {
    rows.push({
      label: `${entryIndex + 1}. ${entry.department || 'Department'} | ${entry.item || entry.title || 'Expense'}`,
      value: [
        `Amount: ${formatCurrency(entry.amount || 0)}`,
        entry.projectedAmount != null ? `Projected: ${formatCurrency(entry.projectedAmount || 0)}` : '',
        entry.actualAmount != null ? `Actual: ${formatCurrency(entry.actualAmount || 0)}` : '',
        entry.paidDate ? `Paid Date: ${entry.paidDate}` : '',
        entry.status ? `Status: ${entry.status}` : '',
        entry.refPoId ? `PO: ${entry.refPoId}` : '',
        entry.invoice ? `Invoice: ${entry.invoice}` : '',
        entry.invoiceNumber ? `Invoice Number: ${entry.invoiceNumber}` : '',
        entry.vendor ? `Vendor: ${entry.vendor}` : '',
        entry.vendorName ? `Vendor Name: ${entry.vendorName}` : '',
        entry.vendorId ? `Vendor ID: ${entry.vendorId}` : '',
        entry.vendorContactPerson ? `Contact: ${entry.vendorContactPerson}` : '',
        entry.vendorPhone ? `Phone: ${entry.vendorPhone}` : '',
        entry.vendorEmail ? `Email: ${entry.vendorEmail}` : '',
        entry.vendorAddress ? `Address: ${entry.vendorAddress}` : '',
        entry.vendorCategory ? `Category: ${entry.vendorCategory}` : '',
        entry.vendorPaymentTerms ? `Terms: ${entry.vendorPaymentTerms}` : '',
        entry.vendorGstin ? `GSTIN: ${entry.vendorGstin}` : '',
        entry.vendorPanNumber ? `PAN: ${entry.vendorPanNumber}` : '',
        entry.vendorBankName ? `Bank: ${entry.vendorBankName}` : '',
        entry.vendorAccountName ? `Account Name: ${entry.vendorAccountName}` : '',
        entry.vendorAccountNumber ? `Account Number: ${entry.vendorAccountNumber}` : '',
        entry.vendorIfscCode ? `IFSC: ${entry.vendorIfscCode}` : '',
        entry.vendorUpiId ? `UPI: ${entry.vendorUpiId}` : '',
        entry.vendorWebsite ? `Website: ${entry.vendorWebsite}` : '',
        entry.monthTitle ? `Month: ${entry.monthTitle}` : '',
        entry.month ? `Month Key: ${entry.month}` : '',
        entry.paidBy ? `Paid By: ${entry.paidBy}` : '',
        entry.dateLabel ? `Date Label: ${entry.dateLabel}` : '',
        entry.notes ? `Notes: ${entry.notes}` : '',
      ].filter(Boolean).join(' | '),
    });
  });
  return rows.slice(0, 200);
}

function buildExpenseHistoryFromAnnualRequests(annualRequests: any[] = []): LedgerEntry[] {
  const history: LedgerEntry[] = [];
  (Array.isArray(annualRequests) ? annualRequests : []).forEach((request) => {
    const monthlyBreakdown = Array.isArray(request?.monthlyBreakdown) ? request.monthlyBreakdown : [];
    monthlyBreakdown.forEach((month: any) => {
      const expenses = Array.isArray(month?.expenses) ? month.expenses : [];
      const extraExpenses = Array.isArray(month?.extraExpenses) ? month.extraExpenses : [];
      const monthExpenses = [...expenses, ...extraExpenses];
      monthExpenses.filter((expense: any) => shouldIncludeExpenseInHistory(expense)).forEach((expense: any, expenseIndex: number) => {
        const invoiceNumber = expense?.invoiceNumber || '';
        const invoiceUrl = expense?.invoiceUrl || expense?.invoiceFile || '';
        const expenseDate = expense?.date || request?.submittedAtLabel || request?.date || '';
        const monthLabel = month?.title || month?.month || '';
        const projectedAmount = Number(expense?.projectedAmount ?? expense?.estimatedAmount ?? expense?.amount ?? expense?.requestedAmount ?? 0);
        const actualAmount = Number(expense?.actualAmount ?? 0);
        const paymentStatus = expense?.paymentStatus || (actualAmount > 0 ? 'Paid' : 'Planned');
        history.push({
          id: expense?.id || `${request?.id || request?.department || 'EXP'}-${month?.monthKey || month?.month || 'month'}-${expenseIndex + 1}`,
          refPoId: expense?.poId || expense?.vendorId || request?.id || '',
          department: request?.department || expense?.department || 'Unassigned',
          monthKey: expense?.monthKey || month?.monthKey || month?.month || '',
          item: expense?.title || expense?.expenseLabel || expense?.description || 'Expense',
          vendor: expense?.vendorName || expense?.vendorId || 'Not assigned',
          amount: actualAmount || projectedAmount,
          projectedAmount, actualAmount,
          paidDate: expenseDate,
          dateLabel: expenseDate && monthLabel ? `${expenseDate} • ${monthLabel}` : expenseDate || monthLabel || '',
          status: paymentStatus, paymentStatus,
          invoice: invoiceNumber || (invoiceUrl ? 'Uploaded' : null),
          invoiceNumber, invoiceUrl,
          paidBy: expense?.paidBy || 'Finance Manager',
          month: month?.month || '', monthTitle: monthLabel,
          expenseLabel: expense?.expenseLabel || expense?.title || '',
          title: expense?.title || expense?.expenseLabel || '',
          description: expense?.description || expense?.details || expense?.note || '',
          vendorId: expense?.vendorId || '', vendorName: expense?.vendorName || '',
          vendorContactPerson: expense?.vendorContactPerson || expense?.vendorContact || '',
          vendorContact: expense?.vendorContact || expense?.vendorContactPerson || '',
          vendorEmail: expense?.vendorEmail || '', vendorPhone: expense?.vendorPhone || '',
          vendorAddress: expense?.vendorAddress || '', vendorCategory: expense?.vendorCategory || '',
          vendorPaymentTerms: expense?.vendorPaymentTerms || '', vendorGstin: expense?.vendorGstin || '',
          vendorPanNumber: expense?.vendorPanNumber || '', vendorBankName: expense?.vendorBankName || '',
          vendorAccountName: expense?.vendorAccountName || '', vendorAccountNumber: expense?.vendorAccountNumber || '',
          vendorIfscCode: expense?.vendorIfscCode || '', vendorUpiId: expense?.vendorUpiId || '',
          vendorWebsite: expense?.vendorWebsite || '',
          vendorCreatedByUserId: expense?.vendorCreatedByUserId || '',
          vendorCreatedByName: expense?.vendorCreatedByName || '',
          notes: expense?.notes || '',
        });
      });
    });
  });
  return history;
}

function buildExpenseHistoryFromDepartmentPlans(departmentPlans: any[] = []): LedgerEntry[] {
  const history: LedgerEntry[] = [];
  (Array.isArray(departmentPlans) ? departmentPlans : []).forEach((departmentPlan) => {
    const monthlyPlan = Array.isArray(departmentPlan?.monthlyPlan) ? departmentPlan.monthlyPlan : [];
    monthlyPlan.forEach((month: any) => {
      const expenses = Array.isArray(month?.expenses) ? month.expenses : [];
      const extraExpenses = Array.isArray(month?.extraExpenses) ? month.extraExpenses : [];
      const monthExpenses = [...expenses, ...extraExpenses];
      monthExpenses.filter((expense: any) => shouldIncludeExpenseInHistory(expense)).forEach((expense: any, expenseIndex: number) => {
        const invoiceNumber = expense?.invoiceNumber || '';
        const invoiceUrl = expense?.invoiceUrl || expense?.invoiceFile || '';
        const expenseDate = expense?.date || month?.dueDate || '';
        const monthLabel = month?.title || month?.month || '';
        const projectedAmount = Number(expense?.projectedAmount ?? expense?.estimatedAmount ?? expense?.amount ?? expense?.requestedAmount ?? 0);
        const actualAmount = Number(expense?.actualAmount ?? 0);
        const paymentStatus = expense?.paymentStatus || (actualAmount > 0 ? 'Paid' : 'Planned');
        history.push({
          id: expense?.id || `${departmentPlan?.department || 'DEP'}-${month?.monthKey || month?.month || 'month'}-${expenseIndex + 1}`,
          refPoId: expense?.poId || expense?.vendorId || '',
          department: departmentPlan?.department || expense?.department || 'Unassigned',
          monthKey: expense?.monthKey || month?.monthKey || month?.month || '',
          item: expense?.title || expense?.expenseLabel || expense?.description || 'Expense',
          vendor: expense?.vendorName || expense?.vendorId || 'Not assigned',
          amount: actualAmount || projectedAmount,
          projectedAmount, actualAmount,
          paidDate: expenseDate,
          dateLabel: expenseDate && monthLabel ? `${expenseDate} • ${monthLabel}` : expenseDate || monthLabel || '',
          status: paymentStatus, paymentStatus,
          invoice: invoiceNumber || (invoiceUrl ? 'Uploaded' : null),
          invoiceNumber, invoiceUrl,
          paidBy: expense?.paidBy || 'Finance Manager',
          month: month?.month || '', monthTitle: monthLabel,
          expenseLabel: expense?.expenseLabel || expense?.title || '',
          title: expense?.title || expense?.expenseLabel || '',
          description: expense?.description || expense?.details || expense?.note || '',
          vendorId: expense?.vendorId || '', vendorName: expense?.vendorName || '',
          vendorContactPerson: expense?.vendorContactPerson || expense?.vendorContact || '',
          vendorContact: expense?.vendorContact || expense?.vendorContactPerson || '',
          vendorEmail: expense?.vendorEmail || '', vendorPhone: expense?.vendorPhone || '',
          vendorAddress: expense?.vendorAddress || '', vendorCategory: expense?.vendorCategory || '',
          vendorPaymentTerms: expense?.vendorPaymentTerms || '', vendorGstin: expense?.vendorGstin || '',
          vendorPanNumber: expense?.vendorPanNumber || '', vendorBankName: expense?.vendorBankName || '',
          vendorAccountName: expense?.vendorAccountName || '', vendorAccountNumber: expense?.vendorAccountNumber || '',
          vendorIfscCode: expense?.vendorIfscCode || '', vendorUpiId: expense?.vendorUpiId || '',
          vendorWebsite: expense?.vendorWebsite || '',
          vendorCreatedByUserId: expense?.vendorCreatedByUserId || '',
          vendorCreatedByName: expense?.vendorCreatedByName || '',
          notes: expense?.notes || '',
        });
      });
    });
  });
  return history;
}

/* ───────────────────── Main Component ───────────────────── */

export function ExpensesBudgetPage() {
  const [isLoadingFinance, setIsLoadingFinance] = useState(true);
  const [hasLoadedFinanceSnapshot, setHasLoadedFinanceSnapshot] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fiscalYearOptions = getFiscalYearOptions();
  const [selectedFY, setSelectedFY] = useState(DEFAULT_FISCAL_YEAR);
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const currentUserName = String(
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.displayName ||
    currentUser?.email ||
    'Finance Team',
  ).trim();

  useEffect(() => {
    let alive = true;

    const loadFinanceData = async () => {
      setIsLoadingFinance(true);
      setErrorMessage('');

      try {
        const response = await getFinanceSnapshot(selectedFY);
        if (!alive) return;

        const payload = response?.data || {};
        const enrichedAnnualRequests = Array.isArray(payload.annualRequests)
          ? payload.annualRequests.map((request: any) => enrichAnnualRequestWithDepartmentPlan(
              request,
              getDepartmentFinancePlan(payload, request?.department || ''),
            ))
          : [];
        setEstimatedBudgets(enrichedAnnualRequests.map(mapAnnualRequestToBudget));
        setExtraBudgets(
          Array.isArray(payload.extraRequests)
            ? payload.extraRequests.map(mapExtraRequestToBudget)
            : [],
        );
        syncExpenseHistoryFromPayload(payload, enrichedAnnualRequests);
        setDepartments(
          Array.isArray(payload.departments)
            ? payload.departments.map((department: any) => department.name).filter(Boolean)
            : [],
        );
      } catch (error: any) {
        if (!alive) return;
        const message = error?.message || 'Failed to load finance data.';
        setErrorMessage(message);
        toast.error(message);
      } finally {
        if (alive) {
          setIsLoadingFinance(false);
          setHasLoadedFinanceSnapshot(true);
        }
      }
    };

    setHasLoadedFinanceSnapshot(false);
    setEstimatedBudgets([]);
    setExtraBudgets([]);
    setLedger([]);
    setDepartments([]);
    loadFinanceData();
    const handleFinanceSnapshotUpdated = () => { loadFinanceData(); };
    window.addEventListener('finance:snapshot-updated', handleFinanceSnapshotUpdated);

    return () => {
      alive = false;
      window.removeEventListener('finance:snapshot-updated', handleFinanceSnapshotUpdated);
    };
  }, [selectedFY]);

  const [activeTab, setActiveTab] = useState('estimated');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  const [viewingBudget, setViewingBudget] = useState<Budget | null>(null);
  const [viewingExpense, setViewingExpense] = useState<any>(null);
  const [viewingExtra, setViewingExtra] = useState<ExtraBudget | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [rejectingRequest, setRejectingRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);

  const [estimatedBudgets, setEstimatedBudgets] = useState<Budget[]>([]);
  const [extraBudgets, setExtraBudgets] = useState<ExtraBudget[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  /* ── Resolve linked expense for expense detail view ── */

  const linkedViewingBudget = viewingBudget;
  const resolveLinkedForExpense = (expense: any = {}) => {
    return resolveLinkedExpenseForPayment(expense, linkedViewingBudget, estimatedBudgets);
  };

  const openExpenseDetails = (expense: any = {}, month: any = {}, expenseIndex: number | null = null, department = '') => {
    const linkedExpense = resolveLinkedForExpense(expense);
    const merged = mergeExpenseWithLinkedVendorData(expense, linkedExpense);
    setViewingExpense({
      ...merged,
      monthKey: expense.monthKey || month.monthKey || '',
      month: expense.month || month.month || '',
      monthTitle: expense.monthTitle || month.title || '',
      department: expense.department || department || viewingBudget?.department || '',
      expenseLabel: expense.expenseLabel || (Number.isInteger(expenseIndex) ? `Expense ${(expenseIndex as number) + 1}` : ''),
    });
  };
  const closeExpenseDetails = () => setViewingExpense(null);

  function handleMarkPaidForExpense(expenseOverride: any = null) {
    const targetExpense = expenseOverride || viewingExpense;
    if (!targetExpense?.id) { toast.error('Expense details are missing.'); return; }
    if (!targetExpense?.monthKey) { toast.error('Month information is missing for this expense.'); return; }
    setIsUpdatingExpense(true);
    (async () => {
      try {
        const nextActualAmount = Number(targetExpense.actualAmount || 0) > 0
          ? Number(targetExpense.actualAmount || 0)
          : getBudgetExpenseAmount(targetExpense);
        const response = await updateMonthlyExpenseStatus({
          fiscalYear: selectedFY,
          monthKey: targetExpense.monthKey,
          expenseId: targetExpense.id,
          department: targetExpense.department || viewingBudget?.department || '',
          status: 'Paid',
        });
        const responseExpense = response?.data?.expense || {};
        const nextPaymentStatus = responseExpense.paymentStatus || 'Payment Done - Invoice Pending';
        setViewingExpense((current: any) => current && current.id === targetExpense.id ? {
          ...current,
          paymentStatus: nextPaymentStatus,
          status: 'Paid',
          actualAmount: Number(responseExpense.actualAmount || nextActualAmount),
        } : current);
        setViewingBudget((current: Budget | null) => {
          if (!current || !Array.isArray(current.monthlyBreakdown)) return current;
          const nextMonthlyBreakdown = current.monthlyBreakdown.map((month: MonthlyBreakdown) => {
            const normalizedMonthKey = String(month?.monthKey || month?.month || '').trim().toLowerCase();
            const tgtMonthKey = String(targetExpense.monthKey || '').trim().toLowerCase();
            if (!normalizedMonthKey || normalizedMonthKey !== tgtMonthKey) return month;
            const patchExpense = (exp: any = {}) => {
              if (String(exp?.id || '') !== String(targetExpense.id || '')) return exp;
              const patchedActualAmount = Number(responseExpense.actualAmount || nextActualAmount);
              const patchedProjectedAmount = getBudgetExpenseAmount(exp);
              return { ...exp, actualAmount: patchedActualAmount, paymentStatus: nextPaymentStatus, status: 'Paid', savings: Math.max(0, patchedProjectedAmount - patchedActualAmount) };
            };
            const nextExpenses = Array.isArray(month?.expenses) ? month.expenses.map(patchExpense) : [];
            const nextExtraExpenses = Array.isArray(month?.extraExpenses) ? month.extraExpenses.map(patchExpense) : [];
            const nextActualSpent = [...nextExpenses, ...nextExtraExpenses].reduce((sum: number, exp: any) => sum + Number(exp?.actualAmount || 0), 0);
            const nextProjectedBudget = Number(month?.projectedBudget ?? month?.amount ?? 0);
            return { ...month, expenses: nextExpenses, extraExpenses: nextExtraExpenses, actualSpent: nextActualSpent, savings: Math.max(0, nextProjectedBudget - nextActualSpent) };
          });
          return { ...current, monthlyBreakdown: nextMonthlyBreakdown, used: getBudgetUsedAmount({ ...current, monthlyBreakdown: nextMonthlyBreakdown }), actualSpent: getBudgetUsedAmount({ ...current, monthlyBreakdown: nextMonthlyBreakdown }) };
        });
        window.dispatchEvent(new Event('finance:snapshot-updated'));
        toast.success('Expense marked as paid.');
      } catch (error: any) {
        toast.error(error?.message || 'Failed to mark expense as paid.');
      } finally {
        setIsUpdatingExpense(false);
      }
    })();
  }

  /* ── Syncing expense history ── */

  const syncExpenseHistoryFromPayload = (payload: any = {}, enrichedAnnualRequests: any[] = []) => {
    const expenseHistory = buildExpenseHistoryFromAnnualRequests(enrichedAnnualRequests);
    if (expenseHistory.length > 0) { setLedger(expenseHistory); return; }
    const departmentFinanceHistory = buildExpenseHistoryFromDepartmentPlans(Array.isArray(payload.departmentFinance) ? payload.departmentFinance : []);
    if (departmentFinanceHistory.length > 0) { setLedger(departmentFinanceHistory); return; }
    if (Array.isArray(payload.deptTransactions)) { setLedger(payload.deptTransactions.map(mapTransactionToLedger)); return; }
    setLedger([]);
  };

  /* ── Derived data ── */

  const visibleEstimatedBudgets = estimatedBudgets.filter((budget) => deptFilter === 'All' || budget.department === deptFilter);
  const visibleExtraBudgets = extraBudgets.filter((extra) => deptFilter === 'All' || extra.department === deptFilter);
  const visibleLedger = ledger.filter((entry) => {
    const haystack = [entry.department, entry.vendor, entry.item, entry.invoice, entry.invoiceNumber, entry.monthTitle, entry.month]
      .filter(Boolean).join(' ').toLowerCase();
    return shouldIncludeExpenseInHistory(entry) && (deptFilter === 'All' || entry.department === deptFilter) && haystack.includes(searchQuery.toLowerCase());
  });

  const statCards = useMemo(() => {
    switch (activeTab) {
      case 'estimated': {
        const totalAllocated = estimatedBudgets.filter(b => b.status === 'Active').reduce((acc, curr) => acc + curr.approved, 0) +
          extraBudgets.filter(b => b.status === 'Approved').reduce((acc, curr) => acc + curr.approved, 0);
        const totalProjected = estimatedBudgets.reduce((acc, curr) => acc + curr.requested, 0);
        const activeDepts = new Set(estimatedBudgets.map(b => b.department).filter(Boolean)).size;
        const pendingApprovals = estimatedBudgets.filter(b => b.status === 'Pending Review').length;
        return [
          { key: 'allocated', label: 'Total Allocated', value: formatCurrency(totalAllocated), isCurrency: true, icon: PieChart },
          { key: 'projected', label: 'Total Projected', value: formatCurrency(totalProjected), isCurrency: true, icon: TrendingDown },
          { key: 'departments', label: 'Departments', value: String(activeDepts), icon: Building2 },
          { key: 'pending', label: 'Pending Approvals', value: String(pendingApprovals), icon: AlertCircle },
        ];
      }
      case 'extra': {
        const totalExtra = extraBudgets.length;
        const approvedExtra = extraBudgets.filter(b => b.status === 'Approved').length;
        const pendingExtra = extraBudgets.filter(b => b.status === 'Pending Review').length;
        const rejectedExtra = extraBudgets.filter(b => b.status === 'Rejected').length;
        return [
          { key: 'total', label: 'Total Requests', value: String(totalExtra), icon: AlertCircle },
          { key: 'approved', label: 'Approved', value: String(approvedExtra), icon: CheckCircle2 },
          { key: 'pending', label: 'Pending', value: String(pendingExtra), icon: Clock },
          { key: 'rejected', label: 'Rejected', value: String(rejectedExtra), icon: XCircle },
        ];
      }
      case 'ledger': {
        const totalEntries = ledger.length;
        const totalSpend = ledger.reduce((s, e) => s + e.amount, 0);
        const pendingInvoices = ledger.filter((entry) => !entry.invoice).length;
        const paidEntries = ledger.filter((entry) => isPaidLikeStatus(entry.status)).length;
        return [
          { key: 'entries', label: 'Total Entries', value: String(totalEntries), icon: Receipt },
          { key: 'spend', label: 'Total Spend', value: formatCurrency(totalSpend), isCurrency: true, icon: TrendingDown },
          { key: 'pendingInv', label: 'Invoice Pending', value: String(pendingInvoices), icon: FileWarning },
          { key: 'paid', label: 'Paid', value: String(paidEntries), icon: CheckCircle2 },
        ];
      }
      default:
        return [];
    }
  }, [activeTab, estimatedBudgets, extraBudgets, ledger]);

  const activeFinanceReportLabel =
    activeTab === 'extra' ? 'Extra Budget Requests' : activeTab === 'ledger' ? 'Expense History' : 'Projected Budget';

  /* ── Approval / Rejection handlers ── */

  const handleApproveEstimated = (req: Budget) => {
    applyFinanceApprovalDecision('annual', req.id, { status: 'Approved', scope: 'financeManager', fiscalYear: selectedFY })
      .then((response: any) => {
        const payload = response?.data || {};
        const enrichedAnnualRequests = Array.isArray(payload.annualRequests)
          ? payload.annualRequests.map((request: any) => enrichAnnualRequestWithDepartmentPlan(request, getDepartmentFinancePlan(payload, request?.department || '')))
          : [];
        setEstimatedBudgets(enrichedAnnualRequests.map(mapAnnualRequestToBudget));
        setExtraBudgets(Array.isArray(payload.extraRequests) ? payload.extraRequests.map(mapExtraRequestToBudget) : []);
        syncExpenseHistoryFromPayload(payload, enrichedAnnualRequests);
        toast.success(`Estimated annual budget approved for ${req.department}.`);
        setViewingBudget(null);
      })
      .catch((error: any) => { toast.error(error?.message || 'Failed to approve estimated budget.'); });
  };

  const handleApproveExtra = () => {
    if (!viewingExtra?.id) return;
    applyFinanceApprovalDecision('extra', viewingExtra.id, { status: 'Approved', scope: 'financeManager', fiscalYear: selectedFY })
      .then((response: any) => {
        const payload = response?.data || {};
        const enrichedAnnualRequests = Array.isArray(payload.annualRequests)
          ? payload.annualRequests.map((request: any) => enrichAnnualRequestWithDepartmentPlan(request, getDepartmentFinancePlan(payload, request?.department || '')))
          : [];
        setEstimatedBudgets(enrichedAnnualRequests.map(mapAnnualRequestToBudget));
        setExtraBudgets(Array.isArray(payload.extraRequests) ? payload.extraRequests.map(mapExtraRequestToBudget) : []);
        syncExpenseHistoryFromPayload(payload, enrichedAnnualRequests);
        toast.success(`Extra budget approved for ${viewingExtra.department}.`);
        setViewingExtra(null);
      })
      .catch((error: any) => { toast.error(error?.message || 'Failed to approve extra budget.'); });
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;
    if (rejectingRequest.modalType === 'estimated') {
      try {
        const response = await applyFinanceApprovalDecision('annual', rejectingRequest.id, { status: 'Rejected', scope: 'financeManager', fiscalYear: selectedFY });
        const payload = response?.data || {};
        const enrichedAnnualRequests = Array.isArray(payload.annualRequests)
          ? payload.annualRequests.map((request: any) => enrichAnnualRequestWithDepartmentPlan(request, getDepartmentFinancePlan(payload, request?.department || '')))
          : [];
        setEstimatedBudgets(enrichedAnnualRequests.map(mapAnnualRequestToBudget));
        setExtraBudgets(Array.isArray(payload.extraRequests) ? payload.extraRequests.map(mapExtraRequestToBudget) : []);
        syncExpenseHistoryFromPayload(payload, enrichedAnnualRequests);
        toast.success(`Request rejected for ${rejectingRequest.department}.`);
        setRejectingRequest(null);
        setRejectReason('');
      } catch (error: any) { toast.error(error?.message || 'Failed to reject annual budget.'); }
    } else if (rejectingRequest.modalType === 'extra') {
      try {
        const response = await applyFinanceApprovalDecision('extra', rejectingRequest.id, { status: 'Rejected', scope: 'financeManager', fiscalYear: selectedFY });
        const payload = response?.data || {};
        const enrichedAnnualRequests = Array.isArray(payload.annualRequests)
          ? payload.annualRequests.map((request: any) => enrichAnnualRequestWithDepartmentPlan(request, getDepartmentFinancePlan(payload, request?.department || '')))
          : [];
        setEstimatedBudgets(enrichedAnnualRequests.map(mapAnnualRequestToBudget));
        setExtraBudgets(Array.isArray(payload.extraRequests) ? payload.extraRequests.map(mapExtraRequestToBudget) : []);
        syncExpenseHistoryFromPayload(payload, enrichedAnnualRequests);
        toast.success(`Request rejected for ${rejectingRequest.department}.`);
        setRejectingRequest(null);
        setRejectReason('');
      } catch (error: any) { toast.error(error?.message || 'Failed to reject extra budget.'); }
    } else {
      toast.success(`Request rejected for ${rejectingRequest.department}.`);
      setRejectingRequest(null);
      setRejectReason('');
    }
  };

  /* ── Export handler ── */

  const handleExportActiveFinanceReport = async (format = 'PDF') => {
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    const fiscalYearLabel = selectedFY || DEFAULT_FISCAL_YEAR;
    const reportMonth = new Date().toISOString().slice(0, 7);

    const reportConfigByTab: Record<string, any> = {
      estimated: {
        title: `Finance - Projected Budget - ${fiscalYearLabel}`,
        period: `${fiscalYearLabel} Projected Budget`,
        description: `Projected budget report for ${fiscalYearLabel}, including monthly expense plans and vendor details.`,
        sourceRef: 'finance-project-budget',
        reportRows: buildProjectedBudgetReportRows(visibleEstimatedBudgets, selectedFY, deptFilter, formatCurrency),
        monthlyData: visibleEstimatedBudgets.flatMap((budget) =>
          Array.isArray(budget.monthlyBreakdown)
            ? budget.monthlyBreakdown.map((month: MonthlyBreakdown) => ({ month: month.month || month.title || '', metric: `${budget.department || 'Department'} projected`, value: formatCurrency(month.projectedBudget ?? month.amount ?? month.projectedTotal ?? 0) }))
            : []
        ),
        hasData: visibleEstimatedBudgets.length > 0,
      },
      extra: {
        title: `Finance - Extra Budget Requests - ${fiscalYearLabel}`,
        period: `${fiscalYearLabel} Extra Requests`,
        description: `Extra budget request report for ${fiscalYearLabel}, including approval flow and reason details.`,
        sourceRef: 'finance-extra-budget-requests',
        reportRows: buildExtraBudgetReportRows(visibleExtraBudgets, selectedFY, deptFilter, formatCurrency),
        monthlyData: visibleExtraBudgets.map((request) => ({ month: request.month || request.date || '', metric: request.department || 'Extra Request', value: formatCurrency(request.requested || 0) })),
        hasData: visibleExtraBudgets.length > 0,
      },
      ledger: {
        title: `Finance - Expense History - ${fiscalYearLabel}`,
        period: `${fiscalYearLabel} Expense History`,
        description: `Expense history report for ${fiscalYearLabel}, including vendor, invoice, and payment details.`,
        sourceRef: 'finance-expense-history',
        reportRows: buildExpenseHistoryReportRows(visibleLedger, selectedFY, deptFilter, searchQuery, formatCurrency),
        monthlyData: visibleLedger.map((entry) => ({ month: entry.monthTitle || entry.month || '', metric: entry.department || 'Expense', value: formatCurrency(entry.amount || 0) })),
        hasData: visibleLedger.length > 0,
      },
    };

    const selectedReport = reportConfigByTab[activeTab] || reportConfigByTab.estimated;
    if (!selectedReport.hasData) {
      toast.error(`There is no ${activeFinanceReportLabel.toLowerCase()} data to export for ${fiscalYearLabel}.`);
      return;
    }

    try {
      const response = await createReport({
        title: selectedReport.title,
        department: 'Finance',
        category: 'Financial',
        dataWindow: 'Annual',
        reportMonth,
        period: selectedReport.period,
        generatedBy: currentUserName,
        format: reportFormat,
        description: selectedReport.description,
        sourceType: 'custom',
        sourceRef: selectedReport.sourceRef,
        reportRows: selectedReport.reportRows,
        monthlyData: selectedReport.monthlyData,
      });
      if (reportFormat === 'PDF') await downloadReportFile(response?.data?.download, { openInNewTab: false });
      const createdReportId = response?.data?.report?.recordId;
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Finance report saved to Reports.' : 'Finance report saved to Reports. Preview it before downloading.');
      navigate(createdReportId ? `/dashboard/finance/report?reportId=${createdReportId}` : '/dashboard/finance/report');
    } catch (exportError: any) {
      toast.error(exportError?.message || `Failed to export ${activeFinanceReportLabel.toLowerCase()}.`);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status.includes('Active') || status.includes('Approved') || status.includes('Uploaded'))
      return <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{status}</span>;
    if (status.includes('Pending') || status.includes('Awaiting'))
      return <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider animate-pulse">{status}</span>;
    return <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{status}</span>;
  };

  if (!hasLoadedFinanceSnapshot && isLoadingFinance) return <TablePageSkeleton rows={6} columns={6} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Expenses & Budget
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Core Module | Budget planning & expense tracking</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm">
                <Calendar size={18} className="text-[#2563EB]" />
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="bg-transparent font-black text-[#0F172A] outline-none cursor-pointer border-none text-xs"
                >
                  {fiscalYearOptions.map((year: string) => (
                    <option key={year} value={year}>{year}{year === DEFAULT_FISCAL_YEAR ? ' (Default)' : ''}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleExportActiveFinanceReport('PDF')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                title={`Export ${activeFinanceReportLabel} as PDF`}
                aria-label={`Export ${activeFinanceReportLabel} as PDF`}
              >
                <FileDown size={16} className="text-red-500" />
              </button>
              <button
                type="button"
                onClick={() => handleExportActiveFinanceReport('Excel')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-[#2563EB] text-white shadow-sm transition hover:bg-blue-700"
                title={`Export ${activeFinanceReportLabel} as Excel`}
                aria-label={`Export ${activeFinanceReportLabel} as Excel`}
              >
                <FileSpreadsheet size={16} />
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between gap-4">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider"
              >
                Retry
              </button>
            </div>
          )}

          {isLoadingFinance && (
            <div className="h-1 overflow-hidden rounded-full bg-blue-100" aria-live="polite" aria-label="Refreshing finance snapshot">
              <div className="h-full w-1/3 rounded-full bg-[#2563EB] animate-pulse" />
              <span className="sr-only">Refreshing finance snapshot</span>
            </div>
          )}

          {/* ── Pill Tabs (DESIGN.md: pill-style with blue active bg) ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {[
              { key: "estimated", label: "PROJECTED ANNUAL BUDGET" },
              { key: "extra", label: "EXTRA BUDGET REQUESTS" },
              { key: "ledger", label: "EXPENSE HISTORY & INVOICES" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Stat Cards (DESIGN.md: border-l-4 accent per card, tab-aware) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {statCards.map((card, idx) => {
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

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Data panel header row */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <select
                  className="w-full sm:w-36 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option>All</option>
                  {departments.map((d: string) => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left min-w-[700px]">

                {activeTab === 'estimated' && (
                  <>
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-6 py-5">Date & ID</th>
                        <th className="px-6 py-5">Dept</th>
                        <th className="px-6 py-5">Amount</th>
                        <th className="px-6 py-5 hidden sm:table-cell">Usage</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {visibleEstimatedBudgets.map((budget) => {
                        const usagePercent = budget.status === 'Active' && budget.approved > 0
                          ? Math.min(((budget.used || 0) / budget.approved) * 100, 100)
                          : 0;
                        return (
                          <tr key={budget.id} className="hover:bg-blue-50/30 transition-all">
                            <td className="px-6 py-5 space-y-0.5">
                              <p className="text-[9px] sm:text-[10px] font-black text-blue-600 uppercase">{budget.id}</p>
                              <p className="text-[10px] sm:text-xs font-bold text-slate-500">{budget.date}</p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1 sm:gap-2"><Building2 size={12} className="sm:w-3.5 sm:h-3.5 text-slate-400" /> {budget.department}</p>
                            </td>
                            <td className="px-6 py-5 font-black text-slate-900 text-xs sm:text-sm">
                              {budget.status === 'Active' ? formatCurrency(budget.approved) : formatCurrency(budget.requested)}
                            </td>
                            <td className="px-6 py-5 hidden sm:table-cell">
                              {budget.status === 'Active' ? (
                                <>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
                                    <div className={`h-full rounded-full ${usagePercent > 85 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${usagePercent}%` }}></div>
                                  </div>
                                  <p className="text-[9px] font-bold text-slate-500 mt-1">{formatCurrency(budget.used || 0)} used</p>
                                </>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center">{getStatusBadge(budget.status)}</td>
                            <td className="px-6 py-5 text-center">
                              <button onClick={() => setViewingBudget(budget)} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all shadow-sm flex items-center gap-1 mx-auto">
                                <Eye size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {visibleEstimatedBudgets.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">
                            No projected budget requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeTab === 'extra' && (
                  <>
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-6 py-5">Date & ID</th>
                        <th className="px-6 py-5">Dept</th>
                        <th className="px-6 py-5">Amount</th>
                        <th className="px-6 py-5 hidden md:table-cell">Reason</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {visibleExtraBudgets.map((extra) => (
                        <tr key={extra.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-5 space-y-0.5">
                            <p className="text-[9px] sm:text-[10px] font-black text-amber-600 uppercase">{extra.id}</p>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500">{extra.date}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1 sm:gap-2"><Building2 size={12} className="sm:w-3.5 sm:h-3.5 text-slate-400" /> {extra.department}</p>
                          </td>
                          <td className="px-6 py-5 font-black text-slate-900 text-xs sm:text-sm">{formatCurrency(extra.requested)}</td>
                          <td className="px-6 py-5 hidden md:table-cell">
                            <p className="text-xs font-medium text-slate-600 truncate max-w-[200px]">{extra.details}</p>
                          </td>
                          <td className="px-6 py-5 text-center">{getStatusBadge(extra.status)}</td>
                          <td className="px-6 py-5 text-center">
                            <button onClick={() => setViewingExtra(extra)} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all shadow-sm flex items-center gap-1 mx-auto">
                              <Eye size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Review</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {visibleExtraBudgets.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">
                            No extra budget requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeTab === 'ledger' && (
                  <>
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-6 py-5">Date & ID</th>
                        <th className="px-6 py-5">Dept & Vendor</th>
                        <th className="px-6 py-5 hidden md:table-cell">Item</th>
                        <th className="px-6 py-5">Amount</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {visibleLedger.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-5 space-y-0.5">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase">{log.id}</p>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-900 flex items-center gap-1">
                              <CheckCircle2 size={10} className="sm:w-3 sm:h-3 text-green-500" />
                              <span className="leading-snug">{log.dateLabel || log.paidDate}</span>
                            </p>
                          </td>
                          <td className="px-6 py-5 space-y-0.5">
                            <p className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1"><Building2 size={10} className="sm:w-3 sm:h-3 text-slate-400" /> {log.department}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-600">{log.vendor}</p>
                          </td>
                          <td className="px-6 py-5 hidden md:table-cell">
                            <p className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{log.item}</p>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase">PO: {log.refPoId}</p>
                          </td>
                          <td className="px-6 py-5 font-black text-red-600 text-xs sm:text-sm">-{formatCurrency(log.amount)}</td>
                          <td className="px-6 py-5 text-center">{getStatusBadge(log.status)}</td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingExpense(log)}
                                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Eye size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">View Details</span>
                              </button>
                              {log.invoiceUrl ? (
                                <button
                                  type="button"
                                  onClick={() => window.open(log.invoiceUrl, '_blank', 'noopener,noreferrer')}
                                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow-sm"
                                >
                                  <FileText size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Invoice</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow-sm cursor-not-allowed"
                                >
                                  <FileText size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Invoice</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {visibleLedger.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">
                            No expense history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}

              </table>
            </div>
          </div>
        </div>
      </PageFrame>

      {/* ── View Budget Modal ── */}
      {viewingBudget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-[96vw] 2xl:max-w-[1500px] shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
            <div className="px-6 sm:px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border-blue-400/30 mb-2 inline-block">
                  Annual Budget Request
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1">
                  <PieChart size={20} /> Budget Review
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">ID: {viewingBudget.id}</p>
              </div>
              <button onClick={() => setViewingBudget(null)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
              <div className="px-6 sm:px-8 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-gray-100 bg-white">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Department</p>
                  <p className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-1.5 mt-0.5">
                    <Building2 size={14} className="text-[#2563EB] shrink-0" /> {viewingBudget.department}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Total Requested</p>
                  <p className="text-xl sm:text-2xl font-black text-blue-900 mt-0.5">{formatCurrency(viewingBudget.requested)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Submitted By</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">{viewingBudget.submittedByName || 'Dept. Manager'}</p>
                  <p className="text-[10px] font-semibold text-gray-400">{viewingBudget.date}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 flex flex-col gap-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Status</p>
                  <span className={`mt-1.5 inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit ${viewingBudget.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : viewingBudget.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{viewingBudget.status}</span>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-4 border-b border-gray-100 bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <FileText size={11} /> Business Justification
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-700 leading-relaxed">
                  {viewingBudget.details || 'No additional justification provided.'}
                </p>
              </div>

              <div className="px-4 sm:px-8 py-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h4 className="text-[10px] sm:text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={13} className="text-[#2563EB]" /> Monthly Expense Plan
                    {Array.isArray(viewingBudget.monthlyBreakdown) && (
                      <span className="ml-1 text-gray-400 font-bold normal-case tracking-normal">
                        ({viewingBudget.monthlyBreakdown.length} months)
                      </span>
                    )}
                  </h4>
                  {viewingBudget.status === 'Pending Review' && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                      Vendor & payment details unlock after approval
                    </span>
                  )}
                </div>

                <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-left" style={{ minWidth: viewingBudget.status === 'Active' ? '1280px' : '920px' }}>
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="w-[290px] px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Expense</th>
                          <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Description</th>
                          <th className="w-[130px] px-4 py-3.5 text-right text-[9px] font-black uppercase tracking-widest text-slate-500">Projected</th>
                          <th className="w-[120px] px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Due</th>
                          {viewingBudget.status === 'Active' && <>
                            <th className="w-[220px] px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Vendor</th>
                            <th className="w-[160px] px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Payment</th>
                            <th className="w-[160px] px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Invoice</th>
                          </>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Array.isArray(viewingBudget.monthlyBreakdown) && viewingBudget.monthlyBreakdown.length > 0 ? (
                          viewingBudget.monthlyBreakdown.map((m: MonthlyBreakdown, mIdx: number) => {
                            const expenses = Array.isArray(m.expenses) ? m.expenses : [];
                            const extraExpenses = Array.isArray(m.extraExpenses) ? m.extraExpenses : [];
                            const allExpenses = [...expenses, ...extraExpenses.map((e: any) => ({ ...e, _isExtra: true }))];
                            const projected = Number(m.projectedBudget ?? m.amount ?? 0);
                            const actual = Number(m.actualSpent ?? 0);
                            const colSpan = viewingBudget.status === 'Active' ? 7 : 4;
                            return (
                              <React.Fragment key={mIdx}>
                                <tr className="border-y border-blue-100 bg-blue-50/80">
                                  <td colSpan={colSpan} className="px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <span className="flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-900">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm">
                                          <Calendar size={13} />
                                        </span>
                                        {m.month}{m.title ? ` — ${m.title}` : ''}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-700">
                                          Projected <span className="text-[#2563EB]">{formatCurrency(projected)}</span>
                                        </span>
                                        {viewingBudget.status === 'Active' && actual > 0 && (
                                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                                            Used {formatCurrency(actual)}
                                          </span>
                                        )}
                                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                          {expenses.length} planned{extraExpenses.length > 0 ? ` + ${extraExpenses.length} extra` : ''}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                                {allExpenses.length > 0 ? allExpenses.map((expense: any, eIdx: number) => (
                                  <tr key={eIdx} className={`border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${expense._isExtra ? 'bg-amber-50/40' : 'bg-white'}`}>
                                    <td className="px-4 py-4 align-top">
                                      <div className="flex items-start gap-2">
                                        {expense._isExtra && (
                                          <span className="mt-0.5 shrink-0 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-700">Extra</span>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <div className="flex min-w-0 items-start justify-between gap-3">
                                            <p className="min-w-0 break-words text-xs font-black leading-snug text-slate-900 sm:text-sm">{expense.expenseLabel || expense.title || `Expense ${eIdx + 1}`}</p>
                                            <div className="flex shrink-0 items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => openExpenseDetails(expense, m, eIdx, viewingBudget.department)}
                                                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                                              >
                                                <Eye size={11} /> Details
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      {expense.vendorName ? (
                                        <div className="mt-2 inline-flex max-w-full items-center gap-1.5 whitespace-normal rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                                          Vendor: {expense.vendorName}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                      <p className="break-words text-[11px] font-medium leading-relaxed text-slate-500 sm:text-xs">{getBudgetExpenseDetails(expense) || '—'}</p>
                                    </td>
                                    <td className="px-4 py-4 text-right align-top">
                                      <p className="whitespace-nowrap text-xs font-black text-[#2563EB] sm:text-sm">{formatCurrency(getBudgetExpenseAmount(expense))}</p>
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                      <p className="text-xs font-bold text-slate-600">{expense.dueDate || '—'}</p>
                                    </td>
                                    {viewingBudget.status === 'Active' && <>
                                      <td className="px-4 py-4 align-top">
                                        {expense.vendorName ? (
                                          <div className="min-w-0">
                                            <p className="break-words text-xs font-black text-slate-900">{expense.vendorName}</p>
                                            {expense.vendorContact && <p className="mt-0.5 break-words text-[10px] font-medium text-slate-400">{expense.vendorContact}</p>}
                                            {(expense.poId || expense.vendorId) && <p className="mt-0.5 break-words text-[9px] font-bold uppercase tracking-wider text-blue-600">PO: {expense.poId || expense.vendorId}</p>}
                                          </div>
                                        ) : (
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Not Assigned</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-4 align-top">
                                        <span className={`inline-flex whitespace-normal px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${(expense.paymentStatus || '').includes('Done') || (expense.paymentStatus || '').includes('Paid') ? 'bg-green-50 text-green-700 border border-green-200' : (expense.paymentStatus || '').includes('Invoice') ? 'bg-blue-50 text-blue-700 border border-blue-200' : (expense.paymentStatus || '').includes('Pending') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                          {expense.paymentStatus || 'Planned'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-4 align-top">
                                        {expense.invoiceNumber || expense.invoiceUrl ? (
                                          <div className="space-y-1">
                                            <span className="flex w-fit items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-[9px] font-black text-green-700">
                                              <Receipt size={9} /> {expense.invoiceNumber || 'Uploaded'}
                                            </span>
                                            {expense.invoiceUrl && (
                                              <a href={expense.invoiceUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline block">View file</a>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Pending</span>
                                        )}
                                      </td>
                                    </>}
                                  </tr>
                                )) : (
                                  <tr className="bg-white">
                                    <td colSpan={colSpan} className="px-4 py-5 text-center text-[11px] font-bold text-slate-400">
                                      No expenses listed for this month.
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={viewingBudget.status === 'Active' ? 7 : 4} className="px-4 py-12 text-center text-sm font-bold text-slate-400">
                              No monthly breakdown has been submitted for this request.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {viewingBudget.status === 'Pending Review' ? (
              <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex gap-3 sm:gap-4 shrink-0">
                <button onClick={() => { setRejectingRequest({ ...viewingBudget, modalType: 'estimated' }); setViewingExpense(null); setViewingBudget(null); }} className="flex-1 py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-black hover:bg-red-50 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                  <XCircle size={14} /> REJECT REQUEST
                </button>
                <button onClick={() => handleApproveEstimated(viewingBudget)} className="flex-[2] py-3.5 bg-green-600 text-white rounded-xl font-black shadow-lg shadow-green-200 hover:bg-green-700 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                  APPROVE BUDGET <CheckCircle2 size={14} />
                </button>
              </div>
            ) : (
              <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex justify-end shrink-0">
                <button onClick={() => { setViewingExpense(null); setViewingBudget(null); }} className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-black hover:bg-gray-200 transition-all text-sm">CLOSE</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View Expense Modal ── */}
      {viewingExpense && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0F172A]/85 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2.5rem] w-full max-w-5xl xl:max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 lg:p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-blue-300 uppercase tracking-widest">{viewingExpense.monthTitle || viewingExpense.month || 'Expense'}</p>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-1"><DollarSign size={18} className="sm:w-5 sm:h-5 text-blue-400" /> {viewingExpense.expenseLabel || viewingExpense.title || 'Expense Details'}</h2>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-2 max-w-2xl">{viewingExpense.description || 'No description provided.'}</p>
              </div>
              <button onClick={closeExpenseDetails} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto bg-white space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Projected</p>
                  <p className="mt-1 text-lg sm:text-xl font-black text-gray-900">{formatCurrency(viewingExpense.projectedAmount || 0)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Actual</p>
                  <p className="mt-1 text-lg sm:text-xl font-black text-gray-900">{formatCurrency(viewingExpense.actualAmount || 0)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Line Item</p>
                  <p className="mt-1 text-lg sm:text-xl font-black text-gray-900">{viewingExpense.expenseLabel || viewingExpense.title || 'Expense 1'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
                  <p className="mt-1 text-lg sm:text-xl font-black text-gray-900">{viewingExpense.paymentStatus || 'Planned'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 p-4 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Vendor Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">ID</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorId || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Name</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorName || 'Not assigned'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contact Person</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorContactPerson || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorPhone || 'Not set'}</p></div>
                    <div className="sm:col-span-2"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</p><p className="font-bold text-gray-900 mt-1 break-words">{viewingExpense.vendorEmail || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorCategory || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Terms</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorPaymentTerms || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">GSTIN</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorGstin || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">PAN Number</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorPanNumber || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bank Name</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorBankName || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Name</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorAccountName || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Number</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorAccountNumber || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">IFSC Code</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorIfscCode || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">UPI ID</p><p className="font-bold text-gray-900 mt-1">{viewingExpense.vendorUpiId || 'Not set'}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Website</p><p className="font-bold text-gray-900 mt-1 break-words">{viewingExpense.vendorWebsite || 'Not set'}</p></div>
                    <div className="sm:col-span-2"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Address</p><p className="font-medium text-gray-700 mt-1 whitespace-pre-line">{viewingExpense.vendorAddress || 'Not set'}</p></div>
                    <div className="sm:col-span-2"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notes</p><p className="font-medium text-gray-700 mt-1 whitespace-pre-line">{viewingExpense.notes || 'Not set'}</p></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Invoice & Status</p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Status</span>
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${(viewingExpense.paymentStatus || '').includes('Paid') || (viewingExpense.paymentStatus || '').includes('Done') ? 'bg-green-50 text-green-700 border-green-200' : (viewingExpense.paymentStatus || '').includes('Invoice') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {viewingExpense.paymentStatus || 'Planned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice Number</span>
                      <span className="font-bold text-gray-900 text-right">{viewingExpense.invoiceNumber || 'Not uploaded'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice File</span>
                      <span className="font-bold text-gray-900 text-right">{viewingExpense.invoiceNumber || (viewingExpense.invoiceUrl ? 'Uploaded' : 'Not uploaded')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Month</span>
                      <span className="font-bold text-gray-900 text-right">{viewingExpense.monthTitle || viewingExpense.month || 'Unknown'}</span>
                    </div>
                  </div>
                  {canMarkExpenseAsPaid(viewingExpense) ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => handleMarkPaidForExpense(viewingExpense)}
                        disabled={isUpdatingExpense}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-200 transition-all disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} />
                        {isUpdatingExpense ? 'Marking...' : 'Mark Paid'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Extra Modal ── */}
      {viewingExtra && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2.5rem] w-full max-w-lg sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 lg:p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2"><AlertCircle size={18} className="sm:w-5 sm:h-5" /> Extra Budget</h2>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase">{viewingExtra.id}</p>
              </div>
              <button onClick={() => setViewingExtra(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all"><X size={16} /></button>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1 bg-white space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1">Department</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2"><Building2 size={16} className="sm:w-5 sm:h-5 text-amber-500" /> {viewingExtra.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1">Requested</p>
                  <p className="text-2xl sm:text-3xl font-black text-amber-600">{formatCurrency(viewingExtra.requested)}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-2 flex items-center gap-1.5"><FileText size={12} className="sm:w-3.5 sm:h-3.5" /> Justification</p>
                <div className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed bg-gray-50 border border-gray-200 p-3 sm:p-5 rounded-xl whitespace-pre-line">
                  {viewingExtra.details}
                </div>
              </div>

              {viewingExtra.status === 'Pending Review' && (
                <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-[10px] sm:text-xs font-bold text-amber-800">This request will be approved or rejected as-is.</p>
                </div>
              )}
            </div>

            {viewingExtra.status === 'Pending Review' ? (
              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex gap-3 sm:gap-4 shrink-0">
                <button onClick={() => { setRejectingRequest({ ...viewingExtra, modalType: 'extra' }); setViewingExtra(null); }} className="flex-1 py-3 sm:py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-black hover:bg-red-50 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                  <XCircle size={14} className="sm:w-4 sm:h-4" /> REJECT
                </button>
                <button onClick={handleApproveExtra} className="flex-[2] py-3 sm:py-3.5 bg-green-600 text-white rounded-xl font-black shadow-md shadow-green-200 hover:bg-green-700 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                  APPROVE <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 shrink-0">
                <button onClick={() => setViewingExtra(null)} className="w-full py-3 sm:py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-black hover:bg-gray-100 transition-all text-xs sm:text-sm">CLOSE</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View Invoice Modal ── */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="p-4 sm:p-6 lg:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2"><Receipt size={18} className="sm:w-5 sm:h-5" /> Invoice</h2>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase">{viewingInvoice.department}</p>
              </div>
              <button onClick={() => setViewingInvoice(null)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-red-500 transition-all"><X size={16} /></button>
            </div>

            <div className="p-6 sm:p-8 text-center bg-white">
              <FileText size={40} className="mx-auto text-[#2563EB] mb-4 w-10 h-10 sm:w-12 sm:h-12" />
              <p className="font-bold text-gray-900 mb-2 text-sm sm:text-base">{viewingInvoice.invoice}</p>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 mb-6">PO: {viewingInvoice.refPoId}</p>
              <button className="w-full py-3 sm:py-3.5 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-xl font-black text-xs sm:text-sm hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                <DownloadCloud size={14} className="sm:w-4 sm:h-4" /> DOWNLOAD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Modal ── */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-md">
          <div className="bg-white rounded-2xl sm:rounded-[2.5rem] w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="p-4 sm:p-6 lg:p-8 bg-red-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2"><XCircle size={18} className="sm:w-5 sm:h-5" /> Deny Request</h2>
                <p className="text-[9px] sm:text-[10px] font-black text-red-200 uppercase">{rejectingRequest.department} Dept</p>
              </div>
              <button onClick={() => setRejectingRequest(null)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-slate-900 transition-all"><X size={16} /></button>
            </div>

            <form onSubmit={handleRejectConfirm} className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-white">
              <div className="p-3 sm:p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-[9px] sm:text-[10px] font-black text-red-400 uppercase mb-1">Amount</p>
                <p className="text-xl sm:text-2xl font-black text-red-600">{formatCurrency(rejectingRequest.requested || rejectingRequest.amount)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase">Reason for Rejection *</label>
                <textarea required rows={3} placeholder="Explain why this request is denied..." className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-medium text-gray-700 focus:border-red-500 outline-none resize-none text-sm" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              </div>

              <div className="flex gap-3 sm:gap-4 pt-2">
                <button type="button" onClick={() => setRejectingRequest(null)} className="flex-1 py-3 sm:py-3.5 bg-gray-100 text-gray-700 rounded-xl font-black hover:bg-gray-200 transition-all text-xs sm:text-sm">Cancel</button>
                <button type="submit" className="flex-[2] py-3 sm:py-3.5 bg-red-600 text-white rounded-xl font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all text-xs sm:text-sm flex items-center justify-center gap-2">
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
