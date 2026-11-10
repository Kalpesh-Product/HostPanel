import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckSquare2,
  ClipboardList,
  Package,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import unitManagementBanner from "../../assets/administration-dashboard-banner.webp";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceManagementOverview } from "../../services/unit-management";

type UnitMetrics = {
  totalEmployees?: number;
  totalDepartments?: number;
  totalTickets?: number;
  totalTasks?: number;
  totalAssets?: number;
  totalInventory?: number;
  totalMeetingBookings?: number;
  performance?: {
    overallScore?: number;
    ticketResolutionRate?: number;
    bookingCompletionRate?: number;
  };
};

type ManagedUnit = {
  id?: string;
  _id?: string;
  workspaceName?: string;
  businessName?: string;
  location?: string;
  selectedPlan?: string;
  status?: string;
  isActiveWorkspace?: boolean;
  isDisabled?: boolean;
  isDeleted?: boolean;
  metrics?: UnitMetrics;
};

type ManagementOverview = {
  workspaces?: ManagedUnit[];
  summary?: UnitMetrics;
};

const WORKLOAD_COLORS = ["#2563EB", "#F59E0B", "#7C3AED", "#0F766E", "#64748B"];

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const statusLabel = (unit: ManagedUnit) => {
  if (unit.isDeleted) return "Deleted";
  if (unit.isDisabled || normalize(unit.status) === "disabled") return "Disabled";
  if (unit.isActiveWorkspace) return "Current";
  return "Active";
};

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
  sub: string;
  tone?: "blue" | "green" | "amber" | "violet" | "rose";
}) {
  const tones = {
    blue: {
      card: "hover:border-l-blue-600",
      icon: "border-l-blue-600 bg-blue-50 text-blue-700",
    },
    green: {
      card: "hover:border-l-emerald-500",
      icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    },
    amber: {
      card: "hover:border-l-amber-500",
      icon: "border-l-amber-500 bg-amber-50 text-amber-700",
    },
    violet: {
      card: "hover:border-l-violet-500",
      icon: "border-l-violet-500 bg-violet-50 text-violet-700",
    },
    rose: {
      card: "hover:border-l-rose-500",
      icon: "border-l-rose-500 bg-rose-50 text-rose-700",
    },
  };

  return (
    <div
      className={`flex min-h-[108px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-md ${tones[tone].card}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone].icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 truncate text-[20px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[9px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  bodyClassName = "p-5",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  bodyClassName?: string;
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

export default function UnitManagementDashboard() {
  const axiosPrivate = useAxiosPrivate();
  const [overview, setOverview] = useState<ManagementOverview>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getWorkspaceManagementOverview(axiosPrivate)
      .then((response) => {
        if (!cancelled) {
          setOverview(response?.data?.data || response?.data || {});
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Unit Management data could not be refreshed.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [axiosPrivate]);

  const units = useMemo(
    () => (Array.isArray(overview.workspaces) ? overview.workspaces : []),
    [overview.workspaces],
  );
  const summary = overview.summary || {};
  const currentUnit = units.find((unit) => unit.isActiveWorkspace);
  const activeUnits = units.filter(
    (unit) => !unit.isDeleted && !unit.isDisabled && normalize(unit.status) !== "disabled",
  );

  const modules = [
    {
      id: "employees",
      title: "Employees",
      description: "See employee allocation and recent people in each unit",
      icon: Users,
      color: "#2563EB",
    },
    {
      id: "roles",
      title: "Roles & Access",
      description: "Understand role coverage and responsibility by unit",
      icon: ShieldCheck,
      color: "#0F766E",
    },
    {
      id: "work",
      title: "Work Items",
      description: "Review tasks, tickets, assets, inventory, and bookings",
      icon: ClipboardList,
      color: "#7C3AED",
    },
    {
      id: "departments",
      title: "Departments",
      description: "Compare department structure and staffing across units",
      icon: BriefcaseBusiness,
      color: "#D97706",
    },
  ];

  const workloadRows = [
    { label: "Tickets", value: Number(summary.totalTickets || 0) },
    { label: "Tasks", value: Number(summary.totalTasks || 0) },
    { label: "Bookings", value: Number(summary.totalMeetingBookings || 0) },
    { label: "Assets", value: Number(summary.totalAssets || 0) },
    { label: "Inventory", value: Number(summary.totalInventory || 0) },
  ].filter((item) => item.value > 0);

  const employeeRows = units
    .filter((unit) => !unit.isDeleted)
    .map((unit) => ({
      label: unit.workspaceName || unit.businessName || "Unnamed unit",
      value: Number(unit.metrics?.totalEmployees || 0),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);

  const performanceRows = units
    .filter((unit) => !unit.isDeleted)
    .map((unit) => ({
      label: unit.workspaceName || unit.businessName || "Unnamed unit",
      value: Number(unit.metrics?.performance?.overallScore || 0),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);

  const employeeChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
    dataLabels: { enabled: false },
    colors: ["#2563EB"],
    xaxis: { categories: employeeRows.map((item) => item.label) },
    yaxis: { min: 0, forceNiceScale: true },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };

  const performanceChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%" } },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => `${value}%`,
    },
    colors: ["#7C3AED"],
    xaxis: {
      categories: performanceRows.map((item) => item.label),
      min: 0,
      max: 100,
      labels: { formatter: (value: number) => `${value}%` },
    },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { y: { formatter: (value: number) => `${value}%` } },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={unitManagementBanner}
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
              className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3B82F6]/35 to-[#60A5FA]/20 sm:w-[64%]"
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[78%]">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[29px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[36px]">
                <span className="text-primary">Unit Management</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Compare people, work, resources, and operational performance
                across every linked unit.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["People", "Roles", "Work", "Performance"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                Managed units
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {activeUnits.length}
              </p>
            </div>
          </div>
        </div>

        {loadError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} /> {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid min-h-[320px] place-items-center text-[11px] text-slate-500">
            Loading Unit Management dashboard...
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile icon={<Building2 size={18} />} label="Managed units" value={units.length} sub={`${activeUnits.length} currently active`} />
              <StatTile icon={<Users size={18} />} label="Employees" value={Number(summary.totalEmployees || 0)} sub="Across linked units" tone="green" />
              <StatTile icon={<BriefcaseBusiness size={18} />} label="Departments" value={Number(summary.totalDepartments || 0)} sub="Combined organization structure" tone="violet" />
              <StatTile icon={<Ticket size={18} />} label="Tickets" value={Number(summary.totalTickets || 0)} sub={`${Number(summary.performance?.ticketResolutionRate || 0)}% resolution rate`} tone="amber" />
              <StatTile icon={<CheckSquare2 size={18} />} label="Tasks" value={Number(summary.totalTasks || 0)} sub="Combined task workload" tone="violet" />
              <StatTile icon={<Package size={18} />} label="Assets" value={Number(summary.totalAssets || 0)} sub="Tracked across units" tone="rose" />
              <StatTile icon={<ClipboardList size={18} />} label="Inventory" value={Number(summary.totalInventory || 0)} sub="Combined inventory records" />
              <StatTile icon={<BarChart3 size={18} />} label="Performance" value={`${Number(summary.performance?.overallScore || 0)}%`} sub={`${Number(summary.totalMeetingBookings || 0)} meeting bookings`} tone="green" />
            </div>

            <div className="mb-6">
              <p className="text-sm font-pmedium text-slate-900">
                Explore Unit Management
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Choose the unit detail you want to compare before entering the
                management workspace.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <DashboardModuleCard
                      key={module.id}
                      icon={<Icon size={19} />}
                      title={module.title}
                      route={`/core-modules/workspace-management/list?tab=${module.id}`}
                      description={module.description}
                      color={module.color}
                      state={{ moduleTitle: module.title }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Operational workload"
                subtitle="Current work and resource records across all units."
              >
                {workloadRows.length ? (
                  <DonutChart
                    centerLabel="Records"
                    labels={workloadRows.map((item) => item.label)}
                    series={workloadRows.map((item) => item.value)}
                    colors={WORKLOAD_COLORS.slice(0, workloadRows.length)}
                    tooltipValue={workloadRows.map(
                      (item) => `${item.value} records`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No operational workload has been recorded yet.
                  </div>
                )}
              </SectionCard>
              <SectionCard
                title="Employees by unit"
                subtitle="How the combined workforce is distributed."
              >
                {employeeRows.length ? (
                  <GroupedBarGraph
                    options={employeeChartOptions}
                    series={[
                      {
                        name: "Employees",
                        data: employeeRows.map((item) => item.value),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No employee allocation data is available yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4">
              <SectionCard
                title="Performance by unit"
                subtitle="Overall operational score reported for each linked unit."
              >
                {performanceRows.length ? (
                  <GroupedBarGraph
                    options={performanceChartOptions}
                    series={[
                      {
                        name: "Performance",
                        data: performanceRows.map((item) => item.value),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No unit performance data is available yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Unit comparison"
              subtitle="Core people, workload, booking, and performance measures by unit."
              bodyClassName="max-h-[390px] overflow-y-auto p-0"
            >
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[24%] px-5 py-3">Unit</th>
                    <th className="w-[13%] px-4 py-3">Employees</th>
                    <th className="w-[13%] px-4 py-3">Tickets</th>
                    <th className="w-[13%] px-4 py-3">Tasks</th>
                    <th className="w-[13%] px-4 py-3">Bookings</th>
                    <th className="w-[12%] px-4 py-3">Score</th>
                    <th className="w-[12%] px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {units.length ? (
                    units.map((unit, index) => {
                      const status = statusLabel(unit);
                      return (
                        <tr
                          key={unit.id || unit._id || index}
                          className="hover:bg-slate-50/70"
                        >
                          <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                            {unit.workspaceName || unit.businessName || "Unnamed unit"}
                            {unit === currentUnit ? (
                              <span className="ml-2 text-[9px] uppercase text-blue-600">
                                Current
                              </span>
                            ) : null}
                          </td>
                          <td className="truncate px-4 py-3 text-slate-600">{Number(unit.metrics?.totalEmployees || 0)}</td>
                          <td className="truncate px-4 py-3 text-slate-600">{Number(unit.metrics?.totalTickets || 0)}</td>
                          <td className="truncate px-4 py-3 text-slate-600">{Number(unit.metrics?.totalTasks || 0)}</td>
                          <td className="truncate px-4 py-3 text-slate-600">{Number(unit.metrics?.totalMeetingBookings || 0)}</td>
                          <td className="truncate px-4 py-3 font-pmedium text-slate-900">{Number(unit.metrics?.performance?.overallScore || 0)}%</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-wide ${
                                status === "Current"
                                  ? "bg-blue-50 text-blue-700"
                                  : status === "Active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : status === "Disabled"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No managed units are available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </SectionCard>
          </>
        )}
      </PageFrame>
    </div>
  );
}
