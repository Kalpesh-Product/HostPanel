// @ts-nocheck
import WebsiteCreditLedger from "../models/WebsiteCreditLedger.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";

const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ""));

const remainingOf = (subscription) => {
  if (!subscription) return undefined;
  const limit =
    Number(subscription.creditsLimit || 0) +
    Number(subscription.addOnCreditsPurchased || 0);
  return Math.max(0, limit - Number(subscription.creditsUsed || 0));
};

// Records a credit movement in the shared ledger shown on the master panel's
// Website Credits page. Called fire-and-forget so it never blocks a publish.
const recordWebsiteCreditEvent = async ({
  req,
  type, // "used" | "added"
  credits = 1,
  subscription = null,
  workspaceId = "",
  companyId = "",
  description = "",
}) => {
  try {
    const user = req?.user
      ? await HostUser.findById(req.user).select("name email").lean().exec()
      : null;

    const resolvedWorkspaceId = String(
      workspaceId || subscription?.workspaceId || "",
    ).trim();

    let workspaceName = String(subscription?.workspaceName || "").trim();
    if (!workspaceName && isObjectId(resolvedWorkspaceId)) {
      const workspace = await Workspace.findById(resolvedWorkspaceId)
        .select("workspaceName")
        .lean()
        .exec();
      workspaceName = workspace?.workspaceName || "";
    }

    await WebsiteCreditLedger.create({
      type,
      credits: Number(credits) || 0,
      sourcePanel: "host_panel",
      companyId: String(companyId || subscription?.companyId || "").trim(),
      companyName: String(subscription?.companyName || "").trim(),
      workspaceId: resolvedWorkspaceId,
      workspaceName,
      performedById: String(user?._id || req?.user || ""),
      performedByName: user?.name || "",
      performedByEmail: String(user?.email || "").toLowerCase(),
      description,
      remainingAfter: remainingOf(subscription),
    });
  } catch (error) {
    console.error(
      "Error recording website credit event:",
      error?.message || error,
    );
  }
};

export default recordWebsiteCreditEvent;
