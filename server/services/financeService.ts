import mongoose from "mongoose";
import DepartmentFinancePlan from "../models/DepartmentFinancePlan.js";
import FinanceExpense from "../models/FinanceExpense.js";
import FinanceVendor from "../models/FinanceVendor.js";
import FinanceSnapshot from "../models/FinanceSnapshot.js";
import AnnualFinanceRequest from "../models/AnnualFinanceRequest.js";
import ExtraFinanceRequest from "../models/ExtraFinanceRequest.js";
import { TenantCompany } from "../models/TenantCompany.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";
import { parseFiscalYearRange } from "../utils/fiscalYear.js";

// Roles that oversee all departments (owner-side / finance-side) and are exempt
// from the own-department restriction on department finance mutations.
const DEPARTMENT_FINANCE_PRIVILEGED_ROLES = new Set([
  "owner",
  "founder",
  "super_admin",
  "admin",
  "finance_manager",
  "finance",
]);

function normalizeFinanceRoleName(value: any) {
  const raw = typeof value === "string" ? value : value?.name;
  return safeString(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

async function getFinanceActorMembership(workspaceId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
  const membership: any = await WorkspaceMember.findOne({ workspace: workspaceId, user: userId })
    .populate("departments", "name")
    .populate("role", "name")
    .lean()
    .exec();
  if (!membership) {
    throw Object.assign(new Error("Workspace membership not found."), { statusCode: 403 });
  }
  return membership;
}

function getOwnDepartmentKeys(membership: any) {
  return ((membership?.departments || []) as any[])
    .map((d) => normalizeDepartmentKey(safeString(d?.name)))
    .filter(Boolean);
}

function canManageAllFinancePayments(membership: any) {
  const role = normalizeFinanceRoleName(membership?.role);
  if (DEPARTMENT_FINANCE_PRIVILEGED_ROLES.has(role)) return true;
  // A generic Manager assigned to the Finance department acts as finance staff.
  if (role !== "manager") return false;
  return getOwnDepartmentKeys(membership).some((key) => key.includes("finance"));
}

async function assertActorOwnsDepartment(
  workspaceId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  department: string
): Promise<any> {
  const membership = await getFinanceActorMembership(workspaceId, userId);
  if (DEPARTMENT_FINANCE_PRIVILEGED_ROLES.has(normalizeFinanceRoleName(membership.role))) return membership;

  const targetKey = normalizeDepartmentKey(safeString(department));
  if (!targetKey || !getOwnDepartmentKeys(membership).includes(targetKey)) {
    throw Object.assign(new Error("You can only manage finance records for your own department."), { statusCode: 403 });
  }
  return membership;
}

// Departments may only record spend against an APPROVED annual budget. Privileged
// finance-side roles are exempt so they can correct data during review.
function assertPlanAllowsSpend(planStatus: string, membershipRole: any) {
  if (DEPARTMENT_FINANCE_PRIVILEGED_ROLES.has(normalizeFinanceRoleName(membershipRole))) return;
  if (safeString(planStatus).toLowerCase() !== "approved") {
    throw Object.assign(
      new Error("Annual budget must be approved before expenses or vendors can be recorded for it."),
      { statusCode: 403 }
    );
  }
}

// Historical records (imported for reference) are immutable — closed periods
// never accept new spend, vendors, payments, invoices, or revisions.
function assertPlanIsMutable(plan: any) {
  if (plan?.isHistorical === true) {
    throw Object.assign(
      new Error("This is a historical imported record and cannot be modified."),
      { statusCode: 409 }
    );
  }
}

// Workspaces can pick their own fiscal-year start month in Workspace Settings
// (preferences.fiscalYearStartMonth, 1-12). Defaults to April (4) when unset.
async function getWorkspaceFyStartMonth(workspaceId: mongoose.Types.ObjectId): Promise<number> {
  const workspace: any = await Workspace.findById(workspaceId)
    .select("preferences.fiscalYearStartMonth")
    .lean()
    .exec();
  const value = Number(workspace?.preferences?.fiscalYearStartMonth);
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : 4;
}

// Historical imports are restricted to fully completed past fiscal years.
// The FY start month comes from the workspace, so a January-start workspace
// ("FY 2026" = Jan–Dec 2026) gates correctly instead of assuming April–March.
function isPastFiscalYear(fiscalYear: string, fyStartMonth = 4): boolean {
  const range = parseFiscalYearRange(fiscalYear, fyStartMonth);
  if (!range) return false;
  const now = new Date();
  const currentFyStartYear = now.getMonth() + 1 >= fyStartMonth ? now.getFullYear() : now.getFullYear() - 1;
  return range.end.getTime() < new Date(currentFyStartYear, fyStartMonth - 1, 1).getTime();
}

// Forward-only payment lifecycle used to gate department-managed payments.
const PAYMENT_STATUS_RANKS = ["planned", "payment pending", "payment done - invoice pending", "invoice shared"];

function getPaymentStatusRank(value: string) {
  const v = safeString(value).toLowerCase();
  if (v.includes("shared")) return 3;
  if (v.includes("done") || v.includes("paid")) return 2;
  if (v.includes("pending")) return 1;
  return 0;
}

function asObjectId(value: any): mongoose.Types.ObjectId | null {
  try {
    if (!value) return null;
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
}

function safeString(value: any, fallback = "") {
  return String(value ?? fallback).trim();
}

function safeNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMonthKey(monthKey: string) {
  return safeString(monthKey).toLowerCase();
}

// Fiscal months in order, starting April (matches the Apr-Mar fiscal year).
const FISCAL_MONTH_ORDER = ["apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "jan", "feb", "mar"];

// Imported budget rows often omit a due date. Default to the last day of the
// expense's own month so payment planning has a sane starting point; users can
// still override it before submitting.
// Approved extra-budget headroom concept retired under the strict line-item
// model (Option A): approved extras surface as their own Add-on lines instead.

function buildDefaultDueDate(monthKey: string, fiscalYear: string, fyStartMonth = 4): string {
  const idx = FISCAL_MONTH_ORDER.indexOf(normalizeMonthKey(monthKey).slice(0, 3));
  const range = parseFiscalYearRange(fiscalYear, fyStartMonth);
  if (idx < 0 || !range) return "";
  // idx-th fiscal month after the FY start; due on that month's last day.
  const due = new Date(range.start.getFullYear(), range.start.getMonth() + idx + 1, 0);
  const yyyy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, "0");
  const dd = String(due.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Imported spreadsheets store real Excel dates as either Date objects (client
// used cellDates), ISO strings, or raw day-serial numbers like "46117". All
// must collapse to YYYY-MM-DD or the UI's <input type="date"> renders blank.
function normalizeImportedDate(value: any): string {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const raw = safeString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    // Plausible Excel serial range (~1954-2119); epoch 1899-12-30 accounts
    // for Lotus-notes leap-year bug baked into the 1900 date system.
    if (serial >= 20000 && serial <= 80000) {
      const utc = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return utc.toISOString().slice(0, 10);
    }
  }
  return raw;
}

function normalizeExpenseTag(tag: string) {
  // Untagged = regular expense. Never default to "add-on": that would silently
  // classify normal lines as amendments (hidden from tables, exempt from caps).
  return safeString(tag).toLowerCase();
}

// ─── Imported-month normalization ────────────────────────────────────────────
// Excel stores dates as day-counts since 1900 (46113 = 2026-04-01), so bulk
// uploads often leak those serials in as monthKey. Convert every known shape
// ("46113", "April", "Sep", "apr") to the canonical fiscal key + readable label.
const FISCAL_MONTH_KEYS = ["apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "jan", "feb", "mar"];
const FISCAL_MONTH_LABELS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March",
];

function resolveImportedMonth(raw: string, fyStartMonth = 4): { key: string; label: string } | null {
  const value = safeString(raw);
  if (!value) return null;
  const lower = value.toLowerCase();

  // Already a fiscal month key ("apr")
  const directKey = FISCAL_MONTH_KEYS.indexOf(lower);
  if (directKey >= 0) return { key: lower, label: FISCAL_MONTH_LABELS[directKey] };

  // Month name ("April", "SEP", "september") possibly with a year attached
  const nameIndex = FISCAL_MONTH_LABELS.findIndex(
    (label) => lower.includes(label.toLowerCase()) || lower.includes(label.slice(0, 3).toLowerCase())
  );
  if (nameIndex >= 0) return { key: FISCAL_MONTH_KEYS[nameIndex], label: FISCAL_MONTH_LABELS[nameIndex] };

  // Excel serial date (roughly 1954-2064 range)
  if (/^\d{4,6}$/.test(lower)) {
    const serial = Number(lower);
    if (serial >= 20000 && serial <= 60000) {
      const utcDate = new Date(Math.round((serial - 25569) * 86400 * 1000));
      const index = (utcDate.getUTCMonth() - (fyStartMonth - 1) + 12) % 12; // anchor to the workspace's FY start
      return { key: FISCAL_MONTH_KEYS[index], label: `${FISCAL_MONTH_LABELS[index]} ${utcDate.getUTCFullYear()}` };
    }
  }
  return null;
}

function ensureMonthlyPlanEntry(plan: any, month: { month: string; monthKey: string; displayOrder?: number }) {
  const monthKeyNorm = normalizeMonthKey(month.monthKey || month.month);
  const monthNameNorm = normalizeMonthKey(month.month);
  if (!Array.isArray(plan.monthlyPlan)) plan.monthlyPlan = [];
  const existing = plan.monthlyPlan.find((m: any) =>
    normalizeMonthKey(m.monthKey || m.month) === monthKeyNorm
    || (monthNameNorm && normalizeMonthKey(m.month) === monthNameNorm),
  );
  if (existing) return existing;

  const created = {
    month: safeString(month.month),
    monthKey: safeString(month.monthKey || month.month),
    displayOrder: typeof month.displayOrder === "number" ? month.displayOrder : plan.monthlyPlan.length + 1,
    status: "Upcoming",
    projectedBudget: 0,
    allocatedBudget: 0,
    actualSpent: 0,
    savings: 0,
    details: "",
    title: "",
    dueDate: "",
    expenses: [],
  };

  plan.monthlyPlan.push(created);
  return created;
}

function recalcMonthTotalsFromExpenses(plan: any, monthKey: string) {
  const monthKeyNorm = normalizeMonthKey(monthKey);
  const monthPlan = Array.isArray(plan.monthlyPlan)
    ? plan.monthlyPlan.find((m: any) => normalizeMonthKey(m.monthKey || m.month) === monthKeyNorm)
    : null;

  if (!monthPlan) return;

  const expenses = Array.isArray(monthPlan.expenses) ? monthPlan.expenses : [];
  // In case monthPlan.expenses isn't used (we store in FinanceExpense), caller should overwrite.
  const projectedBudget = safeNumber(monthPlan.projectedBudget, 0);

  // actualSpent = sum of actualAmount for paid/done-ish expenses
  const actualSpent = expenses.reduce((sum: number, exp: any) => {
    const paymentStatus = safeString(exp.paymentStatus || exp.status).toLowerCase();
    const actual = safeNumber(exp.actualAmount, 0);
    if (actual > 0 && (paymentStatus.includes("paid") || paymentStatus.includes("done"))) return sum + actual;
    if (paymentStatus.includes("paid") || paymentStatus.includes("done")) return sum + safeNumber(exp.actualAmount ?? exp.projectedAmount ?? exp.amount, 0);
    return sum;
  }, 0);

  // savings = projectedBudget - actualSpent (never negative)
  const savings = Math.max(0, projectedBudget - actualSpent);

  monthPlan.actualSpent = actualSpent;
  monthPlan.savings = savings;
}

async function syncMonthlyPlanFromFinanceExpenses(planId: mongoose.Types.ObjectId) {
  const plan = await DepartmentFinancePlan.findById(planId);
  if (!plan) return null;

  // Imported CSVs may use month names while older plans use Excel serial keys.
  // Collapse those representations so one fiscal year stays April through March.
  if (Array.isArray(plan.monthlyPlan)) {
    const uniqueMonths = new Map<string, any>();
    for (const month of plan.monthlyPlan) {
      const key = normalizeMonthKey(month.month || month.monthKey);
      if (!uniqueMonths.has(key)) uniqueMonths.set(key, month);
    }
    plan.monthlyPlan = Array.from(uniqueMonths.values());
  }

  const expenses = await FinanceExpense.find({
    planId,
    workspaceId: plan.workspaceId,
  }).lean();

  // Group by monthKey
  const byMonth = new Map<string, any[]>();
  for (const e of expenses) {
    const key = normalizeMonthKey(e.monthKey);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  for (const [monthKeyNorm, monthExpenses] of byMonth.entries()) {
    const sample = monthExpenses[0];
    const monthPlan = ensureMonthlyPlanEntry(plan, {
      month: sample.month,
      monthKey: sample.monthKey,
    });

    // projectedBudget tracks REGULAR expenses only — Add-on rows represent
    // budget amendments and are surfaced separately (Extra Requested UI).
    const projectedBudget = monthExpenses
      .filter((exp) => normalizeExpenseTag(safeString(exp.expenseTag)) !== "add-on")
      .reduce((sum, exp) => sum + safeNumber(exp.projectedAmount, 0), 0);

    // Actual spend is the amount recorded against the expense. Payment status
    // remains separate so a pending payment can still have a known vendor cost.
    const actualSpent = monthExpenses.reduce((sum, exp) => sum + safeNumber(exp.actualAmount, 0), 0);

    monthPlan.projectedBudget = projectedBudget;
    monthPlan.actualSpent = actualSpent;
    monthPlan.savings = Math.max(0, projectedBudget - actualSpent);

    // keep a lightweight expenses array in-memory for debugging; model doesn't define expenses in monthlyPlan schema,
    // but extra fields are allowed by mongoose by default unless strict is enabled. So we set it safely.
    (monthPlan as any).expenses = monthExpenses;
  }

  await plan.save();
  return plan;
}

function updateOrCreateFinanceSnapshot(ownerId: mongoose.Types.ObjectId, workspaceId: mongoose.Types.ObjectId, fiscalYear: string) {
  return FinanceSnapshot.findOneAndUpdate(
    { ownerId, fiscalYear, workspaceId },
    {
      $set: { workspaceId, fiscalYear, ownerId },
      $setOnInsert: { departments: [] },
    },
    { new: true, upsert: true }
  );
}

export async function getDepartmentFinanceForManager(userId: any, query: any = {}) {
  const workspaceId = (userId && (userId.workspaceMembership?.workspace || userId.workspaceId)) ? userId : null;
  // In HostPanel, verifyJwt sets request.user and request.workspaceMembership.
  // We'll accept userId as request.user and rely on controller to pass workspaceId.
  // Controller will pass correct workspaceId/department.
  throw new Error("Not implemented: use getDepartmentFinanceForManagerInternal");
}

export async function getDepartmentFinanceForManagerInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId | null;
  department: string;
  fiscalYear: string;
}) {
  const { workspaceId, department, fiscalYear } = input;
  const plan = await DepartmentFinancePlan.findOne({ workspaceId, fiscalYear, department }).exec();

  if (!plan) {
    // best-effort empty response
    return {
      department,
      fiscalYear,
      plan: null,
      monthlyPlan: [],
      reminders: [],
    };
  }

  const [expenses, vendors, annualRequest, extraRequests] = await Promise.all([
    FinanceExpense.find({ workspaceId, planId: plan._id }).sort({ createdAt: 1 }).lean(),
    FinanceVendor.find({ workspaceId }).sort({ createdAt: -1 }).lean(),
    AnnualFinanceRequest.findOne({ workspaceId, department, fiscalYear }).sort({ revision: -1, createdAt: -1 }).lean(),
    ExtraFinanceRequest.find({ workspaceId, department, fiscalYear }).sort({ createdAt: -1 }).lean(),
  ]);

  const expensesByMonth = new Map<string, any[]>();
  for (const expense of expenses) {
    const key = normalizeMonthKey(expense.monthKey);
    if (!expensesByMonth.has(key)) expensesByMonth.set(key, []);
    expensesByMonth.get(key)!.push({
      ...expense,
      id: expense.expenseKey,
      actualSpent: safeNumber(expense.actualAmount, 0),
      variance: safeNumber(expense.projectedAmount, 0) - safeNumber(expense.actualAmount, 0),
      status: safeString(expense.paymentStatus, "Planned"),
    });
  }

  const monthlyPlan = (Array.isArray(plan.monthlyPlan) ? plan.monthlyPlan : []).map((month: any) => {
    const monthExpenses = expensesByMonth.get(normalizeMonthKey(month.monthKey || month.month)) || [];
    // Historical/backfilled plans can have valid FinanceExpense projections
    // while the older cached monthlyPlan.projectedBudget remains zero. Expense
    // rows are the persisted source of truth, so derive the displayed month
    // projection from them whenever they exist.
    const expenseProjectedAmount = monthExpenses
      .filter((expense: any) => normalizeExpenseTag(safeString(expense.expenseTag)) !== "add-on")
      .reduce((sum: number, expense: any) => sum + safeNumber(expense.projectedAmount, 0), 0);
    const projectedAmount = monthExpenses.length > 0
      ? expenseProjectedAmount
      : safeNumber(month.projectedBudget, 0);
    return {
      ...(typeof month?.toObject === "function" ? month.toObject() : month),
      projectedAmount,
      allocatedBudget: safeNumber(month.allocatedBudget, projectedAmount) || projectedAmount,
      actualSpent: monthExpenses.reduce((sum: number, expense: any) => sum + safeNumber(expense.actualAmount, 0), 0),
      expenses: monthExpenses,
    };
  });

  return {
    department: plan.department,
    fiscalYear: plan.fiscalYear,
    plan,
    annualBudgetRequested: safeNumber(plan.annualBudgetRequested, 0),
    approvedAnnualBudget: safeNumber(plan.approvedAnnualBudget, 0),
    previousSpend: safeNumber(plan.previousSpend, 0),
    totalSpentYTD: monthlyPlan.reduce((sum: number, month: any) => sum + safeNumber(month.actualSpent, 0), 0),
    remainingBalance: Math.max(0, safeNumber(plan.approvedAnnualBudget, 0) - monthlyPlan.reduce((sum: number, month: any) => sum + safeNumber(month.actualSpent, 0), 0)),
    monthlyPlan,
    vendors: vendors.map((vendor: any) => ({ ...vendor, id: vendor.vendorKey, importKey: vendor.vendorKey })),
    annualRequest: annualRequest ? {
      ...annualRequest,
      id: annualRequest.requestKey,
      createdAt: annualRequest.submittedAtLabel || annualRequest.createdAt,
    } : null,
    extraRequests: extraRequests.map((request: any) => ({
      ...request,
      id: request.requestKey,
      createdAt: request.submittedAtLabel || request.createdAt,
    })),
    reminders: plan.reminders,
    recentActivity: plan.reminders,
    approvalFlow: plan.approvalFlow,
    status: plan.status,
    notes: plan.notes,
  };
}

export async function resetRejectedAnnualBudgetForDepartmentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  department: string;
  fiscalYear: string;
}) {
  await assertActorOwnsDepartment(input.workspaceId, input.userId, input.department);

  const plan = await DepartmentFinancePlan.findOne({
    workspaceId: input.workspaceId,
    department: input.department,
    fiscalYear: input.fiscalYear,
  }).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  assertPlanIsMutable(plan);
  const previousRequest = await AnnualFinanceRequest.findOne({
    workspaceId: input.workspaceId,
    department: input.department,
    fiscalYear: input.fiscalYear,
  }).sort({ revision: -1, createdAt: -1 }).exec();
  const previousStatus = safeString(previousRequest?.status || plan.status).toLowerCase();
  if (!previousRequest || !["rejected", "discuss"].includes(previousStatus)) {
    throw Object.assign(new Error("Only a rejected or changes-requested annual budget can be revised."), { statusCode: 409 });
  }

  const nextRevision = Math.max(1, safeNumber((previousRequest as any).revision, 1)) + 1;
  const approvalFlow = {
    owner: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
    financeManager: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
    finalStatus: "Pending",
    lastDecisionByRole: "",
    lastDecisionAt: null,
    lastDecisionAtLabel: "",
    decisionHistory: [],
  };
  const revisionDraft = await AnnualFinanceRequest.create({
    snapshotId: plan.snapshotId,
    workspaceId: input.workspaceId,
    requestKey: `${safeString(previousRequest.requestKey).replace(/-R\d+$/i, "")}-R${nextRevision}`,
    department: input.department,
    fiscalYear: input.fiscalYear,
    requestedBudget: safeNumber(previousRequest.requestedBudget, 0),
    previousSpend: safeNumber(previousRequest.previousSpend, 0),
    status: "Draft",
    breakdown: safeString(previousRequest.breakdown, ""),
    submittedByUserId: input.userId,
    submittedByName: safeString(previousRequest.submittedByName, ""),
    submittedAt: null,
    submittedAtLabel: "",
    revision: nextRevision,
    supersedesRequestId: previousRequest._id,
    approvalFlow,
    monthlyBreakdown: previousRequest.monthlyBreakdown || [],
  });
  plan.status = "Draft";
  plan.requestId = String(revisionDraft._id);
  plan.approvalFlow = approvalFlow as any;
  plan.approvedAnnualBudget = 0;
  await plan.save();
  return { reset: true, revision: nextRevision, request: revisionDraft };
}

export async function submitBudgetRequestForDepartmentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId | null;
  userId: mongoose.Types.ObjectId;
  department: string;
  fiscalYear: string;
  managerName?: string;
  annualBudgetRequested: number;
  previousSpend?: number;
  notes?: string;
  monthlyPlan?: Array<{
    month: string;
    monthKey: string;
    displayOrder?: number;
    projectedBudget: number;
    dueDate?: string;
    title?: string;
    details?: string;
    expenses?: Array<{
      title?: string;
      projectedAmount?: number;
      dueDate?: string;
      description?: string;
      actualAmount?: number;
      paymentStatus?: string;
    }>;
  }>;
}) {
  const {
    workspaceId,
    userId,
    department,
    fiscalYear,
    managerName,
    annualBudgetRequested,
    previousSpend = 0,
    notes = "",
    monthlyPlan = [],
  } = input;

  await assertActorOwnsDepartment(workspaceId, userId, department);

  const existing = await DepartmentFinancePlan.findOne({ workspaceId, fiscalYear, department }).exec();
  const existingAnnualRequest = existing
    ? await AnnualFinanceRequest.findOne({ workspaceId, fiscalYear, department }).sort({ revision: -1, createdAt: -1 }).exec()
    : null;
  if (existingAnnualRequest && safeString(existingAnnualRequest.status).toLowerCase() !== "draft") {
    throw Object.assign(new Error("Department finance plan already exists for this fiscal year."), { statusCode: 409 });
  }

  const planFields = {
    snapshotId: new mongoose.Types.ObjectId(),
    workspaceId,
    planKey: new mongoose.Types.ObjectId().toString(),
    department,
    managerName: managerName || "",
    fiscalYear,
    requestId: "",
    status: "Draft",
    previousSpend: safeNumber(previousSpend, 0),
    annualBudgetRequested: safeNumber(annualBudgetRequested, 0),
    approvedAnnualBudget: 0,
    notes: notes || "",
    submittedByUserId: userId,
    submittedByName: "",
    submittedAt: new Date(),
    submittedAtLabel: "",
    approvalFlow: {
      owner: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
      financeManager: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
      finalStatus: "Pending",
      lastDecisionByRole: "",
      lastDecisionAt: null,
      lastDecisionAtLabel: "",
      decisionHistory: [],
    },
    monthlyPlan: monthlyPlan.map((m, idx) => {
      const monthActualSpent = (Array.isArray(m.expenses) ? m.expenses : []).reduce(
        (sum, e) => sum + safeNumber(e.actualAmount, 0),
        0,
      );
      return {
        month: safeString(m.month),
        monthKey: safeString(m.monthKey || m.month),
        displayOrder: typeof m.displayOrder === "number" ? m.displayOrder : idx + 1,
        status: "Upcoming",
        projectedBudget: safeNumber(m.projectedBudget, 0),
        allocatedBudget: safeNumber(m.projectedBudget, 0),
        actualSpent: monthActualSpent,
        savings: Math.max(0, safeNumber(m.projectedBudget, 0) - monthActualSpent),
        details: safeString(m.details, ""),
        title: safeString(m.title, ""),
        dueDate: safeString(m.dueDate, ""),
      };
    }),
    reminders: [],
  };

  // Bulk import bootstraps a Draft plan so its rows have a planId. When the
  // manager later submits that imported draft, promote the same plan instead
  // of treating it as an already-submitted annual budget.
  const plan = existing || await DepartmentFinancePlan.create(planFields);
  if (existing) {
    existing.set({
      ...planFields,
      snapshotId: existing.snapshotId,
      planKey: existing.planKey,
      reminders: existing.reminders || [],
    });
    await existing.save();
    await FinanceExpense.deleteMany({ workspaceId, planId: existing._id });
  }

  const expenseDocuments = monthlyPlan.flatMap((month, monthIndex) =>
    (Array.isArray(month.expenses) ? month.expenses : []).map((expense, expenseIndex) => ({
      workspaceId,
      planId: plan._id,
      expenseKey: `EXP-${plan.planKey}-${normalizeMonthKey(month.monthKey || month.month)}-${Date.now()}-${monthIndex}-${expenseIndex}`,
      title: safeString(expense.title, "Untitled expense"),
      description: safeString(expense.description, ""),
      monthKey: safeString(month.monthKey || month.month),
      month: safeString(month.month),
      dueDate: safeString(expense.dueDate, ""),
      projectedAmount: safeNumber(expense.projectedAmount, 0),
      actualAmount: safeNumber(expense.actualAmount, 0),
      savings: Math.max(0, safeNumber(expense.projectedAmount, 0) - safeNumber(expense.actualAmount, 0)),
      paymentStatus: safeString(expense.paymentStatus, "Planned"),
      sourceRowNumber: 0,
    })),
  );
  if (expenseDocuments.length > 0) await FinanceExpense.insertMany(expenseDocuments);

  // Also create an AnnualFinanceRequest so the approval/decision endpoint can find it
  const submittedAtLabel = new Date().toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const annualRequestPayload = {
    snapshotId: plan.snapshotId,
    workspaceId,
    requestKey: safeString(existingAnnualRequest?.requestKey) || `BUD-${safeString(department).slice(0, 8).toUpperCase()}-${fiscalYear.replace(/[^a-zA-Z0-9]/g, "")}`,
    department,
    fiscalYear,
    requestedBudget: safeNumber(annualBudgetRequested, 0),
    previousSpend: safeNumber(previousSpend, 0),
    status: "Pending",
    breakdown: notes || "",
    submittedByUserId: userId,
    submittedByName: managerName || "",
    submittedAt: new Date(),
    submittedAtLabel,
    revision: safeNumber((existingAnnualRequest as any)?.revision, 1),
    approvalFlow: {
      owner: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
      financeManager: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
      finalStatus: "Pending",
      lastDecisionByRole: "",
      lastDecisionAt: null,
      lastDecisionAtLabel: "",
      decisionHistory: [],
    },
    monthlyBreakdown: monthlyPlan.map((m, idx) => {
      const monthActualSpent = (Array.isArray(m.expenses) ? m.expenses : []).reduce(
        (sum, e) => sum + safeNumber(e.actualAmount, 0),
        0,
      );
      return {
        monthKey: safeString(m.monthKey || m.month),
        month: safeString(m.month),
        title: safeString(m.title, ""),
        amount: safeNumber(m.projectedBudget, 0),
        note: safeString(m.details, ""),
        details: safeString(m.details, ""),
        projectedBudget: safeNumber(m.projectedBudget, 0),
        actualSpent: monthActualSpent,
        savings: Math.max(0, safeNumber(m.projectedBudget, 0) - monthActualSpent),
        expenses: [],
      };
    }),
  };
  const annualRequest = existingAnnualRequest || await AnnualFinanceRequest.create(annualRequestPayload);
  if (existingAnnualRequest) {
    existingAnnualRequest.set(annualRequestPayload);
    await existingAnnualRequest.save();
  }

  // Link the plan back to the annual request so the approval flow can update the plan
  plan.requestId = String(annualRequest._id);
  plan.status = "Pending";
  plan.submittedAt = new Date();
  plan.submittedAtLabel = submittedAtLabel;
  plan.approvalFlow = (annualRequest as any).approvalFlow;
  await plan.save();

  // Recompute monthlyPlan.actualSpent/savings straight from the persisted
  // FinanceExpense rows (source of truth) so a re-submitted, already-imported
  // draft keeps its real actuals instead of the zeroed values plan.save()
  // above may still be holding in memory.
  const syncedPlan = await syncMonthlyPlanFromFinanceExpenses(plan._id as mongoose.Types.ObjectId);

  return { plan: syncedPlan || plan, annualRequest };
}

