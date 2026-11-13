import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Coffee,
  Eye,
  RefreshCw,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import attendanceBannerImage from "../../assets/module-banners/attendance-management-banner.webp";
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
import { getMyAttendance, getTeamAttendance } from "../../services/attendance";
import useWorkspacePreferences from "../../hooks/useWorkspacePreferences";
import { getWorkspaceDateKey } from "../../lib/workspaceLocalization";
import { formatTime12h } from "../../utils/time";

type AttendanceRecord = Record<string, any>;
type Tone = "blue" | "green" | "amber" | "violet" | "rose" | "slate";

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const readable = (value: unknown, fallback = "Not recorded") => {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const recordDateKey = (record: AttendanceRecord) =>
  String(record.date || record.attendanceDate || record.createdAt || "").slice(
    0,
    10,
  );

const employeeKey = (record: AttendanceRecord) =>
  String(
    record.userId ||
      record.employeeId ||
      record.employeeName ||
      record.name ||
      "",
  ).trim();

const employeeName = (record: AttendanceRecord) =>
  String(
    record.employeeName || record.userName || record.name || "Employee",
  ).trim();

const recordStatus = (record: AttendanceRecord) =>
  normalize(record.status || "absent");

const formatDate = (value: unknown) => {
  const text = String(value || "");
  const date = new Date(text.length === 10 ? `${text}T12:00:00` : text);
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
  tone?: Tone;
}) {
  const tones: Record<Tone, { icon: string; hover: string }> = {
    blue: {
      icon: "border-l-blue-600 bg-blue-50 text-blue-700",
      hover: "hover:border-blue-200 hover:border-l-blue-600",
    },
    green: {
      icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
      hover: "hover:border-emerald-200 hover:border-l-emerald-500",
    },
    amber: {
      icon: "border-l-amber-500 bg-amber-50 text-amber-700",
      hover: "hover:border-amber-200 hover:border-l-amber-500",
    },
    violet: {
      icon: "border-l-violet-500 bg-violet-50 text-violet-700",
      hover: "hover:border-violet-200 hover:border-l-violet-500",
    },
    rose: {
      icon: "border-l-rose-500 bg-rose-50 text-rose-700",
      hover: "hover:border-rose-200 hover:border-l-rose-500",
    },
    slate: {
      icon: "border-l-slate-500 bg-slate-100 text-slate-700",
      hover: "hover:border-slate-300 hover:border-l-slate-500",
    },
  };

  return (
    <div
      className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${tones[tone].hover}`}
    >
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
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export default function AttendanceDashboard() {
  const navigate = useNavigate();
  const workspacePreferences = useWorkspacePreferences();
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [teamRecords, setTeamRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const user = useMemo(() => getStoredUser(), []);
  const role = normalize(user?.workspaceMembership?.role || user?.role);
  const canManageAttendance =
    role === "owner" ||
    role === "founder" ||
    role === "super_admin" ||
    role === "admin" ||
    role === "admin_manager" ||
    role === "manager" ||
    role.endsWith("_manager") ||
    canAccessAdminDashboard(user) ||
    canAccessHRDashboard(user) ||
    canAccessAdministrationDashboard(user) ||
    canAccessSalesDashboard(user) ||
    canAccessFinanceDashboard(user) ||
    canAccessTechDashboard(user) ||
    canAccessITDashboard(user) ||
    canAccessMaintenanceDashboard(user);

  const todayKey = getWorkspaceDateKey(
    new Date(),
    workspacePreferences.timezone,
  );
  const monthKey = todayKey.slice(0, 7);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled([
      getMyAttendance({ month: monthKey }),
      getTeamAttendance({ month: monthKey }),
    ])
      .then(([myResult, teamResult]) => {
        if (cancelled) return;

        if (myResult.status === "fulfilled") {
          const payload = myResult.value || {};
          setMyRecords(Array.isArray(payload.records) ? payload.records : []);
        } else {
          setMyRecords([]);
        }

        if (teamResult.status === "fulfilled") {
          const payload = teamResult.value || {};
          const records = Array.isArray(payload.records) ? payload.records : [];
          setTeamRecords(records);
          setAllRecords(
            Array.isArray(payload.allRecords) ? payload.allRecords : records,
          );
        } else {
          setTeamRecords([]);
          setAllRecords([]);
        }

        setLoadError(
          myResult.status === "rejected" && teamResult.status === "rejected"
            ? "Attendance data could not be refreshed just now."
            : "",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  const visibleRecords = useMemo(() => {
    const source =
      canManageAttendance && allRecords.length ? allRecords : myRecords;
    const seen = new Set<string>();
    return source.filter((record) => {
      const key = String(
        record.recordId ||
          record.id ||
          `${employeeKey(record)}-${recordDateKey(record)}`,
      );
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allRecords, canManageAttendance, myRecords]);

  const todayRecords = useMemo(() => {
    const records = visibleRecords.filter(
      (record) => recordDateKey(record) === todayKey,
    );
    if (records.length || !canManageAttendance) return records;
    return teamRecords.filter(
      (record) => !recordDateKey(record) || recordDateKey(record) === todayKey,
    );
  }, [canManageAttendance, teamRecords, todayKey, visibleRecords]);

  const correctionRecords = useMemo(
    () => visibleRecords.filter((record) => record.correction),
    [visibleRecords],
  );

  const stats = useMemo(() => {
    const statusCount = (statuses: string[]) =>
      todayRecords.filter((record) => statuses.includes(recordStatus(record)))
        .length;
    const employeeSource = teamRecords.length ? teamRecords : visibleRecords;
    const totalEmployees = new Set(
      employeeSource.map(employeeKey).filter(Boolean),
    ).size;
    const present = statusCount(["present"]);
    const absent = statusCount(["absent"]);
    const late = statusCount(["late"]);
    const halfDay = statusCount(["half_day"]);
    const considered = present + absent + late + halfDay;
    const attended = present + late + halfDay;

    return {
      totalEmployees:
        totalEmployees || (canManageAttendance ? todayRecords.length : 1),
      present,
      absent,
      late,
      checkedIn: todayRecords.filter(
        (record) => record.checkIn && !record.checkOut,
      ).length,
      onBreak: todayRecords.filter((record) => Boolean(record.isActiveBreak))
        .length,
      attendanceRate: considered
        ? Math.round((attended / considered) * 100)
        : 0,
      pendingCorrections: correctionRecords.filter(
        (record) => normalize(record.correction?.status) === "pending",
      ).length,
    };
  }, [
    canManageAttendance,
    correctionRecords,
    teamRecords,
    todayRecords,
    visibleRecords,
  ]);

  const statusBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    todayRecords.forEach((record) => {
      const label = readable(recordStatus(record), "Absent");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [todayRecords]);

  const correctionBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    correctionRecords.forEach((record) => {
      const label = readable(record.correction?.status, "Pending");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [correctionRecords]);

  const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  const monthlyTrend = useMemo(() => {
    const present = new Array(5).fill(0);
    const exception = new Array(5).fill(0);
    visibleRecords.forEach((record) => {
      const dateKey = recordDateKey(record);
      if (!dateKey.startsWith(monthKey)) return;
      const day = Number(dateKey.slice(8, 10));
      const week = Math.min(4, Math.max(0, Math.floor((day - 1) / 7)));
      const status = recordStatus(record);
      if (["present", "half_day"].includes(status)) present[week] += 1;
      if (["late", "absent"].includes(status)) exception[week] += 1;
    });
    return { present, exception };
  }, [monthKey, visibleRecords]);

  const departmentBreakdown = useMemo(() => {
    const groups = new Map<string, { present: number; exceptions: number }>();
    visibleRecords.forEach((record) => {
      const department = readable(record.department, "Unassigned");
      const entry = groups.get(department) || { present: 0, exceptions: 0 };
      const status = recordStatus(record);
      if (["present", "half_day"].includes(status)) entry.present += 1;
      if (["late", "absent"].includes(status)) entry.exceptions += 1;
      groups.set(department, entry);
    });
    return [...groups.entries()]
      .sort(
        (left, right) =>
          right[1].present +
          right[1].exceptions -
          (left[1].present + left[1].exceptions),
      )
      .slice(0, 8);
  }, [visibleRecords]);

  const recentRecords = useMemo(
    () =>
      [...visibleRecords]
        .sort((left, right) =>
          recordDateKey(right).localeCompare(recordDateKey(left)),
        )
        .slice(0, 10),
    [visibleRecords],
  );

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: weekLabels },
    colors: ["#10B981", "#F59E0B"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const departmentOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: departmentBreakdown.map(([label]) => label) },
    colors: ["#2563EB", "#F59E0B"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const modules = [
    {
      id: "my-attendance",
      label: "My Attendance",
      icon: UserCheck,
      route: "/common-modules/attendance/my-attendance",
      description:
        "Clock in, manage breaks, and review your attendance history",
      color: "#2563EB",
    },
    {
      id: "team-attendance",
      label: "Team Attendance",
      icon: Users,
      route: "/common-modules/attendance/team-attendance",
      description:
        "Review attendance and availability across your managed team",
      color: "#059669",
    },
    {
      id: "corrections",
      label: "Attendance Corrections",
      icon: RefreshCw,
      route: "/common-modules/attendance/corrections",
      description: "Request and track corrections to attendance records",
      color: "#EA580C",
    },
  ].filter((module) => module.id !== "team-attendance" || canManageAttendance);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={attendanceBannerImage}
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
              className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/45 via-[#3b82f6]/25 to-[#60a5fa]/15"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
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
              <h1 className="flex flex-wrap items-center gap-x-2 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Attendance</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">
                Live attendance, check-in activity, team availability, and
                correction status for the current workspace.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[
                  "Check-ins",
                  "Team status",
                  "Working hours",
                  "Corrections",
                ].map((tag) => (
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
                Present today
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {stats.present + stats.late}
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
            <StatTile
              icon={<Users size={20} />}
              label="Team members"
              value={stats.totalEmployees}
              sub="People represented in attendance data"
              tone="violet"
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Present today"
              value={stats.present}
              sub="On-time attendance records"
              tone="green"
            />
            <StatTile
              icon={<XCircle size={20} />}
              label="Absent today"
              value={stats.absent}
              sub="People currently marked absent"
              tone="rose"
            />
            <StatTile
              icon={<AlertCircle size={20} />}
              label="Late today"
              value={stats.late}
              sub="Late arrivals recorded today"
              tone="amber"
            />
            <StatTile
              icon={<Clock3 size={20} />}
              label="Clocked in now"
              value={stats.checkedIn}
              sub="Active attendance sessions"
              tone="blue"
            />
            <StatTile
              icon={<Coffee size={20} />}
              label="On break"
              value={stats.onBreak}
              sub="Active break sessions right now"
              tone="violet"
            />
            <StatTile
              icon={<CalendarCheck size={20} />}
              label="Attendance rate"
              value={`${stats.attendanceRate}%`}
              sub="Present, late, and half-day attendance"
              tone="green"
            />
            <StatTile
              icon={<RefreshCw size={20} />}
              label="Pending corrections"
              value={stats.pendingCorrections}
              sub="Correction requests awaiting action"
              tone="amber"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Manage attendance
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the attendance views available for your role.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
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
                    fromSection: "attendance-dashboard",
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
              <SectionCard
                title="Monthly attendance trend"
                subtitle="Present records versus late and absent exceptions across the current month."
              >
                {visibleRecords.length ? (
                  <GroupedBarGraph
                    options={trendOptions}
                    series={[
                      { name: "Present", data: monthlyTrend.present },
                      { name: "Late / Absent", data: monthlyTrend.exception },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No attendance activity recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Today's attendance status"
                subtitle="Current attendance records grouped by operational status."
              >
                {statusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Today"
                    labels={statusBreakdown.map(([label]) => label)}
                    series={statusBreakdown.map(([, value]) => value)}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No status records available for today.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Correction status"
                subtitle="Attendance correction requests grouped by review outcome."
              >
                {correctionBreakdown.length ? (
                  <DonutChart
                    centerLabel="Requests"
                    labels={correctionBreakdown.map(([label]) => label)}
                    series={correctionBreakdown.map(([, value]) => value)}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No correction requests recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            {canManageAttendance ? (
              <div className="mb-4">
                <SectionCard
                  title="Attendance by department"
                  subtitle="Present records compared with late and absent exceptions by department."
                >
                  {departmentBreakdown.length ? (
                    <GroupedBarGraph
                      options={departmentOptions}
                      series={[
                        {
                          name: "Present",
                          data: departmentBreakdown.map(
                            ([, values]) => values.present,
                          ),
                        },
                        {
                          name: "Late / Absent",
                          data: departmentBreakdown.map(
                            ([, values]) => values.exceptions,
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                      No department attendance data available yet.
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            <SectionCard
              title="Recent attendance records"
              subtitle="Latest check-in activity with employee, department, timing, and current status."
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <th className="px-5 py-3.5">Employee</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Check in</th>
                      <th className="px-5 py-3.5">Check out</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.length ? (
                      recentRecords.map((record, index) => (
                        <tr
                          key={String(
                            record.recordId ||
                              record.id ||
                              `${employeeKey(record)}-${recordDateKey(record)}-${index}`,
                          )}
                          className="border-b border-slate-100 text-[11px] last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-5 py-3.5 font-pmedium text-slate-900">
                            {employeeName(record)}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {readable(record.department, "Unassigned")}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatDate(recordDateKey(record))}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatTime12h(record.checkIn) || "--"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatTime12h(record.checkOut) || "--"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium ${statusPillClass(record.status)}`}
                            >
                              {readable(record.status, "Absent")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              title="Open attendance details"
                              onClick={() =>
                                navigate(
                                  canManageAttendance
                                    ? "/common-modules/attendance/team-attendance"
                                    : "/common-modules/attendance/my-attendance",
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition hover:border-blue-200 hover:bg-blue-100"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-12 text-center text-[11px] text-slate-500"
                        >
                          No attendance records available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
