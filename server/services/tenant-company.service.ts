// @ts-nocheck
import crypto from "crypto";
import mongoose from "mongoose";
import { TenantCompany } from "../models/TenantCompany.js";
import { PlansPricing } from "../models/PlansPricing.js";
import HostUser from "../models/HostUser.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";
import { uploadFileToS3 } from "../config/s3config.js";
import Department from "../models/Department.js";
import TenantEmployee from "../models/TenantEmployee.js";
import TenantCreditRequest from "../models/TenantCreditRequest.js";
import TenantCreditLedger from "../models/TenantCreditLedger.js";
import TenantAgreementDocument from "../models/TenantAgreementDocument.js";
import { Resource } from "../models/Resource.js";
import VisitorLog from "../models/VisitorLog.js";
import { createNotification } from "../utils/notify.js";
import { parseFiscalYearRange } from "../utils/fiscalYear.js";
import TenantRent from "../models/TenantRent.js";
import {
  ensureCurrentMonthRentRecordForCompany,
  formatTenantRentRecord,
  resolveTenantMonthlyRent,
  getRentPaymentWindow,
} from "./tenantRentService.js";

const TENANT_COMPANIES_SALES_MODULE = "tenant-companies-sales";
const TENANT_COMPANIES_ADMIN_MODULE = "tenant-companies-admin";
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

// Mirrors deriveTenantStatus()'s day-boundary logic as a query condition, so
// server-side status filtering/counting stays consistent with the status the
// API actually returns (which is always derived fresh from contractEnd, not
// read off the possibly-stale stored `status` field).
function buildTenantStatusFilter(status, now = new Date()) {
  const soon = new Date(now.getTime() + 30 * 86400000);
  switch (status) {
    case "Active":
      return { contractEnd: { $gt: soon } };
    case "Expiring Soon":
      return { contractEnd: { $gte: now, $lte: soon } };
    case "Expired":
      return { contractEnd: { $lt: now } };
    case "Pending Space Assignment":
      return { $or: [{ contractEnd: null }, { contractEnd: { $exists: false } }] };
    default:
      return null;
  }
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

function buildTenantCode(tenantNumber) {
  return `TC-${String(tenantNumber).padStart(3, "0")}`;
}

function deriveTenantStatus(contractEnd, now = new Date()) {
  const end = toDateOrNull(contractEnd);
  if (!end) return "Pending Space Assignment";
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  return "Active";
}

function buildContractEndDate(start, durationMonths) {
  const startDate = toDateOrNull(start);
  if (!startDate) return null;
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + Number(durationMonths || 0));
  end.setDate(end.getDate() - 1);
  return end;
}

function formatFileSize(bytes = 0) {
  const value = Number(bytes || 0);
  return value ? `${(value / 1024).toFixed(1)} KB` : "";
}

function normalizeTenantCompanyEmployeeRole(value = "") {
  return normalizeText(value) === "Manager" ? "Manager" : "Employee";
}

function getTenantRoleKey(role = "Employee") {
  return normalizeTenantCompanyEmployeeRole(role) === "Manager" ? "tenant-manager" : "tenant-employee";
}

function validateRequiredTenantEmployeeInput(input = {}) {
  const requiredFields = [
    ["name", "Name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["designation", "Designation"],
    ["role", "Role"],
  ];
  const missingFields = requiredFields
    .filter(([key]) => !normalizeText(input[key]))
    .map(([, label]) => label);

  if (missingFields.length > 0) {
    const err = new Error(`${missingFields.join(", ")} ${missingFields.length === 1 ? "is" : "are"} required.`);
    err.statusCode = 400;
    throw err;
  }

  const email = normalizeText(input.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error("Enter a valid employee email address.");
    err.statusCode = 400;
    throw err;
  }

  if (!["Employee", "Manager"].includes(normalizeText(input.role))) {
    const err = new Error("Select a valid employee role.");
    err.statusCode = 400;
    throw err;
  }
}

function validateRequiredTenantCompanyOnboardingInput(input = {}) {
  if (input.draftMode === true) return;
  const pkg = input.packageDetails || {}, customer = input.customerDetails || {}, company = input.companyDetails || {}, poc = input.pocDetails || {}, agreement = input.agreementDetails || {};
  const required = [[input.companyName, "Company name"], [input.businessType, "Business type"], [input.contactName, "Contact person"], [input.email, "Email"], [input.phone, "Phone number"], [customer.sector, "Company sector"], [customer.hoCountry, "Head-office country"], [customer.hoState, "Head-office state"], [customer.hoCity, "Head-office city"], [company.buildingName, "Building name"], [company.unitNo, "Unit number"], [poc.localPocName, "Local POC name"], [poc.localPocEmail, "Local POC email"], [poc.localPocPhone, "Local POC phone"], [input.pricingPackageId, "Package selection"], [pkg.packageName, "Package name"], [input.contractStart || agreement.startDate, "Agreement start date"], [input.endDate || agreement.endDate, "Agreement end date"]];
  const missing = required.filter(([value]) => !normalizeText(value)).map(([, label]) => label);
  if (missing.length) { const err = new Error(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`); err.statusCode = 400; throw err; }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, phonePattern = /^\+?[\d\s()-]{7,15}$/;
  if (!emailPattern.test(normalizeText(input.email).toLowerCase()) || !emailPattern.test(normalizeText(poc.localPocEmail).toLowerCase())) { const err = new Error("Enter valid company and local POC email addresses."); err.statusCode = 400; throw err; }
  if (!phonePattern.test(normalizeText(input.phone)) || !phonePattern.test(normalizeText(poc.localPocPhone))) { const err = new Error("Enter valid company and local POC phone numbers."); err.statusCode = 400; throw err; }
  const totalSeats = Number(pkg.totalSeats || 0), openDesks = Number(pkg.openDesks || 0), cabinDesks = Number(pkg.cabinDesks || 0), duration = Number(input.contractDurationMonths || agreement.lockInPeriod || 0);
  const mappings = Array.isArray(pkg.locationMappings) ? pkg.locationMappings : [], startDate = new Date(input.contractStart || agreement.startDate), endDate = new Date(input.endDate || agreement.endDate);
  let message = "";
  if (totalSeats <= 0) message = "Select at least one tenant company seat."; else if (!mappings.length) message = "Select at least one tenant company location or desk block."; else if (openDesks > 0 && Number(pkg.ratePerOpenDesk || 0) <= 0) message = "Open desk rate must be greater than zero."; else if (cabinDesks > 0 && Number(pkg.ratePerCabinDesk || 0) <= 0) message = "Cabin desk rate must be greater than zero."; else if (Number(pkg.creditsPerSeat || 0) <= 0) message = "Credits per seat must be greater than zero."; else if (Number(pkg.monthlyTotalCredits || input.creditsAllocated || 0) <= 0) message = "Monthly credits must be greater than zero."; else if (duration < 3) message = "Contract duration must be at least 3 months."; else if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) message = "Agreement end date must be after the start date.";
  if (message) { const err = new Error(message); err.statusCode = 400; throw err; }
}
function findEmployeeIndex(employees = [], employeeId = "") {
  const lookup = normalizeText(employeeId).toLowerCase();
  if (!lookup) return -1;
  return employees.findIndex((emp) => {
    const id = normalizeText(emp.id).toLowerCase();
    const email = normalizeText(emp.email).toLowerCase();
    const userId = normalizeText((emp.userId?.toString?.() || emp.userId) || "").toLowerCase();
    return id === lookup || email === lookup || userId === lookup;
  });
}

function formatDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata", month: "short", day: "2-digit", year: "numeric",
  }).format(d);
}

function getTenantBaseCredits(company = {}) {
  return Math.max(0, roundNumber(
    company?.packageDetails?.monthlyTotalCredits
    || company?.packageDetails?.monthlyCredits
    || company?.creditConfiguration?.monthlyTotalCredits
    || 0
  ));
}

function getTenantPurchasedCredits(company = {}) {
  const allocatedCredits = Math.max(0, roundNumber(company?.creditsAllocated || 0));
  const storedPurchasedCredits = Math.max(0, roundNumber(company?.addOnCredits?.purchasedCredits || 0));
  const derivedPurchasedCredits = Math.max(0, allocatedCredits - getTenantBaseCredits(company));
  return Math.max(storedPurchasedCredits, derivedPurchasedCredits);
}

function formatUsageCreditHistoryEntries(historyEntries = []) {
  return (Array.isArray(historyEntries) ? historyEntries : [])
    .map((history) => {
      const dateAt = history?.date || history?.createdAt || null;
      return {
        ...history,
        date: dateAt,
        dateAt,
        remainingCredits: Number(history?.remainingCredits || 0),
        used: Number(history?.used || history?.debited || 0),
        credited: Number(history?.credited || 0),
      };
    })
    .sort((left, right) => new Date(right.dateAt || 0).getTime() - new Date(left.dateAt || 0).getTime());
}

function buildCreditPurchaseHistoryEntries(creditRequests = [], currentCreditsAllocated = 0) {
  return (Array.isArray(creditRequests) ? creditRequests : [])
    .filter((request) => ["CREDITS_ADDED", "COMPLETED"].includes(request.status) || request.creditsAddedAt)
    .map((request) => {
      const credited = roundNumber(request.approvedCredits || request.requestedCredits || 0);
      const dateAt = request.creditsAddedAt || request.completedAt || request.invoiceGeneratedAt || request.financeVerifiedAt || request.updatedAt || request.requestedAt || null;
      return {
        id: `credit-purchase-${request.id}`,
        date: dateAt,
        dateAt,
        type: "Purchased Credits",
        resource: "Extra Credits Purchase",
        bookedBy: request.creditsAddedByName || request.requestedByName || request.requestedByEmail || "",
        bookingCode: request.id || "",
        roomName: "Extra Credits Purchase",
        location: "Tenant account",
        wing: "",
        startTime: "",
        endTime: "",
        status: "Credits Added",
        remainingCredits: Math.max(0, roundNumber(currentCreditsAllocated || 0)),
        used: 0,
        credited,
        transactionId: request.paymentTransactionId || "",
        invoiceNumber: request.invoiceNumber || "",
        invoiceFileUrl: request.invoiceFileUrl || "",
      };
    });
}

async function getNextTenantNumber(workspaceId) {
  const latest = await TenantCompany.findOne({ workspaceId })
    .sort({ tenantNumber: -1 })
    .select("tenantNumber")
    .lean();
  return (latest?.tenantNumber || 100) + 1;
}

async function buildWorkspaceAccess(userId, workspaceId) {
  const user = await HostUser.findById(userId).lean();
  const workspace = await Workspace.findById(workspaceId).lean();
  return { user, workspace };
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

  const hasSalesAccess = isAdmin || grantedModules.includes(TENANT_COMPANIES_SALES_MODULE)
    || departmentModuleIds.includes(TENANT_COMPANIES_SALES_MODULE)
    || departmentNames.some((d) => d.includes("sales"));
  const hasAdminAccess = isAdmin || grantedModules.includes(TENANT_COMPANIES_ADMIN_MODULE)
    || departmentModuleIds.includes(TENANT_COMPANIES_ADMIN_MODULE)
    || departmentNames.some((d) => d.includes("administration") || d.includes("admin"));

  return {
    user,
    workspace,
    member,
    workspaceId: toId(member.workspace),
    role: roleName,
    isAdmin,
    hasSalesAccess,
    hasAdminAccess,
    grantedModules,
    departments: departmentNames,
  };
}

// Resolves the calling user's tenant identity directly from TenantEmployee.
// Tenant employees are linked to a HostUser by email (set during registration)
// and do NOT have a WorkspaceMember record, so resolveWorkspaceAccess() cannot
// be used for tenant self-service endpoints.
async function resolveTenantEmployeeForCurrentUser(userId) {
  const user = await HostUser.findById(userId).lean();
  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 401;
    throw err;
  }

  const employee = await TenantEmployee.findOne({
    userId: user._id,
    status: "Active",
  }).lean();

  if (!employee) {
    const err = new Error("No active tenant employee record is linked to your account.");
    err.statusCode = 403;
    throw err;
  }

  const workspaceId = toId(employee.workspaceId);
  const tenantRole = getTenantRoleKey(employee.role).toLowerCase();
  const canManage = ["tenant-admin", "admin", "manager"].some((r) => tenantRole.includes(r));

  return { user, employee, workspaceId, tenantCompanyId: toId(employee.tenantCompanyId), tenantRole, canManage };
}

function ensureTenantCompanyExists(company, workspaceId) {
  if (!company || toId(company.workspaceId) !== workspaceId) {
    const err = new Error("Tenant company not found.");
    err.statusCode = 404;
    throw err;
  }
}

async function sendEmployeeInviteEmail(email, name, invitedByName, role, companyName, inviteUrl) {
  try {
    const { sendMail } = await import("../config/mailer.js");
    const EMAIL_FONT = "'Poppins','Segoe UI',Arial,sans-serif";
    await sendMail({
      to: email,
      subject: `You're invited to join ${companyName} as a ${role}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:${EMAIL_FONT};">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);font-family:${EMAIL_FONT};">
                <tr><td style="background:#2563EB;padding:32px 40px;">
                  <p style="margin:0;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;font-family:${EMAIL_FONT};">You're Invited &#128227;</p>
                  <p style="margin:8px 0 0;font-size:13px;font-weight:500;color:#bfdbfe;font-family:${EMAIL_FONT};">Join ${companyName} as a ${role}</p>
                </td></tr>
                <tr><td style="padding:32px 40px;">
                  <p style="margin:0 0 24px;font-size:15px;font-weight:500;color:#334155;font-family:${EMAIL_FONT};">Hi <strong>${name}</strong>,</p>
                  <p style="margin:0 0 24px;font-size:15px;font-weight:400;color:#334155;line-height:1.6;font-family:${EMAIL_FONT};">
                    <strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> as a
                    <strong>${role}</strong>. Click the button below to set up your account and get started.
                  </p>
                  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                    <tr>
                      <td align="center" style="background:#2563EB;border-radius:8px;padding:0;">
                        <a href="${inviteUrl}" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:${EMAIL_FONT};">Accept Invitation</a>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;margin-bottom:24px;">
                    <tr><td style="padding:14px 18px;font-size:12px;font-weight:500;color:#64748b;font-family:${EMAIL_FONT};">
                      This invite link will expire in <strong>7 days</strong>. If you have any questions, please contact your manager.
                    </td></tr>
                  </table>
                </td></tr>
                <tr><td style="background:#f1f5f9;padding:20px 40px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:11px;font-weight:500;color:#94a3b8;font-family:${EMAIL_FONT};">This is an automated invitation. Please do not reply to this email.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });
  } catch (err) {
    console.error("[tenant-company] invite email failed:", err?.message);
  }
}

