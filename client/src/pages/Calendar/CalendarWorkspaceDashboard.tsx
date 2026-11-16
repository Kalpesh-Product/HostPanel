import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  LayoutList,
  Ticket,
  Users,
} from "lucide-react";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import GroupedBarGraph from "@/components/graphs/GroupedBarGraph";
import PageFrame from "@/components/Pages/PageFrame";
import useModuleAccessMap from "@/hooks/useModuleAccessMap";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { getWorkspaceDateKey } from "@/lib/workspaceLocalization";
import { getMyCalendar } from "@/services/calendar";
import calendarBannerImage from "@/assets/calendar-dashboard-banner.png";

type EventType =
  | "booking"
  | "task"
  | "ticket"
  | "leave"
  | "holiday"
  | "event"
  | "personal";

type CalendarEvent = {
  id?: string;
  type: EventType;
  title?: string;
  date?: string;
  endDate?: string;
  startTime?: string;
  time?: string;
  location?: string;
  status?: string;
  priority?: string;
  attendees?: string[];
  details?: {
    currentInviteStatus?: string;
    department?: string;
    roomName?: string;
  };
};

type Tone = "blue" | "green" | "amber" | "violet" | "rose" | "cyan";

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

const readable = (value: unknown, fallback = "Not recorded") => {
  const text = String(value || "").trim();
  return text
    ? text.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : fallback;
};

