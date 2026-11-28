import mongoose from "mongoose";
import FinanceLandlord from "../models/FinanceLandlord.js";
import FinanceLandlordRent from "../models/FinanceLandlordRent.js";
import { assertFinancePaymentActor, getActorName } from "./incomeLedgerService.js";

/**
 * Landlord rent PAYABLES — the money the workspace owes to the owners of the
 * spaces it operates. This is the mirror of TenantRent (rent receivable), and
 * follows the same rules:
 *
 *  - Segregation of duties: every read/write requires a finance-privileged
 *    actor (owner / founder / super_admin / admin / finance_manager / finance /
 *    manager assigned to the Finance department). Front-desk and department
 *    staff must not see what the company pays its landlords.
 *  - Workspace scoping is always derived from the authenticated membership —
 *    a caller can never pass another workspace's id in the body or query.
 *  - Payables are frozen at generation time. Editing the landlord agreement
 *    later never rewrites a month that was already settled.
 *  - Payments are append-only. A correction VOIDS a payment with an actor,
 *    timestamp and reason; nothing is ever deleted from the ledger.
 */

const EXPIRING_SOON_DAYS = 60;

function safeString(value: any, fallback = ""): string {
  if (typeof value === "string") return value.trim() ? value.trim() : fallback;
  if (typeof value?.name === "string") return value.name.trim() ? value.name.trim() : fallback;
  return fallback;
}

function safeNumber(value: any, fallback = 0): number {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * Wraps the shared finance guard so the 403 message reads correctly for a
 * read-only visitor instead of talking about "managing income".
 */
async function assertFinanceAccess(workspaceId: any, userId: any, action: "view" | "manage") {
  try {
    return await assertFinancePaymentActor(workspaceId, userId);
  } catch (error: any) {
    if (Number(error?.statusCode) === 403) {
      throw httpError(
        `Your role cannot ${action} landlord payables. Ask a finance manager or the workspace owner for access.`,
        403,
      );
    }
    throw error;
  }
}

export function isPeriodKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function currentPeriodKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodLabelFromKey(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return "";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)));
}

/**
 * Due date = the landlord's payment day inside that month, clamped to the last
 * day of the month (so day 31 still works in February). Stored at 12:00 UTC so
 * a positive-offset workspace never displays the previous day.
 */
