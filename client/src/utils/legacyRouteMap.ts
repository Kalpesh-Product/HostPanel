// Maps a pre-restructuring route (as it may still be returned by the server's
// module-access-map, which hasn't been updated to the new client-side URL
// scheme) to its current canonical URL. Used wherever a route string sourced
// from the server (rather than authored directly in the client) is compared
// against the current location or used for navigation — without this, a
// server-supplied "/hr/company-management" never matches the browser's actual
// "/department-accesses/hr-department/company-management" URL, breaking
// active-state highlighting and forcing an extra client-side redirect hop on
// every click. Keep in sync with the redirects in routes/Routes.tsx.
const LEGACY_ROUTE_PREFIXES: Array<{ from: string; to: string }> = [
  { from: "/company-settings/website-builder", to: "/key-apps/website-builder" },
  { from: "/company-settings/wono-nomad", to: "/key-apps/wono-nomad" },
  { from: "/company-settings/all-leads", to: "/key-apps/all-leads" },
  { from: "/company-settings/nomad-listings", to: "/key-apps/nomad-listings" },
  { from: "/company-settings/reviews", to: "/key-apps/reviews" },
  { from: "/company-settings/nomads-leads", to: "/key-apps/nomads-leads" },
  { from: "/company-settings/poc-details", to: "/key-apps/poc-details" },
  { from: "/company-settings/organization-management", to: "/core-modules/organization-management" },
  { from: "/company-settings/access-grants", to: "/core-modules/access-grants" },
  { from: "/company-settings/workspace-settings", to: "/core-modules/workspace-settings" },
  { from: "/company-settings/workspace-management", to: "/core-modules/workspace-management" },
  { from: "/company-settings/analytics", to: "/core-modules/analytics" },
  { from: "/company-settings/customer-support", to: "/common-modules/customer-support" },
  { from: "/extra-common-modules/attendance", to: "/common-modules/attendance" },
  { from: "/extra-common-modules/tasks", to: "/common-modules/tasks" },
  { from: "/leave-requests", to: "/common-modules/leave-requests" },
  { from: "/tickets", to: "/common-modules/tickets" },
  { from: "/calendar", to: "/common-modules/calendar" },
  { from: "/meetings/meeting-rooms", to: "/common-modules/meeting-room-booking" },
  { from: "/sales-crm", to: "/department-accesses/sales-department" },
  { from: "/hr", to: "/department-accesses/hr-department" },
  { from: "/finance", to: "/department-accesses/finance-department" },
  { from: "/administration", to: "/department-accesses/administration-department" },
  { from: "/maintenance", to: "/department-accesses/maintenance-department" },
  { from: "/it", to: "/department-accesses/it-department" },
];

export const normalizeLegacyRoute = <T extends string | undefined | null>(route: T): T | string => {
  const value = String(route || "").trim();
  if (!value) return route;
  const match = LEGACY_ROUTE_PREFIXES.find(
    ({ from }) => value === from || value.startsWith(`${from}/`),
  );
  if (!match) return route as string;
  return `${match.to}${value.slice(match.from.length)}`;
};