async function sendEmployeeAccessEmail(email, name, companyName, loginUrl) {
  try {
    const { sendMail } = await import("../config/mailer.js");
    await sendMail({
      to: email,
      subject: `Access granted to ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                <tr><td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Access Granted</h1>
                </td></tr>
                <tr><td style="padding:36px 40px 28px;">
                  <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">Hello ${name},</p>
                  <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">
                    You now have access to <strong>${companyName}</strong> as a team member. Sign in with your existing credentials to continue.
                  </p>
                  <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                    <tr>
                      <td align="center" style="background:#2563eb;border-radius:8px;padding:0;">
                        <a href="${loginUrl}" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Sign In</a>
                      </td>
                    </tr>
                  </table>
                </td></tr>
                <tr><td style="padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#aaa;">&copy; ${new Date().getFullYear()} WONO Nomads. All rights reserved.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });
  } catch (err) {
    console.error("[tenant-company] access email failed:", err?.message);
  }
}

function formatPricingPackage(pkg) {
  if (!pkg) return null;
  const openDesks = Number(pkg.openDesks || 0);
  const cabinDesks = Number(pkg.cabinDesks || 0);
  const breakdownSeats = openDesks + cabinDesks;
  const totalSeats = breakdownSeats > 0 ? breakdownSeats : (Number(pkg.totalSeats || pkg.seatsIncluded || 0));
  const creditsPerSeat = roundNumber(pkg.creditsPerSeat || 0);
  const monthlyCredits = Number(
    (pkg.monthlyCredits || pkg.creditsIncluded || 0) ||
    (totalSeats > 0 && creditsPerSeat > 0 ? roundNumber(totalSeats * creditsPerSeat) : 0),
  );
  return {
    recordId: pkg._id,
    id: pkg.packageCode,
    packageCode: pkg.packageCode,
    _id: pkg._id,
    category: pkg.category,
    name: pkg.name,
    creditsIncluded: roundNumber(pkg.creditsIncluded || 0),
    price: Number(pkg.price || 0),
    durationMonths: Number(pkg.durationMonths || 0),
    seatsIncluded: Number(pkg.seatsIncluded || 0),
    totalSeats,
    openDesks,
    cabinDesks,
    ratePerOpenDesk: roundNumber(pkg.ratePerOpenDesk || 0),
    ratePerCabinDesk: roundNumber(pkg.ratePerCabinDesk || 0),
    creditsPerSeat,
    monthlyCredits,
    locationMappings: Array.isArray(pkg.locationMappings) ? pkg.locationMappings.map((m) => ({
      floor: normalizeText(m.floor || ""),
      wing: normalizeText(m.wing || ""),
      locationCode: normalizeText(m.locationCode || ""),
      label: normalizeText(m.label || ""),
      seatType: m.seatType || "mixed",
      seatsAllocated: Number(m.seatsAllocated || 0),
    })) : [],
    description: pkg.description || "",
    features: Array.isArray(pkg.features) ? pkg.features : [],
    isRecommended: Boolean(pkg.isRecommended),
    isCustom: Boolean(pkg.isCustom),
    sourceTenantCompanyId: pkg.sourceTenantCompanyId || null,
    assignedTenantCompanyId: pkg.assignedTenantCompanyId || null,
    assignedTenantCompanyName: normalizeText(pkg.assignedTenantCompanyName || ""),
    status: pkg.status || "Active",
    sortOrder: Number(pkg.sortOrder || 0),
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}

// `preloaded` lets bulk callers (e.g. listTenantCompaniesForCurrentUser) hand in
// results already fetched via a single batched $in query per collection, instead
// of this function issuing its own 5 queries per company (N+1 on list pages).
async function formatTenantCompany(company, preloaded = null) {
  if (!company) return null;

  const [employees, creditRequests, agreementDocuments, creditHistory, assignedResources] = preloaded
    ? [
        preloaded.employees || [],
        preloaded.creditRequests || [],
        preloaded.agreementDocuments || [],
        preloaded.creditHistory || [],
        preloaded.assignedResources || [],
      ]
    : await Promise.all([
        TenantEmployee.find({ tenantCompanyId: company._id }).lean().exec(),
        TenantCreditRequest.find({ tenantCompanyId: company._id }).sort({ requestedAt: -1 }).lean().exec(),
        TenantAgreementDocument.find({ tenantCompanyId: company._id }).sort({ uploadedAt: -1 }).lean().exec(),
        TenantCreditLedger.find({ tenantCompanyId: company._id }).sort({ date: -1 }).lean().exec(),
        Resource.find({
          workspaceId: company.workspaceId,
          assignedTenantCompanyId: company._id,
        }).sort({ floor: 1, wing: 1, name: 1 }).lean().exec(),
      ]);

  const managerEmployee = company.managerEmployeeId
    ? employees.find((e) => e.id === company.managerEmployeeId) || null
    : employees.find((e) => e.role === "Manager") || null;
  const status = deriveTenantStatus(company.contractEnd);
  const creditsAllocated = Number(company.creditsAllocated || 0);
  const creditsUsed = Number(company.creditsUsed || 0);
  const creditsRemaining = Math.max(0, creditsAllocated - creditsUsed);
  const purchasedCredits = getTenantPurchasedCredits(company);
  const usageCreditHistory = formatUsageCreditHistoryEntries(creditHistory || []);
  const purchaseCreditHistory = buildCreditPurchaseHistoryEntries(creditRequests || [], creditsAllocated);
  const combinedCreditHistory = [...purchaseCreditHistory, ...usageCreditHistory].sort(
    (left, right) => new Date(right.dateAt || right.date || 0).getTime() - new Date(left.dateAt || left.date || 0).getTime()
  );
  const packageDetails = company.packageDetails?.toObject
    ? company.packageDetails.toObject()
    : { ...(company.packageDetails || {}) };
  const locationMappings = Array.isArray(packageDetails.locationMappings)
    ? packageDetails.locationMappings.map((mapping) => ({
        ...(mapping?.toObject ? mapping.toObject() : mapping),
        floor: normalizeText(mapping?.floor),
        wing: normalizeText(mapping?.wing),
        locationCode: normalizeText(mapping?.locationCode),
        label: normalizeText(mapping?.label),
        resourceCode: normalizeText(mapping?.resourceCode),
        resourceCategory: normalizeText(mapping?.resourceCategory),
        inventoryMode: normalizeText(mapping?.inventoryMode),
        seatType: normalizeText(mapping?.seatType) || "mixed",
        seatsAllocated: Number(mapping?.seatsAllocated || 0),
      }))
    : [];
  const assignedResourceLabels = assignedResources
    .map((resource) => normalizeText(
      resource.location || [resource.floor, resource.wing].filter(Boolean).join(" ") || resource.name || resource.resourceCode,
    ))
    .filter(Boolean);
  const packageLocationLabels = [...new Set(
    (locationMappings.length > 0
      ? locationMappings.map((mapping) => mapping.label || mapping.locationCode || [mapping.floor, mapping.wing].filter(Boolean).join(" "))
      : assignedResourceLabels
    ).map(normalizeText).filter(Boolean),
  )];
  const assignedSeats = [...new Set(
    assignedResources.map((resource) => normalizeText(resource.name || resource.resourceCode)).filter(Boolean),
  )];
  const mappedFloor = locationMappings.find((mapping) => mapping.floor)?.floor || "";
  const resourceFloor = assignedResources.find((resource) => normalizeText(resource.floor))?.floor || "";
  const primaryFloor = normalizeText(company.space?.floor || mappedFloor || resourceFloor);
  const openDesks = assignedResources
    .filter((r) => r.type === "Open Desk")
    .reduce((sum, r) => sum + Number(r.capacity || 1), 0);
  const cabinDesks = assignedResources
    .filter((r) => r.type === "Cabin Desk")
    .reduce((sum, r) => sum + Number(r.capacity || 1), 0);
  const totalSeats = openDesks + cabinDesks;
  const existingSeats = Array.isArray(company.space?.seats) ? company.space.seats : [];
  const space = {
    ...(company.space?.toObject ? company.space.toObject() : company.space || {}),
    floor: primaryFloor,
    primaryFloor,
    seats: existingSeats.length > 0 ? existingSeats : assignedSeats,
    assignedDate: company.space?.assignedDate || assignedResources.find((resource) => resource.assignedAt)?.assignedAt || null,
  };
  const spaceAssigned = {
    area: primaryFloor,
    primaryFloor,
    locationLabels: packageLocationLabels,
    assignedSeats: space.seats,
    openDesks,
    cabinDesks,
    totalSeats,
  };

  return {
    recordId: company._id,
    id: company.tenantCode,
    // Host workspace this tenant belongs to — tenant-portal pages need it to
    // fetch workspace-scoped data (bookings, business hours) since tenant
    // logins have no primaryWorkspace of their own.
    workspaceId: company.workspaceId ? String(company.workspaceId) : "",
    tenantNumber: company.tenantNumber,
    tenantCode: company.tenantCode,
    companyName: company.companyName,
    contactName: company.contactName,
    email: company.email || "",
    phone: company.phone || "",
    businessType: company.businessType || "",
    pricingPackageId: company.pricingPackageId || null,
    planType: company.planType,
    packageName: company.packageDetails?.packageName || company.planType || "",
    package: company.packageDetails?.packageName || company.planType || "",
    contractStart: company.contractStart ? formatDate(company.contractStart) : "",
    contractEnd: company.contractEnd ? formatDate(company.contractEnd) : "",
    contractStartAt: company.contractStart || null,
    contractEndAt: company.contractEnd || null,
    contractDurationMonths: Number(company.contractDurationMonths || 0),
    creditsAllocated,
    creditsUsed,
    creditsRemaining,
    status,
    notes: company.notes || "",
    managerEmployeeId: company.managerEmployeeId || null,
    managerEmployee,
    customerDetails: company.customerDetails || {},
    companyDetails: { ...(company.companyDetails || {}), status },
    agreementDetails: company.agreementDetails
      ? Object.fromEntries(
          Object.entries(
            company.agreementDetails.toObject ? company.agreementDetails.toObject() : company.agreementDetails
          ).filter(([k]) => k !== 'rentDate' && k !== 'nextIncrement')
        )
      : {},
    ...(company.creditsAllocated !== undefined
      ? { agreementDetails: { ...(company.agreementDetails ? Object.fromEntries(Object.entries(company.agreementDetails.toObject ? company.agreementDetails.toObject() : company.agreementDetails).filter(([k]) => k !== 'rentDate' && k !== 'nextIncrement')) : {}), totalMeetingCredits: Number(company.creditsAllocated || 0) } }
      : {}),
    billingDetails: company.billingDetails || {},
    invoiceDetails: company.invoiceDetails || {},
    pocDetails: company.pocDetails || {},
    packageDetails: { ...packageDetails, locationMappings },
    packageLocationLabels,
    creditConfiguration: company.creditConfiguration || {},
    ratePerCredit: Number(company.creditConfiguration?.ratePerCredit ?? 10) || 10,
    addOnCredits: {
      ...(company.addOnCredits || {}),
      purchasedCredits,
      remainingCredits: creditsRemaining,
    },
    spaceAssigned,
    space,
    employees: employees || [],
    creditRequests: creditRequests || [],
    creditRequestSummary: {
      total: creditRequests.length,
      pending: creditRequests.filter((r) => r.status === "PENDING_SALES_APPROVAL").length,
      completed: creditRequests.filter((r) => r.status === "COMPLETED").length,
      rejected: creditRequests.filter((r) => ["REJECTED", "PAYMENT_FAILED", "PAYMENT_REJECTED"].includes(r.status)).length,
    },
    agreementDocuments: agreementDocuments || [],
    creditHistory: combinedCreditHistory,
    initials: getInitials(company.companyName),
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}
export async function listTenantCompaniesForCurrentUser(userId, query = {}) {
  const access = await resolveWorkspaceAccess(userId);
  const { workspaceId } = access;

  // baseFilter scopes the workspace (+ optional fiscal year window) and is what
  // the dashboard summary counts are computed against — those stay global
  // regardless of the current search/status/package filter. listFilter layers
  // the page's active filters on top, for the paginated rows only.
  const baseFilter = { workspaceId };
  const fiscalYearRange = parseFiscalYearRange(query.fiscalYear);
  if (fiscalYearRange) {
    // A tenant belongs to a fiscal year if its contract overlaps that FY's date range.
    // No contractEnd yet (still active) counts as open-ended, so only contractStart needs to be before the FY's end.
    baseFilter.contractStart = { $lte: fiscalYearRange.end };
    baseFilter.$or = [{ contractEnd: null }, { contractEnd: { $exists: false } }, { contractEnd: { $gte: fiscalYearRange.start } }];
  }

  const now = new Date();
  const search = normalizeText(query.search || "");
  const statusValue = normalizeText(query.status || "");
  const packageValue = normalizeText(query.packageFilter || "");

  const searchCond = search
    ? {
        $or: [
          { companyName: new RegExp(escapeRegex(search), "i") },
          { contactName: new RegExp(escapeRegex(search), "i") },
          { tenantCode: new RegExp(escapeRegex(search), "i") },
        ],
      }
    : null;
  const statusCond = statusValue && statusValue !== "All Status" ? buildTenantStatusFilter(statusValue, now) : null;
  const packageCond = packageValue && packageValue !== "All Packages"
    ? { $or: [{ "packageDetails.packageName": packageValue }, { planType: packageValue }] }
    : null;

  const listFilter = combineFilters(baseFilter, searchCond, statusCond, packageCond);

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const skip = (page - 1) * limit;

  const [total, companies, packages, totalTenants, activeContracts, expiringSoon, expired] = await Promise.all([
    TenantCompany.countDocuments(listFilter),
    TenantCompany.find(listFilter)
      .sort({ createdAt: -1, tenantNumber: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PlansPricing.find({ workspaceId: new mongoose.Types.ObjectId(workspaceId), category: "Tenant" })
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
    TenantCompany.countDocuments(baseFilter),
    TenantCompany.countDocuments(combineFilters(baseFilter, buildTenantStatusFilter("Active", now))),
    TenantCompany.countDocuments(combineFilters(baseFilter, buildTenantStatusFilter("Expiring Soon", now))),
    TenantCompany.countDocuments(combineFilters(baseFilter, buildTenantStatusFilter("Expired", now))),
  ]);

  const companyIds = companies.map((c) => c._id);

  const [allEmployees, allCreditRequests, allAgreementDocuments, allCreditHistory, allAssignedResources] =
    companyIds.length
      ? await Promise.all([
          TenantEmployee.find({ tenantCompanyId: { $in: companyIds } }).lean().exec(),
          TenantCreditRequest.find({ tenantCompanyId: { $in: companyIds } })
            .sort({ requestedAt: -1 })
            .lean()
            .exec(),
          TenantAgreementDocument.find({ tenantCompanyId: { $in: companyIds } })
            .sort({ uploadedAt: -1 })
            .lean()
            .exec(),
          TenantCreditLedger.find({ tenantCompanyId: { $in: companyIds } })
            .sort({ date: -1 })
            .lean()
            .exec(),
          Resource.find({
            workspaceId,
            assignedTenantCompanyId: { $in: companyIds },
          })
            .sort({ floor: 1, wing: 1, name: 1 })
            .lean()
            .exec(),
        ])
      : [[], [], [], [], []];

  const groupById = (docs, key) => {
    const map = new Map();
    for (const doc of docs) {
      const k = String(doc[key] || "");
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(doc);
    }
    return map;
  };

  const employeesByCompany = groupById(allEmployees, "tenantCompanyId");
  const creditRequestsByCompany = groupById(allCreditRequests, "tenantCompanyId");
  const agreementDocumentsByCompany = groupById(allAgreementDocuments, "tenantCompanyId");
  const creditHistoryByCompany = groupById(allCreditHistory, "tenantCompanyId");
  const assignedResourcesByCompany = groupById(allAssignedResources, "assignedTenantCompanyId");

  const tenants = await Promise.all(
    companies.map((c) => {
      const cid = String(c._id);
      return formatTenantCompany(c, {
        employees: employeesByCompany.get(cid) || [],
        creditRequests: creditRequestsByCompany.get(cid) || [],
        agreementDocuments: agreementDocumentsByCompany.get(cid) || [],
        creditHistory: creditHistoryByCompany.get(cid) || [],
        assignedResources: assignedResourcesByCompany.get(cid) || [],
      });
    }),
  );

  return {
    tenants,
    packages: packages.map(formatPricingPackage),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      totalTenants,
      activeContracts,
      expiringSoon,
      expired,
    },
  };
}

export async function getTenantCompanySectorsForCurrentUser(userId) {
  const access = await resolveWorkspaceAccess(userId);
  const raw = await TenantCompany.distinct("customerDetails.sector", {
    workspaceId: access.workspaceId,
    "customerDetails.sector": { $exists: true, $ne: "", $ne: null },
  });
  const sectors = (Array.isArray(raw) ? raw : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return { sectors };
}

export async function getTenantCompanyForCurrentUser(userId, tenantCompanyId) {
  const access = await resolveWorkspaceAccess(userId);
  const company = await TenantCompany.findById(tenantCompanyId).lean();
  ensureTenantCompanyExists(company, access.workspaceId);
  return { tenant: await formatTenantCompany(company) };
}

export async function getMyTenantCompanyForCurrentUser(userId, _userEmail) {
  const { tenantCompanyId } = await resolveTenantEmployeeForCurrentUser(userId);
  const company = await TenantCompany.findById(tenantCompanyId).lean().exec();
  if (!company) {
    const err = new Error("Tenant company not found.");
    err.statusCode = 404;
    throw err;
  }
  return { tenant: await formatTenantCompany(company) };
}

function formatTenantVisitorRequest(visitor) {
  return {
    id: toId(visitor._id),
    recordId: toId(visitor._id),
    fullName: visitor.fullName || "",
    phone: visitor.phone || "",
    email: visitor.email || "",
    company: visitor.company || "",
    purpose: visitor.purpose || "",
    reason: visitor.reason || "",
    tenantCompanyName: visitor.tenantCompanyName || "",
    status: visitor.status || "pending",
    statusKey: visitor.status || "pending",
    approvalStatus: visitor.approvalStatus || "pending",
    rejectionReason: visitor.rejectionReason || "",
    checkInAt: visitor.checkInAt || null,
    checkOutAt: visitor.checkOutAt || null,
    createdAt: visitor.createdAt || null,
    updatedAt: visitor.updatedAt || null,
  };
}

// Requests routed to this tenant employee (the company's designated manager,
// via VisitorLog.hostUser) for Standard Visitor > Tenant Company Visitor
// approval from Visitor Management's Frontdesk Action.
export async function getMyTenantCompanyVisitorRequestsForCurrentUser(userId) {
  const { employee, workspaceId } = await resolveTenantEmployeeForCurrentUser(userId);
  const visitors = await VisitorLog.find({
    workspace: workspaceId,
    hostUser: employee.userId,
    visitorType: "tenant",
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
    .exec();
  return { visitors: visitors.map(formatTenantVisitorRequest) };
}

export async function reviewMyTenantCompanyVisitorRequestForCurrentUser(userId, visitorId, input = {}) {
  const { employee, workspaceId } = await resolveTenantEmployeeForCurrentUser(userId);
  const decision = String(input.decision || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(decision)) {
    const err = new Error("Decision must be approved or rejected.");
    err.statusCode = 400;
    throw err;
  }

  const visitor = await VisitorLog.findOne({ _id: visitorId, workspace: workspaceId });
  if (!visitor) {
    const err = new Error("Visitor request not found.");
    err.statusCode = 404;
    throw err;
  }
  if (!visitor.hostUser || String(visitor.hostUser) !== String(employee.userId)) {
    const err = new Error("This visitor request was not routed to you.");
    err.statusCode = 403;
    throw err;
  }

  if (visitor.status !== "pending") {
    return { visitor: formatTenantVisitorRequest(visitor) };
  }

  visitor.approvalStatus = decision;
  visitor.status = decision === "approved" ? "approved" : "rejected";
  visitor.rejectionReason = decision === "rejected" ? normalizeText(input.reason || "") : "";
  await visitor.save();

  if (visitor.createdByUser) {
    createNotification({
      workspaceId: String(workspaceId),
      recipientUserId: String(visitor.createdByUser),
      actorUserId: String(employee.userId),
      type: "visitor_request_decided",
      category: "system",
      title: decision === "approved" ? "Visitor Request Approved" : "Visitor Request Rejected",
      description: decision === "approved"
        ? `${visitor.fullName}'s visit request was approved. They can now be checked in.`
        : `${visitor.fullName}'s visit request was rejected.${visitor.rejectionReason ? ` Reason: ${visitor.rejectionReason}` : ""}`,
      entityType: "visitor",
      entityId: String(visitor._id),
      entityCode: visitor.visitorCode,
      data: { visitorType: visitor.visitorType, decision },
      priority: "normal",
      dedupeKey: `visitor-decision:${visitor._id}`,
      allowSelf: true,
    });
  }

  return { visitor: formatTenantVisitorRequest(visitor) };
}

