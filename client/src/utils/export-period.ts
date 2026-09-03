import type { ExportParams } from '@/components/ExportReportModal';

export function isDateInExportPeriod(value: unknown, params: Pick<ExportParams, 'dateFrom' | 'dateTo'>): boolean {
  if (!params.dateFrom || !params.dateTo) return true;
  if (!value) return false;

  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return false;

  const from = new Date(`${params.dateFrom}T00:00:00`);
  const to = new Date(`${params.dateTo}T23:59:59.999`);
  return date >= from && date <= to;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

export function isMonthInExportPeriod(
  value: unknown,
  fiscalYear: unknown,
  params: Pick<ExportParams, 'dateFrom' | 'dateTo'>,
): boolean {
  if (!params.dateFrom || !params.dateTo) return true;
  if (!value) return false;

  const text = String(value).trim();
  const direct = new Date(text);
  if (Number.isFinite(direct.getTime()) && /\d{4}/.test(text)) {
    return isDateInExportPeriod(direct, params);
  }

  const monthToken = text.toLowerCase().match(/[a-z]+/)?.[0] || '';
  const monthIndex = MONTH_INDEX[monthToken];
  if (monthIndex == null) return false;

  const explicitYear = Number(text.match(/\b(20\d{2})\b/)?.[1]);
  const fiscalStartYear = Number(String(fiscalYear || '').match(/\b(20\d{2})\b/)?.[1]);
  const year = explicitYear || (Number.isFinite(fiscalStartYear) ? fiscalStartYear + (monthIndex < 3 ? 1 : 0) : NaN);
  if (!Number.isFinite(year)) return false;
  return isDateInExportPeriod(new Date(year, monthIndex, 15), params);
}
