// @ts-nocheck
import Company from "../models/Company.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];

const buildAuthUserPayload = (user: any, company: any, workspaceMembership: any = null) => ({
  ...user,
  companyName: company?.companyName,
  logo: company?.logo,
  isWebsiteTemplate: company?.isWebsiteTemplate,
  hasCompletedWorkspaceSetup: Boolean(user?.hasCompletedWorkspaceSetup),
  primaryWorkspace: user?.primaryWorkspace || null,
  workspaceCount: 1,
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
    const { workspaceDetails, selectedPlan, enabledModuleIds, modules } = req.body;

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

    if (user.primaryWorkspace && user.hasCompletedWorkspaceSetup) {
      return res.status(409).json({
        message: "Workspace setup is already completed for this user.",
      });
    }

    const normalizedWorkspaceName = String(
      workspaceDetails.workspaceName || "",
    ).trim();
    const normalizedBusinessName = String(
      workspaceDetails.businessName || "",
    ).trim();
    const normalizedBrandName = String(workspaceDetails.brandName || "").trim();

    if (!normalizedWorkspaceName || !normalizedBusinessName) {
      return res.status(400).json({
        message: "Workspace name and business name are required.",
      });
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
          isPrimary: true,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    user.name = user.name || normalizedBrandName || normalizedBusinessName;
    user.primaryWorkspace = workspace._id;
    user.hasCompletedWorkspaceSetup = true;
    user.isActive = true;
    await user.save();

    const updatedUser = await HostUser.findById(user._id).lean().exec();
    const updatedCompany =
      (company?._id && (await Company.findById(company._id).lean().exec())) ||
      null;

    return res.status(201).json({
      message: "Workspace created successfully.",
      workspace,
      user: buildAuthUserPayload(updatedUser, updatedCompany, workspaceMembership),
    });
  } catch (error) {
    next(error);
  }
};