export async function createTenantCompanyForCurrentUser(userId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to create tenant companies. Sales department access required.");
    err.statusCode = 403;
    throw err;
  }

  validateRequiredTenantCompanyOnboardingInput(input);

  const tenantNumber = await getNextTenantNumber(access.workspaceId);
  const tenantCode = buildTenantCode(tenantNumber);
  const contractStart = input.contractStart ? new Date(input.contractStart) : null;
  const parsedRentDueDate = input.billingDetails?.rentDueDate ? new Date(input.billingDetails.rentDueDate) : null;
  const validRentDueDate = parsedRentDueDate && !Number.isNaN(parsedRentDueDate.getTime()) ? parsedRentDueDate : null;
  const contractDurationMonths = Math.max(0, Number(input.contractDurationMonths || 0));
  const contractEnd = contractStart && contractDurationMonths > 0
    ? buildContractEndDate(contractStart, contractDurationMonths)
    : null;
  const status = contractEnd ? deriveTenantStatus(contractEnd) : "Pending Space Assignment";
  const creditsAllocated = Math.max(0, Number(input.creditsAllocated || 0));

  const pricingPackageId = input.pricingPackageId && input.pricingPackageId !== '__custom__'
    ? new mongoose.Types.ObjectId(String(input.pricingPackageId))
    : null;

  const company = await TenantCompany.create({
    workspaceId: access.workspaceId,
    ownerId: access.workspace.ownerId || userId,
    tenantNumber,
    tenantCode,
    pricingPackageId,
    companyName: normalizeText(input.companyName),
    contactName: normalizeText(input.contactName),
    email: normalizeText(input.email || "").toLowerCase(),
    phone: normalizeText(input.phone || ""),
    businessType: normalizeText(input.businessType || ""),
    planType: normalizeText(input.planType || "Active"),
    contractStart,
    contractEnd,
    contractDurationMonths,
    creditsAllocated,
    creditsUsed: 0,
    status,
    notes: normalizeText(input.notes || ""),
    customerDetails: {
      clientName: normalizeText(input.customerDetails?.clientName || input.companyName || ""),
      sector: normalizeText(input.customerDetails?.sector || input.businessType || ""),
      hoCountry: normalizeText(input.customerDetails?.hoCountry || ""),
      hoState: normalizeText(input.customerDetails?.hoState || ""),
      hoCity: normalizeText(input.customerDetails?.hoCity || ""),
    },
    companyDetails: {
      buildingName: normalizeText(input.companyDetails?.buildingName || ""),
      unitNo: normalizeText(input.companyDetails?.unitNo || ""),
      cabinDesks: Math.max(0, Number(input.companyDetails?.cabinDesks || 0)),
      ratePerCabinDesk: Math.max(0, Number(input.companyDetails?.ratePerCabinDesk || 0)),
      openDesks: Math.max(0, Number(input.companyDetails?.openDesks || 0)),
      ratePerOpenDesk: Math.max(0, Number(input.companyDetails?.ratePerOpenDesk || 0)),
    },
    agreementDetails: {
      annualIncrement: Math.max(0, Number(input.agreementDetails?.annualIncrement || 0)),
      perDeskMeetingCredits: Math.max(0, Number(input.agreementDetails?.perDeskMeetingCredits || 0)),
      totalMeetingCredits: Math.max(0, Number(input.agreementDetails?.totalMeetingCredits || 0)),
      startDate: input.agreementDetails?.startDate ? new Date(input.agreementDetails.startDate) : contractStart,
      endDate: input.agreementDetails?.endDate ? new Date(input.agreementDetails.endDate) : contractEnd,
      lockInPeriod: Math.max(0, Number(input.agreementDetails?.lockInPeriod || 0)),
    },
    billingDetails: {
      contractDurationMonths: Math.max(0, Number(input.billingDetails?.contractDurationMonths || contractDurationMonths)),
      monthlyRent: Math.max(0, Number(input.billingDetails?.monthlyRent || 0)),
      totalContractAmount: Math.max(0, Number(input.billingDetails?.totalContractAmount || 0)),
      securityDepositAmount: Math.max(0, Number(input.billingDetails?.securityDepositAmount || 0)),
      securityDepositPaidStatus: normalizeText(input.billingDetails?.securityDepositPaidStatus || "Pending") === "Paid" ? "Paid" : "Pending",
      rentDueDate: validRentDueDate,
      rentDueDay: Math.min(31, Math.max(1, Math.round(
        validRentDueDate
          ? validRentDueDate.getUTCDate()
          : (Number(input.billingDetails?.rentDueDay) || 1),
      ))),
    },
    pocDetails: {
      localPocName: normalizeText(input.pocDetails?.localPocName || ""),
      localPocEmail: normalizeText(input.pocDetails?.localPocEmail || "").toLowerCase(),
      localPocPhone: normalizeText(input.pocDetails?.localPocPhone || ""),
      hoPocName: normalizeText(input.pocDetails?.hoPocName || ""),
      hoPocEmail: normalizeText(input.pocDetails?.hoPocEmail || "").toLowerCase(),
      hoPocPhone: normalizeText(input.pocDetails?.hoPocPhone || ""),
    },
    packageDetails: {
      packageName: normalizeText(input.packageDetails?.packageName || input.planType || ""),
      totalSeats: Math.max(0, Number(input.packageDetails?.totalSeats || 0)),
      openDesks: Math.max(0, Number(input.packageDetails?.openDesks || 0)),
      cabinDesks: Math.max(0, Number(input.packageDetails?.cabinDesks || 0)),
      ratePerOpenDesk: Math.max(0, Number(input.packageDetails?.ratePerOpenDesk || 0)),
      ratePerCabinDesk: Math.max(0, Number(input.packageDetails?.ratePerCabinDesk || 0)),
      seatTypeVariants: Array.isArray(input.packageDetails?.seatTypeVariants) ? input.packageDetails.seatTypeVariants : [],
      creditsPerSeat: Math.max(0, Number(input.packageDetails?.creditsPerSeat || 0)),
      monthlyTotalCredits: Math.max(0, Number(input.packageDetails?.monthlyTotalCredits || 0)),
      creditResetCycle: normalizeText(input.packageDetails?.creditResetCycle || "Monthly") || "Monthly",
      creditUsageTracking: normalizeText(input.packageDetails?.creditUsageTracking || ""),
      locationMappings: Array.isArray(input.packageDetails?.locationMappings)
        ? input.packageDetails.locationMappings.map((mapping) => ({
            floor: normalizeText(mapping?.floor),
            wing: normalizeText(mapping?.wing),
            locationCode: normalizeText(mapping?.locationCode),
            label: normalizeText(mapping?.label),
            resourceCode: normalizeText(mapping?.resourceCode),
            resourceCategory: normalizeText(mapping?.resourceCategory),
            inventoryMode: normalizeText(mapping?.inventoryMode),
            seatType: normalizeText(mapping?.seatType) || "mixed",
            seatsAllocated: Math.max(0, Number(mapping?.seatsAllocated || 0)),
          }))
        : [],
    },
    creditConfiguration: {
      monthlyTotalCredits: Math.max(0, Number(input.creditConfiguration?.monthlyTotalCredits || 0)),
      creditResetCycle: normalizeText(input.creditConfiguration?.creditResetCycle || "Monthly") || "Monthly",
      creditUsageTracking: normalizeText(input.creditConfiguration?.creditUsageTracking || ""),
      ratePerCredit: Math.max(0, Number(input.creditConfiguration?.ratePerCredit ?? 10)) || 10,
    },
    addOnCredits: {
      purchasedCredits: Math.max(0, Number(input.addOnCredits?.purchasedCredits || 0)),
      remainingCredits: Math.max(0, Number(input.addOnCredits?.remainingCredits || 0)),
    },
    space: { floor: "", seats: [], assignedDate: null },
  });

  // Generate the current month's rent receivable right away so Finance sees
  // it immediately — the scheduler covers subsequent months.
  try {
    await ensureCurrentMonthRentRecordForCompany(company);
  } catch (rentError: any) {
    console.error("Failed to generate first rent record for tenant:", rentError?.message || rentError);
  }

  return {
    tenant: await formatTenantCompany(company),
    message: "Tenant company created successfully.",
  };
}

