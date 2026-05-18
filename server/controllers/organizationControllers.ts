// @ts-nocheck
import Company from "../models/Company.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import jwt from "jsonwebtoken";
import { sendMail } from "../config/mailer.js";

const DEFAULT_DEPARTMENTS = [
  { name: "HR", description: "People operations and hiring", isActive: true },
  { name: "Administration", description: "Admin and facility operations", isActive: true },
  { name: "Sales", description: "Revenue and customer growth", isActive: true },
  { name: "Finance", description: "Finance and compliance", isActive: true },
  { name: "Maintenance", description: "Maintenance and operations", isActive: true },
  { name: "Technology", description: "Technology and product", isActive: true },
];

const toId = (value) => String(value || "");

const toRoleLabel = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "founder") return "owner";
  return normalized || "member";
};

const normalizeRoleForStorage = (role = "") => {
  const normalized = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "founder") return "owner";
  if (normalized === "superadmin") return "super_admin";
  return normalized || "employee";
};

const getRoleBand = (role = "") => {
  const normalized = normalizeRoleForStorage(role);
  if (normalized === "owner") return "owner";
  if (normalized === "super_admin") return "super_admin";
  if (normalized === "admin" || normalized === "admin_manager") return "admin";
  if (normalized === "manager") return "manager";
  return "employee";
};

const buildLinkedWorkspaceOptions = async (workspace) => {
  if (!workspace?.owner) return [];
  const workspaces = await Workspace.find({
    owner: workspace.owner,
    isActive: true,
  })
    .lean()
    .exec();

  return workspaces.map((item) => ({
    id: toId(item._id),
    workspaceName: item.workspaceName || item.businessName || "Workspace",
    location: [item.city, item.state, item.country].filter(Boolean).join(", "),
    isCurrentWorkspace: toId(item._id) === toId(workspace._id),
    departments: Array.isArray(item.organizationDepartments)
      ? item.organizationDepartments
          .filter((department) => department?.isActive !== false)
          .map((department) => ({
            id: toId(department?._id),
            name: department?.name || "",
          }))
      : [],
  }));
};

