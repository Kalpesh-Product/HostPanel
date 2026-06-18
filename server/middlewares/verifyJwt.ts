// @ts-nocheck
import jwt from "jsonwebtoken";
import HostUser from "../models/HostUser.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";
import { resolveActiveWorkspaceMembership } from "../utils/resolveMembership.js";

const getFounderEmailForWorkspace = async (workspaceId: any) => {
  if (!workspaceId) return "";
  const workspace = await Workspace.findById(workspaceId)
    .populate("owner", "email")
    .lean()
    .exec();
  return workspace?.owner?.email || "";
};

const verifyJwt = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.sendStatus(401);
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return res.sendStatus(403);
    }
    try {
      const userId = decoded?.userInfo?._id;
      const user = await HostUser.findById(userId).lean().exec();
      if (!user) {
        return res.sendStatus(401);
      }

      if (user.isActive === false) {
        return res.status(403).json({
          code: "ACCOUNT_DISABLED",
          message: "Account access disabled by founder.",
        });
      }

      if (!user.hasCompletedWorkspaceSetup) {
        req.user = userId;
        return next();
      }

      const activeMembership = await resolveActiveWorkspaceMembership(user);

      if (!activeMembership) {
        const lastMembership = await WorkspaceMember.findOne({ user: user._id })
          .sort({ updatedAt: -1, createdAt: -1 })
          .lean()
          .exec();
        const founderEmail = await getFounderEmailForWorkspace(lastMembership?.workspace);
        const disabledByFounder =
          lastMembership &&
          (lastMembership.isActive === false ||
            String(lastMembership.status || "").toLowerCase() === "disabled");

        if (disabledByFounder) {
          return res.status(403).json({
            code: "ACCOUNT_DISABLED",
            founderEmail: founderEmail || "",
            message: "Account access disabled by founder.",
          });
        }

        req.user = userId;
        req.userNeedsWorkspaceSetup = true;
        return next();
      }

      req.workspaceMembership = {
        workspace: String(activeMembership.workspace || ""),
        role:
          activeMembership.role?.name ||
          (typeof activeMembership.role === "string" ? activeMembership.role : "member"),
        isPrimary: Boolean(activeMembership.isPrimary),
      };
      req.user = userId;
      next();
    } catch (error) {
      return next(error);
    }
  });
};

export default verifyJwt;
