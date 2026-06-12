// @ts-nocheck
import crypto from "crypto";
import { TenantCompany } from "../models/TenantCompany.js";
import HostUser from "../models/HostUser.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";

const TENANT_COMPANIES_SALES_MODULE = "tenant-companies-sales";
const TENANT_COMPANIES_ADMIN_MODULE = "tenant-companies-admin";
const ADMIN_ROLES = new Set(["owner", "super_admin"]);

function toId(value) {
  return value ? String(value) : "";
}

function normalizeText(value = "") {
  return String(value || "").trim();
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

  const role = normalizeText(member.role).toLowerCase();
  const isAdmin = ADMIN_ROLES.has(role);
  const grantedModules = (member.grantedModules || []).map((m) => normalizeText(m).toLowerCase());
  const departments = (member.departments || []).map((d) => normalizeText(d).toLowerCase());

  const hasSalesAccess = isAdmin || grantedModules.includes(TENANT_COMPANIES_SALES_MODULE)
    || departments.some((d) => d.includes("sales"));
  const hasAdminAccess = isAdmin || grantedModules.includes(TENANT_COMPANIES_ADMIN_MODULE)
    || departments.some((d) => d.includes("administration") || d.includes("admin"));

  return {
    user,
    workspace,
    member,
    workspaceId: toId(member.workspace),
    role,
    isAdmin,
    hasSalesAccess,
    hasAdminAccess,
    grantedModules,
    departments,
  };
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
    await sendMail({
      to: email,
      subject: `You're invited to join ${companyName} as a ${role}`,
      html: `
        <p>Hello ${name},</p>
        <p><strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> as a <strong>${role}</strong>.</p>
        <p>Click the link below to accept the invitation and set up your account:</p>
        <p><a href="${inviteUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invitation</a></p>
        <p>This invite expires in 7 days.</p>
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
        <p>Hello ${name},</p>
        <p>You now have access to <strong>${companyName}</strong> as a team member.</p>
        <p>Log in here: <a href="${loginUrl}">${loginUrl}</a></p>
      `,
    });
  } catch (err) {
    console.error("[tenant-company] access email failed:", err?.message);
  }
}

