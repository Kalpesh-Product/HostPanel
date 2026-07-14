// @ts-nocheck
import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";

export const MONTHLY_BASE_CREDITS = 5;
export const PROFESSIONAL_MONTHLY_CREDITS = 10;

// Monthly website-edit credits are plan-based and tracked on the
// website_credits doc itself: professional workspaces get 10, everything else
// (static-free/basic/custom/unknown) gets the base 5.
export const creditsForPlan = (plan) =>
  String(plan || "").trim() === "professional"
    ? PROFESSIONAL_MONTHLY_CREDITS
    : MONTHLY_BASE_CREDITS;

// Maps the workspace's selectedPlan onto the website_credits plan field.
export const resolveWorkspacePlan = async ({ workspaceId, companyId } = {}) => {
  try {
    const clauses = [];
    const normalizedWorkspaceId = String(workspaceId || "").trim();
    const normalizedCompanyId = String(companyId || "").trim();

    if (
      normalizedWorkspaceId &&
      mongoose.isValidObjectId(normalizedWorkspaceId)
    ) {
      clauses.push({ _id: normalizedWorkspaceId });
    }
    if (normalizedCompanyId) {
      clauses.push({ companyId: normalizedCompanyId });
    }
    if (!clauses.length) return "static-free";

    const workspace = await Workspace.findOne({ $or: clauses })
      .select("selectedPlan")
      .lean()
      .exec();

    return workspace?.selectedPlan === "professional"
      ? "professional"
      : "static-free";
  } catch {
    return "static-free";
  }
};

// Keeps a website_credits doc's plan + creditsLimit in sync with the
// workspace's current plan, so upgrades/downgrades take effect immediately.
// Saves only when something changed; returns the subscription.
export const syncSubscriptionPlan = async (subscription) => {
  if (!subscription) return subscription;

  const plan = await resolveWorkspacePlan({
    workspaceId: subscription.workspaceId,
    companyId: subscription.companyId,
  });
  const limit = creditsForPlan(plan);

  if (
    subscription.plan !== plan ||
    Number(subscription.creditsLimit || 0) !== limit
  ) {
    subscription.plan = plan;
    subscription.creditsLimit = limit;
    await subscription.save();
  }

  return subscription;
};
