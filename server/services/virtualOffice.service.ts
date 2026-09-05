// @ts-nocheck
import mongoose from "mongoose";
import { VirtualOffice } from "../models/VirtualOffice.js";
import { Resource } from "../models/Resource.js";
import HostUser from "../models/HostUser.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";
import Department from "../models/Department.js";
import { assertFinancePaymentActor, getActorName, postIncomeEntry } from "./incomeLedgerService.js";
import { uploadFileToS3 } from "../config/s3config.js";

const VIRTUAL_OFFICE_SALES_MODULE = "virtual-office-sales";
const ADMIN_ROLES = new Set(["owner", "super_admin", "founder"]);

function toId(value) {
  return value ? String(value) : "";
}

function normalizeText(value = "") {
  return String(value || "").trim();
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function combineFilters(...filters) {
  const valid = filters.filter(Boolean);
  if (valid.length === 0) return {};
  if (valid.length === 1) return valid[0];
  return { $and: valid };
}

function roundNumber(value = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toDateOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getInitials(name = "") {
  return normalizeText(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase();
}

function buildRecordCode(recordNumber) {
  return `VO-${String(recordNumber).padStart(3, "0")}`;
}

function deriveStatus(termEnd, rentStatus, now = new Date()) {
  const cancelled = normalizeText(rentStatus).toLowerCase();
  if (cancelled === "cancelled") return "Cancelled";
  const end = toDateOrNull(termEnd);
  if (!end) return "Active";
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  return "Active";
}

function buildTermEndDate(start, totalTermMonths) {
  const startDate = toDateOrNull(start);
  if (!startDate) return null;
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + Number(totalTermMonths || 0));
  end.setDate(end.getDate() - 1);
  return end;
}

function buildNextIncrementDate(rentDate, annualIncrement) {
  if (!rentDate || Number(annualIncrement) <= 0) return null;
  const next = new Date(rentDate);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

// Finds the rent-due period that "now" falls inside, given the contract's
// rent day-of-month. `isFirstPeriod` covers the very first billing cycle,
// whose rent is usually settled via the onboarding advance/security deposit
// rather than a logged payment record, so callers should not auto-flag it.
function getCurrentBillingPeriod(rentDate, now) {
  const start = toDateOrNull(rentDate);
  if (!start) return null;
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  let periodStart = new Date(start);
  periodStart.setMonth(periodStart.getMonth() + months);
  if (periodStart.getTime() > now.getTime()) {
    months -= 1;
    periodStart = new Date(start);
    periodStart.setMonth(periodStart.getMonth() + months);
  }
  if (months < 0) return null;
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(periodEnd.getDate() - 1);
  return { periodStart, periodEnd, isFirstPeriod: months === 0 };
}

function computeEffectiveRentStatus(record, now = new Date()) {
  const currentStatus = normalizeText(record.rentStatus);
  if (currentStatus.toLowerCase() === "cancelled") return currentStatus;

  const rentDate = toDateOrNull(record.rentDate);
  if (!rentDate || rentDate.getTime() > now.getTime()) return currentStatus;

  const termEnd = toDateOrNull(record.termEnd);
  if (termEnd && now.getTime() > termEnd.getTime()) return currentStatus;

  const period = getCurrentBillingPeriod(rentDate, now);
  if (!period || period.isFirstPeriod) return currentStatus;

  const monthlyRent = Math.max(0, Number(record.monthlyRent || 0));
  const paymentRecords = Array.isArray(record.paymentRecords) ? record.paymentRecords : [];
  const paidForPeriod = paymentRecords.reduce((sum, p) => {
    const pStart = toDateOrNull(p.periodStart) || toDateOrNull(p.paymentDate);
    const pEnd = toDateOrNull(p.periodEnd) || toDateOrNull(p.paymentDate);
    if (!pStart || !pEnd) return sum;
    const overlaps = pStart.getTime() <= period.periodEnd.getTime() && pEnd.getTime() >= period.periodStart.getTime();
    return sum + (overlaps && p.status === "Paid" ? Number(p.amount || 0) : 0);
  }, 0);

  if (monthlyRent > 0 && paidForPeriod >= monthlyRent) return "Active";
  return "Overdue";
}

// Recomputes and persists rentStatus for any record in `filter` whose current
// billing period has gone unpaid past its due date. Runs on every list/get
// so the flag stays live without needing a background job.
async function syncOverdueRentStatuses(filter) {
  const now = new Date();
  const candidates = await VirtualOffice.find({
    ...filter,
    rentStatus: { $ne: "Cancelled" },
    rentDate: { $ne: null },
  })
    .select("rentDate rentStatus termEnd monthlyRent paymentRecords")
    .lean();

  const ops = [];
  for (const rec of candidates) {
    const effective = computeEffectiveRentStatus(rec, now);
    if (effective && effective !== rec.rentStatus) {
      ops.push({ updateOne: { filter: { _id: rec._id }, update: { $set: { rentStatus: effective } } } });
    }
  }

  if (ops.length > 0) {
    await VirtualOffice.bulkWrite(ops);
  }
}

async function getNextRecordNumber(workspaceId) {
  const latest = await VirtualOffice.findOne({ workspaceId })
    .sort({ recordNumber: -1 })
    .select("recordNumber")
    .lean();
  return (latest?.recordNumber || 1000) + 1;
}

function validateOnboardingInput(input = {}) {
  const errors = [];
  if (!normalizeText(input.clientName) && !normalizeText(input.brandName)) {
    errors.push("Client / brand name is required.");
  }
  if (!normalizeText(input.localPoc?.name)) errors.push("Local POC name is required.");
  if (!normalizeText(input.hoPoc?.name)) errors.push("HO POC name is required.");
  const openDesks = Number(input.openDesks || 0);
  if (!Number.isFinite(openDesks) || openDesks <= 0) {
    errors.push("Open desks must be greater than zero.");
  }
  const openDeskMonthlyRate = Number(input.openDeskMonthlyRate || 0);
  if (!Number.isFinite(openDeskMonthlyRate) || openDeskMonthlyRate <= 0) {
    errors.push("Monthly rate per open desk must be greater than zero.");
  }
  const totalTerm = Number(input.totalTerm || 0);
  if (!Number.isFinite(totalTerm) || totalTerm <= 0) {
    errors.push("Contract term (months) must be greater than zero.");
  }
  if (!toDateOrNull(input.termStart)) {
    errors.push("Term start date is required.");
  }
  if (!toDateOrNull(input.rentDate)) {
    errors.push("Rent due date is required.");
  }
  return errors;
}

// Monthly rent is fully desk-driven: open desks x the per-desk monthly rate.
// openDeskRate (per day) / cabin fields are accepted but no longer feed the
// formula — they're only retained on existing records for historical data.
function computeCalculations(input = {}) {
  const openDesks = Math.max(0, Number(input.openDesks || 0));
  const openDeskMonthlyRate = Math.max(0, Number(input.openDeskMonthlyRate || 0));
  const totalDesks = openDesks;
  const monthlyRent = Math.round(openDesks * openDeskMonthlyRate);

  const totalTerm = Math.max(0, Number(input.totalTerm || 0));
  const advanceMonths = Math.max(0, Number(input.advanceMonths || 0) || 1);

  // Annual increment only applies once the contract runs past a full year.
  const annualIncrement = totalTerm > 12 ? Math.max(0, Number(input.annualIncrement || 0)) : 0;

  // Security deposit is a sales-set percentage of the contract total —
  // left at 0 unless sales explicitly sets a percent or amount, no forced
  // default.
  const totalContract = monthlyRent * totalTerm;
  const securityDepositPercent = Math.max(0, Number(input.securityDepositPercent || 0));
  const securityDeposit = Math.round(totalContract * (securityDepositPercent / 100));

  const advanceAmount = Math.round(monthlyRent * advanceMonths);
  const initialAmount = securityDeposit + advanceAmount;
  const totalMeetingCredits = Math.max(0, Number(input.totalMeetingCredits || 0))
    || Math.round(Math.max(0, Number(input.perDeskMeetingCredits || 0)) * totalDesks);

  return {
    totalDesks,
    monthlyRent,
    totalContract,
    annualIncrement,
    advanceMonths,
    securityDepositPercent,
    securityDeposit,
    advanceAmount,
    initialAmount,
    totalMeetingCredits,
  };
}

async function resolveWorkspaceAccess(userId) {
  const user = await HostUser.findById(userId).lean();
  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 401;
    throw err;
  }
  const member = await WorkspaceMember.findOne({
    user: user._id,
    isActive: true,
    ...(user.primaryWorkspace ? { workspace: user.primaryWorkspace } : {}),
  })
    .populate("role", "name")
    .sort({ isPrimary: -1, createdAt: 1 })
    .lean();

  if (!member) {
    const err = new Error("No active workspace membership found.");
    err.statusCode = 403;
    throw err;
  }

  const workspace = await Workspace.findById(member.workspace).lean();
  if (!workspace) {
    const err = new Error("Workspace not found.");
    err.statusCode = 404;
    throw err;
  }

  const roleName = member.role && typeof member.role === "object"
    ? normalizeText(member.role.name).toLowerCase()
    : normalizeText(member.role).toLowerCase();
  const isAdmin = ADMIN_ROLES.has(roleName);
  const grantedModules = (member.grantedModules || []).map((m) => normalizeText(m).toLowerCase());

  const departmentIds = (member.departments || []).filter(Boolean);
  let departmentNames = [];
  let departmentModuleIds = [];
  if (departmentIds.length > 0) {
    const validDeptIds = departmentIds.filter((id) => mongoose.isValidObjectId(id));
    const depts = validDeptIds.length > 0
      ? await Department.find({ _id: { $in: validDeptIds } }).select("name moduleIds").lean()
      : [];
    departmentNames = depts.map((d) => normalizeText(d.name).toLowerCase());
    departmentModuleIds = depts.flatMap((d) => (d.moduleIds || []).map((m) => normalizeText(m).toLowerCase()));
  }

  const hasSalesAccess = isAdmin || grantedModules.includes(VIRTUAL_OFFICE_SALES_MODULE)
    || departmentModuleIds.includes(VIRTUAL_OFFICE_SALES_MODULE)
    || departmentNames.some((d) => d.includes("sales"));

  return {
    user,
    workspace,
    member,
    workspaceId: toId(member.workspace),
    role: roleName,
    isAdmin,
    hasSalesAccess,
    grantedModules,
    departments: departmentNames,
  };
}

function formatRecord(record) {
  if (!record) return null;
  const calcs = computeCalculations(record);
  const status = deriveStatus(record.termEnd, record.rentStatus);
  return {
    ...record,
    recordCode: record.recordCode || buildRecordCode(record.recordNumber),
    clientName: normalizeText(record.clientName || record.brandName || ""),
    status,
    initials: getInitials(record.clientName || record.brandName),
    termStart: record.termStart ?? record.rentDate,
    monthlyRent: roundNumber(record.monthlyRent || calcs.monthlyRent),
    totalDesks: roundNumber(record.totalDesks ?? calcs.totalDesks),
    totalMeetingCredits: roundNumber(record.totalMeetingCredits ?? calcs.totalMeetingCredits),
    securityDepositPercent: record.securityDepositPercent ?? calcs.securityDepositPercent,
    securityDeposit: roundNumber(record.securityDeposit ?? calcs.securityDeposit),
    advanceAmount: roundNumber(record.advanceAmount ?? calcs.advanceAmount),
    initialAmount: roundNumber(record.initialAmount ?? calcs.initialAmount),
    totalContract: calcs.totalContract,
    termEnd: record.termEnd,
    paymentRecords: Array.isArray(record.paymentRecords) ? record.paymentRecords : [],
  };
}

function ensureExists(record, workspaceId) {
  if (!record || toId(record.workspaceId) !== workspaceId) {
    const err = new Error("Virtual office record not found.");
    err.statusCode = 404;
    throw err;
  }
}

export async function listVirtualOfficesForCurrentUser(userId, query = {}) {
  const access = await resolveWorkspaceAccess(userId);
  const workspaceId = access.workspaceId;

  const baseFilter = { workspaceId };
  await syncOverdueRentStatuses(baseFilter);
  const now = new Date();
  const search = normalizeText(query.search || "");
  const statusValue = normalizeText(query.status || "");
  const rentStatusValue = normalizeText(query.rentStatus || "");

  const searchCond = search
    ? {
        $or: [
          { clientName: new RegExp(escapeRegex(search), "i") },
          { brandName: new RegExp(escapeRegex(search), "i") },
          { recordCode: new RegExp(escapeRegex(search), "i") },
        ],
      }
    : null;
  const statusCond = statusValue && statusValue !== "All Status" ? { status: statusValue } : null;
  const rentStatusCond = rentStatusValue && rentStatusValue !== "All Rent Status"
    ? { rentStatus: rentStatusValue }
    : null;

  const listFilter = combineFilters(baseFilter, searchCond, statusCond, rentStatusCond);

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const skip = (page - 1) * limit;

  const [total, records] = await Promise.all([
    VirtualOffice.countDocuments(listFilter),
    VirtualOffice.find(listFilter)
      .sort({ createdAt: -1, recordNumber: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    records: records.map(formatRecord),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      total: await VirtualOffice.countDocuments(baseFilter),
      active: await VirtualOffice.countDocuments({ ...baseFilter, rentStatus: "Active", status: { $ne: "Cancelled" } }),
      overdue: await VirtualOffice.countDocuments({ ...baseFilter, rentStatus: "Overdue" }),
      pending: await VirtualOffice.countDocuments({ ...baseFilter, rentStatus: "Pending" }),
    },
  };
}

// Mirrors formatTenantCompany()'s space/spaceAssigned computation in
// tenant-company.service.ts, sourced from Resource.assignedVirtualOfficeId
// instead of assignedTenantCompanyId — so the detail page's Space
// Allocation tab reads the same shape as the tenant equivalent.
async function getSpaceAllocationForRecord(record) {
  const assignedResources = await Resource.find({
    workspaceId: record.workspaceId,
    assignedVirtualOfficeId: record._id,
  }).sort({ floor: 1, wing: 1, name: 1 }).lean().exec();

  const assignedResourceLabels = assignedResources
    .map((resource) => normalizeText(
      resource.location || [resource.floor, resource.wing].filter(Boolean).join(" ") || resource.name || resource.resourceCode,
    ))
    .filter(Boolean);
  const locationLabels = [...new Set(assignedResourceLabels)];
  const assignedSeats = [...new Set(
    assignedResources.map((resource) => normalizeText(resource.name || resource.resourceCode)).filter(Boolean),
  )];
  const primaryFloor = normalizeText(assignedResources.find((r) => normalizeText(r.floor))?.floor || "");
  const openDesks = assignedResources
    .filter((r) => r.type === "Open Desk")
    .reduce((sum, r) => sum + Number(r.capacity || 1), 0);
  const cabinDesks = assignedResources
    .filter((r) => r.type === "Cabin Desk")
    .reduce((sum, r) => sum + Number(r.capacity || 1), 0);
  const totalSeats = openDesks + cabinDesks;
  const assignedDate = assignedResources.find((r) => r.assignedAt)?.assignedAt || null;

  return {
    space: {
      floor: primaryFloor,
      primaryFloor,
      seats: assignedSeats,
      assignedDate,
    },
    spaceAssigned: {
      area: primaryFloor,
      primaryFloor,
      locationLabels,
      assignedSeats,
      openDesks,
      cabinDesks,
      totalSeats,
    },
    assignedResources: assignedResources.map((r) => ({
      recordId: r._id,
      name: r.name,
      resourceCode: r.resourceCode,
      type: r.type,
      floor: r.floor,
      wing: r.wing,
      location: r.location,
      capacity: r.capacity,
    })),
  };
}

export async function getVirtualOfficeForCurrentUser(userId, recordId) {
  const access = await resolveWorkspaceAccess(userId);
  await syncOverdueRentStatuses({ _id: recordId, workspaceId: access.workspaceId });
  const record = await VirtualOffice.findById(recordId).lean();
  ensureExists(record, access.workspaceId);
  const allocation = await getSpaceAllocationForRecord(record);
  return { record: { ...formatRecord(record), ...allocation } };
}

export async function createVirtualOfficeForCurrentUser(userId, input = {}) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to onboard virtual office companies. Sales department access required.");
    err.statusCode = 403;
    throw err;
  }

  const errors = validateOnboardingInput(input);
  if (errors.length > 0) {
    const err = new Error(errors[0]);
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

  const calcs = computeCalculations(input);
  const recordNumber = await getNextRecordNumber(access.workspaceId);
  const rentDate = toDateOrNull(input.rentDate);
  const termStart = toDateOrNull(input.termStart) || rentDate;
  const totalTerm = Math.max(1, Number(input.totalTerm || 0));
  const termEnd = buildTermEndDate(termStart, totalTerm);
  const nextIncrementDate = buildNextIncrementDate(termStart, calcs.annualIncrement);
  const lockInMonths = Math.max(0, Number(input.lockInMonths || 0));
  const lockInEnd = lockInMonths > 0 ? buildTermEndDate(termStart, lockInMonths) : null;
  const rentStatus = normalizeText(input.rentStatus || "Active");

  const record = await VirtualOffice.create({
    workspaceId: access.workspaceId,
    ownerId: access.workspace.ownerId || userId,
    recordNumber,
    recordCode: buildRecordCode(recordNumber),
    company: input.company || null,
    clientName: normalizeText(input.clientName || input.brandName || ""),
    brandName: normalizeText(input.brandName || input.clientName || ""),
    sector: normalizeText(input.sector || ""),
    email: normalizeText(input.email || "").toLowerCase(),
    phone: normalizeText(input.phone || ""),
    country: normalizeText(input.country || ""),
    state: normalizeText(input.state || ""),
    city: normalizeText(input.city || ""),
    spaceLocation: normalizeText(input.spaceLocation || ""),
    spaceFloor: normalizeText(input.spaceFloor || ""),
    spaceWing: normalizeText(input.spaceWing || ""),
    service: input.service || null,
    serviceName: normalizeText(input.serviceName || ""),
    hoPoc: {
      name: normalizeText(input.hoPoc?.name || ""),
      email: normalizeText(input.hoPoc?.email || "").toLowerCase(),
      phone: normalizeText(input.hoPoc?.phone || ""),
      address: normalizeText(input.hoPoc?.address || ""),
    },
    localPoc: {
      name: normalizeText(input.localPoc?.name || ""),
      email: normalizeText(input.localPoc?.email || "").toLowerCase(),
      phone: normalizeText(input.localPoc?.phone || ""),
      address: normalizeText(input.localPoc?.address || ""),
    },
    openDesks: Math.max(0, Number(input.openDesks || 0)),
    openDeskRate: Math.max(0, Number(input.openDeskRate || 0)),
    openDeskMonthlyRate: Math.max(0, Number(input.openDeskMonthlyRate || 0)),
    totalDesks: calcs.totalDesks,
    perDeskMeetingCredits: Math.max(0, Number(input.perDeskMeetingCredits || 0)),
    totalMeetingCredits: calcs.totalMeetingCredits,
    termStart,
    rentDate,
    rentStatus,
    annualIncrement: calcs.annualIncrement,
    totalTerm,
    termEnd,
    nextIncrementDate,
    lockInMonths,
    lockInEnd,
    pastDueDate: toDateOrNull(input.pastDueDate),
    securityDepositPercent: calcs.securityDepositPercent,
    securityDeposit: calcs.securityDeposit,
    securityDepositPaid: Boolean(input.securityDepositPaid),
    advanceMonths: calcs.advanceMonths,
    advanceAmount: calcs.advanceAmount,
    monthlyRent: calcs.monthlyRent,
    initialAmount: calcs.initialAmount,
    paymentRecords: Array.isArray(input.paymentRecords) ? input.paymentRecords : [],
    status: normalizeText(input.status || "Active"),
    notes: normalizeText(input.notes || ""),
  });

  return { record: formatRecord(record.toObject()) };
}

export async function updateVirtualOfficeForCurrentUser(userId, recordId, input = {}) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to update virtual office companies. Sales department access required.");
    err.statusCode = 403;
    throw err;
  }

  const record = await VirtualOffice.findById(recordId);
  ensureExists(record, access.workspaceId);
  if (!record) {
    const err = new Error("Virtual office record not found.");
    err.statusCode = 404;
    throw err;
  }

  const merged = { ...record.toObject(), ...input };
  const calcs = computeCalculations(merged);
  const rentDate = toDateOrNull(input.rentDate ?? record.rentDate);
  const termStart = toDateOrNull(input.termStart ?? record.termStart ?? record.rentDate);
  const totalTerm = Math.max(1, Number(input.totalTerm ?? (record.totalTerm || 0)));
  const termEnd = buildTermEndDate(termStart, totalTerm);
  const lockInMonths = Math.max(0, Number(input.lockInMonths ?? record.lockInMonths ?? 0));
  const lockInEnd = lockInMonths > 0 ? buildTermEndDate(termStart, lockInMonths) : null;

  Object.assign(record, {
    company: input.company !== undefined ? input.company : record.company,
    clientName: normalizeText(input.clientName ?? record.clientName),
    brandName: normalizeText(input.brandName ?? record.brandName),
    sector: normalizeText(input.sector ?? record.sector),
    email: normalizeText(input.email ?? record.email).toLowerCase(),
    phone: normalizeText(input.phone ?? record.phone),
    country: normalizeText(input.country ?? record.country),
    state: normalizeText(input.state ?? record.state),
    city: normalizeText(input.city ?? record.city),
    spaceLocation: normalizeText(input.spaceLocation ?? record.spaceLocation),
    spaceFloor: normalizeText(input.spaceFloor ?? record.spaceFloor),
    spaceWing: normalizeText(input.spaceWing ?? record.spaceWing),
    service: input.service !== undefined ? input.service : record.service,
    serviceName: normalizeText(input.serviceName ?? record.serviceName),
    hoPoc: {
      ...(record.hoPoc || {}),
      ...(input.hoPoc || {}),
    },
    localPoc: {
      ...(record.localPoc || {}),
      ...(input.localPoc || {}),
    },
    openDesks: Math.max(0, Number(input.openDesks ?? record.openDesks)),
    openDeskRate: Math.max(0, Number(input.openDeskRate ?? record.openDeskRate)),
    openDeskMonthlyRate: Math.max(0, Number(input.openDeskMonthlyRate ?? record.openDeskMonthlyRate)),
    totalDesks: calcs.totalDesks,
    perDeskMeetingCredits: Math.max(0, Number(input.perDeskMeetingCredits ?? record.perDeskMeetingCredits)),
    totalMeetingCredits: calcs.totalMeetingCredits,
    termStart: termStart || record.termStart,
    rentDate: rentDate || record.rentDate,
    rentStatus: normalizeText(input.rentStatus ?? record.rentStatus),
    annualIncrement: calcs.annualIncrement,
    totalTerm,
    termEnd,
    nextIncrementDate: buildNextIncrementDate(termStart, calcs.annualIncrement),
    lockInMonths,
    lockInEnd,
    pastDueDate: input.pastDueDate !== undefined ? toDateOrNull(input.pastDueDate) : record.pastDueDate,
    securityDepositPercent: calcs.securityDepositPercent,
    securityDeposit: calcs.securityDeposit,
    securityDepositPaid: input.securityDepositPaid !== undefined ? Boolean(input.securityDepositPaid) : record.securityDepositPaid,
    advanceMonths: calcs.advanceMonths,
    advanceAmount: calcs.advanceAmount,
    monthlyRent: calcs.monthlyRent,
    initialAmount: calcs.initialAmount,
    status: normalizeText(input.status ?? record.status),
    notes: input.notes !== undefined ? normalizeText(input.notes) : record.notes,
  });

  if (Array.isArray(input.paymentRecords)) {
    record.paymentRecords = input.paymentRecords;
  }

  await record.save();
  return { record: formatRecord(record.toObject()) };
}

export async function deleteVirtualOfficeForCurrentUser(userId, recordId) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to delete virtual office companies. Sales department access required.");
    err.statusCode = 403;
    throw err;
  }
  const record = await VirtualOffice.findById(recordId);
  ensureExists(record, access.workspaceId);
  await VirtualOffice.deleteOne({ _id: recordId });
  return { success: true };
}