export async function updateTenantCompanyForCurrentUser(userId, tenantCompanyId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to update tenant companies.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const updatableFields = [
    "companyName", "contactName", "email", "phone", "businessType",
    "planType", "notes", "creditsAllocated", "creditsUsed", "contractDurationMonths",
  ];
  for (const field of updatableFields) {
    if (input[field] !== undefined) {
      if (field === "email") {
        company[field] = normalizeText(input[field]).toLowerCase();
      } else if (["creditsAllocated", "creditsUsed", "contractDurationMonths"].includes(field)) {
        company[field] = Math.max(0, Number(input[field]));
      } else {
        company[field] = normalizeText(input[field]);
      }
    }
  }

  if (input.pricingPackageId !== undefined) {
    company.pricingPackageId = input.pricingPackageId && input.pricingPackageId !== '__custom__'
      ? new mongoose.Types.ObjectId(String(input.pricingPackageId))
      : null;
  }

  if (input.contractStart) {
    company.contractStart = new Date(input.contractStart);
    if (company.contractDurationMonths > 0) {
      company.contractEnd = buildContractEndDate(company.contractStart, company.contractDurationMonths);
    }
  }

  const nestedFields = ["customerDetails", "companyDetails", "agreementDetails", "billingDetails", "pocDetails", "packageDetails", "creditConfiguration", "addOnCredits", "invoiceDetails"];
  for (const field of nestedFields) {
    if (input[field] && typeof input[field] === "object") {
      const existing = company[field] || {};
      for (const [key, value] of Object.entries(input[field])) {
        if (value !== undefined) {
          existing[key] = value;
        }
      }
      company[field] = existing;
    }
  }

  if (company.agreementDetails) {
    delete company.agreementDetails.rentDate;
    delete company.agreementDetails.nextIncrement;
  }

  if (company.billingDetails) {
    const parsedRentDueDate = company.billingDetails.rentDueDate ? new Date(company.billingDetails.rentDueDate) : null;
    if (parsedRentDueDate && !Number.isNaN(parsedRentDueDate.getTime())) {
      company.billingDetails.rentDueDate = parsedRentDueDate;
      // The picked date's day-of-month is the recurring rent anchor.
      company.billingDetails.rentDueDay = Math.min(31, Math.max(1, parsedRentDueDate.getUTCDate()));
    } else {
      const rentDueDay = Math.round(Number(company.billingDetails.rentDueDay ?? 1));
      company.billingDetails.rentDueDay = Number.isFinite(rentDueDay)
        ? Math.min(31, Math.max(1, rentDueDay))
        : 1;
    }
  }

  company.status = deriveTenantStatus(company.contractEnd);
  await company.save();

  // Contract or rent terms may have changed — refresh this month's receivable.
  try {
    await ensureCurrentMonthRentRecordForCompany(company);
  } catch (rentError: any) {
    console.error("Failed to refresh rent record for tenant:", rentError?.message || rentError);
  }

  return {
    tenant: await formatTenantCompany(company),
    message: "Tenant company updated successfully.",
  };
}

