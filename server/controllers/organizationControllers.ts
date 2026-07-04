// @ts-nocheck
import mongoose from "mongoose";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Department from "../models/Department.js";
import { Role } from "../models/Role.js";
import ActingManager from "../models/ActingManager.js";
import Company from "../models/Company.js";
import jwt from "jsonwebtoken";
import { sendMail } from "../config/mailer.js";
import { buildWorkspaceModuleCatalog } from "../config/workspaceModuleCatalog.js";
import {
  ORGANIZATION_MEMBER_GRANT_ALIASES,
  ORGANIZATION_PERMISSION_KEYS,
} from "../config/organizationPermissionMap.js";
import { resolveMembershipByWorkspace } from "../utils/resolveMembership.js";
import { ensureEmployeeProfileForMember } from "../services/core/hr.service.js";

const DEFAULT_DEPARTMENTS = [
  { name: "HR", description: "People operations and hiring", isActive: true },
  { name: "Administration", description: "Admin and facility operations", isActive: true },
  { name: "Sales", description: "Revenue and customer growth", isActive: true },
  { name: "Finance", description: "Finance and compliance", isActive: true },
  { name: "Maintenance", description: "Maintenance and operations", isActive: true },
  { name: "Technology", description: "Technology and product", isActive: true },
  { name: "IT", description: "Information technology and support", isActive: true },
];

const toId = (value) => String(value || "");

const getRoleName = (role: any) => {
  if (!role) return "";
  if (typeof role === "object" && role.name) return String(role.name);
  return String(role);
};

const toRoleLabel = (role) => {
  const name = getRoleName(role);
  const normalized = name.trim().toLowerCase();
  if (normalized === "founder") return "owner";
  return normalized || "member";
};

const normalizeRoleForStorage = (role = "") => {
  const name = getRoleName(role);
  const normalized = name.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "founder") return "owner";
  if (normalized === "superadmin") return "super_admin";
  return normalized || "employee";
};

const getRoleBand = (role = "") => {
  const name = getRoleName(role);
  const normalized = normalizeRoleForStorage(name);
  if (normalized === "owner") return "owner";
  if (normalized === "super_admin") return "super_admin";
  if (normalized === "admin" || normalized === "admin_manager") return "admin";
  if (normalized === "manager") return "manager";
  return "employee";
};

const canManageDepartmentsByRole = (role = "") => getRoleBand(role) === "owner";
const ORG_MODULE_ADMIN_ROLES = new Set(["owner", "super_admin"]);

const normalizeGrantKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

const isWorkspaceOrganizationModuleEnabled = (workspace: any) => {
  const enabledByIds = Array.isArray(workspace?.enabledModuleIds)
    ? workspace.enabledModuleIds.map((item: any) => String(item || "").trim().toLowerCase())
    : [];
  if (enabledByIds.includes(ORGANIZATION_PERMISSION_KEYS.module)) return true;

  const moduleRows = Array.isArray(workspace?.modules) ? workspace.modules : [];
  for (const row of moduleRows) {
    const items = Array.isArray(row?.items) ? row.items : [];
    for (const item of items) {
      const itemId = String(item?.id || "").trim().toLowerCase();
      if (itemId === ORGANIZATION_PERMISSION_KEYS.module && item?.active !== false) return true;
    }
  }
  return false;
};

const hasOrganizationAccess = ({
  workspace,
  membership,
  permissionKey,
}: {
  workspace: any;
  membership: any;
  permissionKey?: string;
}) => {
  if (!isWorkspaceOrganizationModuleEnabled(workspace)) return false;

  const roleBand = getRoleBand(membership?.role || "");
  if (ORG_MODULE_ADMIN_ROLES.has(roleBand)) return true;

  const grantedModules = Array.isArray(membership?.grantedModules)
    ? membership.grantedModules.map((item: any) => String(item || "").trim().toLowerCase())
    : [];
  const grantedSet = new Set(grantedModules);

  if (grantedSet.has(ORGANIZATION_PERMISSION_KEYS.module)) return true;
  if (!permissionKey) return false;

  const normalizedPermission = normalizeGrantKey(permissionKey);
  if (!normalizedPermission) return false;
  return ORGANIZATION_MEMBER_GRANT_ALIASES.has(normalizedPermission) && grantedSet.has(normalizedPermission);
};

const isBasicPlan = (workspace: any) =>
  String(workspace?.selectedPlan || "basic").trim().toLowerCase() === "basic";

const buildLinkedWorkspaceOptions = async (workspace) => {
  if (!workspace?.owner) return [];
  const workspaces = await Workspace.find({
    owner: workspace.owner,
    isActive: true,
  })
    .lean()
    .exec();

  const ownerWorkspaceIds = workspaces.map((w) => w._id);
  const allDepts = await Department.find({
    workspaceId: { $in: ownerWorkspaceIds },
    isActive: true,
  })
    .lean()
    .exec();

  const deptsByWorkspace = new Map();
  for (const d of allDepts) {
    const wId = String(d.workspaceId);
    const current = deptsByWorkspace.get(wId) || [];
    current.push(d);
    deptsByWorkspace.set(wId, current);
  }

  return workspaces.map((item) => ({
    id: toId(item._id),
    workspaceName: item.workspaceName || item.businessName || "Workspace",
    location: [item.city, item.state, item.country].filter(Boolean).join(", "),
    isCurrentWorkspace: toId(item._id) === toId(workspace._id),
    departments: (deptsByWorkspace.get(toId(item._id)) || []).map((department) => ({
      id: toId(department?._id),
      name: department?.name || "",
    })),
  }));
};

