import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import maintenanceBannerImage from "@/assets/maintenance-dashboard-banner.webp";
import {
  getMaintenanceOptions,
  getMaintenanceSchedules,
} from "@/services/maintenance";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";

type ScheduleRow = Record<string, any>;

type AmcDashboardData = {
  schedules: ScheduleRow[];
  assets: ScheduleRow[];
};

const EMPTY: AmcDashboardData = { schedules: [], assets: [] };

const MODULES = [
  {
    title: "Master AMC Schedule",
    section: "schedules",
    icon: ClipboardList,
    color: "#2563EB",
    description: "Review and maintain every preventive servicing contract",
  },
  {
    title: "Upcoming Alerts",
    section: "alerts",
    icon: BellRing,
    color: "#EA580C",
    description: "Focus on AMCs that are due soon or already overdue",
  },
] as const;

const rows = (value: unknown): ScheduleRow[] => (Array.isArray(value) ? value : []);

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const titleCase = (value: unknown, fallback = "Unspecified") =>
  String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value: unknown) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const daysUntil = (value: unknown) => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
};

const statusOf = (row: ScheduleRow) =>
  titleCase(row?.currentStatus || row?.status, "Scheduled");

const assetOf = (row: ScheduleRow) =>
  row?.assetName || row?.asset?.name || row?.assetCode || "Unassigned asset";

const statusClass = (status: string) => {
  const value = normalize(status);
  if (value === "overdue") return "bg-rose-50 text-rose-700";
  if (value === "due soon") return "bg-amber-50 text-amber-700";
  if (value === "completed") return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-700";
};

