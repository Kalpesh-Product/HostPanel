import {
  canAccessHRDashboard,
  canAccessAdministrationDashboard,
  canAccessSalesDashboard,
  canAccessFinanceDashboard,
  canAccessMaintenanceDashboard,
  canAccessTechDashboard,
  canAccessITDashboard,
} from "../../lib/auth-session";
import { departmentSlugMatches, type DeptSlug } from "../../lib/departmentSlug";

export type DashboardVariant = "founder" | DeptSlug | "admin" | "employee";

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function toDepartmentName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    return String((value as { name?: unknown }).name || "");
  }
  return "";
}

function getOwnRoleBand(user: unknown): string {
  const role = String(
    (user as { workspaceMembership?: { role?: string }; role?: string } | null)?.workspaceMembership?.role ||
      (user as { role?: string } | null)?.role ||
      "",
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return role;
}

const DEPARTMENT_ROUTES: {
  slug: DeptSlug;
  matches: (department: string) => boolean;
  canAccess: (user: unknown) => boolean;
}[] = [
  { slug: "hr", matches: (department) => departmentSlugMatches("hr", department), canAccess: canAccessHRDashboard },
  { slug: "administration", matches: (department) => departmentSlugMatches("administration", department), canAccess: canAccessAdministrationDashboard },
  { slug: "sales", matches: (department) => departmentSlugMatches("sales", department), canAccess: canAccessSalesDashboard },
  { slug: "finance", matches: (department) => departmentSlugMatches("finance", department), canAccess: canAccessFinanceDashboard },
  { slug: "maintenance", matches: (department) => departmentSlugMatches("maintenance", department), canAccess: canAccessMaintenanceDashboard },
  { slug: "tech", matches: (department) => departmentSlugMatches("tech", department), canAccess: canAccessTechDashboard },
  { slug: "it", matches: (department) => departmentSlugMatches("it", department), canAccess: canAccessITDashboard },
];

/**
 * The synchronous half of dashboard-variant resolution: owner/super_admin
 * status and department routing are both read straight off the auth user
 * object, available immediately at login without waiting on
 * useDashboardAccess()'s async fetch. Returns null when neither applies,
 * meaning the caller must fall back to the (async) per-member role band —
 * see resolveDashboardVariant below.
 */
export function resolveSyncDashboardVariant(user: unknown): "founder" | DeptSlug | null {
  const ownRoleBand = getOwnRoleBand(user);
  if (ownRoleBand === "owner" || ownRoleBand === "super_admin") return "founder";

  const departments = [
    (user as any)?.workspaceMembership?.department,
    ...(Array.isArray((user as any)?.workspaceMembership?.departments) ? (user as any).workspaceMembership.departments.map(toDepartmentName) : []),
    (user as any)?.department,
    ...(Array.isArray((user as any)?.departments) ? (user as any).departments.map(toDepartmentName) : []),
    (user as any)?.workspace?.department,
  ]
    .map(normalizeText)
    .filter(Boolean);

  const matchedRoute = DEPARTMENT_ROUTES.find(
    (route) => route.canAccess(user) || (ownRoleBand !== "admin" && departments.some((department) => route.matches(department))),
  );
  return matchedRoute?.slug ?? null;
}

/**
 * Resolves which dashboard renders at /dashboard for a given user — a single
 * source of truth shared by DashboardIndex.tsx (routing) and usePageTour.ts
 * (guide selection), which would otherwise have to re-derive the same rules
 * separately and could drift apart.
 *
 * accessRoleBand is the richer per-member role useDashboardAccess() fetches,
 * used only once the synchronous checks above don't already answer the
 * question. Callers that need to avoid flashing the wrong dashboard while
 * that fetch is in flight (as DashboardIndex does) should gate on
 * useDashboardAccess().isLoading themselves before trusting this fallback —
 * this function has no loading concept of its own.
 */
export function resolveDashboardVariant(user: unknown, accessRoleBand: string): DashboardVariant {
  const syncVariant = resolveSyncDashboardVariant(user);
  if (syncVariant) return syncVariant;

  if (accessRoleBand === "employee") return "employee";
  if (accessRoleBand === "admin") return "admin";
  return "founder";
}
