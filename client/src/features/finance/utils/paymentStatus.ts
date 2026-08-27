export function formatFinancePaymentStatus(value: unknown, fallback = 'Planned'): string {
  const status = String(value || '').trim();
  if (!status) return fallback;
  return status.toLowerCase() === 'invoice shared' ? 'Paid • Invoice Shared' : status;
}
