/**
 * Shared UI components used across all plan-tier dashboard pages.
 * Only exports React components (fast-refresh compliant).
 * Pure utility functions live in ./dashboardUtils.ts
 */
import type { ElementType, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DonutChart from "../../../../components/graphs/DonutChart";
import BarGraph from "../../../../components/graphs/BarGraph";

// Re-export utils so consumers can import from one place
export {
  fmtINR,
  getGreeting,
  statusBadgeColor,
  humanRelTime,
} from "./dashboardUtils";

// ─── StatCard ─────────────────────────────────────────────────────────────────

export interface StatCardProps {
  icon: ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  route?: string;
  onClick?: () => void;
}

export const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color = "#1E3D73",
  route,
  onClick,
}: StatCardProps) => {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl border border-borderGray border-l-4 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer"
      style={{ borderLeftColor: color }}
      onClick={() => {
        if (onClick) onClick();
        else if (route) navigate(route);
      }}
    >
      <div className="min-w-0">
        <p className="text-small font-pmedium text-gray-800 uppercase tracking-widest mb-1 truncate">
          {label}
        </p>
        <p className="text-2xl font-pmedium text-gray-800">{value}</p>
        {sub && (
          <p className="text-small font-pmedium text-gray-500 mt-1 truncate">
            {sub}
          </p>
        )}
      </div>
      <div
        className="p-2.5 rounded-xl shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
    </div>
  );
};

// ─── QuickLink ────────────────────────────────────────────────────────────────

export interface QuickLinkItem {
  icon: ElementType;
  label: string;
  description: string;
  route: string;
  color?: string;
}

export const QuickLink = ({
  icon: Icon,
  label,
  description,
  route,
  color = "#1E3D73",
}: QuickLinkItem) => {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-borderGray bg-white hover:border-primary hover:shadow-md cursor-pointer transition-all duration-200 group"
      onClick={() => navigate(route)}
    >
      <div
        className="p-2 rounded-lg flex-shrink-0"
        style={{ backgroundColor: color + "18" }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-content font-pmedium text-gray-900 truncate">
          {label}
        </p>
        <p className="text-small text-gray-500 truncate">{description}</p>
      </div>
      <ArrowRight
        size={12}
        className="ml-auto flex-shrink-0 text-gray-300 group-hover:text-primary transition-colors"
      />
    </div>
  );
};

// ─── RecentItem ───────────────────────────────────────────────────────────────

export interface RecentItemProps {
  title: string;
  sub: string;
  badge: string;
  badgeColor: string;
  time?: string;
}

export const RecentItem = ({
  title,
  sub,
  badge,
  badgeColor,
  time,
}: RecentItemProps) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
    <div className="min-w-0">
      <p className="text-content font-pmedium text-gray-800 truncate">
        {title}
      </p>
      <p className="text-small text-gray-500 truncate">{sub}</p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
      {time && <span className="text-small text-gray-400">{time}</span>}
      <span
        className={`px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border ${badgeColor}`}
      >
        {badge}
      </span>
    </div>
  </div>
);

// ─── SectionCard ──────────────────────────────────────────────────────────────

export interface SectionCardProps {
  title: string;
  linkLabel?: string;
  linkRoute?: string;
  children: ReactNode;
}

