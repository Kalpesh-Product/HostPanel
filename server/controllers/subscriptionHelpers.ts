// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";
import {
  creditsForPlan,
  resolveWorkspacePlan,
  syncSubscriptionPlan,
} from "../utils/websiteCredits.js";

export { creditsForPlan, resolveWorkspacePlan };
export const MONTHLY_BASE_CREDITS = 5;

export const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
};

const normalizeId = (value: any) => String(value || "").trim();

const buildCandidateClauses = ({
  companyId,
  workspaceId,
  routeId,
}: {
  companyId?: string;
  workspaceId?: string;
  routeId?: string;
}) => {
  const normalizedCompanyId = normalizeId(companyId);
  const normalizedWorkspaceId = normalizeId(workspaceId);
  const normalizedRouteId = normalizeId(routeId);
  const clauses: Array<Record<string, string>> = [];
  const seen = new Set<string>();

  const pushClause = (clause: Record<string, string>) => {
    const key = JSON.stringify(clause);
    if (seen.has(key)) return;
    seen.add(key);
    clauses.push(clause);
  };

  if (normalizedCompanyId && normalizedWorkspaceId) {
    pushClause({ companyId: normalizedCompanyId, workspaceId: normalizedWorkspaceId });
  }

  if (normalizedCompanyId) {
    pushClause({ companyId: normalizedCompanyId });
  }

  if (normalizedWorkspaceId) {
    pushClause({ workspaceId: normalizedWorkspaceId });
  }

  if (normalizedRouteId) {
    pushClause({ companyId: normalizedRouteId });
    pushClause({ workspaceId: normalizedRouteId });
  }

  return clauses;
};

export const findWorkspaceSubscription = async ({
  companyId,
  workspaceId,
  routeId,
}: {
  companyId?: string;
  workspaceId?: string;
  routeId?: string;
}) => {
  const clauses = buildCandidateClauses({ companyId, workspaceId, routeId });

  for (const clause of clauses) {
    const subscription = await WorkspaceSubscription.findOne(clause)
      .sort({ addOnCreditsPurchased: -1, updatedAt: -1, createdAt: -1 })
      .exec();
    if (subscription) return subscription;
  }

  return null;
};

export const renewMonthlyCreditsIfNeeded = async (subscription: any) => {
  if (!subscription) return subscription;

  // Plan (and its plan-based creditsLimit) is synced from the workspace's
  // selectedPlan — professional: 8, custom: 12, basic: 5.
  subscription = await syncSubscriptionPlan(subscription);

  const now = new Date();
  const resetDate = subscription.creditsResetDate ? new Date(subscription.creditsResetDate) : null;
  const resetExpired = !resetDate || Number.isNaN(resetDate.getTime()) || now >= resetDate;

  if (resetExpired) {
    subscription.creditsUsed = 0;
    subscription.creditsLimit = creditsForPlan(subscription.plan);
    subscription.creditsResetDate = getFirstDayOfNextMonthUtc();
    await subscription.save();
  }

  return subscription;
};
