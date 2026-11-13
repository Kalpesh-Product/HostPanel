import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import leaveBannerImage from "../../assets/module-banners/leave-requests-banner.webp";
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
import { getLeaveRequests } from "../../services/leave-requests";
import { extractDepartmentLabel } from "../../utils/user-helpers";

type LeaveRecord = Record<string, any>;
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

const dateKey = (value: unknown) => String(value || "").slice(0, 10);

const formatDate = (value: unknown) => {
  const text = dateKey(value);
  const date = new Date(text ? `${text}T12:00:00` : "");
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const requestDate = (record: LeaveRecord) =>
  record.createdAt || record.requestedAt || record.startDate;

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

export default function LeaveRequestsDashboard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<
    Record<string, { total?: number; used?: number; remaining?: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const user = useMemo(() => getStoredUser(), []);
  const role = normalize(user?.workspaceMembership?.role || user?.role);
  const departments = useMemo(
    () =>
      [
        ...(Array.isArray(user?.workspaceMembership?.departments)
          ? user.workspaceMembership.departments
          : []),
        user?.workspaceMembership?.department,
        user?.department,
        user?.workspace?.department,
      ]
        .map(extractDepartmentLabel)
        .filter(Boolean),
    [user],
  );
  const isOwner = role === "owner" || role === "founder";
  const isSuperAdmin = role === "super_admin";
  const isAdmin =
    canAccessAdminDashboard(user) ||
    role === "admin" ||
    role === "admin_manager";
  const canApprove =
    isOwner ||
    isSuperAdmin ||
    isAdmin ||
    role === "manager" ||
    role.endsWith("_manager") ||
    canAccessHRDashboard(user) ||
    canAccessAdministrationDashboard(user) ||
    canAccessSalesDashboard(user) ||
    canAccessFinanceDashboard(user) ||
    canAccessTechDashboard(user) ||
    canAccessITDashboard(user) ||
    canAccessMaintenanceDashboard(user);
  const canSeeAssignedDepartments = isAdmin && departments.length > 0;
  const canSeeCompany = isOwner || isSuperAdmin;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getLeaveRequests()
      .then((response) => {
        if (cancelled) return;
        const data = response?.data || response || {};
        setRecords(Array.isArray(data.leaveRequests) ? data.leaveRequests : []);
        setLeaveBalances(data.leaveBalances?.balances || {});
        setLoadError("");
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([]);
          setLeaveBalances({});
          setLoadError("Leave request data could not be refreshed just now.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentUserId = String(user?.id || user?._id || "");
  const currentUserName = String(user?.fullName || user?.name || "")
    .trim()
    .toLowerCase();

  const isMine = (record: LeaveRecord) =>
    record.isMe === true ||
    (currentUserId && String(record.requesterUserId || "") === currentUserId) ||
    (currentUserName &&
      String(record.employeeName || "")
        .trim()
        .toLowerCase() === currentUserName);

  const stats = useMemo(() => {
    const countStatus = (status: string) =>
      records.filter((record) => normalize(record.status) === status).length;
    const approved = records.filter(
      (record) => normalize(record.status) === "approved",
    );
    const availableBalance = Object.values(leaveBalances).reduce(
      (sum, balance) => sum + Math.max(0, Number(balance?.remaining || 0)),
      0,
    );

    return {
      total: records.length,
      pending: countStatus("pending"),
      approved: approved.length,
      rejected: countStatus("rejected"),
      onLeaveToday: approved.filter(
        (record) =>
          dateKey(record.startDate) <= todayKey &&
          dateKey(record.endDate || record.startDate) >= todayKey,
      ).length,
      upcoming: approved.filter(
        (record) => dateKey(record.startDate) > todayKey,
      ).length,
      approvedDays: approved.reduce(
        (sum, record) => sum + Math.max(0, Number(record.days || 0)),
        0,
      ),
      availableBalance,
    };
  }, [leaveBalances, records, todayKey]);

  const statusBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    records.forEach((record) => {
      const label = readable(record.status, "Pending");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [records]);

  const typeBreakdown = useMemo(() => {
    const groups = new Map<string, number>();
    records.forEach((record) => {
      const label = readable(record.leaveType, "Leave");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [records]);

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        anchor.getFullYear(),
        anchor.getMonth() - (11 - index),
        1,
      );
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const monthlyTrend = useMemo(() => {
    const anchor = new Date();
    const submitted = new Array(12).fill(0);
    const approved = new Array(12).fill(0);
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

    records.forEach((record) => {
      const submittedIndex = monthIndex(requestDate(record));
      if (submittedIndex >= 0) submitted[submittedIndex] += 1;
      if (normalize(record.status) === "approved") {
        const approvedIndex = monthIndex(
          record.actionedAt || requestDate(record),
        );
        if (approvedIndex >= 0) approved[approvedIndex] += 1;
      }
    });
    return { submitted, approved };
  }, [records]);

  const departmentBreakdown = useMemo(() => {
    const groups = new Map<string, { requested: number; approved: number }>();
    records.forEach((record) => {
      const department = readable(record.department, "Unassigned");
      const entry = groups.get(department) || { requested: 0, approved: 0 };
      entry.requested += Number(record.days || 0);
      if (normalize(record.status) === "approved")
        entry.approved += Number(record.days || 0);
      groups.set(department, entry);
    });
    return [...groups.entries()]
      .sort((left, right) => right[1].requested - left[1].requested)
      .slice(0, 8);
  }, [records]);

  const recentRecords = useMemo(
    () =>
      [...records]
        .sort(
          (left, right) =>
            new Date(requestDate(right) || 0).getTime() -
            new Date(requestDate(left) || 0).getTime(),
        )
        .slice(0, 10),
    [records],
  );

  const modules = [
    {
      id: "my-leaves",
      label: "My Leaves",
      icon: Send,
      route: "/common-modules/leave-requests/my-leaves",
      description:
        "Apply for leave and track your balances and request history",
      color: "#2563EB",
      enabled: true,
    },
    {
      id: "leave-requests",
      label: "Approval Queue",
      icon: ShieldCheck,
      route: "/common-modules/leave-requests/approval-queue",
      description: "Review pending requests routed to your approval chain",
      color: "#059669",
      enabled: canApprove,
    },
    {
      id: "assigned-dept-leaves",
      label: "Assigned Department Leaves",
      icon: Users,
      route: "/common-modules/leave-requests/assigned-department-leaves",
      description: "Monitor leave activity across your assigned departments",
      color: "#EA580C",
      enabled: canSeeAssignedDepartments,
    },
    {
      id: "company-leaves",
      label: "Company Leaves",
      icon: Building2,
      route: "/common-modules/leave-requests/company-leaves",
      description: "Review company-wide leave records and workforce impact",
      color: "#7C3AED",
      enabled: canSeeCompany,
    },
  ].filter((module) => module.enabled);

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB", "#10B981"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const departmentOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: departmentBreakdown.map(([label]) => label) },
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
              src={leaveBannerImage}
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
                <span className="text-primary">Leave Requests</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">
                Live leave balances, approval workload, workforce availability,
                and request outcomes for the current workspace.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Requests", "Approvals", "Balances", "Availability"].map(
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
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                Pending action
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {stats.pending}
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
              icon={<CalendarClock size={20} />}
              label="Total requests"
              value={stats.total}
              sub="All requests visible to your role"
              tone="blue"
            />
            <StatTile
              icon={<Clock3 size={20} />}
              label="Pending"
              value={stats.pending}
              sub="Requests awaiting approval action"
              tone="amber"
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Approved"
              value={stats.approved}
              sub="Requests approved in the current data"
              tone="green"
            />
            <StatTile
              icon={<XCircle size={20} />}
              label="Rejected"
              value={stats.rejected}
              sub="Requests declined by the approval chain"
              tone="rose"
            />
            <StatTile
              icon={<UserCheck size={20} />}
              label="On leave today"
              value={stats.onLeaveToday}
              sub="Approved leave active today"
              tone="violet"
            />
            <StatTile
              icon={<CalendarCheck size={20} />}
              label="Upcoming leave"
              value={stats.upcoming}
              sub="Approved leave beginning after today"
              tone="blue"
            />
            <StatTile
              icon={<FileCheck2 size={20} />}
              label="Approved days"
              value={stats.approvedDays.toFixed(1)}
              sub="Total approved leave days represented"
              tone="green"
            />
            <StatTile
              icon={<AlertCircle size={20} />}
              label="My available balance"
              value={stats.availableBalance.toFixed(1)}
              sub="Remaining configured leave balance"
              tone="amber"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Manage leave requests
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the leave views available for your role and approval scope.
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
                    fromSection: "leave-requests-dashboard",
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
                title="Leave request trend"
                subtitle="Requests submitted versus approved across the last 12 calendar months."
              >
                {records.length ? (
                  <GroupedBarGraph
                    options={trendOptions}
                    series={[
                      { name: "Submitted", data: monthlyTrend.submitted },
                      { name: "Approved", data: monthlyTrend.approved },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No leave activity recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Request status"
                subtitle="Current requests grouped by approval outcome."
              >
                {statusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Requests"
                    labels={statusBreakdown.map(([label]) => label)}
                    series={statusBreakdown.map(([, value]) => value)}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No request statuses available yet.
                  </div>
                )}
              </SectionCard>
              <SectionCard
                title="Leave type mix"
                subtitle="Leave demand grouped by configured leave type."
              >
                {typeBreakdown.length ? (
                  <DonutChart
                    centerLabel="Leave types"
                    labels={typeBreakdown.map(([label]) => label)}
                    series={typeBreakdown.map(([, value]) => value)}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No leave type data available yet.
                  </div>
                )}
              </SectionCard>
            </div>

            {canApprove ? (
              <div className="mb-4">
                <SectionCard
                  title="Leave impact by department"
                  subtitle="Requested leave days compared with approved days across departments."
                >
                  {departmentBreakdown.length ? (
                    <GroupedBarGraph
                      options={departmentOptions}
                      series={[
                        {
                          name: "Requested days",
                          data: departmentBreakdown.map(
                            ([, values]) => values.requested,
                          ),
                        },
                        {
                          name: "Approved days",
                          data: departmentBreakdown.map(
                            ([, values]) => values.approved,
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                      No department leave data available yet.
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            <SectionCard
              title="Recent leave requests"
              subtitle="Latest request activity with employee, dates, duration, type, and approval status."
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <th className="px-5 py-3.5">Employee</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Leave type</th>
                      <th className="px-5 py-3.5">From</th>
                      <th className="px-5 py-3.5">To</th>
                      <th className="px-5 py-3.5">Days</th>
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
                              `${record.employeeName}-${dateKey(record.startDate)}-${index}`,
                          )}
                          className="border-b border-slate-100 text-[11px] last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-5 py-3.5 font-pmedium text-slate-900">
                            {record.employeeName || "Employee"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {readable(record.department, "Unassigned")}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {readable(record.leaveType, "Leave")}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatDate(record.startDate)}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatDate(record.endDate || record.startDate)}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {Number(record.days || 0).toFixed(1)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium ${statusPillClass(record.status)}`}
                            >
                              {readable(record.status, "Pending")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              title="Open leave request"
                              onClick={() =>
                                navigate(
                                  canApprove && !isMine(record)
                                    ? "/common-modules/leave-requests/approval-queue"
                                    : "/common-modules/leave-requests/my-leaves",
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
                          colSpan={8}
                          className="px-5 py-12 text-center text-[11px] text-slate-500"
                        >
                          No leave requests available yet.
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
