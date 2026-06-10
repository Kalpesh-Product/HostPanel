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