export async function addMonthlyExpenseInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  monthKey: string;
  month: string;
  date?: string;
  dueDate?: string;
  projectedAmount: number;
  actualAmount?: number;
  savings?: number;
  paymentStatus?: string;
  expenseTag?: string;
  vendor?: {
    vendorKey?: string;
    vendorName?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    paymentTerms?: string;
    category?: string;
    gstin?: string;
    panNumber?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    website?: string;
    notes?: string;
  };
  sourceSheet?: string;
  sourceRowNumber?: number;
  invoice?: {
    invoiceNumber?: string;
    invoiceUrl?: string;
    invoiceFile?: string;
    invoicePublicId?: string;
  };
}) {
  const { workspaceId, planId } = input;

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  assertPlanIsMutable(plan);
  const membership = await assertActorOwnsDepartment(workspaceId, input.userId, safeString((plan as any).department));
  assertPlanAllowsSpend(safeString((plan as any).status), membership?.role);

  // Option A — strict line-item model: an APPROVED budget is frozen. New
  // expense lines enter the system only via approved extra budget requests
  // (each request becomes its own authorized line).
  throw Object.assign(
    new Error(
      "Approved budgets are frozen — new expense lines come from approved extra budget requests. File an extra request for this month instead."
    ),
    { statusCode: 403 }
  );
}

export async function updateMonthlyExpenseStatusInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  expenseKey: string;
  paymentStatus: string;
  actualAmount?: number;
}) {
  const { workspaceId, planId, expenseKey, paymentStatus, actualAmount } = input;

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  assertPlanIsMutable(plan);

  const membership = await getFinanceActorMembership(workspaceId, input.userId);

  // Segregation of duties (matches UnitFlow): only finance-side roles execute
  // payments. Departments request and document; Finance pays.
  if (!canManageAllFinancePayments(membership)) {
    throw Object.assign(new Error("Only Finance can mark an expense's payment status."), { statusCode: 403 });
  }

  const expense = await FinanceExpense.findOne({ workspaceId, planId, expenseKey }).exec();
  if (!expense) throw Object.assign(new Error("Expense not found."), { statusCode: 404 });

  const actual = actualAmount !== undefined ? safeNumber(actualAmount, 0) : expense.actualAmount;
  const projected = safeNumber(expense.projectedAmount, 0);
  const newSavings = Math.max(0, projected - safeNumber(actual, 0));

  expense.paymentStatus = safeString(paymentStatus);
  expense.actualAmount = actualAmount !== undefined ? safeNumber(actualAmount, 0) : expense.actualAmount;
  expense.savings = newSavings;

  await expense.save();

  await syncMonthlyPlanFromFinanceExpenses(planId);
  return expense;
}

// Option B — additional payments: a paid expense line may receive further
// payments while its projected amount remains. The department records the
// additional intent (the amount accumulates into actualAmount) and the line
// re-enters "Payment Pending" so Finance executes the new installment.
// Segregation of duties is preserved: recording ≠ paying.
export async function recordAdditionalExpensePaymentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  monthKey: string;
  expenseId: string;
  amount: number;
}) {
  const { workspaceId, userId, planId, monthKey, expenseId } = input;
  const amount = safeNumber(input.amount, NaN);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("Additional payment amount must be greater than zero."), { statusCode: 400 });
  }

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  assertPlanIsMutable(plan);

  const membership = await assertActorOwnsDepartment(workspaceId, userId, safeString((plan as any).department));
  assertPlanAllowsSpend(safeString((plan as any).status), membership?.role);

  const expense = await FinanceExpense.findOne({
    workspaceId,
    planId,
    expenseKey: safeString(expenseId),
    monthKey: normalizeMonthKey(monthKey),
  }).exec();
  if (!expense) throw Object.assign(new Error("Expense not found."), { statusCode: 404 });

  if (normalizeExpenseTag(safeString((expense as any).expenseTag)) === "add-on") {
    const approved = await hasApprovedExtraForMonth(plan, workspaceId, normalizeMonthKey(monthKey));
    if (!approved) {
      throw Object.assign(
        new Error("This extra budget request is not approved yet. Founder and finance manager approval is required before recording costs against it."),
        { statusCode: 403 }
      );
    }
  }

  const projected = safeNumber((expense as any).projectedAmount, 0);
  const currentActual = safeNumber((expense as any).actualAmount, 0);
  const remaining = projected - currentActual;

  if (remaining <= 0.009) {
    throw Object.assign(
      new Error("This expense line's projected amount is fully used. File an extra budget request for additional funds."),
      { statusCode: 409 }
    );
  }
  if (amount > remaining + 0.009) {
    throw Object.assign(
      new Error(`Additional payment exceeds the remaining projected amount (${remaining.toLocaleString()}).`),
      { statusCode: 409 }
    );
  }

  (expense as any).actualAmount = currentActual + amount;
  (expense as any).savings = Math.max(0, projected - safeNumber((expense as any).actualAmount, 0));
  // A new installment now awaits Finance execution — re-open the lifecycle.
  (expense as any).paymentStatus = "Payment Pending";

  await expense.save();
  await syncMonthlyPlanFromFinanceExpenses(planId);
  return expense;
}

