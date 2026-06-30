export const getStoredUser = (): any => {
  try {
    const raw = sessionStorage.getItem("hostpanel_auth_user") || localStorage.getItem("hostpanel_auth_user") || localStorage.getItem("user");
    if (raw) {
      // Handle potential wrapped structures from AuthState vs plain User object
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "user" in parsed) {
        return parsed.user;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const getStoredActingManagerContext = (user?: any): any => {
  try {
    const raw = localStorage.getItem("hostpanel_acting_manager_context");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getRoleString = (user?: any): string => {
  return String(user?.workspaceMembership?.role || user?.role || "").toLowerCase();
};

export const canAccessAdminDashboard = (user?: any): boolean => {
  const role = getRoleString(user);
  return role === "owner" || role === "super_admin" || role === "super-admin" || role === "admin";
};

export const canAccessAdministrationDashboard = (user?: any): boolean => {
  const role = getRoleString(user);
  return role === "owner" || role === "super_admin" || role === "super-admin" || role === "administration-manager" || role === "administration_manager" || role === "administration" || role === "admin-manager";
};

export const canAccessHRDashboard = (user?: any): boolean => {
  const role = getRoleString(user);
  return role === "owner" || role === "super_admin" || role === "super-admin" || role === "hr-manager" || role === "hr_manager" || role === "hr";
};

export const canAccessFinanceDashboard = (user?: any): boolean => {
  const role = getRoleString(user);
  return role === "owner" || role === "super_admin" || role === "super-admin" || role === "finance-manager" || role === "finance_manager" || role === "finance";
};

export const canAccessSalesDashboard = (user?: any): boolean => {
  const role = getRoleString(user);
  return role === "owner" || role === "super_admin" || role === "super-admin" || role === "sales-manager" || role === "sales_manager" || role === "sales";
};

export const canAccessTechDashboard = (user?: any): boolean => {
  const role = getRoleString(user);
  return role === "owner" || role === "super_admin" || role === "super-admin" || role === "tech-manager" || role === "tech_manager" || role === "tech" || role === "technology-manager" || role === "technology";
};

export const canAccessITDashboard = (user?: any): boolean => {
  const role = getRoleString(user);
  return role === "owner" || role === "super_admin" || role === "super-admin" || role === "it-manager" || role === "it_manager" || role === "it";
};

export const canAccessMaintenanceDashboard = (user?: any): boolean => {
  const role = getRoleString(user);
  return role === "owner" || role === "super_admin" || role === "super-admin" || role === "maintenance-manager" || role === "maintenance_manager" || role === "maintenance";
};

export const canAccessEmployeeDashboard = (user?: any): boolean => {
  return true;
};

export const normalizeUserRole = (role: string): string => {
  return String(role || '').trim().toLowerCase().replace(/\s+/g, '_');
};

export const canAccessEmployeeModule = (
  user?: any,
  moduleId?: string,
  options?: { section?: string },
): boolean => {
  if (!user || !moduleId) return false;
  const role = normalizeUserRole(user?.workspaceMembership?.role || user?.role);
  const grantedModules = user?.workspaceMembership?.grantedModules || [];
  if (role === 'owner' || role === 'founder' || role === 'super_admin' || role === 'super-admin') {
    return true;
  }
  const normalizedModuleId = moduleId.toLowerCase().replace(/[\s_]+/g, '-');
  const hasModule = grantedModules.some(
    (m: string) => m.toLowerCase().replace(/[\s_]+/g, '-') === normalizedModuleId || m === moduleId,
  );
  if (hasModule) return true;
  if (options?.section === 'core') {
    return ['hr', 'hr_manager', 'hr-manager', 'admin', 'manager'].includes(role);
  }
  return false;
};

export const getStoredTenantCompanyId = (): string => {
  try {
    const raw = localStorage.getItem("hostpanel_tenant_company_id") || sessionStorage.getItem("tenant_company_id");
    return raw || "";
  } catch {
    return "";
  }
};

export const getStoredTenantCompanyName = (): string => {
  try {
    const raw = localStorage.getItem("hostpanel_tenant_company_name") || sessionStorage.getItem("tenant_company_name");
    return raw || "";
  } catch {
    return "";
  }
};

export const resolvePostLoginRoute = (user?: any): string => {
  const role = getRoleString(user);
  if (role === "owner" || role === "super_admin" || role === "super-admin" || role === "admin") return "/dashboard";
  if (role === "hr-manager" || role === "hr_manager" || role === "hr") return "/hr/employee-management";
  if (role === "finance-manager" || role === "finance_manager" || role === "finance") return "/dashboard/finance/billing-payments";
  if (role === "sales-manager" || role === "sales_manager" || role === "sales") return "/sales-crm/leads-management";
  if (role === "it-manager" || role === "it_manager" || role === "it") return "/it/repair-logs";
  return "/dashboard";
};
