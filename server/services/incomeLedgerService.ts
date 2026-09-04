// @ts-nocheck
import FinanceIncomeEntry from "../models/FinanceIncomeEntry.js";
import Workspace from "../models/Workspace.js";
import { parseFiscalYearRange } from "../utils/fiscalYear.js";

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
