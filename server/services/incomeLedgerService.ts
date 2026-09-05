// @ts-nocheck
import FinanceIncomeEntry from "../models/FinanceIncomeEntry.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import HostUser from "../models/HostUser.js";
import { parseFiscalYearRange } from "../utils/fiscalYear.js";
import { uploadFileToS3 } from "../config/s3config.js";

// ── Finance-actor authorization (shared gate) ──────────────────────────────
// Same segregation-of-duties logic as financeService.canManageAllFinancePayments.
// Lives here so every income-ledger mutation (tenant rent, virtual office,
// manual revenue) enforces the identical finance-privilege check without
// circular imports.

const FINANCE_PRIVILEGED_ROLES = new Set([
  "owner",
  "founder",
  "super_admin",
  "admin",
  "finance_manager",
  "finance",
]);

function normalizeRoleName(value: any) {
  const raw = typeof value === "string" ? value : value?.name;
  return safeString(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getOwnDepartmentKeys(membership: any) {
  return ((membership?.departments || []) as any[])
    .map((d) => safeString(d?.name).trim().toLowerCase())
    .filter(Boolean);
}

function canManageFinancePayments(membership: any) {
  const role = normalizeRoleName(membership?.role);
  if (FINANCE_PRIVILEGED_ROLES.has(role)) return true;
  // A generic Manager assigned to the Finance department acts as finance staff.
  if (role !== "manager") return false;
  return getOwnDepartmentKeys(membership).some((key) => key.includes("finance"));
}

async function getFinanceActorMembership(workspaceId: any, userId: any) {
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

export async function assertFinancePaymentActor(workspaceId: any, userId: any) {
  const membership = await getFinanceActorMembership(workspaceId, userId);
  if (!canManageFinancePayments(membership)) {
    throw Object.assign(
      new Error("Only finance-privileged roles can manage finance income."),
      { statusCode: 403 },
    );
  }
  return membership;
}

export async function getActorName(userId: any) {
  if (!userId) return "";
  try {
    const user: any = await HostUser.findById(userId).select("name fullName email").lean().exec();
    return safeString(user?.name || user?.fullName || user?.email || "");
  } catch {
    return "";
  }
}

/**
 * Appends an income ledger entry for a closed revenue event. Idempotent: the
 * {workspaceId, source, referredId, periodKey} unique index guarantees a
 * period is never double-counted. Returns the created entry or null when one
 * already exists.
 */
export async function postIncomeEntry(input = {}) {
  const {
    workspaceId,
    source, // "tenant-rent" | "virtual-office-rent"
    referredId,
    periodKey,
    periodLabel,
    entityName,
    amount,
    postedById,
    postedByName,
    note,
    session,
  } = input;

  if (!workspaceId || !source || !periodKey || !(Number(amount) > 0)) {
    throw new Error("Income entry requires workspaceId, source, periodKey and amount.");
  }

  const existing = await FinanceIncomeEntry.findOne({
    workspaceId,
    source,
    referredId: String(referredId || ""),
    periodKey,
  })
    .session(session || null)
    .lean()
    .exec();
  if (existing) return null;

  try {
    const created = await FinanceIncomeEntry.create([{
      workspaceId,
      source,
      referredId: String(referredId || ""),
      periodKey: String(periodKey),
      periodLabel: String(periodLabel || ""),
      entityName: String(entityName || ""),
      amount: Math.max(0, Number(amount)),
      postedAt: new Date(),
      postedById: postedById || null,
      postedByName: String(postedByName || ""),
      note: String(note || ""),
      status: "Confirmed",
    }], session ? { session } : undefined);
    return created[0];
  } catch (err) {
    // Concurrent duplicate → someone else already posted it.
    if (err?.code === 11000) return null;
    throw err;
  }
}

function safeString(value = "", fallback = "") {
  const text = typeof value?.name === "string" ? value.name : String(value ?? "");
  return text.trim() ? text : fallback;
}

/**
 * Lists income ledger entries for a workspace. Optional filters: source,
 * periodKey, free-text entity search, and a fiscal-year window (workspace-
 * aware, using the same rules as the finance snapshots).
 */
// ── Manual revenue (Workation / Alternate) ─────────────────────────────────
// Finance-created revenue entries. Lifecycle: Pending → Received (finance
// confirms) → corrections via Reversal (negative entry, original untouched).
// Only Received/Confirmed/Reversal count toward Accounting/P&L.

const MANUAL_REVENUE_SOURCES = new Set(["workation-revenue", "alternate-revenue"]);
const ALTERNATE_REVENUE_CATEGORIES = new Set([
  "events", "cafe-food", "printing", "parking", "day-passes", "commission", "penalty-late-fee", "miscellaneous",
]);
const WORKATION_REVENUE_CATEGORIES = new Set(["package", "extension", "add-on", "miscellaneous"]);

function normalizeRevenueCategory(value = "") {
  return safeString(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseRevenueDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRevenueDateLabel(value) {
  const date = parseRevenueDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function formatRevenueEntry(entry, now = new Date()) {
  const status = safeString(entry?.status, "Pending");
  return {
    id: entry?._id?.toString?.() || "",
    entryCode: safeString(entry?.entryCode),
    source: safeString(entry?.source),
    category: safeString(entry?.category),
    entityName: safeString(entry?.entityName),
    amount: Number(entry?.amount || 0),
    revenueDate: entry?.revenueDate || null,
    revenueDateLabel: formatRevenueDateLabel(entry?.revenueDate),
    periodKey: safeString(entry?.periodKey),
    periodLabel: safeString(entry?.periodLabel),
    billingPeriodLabel: safeString(entry?.billingPeriodLabel),
    paymentMethod: safeString(entry?.paymentMethod),
    reference: safeString(entry?.reference),
    note: safeString(entry?.note),
    document: {
      fileName: safeString(entry?.documentName),
      fileUrl: safeString(entry?.documentUrl),
    },
    status,
    isPending: status === "Pending",
    isReceived: status === "Received",
    isReversal: status === "Reversal",
    confirmedAt: entry?.confirmedAt || null,
    confirmedByName: safeString(entry?.confirmedByName),
    postedByName: safeString(entry?.postedByName),
    reversalOf: entry?.reversalOf?.toString?.() || safeString(entry?.reversalOf),
    events: Array.isArray(entry?.events) ? entry.events : [],
  };
}

export async function listRevenueEntriesForWorkspace(workspaceId, query = {}) {
  const filter = { workspaceId, source: { $in: [...MANUAL_REVENUE_SOURCES] } };

  const source = safeString(query.source);
  if (MANUAL_REVENUE_SOURCES.has(source)) filter.source = source;

  const status = safeString(query.status);
  if (status && status !== "All") filter.status = status;

  const category = normalizeRevenueCategory(query.category);
  if (category) filter.category = category;

  const search = safeString(query.search);
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ entityName: rx }, { reference: rx }, { entryCode: rx }, { note: rx }];
  }

  if (query.fiscalYear) {
    const workspace = await Workspace.findById(workspaceId).select("preferences").lean();
    const fyStartMonth = (workspace?.preferences?.fiscalYearStartMonth as number) || 4;
    const range = parseFiscalYearRange(String(query.fiscalYear), fyStartMonth);
    if (range?.start && range?.end) {
      filter.revenueDate = { $gte: range.start, $lte: range.end };
    }
  }

  const entries: any[] = await FinanceIncomeEntry.find(filter)
    .sort({ revenueDate: -1, createdAt: -1 })
    .limit(500)
    .lean()
    .exec();

  const formatted = entries.map((entry) => formatRevenueEntry(entry));
  const ofStatus = (s) => formatted.filter((r) => r.status === s);
  const sum = (list) => list.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  return {
    records: formatted,
    summary: {
      total: formatted.length,
      pending: ofStatus("Pending").length,
      pendingAmount: sum(ofStatus("Pending")),
      received: ofStatus("Received").length,
      receivedAmount: sum(ofStatus("Received")),
      reversals: ofStatus("Reversal").length,
      netAmount: sum(formatted),
    },
  };
}

export async function createRevenueEntryForWorkspace(input = {}) {
  const { workspaceId, userId, body = {}, file } = input;
  await assertFinancePaymentActor(workspaceId, userId);
  const actorName = await getActorName(userId);

  const source = safeString(body.source);
  if (!MANUAL_REVENUE_SOURCES.has(source)) {
    throw Object.assign(new Error("Revenue source must be workation-revenue or alternate-revenue."), { statusCode: 400 });
  }

  const entityName = safeString(body.entityName);
  if (!entityName) {
    throw Object.assign(new Error("Client/customer name is required."), { statusCode: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than zero."), { statusCode: 400 });
  }

  const revenueDate = parseRevenueDate(body.revenueDate) || new Date();
  const category = normalizeRevenueCategory(body.category);
  if (source === "alternate-revenue" && !ALTERNATE_REVENUE_CATEGORIES.has(category)) {
    throw Object.assign(new Error("A valid revenue category is required for alternate revenue (events, cafe-food, printing, parking, day-passes, commission, penalty-late-fee or miscellaneous)."), { statusCode: 400 });
  }
  if (source === "workation-revenue" && category && !WORKATION_REVENUE_CATEGORIES.has(category)) {
    throw Object.assign(new Error("Invalid workation category (package, extension, add-on or miscellaneous)."), { statusCode: 400 });
  }

  const paymentStatus = safeString(body.paymentStatus) === "Received" ? "Received" : "Pending";
  const entryCode = `REV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const periodKey = `${revenueDate.getUTCFullYear()}-${String(revenueDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const periodLabel = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(revenueDate);
  const now = new Date();

  // Optional supporting document → S3 (mirrors the rent payment-proof upload).
  let documentName = "";
  let documentUrl = "";
  let documentPublicId = "";
  if (file?.buffer?.length) {
    const docSafeName = (file.originalname || "revenue-document").replace(/[^a-zA-Z0-9._-]/g, "_");
    const route = `finance-revenue/${workspaceId}/${entryCode}/${now.getTime()}-${docSafeName}`;
    try {
      const s3Result = await uploadFileToS3(route, file);
      documentName = file.originalname || "revenue-document";
      documentUrl = s3Result.url || "";
      documentPublicId = s3Result.id || route;
    } catch {
      documentName = file.originalname || "revenue-document";
      documentPublicId = route;
    }
  }

  const created = await FinanceIncomeEntry.create({
    workspaceId,
    source,
    referredId: entryCode,
    entryCode,
    periodKey,
    periodLabel,
    entityName,
    amount,
    revenueDate,
    paymentMethod: safeString(body.paymentMethod),
    reference: safeString(body.reference),
    billingPeriodLabel: safeString(body.billingPeriodLabel),
    documentName,
    documentUrl,
    documentPublicId,
    note: safeString(body.note).slice(0, 400),
    postedAt: now,
    postedById: userId,
    postedByName: actorName,
    status: paymentStatus,
    confirmedAt: paymentStatus === "Received" ? now : null,
    confirmedById: paymentStatus === "Received" ? userId : null,
    confirmedByName: paymentStatus === "Received" ? actorName : "",
    events: [{
      action: "created",
      status: paymentStatus,
      note: paymentStatus === "Received"
        ? "Revenue recorded and recognized on creation."
        : "Revenue recorded as pending — recognize via Confirm.",
      actorUserId: userId,
      actorName,
      at: now,
    }],
  });

  return { entry: formatRevenueEntry(created), message: "Revenue entry created." };
}

export async function confirmRevenueEntryForWorkspace(input = {}) {
  const { workspaceId, userId, entryId, body = {} } = input;
  await assertFinancePaymentActor(workspaceId, userId);
  const actorName = await getActorName(userId);

  const entry: any = await FinanceIncomeEntry.findOne({ workspaceId, _id: entryId }).exec();
  if (!entry) throw Object.assign(new Error("Revenue entry not found."), { statusCode: 404 });
  if (entry.status !== "Pending") {
    throw Object.assign(new Error("Only pending revenue entries can be confirmed as received."), { statusCode: 409 });
  }

  const now = new Date();
  entry.status = "Received";
  entry.confirmedAt = now;
  entry.confirmedById = userId;
  entry.confirmedByName = actorName;
  entry.events.push({
    action: "confirmed",
    status: "Received",
    note: safeString(body?.note) || "Revenue recognized as received.",
    actorUserId: userId,
    actorName,
    at: now,
  });

  await entry.save();
  return { entry: formatRevenueEntry(entry), message: "Revenue confirmed as received." };
}

export async function reverseRevenueEntryForWorkspace(input = {}) {
  const { workspaceId, userId, entryId, body = {} } = input;
  await assertFinancePaymentActor(workspaceId, userId);
  const actorName = await getActorName(userId);

  const reason = safeString(body?.reason);
  if (!reason) {
    throw Object.assign(new Error("A reason is required to reverse a revenue entry."), { statusCode: 400 });
  }

  const original: any = await FinanceIncomeEntry.findOne({ workspaceId, _id: entryId }).exec();
  if (!original) throw Object.assign(new Error("Revenue entry not found."), { statusCode: 404 });
  if (original.status === "Reversal") {
    throw Object.assign(new Error("A reversal entry cannot be reversed."), { statusCode: 409 });
  }

  const existingReversal = await FinanceIncomeEntry.findOne({ workspaceId, reversalOf: original._id }).lean().exec();
  if (existingReversal) {
    throw Object.assign(new Error("This revenue entry has already been reversed."), { statusCode: 409 });
  }

  const now = new Date();
  const entryCode = `REV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // The reversal carries the SAME source/category/period so the original
  // bucket nets to zero, and a negative amount so every consumer's sums work.
  const reversal = await FinanceIncomeEntry.create({
    workspaceId,
    source: original.source,
    referredId: entryCode,
    entryCode,
    periodKey: original.periodKey,
    periodLabel: original.periodLabel,
    entityName: original.entityName,
    category: original.category,
    amount: -(Number(original.amount) || 0),
    revenueDate: now,
    paymentMethod: original.paymentMethod || "",
    reference: original.reference || "",
    billingPeriodLabel: original.billingPeriodLabel || "",
    note: ((safeString(body?.note) || `Reversal of ${original.entryCode || original.referredId || "entry"}`) + ` — ${reason}`).slice(0, 400),
    postedAt: now,
    postedById: userId,
    postedByName: actorName,
    status: "Reversal",
    reversalOf: original._id,
    events: [{
      action: "reversal-created",
      status: "Reversal",
      note: `Reverses ${original.entryCode || original.referredId || "entry"} — ${reason}`,
      actorUserId: userId,
      actorName,
      at: now,
    }],
  });

  original.events.push({
    action: "reversed",
    status: original.status,
    note: `Reversed by ${actorName} — ${reason}`,
    actorUserId: userId,
    actorName,
    at: now,
  });
  await original.save();

  return { entry: formatRevenueEntry(reversal), original: formatRevenueEntry(original), message: "Revenue entry reversed." };
}

export async function listIncomeEntriesForWorkspace(workspaceId, query = {}) {
  const filter = { workspaceId };

  const source = safeString(query.source);
  if (source) filter.source = source;

  const periodKey = safeString(query.periodKey);
  if (periodKey) filter.periodKey = periodKey;

  const search = safeString(query.search);
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ entityName: rx }, { referredId: rx }, { note: rx }];
  }

  if (query.fiscalYear) {
    const workspace = await Workspace.findById(workspaceId).select("preferences").lean();
    const fyStartMonth = (workspace?.preferences?.fiscalYearStartMonth as number) || 4;
    const range = parseFiscalYearRange(String(query.fiscalYear), fyStartMonth);
    if (range?.start && range?.end) {
      filter.postedAt = { $gte: range.start, $lte: range.end };
    }
  }

  const entries = await FinanceIncomeEntry.find(filter)
    .sort({ postedAt: -1 })
    .limit(500)
    .lean()
    .exec();

  const bySource = (src) => entries.filter((e) => e.source === src);
  const sum = (list) => list.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  return {
    entries: entries.map((entry) => ({
      id: entry._id?.toString?.() || "",
      source: entry.source,
      referredId: entry.referredId || "",
      periodKey: entry.periodKey || "",
      periodLabel: entry.periodLabel || "",
      entityName: entry.entityName || "",
      amount: Number(entry.amount || 0),
      postedAt: entry.postedAt || null,
      postedByName: entry.postedByName || "",
      note: entry.note || "",
      status: entry.status || "Confirmed",
    })),
    summary: {
      total: entries.length,
      totalAmount: sum(entries),
      tenantRent: sum(bySource("tenant-rent")),
      virtualOfficeRent: sum(bySource("virtual-office-rent")),
    },
  };
}
