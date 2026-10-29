import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bed,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ContactRound,
  HandCoins,
  Printer,
  RefreshCw,
  Sparkles,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import { DepartmentVisitorsCard } from "../Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { TeamLiveStatusCard } from "../Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";
import administrationBannerImage from "../../assets/administration-dashboard-banner.png";
import { DEFAULT_FISCAL_YEAR } from "../../features/finance/utils/fiscalYear";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { getStoredUser } from "../../lib/auth-session";
import { getDepartmentFinanceData } from "../../services/finance";
import { getHousekeepingOverview } from "../../services/housekeeping";
import { getMeetingRoomBookings } from "../../services/meeting-room-bookings";
import { getPrintoutRequests } from "../../services/printouts";
import { getResources } from "../../services/resources";
import { getTenantCompanies } from "../../services/tenant-companies";
import { getVisitorManagementOverview } from "../../services/visitors";

type DataRecord = Record<string, any>;
type AdministrationDashboardData = {
  tenants: DataRecord[];
  bookings: DataRecord[];
  resources: DataRecord[];
  housekeepingTasks: DataRecord[];
  housekeepingSummary: DataRecord;
  dailyVisitors: DataRecord[];
  liveVisitors: DataRecord[];
  printoutRequests: DataRecord[];
  departmentFinance: DataRecord | null;
};

const EMPTY_DATA: AdministrationDashboardData = {
  tenants: [],
  bookings: [],
  resources: [],
  housekeepingTasks: [],
  housekeepingSummary: {},
  dailyVisitors: [],
  liveVisitors: [],
  printoutRequests: [],
  departmentFinance: null,
};

const ADMINISTRATION_MODULES = [
  {
    id: "tenant-companies-admin",
    label: "Tenant Companies",
    icon: Store,
    route: "/department-accesses/administration-department/tenant-companies",
    description: "Manage tenant companies and workspace records",
    color: "#2563EB",
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: Bed,
    route: "/department-accesses/administration-department/bookings",
    description: "Review and coordinate workspace bookings",
    color: "#7C3AED",
  },
  {
    id: "visitors-management",
    accessId: "visitor-management",
    label: "Visitors Management",
    icon: ContactRound,
    route: "/visitors/visitor-management",
    description: "Register visitors and manage front-desk activity",
    color: "#0D9488",
  },
  {
    id: "resource-management",
    label: "Resource Management",
    icon: HandCoins,
    route: "/department-accesses/administration-department/resource-management",
    description: "Track shared resources and administrative inventory",
    color: "#EA580C",
  },
  {
    id: "house-keeping",
    label: "House Keeping",
    icon: Sparkles,
    route: "/department-accesses/administration-department/house-keeping",
    description: "Plan and monitor housekeeping operations",
    color: "#0891B2",
  },
  {
    id: "printout-management",
    label: "Printout Management",
    icon: Printer,
    route: "/department-accesses/administration-department/printouts",
    description: "Manage print requests, attachments, and completion",
    color: "#1E3D73",
  },
] as const;

const DONUT_PALETTE = [
  "#1E3D73",
  "#2563EB",
  "#22C55E",
  "#F59E0B",
  "#7C3AED",
  "#EF4444",
];
const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();
const numeric = (value: unknown) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;
const list = (value: unknown) =>
  Array.isArray(value) ? (value as DataRecord[]) : [];
const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100000 ? 1 : 0,
  }).format(value || 0);
const readableLabel = (value: unknown) =>
  String(value || "Pending")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value: unknown) => {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
const statusTone = (status: unknown) => {
  const value = normalize(status);
  if (
    value.includes("active") ||
    value.includes("confirm") ||
    value.includes("complete") ||
    value.includes("checked in")
  )
    return "bg-emerald-50 text-emerald-700";
  if (
    value.includes("cancel") ||
    value.includes("expired") ||
    value.includes("maintenance")
  )
    return "bg-rose-50 text-rose-700";
  if (value.includes("progress") || value.includes("assigned"))
    return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
      {children}
    </div>
  );
}
function ChartCard({
  title,
  subtitle,
  action,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action ?? null}
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
  value: string | number;
  sub: string;
  status?: "default" | "success" | "attention";
}) {
  const tones = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };
  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[status]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}
function SummaryCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: ReactNode;
  rows: Array<{ label: string; value: string | number; tone?: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </span>
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <span className="text-[10px] font-pmedium text-slate-500">
              {row.label}
            </span>
            <span
              className={`text-right text-[13px] font-pmedium ${row.tone || "text-slate-900"}`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordsTable({
  records,
  columns,
  emptyLabel,
}: {
  records: DataRecord[];
  columns: Array<{
    label: string;
    render: (record: DataRecord, index: number) => ReactNode;
  }>;
  emptyLabel: string;
}) {
  if (!records.length) return <Empty>{emptyLabel}</Empty>;

  return (
    <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
      <table className="w-full table-fixed border-collapse text-left [&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis [&_th]:whitespace-nowrap">
        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.label} className="px-5 py-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record, index) => (
            <tr
              key={
                record.id ||
                record._id ||
                record.recordId ||
                record.requestCode ||
                index
              }
              className="text-[11px] text-slate-600 hover:bg-blue-50/30"
            >
              {columns.map((column) => (
                <td key={column.label} className="px-5 py-3">
                  {column.render(record, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdministrationWorkspaceDashboardPage() {
  const access = useDashboardAccess();
  const [data, setData] = useState<AdministrationDashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const storedUser = getStoredUser();
    const workspaceId = String(
      storedUser?.workspaceMembership?.workspaceId ||
        storedUser?.workspaceMembership?.workspace ||
        storedUser?.primaryWorkspace ||
        storedUser?.workspace?.id ||
        storedUser?.workspaceId ||
        "",
    );
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([
      getTenantCompanies(),
      workspaceId ? getMeetingRoomBookings(workspaceId) : Promise.resolve(null),
      getResources(),
      getHousekeepingOverview(),
      getVisitorManagementOverview(),
      getPrintoutRequests(),
      getDepartmentFinanceData(DEFAULT_FISCAL_YEAR, "Administration"),
    ]).then((results) => {
      if (cancelled) return;
      const [
        tenantsResult,
        bookingsResult,
        resourcesResult,
        housekeepingResult,
        visitorsResult,
        printoutsResult,
        financeResult,
      ] = results;
      const tenantPayload =
        tenantsResult.status === "fulfilled"
          ? tenantsResult.value?.data || {}
          : {};
      const bookingPayload =
        bookingsResult.status === "fulfilled" ? bookingsResult.value || {} : {};
      const resourcePayload =
        resourcesResult.status === "fulfilled"
          ? resourcesResult.value?.data || {}
          : {};
      const housekeepingPayload =
        housekeepingResult.status === "fulfilled"
          ? housekeepingResult.value?.data || {}
          : {};
      const visitorPayload =
        visitorsResult.status === "fulfilled" ? visitorsResult.value || {} : {};
      const printoutPayload =
        printoutsResult.status === "fulfilled"
          ? printoutsResult.value || []
          : [];
      const financePayload =
        financeResult.status === "fulfilled"
          ? financeResult.value || null
          : null;
      setData({
        tenants: list(
          tenantPayload.tenants ||
            tenantPayload.data?.tenants ||
            tenantPayload.data,
        ),
        bookings: list(
          bookingPayload.bookings ||
            bookingPayload.data?.bookings ||
            bookingPayload.data ||
            bookingPayload,
        ),
        resources: list(
          resourcePayload.data?.resources ||
            resourcePayload.resources ||
            resourcePayload.data ||
            resourcePayload,
        ),
        housekeepingTasks: list(
          housekeepingPayload.tasks || housekeepingPayload.data?.tasks,
        ),
        housekeepingSummary:
          housekeepingPayload.summary ||
          housekeepingPayload.data?.summary ||
          {},
        dailyVisitors: list(
          visitorPayload.dailyVisitors || visitorPayload.data?.dailyVisitors,
        ),
        liveVisitors: list(
          visitorPayload.liveVisitors || visitorPayload.data?.liveVisitors,
        ),
        printoutRequests: list(
          printoutPayload.requests ||
            printoutPayload.data?.requests ||
            printoutPayload.data ||
            printoutPayload,
        ),
        departmentFinance:
          financePayload?.data?.data || financePayload?.data || financePayload,
      });
      setLoadError(
        results.some((result) => result.status === "rejected")
          ? "Some tenant, booking, visitor, facilities, housekeeping, printout, or budget data could not be refreshed."
          : "",
      );
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const enabledModules = useMemo(() => {
    if (access.isLoading) return [...ADMINISTRATION_MODULES];
    const filtered = ADMINISTRATION_MODULES.filter((module) =>
      access.hasModule("accessId" in module ? module.accessId : module.id),
    );
    return filtered.length ? filtered : [...ADMINISTRATION_MODULES];
  }, [access]);
  const stats = useMemo(() => {
    const activeTenants = data.tenants.filter(
      (tenant) => normalize(tenant.status) === "active",
    ).length;
    const pendingTenants = data.tenants.filter((tenant) => {
      const status = normalize(tenant.status);
      return (
        status.includes("pending") ||
        status.includes("expired") ||
        status.includes("expiring")
      );
    }).length;
    const confirmedBookings = data.bookings.filter((booking) =>
      normalize(booking.status).includes("confirm"),
    ).length;
    const pendingBookings = data.bookings.filter((booking) =>
      normalize(booking.status).includes("pending"),
    ).length;
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayBookings = data.bookings.filter((booking) =>
      String(
        booking.date || booking.startDate || booking.createdAt || "",
      ).startsWith(todayKey),
    ).length;
    const activeResources = data.resources.filter(
      (resource) => !resource.status || normalize(resource.status) === "active",
    ).length;
    const availableResources = data.resources.filter(
      (resource) =>
        (!resource.status || normalize(resource.status) === "active") &&
        !resource.currentlyBooked &&
        !resource.assignedTenantCompanyId,
    ).length;
    const maintenanceResources = data.resources.filter((resource) =>
      normalize(resource.status).includes("maintenance"),
    ).length;
    const pendingHousekeeping =
      numeric(data.housekeepingSummary.pendingTasks) ||
      data.housekeepingTasks.filter((task) =>
        normalize(task.status).includes("pending"),
      ).length;
    const activeHousekeeping =
      numeric(data.housekeepingSummary.activeTasks) ||
      data.housekeepingTasks.filter(
        (task) =>
          normalize(task.status).includes("progress") ||
          normalize(task.status).includes("assigned"),
      ).length;
    const pendingPrintouts = data.printoutRequests.filter(
      (request) => normalize(request.status) === "pending",
    ).length;
    const inProgressPrintouts = data.printoutRequests.filter((request) =>
      normalize(request.status).includes("progress"),
    ).length;
    return {
      activeTenants,
      pendingTenants,
      confirmedBookings,
      pendingBookings,
      todayBookings,
      activeResources,
      availableResources,
      maintenanceResources,
      pendingHousekeeping,
      activeHousekeeping,
      pendingPrintouts,
      inProgressPrintouts,
    };
  }, [data]);
  const budget = useMemo(() => {
    const rows = list(data.departmentFinance?.monthlyPlan).map(
      (month, index) => {
        const expenses = list(month.expenses);
        const projectedExpenses = expenses.reduce(
          (sum, expense) =>
            sum + numeric(expense.projectedAmount ?? expense.amount),
          0,
        );
        const actualExpenses = expenses.reduce(
          (sum, expense) =>
            sum + numeric(expense.actualSpent ?? expense.actualAmount),
          0,
        );
        return {
          label: String(
            month.month ||
              month.monthLabel ||
              month.monthKey ||
              `M${index + 1}`,
          ).slice(0, 3),
          projected:
            projectedExpenses ||
            numeric(
              month.projectedBudget ?? month.projectedAmount ?? month.amount,
            ),
          actual:
            actualExpenses || numeric(month.actualSpent ?? month.actualAmount),
        };
      },
    );
    const projected = rows.reduce((sum, row) => sum + row.projected, 0);
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    return {
      rows,
      projected,
      actual,
      remaining: Math.max(0, projected - actual),
      hasData: rows.some((row) => row.projected > 0 || row.actual > 0),
    };
  }, [data.departmentFinance]);
  const grouped = (
    records: DataRecord[],
    value: (record: DataRecord) => unknown,
  ) => {
    const map = new Map<string, number>();
    records.forEach((record) => {
      const label = readableLabel(value(record));
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()].slice(0, 6);
  };
  const tenantStatus = useMemo(
    () => grouped(data.tenants, (tenant) => tenant.status || "Pending"),
    [data.tenants],
  );
  const bookingStatus = useMemo(
    () => grouped(data.bookings, (booking) => booking.status || "Pending"),
    [data.bookings],
  );
  const visitorTypes = useMemo(
    () =>
      grouped(
        data.dailyVisitors,
        (visitor) => visitor.visitorType || "Standard",
      ),
    [data.dailyVisitors],
  );
  const resourceStatus = useMemo(
    () => grouped(data.resources, (resource) => resource.status || "Active"),
    [data.resources],
  );
  const housekeepingStatus = useMemo(
    () => grouped(data.housekeepingTasks, (task) => task.status || "Pending"),
    [data.housekeepingTasks],
  );
  const printoutStatus = useMemo(
    () =>
      grouped(data.printoutRequests, (request) => request.status || "Pending"),
    [data.printoutRequests],
  );
  const monthlyBookings = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
      };
    });
    const counts = months.map(
      (month) =>
        data.bookings.filter((booking) => {
          const raw = booking.date || booking.startDate || booking.createdAt;
          if (!raw) return false;
          const date = new Date(raw);
          return (
            !Number.isNaN(date.getTime()) &&
            `${date.getFullYear()}-${date.getMonth()}` === month.key
          );
        }).length,
    );
    return { labels: months.map((month) => month.label), counts };
  }, [data.bookings]);
  const recentVisitors = useMemo(
    () =>
      [...data.dailyVisitors]
        .sort(
          (a, b) =>
            new Date(
              b.checkInAt || b.dateOfVisit || b.createdAt || 0,
            ).getTime() -
            new Date(
              a.checkInAt || a.dateOfVisit || a.createdAt || 0,
            ).getTime(),
        )
        .slice(0, 8),
    [data.dailyVisitors],
  );
  const housekeepingQueue = useMemo(
    () =>
      [...data.housekeepingTasks]
        .filter((task) => !normalize(task.status).includes("cancel"))
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.housekeepingTasks],
  );
  const recentTenants = useMemo(
    () =>
      [...data.tenants]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.tenants],
  );
  const recentBookings = useMemo(
    () =>
      [...data.bookings]
        .sort(
          (a, b) =>
            new Date(b.date || b.startDate || b.createdAt || 0).getTime() -
            new Date(a.date || a.startDate || a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.bookings],
  );
  const recentResources = useMemo(
    () =>
      [...data.resources]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.resources],
  );
  const recentPrintouts = useMemo(
    () =>
      [...data.printoutRequests]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.printoutRequests],
  );
  const baseChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthlyBookings.labels },
    colors: ["#2563EB"],
    tooltip: { theme: "light" },
  };
  const budgetChartOptions = {
    ...baseChartOptions,
    xaxis: { categories: budget.rows.map((row) => row.label) },
    colors: ["#2563EB", "#22C55E"],
    yaxis: { labels: { formatter: (value: number) => currency(value) } },
    tooltip: {
      theme: "light",
      y: { formatter: (value: number) => currency(value) },
    },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <header className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
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
              className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
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
              <h1 className="text-[30px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
                <span className="text-primary">Administration</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Live tenant, front-desk, booking, visitor, resource,
                housekeeping, printout, and departmental budget visibility.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Tenants", "Bookings", "Visitors", "Facilities"].map(
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
              <p className="text-[9px] uppercase tracking-[0.1em] text-white/75">
                Active modules
              </p>
              <p className="mt-0.5 text-[15px] text-white">
                {enabledModules.length}
              </p>
            </div>
          </div>
        </header>
        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} />
            {loadError} Existing values may be incomplete.
          </div>
        ) : null}
        {isLoading || access.isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={<Building2 size={20} />}
              label="Tenant companies"
              value={data.tenants.length}
              sub={`${stats.activeTenants} active tenants`}
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Active tenants"
              value={stats.activeTenants}
              sub={`${stats.pendingTenants} need attention`}
              status={stats.pendingTenants ? "attention" : "success"}
            />
            <StatTile
              icon={<CalendarCheck size={20} />}
              label="Bookings today"
              value={stats.todayBookings}
              sub={`${stats.confirmedBookings} confirmed overall`}
            />
            <StatTile
              icon={<HandCoins size={20} />}
              label="Active resources"
              value={stats.activeResources}
              sub={`${stats.availableResources} currently available`}
            />
            <StatTile
              icon={<ContactRound size={20} />}
              label="Visitors today"
              value={data.dailyVisitors.length}
              sub={`${data.liveVisitors.length} currently checked in`}
            />
            <StatTile
              icon={<Sparkles size={20} />}
              label="Housekeeping pending"
              value={stats.pendingHousekeeping}
              sub={`${stats.activeHousekeeping} assigned or in progress`}
              status={stats.pendingHousekeeping ? "attention" : "success"}
            />
            <StatTile
              icon={<Store size={20} />}
              label="Available resources"
              value={stats.availableResources}
              sub={`${stats.maintenanceResources} under maintenance`}
              status={stats.maintenanceResources ? "attention" : "success"}
            />
            <StatTile
              icon={<Printer size={20} />}
              label="Printout requests"
              value={stats.pendingPrintouts + stats.inProgressPrintouts}
              sub={`${stats.pendingPrintouts} pending · ${stats.inProgressPrintouts} in progress`}
              status={stats.pendingPrintouts ? "attention" : "success"}
            />
          </div>
        )}
        {!isLoading ? (
          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TeamLiveStatusCard
              department="administration"
              viewAllRoute="/department-accesses/administration-department/bookings"
            />
            <DepartmentVisitorsCard
              department="administration"
              title="Administration Visitors"
            />
          </section>
        ) : null}
        {!isLoading ? (
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="text-sm font-pmedium text-slate-900">
                Administration operations overview
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Front-desk activity, facilities workload, and approved budget
                position.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <SummaryCard
                title="Tenant operations"
                icon={<Building2 size={18} />}
                rows={[
                  { label: "Total companies", value: data.tenants.length },
                  { label: "Active companies", value: stats.activeTenants },
                  {
                    label: "Pending / expiring",
                    value: stats.pendingTenants,
                    tone: stats.pendingTenants
                      ? "text-amber-700"
                      : "text-emerald-700",
                  },
                  {
                    label: "Available resources",
                    value: stats.availableResources,
                  },
                ]}
              />
              <SummaryCard
                title="Front desk & facilities"
                icon={<ContactRound size={18} />}
                rows={[
                  { label: "Visitors today", value: data.dailyVisitors.length },
                  { label: "Checked in", value: data.liveVisitors.length },
                  { label: "Bookings today", value: stats.todayBookings },
                  {
                    label: "Housekeeping pending",
                    value: stats.pendingHousekeeping,
                  },
                ]}
              />
              <SummaryCard
                title="Administration budget"
                icon={<WalletCards size={18} />}
                rows={[
                  {
                    label: "Projected budget",
                    value: currency(budget.projected),
                  },
                  { label: "Actual spent", value: currency(budget.actual) },
                  { label: "Remaining", value: currency(budget.remaining) },
                  {
                    label: "Open printout requests",
                    value: stats.pendingPrintouts + stats.inProgressPrintouts,
                  },
                ]}
              />
            </div>
          </section>
        ) : null}
        <section className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-pmedium text-slate-900">
                Manage administration operations
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Open the same enabled modules available in the Administration
                Dashboard dropdown.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={isLoading}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.06em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {enabledModules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.label}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{ fromSection: "administration-department" }}
                />
              );
            })}
          </div>
        </section>
        {!isLoading ? (
          <>
            <div className="mb-4">
              <ChartCard
                title="Administration Budget: Projected vs Actual Spent"
                subtitle={`${DEFAULT_FISCAL_YEAR} monthly Finance Management plan for Administration.`}
                action={
                  access.hasModule("finance-management") ? (
                    <Link
                      to="/extra-common-modules/finance-management"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    >
                      Finance Management
                    </Link>
                  ) : undefined
                }
              >
                {budget.hasData ? (
                  <GroupedBarGraph
                    options={budgetChartOptions}
                    series={[
                      {
                        name: "Projected budget",
                        data: budget.rows.map((row) => row.projected),
                      },
                      {
                        name: "Actual spent",
                        data: budget.rows.map((row) => row.actual),
                      },
                    ]}
                  />
                ) : (
                  <Empty>
                    No approved Administration monthly budget is available for{" "}
                    {DEFAULT_FISCAL_YEAR}.
                  </Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4">
              <ChartCard
                title="Monthly Booking Activity"
                subtitle="Meeting-room bookings recorded during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={baseChartOptions}
                  series={[{ name: "Bookings", data: monthlyBookings.counts }]}
                />
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Booking Status"
                subtitle="Bookings grouped by their current workflow status."
              >
                {bookingStatus.length ? (
                  <DonutChart
                    centerLabel="Bookings"
                    labels={bookingStatus.map(([label]) => label)}
                    series={bookingStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, bookingStatus.length)}
                    tooltipValue={bookingStatus.map(
                      ([, value]) => `${value} bookings`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No booking status data is available.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Tenant Status"
                subtitle="Tenant companies grouped by status."
              >
                {tenantStatus.length ? (
                  <DonutChart
                    centerLabel="Tenants"
                    labels={tenantStatus.map(([label]) => label)}
                    series={tenantStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, tenantStatus.length)}
                    tooltipValue={tenantStatus.map(
                      ([, value]) => `${value} tenants`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No tenant status data is available.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Visitor Type"
                subtitle="Today’s visitors grouped by visit type."
              >
                {visitorTypes.length ? (
                  <DonutChart
                    centerLabel="Visitors"
                    labels={visitorTypes.map(([label]) => label)}
                    series={visitorTypes.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, visitorTypes.length)}
                    tooltipValue={visitorTypes.map(
                      ([, value]) => `${value} visitors`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No visitor data is available today.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Resource Status"
                subtitle="Administration resources grouped by status."
              >
                {resourceStatus.length ? (
                  <DonutChart
                    centerLabel="Resources"
                    labels={resourceStatus.map(([label]) => label)}
                    series={resourceStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, resourceStatus.length)}
                    tooltipValue={resourceStatus.map(
                      ([, value]) => `${value} resources`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No resource data is available.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Housekeeping Status"
                subtitle="Facilities tasks grouped by operational status."
              >
                {housekeepingStatus.length ? (
                  <DonutChart
                    centerLabel="Tasks"
                    labels={housekeepingStatus.map(([label]) => label)}
                    series={housekeepingStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, housekeepingStatus.length)}
                    tooltipValue={housekeepingStatus.map(
                      ([, value]) => `${value} tasks`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No housekeeping tasks are available.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Printout Status"
                subtitle="Printout requests grouped by their current workflow status."
              >
                {printoutStatus.length ? (
                  <DonutChart
                    centerLabel="Printouts"
                    labels={printoutStatus.map(([label]) => label)}
                    series={printoutStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, printoutStatus.length)}
                    tooltipValue={printoutStatus.map(
                      ([, value]) => `${value} requests`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No printout requests are available.</Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Recent Visitors"
                subtitle="Latest visitor activity at the front desk."
                bodyClassName=""
              >
                {recentVisitors.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left [&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis [&_th]:whitespace-nowrap">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Visitor</th>
                          <th className="px-4 py-3">Purpose</th>
                          <th className="px-4 py-3">Visit date</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentVisitors.map((visitor, index) => {
                          const status =
                            visitor.checkInAt && !visitor.checkOutAt
                              ? "Checked In"
                              : visitor.checkOutAt
                                ? "Checked Out"
                                : visitor.status || "Logged";
                          return (
                            <tr
                              key={visitor.id || visitor.recordId || index}
                              className="text-[11px] text-slate-600 hover:bg-blue-50/30"
                            >
                              <td className="px-5 py-3 text-slate-900">
                                {visitor.fullName || visitor.name || "Visitor"}
                              </td>
                              <td className="px-4 py-3">
                                {visitor.purpose ||
                                  visitor.visitorType ||
                                  "Not recorded"}
                              </td>
                              <td className="px-4 py-3">
                                {dateLabel(
                                  visitor.checkInAt ||
                                    visitor.dateOfVisit ||
                                    visitor.createdAt,
                                )}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`rounded-md px-2 py-1 text-[9px] ${statusTone(status)}`}
                                >
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>No visitors are available today.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Housekeeping Queue"
                subtitle="Latest facilities tasks requiring Administration visibility."
                bodyClassName=""
              >
                {housekeepingQueue.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left [&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis [&_th]:whitespace-nowrap">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Task</th>
                          <th className="px-4 py-3">Area / assignee</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {housekeepingQueue.map((task, index) => (
                          <tr
                            key={task.id || task.taskCode || index}
                            className="text-[11px] text-slate-600 hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-3 text-slate-900">
                              {task.taskName ||
                                task.taskType ||
                                "Housekeeping task"}
                            </td>
                            <td className="px-4 py-3">
                              {task.area ||
                                task.roomName ||
                                task.assignedTo ||
                                "Unassigned"}
                            </td>
                            <td className="px-4 py-3">
                              {dateLabel(task.createdAt)}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] ${statusTone(task.status)}`}
                              >
                                {readableLabel(task.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>No housekeeping tasks are available.</Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Recent Tenant Companies"
                subtitle="Latest tenant records and their current account status."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentTenants}
                  emptyLabel="No tenant companies are available."
                  columns={[
                    {
                      label: "Company",
                      render: (tenant) => (
                        <span className="text-slate-900">
                          {tenant.companyName ||
                            tenant.name ||
                            "Tenant company"}
                        </span>
                      ),
                    },
                    {
                      label: "Code",
                      render: (tenant) =>
                        tenant.companyCode || tenant.id || "—",
                    },
                    {
                      label: "Created",
                      render: (tenant) => dateLabel(tenant.createdAt),
                    },
                    {
                      label: "Status",
                      render: (tenant) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${statusTone(tenant.status)}`}
                        >
                          {readableLabel(tenant.status)}
                        </span>
                      ),
                    },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title="Recent Bookings"
                subtitle="Latest meeting-room bookings and confirmation status."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentBookings}
                  emptyLabel="No bookings are available."
                  columns={[
                    {
                      label: "Booked by",
                      render: (booking) => (
                        <span className="text-slate-900">
                          {booking.bookedByName ||
                            booking.clientName ||
                            "Guest"}
                        </span>
                      ),
                    },
                    {
                      label: "Room",
                      render: (booking) =>
                        booking.roomName ||
                        booking.resourceName ||
                        "Not recorded",
                    },
                    {
                      label: "Booking date",
                      render: (booking) =>
                        dateLabel(
                          booking.date ||
                            booking.startDate ||
                            booking.createdAt,
                        ),
                    },
                    {
                      label: "Status",
                      render: (booking) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${statusTone(booking.status)}`}
                        >
                          {readableLabel(booking.status)}
                        </span>
                      ),
                    },
                  ]}
                />
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Resource Directory"
                subtitle="Recently added resources and current availability status."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentResources}
                  emptyLabel="No resources are available."
                  columns={[
                    {
                      label: "Resource",
                      render: (resource) => (
                        <span className="text-slate-900">
                          {resource.name || resource.resourceCode || "Resource"}
                        </span>
                      ),
                    },
                    {
                      label: "Category",
                      render: (resource) =>
                        resource.resourceCategory ||
                        resource.type ||
                        "Not recorded",
                    },
                    {
                      label: "Assignment",
                      render: (resource) =>
                        resource.assignedTenantCompanyName ||
                        (resource.currentlyBooked ? "Booked" : "Available"),
                    },
                    {
                      label: "Status",
                      render: (resource) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${statusTone(resource.status || "Active")}`}
                        >
                          {readableLabel(resource.status || "Active")}
                        </span>
                      ),
                    },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title="Recent Printout Requests"
                subtitle="Latest internal and tenant print jobs in the Administration queue."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentPrintouts}
                  emptyLabel="No printout requests are available."
                  columns={[
                    {
                      label: "Request",
                      render: (request) => (
                        <span className="text-slate-900">
                          {request.title ||
                            request.requestCode ||
                            "Printout request"}
                        </span>
                      ),
                    },
                    {
                      label: "Requested by",
                      render: (request) =>
                        request.requestedByName ||
                        request.tenantCompanyName ||
                        "Not recorded",
                    },
                    {
                      label: "Copies",
                      render: (request) => request.copies || 1,
                    },
                    {
                      label: "Status",
                      render: (request) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${statusTone(request.status)}`}
                        >
                          {readableLabel(request.status)}
                        </span>
                      ),
                    },
                  ]}
                />
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
