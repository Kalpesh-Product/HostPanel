import mongoose from "mongoose";
import LeaveRequest from "../../models/LeaveRequest.js";
import LeaveQuota from "../../models/LeaveQuota.js";
import LeaveType from "../../models/LeaveType.js";
import Holiday from "../../models/Holiday.js";
import Workspace from "../../models/Workspace.js";
import WorkspaceMember from "../../models/WorkspaceMember.js";
import Department from "../../models/Department.js";
import EmployeeProfile from "../../models/EmployeeProfile.js";
import { getCurrentWorkspace } from "./hr.service.js";
import { findAttendanceShift, getShiftDurationMinutes } from "../../utils/attendanceShifts.js";
import { resolveMembershipByWorkspace } from "../../utils/resolveMembership.js";
import { uploadFileToS3 } from "../../config/s3config.js";
import { createNotification, notifyMultipleRecipients } from "../../utils/notify.js";
import { getZonedDateKey, normalizeTimeZone } from "../../utils/workspaceLocalization.js";

export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveMode = "full_day" | "half_day" | "hours";

const toId = (value: any): string => {
  if (value == null) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const getRoleName = (role: any): string => {
  if (!role) return "";
  if (typeof role === "object" && role?.name) return String(role.name);
  return String(role);
};

const normalizeRoleKey = (role: any): string => {
  const normalized = getRoleName(role).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "owner") return "founder";
  if (normalized === "superadmin") return "super_admin";
  if (normalized === "hrmanager") return "hr_manager";
  return normalized || "employee";
};

const getDepartmentIds = (departments: any[] = []): string[] =>
  departments.map((department) => toId(typeof department === "object" ? department?._id : department)).filter(Boolean);

const getDepartmentNames = (departments: any[] = []): string[] =>
  departments
    .map((department) => {
      if (!department) return "";
      if (typeof department === "object" && department?.name) return String(department.name);
      return String(department);
    })
    .map((name) => name.trim())
    .filter(Boolean);

const normalizeDepartmentKey = (value: any): string =>
  String(value || "").trim().toLowerCase().replace(/[_\s-]+/g, "-");

const isHrDepartmentName = (value: any): boolean => {
  const key = normalizeDepartmentKey(value);
  return (
    key === "hr" ||
    key.startsWith("hr-") ||
    key.includes("human-resources") ||
    key.includes("human_resources") ||
    key.includes("hr-department") ||
    key.includes("hr-team")
  );
};

const isAdministrationDepartmentName = (value: any): boolean => {
  const key = normalizeDepartmentKey(value);
  return key === "admin" || key === "administration" || key.startsWith("admin-") || key.includes("administration");
};

const formatDateOnly = (value: any): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getYearFromDate = (value: any): number => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().getFullYear();
  return date.getUTCFullYear();
};

const roundDays = (value: number): number => Math.round(value * 100) / 100;
const PARTIAL_LEAVE_DAY_HOURS = 10;

const countWorkingLeaveDays = (startDate: Date, endDate: Date, holidayDateKeys: Set<string>): number => {
  let count = 0;
  const cursor = new Date(`${formatDateOnly(startDate)}T00:00:00.000Z`);
  const endKey = formatDateOnly(endDate);
  while (formatDateOnly(cursor) <= endKey) {
    const dateKey = formatDateOnly(cursor);
    if (cursor.getUTCDay() !== 0 && !holidayDateKeys.has(dateKey)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
};

const getDailyWorkingHours = (workspace: any, assignedShift: any = null): number => {
  if (assignedShift) {
    const durationMinutes = getShiftDurationMinutes(assignedShift);
    const netMinutes = Math.max(0, durationMinutes - Number(assignedShift.breakDurationMinutes || 0));
    if (netMinutes > 0) return netMinutes / 60;
  }
  const weekly = Number(workspace?.attendanceSettings?.weeklyWorkingHours);
  return Number.isFinite(weekly) && weekly > 0 ? Math.max(1, weekly / 5) : 8;
};

const resolveUserAttendanceShift = async (workspace: any, userId: any) => {
  const profile: any = await EmployeeProfile.findOne({ workspaceId: workspace?._id, linkedUserId: userId })
    .select("shiftId")
    .lean()
    .exec();
  const shiftId = String(profile?.shiftId || "").trim();
  return { shiftId, shift: findAttendanceShift(workspace, shiftId) };
};

const httpError = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode });

const isHrManagerMembership = (membership: any): boolean => {
  const roleKey = normalizeRoleKey(membership?.role);
  const departmentNames = getDepartmentNames(membership?.departments || []);
  const inHrDepartment = departmentNames.some(isHrDepartmentName);
  if (roleKey === "hr" || roleKey === "hr_manager") return true;
  if ((roleKey === "manager" || roleKey === "admin" || roleKey === "admin_manager") && inHrDepartment) return true;
  return false;
};

const inSameDepartment = (actor: any, requesterDepartmentIds: string[], requesterDepartmentName: string): boolean => {
  const actorDepartmentIds = getDepartmentIds(actor?.departments || []);
  const actorDepartmentNames = getDepartmentNames(actor?.departments || []);
  if (requesterDepartmentIds.some((id) => id && actorDepartmentIds.includes(id))) return true;
  if (requesterDepartmentName && actorDepartmentNames.some((name) => normalizeDepartmentKey(name) === normalizeDepartmentKey(requesterDepartmentName))) return true;
  return false;
};

interface ActorContext {
  userId: string;
  roleKey: string;
  departments: any[];
  membership: any;
  displayName: string;
  designation: string;
  departmentName: string;
}

const isFounder = (actor: ActorContext) => actor.roleKey === "founder";
const isSuperAdmin = (actor: ActorContext) => actor.roleKey === "super_admin";

const canViewAllLeaveRequests = (actor: ActorContext): boolean =>
  isFounder(actor) || isSuperAdmin(actor) || isHrManagerMembership(actor.membership);

const canViewDepartmentLeaveRequests = (actor: ActorContext): boolean =>
  actor.roleKey === "admin" || actor.roleKey === "admin_manager" || actor.roleKey === "manager";

interface LeaveWorkspaceContext {
  user: any;
  workspace: any;
  membership: any;
  actor: ActorContext;
}

const resolveLeaveWorkspaceContext = async (userId: string, workspaceId?: string): Promise<LeaveWorkspaceContext> => {
  if (!userId) throw httpError("Authentication required.", 401);

  let workspace: any = null;
  let membership: any = null;
  let user: any = null;

  if (workspaceId && mongoose.isValidObjectId(workspaceId)) {
    workspace = await Workspace.findById(workspaceId).lean().exec();
    if (workspace) {
      membership = await resolveMembershipByWorkspace(workspace._id, userId, "role departments isActive isPrimary");
      user = await (await import("../../models/HostUser.js")).default.findById(userId).select("_id name email").lean().exec();
    }
  }

  if (!workspace || !membership) {
    const resolved = await getCurrentWorkspace(userId);
    workspace = resolved.workspace;
    membership = resolved.membership;
    user = resolved.user;
  }

  if (!workspace) throw httpError("Workspace not found for this user.", 404);
  if (!membership) throw httpError("You do not have workspace access.", 403);

  const hasPopulatedDepartments = Array.isArray(membership.departments)
    && membership.departments.some((department: any) => typeof department === "object" && department?.name);
  if (!hasPopulatedDepartments && Array.isArray(membership.departments) && membership.departments.length > 0) {
    const departmentIds = getDepartmentIds(membership.departments).filter((id) => mongoose.isValidObjectId(id));
    if (departmentIds.length > 0) {
      const departmentDocs = await Department.find({
        _id: { $in: departmentIds },
        workspaceId: workspace._id,
      })
        .select("_id name")
        .lean()
        .exec();
      if (departmentDocs.length > 0) membership = { ...membership, departments: departmentDocs };
    }
  }

  const roleKey = normalizeRoleKey(membership.role);
  const displayName = getRoleName(membership.role);

  return {
    user,
    workspace,
    membership,
    actor: {
      userId: String(user?._id || userId),
      roleKey,
      departments: membership.departments || [],
      membership,
      displayName: user?.name || displayName || "Team Member",
      designation: displayName || roleKey.replace(/_/g, " "),
      departmentName: getDepartmentNames(membership.departments || [])[0] || "",
    },
  };
};

