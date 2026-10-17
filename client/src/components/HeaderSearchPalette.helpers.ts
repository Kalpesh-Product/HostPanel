type ChildPageRequirement = {
  requiredAccessAny?: string[];
};

type SearchKeyDestination = {
  resultType?: string;
  route: string;
  record?: Record<string, unknown> | null;
};

const normalizeAccessKey = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

// Grants (grantedModules) and permissions (auth.user.permissions.permissions)
// are two parallel id spaces in this codebase: VisitorManagement's hasGrant()
// accepts a key when it appears in either list, and TabLayout/ModuleAccessMap
// read the grant list while VisitorDashboard reads the permission list. Nested
// pages mirror that by treating a key as "held" when it shows up anywhere.
const isAccessKeyHeld = (
  key: string,
  grantedModuleIds: Set<string>,
  userPermissions: string[],
): boolean => {
  const normalized = normalizeAccessKey(key);
  return (
    Array.from(grantedModuleIds).some((id) => normalizeAccessKey(id) === normalized) ||
    userPermissions.some((permission) => normalizeAccessKey(permission) === normalized)
  );
};

// A nested page is only searchable when the current member holds at least one
// of its page-specific keys. Management bands (owner/super_admin) keep their
// normal full access. Pages with no page-specific key inherit the parent
// module check performed by the caller.
export const isAuthorizedChildPage = (
  child: ChildPageRequirement,
  roleBand: string,
  grantedModuleIds: Set<string>,
  userPermissions: string[],
): boolean => {
  if (roleBand === "owner" || roleBand === "super_admin") return true;
  if (!child.requiredAccessAny?.length) return true;
  return child.requiredAccessAny.some((id) =>
    isAccessKeyHeld(id, grantedModuleIds, userPermissions),
  );
};

export const canSearchOrganizationUsers = (
  roleBand: string,
  _grantedModuleIds: Set<string>,
): boolean => roleBand === "owner" || roleBand === "super_admin";

// React list keys must be unique even when several records share one route
// (all listings resolve to the same edit route), so include type + route +
// record id.
export const getSearchDestinationKey = (destination: SearchKeyDestination): string => {
  const record = (destination.record || {}) as Record<string, unknown>;
  const recordId = String(
    record.businessId || record.userId || record._id || record.id || "",
  );
  return `${destination.resultType || "page"}|${destination.route}|${recordId}`;
};
