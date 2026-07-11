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
export { fmtINR, getGreeting, statusBadgeColor, humanRelTime } from "./dashboardUtils";

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
      className="rounded-xl p-5 shadow-md bg-white flex flex-col gap-3 transition-all duration-200 hover:shadow-lg cursor-pointer border border-borderGray"
      onClick={() => { if (onClick) onClick(); else if (route) navigate(route); }}
    >
      <div className="flex items-center justify-between">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: color + "18" }}>
          <Icon size={20} style={{ color }} />
        </div>
        {route && (
          <div className="p-1.5 rounded-full hover:bg-primary hover:text-white text-gray-300 transition-colors">
            <ArrowRight size={12} />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-pbold text-gray-900">{value}</p>
        <p className="text-content font-pmedium text-primary uppercase tracking-wide mt-0.5">{label}</p>
        {sub && <p className="text-small text-gray-400 mt-1">{sub}</p>}
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
      <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: color + "18" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-content font-pmedium text-gray-900 truncate">{label}</p>
        <p className="text-small text-gray-500 truncate">{description}</p>
      </div>
      <ArrowRight size={12} className="ml-auto flex-shrink-0 text-gray-300 group-hover:text-primary transition-colors" />
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

export const RecentItem = ({ title, sub, badge, badgeColor, time }: RecentItemProps) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
    <div className="min-w-0">
      <p className="text-content font-pmedium text-gray-800 truncate">{title}</p>
      <p className="text-small text-gray-500 truncate">{sub}</p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
      {time && <span className="text-small text-gray-400">{time}</span>}
      <span className={`px-2 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border ${badgeColor}`}>
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

export const SectionCard = ({ title, linkLabel, linkRoute, children }: SectionCardProps) => {
  const navigate = useNavigate();
  return (
    <div className="border-default border-borderGray rounded-xl overflow-hidden">
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
      <div className="p-4">{children}</div>
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
    <div className="border-default border-borderGray rounded-xl overflow-hidden">
      <div className="p-4 border-b-2 border-borderGray uppercase">
        <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">{title}</span>
      </div>
      <div className="p-4 flex justify-center">
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

export const BarWidget = ({ title, chartId, series, options, height = 260 }: BarWidgetProps) => (
  <div className="border-default border-borderGray rounded-xl overflow-hidden">
    <div className="p-4 border-b-2 border-borderGray uppercase">
      <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">{title}</span>
    </div>
    <div className="p-2">
      <BarGraph chartId={chartId} data={series} options={options} height={height} />
    </div>
  </div>
);

// ─── PlanBadge ────────────────────────────────────────────────────────────────

const PLAN_BADGE_STYLES: Record<string, string> = {
  basic: "bg-gray-100 text-gray-600 border-gray-300",
  professional: "bg-blue-50 text-blue-700 border-blue-200",
  custom: "bg-violet-50 text-violet-700 border-violet-200",
};

export const PlanBadge = ({ plan, clickable }: { plan: string; clickable?: boolean }) => (
  <span
    className={`px-3 py-1 rounded-full text-[10px] font-pmedium uppercase tracking-widest border transition-all ${
      PLAN_BADGE_STYLES[plan] ?? PLAN_BADGE_STYLES.basic
    } ${clickable ? "hover:opacity-80 hover:shadow-sm" : ""}`}
  >
    {plan} plan {clickable && <span className="opacity-60">↑</span>}
  </span>
);