const resolveEmployeeId = async (workspaceId: any, userId: any): Promise<string> => {
  const profile = await EmployeeProfile.findOne({
    workspaceId,
    $or: [{ linkedUserId: userId }, { linkedWorkspaceMemberId: userId }],
  })
    .select("employeeId")
    .lean()
    .exec();
  return profile?.employeeId || "";
};

const getNextLeaveNumber = async (workspaceId: any): Promise<number> => {
  const latest = await LeaveRequest.findOne({ workspaceId })
    .sort({ leaveNumber: -1 })
    .select("leaveNumber")
    .lean()
    .exec();
  return Number(latest?.leaveNumber || 0) + 1;
};

const buildLeaveCode = (number: number): string => `LV-${String(number).padStart(4, "0")}`;

const toLeaveTypeCode = (value: any): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const formatLeaveType = (leaveType: any) => ({
  id: String(leaveType._id),
  name: leaveType.name,
  code: leaveType.code,
  description: leaveType.description || "",
  isActive: Boolean(leaveType.isActive),
  requiresBalance: leaveType.requiresBalance !== false,
  medicalCertificateAfterDays: leaveType.medicalCertificateAfterDays ?? null,
  color: leaveType.color || "#2563EB",
  sortOrder: Number(leaveType.sortOrder || 0),
});

const getWorkspaceLeaveTypes = async (workspaceId: any, includeInactive = false): Promise<any[]> =>
  LeaveType.find({ workspaceId, ...(includeInactive ? {} : { isActive: true }) })
    .sort({ sortOrder: 1, name: 1 })
    .lean()
    .exec();

const getApprovedDaysForUser = async (
  workspaceId: any,
  userId: any,
  year: number,
  leaveTypes?: any[],
): Promise<Record<string, number>> => {
  const types = leaveTypes || await getWorkspaceLeaveTypes(workspaceId, true);
  const used: Record<string, number> = Object.fromEntries(types.map((type: any) => [String(type._id), 0]));
  const byId = new Map(types.map((type: any) => [String(type._id), String(type._id)]));
  const byCode = new Map(types.map((type: any) => [type.code, String(type._id)]));
  const approved = await LeaveRequest.find({
    workspaceId,
    requesterUserId: userId,
    status: "approved",
    quotaYear: year,
  })
    .select("leaveType leaveTypeId days")
    .lean()
    .exec();
  approved.forEach((request: any) => {
    const typeId = byId.get(toId(request.leaveTypeId)) || byCode.get(toLeaveTypeCode(request.leaveType));
    if (typeId) used[typeId] = roundDays(Number(used[typeId] || 0) + Number(request.days || 0));
  });
  return used;
};

const mapToObject = (value: any): Record<string, number> => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  return { ...value };
};

const quotaHasAssignmentConfig = (quota: any): boolean =>
  Boolean(quota) && Object.prototype.hasOwnProperty.call(quota, "assignedLeaveTypeIds");

const getAssignedLeaveTypes = (quota: any, leaveTypes: any[]): any[] => {
  if (!quota) return [];
  if (!quotaHasAssignmentConfig(quota)) return leaveTypes;
  const assignedIds = new Set((quota.assignedLeaveTypeIds || []).map((id: any) => toId(id)));
  return leaveTypes.filter((type: any) => assignedIds.has(String(type._id)));
};

const resolveQuotaYearForDate = async (workspaceId: any, userId: any, date: Date): Promise<number> => {
  const calendarYear = date.getUTCFullYear();
  const financialYear = date.getUTCMonth() < 3 ? calendarYear - 1 : calendarYear;
  const candidates: any[] = await LeaveQuota.find({
    workspaceId,
    userId,
    year: { $in: [calendarYear, financialYear] },
  })
    .select("year cycleType")
    .lean()
    .exec();
  if (candidates.some((quota) => quota.cycleType === "financial_year" && quota.year === financialYear)) return financialYear;
  if (candidates.some((quota) => quota.cycleType !== "financial_year" && quota.year === calendarYear)) return calendarYear;
  const latest: any = await LeaveQuota.findOne({ workspaceId, userId }).sort({ year: -1 }).select("cycleType").lean().exec();
  return latest?.cycleType === "financial_year" ? financialYear : calendarYear;
};

const ensureQuotaForYear = async (workspaceId: any, userId: any, year: number, leaveTypes: any[]): Promise<any> => {
  const current: any = await LeaveQuota.findOne({ workspaceId, userId, year }).lean().exec();
  if (current) return current;
  const previous: any = await LeaveQuota.findOne({ workspaceId, userId, year: year - 1 }).lean().exec();
  if (!previous) return null;

  const assignedTypes = getAssignedLeaveTypes(previous, leaveTypes);
  const previousBalances = mapToObject(previous.balances);
  const annualBalances = Object.keys(mapToObject(previous.annualBalances)).length > 0
    ? mapToObject(previous.annualBalances)
    : previousBalances;
  const previousUsed = await getApprovedDaysForUser(workspaceId, userId, year - 1, leaveTypes);
  const nextBalances: Record<string, number> = {};
  const nextAnnualBalances: Record<string, number> = {};

  assignedTypes.forEach((type: any) => {
    const base = Math.max(0, Number(annualBalances[type.code] ?? previousBalances[type.code] ?? 0));
    const previousRemaining = Math.max(0, Number(previousBalances[type.code] || 0) - Number(previousUsed[String(type._id)] || 0));
    const carryLimit = previous.carryForwardLimit == null ? previousRemaining : Math.max(0, Number(previous.carryForwardLimit));
    const carried = previous.carryForward ? Math.min(previousRemaining, carryLimit) : 0;
    nextAnnualBalances[type.code] = base;
    nextBalances[type.code] = roundDays(base + carried);
  });

  try {
    return await LeaveQuota.create({
      workspaceId,
      userId,
      year,
      assignedLeaveTypeIds: assignedTypes.map((type: any) => type._id),
      balances: nextBalances,
      annualBalances: nextAnnualBalances,
      cycleType: previous.cycleType || "calendar_year",
      carryForward: Boolean(previous.carryForward),
      carryForwardLimit: previous.carryForwardLimit ?? null,
      createdBy: previous.updatedBy || previous.createdBy || null,
      updatedBy: previous.updatedBy || previous.createdBy || null,
    });
  } catch (error: any) {
    if (error?.code === 11000) return LeaveQuota.findOne({ workspaceId, userId, year }).lean().exec();
    throw error;
  }
};

