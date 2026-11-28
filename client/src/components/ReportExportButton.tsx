import { Download } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import useReadOnlySession from '../hooks/useReadOnlySession';

type ReportExportButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  isExporting?: boolean;
};

export default function ReportExportButton({
  isExporting = false,
  disabled,
  className = '',
  ...props
}: ReportExportButtonProps) {
  // Report exports are server writes (POST /api/reports creates the report
  // record), so the API refuses them in a staff "View As" session anyway.
  // Disabling here keeps the button honest instead of letting staff click it
  // and get a 403. One shared component covers every page that exports.
  const { isReadOnly, readOnlyTooltip } = useReadOnlySession();

  return (
    <button
      type="button"
      disabled={disabled || isExporting || isReadOnly}
      title={readOnlyTooltip}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      <Download size={14} strokeWidth={2.5} aria-hidden="true" />
      <span>{isExporting ? 'Exporting...' : 'Export'}</span>
    </button>
  );
}