export const SectionCard = ({
  title,
  linkLabel,
  linkRoute,
  children,
}: SectionCardProps) => {
  const navigate = useNavigate();
  return (
    <div className="h-full border-default rounded-xl overflow-hidden flex flex-col">
      <div className="p-4 border-b-2 border-borderGray flex items-center justify-between">
        <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium uppercase">
          {title}
        </span>
        {linkLabel && linkRoute && (
          <button
            onClick={() => navigate(linkRoute)}
            className="text-small text-accent hover:underline font-pmedium flex items-center gap-1"
          >
            {linkLabel} <ArrowRight size={10} />
          </button>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">{children}</div>
    </div>
  );
};

// ─── DonutWidget ──────────────────────────────────────────────────────────────

export interface DonutWidgetProps {
  title: string;
  series: number[];
  labels: string[];
  colors: string[];
  centerLabel: string;
  emptyText?: string;
}

export const DonutWidget = ({
  title,
  series,
  labels,
  colors,
  centerLabel,
  emptyText = "No data yet",
}: DonutWidgetProps) => {
  const hasData = series.some((v) => v > 0);
  return (
    <div className="h-full flex flex-col border-default rounded-xl overflow-hidden">
      <div className="p-4 border-b-2 border-borderGray uppercase">
        <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">
          {title}
        </span>
      </div>
      <div className="p-4 flex-1 flex items-center justify-center min-h-48">
        {hasData ? (
          <DonutChart
            centerLabel={centerLabel}
            labels={labels}
            colors={colors}
            series={series}
            tooltipValue={series.map(String)}
          />
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-content">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── BarWidget ────────────────────────────────────────────────────────────────

export interface BarWidgetProps {
  title: string;
  chartId: string;
  series: { name: string; data: number[] }[];
  options: Record<string, unknown>;
  height?: number;
}

export const BarWidget = ({
  title,
  chartId,
  series,
  options,
  height = 260,
}: BarWidgetProps) => (
  <div className="border-default rounded-xl overflow-hidden">
    <div className="p-4 border-b-2 border-borderGray uppercase">
      <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">
        {title}
      </span>
    </div>
    <div className="p-2">
      <BarGraph
        chartId={chartId}
        data={series}
        options={options}
        height={height}
      />
    </div>
  </div>
);

// ─── MetricTile ───────────────────────────────────────────────────────────────
// Newer card style introduced on BasicDashboard (tinted icon, hover-lift).
// Keeps a per-metric `color` like StatCard so dashboards with several metric
// types (tenants, bookings, tickets, visitors...) stay visually distinct.

export interface MetricTileProps {
  icon: ElementType;
  label: string;
  value: string | number;
  sub?: string;
  route?: string;
  color?: string;
}

export const MetricTile = ({
  icon: Icon,
  label,
  value,
  sub,
  route,
}: MetricTileProps) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => route && navigate(route)}
      className="group flex min-w-0 items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-pmedium uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-2xl font-pmedium leading-none text-[#1E3D73]">
            {value}
          </span>
          {sub && (
            <span className="truncate pb-0.5 text-[10px] font-pmedium text-slate-500">
              {sub}
            </span>
          )}
        </div>
      </div>
      <ArrowRight
        size={13}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]"
      />
    </button>
  );
};

// ─── QuickActionTile ────────────────────────────────────────────────────────

export const QuickActionTile = ({
  icon: Icon,
  label,
  description,
  route,
}: QuickLinkItem) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-pmedium text-[#1E3D73]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {description}
        </p>
      </div>
      <ArrowRight
        size={13}
        className="shrink-0 text-blue-300 transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]"
      />
    </button>
  );
};

// ─── ActivityPanel ────────────────────────────────────────────────────────────
// Replaces SectionCard/DonutWidget/BarWidget's plain "border-default" chrome
// with the rounded, eyebrow-labeled panel BasicDashboard uses. Chart/list
// content goes directly in `children` (no separate Donut/Bar wrapper needed).

export interface ActivityPanelProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export const ActivityPanel = ({
  eyebrow,
  title,
  action,
  children,
}: ActivityPanelProps) => (
  <section className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_10px_30px_rgba(30,61,115,0.07)]">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-[15px] font-pmedium text-[#1E3D73]">
          {title}
        </h3>
      </div>
      {action}
    </div>
    <div className="flex flex-1 flex-col p-5">{children}</div>
  </section>
);

// ─── EmptyState ───────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel: string;
  route: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  route,
}: EmptyStateProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-52 flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
        <Icon size={20} />
      </div>
      <p className="mt-3 text-sm font-pmedium text-[#1E3D73]">{title}</p>
      <p className="mt-1 max-w-xs text-[11px] font-pmedium leading-relaxed text-slate-500">
        {description}
      </p>
      <button
        type="button"
        onClick={() => navigate(route)}
        className="group mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-white transition hover:bg-[#1E3D73]"
      >
        {actionLabel}
        <ArrowRight
          size={12}
          className="transition group-hover:translate-x-0.5"
        />
      </button>
    </div>
  );
};

// ─── PlanBadge ────────────────────────────────────────────────────────────────

const PLAN_BADGE_STYLES: Record<string, string> = {
  basic: "bg-gray-100 text-gray-600 border-gray-300",
  professional: "bg-blue-50 text-blue-700 border-blue-200",
  custom: "bg-violet-50 text-violet-700 border-violet-200",
};

export const PlanBadge = ({
  plan,
  clickable,
}: {
  plan: string;
  clickable?: boolean;
}) => (
  <span
    className={`inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 text-[11px] font-pmedium uppercase tracking-widest transition-all ${
      PLAN_BADGE_STYLES[plan] ?? PLAN_BADGE_STYLES.basic
    } ${clickable ? "hover:opacity-80 hover:shadow-sm" : ""}`}
  >
    {plan} plan {clickable && <span className="opacity-60">↑</span>}
  </span>
);