const ensureWorkspaceDepartments = async (workspace) => {
  if (!workspace) {
    return [];
  }

  const existingDepts = await Department.find({ workspaceId: workspace._id });
  if (existingDepts.length > 0) {
    const existingNames = new Set(
      existingDepts.map((d) => d.name.trim().toLowerCase())
    );
    const missingDefaults = DEFAULT_DEPARTMENTS.filter(
      (d) => !existingNames.has(d.name.trim().toLowerCase())
    );
    if (missingDefaults.length > 0) {
      const toCreate = missingDefaults.map((d) => ({
        name: d.name,
        description: d.description,
        workspaceId: workspace._id,
        isActive: true,
      }));
      try {
        await Department.insertMany(toCreate, { ordered: false });
      } catch (err: any) {
        // Ignore E11000 duplicate key errors (e.g. legacy departmentId_1 index);
        // docs that are genuinely new were still inserted.
        const isDupKey = err?.code === 11000 || err?.name === "MongoBulkWriteError" &&
          (err?.writeErrors || []).every((e: any) => e?.code === 11000);
        if (!isDupKey) throw err;
      }
    }
    return Department.find({ workspaceId: workspace._id });
  }

  const toCreate = DEFAULT_DEPARTMENTS.map((d) => ({
    name: d.name,
    description: d.description,
    workspaceId: workspace._id,
    isActive: true,
  }));
  try {
    await Department.insertMany(toCreate, { ordered: false });
  } catch (err: any) {
    const isDupKey = err?.code === 11000 || err?.name === "MongoBulkWriteError" &&
      (err?.writeErrors || []).every((e: any) => e?.code === 11000);
    if (!isDupKey) throw err;
  }
  return Department.find({ workspaceId: workspace._id });
};

const getCurrentWorkspace = async (userId) => {
  const user = await HostUser.findById(userId);
  if (!user) {
    return { user: null, workspace: null };
  }

  let workspace = null;
  if (user.primaryWorkspace) {
    workspace = await Workspace.findById(user.primaryWorkspace);
  }

  if (!workspace) {
    workspace = await Workspace.findOne({ owner: user._id, isActive: true }).sort({ createdAt: -1 });
  }

  if (!workspace) {
    const membership = await WorkspaceMember.findOne({
      user: user._id,
      isActive: true,
    })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean()
      .exec();
    if (membership?.workspace) {
      workspace = await Workspace.findById(membership.workspace);
      if (workspace && !user.primaryWorkspace) {
        user.primaryWorkspace = workspace._id;
        await user.save();
      }
    }
  }

  return { user, workspace };
};

const resolveMemberStatus = (isActive: boolean, inviteStatus?: string) => {
  if (!isActive) return "disabled";
  if (inviteStatus === "invite_sent") return "invited";
  if (inviteStatus === "registered") return "registered";
  return "joined";
};

