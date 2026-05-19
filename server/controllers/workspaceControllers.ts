// @ts-nocheck
import Company from "../models/Company.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];

const buildAuthUserPayload = (
  user: any,
  company: any,
  workspaceMembership: any = null,
  workspaceCount = 1,
) => ({
  ...user,
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
    const { workspaceDetails, selectedPlan, enabledModuleIds, modules, additionalWorkspaceMode } = req.body;
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

    let company =
      (user.company && (await Company.findById(user.company))) ||
      (user.companyId && (await Company.findOne({ companyId: user.companyId })));

    if (!company) {
      company = await Company.create({
        companyId: user.companyId,
        companyName: normalizedBusinessName,
        companyCity: workspaceDetails.city || "",
        companyState: workspaceDetails.state || "",
        companyCountry: workspaceDetails.country || "",
        isRegistered: true,
      });
      user.company = company._id;
    } else {
      company.companyName = normalizedBusinessName;
      company.companyCity = String(workspaceDetails.city || "").trim();
      company.companyState = String(workspaceDetails.state || "").trim();
      company.companyCountry = String(workspaceDetails.country || "").trim();
      company.isRegistered = true;
      await company.save();
    }

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
      businessTypes: normalizeStringArray(workspaceDetails.businessTypes),
      selectedPlan,
      enabledModuleIds: normalizeStringArray(enabledModuleIds),
      modules: Array.isArray(modules) ? modules : [],
      isSetupComplete: true,
      isActive: true,
    });

    const workspaceMembership = await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: user._id },
      {
        $set: {
          role: "founder",
          isPrimary: !isAdditionalWorkspaceMode,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    user.name = user.name || normalizedBrandName || normalizedBusinessName;
    if (!user.primaryWorkspace || !isAdditionalWorkspaceMode) {
      user.primaryWorkspace = workspace._id;
    }
    user.hasCompletedWorkspaceSetup = true;
    user.isActive = true;
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

    const activeMemberships = await WorkspaceMember.find({
      workspace: { $in: workspaceIds },
      isActive: true,
    })
      .populate("user", "name email")
      .lean()
      .exec();

    const membersByWorkspace = new Map<string, any[]>();
    for (const membership of activeMemberships) {
      const workspaceId = toId(membership?.workspace);
      const current = membersByWorkspace.get(workspaceId) || [];
      current.push(membership);
      membersByWorkspace.set(workspaceId, current);
    }

    const list = ownerWorkspaces.map((item) => {
      const workspaceId = toId(item._id);
      const workspaceMembers = membersByWorkspace.get(workspaceId) || [];
      const departments = Array.isArray(item.organizationDepartments)
        ? item.organizationDepartments.filter((department) => department?.isActive !== false)
        : [];
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
          departments: Array.isArray(member?.departments) ? member.departments : [],
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
        departments: ["All departments"],
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
    const { workspace } = await getCurrentWorkspaceContext(req.user);
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
              end: preferences.businessHours?.end || "18:00",
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
