// Explicit allowlist of routes that map to a real plan/module-catalog entry
// (i.e. ids that appear in getEnabledModuleIdsForPlan()'s BASIC_IDS /
// PROFESSIONAL_EXTRA_IDS, or are Custom-only per the department/extra-module
// comments in workspacePlanAccess.ts). Deliberately NOT derived from
// Sidebar.tsx's ROUTE_BY_ID — that map also carries ids like "profile",
// "dashboard", "chat" that exist only for sidebar icon/label lookup and were
// never part of the module-access system, so inverting it wholesale would
// wrongly gate core always-on pages.
export const GATED_MODULE_ROUTES: Array<{ route: string; moduleId: string }> = [
  // Core Modules (Professional+)
  { route: "/common-modules/tickets", moduleId: "tickets" },
  { route: "/common-modules/meeting-room-booking", moduleId: "meeting-room-system" },
  { route: "/common-modules/calendar", moduleId: "calendar" },
  { route: "/core-modules/workspace-settings", moduleId: "workspace-settings" },
  { route: "/core-modules/workspace-management", moduleId: "workspace-management" },

  // Finance Department (Custom-only)
  { route: "/department-accesses/finance-department/expenses-budget", moduleId: "finance-budget" },
  { route: "/department-accesses/finance-department/billing-payments", moduleId: "billing-payments" },
  { route: "/department-accesses/finance-department/accounting", moduleId: "accounting" },

  // HR Department (Custom-only)
  { route: "/department-accesses/hr-department/company-management", moduleId: "employee-management" },
  { route: "/department-accesses/hr-department/documents", moduleId: "hr-documents" },
  { route: "/department-accesses/hr-department/attendance-review", moduleId: "attendance-review" },
  { route: "/department-accesses/hr-department/leave-request-processing", moduleId: "leave-request-processing" },
  { route: "/department-accesses/hr-department/recruitment", moduleId: "recruitment" },
  { route: "/department-accesses/hr-department/payroll-management", moduleId: "payroll-management" },
  { route: "/department-accesses/hr-department/resignation-management", moduleId: "exit-management" },

  // Sales Department (Professional+)
  { route: "/department-accesses/sales-department/leads-management", moduleId: "leads-management" },
  { route: "/department-accesses/sales-department/tenant-companies", moduleId: "tenant-companies-sales" },
  { route: "/department-accesses/sales-department/resource-pricing", moduleId: "resource-pricing" },
  { route: "/department-accesses/sales-department/sales-architecture", moduleId: "sales-architecture" },

  // Administration Department (Custom-only)
  { route: "/department-accesses/administration-department/tenant-companies", moduleId: "tenant-companies-admin" },
  { route: "/department-accesses/administration-department/bookings", moduleId: "bookings" },
  { route: "/department-accesses/administration-department/resource-management", moduleId: "resource-management" },
  { route: "/department-accesses/administration-department/house-keeping", moduleId: "house-keeping" },

  // Maintenance Department (Custom-only)
  { route: "/department-accesses/maintenance-department/repair-logs", moduleId: "maintenance-repair-logs" },
  { route: "/department-accesses/maintenance-department/amc-scheduler", moduleId: "amc-maintenance-scheduler" },

  // IT Department (Custom-only)
  { route: "/department-accesses/it-department/repair-logs", moduleId: "it-repair-logs" },
  { route: "/department-accesses/it-department/system-access", moduleId: "it-system-access" },

  // Extra Common Modules (Custom-only)
  { route: "/common-modules/attendance", moduleId: "attendance" },
  { route: "/extra-common-modules/assets", moduleId: "assets" },
  { route: "/extra-common-modules/inventory", moduleId: "inventory" },
  { route: "/extra-common-modules/department-inventory", moduleId: "department-inventory" },
  { route: "/extra-common-modules/finance-management", moduleId: "finance-management" },
  { route: "/extra-common-modules/team-management", moduleId: "team-management" },
  { route: "/extra-common-modules/reports", moduleId: "reports" },
  { route: "/common-modules/tasks", moduleId: "tasks" },
  { route: "/common-modules/leave-requests", moduleId: "leave-requests" },
];

// Longest route first so a more specific entry (e.g. an exact route that is
// itself a prefix of another gated route) can never accidentally shadow it.
const SORTED_GATED_MODULE_ROUTES = [...GATED_MODULE_ROUTES].sort(
  (a, b) => b.route.length - a.route.length,
);

export const getGatedModuleIdForPath = (pathname: string): string | null => {
  const match = SORTED_GATED_MODULE_ROUTES.find(
    ({ route }) => pathname === route || pathname.startsWith(route + "/"),
  );
  return match ? match.moduleId : null;
};
