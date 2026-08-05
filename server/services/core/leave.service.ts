import mongoose from "mongoose";
import LeaveRequest from "../../models/LeaveRequest.js";
import LeaveQuota from "../../models/LeaveQuota.js";
import Holiday from "../../models/Holiday.js";
import Workspace from "../../models/Workspace.js";
import WorkspaceMember from "../../models/WorkspaceMember.js";
import Department from "../../models/Department.js";
import EmployeeProfile from "../../models/EmployeeProfile.js";
import { getCurrentWorkspace } from "./hr.service.js";
import { resolveMembershipByWorkspace } from "../../utils/resolveMembership.js";
import { uploadFileToS3 } from "../../config/s3config.js";
import { createNotification, notifyMultipleRecipients } from "../../utils/notify.js";

export type LeaveTypeKey = "Casual" | "Sick" | "Vacation";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveMode = "full_day" | "half_day" | "hours";

const LEAVE_TYPE_KEYS: LeaveTypeKey[] = ["Casual", "Sick", "Vacation"];

const DEFAULT_ROLE_LEAVE_QUOTAS: Record<string, Record<LeaveTypeKey, number>> = {
  super_admin: { Casual: 12, Sick: 10, Vacation: 15 },
  founder: { Casual: 12, Sick: 10, Vacation: 15 },
  admin: { Casual: 10, Sick: 8, Vacation: 12 },
  manager: { Casual: 8, Sick: 8, Vacation: 10 },
  employee: { Casual: 8, Sick: 6, Vacation: 8 },
};

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

const getDailyWorkingHours = (workspace: any): number => {
  const weekly = Number(workspace?.attendanceSettings?.weeklyWorkingHours);
  if (Number.isFinite(weekly) && weekly > 0) {
    return Math.max(1, weekly / 5);
  }
  return 8;
};

const getRoleLeaveQuota = (roleKey: string): Record<LeaveTypeKey, number> =>
  DEFAULT_ROLE_LEAVE_QUOTAS[roleKey] || DEFAULT_ROLE_LEAVE_QUOTAS.employee;

const httpError = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode });

const isHrManagerMembership = (membership: any): boolean => {
  const roleKey = normalizeRoleKey(membership?.role);
  const departmentNames = getDepartmentNames(membership?.departments || []);
  const inHrDepartment = departmentNames.some(isHrDepartmentName);
  if (roleKey.includes("hr")) return true;
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
}

const isFounder = (actor: ActorContext) => actor.roleKey === "founder";
const isSuperAdmin = (actor: ActorContext) => actor.roleKey === "super_admin";

const canActionRequester = (
  actor: ActorContext,
  requesterRoleKey: string,
  requesterDepartmentIds: string[],
  requesterDepartmentName: string,
): boolean => {
  const actorIsHrManager = isHrManagerMembership(actor.membership);
  const actorIsDeptManager =
    (actor.roleKey === "manager" || actor.roleKey === "admin_manager") &&
    inSameDepartment(actor, requesterDepartmentIds, requesterDepartmentName);
  const actorIsAssignedAdmin =
    (actor.roleKey === "admin" || actor.roleKey === "admin_manager") &&
    inSameDepartment(actor, requesterDepartmentIds, requesterDepartmentName);

  switch (requesterRoleKey) {
    case "founder":
      return actorIsHrManager;
    case "super_admin":
      return isFounder(actor) || actorIsHrManager;
    case "admin":
      return isFounder(actor) || isSuperAdmin(actor) || actorIsHrManager;
    case "manager":
      return isFounder(actor) || isSuperAdmin(actor) || actorIsHrManager || actorIsAssignedAdmin;
    case "employee":
      return isFounder(actor) || isSuperAdmin(actor) || actorIsHrManager || actorIsDeptManager;
    default:
      return false;
  }
};

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

