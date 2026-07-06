export const formatEmployeeId = (sequence = 0): string => {
  const numericSequence = Math.max(0, Number(sequence) || 0);
  return `EMP-${String(numericSequence).padStart(5, "0")}`;
};