export async function upsertReminderInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  reminder: {
    id: string;
    importKey?: string;
    monthKey?: string;
    message: string;
    status: string;
    sentAtLabel?: string;
  };
}) {
  const { planId, reminder } = input;
  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String((plan as any).workspaceId) !== String(input.workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  await assertActorOwnsDepartment(input.workspaceId, input.userId, safeString((plan as any).department));

  if (!Array.isArray(plan.reminders)) plan.reminders = [];
  const idx = plan.reminders.findIndex((r: any) => String(r.id) === String(reminder.id));

  const rawStatus = safeString((reminder as any).status, "Sent");
  const normalizedStatus =
    ["Sent", "Read", "Actioned"].includes(rawStatus)
      ? (rawStatus as "Sent" | "Read" | "Actioned")
      : ("Sent" as "Sent" | "Read" | "Actioned");

  const normalized = {
    id: safeString(reminder.id),
    importKey: safeString(reminder.importKey, ""),
    monthKey: safeString(reminder.monthKey, ""),
    message: safeString(reminder.message),
    status: normalizedStatus,
    sentAtLabel: safeString(reminder.sentAtLabel, ""),
  };

  if (idx >= 0) {
    plan.reminders[idx] = { ...plan.reminders[idx], ...normalized };
  } else {
    plan.reminders.unshift(normalized as any);
  }

  await plan.save();
  return plan.reminders;
}

// ============================================================================
// Phase 2 (best-effort) — uses existing normalized models only
// ============================================================================

function getAllowedReminderStatus(value: string) {
  const raw = safeString(value, "Sent");
  if (["Sent", "Read", "Actioned"].includes(raw)) return raw;
  return "Sent";
}

function buildPlanReminderId(plan: any, monthKey: string) {
  const depKey = normalizeExpenseTag(plan?.department || "dep").slice(0, 12).replace(/[^a-z0-9]/gi, "");
  const mk = normalizeMonthKey(monthKey).slice(0, 24).replace(/[^a-z0-9]/gi, "");
  return `REM-${depKey || "dep"}-${mk || "m"}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function importFinanceSnapshotForDepartmentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId?: mongoose.Types.ObjectId | null;
  input: any;
}) {
  const { workspaceId, planId, input: payload } = input;
  const historical = payload?.historical === true;

  const department = String(payload?.department || payload?.dept || "").trim();
  const fiscalYear = String(payload?.fiscalYear || payload?.fy || "").trim();

  if (!planId && (!department || !fiscalYear)) {
    throw Object.assign(new Error("planId or (department + fiscalYear) is required."), { statusCode: 400 });
  }

  let plan = null as any;
  let importMembership: any = null;
  const fyStartMonth = await getWorkspaceFyStartMonth(workspaceId);
  if (historical) {
    // Historical budgets are finalized records imported by finance-side
    // roles for completed fiscal years — no approval flow. Same
    // segregation-of-duties gate as executing payments (canManageAllFinancePayments):
    // Finance, including a manager whose own department is Finance, acts
    // company-wide here — other departments' managers may not.
    importMembership = await getFinanceActorMembership(workspaceId, input.userId);
    if (!canManageAllFinancePayments(importMembership)) {
      throw Object.assign(new Error("Only privileged finance roles can import historical budget records."), { statusCode: 403 });
    }
    if (!isPastFiscalYear(fiscalYear, fyStartMonth)) {
      throw Object.assign(new Error("Historical import is only available for fully completed past fiscal years."), { statusCode: 400 });
    }
  }

  if (planId) {
    plan = await DepartmentFinancePlan.findById(planId).exec();
    if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
    if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
    if (historical) {
      if (plan.isHistorical !== true) {
        throw Object.assign(new Error("A live budget already exists for this department and fiscal year. Historical import cannot overwrite it."), { statusCode: 409 });
      }
      plan.historicalImportedAt = new Date();
      plan.historicalImportedByUserId = input.userId;
      await plan.save();
    } else {
      importMembership = await assertActorOwnsDepartment(workspaceId, input.userId, safeString((plan as any).department));
      // Import replaces the plan's expense rows. Department members may do that
      // only while the current annual-budget revision is still a Draft.
      if (
        !DEPARTMENT_FINANCE_PRIVILEGED_ROLES.has(normalizeFinanceRoleName(importMembership?.role)) &&
        safeString((plan as any).status).toLowerCase() !== "draft"
      ) {
        throw Object.assign(new Error("Bulk import is allowed only while the annual budget is a Draft. Create a revision before importing changes."), { statusCode: 409 });
      }
      assertPlanIsMutable(plan);
    }
  } else {
    if (historical) {
      plan = await DepartmentFinancePlan.findOne({ workspaceId, fiscalYear, department }).exec();
      if (plan && plan.isHistorical !== true) {
        throw Object.assign(new Error("A live budget already exists for this department and fiscal year. Historical import cannot overwrite it."), { statusCode: 409 });
      }
      if (plan && plan.isHistorical === true) {
        throw Object.assign(new Error("A historical record already exists for this department and fiscal year and cannot be re-imported."), { statusCode: 409 });
      }
    } else {
      importMembership = await assertActorOwnsDepartment(workspaceId, input.userId, department);
      plan = await DepartmentFinancePlan.findOne({ workspaceId, fiscalYear, department }).exec();
      if (plan) {
        if (
          !DEPARTMENT_FINANCE_PRIVILEGED_ROLES.has(normalizeFinanceRoleName(importMembership?.role)) &&
          safeString((plan as any).status).toLowerCase() !== "draft"
        ) {
          throw Object.assign(new Error("Bulk import is allowed only while the annual budget is a Draft. Create a revision before importing changes."), { statusCode: 409 });
        }
        assertPlanIsMutable(plan);
      }
    }
    if (!plan) {
      const importedAt = new Date();
      const importedByRoleName = safeString((importMembership?.role as any)?.name || importMembership?.role || "Finance");
      // create minimal empty plan (Phase1 already creates via POST budget-request, but import should also be able to bootstrap)
      plan = await DepartmentFinancePlan.create({
        snapshotId: new mongoose.Types.ObjectId(),
        workspaceId,
        planKey: new mongoose.Types.ObjectId().toString(),
        department,
        managerName: "",
        fiscalYear,
        requestId: "",
        status: historical ? "Approved" : "Draft",
        isHistorical: historical,
        historicalImportedAt: historical ? importedAt : null,
        historicalImportedByUserId: historical ? input.userId : null,
        historicalImportedByName: historical ? importedByRoleName : "",
        previousSpend: 0,
        annualBudgetRequested: 0,
        approvedAnnualBudget: 0,
        notes: historical ? safeString(payload?.notes, "Imported historical record.") : "",
        submittedByUserId: input.userId,
        submittedByName: historical ? "Historical Import" : "",
        submittedAt: importedAt,
        submittedAtLabel: historical ? importedAt.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }) : "",
        approvalFlow: historical
          ? {
              owner: { status: "Approved", approverUserId: null, approverName: "Historical Import", decidedAt: importedAt, decidedAtLabel: importedAt.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }), note: "" },
              financeManager: { status: "Approved", approverUserId: null, approverName: "Historical Import", decidedAt: importedAt, decidedAtLabel: importedAt.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }), note: "" },
              finalStatus: "Approved",
              lastDecisionByRole: "",
              lastDecisionAt: null,
              lastDecisionAtLabel: "",
              decisionHistory: [],
            }
          : {
              owner: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
              financeManager: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
              finalStatus: "Pending",
              lastDecisionByRole: "",
              lastDecisionAt: null,
              lastDecisionAtLabel: "",
              decisionHistory: [],
            },
        monthlyPlan: [],
        reminders: [],
      });
    }
  }

  let monthlyEntries = Array.isArray(payload?.monthlyPlan) ? payload.monthlyPlan : Array.isArray(payload?.months) ? payload.months : [];
  if (monthlyEntries.length === 0 && Array.isArray(payload?.records)) {
    const grouped = new Map<string, any>();
    for (const row of payload.records) {
      const month = safeString(row?.month ?? row?.Month ?? row?.MONTH, "");
      const rawMonthKey = safeString(row?.monthKey ?? row?.["Month Key"] ?? month, "");
      if (!rawMonthKey) continue;
      const resolvedMonth = resolveImportedMonth(rawMonthKey, fyStartMonth) ?? resolveImportedMonth(month, fyStartMonth);
      const monthKey = resolvedMonth?.key ?? rawMonthKey;
      const monthLabel = resolvedMonth?.label ?? (month || rawMonthKey);
      if (!grouped.has(normalizeMonthKey(monthKey))) {
        grouped.set(normalizeMonthKey(monthKey), {
          month: monthLabel,
          monthKey,
          title: safeString(row?.budgetTitle ?? row?.["Budget Title"] ?? row?.title ?? row?.Title, monthLabel),
          expenses: [],
        });
      }
      grouped.get(normalizeMonthKey(monthKey)).expenses.push({
        title: safeString(row?.expenseTitle ?? row?.["Expense Title"] ?? row?.title ?? row?.Title, "Imported expense"),
        description: safeString(row?.description ?? row?.Description ?? row?.details ?? row?.Details, ""),
        projectedAmount: safeNumber(row?.projectedAmount ?? row?.["Projected Amount"] ?? row?.amount ?? row?.Amount, 0),
        actualAmount: safeNumber(row?.actualAmount ?? row?.["Actual Amount"] ?? row?.actualSpent ?? row?.["Actual Spent"], 0),
        dueDate: safeString(row?.dueDate ?? row?.["Due Date"], ""),
        paymentStatus: safeString(row?.paymentStatus ?? row?.["Payment Status"], historical ? "Invoice Shared" : "Planned"),
        invoiceNumber: safeString(row?.invoiceNumber ?? row?.["Invoice Number"], ""),
      });
    }
    monthlyEntries = Array.from(grouped.values());
  }
  const vendors = Array.isArray(payload?.vendors) ? payload.vendors : [];

  const planObjectId = (plan as any)._id as mongoose.Types.ObjectId;
  // Replace mode (best-effort): clear existing month expenses for this plan, then rebuild
  await FinanceExpense.deleteMany({ workspaceId, planId: planObjectId } as any);
  // Keep vendors as-is; optional upsert below

  for (const v of vendors) {
    const vendorKey = safeString(v?.vendorKey || v?.importKey || v?.id || "", "");
    const vendorName = safeString(v?.name || v?.vendorName || "", "");
    if (!vendorKey || !vendorName) continue;

    await FinanceVendor.findOneAndUpdate(
      { workspaceId, vendorKey },
      {
        $set: {
          name: vendorName,
          contactPerson: safeString(v?.contactPerson, ""),
          phone: safeString(v?.phone, ""),
          email: safeString(v?.email, ""),
          address: safeString(v?.address, ""),
          paymentTerms: safeString(v?.paymentTerms, ""),
          category: safeString(v?.category, ""),
          gstin: safeString(v?.gstin, ""),
          panNumber: safeString(v?.panNumber, ""),
          bankName: safeString(v?.bankName, ""),
          accountName: safeString(v?.accountName, ""),
          accountNumber: safeString(v?.accountNumber, ""),
          ifscCode: safeString(v?.ifscCode, ""),
          upiId: safeString(v?.upiId, ""),
          website: safeString(v?.website, ""),
          notes: safeString(v?.notes, ""),
        },
      },
      { upsert: true, new: true }
    );
  }

  for (const m of monthlyEntries) {
    const rawKey = safeString(m?.monthKey || m?.month || "", "");
    const resolvedMonth = resolveImportedMonth(rawKey, fyStartMonth) ?? resolveImportedMonth(safeString(m?.month || "", ""), fyStartMonth);
    const monthKey = resolvedMonth?.key ?? rawKey;
    const month = resolvedMonth?.label ?? safeString(m?.month || m?.title || monthKey, "");
    if (!monthKey || !month) continue;

    const expenses = Array.isArray(m?.expenses) ? m.expenses : [];
    for (const e of expenses) {
      const projectedAmount = safeNumber(e?.projectedAmount ?? e?.amount ?? e?.estimatedAmount, 0);
      const actualAmount = safeNumber(e?.actualAmount ?? 0, 0);

      const expense = await FinanceExpense.create({
        workspaceId,
        planId: planObjectId,
        expenseKey: `EXP-${plan.planKey}-${normalizeMonthKey(monthKey)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        importKey: safeString(e?.importKey, ""),
        title: safeString(e?.title, ""),
        description: safeString(e?.description, ""),
        monthKey,
        month,
        date: normalizeImportedDate(e?.date),
        dueDate: normalizeImportedDate(e?.dueDate) || buildDefaultDueDate(monthKey, safeString((plan as any).fiscalYear), fyStartMonth),
        projectedAmount,
        actualAmount,
        savings: Math.max(0, projectedAmount - actualAmount),
        paymentStatus: safeString(e?.paymentStatus, historical ? "Invoice Shared" : "Planned"),
        invoiceNumber: safeString(e?.invoiceNumber, ""),
        invoiceFile: safeString(e?.invoiceFile, ""),
        invoiceUrl: safeString(e?.invoiceUrl, ""),
        invoicePublicId: safeString(e?.invoicePublicId, ""),
        sourceSheet: safeString(e?.sourceSheet, ""),
        sourceRowNumber: Number(e?.sourceRowNumber ?? 0),
        expenseTag: normalizeExpenseTag(e?.expenseTag),
        vendorId: safeString(e?.vendorId, ""),
        vendorObjectId: null,
        vendorName: safeString(e?.vendorName, ""),
        vendorContactPerson: safeString(e?.vendorContactPerson, ""),
        vendorEmail: safeString(e?.vendorEmail, ""),
        vendorPhone: safeString(e?.vendorPhone, ""),
        vendorAddress: safeString(e?.vendorAddress, ""),
        vendorPaymentTerms: safeString(e?.vendorPaymentTerms, ""),
        vendorCategory: safeString(e?.vendorCategory, ""),
        vendorGstin: safeString(e?.vendorGstin, ""),
        vendorPanNumber: safeString(e?.vendorPanNumber, ""),
        vendorBankName: safeString(e?.vendorBankName, ""),
        vendorAccountName: safeString(e?.vendorAccountName, ""),
        vendorAccountNumber: safeString(e?.vendorAccountNumber, ""),
        vendorIfscCode: safeString(e?.vendorIfscCode, ""),
        vendorUpiId: safeString(e?.vendorUpiId, ""),
        vendorWebsite: safeString(e?.vendorWebsite, ""),
        vendorImportKey: "",
        notes: "",
      });
    }
  }

  await syncMonthlyPlanFromFinanceExpenses(planObjectId);

  // Historical imports also create/update a matching APPROVED annual request
  // so the record flows through the existing FM/Founder lists and dashboards.
  if (historical) {
    const importedAt = new Date();
    const importedByRoleName = safeString((importMembership?.role as any)?.name || importMembership?.role || "Finance");
    const importedAtLabel = importedAt.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" });
    const historicalFlow = {
      owner: { status: "Approved", approverUserId: null, approverName: "Historical Import", decidedAt: importedAt, decidedAtLabel: importedAtLabel, note: "" },
      financeManager: { status: "Approved", approverUserId: null, approverName: "Historical Import", decidedAt: importedAt, decidedAtLabel: importedAtLabel, note: "" },
      finalStatus: "Approved",
      lastDecisionByRole: "",
      lastDecisionAt: null,
      lastDecisionAtLabel: "",
      decisionHistory: [],
    };
    const totalProjected = (Array.isArray(monthlyEntries) ? monthlyEntries : []).reduce(
      (sum: number, m: any) => sum + (Array.isArray(m?.expenses) ? m.expenses : []).reduce((s: number, e: any) => s + safeNumber(e?.projectedAmount ?? e?.amount ?? e?.estimatedAmount, 0), 0),
      0
    );
    plan.annualBudgetRequested = totalProjected;
    plan.approvedAnnualBudget = totalProjected;

    let request = plan.requestId
      ? await AnnualFinanceRequest.findById(plan.requestId).exec()
      : await AnnualFinanceRequest.findOne({ workspaceId, department: plan.department, fiscalYear: plan.fiscalYear }).exec();
    if (!request) {
      request = await AnnualFinanceRequest.create({
        snapshotId: plan.snapshotId,
        workspaceId,
        requestKey: `HIST-${Date.now()}-${String(plan.planKey).slice(-8)}`,
        department: plan.department,
        fiscalYear: plan.fiscalYear,
        requestedBudget: totalProjected,
        previousSpend: safeNumber((plan as any).previousSpend, 0),
        status: "Approved",
        breakdown: safeString(payload?.notes, "Imported historical record."),
        submittedByUserId: input.userId,
        submittedByName: "Historical Import",
        submittedAt: importedAt,
        submittedAtLabel: importedAtLabel,
        revision: 1,
        approvalFlow: historicalFlow,
        isHistorical: true,
        historicalImportedAt: importedAt,
        historicalImportedByName: importedByRoleName,
      } as any);
    } else {
      request.status = "Approved";
      request.requestedBudget = totalProjected;
      (request as any).approvalFlow = historicalFlow;
      (request as any).isHistorical = true;
      (request as any).historicalImportedAt = importedAt;
      (request as any).historicalImportedByName = importedByRoleName;
      await request.save();
    }
    plan.requestId = String((request as any)._id);
  }

  // Ensure plan.reminders exists
  if (!Array.isArray(plan.reminders)) plan.reminders = [];

  return {
    plan,
    updated: true,
  };
}

