import TenantRent from "../models/TenantRent.js";
import { TenantCompany } from "../models/TenantCompany.js";
import { assertFinancePaymentActor, getActorName, postIncomeEntry } from "./incomeLedgerService.js";


// The generation sweep runs at boot and then every 6 hours — frequent enough
// to catch a month rollover even if the process was down for a while.
const RENT_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Tenant rent payment window: proof can be submitted from N days BEFORE the
// due date until N days AFTER it. Outside this window the tenant cannot
// self-submit — finance can still record the payment manually. While the
// window is open an unpaid rent shows "Due"; after it closes unpaid it shows
// "Overdue".
export const RENT_PAYMENT_WINDOW_DAYS_BEFORE = 5;
export const RENT_PAYMENT_WINDOW_DAYS_AFTER = 5;
const RENT_WINDOW_DAY_MS = 24 * 60 * 60 * 1000;

// [windowStart, windowEnd] around a rent record's due date.
export function getRentPaymentWindow(dueDate: any, now: Date = new Date()) {
  const due = dueDate ? new Date(dueDate) : null;
  if (!due || Number.isNaN(due.getTime())) return null;
  const start = new Date(due.getTime() - RENT_PAYMENT_WINDOW_DAYS_BEFORE * RENT_WINDOW_DAY_MS);
  const end = new Date(due.getTime() + RENT_PAYMENT_WINDOW_DAYS_AFTER * RENT_WINDOW_DAY_MS);
  return { start, end, isWithin: now >= start && now <= end };
}

function safeNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value: any, fallback = "") {
  if (typeof value === "string") return value.trim() ? value : fallback;
  if (typeof value?.name === "string") return value.name.trim() ? value.name : fallback;
  return fallback;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function formatRentDate(value: any) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // Tenant rent due dates are calendar dates stored at the end of their UTC
  // day. Format in UTC so positive-offset workspaces do not display the next
  // day (for example, Sep 18 23:59 UTC becoming Sep 19 in India).
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// ============================================================================
// Rent computation & monthly generation
// ============================================================================

// Monthly rent for a company — same priority as the finance billing snapshot:
// desk rates × 30 when desk rates exist, else billingDetails.monthlyRent.
export function resolveTenantMonthlyRent(company: any) {
  const billing = company?.billingDetails || {};
  const details = company?.companyDetails || {};
  const pkg = company?.packageDetails || {};
  const cabinDesks = Math.max(0, safeNumber(details.cabinDesks ?? pkg.cabinDesks));
  const openDesks = Math.max(0, safeNumber(details.openDesks ?? pkg.openDesks));
  const ratePerCabinDesk = Math.max(0, safeNumber(details.ratePerCabinDesk ?? pkg.ratePerCabinDesk));
  const ratePerOpenDesk = Math.max(0, safeNumber(details.ratePerOpenDesk ?? pkg.ratePerOpenDesk));
  const dailyRent = Math.max(0, cabinDesks * ratePerCabinDesk + openDesks * ratePerOpenDesk);
  return dailyRent > 0 ? dailyRent * 30 : Math.max(0, safeNumber(billing.monthlyRent));
}

// Builds the CURRENT calendar month's rent period for a company, or null when
// the company's contract does not cover this month. dueDate = the workspace's
// rentDueDay clamped into the month, then clamped into [contractStart, contractEnd]
// (so a mid-month contract start is billed at move-in, not on the 1st).
// NOTE: computed in UTC server time for v1 — every workspace currently operates
// in one timezone, so no per-workspace calendar is needed yet.
export function buildMonthlyRentPeriodInfo(company: any, now: Date = new Date()) {
  const contractStart = company?.contractStart ? new Date(company.contractStart) : null;
  const contractEnd = company?.contractEnd ? new Date(company.contractEnd) : null;
  if (!contractStart || Number.isNaN(contractStart.getTime())) return null;

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month, daysInMonth(year, month), 23, 59, 59, 999));

  const coversMonth = contractStart <= monthEnd && (!contractEnd || contractEnd >= monthStart);
  if (!coversMonth) return null;

  // "Rent Due Date" (the first due date picked in the wizard) is the anchor;
  // its day-of-month is what recurs monthly. Falls back to the raw rentDueDay
  // when only that is set (legacy rows).
  const rentDueAnchor = company?.billingDetails?.rentDueDate ? new Date(company.billingDetails.rentDueDate) : null;
  const anchorDay = rentDueAnchor && !Number.isNaN(rentDueAnchor.getTime()) ? rentDueAnchor.getUTCDate() : null;
  const rentDueDay = Math.min(31, Math.max(1, Math.round(anchorDay ?? (safeNumber(company?.billingDetails?.rentDueDay, 1) || 1))));
  const clampedDay = Math.min(rentDueDay, daysInMonth(year, month));
  let dueDate = new Date(Date.UTC(year, month, clampedDay, 23, 59, 59, 999));
  if (dueDate < contractStart) dueDate = new Date(contractStart);
  if (contractEnd && dueDate > contractEnd) dueDate = new Date(contractEnd);

  const periodKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const periodLabel = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(monthStart);

  return { periodKey, periodLabel, dueDate, amount: resolveTenantMonthlyRent(company) };
}

