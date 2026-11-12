import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Inbox,
  Lock,
  Send,
  TicketCheck,
  UserCheck,
  Users,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import ticketBannerImage from "../../assets/administration-dashboard-banner.webp";
import {
  canAccessAdminDashboard,
  canAccessAdministrationDashboard,
  canAccessFinanceDashboard,
  canAccessHRDashboard,
  canAccessITDashboard,
  canAccessMaintenanceDashboard,
  canAccessSalesDashboard,
  canAccessTechDashboard,
  getStoredUser,
} from "../../lib/auth-session";
import { statusPillClass } from "../../lib/status-pill";
import { getTenantCompanies } from "../../services/tenant-companies";
import { getTickets } from "../../services/tickets";

type TicketRecord = Record<string, any>;

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const readable = (value: unknown, fallback = "Not recorded") => {
  const label = String(value || "").trim();
  if (!label) return fallback;
  return label.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const ticketDate = (ticket: TicketRecord) =>
  ticket.updatedAt || ticket.createdAt || ticket.requestedAt;

const dateLabel = (value: unknown) => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function SectionCard({
  title,
  subtitle,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
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
  value: number;
  sub: string;
  tone?: "blue" | "amber" | "green" | "violet" | "rose" | "slate";
}) {
  const tones = {
    blue: "border-l-blue-600 bg-blue-50 text-blue-700",
    amber: "border-l-amber-500 bg-amber-50 text-amber-700",
    green: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    violet: "border-l-violet-500 bg-violet-50 text-violet-700",
    rose: "border-l-rose-500 bg-rose-50 text-rose-700",
    slate: "border-l-slate-500 bg-slate-100 text-slate-700",
  };
  const hoverBorders = {
    blue: "hover:border-blue-200 hover:border-l-blue-600",
    amber: "hover:border-amber-200 hover:border-l-amber-500",
    green: "hover:border-emerald-200 hover:border-l-emerald-500",
    violet: "hover:border-violet-200 hover:border-l-violet-500",
    rose: "hover:border-rose-200 hover:border-l-rose-500",
    slate: "hover:border-slate-300 hover:border-l-slate-500",
  };

  return (
    <div className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${hoverBorders[tone]}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">{value}</p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function LockedTicketCard({ reason }: { reason: string }) {
  return (
    <button
      type="button"
      disabled
      title={reason}
      className="relative flex min-h-[154px] min-w-0 cursor-not-allowed flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-5 text-center opacity-75 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-slate-300" />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-pmedium text-slate-500">
        <Lock size={11} /> Locked
      </span>
      <span className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200/70 text-slate-500">
        <Building2 size={19} />
      </span>
      <span className="max-w-full text-[13px] font-pmedium leading-[1.35] text-slate-600 [overflow-wrap:anywhere]">
        Tenant Company Tickets
      </span>
      <span className="mt-1.5 line-clamp-2 max-w-[210px] text-[9px] font-pmedium leading-4 text-slate-400">
        {reason}
      </span>
    </button>
  );
}

export default function TicketsWorkspaceDashboard() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [tenantCompanyCount, setTenantCompanyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const user = useMemo(() => getStoredUser(), []);

  const normalizedRole = normalize(user?.workspaceMembership?.role || user?.role || "owner");
  const isOwner = normalizedRole === "owner" || normalizedRole === "founder";
  const isSuperAdmin = normalizedRole === "super_admin" || normalizedRole === "super-admin";
  const isAdmin = canAccessAdminDashboard(user);
  const isDepartmentManager =
    canAccessHRDashboard(user) ||
    canAccessAdministrationDashboard(user) ||
    canAccessSalesDashboard(user) ||
    canAccessFinanceDashboard(user) ||
    canAccessTechDashboard(user) ||
    canAccessITDashboard(user) ||
    canAccessMaintenanceDashboard(user) ||
    normalizedRole === "manager" ||
    normalizedRole.endsWith("_manager") ||
    normalizedRole.endsWith("-manager");
  const isEmployee = !isOwner && !isSuperAdmin && !isAdmin && !isDepartmentManager;
  const departmentNames = [
    ...(Array.isArray(user?.workspaceMembership?.departments)
      ? user.workspaceMembership.departments
      : []),
    user?.workspaceMembership?.department,
    user?.department,
  ]
    .map((department) =>
      typeof department === "string"
        ? department
        : department?.name || department?.departmentName || department?.label,
    )
    .map(normalize)
    .filter(Boolean);
  const canSeeTenantCompany =
    isOwner ||
    isSuperAdmin ||
    (isAdmin && departmentNames.includes("administration")) ||
    ((isDepartmentManager || isEmployee) && departmentNames.includes("administration"));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled([
      getTickets({ page: 1, limit: 100 }),
      getTenantCompanies({ page: 1, limit: 1 }),
    ])
      .then(([ticketsResult, tenantCompaniesResult]) => {
        if (cancelled) return;
        if (ticketsResult.status === "fulfilled") {
          const response = ticketsResult.value;
          const records = Array.isArray(response)
            ? response
            : response?.tickets || response?.items || [];
          setTickets(Array.isArray(records) ? records : []);
          setLoadError("");
        } else {
          setTickets([]);
          setLoadError("Ticket data could not be refreshed just now.");
        }

        if (tenantCompaniesResult.status === "fulfilled") {
          const payload = tenantCompaniesResult.value?.data || {};
          const companies = Array.isArray(payload.tenants) ? payload.tenants : [];
          setTenantCompanyCount(Number(payload.total || payload.totalCount || companies.length || 0));
        } else {
          setTenantCompanyCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const countStatus = (status: string) =>
      tickets.filter((ticket) => normalize(ticket.status) === status).length;
    const departments = new Set(
      tickets.map((ticket) => normalize(ticket.department)).filter(Boolean),
    );

    return {
      total: tickets.length,
      open: countStatus("open"),
      inProgress: tickets.filter((ticket) =>
        ["in progress", "in_progress"].includes(normalize(ticket.status)),
      ).length,
      resolved: countStatus("resolved"),
      closed: countStatus("closed"),
      unassigned: tickets.filter(
        (ticket) => !ticket.assigneeUserId && !ticket.assignedTo && !ticket.assignee,
      ).length,
      urgent: tickets.filter((ticket) =>
        ["high", "urgent", "critical"].includes(normalize(ticket.priority)),
      ).length,
      departments: departments.size,
    };
  }, [tickets]);

  const statusBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    tickets.forEach((ticket) => {
      const label = readable(ticket.status, "Open");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [tickets]);

  const departmentBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    tickets.forEach((ticket) => {
      const label = readable(ticket.department, "Unassigned");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);
  }, [tickets]);

  const priorityBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    tickets.forEach((ticket) => {
      const label = readable(ticket.priority, "Not Set");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [tickets]);

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - (11 - index), 1);
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const monthlyActivity = useMemo(() => {
    const anchor = new Date();
    const raised = new Array(12).fill(0);
    const completed = new Array(12).fill(0);
    const monthIndex = (value: unknown) => {
      const date = new Date(String(value || ""));
      if (Number.isNaN(date.getTime())) return -1;
      const difference =
        (anchor.getFullYear() - date.getFullYear()) * 12 +
        anchor.getMonth() -
        date.getMonth();
      const index = 11 - difference;
      return index >= 0 && index < 12 ? index : -1;
    };

    tickets.forEach((ticket) => {
      const raisedIndex = monthIndex(ticket.createdAt || ticket.requestedAt);
      if (raisedIndex >= 0) raised[raisedIndex] += 1;
      if (["resolved", "closed"].includes(normalize(ticket.status))) {
        const completedIndex = monthIndex(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt);
        if (completedIndex >= 0) completed[completedIndex] += 1;
      }
    });
    return { raised, completed };
  }, [tickets]);

  const recentTickets = useMemo(
    () =>
      [...tickets]
        .sort(
          (left, right) =>
            new Date(ticketDate(right) || 0).getTime() -
            new Date(ticketDate(left) || 0).getTime(),
        )
        .slice(0, 10),
    [tickets],
  );

  const queueLabel = isAdmin
    ? "Assigned Departments"
    : isDepartmentManager
      ? "Department Tickets"
      : isEmployee
        ? "Department Queue"
        : "Company Tickets";
  const hasTenantCompanies =
    tenantCompanyCount > 0 ||
    tickets.some((ticket) => ticket.tenantCompanyId || ticket.tenantCompanyName);
  const tenantCompanyCardEnabled = hasTenantCompanies && canSeeTenantCompany;
  const modules = [
    {
      id: "queue",
      label: queueLabel,
      icon: Inbox,
      route: "/common-modules/tickets/list?tab=queue",
      description: "Review incoming tickets for your company or department",
      color: "#2563EB",
    },
    {
      id: "my_raised",
      label: "Raised Tickets",
      icon: Send,
      route: "/common-modules/tickets/list?tab=my_raised",
      description: "Raise new issues and track them through resolution",
      color: "#EA580C",
    },
    {
      id: "my_assigned",
      label: "Assigned Tickets",
      icon: UserCheck,
      route: "/common-modules/tickets/list?tab=my_assigned",
      description: "Work on assigned tickets and update their progress",
      color: "#059669",
    },
    {
      id: "tenant_company",
      label: "Tenant Company Tickets",
      icon: Building2,
      route: "/common-modules/tickets/list?tab=tenant_company",
      description: "Review tickets raised through tenant company operations",
      color: "#7C3AED",
    },
  ];

  const departmentChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: departmentBreakdown.map(([label]) => label) },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const activityChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
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
              src={ticketBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[76%]">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Tickets</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Live visibility into ticket queues, ownership, response progress, and resolution health.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Queue", "Assignments", "Progress", "Resolution"].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Open tickets</p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">{stats.open}</p>
            </div>
          </div>
        </div>

        {loadError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} /> {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<TicketCheck size={20} />} label="Total tickets" value={stats.total} sub="All tickets visible in this workspace" />
            <StatTile icon={<AlertCircle size={20} />} label="Open" value={stats.open} sub="Raised tickets awaiting action" tone="amber" />
            <StatTile icon={<Clock3 size={20} />} label="In progress" value={stats.inProgress} sub="Tickets currently being worked" tone="blue" />
            <StatTile icon={<CheckCircle2 size={20} />} label="Resolved" value={stats.resolved} sub="Issues marked as resolved" tone="green" />
            <StatTile icon={<Lock size={20} />} label="Closed" value={stats.closed} sub="Confirmed and completed tickets" tone="slate" />
            <StatTile icon={<Users size={20} />} label="Unassigned" value={stats.unassigned} sub="Tickets without a current owner" tone="rose" />
            <StatTile icon={<AlertTriangle size={20} />} label="High priority" value={stats.urgent} sub="Urgent or critical ticket records" tone="amber" />
            <StatTile icon={<Building2 size={20} />} label="Departments" value={stats.departments} sub="Departments represented in tickets" tone="violet" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Manage tickets</p>
          <p className="mt-1 text-[10px] text-slate-500">Open the ticket views available for your role and department.</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              if (module.id === "tenant_company" && !tenantCompanyCardEnabled) {
                const reason = !hasTenantCompanies
                  ? "Add a tenant company to unlock this ticket view"
                  : "Available to the Administration ticket chain";
                return <LockedTicketCard key={module.id} reason={reason} />;
              }
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.label}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{
                    fromSection: "tickets-dashboard",
                    moduleTitle: module.label,
                  }}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <SectionCard title="Ticket activity" subtitle="Tickets raised versus completed across the last 12 calendar months.">
                {tickets.length ? (
                  <GroupedBarGraph
                    options={activityChartOptions}
                    series={[
                      { name: "Raised", data: monthlyActivity.raised },
                      { name: "Resolved / Closed", data: monthlyActivity.completed },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No ticket activity recorded yet.</div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard title="Ticket status" subtitle="Current ticket workload grouped by workflow status.">
                {statusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Tickets"
                    labels={statusBreakdown.map(([label]) => label)}
                    series={statusBreakdown.map(([, value]) => value)}
                    colors={["#F59E0B", "#2563EB", "#10B981", "#64748B", "#7C3AED", "#EF4444"]}
                    tooltipValue={statusBreakdown.map(([, value]) => `${value} tickets`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No ticket status data yet.</div>
                )}
              </SectionCard>
              <SectionCard title="Priority mix" subtitle="Current workload split by ticket priority.">
                {priorityBreakdown.length ? (
                  <DonutChart
                    centerLabel="Tickets"
                    labels={priorityBreakdown.map(([label]) => label)}
                    series={priorityBreakdown.map(([, value]) => value)}
                    colors={["#EF4444", "#F59E0B", "#10B981", "#64748B"]}
                    tooltipValue={priorityBreakdown.map(([, value]) => `${value} tickets`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No priority data recorded yet.</div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4">
              <SectionCard title="Tickets by department" subtitle="Ticket volume grouped by the department responsible for the issue.">
                {departmentBreakdown.length ? (
                  <GroupedBarGraph
                    options={departmentChartOptions}
                    series={[{ name: "Tickets", data: departmentBreakdown.map(([, value]) => value) }]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No department ticket data yet.</div>
                )}
              </SectionCard>
            </div>

            <SectionCard title="Recent tickets" subtitle="The latest ticket activity visible in this workspace." bodyClassName="">
              {recentTickets.length ? (
                <div className="max-h-[360px] min-h-[240px] overflow-y-auto overflow-x-hidden">
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="w-[16%] px-5 py-3">Ticket</th>
                        <th className="w-[28%] px-4 py-3">Issue</th>
                        <th className="w-[18%] px-4 py-3">Raised by department</th>
                        <th className="w-[17%] px-4 py-3">Raised by</th>
                        <th className="w-[12%] px-4 py-3">Date raised</th>
                        <th className="w-[12%] px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentTickets.map((ticket, index) => (
                        <tr key={ticket._id || ticket.recordId || ticket.ticketCode || index} className="text-[11px] text-slate-600 transition hover:bg-blue-50/30">
                          <td className="truncate px-5 py-3 font-pmedium text-slate-900">{ticket.ticketCode || ticket.id || "Ticket"}</td>
                          <td className="truncate px-4 py-3">{ticket.title || ticket.description || "Untitled issue"}</td>
                          <td className="truncate px-4 py-3">{readable(ticket.submittedByDept || ticket.requesterDepartment || ticket.department, "Not recorded")}</td>
                          <td className="truncate px-4 py-3">{ticket.submittedBy || ticket.requestedBy || ticket.requester?.name || "Not recorded"}</td>
                          <td className="truncate px-4 py-3">{dateLabel(ticket.createdAt || ticket.requestedAt)}</td>
                          <td className="truncate px-5 py-3"><span className={statusPillClass(ticket.status || "Open")}>{readable(ticket.status, "Open")}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex h-[240px] items-center justify-center px-6 text-center text-[11px] text-slate-500">No tickets have been recorded yet.</div>
              )}
            </SectionCard>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