// An Add-on line is spendable only after its month's extra budget request has
// been APPROVED by both approvers (owner + finance manager scopes).
async function hasApprovedExtraForMonth(
  plan: any,
  workspaceId: mongoose.Types.ObjectId,
  monthKey: string
): Promise<boolean> {
  return !!(await ExtraFinanceRequest.exists({
    workspaceId,
    department: safeString((plan as any).department),
    fiscalYear: safeString((plan as any).fiscalYear),
    monthKey: safeString(monthKey),
    status: "Approved",
  }));
}

export async function submitVendorForDepartmentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  input: any;
}) {
  const { workspaceId, input: payload } = input;

  let planId = payload?.planId;
  const monthKey = safeString(payload?.monthKey || "", "");
  const vendorId = safeString(payload?.vendorId || payload?.vendorKey || "", "");
  const name = safeString(payload?.name || payload?.vendorName || "", "");

  if (!planId) throw Object.assign(new Error("planId is required."), { statusCode: 400 });
  if (!name) throw Object.assign(new Error("vendor name is required."), { statusCode: 400 });

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  assertPlanIsMutable(plan);
  const membership = await assertActorOwnsDepartment(workspaceId, input.userId, safeString((plan as any).department));
  assertPlanAllowsSpend(safeString((plan as any).status), membership?.role);

  if (payload?.actualAmount !== undefined && safeNumber(payload.actualAmount, 0) < 0) {
    throw Object.assign(new Error("Actual amount cannot be negative."), { statusCode: 400 });
  }

  const vendorKey = vendorId || `VND-${plan.planKey}-${normalizeMonthKey(monthKey)}-${Math.floor(Math.random() * 900) + 100}`;

  const vendorDoc = await FinanceVendor.findOneAndUpdate(
    { workspaceId, vendorKey },
    {
      $set: {
        name,
        contactPerson: safeString(payload?.contactPerson, ""),
        phone: safeString(payload?.phone, ""),
        email: safeString(payload?.email, ""),
        address: safeString(payload?.address, ""),
        paymentTerms: safeString(payload?.paymentTerms, ""),
        category: safeString(payload?.category, ""),
        gstin: safeString(payload?.gstin, ""),
        panNumber: safeString(payload?.panNumber, ""),
        bankName: safeString(payload?.bankName, ""),
        accountName: safeString(payload?.accountName, ""),
        accountNumber: safeString(payload?.accountNumber, ""),
        ifscCode: safeString(payload?.ifscCode, ""),
        upiId: safeString(payload?.upiId, ""),
        website: safeString(payload?.website, ""),
        notes: safeString(payload?.notes, ""),
      },
    },
    { upsert: true, new: true }
  ).exec();

  const expenseId = safeString(payload?.expenseId || "", "");
  const actualAmount = payload?.actualAmount !== undefined ? safeNumber(payload.actualAmount, 0) : undefined;
  const vendorFieldSet = {
    vendorId: vendorKey,
    vendorName: name,
    vendorContactPerson: safeString(payload?.contactPerson, ""),
    vendorEmail: safeString(payload?.email, ""),
    vendorPhone: safeString(payload?.phone, ""),
    vendorAddress: safeString(payload?.address, ""),
    vendorPaymentTerms: safeString(payload?.paymentTerms, ""),
    vendorCategory: safeString(payload?.category, ""),
    vendorGstin: safeString(payload?.gstin, ""),
    vendorPanNumber: safeString(payload?.panNumber, ""),
    vendorBankName: safeString(payload?.bankName, ""),
    vendorAccountName: safeString(payload?.accountName, ""),
    vendorAccountNumber: safeString(payload?.accountNumber, ""),
    vendorIfscCode: safeString(payload?.ifscCode, ""),
    vendorUpiId: safeString(payload?.upiId, ""),
    vendorWebsite: safeString(payload?.website, ""),
  };

  if (expenseId && monthKey) {
    const existingExpense = await FinanceExpense.findOne(
      { workspaceId, planId, expenseKey: expenseId, monthKey: safeString(monthKey) }
    ).exec();
    const existingIsAddon =
      !!existingExpense && normalizeExpenseTag(safeString(existingExpense.expenseTag)) === "add-on";
    if (existingIsAddon) {
      const approved = await hasApprovedExtraForMonth(plan, workspaceId, monthKey);
      if (!approved) {
        throw Object.assign(
          new Error("This extra budget request is not approved yet. Founder and finance manager approval is required before recording costs against it."),
          { statusCode: 403 }
        );
      }
    }
    const set: any = { ...vendorFieldSet };
    if (actualAmount !== undefined && existingExpense) {
      // Strict line-item model: an expense's actual can never exceed its own
      // approved projection. Extra needs live on their own approved Add-on line.
      const projected = safeNumber(existingExpense.projectedAmount, 0);
      const maxActual = projected;
      if (actualAmount > maxActual + 0.009) {
        throw Object.assign(
          new Error(
            existingIsAddon
              ? `Actual cost cannot exceed this Add-on line's approved amount (${projected.toLocaleString()}). File a new extra budget request for additional funds.`
              : `Actual cost cannot exceed the projected amount (${projected.toLocaleString()}). File an extra budget request for the additional funds — it becomes its own approved line.`
          ),
          { statusCode: 409 }
        );
      }
      set.actualAmount = actualAmount;
      set.savings = Math.max(0, projected - actualAmount);
    }
    await FinanceExpense.updateOne(
      { workspaceId, planId, expenseKey: expenseId, monthKey: safeString(monthKey) },
      { $set: set }
    );
  } else if (monthKey) {
    // best-effort: apply vendor to all planned regular expenses for the month
    // in this plan if vendorName is empty — Add-on (amendment) rows excluded.
    const targetExpenses = await FinanceExpense.find(
      { workspaceId, planId, monthKey: safeString(monthKey), vendorName: "" },
      "projectedAmount expenseTag"
    ).lean();
    const applicable = targetExpenses.filter(
      (t) => normalizeExpenseTag(safeString((t as any).expenseTag)) !== "add-on"
    );
    const applicableKeys = applicable.map((t) => String(t.expenseKey));
    if (applicableKeys.length === 0) {
      throw Object.assign(
        new Error("Extra budgets are amendments, not spendable expenses. Record the actual cost against your regular expense line for that month."),
        { statusCode: 403 }
      );
    }
    if (actualAmount !== undefined) {
      const overLimit = applicable.some((t) => actualAmount > safeNumber(t.projectedAmount, 0) + 0.009);
      if (overLimit) {
        throw Object.assign(
          new Error("Actual cost exceeds the projected amount of the expense. File an extra budget request for the additional funds — it becomes its own approved line."),
          { statusCode: 409 }
        );
      }
      await FinanceExpense.updateMany(
        { workspaceId, planId, monthKey: safeString(monthKey), vendorName: "", expenseKey: { $in: applicableKeys } },
        [
          {
            $set: {
              ...vendorFieldSet,
              actualAmount,
              savings: { $max: [0, { $subtract: ["$projectedAmount", actualAmount] }] },
            },
          },
        ]
      );
    } else {
      await FinanceExpense.updateMany(
        { workspaceId, planId, monthKey: safeString(monthKey), vendorName: "", expenseKey: { $in: applicableKeys } },
        { $set: vendorFieldSet }
      );
    }
  }

  const reminderMonthKey = monthKey || "general";
  const reminderId = buildPlanReminderId(plan, reminderMonthKey);
  const reminder = {
    id: reminderId,
    importKey: "",
    monthKey: reminderMonthKey,
    message: `Vendor ${name} saved for ${plan.department}${monthKey ? ` (${monthKey})` : ""}.`,
    status: "Sent",
    sentAtLabel: new Date().toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }),
  };

  if (!Array.isArray(plan.reminders)) plan.reminders = [];
  plan.reminders.unshift(reminder as any);
  await plan.save();

  return { plan, vendor: vendorDoc };
}

export async function submitExtraBudgetForDepartmentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  input: any;
}) {
  const { workspaceId, input: payload } = input;

  const planId = payload?.planId;
  const monthKey = safeString(payload?.monthKey || payload?.month || "", "");
  const amount = safeNumber(payload?.amount, 0);
  const title = safeString(payload?.title, "");
  // Two amendment types: "new" adds a fresh line; "increase" tops up an
  // EXISTING projected line (its projection is raised once fully approved).
  const requestType = normalizeExpenseTag(safeString(payload?.type)) === "increase" ? "increase" : "new";
  const targetExpenseKey = safeString(payload?.targetExpenseKey || "", "");

  const dueDate = safeString(payload?.dueDate, "");
  if (!monthKey) throw Object.assign(new Error("monthKey is required."), { statusCode: 400 });
  if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error("amount must be > 0."), { statusCode: 400 });
  if (requestType === "new" && !title) {
    throw Object.assign(new Error("Expense title is required for a new extra budget request."), { statusCode: 400 });
  }
  if (requestType === "increase" && !targetExpenseKey) {
    throw Object.assign(new Error("Select the budget line that exceeded its projection."), { statusCode: 400 });
  }

  let plan = planId ? await DepartmentFinancePlan.findById(planId).exec() : null;
  if (!plan && payload?.department && payload?.fiscalYear) {
    plan = await DepartmentFinancePlan.findOne({
      workspaceId,
      department: safeString(payload.department),
      fiscalYear: safeString(payload.fiscalYear),
    }).exec();
  }
  if (!plan) {
    throw Object.assign(new Error("Submit the annual budget before requesting an extra budget."), { statusCode: 409 });
  }
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  assertPlanIsMutable(plan);
  await assertActorOwnsDepartment(workspaceId, input.userId, safeString((plan as any).department));

  if (requestType === "increase") {
    // Increase requests amend an EXISTING line — no new expense row is created
    // here. The target line's projection is raised automatically once BOTH
    // approvers have signed off (see applyFinanceApprovalDecisionInternal).
    let targetExpense: any = null;
    if (planId) {
      targetExpense = await FinanceExpense.findOne({
        workspaceId,
        planId: plan._id,
        expenseKey: targetExpenseKey,
        monthKey,
      }).exec();
    }
    if (!targetExpense) {
      throw Object.assign(new Error("Target budget line not found in the selected month."), { statusCode: 404 });
    }

    const submittedAtLabel = new Date().toLocaleDateString("en-IN", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const extraRequest = await ExtraFinanceRequest.create({
      snapshotId: plan.snapshotId,
      workspaceId,
      requestKey: `INCREASE-${safeString(plan.department).slice(0, 8).toUpperCase()}-${Date.now()}`,
      date: safeString(payload?.date, submittedAtLabel),
      department: plan.department,
      fiscalYear: plan.fiscalYear,
      amount,
      title: safeString(targetExpense.title || "", ""),
      reason: safeString(payload?.reason || "", ""),
      type: "increase",
      targetExpenseKey,
      targetTitle: safeString(targetExpense.title || "", ""),
      monthKey,
      month: safeString(payload?.month || monthKey, ""),
      dueDate,
      submittedByUserId: input.userId,
      submittedByName: safeString(payload?.submittedByName, ""),
      submittedAt: new Date(),
      submittedAtLabel,
      currentRemaining: amount,
      status: "Pending",
      approvalFlow: {
        owner: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
        financeManager: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
        finalStatus: "Pending",
        lastDecisionByRole: "",
        lastDecisionAt: null,
        lastDecisionAtLabel: "",
        decisionHistory: [],
      },
    });

    return { plan, extraRequest };
  }

  // The request is the approval record. Its spendable Add-on expense is created
  // only after both approvers sign off, then linked back through appliedExpenseId.
  const submittedAtLabel = new Date().toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const extraRequest = await ExtraFinanceRequest.create({
    snapshotId: plan.snapshotId,
    workspaceId,
    requestKey: `EXTRA-${safeString(plan.department).slice(0, 8).toUpperCase()}-${Date.now()}`,
    date: safeString(payload?.date, submittedAtLabel),
    department: plan.department,
    fiscalYear: plan.fiscalYear,
    amount: amount,
    title,
    reason: safeString(payload?.reason, ""),
    type: "new",
    monthKey,
    month: safeString(payload?.month || monthKey, ""),
    dueDate,
    submittedByUserId: input.userId,
    submittedByName: safeString(payload?.submittedByName, ""),
    submittedAt: new Date(),
    submittedAtLabel,
    currentRemaining: amount,
    status: "Pending",
    approvalFlow: {
      owner: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
      financeManager: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
      finalStatus: "Pending",
      lastDecisionByRole: "",
      lastDecisionAt: null,
      lastDecisionAtLabel: "",
      decisionHistory: [],
    },
  });

  const reminderId = buildPlanReminderId(plan, monthKey);
  const sentAtLabel = new Date().toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" });
  // Use updateOne with $push to avoid version conflict with syncMonthlyPlanFromFinanceExpenses
  await DepartmentFinancePlan.updateOne(
    { _id: plan._id },
    {
      $push: {
        reminders: {
          $each: [{
            id: reminderId,
            importKey: "",
            monthKey,
            message: `Extra budget request ${extraRequest.requestKey} submitted for ${plan.department} (${monthKey}).`,
            status: "Sent",
            sentAtLabel,
          }],
          $position: 0,
        },
      },
    }
  ).exec();

  return { plan, extraRequest };
}

export async function uploadInvoiceForDepartmentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  input: any;
}) {
  const { workspaceId, input: payload } = input;

  const planId = payload?.planId;
  const expenseKey = safeString(payload?.expenseKey || payload?.expenseId || "", "");
  const monthKey = safeString(payload?.monthKey || payload?.month || "", "");
  const invoiceNumber = safeString(payload?.invoiceNumber || payload?.invoiceNo || "", "");
  const invoiceAmount = safeNumber(payload?.invoiceAmount ?? payload?.amount, 0);
  // Request-stage mode: attach a proof invoice to a PENDING extra/increase
  // request so approvers can review it before deciding.
  const requestId = safeString(payload?.requestId || "", "");
  if (!planId) throw Object.assign(new Error("planId is required."), { statusCode: 400 });

  const invoiceUrl = safeString(payload?.invoiceUrl || payload?.invoiceFile || "", "");
  const invoicePublicId = safeString(payload?.invoicePublicId || "", "");
  const invoiceFile = safeString(payload?.invoiceFile || "", "");

  if (requestId) {
    const requestObjectId = asObjectId(requestId);
    if (!requestObjectId) throw Object.assign(new Error("Invalid requestId."), { statusCode: 400 });
    await assertActorOwnsDepartment(workspaceId, input.userId, safeString(payload?.department || ""));
    const updatedRequest = await ExtraFinanceRequest.findOneAndUpdate(
      { _id: requestObjectId, workspaceId },
      {
        $set: {
          invoiceNumber,
          invoiceUrl,
          invoiceFile,
          invoicePublicId,
        },
      },
      { new: true }
    ).exec();
    if (!updatedRequest) throw Object.assign(new Error("Extra budget request not found."), { statusCode: 404 });
    return { extraRequest: updatedRequest };
  }

  if (!expenseKey) throw Object.assign(new Error("expenseKey is required."), { statusCode: 400 });
  if (!invoiceNumber) throw Object.assign(new Error("invoiceNumber is required."), { statusCode: 400 });
  if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
    throw Object.assign(new Error("invoiceAmount must be greater than zero."), { statusCode: 400 });
  }

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  assertPlanIsMutable(plan);
  await assertActorOwnsDepartment(workspaceId, input.userId, safeString((plan as any).department));

  // Uploading an invoice only completes the lifecycle once the expense is
  // already paid ("Payment Done - Invoice Pending" -> "Invoice Shared"). For a
  // department paying invoice-first, keep the pending/planned status so the
  // subsequent "mark paid" transition stays forward.
  const existingExpense = await FinanceExpense.findOne({ workspaceId, planId, expenseKey, monthKey: monthKey || undefined }).exec();
  if (!existingExpense) throw Object.assign(new Error("Expense not found for invoice upload."), { statusCode: 404 });

  const invoices: any[] = Array.isArray((existingExpense as any).invoices)
    ? (existingExpense as any).invoices.map((invoice: any) => invoice?.toObject ? invoice.toObject() : { ...invoice })
    : [];

  // Preserve an existing pre-migration invoice as the first history entry.
  if (invoices.length === 0 && safeString((existingExpense as any).invoiceNumber)) {
    invoices.push({
      invoiceKey: `LEGACY-${existingExpense._id}`,
      invoiceNumber: safeString((existingExpense as any).invoiceNumber),
      amount: safeNumber((existingExpense as any).actualAmount, 0),
      invoiceFile: safeString((existingExpense as any).invoiceFile),
      invoiceUrl: safeString((existingExpense as any).invoiceUrl || (existingExpense as any).invoiceFile),
      invoicePublicId: safeString((existingExpense as any).invoicePublicId),
      uploadedByUserId: null,
      uploadedAt: (existingExpense as any).updatedAt || (existingExpense as any).createdAt || new Date(),
      uploadedAtLabel: "Legacy invoice",
    });
  }

  if (invoices.some((invoice: any) => safeString(invoice?.invoiceNumber).toLowerCase() === invoiceNumber.toLowerCase())) {
    throw Object.assign(new Error("This invoice number is already attached to the expense."), { statusCode: 409 });
  }

  const nextInvoicedAmount = invoices.reduce((sum: number, invoice: any) => sum + safeNumber(invoice?.amount, 0), 0) + invoiceAmount;
  const projectedAmount = safeNumber((existingExpense as any).projectedAmount, 0);
  const vendorActualAmount = safeNumber((existingExpense as any).actualAmount, 0);
  const invoiceLimit = vendorActualAmount > 0 ? vendorActualAmount : projectedAmount;
  if (nextInvoicedAmount > invoiceLimit + 0.009) {
    throw Object.assign(
      new Error(`Invoice total cannot exceed the ${vendorActualAmount > 0 ? "vendor actual amount" : "approved projection"} (${invoiceLimit.toLocaleString()}).`),
      { statusCode: 409 }
    );
  }

  const uploadedAt = new Date();
  invoices.push({
    invoiceKey: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    invoiceNumber,
    amount: invoiceAmount,
    invoiceFile,
    invoiceUrl,
    invoicePublicId,
    uploadedByUserId: input.userId,
    uploadedAt,
    uploadedAtLabel: formatBillingDateLabel(uploadedAt),
  });

  (existingExpense as any).invoices = invoices;
  existingExpense.invoiceNumber = invoiceNumber;
  existingExpense.invoiceFile = invoiceFile;
  existingExpense.invoiceUrl = invoiceUrl;
  existingExpense.invoicePublicId = invoicePublicId;
  if (getPaymentStatusRank(safeString((existingExpense as any).paymentStatus)) >= 2) {
    existingExpense.paymentStatus = "Invoice Shared";
  }
  const updated = await existingExpense.save();

  if (!Array.isArray(plan.reminders)) plan.reminders = [];
  plan.reminders.unshift({
    id: buildPlanReminderId(plan, updated.monthKey || monthKey || ""),
    importKey: "",
    monthKey: updated.monthKey || monthKey || "",
    message: `${updated.title || "Expense"} invoice uploaded.`,
    status: "Sent",
    sentAtLabel: new Date().toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }),
  } as any);

  await plan.save();
  await syncMonthlyPlanFromFinanceExpenses((plan._id as unknown) as mongoose.Types.ObjectId);
  return { plan, expense: updated };
}

export async function sendReminderForDepartmentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  input: any;
}) {
  const { workspaceId, input: payload } = input;

  const planId = payload?.planId;
  const monthKey = safeString(payload?.monthKey || "", "");
  const expenseKey = safeString(payload?.expenseKey || payload?.expenseId || "", "");
  const message = safeString(payload?.message, "");

  if (!planId) throw Object.assign(new Error("planId is required."), { statusCode: 400 });

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  await assertActorOwnsDepartment(workspaceId, input.userId, safeString((plan as any).department));

  let resolvedMessage = message;
  if (!resolvedMessage && expenseKey) {
    const exp = await FinanceExpense.findOne({ workspaceId, planId, expenseKey }).exec();
    resolvedMessage = safeString(payload?.message, `${exp?.title || "Expense"} reminder shared with finance.`);
  }
  const reminderMonthKey = monthKey || "general";
  if (!resolvedMessage) resolvedMessage = `${plan.department} finance reminder.`;

  const reminder = {
    id: buildPlanReminderId(plan, reminderMonthKey),
    importKey: "",
    monthKey: reminderMonthKey,
    message: resolvedMessage,
    status: getAllowedReminderStatus(payload?.status || "Sent"),
    sentAtLabel: new Date().toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }),
  };

  if (!Array.isArray(plan.reminders)) plan.reminders = [];
  plan.reminders.unshift(reminder as any);
  await plan.save();

  return { plan, reminders: plan.reminders };
}

// ============================================================================
// Owner Dashboard Snapshot
// ============================================================================

