// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";
import {
  MONTHLY_BASE_CREDITS,
  creditsForPlan,
  findWorkspaceSubscription,
  getFirstDayOfNextMonthUtc,
  renewMonthlyCreditsIfNeeded,
  resolveWorkspacePlan,
} from "./subscriptionHelpers.js";

export const getSubscription = async (req, res, next) => {
  try {
    const routeId = String(
      req.params?.companyId ||
      req.params?.workspaceId ||
      "",
    ).trim();
    const queryCompanyId = String(req.query?.companyId || "").trim();
    const queryWorkspaceId = String(req.query?.workspaceId || "").trim();
    const companyId = queryCompanyId || routeId;
    const workspaceId = queryWorkspaceId || routeId;

    if (!routeId && !companyId && !workspaceId) {
      return res.status(400).json({ error: "companyId or workspaceId is required" });
    }

    let subscription = await findWorkspaceSubscription({
      companyId,
      workspaceId,
      routeId,
    });

    if (!subscription) {
      const plan = await resolveWorkspacePlan({ workspaceId, companyId });
      subscription = await WorkspaceSubscription.create({
        companyId: companyId || workspaceId || routeId || undefined,
        workspaceId: workspaceId || companyId || routeId || undefined,
        plan,
        creditsLimit: creditsForPlan(plan),
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    }

    subscription = await renewMonthlyCreditsIfNeeded(subscription);

    const doc = subscription.toObject({ virtuals: true });
    return res.status(200).json(doc);
  } catch (error) {
    return next(error);
  }
};

export const resetCredits = async (req, res, next) => {
  try {
    const workspaceId = req.params?.workspaceId || req.query?.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const adminSecret = req.headers["x-admin-secret"];
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: "forbidden" });
    }

    let subscription = await findWorkspaceSubscription({ workspaceId, routeId: workspaceId });

    if (!subscription) {
      const plan = await resolveWorkspacePlan({ workspaceId });
      subscription = await WorkspaceSubscription.create({
        workspaceId,
        plan,
        creditsLimit: creditsForPlan(plan),
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    } else {
      subscription.creditsLimit = creditsForPlan(subscription.plan);
      subscription.creditsUsed = 0;
      subscription.creditsResetDate = getFirstDayOfNextMonthUtc();
      await subscription.save();
    }

    const doc = subscription.toObject({ virtuals: true });
    return res.status(200).json(doc);
  } catch (error) {
    return next(error);
  }
};

// DEV ONLY - REMOVE BEFORE PRODUCTION.
export const devResetCredits = async (req, res, next) => {
  try {
    const workspaceId = req.params?.workspaceId || req.query?.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    let subscription = await findWorkspaceSubscription({ workspaceId, routeId: workspaceId });

    if (!subscription) {
      const plan = await resolveWorkspacePlan({ workspaceId });
      subscription = await WorkspaceSubscription.create({
        workspaceId,
        plan,
        creditsLimit: creditsForPlan(plan),
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    } else {
      subscription.creditsLimit = creditsForPlan(subscription.plan);
      subscription.creditsUsed = 0;
      subscription.creditsResetDate = getFirstDayOfNextMonthUtc();
      await subscription.save();
    }

    const doc = subscription.toObject({ virtuals: true });
    return res.status(200).json(doc);
  } catch (error) {
    return next(error);
  }
};
