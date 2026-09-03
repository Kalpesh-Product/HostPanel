import React, { useEffect, useMemo, useState } from 'react';
import { Download, X, ChevronDown } from 'lucide-react';

export type ExportFormat = 'PDF' | 'Excel';
export type ExportDataWindow = 'Monthly' | 'Quarterly' | 'Annual' | 'Custom';

export interface ExportParams {
  format: ExportFormat;
  dataWindow: ExportDataWindow;
  period: string;
  reportMonth?: string;
  dateFrom?: string;
  dateTo?: string;
  year?: string;
}

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  department: string;
  category: string;
  sourceRef: string;
  reportTitle: string;
  description?: string;
  defaultDataWindow?: ExportDataWindow;
  hasMonthlyData?: boolean;
  isLoading?: boolean;
  onExport: (params: ExportParams) => Promise<void>;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function PickerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}

const DATA_WINDOW_OPTIONS: { value: ExportDataWindow; label: string }[] = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Annual', label: 'Annual' },
  { value: 'Custom', label: 'Custom Range' },
];

export default function ExportReportModal({
  isOpen,
  onClose,
  title,
  subtitle,
  department,
  category,
  sourceRef,
  reportTitle,
  description,
  defaultDataWindow = 'Annual',
  hasMonthlyData,
  isLoading,
  onExport,
}: ExportReportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [dataWindow, setDataWindow] = useState<ExportDataWindow>(defaultDataWindow);
  const [reportMonth, setReportMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return firstDay.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [quarter, setQuarter] = useState<string>(() => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
  });
  const [year, setYear] = useState<string>(() => String(new Date().getFullYear()));
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormat('PDF');
      setDataWindow(defaultDataWindow);
      setErrorMessage('');
      setIsExporting(false);
      setYear(String(new Date().getFullYear()));
    }
  }, [isOpen, defaultDataWindow]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let i = 4; i >= 0; i--) {
      years.push(String(currentYear - i));
    }
    return years;
  }, []);

  const quarterOptions = useMemo(() => {
    const quarters: string[] = [];
    for (const year of yearOptions) {
      for (let q = 1; q <= 4; q++) {
        quarters.push(`Q${q} ${year}`);
      }
    }
    return quarters;
  }, [yearOptions]);

  const selectedReportMonth = dataWindow === 'Monthly' ? reportMonth.slice(0, 7) : undefined;
  const selectedPeriod = useMemo(() => {
    if (dataWindow === 'Monthly') {
      const [year, month] = (selectedReportMonth || '').split('-');
      const monthLabel = MONTHS.find((m) => m.value === month)?.label || month;
      return `${monthLabel} ${year}`;
    }
    if (dataWindow === 'Quarterly') return quarter;
    if (dataWindow === 'Custom') {
      const fmt = (d: string) => {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      };
      return fmt(dateFrom) && fmt(dateTo) ? `${fmt(dateFrom)} - ${fmt(dateTo)}` : fmt(dateFrom) || fmt(dateTo);
    }
    return year;
  }, [dataWindow, quarter, dateFrom, dateTo, selectedReportMonth, year]);

  const selectedDateRange = useMemo(() => {
    if (dataWindow === 'Custom') return { dateFrom, dateTo };
    if (dataWindow === 'Monthly') {
      const [selectedYear, selectedMonth] = reportMonth.split('-').map(Number);
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      return { dateFrom: `${reportMonth}-01`, dateTo: `${reportMonth}-${String(lastDay).padStart(2, '0')}` };
    }
    if (dataWindow === 'Quarterly') {
      const [quarterLabel, selectedYear] = quarter.split(' ');
      const startMonth = (Number(quarterLabel.slice(1)) - 1) * 3 + 1;
      const endMonth = startMonth + 2;
      const lastDay = new Date(Number(selectedYear), endMonth, 0).getDate();
      return {
        dateFrom: `${selectedYear}-${String(startMonth).padStart(2, '0')}-01`,
        dateTo: `${selectedYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }, [dataWindow, dateFrom, dateTo, quarter, reportMonth, year]);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();

  const handleExport = async () => {
    setErrorMessage('');
    if (dataWindow === 'Custom' && (!dateFrom || !dateTo)) {
      setErrorMessage('Please select both start and end dates for custom range.');
      return;
    }
    if (dataWindow === 'Monthly' && !reportMonth) {
      setErrorMessage('Please select a month.');
      return;
    }
    setIsExporting(true);
    try {
      await onExport({
        format,
        dataWindow,
        period: selectedPeriod,
        reportMonth: selectedReportMonth,
        dateFrom: selectedDateRange.dateFrom,
        dateTo: selectedDateRange.dateTo,
        year,
      });
      onClose();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to export report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-[60] p-3">
      <div
        className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
              <Download size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{title}</h2>
              <p className="text-[11px] font-pmedium text-slate-500 mt-1">{subtitle || 'Select format and date range to export.'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
            <PickerField label="Format">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat('PDF')}
                  className={`py-2.5 rounded-xl border font-pmedium text-xs uppercase tracking-widest transition-all ${
                    format === 'PDF' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  PDF
                </button>
                <button
                  onClick={() => setFormat('Excel')}
                  className={`py-2.5 rounded-xl border font-pmedium text-xs uppercase tracking-widest transition-all ${
                    format === 'Excel' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Excel
                </button>
              </div>
            </PickerField>

            <PickerField label="Date Range">
              <div className="grid grid-cols-4 gap-1.5">
                {DATA_WINDOW_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDataWindow(opt.value)}
                    className={`py-2 rounded-lg border font-pmedium text-[10px] uppercase tracking-wider transition-all ${
                      dataWindow === opt.value
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </PickerField>

            {dataWindow === 'Monthly' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PickerField label="Year">
                  <select
                    value={reportMonth.slice(0, 4)}
                    onChange={(e) => setReportMonth(`${e.target.value}-${reportMonth.slice(5)}`)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200/60 rounded-lg font-pmedium text-[12px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </PickerField>
                <PickerField label="Month">
                  <select
                    value={reportMonth.slice(5)}
                    onChange={(e) => setReportMonth(`${reportMonth.slice(0, 4)}-${e.target.value}`)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200/60 rounded-lg font-pmedium text-[12px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </PickerField>
              </div>
            )}

            {dataWindow === 'Quarterly' && (
              <PickerField label="Quarter">
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200/60 rounded-lg font-pmedium text-[12px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none"
                >
                  {quarterOptions.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </PickerField>
            )}

            {dataWindow === 'Annual' && (
              <PickerField label="Year">
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200/60 rounded-lg font-pmedium text-[12px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none"
                >
                  {yearOptions.map((optionYear) => (
                    <option key={optionYear} value={optionYear}>{optionYear}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </PickerField>
            )}

            {dataWindow === 'Custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PickerField label="From Date">
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg font-pmedium text-[12px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none"
                  />
                </PickerField>
                <PickerField label="To Date">
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    max={`${currentYear}-12-31`}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg font-pmedium text-[12px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none"
                  />
                </PickerField>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-pmedium text-rose-700">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="w-full py-3 bg-[#2563EB] text-white rounded-xl font-pmedium text-[13px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/30 hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={16} /> {isExporting ? 'Exporting...' : `Export as ${format}`}
          </button>
        </div>
      </div>
    </div>
  );
}
