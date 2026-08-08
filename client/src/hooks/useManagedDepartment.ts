import useDashboardAccess from "./useDashboardAccess";

export interface ManagedDepartment {
  id: string;
  name: string;
  moduleIds: string[];
}

export interface UseManagedDepartmentResult {
  isLoading: boolean;
  /** True when the current member's role band is "manager" */
  isManager: boolean;
  /** True for owner/super_admin — no single "own department" concept applies to them */
  isOwnerOrSuperAdmin: boolean;
  /** The manager's own department (a manager is always assigned to exactly one). Null for non-managers. */
  managedDepartment: ManagedDepartment | null;
}

/**
 * A department manager is always assigned to exactly one department
 * (assignOrganizationDepartmentManager overwrites membership.departments with
 * a single-element array server-side), so departments[0] is the manager's
 * own department. Built on top of useDashboardAccess rather than the
 * duplicated getManagedDepartments()-style name-matching logic scattered
 * across AttendancePage.tsx and friends.
 */
export default function useManagedDepartment(): UseManagedDepartmentResult {
  const { roleBand, departments, isLoading } = useDashboardAccess();
  const isManager = roleBand === "manager";
  const isOwnerOrSuperAdmin = roleBand === "owner" || roleBand === "super_admin";
  const managedDepartment = isManager ? departments[0] ?? null : null;

  return { isLoading, isManager, isOwnerOrSuperAdmin, managedDepartment };
}