export const getOrganizationOverview = async (req, res, next) => {
  try {
    const { user, workspace } = await getCurrentWorkspace(req.user);
    if (!user || !workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role grantedModules")
      .populate("role")
      .lean()
      .exec();
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }

    const hasFullAccess = hasOrganizationAccess({
      workspace,
      membership: actorMembership,
      permissionKey: ORGANIZATION_PERMISSION_KEYS.tabs.users,
    });

    if (!hasFullAccess) {
      // Non-admin members still need their own profile (sidebar uses it for role/departments).
      // Ensure default departments exist for this workspace before reading them.
      const restrictedDepts = await ensureWorkspaceDepartments(workspace).then(() =>
        Department.find({ workspaceId: workspace._id, isActive: true }).lean().exec(),
      );
      const selfMember = await WorkspaceMember.findOne({
          workspace: workspace._id,
          user: req.user,
          isActive: true,
        })
          .populate("user", "name email isActive")
          .populate("role")
          .populate("departments")
          .lean()
          .exec();

      const selfEntry = selfMember
        ? {
          id: toId(selfMember._id),
          userId: toId(selfMember.user?._id),
          name: selfMember.user?.name || "",
          email: selfMember.user?.email || "",
          employeeId: "",
          role: toRoleLabel(selfMember.role),
          status: resolveMemberStatus(selfMember.isActive !== false, selfMember.user?.inviteStatus),
          departmentNames: Array.isArray(selfMember.departments)
            ? selfMember.departments.map((d: any) => d.name || String(d))
            : [],
          grantedModules: Array.isArray(selfMember.grantedModules) ? selfMember.grantedModules : [],
          enabledModules: Array.isArray(selfMember.enabledModules) ? selfMember.enabledModules : [],
          workspaceAccesses: [],
          joinedAt: selfMember.createdAt,
        }
        : null;

      return res.status(200).json({
        message: "Organization overview loaded successfully.",
        data: {
          workspace: {
            id: toId(workspace._id),
            selectedPlan: workspace.selectedPlan || "basic",
            enabledModuleIds: Array.isArray(workspace.enabledModuleIds) ? workspace.enabledModuleIds : [],
          },
          departments: restrictedDepts.map((d: any) => ({ id: toId(d._id), name: d.name, isActive: true })),
          teamMembers: selfEntry ? [selfEntry] : [],
          linkedWorkspaces: [],
          accessRestricted: true,
        },
      });
    }

    const activeDepartments = await ensureWorkspaceDepartments(workspace);

    const members = await WorkspaceMember.find({ workspace: workspace._id })
      .populate("user", "name email isActive inviteStatus")
      .populate("role")
      .populate("departments")
      .lean()
      .exec();

    const allActingManagers = await ActingManager.find({
      workspaceId: workspace._id,
      isActive: true,
    })
      .lean()
      .exec();

    const departments = activeDepartments.map((department) => {
      const departmentMembers = members.filter((member) =>
        (Array.isArray(member.departments) ? member.departments : []).some(
          (dept: any) => toId(dept?._id || dept) === toId(department._id),
        ),
      );

      const managerMember = department?.managerUser
        ? members.find((member) => toId(member.user?._id) === toId(department.managerUser))
        : null;

      return {
        id: toId(department?._id),
        name: department?.name || "",
        description: department?.description || "",
        color: "bg-blue-600",
        moduleIds: Array.isArray(department?.moduleIds) ? department.moduleIds : [],
        managerUserId: toId(department?.managerUser),
        managerName: managerMember?.user?.name || "",
        adminUserIds: departmentMembers.map((m) => toId(m.user?._id)),
        employeeUserIds: departmentMembers.map((m) => toId(m.user?._id)),
        employeeCount: departmentMembers.length,
        employees: departmentMembers.map((member) => ({
          id: toId(member._id),
          userId: toId(member.user?._id),
          name: member.user?.name || "",
          email: member.user?.email || "",
          role: toRoleLabel(member.role),
          status: resolveMemberStatus(member.isActive !== false, member.user?.inviteStatus),
          departmentNames: Array.isArray(member.departments)
            ? member.departments.map((d: any) => d.name || String(d))
            : [],
        })),
        actingManagers: allActingManagers
          .filter(
            (assignment) =>
              toId(assignment?.departmentId) === toId(department?._id),
          )
          .map((assignment) => ({
            assignedUserId: toId(assignment?.assignedUser),
            note: assignment?.note || "",
          })),
      };
    });

    const linkedWorkspaces = await buildLinkedWorkspaceOptions(workspace);
    const ownerWorkspaceIds = linkedWorkspaces.map((item) => item.id);
    const linkedMemberships = await WorkspaceMember.find({
      workspace: { $in: ownerWorkspaceIds },
      isActive: true,
    })
      .lean()
      .exec();

    // Bulk lookup employee profiles for employeeId
    const memberIds = members.map((m) => m._id).filter(Boolean);
    const employeeProfiles = await EmployeeProfile.find({
      linkedWorkspaceMemberId: { $in: memberIds },
      workspaceId: workspace._id,
    })
      .select("employeeId linkedWorkspaceMemberId")
      .lean()
      .exec();
    const employeeIdByMemberId = new Map(
      employeeProfiles.map((ep) => [String(ep.linkedWorkspaceMemberId), ep.employeeId]),
    );

    const teamMembers = members.map((member) => ({
      id: toId(member._id),
      userId: toId(member.user?._id),
      name: member.user?.name || "",
      email: member.user?.email || "",
      employeeId: employeeIdByMemberId.get(String(member._id)) || "",
      role: toRoleLabel(member.role),
      status: resolveMemberStatus(member.isActive !== false, member.user?.inviteStatus),
      departmentNames: Array.isArray(member.departments)
        ? member.departments.map((d: any) => d.name || String(d))
        : [],
      grantedModules: Array.isArray(member.grantedModules) ? member.grantedModules : [],
      enabledModules: Array.isArray(member.enabledModules) ? member.enabledModules : [],
      workspaceAccesses: linkedWorkspaces.filter((item) =>
        linkedMemberships.some(
          (accessMembership) =>
            toId(accessMembership.workspace) === String(item.id) &&
            toId(accessMembership.user) === toId(member.user?._id),
        ),
      ),
      joinedAt: member.createdAt,
    }));

    return res.status(200).json({
      message: "Organization overview loaded successfully.",
      data: {
        workspace: {
          id: toId(workspace._id),
          selectedPlan: workspace.selectedPlan || "basic",
          enabledModuleIds: Array.isArray(workspace.enabledModuleIds)
            ? workspace.enabledModuleIds
            : [],
          modules: Array.isArray(workspace.modules) ? workspace.modules : [],
          moduleMap: buildWorkspaceModuleCatalog({
            selectedPlan: workspace.selectedPlan || "basic",
            enabledModuleIds: Array.isArray(workspace.enabledModuleIds)
              ? workspace.enabledModuleIds
              : [],
          }),
          availableCoreModules: Array.isArray(workspace.modules)
            ? workspace.modules.flatMap((category) =>
              Array.isArray(category?.items)
                ? category.items
                  .filter((item) => item?.active !== false)
                  .map((item) => ({
                    id: String(item?.id || "").trim(),
                    name: String(item?.name || "").trim(),
                  }))
                  .filter((item) => item.id)
                : [],
            )
            : [],
          organizationDepartments: departments.map((d) => ({
            _id: d.id,
            name: d.name,
            description: d.description,
            managerUser: d.managerUserId,
            adminUsers: d.adminUserIds,
            employeeUsers: d.employeeUserIds,
            moduleIds: d.moduleIds,
          })),
        },
        linkedWorkspaces,
        departments,
        teamMembers,
        transferredTeamMembers: [],
        metrics: {
          totalMembers: teamMembers.length,
          activeMembers: teamMembers.filter((member) => member.status === "joined").length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const saveOrganizationDepartment = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    if (isBasicPlan(workspace)) {
      return res.status(403).json({
        message: "Department management is not available on the Basic plan.",
      });
    }
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role")
      .populate("role")
      .lean()
      .exec();
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }
    const isEditAction = Boolean(String(req.params.departmentId || req.body?.departmentId || "").trim());
    if (!canManageDepartmentsByRole(actorMembership.role)) {
      return res.status(403).json({ message: "Only founder can manage departments." });
    }

    const departmentId = req.params.departmentId || req.body?.departmentId;
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const isActive = req.body?.isActive !== false;
    const moduleIds = Array.isArray(req.body?.moduleIds)
      ? req.body.moduleIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const managerUserId = String(req.body?.managerUserId || "").trim();
    const adminUserIds = Array.isArray(req.body?.adminUserIds)
      ? req.body.adminUserIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const employeeUserIds = Array.isArray(req.body?.employeeUserIds)
      ? req.body.employeeUserIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (!name) {
      return res.status(400).json({ message: "Department name is required." });
    }

    if (departmentId) {
      const existing = await Department.findOne({ _id: departmentId, workspaceId: workspace._id });
      if (!existing) {
        return res.status(404).json({ message: "Department not found." });
      }
      existing.name = name;
      existing.description = description;
      existing.isActive = isActive;
      existing.moduleIds = moduleIds;
      existing.managerUser = managerUserId || null;
      await existing.save();

      const allMemberUserIds = [...new Set([...adminUserIds, ...employeeUserIds])];
      const currentDeptMembers = await WorkspaceMember.find({ workspace: workspace._id, departments: existing._id }).select("user").lean();
      const currentMemberUserIds = currentDeptMembers.map((m) => String(m.user));
      const toAdd = allMemberUserIds.filter((uid) => !currentMemberUserIds.includes(uid));
      const toRemove = currentMemberUserIds.filter((uid) => !allMemberUserIds.includes(uid));
      if (toAdd.length > 0) {
        await WorkspaceMember.updateMany({ workspace: workspace._id, user: { $in: toAdd } }, { $addToSet: { departments: existing._id } });
      }
      if (toRemove.length > 0) {
        await WorkspaceMember.updateMany({ workspace: workspace._id, user: { $in: toRemove } }, { $pull: { departments: existing._id } });
      }
    } else {
      const created = await Department.create({
        name,
        description,
        workspaceId: workspace._id,
        isActive,
        moduleIds,
        managerUser: managerUserId || null,
      });

      const allMemberUserIds = [...new Set([...adminUserIds, ...employeeUserIds])];
      if (allMemberUserIds.length > 0) {
        await WorkspaceMember.updateMany({ workspace: workspace._id, user: { $in: allMemberUserIds } }, { $addToSet: { departments: created._id } });
      }
    }

    return res.status(200).json({ message: "Department saved successfully." });
  } catch (error) {
    next(error);
  }
};

export const assignOrganizationDepartmentManager = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    if (isBasicPlan(workspace)) {
      return res.status(403).json({
        message: "Department management is not available on the Basic plan.",
      });
    }
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role")
      .lean()
      .exec();
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }

    const department = await Department.findOne({ _id: req.params.departmentId, workspaceId: workspace._id });
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const managerUserId = String(req.body?.managerUserId || "").trim();
    if (!managerUserId) {
      return res.status(400).json({ message: "Manager user id is required." });
    }

    const membership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: managerUserId,
      isActive: true,
    });
    if (!membership) {
      return res.status(404).json({ message: "Member not found in this workspace." });
    }

    department.managerUser = managerUserId;
    await department.save();

    // Promote the member's role to "manager" if they are currently below that level
    const currentRoleBand = getRoleBand(membership?.role || "");
    if (currentRoleBand === "employee") {
      const managerRole = await Role.findOne({ name: "manager" }).lean();
      if (managerRole) {
        membership.role = managerRole._id;
      }
    }

    // Add this department to the manager's department list if not already there
    if (!membership.departments.some((d) => String(d) === String(department._id))) {
      membership.departments.push(department._id);
    }
    await membership.save();

    return res.status(200).json({ message: "Department manager assigned successfully." });
  } catch (error) {
    next(error);
  }
};