export async function getLeaveBalancesForUser(userId: string, workspaceId?: string, quotaYear?: number) {
  const { workspace, user } = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const resolvedUserId = user?._id || userId;
  const year = Number(quotaYear) || await resolveQuotaYearForDate(workspace._id, resolvedUserId, new Date());
  const shiftAssignment = await resolveUserAttendanceShift(workspace, resolvedUserId);
  const allLeaveTypes = await getWorkspaceLeaveTypes(workspace._id);
  const quota: any = await ensureQuotaForYear(workspace._id, resolvedUserId, year, allLeaveTypes);
  const leaveTypes = getAssignedLeaveTypes(quota, allLeaveTypes);
  const storedBalances = mapToObject(quota?.balances);
  const used = await getApprovedDaysForUser(workspace._id, resolvedUserId, year, allLeaveTypes);
  const balances: Record<string, { total: number; used: number; remaining: number }> = {};

  leaveTypes.forEach((type: any) => {
    const id = String(type._id);
    const legacyTotal = Number(quota?.[type.name] || 0);
    const total = Math.max(0, Number(storedBalances[type.code] ?? legacyTotal ?? 0));
    const usedDays = Number(used[id] || 0);
    balances[id] = {
      total,
      used: roundDays(usedDays),
      remaining: type.requiresBalance === false ? -1 : Math.max(0, roundDays(total - usedDays)),
    };
  });

  return {
    year,
    dailyWorkingHours: getDailyWorkingHours(workspace, shiftAssignment.shift),
    workingHoursStart: shiftAssignment.shift?.startTime || workspace?.attendanceSettings?.workingHoursStart || null,
    workingHoursEnd: shiftAssignment.shift?.endTime || workspace?.attendanceSettings?.workingHoursEnd || null,
    breakDurationMinutes: Number(shiftAssignment.shift?.breakDurationMinutes ?? workspace?.attendanceSettings?.breakDurationMinutes ?? 0),
    shift: shiftAssignment.shift,
    shiftAssignmentRequired: !shiftAssignment.shift,
    shiftMessage: shiftAssignment.shift ? "" : "Your attendance shift is not assigned. Contact your HR manager to add your shift data.",
    timezone: normalizeTimeZone(workspace?.preferences?.timezone),
    cycleType: quota?.cycleType || "calendar_year",
    carryForward: Boolean(quota?.carryForward),
    carryForwardLimit: quota?.carryForwardLimit ?? null,
    leaveTypes: leaveTypes.map(formatLeaveType),
    balances,
  };
}
interface FormattedLeaveRequest {
  recordId: string;
  id: string;
  leaveCode: string;
  employeeName: string;
  employeeId: string;
  requesterUserId: string | null;
  department: string;
  departments: string[];
  requesterRole: string;
  leaveType: string;
  leaveMode: string;
  halfDaySession: string;
  leaveHours: number;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
  requesterBalance: number;
  medicalCertAttached: boolean;
  medicalCertName: string;
  medicalCertUrl: string;
  medicalCertPublicId: string;
  medicalCertMimeType: string;
  actionedBy: string;
  actionedByUserId: string | null;
  actionedByDesignation: string;
  actionedByDepartment: string;
  actionedAt: Date | null;
  rejectionReason: string;
  isMe: boolean;
  isApprovalRecipient: boolean;
  canAction: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const formatLeaveRequest = (
  leaveRequest: any,
  departmentNameById: Map<string, string>,
  requesterUserId: string,
  isApprovalRecipient = false,
): FormattedLeaveRequest => {
  const departmentIds = Array.isArray(leaveRequest.departments)
    ? leaveRequest.departments.map((id: any) => toId(id)).filter(Boolean)
    : leaveRequest.department
      ? [toId(leaveRequest.department)]
      : [];
  const departmentNames = departmentIds
    .map((id: string) => departmentNameById.get(id) || "")
    .filter(Boolean);

  return {
    recordId: String(leaveRequest._id),
    id: leaveRequest.leaveCode,
    leaveCode: leaveRequest.leaveCode,
    employeeName: leaveRequest.employeeName,
    employeeId: leaveRequest.employeeId || "",
    requesterUserId: leaveRequest.requesterUserId ? String(leaveRequest.requesterUserId) : null,
    department: departmentNames[0] || "All Departments",
    departments: departmentNames,
    requesterRole: leaveRequest.requesterRole || "employee",
    leaveType: leaveRequest.leaveType,
    leaveMode: leaveRequest.leaveMode || "full_day",
    halfDaySession: leaveRequest.halfDaySession || "",
    leaveHours: Number(leaveRequest.leaveHours || 0),
    startDate: formatDateOnly(leaveRequest.startDate),
    endDate: formatDateOnly(leaveRequest.endDate),
    days: Number(leaveRequest.days || 0),
    status: leaveRequest.status,
    reason: leaveRequest.reason,
    requesterBalance: Number(leaveRequest.requesterBalance || 0),
    medicalCertAttached: Boolean(leaveRequest.medicalCertAttached),
    medicalCertName: leaveRequest.medicalCertName || "",
    medicalCertUrl: leaveRequest.medicalCertUrl || "",
    medicalCertPublicId: leaveRequest.medicalCertPublicId || "",
    medicalCertMimeType: leaveRequest.medicalCertMimeType || "",
    actionedBy: leaveRequest.actionedByName || "",
    actionedByUserId: leaveRequest.actionedByUserId ? String(leaveRequest.actionedByUserId) : null,
    actionedByDesignation: leaveRequest.actionedByDesignation || "",
    actionedByDepartment: leaveRequest.actionedByDepartment || "",
    actionedAt: leaveRequest.actionedAt || null,
    rejectionReason: leaveRequest.rejectionReason || "",
    isMe: Boolean(leaveRequest.requesterUserId) && String(leaveRequest.requesterUserId) === String(requesterUserId),
    isApprovalRecipient,
    canAction: leaveRequest.status === "pending" && isApprovalRecipient,
    createdAt: leaveRequest.createdAt,
    updatedAt: leaveRequest.updatedAt,
  };
};

const loadWorkspaceDepartmentMap = async (workspaceId: any): Promise<Map<string, string>> => {
  const departments = await Department.find({ workspaceId, isActive: true })
    .select("_id name")
    .lean()
    .exec();
  return new Map(departments.map((department: any) => [String(department._id), department.name]));
};

const getApproversForRequester = async (
  workspaceId: any,
  requesterRoleKey: string,
  requesterDepartmentIds: string[],
  requesterDepartmentName: string,
  requesterUserId?: string,
): Promise<string[]> => {
  const members = await WorkspaceMember.find({ workspace: workspaceId, isActive: true })
    .populate("role")
    .populate("departments")
    .lean()
    .exec();

  const recipients = new Set<string>();
  const addMembers = (predicate: (member: any) => boolean) => {
    members.forEach((member: any) => {
      const memberUserId = toId(member.user);
      if (memberUserId && memberUserId !== requesterUserId && predicate(member)) {
        recipients.add(memberUserId);
      }
    });
  };

  const addHrManagers = () => {
    addMembers((member: any) => isHrManagerMembership(member));
  };

  const addSuperAdmins = () => {
    addMembers((member: any) => normalizeRoleKey(member.role) === "super_admin");
  };

  const addDepartmentManagers = async () => {
    addMembers((member: any) => {
      const roleKey = normalizeRoleKey(member.role);
      return (
        (roleKey === "manager" || roleKey === "admin_manager") &&
        inSameDepartment(member, requesterDepartmentIds, requesterDepartmentName)
      );
    });

    if (requesterDepartmentIds.length === 1) {
      const department = await Department.findById(requesterDepartmentIds[0])
        .select("managerUser")
        .lean()
        .exec();
      const managerUserId = toId(department?.managerUser);
      if (managerUserId && managerUserId !== requesterUserId) recipients.add(managerUserId);
    }
  };

  const addAssignedAdmins = () => {
    addMembers((member: any) => {
      const roleKey = normalizeRoleKey(member.role);
      return (
        (roleKey === "admin" || roleKey === "admin_manager") &&
        inSameDepartment(member, requesterDepartmentIds, requesterDepartmentName)
      );
    });
  };

  const workspace = await Workspace.findById(workspaceId).select("owner").lean().exec();

  // HR is a common approval authority for every request. The role hierarchy is
  // added separately, so either authority may make the single final decision.
  addHrManagers();
  const hrRecipientCount = recipients.size;

  if (requesterRoleKey === "founder") {
    // A founder request is routed to HR; a requester can never approve their own request.
  } else if (requesterRoleKey === "super_admin") {
    const founderUserId = toId(workspace?.owner);
    if (founderUserId && founderUserId !== requesterUserId) recipients.add(founderUserId);
  } else if (requesterRoleKey === "admin" || requesterRoleKey === "admin_manager") {
    addSuperAdmins();
  } else if (requesterRoleKey === "manager") {
    addAssignedAdmins();
    if (recipients.size === hrRecipientCount) addSuperAdmins();
  } else {
    // Employee requests go to their department manager as well as HR.
    await addDepartmentManagers();
  }

  return [...recipients];
};
const notifyApprovers = async (
  workspaceId: any,
  actorUserId: string,
  leaveRequest: any,
  approverUserIds: string[],
) => {
  const members = await WorkspaceMember.find({
    workspace: workspaceId,
    isActive: true,
    user: { $in: approverUserIds },
  })
    .select("user role departments")
    .populate("role")
    .populate("departments")
    .lean()
    .exec();
  const memberByUserId = new Map(members.map((member: any) => [toId(member.user), member]));

  await notifyMultipleRecipients(
    approverUserIds,
    {
      workspaceId,
      actorUserId,
      type: "leave_requested",
      category: "leave",
      title: `Leave request submitted: ${leaveRequest.leaveCode}`,
      description: `${leaveRequest.employeeName} submitted a ${leaveRequest.leaveType} leave request.`,
      entityType: "leave",
      entityId: String(leaveRequest._id),
      entityCode: leaveRequest.leaveCode,
      targetUrl: "/leave-requests",
      priority: "high",
      isActionRequired: true,
      data: {
        leaveType: leaveRequest.leaveType,
        leaveMode: leaveRequest.leaveMode,
        halfDaySession: leaveRequest.halfDaySession || "",
        leaveHours: leaveRequest.leaveHours || 0,
        startDate: formatDateOnly(leaveRequest.startDate),
        endDate: formatDateOnly(leaveRequest.endDate),
        days: leaveRequest.days,
        reason: leaveRequest.reason,
      },
    },
  );
};

interface CreateLeaveInput {
  leaveTypeId?: string;
  leaveType?: string;
  leaveMode?: string;
  halfDaySession?: string;
  leaveHours?: number;
  startDate?: string;
  endDate?: string;
  days?: number;
  reason?: string;
  medicalCertAttached?: boolean;
  medicalCertName?: string;
  medicalCertUrl?: string;
  medicalCertPublicId?: string;
  medicalCertMimeType?: string;
}

const normalizeLeaveModeInput = (value: any): LeaveMode => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized.includes("half") || normalized === "half_day") return "half_day";
  if (normalized.includes("hour") || normalized === "partial_day" || normalized === "hours") return "hours";
  return "full_day";
};

