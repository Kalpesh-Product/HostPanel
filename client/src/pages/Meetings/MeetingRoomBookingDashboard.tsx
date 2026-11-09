import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Globe,
  Lock,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import HeatMap from "../../components/graphs/HeatMap";
import PageFrame from "../../components/Pages/PageFrame";
import meetingRoomBanner from "../../assets/meeting-room-banner.jpg";
import {
  canAccessAdministrationDashboard,
  canAccessSalesDashboard,
  getStoredUser,
} from "../../lib/auth-session";
import { statusPillClass } from "../../lib/status-pill";
import { getMeetingRoomBookings } from "../../services/meeting-room-bookings";

type BookingRecord = Record<string, any>;

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const titleCase = (value: unknown, fallback = "Not recorded") => {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const bookingType = (booking: BookingRecord) => {
  const type = normalize(booking.bookingType || booking.type || booking.bookingScope);
  if (type.includes("tenant")) return "Tenant";
  if (type.includes("external") || type.includes("walk_in") || type.includes("client")) return "External";
  return "Internal";
};

const bookingDate = (booking: BookingRecord) =>
  String(booking.date || booking.bookingDate || booking.startDate || "").slice(0, 10);

const bookingStatus = (booking: BookingRecord) =>
  normalize(booking.status || booking.bookingStatus || "booked");

const timeToMinutes = (value: unknown) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const bookingDurationMinutes = (booking: BookingRecord) => {
  const explicitMinutes = Number(booking.durationMinutes || booking.totalMinutes || 0);
  if (Number.isFinite(explicitMinutes) && explicitMinutes > 0) return explicitMinutes;

  const durationText = String(booking.duration || "").trim().toLowerCase();
  const hoursMatch = durationText.match(/([\d.]+)\s*h/);
  const minutesMatch = durationText.match(/([\d.]+)\s*m/);
  const parsedDuration =
    Number(hoursMatch?.[1] || 0) * 60 + Number(minutesMatch?.[1] || 0);
  if (parsedDuration > 0) return parsedDuration;

  const start = timeToMinutes(booking.startTime || booking.checkIn);
  const end = timeToMinutes(booking.endTime || booking.checkOut);
  if (start === null || end === null) return 0;
  return Math.max(0, end >= start ? end - start : 24 * 60 - start + end);
};

const formatDate = (value: unknown) => {
  const text = String(value || "");
  const date = new Date(text.length === 10 ? `${text}T00:00:00` : text);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  value: number;
  sub: string;
  tone?: "blue" | "green" | "amber" | "violet" | "rose" | "slate";
}) {
  const tones = {
    blue: { card: "hover:border-l-blue-600", icon: "border-l-blue-600 bg-blue-50 text-blue-700" },
    green: { card: "hover:border-l-emerald-500", icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700" },
    amber: { card: "hover:border-l-amber-500", icon: "border-l-amber-500 bg-amber-50 text-amber-700" },
    violet: { card: "hover:border-l-violet-500", icon: "border-l-violet-500 bg-violet-50 text-violet-700" },
    rose: { card: "hover:border-l-rose-500", icon: "border-l-rose-500 bg-rose-50 text-rose-700" },
    slate: { card: "hover:border-l-slate-500", icon: "border-l-slate-500 bg-slate-100 text-slate-700" },
  };

  return (
    <div className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-md ${tones[tone].card}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone].icon}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">{value}</p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
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
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">{title}</h2>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function LockedModuleCard({ title, description }: { title: string; description: string }) {
  return (
    <button
      type="button"
      disabled
      title="This booking module is not enabled for your role or department."
      className="relative flex min-h-[154px] min-w-0 cursor-not-allowed flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-5 text-center opacity-75 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-slate-300" />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-pmedium text-slate-500">
        <Lock size={11} /> Locked
      </span>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200/70 text-slate-500">
        <Building2 size={19} />
      </span>
      <span className="text-[13px] font-pmedium text-slate-600">{title}</span>
      <span className="mt-1.5 line-clamp-2 max-w-[210px] text-[9px] font-pmedium leading-4 text-slate-400">{description}</span>
    </button>
  );
}

