// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";
import Workspace from "../models/Workspace.js";
import {
  creditsForPlan,
  loadCreditsSettings,
  normalizeCompanyKey,
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

  // The website builder (and therefore its credit pool) is shared by every unit
  // of a company, so the company key is tried first and is authoritative.
  // workspaceId / routeId only cover legacy rows that predate the company key.
  if (normalizedCompanyId) {
    pushClause({ companyId: normalizeCompanyKey(normalizedCompanyId) });
  }

  if (normalizedCompanyId && normalizedWorkspaceId) {
    pushClause({ companyId: normalizedCompanyId, workspaceId: normalizedWorkspaceId });
  }

  if (normalizedWorkspaceId) {
    pushClause({ workspaceId: normalizedWorkspaceId });
  }

  if (normalizedRouteId) {
    pushClause({ companyId: normalizeCompanyKey(normalizedRouteId) });
    pushClause({ workspaceId: normalizedRouteId });
  }

  return clauses;
};

// The company that owns a workspace/unit — the key of its shared credit pool.
// Used by the admin/dev reset endpoints, which only receive a workspaceId.
export const resolveCompanyKeyFromWorkspace = async (workspaceId?: string) => {
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  if (!normalizedWorkspaceId || !/^[a-f0-9]{24}$/i.test(normalizedWorkspaceId)) {
    return "";
  }
  const workspace = await Workspace.findById(normalizedWorkspaceId)
    .select("companyId")
    .lean()
    .exec();
  return normalizeCompanyKey(workspace?.companyId || "");
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
  // selectedPlan and the Master-Panel-controlled per-plan limits, so a changed
  // limit reaches the website builder on the next subscription read.
  await loadCreditsSettings();
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
