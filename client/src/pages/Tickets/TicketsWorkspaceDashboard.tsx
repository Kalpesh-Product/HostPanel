import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Inbox,
  Lock,
  Send,
  TicketCheck,
  UserCheck,
  Users,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import ticketBannerImage from "../../assets/module-banners/ticket-management-banner.webp";
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
type ActivityPeriod = "Yearly" | "Monthly" | "Weekly";

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

const indiaDateKey = (value: unknown = new Date()) => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const isCompletedStatus = (status: unknown) =>
  ["resolved", "closed"].includes(normalize(status));

const ticketAgeDays = (ticket: TicketRecord) => {
  const createdAt = new Date(String(ticket.createdAt || ticket.requestedAt || ""));
  if (Number.isNaN(createdAt.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000));
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
  const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>("Yearly");
  const [activityAnchor, setActivityAnchor] = useState(() => new Date());
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
      getTickets({ page: 1, limit: 500 }),
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

  const activityData = useMemo(() => {
    let start: Date;
    let end: Date;
    let categories: string[];

    if (activityPeriod === "Yearly") {
      const fiscalStartYear = activityAnchor.getMonth() < 3
        ? activityAnchor.getFullYear() - 1
        : activityAnchor.getFullYear();
      start = new Date(fiscalStartYear, 3, 1, 0, 0, 0, 0);
      end = new Date(fiscalStartYear + 1, 2, 31, 23, 59, 59, 999);
      categories = Array.from({ length: 12 }, (_, index) => {
        const month = new Date(fiscalStartYear, 3 + index, 1);
        return month.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      });
    } else if (activityPeriod === "Monthly") {
      start = new Date(activityAnchor.getFullYear(), activityAnchor.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(activityAnchor.getFullYear(), activityAnchor.getMonth() + 1, 0, 23, 59, 59, 999);
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

    const series = {
      total: new Array(categories.length).fill(0),
      completed: new Array(categories.length).fill(0),
      open: new Array(categories.length).fill(0),
      inProgress: new Array(categories.length).fill(0),
    };

    tickets.forEach((ticket) => {
      const createdAt = new Date(String(ticket.createdAt || ticket.requestedAt || ""));
      if (Number.isNaN(createdAt.getTime()) || createdAt < start || createdAt > end) return;

      let index = 0;
      if (activityPeriod === "Yearly") {
        index = (createdAt.getMonth() - 3 + 12) % 12;
      } else if (activityPeriod === "Monthly") {
        index = createdAt.getDate() - 1;
      } else {
        index = Math.floor((createdAt.getTime() - start.getTime()) / 86400000);
      }

      if (index < 0 || index >= categories.length) return;
      series.total[index] += 1;
      const status = normalize(ticket.status).replace("_", " ");
      if (isCompletedStatus(status)) series.completed[index] += 1;
      else if (status === "open") series.open[index] += 1;
      else if (status === "in progress") series.inProgress[index] += 1;
    });

    const total = series.total.reduce((sum, value) => sum + value, 0);
    let periodLabel = "";
    if (activityPeriod === "Yearly") {
      periodLabel = `FY ${start.getFullYear()}-${String(end.getFullYear()).slice(-2)}`;
    } else if (activityPeriod === "Monthly") {
      periodLabel = activityAnchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } else {
      periodLabel = `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    }

    return { categories, series, total, periodLabel };
  }, [activityAnchor, activityPeriod, tickets]);

  const todaySnapshot = useMemo(() => {
    const today = indiaDateKey();
    const todayTickets = tickets.filter(
      (ticket) => indiaDateKey(ticket.createdAt || ticket.requestedAt) === today,
    );
    const completedToday = tickets.filter(
      (ticket) =>
        isCompletedStatus(ticket.status) &&
        indiaDateKey(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt) === today,
    ).length;

    return {
      raised: todayTickets.length,
      completed: completedToday,
      open: todayTickets.filter((ticket) => normalize(ticket.status) === "open").length,
      high: todayTickets.filter((ticket) =>
        ["high", "urgent", "critical"].includes(normalize(ticket.priority)),
      ).length,
      medium: todayTickets.filter((ticket) => normalize(ticket.priority) === "medium").length,
      low: todayTickets.filter((ticket) => normalize(ticket.priority) === "low").length,
      assigned: tickets.filter(
        (ticket) =>
          indiaDateKey(ticket.assignedAt) === today &&
          (ticket.assigneeUserId || ticket.assignedTo || ticket.assignee),
      ).length,
      unassigned: todayTickets.filter(
        (ticket) => !ticket.assigneeUserId && !ticket.assignedTo && !ticket.assignee,
      ).length,
      inProgress: tickets.filter(
        (ticket) => normalize(ticket.status).replace("_", " ") === "in progress",
      ).length,
    };
  }, [tickets]);

  const agingRows = useMemo(() => {
    const openTickets = tickets.filter((ticket) => !isCompletedStatus(ticket.status));
    const buckets = [
      { label: "0–1 days", value: 0 },
      { label: "2–3 days", value: 0 },
      { label: "4–7 days", value: 0 },
      { label: "8+ days", value: 0 },
    ];
    openTickets.forEach((ticket) => {
      const age = ticketAgeDays(ticket);
      if (age <= 1) buckets[0].value += 1;
      else if (age <= 3) buckets[1].value += 1;
      else if (age <= 7) buckets[2].value += 1;
      else buckets[3].value += 1;
    });
    return buckets;
  }, [tickets]);

  const departmentHealth = useMemo(() => {
    const groups = new Map<string, { total: number; completed: number }>();
    tickets.forEach((ticket) => {
      const department = readable(ticket.department, "Unassigned");
      const values = groups.get(department) || { total: 0, completed: 0 };
      values.total += 1;
      if (isCompletedStatus(ticket.status)) values.completed += 1;
      groups.set(department, values);
    });
    return [...groups.entries()]
      .map(([department, values]) => ({
        department,
        resolutionRate: values.total
          ? Math.round((values.completed / values.total) * 100)
          : 0,
      }))
      .sort((left, right) => right.resolutionRate - left.resolutionRate)
      .slice(0, 8);
  }, [tickets]);

  const attentionTickets = useMemo(
    () =>
      tickets
        .filter((ticket) => {
          if (isCompletedStatus(ticket.status)) return false;
          const isHigh = ["high", "urgent", "critical"].includes(
            normalize(ticket.priority),
          );
          const isUnassigned =
            !ticket.assigneeUserId && !ticket.assignedTo && !ticket.assignee;
          const dueDate = new Date(String(ticket.dueDate || ""));
          const isOverdue =
            !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
          return isHigh || isUnassigned || isOverdue || ticketAgeDays(ticket) >= 4;
        })
        .sort((left, right) => {
          const score = (ticket: TicketRecord) => {
            const dueDate = new Date(String(ticket.dueDate || ""));
            const overdue = !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
            const unassigned = !ticket.assigneeUserId && !ticket.assignedTo && !ticket.assignee;
            const high = ["high", "urgent", "critical"].includes(normalize(ticket.priority));
            return Number(overdue) * 100 + Number(unassigned) * 50 + Number(high) * 25 + ticketAgeDays(ticket);
          };
          return score(right) - score(left);
        })
        .slice(0, 8),
    [tickets],
  );

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
    chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "Poppins, sans-serif" },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" as const, width: 3 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.26, opacityTo: 0.04, stops: [0, 95, 100] } },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    legend: { position: "top" as const, horizontalAlign: "right" as const },
    xaxis: { categories: activityData.categories, labels: { style: { colors: "#64748B", fontSize: "10px" } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, forceNiceScale: true, labels: { style: { colors: "#64748B", fontSize: "10px" }, formatter: (value: number) => String(Math.round(value)) } },
    colors: ["#2563EB", "#10B981", "#EF4444", "#F59E0B"],
    tooltip: { shared: true, intersect: false },
  };

  const agingChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
    colors: ["#2563EB", "#0D9488", "#F59E0B", "#EF4444"],
    plotOptions: { bar: { borderRadius: 5, columnWidth: "48%", distributed: true } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    xaxis: { categories: agingRows.map((row) => row.label), labels: { style: { colors: "#64748B", fontSize: "10px" } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, forceNiceScale: true, labels: { style: { colors: "#64748B", fontSize: "10px" }, formatter: (value: number) => String(Math.round(value)) } },
    tooltip: { y: { formatter: (value: number) => `${value} open tickets` } },
  };

  const departmentHealthOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
    colors: ["#10B981"],
    plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "48%" } },
    dataLabels: { enabled: true, formatter: (value: number) => `${Math.round(value)}%`, style: { colors: ["#FFFFFF"], fontSize: "10px", fontWeight: 500 } },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    xaxis: { categories: departmentHealth.map((row) => row.department), min: 0, max: 100, tickAmount: 4, labels: { style: { colors: "#64748B", fontSize: "10px" }, formatter: (value: string) => `${Math.round(Number(value))}%` } },
    yaxis: { labels: { maxWidth: 135, style: { colors: "#475569", fontSize: "10px" } } },
    tooltip: { y: { formatter: (value: number) => `${Math.round(value)}% resolved or closed` } },
  };

  const moveActivityPeriod = (direction: -1 | 1) => {
    setActivityAnchor((current) => {
      const next = new Date(current);
      if (activityPeriod === "Yearly") next.setFullYear(current.getFullYear() + direction);
      else if (activityPeriod === "Monthly") next.setMonth(current.getMonth() + direction);
      else next.setDate(current.getDate() + direction * 7);
      return next;
    });
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
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/45 via-[#3b82f6]/25 to-[#60a5fa]/15"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
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
            <StatTile icon={<TicketCheck size={20} />} label="Total tickets" value={stats.total} sub="All tickets visible in this unit" />
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
              <SectionCard title="Today's ticket operations" subtitle="Live priority, workflow, and ownership signals for tickets raised or completed today." bodyClassName="p-0">
                <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
                  {[
                    { title: "Priority today", rows: [["High", todaySnapshot.high, "text-rose-600"], ["Medium", todaySnapshot.medium, "text-amber-600"], ["Low", todaySnapshot.low, "text-emerald-600"]] },
                    { title: "Ticket flow", rows: [["Raised", todaySnapshot.raised, "text-blue-600"], ["Open", todaySnapshot.open, "text-amber-600"], ["Completed", todaySnapshot.completed, "text-emerald-600"]] },
                    { title: "Ownership health", rows: [["Assigned today", todaySnapshot.assigned, "text-blue-600"], ["Unassigned today", todaySnapshot.unassigned, "text-rose-600"], ["In progress now", todaySnapshot.inProgress, "text-violet-600"]] },
                  ].map((group) => (
                    <div key={group.title} className="px-5 py-4">
                      <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{group.title}</p>
                      <div className="mt-3 space-y-2.5">
                        {group.rows.map(([rowLabel, value, valueClass]) => (
                          <div key={String(rowLabel)} className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2.5">
                            <span className="text-[10px] text-slate-600">{rowLabel}</span>
                            <span className={`text-[14px] font-pmedium ${valueClass}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="mb-4">
              <SectionCard title="Ticket activity" subtitle="Switch between fiscal-year, month, and week views to understand when tickets were raised and their current outcome.">
                {tickets.length ? (
                  <div>
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {(["Yearly", "Monthly", "Weekly"] as ActivityPeriod[]).map((period) => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => setActivityPeriod(period)}
                            className={`rounded-md px-3.5 py-2 text-[10px] font-pmedium transition ${activityPeriod === period ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-pmedium text-blue-700">{activityData.total} tickets</span>
                        <span>in selected period</span>
                      </div>
                    </div>
                  <ReactApexChart
                    type="area"
                    height={350}
                    options={activityChartOptions}
                    series={[
                      { name: "Total Tickets", data: activityData.series.total },
                      { name: "Resolved / Closed", data: activityData.series.completed },
                      { name: "Open", data: activityData.series.open },
                      { name: "In Progress", data: activityData.series.inProgress },
                    ]}
                  />
                    <div className="mt-2 flex items-center justify-center gap-4">
                      <button type="button" onClick={() => moveActivityPeriod(-1)} aria-label="Previous ticket activity period" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="min-w-[160px] text-center text-[10px] font-pmedium text-[#1E3D73]">{activityData.periodLabel}</span>
                      <button type="button" onClick={() => moveActivityPeriod(1)} aria-label="Next ticket activity period" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
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

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard title="Open-ticket aging" subtitle="Unresolved workload grouped by how long each ticket has remained open.">
                {tickets.length ? <ReactApexChart type="bar" height={310} options={agingChartOptions} series={[{ name: "Open tickets", data: agingRows.map((row) => row.value) }]} /> : <div className="flex h-[310px] items-center justify-center text-[11px] text-slate-500">No ticket-aging data is available yet.</div>}
              </SectionCard>
              <SectionCard title="Department resolution health" subtitle="Resolved or closed share of visible tickets by responsible department.">
                {departmentHealth.length ? <ReactApexChart type="bar" height={310} options={departmentHealthOptions} series={[{ name: "Resolution rate", data: departmentHealth.map((row) => row.resolutionRate) }]} /> : <div className="flex h-[310px] items-center justify-center text-[11px] text-slate-500">No department resolution data is available yet.</div>}
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

            <div className="mb-4">
              <SectionCard title="Ticket attention queue" subtitle="High-priority, unassigned, overdue, or aging tickets that need operational follow-up." bodyClassName="p-0">
                {attentionTickets.length ? <div className="divide-y divide-slate-100">{attentionTickets.map((ticket, index) => {
                  const dueDate = new Date(String(ticket.dueDate || ""));
                  const overdue = !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
                  const unassigned = !ticket.assigneeUserId && !ticket.assignedTo && !ticket.assignee;
                  const high = ["high", "urgent", "critical"].includes(normalize(ticket.priority));
                  const reason = overdue ? "Overdue" : unassigned ? "Unassigned" : high ? "High priority" : `${ticketAgeDays(ticket)} days open`;
                  const reasonClass = overdue || high ? "bg-rose-50 text-rose-700" : unassigned ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
                  return <div key={ticket._id || ticket.recordId || ticket.ticketCode || index} className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 md:grid-cols-[150px_minmax(0,1fr)_170px_120px] md:items-center"><p className="truncate text-[10px] font-pmedium text-slate-900">{ticket.ticketCode || ticket.id || "Ticket"}</p><div className="min-w-0"><p className="truncate text-[11px] font-pmedium text-slate-800">{ticket.title || "Untitled issue"}</p><p className="mt-1 truncate text-[9px] text-slate-500">{readable(ticket.department, "Unassigned department")} · {ticket.assignedTo || ticket.assigneeUserId?.name || "No owner"}</p></div><p className="text-[10px] text-slate-600">{ticketAgeDays(ticket)} days open</p><div className="md:text-right"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase ${reasonClass}`}>{reason}</span></div></div>;
                })}</div> : <div className="flex min-h-[145px] items-center justify-center px-5 py-10 text-[11px] text-slate-500">No visible tickets currently require priority attention.</div>}
              </SectionCard>
            </div>

            <SectionCard title="Recent tickets" subtitle="The latest ticket activity visible in this unit." bodyClassName="">
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
