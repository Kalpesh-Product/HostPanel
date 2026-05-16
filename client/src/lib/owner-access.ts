type ModuleDef = { id: string; label: string; description: string };
type DepartmentDef = { key: string; label: string; summary: string; tone: string };

export const OWNER_DEPARTMENT_CATALOG: DepartmentDef[] = [
  { key: "hr", label: "HR", summary: "People operations and hiring", tone: "blue" },
  { key: "administration", label: "Administration", summary: "Admin operations", tone: "violet" },
  { key: "sales", label: "Sales", summary: "Revenue and growth", tone: "amber" },
  { key: "finance", label: "Finance", summary: "Finance and compliance", tone: "emerald" },
  { key: "maintenance", label: "Maintenance", summary: "Maintenance operations", tone: "orange" },
  { key: "technology", label: "Technology", summary: "Technology and product", tone: "cyan" },
  { key: "it", label: "IT", summary: "IT infrastructure and support", tone: "cyan" },
];

const SHARED_MODULES: ModuleDef[] = [
  { id: "dashboard", label: "Dashboard", description: "Shared dashboard access" },
  { id: "reports", label: "Reports", description: "Shared reports access" },
];

const CORE_MODULES: Record<string, ModuleDef[]> = Object.fromEntries(
  OWNER_DEPARTMENT_CATALOG.map((department) => [
    department.key,
    [
      { id: `${department.key}-core`, label: "Core Module", description: "Department core access" },
      { id: `${department.key}-ops`, label: "Operations", description: "Department operations access" },
    ],
  ]),
);

export const buildDefaultOwnerAccessState = () => {
  const departments: Record<string, { enabled: boolean; modules: Record<string, boolean> }> = {};
  OWNER_DEPARTMENT_CATALOG.forEach((department) => {
    departments[department.key] = { enabled: true, modules: {} };
    [...SHARED_MODULES, ...(CORE_MODULES[department.key] || [])].forEach((module) => {
      departments[department.key].modules[module.id] = true;
    });
  });

  return { departments };
};

export const mergeOwnerAccessState = (state: any) =>
  state && typeof state === "object" ? state : buildDefaultOwnerAccessState();

export const readStoredOwnerAccessState = (_user: any) => null;
export const writeStoredOwnerAccessState = (_user: any, state: any) => state;

export const getDepartmentDefinition = (name = "") =>
  OWNER_DEPARTMENT_CATALOG.find(
    (department) => department.key === String(name).toLowerCase() || department.label.toLowerCase() === String(name).toLowerCase(),
  );

export const getDepartmentLabel = (key = "") =>
  OWNER_DEPARTMENT_CATALOG.find((department) => department.key === key)?.label || key;

export const getSharedSectionModules = (_section: string, _departmentKey: string) => SHARED_MODULES;
export const getDepartmentModules = (departmentKey: string) => CORE_MODULES[departmentKey] || [];
export const getRoleModules = (roleKey = "") => {
  const normalized = String(roleKey || "").trim().toLowerCase();
  if (normalized === "super-admin" || normalized === "super_admin") {
    return [
      { id: "admin-dashboard", label: "Admin Dashboard", description: "Global workspace controls" },
      { id: "admin-bookings", label: "Admin Bookings", description: "Manage global meeting room bookings" },
    ];
  }
  if (normalized === "admin") {
    return [{ id: "admin-bookings", label: "Admin Bookings", description: "Manage bookings for admin scope" }];
  }
  return [];
};

export const isDepartmentEnabledInState = (state: any, departmentKey: string) =>
  state?.departments?.[departmentKey]?.enabled !== false;

export const toggleDepartmentInState = (state: any, departmentKey: string, checked: boolean) => ({
  ...state,
  departments: {
    ...(state?.departments || {}),
    [departmentKey]: {
      ...(state?.departments?.[departmentKey] || {}),
      enabled: checked,
      modules: { ...(state?.departments?.[departmentKey]?.modules || {}) },
    },
  },
});

export const isModuleEnabledInState = (
  state: any,
  departmentKey: string,
  moduleId: string,
  _scope: string,
) => state?.departments?.[departmentKey]?.modules?.[moduleId] !== false;

export const isSharedModuleEnabledInState = (
  state: any,
  _section: string,
  moduleId: string,
  departmentKey: string,
) => state?.departments?.[departmentKey]?.modules?.[moduleId] !== false;

export const toggleModuleInState = (
  state: any,
  departmentKey: string,
  moduleId: string,
  _scope: string,
  checked: boolean,
) => ({
  ...state,
  departments: {
    ...(state?.departments || {}),
    [departmentKey]: {
      ...(state?.departments?.[departmentKey] || {}),
      modules: {
        ...(state?.departments?.[departmentKey]?.modules || {}),
        [moduleId]: checked,
      },
    },
  },
});

export const toggleSharedModuleInState = (
  state: any,
  _section: string,
  moduleId: string,
  departmentKey: string,
  checked: boolean,
) => toggleModuleInState(state, departmentKey, moduleId, departmentKey, checked);