const normalizeHalfDaySessionInput = (value: any): "" | "morning" | "evening" => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("morning")) return "morning";
  if (normalized.includes("evening")) return "evening";
  return "";
};

export async function createLeaveRequestForUser(userId: string, input: CreateLeaveInput, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, membership, actor } = context;

  const shiftAssignment = await resolveUserAttendanceShift(workspace, actor.userId);
  if (!shiftAssignment.shift) {
    throw httpError("Your attendance shift is not assigned. Contact your HR manager to add your shift data before requesting leave.", 409);
  }
  const dailyWorkingHours = getDailyWorkingHours(workspace, shiftAssignment.shift);
  const requestedLeaveTypeId = String(input?.leaveTypeId || "").trim();
  const requestedLeaveTypeName = String(input?.leaveType || "").trim();
  const leaveTypeRecord = await LeaveType.findOne({
    workspaceId: workspace._id,
    isActive: true,
    ...(mongoose.isValidObjectId(requestedLeaveTypeId)
      ? { _id: requestedLeaveTypeId }
      : { $or: [{ name: requestedLeaveTypeName }, { code: toLeaveTypeCode(requestedLeaveTypeName) }] }),
  })
    .lean()
    .exec();
  if (!leaveTypeRecord) {
    throw httpError("Choose an active leave type configured by HR.", 400);
  }
  const leaveType = leaveTypeRecord.name;

  const leaveMode = normalizeLeaveModeInput(input?.leaveMode);
  const halfDaySession = normalizeHalfDaySessionInput(input?.halfDaySession);
  const startDate = new Date(String(input?.startDate || ""));
  const endDate = new Date(String(input?.endDate || ""));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw httpError("Invalid leave date format.", 400);
  }
  if (endDate < startDate) {
    throw httpError("End date must be on or after start date.", 400);
  }
  const workspaceTimezone = normalizeTimeZone(workspace?.preferences?.timezone);
  const workspaceTodayKey = getZonedDateKey(new Date(), workspaceTimezone);
  if (formatDateOnly(startDate) < workspaceTodayKey) {
    throw httpError("Leave cannot be requested for a past date in this unit.", 400);
  }

  const startDateKey = formatDateOnly(startDate);
  const endDateKey = formatDateOnly(endDate);
  const holidayRows = await Holiday.find({
    workspaceId: workspace._id,
    dateKey: { $gte: startDateKey, $lte: endDateKey },
    isActive: true,
    $or: [{ entryKind: "holiday" }, { entryKind: { $exists: false } }],
  })
    .select("dateKey date")
    .lean()
    .exec();
  const holidayDateKeys = new Set(
    holidayRows.map((holiday: any) => String(holiday.dateKey || formatDateOnly(holiday.date))).filter(Boolean),
  );
  const selectedDateIsNonWorking = startDate.getUTCDay() === 0 || holidayDateKeys.has(startDateKey);

  let leaveHours = Math.max(0, Number(input?.leaveHours) || 0);
  let days = 0;

  if (leaveMode === "half_day") {
    if (!isSameCalendarDay(startDate, endDate)) {
      throw httpError("Half-day leave must use the same start and end date.", 400);
    }
    if (!halfDaySession) {
      throw httpError("Half-day leave requires a morning or evening session.", 400);
    }
    if (selectedDateIsNonWorking) {
      throw httpError("Leave cannot be requested on a Sunday or company holiday.", 400);
    }
    days = 0.5;
    leaveHours = roundDays(dailyWorkingHours / 2);
  } else if (leaveMode === "hours") {
    if (!isSameCalendarDay(startDate, endDate)) {
      throw httpError("Hour-based leave must use the same start and end date.", 400);
    }
    if (selectedDateIsNonWorking) {
      throw httpError("Leave cannot be requested on a Sunday or company holiday.", 400);
    }
    if (leaveHours <= 0) {
      leaveHours = Math.max(0, Number(input?.days) || 0) * dailyWorkingHours;
    }
    if (leaveHours <= 0 || leaveHours > 24) {
      throw httpError("Partial leave requires hours between 0 and 24.", 400);
    }
    days = roundDays(Math.min(1, leaveHours / PARTIAL_LEAVE_DAY_HOURS));
    if (days <= 0) throw httpError("Leave duration must be greater than 0.", 400);
  } else {
    days = countWorkingLeaveDays(startDate, endDate, holidayDateKeys);
    if (days <= 0) {
      throw httpError("The selected range contains no working days. Sundays and company holidays are excluded.", 400);
    }
    leaveHours = roundDays(days * dailyWorkingHours);
  }

  const reason = String(input?.reason || "").trim();
  if (!reason || reason.length < 3) {
    throw httpError("Please provide a reason for the leave (at least 3 characters).", 400);
  }

  const quotaYear = await resolveQuotaYearForDate(workspace._id, actor.userId, startDate);
  const balanceData = await getLeaveBalancesForUser(userId, workspaceId, quotaYear);
  const selectedBalance = balanceData.balances[String(leaveTypeRecord._id)];
  if (!selectedBalance) throw httpError("No leave quota is configured for this leave type.", 400);
  if (leaveTypeRecord.requiresBalance !== false && days > selectedBalance.remaining + 1e-9) {
    throw httpError(
      `Insufficient ${leaveType.toLowerCase()} leave balance. Remaining: ${selectedBalance.remaining} day(s).`,
      400,
    );
  }

  const overlappingApproved = await LeaveRequest.find({
    workspaceId: workspace._id,
    requesterUserId: actor.userId,
    status: "approved",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  })
    .select("leaveCode startDate endDate leaveMode leaveHours halfDaySession")
    .lean()
    .exec();

  const conflicting = (overlappingApproved || []).find((existing: any) => {
    const existingMode = normalizeLeaveModeInput(existing.leaveMode);
    if (leaveMode === "full_day" || existingMode === "full_day") return true;
    if (!isSameCalendarDay(new Date(existing.startDate), startDate)) return true;
    if (existingMode === "hours" && leaveMode === "hours") return true;
    if (existingMode === "half_day" && leaveMode === "half_day") {
      return normalizeHalfDaySessionInput(existing.halfDaySession) === halfDaySession;
    }
    return true;
  });

  if (conflicting) {
    throw httpError(
      `You already have an approved leave (${conflicting.leaveCode}) on one or more of the selected dates.`,
      409,
    );
  }

  const leaveNumber = await getNextLeaveNumber(workspace._id);
  const leaveCode = buildLeaveCode(leaveNumber);
  const employeeId = await resolveEmployeeId(workspace._id, actor.userId);
  const memberDepartmentIds = getDepartmentIds(membership.departments || []);
  const memberDepartmentNames = getDepartmentNames(membership.departments || []);
  const departmentIds = memberDepartmentIds.length > 0 ? memberDepartmentIds : [null];
  const requesterDepartmentName = memberDepartmentNames[0] || "";

  const approverUserIds = await getApproversForRequester(
    workspace._id,
    actor.roleKey,
    departmentIds.filter((id): id is string => Boolean(id)),
    requesterDepartmentName,
    actor.userId,
  );
  if (approverUserIds.length === 0) {
    const message = actor.roleKey === "employee"
      ? "No department manager is configured for your leave request. Ask an admin to assign your department manager first."
      : "No leave approver is configured for your role in this workspace.";
    throw httpError(message, 409);
  }
  const leaveRequest = await LeaveRequest.create({
    workspaceId: workspace._id,
    ownerId: workspace.owner || null,
    leaveNumber,
    leaveCode,
    employeeName: actor.displayName,
    employeeId,
    requesterUserId: actor.userId,
    department: memberDepartmentIds[0] || null,
    departments: memberDepartmentIds,
    requesterRole: actor.roleKey,
    leaveType,
    leaveTypeId: leaveTypeRecord._id,
    leaveMode,
    halfDaySession,
    leaveHours,
    quotaYear,
    startDate,
    endDate,
    days,
    status: "pending",
    reason,
    requesterBalance: leaveTypeRecord.requiresBalance === false ? 0 : selectedBalance.remaining,
    medicalCertAttached: Boolean(input?.medicalCertAttached),
    medicalCertName: String(input?.medicalCertName || ""),
    medicalCertUrl: String(input?.medicalCertUrl || ""),
    medicalCertPublicId: String(input?.medicalCertPublicId || ""),
    medicalCertMimeType: String(input?.medicalCertMimeType || ""),
    actionedByUserId: null,
    actionedByName: "",
    rejectionReason: "",
  });

  await notifyApprovers(workspace._id, actor.userId, leaveRequest, approverUserIds);

  if (String(input?.medicalCertUrl || "")) {
    await storeMedicalCertificateInEmployeeVault(
      workspace._id,
      actor.userId,
      {
        name: String(input?.medicalCertName || "Medical Certificate"),
        url: String(input?.medicalCertUrl || ""),
        publicId: String(input?.medicalCertPublicId || ""),
      },
      undefined,
    );
  }

  const departmentNameById = await loadWorkspaceDepartmentMap(workspace._id);
  return { leaveRequest: formatLeaveRequest(leaveRequest, departmentNameById, actor.userId) };
}