export async function renewTenantCompanyForCurrentUser(userId, tenantCompanyId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to renew tenant companies.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const contractStart = input.contractStart ? new Date(input.contractStart) : new Date();
  const contractDurationMonths = Math.max(3, Number(input.contractDurationMonths || 12));
  const contractEnd = buildContractEndDate(contractStart, contractDurationMonths);

  company.contractStart = contractStart;
  company.contractEnd = contractEnd;
  company.contractDurationMonths = contractDurationMonths;

  if (input.creditsAllocated !== undefined) {
    company.creditsAllocated = Math.max(0, Number(input.creditsAllocated));
  }

  if (input.planType) company.planType = normalizeText(input.planType);
  if (input.notes !== undefined) company.notes = normalizeText(input.notes);

  company.creditsUsed = 0;
  company.status = "Active";

  if (input.billingDetails && typeof input.billingDetails === "object") {
    const bd = company.billingDetails || {};
    for (const [key, value] of Object.entries(input.billingDetails)) {
      if (value !== undefined) bd[key] = value;
    }
    company.billingDetails = { ...bd, securityDepositPaidStatus: "Pending" };
  }

  if (company.billingDetails) {
    const parsedRentDueDate = company.billingDetails.rentDueDate ? new Date(company.billingDetails.rentDueDate) : null;
    if (parsedRentDueDate && !Number.isNaN(parsedRentDueDate.getTime())) {
      company.billingDetails.rentDueDate = parsedRentDueDate;
      company.billingDetails.rentDueDay = Math.min(31, Math.max(1, parsedRentDueDate.getUTCDate()));
    } else {
      const rentDueDay = Math.round(Number(company.billingDetails.rentDueDay ?? 1));
      company.billingDetails.rentDueDay = Number.isFinite(rentDueDay)
        ? Math.min(31, Math.max(1, rentDueDay))
        : 1;
    }
  }

  await company.save();

  // Renewal may have moved the contract into a new period — refresh rent.
  try {
    await ensureCurrentMonthRentRecordForCompany(company);
  } catch (rentError: any) {
    console.error("Failed to refresh rent record after renewal:", rentError?.message || rentError);
  }

  return {
    tenant: await formatTenantCompany(company),
    message: "Tenant company renewed successfully.",
  };
}

