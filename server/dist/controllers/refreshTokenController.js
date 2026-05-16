// @ts-nocheck
import jwt from "jsonwebtoken";
import HostUser from "../models/HostUser.js";
import Company from "../models/Company.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";
const buildAuthUserPayload = (user, company, workspaceCount = 0, workspaceMembership = null) => ({
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
const getFounderEmailForWorkspace = async (workspaceId) => {
    if (!workspaceId)
        return "";
    const workspace = await Workspace.findById(workspaceId).populate("owner", "email").lean().exec();
    return workspace?.owner?.email || "";
};
const resolveActiveWorkspaceMembership = async (user) => {
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
const refreshTokenController = async (req, res, next) => {
    try {
        const cookie = req.cookies;
        const headerRefreshToken = req.headers["x-refresh-token"] ||
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
        if (user?.hasCompletedWorkspaceSetup && !activeMembership) {
            const lastMembership = await WorkspaceMember.findOne({ user: user._id })
                .sort({ updatedAt: -1, createdAt: -1 })
                .lean()
                .exec();
            const founderEmail = await getFounderEmailForWorkspace(lastMembership?.workspace);
            await HostUser.findByIdAndUpdate(user._id, { refreshToken: "" }).exec();
            res.clearCookie("clientCookie", {
                httpOnly: true,
                sameSite: "None",
                secure: true,
            });
            const disabledByFounder = lastMembership &&
                (lastMembership.isActive === false ||
                    String(lastMembership.status || "").toLowerCase() === "disabled");
            if (disabledByFounder) {
                return res.status(403).json({
                    code: "ACCOUNT_DISABLED",
                    founderEmail: founderEmail || "",
                    message: "Account access disabled by founder.",
                });
            }
            return res.status(403).json({
                code: "ACCESS_DENIED",
                founderEmail: founderEmail || "",
                message: founderEmail
                    ? `Access denied. Contact founder at ${founderEmail} to regain access.`
                    : "Access denied. Contact founder to regain access.",
            });
        }
        const company = await Company.findOne({ companyId: user?.companyId })
            .lean()
            .exec();
        if (!user) {
            return res.sendStatus(401);
        }
        const workspaceCount = await WorkspaceMember.countDocuments({
            user: user._id,
            isActive: true,
        });
        const workspaceMembership = activeMembership;
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.sendStatus(403);
            }
            const accessToken = jwt.sign({ userInfo: { ...decoded.userInfo } }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
            delete user.password;
            delete user.refreshToken;
            res.status(200).json({
                user: buildAuthUserPayload(user, company, workspaceCount, workspaceMembership),
                accessToken,
                refreshToken,
            });
        });
    }
    catch (error) {
        next(error);
    }
};
export default refreshTokenController;