export const toggleOrganizationMemberStatus = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role")
      .populate("role")
      .lean()
      .exec();
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
    });
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    const action = String(req.body?.action || "").trim().toLowerCase();
    if (action === "enable") {
      member.isActive = true;
    } else if (action === "disable") {
      member.isActive = false;
    } else {
      member.isActive = !member.isActive;
    }
    member.status = member.isActive ? "joined" : "disabled";

    if (member.isActive && (!Array.isArray(member.grantedModules) || member.grantedModules.length === 0)) {
      const linkedProfile = await EmployeeProfile.findOne({
        linkedWorkspaceMemberId: member._id,
        workspaceId: workspace._id,
      }).select("accessModules").lean().exec();
      if (linkedProfile && Array.isArray(linkedProfile.accessModules) && linkedProfile.accessModules.length > 0) {
        member.grantedModules = linkedProfile.accessModules;
      }
    }

    await member.save();
    if (member.isActive === false) {
      await HostUser.findByIdAndUpdate(member.user, { refreshToken: "" }).exec();
    }

    await ensureEmployeeProfileForMember({
      workspace,
      member,
    });

    return res.status(200).json({
      message: "Member status updated successfully.",
      data: { isActive: member.isActive, status: member.status },
    });
  } catch (error) {
    next(error);
  }
};

