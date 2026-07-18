// @ts-nocheck
import Company from "../models/Company.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { Role } from "../models/Role.js";
import Department from "../models/Department.js";
import {
  buildWorkspaceModuleCatalog,
  buildWorkspaceModulesStructure,
  getEffectiveEnabledModuleIds,
  COMMON_MODULE_IDS,
  EXTRA_COMMON_MODULE_IDS,
} from "../config/workspaceModuleCatalog.js";
import { ensureEmployeeProfileForMember } from "../services/core/hr.service.js";
import { recalcResourceDailyPricesForWorkspace } from "../services/resourceService.js";

const _getRoleName = (role: any) => {
  if (!role) return "";
  if (typeof role === "object" && role.name) return String(role.name);
  return String(role);
};
const _normalizeRole = (role = "") => {
  const n = _getRoleName(role).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (n === "founder") return "owner";
  if (n === "superadmin") return "super_admin";
  return n || "employee";
};
const _getRoleBand = (role: any) => {
  const n = _normalizeRole(_getRoleName(role));
  if (n === "owner") return "owner";
  if (n === "super_admin") return "super_admin";
  if (n === "admin" || n === "admin_manager") return "admin";
  if (n === "manager") return "manager";
  return "employee";
};

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];

const derivePrimaryVertical = (businessTypes: string[] = []) => {
  const normalized = businessTypes.map((item) => String(item || "").trim().toLowerCase());
  if (normalized.includes("co-working")) return "co-working";
  if (normalized.includes("co-living")) return "co-living";
  if (normalized.includes("workation")) return "workation";
  if (normalized.includes("hostels") || normalized.includes("hostel")) return "hostel";
  if (normalized.includes("meeting rooms") || normalized.includes("meeting-rooms")) return "meeting-rooms";
  if (normalized.includes("cafe")) return "cafe";
  return "";
};

const formatIndustryFromBusinessTypes = (businessTypes: string[] = []) =>
  businessTypes
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");

const buildAuthUserPayload = (
  user: any,
  company: any,
  workspaceMembership: any = null,
  workspaceCount = 1,
) => ({
  ...user,
  companyId: company?.companyId || user?.companyId,
  effectiveNomadsCompanyId:
    company?.linkedNomadsCompanyId || company?.companyId || user?.companyId,
  companiesListingRequested: Boolean(company?.companiesListingRequestedAt),
  companyName: company?.companyName,
  logo: company?.logo,
  isWebsiteTemplate: company?.isWebsiteTemplate,
  hasCompletedWorkspaceSetup: Boolean(user?.hasCompletedWorkspaceSetup),
  primaryWorkspace: user?.primaryWorkspace || null,
  workspaceCount,
  workspaceMembership: workspaceMembership
    ? {
        role: workspaceMembership.role,
        isPrimary: workspaceMembership.isPrimary,
        isActive: workspaceMembership.isActive,
      }
    : user?.workspaceMembership || null,
});

