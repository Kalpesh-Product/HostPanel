/**
 * EmployeeDashboardOverview — shown to plain employees (not a department
 * manager, not owner/super_admin). Follows the same visual language as the
 * plan-wise dashboards: a greeting banner, today's attendance as the hero
 * card, a personal "My Pulse" metric row, quick actions, and the employee's
 * own tasks/tickets below.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListChecks,
  Ticket,
  CalendarClock,
  MessageSquareCode,
  Calendar,
  CalendarDays,
  Package,
  Activity,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  PlanBadge,
  MetricTile,
  QuickActionTile,
  ActivityPanel,
  EmptyState,
  RecentItem,
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import TodayAttendanceCard from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import { getTasks } from "@/services/tasks";
import { getTickets } from "@/services/tickets";
import { getLeaveRequests } from "@/services/leave-requests";
import { getAssets } from "@/services/assets";
import { getMyBookings } from "@/services/meeting-room-bookings";
import { getMyCalendar } from "@/services/calendar";

/* ───────────────────────────── Types ───────────────────────────── */

interface TaskRecord {
  id?: string;
  _id?: string;
  title?: string;
  department?: string;
  assignee?: string;
  assigneeUserId?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
}

interface TicketRecord {
  id?: string;
  _id?: string;
  title?: string;
  subject?: string;
  category?: string;
  issueType?: string;
  assignedTo?: string;
  assigneeUserId?: string;
  status?: string;
  createdAt?: string;
}

interface LeaveRequestRecord {
  id?: string;
  recordId?: string;
  employeeName?: string;
  name?: string;
  leaveType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AssetRecord {
  id?: string;
  recordId?: string;
  _id?: string;
  name?: string;
  assignedTo?: string;
  assignedToUserId?: { _id?: string } | string | null;
  allocations?: Array<{ userId?: string | null; quantity?: number }>;
}

interface BookingRecord {
  id?: string;
  _id?: string;
  date?: string;
  status?: string;
}

interface CalendarEventRecord {
  id?: string;
  date?: string;
  type?: string;
}

interface DashboardState {
  tasks: TaskRecord[];
  tickets: TicketRecord[];
  leaveRequests: LeaveRequestRecord[];
  assets: AssetRecord[];
  bookings: BookingRecord[];
  calendarEvents: CalendarEventRecord[];
}

const DEFAULT_DASHBOARD: DashboardState = {
  tasks: [],
  tickets: [],
  leaveRequests: [],
  assets: [],
  bookings: [],
  calendarEvents: [],
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function ticketTitle(ticket: TicketRecord): string {
  return ticket.title || ticket.subject || "Ticket";
}

function ticketCategory(ticket: TicketRecord): string {
  return ticket.category || ticket.issueType || "Support";
}

/* ───────────────────────────── Component ───────────────────────────── */

const WorkspaceClock = ({ timezone, location }: { timezone: string; location: string }) => {
  const [tick, setTick] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(tick);
    } catch {
      return "";
    }
  }, [tick, timezone]);

  if (!timeLabel) return null;

  return (
    <>
      {` | `}
      <span className="inline-block whitespace-nowrap" aria-label={timeLabel}>
        {timeLabel.split("").map((ch, i) =>
          /[0-9]/.test(ch) ? (
            <span key={i} className="inline-block w-[0.665em] text-center">
              {ch}
            </span>
          ) : (
            <span key={i}>{ch}</span>
          )
        )}
      </span>
      {location ? ` - ${location}` : ""}
    </>
  );
};

const ViewAllButton = ({ route }: { route: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      className="group inline-flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]"
    >
      View all
      <ArrowRight
        size={12}
        className="transition group-hover:translate-x-0.5"
      />
    </button>
  );
};