const isSameCalendarDay = (left: Date, right: Date): boolean =>
  formatDateOnly(left) === formatDateOnly(right);

interface ListQuery {
  status?: string;
  leaveType?: string;
  month?: string;
  year?: string;
}

export async function listLeaveRequestsForUser(userId: string, query: ListQuery = {}, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;

  const filter: Record<string, any> = { workspaceId: workspace._id };
  const status = String(query?.status || "").trim().toLowerCase();
  if (["pending", "approved", "rejected"].includes(status)) filter.status = status;
  const leaveType = String(query?.leaveType || "").trim();
  if (leaveType) filter.leaveType = leaveType;
  if (query?.year && /^\d{4}$/.test(String(query.year).trim())) {
    filter.quotaYear = Number(String(query.year).trim());
  } else if (query?.month && /^\d{4}-\d{2}$/.test(String(query.month).trim())) {
    const monthKey = String(query.month).trim();
    const start = new Date(`${monthKey}-01T00:00:00.000Z`);
    const end = new Date(`${monthKey}-31T23:59:59.999Z`);
    filter.startDate = { $gte: start, $lte: end };
  }

  const all = await LeaveRequest.find(filter).sort({ createdAt: -1 }).lean().exec();
  const departmentNameById = await loadWorkspaceDepartmentMap(workspace._id);

  const requesterDepartmentIds = new Set<string>();
  const requesterByUserId = new Map<string, any>();
  all.forEach((request: any) => {
    if (request.requesterUserId) {
      requesterByUserId.set(String(request.requesterUserId), request);
      (request.departments || []).forEach((id: any) => requesterDepartmentIds.add(toId(id)));
    }
  });

  const memberQuery = await WorkspaceMember.find({
    workspace: workspace._id,
    isActive: true,
    user: { $in: [...requesterByUserId.keys()] },
  })
    .populate("role")
    .populate("departments")
    .lean()
    .exec();
  const memberByUserId = new Map(memberQuery.map((member: any) => [toId(member.user), member]));

  let filtered = all;
  if (canViewAllLeaveRequests(actor)) {
    filtered = all;
  } else if (canViewDepartmentLeaveRequests(actor)) {
    const actorDepartmentIds = getDepartmentIds(actor.departments || []);
    const actorDepartmentNames = getDepartmentNames(actor.departments || []);
    filtered = all.filter((request: any) => {
      if (request.requesterUserId && String(request.requesterUserId) === actor.userId) return true;
      const requestDeptIds = (request.departments || []).map((id: any) => toId(id)).filter(Boolean);
      const requestDeptNames = requestDeptIds
        .map((id: string) => departmentNameById.get(id) || "")
        .filter(Boolean);
      const sameDepartment = requestDeptIds.some((id: string) => actorDepartmentIds.includes(id)) ||
        requestDeptNames.some((name: string) =>
          actorDepartmentNames.some((actorName: string) =>
            normalizeDepartmentKey(actorName) === normalizeDepartmentKey(name),
          ),
        );
      const requestRoleKey = normalizeRoleKey(request.requesterRole || "employee");
      if (actor.roleKey === "manager" || actor.roleKey === "admin_manager") {
        return sameDepartment && requestRoleKey === "employee";
      }
      return sameDepartment;
    });
  } else {
    filtered = all.filter(
      (request: any) => request.requesterUserId && String(request.requesterUserId) === actor.userId,
    );
  }

  const leaveBalances = await getLeaveBalancesForUser(userId, workspaceId);

  const approverCache = new Map<string, Promise<string[]>>();
  const formattedRequests = await Promise.all(
    filtered.map(async (request: any) => {
      const requestDepartmentIds = (request.departments || [])
        .map((id: any) => toId(id))
        .filter(Boolean);
      const requestDepartmentName = requestDepartmentIds
        .map((id: string) => departmentNameById.get(id) || "")
        .find(Boolean) || "";
      const requesterRoleKey = normalizeRoleKey(request.requesterRole || "employee");
      const requesterId = toId(request.requesterUserId);
      const cacheKey = [
        requesterRoleKey,
        [...requestDepartmentIds].sort().join(","),
        normalizeDepartmentKey(requestDepartmentName),
        requesterId,
      ].join("|");

      if (!approverCache.has(cacheKey)) {
        approverCache.set(
          cacheKey,
          getApproversForRequester(
            workspace._id,
            requesterRoleKey,
            requestDepartmentIds,
            requestDepartmentName,
            requesterId,
          ),
        );
      }
      const approverUserIds = await approverCache.get(cacheKey)!;
      return formatLeaveRequest(
        request,
        departmentNameById,
        actor.userId,
        approverUserIds.includes(actor.userId),
      );
    }),
  );

  return {
    leaveRequests: formattedRequests,
    leaveBalances,
    accessLevel: canViewAllLeaveRequests(actor)
      ? "all"
      : canViewDepartmentLeaveRequests(actor)
        ? "department"
        : "personal",
  };
}