const getApprovedDaysForUser = async (workspaceId: any, userId: any, year: number): Promise<Record<LeaveTypeKey, number>> => {
  const used: Record<LeaveTypeKey, number> = { Casual: 0, Sick: 0, Vacation: 0 };
  const approved = await LeaveRequest.find({
    workspaceId,
    requesterUserId: userId,
    status: "approved",
    quotaYear: year,
  })
    .select("leaveType days")
    .lean()
    .exec();
  approved.forEach((request: any) => {
    if (LEAVE_TYPE_KEYS.includes(request.leaveType)) {
      used[request.leaveType as LeaveTypeKey] += Number(request.days || 0);
    }
  });
  return used;
};

export async function getLeaveBalancesForUser(
  userId: string,
  workspaceId?: string,
): Promise<Record<LeaveTypeKey, { total: number; used: number; remaining: number }>> {
  const { workspace, membership, user } = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const roleKey = normalizeRoleKey(membership.role);
  const year = new Date().getFullYear();
  const quota = await LeaveQuota.findOne({ workspaceId: workspace._id, userId: user?._id || userId, year })
    .lean()
    .exec();

  const total: Record<LeaveTypeKey, number> = quota
    ? { Casual: quota.Casual, Sick: quota.Sick, Vacation: quota.Vacation }
    : getRoleLeaveQuota(roleKey);
  const used = await getApprovedDaysForUser(workspace._id, user?._id || userId, year);

  return LEAVE_TYPE_KEYS.reduce((acc, key) => {
    acc[key] = {
      total: Number(total[key] || 0),
      used: roundDays(used[key]),
      remaining: Math.max(0, roundDays(Number(total[key] || 0) - used[key])),
    };
    return acc;
  }, {} as Record<LeaveTypeKey, { total: number; used: number; remaining: number }>);
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
  rejectionReason: string;
  isMe: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const formatLeaveRequest = (
  leaveRequest: any,
  departmentNameById: Map<string, string>,
  requesterUserId: string,
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
    department: departmentNames[0] || "General",
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
    rejectionReason: leaveRequest.rejectionReason || "",
    isMe: Boolean(leaveRequest.requesterUserId) && String(leaveRequest.requesterUserId) === String(requesterUserId),
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
): Promise<string[]> => {
  const members = await WorkspaceMember.find({ workspace: workspaceId, isActive: true })
    .populate("role")
    .populate("departments")
    .lean()
    .exec();

  const recipients = new Set<string>();
  const addMembers = (predicate: (member: any) => boolean) => {
    members.forEach((member: any) => {
      if (predicate(member) && toId(member.user)) recipients.add(toId(member.user));
    });
  };

  const addHrManagers = () => {
    addMembers((member: any) => {
      const roleKey = normalizeRoleKey(member.role);
      const departmentNames = getDepartmentNames(member.departments || []);
      if (roleKey.includes("hr")) return true;
      return (
        (roleKey === "manager" || roleKey === "admin" || roleKey === "admin_manager") &&
        departmentNames.some(isHrDepartmentName)
      );
    });
  };

  const addSuperAdmins = () => {
    addMembers((member: any) => normalizeRoleKey(member.role) === "super_admin");
  };

  const addDepartmentManagers = async () => {
    addMembers((member: any) => {
      const roleKey = normalizeRoleKey(member.role);
      if (roleKey !== "manager" && roleKey !== "admin_manager") return false;
      return inSameDepartment(member, requesterDepartmentIds, requesterDepartmentName);
    });
    if (requesterDepartmentIds.length === 1) {
      const department = await Department.findById(requesterDepartmentIds[0]).select("managerUser").lean().exec();
      if (department?.managerUser) recipients.add(toId(department.managerUser));
    }
  };

  const addAssignedAdmins = () => {
    addMembers((member: any) => {
      const roleKey = normalizeRoleKey(member.role);
      if (roleKey !== "admin" && roleKey !== "admin_manager") return false;
      return inSameDepartment(member, requesterDepartmentIds, requesterDepartmentName);
    });
  };

  const workspace = await Workspace.findById(workspaceId).select("owner").lean().exec();
  if (workspace?.owner) recipients.add(toId(workspace.owner));

  if (requesterRoleKey === "founder") {
    addHrManagers();
  } else if (requesterRoleKey === "super_admin") {
    addHrManagers();
  } else if (requesterRoleKey === "admin") {
    addSuperAdmins();
    addHrManagers();
  } else if (requesterRoleKey === "manager") {
    addSuperAdmins();
    addHrManagers();
    addAssignedAdmins();
  } else {
    addSuperAdmins();
    addHrManagers();
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

  const leaveType = String(input?.leaveType || "").trim();
  if (!LEAVE_TYPE_KEYS.includes(leaveType as LeaveTypeKey)) {
    throw httpError("Invalid leave type. Choose Casual, Sick or Vacation.", 400);
  }

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

  let leaveHours = Math.max(0, Number(input?.leaveHours) || 0);
  let days = 0;

  if (leaveMode === "half_day") {
    if (!isSameCalendarDay(startDate, endDate)) {
      throw httpError("Half-day leave must use the same start and end date.", 400);
    }
    if (!halfDaySession) {
      throw httpError("Half-day leave requires a morning or evening session.", 400);
    }
    days = 0.5;
    leaveHours = 4;
  } else if (leaveMode === "hours") {
    if (!isSameCalendarDay(startDate, endDate)) {
      throw httpError("Hour-based leave must use the same start and end date.", 400);
    }
    if (leaveHours <= 0) {
      leaveHours = Math.max(0, Number(input?.days) || 0) * getDailyWorkingHours(workspace);
    }
    if (leaveHours <= 0 || leaveHours > 24) {
      throw httpError("Partial leave requires hours between 0 and 24.", 400);
    }
    const dailyHours = getDailyWorkingHours(workspace);
    days = roundDays(Math.min(1, leaveHours / dailyHours));
    if (days <= 0) throw httpError("Leave duration must be greater than 0.", 400);
  } else {
    days = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    leaveHours = roundDays(days * getDailyWorkingHours(workspace));
  }

  const reason = String(input?.reason || "").trim();
  if (!reason || reason.length < 3) {
    throw httpError("Please provide a reason for the leave (at least 3 characters).", 400);
  }

  if (leaveType === "Sick" && days >= 2 && !input?.medicalCertAttached) {
    throw httpError("Medical certificate is required for sick leave of 2 or more days.", 400);
  }

  const quotaYear = getYearFromDate(startDate);
  const balances = await getLeaveBalancesForUser(userId, workspaceId);
  const selectedBalance = balances[leaveType as LeaveTypeKey];
  if (!selectedBalance) throw httpError("Invalid leave type.", 400);
  if (days > selectedBalance.remaining + 1e-9) {
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
    leaveMode,
    halfDaySession,
    leaveHours,
    quotaYear,
    startDate,
    endDate,
    days,
    status: "pending",
    reason,
    requesterBalance: selectedBalance.remaining,
    medicalCertAttached: Boolean(input?.medicalCertAttached),
    medicalCertName: String(input?.medicalCertName || ""),
    medicalCertUrl: String(input?.medicalCertUrl || ""),
    medicalCertPublicId: String(input?.medicalCertPublicId || ""),
    medicalCertMimeType: String(input?.medicalCertMimeType || ""),
    actionedByUserId: null,
    actionedByName: "",
    rejectionReason: "",
  });

  const approverUserIds = await getApproversForRequester(
    workspace._id,
    actor.roleKey,
    departmentIds.filter((id): id is string => Boolean(id)),
    requesterDepartmentName,
  );
  await notifyApprovers(workspace._id, actor.userId, leaveRequest, approverUserIds);

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
  if (LEAVE_TYPE_KEYS.includes(leaveType as LeaveTypeKey)) filter.leaveType = leaveType;
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

  return {
    leaveRequests: filtered.map((request: any) =>
      formatLeaveRequest(request, departmentNameById, actor.userId),
    ),
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

  const leaveRequest = await LeaveRequest.findOne({ _id: leaveRequestId, workspaceId: workspace._id }).exec();
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
    throw httpError("Only pending leave requests can be actioned.", 400);
  }

  const requesterRoleKey = normalizeRoleKey(leaveRequest.requesterRole || "employee");
  const requesterDepartmentIds = (leaveRequest.departments || []).map((id: any) => toId(id)).filter(Boolean);
  const departmentNameById = await loadWorkspaceDepartmentMap(workspace._id);
  const requesterDepartmentName = requesterDepartmentIds
    .map((id: string) => departmentNameById.get(id) || "")
    .filter(Boolean)[0] || "";

  if (!canActionRequester(actor, requesterRoleKey, requesterDepartmentIds, requesterDepartmentName)) {
    throw httpError("You do not have permission to action this leave request.", 403);
  }

  leaveRequest.status = status as LeaveStatus;
  leaveRequest.actionedByUserId = actor.userId as any;
  leaveRequest.actionedByName = actor.displayName;
  if (status === "rejected") {
    leaveRequest.rejectionReason = rejectionReason;
  } else {
    leaveRequest.rejectionReason = "";
    leaveRequest.balanceDeducted = true;
  }
  await leaveRequest.save();

  await createNotification({
    workspaceId: workspace._id,
    recipientUserId: (leaveRequest.requesterUserId || null) as any,
    actorUserId: actor.userId,
    type: status === "approved" ? "leave_approved" : "leave_rejected",
    category: "leave",
    title: `Leave request ${status}: ${leaveRequest.leaveCode}`,
    description:
      status === "approved"
        ? `${actor.displayName} approved your leave request.`
        : `${actor.displayName} rejected your leave request.`,
    entityType: "leave",
    entityId: String(leaveRequest._id),
    entityCode: leaveRequest.leaveCode,
    targetUrl: "/leave-requests",
    priority: status === "approved" ? "high" : "normal",
    data: {
      leaveType: leaveRequest.leaveType,
      leaveMode: leaveRequest.leaveMode,
      startDate: formatDateOnly(leaveRequest.startDate),
      endDate: formatDateOnly(leaveRequest.endDate),
      days: leaveRequest.days,
      rejectionReason: leaveRequest.rejectionReason || "",
      status: leaveRequest.status,
      actionedBy: actor.displayName,
    },
  });

  return { leaveRequest: formatLeaveRequest(leaveRequest, departmentNameById, actor.userId) };
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

export async function listLeaveQuotasForWorkspace(userId: string, query: any = {}, workspaceId?: string) {
  const context = await resolveLeaveWorkspaceContext(userId, workspaceId);
  const { workspace, actor } = context;

  const year = Number(query?.year) || new Date().getFullYear();

  const members = await WorkspaceMember.find({ workspace: workspace._id, isActive: true })
    .populate("role")
    .populate("departments")
    .populate("user", "name email")
    .lean()
    .exec();

  const memberUserIds = members.map((member: any) => toId(member.user)).filter(Boolean);
  const quotas = memberUserIds.length
    ? await LeaveQuota.find({ workspaceId: workspace._id, userId: { $in: memberUserIds }, year }).lean().exec()
    : [];
  const quotaByUserId = new Map(quotas.map((quota: any) => [String(quota.userId), quota]));

  const rows = [];
  for (const member of members) {
    const memberUserId = toId(member.user);
    if (!memberUserId) continue;
    const roleKey = normalizeRoleKey(member.role);
    const storedQuota = quotaByUserId.get(memberUserId);
    const defaults = getRoleLeaveQuota(roleKey);
    const used = await getApprovedDaysForUser(workspace._id, memberUserId, year);
    const total = storedQuota
      ? { Casual: storedQuota.Casual, Sick: storedQuota.Sick, Vacation: storedQuota.Vacation }
      : defaults;

    rows.push({
      userId: memberUserId,
      name: (member as any).user?.name || (member as any).user?.email || "Unnamed",
      email: (member as any).user?.email || "",
      employeeId: await resolveEmployeeId(workspace._id, memberUserId),
      role: roleKey,
      departments: getDepartmentNames(member.departments || []),
      year,
      quotaConfigured: Boolean(storedQuota),
      total,
      used,
      remaining: LEAVE_TYPE_KEYS.reduce((acc, key) => {
        acc[key] = Math.max(0, roundDays(Number(total[key] || 0) - Number(used[key] || 0)));
        return acc;
      }, {} as Record<LeaveTypeKey, number>),
    });
  }

  return {
    quotas: rows,
    leaveTypes: LEAVE_TYPE_KEYS,
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
  if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) {
    throw httpError("Invalid user id.", 400);
  }

  const membership = await resolveMembershipByWorkspace(workspace._id, targetUserId, "role");
  if (!membership) throw httpError("The requested user is not part of this workspace.", 404);

  const year = Number(input?.year) || new Date().getFullYear();
  const total: Record<LeaveTypeKey, number> = {
    Casual: Math.max(0, Number(input?.Casual ?? input?.casual ?? 0)),
    Sick: Math.max(0, Number(input?.Sick ?? input?.sick ?? 0)),
    Vacation: Math.max(0, Number(input?.Vacation ?? input?.vacation ?? 0)),
  };

  if (total.Casual + total.Sick + total.Vacation <= 0) {
    throw httpError("At least one leave type must have a quota greater than 0.", 400);
  }

  const quota = await LeaveQuota.findOneAndUpdate(
    { workspaceId: workspace._id, userId: targetUserId, year },
    { $set: { ...total, updatedBy: actor.userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();

  await createNotification({
    workspaceId: workspace._id,
    recipientUserId: targetUserId,
    actorUserId: actor.userId,
    type: "leave_quota_updated",
    category: "leave",
    title: "Your leave balance was updated",
    description: `${actor.displayName} updated your ${year} leave quota (Casual ${total.Casual}, Sick ${total.Sick}, Vacation ${total.Vacation}).`,
    entityType: "leave-quota",
    entityId: String(quota._id),
    targetUrl: "/leave-requests",
    data: { year, total },
  });

  return {
    quota: {
      userId: targetUserId,
      year,
      total,
      used: await getApprovedDaysForUser(workspace._id, targetUserId, year),
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
      date: formatDateOnly(holiday.date),
      year: holiday.year,
      type: holiday.type,
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
  date?: string;
  type?: string;
  recurring?: boolean;
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
  const existing = await Holiday.findOne({ workspaceId: workspace._id, dateKey }).lean().exec();
  if (existing) throw httpError("A holiday already exists on this date.", 409);

  const holiday = await Holiday.create({
    workspaceId: workspace._id,
    name,
    description: String(input?.description || "").trim(),
    date,
    dateKey,
    year: date.getUTCFullYear(),
    type: input?.type === "public" ? "public" : "company",
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
  if (input?.recurring !== undefined) holiday.recurring = Boolean(input.recurring);

  if (input?.date !== undefined) {
    const date = new Date(String(input.date || ""));
    if (Number.isNaN(date.getTime())) throw httpError("Invalid holiday date.", 400);
    const dateKey = formatDateOnly(date);
    const conflicting = await Holiday.findOne({
      workspaceId: workspace._id,
      dateKey,
      _id: { $ne: holiday._id },
    })
      .lean()
      .exec();
    if (conflicting) throw httpError("A holiday already exists on this date.", 409);
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
  date: formatDateOnly(holiday.date),
  year: holiday.year,
  type: holiday.type,
  recurring: Boolean(holiday.recurring),
  isActive: Boolean(holiday.isActive),
  createdAt: holiday.createdAt,
});

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