function buildDueDate(periodKey: string, dueDay: number): Date {
  const [year, month] = periodKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(Math.trunc(dueDay) || 1, 1), lastDay);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value: any): string {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function startOfToday(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function computeAgreementState(landlord: any, now: Date) {
  const end = parseDate(landlord?.agreementEndDate);
  if (!end) return { label: "Not set", daysToExpiry: null as number | null };
  const days = Math.ceil((startOfToday(end) - startOfToday(now)) / 86_400_000);
  if (days < 0) return { label: "Expired", daysToExpiry: days };
  if (days <= EXPIRING_SOON_DAYS) return { label: "Expiring soon", daysToExpiry: days };
  return { label: "Active", daysToExpiry: days };
}

function activePayments(rent: any): any[] {
  return (Array.isArray(rent?.payments) ? rent.payments : []).filter((payment: any) => !payment?.voided);
}

function paidTotal(rent: any): number {
  return round2(
    activePayments(rent).reduce((sum: number, payment: any) => sum + safeNumber(payment?.amount), 0),
  );
}

/**
 * Single source of truth for a payable's status. Denormalized `paidAmount` and
 * `status` are recomputed here after every mutation instead of being trusted
 * from stored values, so they can never drift from the payment ledger.
 */
function recomputeRentTotals(rent: any) {
  const total = round2(safeNumber(rent?.totalAmount ?? rent?.amount));
  const paid = paidTotal(rent);
  rent.paidAmount = paid;
  rent.status = paid + 0.005 >= total ? "Paid" : paid > 0 ? "Partial" : "Due";
  return rent;
}

function formatRent(rent: any, now: Date) {
  const total = round2(safeNumber(rent?.totalAmount ?? rent?.amount));
  const paid = paidTotal(rent);
  const balance = Math.max(0, round2(total - paid));
  const status = paid + 0.005 >= total ? "Paid" : paid > 0 ? "Partial" : "Due";
  const due = parseDate(rent?.dueDate);
  const isOverdue = status !== "Paid" && !!due && due.getTime() < startOfToday(now);

  return {
    id: safeString(rent?.id),
    recordId: String(rent?._id || ""),
    landlordId: String(rent?.landlordId || ""),
    landlordName: safeString(rent?.landlordName, "Landlord"),
    propertyName: safeString(rent?.propertyName),
    unitLabel: safeString(rent?.unitLabel),
    periodKey: safeString(rent?.periodKey),
    periodLabel: safeString(rent?.periodLabel, periodLabelFromKey(safeString(rent?.periodKey))),
    dueDate: due ? due.toISOString() : "",
    dueDateLabel: formatDateLabel(rent?.dueDate),
    amount: round2(safeNumber(rent?.amount)),
    taxLabel: safeString(rent?.taxLabel),
    taxPercent: safeNumber(rent?.taxPercent),
    taxAmount: round2(safeNumber(rent?.taxAmount)),
    totalAmount: total,
    paidAmount: paid,
    balance,
    status,
    isOverdue,
    notes: safeString(rent?.notes),
    createdAt: rent?.createdAt || null,
    payments: (Array.isArray(rent?.payments) ? rent.payments : []).map((payment: any) => ({
      id: safeString(payment?.id),
      amount: round2(safeNumber(payment?.amount)),
      paidOn: payment?.paidOn || null,
      paidOnLabel: formatDateLabel(payment?.paidOn),
      method: safeString(payment?.method),
      reference: safeString(payment?.reference),
      note: safeString(payment?.note),
      recordedByName: safeString(payment?.recordedByName),
      recordedAt: payment?.recordedAt || null,
      voided: payment?.voided === true,
      voidedAt: payment?.voidedAt || null,
      voidedByName: safeString(payment?.voidedByName),
      voidReason: safeString(payment?.voidReason),
    })),
  };
}

function formatLandlord(landlord: any, now: Date) {
  const agreement = computeAgreementState(landlord, now);
  return {
    id: String(landlord?._id || ""),
    name: safeString(landlord?.name, "Landlord"),
    legalName: safeString(landlord?.legalName),
    contactPerson: safeString(landlord?.contactPerson),
    phone: safeString(landlord?.phone),
    email: safeString(landlord?.email),
    address: safeString(landlord?.address),
    propertyName: safeString(landlord?.propertyName),
    unitLabel: safeString(landlord?.unitLabel),
    agreementNumber: safeString(landlord?.agreementNumber),
    agreementStartDate: landlord?.agreementStartDate || null,
    agreementStartDateLabel: formatDateLabel(landlord?.agreementStartDate),
    agreementEndDate: landlord?.agreementEndDate || null,
    agreementEndDateLabel: formatDateLabel(landlord?.agreementEndDate),
    agreementState: agreement.label,
    daysToExpiry: agreement.daysToExpiry,
    monthlyRent: round2(safeNumber(landlord?.monthlyRent)),
    securityDepositHeld: round2(safeNumber(landlord?.securityDepositHeld)),
    escalationPercent: safeNumber(landlord?.escalationPercent),
    paymentDueDay: safeNumber(landlord?.paymentDueDay, 5),
    noticePeriodDays: safeNumber(landlord?.noticePeriodDays),
    taxLabel: safeString(landlord?.taxLabel),
    taxPercent: safeNumber(landlord?.taxPercent),
    status: safeString(landlord?.status, "Active"),
    notes: safeString(landlord?.notes),
    createdByName: safeString(landlord?.createdByName),
    createdAt: landlord?.createdAt || null,
  };
}

function buildLandlordPayload(body: any) {
  const payload: any = {};

  if (body?.name !== undefined) {
    const name = safeString(body.name);
    if (!name) throw httpError("Landlord name is required.", 400);
    payload.name = name.slice(0, 160);
  }
  const textFields: Array<[string, number]> = [
    ["legalName", 200],
    ["contactPerson", 120],
    ["phone", 40],
    ["email", 180],
    ["address", 300],
    ["propertyName", 160],
    ["unitLabel", 80],
    ["agreementNumber", 80],
    ["taxLabel", 40],
    ["notes", 600],
  ];
  textFields.forEach(([field, limit]) => {
    if (body?.[field] !== undefined) payload[field] = safeString(body[field]).slice(0, limit);
  });

  if (body?.agreementStartDate !== undefined) {
    payload.agreementStartDate = parseDate(body.agreementStartDate);
  }
  if (body?.agreementEndDate !== undefined) {
    payload.agreementEndDate = parseDate(body.agreementEndDate);
  }

  if (body?.monthlyRent !== undefined) {
    const rent = safeNumber(body.monthlyRent, -1);
    if (rent < 0) throw httpError("Monthly rent cannot be negative.", 400);
    payload.monthlyRent = round2(rent);
  }
  if (body?.securityDepositHeld !== undefined) {
    const deposit = safeNumber(body.securityDepositHeld, -1);
    if (deposit < 0) throw httpError("Security deposit cannot be negative.", 400);
    payload.securityDepositHeld = round2(deposit);
  }
  if (body?.escalationPercent !== undefined) {
    const percent = safeNumber(body.escalationPercent, 0);
    if (percent < 0 || percent > 100) throw httpError("Escalation must be between 0 and 100 percent.", 400);
    payload.escalationPercent = percent;
  }
  if (body?.paymentDueDay !== undefined) {
    const day = Math.trunc(safeNumber(body.paymentDueDay, 0));
    if (day < 1 || day > 28) {
      throw httpError("Rent due day must be between 1 and 28 so every month has that date.", 400);
    }
    payload.paymentDueDay = day;
  }
  if (body?.noticePeriodDays !== undefined) {
    const days = Math.trunc(safeNumber(body.noticePeriodDays, 0));
    if (days < 0) throw httpError("Notice period cannot be negative.", 400);
    payload.noticePeriodDays = days;
  }
  if (body?.taxPercent !== undefined) {
    const percent = safeNumber(body.taxPercent, 0);
    if (percent < 0 || percent > 100) throw httpError("Tax percent must be between 0 and 100.", 400);
    payload.taxPercent = percent;
  }
  if (body?.status !== undefined) {
    const status = safeString(body.status);
    if (!["Active", "Inactive", "Archived"].includes(status)) {
      throw httpError("Landlord status must be Active, Inactive or Archived.", 400);
    }
    payload.status = status;
  }

  return payload;
}

async function findLandlordOrThrow(workspaceId: any, landlordId: any) {
  if (!mongoose.isValidObjectId(String(landlordId || ""))) {
    throw httpError("Landlord not found in this workspace.", 404);
  }
  const landlord: any = await FinanceLandlord.findOne({
    _id: landlordId,
    workspaceId, // workspace scope is never taken from the request body
  }).lean();
  if (!landlord) throw httpError("Landlord not found in this workspace.", 404);
  return landlord;
}

async function findRentOrThrow(workspaceId: any, rentId: any) {
  const raw = safeString(rentId);
  if (!raw) throw httpError("Rent record id is required.", 400);
  const query: any = { workspaceId };
  if (mongoose.isValidObjectId(raw)) {
    query.$or = [{ _id: raw }, { id: raw }];
  } else {
    query.id = raw;
  }
  const rent: any = await FinanceLandlordRent.findOne(query);
  if (!rent) throw httpError("Rent payable not found in this workspace.", 404);
  return rent;
}

// ── Landlords ───────────────────────────────────────────────────────────────

export async function listLandlordsForWorkspace(workspaceId: any, userId: any, query: any = {}) {
  await assertFinanceAccess(workspaceId, userId, "view");

  const filter: any = { workspaceId };
  const status = safeString(query.status, "Active");
  if (status && status !== "All") filter.status = status;

  const search = safeString(query.search);
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [
      { name: rx },
      { legalName: rx },
      { propertyName: rx },
      { unitLabel: rx },
      { agreementNumber: rx },
    ];
  }

  const landlords: any[] = await FinanceLandlord.find(filter).sort({ name: 1 }).limit(500).lean();
  const now = new Date();
  const formatted = landlords.map((landlord) => formatLandlord(landlord, now));

  // Summary is computed over ALL active landlords, not just the filtered page,
  // so the commitment figure never changes because someone typed in search.
  const allActive: any[] = await FinanceLandlord.find({ workspaceId, status: "Active" })
    .select("monthlyRent securityDepositHeld agreementEndDate")
    .lean();
  const monthlyCommitment = round2(
    allActive.reduce((sum: number, landlord: any) => sum + safeNumber(landlord?.monthlyRent), 0),
  );
  const depositsHeld = round2(
    allActive.reduce((sum: number, landlord: any) => sum + safeNumber(landlord?.securityDepositHeld), 0),
  );
  const expiringSoon = allActive.filter(
    (landlord: any) => computeAgreementState(landlord, now).label === "Expiring soon",
  ).length;

  return {
    landlords: formatted,
    summary: {
      total: formatted.length,
      active: allActive.length,
      monthlyCommitment,
      depositsHeld,
      expiringSoon,
    },
  };
}

export async function createLandlordForWorkspace(input: {
  workspaceId: any;
  userId: any;
  body?: any;
}) {
  const { workspaceId, userId, body = {} } = input;
  await assertFinanceAccess(workspaceId, userId, "manage");
  const payload = buildLandlordPayload(body);
  if (!payload.name) throw httpError("Landlord name is required.", 400);

  if (
    payload.agreementStartDate &&
    payload.agreementEndDate &&
    payload.agreementEndDate.getTime() < payload.agreementStartDate.getTime()
  ) {
    throw httpError("Agreement end date cannot be before the start date.", 400);
  }

  const actorName = await getActorName(userId);
  const created: any = await FinanceLandlord.create({
    ...payload,
    workspaceId,
    status: payload.status || "Active",
    createdByUserId: userId,
    createdByName: actorName,
    updatedByUserId: userId,
    updatedByName: actorName,
  });

  return { landlord: formatLandlord(created.toObject(), new Date()) };
}

export async function updateLandlordForWorkspace(input: {
  workspaceId: any;
  userId: any;
  landlordId: any;
  body?: any;
}) {
  const { workspaceId, userId, landlordId, body = {} } = input;
  await assertFinanceAccess(workspaceId, userId, "manage");
  const landlord = await findLandlordOrThrow(workspaceId, landlordId);
  const payload = buildLandlordPayload(body);
  if (!Object.keys(payload).length) throw httpError("No landlord fields were provided to update.", 400);

  const nextStart = payload.agreementStartDate ?? parseDate(landlord.agreementStartDate);
  const nextEnd = payload.agreementEndDate ?? parseDate(landlord.agreementEndDate);
  if (nextStart && nextEnd && nextEnd.getTime() < nextStart.getTime()) {
    throw httpError("Agreement end date cannot be before the start date.", 400);
  }

  // Status changes made through the edit form must keep the archive stamp in
  // sync with the archive endpoint, so "Archived" always means archived.
  if (payload.status !== undefined) {
    payload.archivedAt = payload.status === "Archived" ? new Date() : null;
  }

  const actorName = await getActorName(userId);
  const updated: any = await FinanceLandlord.findOneAndUpdate(
    { _id: landlordId, workspaceId },
    { $set: { ...payload, updatedByName: actorName, updatedByUserId: userId } },
    { new: true },
  ).lean();

  return { landlord: formatLandlord(updated, new Date()) };
}

/**
 * Archive is a soft delete: an archived landlord disappears from the pickers
 * and from month generation, but every payable already raised still resolves
 * its name and history. Hard deletion would silently orphan settled rent.
 */
export async function archiveLandlordForWorkspace(input: {
  workspaceId: any;
  userId: any;
  landlordId: any;
  archive?: boolean;
}) {
  const { workspaceId, userId, landlordId } = input;
  await assertFinanceAccess(workspaceId, userId, "manage");
  await findLandlordOrThrow(workspaceId, landlordId);
  const actorName = await getActorName(userId);
  const archived = input.archive !== false;

  const updated: any = await FinanceLandlord.findOneAndUpdate(
    { _id: landlordId, workspaceId },
    {
      $set: {
        status: archived ? "Archived" : "Active",
        archivedAt: archived ? new Date() : null,
        updatedByName: actorName,
        updatedByUserId: userId,
      },
    },
    { new: true },
  ).lean();

  return { landlord: formatLandlord(updated, new Date()) };
}

// ── Monthly rent payables ───────────────────────────────────────────────────

export async function listLandlordRentForWorkspace(workspaceId: any, userId: any, query: any = {}) {
  await assertFinanceAccess(workspaceId, userId, "view");

  const filter: any = { workspaceId };
  const periodKey = safeString(query.periodKey);
  if (periodKey && periodKey !== "All") {
    if (!isPeriodKey(periodKey)) throw httpError("Period must be in YYYY-MM format.", 400);
    filter.periodKey = periodKey;
  }
  if (safeString(query.landlordId) && mongoose.isValidObjectId(safeString(query.landlordId))) {
    filter.landlordId = safeString(query.landlordId);
  }

  const status = safeString(query.status);
  if (status && status !== "All") {
    if (status === "Overdue") {
      filter.status = { $ne: "Paid" };
      filter.dueDate = { $lt: new Date() };
    } else if (["Due", "Partial", "Paid"].includes(status)) {
      filter.status = status;
    } else {
      throw httpError("Status filter must be All, Due, Partial, Paid or Overdue.", 400);
    }
  }

  const search = safeString(query.search);
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [{ landlordName: rx }, { propertyName: rx }, { unitLabel: rx }, { id: rx }];
  }

  const records: any[] = await FinanceLandlordRent.find(filter)
    .sort({ dueDate: -1, createdAt: -1 })
    .limit(600)
    .lean();
  const now = new Date();
  const formatted = records.map((record) => formatRent(record, now));
  const sum = (list: any[], key: string) =>
    round2(list.reduce((total: number, item: any) => total + safeNumber(item?.[key]), 0));

  return {
    records: formatted,
    summary: {
      total: formatted.length,
      totalPayable: sum(formatted, "totalAmount"),
      paidAmount: sum(formatted, "paidAmount"),
      // Outstanding reflects only the balance still owed — never the gross rent.
      outstanding: sum(formatted, "balance"),
      dueCount: formatted.filter((record) => record.status === "Due").length,
      partialCount: formatted.filter((record) => record.status === "Partial").length,
      paidCount: formatted.filter((record) => record.status === "Paid").length,
      overdueCount: formatted.filter((record) => record.isOverdue).length,
      overdueAmount: sum(
        formatted.filter((record) => record.isOverdue),
        "balance",
      ),
    },
  };
}

