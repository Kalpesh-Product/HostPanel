export interface AttendanceShiftConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  weeklyWorkingHours: number;
  lateMarkAfter: string | null;
  halfDayMarkAfter: string | null;
}

export const parseShiftTimeMinutes = (value: unknown): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

export const getShiftDurationMinutes = (shift: Partial<AttendanceShiftConfig> = {}): number => {
  const start = parseShiftTimeMinutes(shift.startTime);
  const end = parseShiftTimeMinutes(shift.endTime);
  if (start == null || end == null || start === end) return 0;
  return end > start ? end - start : (24 * 60 - start) + end;
};

export const isOvernightShift = (shift: Partial<AttendanceShiftConfig> = {}): boolean => {
  const start = parseShiftTimeMinutes(shift.startTime);
  const end = parseShiftTimeMinutes(shift.endTime);
  return start != null && end != null && end < start;
};

export const toShiftTimelineMinutes = (clockMinutes: number, shiftStartMinutes: number): number =>
  clockMinutes < shiftStartMinutes ? clockMinutes + 24 * 60 : clockMinutes;

const normalizeShiftId = (value: unknown, index: number): string => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || `shift-${index + 1}`;
};

const normalizeStoredShift = (value: any, index: number): AttendanceShiftConfig | null => {
  const startTime = String(value?.startTime || "").trim();
  const endTime = String(value?.endTime || "").trim();
  if (parseShiftTimeMinutes(startTime) == null || parseShiftTimeMinutes(endTime) == null || startTime === endTime) return null;
  return {
    id: normalizeShiftId(value?.id, index),
    name: String(value?.name || `Shift ${index + 1}`).trim() || `Shift ${index + 1}`,
    startTime,
    endTime,
    breakDurationMinutes: Math.max(0, Number(value?.breakDurationMinutes) || 0),
    weeklyWorkingHours: Math.max(1, Number(value?.weeklyWorkingHours) || 40),
    lateMarkAfter: value?.lateMarkAfter ? String(value.lateMarkAfter) : null,
    halfDayMarkAfter: value?.halfDayMarkAfter ? String(value.halfDayMarkAfter) : null,
  };
};

export const getConfiguredAttendanceShifts = (workspaceOrSettings: any): AttendanceShiftConfig[] => {
  const settings = workspaceOrSettings?.attendanceSettings || workspaceOrSettings || {};
  const configured = Array.isArray(settings?.shifts)
    ? settings.shifts.map(normalizeStoredShift).filter(Boolean) as AttendanceShiftConfig[]
    : [];
  if (configured.length > 0) return configured;

  const legacy = normalizeStoredShift({
    id: "day-shift",
    name: "Day Shift",
    startTime: settings?.workingHoursStart,
    endTime: settings?.workingHoursEnd,
    breakDurationMinutes: settings?.breakDurationMinutes,
    weeklyWorkingHours: settings?.weeklyWorkingHours,
    lateMarkAfter: settings?.lateMarkAfter,
    halfDayMarkAfter: settings?.halfDayMarkAfter,
  }, 0);
  return legacy ? [legacy] : [];
};

export const findAttendanceShift = (workspaceOrSettings: any, shiftId: unknown): AttendanceShiftConfig | null => {
  const normalizedId = String(shiftId || "").trim();
  if (!normalizedId) return null;
  return getConfiguredAttendanceShifts(workspaceOrSettings).find((shift) => shift.id === normalizedId) || null;
};