export default function AMCMaintenanceSchedulerWorkspaceDashboard() {
  const [data, setData] = useState<AmcDashboardData>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([
      getMaintenanceSchedules({ limit: 500 }),
      getMaintenanceOptions(),
    ]).then(([schedulesResult, optionsResult]) => {
      if (cancelled) return;

      const schedulesPayload: any =
        schedulesResult.status === "fulfilled" ? schedulesResult.value : {};
      const optionsPayload: any =
        optionsResult.status === "fulfilled" ? optionsResult.value : {};

      const schedules = rows(
        schedulesPayload?.schedules || schedulesPayload?.items || schedulesPayload,
      );
      setData({
        schedules,
        assets: rows(optionsPayload?.assets),
      });
      if (schedulesResult.status === "rejected") {
        setLoadError("AMC schedules could not be refreshed just now.");
      } else if (optionsResult.status === "rejected") {
        setLoadError(
          "Some maintenance context could not be refreshed. Available schedules are shown below.",
        );
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const count = (status: string) =>
      data.schedules.filter(
        (schedule) => normalize(statusOf(schedule)) === status,
      ).length;
    const scheduled = count("scheduled");
    const dueSoon = count("due soon");
    const overdue = count("overdue");
    const completed = count("completed");
    const assetsCovered = new Set(
      data.schedules
        .map((schedule) =>
          String(
            schedule.assetId || schedule.assetCode || schedule.assetName || "",
          ),
        )
        .filter(Boolean),
    ).size;

    return {
      total: data.schedules.length,
      scheduled,
      dueSoon,
      overdue,
      completed,
      attention: dueSoon + overdue,
      coverage: data.schedules.length
        ? Math.round((completed / data.schedules.length) * 100)
        : 0,
      assetsCovered,
      reminders: data.schedules.filter((schedule) => schedule.enableReminders)
        .length,
    };
  }, [data.schedules]);

  const statusRows = useMemo(
    () =>
      [
        ["Scheduled", stats.scheduled],
        ["Due Soon", stats.dueSoon],
        ["Overdue", stats.overdue],
        ["Completed", stats.completed],
      ].filter(([, value]) => Number(value) > 0) as Array<[string, number]>,
    [stats.completed, stats.dueSoon, stats.overdue, stats.scheduled],
  );

  const frequencyRows = useMemo(() => {
    const groups = new Map<string, number>();
    data.schedules.forEach((schedule) => {
      const frequency = titleCase(schedule.frequency, "Other");
      groups.set(frequency, (groups.get(frequency) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [data.schedules]);

  const upcomingSchedules = useMemo(
    () =>
      data.schedules
        .filter((schedule) => {
          const status = normalize(statusOf(schedule));
          const days = daysUntil(schedule.nextServiceDate || schedule.nextDueDate);
          return (
            status !== "completed" && days !== null && days <= 30 && days >= -30
          );
        })
        .sort((left, right) => {
          const leftDays =
            daysUntil(left.nextServiceDate || left.nextDueDate) ?? 0;
          const rightDays =
            daysUntil(right.nextServiceDate || right.nextDueDate) ?? 0;
          return leftDays - rightDays;
        })
        .slice(0, 8),
    [data.schedules],
  );

  const overdueSchedules = useMemo(
    () =>
      data.schedules
        .filter(
          (schedule) => normalize(statusOf(schedule)) === "overdue",
        )
        .slice(0, 6),
    [data.schedules],
  );

  const recentSchedules = useMemo(
    () =>
      [...data.schedules]
        .sort(
          (left, right) =>
            new Date(right.createdAt || right.updatedAt || 0).getTime() -
            new Date(left.createdAt || left.updatedAt || 0).getTime(),
        )
        .slice(0, 10),
    [data.schedules],
  );

  const frequencyOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
      colors: ["#2563EB"],
      plotOptions: {
        bar: { horizontal: true, borderRadius: 5, barHeight: "48%" },
      },
      dataLabels: {
        enabled: true,
        offsetX: 14,
        formatter: (value: number) => `${value}`,
        style: { colors: ["#475569"], fontSize: "10px", fontWeight: 500 },
      },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      xaxis: {
        categories: frequencyRows.map(([name]) => name),
        min: 0,
        labels: { style: { colors: "#64748B", fontSize: "10px" } },
      },
      yaxis: {
        labels: { maxWidth: 135, style: { colors: "#475569", fontSize: "10px" } },
      },
      tooltip: { y: { formatter: (value: number) => `${value} AMCs` } },
    }),
    [frequencyRows],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="AMC Maintenance Scheduler"
          description="Plan preventive servicing, track contract frequencies, and stay ahead of due and overdue maintenance across every asset."
          tags={["Preventive Servicing", "Schedules", "Alerts", "Service History"]}
          image={maintenanceBannerImage}
        />

        {loadError && !isLoading ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile
              icon={<ClipboardList size={20} />}
              label="Total AMCs"
              value={stats.total}
              sub="Preventive servicing contracts"
              tone="blue"
            />
            <DashboardStatTile
              icon={<ShieldCheck size={20} />}
              label="Healthy"
              value={stats.scheduled}
              sub="Schedules running on plan"
              tone="green"
            />
            <DashboardStatTile
              icon={<Clock3 size={20} />}
              label="Due Soon"
              value={stats.dueSoon}
              sub="Servicing approaching its date"
              tone="amber"
            />
            <DashboardStatTile
              icon={<AlertTriangle size={20} />}
              label="Overdue"
              value={stats.overdue}
              sub="Servicing past its due date"
              tone={stats.overdue ? "rose" : "green"}
            />
            <DashboardStatTile
              icon={<BellRing size={20} />}
              label="Need Attention"
              value={stats.attention}
              sub="Due soon or overdue AMCs"
              tone={stats.attention ? "amber" : "green"}
            />
            <DashboardStatTile
              icon={<CheckCircle2 size={20} />}
              label="Completed"
              value={stats.completed}
              sub="AMCs with completed servicing"
              tone="cyan"
            />
            <DashboardStatTile
              icon={<Wrench size={20} />}
              label="Service Coverage"
              value={`${stats.coverage}%`}
              sub="Completed out of all schedules"
              tone="violet"
            />
            <DashboardStatTile
              icon={<CalendarClock size={20} />}
              label="Reminders On"
              value={stats.reminders}
              sub={
                data.assets.length
                  ? `Across ${data.assets.length} registered assets`
                  : "Schedules with reminders enabled"
              }
              tone="slate"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            AMC scheduler modules
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the exact AMC workspace required for the current task.
          </p>
          <div
            className="mt-3 grid w-full grid-cols-1 gap-4 md:grid-cols-[repeat(var(--module-cols),minmax(0,1fr))]"
            style={{ "--module-cols": MODULES.length } as CSSProperties}
          >
            {MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.section}
                  icon={<Icon size={19} />}
                  title={module.title}
                  route={`/department-accesses/maintenance-department/amc-scheduler/${module.section}`}
                  description={module.description}
                  color={module.color}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="AMC schedule health"
                subtitle="Current mix of scheduled, due, overdue, and completed contracts."
              >
                {statusRows.length ? (
                  <DonutChart
                    centerLabel="AMCs"
                    labels={statusRows.map(([name]) => name)}
                    series={statusRows.map(([, value]) => value)}
                    colors={["#10B981", "#F59E0B", "#EF4444", "#2563EB"]}
                    tooltipValue={statusRows.map(([, value]) => `${value} AMCs`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No AMC schedules recorded yet.
                  </div>
                )}
              </DashboardSection>
              <DashboardSection
                title="Contracts by frequency"
                subtitle="Service cadence across all preventive maintenance schedules."
              >
                {frequencyRows.length ? (
                  <ReactApexChart
                    type="bar"
                    height={310}
                    options={frequencyOptions}
                    series={[
                      {
                        name: "AMCs",
                        data: frequencyRows.map(([, value]) => value),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[310px] items-center justify-center text-[11px] text-slate-500">
                    No frequency data is available yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Servicing in the next 30 days"
                subtitle="Upcoming and recently passed service dates that need attention."
                bodyClassName="max-h-[360px] overflow-y-auto p-0"
              >
                {upcomingSchedules.length ? (
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="w-[32%] px-5 py-3">Asset</th>
                        <th className="w-[23%] px-3 py-3">Service date</th>
                        <th className="w-[22%] px-3 py-3">Technician</th>
                        <th className="w-[23%] px-3 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {upcomingSchedules.map((schedule, index) => (
                        <tr
                          key={
                            schedule._id ||
                            schedule.scheduleCode ||
                            index
                          }
                          className="bg-white text-[11px] text-slate-600"
                        >
                          <td className="px-5 py-3">
                            <p className="truncate font-pmedium text-slate-900">
                              {assetOf(schedule)}
                            </p>
                            <p className="mt-0.5 truncate text-[9px] text-slate-400">
                              {schedule.scheduleCode || "AMC schedule"}
                            </p>
                          </td>
                          <td className="truncate px-3 py-3">
                            {formatDate(
                              schedule.nextServiceDate ||
                                schedule.nextDueDate,
                            )}
                          </td>
                          <td className="truncate px-3 py-3">
                            {titleCase(schedule.technician, "Unassigned")}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`rounded-full px-2 py-1 text-[9px] ${statusClass(statusOf(schedule))}`}
                            >
                              {statusOf(schedule)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                    No servicing is due in the next 30 days.
                  </div>
                )}
              </DashboardSection>

              <DashboardSection
                title="Overdue servicing"
                subtitle="AMCs whose service date has already passed."
                bodyClassName="max-h-[360px] overflow-y-auto p-0"
              >
                {overdueSchedules.length ? (
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="w-[34%] px-5 py-3">Asset</th>
                        <th className="w-[24%] px-3 py-3">Due date</th>
                        <th className="w-[24%] px-3 py-3">Technician</th>
                        <th className="w-[18%] px-3 py-3 text-center">Frequency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overdueSchedules.map((schedule, index) => (
                        <tr
                          key={
                            schedule._id ||
                            schedule.scheduleCode ||
                            index
                          }
                          className="bg-white text-[11px] text-slate-600"
                        >
                          <td className="px-5 py-3">
                            <p className="truncate font-pmedium text-slate-900">
                              {assetOf(schedule)}
                            </p>
                            <p className="mt-0.5 truncate text-[9px] text-rose-500">
                              {schedule.scheduleCode || "AMC schedule"}
                            </p>
                          </td>
                          <td className="truncate px-3 py-3">
                            {formatDate(
                              schedule.nextServiceDate ||
                                schedule.nextDueDate,
                            )}
                          </td>
                          <td className="truncate px-3 py-3">
                            {titleCase(schedule.technician, "Unassigned")}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-600">
                              {titleCase(schedule.frequency, "Other")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                    No AMC servicing is overdue.
                  </div>
                )}
              </DashboardSection>
            </div>

            <DashboardSection
              title="Recent AMC schedules"
              subtitle="Latest preventive servicing contracts added to the workspace."
              bodyClassName="max-h-[430px] overflow-y-auto p-0"
            >
              {recentSchedules.length ? (
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="w-[19%] px-5 py-3">Schedule</th>
                      <th className="w-[24%] px-3 py-3">Asset</th>
                      <th className="w-[18%] px-3 py-3">Frequency</th>
                      <th className="w-[21%] px-3 py-3">Next service</th>
                      <th className="w-[18%] px-3 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSchedules.map((schedule, index) => (
                      <tr
                        key={schedule._id || schedule.scheduleCode || index}
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td className="px-5 py-3">
                          <p className="truncate font-pmedium text-slate-900">
                            {schedule.scheduleCode || `AMC-${index + 1}`}
                          </p>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {titleCase(
                              schedule.maintenanceType || schedule.type,
                              "Maintenance",
                            )}
                          </p>
                        </td>
                        <td className="truncate px-3 py-3">
                          {assetOf(schedule)}
                        </td>
                        <td className="truncate px-3 py-3">
                          {titleCase(schedule.frequency, "Other")}
                        </td>
                        <td className="truncate px-3 py-3">
                          {formatDate(
                            schedule.nextServiceDate || schedule.nextDueDate,
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-[9px] ${statusClass(statusOf(schedule))}`}
                          >
                            {statusOf(schedule)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                  No AMC schedules recorded yet.
                </div>
              )}
            </DashboardSection>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
