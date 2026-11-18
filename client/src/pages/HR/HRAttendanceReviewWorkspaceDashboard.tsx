import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import attendanceBannerImage from "@/assets/module-banners/attendance-management-banner.webp";
import { getHrAttendanceReview } from "@/services/attendance";
import { getEmployeeManagementOverview } from "@/services/hr";
import { formatTime12h } from "@/utils/time";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";

type AttendanceRecord = Record<string, any>;
type CorrectionRecord = Record<string, any>;

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

const label = (value: unknown, fallback = "Not recorded") => {
  const next = String(value || fallback).replace(/[_-]+/g, " ");
  return next.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const dateKey = (value: unknown) => {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const indiaTodayKey = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export default function HRAttendanceReviewWorkspaceDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const today = indiaTodayKey();
    const fromDate = new Date(`${today}T12:00:00.000Z`);
    fromDate.setUTCDate(fromDate.getUTCDate() - 6);
    const from = fromDate.toISOString().slice(0, 10);

    Promise.allSettled([
      getHrAttendanceReview({ from, to: today }),
      getEmployeeManagementOverview(),
    ]).then(([attendanceResult, employeeResult]) => {
      if (cancelled) return;

      if (attendanceResult.status === "fulfilled") {
        const payload = attendanceResult.value || {};
        setRecords(
          Array.isArray(payload.records)
            ? payload.records
            : Array.isArray(payload)
              ? payload
              : [],
        );
        setCorrections(Array.isArray(payload.corrections) ? payload.corrections : []);
        setLoadError("");
      } else {
        setRecords([]);
        setCorrections([]);
        setLoadError("Attendance review data could not be refreshed just now.");
      }

      if (employeeResult.status === "fulfilled") {
        const response = employeeResult.value as any;
        const payload = response?.data?.data || response?.data || response || {};
        setTotalEmployees(
          Number(payload?.summary?.totalEmployees) ||
            (Array.isArray(payload?.employees) ? payload.employees.length : 0),
        );
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const todayKey = indiaTodayKey();

  const todayRecords = useMemo(
    () => records.filter((record) => dateKey(record.date || record.createdAt) === todayKey),
    [records, todayKey],
  );

  const stats = useMemo(() => {
    const statusCount = (target: string) =>
      todayRecords.filter((record) => normalize(record.status) === target).length;
    const correctionCount = (target: string) =>
      corrections.filter((correction) => normalize(correction.status) === target).length;

    return {
      employees:
        totalEmployees || new Set(todayRecords.map((record) => record.userId).filter(Boolean)).size,
      present: statusCount("present"),
      onTime: todayRecords.filter(
        (record) => normalize(record.status) === "present" && !record.isLate,
      ).length,
      absent: statusCount("absent"),
      late: todayRecords.filter(
        (record) => Boolean(record.isLate) || normalize(record.status) === "late",
      ).length,
      halfDay: todayRecords.filter((record) =>
        normalize(record.status).includes("half day"),
      ).length,
      pending: correctionCount("pending"),
      approved: correctionCount("approved"),
      rejected: correctionCount("rejected"),
    };
  }, [corrections, todayRecords, totalEmployees]);

  const attendanceRows = useMemo(
    () =>
      [
        ["On Time", stats.onTime],
        ["Absent", stats.absent],
        ["Late", stats.late],
        ["Half Day", stats.halfDay],
      ].filter(([, value]) => Number(value) > 0) as Array<[string, number]>,
    [stats.absent, stats.halfDay, stats.late, stats.onTime],
  );

  const correctionRows = useMemo(
    () =>
      [
        ["Pending", stats.pending],
        ["Approved", stats.approved],
        ["Rejected", stats.rejected],
      ].filter(([, value]) => Number(value) > 0) as Array<[string, number]>,
    [stats.approved, stats.pending, stats.rejected],
  );

  const dailyAttendance = useMemo(() => {
    const endDate = new Date(`${todayKey}T12:00:00.000Z`);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(endDate);
      date.setUTCDate(endDate.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit" }),
        onTime: 0,
        late: 0,
        absent: 0,
      };
    });
    const dayMap = new Map(days.map((day) => [day.key, day]));

    records.forEach((record) => {
      const day = dayMap.get(dateKey(record.date || record.createdAt));
      if (!day) return;
      const status = normalize(record.status);
      if (Boolean(record.isLate) || status === "late") day.late += 1;
      else if (status === "present") day.onTime += 1;
      else if (status === "absent") day.absent += 1;
    });

    return days;
  }, [records, todayKey]);

  const departmentCoverage = useMemo(() => {
    const groups = new Map<string, { total: number; attended: number }>();
    todayRecords.forEach((record) => {
      const department = String(record.department || "Not assigned");
      const current = groups.get(department) || { total: 0, attended: 0 };
      const status = normalize(record.status);
      current.total += 1;
      if (
        Boolean(record.isPresent) ||
        ["present", "late", "half day", "on leave", "holiday"].includes(status)
      ) {
        current.attended += 1;
      }
      groups.set(department, current);
    });

    return [...groups.entries()]
      .map(([department, values]) => ({
        department,
        coverage: values.total ? Math.round((values.attended / values.total) * 100) : 0,
      }))
      .sort((left, right) => right.coverage - left.coverage)
      .slice(0, 8);
  }, [todayRecords]);

  const attentionRecords = useMemo(
    () =>
      todayRecords
        .filter((record) => {
          const status = normalize(record.status);
          return (
            Boolean(record.isLate) ||
            status === "late" ||
            status === "absent" ||
            status.includes("half day")
          );
        })
        .sort((left, right) => {
          const priority = (record: AttendanceRecord) => {
            const status = normalize(record.status);
            if (status === "absent") return 0;
            if (Boolean(record.isLate) || status === "late") return 1;
            return 2;
          };
          return priority(left) - priority(right);
        })
        .slice(0, 6),
    [todayRecords],
  );

  const weeklyTrendOptions = useMemo(
    () => ({
      chart: {
        stacked: true,
        toolbar: { show: false },
        fontFamily: "Poppins, sans-serif",
      },
      colors: ["#10B981", "#F59E0B", "#EF4444"],
      plotOptions: { bar: { borderRadius: 4, columnWidth: "46%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      legend: { position: "top" as const, horizontalAlign: "right" as const },
      xaxis: {
        categories: dailyAttendance.map((day) => day.label),
        labels: { style: { colors: "#64748B", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: "#64748B", fontSize: "10px" },
          formatter: (value: number) => String(Math.round(value)),
        },
      },
      tooltip: { shared: true, intersect: false },
    }),
    [dailyAttendance],
  );

  const departmentChartOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
      colors: ["#2563EB"],
      plotOptions: {
        bar: { horizontal: true, borderRadius: 5, barHeight: "48%" },
      },
      dataLabels: {
        enabled: true,
        formatter: (value: number) => `${Math.round(value)}%`,
        style: { colors: ["#FFFFFF"], fontSize: "10px", fontWeight: 500 },
      },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      xaxis: {
        categories: departmentCoverage.map((row) => row.department),
        min: 0,
        max: 100,
        tickAmount: 4,
        labels: {
          style: { colors: "#64748B", fontSize: "10px" },
          formatter: (value: string) => `${Math.round(Number(value))}%`,
        },
      },
      yaxis: { labels: { maxWidth: 135, style: { colors: "#475569", fontSize: "10px" } } },
      tooltip: { y: { formatter: (value: number) => `${Math.round(value)}% covered` } },
    }),
    [departmentCoverage],
  );

  const recentRecords = useMemo(
    () =>
      [...records]
        .sort(
          (left, right) =>
            new Date(right.date || right.createdAt || 0).getTime() -
            new Date(left.date || left.createdAt || 0).getTime(),
        )
        .slice(0, 10),
    [records],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Attendance Review"
          description="A live HR view of daily attendance, punctuality, employee punches, correction requests, and review outcomes."
          tags={["Attendance", "Punctuality", "Corrections", "Review"]}
          image={attendanceBannerImage}
          moduleCount={2}
        />

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
            <DashboardStatTile icon={<Users size={20} />} label="Employees" value={stats.employees} sub="Employees within HR attendance scope" tone="blue" />
            <DashboardStatTile icon={<UserCheck size={20} />} label="Present Today" value={stats.present} sub="Employees marked present today" tone="green" />
            <DashboardStatTile icon={<UserMinus size={20} />} label="Absent Today" value={stats.absent} sub="Employees marked absent today" tone="rose" />
            <DashboardStatTile icon={<Clock3 size={20} />} label="Late Arrivals" value={stats.late} sub="Late punches recorded today" tone="amber" />
            <DashboardStatTile icon={<CalendarCheck size={20} />} label="Half Day" value={stats.halfDay} sub="Half-day attendance records" tone="cyan" />
            <DashboardStatTile icon={<ClipboardCheck size={20} />} label="Pending Corrections" value={stats.pending} sub="Requests received in the latest 7 days" tone="amber" />
            <DashboardStatTile icon={<CheckCircle2 size={20} />} label="Approved" value={stats.approved} sub="Approved within the latest 7 days" tone="green" />
            <DashboardStatTile icon={<XCircle size={20} />} label="Rejected" value={stats.rejected} sub="Rejected within the latest 7 days" tone="slate" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Attendance review modules</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the attendance register or correction-review queue directly.
          </p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <DashboardModuleCard
              icon={<ClipboardCheck size={19} />}
              title="Attendance Master"
              route="/department-accesses/hr-department/attendance-review/attendance-master"
              description="Review employee punches, hours, punctuality, status, and daily attendance records"
              color="#2563EB"
            />
            <DashboardModuleCard
              icon={<Clock3 size={19} />}
              title="Correction Requests"
              route="/department-accesses/hr-department/attendance-review/correction-requests"
              description="Approve or reject requested corrections to employee attendance records"
              color="#EA580C"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection title="Today's attendance status" subtitle="Distribution of today’s available attendance records.">
                {attendanceRows.length ? (
                  <DonutChart
                    centerLabel="Records"
                    labels={attendanceRows.map(([name]) => name)}
                    series={attendanceRows.map(([, value]) => value)}
                    colors={["#10B981", "#EF4444", "#F59E0B", "#06B6D4"]}
                    tooltipValue={attendanceRows.map(([, value]) => `${value} employees`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No attendance records available for today.</div>
                )}
              </DashboardSection>

              <DashboardSection title="Correction outcomes" subtitle="Attendance-correction outcomes received within the latest seven days.">
                {correctionRows.length ? (
                  <DonutChart
                    centerLabel="Requests"
                    labels={correctionRows.map(([name]) => name)}
                    series={correctionRows.map(([, value]) => value)}
                    colors={["#F59E0B", "#10B981", "#EF4444"]}
                    tooltipValue={correctionRows.map(([, value]) => `${value} requests`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No correction requests recorded yet.</div>
                )}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Seven-day attendance movement"
                subtitle="Daily on-time, late, and absent employee records across the latest week."
              >
                <ReactApexChart
                  type="bar"
                  height={310}
                  options={weeklyTrendOptions}
                  series={[
                    {
                      name: "On time",
                      data: dailyAttendance.map((day) => day.onTime),
                    },
                    {
                      name: "Late",
                      data: dailyAttendance.map((day) => day.late),
                    },
                    {
                      name: "Absent",
                      data: dailyAttendance.map((day) => day.absent),
                    },
                  ]}
                />
              </DashboardSection>

              <DashboardSection
                title="Today's department coverage"
                subtitle="Share of each department covered by attendance, leave, or holiday records."
              >
                {departmentCoverage.length ? (
                  <ReactApexChart
                    type="bar"
                    height={310}
                    options={departmentChartOptions}
                    series={[
                      {
                        name: "Coverage",
                        data: departmentCoverage.map((row) => row.coverage),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[310px] items-center justify-center text-[11px] text-slate-500">
                    No department attendance coverage is available for today.
                  </div>
                )}
              </DashboardSection>
            </div>

            <DashboardSection
              title="Attendance attention queue"
              subtitle="Today’s absences, late arrivals, and half-day records that may need HR attention."
              bodyClassName="p-0"
            >
              {attentionRecords.length ? (
                <div className="divide-y divide-slate-100">
                  {attentionRecords.map((record, index) => {
                    const status = normalize(record.status);
                    const isAbsent = status === "absent";
                    const isLate = Boolean(record.isLate) || status === "late";
                    const statusLabel = isAbsent ? "Absent" : isLate ? "Late arrival" : "Half day";
                    const statusClass = isAbsent
                      ? "bg-rose-50 text-rose-700"
                      : isLate
                        ? "bg-amber-50 text-amber-700"
                        : "bg-cyan-50 text-cyan-700";

                    return (
                      <div
                        key={record.id || record.recordId || index}
                        className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_180px_130px] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-pmedium text-slate-900">
                            {record.employeeName || record.name || "Employee"}
                          </p>
                          <p className="mt-1 truncate text-[9px] text-slate-500">
                            {record.department || "Not assigned"} · {record.shiftName || "Shift not assigned"}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          {record.checkIn ? `Checked in ${formatTime12h(record.checkIn)}` : "No check-in recorded"}
                        </p>
                        <div className="sm:text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[145px] items-center justify-center px-5 py-10 text-[11px] text-slate-500">
                  No attendance exceptions require attention today.
                </div>
              )}
            </DashboardSection>

            <div className="mt-4">
            <DashboardSection title="Recent attendance records" subtitle="Latest employee punches available to HR." bodyClassName="max-h-[420px] overflow-auto p-0">
              <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[26%] px-5 py-3 font-pmedium">Employee</th>
                    <th className="w-[18%] px-3 py-3 font-pmedium">Department</th>
                    <th className="w-[15%] px-3 py-3 font-pmedium">Date</th>
                    <th className="w-[14%] px-3 py-3 font-pmedium">Check In</th>
                    <th className="w-[14%] px-3 py-3 font-pmedium">Check Out</th>
                    <th className="w-[13%] px-3 py-3 text-center font-pmedium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRecords.length ? (
                    recentRecords.map((record, index) => (
                      <tr key={record.id || record.recordId || index} className="bg-white text-[11px] text-slate-600">
                        <td className="px-5 py-3">
                          <p className="truncate font-pmedium text-slate-900">{record.employeeName || record.name || "Employee"}</p>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400">{record.employeeId || record.employeeEmail || "Attendance record"}</p>
                        </td>
                        <td className="truncate px-3 py-3">{record.department || "Not assigned"}</td>
                        <td className="px-3 py-3">{formatDate(record.date)}</td>
                        <td className="px-3 py-3">{record.checkIn ? formatTime12h(record.checkIn) : "—"}</td>
                        <td className="px-3 py-3">{record.checkOut ? formatTime12h(record.checkOut) : "—"}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">{label(record.status)}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-[11px] text-slate-500">No attendance records available for today.</td></tr>
                  )}
                </tbody>
              </table>
            </DashboardSection>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