// Creates the current month's rent record for a company if it is missing.
// Idempotent: the {tenantCompanyId, periodKey} unique index backs this up even
// under concurrent sweeps (duplicate key → treated as "already exists").
export async function ensureCurrentMonthRentRecordForCompany(company: any, now: Date = new Date()) {
  const info = buildMonthlyRentPeriodInfo(company, now);
  if (!info || !(info.amount > 0)) return null;

  const existing = await TenantRent.findOne({ tenantCompanyId: company._id, periodKey: info.periodKey }).lean().exec();
  if (existing) return null;

  try {
    const created = await TenantRent.create({
      workspaceId: company.workspaceId,
      tenantCompanyId: company._id,
      tenantCode: safeString(company.tenantCode),
      companyName: safeString(company.companyName),
      periodKey: info.periodKey,
      periodLabel: info.periodLabel,
      dueDate: info.dueDate,
      amount: info.amount,
      status: "Due",
      source: "scheduler",
      actionHistory: [{
        action: "generated",
        status: "Due",
        note: `Rent receivable for ${info.periodLabel} generated.`,
        at: new Date(),
      }],
    });
    return created;
  } catch (err: any) {
    if (err?.code === 11000) return null; // concurrent sweep already created it
    throw err;
  }
}

// Sweep: materializes this month's rent receivables for every tenant company
// whose contract covers the current month.
export async function runTenantRentGenerationSweep(now: Date = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month, daysInMonth(year, month), 23, 59, 59, 999));

  const companies: any[] = await TenantCompany.find({
    contractStart: { $ne: null, $lte: monthEnd },
    contractEnd: { $ne: null, $gte: monthStart },
  })
    .lean()
    .exec();

  let generated = 0;
  for (const company of companies) {
    const created = await ensureCurrentMonthRentRecordForCompany(company, now);
    if (created) generated += 1;
  }
  return { checked: companies.length, generated };
}

/**
 * Materializes monthly tenant rent receivables. Runs inside the long-lived
 * Express process; safe to call once at startup after MongoDB is connected.
 */
