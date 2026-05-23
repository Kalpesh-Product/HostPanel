// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";

const MONTHLY_BASE_CREDITS = 5;

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

    const lookupClauses = [];
    if (companyId) lookupClauses.push({ companyId });
    if (workspaceId) lookupClauses.push({ workspaceId });

    let subscription = await WorkspaceSubscription.findOne({
      $or: lookupClauses.length ? lookupClauses : [{ companyId: identifier }],
    });

    if (!subscription) {
      subscription = await WorkspaceSubscription.create({
        companyId: companyId || workspaceId,
        workspaceId: workspaceId || companyId,
        creditsLimit: MONTHLY_BASE_CREDITS,
        creditsUsed: 0,
        addOnCreditsPurchased: 0,
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

    const effectiveLimit =
      MONTHLY_BASE_CREDITS + Number(subscription.addOnCreditsPurchased || 0);

    if (Number(subscription.creditsUsed || 0) >= effectiveLimit) {
      return res.status(403).json({
        error: "no_credits_remaining",
        message: "You have used all credits for this month.",
        creditsUsed: Number(subscription.creditsUsed || 0),
        creditsLimit: MONTHLY_BASE_CREDITS,
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
