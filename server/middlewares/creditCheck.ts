// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";

const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
};

export const checkAndDeductCredit = async (req, res, next) => {
  try {
    const workspaceId =
      req.body?.workspaceId ||
      req.query?.workspaceId ||
      req.headers["x-workspace-id"];

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
    }

    const now = new Date();
    const resetDate = subscription.creditsResetDate
      ? new Date(subscription.creditsResetDate)
      : null;

    if (!resetDate || now > resetDate) {
      subscription.creditsUsed = 0;
      subscription.creditsResetDate = getFirstDayOfNextMonthUtc();
      await subscription.save();
    }

    if (subscription.creditsUsed >= subscription.creditsLimit) {
      return res.status(403).json({
        error: "no_credits_remaining",
        message: "You have used all 5 credits for this month.",
        creditsUsed: 5,
        creditsLimit: 5,
        resetDate: subscription.creditsResetDate,
      });
    }

    subscription.creditsUsed += 1;
    await subscription.save();

    req.subscription = subscription;
    return next();
  } catch (error) {
    return next(error);
  }
};
