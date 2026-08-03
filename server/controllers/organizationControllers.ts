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
import { renderNotificationEmail } from "../utils/emailTemplates.js";
import { createNotification } from "../utils/notify.js";
import {
  buildWorkspaceModuleCatalog,
  COMMON_MODULE_IDS,
  EXTRA_COMMON_MODULE_IDS,
  getDefaultDepartmentModuleIds,
} from "../config/workspaceModuleCatalog.js";
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

// Common + Extra Common modules (Dashboard, Customer Support, Calendar,
// Assets, Inventory, Finance Management, Reports, etc.) are meant to be
// visible to every member regardless of role/department — granted to
// everyone by default, on top of whatever department/role defaults apply.
const BASELINE_MODULE_IDS = [...COMMON_MODULE_IDS, ...EXTRA_COMMON_MODULE_IDS];

const escapeEmailHtml = (value: any) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const notifyMemberAboutUnitChange = async ({
  memberUser,
  actorUserId,
  notificationWorkspaceId,
  sourceWorkspace,
  targetWorkspace,
  changeType,
}: any) => {
  if (!memberUser?._id || !targetWorkspace?._id) return;

  const isTransfer = changeType === "transfer";
  const sourceName = String(sourceWorkspace?.businessName || sourceWorkspace?.workspaceName || "your previous unit").trim();
  const targetName = String(targetWorkspace?.businessName || targetWorkspace?.workspaceName || "your new unit").trim();
  const title = isTransfer ? `Transferred to ${targetName}` : `Unit access added for ${targetName}`;
  const description = isTransfer
    ? `Your access has been transferred from ${sourceName} to ${targetName}. You can now sign in to ${targetName}, and you no longer have access to ${sourceName}.`
    : `You now have access to ${targetName}. Your existing access to ${sourceName} remains active, so you can use both units.`;

  await createNotification({
    workspaceId: String(notificationWorkspaceId || targetWorkspace._id),
    recipientUserId: String(memberUser._id),
    actorUserId: actorUserId ? String(actorUserId) : null,
    type: isTransfer ? "workspace_member_transferred" : "workspace_access_added",
    category: "system",
    title,
    description,
    entityType: "workspace",
    entityId: String(targetWorkspace._id),
    targetUrl: "/notifications",
    data: {
      changeType,
      sourceWorkspaceId: String(sourceWorkspace?._id || ""),
      sourceWorkspaceName: sourceName,
      targetWorkspaceId: String(targetWorkspace._id),
      targetWorkspaceName: targetName,
    },
    priority: "high",
    allowSelf: true,
  });

  if (!memberUser.email) return;
  const frontendBase = String(
    process.env.FRONTEND_PROD_LINK || process.env.FRONTEND_DEV_LINK || "http://localhost:5173",
  )
    .trim()
    .replace(/\/$/, "");

  try {
    await sendMail({
      to: memberUser.email,
      subject: title,
      text: description,
      html: renderNotificationEmail({
        heroTitle: isTransfer ? "Unit Transfer Confirmed" : "Unit Access Added",
        heroSubtitle: isTransfer
          ? `Your WONO access has moved to ${escapeEmailHtml(targetName)}.`
          : `You can now work in ${escapeEmailHtml(targetName)}.`,
        greetingHtml: `
          <p style="margin:0 0 4px;">Hello ${escapeEmailHtml(memberUser.name || "there")},</p>
          <p class="email-text" style="margin:0;">${escapeEmailHtml(description)}</p>
        `,
        detailRows: [
          [isTransfer ? "Transferred From" : "Existing Unit", escapeEmailHtml(sourceName)],
          [isTransfer ? "Transferred To" : "Added Unit", escapeEmailHtml(targetName)],
          ["Access", isTransfer ? "New unit only" : "Both units"],
        ],
        ctaButton: {
          label: "Open WONO Host Panel",
          href: `${frontendBase}/`,
        },
        noteHtml: isTransfer
          ? `You will not be able to use ${escapeEmailHtml(sourceName)} unless you are transferred back or unit access is added later.`
          : `Your login remains the same. Use the workspace switcher to move between ${escapeEmailHtml(sourceName)} and ${escapeEmailHtml(targetName)}.`,
      }),
    });
  } catch (mailError: any) {
    console.error("Unit access email failed (membership change was still saved):", mailError?.message || mailError);
  }
};

const notifyMemberAboutUnitRemoval = async ({
  memberUser,
  actorUserId,
  remainingWorkspace,
  removedWorkspace,
}: any) => {
  if (!memberUser?._id || !remainingWorkspace?._id || !removedWorkspace?._id) return;

  const remainingName = String(
    remainingWorkspace?.businessName || remainingWorkspace?.workspaceName || "your current unit",
  ).trim();
  const removedName = String(
    removedWorkspace?.businessName || removedWorkspace?.workspaceName || "the removed unit",
  ).trim();
  const title = `Unit access removed for ${removedName}`;
  const description =
    `Your access to ${removedName} has been removed. Your access to ${remainingName} remains active.`;

  await createNotification({
    workspaceId: String(remainingWorkspace._id),
    recipientUserId: String(memberUser._id),
    actorUserId: actorUserId ? String(actorUserId) : null,
    type: "workspace_access_removed",
    category: "system",
    title,
    description,
    entityType: "workspace",
    entityId: String(removedWorkspace._id),
    targetUrl: "/notifications",
    data: {
      changeType: "unit_access_removed",
      remainingWorkspaceId: String(remainingWorkspace._id),
      remainingWorkspaceName: remainingName,
      removedWorkspaceId: String(removedWorkspace._id),
      removedWorkspaceName: removedName,
    },
    priority: "high",
    allowSelf: true,
  });

  if (!memberUser.email) return;
  const frontendBase = String(
    process.env.FRONTEND_PROD_LINK || process.env.FRONTEND_DEV_LINK || "http://localhost:5173",
  )
    .trim()
    .replace(/\/$/, "");

  try {
    await sendMail({
      to: memberUser.email,
      subject: title,
      text: description,
      html: renderNotificationEmail({
        heroTitle: "Unit Access Removed",
        heroSubtitle: `Your access to ${escapeEmailHtml(removedName)} has changed.`,
        greetingHtml: `
          <p style="margin:0 0 4px;">Hello ${escapeEmailHtml(memberUser.name || "there")},</p>
          <p class="email-text" style="margin:0;">${escapeEmailHtml(description)}</p>
        `,
        detailRows: [
          ["Removed Unit", escapeEmailHtml(removedName)],
          ["Remaining Unit", escapeEmailHtml(remainingName)],
        ],
        ctaButton: {
          label: "Open WONO Host Panel",
          href: `${frontendBase}/`,
        },
        noteHtml: `Contact the founder if you still require access to ${escapeEmailHtml(removedName)}.`,
      }),
    });
  } catch (mailError: any) {
    console.error("Unit access removal email failed (access was still removed):", mailError?.message || mailError);
  }
};
// Role bands that get a department's full moduleIds by default. Plain
// employees get none of the department's modules automatically — a manager
// (or founder/super admin) must explicitly hand-pick which of the
// department's modules to grant a given employee, via updateOrganizationMemberAccess.
const ROLE_BANDS_WITH_MANAGER_ACCESS = new Set(["owner", "super_admin", "admin", "manager"]);

// A department manager needs these org-module grants by default, or
// hasOrganizationAccess() blocks them from the Users tab / invite action even
// though computeDepartmentDefaultModuleIds() already gives them their
// department's full module set.
const MANAGER_DEFAULT_ORG_GRANT_IDS = [
  ORGANIZATION_PERMISSION_KEYS.tabs.users,
  ORGANIZATION_PERMISSION_KEYS.actions.inviteMember,
];

