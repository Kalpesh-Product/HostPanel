// @ts-nocheck
import jwt from "jsonwebtoken";
import HostUser from "../models/HostUser.js";
import Company from "../models/Company.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";

const buildAuthUserPayload = (
  user: any,
  company: any,
  workspaceCount = 0,
  workspaceMembership: any = null,
  accessibleWorkspaces: any[] = [],
  hasCompletedWorkspaceSetupOverride: boolean | null = null,
) => ({
  ...user,
  companyName: company?.companyName,
  logo: company?.logo,
  isWebsiteTemplate: company?.isWebsiteTemplate,
  hasCompletedWorkspaceSetup:
    hasCompletedWorkspaceSetupOverride === null
      ? Boolean(user?.hasCompletedWorkspaceSetup)
      : Boolean(hasCompletedWorkspaceSetupOverride),
  primaryWorkspace: user?.primaryWorkspace || null,
  workspaceCount,
  workspaceMembership: workspaceMembership
    ? {
        role: workspaceMembership.role,
        isPrimary: workspaceMembership.isPrimary,
        isActive: workspaceMembership.isActive,
      }
    : user?.workspaceMembership || null,
  accessibleWorkspaces,
});

const getAccessibleWorkspaces = async (userId: any) => {
  const memberships = await WorkspaceMember.find({
    user: userId,
    isActive: true,
  })
    .sort({ isPrimary: -1, createdAt: 1 })
    .populate("workspace")
    .lean()
    .exec();

  return memberships
    .filter((membership: any) => membership?.workspace)
    .map((membership: any) => {
      const workspace = membership.workspace;
      return {
        id: String(workspace?._id || ""),
        workspaceName: workspace?.workspaceName || "Workspace",
        businessName: workspace?.businessName || "",
        location: [workspace?.city, workspace?.state, workspace?.country].filter(Boolean).join(", "),
        isPrimary: Boolean(membership?.isPrimary),
      };
    });
};

const getFounderEmailForWorkspace = async (workspaceId: any) => {
  if (!workspaceId) return "";
  const workspace = await Workspace.findById(workspaceId).populate("owner", "email").lean().exec();
  return workspace?.owner?.email || "";
};

const resolveActiveWorkspaceMembership = async (user: any) => {
  const preferredMembership = await WorkspaceMember.findOne({
    user: user._id,
    isActive: true,
    ...(user?.primaryWorkspace ? { workspace: user.primaryWorkspace } : {}),
  })
    .sort({ isPrimary: -1, createdAt: 1 })
    .lean()
    .exec();

  if (preferredMembership) {
    return preferredMembership;
  }

  return WorkspaceMember.findOne({ user: user._id, isActive: true })
    .sort({ isPrimary: -1, createdAt: 1 })
    .lean()
    .exec();
};

const resolveCompanyForActiveWorkspace = async (user: any, activeMembership: any) => {
  if (activeMembership?.workspace) {
    const activeWorkspace = await Workspace.findById(activeMembership.workspace)
      .select("company companyId businessName")
      .lean()
      .exec();

    if (activeWorkspace) {
      const companyFromWorkspace =
        (activeWorkspace?.company
          ? await Company.findById(activeWorkspace.company).lean().exec()
          : null) ||
        (activeWorkspace?.companyId
          ? await Company.findOne({ companyId: activeWorkspace.companyId }).lean().exec()
          : null);

      if (companyFromWorkspace) {
        const workspaceBusinessName = String(activeWorkspace?.businessName || "")
          .trim()
          .toLowerCase();
        const resolvedCompanyName = String(companyFromWorkspace?.companyName || "")
          .trim()
          .toLowerCase();

        if (workspaceBusinessName && resolvedCompanyName && workspaceBusinessName !== resolvedCompanyName) {
          return null;
        }

        return companyFromWorkspace;
      }

      const workspaceBusinessName = String(activeWorkspace?.businessName || "").trim();
      if (workspaceBusinessName) {
        const workspaceMatchedCompany = await Company.findOne({
          companyName: new RegExp(
            `^${workspaceBusinessName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        })
          .lean()
          .exec();

        if (workspaceMatchedCompany) {
          return workspaceMatchedCompany;
        }
      }
    }
  }

  const linkedCompanyId =
    typeof user?.company === "string"
      ? user.company
      : user?.company?._id || user?.company?.id || null;

  return (
    (user?.companyId ? await Company.findOne({ companyId: user.companyId }).lean().exec() : null) ||
    (linkedCompanyId ? await Company.findById(linkedCompanyId).lean().exec() : null)
  );
};

const refreshTokenController = async (req, res, next) => {
  try {
    const cookie = req.cookies;
    const headerRefreshToken =
      req.headers["x-refresh-token"] ||
      (String(req.headers?.authorization || "").startsWith("Bearer ")
        ? String(req.headers.authorization).split(" ")[1]
        : "");
    const refreshToken = String(headerRefreshToken || cookie?.clientCookie || "");
    if (!refreshToken) {
      return res.sendStatus(401);
    }
    const user = await HostUser.findOne({ refreshToken }).lean().exec();
    if (user?.isActive === false) {
      res.clearCookie("clientCookie", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });
      return res.status(403).json({
        code: "ACCOUNT_DISABLED",
        message: "Account access disabled by founder.",
      });
    }
    const activeMembership = user ? await resolveActiveWorkspaceMembership(user) : null;
    let hasCompletedWorkspaceSetupForSession = Boolean(user?.hasCompletedWorkspaceSetup);
    if (user?.hasCompletedWorkspaceSetup && !activeMembership) {
      const lastMembership = await WorkspaceMember.findOne({ user: user._id })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean()
        .exec();
      const disabledByFounder =
        lastMembership &&
        (lastMembership.isActive === false ||
          String(lastMembership.status || "").toLowerCase() === "disabled");

      if (disabledByFounder) {
        const founderEmail = await getFounderEmailForWorkspace(lastMembership?.workspace);
        await HostUser.findByIdAndUpdate(user._id, { refreshToken: "" }).exec();
        res.clearCookie("clientCookie", {
          httpOnly: true,
          sameSite: "None",
          secure: true,
        });
        return res.status(403).json({
          code: "ACCOUNT_DISABLED",
          founderEmail: founderEmail || "",
          message: "Account access disabled by founder.",
        });
      }
      hasCompletedWorkspaceSetupForSession = false;
    }
    const company = await resolveCompanyForActiveWorkspace(user, activeMembership);
    if (!user) {
      return res.sendStatus(401);
    }
    const workspaceCount = await WorkspaceMember.countDocuments({
      user: user._id,
      isActive: true,
    });
    const workspaceMembership = activeMembership;
    const accessibleWorkspaces = await getAccessibleWorkspaces(user._id);
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err) {
          return res.sendStatus(403);
        }
        const accessToken = jwt.sign(
          { userInfo: { ...decoded.userInfo } },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );
        delete user.password;
        delete user.refreshToken;
        res.status(200).json({
          user: buildAuthUserPayload(
            user,
            company,
            workspaceCount,
            workspaceMembership,
            accessibleWorkspaces,
            hasCompletedWorkspaceSetupForSession,
          ),
          accessToken,
          refreshToken,
        });
      }
    );
  } catch (error) {
    next(error);
  }
};

export default refreshTokenController;

