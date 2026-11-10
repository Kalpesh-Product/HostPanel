import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  CheckCircle2,
  Clock3,
  CreditCard,
  Globe2,
  MapPin,
  Settings2,
  Users,
} from "lucide-react";
import unitSettingsBanner from "../../assets/coworking-banner.jpg";
import { formatTime12hLabel } from "../../components/ui/TimePicker12h";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getWorkspaceManagementOverview } from "../../services/unit-management";
import { getWorkspaceSettings } from "../../services/unit-settings";

type WorkspaceItem = {
  id?: string;
  _id?: string;
  workspaceName?: string;
  businessName?: string;
  city?: string;
  state?: string;
  country?: string;
  selectedPlan?: string;
  status?: string;
  isActiveWorkspace?: boolean;
  isDisabled?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  metrics?: { totalEmployees?: number };
};

type UnitOverview = {
  workspaceCount?: number;
  activeWorkspaceCount?: number;
  summary?: {
    totalEmployees?: number;
    totalDepartments?: number;
  };
  workspaces?: WorkspaceItem[];
};

type UnitPreferences = {
  timezone?: string;
  currency?: string;
  fiscalYearStartMonth?: number;
  businessHours?: {
    start?: string;
    end?: string;
    is24Hours?: boolean;
  };
  billing?: {
    tax?: {
      enabled?: boolean;
      label?: string;
      ratePercent?: number;
    };
    paymentMethods?: Array<{ code?: string; label?: string }>;
  };
};