export const inviteOrganizationMember = async (req, res, next) => {
  try {
    const { user, workspace } = await getCurrentWorkspace(req.user);
    if (!user || !workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const actorMembership = await resolveMembershipByWorkspace(
      workspace._id,
      req.user,
      "role grantedModules",
    );
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }
    if (
      !hasOrganizationAccess({
        workspace,
        membership: actorMembership,
        permissionKey: ORGANIZATION_PERMISSION_KEYS.actions.inviteMember,
      })
    ) {
      return res.status(403).json({ message: "You do not have permission to invite members." });
    }

    const name = String(req.body?.fullName || req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = String(req.body?.role || "member").trim().toLowerCase();
    const departments = Array.isArray(req.body?.departments)
      ? req.body.departments.map((d) => String(d || "").trim()).filter(Boolean)
      : [];

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    if (isBasicPlan(workspace)) {
      const actorRoleBand = getRoleBand(actorMembership?.role || user?.role || "");

      if (actorRoleBand !== "owner") {
        return res.status(403).json({
          message: "Only the founder can add users on the Basic plan.",
        });
      }

      const normalizedInviteRole = normalizeRoleForStorage(role);
      if (normalizedInviteRole !== "super_admin") {
        return res.status(400).json({
          message: "Basic plan allows only one Super Admin invite.",
        });
      }

      const activeMembers = await WorkspaceMember.find({
        workspace: workspace._id,
        isActive: true,
      })
        .select("role")
        .lean()
        .exec();

      const activeSuperAdmins = activeMembers.filter(
        (member) => getRoleBand(member?.role || "") === "super_admin",
      ).length;

      if (activeSuperAdmins >= 1) {
        return res.status(400).json({
          message: "Basic plan limit reached. Only one additional user can be added.",
        });
      }
    }

    let targetRoleDoc = await Role.findOne({ name: role });
    if (!targetRoleDoc) {
      targetRoleDoc = await Role.create({
        name: role,
        workspaceId: workspace._id,
        permissions: [],
      });
    }

    const resolvedDepartmentIds = [];
    for (const deptIdOrName of departments) {
      let dept = await Department.findOne({
        $or: [
          { _id: mongoose.isValidObjectId(deptIdOrName) ? deptIdOrName : new mongoose.Types.ObjectId() },
          { name: deptIdOrName, workspaceId: workspace._id }
        ]
      });
      if (!dept && !mongoose.isValidObjectId(deptIdOrName)) {
        dept = await Department.create({
          name: deptIdOrName,
          workspaceId: workspace._id,
          isActive: true,
        });
      }
      if (dept) {
        resolvedDepartmentIds.push(dept._id);
      }
    }

    let targetUser = await HostUser.findOne({ email });
    let isFreshInviteAccount = false;
    if (!targetUser) {
      const company = await Company.findById(user.company).lean().exec();
      if (!company) {
        return res.status(404).json({ message: "Company not found for this user." });
      }

      targetUser = await HostUser.create({
        company: company._id,
        companyId: company.companyId,
        name,
        email,
        isActive: true,
        hasCompletedWorkspaceSetup: true,
      });
      isFreshInviteAccount = true;
    }

    const isExistingRegisteredUser = !isFreshInviteAccount && !!targetUser.password;

    const workspaceMember = await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: targetUser._id },
      {
        $set: {
          role: targetRoleDoc._id,
          departments: resolvedDepartmentIds,
          isPrimary: false,
          isActive: true,
          status: isExistingRegisteredUser ? "joined" : "invited",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ensureEmployeeProfileForMember({
      workspace,
      member: workspaceMember,
      user: targetUser,
    });

    if (!isExistingRegisteredUser) {
      targetUser.inviteStatus = "invite_sent";
      targetUser.inviteSentAt = new Date();
      await targetUser.save();
    }

    const inviteSecret =
      process.env.HOST_INVITE_TOKEN_SECRET ||
      process.env.REGISTER_INVITE_SECRET ||
      process.env.ACCESS_TOKEN_SECRET;
    const frontendBase =
      String(process.env.FRONTEND_PROD_LINK || process.env.FRONTEND_DEV_LINK || "http://localhost:5173")
        .trim()
        .replace(/\/$/, "");

    let inviteLink = "";
    if (inviteSecret && targetUser && (!targetUser.password || isFreshInviteAccount)) {
      const inviteToken = jwt.sign(
        {
          inviteEmail: email,
          inviteName: name,
          inviteType: "workspace",
          selectedPlan: workspace.selectedPlan || "basic",
          businessName: workspace.businessName || "",
        },
        inviteSecret,
        { expiresIn: "7d" },
      );
      inviteLink = `${frontendBase}/register/${inviteToken}`;

      try {
        await sendMail({
          to: email,
          subject: "You are invited to WONO Host Panel",
          html: `
            <p>Hi ${name},</p>
            <p>You have been invited to join the Host Panel.</p>
            <p>Use the link below to complete your account setup:</p>
            <p><a href="${inviteLink}" target="_blank">Complete Registration</a></p>
            <p>Your name and email will be prefilled. You only need to set your password and verify OTP.</p>
            <p>This invite link expires in 7 days.</p>
          `,
        });
      } catch (mailError: any) {
        console.error("Invite email failed (member was still created):", mailError?.message || mailError);
      }
    }

    return res.status(201).json({
      message: "Organization invite sent successfully.",
      inviteMode: !targetUser?.password || isFreshInviteAccount ? "register-link" : "existing-user",
      inviteLink: inviteLink || undefined,
    });
  } catch (error) {
    next(error);
  }
};

export const assignOrganizationActingManager = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    if (isBasicPlan(workspace)) {
      return res.status(403).json({
        message: "Department management is not available on the Basic plan.",
      });
    }
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role")
      .populate("role")
      .lean()
      .exec();
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }

    const department = await Department.findOne({ _id: req.params.departmentId, workspaceId: workspace._id });
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const assignedUserId = String(req.body?.assignedUserId || "").trim();
    if (!assignedUserId) {
      return res.status(400).json({ message: "Assigned user id is required." });
    }

    let assignment = await ActingManager.findOne({
      workspaceId: workspace._id,
      departmentId: department._id,
      assignedUser: assignedUserId,
    });

    if (!assignment) {
      await ActingManager.create({
        workspaceId: workspace._id,
        departmentId: department._id,
        assignedUser: assignedUserId,
        note: String(req.body?.note || "").trim(),
        isActive: true,
      });
    } else if (!assignment.isActive) {
      assignment.isActive = true;
      assignment.note = String(req.body?.note || "").trim();
      await assignment.save();
    }

    return res.status(200).json({ message: "Acting manager assigned successfully." });
  } catch (error) {
    next(error);
  }
};

