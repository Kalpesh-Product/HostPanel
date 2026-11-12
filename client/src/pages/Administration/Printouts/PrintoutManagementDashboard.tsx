import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Hourglass,
  ListChecks,
  Monitor,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import GroupedBarGraph from "../../../components/graphs/GroupedBarGraph";
import administrationBannerImage from "../../../assets/administration-dashboard-banner.webp";
import { getPrintoutRequests } from "../../../services/printouts";
import { statusPillClass } from "../../../lib/status-pill";

// Mirrors the console record shape (PrintoutManagementPage) — the front desk
// needs requester and source context on top of the self-service fields.
type PrintoutRequestRecord = {
  _id?: string;
  requestCode?: string;
  title?: string;
  copies?: number;
  priority?: string;
  status?: string;
  requestedByName?: string;
  requestedByType?: "internal" | "tenant";
  tenantCompanyName?: string;
  sourceType?: "self" | "walk-in";
  createdAt?: string;
};

const REFRESH_INTERVAL_MS = 15000;
const DONUT_PALETTE = ["#F59E0B", "#2563EB", "#10B981", "#EF4444", "#64748B"];

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const asDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateLabel = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const requesterLabel = (request: PrintoutRequestRecord) => {
  if (request.sourceType === "walk-in") {
    return request.requestedByName || "Walk-in guest";
  }
  return request.requestedByName || "Unknown requester";
};

const sourceLabel = (request: PrintoutRequestRecord) => {
  if (request.sourceType === "walk-in") return "Walk-in";
  if (request.requestedByType === "tenant") return "Tenant company";
  return "Internal staff";
};