export async function assignTenantCompanySpaceForCurrentUser(userId, tenantCompanyId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to assign tenant company space.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  company.space = {
    floor: normalizeText(input.floor || ""),
    seats: Array.isArray(input.seats) ? input.seats.map((s) => normalizeText(s)).filter(Boolean) : [],
    assignedDate: new Date(),
  };

  await company.save();

  return {
    tenant: await formatTenantCompany(company),
    message: "Tenant space assignment saved successfully.",
  };
}

export async function addTenantCompanyEmployeeForCurrentUser(userId, tenantCompanyId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to add employees.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  validateRequiredTenantEmployeeInput(input);

  const name = normalizeText(input.name);
  const email = normalizeText(input.email || "").toLowerCase();
  const phone = normalizeText(input.phone || "");
  const designation = normalizeText(input.designation || "");
  const role = normalizeTenantCompanyEmployeeRole(input.role || "Employee");

  const existingEmployee = email
    ? await TenantEmployee.findOne({ tenantCompanyId: company._id, email }).lean().exec()
    : null;

  if (email) {
    const existingUser = await HostUser.findOne({ email }).lean().exec();
    if (existingUser) {
      const err = new Error("This email is already registered. Please use a different email address.");
      err.statusCode = 409;
      throw err;
    }
  }

  if (role === "Manager") {
    const existingManager = await TenantEmployee.findOne({
      tenantCompanyId: company._id,
      role: "Manager",
      ...(existingEmployee?.id ? { id: { $ne: existingEmployee.id } } : {}),
    }).lean().exec();
    if (existingManager) {
      const err = new Error("This tenant company already has a manager. Use Change Manager to assign someone else.");
      err.statusCode = 409;
      throw err;
    }
  }

  const employeeId = existingEmployee ? existingEmployee.id : `TE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const employeeData = {
    tenantCompanyId: company._id,
    workspaceId: company.workspaceId,
    id: employeeId,
    name,
    email,
    phone,
    designation,
    role,
    status: "Active",
    inviteStatus: existingEmployee?.inviteStatus || "Pending",
    invitedAt: existingEmployee?.invitedAt || null,
    inviteSentAt: existingEmployee?.inviteSentAt || null,
    inviteAcceptedAt: existingEmployee?.inviteAcceptedAt || null,
    registeredAt: existingEmployee?.registeredAt || null,
    lastLoginAt: existingEmployee?.lastLoginAt || null,
    inviteToken: existingEmployee?.inviteToken || null,
    inviteTokenExpiresAt: existingEmployee?.inviteTokenExpiresAt || null,
    tenantRole: getTenantRoleKey(role),
    tenantCompanyName: company.companyName,
    userId: existingEmployee?.userId || null,
    inviteId: existingEmployee?.inviteId || null,
  };

  const inviteSent = false;

  let employeeDoc;
  if (existingEmployee) {
    employeeDoc = await TenantEmployee.findOneAndUpdate(
      { tenantCompanyId: company._id, email },
      { $set: employeeData },
      { new: true }
    );
  } else {
    employeeDoc = await TenantEmployee.create(employeeData);
  }

  if (role === "Manager") {
    company.managerEmployeeId = employeeId;
    await company.save();
  } else if (company.managerEmployeeId === employeeId) {
    company.managerEmployeeId = null;
    await company.save();
  }

  return {
    tenant: await formatTenantCompany(company),
    employee: employeeDoc,
    inviteSent,
    message: "Tenant employee added successfully.",
  };
}

const TENANT_EMPLOYEE_INVITE_BLOCKED_STATUSES = new Set(["registered", "logged in"]);

export async function sendTenantCompanyEmployeeInviteForCurrentUser(userId, tenantCompanyId, employeeId) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to send invites.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const employee = await TenantEmployee.findOne({ tenantCompanyId: company._id, id: employeeId });
  if (!employee) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  if (TENANT_EMPLOYEE_INVITE_BLOCKED_STATUSES.has(String(employee.inviteStatus || "").toLowerCase())) {
    const err = new Error("This employee has already registered and no longer needs an invite.");
    err.statusCode = 409;
    throw err;
  }

  const email = normalizeText(employee.email || "").toLowerCase();
  if (!email) {
    const err = new Error("Employee has no email on file to send the invite to.");
    err.statusCode = 400;
    throw err;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const frontendBase = String(process.env.FRONTEND_PROD_LINK || process.env.CLIENT_URL || "http://localhost:3006")
    .trim()
    .replace(/\/$/, "");
  const inviteUrl = `${frontendBase}/register?inviteToken=${rawToken}&email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(employee.name)}`;

  await sendEmployeeInviteEmail(email, employee.name, access.user?.name || "Administration", employee.role, company.companyName, inviteUrl);

  employee.inviteToken = rawToken;
  employee.inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  employee.inviteStatus = "Invited";
  employee.invitedAt = employee.invitedAt || now;
  employee.inviteSentAt = now;
  await employee.save();

  return {
    tenant: await formatTenantCompany(company),
    employee,
    message: "Invite sent successfully.",
  };
}

export async function updateTenantCompanyEmployeeForCurrentUser(userId, tenantCompanyId, employeeId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to update employees.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const employee = await TenantEmployee.findOne({ tenantCompanyId: company._id, id: employeeId });
  if (!employee) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  if (input.name !== undefined) employee.name = normalizeText(input.name);
  if (input.phone !== undefined) employee.phone = normalizeText(input.phone);
  if (input.designation !== undefined) employee.designation = normalizeText(input.designation);
  if (input.role !== undefined) {
    const newRole = normalizeTenantCompanyEmployeeRole(input.role);
    if (newRole === "Manager" && employee.role !== "Manager") {
      const existingManager = await TenantEmployee.findOne({
        tenantCompanyId: company._id,
        role: "Manager",
        id: { $ne: employee.id },
      }).lean().exec();
      if (existingManager) {
        const err = new Error("This tenant company already has a manager. Use Change Manager to assign someone else.");
        err.statusCode = 409;
        throw err;
      }
    }
    employee.role = newRole;
    employee.tenantRole = getTenantRoleKey(newRole);
    if (newRole === "Manager") {
      company.managerEmployeeId = employee.id;
      await company.save();
    } else if (company.managerEmployeeId === employee.id) {
      company.managerEmployeeId = null;
      await company.save();
    }
  }
  await employee.save();

  return {
    tenant: await formatTenantCompany(company),
    employee,
    message: "Tenant employee updated successfully.",
  };
}

export async function updateTenantCompanyEmployeeStatusForCurrentUser(userId, tenantCompanyId, employeeId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to update employee status.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const employee = await TenantEmployee.findOne({ tenantCompanyId: company._id, id: employeeId });
  if (!employee) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  employee.status = input.status === "Inactive" ? "Inactive" : "Active";
  if (input.status === "Inactive" && company.managerEmployeeId === employee.id) {
    company.managerEmployeeId = null;
    employee.role = "Employee";
    employee.tenantRole = getTenantRoleKey("Employee");
    await company.save();
  }
  await employee.save();

  return {
    tenant: await formatTenantCompany(company),
    employee,
    message: "Tenant employee status updated successfully.",
  };
}

export async function deleteTenantCompanyEmployeeForCurrentUser(userId, tenantCompanyId, employeeId) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to remove employees.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const employee = await TenantEmployee.findOne({ tenantCompanyId: company._id, id: employeeId });
  if (!employee) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  await TenantEmployee.deleteOne({ tenantCompanyId: company._id, id: employeeId });

  if (company.managerEmployeeId === employeeId) {
    company.managerEmployeeId = null;
    await company.save();
  }

  return {
    tenant: await formatTenantCompany(company),
    removedEmployee: employee,
    message: "Tenant employee removed successfully.",
  };
}

export async function assignTenantCompanyManagerForCurrentUser(userId, tenantCompanyId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to assign manager.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const targetEmployee = await TenantEmployee.findOne({ tenantCompanyId: company._id, id: input.employeeId });
  if (!targetEmployee) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  if (targetEmployee.status === "Inactive") {
    const err = new Error("Inactive employees cannot be assigned as manager.");
    err.statusCode = 400;
    throw err;
  }

  await TenantEmployee.updateMany(
    { tenantCompanyId: company._id, id: { $ne: input.employeeId } },
    { $set: { role: "Employee", tenantRole: getTenantRoleKey("Employee") } }
  );

  targetEmployee.role = "Manager";
  targetEmployee.tenantRole = getTenantRoleKey("Manager");
  await targetEmployee.save();

  company.managerEmployeeId = targetEmployee.id;
  await company.save();

  return {
    tenant: await formatTenantCompany(company),
    manager: targetEmployee,
    message: "Tenant company manager updated successfully.",
  };
}

export async function uploadTenantCompanyAgreementDocumentsForCurrentUser(userId, tenantCompanyId, files) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to upload documents.");
    err.statusCode = 403;
    throw err;
  }

  const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  if (normalizedFiles.length === 0) {
    const err = new Error("No agreement documents uploaded.");
    err.statusCode = 400;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const uploadedDocuments = await Promise.all(
    normalizedFiles.map(async (file) => {
      const timestamp = Date.now();
      const safeName = (file.originalname || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
      const route = `tenant-companies/${access.workspaceId}/${tenantCompanyId}/${timestamp}-${safeName}`;
      let s3Result;
      try {
        s3Result = await uploadFileToS3(route, file);
      } catch {
        s3Result = { id: route, url: "" };
      }
      return await TenantAgreementDocument.create({
        tenantCompanyId: company._id,
        workspaceId: company.workspaceId,
        name: file.originalname || "document",
        type: file.mimetype || "document",
        mimeType: file.mimetype || "",
        size: formatFileSize(file.size),
        url: s3Result.url || "",
        publicId: s3Result.id || route,
        uploadedAt: new Date(),
      });
    }),
  );

  return {
    tenant: await formatTenantCompany(company),
    agreementDocuments: uploadedDocuments,
    message: "Tenant company agreement documents uploaded successfully.",
  };
}

export async function getMyTenantCompanyCreditRequestsForCurrentUser(userId) {
  const { tenantCompanyId } = await resolveTenantEmployeeForCurrentUser(userId);

  const tenantCompany = await TenantCompany.findById(tenantCompanyId).lean();
  if (!tenantCompany) {
    return { tenant: null, creditRequests: [], creditRequestSummary: { total: 0, pending: 0, completed: 0, rejected: 0 } };
  }

  const creditRequests = await TenantCreditRequest.find({ tenantCompanyId: tenantCompany._id }).sort({ requestedAt: -1 }).lean().exec();
  const formattedTenant = await formatTenantCompany(tenantCompany);

  return {
    tenant: formattedTenant,
    creditRequests,
    creditRequestSummary: {
      total: creditRequests.length,
      pending: creditRequests.filter((r) => r.status === "PENDING_SALES_APPROVAL").length,
      completed: creditRequests.filter((r) => r.status === "COMPLETED").length,
      rejected: creditRequests.filter((r) => ["REJECTED", "PAYMENT_FAILED", "PAYMENT_REJECTED"].includes(r.status)).length,
    },
  };
}

export async function createMyTenantCompanyCreditRequestForCurrentUser(userId, input) {
  const { user, employee, tenantCompanyId, canManage } = await resolveTenantEmployeeForCurrentUser(userId);

  if (!canManage) {
    const err = new Error("Only tenant admins and managers can request credits.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  if (!company) {
    const err = new Error("Tenant company not found for your account.");
    err.statusCode = 404;
    throw err;
  }

  const requestedCredits = Math.max(1, Math.min(100000, Number(input.requestedCredits || 0)));
  // Rate is negotiated per company on the tenant record (Sales sets it from
  // the tenant company form). Fall back to the standard 10 for legacy
  // companies created before the field existed.
  const ratePerCredit = Number(company.creditConfiguration?.ratePerCredit ?? 10) > 0
    ? Number(company.creditConfiguration.ratePerCredit)
    : 10;
  const now = new Date();
  const request = await TenantCreditRequest.create({
    tenantCompanyId: company._id,
    workspaceId: company.workspaceId,
    id: `CRQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requestedCredits,
    approvedCredits: 0,
    ratePerCredit,
    totalAmount: roundNumber(requestedCredits * ratePerCredit),
    status: "PENDING_SALES_APPROVAL",
    invoiceStatus: "Pending",
    requestedReason: normalizeText(input.requestedReason || ""),
    requestedByUserId: userId,
    requestedByName: normalizeText(user?.name || employee?.name || ""),
    requestedByEmail: normalizeText(user?.email || "").toLowerCase(),
    actionHistory: [{
      action: "REQUEST_CREATED",
      status: "PENDING_SALES_APPROVAL",
      note: normalizeText(input.requestedReason || ""),
      actorUserId: userId,
      actorName: normalizeText(user?.name || employee?.name || ""),
      at: now,
    }],
    requestedAt: now,
  });

  return {
    creditRequest: request,
    message: "Tenant credit request submitted successfully.",
  };
}

