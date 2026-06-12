export function getStoredTenantRole(): string {
  try {
    const raw = localStorage.getItem('hostpanel_tenant_role') || sessionStorage.getItem('tenant_role');
    return raw || 'tenant-employee';
  } catch {
    return 'tenant-employee';
  }
}

export function setStoredTenantRole(role: string): void {
  try {
    localStorage.setItem('hostpanel_tenant_role', role);
    sessionStorage.setItem('tenant_role', role);
  } catch {
    /** noop */
  }
}

export function clearStoredTenantRole(): void {
  try {
    localStorage.removeItem('hostpanel_tenant_role');
    sessionStorage.removeItem('tenant_role');
  } catch {
    /** noop */
  }
}

export function isTenantAdminRole(role: string): boolean {
  const normalized = String(role || '').toLowerCase().replace(/[\s_-]+/g, '');
  return normalized === 'tenantadmin' || normalized === 'tenantadministrator' || normalized === 'admin';
}

export function isTenantManagerRole(role: string): boolean {
  const normalized = String(role || '').toLowerCase().replace(/[\s_-]+/g, '');
  return normalized === 'tenantmanager' || normalized === 'manager';
}