export function EmployeeDashboardOverview() {
  const currentUser = useFreshCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);

  const access = useDashboardAccess();
  const workspacePreferences = useWorkspacePreferences();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setNow(new Date());
  }, [workspacePreferences.timezone]);

  const employeeName = useMemo(() => {
    const full = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
    return full || currentUser?.fullName || currentUser?.name || currentUser?.displayName || "there";
  }, [currentUser]);

  const { greeting, todayLabel } = useMemo(() => {
    const timezone = workspacePreferences.timezone;

    try {
      const hourPart = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .find((part) => part.type === "hour")?.value;
      const workspaceHour = Number(hourPart);

      return {
        greeting: `${getGreeting(Number.isFinite(workspaceHour) ? workspaceHour : now.getHours())}, ${employeeName}`,
        todayLabel: new Intl.DateTimeFormat("en-IN", {
          timeZone: timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now),
      };
    } catch {
      return {
        greeting: `${getGreeting(now.getHours())}, ${employeeName}`,
        todayLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }, [employeeName, now, workspacePreferences.timezone]);

  const currentUserIds = useMemo(() => {
    return [
      currentUser?.id,
      currentUser?._id,
      currentUser?.userId,
      currentUser?.memberId,
      currentUser?.workspaceMembership?.userId,
      currentUser?.workspaceMembership?.memberUserId,
      currentUser?.workspaceMembership?.memberId,
      currentUser?.workspaceMembership?.id,
      currentUser?.workspaceMembership?._id,
      currentUser?.workspace?.userId,
      currentUser?.workspace?.memberId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }, [currentUser]);

  const currentUserName = useMemo(
    () => normalizeText(currentUser?.fullName || currentUser?.name || currentUser?.displayName || ""),
    [currentUser],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [tasksResponse, ticketsResponse, leaveResponse, assetsResponse, bookingsResponse, calendarResponse] = await Promise.allSettled([
          getTasks({ limit: 200 }),
          getTickets({ limit: 200 }),
          getLeaveRequests(),
          getAssets(),
          getMyBookings(),
          getMyCalendar(),
        ]);

        if (!isMounted) {
          return;
        }

        const tasksData = tasksResponse.status === "fulfilled" ? tasksResponse.value : null;
        const tasksList = Array.isArray((tasksData as Record<string, unknown>)?.tasks)
          ? ((tasksData as Record<string, unknown>).tasks as TaskRecord[])
          : Array.isArray(tasksData)
            ? (tasksData as TaskRecord[])
            : [];

        const ticketsData = ticketsResponse.status === "fulfilled" ? ticketsResponse.value : null;
        const ticketsList = Array.isArray((ticketsData as Record<string, unknown>)?.tickets)
          ? ((ticketsData as Record<string, unknown>).tickets as TicketRecord[])
          : Array.isArray(ticketsData)
            ? (ticketsData as TicketRecord[])
            : [];

        const leaveData = leaveResponse.status === "fulfilled" ? (leaveResponse.value as Record<string, unknown>) || {} : {};

        const assetsData = assetsResponse.status === "fulfilled" ? (assetsResponse.value as Record<string, unknown>) : null;
        const assetsList = Array.isArray((assetsData as Record<string, unknown>)?.assets)
          ? ((assetsData as Record<string, unknown>).assets as AssetRecord[])
          : Array.isArray(assetsData)
            ? (assetsData as AssetRecord[])
            : [];

        const bookingsData = bookingsResponse.status === "fulfilled" ? (bookingsResponse.value as Record<string, unknown>) : null;
        const bookingsList = Array.isArray((bookingsData as Record<string, unknown>)?.bookings)
          ? ((bookingsData as Record<string, unknown>).bookings as BookingRecord[])
          : [];

        const calendarData = calendarResponse.status === "fulfilled" ? (calendarResponse.value as Record<string, unknown>) : null;
        const calendarEventsList = Array.isArray((calendarData as Record<string, unknown>)?.events)
          ? ((calendarData as Record<string, unknown>).events as CalendarEventRecord[])
          : [];

        setDashboard({
          tasks: tasksList,
          tickets: ticketsList,
          leaveRequests: Array.isArray(leaveData.leaveRequests) ? (leaveData.leaveRequests as LeaveRequestRecord[]) : [],
          assets: assetsList,
          bookings: bookingsList,
          calendarEvents: calendarEventsList,
        });

        const failures = [tasksResponse, ticketsResponse, leaveResponse].filter((result) => result.status === "rejected");
        setError(failures.length > 0 ? ((failures[0] as PromiseRejectedResult).reason?.message || "Some data could not be loaded.") : "");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError((loadError as Error)?.message || "Unable to load your dashboard.");
        setDashboard(DEFAULT_DASHBOARD);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const myTasks = useMemo(() => {
    return dashboard.tasks
      .filter((task) => {
        const assigneeId = String(task.assigneeUserId || "").trim();
        if (assigneeId && currentUserIds.includes(assigneeId)) return true;
        return Boolean(currentUserName) && normalizeText(task.assignee) === currentUserName;
      })
      .sort((left, right) => new Date(left.dueDate || 0).getTime() - new Date(right.dueDate || 0).getTime());
  }, [dashboard.tasks, currentUserIds, currentUserName]);

  const myTickets = useMemo(() => {
    return dashboard.tickets
      .filter((ticket) => {
        const assigneeId = String(ticket.assigneeUserId || "").trim();
        if (assigneeId && currentUserIds.includes(assigneeId)) return true;
        return Boolean(currentUserName) && normalizeText(ticket.assignedTo) === currentUserName;
      })
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }, [dashboard.tickets, currentUserIds, currentUserName]);

  const myLeaveRequests = useMemo(() => {
    return dashboard.leaveRequests
      .filter((request) => Boolean(currentUserName) && normalizeText(request.employeeName || request.name) === currentUserName)
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }, [dashboard.leaveRequests, currentUserName]);

  const openTasksCount = myTasks.filter((task) => normalizeText(task.status) !== "completed").length;
  const openTicketsCount = myTickets.filter((ticket) => !["resolved", "closed"].includes(normalizeText(ticket.status))).length;
  const pendingLeaveCount = myLeaveRequests.filter((request) => normalizeText(request.status).includes("pending")).length;

  const myAssignedAssetsCount = useMemo(() => {
    return dashboard.assets.filter((asset) => {
      const assignedToUserId = String(
        (typeof asset.assignedToUserId === "object" ? asset.assignedToUserId?._id : asset.assignedToUserId) || "",
      );
      const allocatedToMe = (asset.allocations || []).some((allocation) => String(allocation.userId || "") && currentUserIds.includes(String(allocation.userId)));
      return allocatedToMe || (assignedToUserId && currentUserIds.includes(assignedToUserId)) || (Boolean(currentUserName) && normalizeText(asset.assignedTo) === currentUserName);
    }).length;
  }, [dashboard.assets, currentUserIds, currentUserName]);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const upcomingBookingsCount = useMemo(
    () => dashboard.bookings.filter((booking) => (booking.date || "") >= todayKey && !["cancelled", "rejected"].includes(normalizeText(booking.status))).length,
    [dashboard.bookings, todayKey],
  );

  const upcomingCalendarEventsCount = useMemo(
    () => dashboard.calendarEvents.filter((event) => (event.date || "") >= todayKey).length,
    [dashboard.calendarEvents, todayKey],
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-full bg-slate-50/40 p-2 lg:p-2.5">
      <div className="flex flex-col gap-5 rounded-xl border-default p-4">

        {/* Greeting card — same blue plan-card style used across the plan dashboards */}
        <section
          data-tour="employee-greeting"
          className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-blue-50/70" />
          <div className="relative flex min-w-0 items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100 sm:flex">
              <LayoutDashboard size={21} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-pmedium uppercase tracking-[0.22em] text-[#2563EB]">
                  Employee Unit dashboard
                </p>
                <PlanBadge plan={access.plan} />
              </div>
              <h2 className="mt-2 text-xl font-pmedium text-[#1E3D73] sm:text-2xl">
                {greeting} 👋
              </h2>
              <p className="mt-1 text-xs font-pmedium text-slate-500 sm:text-sm">
                {todayLabel}
                <WorkspaceClock
                  timezone={workspacePreferences.timezone}
                  location={workspacePreferences.location}
                />
              </p>
            </div>
          </div>
        </section>
  
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}
  
        {/* Today's attendance — the hero card, same as the plan dashboards */}
        <div data-tour="employee-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>
  
        {/* My Pulse — only the metrics that matter to this employee */}
        <div data-tour="employee-overview">
          <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                  Personal
                </p>
                <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                  My Pulse
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricTile icon={ListChecks} label="My Tasks" value={myTasks.length} sub={`${openTasksCount} open`} route="/common-modules/tasks" color="#1E3D73" />
              <MetricTile icon={Ticket} label="My Tickets" value={myTickets.length} sub={`${openTicketsCount} open`} route="/common-modules/tickets" color="#ef4444" />
              <MetricTile icon={CalendarClock} label="Leave Requests" value={myLeaveRequests.length} sub={`${pendingLeaveCount} pending`} route="/common-modules/leave-requests" color="#f59e0b" />
              <MetricTile icon={Package} label="Assigned Assets" value={myAssignedAssetsCount} sub="Equipment assigned to you" route="/profile/assigned-assets" color="#0891b2" />
              <MetricTile icon={Calendar} label="Upcoming Bookings" value={upcomingBookingsCount} sub="Meeting room bookings" route="/common-modules/meeting-room-booking" color="#7c3aed" />
              <MetricTile icon={CalendarDays} label="Upcoming Events" value={upcomingCalendarEventsCount} sub="On your calendar" route="/common-modules/calendar" color="#059669" />
            </div>
          </section>
        </div>
  
        {/* Quick actions */}
        <div data-tour="employee-quick-links">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
            <div className="relative mb-5">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Jump back in
              </p>
              <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
                Quick Actions
              </h3>
              <p className="mt-1 text-xs font-pmedium text-slate-500">
                Your everyday tools, one click away.
              </p>
            </div>
            <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <QuickActionTile icon={ListChecks} label="Tasks" description="Your assigned work" route="/common-modules/tasks" color="#1E3D73" />
              <QuickActionTile icon={Ticket} label="Tickets" description="Raise or track support tickets" route="/common-modules/tickets" color="#ef4444" />
              <QuickActionTile icon={CalendarClock} label="Leave Requests" description="Apply for or check leaves" route="/common-modules/leave-requests" color="#f59e0b" />
              <QuickActionTile icon={Calendar} label="Meeting Rooms" description="Book a meeting room" route="/common-modules/meeting-room-booking" color="#2563EB" />
              <QuickActionTile icon={Calendar} label="Calendar" description="View events & schedules" route="/common-modules/calendar" color="#059669" />
              <QuickActionTile icon={MessageSquareCode} label="Customer Support" description="Get help from support" route="/common-modules/customer-support" color="#7c3aed" />
              <QuickActionTile icon={Package} label="Assigned Assets" description="Equipment assigned to you" route="/profile/assigned-assets" color="#0891b2" />
            </div>
          </section>
        </div>
  
        {/* Assigned to me — each gets its own anchor so a highlight never spans
            both cards at once. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div data-tour="employee-my-tasks">
            <ActivityPanel
              eyebrow="Assigned to me"
              title="My Tasks"
              action={<ViewAllButton route="/common-modules/tasks" />}
            >
              {myTasks.length > 0 ? myTasks.slice(0, 6).map((task, index) => (
                <RecentItem
                  key={task.id || task._id || index}
                  title={task.title || "Task"}
                  sub={task.department || task.priority || "Task"}
                  badge={task.status || "Assigned"}
                  badgeColor={statusBadgeColor(task.status || "")}
                  time={task.dueDate ? `Due ${humanRelTime(task.dueDate)}` : undefined}
                />
              )) : (
                <EmptyState
                  icon={ListChecks}
                  title="No tasks assigned to you"
                  description="Work assigned to you will show up here, ordered by due date."
                  actionLabel="Open Tasks"
                  route="/common-modules/tasks"
                />
              )}
            </ActivityPanel>
          </div>
  
          <div data-tour="employee-my-tickets">
            <ActivityPanel
              eyebrow="Support queue"
              title="My Tickets"
              action={<ViewAllButton route="/common-modules/tickets" />}
            >
              {myTickets.length > 0 ? myTickets.slice(0, 6).map((ticket, index) => (
                <RecentItem
                  key={ticket.id || ticket._id || index}
                  title={ticketTitle(ticket)}
                  sub={ticketCategory(ticket)}
                  badge={ticket.status || "Open"}
                  badgeColor={statusBadgeColor(ticket.status || "")}
                  time={humanRelTime(ticket.createdAt || "")}
                />
              )) : (
                <EmptyState
                  icon={Ticket}
                  title="No tickets assigned to you"
                  description="Support tickets assigned to you will appear here, most recent first."
                  actionLabel="Open Tickets"
                  route="/common-modules/tickets"
                />
              )}
            </ActivityPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeDashboardOverview;