export async function updateLeaveRequestForUser(userId: string, leaveRequestId: string, input: any, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;

  if (!leaveRequestId || !mongoose.isValidObjectId(leaveRequestId)) {
    throw httpError("Invalid leave request id.", 400);
  }

  const leaveRequest = await LeaveRequest.findOne({ _id: leaveRequestId, workspaceId: workspace._id }).lean().exec();
  if (!leaveRequest) throw httpError("Leave request not found.", 404);

  const status = String(input?.status || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(status)) {
    throw httpError("Status must be approved or rejected.", 400);
  }
  const rejectionReason = String(input?.rejectionReason || "").trim();
  if (status === "rejected" && !rejectionReason) {
    throw httpError("Rejection reason is required when rejecting a leave request.", 400);
  }

  if (leaveRequest.requesterUserId && String(leaveRequest.requesterUserId) === actor.userId) {
    throw httpError("You cannot approve or reject your own leave request.", 403);
  }

  if (leaveRequest.status !== "pending") {
    const actionedBy = leaveRequest.actionedByName ? ` by ${leaveRequest.actionedByName}` : "";
    throw httpError(`This leave request was already ${leaveRequest.status}${actionedBy}.`, 409);
  }

  const requesterRoleKey = normalizeRoleKey(leaveRequest.requesterRole || "employee");
  const requesterDepartmentIds = (leaveRequest.departments || []).map((id: any) => toId(id)).filter(Boolean);
  const departmentNameById = await loadWorkspaceDepartmentMap(workspace._id);
  const requesterDepartmentName = requesterDepartmentIds
    .map((id: string) => departmentNameById.get(id) || "")
    .filter(Boolean)[0] || "";

  const approverUserIds = await getApproversForRequester(
    workspace._id,
    requesterRoleKey,
    requesterDepartmentIds,
    requesterDepartmentName,
    toId(leaveRequest.requesterUserId),
  );
  if (!approverUserIds.includes(actor.userId)) {
    throw httpError("This leave request is assigned to another approver.", 403);
  }

  const approverProfile: any = await EmployeeProfile.findOne({
    workspaceId: workspace._id,
    $or: [{ linkedUserId: actor.userId }, { linkedWorkspaceMemberId: actor.userId }],
  })
    .select("jobTitle departments")
    .populate("departments", "name")
    .lean()
    .exec();
  const actionedByDesignation = String(approverProfile?.jobTitle || actor.designation || "").trim();
  const actionedByDepartment = String(
    getDepartmentNames(approverProfile?.departments || [])[0] || actor.departmentName || "",
  ).trim();
  const actionedAt = new Date();

  // Conditional update makes the first decision final even if HR and the
  // hierarchy approver act at the same instant.
  const actionedLeaveRequest = await LeaveRequest.findOneAndUpdate(
    { _id: leaveRequestId, workspaceId: workspace._id, status: "pending" },
    {
      $set: {
        status,
        actionedByUserId: actor.userId,
        actionedByName: actor.displayName,
        actionedByDesignation,
        actionedByDepartment,
        actionedAt,
        rejectionReason: status === "rejected" ? rejectionReason : "",
        balanceDeducted: status === "approved",
      },
    },
    { new: true, runValidators: true },
  ).exec();

  if (!actionedLeaveRequest) {
    const latest = await LeaveRequest.findOne({ _id: leaveRequestId, workspaceId: workspace._id }).lean().exec();
    const actionedBy = latest?.actionedByName ? ` by ${latest.actionedByName}` : "";
    throw httpError(`This leave request was already ${latest?.status || "processed"}${actionedBy}.`, 409);
  }

  await createNotification({
    workspaceId: workspace._id,
    recipientUserId: (actionedLeaveRequest.requesterUserId || null) as any,
    actorUserId: actor.userId,
    type: status === "approved" ? "leave_approved" : "leave_rejected",
    category: "leave",
    title: `Leave request ${status}: ${actionedLeaveRequest.leaveCode}`,
    description:
      status === "approved"
        ? `${actor.displayName} approved your leave request.`
        : `${actor.displayName} rejected your leave request.`,
    entityType: "leave",
    entityId: String(actionedLeaveRequest._id),
    entityCode: actionedLeaveRequest.leaveCode,
    targetUrl: "/leave-requests",
    priority: status === "approved" ? "high" : "normal",
    data: {
      leaveType: actionedLeaveRequest.leaveType,
      leaveMode: actionedLeaveRequest.leaveMode,
      startDate: formatDateOnly(actionedLeaveRequest.startDate),
      endDate: formatDateOnly(actionedLeaveRequest.endDate),
      days: actionedLeaveRequest.days,
      rejectionReason: actionedLeaveRequest.rejectionReason || "",
      status: actionedLeaveRequest.status,
      actionedBy: actor.displayName,
      actionedByDesignation,
      actionedByDepartment,
      actionedAt,
    },
  });

  return { leaveRequest: formatLeaveRequest(actionedLeaveRequest, departmentNameById, actor.userId) };
}
export async function findApprovedLeaveOnDate(workspaceId: any, userId: any, dateKey: string): Promise<any> {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(`${dateKey}T23:59:59.999Z`);
  return LeaveRequest.findOne({
    workspaceId,
    requesterUserId: userId,
    status: "approved",
    startDate: { $lte: end },
    endDate: { $gte: start },
  })
    .select("leaveCode leaveType leaveMode leaveHours halfDaySession startDate endDate")
    .lean()
    .exec();
}

const canManageLeaveSettings = (actor: ActorContext): boolean =>
  isFounder(actor) || isSuperAdmin(actor) || isHrManagerMembership(actor.membership);

export const COMMON_LEAVE_TYPE_SUGGESTIONS = [
  "Casual Leave",
  "Sick Leave",
  "Annual Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Bereavement Leave",
  "Compensatory Off",
  "Unpaid Leave",
  "Work From Home",
];

export async function listLeaveTypesForWorkspace(userId: string, query: any = {}, workspaceId?: string) {
  const { workspace, actor } = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const includeInactive = String(query?.includeInactive || "").toLowerCase() === "true" && canManageLeaveSettings(actor);
  const leaveTypes = await getWorkspaceLeaveTypes(workspace._id, includeInactive);
  return {
    leaveTypes: leaveTypes.map(formatLeaveType),
    suggestions: COMMON_LEAVE_TYPE_SUGGESTIONS,
    canManage: canManageLeaveSettings(actor),
  };
}

interface LeaveTypeInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  requiresBalance?: boolean;
  medicalCertificateAfterDays?: number | null;
  color?: string;
  sortOrder?: number;
}

export async function createLeaveTypeForWorkspace(userId: string, input: LeaveTypeInput, workspaceId?: string) {
  const { workspace, actor } = await resolveLeaveWorkspaceContext(userId, workspaceId);
  if (!canManageLeaveSettings(actor)) {
    throw httpError("Only HR managers, founders and super admins can configure leave types.", 403);
  }
  const name = String(input?.name || "").trim();
  const code = toLeaveTypeCode(name);
  if (name.length < 2 || !code) throw httpError("Leave type name is required.", 400);
  const existing = await LeaveType.findOne({ workspaceId: workspace._id, code }).lean().exec();
  if (existing) throw httpError("This leave type already exists. Enable or edit the existing type instead.", 409);
  const leaveType = await LeaveType.create({
    workspaceId: workspace._id,
    name,
    code,
    description: String(input?.description || "").trim(),
    isActive: input?.isActive !== false,
    requiresBalance: input?.requiresBalance !== false,
    medicalCertificateAfterDays: input?.medicalCertificateAfterDays == null
      ? null
      : Math.max(0.5, Number(input.medicalCertificateAfterDays)),
    color: String(input?.color || "#2563EB"),
    sortOrder: Number(input?.sortOrder || 0),
    createdBy: actor.userId,
    updatedBy: actor.userId,
  });
  return { leaveType: formatLeaveType(leaveType) };
}

export async function updateLeaveTypeForWorkspace(
  userId: string,
  leaveTypeId: string,
  input: LeaveTypeInput,
  workspaceId?: string,
) {
  const { workspace, actor } = await resolveLeaveWorkspaceContext(userId, workspaceId);
  if (!canManageLeaveSettings(actor)) {
    throw httpError("Only HR managers, founders and super admins can configure leave types.", 403);
  }
  if (!mongoose.isValidObjectId(leaveTypeId)) throw httpError("Invalid leave type id.", 400);
  const leaveType = await LeaveType.findOne({ _id: leaveTypeId, workspaceId: workspace._id }).exec();
  if (!leaveType) throw httpError("Leave type not found.", 404);
  if (input?.name !== undefined) {
    const name = String(input.name).trim();
    const code = toLeaveTypeCode(name);
    if (name.length < 2 || !code) throw httpError("Leave type name is required.", 400);
    const duplicate = await LeaveType.findOne({ workspaceId: workspace._id, code, _id: { $ne: leaveType._id } }).lean().exec();
    if (duplicate) throw httpError("Another leave type already uses this name.", 409);
    leaveType.name = name;
    leaveType.code = code;
  }
  if (input?.description !== undefined) leaveType.description = String(input.description).trim();
  if (input?.isActive !== undefined) leaveType.isActive = Boolean(input.isActive);
  if (input?.requiresBalance !== undefined) leaveType.requiresBalance = Boolean(input.requiresBalance);
  if (input?.medicalCertificateAfterDays !== undefined) {
    leaveType.medicalCertificateAfterDays = input.medicalCertificateAfterDays == null
      ? null
      : Math.max(0.5, Number(input.medicalCertificateAfterDays));
  }
  if (input?.color !== undefined) leaveType.color = String(input.color || "#2563EB");
  if (input?.sortOrder !== undefined) leaveType.sortOrder = Number(input.sortOrder || 0);
  leaveType.updatedBy = actor.userId as any;
  await leaveType.save();
  return { leaveType: formatLeaveType(leaveType) };
}

