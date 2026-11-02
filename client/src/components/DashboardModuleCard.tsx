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
  // "compact" gives the smaller tile used on workspaces whose module grids
  // hold only a handful of cards (e.g. Nomad Listings) so they don't stretch
  // oversized like the dense sales grid does. Defaults to "default".
  size?: "default" | "compact";
};

export default function DashboardModuleCard({
  icon,
  title,
  route,
  description,
  color = "#2563EB",
  state,
  size = "default",
}: DashboardModuleCardProps) {
  const navigate = useNavigate();
  const isCompact = size === "compact";

  return (
    <button
      type="button"
      onClick={() => navigate(route, state ? { state } : undefined)}
      className={`group relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] ${
        isCompact
          ? "min-h-[118px] px-4 py-4"
          : "min-h-[154px] px-4 py-5"
      }`}
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
        className={`mb-3 flex shrink-0 items-center justify-center rounded-xl ${
          isCompact ? "h-9 w-9" : "h-11 w-11"
        }`}
        style={{ backgroundColor: `${color}12`, color }}
      >
        {icon}
      </span>
      <span
        className={`max-w-full font-pmedium leading-[1.35] text-slate-900 [overflow-wrap:anywhere] ${
          isCompact ? "text-[12px]" : "text-[13px]"
        }`}
      >
        {title}
      </span>
      {description ? (
        <span
          className={`mt-1.5 line-clamp-2 max-w-[190px] font-pmedium leading-4 text-slate-400 ${
            isCompact ? "text-[8.5px]" : "text-[9px]"
          }`}
        >
          {description}
        </span>
      ) : null}
    </button>
  );
}
