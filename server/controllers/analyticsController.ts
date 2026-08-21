// @ts-nocheck
import { Request, Response } from "express";
import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import HostUser from "../models/HostUser.js";
import HostActivityLog from "../models/HostActivityLog.js";
import { Holiday } from "../models/Holiday.js";
import { LeaveRequest } from "../models/LeaveRequest.js";
import { Department } from "../models/Department.js";
import { EmployeeProfile } from "../models/EmployeeProfile.js";
import { Asset } from "../models/Asset.js";
import { AssetRequest } from "../models/AssetRequest.js";
import { Ticket } from "../models/Ticket.js";
import SupportTicket from "../models/SupportTicket.js";
import { MeetingRoomBooking } from "../models/MeetingRoomBooking.js";
import { Role } from "../models/Role.js";
import VisitorLog from "../models/VisitorLog.js";
import WebsiteLead from "../models/WebsiteLead.js";
import WebsiteReview from "../models/WebsiteReview.js";
import { TenantCompany } from "../models/TenantCompany.js";
import { Resource } from "../models/Resource.js";
import { ResignationRequest } from "../models/ResignationRequest.js";
import { Task } from "../models/Task.js";
import { Attendance } from "../models/Attendance.js";
import { Inventory } from "../models/Inventory.js";
import { FinanceTransaction } from "../models/FinanceTransaction.js";
import { FinanceExpense } from "../models/FinanceExpense.js";
import { FinanceVendor } from "../models/FinanceVendor.js";
import { Report } from "../models/Report.js";
import { DepartmentDocument } from "../models/DepartmentDocument.js";
import RecruitmentJobOpening from "../models/RecruitmentJobOpening.js";
import { RecruitmentCandidate } from "../models/RecruitmentCandidate.js";
import { PayrollCycle } from "../models/PayrollCycle.js";
import { PayrollEntry } from "../models/PayrollEntry.js";
import { HousekeepingTask } from "../models/HousekeepingTask.js";
import { HousekeepingStaff } from "../models/HousekeepingStaff.js";
import { DepartmentFinancePlan } from "../models/DepartmentFinancePlan.js";
import { AnnualFinanceRequest } from "../models/AnnualFinanceRequest.js";
import { ExtraFinanceRequest } from "../models/ExtraFinanceRequest.js";
import { TenantCreditRequest } from "../models/TenantCreditRequest.js";
import { RepairLog } from "../models/RepairLog.js";
import { MaintenanceSchedule } from "../models/MaintenanceSchedule.js";
import WebsiteTemplate from "../models/website/WebsiteTemplate.js";
import {
  buildWorkspaceModuleCatalog,
  getDefaultEnabledModuleIdsForPlan,
} from "../config/workspaceModuleCatalog.js";

// Analytics is a founder / super-admin module: it rolls up numbers across the
// whole workspace, so regular members never get this endpoint.
const _getRoleName = (role: any) => {
  if (!role) return "";
  if (typeof role === "object" && role.name) return String(role.name);
  return String(role);
};

const _getRoleBand = (role: any) => {
  const n = _getRoleName(role).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (n === "owner" || n === "founder") return "owner";
  if (n === "super_admin" || n === "superadmin") return "super_admin";
  return n || "employee";
};

const resolveAnalyticsWorkspace = async (userId: string) => {
  const user = await HostUser.findById(userId).lean().exec();
  if (!user) return { user: null, workspace: null };

  let workspace = null;
  if (user.primaryWorkspace) {
    workspace = await Workspace.findById(user.primaryWorkspace).lean().exec();
  }

  if (!workspace) {
    const membership = await WorkspaceMember.findOne({ user: user._id, isActive: true })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean()
      .exec();
    if (membership?.workspace) {
      workspace = await Workspace.findById(membership.workspace).lean().exec();
    }
  }

  if (!workspace) {
    workspace = await Workspace.findOne({ owner: user._id, isActive: true })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  return { user, workspace };
};

const safeCount = async (model, filter) => {
  try {
    return await model.countDocuments(filter).lean().exec();
  } catch {
    return 0;
  }
};

const safeCountSum = async (queries) => {
  const results = await Promise.all(queries.map(({ model, filter }) => safeCount(model, filter)));
  return results.reduce((sum, value) => sum + (Number(value) || 0), 0);
};

const pct = (part, whole) => {
  const total = Number(whole) || 0;
  if (total <= 0) return null;
  return Math.round(((Number(part) || 0) / total) * 100);
};

const safeAvgHours = async (model, match, projectExpr) => {
  try {
    const rows = await model
      .aggregate([
        { $match: match },
        { $project: { diff: projectExpr } },
        { $match: { diff: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: "$diff" } } },
      ])
      .exec();
    if (!rows.length || !Number.isFinite(rows[0]?.avg)) return null;
    return Math.round((rows[0].avg / (1000 * 60 * 60)) * 10) / 10; // ms -> hours, 1dp
  } catch {
    return null;
  }
};

// Activity score (0-100): recency of real usage weighted higher than raw
// volume, so a stale module with many legacy records does not outrank a
// module the team actually used this month.
const computeActivityScore = ({ totalRecords, activeLast30Days }) => {
  const total = Number(totalRecords) || 0;
  const recent = Number(activeLast30Days) || 0;
  if (total <= 0) return 0;
  return Math.round(Math.min(60, recent * 6) + Math.min(40, Math.sqrt(total) * 6));
};

const buildMonthKeys = () => {
  const buckets = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en-IN", { month: "short" }),
      count: 0,
    });
  }
  return buckets;
};

const MONTH_KEYS = buildMonthKeys();
const TREND_SINCE = new Date(new Date().setMonth(new Date().getMonth() - 5, 1));

const mergeSeries = (seriesList) =>
  MONTH_KEYS.map((bucket, index) => ({
    ...bucket,
    count: seriesList.reduce((sum, series) => sum + (Number(series?.[index]?.count) || 0), 0),
  }));