export function startTenantRentScheduler() {
  const tick = () => {
    runTenantRentGenerationSweep().catch((err: any) => {
      console.error("Tenant rent generation sweep failed:", err?.message || err);
    });
  };
  tick();
  const timer = setInterval(tick, RENT_SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
}

// ============================================================================
// Formatting
// ============================================================================

function isRentOverdue(record: any, now: Date = new Date()) {
  if (record?.status === "Paid") return false;
  const due = record?.dueDate ? new Date(record.dueDate) : null;
  if (!due || Number.isNaN(due.getTime())) return false;
  // Unpaid rent only becomes "Overdue" once the whole payment window has
  // closed — while the window is open it still displays as "Due".
  const windowEnd = new Date(due.getTime() + RENT_PAYMENT_WINDOW_DAYS_AFTER * RENT_WINDOW_DAY_MS);
  return now > windowEnd;
}

export function formatTenantRentRecord(record: any, now: Date = new Date()) {
  const proof = record?.paymentProof || {};
  const rejection = record?.rejection || {};
  const overdue = isRentOverdue(record, now);
  const status = safeString(record?.status, "Due");
  const window = getRentPaymentWindow(record?.dueDate, now);
  return {
    id: safeString(record?.id) || record?._id?.toString?.() || "",
    recordId: record?._id?.toString?.() || String(record?._id || ""),
    tenantCompanyId: String(record?.tenantCompanyId || ""),
    tenantCode: safeString(record?.tenantCode),
    companyName: safeString(record?.companyName),
    periodKey: safeString(record?.periodKey),
    periodLabel: safeString(record?.periodLabel),
    dueDate: record?.dueDate || null,
    dueDateLabel: formatRentDate(record?.dueDate),
    amount: safeNumber(record?.amount),
    status: safeString(record?.status, "Due"),
    // "Overdue" is a display state only — never stored on the document.
    displayStatus: overdue ? "Overdue" : safeString(record?.status, "Due"),
    isOverdue: overdue,
    // Monthly payment window (dueDate ± N days) — tenants can only submit
    // proof while it is open.
    paymentWindowStart: window?.start || null,
    paymentWindowEnd: window?.end || null,
    paymentWindowLabel: window ? `${formatRentDate(window.start)} – ${formatRentDate(window.end)}` : "",
    isWithinPaymentWindow: !!window?.isWithin,
    canSubmitProof: status !== "Paid" && !!window?.isWithin,
    paymentProof: {
      fileName: safeString(proof.fileName),
      fileUrl: safeString(proof.fileUrl),
      mimeType: safeString(proof.mimeType),
      size: safeString(proof.size),
    },
    transactionReference: safeString(record?.transactionReference),
    submittedByName: safeString(record?.submittedByName),
    submittedAt: record?.submittedAt || null,
    verifiedByName: safeString(record?.verifiedByName),
    verifiedAt: record?.verifiedAt || null,
    paidAt: record?.paidAt || null,
    rejection: {
      reason: safeString(rejection.reason),
      rejectedByName: safeString(rejection.rejectedByName),
      rejectedAt: rejection.rejectedAt || null,
    },
    actionHistory: Array.isArray(record?.actionHistory) ? record.actionHistory : [],
  };
}

// ============================================================================
// Finance-facing: list / mark paid / return proof
// ============================================================================

export async function listTenantRentForWorkspace(workspaceId: any, query: any = {}) {
  const filter: any = { workspaceId };

  const status = safeString(query.status);
  if (status && status !== "All") {
    if (status === "Overdue") {
      // Overdue = unpaid past the whole payment window (dueDate + grace days).
      filter.status = { $ne: "Paid" };
      filter.dueDate = { $lt: new Date(Date.now() - RENT_PAYMENT_WINDOW_DAYS_AFTER * RENT_WINDOW_DAY_MS) };
    } else {
      filter.status = status; // "Due" | "Proof Submitted" | "Paid"
    }
  }

  const periodKey = safeString(query.periodKey);
  if (periodKey) filter.periodKey = periodKey;

  const search = safeString(query.search);
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [{ companyName: rx }, { tenantCode: rx }, { id: rx }];
  }

  const records: any[] = await TenantRent.find(filter)
    .sort({ dueDate: -1, createdAt: -1 })
    .limit(500)
    .lean()
    .exec();

  const now = new Date();
  const formatted = records.map((record) => formatTenantRentRecord(record, now));
  const sumBy = (list: any[]) => list.reduce((acc: number, r: any) => acc + (r.amount || 0), 0);

  return {
    records: formatted,
    summary: {
      total: formatted.length,
      due: formatted.filter((r) => r.status === "Due").length,
      proofSubmitted: formatted.filter((r) => r.status === "Proof Submitted").length,
      paid: formatted.filter((r) => r.status === "Paid").length,
      overdue: formatted.filter((r) => r.isOverdue).length,
      outstandingAmount: sumBy(formatted.filter((r) => r.status !== "Paid")),
      paidAmount: sumBy(formatted.filter((r) => r.status === "Paid")),
    },
  };
}

