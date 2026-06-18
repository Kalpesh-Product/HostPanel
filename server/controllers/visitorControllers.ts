// @ts-nocheck
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import HostUser from "../models/HostUser.js";
import VisitorLog from "../models/VisitorLog.js";
import Role from "../models/Role.js";
import Department from "../models/Department.js";
import { VISITOR_MEMBER_GRANT_ALIASES, VISITOR_PERMISSION_KEYS } from "../config/visitorPermissionMap.js";

const FRONTDESK_ROLES = new Set(["owner", "founder", "super_admin", "admin", "admin_manager", "manager"]);
const MODULE_ADMIN_ROLES = new Set(["owner", "founder", "super_admin"]);

const normalizeRole = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const toId = (value: unknown) => String(value || "");

const buildVisitorCode = () => `VIS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const buildBadgeNo = () => `B-${Math.floor(1000 + Math.random() * 9000)}`;

const getActorDisplayName = async (userId: string) => {
  if (!userId) return "";
  const actor = await HostUser.findById(userId).select("name firstName lastName email").lean().exec();
  if (!actor) return "";
  const fullName = `${String(actor.firstName || "").trim()} ${String(actor.lastName || "").trim()}`.trim();
  return fullName || String(actor.name || "").trim() || String(actor.email || "").trim();
};

const getCurrentWorkspaceForRequest = async (req: any) => {
  if (req?.workspaceMembership?.workspace) {
    const workspace = await Workspace.findById(req.workspaceMembership.workspace);
    if (workspace?.isActive !== false) return workspace;
  }

  const user = await HostUser.findById(req.user);
  if (!user) return null;

  if (user.primaryWorkspace) {
    const primaryWorkspace = await Workspace.findById(user.primaryWorkspace);
    if (primaryWorkspace?.isActive !== false) return primaryWorkspace;
  }

  const membership = await WorkspaceMember.findOne({
    user: user._id,
    isActive: true,
  })
    .sort({ isPrimary: -1, createdAt: 1 })
    .lean()
    .exec();

  if (membership?.workspace) {
    const workspace = await Workspace.findById(membership.workspace);
    if (workspace?.isActive !== false) return workspace;
  }

  return Workspace.findOne({ owner: user._id, isActive: true }).sort({ createdAt: 1 }).exec();
};

const getWorkspaceRole = async (workspaceId: string, userId: string) => {
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
    isActive: true,
  })
    .populate("role")
    .select("role")
    .lean()
    .exec();

  return normalizeRole(membership?.role?.name || membership?.role || "");
};

const ensureFrontdeskPermission = async (workspaceId: string, userId: string) => {
  const role = await getWorkspaceRole(workspaceId, userId);
  return FRONTDESK_ROLES.has(role);
};

const isWorkspaceVisitorModuleEnabled = (workspace: any) => {
  const enabledByIds = Array.isArray(workspace?.enabledModuleIds)
    ? workspace.enabledModuleIds.map((item: any) => String(item || "").trim().toLowerCase())
    : [];
  if (enabledByIds.includes(VISITOR_PERMISSION_KEYS.module)) return true;

  const moduleRows = Array.isArray(workspace?.modules) ? workspace.modules : [];
  for (const row of moduleRows) {
    const items = Array.isArray(row?.items) ? row.items : [];
    for (const item of items) {
      const itemId = String(item?.id || "").trim().toLowerCase();
      if (itemId === VISITOR_PERMISSION_KEYS.module && item?.active !== false) return true;
    }
  }
  return false;
};

const getWorkspaceMembership = async (workspaceId: string, userId: string) =>
  WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
    isActive: true,
  })
    .populate("role")
    .select("role grantedModules")
    .lean()
    .exec();

const hasVisitorAccess = ({
  workspace,
  membership,
  permissionKey,
}: {
  workspace: any;
  membership: any;
  permissionKey?: string;
}) => {
  if (!isWorkspaceVisitorModuleEnabled(workspace)) return false;

  const role = normalizeRole(membership?.role || "");
  if (MODULE_ADMIN_ROLES.has(role)) return true;

  const grantedModules = Array.isArray(membership?.grantedModules)
    ? membership.grantedModules.map((item: any) => String(item || "").trim().toLowerCase())
    : [];
  const grantedSet = new Set(grantedModules);

  if (grantedSet.has(VISITOR_PERMISSION_KEYS.module) || grantedSet.has("visitors-management")) {
    return true;
  }

  if (!permissionKey) return false;
  const normalizedPermission = String(permissionKey || "").trim().toLowerCase();
  if (!normalizedPermission) return false;

  return VISITOR_MEMBER_GRANT_ALIASES.has(normalizedPermission) && grantedSet.has(normalizedPermission);
};

const formatVisitor = (visitor: any) => ({
  id: toId(visitor?._id),
  visitorCode: visitor?.visitorCode || "",
  fullName: visitor?.fullName || "",
  firstName: visitor?.firstName || "",
  lastName: visitor?.lastName || "",
  gender: visitor?.gender || "",
  phone: visitor?.phone || "",
  email: visitor?.email || "",
  country: visitor?.country || "",
  state: visitor?.state || "",
  city: visitor?.city || "",
  company: visitor?.company || "",
  visitorCompanyType: visitor?.visitorCompanyType || "individual",
  visitorType: visitor?.visitorType || "standard",
  tenantCompanyName: visitor?.tenantCompanyName || "",
  purpose: visitor?.purpose || "",
  reason: visitor?.reason || "",
  hostUserId: toId(visitor?.hostUser),
  hostName: visitor?.hostName || "",
  hostRole: visitor?.hostRole || "",
  hostDepartments: Array.isArray(visitor?.hostDepartments) ? visitor.hostDepartments : [],
  meetingTargetType: visitor?.meetingTargetType || "",
  meetingTargetValue: visitor?.meetingTargetValue || "",
  approvalStatus: visitor?.approvalStatus || "pending",
  status: visitor?.status || "pending",
  rejectionReason: visitor?.rejectionReason || "",
  notes: visitor?.notes || "",
  badgeNo: visitor?.badgeNo || "",
  checkInAt: visitor?.checkInAt || null,
  checkedInByUserId: toId(visitor?.checkedInByUser),
  checkedInByName: visitor?.checkedInByName || "",
  checkOutAt: visitor?.checkOutAt || null,
  checkedOutByUserId: toId(visitor?.checkedOutByUser),
  checkedOutByName: visitor?.checkedOutByName || "",
  createdAt: visitor?.createdAt || null,
  updatedAt: visitor?.updatedAt || null,
});

const buildSummary = (visitors = []) =>
  visitors.reduce(
    (acc, visitor) => {
      const status = String(visitor.status || "").toLowerCase();
      if (status === "pending") acc.pending += 1;
      if (status === "approved") acc.approved += 1;
      if (status === "rejected") acc.rejected += 1;
      if (status === "checked_in") acc.checkedIn += 1;
      if (status === "checked_out") acc.checkedOut += 1;
      if (status === "cancelled") acc.cancelled += 1;
      return acc;
    },
    {
      pending: 0,
      approved: 0,
      rejected: 0,
      checkedIn: 0,
      checkedOut: 0,
      cancelled: 0,
    },
  );

const getKolkataDateKey = (value: Date | string | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const buildHostGroups = (employeeRoster = [], workspaceDepartments = []) => {
  const departmentMap = new Map();
  const roleMap = new Map();

  (Array.isArray(workspaceDepartments) ? workspaceDepartments : []).forEach((departmentEntry) => {
    const departmentName = String(departmentEntry?.name || "").trim();
    const normalizedDepartment = normalizeRole(departmentName);
    if (!normalizedDepartment) return;

    if (!departmentMap.has(normalizedDepartment)) {
      departmentMap.set(normalizedDepartment, {
        type: "department",
        value: `department:${normalizedDepartment}`,
        label: departmentName || normalizedDepartment.replace(/_/g, " "),
        members: [],
      });
    }
  });

  employeeRoster.forEach((member) => {
    const memberId = toId(member?.id || member?.userId);
    const fullName = String(member?.fullName || "").trim();
    const email = String(member?.email || "").trim();
    const role = String(member?.role || "").trim();
    const normalizedRole = normalizeRole(role);
    const departments = Array.isArray(member?.departments) ? member.departments : [];

    const rosterMember = {
      id: memberId,
      userId: memberId,
      fullName,
      email,
      role,
      departments,
      statusKey: "present",
      statusLabel: "Present",
      isSelectable: true,
    };

    if (normalizedRole) {
      if (!roleMap.has(normalizedRole)) {
        roleMap.set(normalizedRole, {
          type: "role",
          value: `role:${normalizedRole}`,
          label: role || normalizedRole.replace(/_/g, " "),
          members: [],
        });
      }
      roleMap.get(normalizedRole).members.push(rosterMember);
    }

    departments.forEach((departmentRaw) => {
      const department = String(departmentRaw || "").trim();
      const normalizedDepartment = normalizeRole(department);
      if (!normalizedDepartment) return;

      if (!departmentMap.has(normalizedDepartment)) {
        departmentMap.set(normalizedDepartment, {
          type: "department",
          value: `department:${normalizedDepartment}`,
          label: department || normalizedDepartment.replace(/_/g, " "),
          members: [],
        });
      }
      departmentMap.get(normalizedDepartment).members.push(rosterMember);
    });
  });

  return [...departmentMap.values(), ...roleMap.values()];
};

export const getVisitorsOverview = async (req, res, next) => {
  try {
    const workspace = await getCurrentWorkspaceForRequest(req);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const membership = await getWorkspaceMembership(toId(workspace._id), toId(req.user));
    if (!membership) return res.status(403).json({ message: "You do not have workspace access." });
    if (
      !hasVisitorAccess({
        workspace,
        membership,
        permissionKey: VISITOR_PERMISSION_KEYS.pages.manageVisitors,
      })
    ) {
      return res.status(403).json({ message: "You do not have permission to access Visitor Management." });
    }

    const visitors = await VisitorLog.find({ workspace: workspace._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    const hostMembers = await WorkspaceMember.find({
      workspace: workspace._id,
      isActive: true,
    })
      .populate("user", "name email")
      .populate("role")
      .populate("departments")
      .select("user role departments")
      .lean()
      .exec();

    const employeeRoster = hostMembers.map((member) => ({
      id: toId(member?.user?._id || member?.user),
      fullName: member?.user?.name || "",
      email: member?.user?.email || "",
      role: member?.role?.name || member?.role || "employee",
      departments: Array.isArray(member?.departments)
        ? member.departments.map((d: any) => d.name || String(d))
        : [],
      isSelectable: true,
    }));

    const formatted = visitors.map(formatVisitor);
    const liveVisitors = formatted.filter((visitor) => String(visitor.status || "").toLowerCase() === "checked_in");
    const approvedVisitors = formatted.filter((visitor) => String(visitor.status || "").toLowerCase() === "approved");
    const pendingVisitors = formatted.filter((visitor) => String(visitor.status || "").toLowerCase() === "pending");
    const departments = await Department.find({ workspaceId: workspace._id, isActive: true }).lean().exec();
    const activeWorkspaceDepartments = departments.map((d) => ({
      _id: d._id,
      name: d.name,
      description: d.description || "",
      isActive: d.isActive,
    }));
    const hostGroups = buildHostGroups(employeeRoster, activeWorkspaceDepartments);
    const todayKey = getKolkataDateKey(new Date());
    const dailyVisitors = formatted.filter((visitor) => {
      const createdKey = getKolkataDateKey(visitor.createdAt);
      const checkInKey = getKolkataDateKey(visitor.checkInAt);
      return createdKey === todayKey || checkInKey === todayKey;
    });
    const visitorHistory = formatted.filter((visitor) =>
      ["checked_out", "cancelled", "rejected"].includes(String(visitor.status || "").toLowerCase()),
    );

    return res.status(200).json({
      message: "Visitor overview loaded successfully.",
      data: {
        modules: {
          standard: { key: "standard", enabled: true, locked: false, message: "" },
          preapproved: { key: "preapproved", enabled: false, locked: true, message: "Locked in basic plan." },
          recurring: { key: "recurring", enabled: false, locked: true, message: "Locked in basic plan." },
          vip: { key: "vip", enabled: false, locked: true, message: "Locked in basic plan." },
          blacklist: { key: "blacklist", enabled: false, locked: true, message: "Locked in basic plan." },
        },
        activeModule: "standard",
        workspace: {
          id: toId(workspace._id),
          workspaceName: workspace.workspaceName || "",
          selectedPlan: workspace.selectedPlan || "basic",
        },
        employeeRoster,
        hostGroups,
        visitors: formatted,
        liveVisitors,
        approvedVisitors,
        pendingVisitors,
        dailyVisitors,
        visitorHistory,
        summary: buildSummary(formatted),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listVisitors = async (req, res, next) => {
  try {
    const workspace = await getCurrentWorkspaceForRequest(req);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    const membership = await getWorkspaceMembership(toId(workspace._id), toId(req.user));
    if (!membership) return res.status(403).json({ message: "You do not have workspace access." });
    if (
      !hasVisitorAccess({
        workspace,
        membership,
        permissionKey: VISITOR_PERMISSION_KEYS.pages.manageVisitors,
      })
    ) {
      return res.status(403).json({ message: "You do not have permission to access Visitor Management." });
    }

    const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), 100);
    const query: any = { workspace: workspace._id };
    if (req.query?.status) query.status = String(req.query.status);
    if (req.query?.approvalStatus) query.approvalStatus = String(req.query.approvalStatus);

    const visitors = await VisitorLog.find(query).sort({ createdAt: -1 }).limit(limit).lean().exec();
    const formatted = visitors.map(formatVisitor);

    return res.status(200).json({
      message: "Visitor logs loaded successfully.",
      data: {
        activeModule: "standard",
        visitors: formatted,
        summary: buildSummary(formatted),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createVisitor = async (req, res, next) => {
  try {
    const workspace = await getCurrentWorkspaceForRequest(req);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    const membership = await getWorkspaceMembership(toId(workspace._id), toId(req.user));
    if (!membership) return res.status(403).json({ message: "You do not have workspace access." });
    if (
      !hasVisitorAccess({
        workspace,
        membership,
        permissionKey: VISITOR_PERMISSION_KEYS.actions.createVisitor,
      })
    ) {
      return res.status(403).json({ message: "You do not have permission to create visitors." });
    }

    const payload = req.body || {};
    const firstName = String(payload.firstName || "").trim();
    const lastName = String(payload.lastName || "").trim();
    const fullName = String(payload.fullName || `${firstName} ${lastName}` || "").trim();
    const purpose = String(payload.purpose || "").trim();
    const reason = String(payload.reason || "").trim();
    if (!firstName || !lastName || !fullName || !purpose) {
      return res.status(400).json({ message: "firstName, lastName and purpose are required." });
    }

    const requestedStatus = String(payload.status || "pending").trim().toLowerCase();
    const isDirectCheckIn = requestedStatus === "checked_in";
    if (isDirectCheckIn) {
      const hasFrontdeskPermission = await ensureFrontdeskPermission(toId(workspace._id), toId(req.user));
      if (!hasFrontdeskPermission) {
        return res.status(403).json({ message: "You do not have permission to check in visitors." });
      }
    }
    const now = new Date();
    const actorName = await getActorDisplayName(toId(req.user));

    const visitor = await VisitorLog.create({
      workspace: workspace._id,
      createdByUser: req.user,
      visitorCode: buildVisitorCode(),
      fullName,
      firstName,
      lastName,
      gender: String(payload.gender || "").trim().toLowerCase(),
      phone: String(payload.phone || "").trim(),
      email: String(payload.email || "").trim(),
      country: String(payload.country || "").trim(),
      state: String(payload.state || "").trim(),
      city: String(payload.city || "").trim(),
      company: String(payload.company || "").trim(),
      visitorCompanyType: String(payload.visitorCompanyType || "individual").trim().toLowerCase(),
      visitorType: String(payload.visitorType || "standard").trim().toLowerCase(),
      tenantCompanyName: String(payload.tenantCompanyName || "").trim(),
      purpose,
      reason,
      hostUser: payload.hostUserId || null,
      hostName: String(payload.hostName || "").trim(),
      hostRole: String(payload.hostRole || "").trim(),
      hostDepartments: Array.isArray(payload.hostDepartments)
        ? payload.hostDepartments.map((item: any) => String(item || "").trim()).filter(Boolean)
        : [],
      meetingTargetType: String(payload.meetingTargetType || "").trim().toLowerCase(),
      meetingTargetValue: String(payload.meetingTargetValue || "").trim(),
      approvalStatus: isDirectCheckIn ? "approved" : "pending",
      status: isDirectCheckIn ? "checked_in" : "pending",
      checkInAt: isDirectCheckIn ? now : null,
      checkedInByUser: isDirectCheckIn ? req.user : null,
      checkedInByName: isDirectCheckIn ? actorName : "",
      badgeNo: buildBadgeNo(),
      notes: String(payload.notes || "").trim(),
      source: "frontdesk",
    });

    return res.status(201).json({
      message: "Visitor logged successfully.",
      data: { visitor: formatVisitor(visitor) },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewVisitorDecision = async (req, res, next) => {
  try {
    const workspace = await getCurrentWorkspaceForRequest(req);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    const membership = await getWorkspaceMembership(toId(workspace._id), toId(req.user));
    if (!membership) return res.status(403).json({ message: "You do not have workspace access." });
    if (
      !hasVisitorAccess({
        workspace,
        membership,
        permissionKey: VISITOR_PERMISSION_KEYS.actions.reviewVisitor,
      })
    ) {
      return res.status(403).json({ message: "You do not have permission to review visitors." });
    }
    const hasFrontdeskPermission = await ensureFrontdeskPermission(toId(workspace._id), toId(req.user));
    if (!hasFrontdeskPermission) {
      return res.status(403).json({ message: "You do not have permission to review visitors." });
    }

    const decision = String(req.body?.decision || "").trim().toLowerCase();
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Decision must be approved or rejected." });
    }

    const visitor = await VisitorLog.findOne({ _id: req.params.visitorId, workspace: workspace._id });
    if (!visitor) return res.status(404).json({ message: "Visitor record not found." });
    if (visitor.status !== "pending") {
      return res.status(200).json({ message: "Visitor already reviewed.", data: { visitor: formatVisitor(visitor) } });
    }

    visitor.approvalStatus = decision;
    visitor.status = decision === "approved" ? "approved" : "rejected";
    visitor.rejectionReason = decision === "rejected" ? String(req.body?.reason || "").trim() : "";
    await visitor.save();

    return res.status(200).json({
      message: "Visitor decision saved successfully.",
      data: { visitor: formatVisitor(visitor) },
    });
  } catch (error) {
    next(error);
  }
};

export const checkInVisitor = async (req, res, next) => {
  try {
    const workspace = await getCurrentWorkspaceForRequest(req);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    const membership = await getWorkspaceMembership(toId(workspace._id), toId(req.user));
    if (!membership) return res.status(403).json({ message: "You do not have workspace access." });
    if (
      !hasVisitorAccess({
        workspace,
        membership,
        permissionKey: VISITOR_PERMISSION_KEYS.actions.checkInVisitor,
      })
    ) {
      return res.status(403).json({ message: "You do not have permission to check in visitors." });
    }

    const hasFrontdeskPermission = await ensureFrontdeskPermission(toId(workspace._id), toId(req.user));
    if (!hasFrontdeskPermission) {
      return res.status(403).json({ message: "You do not have permission to check in visitors." });
    }

    const visitor = await VisitorLog.findOne({ _id: req.params.visitorId, workspace: workspace._id });
    if (!visitor) return res.status(404).json({ message: "Visitor record not found." });
    if (visitor.status === "checked_in") {
      return res.status(200).json({ message: "Visitor already checked in.", data: { visitor: formatVisitor(visitor) } });
    }
    if (visitor.approvalStatus !== "approved" || !["pending", "approved"].includes(visitor.status)) {
      return res.status(400).json({ message: "Only approved visitor requests can be checked in." });
    }

    visitor.status = "checked_in";
    visitor.checkInAt = new Date();
    visitor.checkedInByUser = req.user;
    visitor.checkedInByName = await getActorDisplayName(toId(req.user));
    if (req.body?.notes) {
      visitor.notes = [visitor.notes, String(req.body.notes).trim()].filter(Boolean).join("\n");
    }
    await visitor.save();

    return res.status(200).json({
      message: "Visitor checked in successfully.",
      data: { visitor: formatVisitor(visitor) },
    });
  } catch (error) {
    next(error);
  }
};

export const checkOutVisitor = async (req, res, next) => {
  try {
    const workspace = await getCurrentWorkspaceForRequest(req);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    const membership = await getWorkspaceMembership(toId(workspace._id), toId(req.user));
    if (!membership) return res.status(403).json({ message: "You do not have workspace access." });
    if (
      !hasVisitorAccess({
        workspace,
        membership,
        permissionKey: VISITOR_PERMISSION_KEYS.actions.checkOutVisitor,
      })
    ) {
      return res.status(403).json({ message: "You do not have permission to check out visitors." });
    }
    const hasFrontdeskPermission = await ensureFrontdeskPermission(toId(workspace._id), toId(req.user));
    if (!hasFrontdeskPermission) {
      return res.status(403).json({ message: "You do not have permission to check out visitors." });
    }

    const visitor = await VisitorLog.findOne({ _id: req.params.visitorId, workspace: workspace._id });
    if (!visitor) return res.status(404).json({ message: "Visitor record not found." });
    if (visitor.status === "checked_out") {
      return res.status(200).json({ message: "Visitor already checked out.", data: { visitor: formatVisitor(visitor) } });
    }
    if (visitor.status !== "checked_in") {
      return res.status(400).json({ message: "Only checked-in visitors can be checked out." });
    }

    visitor.status = "checked_out";
    visitor.checkOutAt = new Date();
    visitor.checkedOutByUser = req.user;
    visitor.checkedOutByName = await getActorDisplayName(toId(req.user));
    if (req.body?.notes) {
      visitor.notes = [visitor.notes, String(req.body.notes).trim()].filter(Boolean).join("\n");
    }
    await visitor.save();

    return res.status(200).json({
      message: "Visitor checked out successfully.",
      data: { visitor: formatVisitor(visitor) },
    });
  } catch (error) {
    next(error);
  }
};
