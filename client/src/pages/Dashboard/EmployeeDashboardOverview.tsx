/**
 * EmployeeDashboardOverview — shown to plain employees (not a department
 * manager, not owner/super_admin). Deliberately simple: today's attendance,
 * an overview of the employee's own common-module activity, quick links to
 * the common modules, and whatever tasks/tickets have been assigned to them.
 * No charts — this is a personal work queue, not a department dashboard.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  Ticket,
  CalendarClock,
  MessageSquareCode,
  Calendar,
  CalendarDays,
  Package,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import PageFrame from "@/components/Pages/PageFrame";
import WidgetSection from "@/components/WidgetSection";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  PlanBadge,
  StatCard,
  SectionCard,
  RecentItem,
  QuickLink,
  getGreeting,
  humanRelTime,
  statusBadgeColor,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import { pickCardCols } from "@/pages/Dashboard/FrontendDashboard/dashboard/dashboardUtils";
import { DashboardAttendanceCard } from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
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
    <div className="p-4 flex flex-col gap-5">

      {/* Greeting banner */}
      <PageFrame>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-title font-pmedium text-primary uppercase">My Dashboard</h2>
              <PlanBadge plan={access.plan} />
            </div>
            <p className="text-subtitle font-pmedium text-gray-700">{greeting} 👋</p>
            <p className="text-content font-pmedium text-gray-700">{todayLabel}<WorkspaceClock timezone={workspacePreferences.timezone} location={workspacePreferences.location} /></p>
          </div>
        </div>
      </PageFrame>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      ) : null}

      <DashboardAttendanceCard />

      {/* Overview — only the metrics that matter */}
      <WidgetSection layout={3} title="Overview" border normalCase>
        <StatCard icon={ListChecks} label="My Tasks" value={myTasks.length} sub={`${openTasksCount} open`} color="#1E3D73" route="/common-modules/tasks" />
        <StatCard icon={Ticket} label="My Tickets" value={myTickets.length} sub={`${openTicketsCount} open`} color="#ef4444" route="/common-modules/tickets" />
        <StatCard icon={CalendarClock} label="Leave Requests" value={myLeaveRequests.length} sub={`${pendingLeaveCount} pending`} color="#f59e0b" route="/common-modules/leave-requests" />
        <StatCard icon={Package} label="Assigned Assets" value={myAssignedAssetsCount} sub="Equipment assigned to you" color="#0891b2" route="/profile/assigned-assets" />
        <StatCard icon={Calendar} label="Upcoming Bookings" value={upcomingBookingsCount} sub="Meeting room bookings" color="#7c3aed" route="/common-modules/meeting-room-booking" />
        <StatCard icon={CalendarDays} label="Upcoming Events" value={upcomingCalendarEventsCount} sub="On your calendar" color="#059669" route="/common-modules/calendar" />
      </WidgetSection>

      {/* Quick links */}
      <WidgetSection layout={pickCardCols(7)} title="Quick Links" border normalCase>
        <QuickLink icon={ListChecks} label="Tasks" description="Your assigned work" route="/common-modules/tasks" color="#1E3D73" />
        <QuickLink icon={Ticket} label="Tickets" description="Raise or track support tickets" route="/common-modules/tickets" color="#ef4444" />
        <QuickLink icon={CalendarClock} label="Leave Requests" description="Apply for or check leaves" route="/common-modules/leave-requests" color="#f59e0b" />
        <QuickLink icon={Calendar} label="Meeting Rooms" description="Book a meeting room" route="/common-modules/meeting-room-booking" color="#2563EB" />
        <QuickLink icon={Calendar} label="Calendar" description="View events & schedules" route="/common-modules/calendar" color="#059669" />
        <QuickLink icon={MessageSquareCode} label="Customer Support" description="Get help from support" route="/common-modules/customer-support" color="#7c3aed" />
        <QuickLink icon={Package} label="Assigned Assets" description="Equipment assigned to you" route="/profile/assigned-assets" color="#0891b2" />
      </WidgetSection>

      {/* Assigned to me */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="My Tasks" linkLabel="View all" linkRoute="/common-modules/tasks">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No tasks assigned to you</p></div>
          )}
        </SectionCard>

        <SectionCard title="My Tickets" linkLabel="View all" linkRoute="/common-modules/tickets">
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
            <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No tickets assigned to you</p></div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default EmployeeDashboardOverview;
