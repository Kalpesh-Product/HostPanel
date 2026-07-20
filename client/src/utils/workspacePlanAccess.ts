import type { PlanType } from "./inviteOnboarding";

// Hand-synced with BASIC_DEFAULT_IDS / PROFESSIONAL_DEFAULT_IDS in
// server/config/workspaceModuleCatalog.ts, which is itself synced against
// the plan/module tracking sheet ("INC PLAN" column). Keep all three in
// lockstep. Anything tagged "Custom" on that sheet is deliberately absent
// from both lists below — those modules are only ever enabled per-customer
// via master panel's workspace module toggle, never part of a plan's own
// default set.
const BASIC_IDS = [
  "dashboard",
  "customer-support",
  "visitor-management",
  // NOT "visitors-management" (plural) — duplicate id for the same page,
  // used only as the Administration Department tab. See the matching note
  // in server/config/workspaceModuleCatalog.ts.
  "wono-nomad",
  "website-builder",
  "tech-website-builder",
  "website-leads",
  "website-review",
  "organization-management",
  "org_tab_users",
  "org_tab_departments",
  "org_users_invite_member",
  "org_users_change_role",
  "org_users_toggle_access",
  "org_departments_create",
  "org_departments_edit",
  "org_departments_assign_manager",
  "org_departments_assign_acting_manager",
  "org_departments_remove_acting_manager",
  "access-grants",
] as const;

const PROFESSIONAL_EXTRA_IDS = [
  "tickets",
  "meeting-room-system",
  "calendar",
  "workspace-settings",
  // Administration Department (tenant-companies-admin, bookings,
  // resource-management, house-keeping) moved to Custom-only — see the
  // matching note in server/config/workspaceModuleCatalog.ts.
  "leads-management",
  "tenant-companies-sales",
  "resource-pricing",
  "sales-architecture",
] as const;

const WORKSPACE_MANAGEMENT_ID = "workspace-management";
const BASIC_LOCKED_MODULE_IDS = ["workspace-settings"] as const;

export const getWorkspaceCount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const canAccessWorkspaceManagement = (workspaceCount: number) =>
  getWorkspaceCount(workspaceCount) > 1;

export const getEnabledModuleIdsForPlan = (
  plan: PlanType,
  workspaceCount: number,
): string[] => {
  // Custom = Professional's own default set; whatever a customer specifically
  // asked for beyond that is enabled per-workspace via master panel (reflected
  // separately through workspaceAccessMap.enabledModuleIds, not here).
  const enabled = new Set<string>([...BASIC_IDS]);

  if (plan === "professional" || plan === "custom") {
    PROFESSIONAL_EXTRA_IDS.forEach((id) => enabled.add(id));
  }

  if (canAccessWorkspaceManagement(workspaceCount)) {
    enabled.add(WORKSPACE_MANAGEMENT_ID);
  }

  return [...enabled];
};

export const isModuleLockedForPlan = (plan: PlanType, moduleId: string): boolean => {
  if (plan !== "basic") return false;
  return BASIC_LOCKED_MODULE_IDS.includes(moduleId as (typeof BASIC_LOCKED_MODULE_IDS)[number]);
};

// PDF / Excel report exports are a Custom-plan capability only. On pages that
// Basic and Professional plans can also open (Leads, Customer Support,
// Resource Pricing, Sales, etc.) the export controls are hidden for those two
// plans and shown only for Custom.
export const canExportReports = (plan: PlanType): boolean => plan === "custom";

// Reads a workspace plan off any shape the app stores the logged-in user/workspace
// in (auth context user, storedUser from localStorage, organization overview payload).
export const getWorkspacePlan = (user: unknown): PlanType => {
  const raw = String(
    (user as { workspace?: { selectedPlan?: string }; selectedPlan?: string } | null | undefined)
      ?.workspace?.selectedPlan ||
      (user as { selectedPlan?: string } | null | undefined)?.selectedPlan ||
      "basic",
  )
    .trim()
    .toLowerCase();
  return raw === "professional" || raw === "custom" ? (raw as PlanType) : "basic";
};

// Real department catalog keys/names (case-insensitive) allowed per plan on the
// department-selection dropdowns scattered across Visitor Management, Tickets,
// Organization Management, Access Grants, Unit Management, Sales Architecture,
// and Profile Details. Basic plan has no real departments at all — those
// workspaces only ever have a Founder and (optionally) one Super Admin, see
// BASIC_PLAN_PSEUDO_DEPARTMENTS below. Custom plan is unrestricted (full catalog).
const PROFESSIONAL_DEPARTMENT_NAMES = new Set(["sales", "technology"]);

export const getPlanAllowedDepartmentNames = (plan: PlanType): Set<string> | null => {
  if (plan === "basic") return new Set();
  if (plan === "professional") return PROFESSIONAL_DEPARTMENT_NAMES;
  return null; // custom / unrestricted
};

export const isDepartmentAllowedForPlan = (plan: PlanType, departmentName: unknown = ""): boolean => {
  const allowed = getPlanAllowedDepartmentNames(plan);
  if (allowed === null) return true;
  return allowed.has(String(departmentName || "").trim().toLowerCase());
};

// Not real departments — used only where a UI needs to offer "which department"
// on a Basic-plan workspace, whose only members are the Founder and (up to) one
// Super Admin.
export const BASIC_PLAN_PSEUDO_DEPARTMENTS = [
  { id: "founder", name: "Founder" },
  { id: "super_admin", name: "Super Admin" },
] as const;