export async function submitMyTenantCompanyCreditRequestPaymentForCurrentUser(userId, requestId, input, file) {
  if (!file?.buffer?.length) {
    const err = new Error("Payment proof screenshot is required.");
    err.statusCode = 400;
    throw err;
  }

  const user = await HostUser.findById(userId).lean();

  // Use tenant-specific resolver (not workspace membership)
  const employee = await TenantEmployee.findOne({
    status: "Active",
    $or: [
      { userId: user?._id },
      { email: normalizeText(user?.email || "").toLowerCase() },
    ],
  }).lean();

  if (!employee) {
    const err = new Error("No active tenant employee record found for your account.");
    err.statusCode = 403;
    throw err;
  }

  const request = await TenantCreditRequest.findOne({ tenantCompanyId: employee.tenantCompanyId, id: requestId });
  if (!request) {
    const err = new Error("Credit request not found.");
    err.statusCode = 404;
    throw err;
  }

  if (request.status !== "APPROVED_AWAITING_PAYMENT") {
    const err = new Error("This credit request is not ready for payment submission.");
    err.statusCode = 409;
    throw err;
  }

  // Upload the payment proof to S3 (mirrors the agreement-document upload pattern).
  const timestamp = Date.now();
  const safeName = (file.originalname || "payment-proof").replace(/[^a-zA-Z0-9._-]/g, "_");
  const route = `tenant-companies/${employee.workspaceId}/${employee.tenantCompanyId}/credit-requests/${request.id || requestId}/${timestamp}-${safeName}`;
  let s3Result;
  try {
    s3Result = await uploadFileToS3(route, file);
  } catch {
    s3Result = { id: route, url: "" };
  }

  const now = new Date();
  request.status = "PAYMENT_SUBMITTED";
  request.paymentTransactionId = normalizeText(input?.transactionId || "");
  request.paymentProofFileName = file.originalname || "payment-proof";
  request.paymentProofFileUrl = s3Result.url || "";
  request.paymentProofPublicId = s3Result.id || route;
  request.paymentSubmittedAt = now;
  request.updatedAt = now;
  request.actionHistory.push({
    action: "PAYMENT_SUBMITTED",
    status: "PAYMENT_SUBMITTED",
    note: normalizeText(input?.transactionId ? `Transaction ID: ${input.transactionId}` : "Payment proof uploaded."),
    actorUserId: userId,
    actorName: normalizeText(user?.name || ""),
    at: now,
  });

  await request.save();

  return {
    creditRequest: request,
    message: "Payment proof submitted successfully.",
  };
}

// ============================================================================
// Tenant rent (self-service)
// ============================================================================