export async function listLeaveQuotasForWorkspace(userId: string, query: any = {}, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;
  const year = Number(query?.year) || new Date().getFullYear();
  const leaveTypes = await getWorkspaceLeaveTypes(workspace._id);

  const members = await WorkspaceMember.find({ workspace: workspace._id, isActive: true })
    .populate("role")
    .populate("departments")
    .populate("user", "name email")
    .lean()
    .exec();
  const memberUserIds = members.map((member: any) => toId(member.user)).filter(Boolean);
  const quotas: any[] = memberUserIds.length
    ? await LeaveQuota.find({ workspaceId: workspace._id, userId: { $in: memberUserIds }, year }).lean().exec()
    : [];
  const quotaByUserId = new Map(quotas.map((quota: any) => [String(quota.userId), quota]));
  const rows = [];

  for (const member of members) {
    const memberUserId = toId(member.user);
    if (!memberUserId) continue;
    let storedQuota: any = quotaByUserId.get(memberUserId);
    if (!storedQuota) storedQuota = await ensureQuotaForYear(workspace._id, memberUserId, year, leaveTypes);
    const assignedTypes = getAssignedLeaveTypes(storedQuota, leaveTypes);
    const storedBalances = mapToObject(storedQuota?.balances);
    const used = await getApprovedDaysForUser(workspace._id, memberUserId, year, leaveTypes);
    const total: Record<string, number> = {};
    const remaining: Record<string, number> = {};
    assignedTypes.forEach((type: any) => {
      const id = String(type._id);
      total[id] = Math.max(0, Number(storedBalances[type.code] ?? storedQuota?.[type.name] ?? 0));
      remaining[id] = type.requiresBalance === false
        ? -1
        : Math.max(0, roundDays(total[id] - Number(used[id] || 0)));
    });

    const memberRole = normalizeRoleKey(member.role);
    rows.push({
      userId: memberUserId,
      name: (member as any).user?.name || (member as any).user?.email || "Unnamed",
      email: (member as any).user?.email || "",
      employeeId: await resolveEmployeeId(workspace._id, memberUserId),
      role: memberRole,
      departments: memberRole === "founder" || memberRole === "super_admin"
        ? ["All Departments"]
        : getDepartmentNames(member.departments || []),
      year,
      quotaConfigured: Boolean(storedQuota),
      assignedLeaveTypeIds: assignedTypes.map((type: any) => String(type._id)),
      assignedLeaveTypes: assignedTypes.map(formatLeaveType),
      cycleType: storedQuota?.cycleType || "calendar_year",
      carryForward: Boolean(storedQuota?.carryForward),
      carryForwardLimit: storedQuota?.carryForwardLimit ?? null,
      total,
      used,
      remaining,
    });
  }

  return {
    quotas: rows,
    leaveTypes: leaveTypes.map(formatLeaveType),
    suggestions: COMMON_LEAVE_TYPE_SUGGESTIONS,
    year,
    canManage: canManageLeaveSettings(actor),
  };
}

