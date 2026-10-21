export type PlanExpiryReminderThreshold = 30 | 14 | 7 | 3 | 1 | "expired";

export function getPlanExpiryReminderThreshold(
  expiryDate: string | null | undefined,
  now = Date.now(),
): PlanExpiryReminderThreshold | null {
  const expiryMs = new Date(expiryDate || "").getTime();
  if (!Number.isFinite(expiryMs)) return null;
  const daysLeft = Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000));
  if (daysLeft <= 0) return "expired";
  return ([1, 3, 7, 14, 30].find((days) => daysLeft <= days) as PlanExpiryReminderThreshold | undefined) || null;
}
