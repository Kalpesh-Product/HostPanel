import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Hourglass,
  ListChecks,
  Printer,
  XCircle,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import printoutBannerImage from "../../assets/module-banners/printout-management-banner.webp";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { statusPillClass } from "../../lib/status-pill";

type PrintoutRequestRecord = {
  _id?: string;
  requestCode?: string;
  title?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
};

type ActivityPeriod = "Yearly" | "Monthly" | "Weekly";

const PRINTOUTS_API = "/api/printouts";
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
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  tourId,
  children,
}: {
  title: string;
  subtitle?: string;
  bodyClassName?: string;
  tourId?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-tour={tourId}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
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
  status = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  status?: "default" | "success" | "attention";
}) {
  const statuses = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };
  const hoverBorders = {
    default: "hover:border-blue-200 hover:border-l-blue-600",
    success: "hover:border-emerald-200 hover:border-l-emerald-500",
    attention: "hover:border-amber-200 hover:border-l-amber-500",
  };

  return (
    <div className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${hoverBorders[status]}`}>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${statuses[status]}`}
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

export default function PrintoutsDashboard() {
  const axios = useAxiosPrivate();
  const [requests, setRequests] = useState<PrintoutRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>("Yearly");
  const [activityAnchor, setActivityAnchor] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    axios
      .get(PRINTOUTS_API, { params: { includeCancelled: "true" } })
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data?.data;
        setRequests(Array.isArray(payload) ? payload : []);
        setLoadError("");
      })
      .catch(() => {
        if (cancelled) return;
        setRequests([]);
        setLoadError("Printout data could not be refreshed.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [axios]);

  const stats = useMemo(() => {
    const count = (statuses: string[]) =>
      requests.filter((request) => statuses.includes(normalize(request.status)))
        .length;

    return {
      total: requests.length,
      pending: count(["pending"]),
      inProgress: count(["in progress"]),
      rejected: count(["rejected"]),
      completed: count(["completed"]),
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

  // Same fiscal-year / month / week windows as the ticket activity chart, so
  // the two modules read the same way.
  const activityData = useMemo(() => {
    let start: Date;
    let end: Date;
    let categories: string[];

    if (activityPeriod === "Yearly") {
      const fiscalStartYear =
        activityAnchor.getMonth() < 3
          ? activityAnchor.getFullYear() - 1
          : activityAnchor.getFullYear();
      start = new Date(fiscalStartYear, 3, 1, 0, 0, 0, 0);
      end = new Date(fiscalStartYear + 1, 2, 31, 23, 59, 59, 999);
      categories = Array.from({ length: 12 }, (_, index) => {
        const month = new Date(fiscalStartYear, 3 + index, 1);
        return month.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        });
      });
    } else if (activityPeriod === "Monthly") {
      start = new Date(
        activityAnchor.getFullYear(),
        activityAnchor.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      end = new Date(
        activityAnchor.getFullYear(),
        activityAnchor.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      categories = Array.from({ length: end.getDate() }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      );
    } else {
      const day = activityAnchor.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      start = new Date(activityAnchor);
      start.setDate(activityAnchor.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      categories = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    }

    const counts = new Array(categories.length).fill(0);
    requests.forEach((request) => {
      const createdAt = asDate(request.createdAt);
      if (!createdAt || createdAt < start || createdAt > end) return;

      let index = 0;
      if (activityPeriod === "Yearly") {
        index = (createdAt.getMonth() - 3 + 12) % 12;
      } else if (activityPeriod === "Monthly") {
        index = createdAt.getDate() - 1;
      } else {
        index = Math.floor((createdAt.getTime() - start.getTime()) / 86400000);
      }
      if (index < 0 || index >= categories.length) return;
      counts[index] += 1;
    });

    let periodLabel = "";
    if (activityPeriod === "Yearly") {
      periodLabel = `FY ${start.getFullYear()}-${String(end.getFullYear()).slice(-2)}`;
    } else if (activityPeriod === "Monthly") {
      periodLabel = activityAnchor.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
    } else {
      periodLabel = `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    }

    return {
      categories,
      counts,
      total: counts.reduce((sum, value) => sum + value, 0),
      periodLabel,
    };
  }, [activityAnchor, activityPeriod, requests]);

  const moveActivityPeriod = (direction: -1 | 1) => {
    setActivityAnchor((current) => {
      const next = new Date(current);
      if (activityPeriod === "Yearly")
        next.setFullYear(current.getFullYear() + direction);
      else if (activityPeriod === "Monthly")
        next.setMonth(current.getMonth() + direction);
      else next.setDate(current.getDate() + direction * 7);
      return next;
    });
  };

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
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: activityPeriod === "Monthly" ? "45%" : "55%",
      },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: {
      categories: activityData.categories,
      labels: { style: { colors: "#64748B", fontSize: "10px" } },
    },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div
          data-tour="printouts-dashboard-banner"
          className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]"
        >
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={printoutBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#2563EB]/45 via-[#3b82f6]/25 to-[#60a5fa]/15"
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
                <span className="text-primary">Printouts</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Live visibility into printout requests sent to the front desk,
                from submission through to completion.
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
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div
            data-tour="printouts-dashboard-stats"
            className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3"
          >
            <StatTile
              icon={<ListChecks size={20} />}
              label="Total requests"
              value={stats.total}
              sub="Every printout request in this workspace"
            />
            <StatTile
              icon={<Hourglass size={20} />}
              label="Pending"
              value={stats.pending}
              sub="Awaiting front-desk action"
              status={stats.pending ? "attention" : "success"}
            />
            <StatTile
              icon={<Clock3 size={20} />}
              label="In progress"
              value={stats.inProgress}
              sub="Currently being printed"
              status={stats.inProgress ? "attention" : "success"}
            />
            <StatTile
              icon={<XCircle size={20} />}
              label="Rejected"
              value={stats.rejected}
              sub="Requests declined by the front desk"
              status={stats.rejected ? "attention" : "success"}
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Completed"
              value={stats.completed}
              sub="Ready for pickup or delivered"
              status="success"
            />
          </div>
        )}

        <div data-tour="printouts-dashboard-modules" className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">
              Manage printouts
            </p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Open the printout request queue to submit, edit, or track requests.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <DashboardModuleCard
              icon={<Printer size={19} />}
              title="Printout Requests"
              route="/common-modules/printouts/list"
              description="Submit, edit, and track printout requests"
              color="#2563EB"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <ChartCard
                tourId="printouts-dashboard-activity"
                title="Printout Activity"
                subtitle="Switch between fiscal-year, month, and week views to see when requests were submitted."
              >
                <div>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
                      {(["Yearly", "Monthly", "Weekly"] as ActivityPeriod[]).map(
                        (period) => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => setActivityPeriod(period)}
                            className={`rounded-md px-3.5 py-2 text-[10px] font-pmedium transition ${activityPeriod === period ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}
                          >
                            {period}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-pmedium text-slate-500">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        {activityData.total} requests
                      </span>
                      <span>in selected period</span>
                    </div>
                  </div>
                  <GroupedBarGraph
                    options={trendOptions}
                    series={[{ name: "Requests", data: activityData.counts }]}
                  />
                  <div className="mt-2 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => moveActivityPeriod(-1)}
                      aria-label="Previous printout activity period"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="min-w-[160px] text-center text-[10px] font-pmedium text-[#1E3D73]">
                      {activityData.periodLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveActivityPeriod(1)}
                      aria-label="Next printout activity period"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard
                tourId="printouts-dashboard-status"
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
              <ChartCard
                tourId="printouts-dashboard-priority"
                title="Priority Mix"
                subtitle="How requests are split across High, Medium, and Low priority."
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

            <div className="mb-4">
              <ChartCard
                tourId="printouts-dashboard-recent"
                title="Recent Printout Requests"
                subtitle="The latest requests submitted across the workspace."
                bodyClassName=""
              >
                {recentRequests.length ? (
                  <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[18%] px-5 py-3">Print ID</th>
                          <th className="w-[40%] px-4 py-3">Request</th>
                          <th className="w-[14%] px-4 py-3">Priority</th>
                          <th className="w-[14%] px-4 py-3">Submitted</th>
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
                              {request.priority || "Medium"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {dateLabel(request.createdAt)}
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
