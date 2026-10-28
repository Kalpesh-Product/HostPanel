import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type DashboardModuleCardProps = {
  icon: ReactNode;
  title: ReactNode;
  route: string;
  description?: string;
  color?: string;
  state?: Record<string, unknown>;
};

export default function DashboardModuleCard({
  icon,
  title,
  route,
  description,
  color = "#2563EB",
  state,
}: DashboardModuleCardProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(route, state ? { state } : undefined)}
      className="group relative flex min-h-[154px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-5 text-center shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ backgroundColor: color }}
      />
      <ArrowUpRight
        size={14}
        className="absolute right-3 top-3 text-slate-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600 group-hover:opacity-100"
      />
      <span
        className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}12`, color }}
      >
        {icon}
      </span>
      <span className="max-w-full text-[13px] font-pmedium leading-[1.35] text-slate-900 [overflow-wrap:anywhere]">
        {title}
      </span>
      {description ? (
        <span className="mt-1.5 line-clamp-2 max-w-[190px] text-[9px] font-pmedium leading-4 text-slate-400">
          {description}
        </span>
      ) : null}
    </button>
  );
}
