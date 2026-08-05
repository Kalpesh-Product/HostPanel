import type { ReactNode } from "react";

interface DepartmentDashboardHeroProps {
  departmentLabel: string;
  accentLabel: string;
  summary: string;
  actions?: ReactNode;
}

export const DepartmentDashboardHero = ({
  departmentLabel,
  accentLabel,
  summary,
  actions,
}: DepartmentDashboardHeroProps) => {
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1E3D73] via-[#1E4E96] to-[#2563EB] px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-32 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

      <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-100">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {accentLabel}
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {departmentLabel} <span className="text-indigo-200">Dashboard</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-indigo-100">{summary}</p>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
};

export default DepartmentDashboardHero;