export const removeOrganizationActingManager = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    if (isBasicPlan(workspace)) {
      return res.status(403).json({
        message: "Department management is not available on the Basic plan.",
      });
    }
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role")
      .populate("role")
      .lean()
      .exec();
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }

    const departmentId = String(req.params.departmentId || "");
    const assignedUserId = String(req.params.assignedUserId || "");

    await ActingManager.updateOne(
      {
        workspaceId: workspace._id,
        departmentId,
        assignedUser: assignedUserId,
        isActive: true,
      },
      {
        $set: { isActive: false },
      }
    );

    return res.status(200).json({ message: "Acting manager removed successfully." });
  } catch (error) {
    next(error);
  }
};

export const updateOrganizationMemberRole = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role")
      .populate("role")
      .lean()
      .exec();
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    }).populate("role").populate("departments");
    if (!member) return res.status(404).json({ message: "Member not found." });

    const previousRoleBand = getRoleBand(member.role);
    const nextRoleStr = normalizeRoleForStorage(req.body?.role || getRoleName(member.role));
    const nextRoleBand = getRoleBand(nextRoleStr);

    let targetRoleDoc = await Role.findOne({ name: nextRoleStr });
    if (!targetRoleDoc) {
      targetRoleDoc = await Role.create({
        name: nextRoleStr,
        workspaceId: workspace._id,
        permissions: [],
      });
    }

    const requestedDepartmentIds = Array.isArray(req.body?.departments) ? req.body.departments : [];
    const resolvedDepartmentIds = [];
    for (const deptId of requestedDepartmentIds) {
      if (!deptId || !mongoose.isValidObjectId(deptId)) continue;
      const dept = await Department.findOne({ _id: deptId, workspaceId: workspace._id });
      if (dept) {
        resolvedDepartmentIds.push(dept._id);
      }
    }

    const isSuperAdminToAdmin = previousRoleBand === "super_admin" && nextRoleBand === "admin";
    const isAdminToManager = previousRoleBand === "admin" && nextRoleBand === "manager";
    const isManagerToAdmin = previousRoleBand === "manager" && nextRoleBand === "admin";

    if ((isSuperAdminToAdmin || isManagerToAdmin) && resolvedDepartmentIds.length === 0) {
      return res.status(400).json({
        message: "Select at least one department for this role change.",
      });
    }

    if (isAdminToManager && resolvedDepartmentIds.length !== 1) {
      return res.status(400).json({
        message: "Manager role requires exactly one department.",
      });
    }

    member.role = targetRoleDoc._id;
    if (isSuperAdminToAdmin || isAdminToManager || isManagerToAdmin) {
      member.departments = resolvedDepartmentIds;
    }
    await member.save();

    await ensureEmployeeProfileForMember({
      workspace,
      member,
    });

    return res.status(200).json({ message: "Member role updated successfully." });
  } catch (error) {
    next(error);
  }
};

