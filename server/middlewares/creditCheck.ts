// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";
import {
  creditsForPlan,
  resolveWorkspacePlan,
  syncSubscriptionPlan,
} from "../utils/websiteCredits.js";
import { findWorkspaceSubscription } from "../controllers/subscriptionHelpers.js";

const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
};

export const checkAndDeductCredit = async (req, res, next) => {
  try {
    const companyId = String(req.body?.companyId || req.query?.companyId || "").trim();
    const workspaceId = String(
      req.body?.workspaceId || req.query?.workspaceId || req.headers["x-workspace-id"] || "",
    ).trim();
    const identifier = companyId || workspaceId;

    if (!identifier) {
      return res.status(400).json({ error: "companyId or workspaceId is required" });
    }

    // Prefer the exact (companyId, workspaceId) pool; only fall back to a single
    // id when that's all we have. A plain companyId-OR-workspaceId match would
    // return whichever doc happens to share one id — the wrong workspace's pool
    // for a company that runs multiple workspaces.
    let subscription = await findWorkspaceSubscription({
      companyId,
      workspaceId,
      routeId: identifier,
    });

    if (!subscription) {
      const plan = await resolveWorkspacePlan({ workspaceId, companyId });
      subscription = await WorkspaceSubscription.create({
        companyId: companyId || workspaceId,
        workspaceId: workspaceId || companyId,
        plan,
        creditsLimit: creditsForPlan(plan),
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    } else {
      // Keep plan + limit in sync with the workspace's current plan so
      // upgrades/downgrades take effect without waiting for the monthly reset.
      subscription = await syncSubscriptionPlan(subscription);
    }

    const monthlyLimit = creditsForPlan(subscription.plan);

    const now = new Date();
    const resetDate = subscription.creditsResetDate
      ? new Date(subscription.creditsResetDate)
      : null;

    if (!resetDate || now > resetDate) {
      subscription.creditsUsed = 0;
      subscription.creditsResetDate = getFirstDayOfNextMonthUtc();
      await subscription.save();
    }

    const effectiveLimit =
      monthlyLimit + Number(subscription.addOnCreditsPurchased || 0);

    if (Number(subscription.creditsUsed || 0) >= effectiveLimit) {
      return res.status(403).json({
        error: "no_credits_remaining",
        message: "You have used all credits for this month.",
        creditsUsed: Number(subscription.creditsUsed || 0),
        creditsLimit: monthlyLimit,
        addOnCreditsPurchased: Number(subscription.addOnCreditsPurchased || 0),
        resetDate: subscription.creditsResetDate,
      });
    }

    req.subscription = subscription;
    return next();
  } catch (error) {
    return next(error);
  }
};
