import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Headphones,
  UserCheck,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import supportBannerImage from "../../assets/administration-dashboard-banner.webp";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { statusPillClass } from "../../lib/status-pill";

type SupportTicketRecord = {
  id?: string;
  ticketId?: string;
  title?: string;
  status?: string;
  requestedAt?: string;
  resolvedAt?: string | null;
  requestedByName?: string;
};

const SUPPORT_TICKETS_API = "/api/tickets/support-tickets";
const DONUT_PALETTE = [
  "#F59E0B",
  "#7C3AED",
  "#2563EB",
  "#EF4444",
  "#10B981",
  "#64748B",
];

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

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

  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
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

export default function CustomerSupportDashboard() {
  const axios = useAxiosPrivate();
  const [raisedTickets, setRaisedTickets] = useState<SupportTicketRecord[]>([]);
  const [resolvedTickets, setResolvedTickets] = useState<SupportTicketRecord[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    axios
      .get(SUPPORT_TICKETS_API)
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data?.data || {};
        setRaisedTickets(Array.isArray(payload.raised) ? payload.raised : []);
        setResolvedTickets(
          Array.isArray(payload.history) ? payload.history : [],
        );
        setLoadError("");
      })
      .catch(() => {
        if (cancelled) return;
        setRaisedTickets([]);
        setResolvedTickets([]);
        setLoadError("Customer Support data could not be refreshed.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [axios]);

  const allTickets = useMemo(
    () => [...raisedTickets, ...resolvedTickets],
    [raisedTickets, resolvedTickets],
  );

  const stats = useMemo(() => {
    const count = (statuses: string[]) =>
      allTickets.filter((ticket) => statuses.includes(normalize(ticket.status)))
        .length;

    return {
      total: allTickets.length,
      raised: count(["open", "pending"]),
      accepted: count(["accepted"]),
      inProgress: count(["in progress", "in_progress"]),
      escalated: count(["escalated"]),
      resolved: count(["resolved", "closed"]),
    };
  }, [allTickets]);

  const statusBreakdown = useMemo(() => {
    const buckets = new Map<string, number>();
    allTickets.forEach((ticket) => {
      const rawStatus = String(ticket.status || "Pending").replace(/_/g, " ");
      const label = rawStatus.replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      );
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });
    return [...buckets.entries()].sort((left, right) => right[1] - left[1]);
  }, [allTickets]);

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
      const date = new Date(String(value || ""));
      if (Number.isNaN(date.getTime())) return -1;
      const difference =
        (anchor.getFullYear() - date.getFullYear()) * 12 +
        anchor.getMonth() -
        date.getMonth();
      const index = 11 - difference;
      return index >= 0 && index < 12 ? index : -1;
    };

    const raised = new Array(12).fill(0);
    const resolved = new Array(12).fill(0);
    allTickets.forEach((ticket) => {
      const raisedIndex = indexFor(ticket.requestedAt);
      if (raisedIndex >= 0) raised[raisedIndex] += 1;
      if (["resolved", "closed"].includes(normalize(ticket.status))) {
        const resolvedIndex = indexFor(ticket.resolvedAt || ticket.requestedAt);
        if (resolvedIndex >= 0) resolved[resolvedIndex] += 1;
      }
    });
    return { raised, resolved };
  }, [allTickets]);

  const recentTickets = useMemo(
    () =>
      [...allTickets]
        .sort(
          (left, right) =>
            new Date(right.requestedAt || 0).getTime() -
            new Date(left.requestedAt || 0).getTime(),
        )
        .slice(0, 8),
    [allTickets],
  );

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB", "#10B981"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={supportBannerImage}
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[58%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Customer Support</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Live visibility into raised issues, active resolution work,
                escalations, and completed support.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Raised", "Accepted", "In Progress", "Resolved"].map(
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
                Total tickets
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
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile
              icon={<Headphones size={20} />}
              label="Total tickets"
              value={stats.total}
              sub="All support issues in this workspace"
            />
            <StatTile
              icon={<AlertCircle size={20} />}
              label="Raised"
              value={stats.raised}
              sub="Open issues awaiting support action"
              status={stats.raised ? "attention" : "success"}
            />
            <StatTile
              icon={<UserCheck size={20} />}
              label="Accepted"
              value={stats.accepted}
              sub="Issues acknowledged by the WoNo team"
            />
            <StatTile
              icon={<Clock3 size={20} />}
              label="In progress"
              value={stats.inProgress}
              sub="Issues currently being resolved"
              status={stats.inProgress ? "attention" : "success"}
            />
            <StatTile
              icon={<AlertTriangle size={20} />}
              label="Escalated"
              value={stats.escalated}
              sub="Issues needing urgent attention"
              status={stats.escalated ? "attention" : "success"}
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Resolved / closed"
              value={stats.resolved}
              sub="Completed support resolutions"
              status="success"
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">
              Manage customer support
            </p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Open the live issue register or review completed support history.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DashboardModuleCard
              icon={<Headphones size={19} />}
              title="Issues Raised"
              route="/common-modules/customer-support/list"
              state={{ tab: "raised" }}
              description="Raise, edit, and track active support issues"
              color="#2563EB"
            />
            <DashboardModuleCard
              icon={<FileCheck2 size={19} />}
              title="Resolved Issues"
              route="/common-modules/customer-support/list"
              state={{ tab: "resolved" }}
              description="Review resolved and closed ticket history"
              color="#7C3AED"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard
                title="Monthly Ticket Activity"
                subtitle="Raised versus resolved tickets over the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={trendOptions}
                  series={[
                    { name: "Raised", data: monthlyActivity.raised },
                    { name: "Resolved", data: monthlyActivity.resolved },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title="Ticket Status Breakdown"
                subtitle="Every support ticket grouped by its current status."
              >
                {statusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Tickets"
                    labels={statusBreakdown.map(([label]) => label)}
                    series={statusBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, statusBreakdown.length)}
                    tooltipValue={statusBreakdown.map(
                      ([, value]) => `${value} tickets`,
                    )}
                  />
                ) : (
                  <Empty>No ticket-status data is available yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4">
              <ChartCard
                title="Recent Support Tickets"
                subtitle="The latest issues raised across the workspace."
                bodyClassName=""
              >
                {recentTickets.length ? (
                  <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[16%] px-5 py-3">Ticket</th>
                          <th className="w-[34%] px-4 py-3">Issue</th>
                          <th className="w-[20%] px-4 py-3">Raised by</th>
                          <th className="w-[16%] px-4 py-3">Created</th>
                          <th className="w-[14%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentTickets.map((ticket, index) => (
                          <tr
                            key={ticket.id || `${ticket.ticketId}-${index}`}
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {ticket.ticketId || "Ticket"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {ticket.title || "Support issue"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {ticket.requestedByName || "Workspace member"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {dateLabel(ticket.requestedAt)}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={statusPillClass(
                                  ticket.status || "Pending",
                                )}
                              >
                                {ticket.status || "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No support tickets are available yet.
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