export const updateOrganizationMemberAccess = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });

    const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
    if (!(actorRoleBand === "owner" || actorRoleBand === "super_admin")) {
      return res.status(403).json({
        message: "Only founder or super admin can update module access.",
      });
    }

    const memberLookupId = String(req.params.memberId || "").trim();
    let member = await WorkspaceMember.findOne({
      _id: memberLookupId,
      workspace: workspace._id,
    });

    if (!member) {
      const linkedProfile = await EmployeeProfile.findOne({
        workspaceId: workspace._id,
        $or: [{ _id: memberLookupId }, { employeeId: memberLookupId }],
      }).lean().exec();

      const linkedMemberId = String(linkedProfile?.linkedWorkspaceMemberId || "").trim();
      if (linkedMemberId) {
        member = await WorkspaceMember.findOne({
          _id: linkedMemberId,
          workspace: workspace._id,
        });
      }
    }

    if (!member) return res.status(404).json({ message: "Member not found." });

    const normalizeKey = (value = "") =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-");
    const expandAliases = (values: string[]) => {
      return new Set(values.map((item) => normalizeKey(item)).filter(Boolean));
    };

    const workspaceEnabledModuleIds = Array.isArray(workspace.enabledModuleIds)
      ? workspace.enabledModuleIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const memberEnabledModuleIds = Array.isArray(member.enabledModules)
      ? member.enabledModules.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const workspaceModuleMapIds = Array.isArray(workspace?.moduleMap?.sections)
      ? workspace.moduleMap.sections.flatMap((section: any) =>
        (Array.isArray(section?.items) ? section.items : []).flatMap((item: any) => [
          String(item?.id || "").trim(),
          ...(Array.isArray(item?.tabs)
            ? item.tabs.map((tab: any) => String(tab?.id || "").trim())
            : []),
        ]),
      ).filter(Boolean)
      : [];
    const allowedModuleKeys = expandAliases([
      ...workspaceEnabledModuleIds,
      ...memberEnabledModuleIds,
      ...workspaceModuleMapIds,
    ]);
    if (allowedModuleKeys.has(normalizeKey(ORGANIZATION_PERMISSION_KEYS.module))) {
      [
        ORGANIZATION_PERMISSION_KEYS.tabs.users,
        ORGANIZATION_PERMISSION_KEYS.tabs.departments,
        ORGANIZATION_PERMISSION_KEYS.actions.inviteMember,
        ORGANIZATION_PERMISSION_KEYS.actions.changeRole,
        ORGANIZATION_PERMISSION_KEYS.actions.toggleAccess,
        ORGANIZATION_PERMISSION_KEYS.actions.createDepartment,
        ORGANIZATION_PERMISSION_KEYS.actions.editDepartment,
        ORGANIZATION_PERMISSION_KEYS.actions.assignDepartmentManager,
        ORGANIZATION_PERMISSION_KEYS.actions.assignActingManager,
        ORGANIZATION_PERMISSION_KEYS.actions.removeActingManager,
      ]
        .map((item) => normalizeKey(item))
        .forEach((item) => allowedModuleKeys.add(item));
    }

    const nextGrantedModules = Array.isArray(req.body?.accessModules)
      ? req.body.accessModules.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    member.grantedModules = nextGrantedModules.filter((moduleId) => {
      if (moduleId.startsWith("disabled:")) {
        const targetModuleId = String(moduleId.slice("disabled:".length) || "").trim();
        return Boolean(targetModuleId) && allowedModuleKeys.has(normalizeKey(targetModuleId));
      }
      return allowedModuleKeys.has(normalizeKey(moduleId));
    });

    member.isActive = member.grantedModules.length > 0;
    member.status = member.isActive ? "joined" : "disabled";

    await member.save();

    const profileStatus = member.isActive
      ? member.status === "invited" ? "invite_sent"
        : member.status === "registered" ? "registered"
          : member.status === "joined" ? "joined"
            : "active"
      : "inactive";
    await EmployeeProfile.updateOne(
      {
        workspaceId: workspace._id,
        $or: [
          { linkedWorkspaceMemberId: member._id },
          { linkedUserId: member.user },
        ],
      },
      {
        $set: {
          accessModules: member.grantedModules,
          accessFeatures: [],
          linkedWorkspaceMemberId: member._id,
          linkedUserId: member.user,
          status: profileStatus,
          isActive: member.isActive,
        },
      },
      { upsert: false },
    ).exec();

    return res.status(200).json({
      message: "Member access updated successfully.",
      data: { memberId: toId(member._id), grantedModules: member.grantedModules },
    });
  } catch (error) {
    next(error);
  }
};