export const completeWorkspaceSetup = async (req, res, next) => {
  try {
    const { workspaceDetails, selectedPlan, enabledModuleIds, additionalWorkspaceMode } = req.body;
    const isAdditionalWorkspaceMode = Boolean(additionalWorkspaceMode);

    if (!workspaceDetails || typeof workspaceDetails !== "object") {
      return res.status(400).json({ message: "Workspace details are required." });
    }
    if (!selectedPlan || !["basic", "professional", "custom"].includes(selectedPlan)) {
      return res.status(400).json({ message: "A valid selected plan is required." });
    }

    const user = await HostUser.findById(req.user);
    if (!user) {
      return res.status(404).json({ message: "Host user not found." });
    }

    if (user.primaryWorkspace && user.hasCompletedWorkspaceSetup && !isAdditionalWorkspaceMode) {
      return res.status(409).json({
        message: "Workspace setup is already completed for this user.",
      });
    }

    const normalizedWorkspaceName = normalizeWorkspaceName(
      workspaceDetails.workspaceName || "",
    );
    const normalizedBusinessName = String(
      workspaceDetails.businessName || "",
    ).trim();
    const normalizedBrandName = String(workspaceDetails.brandName || "").trim();

    if (!normalizedWorkspaceName || !normalizedBusinessName) {
      return res.status(400).json({
        message: "Workspace name and business name are required.",
      });
    }

    const existingWorkspace = await Workspace.findOne({
      workspaceName: buildWorkspaceNameRegex(normalizedWorkspaceName),
      isActive: true,
    })
      .select("_id")
      .lean()
      .exec();
    if (existingWorkspace) {
      return res.status(409).json({ message: "Workspace name already taken." });
    }

    const normalizedBusinessTypes = normalizeStringArray(workspaceDetails.businessTypes);

    let company =
      (user.companyId && (await Company.findOne({ companyId: user.companyId }))) ||
      (user.company && (await Company.findById(user.company)));

    if (!company) {
      company = await Company.create({
        companyId: user.companyId,
        companyName: normalizedBusinessName,
        companyCity: workspaceDetails.city || "",
        companyState: workspaceDetails.state || "",
        companyCountry: workspaceDetails.country || "",
        businessTypes: normalizedBusinessTypes,
        industry: formatIndustryFromBusinessTypes(normalizedBusinessTypes),
        verticalType: derivePrimaryVertical(normalizedBusinessTypes),
        vertical: derivePrimaryVertical(normalizedBusinessTypes),
        logo: null,
        isRegistered: true,
      });
      user.company = company._id;
    } else {
      company.companyName = normalizedBusinessName;
      company.companyCity = String(workspaceDetails.city || "").trim();
      company.companyState = String(workspaceDetails.state || "").trim();
      company.companyCountry = String(workspaceDetails.country || "").trim();
      company.businessTypes = normalizedBusinessTypes;
      company.industry = formatIndustryFromBusinessTypes(normalizedBusinessTypes);
      company.verticalType = derivePrimaryVertical(normalizedBusinessTypes);
      company.vertical = derivePrimaryVertical(normalizedBusinessTypes);
      // New workspaces should not inherit a stale logo from an unrelated company record.
      company.logo = null;
      company.isRegistered = true;
      await company.save();
    }

    const normalizedRequestedEnabledIds = normalizeStringArray(enabledModuleIds);
    const finalEnabledModuleIds = getEffectiveEnabledModuleIds({
      selectedPlan,
      existingEnabledModuleIds: normalizedRequestedEnabledIds,
    });
    const finalWorkspaceModules = buildWorkspaceModulesStructure({
      selectedPlan,
      enabledModuleIds: finalEnabledModuleIds,
    });

    const workspace = await Workspace.create({
      owner: user._id,
      company: company?._id || null,
      companyId: user.companyId,
      workspaceName: normalizedWorkspaceName,
      businessName: normalizedBusinessName,
      brandName: normalizedBrandName,
      country: String(workspaceDetails.country || "").trim(),
      state: String(workspaceDetails.state || "").trim(),
      city: String(workspaceDetails.city || "").trim(),
      address: String(workspaceDetails.address || "").trim(),
      businessTypes: normalizedBusinessTypes,
      selectedPlan,
      enabledModuleIds: finalEnabledModuleIds,
      modules: finalWorkspaceModules,
      isSetupComplete: true,
      isActive: true,
    });

    let founderRole = await Role.findOne({ name: "founder" });
    if (!founderRole) {
      founderRole = await Role.create({
        name: "founder",
        isSystemRole: true,
        workspaceId: null,
        permissions: ["*"],
      });
    }

    const workspaceMembership = await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: user._id },
      {
        $set: {
          role: founderRole._id,
          isPrimary: !isAdditionalWorkspaceMode,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ensureEmployeeProfileForMember({
      workspace,
      member: workspaceMembership,
      user,
    });

    user.name = user.name || normalizedBrandName || normalizedBusinessName;
    if (!user.primaryWorkspace || !isAdditionalWorkspaceMode) {
      user.primaryWorkspace = workspace._id;
    }
    user.hasCompletedWorkspaceSetup = true;
    user.isActive = true;
    if (!user.joinedAt) {
      user.inviteStatus = "joined";
      user.joinedAt = new Date();
    }
    await user.save();

    const updatedUser = await HostUser.findById(user._id).lean().exec();
    const updatedCompany =
      (company?._id && (await Company.findById(company._id).lean().exec())) ||
      null;

    const workspaceCount = await WorkspaceMember.countDocuments({
      user: user._id,
      isActive: true,
    });

    return res.status(201).json({
      message: "Workspace created successfully.",
      workspace,
      user: buildAuthUserPayload(
        updatedUser,
        updatedCompany,
        workspaceMembership,
        workspaceCount,
      ),
    });
  } catch (error) {
    next(error);
  }
};

const toId = (value: unknown) => String(value || "");

const getCurrentWorkspaceContext = async (userId: string) => {
  const user = await HostUser.findById(userId);
  if (!user) return { user: null, workspace: null };

  let workspace = null;
  if (user.primaryWorkspace) {
    workspace = await Workspace.findById(user.primaryWorkspace);
  }

  if (!workspace) {
    const membership = await WorkspaceMember.findOne({ user: user._id, isActive: true })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean()
      .exec();
    if (membership?.workspace) {
      workspace = await Workspace.findById(membership.workspace);
    }
  }

  if (!workspace) {
    workspace = await Workspace.findOne({ owner: user._id, isActive: true }).sort({
      createdAt: 1,
    });
  }

  return { user, workspace };
};

const canManageWorkspaces = (workspaceMembership: any) => {
  const normalizedRole = String(workspaceMembership?.role || "")
    .trim()
    .toLowerCase();
  return normalizedRole === "owner" || normalizedRole === "founder" || normalizedRole === "super_admin";
};

const normalizeWorkspaceName = (value: unknown) => String(value || "").trim();
const buildWorkspaceNameRegex = (value: string) =>
  new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

export const validateWorkspaceName = async (req, res, next) => {
  try {
    const workspaceName = normalizeWorkspaceName(req.query?.workspaceName);
    const excludeWorkspaceId = String(req.query?.excludeWorkspaceId || "").trim();
    if (!workspaceName) {
      return res.status(400).json({ message: "Workspace name is required." });
    }

    const query: any = {
      workspaceName: buildWorkspaceNameRegex(workspaceName),
      isActive: true,
    };
    if (excludeWorkspaceId) {
      query._id = { $ne: excludeWorkspaceId };
    }
    const existing = await Workspace.findOne(query).select("_id").lean().exec();
    return res.status(200).json({
      message: existing ? "Workspace name already taken." : "Workspace name is available.",
      data: { available: !existing },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceManagementOverview = async (req, res, next) => {
  try {
    const { user, workspace } = await getCurrentWorkspaceContext(req.user);
    if (!user || !workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    if (!canManageWorkspaces(req.workspaceMembership)) {
      return res.status(403).json({ message: "Only founders can access workspace management." });
    }

    const ownerId = workspace.owner;
    const ownerWorkspaces = await Workspace.find({ owner: ownerId, isActive: true })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    const workspaceIds = ownerWorkspaces.map((item) => item._id);
    const membershipCounts = await WorkspaceMember.aggregate([
      { $match: { workspace: { $in: workspaceIds }, isActive: true } },
      { $group: { _id: "$workspace", count: { $sum: 1 } } },
    ]);
    const memberMap = new Map(membershipCounts.map((item) => [toId(item._id), Number(item.count || 0)]));

    const allDepartments = await Department.find({
      workspaceId: { $in: workspaceIds },
      isActive: true,
    }).lean().exec();

    const departmentsByWorkspace = new Map<string, any[]>();
    for (const dept of allDepartments) {
      const wId = String(dept.workspaceId);
      const current = departmentsByWorkspace.get(wId) || [];
      current.push(dept);
      departmentsByWorkspace.set(wId, current);
    }

    // Build a lookup map from Department ObjectId → name so we can resolve
    // member.department entries even when the DB contains plain strings (e.g. "HR")
    // instead of ObjectIds.
    const departmentNameById = new Map<string, string>();
    for (const dept of allDepartments) {
      departmentNameById.set(String(dept._id), dept.name || "");
    }

    const activeMemberships = await WorkspaceMember.find({
      workspace: { $in: workspaceIds },
      isActive: true,
    })
      .populate("user", "name email")
      .populate("role")
      .lean()
      .exec();

    const membersByWorkspace = new Map<string, any[]>();
    for (const membership of activeMemberships) {
      const workspaceId = toId(membership?.workspace);
      const current = membersByWorkspace.get(workspaceId) || [];
      current.push(membership);
      membersByWorkspace.set(workspaceId, current);
    }

    // Hand-synced with the client's isDepartmentAllowedForPlan in
    // client/src/utils/workspacePlanAccess.ts — keep both in lockstep.
    // Basic workspaces have no real departments (Founder/Super Admin only);
    // Professional is Sales + Technology only; Custom is unrestricted.
    const PROFESSIONAL_DEPARTMENT_NAMES = new Set(["sales", "technology"]);
    const isDepartmentAllowedForWorkspacePlan = (plan: unknown, name: unknown) => {
      const normalizedPlan = String(plan || "basic").trim().toLowerCase();
      if (normalizedPlan === "basic") return false;
      if (normalizedPlan === "professional") {
        return PROFESSIONAL_DEPARTMENT_NAMES.has(String(name || "").trim().toLowerCase());
      }
      return true;
    };

    const allowedDepartmentNames = new Set<string>();

    const list = ownerWorkspaces.map((item) => {
      const workspaceId = toId(item._id);
      const workspaceMembers = membersByWorkspace.get(workspaceId) || [];
      const departments = (departmentsByWorkspace.get(workspaceId) || []).filter((dept: any) =>
        isDepartmentAllowedForWorkspacePlan(item.selectedPlan, dept?.name),
      );
      departments.forEach((dept: any) => {
        if (dept?.name) allowedDepartmentNames.add(dept.name);
      });
      const roleCountsMap = new Map<string, number>();
      const employees = workspaceMembers.map((member: any) => {
        const role = String(member?.role || "member").trim().toLowerCase();
        roleCountsMap.set(role, Number(roleCountsMap.get(role) || 0) + 1);
        const roleLabel = role
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
        return {
          id: toId(member?._id),
          fullName: String(member?.user?.name || "Member"),
          email: String(member?.user?.email || ""),
          roleLabel,
          status: String(member?.status || "active"),
          departments: Array.isArray(member?.departments)
            ? member.departments.map((d: any) => {
                const str = String(d?._id || d);
                return departmentNameById.get(str) || str;
              })
            : [],
          employeeId: "",
        };
      });
      const roles = Array.from(roleCountsMap.entries()).map(([role, count]) => ({
        role,
        label: role
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        count,
      }));
      return {
        id: workspaceId,
        workspaceName: item.workspaceName || "",
        businessName: item.businessName || "",
        location: [item.city, item.state, item.country].filter(Boolean).join(", "),
        industry: "",
        businessType: Array.isArray(item.businessTypes) ? item.businessTypes.join(", ") : "",
        status: item.isActive === false ? "inactive" : "active",
        isActiveWorkspace: workspaceId === toId(user.primaryWorkspace || workspace._id),
        createdAt: item.createdAt,
        metrics: {
          totalEmployees: memberMap.get(workspaceId) || 0,
          totalDepartments: departments.length,
          totalTickets: 0,
          totalTasks: 0,
          totalAssets: 0,
          totalInventory: 0,
          totalMeetingBookings: 0,
          performance: {
            taskCompletionRate: 0,
            ticketResolutionRate: 0,
            overallScore: 0,
          },
        },
        details: {
          employees,
          roles,
          departments: departments.map((department: any) => ({
            name: department?.name || "",
            totalEmployees: 0,
            totalTickets: 0,
            totalTasks: 0,
          })),
          tickets: { byStatus: [], recent: [] },
          tasks: { byStatus: [], recent: [] },
        },
      };
    });

    const summary = list.reduce(
      (acc, item) => {
        acc.totalEmployees += Number(item.metrics.totalEmployees || 0);
        acc.totalDepartments += Number(item.metrics.totalDepartments || 0);
        return acc;
      },
      {
        totalEmployees: 0,
        totalDepartments: 0,
        totalTickets: 0,
        totalTasks: 0,
        totalAssets: 0,
        totalInventory: 0,
        totalMeetingBookings: 0,
        performance: { taskCompletionRate: 0, ticketResolutionRate: 0, overallScore: 0 },
      },
    );

    return res.status(200).json({
      message: "Workspace management loaded successfully.",
      data: {
        workspaceCount: list.length,
        workspaceManagement: { enabled: list.length > 1 },
        selectedDepartment: "All departments",
        departments: ["All departments", ...Array.from(allowedDepartmentNames).sort()],
        summary,
        workspaces: list,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateManagedWorkspace = async (req, res, next) => {
  try {
    const { user, workspace } = await getCurrentWorkspaceContext(req.user);
    if (!user || !workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    if (!canManageWorkspaces(req.workspaceMembership)) {
      return res.status(403).json({ message: "Only founders can update workspaces." });
    }

    const target = await Workspace.findOne({
      _id: req.params.workspaceId,
      owner: workspace.owner,
      isActive: true,
    });
    if (!target) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    const profile = req.body?.profile || {};
    const nextWorkspaceName = normalizeWorkspaceName(profile.workspaceName || target.workspaceName);
    if (!nextWorkspaceName) {
      return res.status(400).json({ message: "Workspace name is required." });
    }
    const existingWorkspace = await Workspace.findOne({
      _id: { $ne: target._id },
      workspaceName: buildWorkspaceNameRegex(nextWorkspaceName),
      isActive: true,
    })
      .select("_id")
      .lean()
      .exec();
    if (existingWorkspace) {
      return res.status(409).json({ message: "Workspace name already taken." });
    }
    target.workspaceName = nextWorkspaceName;
    await target.save();

    return res.status(200).json({ message: "Workspace updated successfully." });
  } catch (error) {
    next(error);
  }
};

export const switchWorkspace = async (req, res, next) => {
  try {
    const { user, workspace } = await getCurrentWorkspaceContext(req.user);
    if (!user || !workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const workspaceId = String(req.body?.workspaceId || "").trim();
    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace id is required." });
    }

    const targetMembership = await WorkspaceMember.findOne({
      user: user._id,
      workspace: workspaceId,
      isActive: true,
    }).lean().exec();
    if (!targetMembership) {
      return res.status(403).json({ message: "You do not have access to this workspace." });
    }
    const targetWorkspace = await Workspace.findOne({ _id: workspaceId, isActive: true });
    if (!targetWorkspace) return res.status(404).json({ message: "Selected workspace not found." });

    user.primaryWorkspace = targetWorkspace._id;
    await user.save();

    await WorkspaceMember.updateMany({ user: user._id }, { $set: { isPrimary: false } });
    await WorkspaceMember.updateOne(
      { user: user._id, workspace: targetWorkspace._id },
      { $set: { isPrimary: true, isActive: true } },
    );

    const memberships = await WorkspaceMember.find({ user: user._id, isActive: true })
      .populate("workspace")
      .lean()
      .exec();
    const accessibleWorkspaces = memberships
      .filter((membership: any) => membership?.workspace)
      .map((membership: any) => ({
        id: toId(membership.workspace?._id),
        workspaceName: membership.workspace?.workspaceName || "Workspace",
        businessName: membership.workspace?.businessName || "",
        location: [membership.workspace?.city, membership.workspace?.state, membership.workspace?.country]
          .filter(Boolean)
          .join(", "),
        isPrimary: Boolean(membership?.isPrimary),
      }));
    return res.status(200).json({
      message: "Workspace switched successfully.",
      data: {
        activeWorkspaceId: toId(targetWorkspace._id),
        workspaceCount: accessibleWorkspaces.length,
        accessibleWorkspaces,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceSettings = async (req, res, next) => {
  try {
    // Prefer the workspace verifyJwt already resolved (req.workspaceMembership) —
    // for tenant users that is the host's workspace (via TenantEmployee →
    // TenantCompany), which getCurrentWorkspaceContext cannot resolve.
    const membershipWorkspaceId = req.workspaceMembership?.workspace;
    let workspace = membershipWorkspaceId
      ? await Workspace.findById(membershipWorkspaceId)
      : null;
    if (!workspace) {
      ({ workspace } = await getCurrentWorkspaceContext(req.user));
    }
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }

    const preferences = workspace.preferences || {};
    const branding = workspace.branding || {};
    return res.status(200).json({
      message: "Workspace settings loaded successfully.",
      data: {
        settings: {
          id: workspace._id,
          profile: {
            workspaceName: workspace.workspaceName || "",
            businessName: workspace.businessName || "",
            location: [workspace.city, workspace.state, workspace.country]
              .filter(Boolean)
              .join(", "),
            industry: "",
            businessType: Array.isArray(workspace.businessTypes)
              ? workspace.businessTypes.join(", ")
              : "",
          },
          preferences: {
            timezone: preferences.timezone || "Asia/Kolkata",
            currency: preferences.currency || "INR",
            dateFormat: preferences.dateFormat || "DD MMM YYYY",
            timeFormat: preferences.timeFormat || "12h",
            weekStartsOn: preferences.weekStartsOn || "monday",
            businessHours: {
              start: preferences.businessHours?.start || "09:00",
              end: preferences.businessHours?.end || "22:00",
            },
          },
          branding: {
            primaryColor: branding.primaryColor || "#2563EB",
            logoUrl: branding.logoUrl || "",
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceModuleAccessMap = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspaceContext(req.user);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }

    const selectedPlan = String(workspace.selectedPlan || "basic").trim().toLowerCase();
    const enabledModuleIds = Array.isArray(workspace.enabledModuleIds)
      ? workspace.enabledModuleIds
      : [];
    const modules =
      Array.isArray(workspace.modules) && workspace.modules.length > 0
        ? workspace.modules
        : buildWorkspaceModulesStructure({
            selectedPlan,
            enabledModuleIds,
          });
    const catalog = buildWorkspaceModuleCatalog({
      selectedPlan,
      enabledModuleIds,
    });
    const currentUserId = String(
      req.user?.id || req.user?._id || req.user || "",
    ).trim();
    const currentMember = currentUserId
      ? await WorkspaceMember.findOne({
          workspace: workspace._id,
          user: currentUserId,
          isActive: true,
        })
          .populate("role")
          .lean()
          .exec()
      : null;

    const roleBand = _getRoleBand(currentMember?.role);
    const explicitGrants: string[] = Array.isArray(currentMember?.grantedModules)
      ? currentMember.grantedModules.map((m) => String(m).trim()).filter(Boolean)
      : [];

    let baseModules: string[] = [];

    if (roleBand === "owner") {
      // Plan-gated features are capped by the workspace's own plan
      // (enabledModuleIds) — a Basic-plan owner should not see
      // Professional-only features just because of their role. Org-management
      // / role-capability ids (invite member, access grants, departments tab,
      // etc.) are already part of every plan's default set (see
      // BASIC_DEFAULT_IDS in workspaceModuleCatalog.ts), so they stay
      // available without needing a separate always-on bypass here.
      baseModules = enabledModuleIds;
    } else if (roleBand === "super_admin") {
      // Unlike owner, super_admin's "full access" is an explicit, adjustable
      // grant recorded on the member at invite time (superAdminDefaultIds in
      // organizationControllers.ts), not a hardcoded bypass — an owner can
      // trim it afterward via Access Grants. Leave baseModules empty so
      // explicitGrants (below) is the sole source of truth; unioning in
      // enabledModuleIds here would make any such removal a no-op.
      baseModules = [];
    } else if (roleBand === "admin" || roleBand === "manager") {
      // Collect dept modules from assigned departments (WorkspaceMember.departments)
      const assignedDeptIds = Array.isArray(currentMember?.departments)
        ? currentMember.departments
        : [];
      const deptQuery: any[] = [{ _id: { $in: assignedDeptIds }, workspaceId: workspace._id, isActive: true }];

      // Managers also get modules for departments they directly manage
      if (roleBand === "manager") {
        deptQuery.push({ managerUser: currentUserId, workspaceId: workspace._id, isActive: true });
      }

      const depts = await Department.find({ $or: deptQuery }).select("moduleIds").lean();
      const deptModuleIds = depts.flatMap((d) =>
        Array.isArray(d.moduleIds) ? d.moduleIds.map((m) => String(m).trim()).filter(Boolean) : [],
      );

      baseModules = [...COMMON_MODULE_IDS, ...EXTRA_COMMON_MODULE_IDS, ...deptModuleIds];
    } else {
      // employee — common modules only
      baseModules = [...COMMON_MODULE_IDS];
    }

    // Founder can add extra access on top of the role base
    const effectiveGrantedModules = Array.from(new Set([...baseModules, ...explicitGrants]));

    return res.status(200).json({
      message: "Workspace module access map loaded successfully.",
      data: {
        workspaceId: String(workspace._id),
        workspaceName: workspace.workspaceName || "",
        selectedPlan,
        enabledModuleIds,
        modules,
        moduleMap: catalog,
        currentMemberGrantedModules: effectiveGrantedModules,
        currentMemberEnabledModules: Array.isArray(currentMember?.enabledModules)
          ? currentMember.enabledModules
          : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspaceSettings = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspaceContext(req.user);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    if (!canManageWorkspaces(req.workspaceMembership)) {
      return res.status(403).json({ message: "Only founders can edit workspace settings." });
    }

    const payload = req.body || {};
    const profile = payload.profile || {};
    const preferences = payload.preferences || {};
    const branding = payload.branding || {};

    // Recalc on every save that includes businessHours (not only on change):
    // it is idempotent, and it lets a plain re-save heal resources whose daily
    // price was stored under a different span (e.g. the old hourly × 24 formula).
    const shouldRecalcResourcePrices = Boolean(preferences.businessHours);

    workspace.workspaceName = String(profile.workspaceName || workspace.workspaceName).trim();
    workspace.businessName = String(profile.businessName || workspace.businessName || "").trim();
    if (profile.location) {
      workspace.city = String(profile.location).trim();
    }
    if (profile.businessType) {
      workspace.businessTypes = String(profile.businessType)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    workspace.preferences = {
      ...(workspace.preferences?.toObject?.() || workspace.preferences || {}),
      ...preferences,
      businessHours: {
        ...(workspace.preferences?.businessHours?.toObject?.() ||
          workspace.preferences?.businessHours ||
          {}),
        ...(preferences.businessHours || {}),
      },
    };
    workspace.branding = {
      ...(workspace.branding?.toObject?.() || workspace.branding || {}),
      ...branding,
    };
    await workspace.save();

    if (shouldRecalcResourcePrices) {
      const recalced = await recalcResourceDailyPricesForWorkspace(String(workspace._id));
      console.log(`[workspace-settings] business hours saved — recalculated daily prices for ${recalced} resource(s) in workspace ${workspace._id}`);
    }

    return res.status(200).json({
      message: "Workspace settings updated successfully.",
      data: { settings: { id: workspace._id } },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentHostCompanyIdentity = async (req, res, next) => {
  try {
    const user = await HostUser.findById(req.user).select("company companyId").lean().exec();
    if (!user) {
      return res.status(404).json({ message: "Host user not found." });
    }

    let companyRecord = null;
    if (user.company) {
      companyRecord = await Company.findById(user.company)
        .select("_id companyId companyName")
        .lean()
        .exec();
    }

    if (!companyRecord && user.companyId) {
      companyRecord = await Company.findOne({ companyId: user.companyId })
        .select("_id companyId companyName")
        .lean()
        .exec();
    }

    if (!companyRecord) {
      return res.status(404).json({ message: "Host company not found for this user." });
    }

    return res.status(200).json({
      message: "Host company loaded successfully.",
      data: {
        companyObjectId: String(companyRecord._id),
        companyId: companyRecord.companyId || "",
        companyName: companyRecord.companyName || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const backfillWorkspaceModules = async (req, res, next) => {
  try {
    const actorRole = String(req.workspaceMembership?.role || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_");
    const isAllowedActor =
      actorRole === "owner" || actorRole === "founder" || actorRole === "super_admin";
    if (!isAllowedActor) {
      return res.status(403).json({
        message: "Only founder or super admin can run workspace module backfill.",
      });
    }

    const force = String(req.query?.force || "").trim().toLowerCase() === "true";
    const workspaces = await Workspace.find({ isActive: true }).exec();
    let updatedCount = 0;

    for (const workspace of workspaces) {
      const selectedPlan = String(workspace.selectedPlan || "basic").trim().toLowerCase();
      const existingEnabled = Array.isArray(workspace.enabledModuleIds)
        ? workspace.enabledModuleIds
        : [];
      const nextEnabled = getEffectiveEnabledModuleIds({
        selectedPlan,
        existingEnabledModuleIds: existingEnabled,
      });
      const nextModules = buildWorkspaceModulesStructure({
        selectedPlan,
        enabledModuleIds: nextEnabled,
      });

      const shouldWriteModules =
        force ||
        !Array.isArray(workspace.modules) ||
        workspace.modules.length === 0;
      const shouldWriteEnabled =
        force || JSON.stringify(existingEnabled) !== JSON.stringify(nextEnabled);

      if (!shouldWriteModules && !shouldWriteEnabled) {
        continue;
      }

      workspace.enabledModuleIds = nextEnabled;
      if (shouldWriteModules || force) {
        workspace.modules = nextModules;
      }
      await workspace.save();
      updatedCount += 1;
    }

    return res.status(200).json({
      message: "Workspace module backfill completed.",
      data: {
        totalWorkspaces: workspaces.length,
        updatedWorkspaces: updatedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