const ensureWorkspaceDepartments = async (workspace) => {
  if (!workspace) {
    return [];
  }

  if (Array.isArray(workspace.organizationDepartments) && workspace.organizationDepartments.length > 0) {
    return workspace.organizationDepartments;
  }

  workspace.organizationDepartments = DEFAULT_DEPARTMENTS;
  await workspace.save();
  return workspace.organizationDepartments;
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

export const getOrganizationOverview = async (req, res, next) => {
  try {
    const { user, workspace } = await getCurrentWorkspace(req.user);
    if (!user || !workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }

    await ensureWorkspaceDepartments(workspace);

    const members = await WorkspaceMember.find({ workspace: workspace._id })
      .populate("user", "name email isActive")
      .lean()
      .exec();

    const activeDepartments = (workspace.organizationDepartments || []).filter(
      (department) => department?.isActive !== false,
    );

    const departments = activeDepartments.map((department) => {
      const departmentName = String(department?.name || "").trim().toLowerCase();
      const departmentMembers = members.filter((member) =>
        (Array.isArray(member.departments) ? member.departments : []).some(
          (name) => String(name || "").trim().toLowerCase() === departmentName,
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
        managerUserId: toId(department?.managerUser),
        managerName: managerMember?.user?.name || "",
        employeeCount: departmentMembers.length,
        employees: departmentMembers.map((member) => ({
          id: toId(member._id),
          userId: toId(member.user?._id),
          name: member.user?.name || "",
          email: member.user?.email || "",
          role: toRoleLabel(member.role),
          status: member.isActive === false ? "disabled" : "joined",
          departmentNames: Array.isArray(member.departments) ? member.departments : [],
        })),
        actingManagers: (workspace.actingManagerAssignments || [])
          .filter(
            (assignment) =>
              assignment?.isActive !== false &&
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

    const teamMembers = members.map((member) => ({
      id: toId(member._id),
      userId: toId(member.user?._id),
      name: member.user?.name || "",
      email: member.user?.email || "",
      role: toRoleLabel(member.role),
      status: member.isActive === false ? "disabled" : "joined",
      departmentNames: Array.isArray(member.departments) ? member.departments : [],
      grantedModules: Array.isArray(member.grantedModules) ? member.grantedModules : [],
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
          organizationDepartments: workspace.organizationDepartments || [],
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

    await ensureWorkspaceDepartments(workspace);

    const departmentId = req.params.departmentId || req.body?.departmentId;
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const isActive = req.body?.isActive !== false;

    if (!name) {
      return res.status(400).json({ message: "Department name is required." });
    }

    const departmentList = Array.isArray(workspace.organizationDepartments)
      ? workspace.organizationDepartments
      : [];

    if (departmentId) {
      const existing = departmentList.id(departmentId);
      if (!existing) {
        return res.status(404).json({ message: "Department not found." });
      }
      existing.name = name;
      existing.description = description;
      existing.isActive = isActive;
    } else {
      departmentList.push({ name, description, isActive });
      workspace.organizationDepartments = departmentList;
    }

    await workspace.save();
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

    const department = workspace.organizationDepartments?.id(req.params.departmentId);
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
    await workspace.save();

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

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
    });
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    member.isActive = !member.isActive;
    member.status = member.isActive ? "joined" : "disabled";
    await member.save();
    if (member.isActive === false) {
      await HostUser.findByIdAndUpdate(member.user, { refreshToken: "" }).exec();
    }

    return res.status(200).json({ message: "Member status updated successfully." });
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

    const name = String(req.body?.fullName || req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = String(req.body?.role || "member").trim().toLowerCase();
    const departments = Array.isArray(req.body?.departments)
      ? req.body.departments.map((department) => String(department || "").trim()).filter(Boolean)
      : [];
    const normalizedDepartments = departments.map((value) => {
      const byId = workspace.organizationDepartments?.id(value);
      if (byId?.name) return String(byId.name);
      return value;
    });

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
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

    await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: targetUser._id },
      {
        $set: {
          role,
          departments: normalizedDepartments,
          isPrimary: false,
          isActive: true,
          status: "joined",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const inviteSecret =
      process.env.HOST_INVITE_TOKEN_SECRET ||
      process.env.REGISTER_INVITE_SECRET ||
      process.env.ACCESS_TOKEN_SECRET;
    const frontendBase =
      String(process.env.FRONTEND_PROD_LINK || process.env.FRONTEND_DEV_LINK || "http://localhost:5173")
        .trim()
        .replace(/\/$/, "");

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
      const inviteLink = `${frontendBase}/register/${inviteToken}`;

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
    }

    return res.status(201).json({
      message: "Organization invite sent successfully.",
      inviteMode: !targetUser?.password || isFreshInviteAccount ? "register-link" : "existing-user",
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

    const department = workspace.organizationDepartments?.id(req.params.departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const assignedUserId = String(req.body?.assignedUserId || "").trim();
    if (!assignedUserId) {
      return res.status(400).json({ message: "Assigned user id is required." });
    }

    const assignments = Array.isArray(workspace.actingManagerAssignments)
      ? workspace.actingManagerAssignments
      : [];
    const existing = assignments.find(
      (assignment) =>
        toId(assignment?.departmentId) === toId(department?._id) &&
        toId(assignment?.assignedUser) === assignedUserId &&
        assignment?.isActive !== false,
    );

    if (!existing) {
      assignments.push({
        departmentId: department._id,
        assignedUser: assignedUserId,
        note: String(req.body?.note || "").trim(),
        isActive: true,
      });
      workspace.actingManagerAssignments = assignments;
      await workspace.save();
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

    const departmentId = String(req.params.departmentId || "");
    const assignedUserId = String(req.params.assignedUserId || "");
    const assignments = Array.isArray(workspace.actingManagerAssignments)
      ? workspace.actingManagerAssignments
      : [];
    const target = assignments.find(
      (assignment) =>
        toId(assignment?.departmentId) === departmentId &&
        toId(assignment?.assignedUser) === assignedUserId &&
        assignment?.isActive !== false,
    );

    if (target) {
      target.isActive = false;
      await workspace.save();
    }

    return res.status(200).json({ message: "Acting manager removed successfully." });
  } catch (error) {
    next(error);
  }
};

export const updateOrganizationMemberRole = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    });
    if (!member) return res.status(404).json({ message: "Member not found." });

    const previousRoleBand = getRoleBand(member.role);
    const nextRole = normalizeRoleForStorage(req.body?.role || member.role);
    const nextRoleBand = getRoleBand(nextRole);
    const requestedDepartments = Array.isArray(req.body?.departments) ? req.body.departments : [];
    const normalizedDepartments = requestedDepartments
      .map((departmentId) => workspace.organizationDepartments?.id(departmentId)?.name || String(departmentId || "").trim())
      .filter(Boolean);

    const isSuperAdminToAdmin = previousRoleBand === "super_admin" && nextRoleBand === "admin";
    const isAdminToManager = previousRoleBand === "admin" && nextRoleBand === "manager";
    const isManagerToAdmin = previousRoleBand === "manager" && nextRoleBand === "admin";

    if ((isSuperAdminToAdmin || isManagerToAdmin) && normalizedDepartments.length === 0) {
      return res.status(400).json({
        message: "Select at least one department for this role change.",
      });
    }

    if (isAdminToManager && normalizedDepartments.length !== 1) {
      return res.status(400).json({
        message: "Manager role requires exactly one department.",
      });
    }

    member.role = nextRole;
    if (isSuperAdminToAdmin || isAdminToManager || isManagerToAdmin) {
      member.departments = normalizedDepartments;
    }
    await member.save();

    return res.status(200).json({ message: "Member role updated successfully." });
  } catch (error) {
    next(error);
  }
};

export const updateOrganizationMemberAccess = async (req, res, next) => {
  try {
    const { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace not found for this user." });

    const member = await WorkspaceMember.findOne({
      _id: req.params.memberId,
      workspace: workspace._id,
      isActive: true,
    });
    if (!member) return res.status(404).json({ message: "Member not found." });

    member.grantedModules = Array.isArray(req.body?.accessModules)
      ? req.body.accessModules.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    await member.save();

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

    const nextRole = normalizeRoleForStorage(req.body?.role || member.role);
    const requestedDepartmentIds = Array.isArray(req.body?.departments) ? req.body.departments : [];
    const targetDepartments = requestedDepartmentIds
      .map((departmentId) => targetWorkspace.organizationDepartments?.id(departmentId)?.name || String(departmentId || "").trim())
      .filter(Boolean);

    await WorkspaceMember.findOneAndUpdate(
      { workspace: targetWorkspace._id, user: member.user },
      {
        $set: {
          role: nextRole,
          departments: targetDepartments,
          status: "joined",
          isActive: true,
          grantedModules: Array.isArray(member.grantedModules) ? member.grantedModules : [],
        },
        $push: {
          transferHistory: {
            fromWorkspaceId: workspace._id,
            toWorkspaceId: targetWorkspace._id,
            previousRole: member.role,
            nextRole,
            note: String(req.body?.note || "").trim(),
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

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

    await WorkspaceMember.findOneAndUpdate(
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
    });
    if (!targetMember) return res.status(404).json({ message: "Selected member not found." });
    const normalizedTargetRole = String(targetMember.role || "")
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

    if (previousOwner) {
      previousOwner.role = "super_admin";
      await previousOwner.save();
      await WorkspaceMember.findOneAndUpdate(
        { workspace: workspace._id, user: previousOwner._id },
        { $set: { role: "super_admin", isActive: true, status: "joined" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    nextOwner.role = "owner";
    await nextOwner.save();
    await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: nextOwner._id },
      { $set: { role: "owner", isActive: true, status: "joined" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({ message: "Founder access transferred successfully." });
  } catch (error) {
    next(error);
  }
};