// Created-per-month series for one collection over the last 6 months.
const monthlySeries = async (model, field, matchValue, extraMatch = {}) => {
  try {
    const rows = await model
      .aggregate([
        { $match: { [field]: matchValue, createdAt: { $gte: TREND_SINCE }, ...extraMatch } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
      ])
      .exec();
    const map = new Map(rows.map((row) => [row._id, row.count]));
    return MONTH_KEYS.map((bucket) => ({ ...bucket, count: Number(map.get(bucket.key)) || 0 }));
  } catch {
    return MONTH_KEYS.map((bucket) => ({ ...bucket, count: 0 }));
  }
};

// Leads only count for a unit once escalated to it — shared filter.
const leadEscalationFilter = (stringId) => ({
  isEscalated: true,
  escalatedWorkspaceId: stringId,
});

// Status/type distribution segments for donut charts.
const breakdownBy = async (model, base, field, labels) => {
  const values = await Promise.all(
    labels.map(({ value }) => safeCount(model, { ...base, [field]: value })),
  );
  return labels
    .map(({ label, value }, index) => ({ label, value: Number(values[index]) || 0 }))
    .filter((segment) => segment.value > 0);
};

// ---- Usage insights (peak activity analysis) ------------------------------
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INSIGHTS_SINCE = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

const hourLabel = (h) => {
  const suffix = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${suffix}`;
};

const emptyInsights = () => ({
  byDay: DAY_LABELS.map((label) => ({ label, count: 0 })),
  byHour: Array.from({ length: 24 }, (_, h) => ({ label: hourLabel(h), count: 0 })),
  peakDayLabel: "--",
  peakHourLabel: "--",
});

const finalizeInsights = (byDay, byHour) => {
  const peakDay = byDay.reduce((best, cur) => (cur.count > best.count ? cur : best), byDay[0]);
  const peakHour = byHour.reduce((best, cur) => (cur.count > best.count ? cur : best), byHour[0]);
  return {
    byDay,
    byHour,
    peakDayLabel: peakDay && peakDay.count > 0 ? peakDay.label : "--",
    peakHourLabel: peakHour && peakHour.count > 0 ? peakHour.label : "--",
  };
};

// When do records of this collection actually get created? Powers the
// "peak day / peak hour" charts so management can see real usage rhythm.
const usageInsights = async (model, field, matchValue, extraMatch = {}) => {
  try {
    const rows = await model
      .aggregate([
        { $match: { [field]: matchValue, createdAt: { $gte: INSIGHTS_SINCE }, ...extraMatch } },
        {
          $facet: {
            byDay: [{ $group: { _id: { $dayOfWeek: "$createdAt" }, count: { $sum: 1 } } }],
            byHour: [{ $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } }],
          },
        },
      ])
      .exec();
    const facet = rows[0] || {};
    const dayMap = new Map((facet.byDay ?? []).map((r) => [Number(r._id), Number(r.count) || 0]));
    const hourMap = new Map((facet.byHour ?? []).map((r) => [Number(r._id), Number(r.count) || 0]));
    return finalizeInsights(
      DAY_LABELS.map((label, i) => ({ label, count: dayMap.get(i + 1) || 0 })),
      Array.from({ length: 24 }, (_, h) => ({ label: hourLabel(h), count: hourMap.get(h) || 0 })),
    );
  } catch {
    return emptyInsights();
  }
};

const mergeInsights = (insightsList) => {
  const usable = (insightsList ?? []).filter(Boolean);
  if (!usable.length) return emptyInsights();
  return finalizeInsights(
    DAY_LABELS.map((label, i) => ({
      label,
      count: usable.reduce((sum, ins) => sum + (Number(ins.byDay?.[i]?.count) || 0), 0),
    })),
    Array.from({ length: 24 }, (_, h) => ({
      label: hourLabel(h),
      count: usable.reduce((sum, ins) => sum + (Number(ins.byHour?.[h]?.count) || 0), 0),
    })),
  );
};

// Which departments drive this module? Groups by a department field and
// resolves ObjectId references to Department names.
const deptBreakdownBy = async (model, base, field) => {
  try {
    const rows = await model
      .aggregate([
        { $match: base },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      ])
      .exec();
    const filtered = rows.filter(
      (row) => row._id !== null && row._id !== undefined && String(row._id).trim() !== "",
    );
    if (!filtered.length) return [];
    const objectIds = filtered
      .map((row) => String(row._id))
      .filter((value) => mongoose.isValidObjectId(value));
    let nameMap = new Map();
    if (objectIds.length) {
      const depts = await Department.find({ _id: { $in: objectIds } })
        .select("name")
        .lean()
        .exec();
      nameMap = new Map(depts.map((dept) => [String(dept._id), dept.name || "Unnamed"]));
    }
    return filtered
      .map((row) => ({
        label: nameMap.get(String(row._id)) || String(row._id),
        value: Number(row.count) || 0,
      }))
      .filter((segment) => segment.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  } catch {
    return [];
  }
};

const ACTIVITY_LOG_MODULE_NAMES = {
  tickets: "Tickets",
  "customer-support": "Customer Support",
  "meeting-room-system": "Meeting Rooms",
  calendar: "Calendar",
  assets: "Assets",
  "website-builder": "Website Builder",
  "website-leads": "Leads",
  "website-review": "Reviews",
  organization: "Organization",
  "visitors-management": "Visitors",
  "leads-management": "Leads",
  "tenant-companies-sales": "Tenant Companies",
  "resource-pricing": "Resources",
  "exit-management": "HR",
};

// Mutating actions recorded by the global activity logger — powers the
// "edits / pushes" style KPIs per module.
const activityEdits = async (workspaceStringId, moduleId, since = null) => {
  const moduleName = ACTIVITY_LOG_MODULE_NAMES[moduleId];
  if (!moduleName) return null;
  const filter = { workspaceId: workspaceStringId, module: moduleName, success: true };
  if (since) filter.createdAt = { $gte: since };
  return safeCount(HostActivityLog, filter);
};

type ProviderFn = (ctx: {
  objectId: any;
  stringId: string;
  since30: Date;
}) => Promise<any>;

const MODULE_STAT_PROVIDERS: Record<string, ProviderFn> = {
  tickets: async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, open, inProgress, resolved, closed, avgResolutionHours, editsTotal, edits30, monthly, prioritySplit] =
      await Promise.all([
        safeCount(Ticket, base),
        safeCount(Ticket, { ...base, createdAt: { $gte: since30 } }),
        safeCount(Ticket, { ...base, status: "Open" }),
        safeCount(Ticket, { ...base, status: "In Progress" }),
        safeCount(Ticket, { ...base, status: "Resolved" }),
        safeCount(Ticket, { ...base, status: "Closed" }),
        safeAvgHours(
          Ticket,
          { workspaceId: objectId, status: { $in: ["Resolved", "Closed"] } },
          { $subtract: ["$updatedAt", "$createdAt"] },
        ),
        activityEdits(objectId.toString ? String(objectId) : "", "tickets"),
        activityEdits(String(objectId), "tickets", since30),
        monthlySeries(Ticket, "workspaceId", objectId),
        breakdownBy(Ticket, base, "priority", [
          { label: "Low", value: "Low" },
          { label: "Medium", value: "Medium" },
          { label: "High", value: "High" },
        ]),
      ]);
    const done = resolved + closed;
    return {
      totalRecords,
      activeLast30Days,
      openItems: open + inProgress,
      completionRate: pct(done, totalRecords),
      kpis: [
        { label: "Raised", value: totalRecords },
        { label: "Resolved", value: done },
        { label: "In queue", value: open + inProgress },
        { label: "Avg resolution", value: avgResolutionHours ?? "--", suffix: avgResolutionHours !== null ? "h" : "" },
        { label: "Updates logged", value: editsTotal ?? 0 },
        { label: "Updates (30d)", value: edits30 ?? 0 },
      ],
      breakdown: await breakdownBy(Ticket, base, "status", [
        { label: "Open", value: "Open" },
        { label: "In Progress", value: "In Progress" },
        { label: "Resolved", value: "Resolved" },
        { label: "Closed", value: "Closed" },
      ]),
      secondaryBreakdown: prioritySplit,
      monthly,
    };
  },

  "customer-support": async ({ objectId, since30 }) => {
    const base = { workspace: objectId };
    const [totalRecords, activeLast30Days, openItems, resolved, closed, avgResolutionHours, monthly] =
      await Promise.all([
        safeCount(SupportTicket, base),
        safeCount(SupportTicket, { ...base, createdAt: { $gte: since30 } }),
        safeCount(SupportTicket, {
          ...base,
          status: { $in: ["Open", "Accepted", "In Progress", "Pending", "Escalated"] },
        }),
        safeCount(SupportTicket, { ...base, status: "Resolved" }),
        safeCount(SupportTicket, { ...base, status: "Closed" }),
        safeAvgHours(
          SupportTicket,
          { workspace: objectId, resolvedAt: { $ne: null } },
          { $subtract: ["$resolvedAt", "$createdAt"] },
        ),
        monthlySeries(SupportTicket, "workspace", objectId),
      ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems,
      completionRate: pct(resolved + closed, totalRecords),
      kpis: [
        { label: "Raised", value: totalRecords },
        { label: "Resolved", value: resolved + closed },
        { label: "Pending", value: openItems },
        { label: "Avg resolution", value: avgResolutionHours ?? "--", suffix: avgResolutionHours !== null ? "h" : "" },
      ],
      breakdown: await breakdownBy(SupportTicket, base, "status", [
        { label: "Open", value: "Open" },
        { label: "Accepted", value: "Accepted" },
        { label: "In Progress", value: "In Progress" },
        { label: "Pending", value: "Pending" },
        { label: "Escalated", value: "Escalated" },
        { label: "Resolved", value: "Resolved" },
        { label: "Closed", value: "Closed" },
      ]),
      monthly,
    };
  },

  "meeting-room-system": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, upcoming, completed, cancelled, internal, external, tenant, monthly, statusSplit] =
      await Promise.all([
        safeCount(MeetingRoomBooking, base),
        safeCount(MeetingRoomBooking, { ...base, createdAt: { $gte: since30 } }),
        safeCount(MeetingRoomBooking, { ...base, status: { $in: ["pending", "confirmed", "in-progress"] } }),
        safeCount(MeetingRoomBooking, { ...base, status: "completed" }),
        safeCount(MeetingRoomBooking, { ...base, status: "cancelled" }),
        safeCount(MeetingRoomBooking, { ...base, bookingType: "Internal" }),
        safeCount(MeetingRoomBooking, { ...base, bookingType: "External" }),
        safeCount(MeetingRoomBooking, { ...base, bookingType: "Tenant" }),
        monthlySeries(MeetingRoomBooking, "workspaceId", objectId),
        breakdownBy(MeetingRoomBooking, base, "status", [
          { label: "Pending", value: "pending" },
          { label: "Confirmed", value: "confirmed" },
          { label: "In Progress", value: "in-progress" },
          { label: "Completed", value: "completed" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Rescheduled", value: "rescheduled" },
        ]),
      ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: upcoming,
      completionRate: pct(completed, totalRecords),
      kpis: [
        { label: "Bookings", value: totalRecords },
        { label: "Completed", value: completed },
        { label: "Upcoming", value: upcoming },
        { label: "Cancelled", value: cancelled },
      ],
      breakdown: [
        { label: "Internal", value: internal },
        { label: "External", value: external },
        { label: "Tenant", value: tenant },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: statusSplit,
      monthly,
    };
  },

  calendar: async ({ objectId, since30 }) => {
    const holidayBase = { workspaceId: objectId, isActive: true };
    const leaveBase = { workspaceId: objectId };
    const [holidays, leaves, pendingLeaves, approvedLeaves, rejectedLeaves, monthlyLeaves, monthlyHolidays, durationSplit] =
      await Promise.all([
        safeCount(Holiday, holidayBase),
        safeCount(LeaveRequest, leaveBase),
        safeCount(LeaveRequest, { ...leaveBase, status: "pending" }),
        safeCount(LeaveRequest, { ...leaveBase, status: "approved" }),
        safeCount(LeaveRequest, { ...leaveBase, status: "rejected" }),
        monthlySeries(LeaveRequest, "workspaceId", objectId),
        monthlySeries(Holiday, "workspaceId", objectId, { isActive: true }),
        breakdownBy(LeaveRequest, leaveBase, "durationType", [
          { label: "Full Day", value: "full_day" },
          { label: "Half Day", value: "half_day" },
          { label: "Hours", value: "hours" },
        ]),
      ]);
    return {
      totalRecords: holidays + leaves,
      activeLast30Days: 0,
      openItems: pendingLeaves,
      completionRate: pct(approvedLeaves + rejectedLeaves, leaves),
      kpis: [
        { label: "Holidays", value: holidays },
        { label: "Leave requests", value: leaves },
        { label: "Pending leaves", value: pendingLeaves },
        { label: "Approved leaves", value: approvedLeaves },
      ],
      breakdown: [
        { label: "Approved", value: approvedLeaves },
        { label: "Rejected", value: rejectedLeaves },
        { label: "Pending", value: pendingLeaves },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: durationSplit,
      monthly: mergeSeries([monthlyLeaves, monthlyHolidays]),
    };
  },

  assets: async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, repair, disposed, inactive, pendingRequests, hardware, infrastructure, software, furniture, other, monthly, statusSplit] =
      await Promise.all([
        safeCount(Asset, base),
        safeCount(Asset, { ...base, createdAt: { $gte: since30 } }),
        safeCount(Asset, { ...base, status: "Repair" }),
        safeCount(Asset, { ...base, status: "Disposed" }),
        safeCount(Asset, { ...base, status: "Inactive" }),
        safeCount(AssetRequest, { ...base, status: "Pending" }),
        safeCount(Asset, { ...base, category: "Hardware" }),
        safeCount(Asset, { ...base, category: "Infrastructure" }),
        safeCount(Asset, { ...base, category: "Software" }),
        safeCount(Asset, { ...base, category: "Furniture" }),
        safeCount(Asset, { ...base, category: "Other" }),
        monthlySeries(Asset, "workspaceId", objectId),
        breakdownBy(Asset, base, "status", [
          { label: "Active", value: "Active" },
          { label: "Inactive", value: "Inactive" },
          { label: "Repair", value: "Repair" },
          { label: "Disposed", value: "Disposed" },
        ]),
      ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: pendingRequests,
      completionRate: null,
      kpis: [
        { label: "Assets", value: totalRecords },
        { label: "Under repair", value: repair },
        { label: "Disposed", value: disposed },
        { label: "Pending requests", value: pendingRequests },
      ],
      breakdown: [
        { label: "Hardware", value: hardware },
        { label: "Infrastructure", value: infrastructure },
        { label: "Software", value: software },
        { label: "Furniture", value: furniture },
        { label: "Other", value: other },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: statusSplit,
      monthly,
    };
  },

  "team-management": async ({ objectId, since30 }) => {
    const deptBase = { workspaceId: objectId };
    const profileBase = { workspaceId: objectId };
    const [departments, profiles, recent, onboarding, activeStaff, probation, inactiveStaff, monthlyProfiles, monthlyDepartments] =
      await Promise.all([
        safeCount(Department, deptBase),
        safeCount(EmployeeProfile, profileBase),
        safeCountSum([
          { model: Department, filter: { ...deptBase, createdAt: { $gte: since30 } } },
          { model: EmployeeProfile, filter: { ...profileBase, createdAt: { $gte: since30 } } },
        ]),
        safeCount(EmployeeProfile, { ...profileBase, status: { $in: ["pending", "invite_sent", "registered"] } }),
        safeCount(EmployeeProfile, { ...profileBase, status: { $in: ["active", "joined"] } }),
        safeCount(EmployeeProfile, { ...profileBase, status: "probation" }),
        safeCount(EmployeeProfile, { ...profileBase, status: { $in: ["inactive", "terminated"] } }),
        monthlySeries(EmployeeProfile, "workspaceId", objectId),
        monthlySeries(Department, "workspaceId", objectId),
      ]);
    return {
      totalRecords: departments + profiles,
      activeLast30Days: recent,
      openItems: onboarding,
      completionRate: null,
      kpis: [
        { label: "Departments", value: departments },
        { label: "Employees", value: profiles },
        { label: "Active staff", value: activeStaff },
        { label: "Onboarding", value: onboarding },
      ],
      breakdown: [
        { label: "Active", value: activeStaff },
        { label: "Probation", value: probation },
        { label: "Onboarding", value: onboarding },
        { label: "Inactive", value: inactiveStaff },
      ].filter((segment) => segment.value > 0),
      monthly: mergeSeries([monthlyProfiles, monthlyDepartments]),
    };
  },

  "website-builder": async ({ objectId, stringId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, published, editsTotal, edits30, monthly] = await Promise.all([
      safeCount(WebsiteTemplate, base),
      safeCount(WebsiteTemplate, { ...base, createdAt: { $gte: since30 } }),
      safeCount(WebsiteTemplate, { ...base, isPublished: true }),
      activityEdits(stringId, "website-builder"),
      activityEdits(stringId, "website-builder", since30),
      monthlySeries(WebsiteTemplate, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: Math.max(0, totalRecords - published),
      completionRate: pct(published, totalRecords),
      kpis: [
        { label: "Websites", value: totalRecords },
        { label: "Published", value: published },
        { label: "Drafts", value: Math.max(0, totalRecords - published) },
        { label: "Edits / pushes", value: editsTotal ?? 0 },
        { label: "Edits (30d)", value: edits30 ?? 0 },
      ],
      breakdown: [
        { label: "Published", value: published },
        { label: "Draft", value: Math.max(0, totalRecords - published) },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "website-leads": async ({ stringId, since30 }) => {
    // Mirror the Leads page visibility rule exactly: a lead belongs to this
    // unit only when it was escalated to it (leadsControllers.getLeads).
    const base = { workspaceId: stringId, isEscalated: true, escalatedWorkspaceId: stringId };
    const [totalRecords, activeLast30Days, openItems, closed, monthly] = await Promise.all([
      safeCount(WebsiteLead, base),
      safeCount(WebsiteLead, { ...base, createdAt: { $gte: since30 } }),
      safeCount(WebsiteLead, { ...base, hostPanelStatus: { $ne: "Closed" } }),
      safeCount(WebsiteLead, { ...base, hostPanelStatus: "Closed" }),
      monthlySeries(WebsiteLead, "workspaceId", stringId, leadEscalationFilter(stringId)),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems,
      completionRate: pct(closed, totalRecords),
      kpis: [
        { label: "Leads", value: totalRecords },
        { label: "New / open", value: openItems },
        { label: "Closed", value: closed },
        { label: "Conversion", value: pct(closed, totalRecords) ?? "--", suffix: "%" },
      ],
      breakdown: [
        { label: "Pending", value: openItems },
        { label: "Closed", value: closed },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "website-review": async ({ stringId, since30 }) => {
    const base = { workspaceId: stringId };
    const [totalRecords, activeLast30Days, pending, approved, fiveStars, fourStars, threeStars, lowStars, avgRatingRows, monthly] =
      await Promise.all([
        safeCount(WebsiteReview, base),
        safeCount(WebsiteReview, { ...base, createdAt: { $gte: since30 } }),
        safeCount(WebsiteReview, { ...base, status: "pending" }),
        safeCount(WebsiteReview, { ...base, status: { $nin: ["pending"] } }),
        safeCount(WebsiteReview, { ...base, rating: 5 }),
        safeCount(WebsiteReview, { ...base, rating: 4 }),
        safeCount(WebsiteReview, { ...base, rating: 3 }),
        safeCount(WebsiteReview, { ...base, rating: { $lte: 2 } }),
        (async () => {
          try {
            const rows = await WebsiteReview.aggregate([
              { $match: { workspaceId: stringId, rating: { $gt: 0 } } },
              { $group: { _id: null, avg: { $avg: "$rating" } } },
            ]).exec();
            return rows.length ? Math.round(rows[0].avg * 10) / 10 : null;
          } catch {
            return null;
          }
        })(),
        monthlySeries(WebsiteReview, "workspaceId", stringId),
      ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: pending,
      completionRate: pct(approved, totalRecords),
      kpis: [
        { label: "Reviews", value: totalRecords },
        { label: "Awaiting action", value: pending },
        { label: "Published", value: approved },
        { label: "Avg rating", value: avgRatingRows ?? "--", suffix: avgRatingRows !== null ? "★" : "" },
      ],
      breakdown: [
        { label: "5 star", value: fiveStars },
        { label: "4 star", value: fourStars },
        { label: "3 star", value: threeStars },
        { label: "≤ 2 star", value: lowStars },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: [
        { label: "Pending", value: pending },
        { label: "Published", value: approved },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "organization-management": async ({ objectId, since30 }) => {
    const memberBase = { workspace: objectId, isActive: true };
    const deptBase = { workspaceId: objectId };
    const [members, departments, recentMembers, recentDepartments, notActive, monthlyMembers, monthlyDepartments] =
      await Promise.all([
        safeCount(WorkspaceMember, memberBase),
        safeCount(Department, deptBase),
        safeCount(WorkspaceMember, { ...memberBase, createdAt: { $gte: since30 } }),
        safeCount(Department, { ...deptBase, createdAt: { $gte: since30 } }),
        safeCount(WorkspaceMember, { workspace: objectId, status: { $ne: "active" } }),
        monthlySeries(WorkspaceMember, "workspace", objectId),
        monthlySeries(Department, "workspaceId", objectId),
      ]);
    return {
      totalRecords: members + departments,
      activeLast30Days: recentMembers + recentDepartments,
      openItems: notActive,
      completionRate: null,
      kpis: [
        { label: "Members", value: members },
        { label: "Departments", value: departments },
        { label: "New members (30d)", value: recentMembers },
        { label: "Not active", value: notActive },
      ],
      breakdown: [
        { label: "Active members", value: Math.max(0, members - notActive) },
        { label: "Not active", value: notActive },
      ].filter((segment) => segment.value > 0),
      monthly: mergeSeries([monthlyMembers, monthlyDepartments]),
    };
  },

  "access-grants": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, systemRoles, customRoles] = await Promise.all([
      safeCount(Role, base),
      safeCount(Role, { ...base, createdAt: { $gte: since30 } }),
      safeCount(Role, { ...base, isSystemRole: true }),
      safeCount(Role, { ...base, isSystemRole: { $ne: true } }),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: 0,
      completionRate: null,
      kpis: [
        { label: "Roles", value: totalRecords },
        { label: "System roles", value: systemRoles },
        { label: "Custom roles", value: customRoles },
        { label: "New roles (30d)", value: activeLast30Days },
      ],
      breakdown: [
        { label: "System", value: systemRoles },
        { label: "Custom", value: customRoles },
      ].filter((segment) => segment.value > 0),
      monthly: monthlySeries(Role, "workspaceId", objectId),
    };
  },

  "visitors-management": async ({ objectId, since30 }) => {
    const base = { workspace: objectId };
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [totalRecords, activeLast30Days, standard, departmentV, tenantV, checkedIn, visitsToday, monthly, statusSplit] =
      await Promise.all([
        safeCount(VisitorLog, base),
        safeCount(VisitorLog, { ...base, createdAt: { $gte: since30 } }),
        safeCount(VisitorLog, { ...base, visitorType: "standard" }),
        safeCount(VisitorLog, { ...base, visitorType: "department" }),
        safeCount(VisitorLog, { ...base, visitorType: "tenant" }),
        safeCount(VisitorLog, { ...base, status: "checked_in" }),
        safeCount(VisitorLog, { ...base, createdAt: { $gte: startOfToday } }),
        monthlySeries(VisitorLog, "workspace", objectId),
        breakdownBy(VisitorLog, base, "status", [
          { label: "Pending", value: "pending" },
          { label: "Approved", value: "approved" },
          { label: "Checked In", value: "checked_in" },
          { label: "Checked Out", value: "checked_out" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Rejected", value: "rejected" },
        ]),
      ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: checkedIn,
      completionRate: null,
      kpis: [
        { label: "Visitors", value: totalRecords },
        { label: "Standard visitors", value: standard },
        { label: "Checked in now", value: checkedIn },
        { label: "Today", value: visitsToday },
      ],
      breakdown: [
        { label: "Standard", value: standard },
        { label: "Department", value: departmentV },
        { label: "Tenant", value: tenantV },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: statusSplit,
      monthly,
    };
  },

  "leads-management": async ({ stringId, since30 }) => {
    // Same escalation rule as the Leads Management page (see website-leads).
    const base = { workspaceId: stringId, isEscalated: true, escalatedWorkspaceId: stringId };
    const [totalRecords, activeLast30Days, openItems, closed, monthly] = await Promise.all([
      safeCount(WebsiteLead, base),
      safeCount(WebsiteLead, { ...base, createdAt: { $gte: since30 } }),
      safeCount(WebsiteLead, { ...base, hostPanelStatus: { $ne: "Closed" } }),
      safeCount(WebsiteLead, { ...base, hostPanelStatus: "Closed" }),
      monthlySeries(WebsiteLead, "workspaceId", stringId, leadEscalationFilter(stringId)),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems,
      completionRate: pct(closed, totalRecords),
      kpis: [
        { label: "Pipeline", value: totalRecords },
        { label: "Open", value: openItems },
        { label: "Won / closed", value: closed },
        { label: "Conversion", value: pct(closed, totalRecords) ?? "--", suffix: "%" },
      ],
      breakdown: [
        { label: "Open", value: openItems },
        { label: "Closed", value: closed },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "tenant-companies-sales": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, active, inactive, monthly] = await Promise.all([
      safeCount(TenantCompany, base),
      safeCount(TenantCompany, { ...base, createdAt: { $gte: since30 } }),
      safeCount(TenantCompany, { ...base, status: "Active" }),
      safeCount(TenantCompany, { ...base, status: "Inactive" }),
      monthlySeries(TenantCompany, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: 0,
      completionRate: pct(active, totalRecords),
      kpis: [
        { label: "Companies", value: totalRecords },
        { label: "Active", value: active },
        { label: "Inactive", value: inactive },
        { label: "New (30d)", value: activeLast30Days },
      ],
      breakdown: [
        { label: "Active", value: active },
        { label: "Inactive", value: inactive },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "resource-pricing": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, active, maintenance, disabled, monthly] = await Promise.all([
      safeCount(Resource, base),
      safeCount(Resource, { ...base, createdAt: { $gte: since30 } }),
      safeCount(Resource, { ...base, status: "Active" }),
      safeCount(Resource, { ...base, status: "Under Maintenance" }),
      safeCount(Resource, { ...base, status: "Disabled" }),
      monthlySeries(Resource, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: maintenance,
      completionRate: pct(active, totalRecords),
      kpis: [
        { label: "Resources", value: totalRecords },
        { label: "Active", value: active },
        { label: "Under maintenance", value: maintenance },
        { label: "Disabled", value: disabled },
      ],
      breakdown: [
        { label: "Active", value: active },
        { label: "Maintenance", value: maintenance },
        { label: "Disabled", value: disabled },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "exit-management": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, pending, approved, rejected, completed, monthly] = await Promise.all([
      safeCount(ResignationRequest, base),
      safeCount(ResignationRequest, { ...base, createdAt: { $gte: since30 } }),
      safeCount(ResignationRequest, { ...base, status: "pending" }),
      safeCount(ResignationRequest, { ...base, status: "approved" }),
      safeCount(ResignationRequest, { ...base, status: "rejected" }),
      safeCount(ResignationRequest, { ...base, status: "completed" }),
      monthlySeries(ResignationRequest, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: pending,
      completionRate: pct(approved + completed, totalRecords),
      kpis: [
        { label: "Exit requests", value: totalRecords },
        { label: "Pending", value: pending },
        { label: "Approved", value: approved },
        { label: "Completed", value: completed },
      ],
      breakdown: [
        { label: "Pending", value: pending },
        { label: "Approved", value: approved },
        { label: "Rejected", value: rejected },
        { label: "Completed", value: completed },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  tasks: async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, pending, inProgress, completed, approved, rejected, low, medium, high, monthly] =
      await Promise.all([
        safeCount(Task, base),
        safeCount(Task, { ...base, createdAt: { $gte: since30 } }),
        safeCount(Task, { ...base, status: "Pending" }),
        safeCount(Task, { ...base, status: "In Progress" }),
        safeCount(Task, { ...base, status: "Completed" }),
        safeCount(Task, { ...base, status: "Approved" }),
        safeCount(Task, { ...base, status: "Rejected" }),
        safeCount(Task, { ...base, priority: "Low" }),
        safeCount(Task, { ...base, priority: "Medium" }),
        safeCount(Task, { ...base, priority: "High" }),
        monthlySeries(Task, "workspaceId", objectId),
      ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: pending + inProgress,
      completionRate: pct(completed + approved, totalRecords),
      kpis: [
        { label: "Tasks", value: totalRecords },
        { label: "Completed", value: completed + approved },
        { label: "In progress", value: inProgress },
        { label: "Pending", value: pending },
      ],
      breakdown: [
        { label: "Pending", value: pending },
        { label: "In Progress", value: inProgress },
        { label: "Completed", value: completed },
        { label: "Approved", value: approved },
        { label: "Rejected", value: rejected },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: [
        { label: "Low", value: low },
        { label: "Medium", value: medium },
        { label: "High", value: high },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  attendance: async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, pendingA, approvedA, rejectedA, monthly] = await Promise.all([
      safeCount(Attendance, base),
      safeCount(Attendance, { ...base, createdAt: { $gte: since30 } }),
      safeCount(Attendance, { ...base, status: "pending" }),
      safeCount(Attendance, { ...base, status: "approved" }),
      safeCount(Attendance, { ...base, status: "rejected" }),
      monthlySeries(Attendance, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: pendingA,
      completionRate: pct(approvedA, totalRecords),
      kpis: [
        { label: "Entries", value: totalRecords },
        { label: "Approved", value: approvedA },
        { label: "Pending review", value: pendingA },
        { label: "New (30d)", value: activeLast30Days },
      ],
      breakdown: [
        { label: "Pending", value: pendingA },
        { label: "Approved", value: approvedA },
        { label: "Rejected", value: rejectedA },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "leave-requests": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, pendingL, approvedL, rejectedL, durationSplit, monthly] = await Promise.all([
      safeCount(LeaveRequest, base),
      safeCount(LeaveRequest, { ...base, createdAt: { $gte: since30 } }),
      safeCount(LeaveRequest, { ...base, status: "pending" }),
      safeCount(LeaveRequest, { ...base, status: "approved" }),
      safeCount(LeaveRequest, { ...base, status: "rejected" }),
      breakdownBy(LeaveRequest, base, "durationType", [
        { label: "Full Day", value: "full_day" },
        { label: "Half Day", value: "half_day" },
        { label: "Hours", value: "hours" },
      ]),
      monthlySeries(LeaveRequest, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: pendingL,
      completionRate: pct(approvedL + rejectedL, totalRecords),
      kpis: [
        { label: "Requests", value: totalRecords },
        { label: "Approved", value: approvedL },
        { label: "Pending", value: pendingL },
        { label: "Rejected", value: rejectedL },
      ],
      breakdown: [
        { label: "Pending", value: pendingL },
        { label: "Approved", value: approvedL },
        { label: "Rejected", value: rejectedL },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: durationSplit,
      monthly,
    };
  },

  inventory: async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, activeI, maintenanceI, retiredI, consumable, returnable, monthly] = await Promise.all([
      safeCount(Inventory, base),
      safeCount(Inventory, { ...base, createdAt: { $gte: since30 } }),
      safeCount(Inventory, { ...base, status: "active" }),
      safeCount(Inventory, { ...base, status: "maintenance" }),
      safeCount(Inventory, { ...base, status: "retired" }),
      safeCount(Inventory, { ...base, trackingType: "Consumable" }),
      safeCount(Inventory, { ...base, trackingType: "Returnable Asset" }),
      monthlySeries(Inventory, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: maintenanceI,
      completionRate: pct(activeI, totalRecords),
      kpis: [
        { label: "Items", value: totalRecords },
        { label: "Active", value: activeI },
        { label: "Maintenance", value: maintenanceI },
        { label: "Retired", value: retiredI },
      ],
      breakdown: [
        { label: "Active", value: activeI },
        { label: "Maintenance", value: maintenanceI },
        { label: "Retired", value: retiredI },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: [
        { label: "Consumable", value: consumable },
        { label: "Returnable", value: returnable },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "finance-management": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [transactions, expenses, vendors, recentTx, recentExp, statusSplit, monthly] = await Promise.all([
      safeCount(FinanceTransaction, base),
      safeCount(FinanceExpense, base),
      safeCount(FinanceVendor, base),
      safeCount(FinanceTransaction, { ...base, createdAt: { $gte: since30 } }),
      safeCount(FinanceExpense, { ...base, createdAt: { $gte: since30 } }),
      deptBreakdownBy(FinanceTransaction, base, "status"),
      mergeSeries([
        await monthlySeries(FinanceTransaction, "workspaceId", objectId),
        await monthlySeries(FinanceExpense, "workspaceId", objectId),
      ]),
    ]);
    return {
      totalRecords: transactions + expenses,
      activeLast30Days: recentTx + recentExp,
      openItems: 0,
      completionRate: null,
      kpis: [
        { label: "Transactions", value: transactions },
        { label: "Expenses", value: expenses },
        { label: "Vendors", value: vendors },
        { label: "New (30d)", value: recentTx + recentExp },
      ],
      breakdown: [
        { label: "Transactions", value: transactions },
        { label: "Expenses", value: expenses },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: statusSplit,
      monthly,
    };
  },

  reports: async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, completedR, failedR, categorySplit, statusSplit, monthly] = await Promise.all([
      safeCount(Report, base),
      safeCount(Report, { ...base, createdAt: { $gte: since30 } }),
      safeCount(Report, { ...base, status: "completed" }),
      safeCount(Report, { ...base, status: "failed" }),
      breakdownBy(Report, base, "category", [
        { label: "Attendance", value: "Attendance" },
        { label: "Employee", value: "Employee" },
        { label: "Financial", value: "Financial" },
        { label: "Task", value: "Task" },
        { label: "Ticket", value: "Ticket" },
        { label: "Other", value: "Other" },
      ]),
      breakdownBy(Report, base, "status", [
        { label: "Completed", value: "completed" },
        { label: "Generating", value: "generating" },
        { label: "Failed", value: "failed" },
      ]),
      monthlySeries(Report, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: Math.max(0, totalRecords - completedR - failedR),
      completionRate: pct(completedR, totalRecords),
      kpis: [
        { label: "Reports", value: totalRecords },
        { label: "Completed", value: completedR },
        { label: "Failed", value: failedR },
        { label: "New (30d)", value: activeLast30Days },
      ],
      breakdown: categorySplit,
      secondaryBreakdown: statusSplit,
      monthly,
    };
  },

  "hr-documents": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, sops, policies, companyScope, deptScope, monthly] = await Promise.all([
      safeCount(DepartmentDocument, base),
      safeCount(DepartmentDocument, { ...base, createdAt: { $gte: since30 } }),
      safeCount(DepartmentDocument, { ...base, docType: "sop" }),
      safeCount(DepartmentDocument, { ...base, docType: "policy" }),
      safeCount(DepartmentDocument, { ...base, scope: "company" }),
      safeCount(DepartmentDocument, { ...base, scope: "department" }),
      monthlySeries(DepartmentDocument, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: 0,
      completionRate: null,
      kpis: [
        { label: "Documents", value: totalRecords },
        { label: "SOPs", value: sops },
        { label: "Policies", value: policies },
        { label: "New (30d)", value: activeLast30Days },
      ],
      breakdown: [
        { label: "SOP", value: sops },
        { label: "Policy", value: policies },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: [
        { label: "Company", value: companyScope },
        { label: "Department", value: deptScope },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  recruitment: async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [openings, activeOpenings, candidates, recentCandidates, candidateStatusSplit, monthly] = await Promise.all([
      safeCount(RecruitmentJobOpening, base),
      safeCount(RecruitmentJobOpening, { ...base, isActive: true }),
      safeCount(RecruitmentCandidate, base),
      safeCount(RecruitmentCandidate, { ...base, createdAt: { $gte: since30 } }),
      deptBreakdownBy(RecruitmentCandidate, base, "status"),
      mergeSeries([
        await monthlySeries(RecruitmentJobOpening, "workspaceId", objectId),
        await monthlySeries(RecruitmentCandidate, "workspaceId", objectId),
      ]),
    ]);
    return {
      totalRecords: openings + candidates,
      activeLast30Days: recentCandidates,
      openItems: activeOpenings,
      completionRate: null,
      kpis: [
        { label: "Openings", value: openings },
        { label: "Active openings", value: activeOpenings },
        { label: "Candidates", value: candidates },
        { label: "New candidates (30d)", value: recentCandidates },
      ],
      breakdown: [
        { label: "Openings", value: openings },
        { label: "Candidates", value: candidates },
      ].filter((segment) => segment.value > 0),
      secondaryBreakdown: candidateStatusSplit,
      monthly,
    };
  },

  "payroll-management": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [cycles, paidCycles, pendingCycles, entries, statusSplit, monthly] = await Promise.all([
      safeCount(PayrollCycle, base),
      safeCount(PayrollCycle, { ...base, status: "Paid" }),
      safeCount(PayrollCycle, { ...base, status: { $in: ["Pending", "Prepared", "Sent to Finance"] } }),
      safeCount(PayrollEntry, base),
      breakdownBy(PayrollCycle, base, "status", [
        { label: "Pending", value: "Pending" },
        { label: "Prepared", value: "Prepared" },
        { label: "Sent to Finance", value: "Sent to Finance" },
        { label: "Paid", value: "Paid" },
      ]),
      monthlySeries(PayrollCycle, "workspaceId", objectId),
    ]);
    return {
      totalRecords: cycles + entries,
      activeLast30Days: 0,
      openItems: pendingCycles,
      completionRate: pct(paidCycles, cycles),
      kpis: [
        { label: "Cycles", value: cycles },
        { label: "Paid", value: paidCycles },
        { label: "In pipeline", value: pendingCycles },
        { label: "Payslips / entries", value: entries },
      ],
      breakdown: statusSplit,
      monthly,
    };
  },

  "house-keeping": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [tasksT, activeLast30Days, completedH, openTasks, cancelledH, staff, presentStaff, statusSplit, attendanceSplit, monthly] =
      await Promise.all([
        safeCount(HousekeepingTask, base),
        safeCount(HousekeepingTask, { ...base, createdAt: { $gte: since30 } }),
        safeCount(HousekeepingTask, { ...base, status: "Completed" }),
        safeCount(HousekeepingTask, { ...base, status: { $in: ["Pending", "Assigned", "In Progress"] } }),
        safeCount(HousekeepingTask, { ...base, status: "Cancelled" }),
        safeCount(HousekeepingStaff, base),
        safeCount(HousekeepingStaff, { ...base, attendanceStatus: "Present" }),
        breakdownBy(HousekeepingTask, base, "status", [
          { label: "Pending", value: "Pending" },
          { label: "Assigned", value: "Assigned" },
          { label: "In Progress", value: "In Progress" },
          { label: "Completed", value: "Completed" },
          { label: "Cancelled", value: "Cancelled" },
        ]),
        breakdownBy(HousekeepingStaff, base, "attendanceStatus", [
          { label: "Present", value: "Present" },
          { label: "Absent", value: "Absent" },
        ]),
        monthlySeries(HousekeepingTask, "workspaceId", objectId),
      ]);
    return {
      totalRecords: tasksT + staff,
      activeLast30Days,
      openItems: openTasks,
      completionRate: pct(completedH, tasksT),
      kpis: [
        { label: "Tasks", value: tasksT },
        { label: "Completed", value: completedH },
        { label: "Open", value: openTasks },
        { label: "Staff on duty", value: presentStaff },
      ],
      breakdown: statusSplit,
      secondaryBreakdown: attendanceSplit.length ? attendanceSplit : [{ label: "Staff", value: staff }],
      monthly,
    };
  },

  "finance-budget": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [plans, annualReqs, extraReqs, pendingApprovals, statusSplit, monthly] = await Promise.all([
      safeCount(DepartmentFinancePlan, base),
      safeCount(AnnualFinanceRequest, base),
      safeCount(ExtraFinanceRequest, base),
      safeCountSum([
        { model: DepartmentFinancePlan, filter: { ...base, status: { $in: ["Pending", "Discuss"] } } },
        { model: AnnualFinanceRequest, filter: { ...base, status: { $in: ["Pending", "Discuss"] } } },
        { model: ExtraFinanceRequest, filter: { ...base, status: { $in: ["Pending", "Discuss"] } } },
      ]),
      (async () => {
        const parts = await Promise.all([
          breakdownBy(DepartmentFinancePlan, base, "status", [
            { label: "Pending", value: "Pending" },
            { label: "Approved", value: "Approved" },
            { label: "Rejected", value: "Rejected" },
            { label: "Discuss", value: "Discuss" },
          ]),
          breakdownBy(AnnualFinanceRequest, base, "status", [
            { label: "Pending", value: "Pending" },
            { label: "Approved", value: "Approved" },
            { label: "Rejected", value: "Rejected" },
            { label: "Discuss", value: "Discuss" },
          ]),
          breakdownBy(ExtraFinanceRequest, base, "status", [
            { label: "Pending", value: "Pending" },
            { label: "Approved", value: "Approved" },
            { label: "Rejected", value: "Rejected" },
            { label: "Discuss", value: "Discuss" },
          ]),
        ]);
        const merged = new Map();
        parts.flat().forEach(({ label, value }) => {
          merged.set(label, (merged.get(label) || 0) + value);
        });
        return Array.from(merged.entries())
          .map(([label, value]) => ({ label, value }))
          .filter((segment) => segment.value > 0);
      })(),
      mergeSeries([
        await monthlySeries(DepartmentFinancePlan, "workspaceId", objectId),
        await monthlySeries(AnnualFinanceRequest, "workspaceId", objectId),
        await monthlySeries(ExtraFinanceRequest, "workspaceId", objectId),
      ]),
    ]);
    return {
      totalRecords: plans + annualReqs + extraReqs,
      activeLast30Days: 0,
      openItems: pendingApprovals,
      completionRate: null,
      kpis: [
        { label: "Budget plans", value: plans },
        { label: "Annual requests", value: annualReqs },
        { label: "Extra requests", value: extraReqs },
        { label: "Awaiting approval", value: pendingApprovals },
      ],
      breakdown: statusSplit,
      monthly,
    };
  },

  "billing-payments": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, paidB, failedB, invoiceSplit, monthly] = await Promise.all([
      safeCount(TenantCreditRequest, base),
      safeCount(TenantCreditRequest, { ...base, createdAt: { $gte: since30 } }),
      safeCount(TenantCreditRequest, { ...base, invoiceStatus: "Paid" }),
      safeCount(TenantCreditRequest, { ...base, invoiceStatus: "Failed" }),
      breakdownBy(TenantCreditRequest, base, "invoiceStatus", [
        { label: "Pending", value: "Pending" },
        { label: "Generated", value: "Generated" },
        { label: "Sent", value: "Sent" },
        { label: "Paid", value: "Paid" },
        { label: "Failed", value: "Failed" },
      ]),
      monthlySeries(TenantCreditRequest, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: Math.max(0, totalRecords - paidB - failedB),
      completionRate: pct(paidB, totalRecords),
      kpis: [
        { label: "Credit requests", value: totalRecords },
        { label: "Paid", value: paidB },
        { label: "Failed", value: failedB },
        { label: "New (30d)", value: activeLast30Days },
      ],
      breakdown: invoiceSplit,
      monthly,
    };
  },

  accounting: async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [transactions, expenses, vendors, recentTx, recentExp, monthly] = await Promise.all([
      safeCount(FinanceTransaction, base),
      safeCount(FinanceExpense, base),
      safeCount(FinanceVendor, base),
      safeCount(FinanceTransaction, { ...base, createdAt: { $gte: since30 } }),
      safeCount(FinanceExpense, { ...base, createdAt: { $gte: since30 } }),
      mergeSeries([
        await monthlySeries(FinanceTransaction, "workspaceId", objectId),
        await monthlySeries(FinanceExpense, "workspaceId", objectId),
      ]),
    ]);
    return {
      totalRecords: transactions + expenses + vendors,
      activeLast30Days: recentTx + recentExp,
      openItems: 0,
      completionRate: null,
      kpis: [
        { label: "Transactions", value: transactions },
        { label: "Expenses", value: expenses },
        { label: "Vendors", value: vendors },
        { label: "New (30d)", value: recentTx + recentExp },
      ],
      breakdown: [
        { label: "Transactions", value: transactions },
        { label: "Expenses", value: expenses },
        { label: "Vendors", value: vendors },
      ].filter((segment) => segment.value > 0),
      monthly,
    };
  },

  "maintenance-repair-logs": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [repairs, repairOpen, repairDone, schedules, overdueS, completedS, repairSplit, scheduleSplit, monthly] = await Promise.all([
      safeCount(RepairLog, base),
      safeCount(RepairLog, { ...base, status: { $in: ["Open", "In Progress"] } }),
      safeCount(RepairLog, { ...base, status: { $in: ["Resolved", "Closed"] } }),
      safeCount(MaintenanceSchedule, base),
      safeCount(MaintenanceSchedule, { ...base, status: "Overdue" }),
      safeCount(MaintenanceSchedule, { ...base, status: "Completed" }),
      breakdownBy(RepairLog, base, "status", [
        { label: "Open", value: "Open" },
        { label: "In Progress", value: "In Progress" },
        { label: "Resolved", value: "Resolved" },
        { label: "Closed", value: "Closed" },
      ]),
      breakdownBy(MaintenanceSchedule, base, "status", [
        { label: "Scheduled", value: "Scheduled" },
        { label: "Due Soon", value: "Due Soon" },
        { label: "Overdue", value: "Overdue" },
        { label: "Completed", value: "Completed" },
      ]),
      mergeSeries([
        await monthlySeries(RepairLog, "workspaceId", objectId),
        await monthlySeries(MaintenanceSchedule, "workspaceId", objectId),
      ]),
    ]);
    return {
      totalRecords: repairs + schedules,
      activeLast30Days: 0,
      openItems: repairOpen + overdueS,
      completionRate: pct(repairDone, repairs),
      kpis: [
        { label: "Repair logs", value: repairs },
        { label: "Resolved", value: repairDone },
        { label: "Open repairs", value: repairOpen },
        { label: "Overdue services", value: overdueS },
      ],
      breakdown: repairSplit,
      secondaryBreakdown: scheduleSplit,
      monthly,
    };
  },

  "amc-maintenance-scheduler": async ({ objectId, since30 }) => {
    const base = { workspaceId: objectId };
    const [totalRecords, activeLast30Days, scheduledS, dueSoonS, overdueS, completedS, statusSplit, monthly] = await Promise.all([
      safeCount(MaintenanceSchedule, base),
      safeCount(MaintenanceSchedule, { ...base, createdAt: { $gte: since30 } }),
      safeCount(MaintenanceSchedule, { ...base, status: "Scheduled" }),
      safeCount(MaintenanceSchedule, { ...base, status: "Due Soon" }),
      safeCount(MaintenanceSchedule, { ...base, status: "Overdue" }),
      safeCount(MaintenanceSchedule, { ...base, status: "Completed" }),
      breakdownBy(MaintenanceSchedule, base, "status", [
        { label: "Scheduled", value: "Scheduled" },
        { label: "Due Soon", value: "Due Soon" },
        { label: "Overdue", value: "Overdue" },
        { label: "Completed", value: "Completed" },
      ]),
      monthlySeries(MaintenanceSchedule, "workspaceId", objectId),
    ]);
    return {
      totalRecords,
      activeLast30Days,
      openItems: scheduledS + dueSoonS + overdueS,
      completionRate: pct(completedS, totalRecords),
      kpis: [
        { label: "Schedules", value: totalRecords },
        { label: "Completed", value: completedS },
        { label: "Overdue", value: overdueS },
        { label: "Upcoming", value: scheduledS + dueSoonS },
      ],
      breakdown: statusSplit,
      monthly,
    };
  },
};

// Several department tabs point at the same underlying data as another
// module id — alias them so they are tracked without duplicated code.
MODULE_STAT_PROVIDERS["visitor-management"] = MODULE_STAT_PROVIDERS["visitors-management"];
MODULE_STAT_PROVIDERS["leave-request-processing"] = MODULE_STAT_PROVIDERS["leave-requests"];
MODULE_STAT_PROVIDERS["attendance-review"] = MODULE_STAT_PROVIDERS["attendance"];
MODULE_STAT_PROVIDERS["tenant-companies-admin"] = MODULE_STAT_PROVIDERS["tenant-companies-sales"];
MODULE_STAT_PROVIDERS["bookings"] = MODULE_STAT_PROVIDERS["meeting-room-system"];
MODULE_STAT_PROVIDERS["resource-management"] = MODULE_STAT_PROVIDERS["resource-pricing"];
MODULE_STAT_PROVIDERS["tech-website-builder"] = MODULE_STAT_PROVIDERS["website-builder"];
MODULE_STAT_PROVIDERS["it-repair-logs"] = MODULE_STAT_PROVIDERS["maintenance-repair-logs"];

// Peak-time analysis source collection(s) per module id.
const INSIGHT_SOURCES = {
  tickets: [{ model: Ticket, field: "workspaceId", type: "objectId" }],
  "customer-support": [{ model: SupportTicket, field: "workspace", type: "objectId" }],
  "meeting-room-system": [{ model: MeetingRoomBooking, field: "workspaceId", type: "objectId" }],
  calendar: [
    { model: LeaveRequest, field: "workspaceId", type: "objectId" },
    { model: Holiday, field: "workspaceId", type: "objectId" },
  ],
  assets: [{ model: Asset, field: "workspaceId", type: "objectId" }],
  "team-management": [
    { model: EmployeeProfile, field: "workspaceId", type: "objectId" },
    { model: Department, field: "workspaceId", type: "objectId" },
  ],
  "website-builder": [{ model: WebsiteTemplate, field: "workspaceId", type: "objectId" }],
  "website-leads": [{ model: WebsiteLead, field: "workspaceId", type: "string", escalatedOnly: true }],
  "website-review": [{ model: WebsiteReview, field: "workspaceId", type: "string" }],
  "organization-management": [
    { model: WorkspaceMember, field: "workspace", type: "objectId" },
    { model: Department, field: "workspaceId", type: "objectId" },
  ],
  "access-grants": [{ model: Role, field: "workspaceId", type: "objectId" }],
  "visitors-management": [{ model: VisitorLog, field: "workspace", type: "objectId" }],
  "leads-management": [{ model: WebsiteLead, field: "workspaceId", type: "string", escalatedOnly: true }],
  "tenant-companies-sales": [{ model: TenantCompany, field: "workspaceId", type: "objectId" }],
  "resource-pricing": [{ model: Resource, field: "workspaceId", type: "objectId" }],
  "exit-management": [{ model: ResignationRequest, field: "workspaceId", type: "objectId" }],
  tasks: [{ model: Task, field: "workspaceId", type: "objectId" }],
  attendance: [{ model: Attendance, field: "workspaceId", type: "objectId" }],
  "leave-requests": [{ model: LeaveRequest, field: "workspaceId", type: "objectId" }],
  inventory: [{ model: Inventory, field: "workspaceId", type: "objectId" }],
  "finance-management": [
    { model: FinanceTransaction, field: "workspaceId", type: "objectId" },
    { model: FinanceExpense, field: "workspaceId", type: "objectId" },
  ],
  reports: [{ model: Report, field: "workspaceId", type: "objectId" }],
  "hr-documents": [{ model: DepartmentDocument, field: "workspaceId", type: "objectId" }],
  recruitment: [
    { model: RecruitmentJobOpening, field: "workspaceId", type: "objectId" },
    { model: RecruitmentCandidate, field: "workspaceId", type: "objectId" },
  ],
  "payroll-management": [
    { model: PayrollCycle, field: "workspaceId", type: "objectId" },
    { model: PayrollEntry, field: "workspaceId", type: "objectId" },
  ],
  "house-keeping": [
    { model: HousekeepingTask, field: "workspaceId", type: "objectId" },
    { model: HousekeepingStaff, field: "workspaceId", type: "objectId" },
  ],
  "finance-budget": [
    { model: DepartmentFinancePlan, field: "workspaceId", type: "objectId" },
    { model: AnnualFinanceRequest, field: "workspaceId", type: "objectId" },
    { model: ExtraFinanceRequest, field: "workspaceId", type: "objectId" },
  ],
  "billing-payments": [{ model: TenantCreditRequest, field: "workspaceId", type: "objectId" }],
  accounting: [
    { model: FinanceTransaction, field: "workspaceId", type: "objectId" },
    { model: FinanceExpense, field: "workspaceId", type: "objectId" },
    { model: FinanceVendor, field: "workspaceId", type: "objectId" },
  ],
  "maintenance-repair-logs": [
    { model: RepairLog, field: "workspaceId", type: "objectId" },
    { model: MaintenanceSchedule, field: "workspaceId", type: "objectId" },
  ],
  "amc-maintenance-scheduler": [{ model: MaintenanceSchedule, field: "workspaceId", type: "objectId" }],
};
INSIGHT_SOURCES["visitor-management"] = INSIGHT_SOURCES["visitors-management"];
INSIGHT_SOURCES["leave-request-processing"] = INSIGHT_SOURCES["leave-requests"];
INSIGHT_SOURCES["attendance-review"] = INSIGHT_SOURCES["attendance"];
INSIGHT_SOURCES["tenant-companies-admin"] = INSIGHT_SOURCES["tenant-companies-sales"];
INSIGHT_SOURCES["bookings"] = INSIGHT_SOURCES["meeting-room-system"];
INSIGHT_SOURCES["resource-management"] = INSIGHT_SOURCES["resource-pricing"];
INSIGHT_SOURCES["tech-website-builder"] = INSIGHT_SOURCES["website-builder"];
INSIGHT_SOURCES["it-repair-logs"] = INSIGHT_SOURCES["maintenance-repair-logs"];

// Which department column drives the dept-wise chart for each module.
const DEPT_BREAKDOWN_SOURCES = {
  tickets: { model: Ticket, match: "workspaceId", field: "departmentId" },
  tasks: { model: Task, match: "workspaceId", field: "departmentId" },
  attendance: { model: Attendance, match: "workspaceId", field: "department" },
  "leave-requests": { model: LeaveRequest, match: "workspaceId", field: "department" },
  inventory: { model: Inventory, match: "workspaceId", field: "departmentName" },
  reports: { model: Report, match: "workspaceId", field: "departmentId" },
  recruitment: { model: RecruitmentCandidate, match: "workspaceId", field: "departmentId" },
  "payroll-management": { model: PayrollEntry, match: "workspaceId", field: "departmentId" },
  "hr-documents": { model: DepartmentDocument, match: "workspaceId", field: "departmentId" },
  "maintenance-repair-logs": { model: RepairLog, match: "workspaceId", field: "departmentId" },
  "amc-maintenance-scheduler": { model: MaintenanceSchedule, match: "workspaceId", field: "departmentId" },
  "finance-budget": { model: DepartmentFinancePlan, match: "workspaceId", field: "department" },
};
DEPT_BREAKDOWN_SOURCES["it-repair-logs"] = DEPT_BREAKDOWN_SOURCES["maintenance-repair-logs"];

// Modules enabled in the workspace but without trackable operational data
// (config screens, external integrations, orchestration pages).
const NON_TRACKABLE_MODULE_IDS = new Set([
  "dashboard",
  "workspace-settings",
  "workspace-management",
  "wono-nomad",
  "sales-architecture",
]);

// Collections blended into the platform-wide 6-month activity trend.
const TREND_SOURCES = [
  { model: Ticket, field: "workspaceId", type: "objectId" },
  { model: MeetingRoomBooking, field: "workspaceId", type: "objectId" },
  { model: SupportTicket, field: "workspace", type: "objectId" },
  { model: VisitorLog, field: "workspace", type: "objectId" },
  { model: Asset, field: "workspaceId", type: "objectId" },
  { model: WebsiteLead, field: "workspaceId", type: "string", escalatedOnly: true },
  { model: WebsiteReview, field: "workspaceId", type: "string" },
  { model: Resource, field: "workspaceId", type: "objectId" },
  { model: TenantCompany, field: "workspaceId", type: "objectId" },
  { model: ResignationRequest, field: "workspaceId", type: "objectId" },
];

// The Add-ons catalogue repeats every module id, so "first match wins" would
// mislabel most modules as Add-ons. Resolve each id to its real home section
// using this priority order instead.
const SECTION_PRIORITY = {
  "common-modules": 0,
  "extra-common-modules": 1,
  "key-apps": 2,
  "founder-core-modules": 3,
  "department-accesses": 4,
  "add-ons": 5,
};

const buildCatalogIndex = (catalog) => {
  const index = new Map();
  const consider = (id, payload, priority) => {
    if (!id) return;
    const existing = index.get(id);
    if (!existing || priority < existing.priority) {
      index.set(id, { ...payload, priority });
    }
  };

  (Array.isArray(catalog?.sections) ? catalog.sections : []).forEach((section) => {
    const sectionPriority = SECTION_PRIORITY[section?.sectionId] ?? 99;
    (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
      if (Array.isArray(item?.tabs) && item.tabs.length > 0) {
        // Department groups: label the tab after its parent group
        // (e.g. "Sales Department"), not the generic section label.
        item.tabs.forEach((tab) => {
          consider(tab.id, {
            label: tab.label || tab.id,
            route: tab.route || "",
            implemented: tab.implemented,
            sectionLabel: item.label || section.sectionLabel || "",
          }, sectionPriority);
        });
        return;
      }
      consider(item.id, {
        label: item.label || item.id,
        route: item.route || "",
        implemented: item.implemented,
        sectionLabel: section.sectionLabel || "",
      }, sectionPriority);
    });
  });

  return index;
};

export const getAnalyticsOverview = async (req: Request, res: Response, next) => {
  try {
    const userId = String(req.user?.id || req.user?._id || req.user || "");
    const { workspace } = await resolveAnalyticsWorkspace(userId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }

    const currentMember = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: userId,
      isActive: true,
    })
      .populate("role")
      .lean()
      .exec();

    const roleBand = _getRoleBand(currentMember?.role);
    if (roleBand !== "owner" && roleBand !== "super_admin") {
      return res.status(403).json({ message: "Only founders and super admins can view analytics." });
    }

    // Unit switching: a founder may own several units (workspaces). Passing
    // ?workspaceId= analyses that unit instead of the primary one — but only
    // while it belongs to the same owner account.
    let activeWorkspace = workspace;
    const requestedUnitId = String(req.query.workspaceId || "").trim();
    if (requestedUnitId && requestedUnitId !== String(workspace._id)) {
      if (!mongoose.isValidObjectId(requestedUnitId)) {
        return res.status(400).json({ message: "Invalid unit selected." });
      }
      const targetUnit = await Workspace.findById(requestedUnitId).lean().exec();
      if (!targetUnit || targetUnit.isDeleted === true) {
        return res.status(404).json({ message: "Selected unit not found." });
      }
      if (String(targetUnit.owner) !== String(workspace.owner)) {
        return res.status(403).json({ message: "You can only view analytics for units you own." });
      }
      activeWorkspace = targetUnit;
    }

    const unitDocs = await Workspace.find({ owner: workspace.owner, isDeleted: { $ne: true } })
      .select("workspaceName")
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    const units = unitDocs.map((doc) => ({
      id: String(doc._id),
      name: doc.workspaceName || "Untitled unit",
    }));

    const selectedPlan = String(activeWorkspace.selectedPlan || "basic").trim().toLowerCase();
    const workspaceEnabledIds = Array.isArray(activeWorkspace.enabledModuleIds)
      ? activeWorkspace.enabledModuleIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    // Effective enablement mirrors the sidebar: plan defaults plus whatever
    // was toggled on for this specific workspace (master panel add-ons).
    const effectiveEnabled = new Set([
      ...getDefaultEnabledModuleIdsForPlan(selectedPlan),
      ...workspaceEnabledIds,
    ]);

    const catalog = buildWorkspaceModuleCatalog({ selectedPlan, enabledModuleIds: workspaceEnabledIds });
    const catalogIndex = buildCatalogIndex(catalog);

    // Plan availability per module ("INC PLAN" logic): Basic defaults ship to
    // everyone, Professional-only modules inherit upward, the rest are
    // Custom-only per-workspace unlocks.
    const basicDefaults = new Set(getDefaultEnabledModuleIdsForPlan("basic"));
    const professionalDefaults = new Set(getDefaultEnabledModuleIdsForPlan("professional"));
    const planAvailability = (id) => {
      if (basicDefaults.has(id)) return "All Plans";
      if (professionalDefaults.has(id)) return "Professional +";
      return "Custom";
    };

    const workspaceObjectId = activeWorkspace._id;
    const workspaceStringId = String(workspaceObjectId);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Every enabled module with a provider is tracked — implemented flag no
    // longer gates tracking, so management sees numbers for the full catalog.
    const trackableIds = Array.from(effectiveEnabled).filter(
      (id) => id !== "analytics" && MODULE_STAT_PROVIDERS[id],
    );

    // Department tabs and key-apps sometimes alias the same data source
    // (e.g. tech-website-builder -> website-builder). Show each data source
    // once, preferring the entry from the higher-priority catalog section.
    const orderedTrackableIds = [...trackableIds].sort((a, b) => {
      const priorityA = catalogIndex.get(a)?.priority ?? 99;
      const priorityB = catalogIndex.get(b)?.priority ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return String(a).localeCompare(String(b));
    });
    const claimedProviders = new Set();
    const uniqueTrackableIds = orderedTrackableIds.filter((id) => {
      const provider = MODULE_STAT_PROVIDERS[id];
      if (!provider || claimedProviders.has(provider)) return false;
      claimedProviders.add(provider);
      return true;
    });

    const settledModules = await Promise.all(
      uniqueTrackableIds.map(async (id) => {
        const meta = catalogIndex.get(id) || {};
        try {
          const stats = await MODULE_STAT_PROVIDERS[id]({
            objectId: workspaceObjectId,
            stringId: workspaceStringId,
            since30,
          });
          const insightSources = INSIGHT_SOURCES[id] ?? [];
          const insights = mergeInsights(
            await Promise.all(
              insightSources.map(({ model, field, type, escalatedOnly }) =>
                usageInsights(
                  model,
                  field,
                  type === "string" ? workspaceStringId : workspaceObjectId,
                  escalatedOnly ? leadEscalationFilter(workspaceStringId) : {},
                ),
              ),
            ),
          );
          const deptSource = DEPT_BREAKDOWN_SOURCES[id];
          const deptBreakdown = deptSource
            ? await deptBreakdownBy(deptSource.model, { [deptSource.match]: workspaceObjectId }, deptSource.field)
            : [];
          return {
            id,
            label: meta.label || id,
            sectionLabel: meta.sectionLabel || "",
            route: meta.route || "",
            trackable: true,
            planAvailability: planAvailability(id),
            activityScore: computeActivityScore(stats),
            stats: {
              ...stats,
              completionRate: stats.completionRate ?? null,
              kpis: stats.kpis ?? [],
              breakdown: stats.breakdown ?? [],
              secondaryBreakdown: stats.secondaryBreakdown ?? [],
              monthly: stats.monthly ?? [],
              insights,
              deptBreakdown,
            },
          };
        } catch {
          return {
            id,
            label: meta.label || id,
            sectionLabel: meta.sectionLabel || "",
            route: meta.route || "",
            trackable: false,
            planAvailability: planAvailability(id),
            activityScore: 0,
            stats: null,
          };
        }
      }),
    );

    const alsoEnabled = Array.from(effectiveEnabled).filter((id) => {
      if (MODULE_STAT_PROVIDERS[id]) return false;
      if (NON_TRACKABLE_MODULE_IDS.has(id)) return true;
      const meta = catalogIndex.get(id);
      return Boolean(meta && meta.implemented !== false);
    });

    const modules = settledModules.sort((a, b) => b.activityScore - a.activityScore);

    const totals = modules.reduce(
      (acc, entry) => {
        acc.totalRecords += Number(entry.stats?.totalRecords) || 0;
        acc.activeLast30Days += Number(entry.stats?.activeLast30Days) || 0;
        acc.openItems += Number(entry.stats?.openItems) || 0;
        return acc;
      },
      { totalRecords: 0, activeLast30Days: 0, openItems: 0 },
    );
    const scored = modules.filter((entry) => Number(entry.stats?.totalRecords) > 0);
    totals.trackedModules = scored.length;
    totals.avgActivityScore = scored.length
      ? Math.round(scored.reduce((sum, entry) => sum + entry.activityScore, 0) / scored.length)
      : 0;

    // Platform-wide creation trend for the last 6 months.
    const trendBuckets = buildMonthKeys();
    const trendResults = await Promise.allSettled(
      TREND_SOURCES.map(({ model, field, type, escalatedOnly }) => {
        const matchValue = type === "string" ? workspaceStringId : workspaceObjectId;
        const extraMatch = escalatedOnly ? leadEscalationFilter(workspaceStringId) : {};
        return model.aggregate([
          { $match: { [field]: matchValue, createdAt: { $gte: TREND_SINCE }, ...extraMatch } },
          { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
        ]).exec();
      }),
    );

    trendResults.forEach((result) => {
      if (result.status !== "fulfilled" || !Array.isArray(result.value)) return;
      result.value.forEach(({ _id, count }) => {
        const bucket = trendBuckets.find((entry) => entry.key === _id);
        if (bucket) bucket.count += Number(count) || 0;
      });
    });

    return res.status(200).json({
      message: "Analytics overview loaded successfully.",
      data: {
        workspaceId: workspaceStringId,
        workspaceName: activeWorkspace.workspaceName || "",
        plan: selectedPlan,
        generatedAt: new Date().toISOString(),
        units,
        modules,
        alsoEnabled: alsoEnabled
          .map((id) => ({
            id,
            label: catalogIndex.get(id)?.label || id,
            route: catalogIndex.get(id)?.route || "",
          }))
          .sort((a, b) => String(a.label).localeCompare(String(b.label))),
        totals,
        trend: trendBuckets,
      },
    });
  } catch (error) {
    next(error);
  }
};
