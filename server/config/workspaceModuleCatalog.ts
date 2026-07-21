// @ts-nocheck

const PLAN_ORDER = ["basic", "professional", "custom"];

const MODULE_GROUPS = [
  {
    sectionId: "common-modules",
    sectionLabel: "Common Modules",
    items: [
      { id: "dashboard", label: "Dashboard", route: "/dashboard", implemented: true },
      { id: "customer-support", label: "Customer Support", route: "/company-settings/customer-support", implemented: true },
      { id: "attendance", label: "Attendance", implemented: false },
      { id: "tasks", label: "Tasks", implemented: false },
      { id: "tickets", label: "Tickets", route: "/tickets", implemented: true },
      { id: "leave-requests", label: "Leave Requests", implemented: false },
      { id: "meeting-room-system", label: "Meeting Room Booking", route: "/meetings/meeting-rooms", implemented: true },
      { id: "calendar", label: "Calendar", route: "/calendar", implemented: true },
    ],
  },
  {
    sectionId: "extra-common-modules",
    sectionLabel: "Extra Common Modules",
    items: [
      { id: "assets", label: "Assets", route: "/extra-common-modules/assets", implemented: true },
      { id: "inventory", label: "Inventory", implemented: false },
      { id: "finance-management", label: "Finance Management", implemented: false },
      { id: "reports", label: "Reports", implemented: false },
    ],
  },
  {
    sectionId: "add-ons",
    sectionLabel: "Add-ons",
    items: [
      { id: "dashboard", label: "Dashboard", route: "/dashboard", implemented: true },
      { id: "customer-support", label: "Customer Support", route: "/company-settings/customer-support", implemented: true },
      { id: "attendance", label: "Attendance", implemented: false },
      { id: "tasks", label: "Tasks", implemented: false },
      { id: "tickets", label: "Tickets", route: "/tickets", implemented: true },
      { id: "leave-requests", label: "Leave Requests", implemented: false },
      { id: "meeting-room-system", label: "Meeting Room Booking", route: "/meetings/meeting-rooms", implemented: true },
      { id: "calendar", label: "Calendar", route: "/calendar", implemented: true },
      { id: "assets", label: "Assets", route: "/extra-common-modules/assets", implemented: true },
      { id: "inventory", label: "Inventory", implemented: false },
      { id: "finance-management", label: "Finance Management", implemented: false },
      { id: "reports", label: "Reports", implemented: false },
      // { id: "visitor-management", label: "Visitor Management", route: "/visitors/visitor-management", implemented: true },
      { id: "website-builder", label: "Website Builder", route: "/company-settings/website-builder", implemented: true },
      { id: "wono-nomad", label: "Wono Nomads", route: "/company-settings/wono-nomad", implemented: true },
      { id: "website-leads", label: "Website Leads", route: "/company-settings/website-builder/leads", implemented: true },
      { id: "website-review", label: "Website Review", route: "/company-settings/website-builder/dynamic/reviews", implemented: true },
      { id: "organization-management", label: "Organization Management", route: "/company-settings/organization-management", implemented: true },
      { id: "access-grants", label: "Access Grants", route: "/company-settings/access-grants", implemented: true },
      { id: "workspace-settings", label: "Unit Settings", route: "/company-settings/workspace-settings", implemented: true },
      { id: "workspace-management", label: "Unit Management", route: "/company-settings/workspace-management", implemented: true },
      { id: "analytics", label: "Analytics", implemented: false },
      { id: "employee-management", label: "Employee Management", implemented: false },
      { id: "hr-documents", label: "Documents", implemented: false },
      { id: "recruitment", label: "Recruitment", implemented: false },
      { id: "leave-request-processing", label: "Leave Request Processing", implemented: false },
      { id: "attendance-review", label: "Attendance Review", implemented: false },
      { id: "payroll-management", label: "Payroll Management", implemented: false },
      { id: "exit-management", label: "Exit Management", implemented: false },
      { id: "tenant-companies-admin", label: "Tenant Companies", implemented: false },
      { id: "bookings", label: "Bookings", implemented: false },
      { id: "visitors-management", label: "Visitors Management", route: "/visitors/visitor-management", implemented: true },
      { id: "resource-management", label: "Resource Management", implemented: false },
      { id: "house-keeping", label: "House Keeping", implemented: false },
      { id: "leads-management", label: "Leads Management", route: "/sales-crm/leads-management", implemented: true },
      { id: "tenant-companies-sales", label: "Tenant Companies", route: "/sales-crm/tenant-companies", implemented: true },
      { id: "resource-pricing", label: "Resource & Pricing", route: "/sales-crm/resource-pricing", implemented: true },
      { id: "sales-architecture", label: "Sales Architecture", route: "/sales-crm/sales-architecture", implemented: true },
      { id: "finance-budget", label: "Finance & Budget", implemented: false },
      { id: "billing-payments", label: "Billing & Payments", implemented: false },
      { id: "accounting", label: "Accounting", implemented: false },
      { id: "maintenance-repair-logs", label: "Maintenance Repair Logs", implemented: false },
      { id: "amc-maintenance-scheduler", label: "AMC Maintenance Scheduler", implemented: false },
      { id: "tech-website-builder", label: "Website Builder", route: "/company-settings/website-builder", implemented: true },
      { id: "it-repair-logs", label: "IT Repair Logs", implemented: false },
    ],
  },
  {
    sectionId: "key-apps",
    sectionLabel: "Key Apps",
    items: [
      { id: "website-builder", label: "Website Builder", route: "/company-settings/website-builder", implemented: true },
      { id: "wono-nomad", label: "Nomad Listings", route: "/company-settings/wono-nomad", implemented: true },
      { id: "website-leads", label: "All Leads", route: "/company-settings/all-leads", implemented: true },
      { id: "visitor-management", label: "Visitor Management", route: "/visitors/visitor-management", implemented: true },
    ],
  },
  {
    sectionId: "founder-core-modules",
    sectionLabel: "Core Modules",
    items: [
      { id: "organization-management", label: "Organization Management", route: "/company-settings/organization-management", implemented: true },
      { id: "access-grants", label: "Access Grants", route: "/company-settings/access-grants", implemented: true },
      { id: "workspace-settings", label: "Unit Settings", route: "/company-settings/workspace-settings", implemented: true },
      { id: "workspace-management", label: "Unit Management", route: "/company-settings/workspace-management", implemented: true },
      { id: "analytics", label: "Analytics", implemented: false },
    ],
  },
  {
    sectionId: "department-accesses",
    sectionLabel: "Department Accesses",
    items: [
      {
        id: "hr-department",
        label: "HR Department",
        isGroup: true,
        tabs: [
          { id: "employee-management", label: "Employee Management", implemented: false },
          { id: "hr-documents", label: "Documents", implemented: false },
          { id: "recruitment", label: "Recruitment", implemented: false },
          { id: "leave-request-processing", label: "Leave Request Processing", implemented: false },
          { id: "attendance-review", label: "Attendance Review", implemented: false },
          { id: "payroll-management", label: "Payroll Management", implemented: false },
          { id: "exit-management", label: "Exit Management", implemented: false },
        ],
      },
      {
        id: "administration-department",
        label: "Administration Department",
        isGroup: true,
        tabs: [
          { id: "tenant-companies-admin", label: "Tenant Companies", implemented: false },
          { id: "bookings", label: "Bookings", implemented: false },
          { id: "visitors-management", label: "Visitors Management", route: "/visitors/visitor-management", implemented: true },
          { id: "resource-management", label: "Resource Management", implemented: false },
          { id: "house-keeping", label: "House Keeping", implemented: false },

        ],
      },
      {
        id: "sales-department",
        label: "Sales Department",
        isGroup: true,
        tabs: [
          { id: "leads-management", label: "Leads Management", route: "/sales-crm/leads-management", implemented: true },
          { id: "tenant-companies-sales", label: "Tenant Companies", route: "/sales-crm/tenant-companies", implemented: true },
          { id: "resource-pricing", label: "Resource & Pricing", route: "/sales-crm/resource-pricing", implemented: true },
          { id: "sales-architecture", label: "Sales Architecture", route: "/sales-crm/sales-architecture", implemented: true },
        ],
      },
      {
        id: "finance-department",
        label: "Finance Department",
        isGroup: true,
        tabs: [
          { id: "finance-budget", label: "Finance & Budget", implemented: false },
          { id: "billing-payments", label: "Billing & Payments", implemented: false },
          { id: "accounting", label: "Accounting", implemented: false },
        ],
      },
      {
        id: "maintenance-department",
        label: "Maintenance Department",
        isGroup: true,
        tabs: [
          { id: "maintenance-repair-logs", label: "Maintenance Repair Logs", implemented: false },
          { id: "amc-maintenance-scheduler", label: "AMC Maintenance Scheduler", implemented: false },
        ],
      },
      {
        id: "tech-department",
        label: "Tech Department",
        isGroup: true,
        tabs: [
          { id: "tech-website-builder", label: "Website Builder", route: "/company-settings/website-builder", implemented: true },
          { id: "website-leads", label: "Website Leads", route: "/company-settings/website-builder/leads", implemented: true },
          { id: "website-review", label: "Website Review", route: "/company-settings/website-builder/dynamic/reviews", implemented: true },
        ],
      },
      {
        id: "it-department",
        label: "IT Department",
        isGroup: true,
        tabs: [
          { id: "it-repair-logs", label: "IT Repair Logs", implemented: false },
        ],
      },
    ],
  },
];

