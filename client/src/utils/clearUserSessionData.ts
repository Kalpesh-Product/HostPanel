const USER_SCOPED_LOCAL_STORAGE_KEYS = [
  "workspace_setup",
  "user",
  "hostpanel_auth_user",
  "hostpanel_acting_manager_context",
  "hostpanel_tenant_company_id",
  "hostpanel_tenant_company_name",
] as const;

const USER_SCOPED_SESSION_STORAGE_KEYS = [
  "companyId",
  "companyName",
  "businessId",
  "tenant_company_id",
  "tenant_company_name",
] as const;

/** Removes cached identity/workspace data that must never cross login sessions. */
export const clearUserSessionData = () => {
  try {
    USER_SCOPED_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  try {
    USER_SCOPED_SESSION_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
};
