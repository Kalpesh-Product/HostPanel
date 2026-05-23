// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";

const MONTHLY_BASE_CREDITS = 5;

const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
};

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

    const clauses = [];
    if (routeId) {
      clauses.push({ companyId: routeId }, { workspaceId: routeId });
    }
    if (companyId) clauses.push({ companyId });
    if (workspaceId) clauses.push({ workspaceId });

    const uniqueClauses = Array.from(
      new Map(clauses.map((c) => [JSON.stringify(c), c])).values(),
    );

    let subscription = null;
    if (uniqueClauses.length) {
      subscription = await WorkspaceSubscription.findOne({ $or: uniqueClauses })
        .sort({ addOnCreditsPurchased: -1, updatedAt: -1, createdAt: -1 })
        .exec();
    }

    if (!subscription) {
      subscription = await WorkspaceSubscription.create({
        companyId: companyId || workspaceId,
        workspaceId: workspaceId || companyId,
        creditsLimit: MONTHLY_BASE_CREDITS,
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    } else if (Number(subscription.creditsLimit || 0) !== MONTHLY_BASE_CREDITS) {
      subscription.creditsLimit = MONTHLY_BASE_CREDITS;
      await subscription.save();
    }

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

    let subscription = await WorkspaceSubscription.findOne({ workspaceId });

    if (!subscription) {
      subscription = await WorkspaceSubscription.create({
        workspaceId,
        creditsLimit: MONTHLY_BASE_CREDITS,
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    } else {
      subscription.creditsLimit = MONTHLY_BASE_CREDITS;
      subscription.creditsUsed = 0;
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

    let subscription = await WorkspaceSubscription.findOne({ workspaceId });

    if (!subscription) {
      subscription = await WorkspaceSubscription.create({
        workspaceId,
        creditsLimit: MONTHLY_BASE_CREDITS,
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    } else {
      subscription.creditsLimit = MONTHLY_BASE_CREDITS;
      subscription.creditsUsed = 0;
      await subscription.save();
    }

    const doc = subscription.toObject({ virtuals: true });
    return res.status(200).json(doc);
  } catch (error) {
    return next(error);
  }
};