function formatMoneyLabel(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function normalizeDepartmentKey(value: string) {
  return value.toString().trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

function getFiscalYearLabel(startYear?: number, fyStartMonth = 4) {
  const safeStartYear = Number(startYear);
  const now = new Date();
  const currentYear = now.getFullYear();
  const resolvedStartYear = Number.isFinite(safeStartYear)
    ? safeStartYear
    : (now.getMonth() + 1 >= fyStartMonth ? currentYear : currentYear - 1);
  // A January fiscal start spans a single calendar year → "FY 2026".
  if (fyStartMonth === 1) return `FY ${resolvedStartYear}`;
  const nextYear = resolvedStartYear + 1;
  return `FY ${resolvedStartYear}-${String(nextYear).slice(-2)}`;
}

async function getCurrentFiscalYearLabel(workspaceId: mongoose.Types.ObjectId) {
  const fyStartMonth = await getWorkspaceFyStartMonth(workspaceId);
  return getFiscalYearLabel(undefined, fyStartMonth);
}

export async function listFinanceSnapshotForManagerInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  fiscalYear?: string;
}) {
  const { workspaceId } = input;
  const fiscalYear = input.fiscalYear || (await getCurrentFiscalYearLabel(workspaceId));

  const plans = await DepartmentFinancePlan.find({ workspaceId, fiscalYear }).lean();
  const annualRequests = await AnnualFinanceRequest.find({ workspaceId, fiscalYear }).lean();
  const extraRequests = await ExtraFinanceRequest.find({ workspaceId, fiscalYear }).lean();

  // DepartmentFinancePlan.monthlyPlan doesn't embed line-item expenses — those live in the
  // separate FinanceExpense collection, keyed by planId. Join them in so the snapshot actually
  // carries expense data (paid invoices, vendors) for the Expense History tab and used-budget totals.
  const planIds = plans.map((plan: any) => plan._id);
  const planExpenses = planIds.length > 0
    ? await FinanceExpense.find({ workspaceId, planId: { $in: planIds } }).lean()
    : [];
  const expensesByPlanAndMonth = new Map<string, any[]>();
  for (const expense of planExpenses) {
    const key = `${expense.planId}|${normalizeMonthKey(expense.monthKey)}`;
    if (!expensesByPlanAndMonth.has(key)) expensesByPlanAndMonth.set(key, []);
    expensesByPlanAndMonth.get(key)!.push({
      ...expense,
      id: expense.expenseKey,
      actualSpent: safeNumber(expense.actualAmount, 0),
      variance: safeNumber(expense.projectedAmount, 0) - safeNumber(expense.actualAmount, 0),
      status: safeString(expense.paymentStatus, "Planned"),
    });
  }
  const plansWithExpenses = plans.map((plan: any) => ({
    ...plan,
    monthlyPlan: (Array.isArray(plan.monthlyPlan) ? plan.monthlyPlan : []).map((month: any) => {
      const expenses = expensesByPlanAndMonth.get(`${plan._id}|${normalizeMonthKey(month.monthKey || month.month)}`) || [];
      const actualSpent = expenses.reduce((sum: number, expense: any) => sum + safeNumber(expense.actualAmount, 0), 0);
      const projectedBudget = safeNumber(month.projectedBudget, 0);
      return {
        ...month,
        actualSpent,
        savings: Math.max(0, projectedBudget - actualSpent),
        expenses,
      };
    }),
  }));

  const departments = plansWithExpenses.map((plan: any, index: number) => {
    const monthlyPlan = Array.isArray(plan.monthlyPlan) ? plan.monthlyPlan : [];
    const spentYTD = monthlyPlan.reduce((sum: number, m: any) => sum + safeNumber(m.actualSpent, 0), 0);
    const approvedBudget = safeNumber(plan.approvedAnnualBudget, 0);
    const totalBudget = approvedBudget || safeNumber(plan.annualBudgetRequested, 0);
    const health = spentYTD > totalBudget ? "Over Budget" : spentYTD > totalBudget * 0.9 ? "Warning" : "Healthy";

    return {
      id: index + 1,
      name: safeString(plan.department),
      approvedBudget: totalBudget,
      spentYTD,
      extraGrantedYTD: 0,
      health,
    };
  });

  const latestAnnualRequests = Array.from(annualRequests.reduce((latestByDepartment: Map<string, any>, request: any) => {
    const key = safeString(request.department).trim().toLowerCase();
    const current = latestByDepartment.get(key);
    const requestRevision = safeNumber(request.revision, 1);
    const currentRevision = safeNumber(current?.revision, 1);
    if (!current || requestRevision > currentRevision || (requestRevision === currentRevision && new Date(request.createdAt || 0).getTime() > new Date(current.createdAt || 0).getTime())) {
      latestByDepartment.set(key, request);
    }
    return latestByDepartment;
  }, new Map<string, any>()).values());

  return {
    fiscalYear,
    departments,
    annualRequests: latestAnnualRequests,
    annualRequestHistory: annualRequests,
    extraRequests,
    departmentFinance: plansWithExpenses,
  };
}

// ============================================================================
// Tenant Billing
// ============================================================================

function formatBillingDateLabel(value: any) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

export async function getTenantBillingSnapshotForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  query?: any;
}) {
  const { workspaceId, query = {} } = input;

  const tenantFilter: any = { workspaceId };
  const fiscalYearRange = parseFiscalYearRange(query.fiscalYear, await getWorkspaceFyStartMonth(workspaceId));
  if (fiscalYearRange) {
    // A tenant belongs to a fiscal year if its contract overlaps that FY's date range.
    tenantFilter.contractStart = { $lte: fiscalYearRange.end };
    tenantFilter.$or = [{ contractEnd: null }, { contractEnd: { $exists: false } }, { contractEnd: { $gte: fiscalYearRange.start } }];
  }

  const tenants = await TenantCompany.find(tenantFilter)
    .sort({ createdAt: -1 })
    .lean();

  const tenantBills = tenants.map((tenant: any) => {
    const billingDetails = tenant.billingDetails || {};
    const companyDetails = tenant.companyDetails || {};
    const packageDetails = tenant.packageDetails || {};
    const invoiceDetails = tenant.invoiceDetails || {};
    const pocDetails = tenant.pocDetails || {};

    const cabinDesks = safeNumber(companyDetails.cabinDesks || packageDetails.cabinDesks);
    const openDesks = safeNumber(companyDetails.openDesks || packageDetails.openDesks);
    const ratePerCabinDesk = safeNumber(companyDetails.ratePerCabinDesk || packageDetails.ratePerCabinDesk);
    const ratePerOpenDesk = safeNumber(companyDetails.ratePerOpenDesk || packageDetails.ratePerOpenDesk);
    const dailyRent = Math.max(0, (cabinDesks * ratePerCabinDesk) + (openDesks * ratePerOpenDesk));
    const monthlyRent = dailyRent > 0 ? dailyRent * 30 : safeNumber(billingDetails.monthlyRent);
    const securityDepositAmount = safeNumber(billingDetails.securityDepositAmount);
    const securityDepositPaidStatus = safeString(billingDetails.securityDepositPaidStatus, "Pending");

    return {
      id: tenant.tenantCode || tenant._id?.toString() || "",
      recordId: tenant._id?.toString() || "",
      companyName: tenant.companyName || "",
      packageName: packageDetails.packageName || tenant.planType || "",
      planType: tenant.planType || "",
      startDate: formatBillingDateLabel(tenant.contractStart),
      startDateAt: tenant.contractStart || null,
      endDate: formatBillingDateLabel(tenant.contractEnd),
      endDateAt: tenant.contractEnd || null,
      contractDurationMonths: safeNumber(billingDetails.contractDurationMonths, 1),
      monthlyRent,
      totalContractAmount: monthlyRent * Math.max(1, safeNumber(billingDetails.contractDurationMonths, 1)),
      securityDepositAmount,
      securityDepositPaidStatus,
      companyDetails: { cabinDesks, openDesks, ratePerCabinDesk, ratePerOpenDesk },
      dailyRent,
      invoiceNumber: invoiceDetails.invoiceNumber || "",
      invoiceFileName: invoiceDetails.invoiceFileName || "",
      invoiceFileUrl: invoiceDetails.invoiceFileUrl || "",
      invoiceStatus: invoiceDetails.invoiceStatus || "Pending",
      invoiceGeneratedAt: invoiceDetails.invoiceGeneratedAt ? formatBillingDateLabel(invoiceDetails.invoiceGeneratedAt) : "",
      invoiceSentAt: invoiceDetails.invoiceSentAt ? formatBillingDateLabel(invoiceDetails.invoiceSentAt) : "",
      invoiceSentToEmail: invoiceDetails.invoiceSentToEmail || "",
      status: securityDepositPaidStatus,
      dueDate: formatBillingDateLabel(tenant.contractStart),
      pocDetails: {
        localPocName: pocDetails.localPocName || "",
        localPocEmail: pocDetails.localPocEmail || "",
        hoPocEmail: pocDetails.hoPocEmail || "",
      },
    };
  });

  const summary = {
    totalTenants: tenantBills.length,
    totalSecurityDeposit: tenantBills.reduce((sum: number, r: any) => sum + safeNumber(r.securityDepositAmount), 0),
    pendingSecurityDeposit: tenantBills
      .filter((r: any) => safeString(r.securityDepositPaidStatus).toLowerCase() !== "paid")
      .reduce((sum: number, r: any) => sum + safeNumber(r.securityDepositAmount), 0),
    paidSecurityDeposit: tenantBills
      .filter((r: any) => safeString(r.securityDepositPaidStatus).toLowerCase() === "paid")
      .reduce((sum: number, r: any) => sum + safeNumber(r.securityDepositAmount), 0),
  };

  return { tenantBills, summary };
}

export async function markTenantSecurityDepositPaidForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tenantCompanyId: string;
  body?: any;
}) {
  const { workspaceId, tenantCompanyId, body = {} } = input;

  const tenantObjectId = asObjectId(tenantCompanyId);
  if (!tenantObjectId) throw Object.assign(new Error("Invalid tenantCompanyId."), { statusCode: 400 });

  const tenant = await TenantCompany.findOne({ _id: tenantObjectId, workspaceId }).exec();
  if (!tenant) throw Object.assign(new Error("Tenant company not found."), { statusCode: 404 });

  const paidStatus = safeString(body.securityDepositPaidStatus || body.status || "Paid").toLowerCase() === "paid" ? "Paid" : "Pending";

  if (!tenant.billingDetails) tenant.billingDetails = {};
  tenant.billingDetails.securityDepositPaidStatus = paidStatus;

  if (!tenant.invoiceDetails) tenant.invoiceDetails = {};
  if (!tenant.invoiceDetails.invoiceNumber) {
    tenant.invoiceDetails.invoiceNumber = `SD-${tenant.tenantCode || tenant._id.toString().slice(-6)}-${Date.now()}`;
  }

  if (paidStatus === "Paid" && !tenant.invoiceDetails.invoiceFileUrl) {
    tenant.invoiceDetails.invoiceStatus = "Generated";
    tenant.invoiceDetails.invoiceGeneratedAt = new Date();
    tenant.invoiceDetails.invoiceFileName = `security-deposit-${tenant.tenantCode || "invoice"}.pdf`;
  }

  await tenant.save();

  return getTenantBillingSnapshotForCurrentUser(input);
}

export async function generateTenantSecurityDepositInvoiceForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tenantCompanyId: string;
}) {
  const { workspaceId, tenantCompanyId } = input;

  const tenantObjectId = asObjectId(tenantCompanyId);
  if (!tenantObjectId) throw Object.assign(new Error("Invalid tenantCompanyId."), { statusCode: 400 });

  const tenant = await TenantCompany.findOne({ _id: tenantObjectId, workspaceId }).exec();
  if (!tenant) throw Object.assign(new Error("Tenant company not found."), { statusCode: 404 });

  if (safeString(tenant.billingDetails?.securityDepositPaidStatus).toLowerCase() !== "paid") {
    throw Object.assign(new Error("Mark the security deposit as paid before generating the invoice."), { statusCode: 409 });
  }

  if (!tenant.invoiceDetails) tenant.invoiceDetails = {};
  tenant.invoiceDetails.invoiceNumber = tenant.invoiceDetails.invoiceNumber || `SD-${tenant.tenantCode || tenant._id.toString().slice(-6)}-${Date.now()}`;
  tenant.invoiceDetails.invoiceStatus = "Generated";
  tenant.invoiceDetails.invoiceGeneratedAt = new Date();
  tenant.invoiceDetails.invoiceFileName = `security-deposit-${tenant.tenantCode || "invoice"}.pdf`;

  await tenant.save();

  return getTenantBillingSnapshotForCurrentUser({ workspaceId });
}

export async function sendTenantSecurityDepositInvoiceForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tenantCompanyId: string;
}) {
  const { workspaceId, tenantCompanyId } = input;

  const tenantObjectId = asObjectId(tenantCompanyId);
  if (!tenantObjectId) throw Object.assign(new Error("Invalid tenantCompanyId."), { statusCode: 400 });

  const tenant = await TenantCompany.findOne({ _id: tenantObjectId, workspaceId }).exec();
  if (!tenant) throw Object.assign(new Error("Tenant company not found."), { statusCode: 404 });

  if (safeString(tenant.billingDetails?.securityDepositPaidStatus).toLowerCase() !== "paid") {
    throw Object.assign(new Error("Mark the security deposit as paid before sending the invoice."), { statusCode: 409 });
  }

  if (!tenant.invoiceDetails) tenant.invoiceDetails = {};
  tenant.invoiceDetails.invoiceNumber = tenant.invoiceDetails.invoiceNumber || `SD-${tenant.tenantCode || tenant._id.toString().slice(-6)}-${Date.now()}`;
  tenant.invoiceDetails.invoiceStatus = "Sent";
  tenant.invoiceDetails.invoiceSentAt = new Date();

  const pocDetails = tenant.pocDetails || {};
  const recipientEmails = [pocDetails.localPocEmail, pocDetails.hoPocEmail, tenant.email].filter(Boolean);
  tenant.invoiceDetails.invoiceSentToEmail = recipientEmails.join(", ");

  try {
    const { sendMail } = await import("../config/mailer.js");
    for (const email of recipientEmails) {
      await sendMail({
        to: email,
        subject: `Security Deposit Invoice - ${tenant.companyName}`,
        text: `Security Deposit Invoice for ${tenant.companyName}`,
        html: `
          <h2>Security Deposit Invoice</h2>
          <p>Dear ${pocDetails.localPocName || tenant.contactName || tenant.companyName},</p>
          <p>Please find the security deposit invoice for ${tenant.companyName}.</p>
          <p><strong>Invoice Number:</strong> ${tenant.invoiceDetails.invoiceNumber}</p>
          <p><strong>Amount:</strong> ₹${safeNumber(tenant.billingDetails?.securityDepositAmount).toLocaleString("en-IN")}</p>
          <p><strong>Status:</strong> ${tenant.invoiceDetails.invoiceStatus}</p>
          <br/>
          <p>Thank you.</p>
        `,
      });
    }
  } catch (error) {
    console.error("[finance] Failed to send invoice email:", error);
  }

  await tenant.save();

  return getTenantBillingSnapshotForCurrentUser({ workspaceId });
}

export async function resetTenantSecurityDepositInvoiceForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tenantCompanyId: string;
}) {
  const { workspaceId, tenantCompanyId } = input;

  const tenantObjectId = asObjectId(tenantCompanyId);
  if (!tenantObjectId) throw Object.assign(new Error("Invalid tenantCompanyId."), { statusCode: 400 });

  const tenant = await TenantCompany.findOne({ _id: tenantObjectId, workspaceId }).exec();
  if (!tenant) throw Object.assign(new Error("Tenant company not found."), { statusCode: 404 });

  tenant.invoiceDetails = {
    invoiceNumber: `SD-${tenant.tenantCode || tenant._id.toString().slice(-6)}-${Date.now()}`,
    invoiceFileName: "",
    invoiceFileUrl: "",
    invoiceFilePublicId: "",
    invoiceStatus: "Pending",
    invoiceGeneratedAt: null,
    invoiceGeneratedBy: null,
    invoiceSentAt: null,
    invoiceSentBy: null,
    invoiceSentToEmail: "",
  };

  await tenant.save();

  return getTenantBillingSnapshotForCurrentUser({ workspaceId });
}

// ============================================================================
// Approval Decisions
// ============================================================================

export async function applyFinanceApprovalDecisionInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  requestType: string;
  requestId: string;
  body: {
    status: "Approved" | "Rejected" | "Discuss";
    scope?: "owner" | "financeManager";
    note?: string;
    temporaryFounderOverride?: boolean;
  };
}) {
  const { workspaceId, userId, requestType, requestId, body } = input;
  const { status, scope = "owner", note = "" } = body;
  const temporaryFounderOverride = body.temporaryFounderOverride === true;

  if (!["Approved", "Rejected", "Discuss"].includes(status)) {
    throw Object.assign(new Error("Invalid status. Must be Approved, Rejected, or Discuss."), { statusCode: 400 });
  }
  if (temporaryFounderOverride && (scope !== "financeManager" || status !== "Approved")) {
    throw Object.assign(new Error("Temporary founder override requires a Finance Manager approval."), { statusCode: 403 });
  }

  const now = new Date();
  const role = scope === "owner" ? "owner" : "financeManager";
  const decision = {
    role,
    status,
    userId: userId.toString(),
    userName: "",
    decidedAt: now,
    decidedAtLabel: formatBillingDateLabel(now),
    note,
  };

  if (requestType === "annual") {
    const requestObjectId = asObjectId(requestId);
    if (!requestObjectId) throw Object.assign(new Error("Invalid requestId."), { statusCode: 400 });

    const record = await AnnualFinanceRequest.findById(requestObjectId).exec();
    if (!record) throw Object.assign(new Error("Annual finance request not found."), { statusCode: 404 });
    if (String(record.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
    if ((record as any).isHistorical === true) {
      throw Object.assign(new Error("Historical records are immutable — they cannot be re-approved or rejected."), { statusCode: 409 });
    }
    if (safeString(record.status).toLowerCase() !== "pending") {
      throw Object.assign(new Error("Only a pending annual budget revision can receive an approval decision."), { statusCode: 409 });
    }
    if ((status === "Rejected" || status === "Discuss") && !safeString(note).trim()) {
      throw Object.assign(new Error(`${status === "Rejected" ? "Rejection" : "Discussion"} reason is required.`), { statusCode: 400 });
    }

    const step = role === "owner" ? "owner" : "financeManager";
    (record.approvalFlow as any)[step] = {
      status,
      approverUserId: userId,
      approverName: "",
      decidedAt: now,
      decidedAtLabel: formatBillingDateLabel(now),
      note,
    };
    if (temporaryFounderOverride) {
      (record.approvalFlow as any).owner = {
        status: "Approved",
        approverUserId: userId,
        approverName: "Finance Manager (temporary founder override)",
        decidedAt: now,
        decidedAtLabel: formatBillingDateLabel(now),
        note: "Temporary override used because Founder was unavailable. Replace with formal delegated approval workflow.",
      };
    }

    if (!Array.isArray((record.approvalFlow as any).decisionHistory)) (record.approvalFlow as any).decisionHistory = [];
    (record.approvalFlow as any).decisionHistory.push(decision);
    if (temporaryFounderOverride) {
      (record.approvalFlow as any).decisionHistory.push({
        ...decision,
        role: "owner_delegate",
        note: "Temporary founder-unavailable override used by Finance Manager.",
      });
    }
    (record.approvalFlow as any).lastDecisionByRole = role;
    (record.approvalFlow as any).lastDecisionAt = now;
    (record.approvalFlow as any).lastDecisionAtLabel = formatBillingDateLabel(now);

    const ownerStep = (record.approvalFlow as any).owner?.status || "Pending";
    const fmStep = (record.approvalFlow as any).financeManager?.status || "Pending";

    if (ownerStep === "Approved" && fmStep === "Approved") {
      (record.approvalFlow as any).finalStatus = "Approved";
      record.status = "Approved";
    } else if (status === "Rejected") {
      (record.approvalFlow as any).finalStatus = "Rejected";
      record.status = "Rejected";
    } else if (status === "Discuss") {
      (record.approvalFlow as any).finalStatus = "Discuss";
      record.status = "Discuss";
    } else {
      (record.approvalFlow as any).finalStatus = "Pending";
      record.status = "Pending";
    }

    await record.save();

    await DepartmentFinancePlan.updateOne(
      { workspaceId, department: record.department, fiscalYear: record.fiscalYear },
      { $set: {
        status: record.status,
        approvedAnnualBudget: record.status === "Approved" ? record.requestedBudget : 0,
        approvalFlow: record.approvalFlow,
        requestId: String(record._id),
      } },
    ).exec();

    return record;
  }

  if (requestType === "extra") {
    const requestObjectId = asObjectId(requestId);
    if (!requestObjectId) throw Object.assign(new Error("Invalid requestId."), { statusCode: 400 });

    const record = await ExtraFinanceRequest.findById(requestObjectId).exec();
    if (!record) throw Object.assign(new Error("Extra finance request not found."), { statusCode: 404 });
    if (String(record.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
    if (safeString(record.status).toLowerCase() !== "pending") {
      throw Object.assign(new Error("Only a pending extra budget revision can receive an approval decision."), { statusCode: 409 });
    }
    const wasApplied = Boolean((record as any).appliedAt);

    const step = role === "owner" ? "owner" : "financeManager";
    (record.approvalFlow as any)[step] = {
      status,
      approverUserId: userId,
      approverName: "",
      decidedAt: now,
      decidedAtLabel: formatBillingDateLabel(now),
      note,
    };
    if (temporaryFounderOverride) {
      (record.approvalFlow as any).owner = {
        status: "Approved",
        approverUserId: userId,
        approverName: "Finance Manager (temporary founder override)",
        decidedAt: now,
        decidedAtLabel: formatBillingDateLabel(now),
        note: "Temporary override used because Founder was unavailable. Replace with formal delegated approval workflow.",
      };
    }

    if (!Array.isArray((record.approvalFlow as any).decisionHistory)) (record.approvalFlow as any).decisionHistory = [];
    (record.approvalFlow as any).decisionHistory.push(decision);
    if (temporaryFounderOverride) {
      (record.approvalFlow as any).decisionHistory.push({
        ...decision,
        role: "owner_delegate",
        note: "Temporary founder-unavailable override used by Finance Manager.",
      });
    }
    (record.approvalFlow as any).lastDecisionByRole = role;
    (record.approvalFlow as any).lastDecisionAt = now;
    (record.approvalFlow as any).lastDecisionAtLabel = formatBillingDateLabel(now);

    const ownerStep = (record.approvalFlow as any).owner?.status || "Pending";
    const fmStep = (record.approvalFlow as any).financeManager?.status || "Pending";

    if (ownerStep === "Approved" && fmStep === "Approved") {
      (record.approvalFlow as any).finalStatus = "Approved";
      record.status = "Approved";
    } else if (status === "Rejected") {
      (record.approvalFlow as any).finalStatus = "Rejected";
      record.status = "Rejected";
    } else if (status === "Discuss") {
      (record.approvalFlow as any).finalStatus = "Discuss";
      record.status = "Discuss";
    } else {
      (record.approvalFlow as any).finalStatus = "Pending";
      record.status = "Pending";
    }

    await record.save();

    // Line-increase amendments auto-raise the target line's projection once
    // fully approved — no manual editing needed.
    if (record.status === "Approved" && !wasApplied) {
      const targetPlan = await DepartmentFinancePlan.findOne({
        workspaceId,
        department: (record as any).department,
        fiscalYear: (record as any).fiscalYear,
      }).exec();
      if (!targetPlan) {
        throw Object.assign(new Error("Department finance plan not found for this request."), { statusCode: 404 });
      }

      if (safeString((record as any).type) === "increase" && safeString((record as any).targetExpenseKey)) {
        const targetExpense = await FinanceExpense.findOne({
          workspaceId,
          planId: targetPlan._id,
          expenseKey: safeString((record as any).targetExpenseKey),
        }).exec();
        if (!targetExpense) {
          throw Object.assign(new Error("Target budget line no longer exists."), { statusCode: 404 });
        }
        const raiseBy = safeNumber((record as any).amount, 0);
        targetExpense.projectedAmount = safeNumber(targetExpense.projectedAmount, 0) + raiseBy;
        targetExpense.savings = Math.max(0, safeNumber(targetExpense.projectedAmount, 0) - safeNumber(targetExpense.actualAmount, 0));
        await targetExpense.save();
        (record as any).appliedExpenseId = targetExpense._id;
      } else if (safeString((record as any).title)) {
        const expenseKey = `EXP-${targetPlan.planKey}-${normalizeMonthKey((record as any).monthKey)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const addOnExpense = await FinanceExpense.create({
          workspaceId,
          planId: targetPlan._id,
          expenseKey,
          importKey: "",
          title: safeString((record as any).title),
          description: safeString((record as any).reason),
          monthKey: safeString((record as any).monthKey),
          month: safeString((record as any).month || (record as any).monthKey),
          date: safeString((record as any).date),
          dueDate: safeString((record as any).dueDate),
          projectedAmount: safeNumber((record as any).amount, 0),
          actualAmount: 0,
          savings: safeNumber((record as any).amount, 0),
          paymentStatus: "Planned",
          expenseTag: "Add-on",
          sourceSheet: "Extra Budget Request",
          sourceRowNumber: 0,
          notes: safeString((record as any).reason),
        });
        (record as any).appliedExpenseId = addOnExpense._id;
      }

      (record as any).appliedAt = new Date();
      await record.save();
      await syncMonthlyPlanFromFinanceExpenses((targetPlan._id as unknown) as mongoose.Types.ObjectId);
    }

    return record;
  }

  throw Object.assign(new Error("Invalid requestType. Must be 'annual' or 'extra'."), { statusCode: 400 });
}
