import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactApexChart from "react-apexcharts";
import {
  AlertTriangle,
  Bed,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  History,
  LogIn,
  LogOut,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import PageFrame from "../../components/Pages/PageFrame";
import hostelBannerImage from "../../assets/hostel-banner.jpg";
import useWorkspacePreferences from "../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../lib/workspaceLocalization";
import {
  getGuestRooms,
  getRoomBookings,
  getRoomStayAnalytics,
  type GuestRoom,
  type GuestRoomType,
  type RoomStayBooking,
} from "../../services/roomStays";

type StayAnalytics = {
  summary?: {
    revenue?: number;
    bookings?: number;
    occupancyRate?: number;
    avgNights?: number;
  };
  daily?: Array<{ date: string; bookings: number; revenue: number }>;
};

const dateKey = (value?: string | null) => String(value || "").slice(0, 10);

const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const dateLabel = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value === "checked-in") return "bg-emerald-50 text-emerald-700";
  if (value === "checked-out") return "bg-slate-100 text-slate-700";
  if (value === "cancelled") return "bg-red-50 text-red-700";
  return "bg-blue-50 text-blue-700";
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
  value: string | number;
  sub: string;
  tone?: "blue" | "green" | "amber" | "violet" | "rose" | "slate";
}) {
  const tones = {
    blue: {
      card: "hover:border-l-blue-600",
      icon: "border-l-blue-600 bg-blue-50 text-blue-700",
    },
    green: {
      card: "hover:border-l-emerald-500",
      icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    },
    amber: {
      card: "hover:border-l-amber-500",
      icon: "border-l-amber-500 bg-amber-50 text-amber-700",
    },
    violet: {
      card: "hover:border-l-violet-500",
      icon: "border-l-violet-500 bg-violet-50 text-violet-700",
    },
    rose: {
      card: "hover:border-l-rose-500",
      icon: "border-l-rose-500 bg-rose-50 text-rose-700",
    },
    slate: {
      card: "hover:border-l-slate-500",
      icon: "border-l-slate-500 bg-slate-100 text-slate-700",
    },
  };
  return (
    <div
      className={`flex min-h-[108px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-md ${tones[tone].card}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone].icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[20px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[9px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

type RoomStayBookingDashboardProps = {
  roomType: GuestRoomType;
  title: string;
  bannerImage: string;
  routeBase: string;
  resourcePlural: string;
  inventoryPlural: string;
  occupantPlural: string;
  description: string;
  tags: string[];
};

export function RoomStayBookingDashboard({
  roomType,
  title,
  bannerImage,
  routeBase,
  resourcePlural,
  inventoryPlural,
  occupantPlural,
  description,
  tags,
}: RoomStayBookingDashboardProps) {
  const workspacePreferences = useWorkspacePreferences();
  const [rooms, setRooms] = useState<GuestRoom[]>([]);
  const [bookings, setBookings] = useState<RoomStayBooking[]>([]);
  const [analytics, setAnalytics] = useState<StayAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, {
      maximumFractionDigits: 0,
    });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      getGuestRooms(roomType),
      getRoomBookings({ roomType }),
      getRoomStayAnalytics(roomType, 30),
    ]).then((results) => {
      if (cancelled) return;
      const [roomsResult, bookingsResult, analyticsResult] = results;
      if (roomsResult.status === "fulfilled") {
        const list = roomsResult.value?.data?.data;
        setRooms(Array.isArray(list) ? list : []);
      }
      if (bookingsResult.status === "fulfilled") {
        const list = bookingsResult.value?.data?.data;
        setBookings(Array.isArray(list) ? list : []);
      }
      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value?.data?.data || null);
      }
      if (results.some((result) => result.status === "rejected")) {
        setLoadError(`Some ${title.toLowerCase()} data could not be refreshed.`);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [roomType, title]);

  const today = todayKey();
  const activeRooms = rooms.filter(
    (room) => room.isActive && room.status === "Active",
  );
  const totalInventory =
    roomType === "Room"
      ? activeRooms.length
      : activeRooms.reduce(
          (sum, room) => sum + Math.max(1, Number(room.capacity || 1)),
          0,
        );
  const checkedIn = bookings.filter(
    (booking) => booking.status === "Checked-in",
  );
  const upcoming = bookings.filter((booking) => booking.status === "Booked");
  const occupiedInventory = checkedIn.reduce(
    (sum, booking) =>
      sum +
      (roomType === "Dorm" ? Math.max(1, Number(booking.bedCount) || 1) : 1),
    0,
  );
  const availableInventory = Math.max(0, totalInventory - occupiedInventory);
  const checkOutsToday = bookings.filter(
    (booking) =>
      booking.status === "Checked-in" && dateKey(booking.checkOut) === today,
  ).length;
  const outstanding = bookings
    .filter((booking) => booking.status !== "Cancelled")
    .reduce(
      (sum, booking) =>
        sum +
        Math.max(
          0,
          Number(booking.total || 0) - Number(booking.amountPaid || 0),
        ),
      0,
    );

  const modules = [
    {
      id: "availability",
      title: "Availability",
      description: `Find available ${inventoryPlural} and create bookings`,
      icon: Bed,
      color: "#2563EB",
    },
    {
      id: "reservations",
      title: "Reservations",
      description: `Review upcoming ${title.toLowerCase()} reservations`,
      icon: CalendarCheck,
      color: "#4F46E5",
    },
    {
      id: "guests",
      title: roomType === "Room" ? "Current Residents" : "Current Guests",
      description: "Manage check-ins, extensions, and check-outs",
      icon: Users,
      color: "#0F766E",
    },
    {
      id: "history",
      title: "Booking History",
      description: `Review completed and cancelled ${title.toLowerCase()} stays`,
      icon: History,
      color: "#7C3AED",
    },
  ];

  const statusMix = ["Booked", "Checked-in", "Checked-out", "Cancelled"]
    .map((label) => ({
      label,
      value: bookings.filter((booking) => booking.status === label).length,
    }))
    .filter((item) => item.value > 0);

  const paymentMix = useMemo(() => {
    const counts = new Map<string, number>();
    bookings
      .filter((booking) => booking.status !== "Cancelled")
      .forEach((booking) => {
        const method =
          String(booking.paymentMethod || "Not recorded").trim() ||
          "Not recorded";
        counts.set(method, (counts.get(method) || 0) + 1);
      });
    return [...counts.entries()].map(([label, value]) => ({ label, value }));
  }, [bookings]);

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice(0, 8),
    [bookings],
  );

  const daily = analytics?.daily || [];
  const dailyCategories = daily.map((item) =>
    dateLabel(item.date).replace(/ \d{4}$/, ""),
  );
  const bookingTrendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    colors: ["#2563EB"],
    xaxis: { categories: dailyCategories },
    yaxis: { title: { text: "Bookings" }, min: 0, forceNiceScale: true },
    grid: { borderColor: "#EEF2F7" },
  };
  const revenueTrendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    dataLabels: { enabled: false },
    stroke: { width: 3, curve: "smooth" as const },
    colors: ["#10B981"],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.04,
        stops: [0, 95, 100],
      },
    },
    xaxis: { categories: dailyCategories },
    yaxis: {
      title: { text: "Revenue" },
      min: 0,
      labels: { formatter: (value: number) => formatCurrency(value) },
    },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { y: { formatter: (value: number) => formatCurrency(value) } },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={bannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3B82F6]/35 to-[#60A5FA]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
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
              <h1 className="flex flex-wrap items-center gap-x-2 text-[29px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[36px]">
                <span className="text-primary">{title}</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">
                {description}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
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
                Available {inventoryPlural}
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {availableInventory}
              </p>
            </div>
          </div>
        </div>

        {loadError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} />
            {loadError}
          </div>
        ) : null}

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
              <StatTile
                icon={<Bed size={18} />}
                label={`Active ${resourcePlural}`}
                value={activeRooms.length}
                sub={`${resourcePlural} available for booking`}
              />
              <StatTile
                icon={<Bed size={18} />}
                label={`Total ${inventoryPlural}`}
                value={totalInventory}
                sub={`Across active ${resourcePlural}`}
                tone="violet"
              />
              <StatTile
                icon={<CheckCircle2 size={18} />}
                label={`Available ${inventoryPlural}`}
                value={availableInventory}
                sub="Ready for booking"
                tone="green"
              />
              <StatTile
                icon={<CalendarClock size={18} />}
                label="Upcoming"
                value={upcoming.length}
                sub="Booked future stays"
                tone="blue"
              />
              <StatTile
                icon={<LogIn size={18} />}
                label="Checked in"
                value={checkedIn.length}
                sub={`Current ${occupantPlural}`}
                tone="green"
              />
              <StatTile
                icon={<LogOut size={18} />}
                label="Check-outs today"
                value={checkOutsToday}
                sub="Expected departures"
                tone="amber"
              />
              <StatTile
                icon={<TrendingUp size={18} />}
                label="Revenue"
                value={formatCurrency(analytics?.summary?.revenue || 0)}
                sub="Last 30 days"
                tone="green"
              />
              <StatTile
                icon={<Wallet size={18} />}
                label="Outstanding"
                value={formatCurrency(outstanding)}
                sub="Across active stays"
                tone="rose"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm font-pmedium text-slate-900">
                Manage {title.toLowerCase()}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Open a module to work with its dedicated {title.toLowerCase()} view.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <DashboardModuleCard
                      key={module.id}
                      icon={<Icon size={19} />}
                      title={module.title}
                      route={`${routeBase}/list?tab=${module.id}`}
                      description={module.description}
                      color={module.color}
                      state={{ moduleTitle: module.title }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-4">
              <SectionCard
                title="Booking trend"
                subtitle={`${title} activity recorded across the last 30 days.`}
              >
                {daily.length ? (
                  <ReactApexChart
                    type="bar"
                    height={320}
                    options={bookingTrendOptions}
                    series={[
                      {
                        name: "Bookings",
                        data: daily.map((item) => item.bookings),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No {title.toLowerCase()} trend recorded yet.
                  </div>
                )}
              </SectionCard>
              <SectionCard
                title="Revenue trend"
                subtitle={`${title} revenue recorded across the last 30 days.`}
              >
                {daily.length ? (
                  <ReactApexChart
                    type="area"
                    height={320}
                    options={revenueTrendOptions}
                    series={[
                      {
                        name: "Revenue",
                        data: daily.map((item) => item.revenue),
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No {title.toLowerCase()} revenue trend recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Booking status"
                subtitle={`Current ${title.toLowerCase()} distribution by stay status.`}
              >
                {statusMix.length ? (
                  <DonutChart
                    centerLabel="Bookings"
                    labels={statusMix.map((item) => item.label)}
                    series={statusMix.map((item) => item.value)}
                    colors={["#2563EB", "#10B981", "#64748B", "#EF4444"]}
                    tooltipValue={statusMix.map(
                      (item) => `${item.value} bookings`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No booking-status data yet.
                  </div>
                )}
              </SectionCard>
              <SectionCard
                title="Payment methods"
                subtitle={`Payment methods recorded across ${title.toLowerCase()} stays.`}
              >
                {paymentMix.length ? (
                  <DonutChart
                    centerLabel="Bookings"
                    labels={paymentMix.map((item) => item.label)}
                    series={paymentMix.map((item) => item.value)}
                    colors={[
                      "#2563EB",
                      "#10B981",
                      "#7C3AED",
                      "#F59E0B",
                      "#64748B",
                    ]}
                    tooltipValue={paymentMix.map(
                      (item) => `${item.value} bookings`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No payment-method data yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title={`Recent ${title.toLowerCase()} records`}
              subtitle="Latest reservations, active stays, completed stays, and cancellations."
              bodyClassName="max-h-[390px] overflow-y-auto p-0"
            >
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[14%] px-5 py-3">Booking</th>
                    <th className="w-[20%] px-5 py-3">Guest</th>
                    <th className="w-[18%] px-5 py-3">Stay</th>
                    <th className="w-[14%] px-5 py-3">Nights</th>
                    <th className="w-[17%] px-5 py-3">Total</th>
                    <th className="w-[17%] px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {recentBookings.length ? (
                    recentBookings.map((booking) => (
                      <tr key={booking._id} className="hover:bg-slate-50/70">
                        <td className="truncate px-5 py-3 font-pmedium text-slate-900">
                          #{booking.bookingNumber}
                        </td>
                        <td className="truncate px-5 py-3 text-slate-600">
                          {booking.guestName}
                        </td>
                        <td className="truncate px-5 py-3 text-slate-600">
                          {dateLabel(booking.checkIn)} –{" "}
                          {dateLabel(booking.checkOut)}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {booking.nights}
                        </td>
                        <td className="px-5 py-3 font-pmedium text-slate-900">
                          {formatCurrency(booking.total)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-wide ${statusClass(booking.status)}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No {title.toLowerCase()} records found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </SectionCard>
          </>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center text-[11px] text-slate-500">
            Loading {title.toLowerCase()} dashboard...
          </div>
        )}
      </PageFrame>
    </div>
  );
}

export default function HostelBookingDashboard() {
  return (
    <RoomStayBookingDashboard
      roomType="Dorm"
      title="Hostel Booking"
      bannerImage={hostelBannerImage}
      routeBase="/common-modules/hostel-booking"
      resourcePlural="dorms"
      inventoryPlural="beds"
      occupantPlural="hostel guests"
      description="Live dorm-bed availability, reservations, guest movement, collections, and stay history."
      tags={["Dorms", "Beds", "Guests", "Bookings"]}
    />
  );
}
