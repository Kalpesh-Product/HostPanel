export type DeptSlug = "hr" | "administration" | "sales" | "finance" | "maintenance" | "tech" | "it";

const MATCHERS: { slug: DeptSlug; matches: (department: string) => boolean }[] = [
  { slug: "hr", matches: (department) => department === "hr" || department.startsWith("hr") },
  { slug: "administration", matches: (department) => department === "administration" || department.startsWith("administration") },
  { slug: "sales", matches: (department) => department === "sales" || department.startsWith("sales") },
  { slug: "finance", matches: (department) => department === "finance" || department.startsWith("finance") },
  { slug: "maintenance", matches: (department) => department === "maintenance" || department.startsWith("maintenance") },
  { slug: "tech", matches: (department) => department === "tech" || department.startsWith("tech") || department === "technology" || department.startsWith("technology") },
  { slug: "it", matches: (department) => department === "it" || department.startsWith("it") },
];

/**
 * Matches a raw department name (e.g. "HR", "Human Resources") against one of
 * the 7 known department slugs. Shared by DashboardIndex.tsx (routing) and
 * AdminDashboardOverview.tsx (widget selection) so the two never drift apart.
 */
export function matchDepartmentSlug(name: unknown): DeptSlug | null {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return null;
  const found = MATCHERS.find((m) => m.matches(normalized));
  return found ? found.slug : null;
}

export function departmentSlugMatches(slug: DeptSlug, name: unknown): boolean {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return false;
  const matcher = MATCHERS.find((m) => m.slug === slug);
  return matcher ? matcher.matches(normalized) : false;
}