export const transferOrganizationMember = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });

    const targetWorkspaceId = String(req.body?.targetWorkspaceId || "").trim();
    if (!targetWorkspaceId) return res.status(400).json({ message: "Target workspace is required." });

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    });
    if (!member) return res.status(404).json({ message: "Member not found." });

    const targetWorkspace = await Workspace.findOne({
      _id: targetWorkspaceId,
      owner: workspace.owner,
      isActive: true,
    });
    if (!targetWorkspace) return res.status(404).json({ message: "Target workspace not found." });

    const nextRoleStr = normalizeRoleForStorage(req.body?.role || getRoleName(member.role));
    let targetRoleDoc = await Role.findOne({ name: nextRoleStr });
    if (!targetRoleDoc) {
      targetRoleDoc = await Role.create({
        name: nextRoleStr,
        workspaceId: targetWorkspace._id,
        permissions: [],
      });
    }

    const requestedDepartmentIds = Array.isArray(req.body?.departments) ? req.body.departments : [];
    const resolvedDepartmentIds = [];
    for (const deptId of requestedDepartmentIds) {
      if (!deptId || !mongoose.isValidObjectId(deptId)) continue;
      const dept = await Department.findOne({ _id: deptId, workspaceId: targetWorkspace._id });
      if (dept) {
        resolvedDepartmentIds.push(dept._id);
      }
    }

    const transferredMembership = await WorkspaceMember.findOneAndUpdate(
      { workspace: targetWorkspace._id, user: member.user },
      {
        $set: {
          role: targetRoleDoc._id,
          departments: resolvedDepartmentIds,
          status: "joined",
          isActive: true,
          grantedModules: Array.isArray(member.grantedModules) ? member.grantedModules : [],
        },
        $push: {
          transferHistory: {
            fromWorkspaceId: workspace._id,
            toWorkspaceId: targetWorkspace._id,
            previousRole: member.role,
            nextRole: targetRoleDoc._id,
            note: String(req.body?.note || "").trim(),
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ensureEmployeeProfileForMember({
      workspace: targetWorkspace,
      member: transferredMembership,
      user: await HostUser.findById(member.user).exec(),
    });

    member.isActive = false;
    member.status = "disabled";
    await member.save();

    return res.status(200).json({ message: "Member transferred successfully." });
  } catch (error) {
    next(error);
  }
};

export const linkOrganizationMember = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });

    const targetWorkspaceId = String(req.body?.targetWorkspaceId || "").trim();
    if (!targetWorkspaceId) return res.status(400).json({ message: "Target workspace is required." });

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    });
    if (!member) return res.status(404).json({ message: "Member not found." });

    const targetWorkspace = await Workspace.findOne({
      _id: targetWorkspaceId,
      owner: workspace.owner,
      isActive: true,
    });
    if (!targetWorkspace) return res.status(404).json({ message: "Target workspace not found." });

    const linkedMembership = await WorkspaceMember.findOneAndUpdate(
      { workspace: targetWorkspace._id, user: member.user },
      {
        $set: {
          role: member.role,
          departments: Array.isArray(member.departments) ? member.departments : [],
          status: "joined",
          isActive: true,
          grantedModules: Array.isArray(member.grantedModules) ? member.grantedModules : [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ensureEmployeeProfileForMember({
      workspace: targetWorkspace,
      member: linkedMembership,
      user: await HostUser.findById(member.user).exec(),
    });

    return res.status(200).json({ message: "Workspace access added successfully." });
  } catch (error) {
    next(error);
  }
};

export const transferOrganizationOwnership = async (req, res, next) => {
  try {
    const { user, workspace } = await getCurrentWorkspace(req.user);
    if (!user || !workspace) return res.status(404).json({ message: "Workspace not found for this user." });

    const targetMember = await WorkspaceMember.findOne({
      _id: req.body?.memberId,
      workspace: workspace._id,
      isActive: true,
    }).populate("role");
    if (!targetMember) return res.status(404).json({ message: "Selected member not found." });
    const normalizedTargetRole = getRoleName(targetMember.role)
      .toLowerCase()
      .replace(/-/g, "_");
    if (normalizedTargetRole !== "super_admin") {
      return res.status(400).json({
        message: "Founder access can only be transferred to a Super Admin.",
      });
    }

    const nextOwner = await HostUser.findById(targetMember.user);
    if (!nextOwner) return res.status(404).json({ message: "Selected user not found." });

    const previousOwner = await HostUser.findById(workspace.owner);
    workspace.owner = nextOwner._id;
    await workspace.save();

    let superAdminRole = await Role.findOne({ name: "super_admin" });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: "super_admin",
        isSystemRole: true,
        workspaceId: null,
        permissions: ["*"],
      });
    }

    let ownerRole = await Role.findOne({ name: "founder" });
    if (!ownerRole) {
      ownerRole = await Role.create({
        name: "founder",
        isSystemRole: true,
        workspaceId: null,
        permissions: ["*"],
      });
    }

    if (previousOwner) {
      previousOwner.role = "super_admin";
      await previousOwner.save();
      const previousOwnerMembership = await WorkspaceMember.findOneAndUpdate(
        { workspace: workspace._id, user: previousOwner._id },
        { $set: { role: superAdminRole._id, isActive: true, status: "joined" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await ensureEmployeeProfileForMember({
        workspace,
        member: previousOwnerMembership,
        user: previousOwner,
      });
    }

    nextOwner.role = "owner";
    await nextOwner.save();
    const nextOwnerMembership = await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: nextOwner._id },
      { $set: { role: ownerRole._id, isActive: true, status: "joined" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await ensureEmployeeProfileForMember({
      workspace,
      member: nextOwnerMembership,
      user: nextOwner,
    });

    return res.status(200).json({ message: "Founder access transferred successfully." });
  } catch (error) {
    next(error);
  }
};

// GET /api/organization/departments — returns active (isActive: true) departments for the current workspace.
// Use this endpoint to populate department dropdowns across the app (finance, tickets, HR, etc.).
export const getDepartments = async (req, res) => {
  try {
    const workspaceId = req.workspaceMembership?.workspace || req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID is required"
      });
    }

    const departments = await Department.find({
      workspaceId,
      isActive: true
    })
      .select("_id name description")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: departments.map(d => ({
        id: d._id,
        name: d.name,
        description: d.description || ""
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch departments"
    });
  }
};
