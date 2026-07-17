// @ts-nocheck
import HostActivityLog from "../models/HostActivityLog.js";
import HostCompany from "../models/Company.js";
import Workspace from "../models/Workspace.js";

// Records sign in / sign out events into the shared activity log read by the
// master panel. Called fire-and-forget from the auth controllers so it never
// delays the auth response.
const logAuthEvent = async ({
  user,
  action, // "Sign In" | "Sign Out"
  req,
  company = null,
  workspaceId = "",
}) => {
  try {
    if (!user?._id) return;

    let companyName = company?.companyName || "";
    if (!companyName && user.company) {
      const companyDoc = await HostCompany.findById(user.company)
        .select("companyName")
        .lean()
        .exec();
      companyName = companyDoc?.companyName || "";
    }

    const resolvedWorkspaceId = String(
      workspaceId || user.primaryWorkspace || "",
    );
    let workspaceName = "";
    if (resolvedWorkspaceId) {
      const workspace = await Workspace.findById(resolvedWorkspaceId)
        .select("workspaceName")
        .lean()
        .exec();
      workspaceName = workspace?.workspaceName || "";
    }

    await HostActivityLog.create({
      performedBy: user._id,
      fullName: user.name || user.email || "Unknown",
      email: user.email || "",
      action,
      module: "Auth",
      companyId: user.companyId || "",
      companyName,
      workspaceId: resolvedWorkspaceId,
      workspaceName,
      method: req?.method || "",
      statusCode: 200,
      success: true,
      ipAddress: req?.ip || "",
    });
  } catch (error) {
    console.error("Error logging auth activity:", error?.message || error);
  }
};

export default logAuthEvent;
