import mongoose from "mongoose";
import DepartmentFinancePlan from "../models/DepartmentFinancePlan.js";
import FinanceExpense from "../models/FinanceExpense.js";
import FinanceVendor from "../models/FinanceVendor.js";
import FinanceSnapshot from "../models/FinanceSnapshot.js";
import AnnualFinanceRequest from "../models/AnnualFinanceRequest.js";
import ExtraFinanceRequest from "../models/ExtraFinanceRequest.js";
import { TenantCompany } from "../models/TenantCompany.js";

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

function normalizeExpenseTag(tag: string) {
  const t = safeString(tag).toLowerCase();
  return t || "add-on";
}

function ensureMonthlyPlanEntry(plan: any, month: { month: string; monthKey: string; displayOrder?: number }) {
  const monthKeyNorm = normalizeMonthKey(month.monthKey || month.month);
  if (!Array.isArray(plan.monthlyPlan)) plan.monthlyPlan = [];
  const existing = plan.monthlyPlan.find((m: any) => normalizeMonthKey(m.monthKey || m.month) === monthKeyNorm);
  if (existing) return existing;

  const created = {
    month: safeString(month.month),
    monthKey: safeString(month.monthKey || month.month),
    displayOrder: typeof month.displayOrder === "number" ? month.displayOrder : plan.monthlyPlan.length + 1,
    status: "Upcoming",
    projectedBudget: 0,
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

    // projectedBudget: sum of projectedAmount for add-on excluded? In HostPanel model doesn't encode add-on.
    // We'll do: projectedBudget = sum(projectedAmount) for all expenses.
    const projectedBudget = monthExpenses.reduce((sum, exp) => sum + safeNumber(exp.projectedAmount, 0), 0);

    const actualSpent = monthExpenses.reduce((sum, exp) => {
      const paymentStatus = safeString(exp.paymentStatus || exp.status).toLowerCase();
      const actual = safeNumber(exp.actualAmount, 0);
      if (actual > 0 && (paymentStatus.includes("paid") || paymentStatus.includes("done") || paymentStatus.includes("invoice shared") || paymentStatus.includes("invoice"))) {
        return sum + actual;
      }
      // if actual is 0 but paid/done, keep actual at 0; hostpanel doesn't provide separate actual sources
      return sum;
    }, 0);

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

  return {
    department: plan.department,
    fiscalYear: plan.fiscalYear,
    plan,
    monthlyPlan: plan.monthlyPlan,
    reminders: plan.reminders,
    approvalFlow: plan.approvalFlow,
    status: plan.status,
  };
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

  const existing = await DepartmentFinancePlan.findOne({ workspaceId, fiscalYear, department }).exec();
  if (existing) {
    throw Object.assign(new Error("Department finance plan already exists for this fiscal year."), { statusCode: 409 });
  }

  const plan = await DepartmentFinancePlan.create({
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
    monthlyPlan: monthlyPlan.map((m, idx) => ({
      month: safeString(m.month),
      monthKey: safeString(m.monthKey || m.month),
      displayOrder: typeof m.displayOrder === "number" ? m.displayOrder : idx + 1,
      status: "Upcoming",
      projectedBudget: safeNumber(m.projectedBudget, 0),
      actualSpent: 0,
      savings: safeNumber(m.projectedBudget, 0),
      details: safeString(m.details, ""),
      title: safeString(m.title, ""),
      dueDate: safeString(m.dueDate, ""),
    })),
    reminders: [],
  });

  // Also create an AnnualFinanceRequest so the approval/decision endpoint can find it
  const submittedAtLabel = new Date().toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const annualRequest = await AnnualFinanceRequest.create({
    snapshotId: plan.snapshotId,
    workspaceId,
    requestKey: `BUD-${safeString(department).slice(0, 8).toUpperCase()}-${fiscalYear.replace(/[^a-zA-Z0-9]/g, "")}`,
    department,
    requestedBudget: safeNumber(annualBudgetRequested, 0),
    previousSpend: safeNumber(previousSpend, 0),
    status: "Pending",
    breakdown: notes || "",
    submittedByUserId: userId,
    submittedByName: managerName || "",
    submittedAt: new Date(),
    submittedAtLabel,
    approvalFlow: {
      owner: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
      financeManager: { status: "Pending", approverUserId: null, approverName: "", decidedAt: null, decidedAtLabel: "", note: "" },
      finalStatus: "Pending",
      lastDecisionByRole: "",
      lastDecisionAt: null,
      lastDecisionAtLabel: "",
      decisionHistory: [],
    },
    monthlyBreakdown: monthlyPlan.map((m, idx) => ({
      monthKey: safeString(m.monthKey || m.month),
      month: safeString(m.month),
      title: safeString(m.title, ""),
      amount: safeNumber(m.projectedBudget, 0),
      note: safeString(m.details, ""),
      details: safeString(m.details, ""),
      projectedBudget: safeNumber(m.projectedBudget, 0),
      actualSpent: 0,
      savings: safeNumber(m.projectedBudget, 0),
      expenses: [],
    })),
  });

  // Link the plan back to the annual request so the approval flow can update the plan
  plan.requestId = String(annualRequest._id);
  await plan.save();

  return { plan, annualRequest };
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
  const {
    workspaceId,
    planId,
    title,
    description = "",
    monthKey,
    month,
    date = "",
    dueDate = "",
    projectedAmount,
    actualAmount = 0,
    savings = Math.max(0, safeNumber(projectedAmount, 0) - safeNumber(actualAmount, 0)),
    paymentStatus = "Planned",
    expenseTag = "",
    vendor,
    sourceSheet = "",
    sourceRowNumber = 0,
    invoice = {},
  } = input;

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });

  // ExpenseKey uniqueness should be per workspace+month+plan; model has unique on (workspaceId, expenseKey)
  const expenseKey = `EXP-${plan.planKey}-${normalizeMonthKey(monthKey)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let vendorDoc: any = null;
  if (vendor?.vendorKey) {
    vendorDoc = await FinanceVendor.findOneAndUpdate(
      { workspaceId, vendorKey: vendor.vendorKey },
      {
        $set: {
          name: safeString(vendor.vendorName, ""),
          contactPerson: safeString(vendor.contactPerson, ""),
          phone: safeString(vendor.phone, ""),
          email: safeString(vendor.email, ""),
          address: safeString(vendor.address, ""),
          paymentTerms: safeString(vendor.paymentTerms, ""),
          category: safeString(vendor.category, ""),
          gstin: safeString(vendor.gstin, ""),
          panNumber: safeString(vendor.panNumber, ""),
          bankName: safeString(vendor.bankName, ""),
          accountName: safeString(vendor.accountName, ""),
          accountNumber: safeString(vendor.accountNumber, ""),
          ifscCode: safeString(vendor.ifscCode, ""),
          upiId: safeString(vendor.upiId, ""),
          website: safeString(vendor.website, ""),
          notes: safeString(vendor.notes, ""),
        },
      },
      { upsert: true, new: true }
    ).exec();
  }

  const expense = await FinanceExpense.create({
    workspaceId,
    planId,
    expenseKey,
    importKey: "",
    title: safeString(title),
    description: safeString(description),
    monthKey: safeString(monthKey),
    month: safeString(month),
    date: safeString(date),
    dueDate: safeString(dueDate),
    projectedAmount: safeNumber(projectedAmount, 0),
    actualAmount: safeNumber(actualAmount, 0),
    savings: safeNumber(savings, 0),
    paymentStatus: safeString(paymentStatus, "Planned"),
    invoiceNumber: invoice.invoiceNumber ? safeString(invoice.invoiceNumber) : "",
    invoiceFile: invoice.invoiceFile ? safeString(invoice.invoiceFile) : "",
    invoiceUrl: invoice.invoiceUrl ? safeString(invoice.invoiceUrl) : "",
    invoicePublicId: invoice.invoicePublicId ? safeString(invoice.invoicePublicId) : "",
    sourceSheet,
    sourceRowNumber: Number(sourceRowNumber || 0),
    expenseTag: normalizeExpenseTag(expenseTag),
    vendorId: vendor?.vendorKey ? safeString(vendor.vendorKey) : "",
    vendorObjectId: vendorDoc ? vendorDoc._id : null,
    vendorName: vendor?.vendorName ? safeString(vendor.vendorName) : (vendorDoc?.name ? safeString(vendorDoc.name) : ""),
    vendorContactPerson: vendor?.contactPerson ? safeString(vendor.contactPerson) : "",
    vendorEmail: vendor?.email ? safeString(vendor.email) : "",
    vendorPhone: vendor?.phone ? safeString(vendor.phone) : "",
    vendorAddress: vendor?.address ? safeString(vendor.address) : "",
    vendorPaymentTerms: vendor?.paymentTerms ? safeString(vendor.paymentTerms) : "",
    vendorCategory: vendor?.category ? safeString(vendor.category) : "",
    vendorGstin: vendor?.gstin ? safeString(vendor.gstin) : "",
    vendorPanNumber: vendor?.panNumber ? safeString(vendor.panNumber) : "",
    vendorBankName: vendor?.bankName ? safeString(vendor.bankName) : "",
    vendorAccountName: vendor?.accountName ? safeString(vendor.accountName) : "",
    vendorAccountNumber: vendor?.accountNumber ? safeString(vendor.accountNumber) : "",
    vendorIfscCode: vendor?.ifscCode ? safeString(vendor.ifscCode) : "",
    vendorUpiId: vendor?.upiId ? safeString(vendor.upiId) : "",
    vendorWebsite: vendor?.website ? safeString(vendor.website) : "",
    vendorImportKey: "",
    notes: "",
  });

  // Re-sync monthly totals
  await syncMonthlyPlanFromFinanceExpenses(planId);

  return expense;
}

export async function updateMonthlyExpenseStatusInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  expenseKey: string;
  paymentStatus: string;
  actualAmount?: number;
}) {
  const { workspaceId, planId, expenseKey, paymentStatus, actualAmount } = input;

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });

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

export async function upsertReminderInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
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

  const department = String(payload?.department || payload?.dept || "").trim();
  const fiscalYear = String(payload?.fiscalYear || payload?.fy || "").trim();

  if (!planId && (!department || !fiscalYear)) {
    throw Object.assign(new Error("planId or (department + fiscalYear) is required."), { statusCode: 400 });
  }

  let plan = null as any;
  if (planId) {
    plan = await DepartmentFinancePlan.findById(planId).exec();
    if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
    if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });
  } else {
    plan = await DepartmentFinancePlan.findOne({ workspaceId, fiscalYear, department }).exec();
    if (!plan) {
      // create minimal empty plan (Phase1 already creates via POST budget-request, but import should also be able to bootstrap)
      plan = await DepartmentFinancePlan.create({
        snapshotId: new mongoose.Types.ObjectId(),
        workspaceId,
        planKey: new mongoose.Types.ObjectId().toString(),
        department,
        managerName: "",
        fiscalYear,
        requestId: "",
        status: "Draft",
        previousSpend: 0,
        annualBudgetRequested: 0,
        approvedAnnualBudget: 0,
        notes: "",
        submittedByUserId: input.userId,
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
        monthlyPlan: [],
        reminders: [],
      });
    }
  }

  const monthlyEntries = Array.isArray(payload?.monthlyPlan) ? payload.monthlyPlan : Array.isArray(payload?.months) ? payload.months : [];
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
    const monthKey = safeString(m?.monthKey || m?.month || "", "");
    const month = safeString(m?.month || m?.title || monthKey, "");
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
        date: safeString(e?.date, ""),
        dueDate: safeString(e?.dueDate, ""),
        projectedAmount,
        actualAmount,
        savings: Math.max(0, projectedAmount - actualAmount),
        paymentStatus: safeString(e?.paymentStatus, "Planned"),
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

  // Ensure plan.reminders exists
  if (!Array.isArray(plan.reminders)) plan.reminders = [];

  return {
    plan,
    updated: true,
  };
}

export async function submitVendorForDepartmentInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  input: any;
}) {
  const { workspaceId, input: payload } = input;

  const planId = payload?.planId;
  const monthKey = safeString(payload?.monthKey || "", "");
  const vendorId = safeString(payload?.vendorId || payload?.vendorKey || "", "");
  const name = safeString(payload?.name || payload?.vendorName || "", "");

  if (!planId) throw Object.assign(new Error("planId is required."), { statusCode: 400 });
  if (!monthKey) throw Object.assign(new Error("monthKey is required."), { statusCode: 400 });
  if (!name) throw Object.assign(new Error("vendor name is required."), { statusCode: 400 });

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });

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
  if (expenseId) {
    await FinanceExpense.updateOne(
      { workspaceId, planId, expenseKey: expenseId, monthKey: safeString(monthKey) },
      {
        $set: {
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
        },
      }
    );
  } else {
    // best-effort: apply vendor to all planned invoices for the month in this plan if vendorName is empty
    await FinanceExpense.updateMany(
      { workspaceId, planId, monthKey: safeString(monthKey), vendorName: "" },
      {
        $set: {
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
        },
      }
    );
  }

  const reminderId = buildPlanReminderId(plan, monthKey);
  const reminder = {
    id: reminderId,
    importKey: "",
    monthKey,
    message: `Vendor ${name} saved for ${plan.department} (${monthKey}).`,
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
  const title = safeString(payload?.reason || payload?.title || "Extra budget expense", "");
  const expenseTag = "Add-on";

  const dueDate = safeString(payload?.dueDate, "");
  if (!planId) throw Object.assign(new Error("planId is required."), { statusCode: 400 });
  if (!monthKey) throw Object.assign(new Error("monthKey is required."), { statusCode: 400 });
  if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error("amount must be > 0."), { statusCode: 400 });

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });

  const expenseKey = `EXP-${plan.planKey}-${normalizeMonthKey(monthKey)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const expense = await FinanceExpense.create({
    workspaceId,
    planId: plan._id,
    expenseKey,
    importKey: safeString(payload?.importKey, ""),
    title,
    description: safeString(payload?.breakdown || payload?.reason, ""),
    monthKey,
    month: safeString(payload?.month || monthKey, ""),
    date: safeString(payload?.date, ""),
    dueDate,
    projectedAmount: amount,
    actualAmount: 0,
    savings: amount,
    paymentStatus: safeString(payload?.paymentStatus, "Planned"),
    invoiceNumber: "",
    invoiceFile: "",
    invoiceUrl: "",
    invoicePublicId: "",
    sourceSheet: safeString(payload?.sourceSheet, ""),
    sourceRowNumber: Number(payload?.sourceRowNumber ?? 0),
    expenseTag: expenseTag,
    vendorId: "",
    vendorObjectId: null,
    vendorName: "",
    vendorContactPerson: "",
    vendorEmail: "",
    vendorPhone: "",
    vendorAddress: "",
    vendorPaymentTerms: "",
    vendorCategory: "",
    vendorGstin: "",
    vendorPanNumber: "",
    vendorBankName: "",
    vendorAccountName: "",
    vendorAccountNumber: "",
    vendorIfscCode: "",
    vendorUpiId: "",
    vendorWebsite: "",
    vendorImportKey: "",
    notes: safeString(payload?.notes, ""),
  });

  // Also create an ExtraFinanceRequest so the approval/decision endpoint can find it
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
    amount: amount,
    reason: safeString(payload?.reason || payload?.title || "Extra budget request", ""),
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

  await syncMonthlyPlanFromFinanceExpenses((plan._id as unknown) as mongoose.Types.ObjectId);

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
            message: `Extra budget ${expenseKey} added for ${plan.department} (${monthKey}).`,
            status: "Sent",
            sentAtLabel,
          }],
          $position: 0,
        },
      },
    }
  ).exec();

  return { plan, expense, extraRequest };
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
  if (!planId) throw Object.assign(new Error("planId is required."), { statusCode: 400 });
  if (!expenseKey) throw Object.assign(new Error("expenseKey is required."), { statusCode: 400 });
  if (!invoiceNumber) throw Object.assign(new Error("invoiceNumber is required."), { statusCode: 400 });

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });

  const invoiceUrl = safeString(payload?.invoiceUrl || payload?.invoiceFile || "", "");
  const invoicePublicId = safeString(payload?.invoicePublicId || "", "");
  const invoiceFile = safeString(payload?.invoiceFile || "", "");

  const updated = await FinanceExpense.findOneAndUpdate(
    { workspaceId, planId, expenseKey, monthKey: monthKey || undefined },
    {
      $set: {
        invoiceNumber,
        invoiceFile,
        invoiceUrl,
        invoicePublicId,
        paymentStatus: "Invoice Shared",
      },
    },
    { new: true }
  ).exec();

  if (!updated) throw Object.assign(new Error("Expense not found for invoice upload."), { statusCode: 404 });

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
  if (!monthKey) throw Object.assign(new Error("monthKey is required."), { statusCode: 400 });

  const plan = await DepartmentFinancePlan.findById(planId).exec();
  if (!plan) throw Object.assign(new Error("Department finance plan not found."), { statusCode: 404 });
  if (String(plan.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });

  let resolvedMessage = message;
  if (!resolvedMessage && expenseKey) {
    const exp = await FinanceExpense.findOne({ workspaceId, planId, expenseKey }).exec();
    resolvedMessage = safeString(payload?.message, `${exp?.title || "Expense"} reminder shared with finance.`);
  }
  if (!resolvedMessage) resolvedMessage = `${plan.department} finance reminder (${monthKey}).`;

  const reminder = {
    id: buildPlanReminderId(plan, monthKey),
    importKey: "",
    monthKey,
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

function getFiscalYearLabel(startYear?: number) {
  const safeStartYear = Number(startYear);
  const now = new Date();
  const currentYear = now.getFullYear();
  const resolvedStartYear = Number.isFinite(safeStartYear) ? safeStartYear : (now.getMonth() >= 3 ? currentYear : currentYear - 1);
  const nextYear = resolvedStartYear + 1;
  return `FY ${String(resolvedStartYear).slice(-2)}-${String(nextYear).slice(-2)}`;
}

function getCurrentFiscalYearLabel() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
  return getFiscalYearLabel(startYear);
}

