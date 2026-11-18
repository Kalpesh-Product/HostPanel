import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Clock3,
  ListChecks,
  LogOut,
  ShieldCheck,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import resignationBannerImage from "@/assets/resignation-management-dashboard-banner.png";
import { getResignationRequests } from "@/services/resignation-management";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";

type ResignationRecord = Record<string, any>;

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const titleCase = (value: unknown, fallback = "Pending") =>
  String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const dateValue = (value: unknown) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthKey = (value: unknown) => {
  const date = dateValue(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export default function HRResignationManagementWorkspaceDashboard() {
  const [requests, setRequests] = useState<ResignationRecord[]>([]);
  const [activeNotice, setActiveNotice] = useState<ResignationRecord[]>([]);
  const [history, setHistory] = useState<ResignationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getResignationRequests()
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data || response || {};
        setRequests(Array.isArray(payload.exitRequests) ? payload.exitRequests : []);
        setActiveNotice(Array.isArray(payload.activeNoticeRequests) ? payload.activeNoticeRequests : []);
        setHistory(Array.isArray(payload.historyRequests) ? payload.historyRequests : []);
        setLoadError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setRequests([]);
        setActiveNotice([]);
        setHistory([]);
        setLoadError(error?.message || "Resignation management data could not be refreshed just now.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const statusCount = (status: string) =>
      requests.filter((request) => normalize(request.status) === status).length;
    const readyToComplete = activeNotice.filter((request) => Boolean(request.canComplete)).length;
    const checklistItems = activeNotice.flatMap((request) =>
      Array.isArray(request.checklist) ? request.checklist : [],
    );
    const completedChecklistItems = checklistItems.filter((item) => Boolean(item.completed)).length;

    return {
      total: requests.length,
      pending: statusCount("pending"),
      activeNotice: activeNotice.length,
      readyToComplete,
      completed: history.filter((request) => normalize(request.status) === "completed").length,
      rejected: history.filter((request) => normalize(request.status) === "rejected").length,
      checklistItems: checklistItems.length,
      completedChecklistItems,
    };
  }, [activeNotice, history, requests]);

  const statusRows = useMemo(
    () =>
      [
        ["Pending", stats.pending],
        ["Active Notice", stats.activeNotice],
        ["Completed", stats.completed],
        ["Rejected", stats.rejected],
      ].filter(([, value]) => Number(value) > 0) as Array<[string, number]>,
    [stats.activeNotice, stats.completed, stats.pending, stats.rejected],
  );

  const departmentRows = useMemo(() => {
    const groups = new Map<string, number>();
    requests.forEach((request) => {
      const key = String(request.department || "Not assigned");
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
        completed: 0,
      };
    });
    const byMonth = new Map(months.map((month) => [month.key, month]));

    requests.forEach((request) => {
      const month = byMonth.get(monthKey(request.createdAt));
      if (month) month.submitted += 1;
    });
    history.forEach((request) => {
      if (normalize(request.status) !== "completed") return;
      const month = byMonth.get(monthKey(request.completedAt || request.updatedAt));
      if (month) month.completed += 1;
    });

    return months;
  }, [history, requests]);

  const checklistProgressRows = useMemo(
    () =>
      [...activeNotice]
        .map((request) => ({
          employee: String(request.employeeName || request.employeeId || "Employee"),
          progress: Math.max(0, Math.min(100, Number(request.checklistProgress || 0))),
        }))
        .sort((left, right) => right.progress - left.progress)
        .slice(0, 8),
    [activeNotice],
  );

  const upcomingExits = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activeNotice
      .map((request) => ({
        request,
        exitDate: dateValue(
          request.noticeEndAt || request.noticeEndDate || request.expectedLastWorkingDate,
        ),
      }))
      .filter(({ exitDate }) => exitDate && exitDate >= today)
      .sort((left, right) => Number(left.exitDate) - Number(right.exitDate))
      .slice(0, 6);
  }, [activeNotice]);

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

  const checklistChartOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" },
      colors: ["#2563EB"],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          barHeight: "48%",
          dataLabels: { position: "top" as const },
        },
      },
      dataLabels: {
        enabled: true,
        offsetX: 22,
        formatter: (value: number) => `${Math.round(value)}%`,
        style: { colors: ["#475569"], fontSize: "10px", fontWeight: 500 },
      },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
      xaxis: {
        categories: checklistProgressRows.map((row) => row.employee),
        min: 0,
        max: 100,
        tickAmount: 4,
        labels: {
          style: { colors: "#64748B", fontSize: "10px" },
          formatter: (value: string) => `${Math.round(Number(value))}%`,
        },
      },
      yaxis: { labels: { maxWidth: 135, style: { colors: "#475569", fontSize: "10px" } } },
      tooltip: { y: { formatter: (value: number) => `${Math.round(value)}% completed` } },
    }),
    [checklistProgressRows],
  );

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort(
          (left, right) =>
            new Date(right.createdAt || right.updatedAt || 0).getTime() -
            new Date(left.createdAt || left.updatedAt || 0).getTime(),
        )
        .slice(0, 10),
    [requests],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Resignation Management"
          description="A live offboarding view across resignation requests, active notice periods, checklist progress, and completed employee exits."
          tags={["Requests", "Notice Period", "Handover", "History"]}
          image={resignationBannerImage}
          moduleCount={3}
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
            <DashboardStatTile icon={<ListChecks size={20} />} label="Total Requests" value={stats.total} sub="Resignation requests received" tone="blue" />
            <DashboardStatTile icon={<Clock3 size={20} />} label="Pending Review" value={stats.pending} sub="Requests awaiting HR action" tone="amber" />
            <DashboardStatTile icon={<UserMinus size={20} />} label="Active Notice" value={stats.activeNotice} sub="Employees serving notice" tone="cyan" />
            <DashboardStatTile icon={<CheckSquare size={20} />} label="Ready To Complete" value={stats.readyToComplete} sub="Offboarding checklists completed" tone="green" />
            <DashboardStatTile icon={<CheckCircle2 size={20} />} label="Completed Exits" value={stats.completed} sub="Completed resignation workflows" tone="green" />
            <DashboardStatTile icon={<XCircle size={20} />} label="Rejected" value={stats.rejected} sub="Rejected resignation requests" tone="rose" />
            <DashboardStatTile icon={<ShieldCheck size={20} />} label="Checklist Items" value={stats.checklistItems} sub="Handover and clearance requirements" tone="violet" />
            <DashboardStatTile icon={<Archive size={20} />} label="Checklist Completed" value={stats.completedChecklistItems} sub="Completed offboarding requirements" tone="slate" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Resignation management modules</p>
          <p className="mt-1 text-[10px] text-slate-500">Open the request queue, active notice workflow, or historical exit records directly.</p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DashboardModuleCard icon={<LogOut size={19} />} title="Resignation Requests" route="/department-accesses/hr-department/resignation-management/requests" description="Review, approve, or reject newly submitted resignation requests" color="#2563EB" />
            <DashboardModuleCard icon={<Clock3 size={19} />} title="Active Notice" route="/department-accesses/hr-department/resignation-management/notice" description="Manage notice periods, handover checklists, extensions, and completion" color="#EA580C" />
            <DashboardModuleCard icon={<Archive size={19} />} title="Resignation History" route="/department-accesses/hr-department/resignation-management/history" description="Review completed and rejected resignation records" color="#7C3AED" />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection title="Workflow status" subtitle="Current resignation-request and offboarding outcome mix.">
                {statusRows.length ? <DonutChart centerLabel="Requests" labels={statusRows.map(([name]) => name)} series={statusRows.map(([, value]) => value)} colors={["#F59E0B", "#06B6D4", "#10B981", "#EF4444"]} tooltipValue={statusRows.map(([, value]) => `${value} requests`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No resignation activity recorded yet.</div>}
              </DashboardSection>
              <DashboardSection title="Requests by department" subtitle="Resignation requests grouped by employee department.">
                {departmentRows.length ? <DonutChart centerLabel="Requests" labels={departmentRows.map(([name]) => name)} series={departmentRows.map(([, value]) => value)} colors={["#2563EB", "#0D9488", "#7C3AED", "#F59E0B", "#EF4444", "#94A3B8"]} tooltipValue={departmentRows.map(([, value]) => `${value} requests`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No department resignation data recorded yet.</div>}
              </DashboardSection>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardSection
                title="Six-month resignation activity"
                subtitle="Requests submitted versus offboarding workflows completed each month."
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
                      name: "Exits completed",
                      data: monthlyActivity.map((month) => month.completed),
                    },
                  ]}
                />
              </DashboardSection>

              <DashboardSection
                title="Active handover progress"
                subtitle="Checklist completion for employees currently serving notice."
              >
                {checklistProgressRows.length ? (
                  <ReactApexChart
                    type="bar"
                    height={310}
                    options={checklistChartOptions}
                    series={[
                      {
                        name: "Checklist completed",
                        data: checklistProgressRows.map((row) => row.progress),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[310px] items-center justify-center text-[11px] text-slate-500">
                    No active handover checklist data recorded yet.
                  </div>
                )}
              </DashboardSection>
            </div>

            <DashboardSection
              title="Notice-period outlook"
              subtitle="Upcoming last working days and the readiness of each active handover."
              bodyClassName="p-0"
            >
              {upcomingExits.length ? (
                <div className="divide-y divide-slate-100">
                  {upcomingExits.map(({ request, exitDate }, index) => {
                    const progress = Math.max(
                      0,
                      Math.min(100, Number(request.checklistProgress || 0)),
                    );
                    const daysRemaining = Math.max(
                      0,
                      Math.ceil((Number(exitDate) - Date.now()) / 86400000),
                    );

                    return (
                      <div
                        key={request.id || request.recordId || index}
                        className="grid gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 md:grid-cols-[minmax(0,1.1fr)_minmax(220px,1fr)_170px] md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-pmedium text-slate-900">
                            {request.employeeName || "Employee"}
                          </p>
                          <p className="mt-1 truncate text-[9px] text-slate-500">
                            {request.department || "Not assigned"} · {request.exitCode || "Active notice"}
                          </p>
                        </div>

                        <div>
                          <div className="mb-1.5 flex items-center justify-between text-[9px] text-slate-500">
                            <span>Handover checklist</span>
                            <span className="font-pmedium text-slate-700">{progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress === 100 ? "bg-emerald-500" : "bg-[#2563EB]"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 md:justify-end">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                            <CalendarClock size={17} />
                          </div>
                          <div>
                            <p className="text-[10px] font-pmedium text-slate-800">
                              {formatDate(exitDate)}
                            </p>
                            <p className="mt-0.5 text-[9px] text-slate-500">
                              {daysRemaining === 0 ? "Due today" : `${daysRemaining} days remaining`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[150px] items-center justify-center px-5 py-10 text-[11px] text-slate-500">
                  No upcoming last working days are currently scheduled.
                </div>
              )}
            </DashboardSection>

            <div className="mt-4">
            <DashboardSection title="Recent resignation requests" subtitle="Latest employee offboarding requests received by HR." bodyClassName="max-h-[420px] overflow-auto p-0">
              <table className="w-full min-w-[840px] table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-[25%] px-5 py-3 font-pmedium">Employee</th><th className="w-[18%] px-3 py-3 font-pmedium">Department</th><th className="w-[16%] px-3 py-3 font-pmedium">Exit Code</th><th className="w-[17%] px-3 py-3 font-pmedium">Requested</th><th className="w-[14%] px-3 py-3 font-pmedium">Last Working Day</th><th className="w-[10%] px-3 py-3 text-center font-pmedium">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRequests.length ? recentRequests.map((request, index) => <tr key={request.id || request.recordId || index} className="bg-white text-[11px] text-slate-600"><td className="px-5 py-3"><p className="truncate font-pmedium text-slate-900">{request.employeeName || "Employee"}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{request.employeeId || request.email || "Employee record"}</p></td><td className="truncate px-3 py-3">{request.department || "Not assigned"}</td><td className="truncate px-3 py-3">{request.exitCode || "—"}</td><td className="px-3 py-3">{formatDate(request.createdAt)}</td><td className="px-3 py-3">{formatDate(request.expectedLastWorkingDate || request.noticeEndDate || request.noticeEndAt)}</td><td className="px-3 py-3 text-center"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">{titleCase(request.statusLabel || request.status)}</span></td></tr>) : <tr><td colSpan={6} className="px-5 py-12 text-center text-[11px] text-slate-500">No resignation requests recorded yet.</td></tr>}
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