export async function recordRentPaymentForCurrentUser(userId, recordId, input = {}) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to record rent payments. Sales department access required.");
    err.statusCode = 403;
    throw err;
  }
  const record = await VirtualOffice.findById(recordId);
  ensureExists(record, access.workspaceId);
  if (!record) {
    const err = new Error("Virtual office record not found.");
    err.statusCode = 404;
    throw err;
  }

  const paymentRecords = Array.isArray(record.paymentRecords) ? [...record.paymentRecords] : [];
  const periodStart = toDateOrNull(input.periodStart);
  const periodEnd = toDateOrNull(input.periodEnd);
  const newRecord = {
    periodStart,
    periodEnd,
    monthLabel: normalizeText(input.monthLabel || ""),
    amount: Math.max(0, Number(input.amount || 0)),
    status: ["Paid", "Partially Paid", "Pending", "Overdue"].includes(input.status) ? input.status : "Paid",
    transactionId: normalizeText(input.transactionId || ""),
    paymentDate: toDateOrNull(input.paymentDate) || new Date(),
    paymentMethod: normalizeText(input.paymentMethod || ""),
    notes: normalizeText(input.notes || ""),
  };
  paymentRecords.push(newRecord);
  record.paymentRecords = paymentRecords;

  // Only sum payments belonging to the same billing period as the one just
  // recorded, not every payment ever made — otherwise one fully-paid month
  // permanently marks the contract "Active" even as later months lapse.
  const monthlyRent = Math.max(0, Number(record.monthlyRent || 0));
  const recordsForPeriod = periodStart && periodEnd
    ? paymentRecords.filter((p) => {
        const pStart = toDateOrNull(p.periodStart);
        const pEnd = toDateOrNull(p.periodEnd);
        return pStart && pEnd && pStart.getTime() === periodStart.getTime() && pEnd.getTime() === periodEnd.getTime();
      })
    : [newRecord];
  const paidForPeriod = recordsForPeriod.reduce((sum, p) => sum + (p.status === "Paid" ? Number(p.amount || 0) : 0), 0);
  if (paidForPeriod >= monthlyRent) {
    record.rentStatus = "Active";
  } else if (paidForPeriod > 0) {
    record.rentStatus = "Overdue";
  }

  await record.save();
  return { record: formatRecord(record.toObject()) };
}