export async function listFinanceSnapshotForManagerInternal(input: {
  workspaceId: mongoose.Types.ObjectId;
  fiscalYear?: string;
}) {
  const { workspaceId } = input;
  const fiscalYear = input.fiscalYear || getCurrentFiscalYearLabel();

  const plans = await DepartmentFinancePlan.find({ workspaceId, fiscalYear }).lean();
  const annualRequests = await AnnualFinanceRequest.find({ workspaceId }).lean();
  const extraRequests = await ExtraFinanceRequest.find({ workspaceId }).lean();

  const departments = plans.map((plan: any, index: number) => {
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

  return {
    fiscalYear,
    departments,
    annualRequests,
    extraRequests,
    departmentFinance: plans,
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

  const tenants = await TenantCompany.find({ workspaceId })
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
  };
}) {
  const { workspaceId, userId, requestType, requestId, body } = input;
  const { status, scope = "owner", note = "" } = body;

  if (!["Approved", "Rejected", "Discuss"].includes(status)) {
    throw Object.assign(new Error("Invalid status. Must be Approved, Rejected, or Discuss."), { statusCode: 400 });
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

    const step = role === "owner" ? "owner" : "financeManager";
    (record.approvalFlow as any)[step] = {
      status,
      approverUserId: userId,
      approverName: "",
      decidedAt: now,
      decidedAtLabel: formatBillingDateLabel(now),
      note,
    };

    if (!Array.isArray((record.approvalFlow as any).decisionHistory)) (record.approvalFlow as any).decisionHistory = [];
    (record.approvalFlow as any).decisionHistory.push(decision);
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

    if (record.status === "Approved") {
      await DepartmentFinancePlan.updateOne(
        { workspaceId, department: record.department, fiscalYear: { $exists: true } },
        { $set: { status: "Approved", approvedAnnualBudget: record.requestedBudget } },
      ).exec();
    }

    return record;
  }

  if (requestType === "extra") {
    const requestObjectId = asObjectId(requestId);
    if (!requestObjectId) throw Object.assign(new Error("Invalid requestId."), { statusCode: 400 });

    const record = await ExtraFinanceRequest.findById(requestObjectId).exec();
    if (!record) throw Object.assign(new Error("Extra finance request not found."), { statusCode: 404 });
    if (String(record.workspaceId) !== String(workspaceId)) throw Object.assign(new Error("Workspace mismatch."), { statusCode: 403 });

    const step = role === "owner" ? "owner" : "financeManager";
    (record.approvalFlow as any)[step] = {
      status,
      approverUserId: userId,
      approverName: "",
      decidedAt: now,
      decidedAtLabel: formatBillingDateLabel(now),
      note,
    };

    if (!Array.isArray((record.approvalFlow as any).decisionHistory)) (record.approvalFlow as any).decisionHistory = [];
    (record.approvalFlow as any).decisionHistory.push(decision);
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
    return record;
  }

  throw Object.assign(new Error("Invalid requestType. Must be 'annual' or 'extra'."), { statusCode: 400 });
}
