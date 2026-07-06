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
      { id: "tickets", label: "Tickets", implemented: false },
      { id: "leave-requests", label: "Leave Requests", implemented: false },
      { id: "meeting-room-system", label: "Meeting Room Booking", implemented: false },
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
      { id: "tickets", label: "Tickets", implemented: false },
      { id: "leave-requests", label: "Leave Requests", implemented: false },
      { id: "meeting-room-system", label: "Meeting Room Booking", implemented: false },
      { id: "calendar", label: "Calendar", route: "/calendar", implemented: true },
      { id: "assets", label: "Assets", route: "/extra-common-modules/assets", implemented: true },
      { id: "inventory", label: "Inventory", implemented: false },
      { id: "finance-management", label: "Finance Management", implemented: false },
      { id: "reports", label: "Reports", implemented: false },
      // { id: "visitor-management", label: "Visitor Management", route: "/visitors/visitor-management", implemented: true },
      { id: "website-builder", label: "Website Builder", route: "/company-settings/website-builder", implemented: true },
      { id: "wono-nomad", label: "Wono Nomad", route: "/company-settings/wono-nomad", implemented: true },
      { id: "website-leads", label: "Website Leads", route: "/company-settings/website-builder/leads", implemented: true },
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
      { id: "leads-management", label: "Leads Management", implemented: false },
      { id: "tenant-companies-sales", label: "Tenant Companies", implemented: false },
      { id: "resource-pricing", label: "Resource & Pricing", implemented: false },
      { id: "sales-architecture", label: "Sales Architecture", implemented: false },
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
      { id: "visitor-management", label: "Visitor Management", route: "/visitors/visitor-management", implemented: true },
      { id: "website-builder", label: "Website Builder", route: "/company-settings/website-builder", implemented: true },
      { id: "wono-nomad", label: "Wono Nomad", route: "/company-settings/wono-nomad", implemented: true },
      { id: "website-leads", label: "Website Leads", route: "/company-settings/website-builder/leads", implemented: true },
    ],
  },
  {
    sectionId: "founder-core-modules",
    sectionLabel: "Founder Core Modules",
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
          { id: "leads-management", label: "Leads Management", implemented: false },
          { id: "tenant-companies-sales", label: "Tenant Companies", implemented: false },
          { id: "resource-pricing", label: "Resource & Pricing", implemented: false },
          { id: "sales-architecture", label: "Sales Architecture", implemented: false },
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
  "visitor-management",
  "website-builder",
  "wono-nomad",
  "website-leads",
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
  return Array.from(ids);
};

const normalizePlan = (value = "") => {
  const plan = String(value || "").trim().toLowerCase();
  if (PLAN_ORDER.includes(plan)) return plan;
  return "basic";
};

const BASIC_DEFAULT_IDS = new Set([
  "dashboard",
  "customer-support",
  "attendance",
  "tasks",
  "tickets",
  "leave-requests",
  "meeting-room-system",
  "calendar",
  "visitor-management",
  "assets",
  "inventory",
  "finance-management",
  "reports",
  "website-builder",
  "wono-nomad",
  "website-leads",
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
  "it-repair-logs",
  "tenant-companies-admin",
  "bookings",
  "visitors-management",
  "resource-management",
  "house-keeping",
  "leads-management",
  "tenant-companies-sales",
  "resource-pricing",
  "sales-architecture",
  "analytics",
]);

const PROFESSIONAL_DEFAULT_IDS = new Set([
  ...Array.from(BASIC_DEFAULT_IDS),
  "workspace-settings",
  "workspace-management",
  "employee-management",
  "hr-documents",
  "recruitment",
  "leave-request-processing",
  "attendance-review",
  "payroll-management",
  "exit-management",
  "tenant-companies-admin",
  "bookings",
  "visitors-management",
  "resource-management",
  "house-keeping",
  "workspace-layout",
  "leads-management",
  "tenant-companies-sales",
  "resource-pricing",
  "sales-architecture",
  "finance-budget",
  "billing-payments",
  "accounting",
  "maintenance-repair-logs",
  "amc-maintenance-scheduler",
  "tech-website-builder",
  "it-repair-logs",
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