const STATUS_COLORS = ["#10B981", "#F59E0B", "#EF4444"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const dateLabel = (value?: string) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const unitStatus = (workspace: WorkspaceItem) => {
  if (workspace.isDeleted) return "Deleted";
  if (workspace.isDisabled || normalize(workspace.status) === "disabled") {
    return "Disabled";
  }
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
  tone?: "blue" | "green" | "amber" | "violet";
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

export default function UnitSettingsDashboard() {
  const axiosPrivate = useAxiosPrivate();
  const [overview, setOverview] = useState<UnitOverview>({});
  const [preferences, setPreferences] = useState<UnitPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      getWorkspaceManagementOverview(axiosPrivate),
      getWorkspaceSettings(axiosPrivate),
    ]).then(([overviewResult, settingsResult]) => {
      if (cancelled) return;
      if (overviewResult.status === "fulfilled") {
        setOverview(
          overviewResult.value?.data?.data || overviewResult.value?.data || {},
        );
      }
      if (settingsResult.status === "fulfilled") {
        setPreferences(
          settingsResult.value?.data?.data?.settings?.preferences || {},
        );
      }
      if (
        overviewResult.status === "rejected" ||
        settingsResult.status === "rejected"
      ) {
        setLoadError("Some Unit Settings data could not be refreshed.");
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [axiosPrivate]);

  const workspaces = useMemo(
    () => (Array.isArray(overview.workspaces) ? overview.workspaces : []),
    [overview.workspaces],
  );
  const activeUnits = workspaces.filter(
    (workspace) => unitStatus(workspace) === "Active",
  );
  const disabledUnits = workspaces.filter(
    (workspace) => unitStatus(workspace) === "Disabled",
  );
  const deletedUnits = workspaces.filter(
    (workspace) => unitStatus(workspace) === "Deleted",
  );
  const totalEmployees =
    Number(overview.summary?.totalEmployees) ||
    workspaces.reduce(
      (sum, workspace) => sum + Number(workspace.metrics?.totalEmployees || 0),
      0,
    );
  const paymentMethods = Array.isArray(preferences.billing?.paymentMethods)
    ? preferences.billing.paymentMethods
    : [];
  const businessHours = preferences.businessHours?.is24Hours
    ? "24 hours"
    : `${formatTime12hLabel(preferences.businessHours?.start || "09:00")} – ${formatTime12hLabel(
        preferences.businessHours?.end || "22:00",
      )}`;
  const fiscalMonth =
    MONTH_NAMES[Math.max(1, Number(preferences.fiscalYearStartMonth) || 4) - 1];

  const modules = [
    {
      id: "units",
      title: "Units & Profile",
      description: "Create, rename, switch, enable, or manage linked units",
      icon: Building2,
      color: "#2563EB",
      route: "/core-modules/workspace-settings/list",
    },
    {
      id: "business-hours",
      title: "Business Hours",
      description: "Configure operating hours and active-unit timezone",
      icon: Clock3,
      color: "#0F766E",
      route: "/core-modules/workspace-settings/business-hours",
    },
    {
      id: "fiscal-year",
      title: "Financial Year",
      description: "Set when your financial year starts, used by Finance and reports",
      icon: CalendarRange,
      color: "#7C3AED",
      route: "/core-modules/workspace-settings/fiscal-year",
    },
    {
      id: "billing",
      title: "Billing & Payments",
      description: "Manage tax rules and accepted payment methods",
      icon: CreditCard,
      color: "#D97706",
      route: "/core-modules/workspace-settings/billing",
    },
  ];

  const statusRows = [
    { label: "Active", value: activeUnits.length },
    { label: "Disabled", value: disabledUnits.length },
    { label: "Deleted", value: deletedUnits.length },
  ].filter((item) => item.value > 0);

  const employeeRows = workspaces
    .filter((workspace) => !workspace.isDeleted)
    .map((workspace) => ({
      label: workspace.workspaceName || workspace.businessName || "Unnamed unit",
      value: Number(workspace.metrics?.totalEmployees || 0),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);

  // Horizontal bars: unit names get a full row of their own instead of being
  // squeezed and rotated under vertical columns, which is what was crumbling
  // on anything longer than a couple of units.
  const employeeChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%" } },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => String(value),
      style: { fontSize: "11px", colors: ["#1E3D73"] },
      offsetX: 6,
    },
    colors: ["#2563EB"],
    xaxis: {
      categories: employeeRows.map((row) => row.label),
      min: 0,
      labels: { style: { fontSize: "10px" } },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };

  const recentUnits = [...workspaces]
    .sort(
      (left, right) =>
        new Date(right.createdAt || 0).getTime() -
        new Date(left.createdAt || 0).getTime(),
    )
    .slice(0, 8);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={unitSettingsBanner}
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[76%]">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[29px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[36px]">
                <span className="text-primary">Unit Settings</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Linked units, operating preferences, financial year, tax,
                and payment readiness in one view.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Units", "Hours", "Financial Year", "Billing"].map((tag) => (
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
                Active units
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
            Loading Unit Settings dashboard...
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                icon={<Building2 size={18} />}
                label="Total units"
                value={overview.workspaceCount ?? workspaces.length}
                sub="All linked unit records"
              />
              <StatTile
                icon={<CheckCircle2 size={18} />}
                label="Active units"
                value={overview.activeWorkspaceCount ?? activeUnits.length}
                sub="Currently enabled units"
                tone="green"
              />
              <StatTile
                icon={<AlertTriangle size={18} />}
                label="Disabled units"
                value={disabledUnits.length}
                sub="Units unavailable for use"
                tone="amber"
              />
              <StatTile
                icon={<Users size={18} />}
                label="Employees"
                value={totalEmployees}
                sub="Across linked units"
                tone="violet"
              />
              <StatTile
                icon={<Settings2 size={18} />}
                label="Departments"
                value={Number(overview.summary?.totalDepartments || 0)}
                sub="Across managed units"
              />
              <StatTile
                icon={<Clock3 size={18} />}
                label="Business hours"
                value={businessHours}
                sub="Active unit schedule"
                tone="green"
              />
              <StatTile
                icon={<Globe2 size={18} />}
                label="Timezone"
                value={preferences.timezone || "Not set"}
                sub={`${preferences.currency || "Currency not set"} · Financial Year starts ${fiscalMonth}`}
                tone="violet"
              />
              <StatTile
                icon={<CreditCard size={18} />}
                label="Payment methods"
                value={paymentMethods.length}
                sub={
                  preferences.billing?.tax?.enabled
                    ? `${preferences.billing.tax.label || "Tax"} ${Number(
                        preferences.billing.tax.ratePercent || 0,
                      )}% enabled`
                    : "Tax collection disabled"
                }
                tone="amber"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm font-pmedium text-slate-900">
                Manage Unit Settings
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Open the relevant settings workspace without searching through
                the full configuration page.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <DashboardModuleCard
                      key={module.id}
                      icon={<Icon size={19} />}
                      title={module.title}
                      route={module.route}
                      description={module.description}
                      color={module.color}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Unit status"
                subtitle={
                  workspaces.length
                    ? `${activeUnits.length} of ${workspaces.length} linked unit${workspaces.length === 1 ? "" : "s"} are currently active.`
                    : "Linked units grouped by current availability."
                }
              >
                {statusRows.length ? (
                  <DonutChart
                    centerLabel="Units"
                    labels={statusRows.map((item) => item.label)}
                    series={statusRows.map((item) => item.value)}
                    colors={STATUS_COLORS.slice(0, statusRows.length)}
                    tooltipValue={statusRows.map(
                      (item) => `${item.value} units`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No linked-unit status data yet.
                  </div>
                )}
              </SectionCard>
              <SectionCard
                title="Employees by unit"
                subtitle={
                  employeeRows.length
                    ? `${totalEmployees} employee${totalEmployees === 1 ? "" : "s"} across ${employeeRows.length} unit${employeeRows.length === 1 ? "" : "s"}.`
                    : "Current employee allocation across linked units."
                }
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
                    No employee allocation data yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Recent linked units"
              subtitle="Latest unit records available to this founder account."
              bodyClassName="max-h-[390px] overflow-y-auto p-0"
            >
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[28%] px-5 py-3">Unit</th>
                    <th className="w-[24%] px-5 py-3">Location</th>
                    <th className="w-[16%] px-5 py-3">Employees</th>
                    <th className="w-[16%] px-5 py-3">Created</th>
                    <th className="w-[16%] px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {recentUnits.length ? (
                    recentUnits.map((workspace, index) => {
                      const status = unitStatus(workspace);
                      return (
                        <tr
                          key={workspace.id || workspace._id || index}
                          className="hover:bg-slate-50/70"
                        >
                          <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                            {workspace.workspaceName ||
                              workspace.businessName ||
                              "Unnamed unit"}
                          </td>
                          <td className="truncate px-5 py-3 text-slate-600">
                            <span className="inline-flex max-w-full items-center gap-1">
                              <MapPin size={11} className="shrink-0" />
                              <span className="truncate">
                                {[workspace.city, workspace.state, workspace.country]
                                  .filter(Boolean)
                                  .join(", ") || "Not recorded"}
                              </span>
                            </span>
                          </td>
                          <td className="truncate px-5 py-3 text-slate-600">
                            {Number(workspace.metrics?.totalEmployees || 0)}
                          </td>
                          <td className="truncate px-5 py-3 text-slate-600">
                            {dateLabel(workspace.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-wide ${
                                status === "Active"
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
                        colSpan={5}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No linked units are available yet.
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