export const COMMON_MODULE_IDS = [
  "dashboard",
  "customer-support",
  "attendance",
  "tasks",
  "tickets",
  "leave-requests",
  "meeting-room-system",
  "calendar",
];

export const EXTRA_COMMON_MODULE_IDS = [
  "assets",
  "inventory",
  "finance-management",
  "reports",
];

export const KEY_APPS_IDS = [
  "website-builder",
  "wono-nomad",
  "website-leads",
  "visitor-management",
]

// Maps a Department document's `name` (as seeded by DEFAULT_DEPARTMENTS in
// organizationControllers.ts) to its corresponding "Department Accesses"
// group in the sidebar, so a department's default moduleIds always match
// exactly what the sidebar groups under that department's name — single
// source of truth, no duplicated id lists to drift out of sync.
const DEPARTMENT_NAME_TO_GROUP_ID: Record<string, string> = {
  hr: "hr-department",
  administration: "administration-department",
  sales: "sales-department",
  "Sales": "sales-department",
  finance: "finance-department",
  maintenance: "maintenance-department",
  technology: "tech-department",
  it: "it-department",
};

export const getDefaultDepartmentModuleIds = (departmentName = ""): string[] => {
  const key = String(departmentName || "").trim().toLowerCase();
  const groupId = DEPARTMENT_NAME_TO_GROUP_ID[key];
  if (!groupId) return [];

  const deptSection = MODULE_GROUPS.find((section) => section.sectionId === "department-accesses");
  const group = (deptSection?.items || []).find((item) => item.id === groupId);
  return Array.isArray(group?.tabs) ? group.tabs.map((tab) => String(tab?.id || "")).filter(Boolean) : [];
};