export async function createLandlordRentForWorkspace(input: {
  workspaceId: any;
  userId: any;
  body?: any;
}) {
  const { workspaceId, userId, body = {} } = input;
  await assertFinanceAccess(workspaceId, userId, "manage");

  const landlord = await findLandlordOrThrow(workspaceId, body.landlordId);
  if (safeString(landlord.status) === "Archived") {
    throw httpError("This landlord is archived. Reactivate it before raising new rent.", 409);
  }

  const periodKey = safeString(body.periodKey) || currentPeriodKey();
  if (!isPeriodKey(periodKey)) throw httpError("Period must be in YYYY-MM format.", 400);

  const existing = await FinanceLandlordRent.findOne({ landlordId: landlord._id, periodKey }).lean();
  if (existing) {
    throw httpError(
      `Rent for ${periodLabelFromKey(periodKey)} already exists for this landlord. Open that record to record a payment instead.`,
      409,
    );
  }

  const amount = body.amount !== undefined ? safeNumber(body.amount, -1) : safeNumber(landlord.monthlyRent);
  if (amount <= 0) throw httpError("Rent amount must be greater than zero.", 400);
  const taxPercent =
    body.taxPercent !== undefined ? safeNumber(body.taxPercent, 0) : safeNumber(landlord.taxPercent);
  if (taxPercent < 0 || taxPercent > 100) throw httpError("Tax percent must be between 0 and 100.", 400);
  const taxAmount = round2((amount * taxPercent) / 100);
  const dueDate = parseDate(body.dueDate) || buildDueDate(periodKey, safeNumber(landlord.paymentDueDay, 5));
  const actorName = await getActorName(userId);

  const created: any = await FinanceLandlordRent.create({
    workspaceId,
    landlordId: landlord._id,
    landlordName: safeString(landlord.name),
    propertyName: safeString(landlord.propertyName),
    unitLabel: safeString(landlord.unitLabel),
    periodKey,
    periodLabel: periodLabelFromKey(periodKey),
    dueDate,
    amount: round2(amount),
    taxLabel: body.taxLabel !== undefined ? safeString(body.taxLabel).slice(0, 40) : safeString(landlord.taxLabel),
    taxPercent,
    taxAmount,
    totalAmount: round2(amount + taxAmount),
    paidAmount: 0,
    status: "Due",
    notes: safeString(body.notes).slice(0, 500),
    createdByUserId: userId,
    createdByName: actorName,
  });

  return { record: formatRent(created.toObject(), new Date()) };
}

