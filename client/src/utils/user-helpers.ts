export const getEmployeeDisplayName = (member: any): string => {
  if (!member) return '';
  const name =
    member?.fullName ||
    member?.name ||
    [member?.firstName, member?.lastName].filter(Boolean).join(' ') ||
    member?.email ||
    '';
  return String(name).trim();
};

export const normalizeDepartmentKey = (value: string): string => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

export const normalizeRoleValue = (value: string): string => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '_');
};

export const extractDepartmentLabel = (value: string): string => {
  if (!value) return '';
  const normalized = normalizeDepartmentKey(value);
  const label = normalized
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return label;
};