// Computes the default module-id set a member should be granted purely from
// their department assignment(s) + role band. This is a *default*, applied
// additively to grantedModules — it never removes modules a founder/super
// admin has explicitly granted by hand via updateOrganizationMemberAccess.
// Plain employees always get [] here — department modules belong to the
// manager (and founder/super admin/admin) by default; an employee only gets
// specific department modules when a manager explicitly hands them over.
const computeDepartmentDefaultModuleIds = async (departmentIds = [], roleBand = "employee") => {
  if (!ROLE_BANDS_WITH_MANAGER_ACCESS.has(roleBand)) return [];

  const ids = (Array.isArray(departmentIds) ? departmentIds : []).filter(Boolean);
  if (!ids.length) return [];

  const departments = await Department.find({ _id: { $in: ids } })
    .select("moduleIds")
    .lean();

  const result = new Set();
  for (const dept of departments) {
    const moduleIds = Array.isArray(dept?.moduleIds) ? dept.moduleIds : [];
    for (const id of moduleIds) result.add(id);
  }
  return Array.from(result);
};

// Union merge — additive only, so manual grants/add-ons already on the
// member are never dropped by a default-recompute.
const computeMembershipDefaultModuleIds = async ({
  workspace,
  departmentIds = [],
  roleBand = "employee",
}: any) => {
  const departmentDefaultIds = await computeDepartmentDefaultModuleIds(departmentIds, roleBand);
  const superAdminDefaultIds =
    roleBand === "super_admin" && Array.isArray(workspace?.enabledModuleIds)
      ? workspace.enabledModuleIds
      : [];
  const managerOrgGrantIds = roleBand === "manager" ? MANAGER_DEFAULT_ORG_GRANT_IDS : [];

  const result = new Set(
    [
      ...BASELINE_MODULE_IDS,
      ...departmentDefaultIds,
      ...superAdminDefaultIds,
      ...managerOrgGrantIds,
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  );
  return Array.from(result);
};
const mergeGrantedModules = (existing = [], additions = []) => {
  const set = new Set(
    (Array.isArray(existing) ? existing : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  );
  (Array.isArray(additions) ? additions : []).forEach((item) => {
    const value = String(item || "").trim();
    if (value) set.add(value);
  });
  return Array.from(set);
};

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

// Re-applies baseline + this department's full (manager-band) module set +
// the org-invite grant to whoever currently manages this department —
// department.managerUser, plus any member whose role band is "manager" and
// who is assigned to this department (covers promotions done via role change
// rather than the "assign manager" action). Additive only. Shared by both
// saveOrganizationDepartment (manual edits) and ensureWorkspaceDepartments
// (auto-backfill of default departments' moduleIds).
const reapplyDepartmentManagerGrants = async (workspaceId, department) => {
  const managerCandidateIds = new Set(
    [department?.managerUser].filter(Boolean).map((id) => String(id)),
  );
  const members = await WorkspaceMember.find({
    workspace: workspaceId,
    departments: department._id,
  })
    .populate("role")
    .exec();
  const managerDefaultIds = await computeDepartmentDefaultModuleIds([department._id], "manager");
  for (const member of members) {
    if (getRoleBand(member.role) !== "manager" && !managerCandidateIds.has(String(member.user))) {
      continue;
    }
    member.grantedModules = mergeGrantedModules(member.grantedModules, [
      ...BASELINE_MODULE_IDS,
      ...managerDefaultIds,
      ...MANAGER_DEFAULT_ORG_GRANT_IDS,
    ]);
    await member.save();
  }
};

// A custom department's module toggles are authoritative for its linked
// manager/admin roster. Remove deselected modules unless another linked
// department still grants them, then add the currently selected defaults.
const syncDepartmentLeadershipGrants = async (workspaceId, department, removedModuleIds = []) => {
  const removedIds = new Set(
    (Array.isArray(removedModuleIds) ? removedModuleIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  );
  const members = await WorkspaceMember.find({
    workspace: workspaceId,
    departments: department._id,
    isActive: true,
  })
    .populate('role')
    .exec();

  for (const member of members) {
    const roleBand = getRoleBand(member.role);
    if (roleBand !== 'manager' && roleBand !== 'admin') continue;

    const departmentDefaultIds = await computeDepartmentDefaultModuleIds(member.departments, roleBand);
    const departmentDefaultSet = new Set(departmentDefaultIds.map((id) => String(id)));
    const preservedGrants = (Array.isArray(member.grantedModules) ? member.grantedModules : []).filter((id) => {
      const normalizedId = String(id || '').trim();
      return !removedIds.has(normalizedId) || departmentDefaultSet.has(normalizedId);
    });
    const roleAdditions = roleBand === 'manager' ? MANAGER_DEFAULT_ORG_GRANT_IDS : [];
    member.grantedModules = mergeGrantedModules(preservedGrants, [
      ...BASELINE_MODULE_IDS,
      ...departmentDefaultIds,
      ...roleAdditions,
    ]);
    await member.save();
  }
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

const isProfessionalPlan = (workspace: any) =>
  String(workspace?.selectedPlan || "basic").trim().toLowerCase() === "professional";

// Professional plan caps a workspace at 5 active users total, founder
// included — matches the Nomads pricing page's "Up to 5 Users" copy for
// Professional. Custom plan has no such cap.
const PROFESSIONAL_PLAN_MAX_USERS = 5;
const DEFAULT_DEPARTMENT_NAMES = new Set(
  DEFAULT_DEPARTMENTS.map((department) => department.name.trim().toLowerCase()),
);
const PROFESSIONAL_DEPARTMENT_NAMES = new Set(["sales", "technology"]);
const isCustomDepartmentName = (departmentName: unknown) => {
  const normalizedName = String(departmentName || "").trim().toLowerCase();
  return Boolean(normalizedName) && !DEFAULT_DEPARTMENT_NAMES.has(normalizedName);
};

const isDepartmentAllowedForWorkspacePlan = (workspace: any, departmentName: unknown) => {
  if (!isProfessionalPlan(workspace)) return true;
  const normalizedName = String(departmentName || "").trim().toLowerCase();
  return PROFESSIONAL_DEPARTMENT_NAMES.has(normalizedName) || isCustomDepartmentName(normalizedName);
};

const getWorkspaceDepartmentModuleIds = (workspace: any) => {
  const catalog = buildWorkspaceModuleCatalog({
    selectedPlan: workspace?.selectedPlan || "basic",
    enabledModuleIds: Array.isArray(workspace?.enabledModuleIds) ? workspace.enabledModuleIds : [],
  });
  const departmentSection = (catalog?.sections || []).find((section: any) => section?.sectionId === "department-accesses");
  const ids = new Set<string>();
  for (const group of departmentSection?.items || []) {
    for (const tab of group?.tabs || []) {
      const id = String(tab?.id || "").trim();
      if (id && tab?.unlockedInWorkspace === true) ids.add(id);
    }
  }
  return ids;
};


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
    selectedPlan: item.selectedPlan || "basic",
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
        moduleIds: getDefaultDepartmentModuleIds(d.name),
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

    // Self-healing backfill: any default-named department that predates this
    // default-module mapping (or was otherwise left unconfigured) gets its
    // sidebar-matching moduleIds filled in once, and its current manager (if
    // any) re-granted accordingly — additive only.
    const defaultModuleIdsByName = new Map(
      DEFAULT_DEPARTMENTS.map((d) => [d.name.trim().toLowerCase(), d.name]),
    );
    const needsBackfill = existingDepts.filter(
      (d) =>
        defaultModuleIdsByName.has(d.name.trim().toLowerCase()) &&
        (!Array.isArray(d.moduleIds) || d.moduleIds.length === 0),
    );
    for (const dept of needsBackfill) {
      const defaultIds = getDefaultDepartmentModuleIds(dept.name);
      if (!defaultIds.length) continue;
      dept.moduleIds = defaultIds;
      await dept.save();
      await reapplyDepartmentManagerGrants(workspace._id, dept);
    }

    return Department.find({ workspaceId: workspace._id });
  }

  const toCreate = DEFAULT_DEPARTMENTS.map((d) => ({
    name: d.name,
    description: d.description,
    workspaceId: workspace._id,
    isActive: true,
    moduleIds: getDefaultDepartmentModuleIds(d.name),
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
      .select("role grantedModules departments")
      .populate("role")
      .lean()
      .exec();
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }

    const actorRoleBand = getRoleBand(actorMembership.role);

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
          .populate("user", "name email isActive isDeleted")
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
          accountDeleted: Boolean(selfMember.user?.isDeleted),
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
          departments: restrictedDepts.map((d: any) => ({
            id: toId(d._id),
            name: d.name,
            isActive: true,
            moduleIds: Array.isArray(d.moduleIds) ? d.moduleIds : [],
          })),
          teamMembers: selfEntry ? [selfEntry] : [],
          linkedWorkspaces: [],
          accessRestricted: true,
        },
      });
    }

    const activeDepartments = await ensureWorkspaceDepartments(workspace);

    const members = await WorkspaceMember.find({ workspace: workspace._id })
      .populate("user", "name email isActive inviteStatus isDeleted")
      .populate("role")
      .populate("departments")
      .lean()
      .exec();

    const inactiveMemberUserIds = members
      .filter((member) => member.isActive === false)
      .map((member) => member.user?._id)
      .filter(Boolean);
    const activeDestinationMemberships = inactiveMemberUserIds.length
      ? await WorkspaceMember.find({
          user: { $in: inactiveMemberUserIds },
          workspace: { $ne: workspace._id },
          isActive: true,
          transferHistory: {
            $elemMatch: {
              fromWorkspaceId: workspace._id,
            },
          },
        })
          .select("user")
          .lean()
          .exec()
      : [];
    const transferredUserIds = new Set(
      activeDestinationMemberships.map((member) => toId(member.user)),
    );
    const activeMembers = members.filter(
      (member) => !(member.isActive === false && transferredUserIds.has(toId(member.user?._id))),
    );

    const allActingManagers = await ActingManager.find({
      workspaceId: workspace._id,
      isActive: true,
    })
      .lean()
      .exec();

    const employeeProfiles = await EmployeeProfile.find({
      workspaceId: workspace._id,
      linkedWorkspaceMemberId: { $in: members.map((m) => m._id) },
    })
      .select("linkedWorkspaceMemberId employeeId")
      .lean()
      .exec();

    const employeeIdByMemberId = new Map(
      employeeProfiles
        .filter((ep) => ep.linkedWorkspaceMemberId)
        .map((ep) => [String(ep.linkedWorkspaceMemberId), ep.employeeId]),
    );

    // A department manager (not owner/super_admin/admin) only manages their
    // own department(s) — scope the visible departments/members down to that,
    // instead of the whole company, even though hasOrganizationAccess() above
    // already lets them past the Users tab gate.
    let visibleDepartments = activeDepartments;
    let visibleMembers = activeMembers;
    if (actorRoleBand === "manager") {
      const actorDepartmentIds = new Set(
        (Array.isArray(actorMembership.departments) ? actorMembership.departments : []).map((d) =>
          toId(d?._id || d),
        ),
      );
      visibleDepartments = activeDepartments.filter((department) =>
        actorDepartmentIds.has(toId(department._id)),
      );
      visibleMembers = activeMembers.filter((member) =>
        (Array.isArray(member.departments) ? member.departments : []).some((dept: any) =>
          actorDepartmentIds.has(toId(dept?._id || dept)),
        ),
      );
    }

    const departments = visibleDepartments.map((department) => {
      const departmentMembers = activeMembers.filter((member) =>
        (Array.isArray(member.departments) ? member.departments : []).some(
          (dept: any) => toId(dept?._id || dept) === toId(department._id),
        ),
      );
      const departmentRosterMembers = departmentMembers.filter((member) => {
        const roleBand = getRoleBand(member.role);
        return roleBand === 'manager' || roleBand === 'admin' || roleBand === 'employee';
      });

      const managerMember = department?.managerUser
        ? activeMembers.find((member) => toId(member.user?._id) === toId(department.managerUser))
        : null;

      return {
        id: toId(department?._id),
        name: department?.name || "",
        description: department?.description || "",
        color: "bg-blue-600",
        moduleIds: Array.isArray(department?.moduleIds) ? department.moduleIds : [],
        managerUserId: toId(department?.managerUser),
        managerName: managerMember?.user?.name || "",
        adminUserIds: departmentRosterMembers.filter((m) => getRoleBand(m.role) === "admin").map((m) => toId(m.user?._id)),
        employeeUserIds: departmentRosterMembers.filter((m) => getRoleBand(m.role) === "employee").map((m) => toId(m.user?._id)),
        employeeCount: departmentRosterMembers.length,
        employees: departmentRosterMembers.map((member) => ({
          id: toId(member._id),
          userId: toId(member.user?._id),
          name: member.user?.name || "",
          email: member.user?.email || "",
          employeeId: employeeIdByMemberId.get(String(member._id)) || "",
          joinedAt: member.createdAt || null,
          role: toRoleLabel(member.role),
          status: resolveMemberStatus(member.isActive !== false, member.user?.inviteStatus),
          accountDeleted: Boolean(member.user?.isDeleted),
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

    const transferredTeamMembers = members
      .filter((member) => member.isActive === false)
      .map((member) => {
        const destinationMemberships = linkedMemberships.filter(
          (linkedMember: any) =>
            toId(linkedMember.user) === toId(member.user?._id) &&
            toId(linkedMember.workspace) !== toId(workspace._id),
        );
        const matchingTransfers = destinationMemberships.flatMap((destinationMember: any) =>
          (Array.isArray(destinationMember.transferHistory) ? destinationMember.transferHistory : [])
            .filter(
              (entry: any) =>
                toId(entry?.fromWorkspaceId) === toId(workspace._id) &&
                toId(entry?.toWorkspaceId) === toId(destinationMember.workspace),
            )
            .map((entry: any) => ({ entry, destinationMember })),
        );
        const latestTransfer = matchingTransfers.sort(
          (a: any, b: any) =>
            new Date(b.entry?.transferredAt || 0).getTime() -
            new Date(a.entry?.transferredAt || 0).getTime(),
        )[0];
        if (!latestTransfer) return null;

        const destinationWorkspace = linkedWorkspaces.find(
          (item) => String(item.id) === toId(latestTransfer.destinationMember.workspace),
        );
        return {
          id: toId(member._id),
          userId: toId(member.user?._id),
          name: member.user?.name || "",
          email: member.user?.email || "",
          employeeId: employeeIdByMemberId.get(String(member._id)) || "",
          role: toRoleLabel(member.role),
          previousRole: toRoleLabel(member.role),
          previousDepartments: Array.isArray(member.departments)
            ? member.departments.map((department: any) => department?.name || String(department))
            : [],
          transferredToWorkspaceName:
            destinationWorkspace?.workspaceName || destinationWorkspace?.businessName || "Linked Unit",
          transferredToWorkspaceLocation: destinationWorkspace?.location || "",
          transferredAt: latestTransfer.entry?.transferredAt || member.updatedAt,
        };
      })
      .filter(Boolean);
    const teamMembers = visibleMembers.map((member) => ({
      id: toId(member._id),
      userId: toId(member.user?._id),
      name: member.user?.name || "",
      email: member.user?.email || "",
      employeeId: employeeIdByMemberId.get(String(member._id)) || "",
      role: toRoleLabel(member.role),
      status: resolveMemberStatus(member.isActive !== false, member.user?.inviteStatus),
      accountDeleted: Boolean(member.user?.isDeleted),
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
        transferredTeamMembers,
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
    if (!canManageDepartmentsByRole(actorMembership.role)) {
      return res.status(403).json({ message: "Only founder can manage departments." });
    }

    const departmentId = String(req.params.departmentId || req.body?.departmentId || "").trim();
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const isActive = req.body?.isActive !== false;
    const hasModuleIdsPayload = Array.isArray(req.body?.moduleIds);
    const moduleIds = hasModuleIdsPayload
      ? Array.from(new Set(req.body.moduleIds.map((item) => String(item || "").trim()).filter(Boolean)))
      : [];
    const hasMemberAssignmentPayload =
      Array.isArray(req.body?.adminUserIds) || Array.isArray(req.body?.employeeUserIds);
    const hasManagerPayload = Object.prototype.hasOwnProperty.call(req.body || {}, "managerUserId");
    const managerUserId = String(req.body?.managerUserId || "").trim();
    const adminUserIds = Array.isArray(req.body?.adminUserIds)
      ? req.body.adminUserIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const employeeUserIds = Array.isArray(req.body?.employeeUserIds)
      ? req.body.employeeUserIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "Department name must contain 2 to 80 characters." });
    }
    if (description.length > 240) {
      return res.status(400).json({ message: "Department description cannot exceed 240 characters." });
    }
    if (!departmentId && isBasicPlan(workspace)) {
      return res.status(403).json({ message: "Custom departments are available on Professional and Custom plans." });
    }
    if (departmentId && !isDepartmentAllowedForWorkspacePlan(workspace, name)) {
      return res.status(403).json({ message: "This department is not enabled for the Professional plan." });
    }

    const duplicateCandidates = await Department.find({ workspaceId: workspace._id })
      .select("_id name")
      .lean();
    const existingCustomDepartment = duplicateCandidates.find((department) =>
      isCustomDepartmentName(department?.name),
    );
    if (!departmentId && existingCustomDepartment) {
      return res.status(409).json({
        message: "Only one custom department can be created. Edit the existing custom department instead.",
      });
    }
    if (
      departmentId &&
      isCustomDepartmentName(name) &&
      existingCustomDepartment &&
      String(existingCustomDepartment._id) !== departmentId
    ) {
      return res.status(409).json({
        message: "Only one custom department can exist in a workspace.",
      });
    }

    const duplicateName = duplicateCandidates.find(
      (department) => String(department?.name || "").trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicateName && String(duplicateName._id) !== departmentId) {
      return res.status(409).json({ message: "A department with this name already exists." });
    }
    if (!departmentId && (hasMemberAssignmentPayload || hasManagerPayload)) {
      return res.status(400).json({ message: "Create the department first, then assign users from Add User." });
    }

    if (hasModuleIdsPayload) {
      const assignableModuleIds = getWorkspaceDepartmentModuleIds(workspace);
      if (moduleIds.some((id) => !assignableModuleIds.has(id))) {
        return res.status(400).json({ message: "One or more selected core modules are not enabled for this workspace." });
      }
    }
    if (!departmentId && moduleIds.length === 0) {
      return res.status(400).json({ message: "Select at least one core module." });
    }

    let savedDepartment;
    if (departmentId) {
      const existing = await Department.findOne({ _id: departmentId, workspaceId: workspace._id });
      if (!existing) {
        return res.status(404).json({ message: "Department not found." });
      }
      const previousModuleIds = Array.isArray(existing.moduleIds) ? [...existing.moduleIds] : [];
      existing.name = name;
      existing.description = description;
      existing.isActive = isActive;
      if (hasModuleIdsPayload) existing.moduleIds = moduleIds;
      if (hasManagerPayload) existing.managerUser = managerUserId || null;
      await existing.save();
      savedDepartment = existing;

      const allMemberUserIds = [...new Set([...adminUserIds, ...employeeUserIds])];
      const currentDeptMembers = await WorkspaceMember.find({ workspace: workspace._id, departments: existing._id }).select("user").lean();
      const currentMemberUserIds = currentDeptMembers.map((m) => String(m.user));
      const toAdd = allMemberUserIds.filter((uid) => !currentMemberUserIds.includes(uid));
      const toRemove = hasMemberAssignmentPayload ? currentMemberUserIds.filter((uid) => !allMemberUserIds.includes(uid)) : [];
      if (toAdd.length > 0) {
        await WorkspaceMember.updateMany({ workspace: workspace._id, user: { $in: toAdd } }, { $addToSet: { departments: existing._id } });
      }
      if (toRemove.length > 0) {
        await WorkspaceMember.updateMany({ workspace: workspace._id, user: { $in: toRemove } }, { $pull: { departments: existing._id } });
      }

      // Re-apply default module grants additively for the current admin
      // roster every save, so editing moduleIds also refreshes existing
      // members' defaults. This never removes a manual grant/add-on — only
      // adds. Employees are intentionally excluded:
      // department modules belong to the manager/admin by default; an
      // employee only gets specific ones via updateOrganizationMemberAccess.
      const adminDefaultIds = await computeDepartmentDefaultModuleIds([existing._id], "admin");
      if (adminUserIds.length > 0) {
        await Promise.all(
          adminUserIds.map(async (uid) => {
            const member = await WorkspaceMember.findOne({ workspace: workspace._id, user: uid });
            if (!member) return;
            member.grantedModules = mergeGrantedModules(member.grantedModules, adminDefaultIds);
            await member.save();
          }),
        );
      }

      // Also re-apply to this department's manager(s) — a manager is tracked
      // separately from adminUserIds/employeeUserIds (via department.managerUser
      // and/or role band "manager"), so without this a manager assigned before
      // moduleIds were configured would never see the update after the founder
      // later fills in the department's module list.
      if (hasModuleIdsPayload) {
        const selectedModuleIds = new Set(moduleIds.map((id) => String(id)));
        const removedModuleIds = previousModuleIds.filter((id) => !selectedModuleIds.has(String(id)));
        await syncDepartmentLeadershipGrants(workspace._id, existing, removedModuleIds);
      }
    } else {
      savedDepartment = await Department.create({
        name,
        description,
        workspaceId: workspace._id,
        isActive,
        moduleIds,
        managerUser: null,
      });

      const allMemberUserIds = [...new Set([...adminUserIds, ...employeeUserIds])];
      if (allMemberUserIds.length > 0) {
        await WorkspaceMember.updateMany({ workspace: workspace._id, user: { $in: allMemberUserIds } }, { $addToSet: { departments: savedDepartment._id } });
      }

      const adminDefaultIds = await computeDepartmentDefaultModuleIds([savedDepartment._id], "admin");
      if (adminUserIds.length > 0) {
        await Promise.all(
          adminUserIds.map(async (uid) => {
            const member = await WorkspaceMember.findOne({ workspace: workspace._id, user: uid });
            if (!member) return;
            member.grantedModules = mergeGrantedModules(member.grantedModules, adminDefaultIds);
            await member.save();
          }),
        );
      }
    }

    return res.status(departmentId ? 200 : 201).json({
      message: departmentId ? "Department saved successfully." : "Department created successfully.",
      data: {
        department: {
          id: String(savedDepartment._id),
          name: savedDepartment.name,
          description: savedDepartment.description || "",
          moduleIds: Array.isArray(savedDepartment.moduleIds) ? savedDepartment.moduleIds : [],
        },
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A department with this name already exists." });
    }
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
    }).populate("role");
    if (!membership) {
      return res.status(404).json({ message: "Member not found in this workspace." });
    }

    const previousManagerUserId = String(department.managerUser || "").trim();
    department.managerUser = managerUserId;

    // Promote the member's role to "manager" if they are currently below that level
    const currentRoleBand = getRoleBand(membership?.role || "");
    if (currentRoleBand === "employee") {
      const managerRole = await Role.findOne({ name: "manager" }).lean();
      if (managerRole) {
        membership.role = managerRole._id;
      }
    }

    // A department manager belongs to exactly one department.
    membership.departments = [department._id];

    // Grant baseline (common + extra-common + key apps) modules, this
    // department's full module set (including manager-only modules), and the
    // org-invite grant needed to add department members — additive only,
    // never strips a manual grant/add-on already on the member. Previously
    // this endpoint saved the role/department change but never touched
    // grantedModules at all, leaving a freshly assigned manager with no
    // visible modules.
    const managerDepartmentIds = membership.departments.map((d) => d?._id || d);
    const managerDepartmentDefaultIds = await computeDepartmentDefaultModuleIds(
      managerDepartmentIds,
      "manager",
    );
    membership.grantedModules = mergeGrantedModules(membership.grantedModules, [
      ...BASELINE_MODULE_IDS,
      ...managerDepartmentDefaultIds,
      ...MANAGER_DEFAULT_ORG_GRANT_IDS,
    ]);

    await department.save();

    if (previousManagerUserId && previousManagerUserId !== managerUserId) {
      const previousManager = await WorkspaceMember.findOne({
        workspace: workspace._id,
        user: previousManagerUserId,
        isActive: true,
      }).populate("role");
      if (previousManager && getRoleBand(previousManager.role) === "manager") {
        const employeeRole = await Role.findOne({ name: "employee" }).lean();
        if (employeeRole) previousManager.role = employeeRole._id;
        previousManager.departments = (previousManager.departments || []).filter(
          (departmentId) => String(departmentId?._id || departmentId) !== String(department._id),
        );
        await previousManager.save();
        await ensureEmployeeProfileForMember({ workspace, member: previousManager });
      }
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
    const nextIsActive = action === "enable"
      ? true
      : action === "disable"
        ? false
        : !member.isActive;

    if (nextIsActive && !member.isActive && isProfessionalPlan(workspace)) {
      const activeMemberCount = await WorkspaceMember.countDocuments({
        workspace: workspace._id,
        isActive: true,
        _id: { $ne: member._id },
      });
      if (activeMemberCount >= PROFESSIONAL_PLAN_MAX_USERS) {
        return res.status(400).json({
          message: "Only 5 users can be enabled at a time. Disable one user to enable another.",
        });
      }
    }

    // A deleted account stays disabled — its workspace access can only be
    // turned off, never re-enabled, even if the founder toggles it.
    if (nextIsActive) {
      const linkedUser = await HostUser.findById(member.user)
        .select("isDeleted")
        .lean()
        .exec();
      if (linkedUser?.isDeleted) {
        return res.status(400).json({
          message:
            "This account has been deleted and cannot be re-enabled. Only its access can be disabled.",
        });
      }
    }

    member.isActive = nextIsActive;
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
      "role grantedModules departments",
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

    const actorRoleBand = getRoleBand(actorMembership.role);

    const name = String(req.body?.fullName || req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = String(req.body?.role || "member").trim().toLowerCase();
    let departments = Array.isArray(req.body?.departments)
      ? req.body.departments.map((d) => String(d || "").trim()).filter(Boolean)
      : [];

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }
    if (name.length > 80) {
      return res.status(400).json({ message: "Name cannot exceed 80 characters." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid work email address." });
    }

    const existingUserWithEmail = await HostUser.findOne({ email }).select("_id").lean();
    if (existingUserWithEmail) {
      return res.status(409).json({
        message: "Email already used. Try using a different email.",
      });
    }

    // A department manager may only add employee-level members, and only into
    // their own department(s) — never another department, and never a
    // manager/admin/super_admin. Owner/super_admin/admin inviters are
    // unrestricted (governed by hasOrganizationAccess above instead).
    if (actorRoleBand === "manager") {
      if (getRoleBand(role) !== "employee") {
        return res.status(403).json({
          message: "Managers can only add employee-level members.",
        });
      }
      const actorDepartmentIds = (
        Array.isArray(actorMembership.departments) ? actorMembership.departments : []
      ).map((d) => String(d?._id || d));
      if (!actorDepartmentIds.length) {
        return res.status(403).json({ message: "You are not assigned to a department yet." });
      }
      departments = actorDepartmentIds;
    }

    const normalizedInviteRole = normalizeRoleForStorage(role);

    if (isBasicPlan(workspace)) {
      const actorRoleBand = getRoleBand(actorMembership?.role || user?.role || "");

      if (actorRoleBand !== "owner") {
        return res.status(403).json({
          message: "Only the founder can add users on the Basic plan.",
        });
      }

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

    if (isProfessionalPlan(workspace)) {
      const activeMemberCount = await WorkspaceMember.countDocuments({
        workspace: workspace._id,
        isActive: true,
      });
      if (activeMemberCount >= PROFESSIONAL_PLAN_MAX_USERS) {
        return res.status(400).json({
          message: "No more users can be added. Disable one user to add another.",
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
      if (!dept) {
        return res.status(400).json({ message: "Select a valid existing department." });
      }
      if (!isDepartmentAllowedForWorkspacePlan(workspace, dept.name)) {
        return res.status(403).json({ message: "This department is not enabled for the Professional plan." });
      }
      if (dept) {
        resolvedDepartmentIds.push(dept._id);
      }
    }

    const uniqueResolvedDepartmentIds = Array.from(
      new Set(resolvedDepartmentIds.map((departmentId) => String(departmentId || "")).filter(Boolean)),
    );

    if (normalizedInviteRole === "super_admin") {
      departments = [];
    } else if (normalizedInviteRole === "admin") {
      if (uniqueResolvedDepartmentIds.length === 0) {
        return res.status(400).json({
          message: "Admin must be assigned to at least one department.",
        });
      }
    } else if (normalizedInviteRole === "manager" || normalizedInviteRole === "employee") {
      if (uniqueResolvedDepartmentIds.length !== 1) {
        return res.status(400).json({
          message:
            normalizedInviteRole === "manager"
              ? "Manager must be assigned to exactly one department."
              : "Employee must be assigned to exactly one department.",
        });
      }
    }
    if (normalizedInviteRole === "manager") {
      const managerDepartmentId = uniqueResolvedDepartmentIds[0];
      const targetDepartment = await Department.findOne({
        _id: managerDepartmentId,
        workspaceId: workspace._id,
      })
        .select("managerUser")
        .lean();
      const existingDepartmentManagers = await WorkspaceMember.find({
        workspace: workspace._id,
        departments: managerDepartmentId,
        isActive: true,
      })
        .select("role")
        .populate("role")
        .lean()
        .exec();
      const hasExistingManager = Boolean(targetDepartment?.managerUser)
        || existingDepartmentManagers.some((member) => getRoleBand(member?.role || "") === "manager");
      if (hasExistingManager) {
        return res.status(409).json({ message: "This department already has a manager assigned." });
      }
    }


    const company = await Company.findById(user.company).lean().exec();
    if (!company) {
      return res.status(404).json({ message: "Company not found for this user." });
    }

    let targetUser;
    try {
      targetUser = await HostUser.create({
        company: company._id,
        companyId: company.companyId,
        name,
        email,
        isActive: true,
        hasCompletedWorkspaceSetup: true,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json({
          message: "Email already used. Try using a different email.",
        });
      }
      throw error;
    }

    const isExistingRegisteredUser = false;

    if (normalizedInviteRole === "manager") {
      const managerDepartmentId = uniqueResolvedDepartmentIds[0];
      const targetDepartment = await Department.findOne({
        _id: managerDepartmentId,
        workspaceId: workspace._id,
      })
        .select("managerUser")
        .lean();

      const existingDepartmentManagers = await WorkspaceMember.find({
        workspace: workspace._id,
        departments: managerDepartmentId,
        isActive: true,
        user: { $ne: targetUser._id },
      })
        .select("role")
        .populate("role")
        .lean()
        .exec();

      const hasExistingManager = Boolean(
        targetDepartment?.managerUser && String(targetDepartment.managerUser) !== String(targetUser._id),
      ) || existingDepartmentManagers.some((member) => getRoleBand(member?.role || "") === "manager");

      if (hasExistingManager) {
        return res.status(400).json({
          message: "This department already has a manager assigned.",
        });
      }
    }

    // Default module grants: derived from department assignment + role band,
    // applied additively (never overwrites an existing manual grant/add-on).
    // Super admin is treated as a trusted co-owner — defaults to every module
    // the workspace currently has enabled, on top of any department defaults.
    const inviteRoleBand = getRoleBand(role);
    const departmentDefaultIds = await computeDepartmentDefaultModuleIds(
      uniqueResolvedDepartmentIds,
      inviteRoleBand,
    );
    const superAdminDefaultIds =
      inviteRoleBand === "super_admin"
        ? (Array.isArray(workspace?.enabledModuleIds) ? workspace.enabledModuleIds : [])
        : [];
    // A newly invited department manager also needs the org-invite grant so
    // they can in turn add their own department's employees.
    const managerOrgGrantIds = inviteRoleBand === "manager" ? MANAGER_DEFAULT_ORG_GRANT_IDS : [];
    const existingMemberForGrants = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: targetUser._id,
    })
      .select("grantedModules")
      .lean();
    const nextGrantedModules = mergeGrantedModules(existingMemberForGrants?.grantedModules, [
      ...BASELINE_MODULE_IDS,
      ...departmentDefaultIds,
      ...superAdminDefaultIds,
      ...managerOrgGrantIds,
    ]);

    const workspaceMember = await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: targetUser._id },
      {
        $set: {
          role: targetRoleDoc._id,
          departments: uniqueResolvedDepartmentIds,
          isPrimary: false,
          isActive: true,
          status: isExistingRegisteredUser ? "joined" : "invited",
          grantedModules: nextGrantedModules,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (normalizedInviteRole === "manager") {
      await Department.updateOne(
        { _id: uniqueResolvedDepartmentIds[0], workspaceId: workspace._id },
        { $set: { managerUser: targetUser._id } },
      );
    }

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
          subject: "You're Invited to WONO",
          html: renderNotificationEmail({
            heroTitle: "You're Invited to WONO",
            heroSubtitle: `Join ${workspace.businessName || "your team"} on WONO.`,
            greetingHtml: `
              <p style="margin:0 0 4px;">Hello ${name},</p>
              <p class="email-text" style="margin:0;">You have been invited to join the WONO Host Panel${workspace.businessName ? ` for <b class="email-heading">${workspace.businessName}</b>` : ""}. Complete your account setup to get started.</p>
            `,
            ctaButton: {
              label: "Complete Registration",
              href: inviteLink,
              caption: "Your name and email will be prefilled — you only need to set your password and verify OTP.",
            },
            noteHtml:
              "This invite link expires in 7 days.<br/>This signup invitation is intended only for you — for your security, do not share this link with anyone.",
          }),
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

export const cancelOrganizationInvite = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const actorMembership = await resolveMembershipByWorkspace(
      workspace._id,
      req.user,
      "role grantedModules departments",
    );
    if (!actorMembership) {
      return res.status(403).json({ message: "You do not have workspace access." });
    }
    const actorRoleBand = getRoleBand(actorMembership.role);
    if (actorRoleBand !== "owner" && actorRoleBand !== "super_admin") {
      return res.status(403).json({
        message: "Only the founder or a super admin can remove invited members.",
      });
    }

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
    });
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    const targetUser = await HostUser.findById(member.user);
    if (!targetUser) {
      return res.status(404).json({ message: "Invited user not found." });
    }
    if (targetUser.password || ["registered", "joined"].includes(targetUser.inviteStatus)) {
      return res.status(400).json({
        message: "This person has already registered and can no longer be removed.",
      });
    }

    await Department.updateMany(
      { workspaceId: workspace._id, managerUser: targetUser._id },
      { $set: { managerUser: null } },
    );
    await EmployeeProfile.deleteOne({ linkedWorkspaceMemberId: member._id, workspaceId: workspace._id });
    await WorkspaceMember.deleteOne({ _id: member._id });
    await HostUser.deleteOne({ _id: targetUser._id });

    return res.status(200).json({
      message: "Invite removed. This email can be invited again.",
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
    const actorRoleBand = getRoleBand(actorMembership.role);
    if (actorRoleBand !== "owner" && actorRoleBand !== "super_admin") {
      return res.status(403).json({ message: "Only the founder or a super admin can promote or demote members." });
    }
    if (isBasicPlan(workspace)) {
      return res.status(403).json({ message: "Role changes aren't needed on the Basic plan." });
    }

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    }).populate("role").populate("departments");
    if (!member) return res.status(404).json({ message: "Member not found." });

    if (String(member.user) === String(req.user)) {
      return res.status(400).json({ message: "You cannot change your own role." });
    }

    const linkedUser = await HostUser.findById(member.user)
      .select("isDeleted")
      .lean()
      .exec();
    if (linkedUser?.isDeleted) {
      return res.status(400).json({
        message:
          "This account has been deleted and cannot have its role changed.",
      });
    }

    const previousRoleBand = getRoleBand(member.role);
    if (previousRoleBand === "owner") {
      return res.status(403).json({ message: "Transfer ownership instead to change the founder's role." });
    }

    const nextRoleStr = normalizeRoleForStorage(req.body?.role || getRoleName(member.role));
    const nextRoleBand = getRoleBand(nextRoleStr);
    if (nextRoleBand === "owner") {
      return res.status(400).json({ message: "Use ownership transfer to make someone the founder." });
    }

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
      if (dept && !isDepartmentAllowedForWorkspacePlan(workspace, dept.name)) {
        return res.status(403).json({ message: "This department is not enabled for the Professional plan." });
      }
      if (dept) {
        resolvedDepartmentIds.push(dept._id);
      }
    }

    if (nextRoleBand === "admin" && resolvedDepartmentIds.length === 0) {
      return res.status(400).json({ message: "Select at least one department for this role change." });
    }
    if ((nextRoleBand === "manager" || nextRoleBand === "employee") && resolvedDepartmentIds.length !== 1) {
      return res.status(400).json({
        message: nextRoleBand === "manager"
          ? "Manager role requires exactly one department."
          : "Employee role requires exactly one department.",
      });
    }

    if (nextRoleBand === "manager") {
      const managerDepartmentId = resolvedDepartmentIds[0];
      const targetDepartment = await Department.findOne({
        _id: managerDepartmentId,
        workspaceId: workspace._id,
      }).select("managerUser").lean();
      const competingManagers = await WorkspaceMember.find({
        workspace: workspace._id,
        departments: managerDepartmentId,
        isActive: true,
        _id: { $ne: member._id },
      }).select("role").populate("role").lean();
      const hasCompetingManager = Boolean(
        targetDepartment?.managerUser && String(targetDepartment.managerUser) !== String(member.user),
      ) || competingManagers.some((candidate) => getRoleBand(candidate?.role || "") === "manager");
      if (hasCompetingManager) {
        return res.status(409).json({ message: "This department already has a manager assigned." });
      }
    }

    const previousDepartmentIds = (Array.isArray(member.departments) ? member.departments : []).map(
      (d) => d?._id || d,
    );

    member.role = targetRoleDoc._id;
    if (["admin", "manager", "employee"].includes(nextRoleBand)) {
      member.departments = resolvedDepartmentIds;
    } else if (nextRoleBand === "super_admin") {
      member.departments = [];
    }

    // Recompute default module grants for the new department/role combo, and
    // strip whichever *previous*-role auto-grants no longer apply (e.g. a
    // demoted admin loses their old department's module set, a demoted super
    // admin loses the workspace-wide grant) — manual grants/add-ons that were
    // never part of an auto-grant set are left untouched either way.
    const previousDepartmentDefaultIds = await computeDepartmentDefaultModuleIds(
      previousDepartmentIds,
      previousRoleBand,
    );
    const previousSuperAdminDefaultIds =
      previousRoleBand === "super_admin"
        ? (Array.isArray(workspace?.enabledModuleIds) ? workspace.enabledModuleIds : [])
        : [];
    const previousManagerOrgGrantIds = previousRoleBand === "manager" ? MANAGER_DEFAULT_ORG_GRANT_IDS : [];
    const staleAutoGrantIds = new Set(
      [...previousDepartmentDefaultIds, ...previousSuperAdminDefaultIds, ...previousManagerOrgGrantIds].map(toId),
    );

    const nextDepartmentIds = (member.departments || []).map((d) => d?._id || d);
    const departmentDefaultIds = await computeDepartmentDefaultModuleIds(
      nextDepartmentIds,
      nextRoleBand,
    );
    const superAdminDefaultIds =
      nextRoleBand === "super_admin"
        ? (Array.isArray(workspace?.enabledModuleIds) ? workspace.enabledModuleIds : [])
        : [];
    // A member promoted to department manager also needs the org-invite grant
    // so they can in turn add their own department's employees.
    const managerOrgGrantIds = nextRoleBand === "manager" ? MANAGER_DEFAULT_ORG_GRANT_IDS : [];
    const nextAutoGrantIds = new Set(
      [...BASELINE_MODULE_IDS, ...departmentDefaultIds, ...superAdminDefaultIds, ...managerOrgGrantIds].map(toId),
    );

    const retainedGrantedModules = (Array.isArray(member.grantedModules) ? member.grantedModules : []).filter(
      (moduleId) => {
        const normalized = toId(moduleId);
        // Keep it unless it was only ever granted by the previous role's auto-grant
        // and the new role's auto-grant no longer covers it.
        return !staleAutoGrantIds.has(normalized) || nextAutoGrantIds.has(normalized);
      },
    );
    member.grantedModules = mergeGrantedModules(retainedGrantedModules, [
      ...BASELINE_MODULE_IDS,
      ...departmentDefaultIds,
      ...superAdminDefaultIds,
      ...managerOrgGrantIds,
    ]);

    await member.save();
    // Always clear any department this member currently manages before
    // re-applying — covers demotion away from manager AND reassignment to a
    // different department while staying in the manager band.
    await Department.updateMany(
      { workspaceId: workspace._id, managerUser: member.user },
      { $set: { managerUser: null } },
    );
    if (nextRoleBand === "manager") {
      await Department.updateOne(
        { _id: resolvedDepartmentIds[0], workspaceId: workspace._id },
        { $set: { managerUser: member.user } },
      );
    }

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
    const isOwnerOrSuperAdmin = actorRoleBand === "owner" || actorRoleBand === "super_admin";
    const isManagerActor = actorRoleBand === "manager";
    if (!isOwnerOrSuperAdmin && !isManagerActor) {
      return res.status(403).json({
        message: "Only founder, super admin, or a department manager can update module access.",
      });
    }

    const memberLookupId = String(req.params.memberId || "").trim();
    let member = await WorkspaceMember.findOne({
      _id: memberLookupId,
      workspace: workspace._id,
      isActive: true,
    }).populate("departments");
    if (!member) return res.status(404).json({ message: "Member not found." });

    const linkedUser = await HostUser.findById(member.user)
      .select("isDeleted")
      .lean()
      .exec();
    if (linkedUser?.isDeleted) {
      return res.status(400).json({
        message:
          "This account has been deleted and cannot have its access changed.",
      });
    }

    // Managers may only manage employee-level access, only for members who
    // share at least one department with them, and only for that shared
    // department's modules (the same full set the manager themselves holds).
    // Everything outside that scope is left untouched below. Owner/super_admin
    // remain unrestricted (managerControllableIds stays null).
    let managerControllableIds = null;
    if (isManagerActor) {
      const targetRoleBand = getRoleBand(member.role);
      if (targetRoleBand !== "employee") {
        return res.status(403).json({
          message: "Managers can only manage access for employee-level members.",
        });
      }

      const actorMembership = await WorkspaceMember.findOne({
        workspace: workspace._id,
        user: req.user,
        isActive: true,
      })
        .select("departments")
        .lean();
      const actorDepartmentIds = new Set(
        (Array.isArray(actorMembership?.departments) ? actorMembership.departments : []).map((d) =>
          String(d),
        ),
      );
      const targetDepartmentIds = (Array.isArray(member.departments) ? member.departments : []).map(
        (d: any) => String(d?._id || d),
      );
      const sharedDepartmentIds = targetDepartmentIds.filter((id) => actorDepartmentIds.has(id));

      if (!sharedDepartmentIds.length) {
        return res.status(403).json({
          message: "You can only manage access for members in your own department.",
        });
      }

      // A manager can delegate any module their shared department has —
      // exactly what the manager themselves holds via computeDepartmentDefaultModuleIds,
      // never more (they can't grant modules from a department they don't manage).
      const sharedDepartments = await Department.find({ _id: { $in: sharedDepartmentIds } })
        .select("moduleIds")
        .lean();
      const controllable = new Set<string>();
      for (const dept of sharedDepartments) {
        const moduleIds = Array.isArray(dept?.moduleIds) ? dept.moduleIds : [];
        for (const id of moduleIds) controllable.add(id);
      }
      managerControllableIds = controllable;
    }

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

    const sanitizedNextGrantedModules = nextGrantedModules.filter((moduleId) => {
      if (moduleId.startsWith("disabled:")) {
        const targetModuleId = String(moduleId.slice("disabled:".length) || "").trim();
        return Boolean(targetModuleId) && allowedModuleKeys.has(normalizeKey(targetModuleId));
      }
      return allowedModuleKeys.has(normalizeKey(moduleId));
    });

    if (managerControllableIds) {
      // Scoped manager edit: only replace modules within the manager's
      // controllable set (their shared department's employee-eligible
      // modules). Everything else already on the member — other department
      // grants, the common/extra-common baseline, add-ons, etc. — is
      // preserved untouched.
      const existingGrantedModules = Array.isArray(member.grantedModules) ? member.grantedModules : [];
      const outsideManagerScope = existingGrantedModules.filter(
        (id) => !managerControllableIds.has(String(id || "").trim()),
      );
      const withinManagerScope = sanitizedNextGrantedModules.filter((id) =>
        managerControllableIds.has(String(id || "").trim()),
      );
      member.grantedModules = Array.from(new Set([...outsideManagerScope, ...withinManagerScope]));
    } else {
      member.grantedModules = sanitizedNextGrantedModules;
    }

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
    const { user: actor, workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role")
      .populate("role")
      .lean();
    const actorRoleBand = getRoleBand(actorMembership?.role || "");
    if (!actorMembership || !["owner", "super_admin"].includes(actorRoleBand)) {
      return res.status(403).json({ message: "Only the workspace founder or Super Admin can transfer members." });
    }

    const targetWorkspaceId = String(req.body?.targetWorkspaceId || "").trim();
    if (!targetWorkspaceId) return res.status(400).json({ message: "Target workspace is required." });

    if (targetWorkspaceId === toId(workspace._id)) {
      return res.status(400).json({ message: "Select a different workspace for this transfer." });
    }
    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    }).populate("role");
    if (!member) return res.status(404).json({ message: "Member not found." });
    if (actorRoleBand === "super_admin" && ["owner", "super_admin"].includes(getRoleBand(member.role))) {
      return res.status(403).json({ message: "Super Admin can transfer Admin, Manager, or Employee accounts only." });
    }

    if (toId(member.user) === toId(actor._id)) {
      return res.status(400).json({ message: "Founder access must be transferred through the ownership transfer action." });
    }

    const targetWorkspace = await Workspace.findOne({
      _id: targetWorkspaceId,
      owner: workspace.owner,
      isActive: true,
    });
    if (!targetWorkspace) return res.status(404).json({ message: "Target workspace not found." });

    const nextRoleStr = normalizeRoleForStorage(req.body?.role || getRoleName(member.role));
    let targetRoleDoc = await Role.findOne({
      name: nextRoleStr,
      workspaceId: { $in: [targetWorkspace._id, null] },
    }).sort({ workspaceId: -1 });
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

    const targetRoleBand = getRoleBand(nextRoleStr);
    const targetGrantedModules = await computeMembershipDefaultModuleIds({
      workspace: targetWorkspace,
      departmentIds: resolvedDepartmentIds,
      roleBand: targetRoleBand,
    });
    const memberUser = await HostUser.findById(member.user).exec();
    const sourceWasPrimary =
      Boolean(member.isPrimary) || toId(memberUser?.primaryWorkspace) === toId(workspace._id);
    const transferredMembership = await WorkspaceMember.findOneAndUpdate(
      { workspace: targetWorkspace._id, user: member.user },
      {
        $set: {
          role: targetRoleDoc._id,
          departments: resolvedDepartmentIds,
          status: "joined",
          isActive: true,
          isPrimary: sourceWasPrimary,
          grantedModules: targetGrantedModules,
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

    if (sourceWasPrimary) {
      await WorkspaceMember.updateMany(
        { user: member.user, _id: { $ne: transferredMembership._id } },
        { $set: { isPrimary: false } },
      ).exec();
    }
    await ensureEmployeeProfileForMember({
      workspace: targetWorkspace,
      member: transferredMembership,
      user: memberUser,
    });

    member.isActive = false;
    member.status = "disabled";
    member.isPrimary = false;
    await member.save();

    await EmployeeProfile.updateOne(
      {
        workspaceId: workspace._id,
        $or: [
          { linkedWorkspaceMemberId: member._id },
          { linkedUserId: member.user },
        ],
      },
      { $set: { status: "inactive", isActive: false } },
    ).exec();

    await HostUser.updateOne(
      { _id: member.user, primaryWorkspace: workspace._id },
      { $set: { primaryWorkspace: targetWorkspace._id } },
    ).exec();

    await notifyMemberAboutUnitChange({
      memberUser,
      actorUserId: actor._id,
      notificationWorkspaceId: targetWorkspace._id,
      sourceWorkspace: workspace,
      targetWorkspace,
      changeType: "transfer",
    });
    return res.status(200).json({ message: "Member transferred successfully." });
  } catch (error) {
    next(error);
  }
};

export const linkOrganizationMember = async (req, res, next) => {
  try {
    const { user: actor, workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    const actorMembership = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user,
      isActive: true,
    })
      .select("role")
      .populate("role")
      .lean();
    const actorRoleBand = getRoleBand(actorMembership?.role || "");
    if (!actorMembership || !["owner", "super_admin"].includes(actorRoleBand)) {
      return res.status(403).json({ message: "Only the workspace founder or Super Admin can add unit access." });
    }

    const targetWorkspaceId = String(req.body?.targetWorkspaceId || "").trim();
    if (!targetWorkspaceId) return res.status(400).json({ message: "Target workspace is required." });
    if (targetWorkspaceId === toId(workspace._id)) {
      return res.status(400).json({ message: "Select a different workspace to add access." });
    }

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    })
      .populate("role")
      .populate("departments");
    if (!member) return res.status(404).json({ message: "Member not found." });
    if (actorRoleBand === "super_admin" && ["owner", "super_admin"].includes(getRoleBand(member.role))) {
      return res.status(403).json({ message: "Super Admin can add unit access for Admin, Manager, or Employee accounts only." });
    }

    const targetWorkspace = await Workspace.findOne({
      _id: targetWorkspaceId,
      owner: workspace.owner,
      isActive: true,
    });
    if (!targetWorkspace) return res.status(404).json({ message: "Target workspace not found." });
    const existingTargetMembership = await WorkspaceMember.findOne({
      workspace: targetWorkspace._id,
      user: member.user,
      isActive: true,
    })
      .select("_id")
      .lean()
      .exec();
    if (existingTargetMembership) {
      return res.status(409).json({ message: "This user already has access to the selected workspace." });
    }

    const roleName = normalizeRoleForStorage(getRoleName(member.role));
    let targetRoleDoc = await Role.findOne({
      name: roleName,
      workspaceId: { $in: [targetWorkspace._id, null] },
    }).sort({ workspaceId: -1 });
    if (!targetRoleDoc) {
      targetRoleDoc = await Role.create({
        name: roleName,
        workspaceId: targetWorkspace._id,
        permissions: [],
      });
    }

    await ensureWorkspaceDepartments(targetWorkspace);
    const sourceDepartmentNames = (Array.isArray(member.departments) ? member.departments : [])
      .map((department: any) => String(department?.name || "").trim().toLowerCase())
      .filter(Boolean);
    const targetDepartments = sourceDepartmentNames.length
      ? await Department.find({
        workspaceId: targetWorkspace._id,
        isActive: true,
      })
        .select("_id name")
        .lean()
        .exec()
      : [];
    const targetDepartmentIds = targetDepartments
      .filter((department: any) =>
        sourceDepartmentNames.includes(String(department?.name || "").trim().toLowerCase()),
      )
      .map((department: any) => department._id);

    const targetGrantedModules = await computeMembershipDefaultModuleIds({
      workspace: targetWorkspace,
      departmentIds: targetDepartmentIds,
      roleBand: getRoleBand(roleName),
    });
    const memberUser = await HostUser.findById(member.user).exec();
    const linkedMembership = await WorkspaceMember.findOneAndUpdate(
      { workspace: targetWorkspace._id, user: member.user },
      {
        $set: {
          role: targetRoleDoc._id,
          departments: targetDepartmentIds,
          status: "joined",
          isActive: true,
          isPrimary: false,
          grantedModules: targetGrantedModules,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ensureEmployeeProfileForMember({
      workspace: targetWorkspace,
      member: linkedMembership,
      user: memberUser,
    });

    await notifyMemberAboutUnitChange({
      memberUser,
      actorUserId: actor._id,
      notificationWorkspaceId: workspace._id,
      sourceWorkspace: workspace,
      targetWorkspace,
      changeType: "unit_access",
    });
    return res.status(200).json({ message: "Workspace access added successfully." });
  } catch (error) {
    next(error);
  }
};

export const removeOrganizationMemberWorkspaceAccess = async (req, res, next) => {
  try {
    const { user: actor, workspace } = await getCurrentWorkspace(req.user);
    if (!actor || !workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    if (toId(workspace.owner) !== toId(actor._id)) {
      return res.status(403).json({ message: "Only the workspace founder can remove unit access." });
    }

    const targetWorkspaceId = String(req.body?.targetWorkspaceId || "").trim();
    if (!targetWorkspaceId) {
      return res.status(400).json({ message: "Unit to remove is required." });
    }
    if (targetWorkspaceId === toId(workspace._id)) {
      return res.status(400).json({ message: "The user's current unit cannot be removed from here." });
    }

    const sourceMembership = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    })
      .populate("role")
      .lean()
      .exec();
    if (!sourceMembership) {
      return res.status(404).json({ message: "Member not found in the current unit." });
    }
    if (getRoleBand(sourceMembership.role) === "owner") {
      return res.status(403).json({ message: "Founder unit access cannot be removed." });
    }

    const targetWorkspace = await Workspace.findOne({
      _id: targetWorkspaceId,
      owner: workspace.owner,
      isActive: true,
    });
    if (!targetWorkspace) {
      return res.status(404).json({ message: "Linked unit not found." });
    }

    const targetMembership = await WorkspaceMember.findOne({
      workspace: targetWorkspace._id,
      user: sourceMembership.user,
      isActive: true,
    }).populate("role");
    if (!targetMembership) {
      return res.status(404).json({ message: "This user does not have active access to the selected unit." });
    }
    if (getRoleBand(targetMembership.role) === "owner") {
      return res.status(403).json({ message: "Founder unit access cannot be removed." });
    }

    const memberUser = await HostUser.findById(sourceMembership.user).exec();
    const removedPrimaryAccess =
      Boolean(targetMembership.isPrimary) ||
      toId(memberUser?.primaryWorkspace) === toId(targetWorkspace._id);

    targetMembership.isActive = false;
    targetMembership.isPrimary = false;
    targetMembership.status = "disabled";
    await targetMembership.save();

    await EmployeeProfile.updateOne(
      {
        workspaceId: targetWorkspace._id,
        $or: [
          { linkedWorkspaceMemberId: targetMembership._id },
          { linkedUserId: sourceMembership.user },
        ],
      },
      { $set: { status: "inactive", isActive: false } },
    ).exec();

    if (removedPrimaryAccess) {
      await WorkspaceMember.updateMany(
        { user: sourceMembership.user },
        { $set: { isPrimary: false } },
      ).exec();
      await WorkspaceMember.updateOne(
        { _id: sourceMembership._id },
        { $set: { isPrimary: true } },
      ).exec();
      await HostUser.updateOne(
        { _id: sourceMembership.user },
        { $set: { primaryWorkspace: workspace._id } },
      ).exec();
    }

    await notifyMemberAboutUnitRemoval({
      memberUser,
      actorUserId: actor._id,
      remainingWorkspace: workspace,
      removedWorkspace: targetWorkspace,
    });

    return res.status(200).json({ message: "Unit access removed successfully." });
  } catch (error) {
    next(error);
  }
};
export const transferOrganizationOwnership = async (req, res, next) => {
  try {
    const { user, workspace } = await getCurrentWorkspace(req.user);
    if (!user || !workspace) return res.status(404).json({ message: "Workspace not found for this user." });
    if (toId(workspace.owner) !== toId(user._id)) {
      return res.status(403).json({ message: "Only the current founder can transfer founder access." });
    }

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
      const previousOwnerExistingMembership = await WorkspaceMember.findOne({
        workspace: workspace._id,
        user: previousOwner._id,
      })
        .select("grantedModules")
        .lean();
      const formerFounderSuperAdminGrants = mergeGrantedModules(
        previousOwnerExistingMembership?.grantedModules,
        [
          ...BASELINE_MODULE_IDS,
          ...(Array.isArray(workspace.enabledModuleIds) ? workspace.enabledModuleIds : []),
        ],
      );
      const previousOwnerMembership = await WorkspaceMember.findOneAndUpdate(
        { workspace: workspace._id, user: previousOwner._id },
        { $set: { role: superAdminRole._id, departments: [], grantedModules: formerFounderSuperAdminGrants, isActive: true, status: "joined" } },
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
