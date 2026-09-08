export const formatEmployeeId = (sequence = 0): string => {
  const numericSequence = Math.max(0, Number(sequence) || 0);
  return `EMP-${String(numericSequence).padStart(5, "0")}`;
};

export const formatHousekeepingCode = (sequence = 0): string => {
  const numericSequence = Math.max(0, Number(sequence) || 0);
  return `HKS-${String(numericSequence).padStart(3, "0")}`;
};

export const isFormattedHousekeepingCode = (value = ""): boolean =>
  /^HKS-\d{3,}$/.test(String(value || "").trim().toUpperCase());
