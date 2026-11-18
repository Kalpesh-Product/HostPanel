import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ListChecks,
  ShieldCheck,
  Tags,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import leaveBannerImage from "@/assets/module-banners/leave-requests-banner.webp";
import {
  getHolidays,
  getLeaveQuotas,
  getLeaveRequests,
  getLeaveTypes,
} from "@/services/leave-requests";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";

type LeaveRecord = Record<string, any>;

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const titleCase = (value: unknown, fallback = "Leave") =>
  String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

const formatDate = (value: unknown) => {
  const key = dateKey(value);
  if (!key) return "—";
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const dateValue = (value: unknown) => {
  const key = dateKey(value);
  if (!key) return null;
  const date = new Date(`${key}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthKey = (value: unknown) => dateKey(value).slice(0, 7);

export default function HRLeaveRequestsProcessingWorkspaceDashboard() {
  const [requests, setRequests] = useState<LeaveRecord[]>([]);
  const [quotas, setQuotas] = useState<LeaveRecord[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveRecord[]>([]);
  const [holidays, setHolidays] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      getLeaveRequests(),
      getLeaveQuotas(),
      getLeaveTypes({ includeInactive: true }),
      getHolidays(),
    ]).then(([requestResult, quotaResult, typeResult, holidayResult]) => {
      if (cancelled) return;

      if (requestResult.status === "fulfilled") {
        const response = requestResult.value as any;
        const list = response?.data?.leaveRequests || response?.leaveRequests || [];
        setRequests(Array.isArray(list) ? list : []);
        setLoadError("");
      } else {
        setRequests([]);
        setLoadError("Leave processing data could not be refreshed just now.");
      }

      if (quotaResult.status === "fulfilled") {
        const response = quotaResult.value as any;
        const list = response?.data?.quotas || response?.quotas || [];
        setQuotas(Array.isArray(list) ? list : []);
      }
      if (typeResult.status === "fulfilled") {
        const response = typeResult.value as any;
        const payload = response?.data || response || {};
        setLeaveTypes(Array.isArray(payload?.leaveTypes) ? payload.leaveTypes : []);
      }
      if (holidayResult.status === "fulfilled") {
        const response = holidayResult.value as any;
        const list = response?.data?.holidays || response?.holidays || [];
        setHolidays(Array.isArray(list) ? list : []);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const statusCount = (status: string) =>
      requests.filter((request) => normalize(request.status) === status).length;
    const currentlyOnLeave = requests.filter((request) => {
      const status = normalize(request.status);
      const start = dateKey(request.startDate);
      const end = dateKey(request.endDate);
      return status === "approved" && start && end && start <= today && end >= today;
    }).length;
    const upcomingCalendarEntries = holidays.filter((entry) => {
      const entryDate = dateKey(entry.date);
      return entryDate && entryDate >= today && entry.isActive !== false;
    }).length;

    return {
      total: requests.length,
      pending: statusCount("pending"),
      approved: statusCount("approved"),
      rejected: statusCount("rejected"),
      currentlyOnLeave,
      activeLeaveTypes: leaveTypes.filter((type) => type.isActive !== false).length,
      quotas: quotas.length,
      upcomingCalendarEntries,
    };
  }, [holidays, leaveTypes, quotas.length, requests]);

  const statusRows = useMemo(
    () =>
      [
        ["Pending", stats.pending],
        ["Approved", stats.approved],
        ["Rejected", stats.rejected],
      ].filter(([, value]) => Number(value) > 0) as Array<[string, number]>,
    [stats.approved, stats.pending, stats.rejected],
  );

  const leaveTypeRows = useMemo(() => {
    const groups = new Map<string, number>();
    requests.forEach((request) => {
      const key = titleCase(request.leaveType || request.type, "Other Leave");
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [requests]);

  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        submitted: 0,
        approved: 0,
      };
    });
    const byMonth = new Map(months.map((month) => [month.key, month]));

    requests.forEach((request) => {
      const submittedMonth = byMonth.get(monthKey(request.createdAt));
      if (submittedMonth) submittedMonth.submitted += 1;

      if (normalize(request.status) === "approved") {
        const approvedMonth = byMonth.get(
          monthKey(request.actionedAt || request.updatedAt || request.createdAt),
        );
        if (approvedMonth) approvedMonth.approved += 1;
      }
    });

    return months;
  }, [requests]);

  const leaveDayDemand = useMemo(() => {
    const groups = new Map<string, number>();
    requests.forEach((request) => {
      const type = titleCase(request.leaveType || request.type, "Other Leave");
      groups.set(type, (groups.get(type) || 0) + Math.max(0, Number(request.days || 0)));
    });
    return [...groups.entries()]
      .map(([type, days]) => ({ type, days: Number(days.toFixed(1)) }))
      .sort((left, right) => right.days - left.days)
      .slice(0, 8);
  }, [requests]);

  const upcomingAbsences = useMemo(() => {
    const today = dateKey(new Date());
    return requests
      .filter((request) => {
        const status = normalize(request.status);
        const end = dateKey(request.endDate);
        return status === "approved" && end && end >= today;
      })
      .sort(
        (left, right) =>
          Number(dateValue(left.startDate)) - Number(dateValue(right.startDate)),
      )
      .slice(0, 6);
  }, [requests]);

  const activityChartOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "Poppins, sans-serif",
      },
      colors: ["#2563EB", "#10B981"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" as const, width: 3 },
      fill: {
        type: "gradient",
        gradient: { opacityFrom: 0.26, opacityTo: 0.04, stops: [0, 95, 100] },
      },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      legend: { position: "top" as const, horizontalAlign: "right" as const },
      xaxis: {
        categories: monthlyActivity.map((month) => month.label),
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
    [monthlyActivity],
  );

  const leaveDemandChartOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
      colors: ["#2563EB"],
      plotOptions: {
        bar: { horizontal: true, borderRadius: 5, barHeight: "48%" },
      },
      dataLabels: {
        enabled: true,
        offsetX: 14,
        formatter: (value: number) => `${value}d`,
        style: { colors: ["#475569"], fontSize: "10px", fontWeight: 500 },
      },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      xaxis: {
        categories: leaveDayDemand.map((row) => row.type),
        min: 0,
        labels: { style: { colors: "#64748B", fontSize: "10px" } },
      },
      yaxis: { labels: { maxWidth: 135, style: { colors: "#475569", fontSize: "10px" } } },
      tooltip: { y: { formatter: (value: number) => `${value} leave days requested` } },
    }),
    [leaveDayDemand],
  );

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort(
          (left, right) =>
            new Date(right.createdAt || right.updatedAt || right.startDate || 0).getTime() -
            new Date(left.createdAt || left.updatedAt || left.startDate || 0).getTime(),
        )
        .slice(0, 10),
    [requests],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Leave Request Processing"
          description="A live HR view of leave requests, employees currently away, leave policies, quota coverage, and the company calendar."
          tags={["Requests", "Approvals", "Quotas", "Calendar"]}
          image={leaveBannerImage}
          moduleCount={5}
        />

        {loadError && !isLoading ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">{loadError}</div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile icon={<ListChecks size={20} />} label="Total Requests" value={stats.total} sub="Leave requests in the HR queue" tone="blue" />
            <DashboardStatTile icon={<Clock3 size={20} />} label="Pending" value={stats.pending} sub="Requests awaiting HR action" tone="amber" />
            <DashboardStatTile icon={<CheckCircle2 size={20} />} label="Approved" value={stats.approved} sub="Approved leave requests" tone="green" />
            <DashboardStatTile icon={<XCircle size={20} />} label="Rejected" value={stats.rejected} sub="Rejected leave requests" tone="rose" />
            <DashboardStatTile icon={<UserCheck size={20} />} label="Currently On Leave" value={stats.currentlyOnLeave} sub="Approved leave active today" tone="cyan" />
            <DashboardStatTile icon={<Tags size={20} />} label="Leave Types" value={stats.activeLeaveTypes} sub="Active leave types in the master" tone="violet" />
            <DashboardStatTile icon={<Users size={20} />} label="Quota Records" value={stats.quotas} sub="Employee leave quota records" tone="slate" />
            <DashboardStatTile icon={<CalendarDays size={20} />} label="Upcoming Calendar" value={stats.upcomingCalendarEntries} sub="Upcoming holidays and events" tone="green" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Leave processing modules</p>
          <p className="mt-1 text-[10px] text-slate-500">Open the exact leave-processing workspace required for the current task.</p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <DashboardModuleCard icon={<ListChecks size={19} />} title="Leave Requests" route="/department-accesses/hr-department/leave-request-processing/requests" description="Review, approve, reject, and export employee leave requests" color="#2563EB" />
            <DashboardModuleCard icon={<UserCheck size={19} />} title="Currently On Leave" route="/department-accesses/hr-department/leave-request-processing/current" description="See employees whose approved leave is active today" color="#0D9488" />
            <DashboardModuleCard icon={<ShieldCheck size={19} />} title="Leave Master" route="/department-accesses/hr-department/leave-request-processing/master" description="Configure leave types and leave-policy definitions" color="#7C3AED" />
            <DashboardModuleCard icon={<CircleDashed size={19} />} title="Leave Quotas" route="/department-accesses/hr-department/leave-request-processing/quotas" description="Assign leave types, balances, cycles, and carry-forward rules" color="#EA580C" />
            <DashboardModuleCard icon={<CalendarCheck size={19} />} title="Holidays & Events" route="/department-accesses/hr-department/leave-request-processing/holidays" description="Manage company holidays, public holidays, and calendar events" color="#0891B2" />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection title="Request status" subtitle="Current leave-request outcome and approval mix.">
                {statusRows.length ? <DonutChart centerLabel="Requests" labels={statusRows.map(([name]) => name)} series={statusRows.map(([, value]) => value)} colors={["#F59E0B", "#10B981", "#EF4444"]} tooltipValue={statusRows.map(([, value]) => `${value} requests`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No leave requests recorded yet.</div>}
              </DashboardSection>
              <DashboardSection title="Requests by leave type" subtitle="Leave demand grouped by the selected leave category.">
                {leaveTypeRows.length ? <DonutChart centerLabel="Requests" labels={leaveTypeRows.map(([name]) => name)} series={leaveTypeRows.map(([, value]) => value)} colors={["#2563EB", "#0D9488", "#7C3AED", "#F59E0B", "#06B6D4", "#EF4444"]} tooltipValue={leaveTypeRows.map(([, value]) => `${value} requests`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No leave-type activity recorded yet.</div>}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Six-month leave activity"
                subtitle="Leave requests submitted versus requests approved each month."
              >
                <ReactApexChart
                  type="area"
                  height={310}
                  options={activityChartOptions}
                  series={[
                    {
                      name: "Requests submitted",
                      data: monthlyActivity.map((month) => month.submitted),
                    },
                    {
                      name: "Requests approved",
                      data: monthlyActivity.map((month) => month.approved),
                    },
                  ]}
                />
              </DashboardSection>

              <DashboardSection
                title="Leave-day demand by type"
                subtitle="Total requested days grouped by leave type, regardless of outcome."
              >
                {leaveDayDemand.length ? (
                  <ReactApexChart
                    type="bar"
                    height={310}
                    options={leaveDemandChartOptions}
                    series={[
                      {
                        name: "Requested days",
                        data: leaveDayDemand.map((row) => row.days),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[310px] items-center justify-center text-[11px] text-slate-500">
                    No leave-day demand is available yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <DashboardSection
              title="Upcoming absence coverage"
              subtitle="Approved current and upcoming leave periods that may affect team availability."
              bodyClassName="p-0"
            >
              {upcomingAbsences.length ? (
                <div className="divide-y divide-slate-100">
                  {upcomingAbsences.map((request, index) => {
                    const today = dateKey(new Date());
                    const start = dateKey(request.startDate);
                    const end = dateKey(request.endDate);
                    const isActive = start <= today && end >= today;

                    return (
                      <div
                        key={request.recordId || request._id || request.id || index}
                        className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_180px_210px_110px] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-pmedium text-slate-900">
                            {request.employeeName || request.name || "Employee"}
                          </p>
                          <p className="mt-1 truncate text-[9px] text-slate-500">
                            {request.department || "Not assigned"} · {request.employeeId || request.leaveCode || "Leave request"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.06em] text-slate-400">Leave type</p>
                          <p className="mt-1 truncate text-[10px] font-pmedium text-slate-700">
                            {titleCase(request.leaveType || request.type)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.06em] text-slate-400">Approved period</p>
                          <p className="mt-1 text-[10px] font-pmedium text-slate-700">
                            {formatDate(request.startDate)} – {formatDate(request.endDate)}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase ${isActive ? "bg-cyan-50 text-cyan-700" : "bg-blue-50 text-blue-700"}`}>
                            {isActive ? "On leave" : `${Number(request.days || 0)} days`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[145px] items-center justify-center px-5 py-10 text-[11px] text-slate-500">
                  No approved current or upcoming leave periods are scheduled.
                </div>
              )}
            </DashboardSection>

            <div className="mt-4">
            <DashboardSection title="Recent leave requests" subtitle="Latest employee requests received by HR." bodyClassName="max-h-[420px] overflow-auto p-0">
              <table className="w-full min-w-[840px] table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-[25%] px-5 py-3 font-pmedium">Employee</th><th className="w-[18%] px-3 py-3 font-pmedium">Department</th><th className="w-[17%] px-3 py-3 font-pmedium">Leave Type</th><th className="w-[20%] px-3 py-3 font-pmedium">Period</th><th className="w-[8%] px-3 py-3 text-center font-pmedium">Days</th><th className="w-[12%] px-3 py-3 text-center font-pmedium">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRequests.length ? recentRequests.map((request, index) => <tr key={request.recordId || request._id || request.id || index} className="bg-white text-[11px] text-slate-600"><td className="px-5 py-3"><p className="truncate font-pmedium text-slate-900">{request.employeeName || request.name || "Employee"}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{request.employeeId || request.leaveCode || "Leave request"}</p></td><td className="truncate px-3 py-3">{request.department || (Array.isArray(request.departments) ? request.departments.join(" / ") : "Not assigned")}</td><td className="truncate px-3 py-3">{titleCase(request.leaveType || request.type)}</td><td className="px-3 py-3">{formatDate(request.startDate)} – {formatDate(request.endDate)}</td><td className="px-3 py-3 text-center">{Number(request.days || 0)}</td><td className="px-3 py-3 text-center"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">{titleCase(request.status, "Pending")}</span></td></tr>) : <tr><td colSpan={6} className="px-5 py-12 text-center text-[11px] text-slate-500">No leave requests recorded yet.</td></tr>}
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