function formatTenantCompany(company) {
  if (!company) return null;
  const employees = Array.isArray(company.employees) ? company.employees : [];
  const managerEmployee = company.managerEmployeeId
    ? employees.find((e) => e.id === company.managerEmployeeId) || null
    : employees.find((e) => e.role === "Manager") || null;
  const status = deriveTenantStatus(company.contractEnd);
  const creditRequests = Array.isArray(company.creditRequests) ? company.creditRequests : [];

  return {
    recordId: company._id,
    id: company.tenantCode,
    tenantNumber: company.tenantNumber,
    tenantCode: company.tenantCode,
    companyName: company.companyName,
    contactName: company.contactName,
    email: company.email || "",
    phone: company.phone || "",
    businessType: company.businessType || "",
    pricingPackageId: company.pricingPackageId || null,
    planType: company.planType,
    contractStart: company.contractStart ? formatDate(company.contractStart) : "",
    contractEnd: company.contractEnd ? formatDate(company.contractEnd) : "",
    contractStartAt: company.contractStart || null,
    contractEndAt: company.contractEnd || null,
    contractDurationMonths: Number(company.contractDurationMonths || 0),
    creditsAllocated: Number(company.creditsAllocated || 0),
    creditsUsed: Number(company.creditsUsed || 0),
    creditsRemaining: Math.max(0, Number(company.creditsAllocated || 0) - Number(company.creditsUsed || 0)),
    status,
    notes: company.notes || "",
    managerEmployeeId: company.managerEmployeeId || null,
    managerEmployee,
    customerDetails: company.customerDetails || {},
    companyDetails: { ...(company.companyDetails || {}), status },
    agreementDetails: company.agreementDetails || {},
    billingDetails: company.billingDetails || {},
    invoiceDetails: company.invoiceDetails || {},
    pocDetails: company.pocDetails || {},
    packageDetails: company.packageDetails || {},
    creditConfiguration: company.creditConfiguration || {},
    addOnCredits: company.addOnCredits || {},
    space: company.space || { floor: "", seats: [], assignedDate: null },
    employees,
    creditRequests,
    creditRequestSummary: {
      total: creditRequests.length,
      pending: creditRequests.filter((r) => r.status === "PENDING_SALES_APPROVAL").length,
      completed: creditRequests.filter((r) => r.status === "COMPLETED").length,
      rejected: creditRequests.filter((r) => ["REJECTED", "PAYMENT_FAILED", "PAYMENT_REJECTED"].includes(r.status)).length,
    },
    agreementDocuments: Array.isArray(company.agreementDocuments) ? company.agreementDocuments : [],
    creditHistory: Array.isArray(company.creditHistory) ? company.creditHistory : [],
    initials: getInitials(company.companyName),
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export async function listTenantCompaniesForCurrentUser(userId, query = {}) {
  const access = await resolveWorkspaceAccess(userId);
  const { workspaceId } = access;

  const filter = { workspaceId };
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const skip = (page - 1) * limit;

  const [total, companies] = await Promise.all([
    TenantCompany.countDocuments(filter),
    TenantCompany.find(filter)
      .sort({ createdAt: -1, tenantNumber: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const tenants = companies.map((c) => formatTenantCompany(c));

  return {
    tenants,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      totalTenants: total,
      activeContracts: companies.filter((c) => deriveTenantStatus(c.contractEnd) === "Active").length,
      expiringSoon: companies.filter((c) => deriveTenantStatus(c.contractEnd) === "Expiring Soon").length,
      expired: companies.filter((c) => deriveTenantStatus(c.contractEnd) === "Expired").length,
    },
  };
}

export async function getTenantCompanyForCurrentUser(userId, tenantCompanyId) {
  const access = await resolveWorkspaceAccess(userId);
  const company = await TenantCompany.findById(tenantCompanyId).lean();
  ensureTenantCompanyExists(company, access.workspaceId);
  return { tenant: formatTenantCompany(company) };
}

export async function createTenantCompanyForCurrentUser(userId, input) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess) {
    const err = new Error("You do not have permission to create tenant companies. Sales department access required.");
    err.statusCode = 403;
    throw err;
  }

  const tenantNumber = await getNextTenantNumber(access.workspaceId);
  const tenantCode = buildTenantCode(tenantNumber);
  const contractStart = input.contractStart ? new Date(input.contractStart) : null;
  const contractDurationMonths = Math.max(0, Number(input.contractDurationMonths || 0));
  const contractEnd = contractStart && contractDurationMonths > 0
    ? buildContractEndDate(contractStart, contractDurationMonths)
    : null;
  const status = contractEnd ? deriveTenantStatus(contractEnd) : "Pending Space Assignment";
  const creditsAllocated = Math.max(0, Number(input.creditsAllocated || 0));

  const company = await TenantCompany.create({
    workspaceId: access.workspaceId,
    ownerId: access.workspace.ownerId || userId,
    tenantNumber,
    tenantCode,
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
      hoCity: normalizeText(input.customerDetails?.hoCity || ""),
      hoState: normalizeText(input.customerDetails?.hoState || ""),
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
      rentDate: input.agreementDetails?.rentDate ? new Date(input.agreementDetails.rentDate) : null,
      nextIncrement: input.agreementDetails?.nextIncrement ? new Date(input.agreementDetails.nextIncrement) : null,
    },
    billingDetails: {
      contractDurationMonths: Math.max(0, Number(input.billingDetails?.contractDurationMonths || contractDurationMonths)),
      monthlyRent: Math.max(0, Number(input.billingDetails?.monthlyRent || 0)),
      totalContractAmount: Math.max(0, Number(input.billingDetails?.totalContractAmount || 0)),
      securityDepositAmount: Math.max(0, Number(input.billingDetails?.securityDepositAmount || 0)),
      securityDepositPaidStatus: normalizeText(input.billingDetails?.securityDepositPaidStatus || "Pending") === "Paid" ? "Paid" : "Pending",
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
    },
    creditConfiguration: {
      monthlyTotalCredits: Math.max(0, Number(input.creditConfiguration?.monthlyTotalCredits || 0)),
      creditResetCycle: normalizeText(input.creditConfiguration?.creditResetCycle || "Monthly") || "Monthly",
      creditUsageTracking: normalizeText(input.creditConfiguration?.creditUsageTracking || ""),
    },
    addOnCredits: {
      purchasedCredits: Math.max(0, Number(input.addOnCredits?.purchasedCredits || 0)),
      remainingCredits: Math.max(0, Number(input.addOnCredits?.remainingCredits || 0)),
    },
    space: { floor: "", seats: [], assignedDate: null },
    employees: [],
    creditHistory: [],
  });

  return {
    tenant: formatTenantCompany(company),
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

  company.status = deriveTenantStatus(company.contractEnd);
  await company.save();

  return {
    tenant: formatTenantCompany(company),
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

  await company.save();

  return {
    tenant: formatTenantCompany(company),
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
    tenant: formatTenantCompany(company),
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

  const name = normalizeText(input.name);
  const email = normalizeText(input.email || "").toLowerCase();
  const phone = normalizeText(input.phone || "");
  const designation = normalizeText(input.designation || "");
  const role = normalizeTenantCompanyEmployeeRole(input.role || "Employee");
  const now = new Date();

  const existingEmployees = Array.isArray(company.employees) ? company.employees : [];
  const existingIndex = email
    ? existingEmployees.findIndex((e) => normalizeText(e.email).toLowerCase() === email)
    : -1;

  const employeeId = existingIndex >= 0 ? existingEmployees[existingIndex].id : `TE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const employee = {
    id: employeeId,
    name,
    email,
    phone,
    designation,
    role,
    status: "Active",
    inviteStatus: "Invited",
    invitedAt: now,
    inviteSentAt: now,
    inviteAcceptedAt: null,
    registeredAt: null,
    lastLoginAt: null,
    tenantRole: role === "Manager" ? "tenant-manager" : "tenant-employee",
    tenantCompanyName: company.companyName,
    userId: null,
    inviteId: null,
    createdAt: now,
    updatedAt: now,
  };

  let inviteSent = false;

  if (email) {
    const existingUser = await HostUser.findOne({ email });
    if (existingUser) {
      employee.userId = existingUser._id;
      employee.inviteStatus = "Registered";
      employee.registeredAt = existingUser.createdAt || now;
      employee.lastLoginAt = existingUser.lastLoginAt || null;
      employee.inviteAcceptedAt = now;

      await sendEmployeeAccessEmail(email, name, company.companyName, `${process.env.CLIENT_URL || ""}/login`);
      inviteSent = true;
    } else {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const inviteUrl = `${process.env.CLIENT_URL || ""}/register?inviteToken=${rawToken}&email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(name)}`;

      await sendEmployeeInviteEmail(email, name, access.user?.name || "Administration", role, company.companyName, inviteUrl);
      inviteSent = true;

      employee.inviteId = new crypto.Types().ObjectId ? null : null;
    }
  }

  if (existingIndex >= 0) {
    existingEmployees[existingIndex] = employee;
  } else {
    existingEmployees.push(employee);
  }

  if (role === "Manager") {
    company.managerEmployeeId = employee.id;
  } else if (company.managerEmployeeId === employee.id) {
    company.managerEmployeeId = null;
  }

  company.employees = existingEmployees;
  await company.save();

  return {
    tenant: formatTenantCompany(company),
    employee,
    inviteSent,
    message: "Tenant employee added successfully.",
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

  const employees = Array.isArray(company.employees) ? company.employees : [];
  const idx = findEmployeeIndex(employees, employeeId);
  if (idx === -1) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  if (input.name !== undefined) employees[idx].name = normalizeText(input.name);
  if (input.phone !== undefined) employees[idx].phone = normalizeText(input.phone);
  if (input.designation !== undefined) employees[idx].designation = normalizeText(input.designation);
  if (input.role !== undefined) {
    const newRole = normalizeTenantCompanyEmployeeRole(input.role);
    employees[idx].role = newRole;
    if (newRole === "Manager") {
      company.managerEmployeeId = employees[idx].id;
    } else if (company.managerEmployeeId === employees[idx].id) {
      company.managerEmployeeId = null;
    }
  }
  employees[idx].updatedAt = new Date();

  company.employees = employees;
  await company.save();

  return {
    tenant: formatTenantCompany(company),
    employee: employees[idx],
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

  const employees = Array.isArray(company.employees) ? company.employees : [];
  const idx = findEmployeeIndex(employees, employeeId);
  if (idx === -1) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  employees[idx].status = input.status === "Inactive" ? "Inactive" : "Active";
  employees[idx].updatedAt = new Date();

  if (input.status === "Inactive" && company.managerEmployeeId === employees[idx].id) {
    company.managerEmployeeId = null;
    employees[idx].role = "Employee";
  }

  company.employees = employees;
  await company.save();

  return {
    tenant: formatTenantCompany(company),
    employee: employees[idx],
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

  const employees = Array.isArray(company.employees) ? company.employees : [];
  const idx = findEmployeeIndex(employees, employeeId);
  if (idx === -1) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  const removed = employees[idx];
  company.employees = employees.filter((_, i) => i !== idx);

  if (company.managerEmployeeId === employeeId) {
    company.managerEmployeeId = null;
  }

  await company.save();

  return {
    tenant: formatTenantCompany(company),
    removedEmployee: removed,
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

  const employees = Array.isArray(company.employees) ? company.employees : [];
  const idx = findEmployeeIndex(employees, input.employeeId);
  if (idx === -1) {
    const err = new Error("Tenant employee not found.");
    err.statusCode = 404;
    throw err;
  }

  if (employees[idx].status === "Inactive") {
    const err = new Error("Inactive employees cannot be assigned as manager.");
    err.statusCode = 400;
    throw err;
  }

  const nextEmployees = employees.map((emp, i) => ({
    ...emp,
    role: i === idx ? "Manager" : "Employee",
    updatedAt: new Date(),
  }));

  company.employees = nextEmployees;
  company.managerEmployeeId = nextEmployees[idx].id;
  await company.save();

  return {
    tenant: formatTenantCompany(company),
    manager: nextEmployees[idx],
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

  const uploadedDocuments = normalizedFiles.map((file) => ({
    name: file.originalname || "document",
    type: file.mimetype || "document",
    mimeType: file.mimetype || "",
    size: formatFileSize(file.size),
    url: "",
    publicId: "",
    uploadedAt: new Date(),
  }));

  company.agreementDocuments = [
    ...(Array.isArray(company.agreementDocuments) ? company.agreementDocuments : []),
    ...uploadedDocuments,
  ];
  await company.save();

  return {
    tenant: formatTenantCompany(company),
    agreementDocuments: uploadedDocuments,
    message: "Tenant company agreement documents uploaded successfully.",
  };
}

export async function getMyTenantCompanyCreditRequestsForCurrentUser(userId) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to view credit requests.");
    err.statusCode = 403;
    throw err;
  }

  const user = await HostUser.findById(userId).lean();
  const tenantCompany = await TenantCompany.findOne({
    workspaceId: access.workspaceId,
    "employees.email": normalizeText(user?.email || "").toLowerCase(),
  }).lean();

  if (!tenantCompany) {
    return { tenant: null, creditRequests: [], creditRequestSummary: { total: 0, pending: 0, completed: 0, rejected: 0 } };
  }

  const creditRequests = Array.isArray(tenantCompany.creditRequests) ? tenantCompany.creditRequests : [];
  return {
    tenant: formatTenantCompany(tenantCompany),
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
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to create credit requests.");
    err.statusCode = 403;
    throw err;
  }

  const user = await HostUser.findById(userId).lean();
  const company = await TenantCompany.findOne({
    workspaceId: access.workspaceId,
    "employees.email": normalizeText(user?.email || "").toLowerCase(),
  });

  if (!company) {
    const err = new Error("Tenant company not found for your account.");
    err.statusCode = 404;
    throw err;
  }

  const requestedCredits = Math.max(1, Math.min(100000, Number(input.requestedCredits || 0)));
  const now = new Date();
  const request = {
    id: `CRQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requestedCredits,
    approvedCredits: 0,
    ratePerCredit: 10,
    totalAmount: requestedCredits * 10,
    status: "PENDING_SALES_APPROVAL",
    invoiceStatus: "Pending",
    requestedReason: normalizeText(input.requestedReason || ""),
    requestedByUserId: userId,
    requestedByName: normalizeText(user?.name || ""),
    requestedByEmail: normalizeText(user?.email || "").toLowerCase(),
    actionHistory: [{
      action: "REQUEST_CREATED",
      status: "PENDING_SALES_APPROVAL",
      note: normalizeText(input.requestedReason || ""),
      actorUserId: userId,
      actorName: normalizeText(user?.name || ""),
      at: now,
    }],
    requestedAt: now,
    updatedAt: now,
  };

  company.creditRequests = [request, ...(Array.isArray(company.creditRequests) ? company.creditRequests : [])];
  company.markModified("creditRequests");
  await company.save();

  return {
    creditRequest: request,
    message: "Tenant credit request submitted successfully.",
  };
}

export async function submitMyTenantCompanyCreditRequestPaymentForCurrentUser(userId, requestId, input, file) {
  const access = await resolveWorkspaceAccess(userId);
  if (!access.isAdmin && !access.hasSalesAccess && !access.hasAdminAccess) {
    const err = new Error("You do not have permission to submit payments.");
    err.statusCode = 403;
    throw err;
  }

  if (!file?.buffer?.length) {
    const err = new Error("Payment proof screenshot is required.");
    err.statusCode = 400;
    throw err;
  }

  const user = await HostUser.findById(userId).lean();
  const company = await TenantCompany.findOne({
    workspaceId: access.workspaceId,
    "employees.email": normalizeText(user?.email || "").toLowerCase(),
  });

  if (!company) {
    const err = new Error("Tenant company not found for your account.");
    err.statusCode = 404;
    throw err;
  }

  const creditRequests = Array.isArray(company.creditRequests) ? company.creditRequests : [];
  const reqIdx = creditRequests.findIndex((r) => r.id === requestId);
  if (reqIdx === -1) {
    const err = new Error("Credit request not found.");
    err.statusCode = 404;
    throw err;
  }

  const request = creditRequests[reqIdx];
  if (request.status !== "APPROVED_AWAITING_PAYMENT") {
    const err = new Error("This credit request is not ready for payment submission.");
    err.statusCode = 409;
    throw err;
  }

  const now = new Date();
  request.status = "PAYMENT_SUBMITTED";
  request.paymentTransactionId = normalizeText(input?.transactionId || "");
  request.paymentProofFileName = file.originalname || "payment-proof";
  request.paymentSubmittedAt = now;
  request.updatedAt = now;

  creditRequests[reqIdx] = request;
  company.creditRequests = creditRequests;
  company.markModified("creditRequests");
  await company.save();

  return {
    creditRequest: request,
    message: "Payment proof submitted successfully.",
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

  const creditRequests = Array.isArray(company.creditRequests) ? company.creditRequests : [];
  const reqIdx = creditRequests.findIndex((r) => r.id === requestId);
  if (reqIdx === -1) {
    const err = new Error("Credit request not found.");
    err.statusCode = 404;
    throw err;
  }

  const request = creditRequests[reqIdx];
  const now = new Date();

  const validStatuses = [
    "PENDING_SALES_APPROVAL", "APPROVED_AWAITING_PAYMENT", "PAYMENT_SUBMITTED",
    "PAYMENT_CONFIRMED", "INVOICE_GENERATED", "CREDITS_ADDED", "COMPLETED",
    "REJECTED", "PAYMENT_FAILED", "PAYMENT_REJECTED",
  ];

  if (input.status && validStatuses.includes(input.status)) {
    request.status = input.status;
  }

  if (input.salesNote !== undefined) request.salesNote = normalizeText(input.salesNote);
  if (input.financeNote !== undefined) request.financeNote = normalizeText(input.financeNote);
  if (input.approvedCredits !== undefined) request.approvedCredits = Math.max(0, Number(input.approvedCredits));
  if (input.paymentTransactionId !== undefined) request.paymentTransactionId = normalizeText(input.paymentTransactionId);
  if (input.paymentFailureReason !== undefined) request.paymentFailureReason = normalizeText(input.paymentFailureReason);

  if (request.status === "APPROVED_AWAITING_PAYMENT") {
    request.reviewedByUserId = userId;
    request.reviewedByName = normalizeText(access.user?.name || "");
    request.reviewedAt = now;
  }

  if (request.status === "PAYMENT_CONFIRMED") {
    request.financeVerifiedByUserId = userId;
    request.financeVerifiedByName = normalizeText(access.user?.name || "");
    request.financeVerifiedAt = now;
    request.paidAt = now;
  }

  if (["CREDITS_ADDED", "COMPLETED"].includes(request.status)) {
    const addCredits = roundNumber(request.approvedCredits || request.requestedCredits || 0);
    company.creditsAllocated = Math.max(0, roundNumber(company.creditsAllocated || 0) + addCredits);
    request.creditsAddedAt = now;
    request.creditsAddedByUserId = userId;
    request.creditsAddedByName = normalizeText(access.user?.name || "");
    request.completedAt = now;
    request.status = "COMPLETED";
  }

  request.updatedAt = now;
  creditRequests[reqIdx] = request;
  company.creditRequests = creditRequests;
  company.markModified("creditRequests");
  await company.save();

  return {
    creditRequest: request,
    message: "Tenant credit request updated successfully.",
  };
}
