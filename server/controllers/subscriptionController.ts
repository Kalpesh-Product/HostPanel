// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";

const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
};

export const getSubscription = async (req, res, next) => {
  try {
    const companyId =
      req.params?.companyId ||
      req.query?.companyId ||
      req.params?.workspaceId ||
      req.query?.workspaceId;

    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    let subscription =
      (await WorkspaceSubscription.findOne({ companyId })) ||
      (await WorkspaceSubscription.findOne({ workspaceId: companyId }));

    if (!subscription) {
      subscription = await WorkspaceSubscription.create({
        companyId,
        creditsLimit: 5,
        creditsUsed: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
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
        creditsLimit: 5,
        creditsUsed: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    } else {
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
        creditsLimit: 5,
        creditsUsed: 0,
        creditsResetDate: getFirstDayOfNextMonthUtc(),
      });
    } else {
      subscription.creditsUsed = 0;
      await subscription.save();
    }

    const doc = subscription.toObject({ virtuals: true });
    return res.status(200).json(doc);
  } catch (error) {
    return next(error);
  }
};