const sourceTone = (label: string) => {
  if (label === "Walk-in") return "bg-violet-50 text-violet-700";
  if (label === "Tenant company") return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-700";
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-6 text-center text-[11px] font-pmedium text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[11px] font-pmedium text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone?: "blue" | "amber" | "violet" | "emerald" | "rose" | "orange";
}) {
  // Follows the Sales-module KPI convention (CafeOrders/CafeManagement):
  // the tile stays neutral at rest, and on hover the card lifts while the
  // KPI's own colour shows on the left border — blue = volume, amber/violet
  // = work in flight, emerald = done, rose = declined, orange = urgent.
  const tones = {
    blue: {
      card: "hover:border-l-blue-600",
      icon: "border-l-blue-600 bg-blue-50 text-blue-700",
    },
    amber: {
      card: "hover:border-l-amber-500",
      icon: "border-l-amber-500 bg-amber-50 text-amber-700",
    },
    violet: {
      card: "hover:border-l-violet-500",
      icon: "border-l-violet-500 bg-violet-50 text-violet-700",
    },
    emerald: {
      card: "hover:border-l-emerald-500",
      icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    },
    rose: {
      card: "hover:border-l-rose-500",
      icon: "border-l-rose-500 bg-rose-50 text-rose-700",
    },
    orange: {
      card: "hover:border-l-orange-500",
      icon: "border-l-orange-500 bg-orange-50 text-orange-700",
    },
  };

  return (
    <div className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-md ${tones[tone].card}`}>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone].icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        {sub ? (
          <p className="mt-2 truncate text-[10px] font-pmedium text-slate-500">
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function PrintoutManagementDashboard() {
  const [requests, setRequests] = useState<PrintoutRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = (silent = false) => {
      if (!silent) setIsLoading(true);
      getPrintoutRequests({ includeCancelled: "true" })
        .then((payload) => {
          if (cancelled) return;
          setRequests(Array.isArray(payload) ? payload : []);
          setLoadError("");
        })
        .catch(() => {
          if (cancelled) return;
          if (!silent) setRequests([]);
          setLoadError("Printout management data could not be refreshed.");
        })
        .finally(() => {
          if (!cancelled && !silent) setIsLoading(false);
        });
    };

    load();
    // Same live-queue behaviour as the console — the front desk should see
    // accept/reject/complete activity from teammates without a manual refresh.
    const interval = setInterval(() => load(true), REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const count = (predicate: (request: PrintoutRequestRecord) => boolean) =>
      requests.filter(predicate).length;

    const isOpen = (request: PrintoutRequestRecord) =>
      ["pending", "in progress"].includes(normalize(request.status));

    return {
      total: requests.length,
      pending: count((request) => normalize(request.status) === "pending"),
      inProgress: count(
        (request) => normalize(request.status) === "in progress",
      ),
      completed: count((request) => normalize(request.status) === "completed"),
      rejected: count((request) => normalize(request.status) === "rejected"),
      highPriorityOpen: count(
        (request) =>
          isOpen(request) && normalize(request.priority) === "high",
      ),
      today: count((request) => {
        const created = asDate(request.createdAt);
        if (!created) return false;
        const now = new Date();
        return created.toDateString() === now.toDateString();
      }),
      walkIns: count(
        (request) => request.sourceType === "walk-in",
      ),
      tenantRequests: count(
        (request) =>
          request.sourceType !== "walk-in" &&
          request.requestedByType === "tenant",
      ),
    };
  }, [requests]);

  const statusBreakdown = useMemo(() => {
    const buckets = new Map<string, number>();
    requests.forEach((request) => {
      const rawStatus = String(request.status || "Pending").replace(/_/g, " ");
      const label = rawStatus.replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      );
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });
    return [...buckets.entries()].sort((left, right) => right[1] - left[1]);
  }, [requests]);

  const priorityBreakdown = useMemo(() => {
    const order = ["High", "Medium", "Low"];
    const buckets = new Map<string, number>([
      ["High", 0],
      ["Medium", 0],
      ["Low", 0],
    ]);
    requests.forEach((request) => {
      const label = order.includes(String(request.priority))
        ? String(request.priority)
        : "Medium";
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });
    return order
      .map((label) => [label, buckets.get(label) || 0] as [string, number])
      .filter(([, value]) => value > 0);
  }, [requests]);

  const sourceBreakdown = useMemo(() => {
    const buckets = new Map<string, number>();
    requests.forEach((request) => {
      const label = sourceLabel(request);
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });
    return [...buckets.entries()].sort((left, right) => right[1] - left[1]);
  }, [requests]);

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        anchor.getFullYear(),
        anchor.getMonth() - (11 - index),
        1,
      );
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const monthlyActivity = useMemo(() => {
    const anchor = new Date();
    const indexFor = (value?: string | null) => {
      const date = asDate(value);
      if (!date) return -1;
      const difference =
        (anchor.getFullYear() - date.getFullYear()) * 12 +
        anchor.getMonth() -
        date.getMonth();
      const index = 11 - difference;
      return index >= 0 && index < 12 ? index : -1;
    };

    const counts = new Array(12).fill(0);
    requests.forEach((request) => {
      const index = indexFor(request.createdAt);
      if (index >= 0) counts[index] += 1;
    });
    return counts;
  }, [requests]);

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [requests],
  );

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={administrationBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full overflow-hidden bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            >
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[70%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Printout</span>
                <span className="text-accent">Management</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                The front-desk view of every printout request from internal
                staff, tenant companies, and walk-in guests.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Pending", "In Progress", "Completed", "Rejected"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                Total requests
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {stats.total}
              </p>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div
            data-tour="printout-management-dashboard-summary"
            className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3"
          >
            <StatTile
              icon={<ListChecks size={20} />}
              label="Total requests"
              value={stats.total}
              sub={`${stats.today} submitted today`}
              tone="blue"
            />
            <StatTile
              icon={<Hourglass size={20} />}
              label="Pending"
              value={stats.pending}
              sub="Awaiting front-desk action"
              tone="amber"
            />
            <StatTile
              icon={<Clock3 size={20} />}
              label="In progress"
              value={stats.inProgress}
              sub="Currently being printed"
              tone="violet"
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Completed"
              value={stats.completed}
              sub="Ready for pickup or delivered"
              tone="emerald"
            />
            <StatTile
              icon={<XCircle size={20} />}
              label="Rejected"
              value={stats.rejected}
              sub="Requests declined by the desk"
              tone="rose"
            />
            <StatTile
              icon={<TriangleAlert size={20} />}
              label="High priority open"
              value={stats.highPriorityOpen}
              sub="Urgent requests still in the queue"
              tone="orange"
            />
          </div>
        )}

        <div className="mb-6" data-tour="printout-management-dashboard-modules">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">
              Work the printout queue
            </p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Open the front-desk console to accept, reject, print, and complete
              requests.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <DashboardModuleCard
              icon={<Monitor size={19} />}
              title="Management Console"
              route="/department-accesses/administration-department/printouts/dashboard"
              description="Accept, reject, print, and complete requests from the front desk"
              color="#2563EB"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div
              className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
              data-tour="printout-management-dashboard-activity"
            >
              <ChartCard
                title="Monthly Printout Activity"
                subtitle="Requests handled by the front desk over the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={trendOptions}
                  series={[{ name: "Requests", data: monthlyActivity }]}
                />
              </ChartCard>
              <ChartCard
                title="Request Status Breakdown"
                subtitle="Every printout request grouped by its current status."
              >
                {statusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Requests"
                    labels={statusBreakdown.map(([label]) => label)}
                    series={statusBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, statusBreakdown.length)}
                    tooltipValue={statusBreakdown.map(
                      ([, value]) => `${value} requests`,
                    )}
                  />
                ) : (
                  <Empty>No printout-status data is available yet.</Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div data-tour="printout-management-dashboard-priority">
                <ChartCard
                  title="Priority Mix"
                  subtitle="How the workload is split across request priorities."
                >
                  {priorityBreakdown.length ? (
                    <DonutChart
                      centerLabel="Requests"
                      labels={priorityBreakdown.map(([label]) => label)}
                      series={priorityBreakdown.map(([, value]) => value)}
                      colors={["#EF4444", "#F59E0B", "#64748B"].slice(
                        0,
                        priorityBreakdown.length,
                      )}
                      tooltipValue={priorityBreakdown.map(
                        ([, value]) => `${value} requests`,
                      )}
                    />
                  ) : (
                    <Empty>No priority data is available yet.</Empty>
                  )}
                </ChartCard>
              </div>
              <div data-tour="printout-management-dashboard-source">
                <ChartCard
                  title="Request Sources"
                  subtitle="Internal staff, tenant companies, and walk-in guests side by side."
                >
                  {sourceBreakdown.length ? (
                    <DonutChart
                      centerLabel="Requests"
                      labels={sourceBreakdown.map(([label]) => label)}
                      series={sourceBreakdown.map(([, value]) => value)}
                      colors={DONUT_PALETTE.slice(0, sourceBreakdown.length)}
                      tooltipValue={sourceBreakdown.map(
                        ([, value]) => `${value} requests`,
                      )}
                    />
                  ) : (
                    <Empty>No request-source data is available yet.</Empty>
                  )}
                </ChartCard>
              </div>
            </div>

            <div className="mb-4" data-tour="printout-management-dashboard-table">
              <ChartCard
                title="Recent Printout Requests"
                subtitle="The latest requests submitted across the workspace."
                bodyClassName=""
              >
                {recentRequests.length ? (
                  <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[16%] px-5 py-3">Print ID</th>
                          <th className="w-[28%] px-4 py-3">Request</th>
                          <th className="w-[18%] px-4 py-3">Requester</th>
                          <th className="w-[14%] px-4 py-3">Source</th>
                          <th className="w-[10%] px-4 py-3">Priority</th>
                          <th className="w-[14%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentRequests.map((request, index) => (
                          <tr
                            key={request._id || `${request.requestCode}-${index}`}
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {request.requestCode || "Request"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {request.title || "Printout request"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {requesterLabel(request)}
                            </td>
                            <td className="truncate px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] ${sourceTone(
                                  sourceLabel(request),
                                )}`}
                              >
                                {sourceLabel(request)}
                              </span>
                            </td>
                            <td className="truncate px-4 py-3">
                              {request.priority || "Medium"}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={statusPillClass(
                                  request.status || "Pending",
                                )}
                              >
                                {request.status || "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No printout requests are available yet.
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