const formatDate = (value?: string) => {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value?: string) => {
  if (!value) return "All day";
  return value.replace(/^(\d{1,2}):(\d{2})$/, (_match, hour, minute) => {
    const numericHour = Number(hour);
    const period = numericHour >= 12 ? "PM" : "AM";
    return `${numericHour % 12 || 12}:${minute} ${period}`;
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
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  sub: string;
  tone: Tone;
}) {
  const styles = {
    blue: {
      hover: "hover:border-blue-200 hover:border-l-blue-600",
      icon: "bg-blue-50 text-blue-700",
    },
    green: {
      hover: "hover:border-emerald-200 hover:border-l-emerald-500",
      icon: "bg-emerald-50 text-emerald-700",
    },
    amber: {
      hover: "hover:border-amber-200 hover:border-l-amber-500",
      icon: "bg-amber-50 text-amber-700",
    },
    violet: {
      hover: "hover:border-violet-200 hover:border-l-violet-500",
      icon: "bg-violet-50 text-violet-700",
    },
    rose: {
      hover: "hover:border-rose-200 hover:border-l-rose-500",
      icon: "bg-rose-50 text-rose-700",
    },
    cyan: {
      hover: "hover:border-cyan-200 hover:border-l-cyan-500",
      icon: "bg-cyan-50 text-cyan-700",
    },
  }[tone];

  return (
    <div
      className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${styles.hover}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
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

export default function CalendarWorkspaceDashboard() {
  const { workspacePlan, isLoading: isPlanLoading } = useModuleAccessMap();
  const workspacePreferences = useWorkspacePreferences();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getMyCalendar()
      .then((response: any) => {
        if (cancelled) return;
        const payload = response?.data || response || {};
        setEvents(Array.isArray(payload?.events) ? payload.events : []);
        setLoadError("");
      })
      .catch((error: any) => {
        if (cancelled) return;
        setLoadError(error?.message || "Calendar data could not be refreshed just now.");
        setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    if (workspacePlan === "custom") return events;
    return events.filter((event) =>
      ["booking", "ticket", "personal"].includes(event.type),
    );
  }, [events, workspacePlan]);

  const todayKey = getWorkspaceDateKey(
    new Date(),
    workspacePreferences.timezone,
  );

  const nextSevenKey = useMemo(() => {
    const date = new Date(`${todayKey}T12:00:00`);
    date.setDate(date.getDate() + 7);
    return getWorkspaceDateKey(date, workspacePreferences.timezone);
  }, [todayKey, workspacePreferences.timezone]);

  const stats = useMemo(() => {
    const today = visibleEvents.filter(
      (event) =>
        event.date &&
        todayKey >= event.date &&
        todayKey <= (event.endDate || event.date),
    ).length;
    const nextSevenDays = visibleEvents.filter(
      (event) => event.date && event.date >= todayKey && event.date <= nextSevenKey,
    ).length;
    const awaitingResponse = visibleEvents.filter((event) =>
      ["pending", "invited"].includes(
        normalize(event.details?.currentInviteStatus || event.status),
      ),
    ).length;
    const withAttendees = visibleEvents.filter(
      (event) => Array.isArray(event.attendees) && event.attendees.length > 0,
    ).length;

    return {
      total: visibleEvents.length,
      today,
      nextSevenDays,
      bookings: visibleEvents.filter((event) => event.type === "booking").length,
      tasks: visibleEvents.filter((event) => event.type === "task").length,
      tickets: visibleEvents.filter((event) => event.type === "ticket").length,
      awaitingResponse,
      withAttendees,
    };
  }, [nextSevenKey, todayKey, visibleEvents]);

  const typeRows = useMemo(() => {
    const labels: Record<EventType, string> = {
      booking: "Bookings",
      task: "Tasks",
      ticket: "Tickets",
      leave: "Leave",
      holiday: "Holidays",
      event: "Company Events",
      personal: "My Events",
    };
    const groups = new Map<string, number>();
    visibleEvents.forEach((event) => {
      const label = labels[event.type] || readable(event.type);
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [visibleEvents]);

  const statusRows = useMemo(() => {
    const groups = new Map<string, number>();
    visibleEvents.forEach((event) => {
      const label = readable(event.status, "Scheduled");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [visibleEvents]);

  const monthBuckets = useMemo(() => {
    const rows = Array.from({ length: 6 }, (_, index) => {
      const month = new Date();
      month.setDate(1);
      month.setMonth(month.getMonth() - (5 - index));
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        label: month.toLocaleDateString("en-IN", { month: "short" }),
        value: 0,
      };
    });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    visibleEvents.forEach((event) => {
      const row = event.date ? byKey.get(event.date.slice(0, 7)) : undefined;
      if (row) row.value += 1;
    });
    return rows;
  }, [visibleEvents]);

  const upcomingEvents = useMemo(
    () =>
      visibleEvents
        .filter((event) => event.date && (event.endDate || event.date) >= todayKey)
        .sort((left, right) => {
          const leftKey = `${left.date || ""} ${left.startTime || left.time || ""}`;
          const rightKey = `${right.date || ""} ${right.startTime || right.time || ""}`;
          return leftKey.localeCompare(rightKey);
        })
        .slice(0, 10),
    [todayKey, visibleEvents],
  );

  const showLoading = isLoading || isPlanLoading;

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={calendarBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
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
                <span className="text-primary">Calendar</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">
                Schedule activity, upcoming commitments, invitations, and event
                workload within your plan and role scope.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Schedule", "Bookings", "Invitations", "Agenda"].map(
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
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-slate-600">
                Active modules
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-slate-900">1</p>
            </div>
          </div>
        </div>

        {loadError && !showLoading ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            {loadError}
          </div>
        ) : null}

        {showLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<CalendarRange size={20} />} label="Total Schedule" value={stats.total} sub="Items visible in your calendar" tone="blue" />
            <StatTile icon={<CalendarCheck2 size={20} />} label="Today" value={stats.today} sub="Commitments scheduled today" tone="green" />
            <StatTile icon={<CalendarDays size={20} />} label="Next 7 Days" value={stats.nextSevenDays} sub="Upcoming schedule workload" tone="cyan" />
            <StatTile icon={<Clock3 size={20} />} label="Awaiting Response" value={stats.awaitingResponse} sub="Invites or items still pending" tone="amber" />
            <StatTile icon={<CalendarDays size={20} />} label="Bookings" value={stats.bookings} sub="Meeting and room bookings" tone="blue" />
            <StatTile icon={<CheckCircle2 size={20} />} label="Tasks" value={stats.tasks} sub="Task deadlines on the calendar" tone="green" />
            <StatTile icon={<Ticket size={20} />} label="Tickets" value={stats.tickets} sub="Ticket activity and due dates" tone="violet" />
            <StatTile icon={<Users size={20} />} label="Collaborative" value={stats.withAttendees} sub="Items with invited attendees" tone="rose" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Manage schedule</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the complete monthly calendar to review details or create an event.
          </p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4">
            <DashboardModuleCard
              icon={<LayoutList size={19} />}
              title="Calendar"
              route="/common-modules/calendar/manage"
              description="Review the monthly schedule, filter events, and create calendar entries"
              color="#2563EB"
              state={{ fromSection: "calendar-dashboard", moduleTitle: "Calendar" }}
            />
          </div>
        </div>

        {!showLoading ? (
          <>
            <div className="mb-4">
              <SectionCard
                title="Schedule trend"
                subtitle="Calendar items recorded across the latest six months."
              >
                <GroupedBarGraph
                  options={{
                    chart: { toolbar: { show: false } },
                    xaxis: { categories: monthBuckets.map((row) => row.label) },
                    colors: ["#2563EB"],
                    dataLabels: { enabled: false },
                    legend: { show: false },
                  }}
                  series={[
                    {
                      name: "Calendar items",
                      data: monthBuckets.map((row) => row.value),
                    },
                  ]}
                />
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Event mix"
                subtitle="Calendar activity grouped by operational source."
              >
                {typeRows.length ? (
                  <DonutChart
                    centerLabel="Items"
                    labels={typeRows.map(([label]) => label)}
                    series={typeRows.map(([, value]) => value)}
                    colors={["#2563EB", "#10B981", "#7C3AED", "#F59E0B", "#EF4444", "#06B6D4", "#6366F1"]}
                    tooltipValue={typeRows.map(([, value]) => `${value} items`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No calendar activity recorded yet.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Schedule status"
                subtitle="Current status distribution across visible calendar items."
              >
                {statusRows.length ? (
                  <DonutChart
                    centerLabel="Items"
                    labels={statusRows.map(([label]) => label)}
                    series={statusRows.map(([, value]) => value)}
                    colors={["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#94A3B8", "#7C3AED"]}
                    tooltipValue={statusRows.map(([, value]) => `${value} items`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No schedule status data yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Upcoming agenda"
              subtitle="Next calendar commitments in chronological order."
              bodyClassName="max-h-[420px] overflow-auto p-0"
            >
              <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[32%] px-5 py-3 font-pmedium">Schedule Item</th>
                    <th className="w-[16%] px-3 py-3 font-pmedium">Type</th>
                    <th className="w-[20%] px-3 py-3 font-pmedium">Date</th>
                    <th className="w-[16%] px-3 py-3 font-pmedium">Time</th>
                    <th className="w-[16%] px-3 py-3 text-center font-pmedium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingEvents.length ? (
                    upcomingEvents.map((event, index) => (
                      <tr key={event.id || `calendar-${index}`} className="bg-white text-[11px] text-slate-600">
                        <td className="px-5 py-3">
                          <p className="truncate font-pmedium text-slate-900" title={event.title || "Calendar item"}>
                            {event.title || "Calendar item"}
                          </p>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {event.location || event.details?.roomName || event.details?.department || "No location recorded"}
                          </p>
                        </td>
                        <td className="px-3 py-3">{readable(event.type)}</td>
                        <td className="px-3 py-3">{formatDate(event.date)}</td>
                        <td className="px-3 py-3">{formatTime(event.startTime || event.time)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">
                            {readable(event.status, "Scheduled")}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-[11px] text-slate-500">
                        No upcoming calendar items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </SectionCard>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