export const getAllModuleIds = (): string[] => {
  const ids = new Set<string>();
  for (const section of MODULE_GROUPS) {
    for (const item of section.items) {
      if (Array.isArray(item.tabs) && item.tabs.length) {
        for (const tab of item.tabs) ids.add(tab.id);
      } else {
        ids.add(item.id);
      }
    }
  }
  // Organization Management sub-permission ids (org_tab_users,
  // org_users_invite_member, etc.) only exist as flat entries in
  // BASIC_DEFAULT_IDS/PROFESSIONAL_DEFAULT_IDS, never as MODULE_GROUPS tree
  // nodes, so the walk above misses them. Without this, owner/super_admin
  // (whose "full access" is computed from this function) never actually get
  // org_users_invite_member in their granted list, so the Organization
  // Management "Add User" button shows disabled for them on the frontend.
  BASIC_DEFAULT_IDS.forEach((id) => ids.add(id));
  PROFESSIONAL_DEFAULT_IDS.forEach((id) => ids.add(id));
  return Array.from(ids);
};

const normalizePlan = (value = "") => {
  const plan = String(value || "").trim().toLowerCase();
  if (PLAN_ORDER.includes(plan)) return plan;
  return "basic";
};

// These two sets are hand-synced against the plan/module tracking sheet
// ("INC PLAN" column: All / Professional / Custom). "All" -> in Basic (and
// therefore every higher tier too, since Professional/Custom build on top
// of Basic). "Professional" -> added on top of Basic's set here, not in
// Basic. "Custom" -> deliberately NOT in either set below — those modules
// are only ever added per-customer on top of whichever plan they're on
// (staff enables them individually via master panel's workspace module
// toggle), they are never part of a plan's own default list.
const BASIC_DEFAULT_IDS = new Set([
  "dashboard",
  "customer-support",
  "visitor-management",
  // NOT "visitors-management" (plural) — that's the same
  // /visitors/visitor-management page duplicated as a tab id under the
  // Administration Department group (see MODULE_GROUPS above). Granting it
  // by default here would auto-unlock that Administration Department tab
  // at every plan, defeating the point of making the department
  // Custom-only. "visitor-management" (singular, Key Apps' own entry)
  // already covers the real feature at every tier.
  "visitors_manage_internal_visitors",
  // Visitor Management start page (VisitorManagement.tsx) grants: Standard
  // visitor logging only, matching Basic = "Standard" visitor access.
  "visitors_tab_daily",
  "visitors_tab_history",
  "visitors_mode_standard",
  "visitors_standard_type_standard",
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
]);