export default function MeetingRoomBookingDashboard() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [roomCount, setRoomCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const user = useMemo(() => getStoredUser(), []);

  const role = normalize(user?.workspaceMembership?.role || user?.role || "owner");
  const departmentNames = [
    ...(Array.isArray(user?.workspaceMembership?.departments)
      ? user.workspaceMembership.departments
      : []),
    user?.workspaceMembership?.department,
    user?.department,
    user?.workspace?.department,
  ]
    .map((department) =>
      typeof department === "string"
        ? department
        : department?.name || department?.departmentName || department?.label,
    )
    .map(normalize)
    .filter(Boolean);
  const hasExternalAndTenantAccess =
    role === "owner" ||
    role === "founder" ||
    role === "super_admin" ||
    canAccessAdministrationDashboard(user) ||
    canAccessSalesDashboard(user) ||
    departmentNames.some((department) =>
      department === "administration" || department === "admin" || department === "sales",
    );

  useEffect(() => {
    let cancelled = false;
    const workspaceId =
      user?.workspaceMembership?.workspaceId ||
      user?.workspaceMembership?.workspace ||
      user?.primaryWorkspace ||
      user?.workspace?.id ||
      user?.workspaceId ||
      user?.accessibleWorkspaces?.[0]?.id;

    if (!workspaceId) {
      setLoadError("Meeting-room data could not be loaded because no active unit was found.");
      setIsLoading(false);
      return undefined;
    }

    getMeetingRoomBookings(String(workspaceId))
      .then((response) => {
        if (cancelled) return;
        const data = response?.data?.data || response?.data || response || {};
        const records = Array.isArray(data)
          ? data
          : data?.bookings || data?.data?.bookings || [];
        const rooms = Array.isArray(data?.roomDetails)
          ? data.roomDetails
          : Array.isArray(data?.rooms)
            ? data.rooms
            : [];
        setBookings(Array.isArray(records) ? records : []);
        setRoomCount(rooms.filter((room: BookingRecord) => room?.isActive !== false).length);
        setLoadError("");
      })
      .catch(() => {
        if (!cancelled) {
          setBookings([]);
          setRoomCount(0);
          setLoadError("Meeting-room activity could not be refreshed just now.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const stats = useMemo(() => {
    const typeCount = (type: string) => bookings.filter((booking) => bookingType(booking) === type).length;
    return {
      total: bookings.length,
      today: bookings.filter((booking) => bookingDate(booking) === todayKey).length,
      upcoming: bookings.filter((booking) => {
        const status = bookingStatus(booking);
        return bookingDate(booking) >= todayKey && !["completed", "cancelled", "rejected"].includes(status);
      }).length,
      completed: bookings.filter((booking) => bookingStatus(booking) === "completed").length,
      cancelled: bookings.filter((booking) => bookingStatus(booking) === "cancelled").length,
      internal: typeCount("Internal"),
      external: typeCount("External"),
      tenant: typeCount("Tenant"),
    };
  }, [bookings, todayKey]);

  const monthSeries = useMemo(() => {
    const anchorDate = new Date(`${todayKey}T00:00:00`);
    const months = Array.from({ length: 12 }, (_, offset) => {
      const date = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 11 + offset, 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
      };
    });
    return {
      labels: months.map((month) => month.label),
      total: months.map((month) => bookings.filter((booking) => bookingDate(booking).startsWith(month.key)).length),
      completed: months.map((month) => bookings.filter((booking) => bookingDate(booking).startsWith(month.key) && bookingStatus(booking) === "completed").length),
    };
  }, [bookings, todayKey]);

  const typeMix = [
    { label: "Internal", value: stats.internal, color: "#2563EB" },
    { label: "External", value: stats.external, color: "#7C3AED" },
    { label: "Tenant", value: stats.tenant, color: "#0F766E" },
  ].filter((item) => item.value > 0);

  const bookingAnalytics = useMemo(() => {
    const roomMinutes = new Map<string, number>();
    const durationBuckets = [
      { label: "Up to 30 min", value: 0 },
      { label: "31-60 min", value: 0 },
      { label: "1-2 hours", value: 0 },
      { label: "Over 2 hours", value: 0 },
    ];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const timeBands = ["Morning", "Midday", "Afternoon", "Evening"];
    const busyMap = new Map(dayNames.map((day) => [day, new Map(timeBands.map((band) => [band, 0]))]));

    bookings.forEach((booking) => {
      if (bookingStatus(booking) === "cancelled") return;
      const minutes = bookingDurationMinutes(booking);
      const roomName = String(booking.roomName || booking.resourceName || "Unspecified room").trim();
      if (minutes > 0) {
        roomMinutes.set(roomName, (roomMinutes.get(roomName) || 0) + minutes);

        if (minutes <= 30) durationBuckets[0].value += 1;
        else if (minutes <= 60) durationBuckets[1].value += 1;
        else if (minutes <= 120) durationBuckets[2].value += 1;
        else durationBuckets[3].value += 1;
      }

      const date = new Date(`${bookingDate(booking)}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const startMinutes = timeToMinutes(booking.startTime || booking.checkIn) || 0;
      const band = startMinutes < 11 * 60
        ? "Morning"
        : startMinutes < 14 * 60
          ? "Midday"
          : startMinutes < 18 * 60
            ? "Afternoon"
            : "Evening";
      const dayMap = busyMap.get(dayNames[dayIndex]);
      if (dayMap) dayMap.set(band, (dayMap.get(band) || 0) + 1);
    });

    const topRooms = [...roomMinutes.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);
    return {
      roomLabels: topRooms.map(([room]) => room),
      roomHours: topRooms.map(([, minutes]) => Number((minutes / 60).toFixed(1))),
      durationBuckets: durationBuckets.filter((bucket) => bucket.value > 0),
      busySeries: dayNames.map((day) => ({
        name: day,
        data: timeBands.map((band) => ({ x: band, y: busyMap.get(day)?.get(band) || 0 })),
      })),
      totalBookedHours: Number(
        ([...roomMinutes.values()].reduce((sum, minutes) => sum + minutes, 0) / 60).toFixed(1),
      ),
    };
  }, [bookings]);

  const recentBookings = useMemo(
    () => [...bookings]
      .sort((left, right) => `${bookingDate(right)} ${right.startTime || ""}`.localeCompare(`${bookingDate(left)} ${left.startTime || ""}`))
      .slice(0, 8),
    [bookings],
  );

  const modules = [
    {
      id: "my_bookings",
      label: "My Bookings",
      description: "Reserve rooms and manage your meetings",
      icon: CalendarCheck,
      color: "#2563EB",
      enabled: true,
    },
    {
      id: "internal_booking",
      label: "Internal Booking",
      description: "Book meeting rooms for workspace members",
      icon: UserPlus,
      color: "#4F46E5",
      enabled: true,
    },
    {
      id: "external_booking",
      label: "External Booking",
      description: "Handle client and walk-in room bookings",
      icon: Globe,
      color: "#7C3AED",
      enabled: hasExternalAndTenantAccess,
    },
    {
      id: "tenant_bookings",
      label: "Tenant Bookings",
      description: "Manage room bookings for tenant companies",
      icon: Building2,
      color: "#0F766E",
      enabled: hasExternalAndTenantAccess,
    },
  ];

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthSeries.labels },
    colors: ["#2563EB", "#10B981"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const roomUtilizationOptions = {
    ...chartOptions,
    xaxis: { categories: bookingAnalytics.roomLabels },
    colors: ["#2563EB"],
    yaxis: { title: { text: "Booked hours" } },
  };

  const busyTimeOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: ["#FFFFFF"] },
    plotOptions: {
      heatmap: {
        radius: 4,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: "#F1F5F9", name: "No bookings" },
            { from: 1, to: 2, color: "#BFDBFE", name: "Low" },
            { from: 3, to: 5, color: "#60A5FA", name: "Moderate" },
            { from: 6, to: 999, color: "#2563EB", name: "Busy" },
          ],
        },
      },
    },
    legend: { position: "bottom" },
    tooltip: { theme: "light" },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={meetingRoomBanner}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)" }}
            />
            <div aria-hidden="true" className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3B82F6]/35 to-[#60A5FA]/20 sm:w-[64%]" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)" }} />
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]" style={{ WebkitMaskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)", maskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)" }} />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[76%]">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[29px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[36px]">
                <span className="text-primary">Meeting Room Booking</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                Live room demand, booking activity, completion, and booking-source visibility.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Rooms", "Bookings", "Clients", "Tenants"].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600">{tag}</span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Active rooms</p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">{roomCount}</p>
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
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<CalendarCheck size={20} />} label="Total bookings" value={stats.total} sub="All recorded room bookings" />
            <StatTile icon={<Clock3 size={20} />} label="Today" value={stats.today} sub="Bookings scheduled today" tone="amber" />
            <StatTile icon={<DoorOpen size={20} />} label="Upcoming" value={stats.upcoming} sub="Current and future bookings" tone="violet" />
            <StatTile icon={<CheckCircle2 size={20} />} label="Completed" value={stats.completed} sub="Bookings completed successfully" tone="green" />
            <StatTile icon={<XCircle size={20} />} label="Cancelled" value={stats.cancelled} sub="Cancelled room bookings" tone="rose" />
            <StatTile icon={<Users size={20} />} label="Internal" value={stats.internal} sub="Workspace member bookings" tone="blue" />
            <StatTile icon={<Globe size={20} />} label="External" value={stats.external} sub="Client and walk-in bookings" tone="violet" />
            <StatTile icon={<Building2 size={20} />} label="Tenant" value={stats.tenant} sub="Tenant company bookings" tone="slate" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Manage booking operations</p>
          <p className="mt-1 text-[10px] text-slate-500">Open a booking module to access its tabs, summary cards, filters, and records.</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              if (!module.enabled) {
                return <LockedModuleCard key={module.id} title={module.label} description={module.description} />;
              }
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.label}
                  route={`/common-modules/meeting-room-booking/list?module=${module.id}`}
                  description={module.description}
                  color={module.color}
                  state={{ moduleTitle: module.label }}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <SectionCard title="Booking activity" subtitle="Bookings created versus completed across the last 12 calendar months.">
                {bookings.length ? (
                  <GroupedBarGraph
                    options={chartOptions}
                    series={[
                      { name: "Bookings", data: monthSeries.total },
                      { name: "Completed", data: monthSeries.completed },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No booking activity recorded yet.</div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4">
              <SectionCard
                title="Room utilization"
                subtitle={`Booked hours by meeting room from active and completed bookings. ${bookingAnalytics.totalBookedHours} hours recorded.`}
              >
                {bookingAnalytics.roomLabels.length ? (
                  <GroupedBarGraph
                    options={roomUtilizationOptions}
                    series={[{ name: "Booked hours", data: bookingAnalytics.roomHours }]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No room-utilization data recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Busy time during the week"
                subtitle="Booking demand by weekday and time of day, helping teams identify peak room usage."
              >
                {bookings.length ? (
                  <HeatMap
                    data={bookingAnalytics.busySeries}
                    options={busyTimeOptions}
                    height={320}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No weekly booking demand recorded yet.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Meeting duration breakdown"
                subtitle="Distribution of bookings by reserved meeting length."
              >
                {bookingAnalytics.durationBuckets.length ? (
                  <DonutChart
                    centerLabel="Bookings"
                    labels={bookingAnalytics.durationBuckets.map((bucket) => bucket.label)}
                    series={bookingAnalytics.durationBuckets.map((bucket) => bucket.value)}
                    colors={["#2563EB", "#60A5FA", "#7C3AED", "#0F766E"]}
                    tooltipValue={bookingAnalytics.durationBuckets.map((bucket) => `${bucket.value} bookings`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No meeting-duration data recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard title="Booking sources" subtitle="Current booking volume grouped by internal, external, and tenant activity.">
                {typeMix.length ? (
                  <DonutChart
                    centerLabel="Bookings"
                    labels={typeMix.map((item) => item.label)}
                    series={typeMix.map((item) => item.value)}
                    colors={typeMix.map((item) => item.color)}
                    tooltipValue={typeMix.map((item) => `${item.value} bookings`)}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No booking-source data yet.</div>
                )}
              </SectionCard>
              <SectionCard title="Operational status" subtitle="Bookings grouped by their latest recorded status.">
                {bookings.length ? (
                  <DonutChart
                    centerLabel="Bookings"
                    labels={["Upcoming", "Completed", "Cancelled"]}
                    series={[stats.upcoming, stats.completed, stats.cancelled]}
                    colors={["#2563EB", "#10B981", "#EF4444"]}
                    tooltipValue={[`${stats.upcoming} upcoming`, `${stats.completed} completed`, `${stats.cancelled} cancelled`]}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No booking-status data yet.</div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Recent bookings"
              subtitle="Latest meeting-room bookings across the available booking modules."
              bodyClassName="max-h-[390px] overflow-y-auto p-0"
            >
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[24%] px-5 py-3">Room</th>
                    <th className="w-[20%] px-5 py-3">Booked for</th>
                    <th className="w-[17%] px-5 py-3">Type</th>
                    <th className="w-[21%] px-5 py-3">Schedule</th>
                    <th className="w-[18%] px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {recentBookings.length ? recentBookings.map((booking, index) => {
                    const status = titleCase(bookingStatus(booking), "Booked");
                    return (
                      <tr key={booking._id || booking.id || booking.recordId || index} className="hover:bg-slate-50/70">
                        <td className="truncate px-5 py-3 font-pmedium text-slate-900">{booking.roomName || booking.resourceName || "Meeting room"}</td>
                        <td className="truncate px-5 py-3 text-slate-600">{booking.bookedForName || booking.bookedByName || booking.clientCompany || "Not recorded"}</td>
                        <td className="truncate px-5 py-3 text-slate-600">{bookingType(booking)}</td>
                        <td className="truncate px-5 py-3 text-slate-600">{formatDate(bookingDate(booking))}{booking.startTime ? `, ${booking.startTime}` : ""}</td>
                        <td className="px-5 py-3"><span className={statusPillClass(status)}>{status}</span></td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-[11px] text-slate-500">No meeting-room bookings are recorded yet.</td></tr>
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