/**
 * Raises the month's payables for every Active landlord that has a rent
 * configured. Idempotent: running it twice can never double-charge a month,
 * because the {landlordId, periodKey} unique index + $setOnInsert decide that.
 */
export async function generateLandlordRentForMonth(input: {
  workspaceId: any;
  userId: any;
  periodKey?: string;
}) {
  const { workspaceId, userId } = input;
  await assertFinanceAccess(workspaceId, userId, "manage");

  const periodKey = safeString(input.periodKey) || currentPeriodKey();
  if (!isPeriodKey(periodKey)) throw httpError("Period must be in YYYY-MM format.", 400);

  const landlords: any[] = await FinanceLandlord.find({
    workspaceId,
    status: "Active",
    monthlyRent: { $gt: 0 },
  })
    .select("name propertyName unitLabel monthlyRent taxLabel taxPercent paymentDueDay")
    .lean();

  if (!landlords.length) {
    return {
      created: 0,
      skipped: 0,
      periodKey,
      periodLabel: periodLabelFromKey(periodKey),
      message: "No active landlords with a monthly rent are configured yet.",
    };
  }

  const actorName = await getActorName(userId);
  const operations = landlords.map((landlord: any) => {
    const amount = round2(safeNumber(landlord.monthlyRent));
    const taxPercent = safeNumber(landlord.taxPercent);
    const taxAmount = round2((amount * taxPercent) / 100);
    return {
      updateOne: {
        filter: { landlordId: landlord._id, periodKey },
        update: {
          $setOnInsert: {
            workspaceId,
            landlordId: landlord._id,
            landlordName: safeString(landlord.name),
            propertyName: safeString(landlord.propertyName),
            unitLabel: safeString(landlord.unitLabel),
            id: `LPR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            periodKey,
            periodLabel: periodLabelFromKey(periodKey),
            dueDate: buildDueDate(periodKey, safeNumber(landlord.paymentDueDay, 5)),
            amount,
            taxLabel: safeString(landlord.taxLabel),
            taxPercent,
            taxAmount,
            totalAmount: round2(amount + taxAmount),
            paidAmount: 0,
            status: "Due",
            createdByUserId: userId,
            createdByName: actorName,
          },
        },
        upsert: true,
      },
    };
  });

  let created = 0;
  try {
    const result: any = await FinanceLandlordRent.bulkWrite(operations, { ordered: false });
    created = safeNumber(result?.upsertedCount);
  } catch (error: any) {
    // Concurrent generation: duplicate-key races are expected and harmless —
    // the unique index is the guarantee, so only genuine errors surface.
    if (Number(error?.code) === 11000 || Array.isArray(error?.writeErrors)) {
      created = safeNumber(error?.result?.upsertedCount ?? error?.insertedCount);
    } else {
      throw error;
    }
  }

  return {
    created,
    skipped: Math.max(0, landlords.length - created),
    periodKey,
    periodLabel: periodLabelFromKey(periodKey),
    message: `${created} rent payable${created === 1 ? "" : "s"} raised for ${periodLabelFromKey(periodKey)}.`,
  };
}

export async function updateLandlordRentForWorkspace(input: {
  workspaceId: any;
  userId: any;
  rentId: any;
  body?: any;
}) {
  const { workspaceId, userId, rentId, body = {} } = input;
  await assertFinanceAccess(workspaceId, userId, "manage");
  const rent = await findRentOrThrow(workspaceId, rentId);

  const updates: any = {};
  if (body.amount !== undefined) {
    const amount = safeNumber(body.amount, -1);
    if (amount <= 0) throw httpError("Rent amount must be greater than zero.", 400);
    updates.amount = round2(amount);
  }
  if (body.taxPercent !== undefined) {
    const percent = safeNumber(body.taxPercent, -1);
    if (percent < 0 || percent > 100) throw httpError("Tax percent must be between 0 and 100.", 400);
    updates.taxPercent = percent;
  }
  if (body.dueDate !== undefined) {
    const dueDate = parseDate(body.dueDate);
    if (!dueDate) throw httpError("A valid due date is required.", 400);
    updates.dueDate = dueDate;
  }
  if (body.notes !== undefined) updates.notes = safeString(body.notes).slice(0, 500);

  if (!Object.keys(updates).length) throw httpError("No fields were provided to update.", 400);

  const amount = updates.amount ?? safeNumber(rent.amount);
  const taxPercent = updates.taxPercent ?? safeNumber(rent.taxPercent);
  const taxAmount = round2((amount * taxPercent) / 100);
  updates.taxAmount = taxAmount;
  updates.totalAmount = round2(amount + taxAmount);

  // Settled money can never be edited below what was already paid out — that
  // would leave the ledger with a negative balance and hide an overpayment.
  if (updates.totalAmount + 0.005 < paidTotal(rent)) {
    throw httpError(
      "This month already has payments that exceed the new amount. Void a payment first, then edit.",
      409,
    );
  }

  await FinanceLandlordRent.updateOne({ _id: rent._id, workspaceId }, { $set: updates });
  const refreshed: any = await FinanceLandlordRent.findOne({ _id: rent._id, workspaceId }).lean();
  return { record: formatRent(refreshed, new Date()) };
}

export async function recordLandlordRentPayment(input: {
  workspaceId: any;
  userId: any;
  rentId: any;
  body?: any;
}) {
  const { workspaceId, userId, rentId, body = {} } = input;
  await assertFinanceAccess(workspaceId, userId, "manage");
  const rent = await findRentOrThrow(workspaceId, rentId);

  const amount = safeNumber(body.amount, 0);
  if (amount <= 0) throw httpError("Payment amount must be greater than zero.", 400);

  const total = round2(safeNumber(rent.totalAmount ?? rent.amount));
  const alreadyPaid = paidTotal(rent);
  const balance = round2(total - alreadyPaid);
  if (balance <= 0.005) throw httpError("This month is already fully paid.", 409);
  if (amount > balance + 0.005) {
    throw httpError(
      `Payment exceeds the outstanding balance of ${balance.toFixed(2)}. Record ${balance.toFixed(2)} or void a payment first.`,
      409,
    );
  }

  const actorName = await getActorName(userId);
  rent.payments.push({
    amount: round2(amount),
    paidOn: parseDate(body.paidOn) || new Date(),
    method: safeString(body.method).slice(0, 60),
    reference: safeString(body.reference).slice(0, 120),
    note: safeString(body.note).slice(0, 300),
    recordedByUserId: userId,
    recordedByName: actorName,
    recordedAt: new Date(),
  });
  recomputeRentTotals(rent);
  await rent.save();

  return { record: formatRent(rent.toObject(), new Date()) };
}

/**
 * Reverses a payment without deleting it. A reason is mandatory because this is
 * the only way a settled rent figure can move backwards.
 */
export async function voidLandlordRentPayment(input: {
  workspaceId: any;
  userId: any;
  rentId: any;
  paymentId: any;
  body?: any;
}) {
  const { workspaceId, userId, rentId, paymentId, body = {} } = input;
  await assertFinanceAccess(workspaceId, userId, "manage");
  const rent = await findRentOrThrow(workspaceId, rentId);

  const payment = (rent.payments || []).find((item: any) => safeString(item?.id) === safeString(paymentId));
  if (!payment) throw httpError("Payment not found on this rent record.", 404);
  if (payment.voided) throw httpError("This payment is already voided.", 409);

  const reason = safeString(body.reason);
  if (reason.length < 3) {
    throw httpError("A reason is required to void a payment (minimum 3 characters).", 400);
  }

  const actorName = await getActorName(userId);
  payment.voided = true;
  payment.voidedAt = new Date();
  payment.voidedByUserId = userId;
  payment.voidedByName = actorName;
  payment.voidReason = reason.slice(0, 300);
  recomputeRentTotals(rent);
  await rent.save();

  return { record: formatRent(rent.toObject(), new Date()) };
}