export async function markTenantRentPaidForWorkspace(input: {
  workspaceId: any;
  userId: any;
  rentId: string;
  body?: any;
}) {
  const { workspaceId, userId, rentId, body = {} } = input;
  await assertFinancePaymentActor(workspaceId, userId);

  const now = new Date();
  const actorName = await getActorName(userId);
  const rent: any = await TenantRent.findOne({ workspaceId, id: rentId }).exec();
  if (!rent) throw Object.assign(new Error("Rent record not found."), { statusCode: 404 });
  if (rent.status === "Paid") throw Object.assign(new Error("This rent payment is already marked as paid."), { statusCode: 409 });
  const original = rent.toObject();
  const hadProof = !!rent.paymentProof?.fileUrl;
  if (body?.transactionReference !== undefined) rent.transactionReference = safeString(body.transactionReference);
  rent.status = "Paid";
  rent.verifiedById = userId;
  rent.verifiedByName = actorName;
  rent.verifiedAt = now;
  rent.paidAt = now;
  rent.actionHistory.push({
    action: "marked-paid", status: "Paid",
    note: safeString(body?.note) || (hadProof ? "Payment verified against submitted proof." : "Marked paid without submitted proof (offline payment)."),
    actorUserId: userId, actorName, at: now,
  });
  await rent.save();
  try {
    await postIncomeEntry({
        workspaceId, source: "tenant-rent", referredId: rent.id || rent._id?.toString?.() || "",
        periodKey: rent.periodKey || "", periodLabel: rent.periodLabel || "", entityName: rent.companyName || "",
        amount: rent.amount || 0, postedById: userId, postedByName: actorName,
        note: `Rent marked paid ${rent.periodLabel || rent.periodKey || ""} (${hadProof ? "with proof" : "offline"}).`,
    });
  } catch (error) {
    await TenantRent.replaceOne({ _id: rent._id, status: "Paid", paidAt: now }, original);
    throw error;
  }

  return {
    rent: formatTenantRentRecord(rent.toObject(), now),
    message: "Rent marked as paid.",
  };
}

export async function returnTenantRentProofForWorkspace(input: {
  workspaceId: any;
  userId: any;
  rentId: string;
  body?: any;
}) {
  const { workspaceId, userId, rentId, body = {} } = input;
  await assertFinancePaymentActor(workspaceId, userId);

  const rent: any = await TenantRent.findOne({ workspaceId, id: rentId }).exec();
  if (!rent) throw Object.assign(new Error("Rent record not found."), { statusCode: 404 });
  if (rent.status !== "Proof Submitted") {
    throw Object.assign(new Error("Only rent records with submitted payment proof can be returned."), { statusCode: 409 });
  }

  const reason = safeString(body?.reason);
  if (!reason) {
    throw Object.assign(new Error("A reason is required when returning a payment proof."), { statusCode: 400 });
  }

  const now = new Date();
  const actorName = await getActorName(userId);

  rent.status = "Due";
  // The last submitted proof is kept for reference; the tenant can re-submit
  // and overwrite it.
  rent.rejection = { reason, rejectedById: userId, rejectedByName: actorName, rejectedAt: now };
  rent.actionHistory.push({
    action: "proof-returned",
    status: "Due",
    note: reason,
    actorUserId: userId,
    actorName,
    at: now,
  });

  await rent.save();
  return {
    rent: formatTenantRentRecord(rent.toObject(), now),
    message: "Payment proof returned to tenant.",
  };
}