export async function updateLeaveQuotaForUser(
  userId: string,
  targetUserId: string,
  input: any = {},
  workspaceId?: string,
) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;
  if (!canManageLeaveSettings(actor)) {
    throw httpError("Only HR managers, founders and super admins can configure leave quotas.", 403);
  }
  if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) throw httpError("Invalid user id.", 400);
  const membership = await resolveMembershipByWorkspace(workspace._id, targetUserId, "role");
  if (!membership) throw httpError("The requested user is not part of this workspace.", 404);

  const year = Number(input?.year) || new Date().getFullYear();
  const leaveTypes = await getWorkspaceLeaveTypes(workspace._id);
  if (leaveTypes.length === 0) throw httpError("Add at least one leave type before assigning quotas.", 409);
  const typeById = new Map(leaveTypes.map((type: any) => [String(type._id), type]));
  const existing: any = await LeaveQuota.findOne({ workspaceId: workspace._id, userId: targetUserId, year }).lean().exec();

  const assignmentWasProvided = Array.isArray(input?.assignedLeaveTypeIds);
  const requestedAssignments = assignmentWasProvided
    ? [...new Set(input.assignedLeaveTypeIds.map((id: any) => String(id)).filter((id: string) => typeById.has(id)))]
    : (quotaHasAssignmentConfig(existing)
      ? (existing.assignedLeaveTypeIds || []).map((id: any) => toId(id)).filter((id: string) => typeById.has(id))
      : []);
  if (assignmentWasProvided && requestedAssignments.length !== input.assignedLeaveTypeIds.length) {
    throw httpError("One or more selected leave types are invalid or disabled.", 400);
  }

  const existingBalances = mapToObject(existing?.balances);
  const existingAnnualBalances = Object.keys(mapToObject(existing?.annualBalances)).length > 0
    ? mapToObject(existing?.annualBalances)
    : existingBalances;
  const incoming = input?.balances || input?.total;
  const balances: Record<string, number> = { ...existingBalances };
  const annualBalances: Record<string, number> = { ...existingAnnualBalances };
  if (incoming && typeof incoming === "object") {
    leaveTypes.forEach((type: any) => {
      const raw = incoming[String(type._id)] ?? incoming[type.code] ?? incoming[type.name];
      if (raw !== undefined) {
        balances[type.code] = Math.max(0, Number(raw) || 0);
        annualBalances[type.code] = Math.max(0, Number(raw) || 0);
      }
    });
  }

  const cycleType = input?.cycleType === "financial_year"
    ? "financial_year"
    : input?.cycleType === "calendar_year"
      ? "calendar_year"
      : existing?.cycleType || "calendar_year";
  const carryForward = input?.carryForward !== undefined ? Boolean(input.carryForward) : Boolean(existing?.carryForward);
  const carryForwardLimit = input?.carryForwardLimit === null || input?.carryForwardLimit === ""
    ? null
    : input?.carryForwardLimit !== undefined
      ? Math.max(0, Number(input.carryForwardLimit) || 0)
      : existing?.carryForwardLimit ?? null;

  const quota: any = await LeaveQuota.findOneAndUpdate(
    { workspaceId: workspace._id, userId: targetUserId, year },
    {
      $set: {
        assignedLeaveTypeIds: requestedAssignments,
        balances,
        annualBalances,
        cycleType,
        carryForward,
        carryForwardLimit,
        updatedBy: actor.userId,
      },
      $setOnInsert: { createdBy: actor.userId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  ).exec();
  const assignedTypes = requestedAssignments.map((id: string) => typeById.get(id)).filter(Boolean);
  const totalById = Object.fromEntries(assignedTypes.map((type: any) => [String(type._id), Number(balances[type.code] || 0)]));

  await createNotification({
    workspaceId: workspace._id,
    recipientUserId: targetUserId,
    actorUserId: actor.userId,
    type: "leave_quota_updated",
    category: "leave",
    title: "Your leave policy was updated",
    description: `${actor.displayName} updated your ${year} leave types and balances.`,
    entityType: "leave-quota",
    entityId: String(quota._id),
    targetUrl: "/leave-requests",
    data: { year, total: totalById, assignedLeaveTypeIds: requestedAssignments, cycleType, carryForward, carryForwardLimit },
  });

  return {
    quota: {
      userId: targetUserId,
      year,
      assignedLeaveTypeIds: requestedAssignments,
      assignedLeaveTypes: assignedTypes.map(formatLeaveType),
      cycleType,
      carryForward,
      carryForwardLimit,
      total: totalById,
      used: await getApprovedDaysForUser(workspace._id, targetUserId, year, leaveTypes),
    },
  };
}
export async function listHolidaysForWorkspace(userId: string, query: any = {}, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;

  const year = Number(query?.year) || new Date().getFullYear();
  const holidays = await Holiday.find({ workspaceId: workspace._id, year })
    .sort({ date: 1 })
    .lean()
    .exec();

  return {
    holidays: holidays.map((holiday: any) => ({
      id: String(holiday._id),
      name: holiday.name,
      description: holiday.description || "",
      time: holiday.time || "",
      location: holiday.location || "",
      date: formatDateOnly(holiday.date),
      year: holiday.year,
      type: holiday.type,
      entryKind: holiday.entryKind || "holiday",
      source: holiday.source || "manual",
      externalId: holiday.externalId || "",
      recurring: Boolean(holiday.recurring),
      isActive: Boolean(holiday.isActive),
      createdAt: holiday.createdAt,
    })),
    year,
    canManage: canManageLeaveSettings(actor),
  };
}

interface HolidayInput {
  name?: string;
  description?: string;
  time?: string;
  location?: string;
  date?: string;
  type?: string;
  recurring?: boolean;
  entryKind?: "holiday" | "event";
  source?: "manual" | "public_api";
  externalId?: string;
}

export async function createHolidayForWorkspace(userId: string, input: HolidayInput, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;

  if (!canManageLeaveSettings(actor)) {
    throw httpError("Only HR managers, founders and super admins can manage holidays.", 403);
  }

  const name = String(input?.name || "").trim();
  if (!name || name.length < 2) throw httpError("Holiday name is required.", 400);

  const date = new Date(String(input?.date || ""));
  if (Number.isNaN(date.getTime())) throw httpError("Invalid holiday date.", 400);

  const dateKey = formatDateOnly(date);
  const entryKind = input?.entryKind === "event" ? "event" : "holiday";
  const existing = await Holiday.findOne({ workspaceId: workspace._id, dateKey, entryKind, name, isActive: true }).lean().exec();
  if (existing) throw httpError(`This ${entryKind} already exists on this date.`, 409);

  const holiday = await Holiday.create({
    workspaceId: workspace._id,
    name,
    description: String(input?.description || "").trim(),
    time: entryKind === "event" ? String(input?.time || "").trim() : "",
    location: entryKind === "event" ? String(input?.location || "").trim() : "",
    date,
    dateKey,
    year: date.getUTCFullYear(),
    type: input?.type === "public" ? "public" : "company",
    entryKind,
    source: input?.source === "public_api" ? "public_api" : "manual",
    externalId: String(input?.externalId || "").trim(),
    recurring: Boolean(input?.recurring),
    isActive: true,
    createdBy: actor.userId,
  });

  return { holiday: formatHoliday(holiday) };
}

export async function updateHolidayForWorkspace(userId: string, holidayId: string, input: HolidayInput, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;

  if (!canManageLeaveSettings(actor)) {
    throw httpError("Only HR managers, founders and super admins can manage holidays.", 403);
  }
  if (!holidayId || !mongoose.isValidObjectId(holidayId)) throw httpError("Invalid holiday id.", 400);

  const holiday = await Holiday.findOne({ _id: holidayId, workspaceId: workspace._id }).exec();
  if (!holiday) throw httpError("Holiday not found.", 404);

  if (input?.name !== undefined) {
    const name = String(input.name).trim();
    if (!name || name.length < 2) throw httpError("Holiday name is required.", 400);
    holiday.name = name;
  }
  if (input?.description !== undefined) holiday.description = String(input.description).trim();
  if (input?.type !== undefined) {
    holiday.type = input.type === "public" ? "public" : "company";
  }
  if (input?.entryKind !== undefined) holiday.entryKind = input.entryKind === "event" ? "event" : "holiday";
  if (input?.time !== undefined) holiday.time = holiday.entryKind === "event" ? String(input.time || "").trim() : "";
  if (input?.location !== undefined) holiday.location = holiday.entryKind === "event" ? String(input.location || "").trim() : "";
  if (input?.source !== undefined) holiday.source = input.source === "public_api" ? "public_api" : "manual";
  if (input?.externalId !== undefined) holiday.externalId = String(input.externalId || "").trim();
  if (input?.recurring !== undefined) holiday.recurring = Boolean(input.recurring);

  if (input?.date !== undefined) {
    const date = new Date(String(input.date || ""));
    if (Number.isNaN(date.getTime())) throw httpError("Invalid holiday date.", 400);
    const dateKey = formatDateOnly(date);
    const conflicting = await Holiday.findOne({
      workspaceId: workspace._id,
      dateKey,
      entryKind: holiday.entryKind,
      name: holiday.name,
      isActive: true,
      _id: { $ne: holiday._id },
    })
      .lean()
      .exec();
    if (conflicting) throw httpError(`This ${holiday.entryKind} already exists on this date.`, 409);
    holiday.date = date;
    holiday.dateKey = dateKey;
    holiday.year = date.getUTCFullYear();
  }

  await holiday.save();
  return { holiday: formatHoliday(holiday) };
}

export async function deleteHolidayForWorkspace(userId: string, holidayId: string, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;

  if (!canManageLeaveSettings(actor)) {
    throw httpError("Only HR managers, founders and super admins can manage holidays.", 403);
  }
  if (!holidayId || !mongoose.isValidObjectId(holidayId)) throw httpError("Invalid holiday id.", 400);

  const result = await Holiday.findOneAndDelete({ _id: holidayId, workspaceId: workspace._id }).lean().exec();
  if (!result) throw httpError("Holiday not found.", 404);

  return { deleted: true, holidayId };
}

const formatHoliday = (holiday: any) => ({
  id: String(holiday._id),
  name: holiday.name,
  description: holiday.description || "",
  time: holiday.time || "",
  location: holiday.location || "",
  date: formatDateOnly(holiday.date),
  year: holiday.year,
  type: holiday.type,
  entryKind: holiday.entryKind || "holiday",
  source: holiday.source || "manual",
  externalId: holiday.externalId || "",
  recurring: Boolean(holiday.recurring),
  isActive: Boolean(holiday.isActive),
  createdAt: holiday.createdAt,
});

const storeMedicalCertificateInEmployeeVault = async (
  workspaceId: any,
  requesterUserId: any,
  certificate: { name: string; url: string; publicId: string; type?: string },
  previousPublicId?: string,
) => {
  try {
    const profile = await EmployeeProfile.findOne({
      workspaceId,
      $or: [{ linkedUserId: requesterUserId }, { linkedWorkspaceMemberId: requesterUserId }],
    }).exec();
    if (!profile) return;
    const existing = Array.isArray(profile.documents) ? profile.documents : [];
    const next = existing.filter(
      (doc: any) => !previousPublicId || String(doc.publicId || "") !== String(previousPublicId),
    );
    next.push({
      name: `Medical Certificate (${certificate.name || "attached file"})`,
      type: certificate.type || "medical-certificate",
      url: certificate.url,
      publicId: certificate.publicId,
      uploadedAt: new Date(),
    });
    profile.documents = next as any;
    await profile.save();
  } catch (error: any) {
    console.error("Failed to store medical certificate in employee document vault:", error?.message || error);
  }
};

export async function uploadLeaveCertificateForUser(userId: string, file: any) {
  await resolveLeaveWorkspaceContext(userId);
  if (!file?.buffer) throw httpError("No certificate file was uploaded.", 400);

  const route = `leave-certificates/${Date.now()}-${String(file.originalname || "certificate").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  let uploaded: any;
  try {
    uploaded = await uploadFileToS3(route, file);
  } catch (error: any) {
    throw httpError(error?.message || "Failed to upload certificate.", 502);
  }

  return {
    certificate: {
      name: file.originalname || "",
      mimeType: file.mimetype || "",
      url: uploaded?.url || "",
      publicId: uploaded?.id || route,
      size: file.size ? `${(file.size / 1024).toFixed(1)} KB` : "",
    },
  };
}

export async function attachLeaveCertificateForUser(
  userId: string,
  leaveRequestId: string,
  file: any,
  workspaceId?: string,
) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;

  if (!leaveRequestId || !mongoose.isValidObjectId(leaveRequestId)) {
    throw httpError("Invalid leave request id.", 400);
  }

  const leaveRequest = await LeaveRequest.findOne({ _id: leaveRequestId, workspaceId: workspace._id }).lean().exec();
  if (!leaveRequest) throw httpError("Leave request not found.", 404);

  const isRequester = Boolean(leaveRequest.requesterUserId && String(leaveRequest.requesterUserId) === actor.userId);
  if (!isRequester && !canViewAllLeaveRequests(actor)) {
    throw httpError("You are not allowed to attach a certificate to this leave request.", 403);
  }

  if (leaveRequest.status === "rejected") {
    throw httpError("This leave request was rejected, so a certificate cannot be attached.", 409);
  }

  if (!file?.buffer) throw httpError("No certificate file was uploaded.", 400);

  const route = `leave-certificates/${Date.now()}-${String(file.originalname || "certificate").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  let uploaded: any;
  try {
    uploaded = await uploadFileToS3(route, file);
  } catch (error: any) {
    throw httpError(error?.message || "Failed to upload certificate.", 502);
  }

  const updated = await LeaveRequest.findByIdAndUpdate(
    leaveRequestId,
    {
      $set: {
        medicalCertAttached: true,
        medicalCertName: file.originalname || "",
        medicalCertUrl: uploaded?.url || "",
        medicalCertPublicId: uploaded?.id || route,
        medicalCertMimeType: file.mimetype || "",
      },
    },
    { new: true, runValidators: true },
  )
    .lean()
    .exec();

  if (!updated) throw httpError("Leave request not found.", 404);

  await storeMedicalCertificateInEmployeeVault(
    workspace._id,
    leaveRequest.requesterUserId,
    {
      name: file.originalname || "Medical Certificate",
      url: uploaded?.url || "",
      publicId: uploaded?.id || route,
    },
    leaveRequest.medicalCertPublicId,
  );

  const departmentNameById = await loadWorkspaceDepartmentMap(workspace._id);
  return { leaveRequest: formatLeaveRequest(updated, departmentNameById, actor.userId) };
}