// ============================================================================
// Finance-facing: virtual office rent snapshot (Billing & Payments → Virtual Office)
// ============================================================================

function formatVORentDate(value) {
  const date = toDateOrNull(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

// The billing cycle "now" falls inside, plus how much of it has been paid.
function buildVOCurrentPeriod(record, now = new Date()) {
  const period = getCurrentBillingPeriod(record.rentDate, now);
  if (!period) return null;
  const monthlyRent = Math.max(0, Number(record.monthlyRent || 0));
  const payments = Array.isArray(record.paymentRecords) ? record.paymentRecords : [];
  const paidAmount = payments.reduce((sum, p) => {
    const pStart = toDateOrNull(p.periodStart) || toDateOrNull(p.paymentDate);
    const pEnd = toDateOrNull(p.periodEnd) || toDateOrNull(p.paymentDate);
    const overlaps = pStart && pEnd
      && pStart.getTime() <= period.periodEnd.getTime()
      && pEnd.getTime() >= period.periodStart.getTime();
    return sum + (overlaps && p.status === "Paid" ? Number(p.amount || 0) : 0);
  }, 0);
  const status = monthlyRent > 0 && paidAmount >= monthlyRent
    ? "Paid"
    : paidAmount > 0 ? "Partially Paid" : "Due";
  // Unpaid → this cycle's rent date; paid → the next cycle's rent date.
  const nextDueDate = status === "Paid"
    ? new Date(period.periodStart.getFullYear(), period.periodStart.getMonth() + 1, period.periodStart.getDate())
    : period.periodStart;
  return {
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    monthLabel: new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(period.periodStart),
    dueDateLabel: formatVORentDate(nextDueDate),
    paidAmount,
    dueAmount: Math.max(0, monthlyRent - paidAmount),
    status,
  };
}

export async function listVirtualOfficeRentForWorkspace(workspaceId, query = {}) {
  // Keeps rentStatus live (Active ↔ Overdue) without a background job.
  await syncOverdueRentStatuses({ workspaceId });
  const now = new Date();

  const records: any[] = await VirtualOffice.find({ workspaceId, status: { $ne: "Cancelled" } })
    .sort({ createdAt: -1 })
    .limit(300)
    .lean()
    .exec();

  const formatted = records.map((record) => ({
    id: record._id?.toString?.() || "",
    recordCode: record.recordCode || "",
    clientName: normalizeText(record.clientName || record.brandName || ""),
    serviceName: normalizeText(record.serviceName || ""),
    monthlyRent: Math.max(0, Number(record.monthlyRent || 0)),
    rentDate: record.rentDate || null,
    rentDateLabel: formatVORentDate(record.rentDate),
    rentStatus: record.rentStatus || "Active",
    currentPeriod: buildVOCurrentPeriod(record, now),
    termStart: record.termStart || null,
    termEnd: record.termEnd || null,
    paymentRecords: Array.isArray(record.paymentRecords) ? record.paymentRecords : [],
  }));

  const sum = (list: any[]) => list.reduce((acc: number, r: any) => acc + (Number(r) || 0), 0);
  return {
    records: formatted,
    summary: {
      total: formatted.length,
      paid: formatted.filter((r) => r.currentPeriod?.status === "Paid").length,
      due: formatted.filter((r) => r.currentPeriod?.status === "Due").length,
      partiallyPaid: formatted.filter((r) => r.currentPeriod?.status === "Partially Paid").length,
      overdue: formatted.filter((r) => r.rentStatus === "Overdue").length,
      monthlyExpected: sum(formatted.map((r) => r.monthlyRent)),
      outstanding: sum(formatted.filter((r) => r.currentPeriod && r.currentPeriod.status !== "Paid").map((r) => r.currentPeriod.dueAmount)),
    },
  };
}

export async function markVirtualOfficeRentPaidForWorkspace(input: {
  workspaceId: any;
  userId: any;
  recordId: string;
  body?: any;
  file?: any;
}) {
  const { workspaceId, userId, recordId, body = {}, file } = input;
  // Segregation of duties: recording rent payments is finance-only, even
  // though Sales owns the virtual office record itself.
  await assertFinancePaymentActor(workspaceId, userId);

  const record: any = await VirtualOffice.findById(recordId).exec();
  ensureExists(record, workspaceId);

  const now = new Date();
  const period = getCurrentBillingPeriod(record.rentDate, now);
  if (!period) {
    throw Object.assign(new Error("This virtual office has no rent due date set, so there is no open billing period."), { statusCode: 409 });
  }

  const monthlyRent = Math.max(0, Number(record.monthlyRent || 0));
  const paymentRecords = Array.isArray(record.paymentRecords) ? [...record.paymentRecords] : [];
  const paidForPeriod = paymentRecords.reduce((sum, p) => {
    const pStart = toDateOrNull(p.periodStart) || toDateOrNull(p.paymentDate);
    const pEnd = toDateOrNull(p.periodEnd) || toDateOrNull(p.paymentDate);
    const overlaps = pStart && pEnd
      && pStart.getTime() <= period.periodEnd.getTime()
      && pEnd.getTime() >= period.periodStart.getTime();
    return sum + (overlaps && p.status === "Paid" ? Number(p.amount || 0) : 0);
  }, 0);
  if (monthlyRent > 0 && paidForPeriod >= monthlyRent) {
    throw Object.assign(new Error("This billing period's rent is already fully paid."), { statusCode: 409 });
  }

  const actorName = await getActorName(userId);
  const amount = Math.max(0, Number(body?.amount || (monthlyRent - paidForPeriod)));
  if (!(amount > 0) || paidForPeriod + amount > monthlyRent) {
    throw Object.assign(new Error("Payment amount must be positive and cannot exceed the remaining rent."), { statusCode: 409 });
  }
  const originalRentStatus = record.rentStatus;
  const paymentId = new mongoose.Types.ObjectId().toString();
  const paymentRecord = {
    paymentId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    monthLabel: new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(period.periodStart),
    amount,
    status: "Paid",
    transactionId: normalizeText(body?.transactionId || ""),
    paymentDate: now,
    paymentMethod: normalizeText(body?.paymentMethod || ""),
    notes: normalizeText(body?.notes || `Marked paid by ${actorName || "finance"} from Billing & Payments.`),
    receipt: null,
  };
  // Finance attaches a host-issued receipt to this payment (mirrors tenant rent).
  if (file?.buffer?.length) {
    const receiptName = (file.originalname || "receipt").replace(/[^a-zA-Z0-9._-]/g, "_");
    const route = `finance-receipts/${workspaceId}/${String(record._id || recordId)}/${paymentId}/${now.getTime()}-${receiptName}`;
    let s3Result;
    try {
      s3Result = await uploadFileToS3(route, file);
    } catch {
      s3Result = { id: route, url: "" };
    }
    paymentRecord.receipt = {
      fileName: file.originalname || "receipt",
      fileUrl: s3Result.url || "",
      publicId: s3Result.id || route,
      mimeType: file.mimetype || "",
      size: file.size ? String(file.size) : "",
      uploadedById: userId,
      uploadedByName: actorName,
      uploadedAt: now,
    };
  }
  paymentRecords.push(paymentRecord);
  record.paymentRecords = paymentRecords;
  // Same live-status rule as the Sales-side payment recording.
  const fullyPaid = monthlyRent > 0 && paidForPeriod + amount >= monthlyRent;
  if (fullyPaid) record.rentStatus = "Active";
  else if (paidForPeriod + amount > 0) record.rentStatus = "Overdue";

  await record.save();
  // The period's rent becomes P&L income ONLY when fully paid — one entry per
  // period (idempotent). Compensated rollback on failure.
  if (fullyPaid) {
    try {
      const periodKey = `${period.periodStart.getFullYear()}-${String(period.periodStart.getMonth() + 1).padStart(2, "0")}`;
      const periodLabel = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(period.periodStart);
      await postIncomeEntry({
        workspaceId, source: "virtual-office-rent",
        referredId: `${String(record._id || recordId)}:${periodKey}`,
        periodKey, periodLabel, entityName: normalizeText(record.clientName || record.brandName || ""),
        amount: monthlyRent, postedById: userId, postedByName: actorName,
        note: `Virtual office rent fully paid for ${periodLabel}.`,
      });
    } catch (error) {
      await VirtualOffice.updateOne(
        { _id: record._id, workspaceId, "paymentRecords.paymentId": paymentId },
        { $pull: { paymentRecords: { paymentId } }, $set: { rentStatus: originalRentStatus } },
      );
      throw error;
    }
  }

  return { record: formatRecord(record.toObject()), message: fullyPaid ? "Virtual office rent marked as fully paid." : "Payment recorded." };
}