const PROFESSIONAL_DEFAULT_IDS = new Set([
  ...Array.from(BASIC_DEFAULT_IDS),
  "visitors_manage_external_clients",
  // Complete Visitor Management access: the rest of the start-page tabs and
  // New Frontdesk Action modes/subtabs, on top of Basic's Standard-only set.
  "visitors_tab_bookings",
  "visitors_tab_clients",
  "visitors_mode_workspace_tour",
  "visitors_mode_walkin_booking",
  "visitors_mode_verify_booking",
  "visitors_standard_type_department",
  "visitors_standard_type_tenant",
  "tickets",
  "meeting-room-system",
  "calendar",
  "workspace-settings",
  "workspace-management",
  // Administration Department (tenant-companies-admin, bookings,
  // resource-management, house-keeping) is deliberately NOT granted by
  // default at Professional anymore — Custom-only now, added per-customer
  // via master panel's workspace module toggle like the rest of Custom's
  // add-on set.
  "leads-management",
  "tenant-companies-sales",
  "resource-pricing",
  "sales-architecture",
]);

const canPlanAccess = (plan = "basic", moduleId = "") => {
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan === "custom") return PROFESSIONAL_DEFAULT_IDS.has(moduleId);
  if (normalizedPlan === "professional") return PROFESSIONAL_DEFAULT_IDS.has(moduleId);
  if (normalizedPlan === "basic") return BASIC_DEFAULT_IDS.has(moduleId);
  return false;
};

const resolveIsUnlocked = ({
  selectedPlan,
  workspaceEnabledIds,
  moduleId,
}) => {
  if (workspaceEnabledIds.has(moduleId)) return true;
  return canPlanAccess(selectedPlan, moduleId);
};

