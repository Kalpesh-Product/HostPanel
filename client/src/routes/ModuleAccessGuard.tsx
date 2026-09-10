import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import useDashboardAccess from "../hooks/useDashboardAccess";
import { isModuleLockedForPlan } from "../utils/workspacePlanAccess";
import { getGatedModuleIdForPath } from "../utils/gatedModuleRoutes";
import AccessDeniedPage from "../pages/AccessDeniedPage";

// Mirrors Sidebar.tsx's ORG_CHILD_KEYS: a member granted any organization
// sub-permission (Users/Departments tabs, invite, role change, access toggle,
// department create/edit, manager assignment) sees Organization Management in
// the sidebar even when the "organization-management" id itself isn't in their
// grantedModules.
const ORG_CHILD_KEYS = new Set([
  "org-tab-users",
  "org-tab-departments",
  "org-users-invite-member",
  "org-users-change-role",
  "org-users-toggle-access",
  "org-departments-create",
  "org-departments-edit",
  "org-departments-assign-manager",
  "org-departments-assign-acting-manager",
  "org-departments-remove-acting-manager",
]);

const normalizeModuleToken = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

// Same alias set as Sidebar.tsx (visitor-management/visitors-management) plus
// the department fallbacks it resolves (administration-visitor-management ->
// visitors-management, housekeeping -> house-keeping).
const MODULE_ID_EQUIVALENTS: Record<string, string[]> = {
  "visitor-management": ["visitor-management", "visitors-management"],
  "visitors-management": ["visitor-management", "visitors-management"],
  "administration-visitor-management": [
    "visitor-management",
    "visitors-management",
    "administration-visitor-management",
  ],
  housekeeping: ["house-keeping", "housekeeping"],
  "house-keeping": ["house-keeping", "housekeeping"],
};

export const hasEquivalentModuleId = (ids: Set<string>, moduleId: string): boolean => {
  const id = String(moduleId || "").trim();
  if (!id) return false;
  const candidates = [id, ...(MODULE_ID_EQUIVALENTS[id] || [])];
  return candidates.some((candidate) => ids.has(candidate));
};

// Central checkpoint for direct-URL access to module pages. Mounted once
// around MainLayout's <Outlet /> so every route is covered without having to
// wrap each one individually. A route is only reachable when the module it
// maps to would actually be unlocked for the current member in the sidebar:
//   1. role axis  — founder/super_admin can see every enabled module; everyone
//      else only what their grantedModules allow (plus Organization Management
//      when any org sub-permission is granted),
//   2. workspace/plan axis — the module must be enabled on this workspace and
//      not hard-locked for the workspace's plan.
// Tenant-portal routes use a separate access model and are skipped entirely.
export default function ModuleAccessGuard({
  isTenantRoute,
  children,
}: {
  isTenantRoute: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const { plan, grantedModuleIds, workspaceEnabledModuleIds, roleBand, isLoading } =
    useDashboardAccess();

  if (isTenantRoute) return <>{children}</>;

  const gatedModuleId = getGatedModuleIdForPath(location.pathname);
  if (!gatedModuleId) return <>{children}</>;

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-slate-100 bg-white" />;
  }

  if (!isModuleAllowedForMember({ moduleId: gatedModuleId, roleBand, grantedModuleIds, workspaceEnabledModuleIds }, plan)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}

export function isModuleAllowedForMember(
  {
    moduleId,
    roleBand,
    grantedModuleIds,
    workspaceEnabledModuleIds,
  }: {
    moduleId: string;
    roleBand: string;
    grantedModuleIds: Set<string>;
    workspaceEnabledModuleIds: string[];
  },
  plan: string,
): boolean {
  // Workspace axis: the module must actually be enabled on this workspace
  // (the sidebar's workspaceUnlocked). This keeps Basic/Professional/Custom
  // plan-gated modules unreachable until the workspace has them enabled, and
  // lets staff toggle a module off in master panel to revoke it everywhere.
  const workspaceEnabledIds = new Set(
    workspaceEnabledModuleIds.map((id) => String(id || "").trim()).filter(Boolean),
  );
  const workspaceUnlocked = hasEquivalentModuleId(workspaceEnabledIds, moduleId);

  // Role axis: founder/super_admin are the management bands — they get every
  // workspace-enabled module (mirroring the sidebar's founder-core-modules
  // section and the server granting super_admin the full enabled set by
  // default). Every other band grants are the member's grantedModules, plus
  // the Organization Management auto-add when any org sub-permission is held.
  const isManagementBand = roleBand === "owner" || roleBand === "super_admin";
  const grantedNormalized = new Set(
    Array.from(grantedModuleIds)
      .map((id) => normalizeModuleToken(String(id || "")))
      .filter(Boolean),
  );
  const hasOrgAutoAdd =
    moduleId === "organization-management" &&
    Array.from(ORG_CHILD_KEYS).some((key) => grantedNormalized.has(key));
  const roleUnlocked =
    isManagementBand || hasOrgAutoAdd || hasEquivalentModuleId(grantedModuleIds, moduleId);

  // Plan axis: a few module ids are hard-locked for Basic even if the
  // workspace data still lists them as enabled (mirrors Sidebar's
  // basicPlanLocked + isModuleLockedForPlan).
  const planLocked = isModuleLockedForPlan(plan, moduleId);

  return workspaceUnlocked && roleUnlocked && !planLocked;
}