export async function getMyTenantCompanyRentForCurrentUser(userId) {
  const { tenantCompanyId } = await resolveTenantEmployeeForCurrentUser(userId);

  const [company, records] = await Promise.all([
    TenantCompany.findById(tenantCompanyId).lean(),
    TenantRent.find({ tenantCompanyId }).sort({ dueDate: -1 }).limit(120).lean().exec(),
  ]);
  if (!company) {
    const err = new Error("Tenant company not found.");
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const rentRecords = (records || []).map((record) => formatTenantRentRecord(record, now));

  return {
    company: {
      id: company._id?.toString?.() || "",
      companyName: company.companyName || "",
      tenantCode: company.tenantCode || "",
      monthlyRent: resolveTenantMonthlyRent(company),
      rentDueDate: company?.billingDetails?.rentDueDate || null,
      rentDueDay: Math.min(31, Math.max(1, Math.round(Number(company?.billingDetails?.rentDueDay) || 1))),
    },
    rentRecords,
    message: "Tenant rent records loaded successfully.",
  };
}

export async function submitMyTenantCompanyRentPaymentForCurrentUser(userId, rentId, input = {}, file) {
  if (!file?.buffer?.length) {
    const err = new Error("Payment proof screenshot is required.");
    err.statusCode = 400;
    throw err;
  }

  const user = await HostUser.findById(userId).lean();

  // Use tenant-specific resolver (not workspace membership) — same as the
  // credit-request payment submission.
  const employee = await TenantEmployee.findOne({
    status: "Active",
    $or: [
      { userId: user?._id },
      { email: normalizeText(user?.email || "").toLowerCase() },
    ],
  }).lean();

  if (!employee) {
    const err = new Error("No active tenant employee record found for your account.");
    err.statusCode = 403;
    throw err;
  }

  const tenantRole = getTenantRoleKey(employee.role).toLowerCase();
  const canManage = ["tenant-admin", "admin", "manager"].some((r) => tenantRole.includes(r));
  if (!canManage) {
    const err = new Error("Only tenant admins and managers can submit rent payments.");
    err.statusCode = 403;
    throw err;
  }

  const rent = await TenantRent.findOne({ tenantCompanyId: employee.tenantCompanyId, id: rentId });
  if (!rent) {
    const err = new Error("Rent record not found.");
    err.statusCode = 404;
    throw err;
  }

  if (rent.status === "Paid") {
    const err = new Error("This rent is already fully paid.");
    err.statusCode = 409;
    throw err;
  }
  if (rent.status !== "Due" && rent.status !== "Proof Submitted") {
    const err = new Error("This rent record is not open for payment submission.");
    err.statusCode = 409;
    throw err;
  }

  // Payment window: 1st of the billing month through the due date.
  const paymentWindow = getRentPaymentWindow(rent.dueDate);
  if (paymentWindow && !paymentWindow.isWithin) {
    const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const nowDate = new Date();
    const message = nowDate < paymentWindow.start
      ? `Payments for this rent open on ${fmt(paymentWindow.start)} (due ${fmt(new Date(rent.dueDate))}).`
      : `The due date for this rent (${fmt(new Date(rent.dueDate))}) has passed. Please contact finance — late payments are recorded manually.`;
    const err = new Error(message);
    err.statusCode = 403;
    throw err;
  }

  // Installment amount: default remaining balance, but tenants may pay in
  // chunks — amount must be positive and cannot exceed what is still owed.
  const amount = Math.max(0, Number(input?.amount || 0));
  const verifiedTotal = (Array.isArray(rent.payments) ? rent.payments : [])
    .filter((p) => p?.status === "Verified")
    .reduce((s, p) => s + Number(p?.amount || 0), 0);
  const remaining = Math.max(0, Number(rent.amount || 0) - verifiedTotal);
  if (!(amount > 0)) {
    const err = new Error("A payment amount greater than zero is required.");
    err.statusCode = 400;
    throw err;
  }
  if (amount > remaining) {
    const err = new Error(`Payment amount cannot exceed the remaining rent of ${remaining}.`);
    err.statusCode = 409;
    throw err;
  }

  // Upload the payment proof to S3 (mirrors the credit-request proof upload).
  const timestamp = Date.now();
  const safeName = (file.originalname || "rent-payment-proof").replace(/[^a-zA-Z0-9._-]/g, "_");
  const route = `tenant-companies/${employee.workspaceId}/${employee.tenantCompanyId}/rent/${rent.id || rentId}/${timestamp}-${safeName}`;
  let s3Result;
  try {
    s3Result = await uploadFileToS3(route, file);
  } catch {
    s3Result = { id: route, url: "" };
  }

  const now = new Date();
  if (!Array.isArray(rent.payments)) rent.payments = [];
  rent.payments.push({
    id: `RTP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount,
    transactionReference: normalizeText(input?.transactionReference || ""),
    proof: {
      fileName: file.originalname || "rent-payment-proof",
      fileUrl: s3Result.url || "",
      publicId: s3Result.id || route,
      mimeType: file.mimetype || "",
      size: file.size ? String(file.size) : "",
    },
    status: "Submitted",
    submittedById: userId,
    submittedByName: normalizeText(user?.name || user?.fullName || ""),
    submittedAt: now,
  });
  // Back-compat: mirror the latest proof onto the top-level fields.
  rent.status = "Proof Submitted";
  rent.transactionReference = normalizeText(input?.transactionReference || "");
  rent.paymentProof = rent.payments[rent.payments.length - 1].proof;
  rent.submittedById = userId;
  rent.submittedByName = normalizeText(user?.name || user?.fullName || "");
  rent.submittedAt = now;
  rent.rejection = { reason: "", rejectedById: null, rejectedByName: "", rejectedAt: null };
  rent.actionHistory.push({
    action: "PAYMENT_SUBMITTED",
    status: "Proof Submitted",
    note: normalizeText(input?.transactionReference ? `Transaction reference: ${input.transactionReference}` : "Payment proof uploaded."),
    actorUserId: userId,
    actorName: normalizeText(user?.name || ""),
    at: now,
  });

  await rent.save();

  return {
    rentRecord: formatTenantRentRecord(rent.toObject(), now),
    message: "Rent payment proof submitted. Awaiting finance verification.",
  };
}

export async function confirmTenantCreditRequestPaymentForCurrentUser(userId, tenantCompanyId, requestId, input = {}) {
  const access = await resolveWorkspaceAccess(userId);

  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to confirm payments. Sales access required.");
    err.statusCode = 403;
    throw err;
  }

  const request = await TenantCreditRequest.findOne({
    tenantCompanyId,
    id: requestId,
  });

  if (!request) {
    const err = new Error("Credit request not found.");
    err.statusCode = 404;
    throw err;
  }

  if (request.status !== "PAYMENT_SUBMITTED") {
    const err = new Error("Only requests with status PAYMENT_SUBMITTED can be confirmed.");
    err.statusCode = 409;
    throw err;
  }

  const now = new Date();
  const actorName = normalizeText(access.user?.name || "");

  request.status = "PAYMENT_CONFIRMED";
  request.financeVerifiedByUserId = userId;
  request.financeVerifiedByName = actorName;
  request.financeVerifiedAt = now;
  request.paidAt = now;

  if (input.financeNote !== undefined) {
    request.financeNote = normalizeText(input.financeNote);
  }

  request.actionHistory.push({
    action: "PAYMENT_CONFIRMED",
    status: "PAYMENT_CONFIRMED",
    note: normalizeText(input.financeNote || "Payment confirmed by finance/sales."),
    actorUserId: userId,
    actorName,
    at: now,
  });

  request.updatedAt = now;
  await request.save();

  return {
    creditRequest: request,
    message: "Payment confirmed successfully. Status changed to PAYMENT_CONFIRMED.",
  };
}

export async function updateTenantCompanyCreditRequestForCurrentUser(userId, tenantCompanyId, requestId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to update credit requests. Sales department access required.");
    err.statusCode = 403;
    throw err;
  }

  const company = await TenantCompany.findById(tenantCompanyId);
  ensureTenantCompanyExists(company, access.workspaceId);

  const request = await TenantCreditRequest.findOne({ tenantCompanyId: company._id, id: requestId });
  if (!request) {
    const err = new Error("Credit request not found.");
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const actorName = normalizeText(access.user?.name || "");
  const previousStatus = request.status;

  // --- Allowed forward state transitions (state machine) ---
  const allowedTransitions = {
    LOW_CREDITS_ALERT: ["PENDING_SALES_APPROVAL", "REJECTED"],
    PENDING_SALES_APPROVAL: ["APPROVED_AWAITING_PAYMENT", "REJECTED"],
    APPROVED_AWAITING_PAYMENT: ["PAYMENT_SUBMITTED", "REJECTED", "PAYMENT_REJECTED"],
    PAYMENT_SUBMITTED: ["PAYMENT_CONFIRMED", "PAYMENT_FAILED", "PAYMENT_REJECTED"],
    PAYMENT_CONFIRMED: ["INVOICE_GENERATED", "CREDITS_ADDED", "COMPLETED"],
    INVOICE_GENERATED: ["CREDITS_ADDED", "COMPLETED"],
    CREDITS_ADDED: ["COMPLETED"],
    COMPLETED: [],
    REJECTED: [],
    PAYMENT_FAILED: ["PAYMENT_SUBMITTED", "PAYMENT_REJECTED", "REJECTED"],
    PAYMENT_REJECTED: ["APPROVED_AWAITING_PAYMENT", "REJECTED"],
  };

  let nextStatus = previousStatus;
  if (input.status && input.status !== previousStatus) {
    const permitted = allowedTransitions[previousStatus] || [];
    if (!permitted.includes(input.status)) {
      const err = new Error(`Invalid status transition from ${previousStatus} to ${input.status}.`);
      err.statusCode = 409;
      throw err;
    }
    nextStatus = input.status;
    request.status = nextStatus;
  }

  // --- Apply editable fields ---
  if (input.salesNote !== undefined) request.salesNote = normalizeText(input.salesNote);
  if (input.financeNote !== undefined) request.financeNote = normalizeText(input.financeNote);
  if (input.approvedCredits !== undefined) request.approvedCredits = Math.max(0, Number(input.approvedCredits));
  if (input.paymentTransactionId !== undefined) request.paymentTransactionId = normalizeText(input.paymentTransactionId);
  if (input.paymentFailureReason !== undefined) request.paymentFailureReason = normalizeText(input.paymentFailureReason);

  // --- Recalculate totalAmount whenever approved credits or rate change ---
  const effectiveCredits = Number(request.approvedCredits || 0) || Number(request.requestedCredits || 0);
  request.totalAmount = Math.max(0, roundNumber(effectiveCredits * (request.ratePerCredit || 0)));

  // --- Side effects for specific transitions ---
  if (nextStatus === "APPROVED_AWAITING_PAYMENT") {
    request.reviewedByUserId = userId;
    request.reviewedByName = actorName;
    request.reviewedAt = now;
    // Lock in the approved credit count if not explicitly provided.
    if (!request.approvedCredits) request.approvedCredits = Number(request.requestedCredits || 0);
  }

  if (nextStatus === "PAYMENT_CONFIRMED") {
    request.financeVerifiedByUserId = userId;
    request.financeVerifiedByName = actorName;
    request.financeVerifiedAt = now;
    request.paidAt = now;
  }

  // --- Credits addition with idempotency guard ---
  // Only add credits once: when transitioning into CREDITS_ADDED/COMPLETED
  // from a state that has not yet credited the tenant.
  if (["CREDITS_ADDED", "COMPLETED"].includes(nextStatus) && !request.creditsAddedAt) {
    const addCredits = roundNumber(request.approvedCredits || request.requestedCredits || 0);
    company.creditsAllocated = Math.max(0, roundNumber(company.creditsAllocated || 0) + addCredits);
    company.addOnCredits = {
      ...(company.addOnCredits || {}),
      purchasedCredits: Math.max(0, roundNumber(company.addOnCredits?.purchasedCredits || 0) + addCredits),
      remainingCredits: Math.max(0, roundNumber(company.addOnCredits?.remainingCredits || 0) + addCredits),
    };
    request.creditsAddedAt = now;
    request.creditsAddedByUserId = userId;
    request.creditsAddedByName = actorName;
    request.completedAt = now;
    request.status = "COMPLETED";
    nextStatus = "COMPLETED";
    await company.save();
  }

  // --- Audit trail: record an action entry for every transition + note edits ---
  if (nextStatus !== previousStatus || input.salesNote !== undefined || input.financeNote !== undefined) {
    request.actionHistory.push({
      action: nextStatus !== previousStatus ? nextStatus : "NOTE_UPDATED",
      status: nextStatus,
      note: normalizeText(input.salesNote || input.financeNote || input.paymentFailureReason || ""),
      actorUserId: userId,
      actorName,
      at: now,
    });
  }

  request.updatedAt = now;
  await request.save();

  return {
    creditRequest: request,
    message: "Tenant credit request updated successfully.",
  };
}

export async function getPendingPaymentVerificationsForCurrentUser(userId) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to view pending payments. Sales access required.");
    err.statusCode = 403;
    throw err;
  }

  const requests = await TenantCreditRequest.find({
    workspaceId: access.workspaceId,
    status: "PAYMENT_SUBMITTED",
  })
    .sort({ paymentSubmittedAt: -1 })
    .lean()
    .exec();

  return {
    data: requests,
    message: "Pending payment verifications fetched successfully.",
  };
}