export const buildWorkspaceModuleCatalog = ({
  selectedPlan = "basic",
  enabledModuleIds = [],
} = {}) => {
  const normalizedPlan = normalizePlan(selectedPlan);
  const workspaceEnabledIds = new Set(
    Array.isArray(enabledModuleIds)
      ? enabledModuleIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  );

  const sections = MODULE_GROUPS.map((section) => ({
    ...section,
    items: (section.items || []).map((item) => {
      if (Array.isArray(item.tabs) && item.tabs.length) {
        return {
          ...item,
          tabs: item.tabs.map((tab) => ({
            ...tab,
            accessibleByPlan: canPlanAccess(normalizedPlan, tab.id),
            unlockedInWorkspace: resolveIsUnlocked({
              selectedPlan: normalizedPlan,
              workspaceEnabledIds,
              moduleId: tab.id,
            }),
          })),
        };
      }

      return {
        ...item,
        accessibleByPlan: canPlanAccess(normalizedPlan, item.id),
        unlockedInWorkspace: resolveIsUnlocked({
          selectedPlan: normalizedPlan,
          workspaceEnabledIds,
          moduleId: item.id,
        }),
      };
    }),
  }));

  return {
    selectedPlan: normalizedPlan,
    sections,
  };
};

const collectLeafModules = (items = []) => {
  const result = [];
  for (const item of items) {
    if (Array.isArray(item.tabs) && item.tabs.length) {
      for (const tab of item.tabs) {
        result.push(tab);
      }
      continue;
    }
    result.push(item);
  }
  return result;
};

export const getDefaultEnabledModuleIdsForPlan = (selectedPlan = "basic") => {
  const normalizedPlan = normalizePlan(selectedPlan);
  const ids = new Set();
  for (const section of MODULE_GROUPS) {
    const leafModules = collectLeafModules(section.items || []);
    for (const module of leafModules) {
      if (canPlanAccess(normalizedPlan, module.id)) {
        ids.add(module.id);
      }
    }
  }
  // BASIC_DEFAULT_IDS / PROFESSIONAL_DEFAULT_IDS include some ids (the
  // Organization Management sub-permissions: org_tab_users,
  // org_tab_departments, org_users_invite_member, etc.) that have no
  // corresponding node anywhere in MODULE_GROUPS — they only ever exist as
  // flat entries in those id sets and in Sidebar.tsx's role-permission
  // checks. The tree-walk above can never discover them, so a plan's
  // defaults would silently omit them at workspace creation. Union them in
  // directly so a plan's promised defaults are actually complete.
  const allKnownIds = new Set([...BASIC_DEFAULT_IDS, ...PROFESSIONAL_DEFAULT_IDS]);
  allKnownIds.forEach((id) => {
    if (canPlanAccess(normalizedPlan, id)) ids.add(id);
  });
  return Array.from(ids);
};

export const buildWorkspaceModulesStructure = ({
  selectedPlan = "basic",
  enabledModuleIds = [],
} = {}) => {
  const normalizedPlan = normalizePlan(selectedPlan);
  const enabledSet = new Set(
    Array.isArray(enabledModuleIds)
      ? enabledModuleIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  );

  return MODULE_GROUPS.map((section) => {
    const leafModules = collectLeafModules(section.items || []);
    return {
      category: section.sectionLabel,
      items: leafModules.map((module) => {
        const defaultAllowed = canPlanAccess(normalizedPlan, module.id);
        const active = defaultAllowed || enabledSet.has(module.id);
        return {
          id: module.id,
          name: module.label,
          active,
        };
      }),
    };
  });
};

export const getEffectiveEnabledModuleIds = ({
  selectedPlan = "basic",
  existingEnabledModuleIds = [],
} = {}) => {
  const normalizedPlan = normalizePlan(selectedPlan);
  const defaultIds = getDefaultEnabledModuleIdsForPlan(normalizedPlan);
  const existingIds = Array.isArray(existingEnabledModuleIds)
    ? existingEnabledModuleIds.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (normalizedPlan === "custom") {
    return Array.from(new Set([...defaultIds, ...existingIds]));
  }

  return defaultIds;
};
