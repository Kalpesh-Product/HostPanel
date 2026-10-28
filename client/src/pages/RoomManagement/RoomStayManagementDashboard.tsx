import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarCheck,
  CalendarClock,
  CircleGauge,
  DoorOpen,
  IndianRupee,
  LogIn,
  LogOut,
  MapPinned,
  Moon,
  RefreshCw,
  ShoppingCart,
  Tag,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import Card from "../../components/Card";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import { getResources } from "../../services/resources";
import {
  getRoomBookings,
  getRoomStayAnalytics,
  type GuestRoomType,
  type RoomStayBooking,
} from "../../services/roomStays";

type StayResource = {
  recordId?: string;
  _id?: string;
  name?: string;
  resourceCategory?: string;
  type?: string;
  status?: string;
  capacity?: number;
  floor?: string;
  wing?: string;
  location?: string;
  pricePerNight?: number;
  credits?: number;
  amenities?: string[];
};

type StayAnalytics = {
  summary?: {
    revenue?: number;
    bookings?: number;
    occupancyRate?: number;
    avgNights?: number;
  };
  daily?: Array<{ date: string; bookings: number; revenue: number }>;
};

type StayRow = {
  booking: RoomStayBooking;
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
  amount: number;
  paid: number;
  outstanding: number;
};

// Matches the colour language used by the coworking and meeting-room
// dashboards so the three key-app dashboards read as one family.
const DONUT_PALETTE = ["#1E3D73", "#2563EB", "#3b82f6", "#60a5fa", "#93c5fd", "#64748B"];

const numeric = (value: unknown) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: value >= 100000 ? "compact" : "standard",
    maximumFractionDigits: value >= 100000 ? 1 : 0,
  }).format(Number(value) || 0);

const asDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayKeyOf = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const dayKey = (value?: string | null) => {
  const date = asDate(value);
  return date ? dayKeyOf(date) : "";
};

const dateLabel = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const shortDate = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const readableLabel = (value?: string) =>
  String(value || "Not recorded")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const fiscalYearOf = (date: Date) =>
  date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;

// A dorm's capacity is its bed count; a co-living room is always one key,
// matching how the stay analytics endpoint counts available room-nights.
const capacityUnitsOf = (resource: StayResource, roomType: GuestRoomType) =>
  roomType === "Dorm" ? Math.max(1, numeric(resource.capacity) || 1) : 1;

const roomIdOf = (resource: StayResource) =>
  String(resource.recordId || resource._id || "");

const monthKeyOf = (date: Date) => date.getFullYear() * 12 + date.getMonth();

const statusKey = (booking: RoomStayBooking) =>
  String(booking.status || "").toLowerCase();

const isCancelled = (booking: RoomStayBooking) =>
  statusKey(booking) === "cancelled";

const isCheckedOut = (booking: RoomStayBooking) =>
  statusKey(booking) === "checked-out";

const isCheckedIn = (booking: RoomStayBooking) => {
  const status = statusKey(booking);
  return status === "checked-in" || status === "checked in";
};

const isBooked = (booking: RoomStayBooking) =>
  statusKey(booking) === "booked";

const isOpen = (booking: RoomStayBooking) =>
  isBooked(booking) || isCheckedIn(booking);

const statusTone = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("cancel")) return "bg-red-50 text-red-700";
  if (value.includes("booked")) return "bg-blue-50 text-blue-700";
  if (value.includes("checked-in") || value.includes("checked in"))
    return "bg-emerald-50 text-emerald-700";
  if (value.includes("checked-out") || value.includes("checked out"))
    return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

// The one card shell every chart, list and table on this dashboard uses.
function ChartCard({
  title,
  subtitle,
  action,
  footer,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action ?? null}
      </div>
      <div className={bodyClassName}>{children}</div>
      {footer ? <div className="border-t border-slate-100">{footer}</div> : null}
    </div>
  );
}

function RecordCountChip({ count }: { count: number }) {
  return (
    <span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium text-blue-700">
      {count} records
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  status = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  status?: "default" | "success" | "attention";
}) {
  const statuses = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };
  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${statuses[status]}`}
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
        {sub ? (
          <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

export type RoomStayManagementDashboardProps = {
  roomType: GuestRoomType;
  title: string;
  noun: string;
  bannerImage: string;
  description: string;
  tags: string[];
  managementRoute: string;
  bookingRoute: string;
  resourcePricingRoute: string;
};

export default function RoomStayManagementDashboard({
  roomType,
  title,
  noun,
  bannerImage,
  description,
  tags,
  managementRoute,
  bookingRoute,
  resourcePricingRoute,
}: RoomStayManagementDashboardProps) {
  const [resources, setResources] = useState<StayResource[]>([]);
  const [bookings, setBookings] = useState<RoomStayBooking[]>([]);
  const [analytics, setAnalytics] = useState<StayAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("All floors");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const category = roomType === "Dorm" ? "dorm" : "room";
  const unitLabel = roomType === "Dorm" ? "beds" : "keys";
  const unitLabelSingular = roomType === "Dorm" ? "bed" : "key";
  const nounLower = noun.toLowerCase();
  const nounPlural = `${nounLower}s`;
  const headingParts = title.split(" ");
  const headingAccent = headingParts.length > 1 ? headingParts.pop()! : "";
  const headingPrimary = headingParts.join(" ");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([
      getResources(),
      getRoomBookings({ roomType }),
      getRoomStayAnalytics(roomType, 30),
    ]).then((results) => {
      if (cancelled) return;
      const [resourcesResult, bookingsResult, analyticsResult] = results;

      if (resourcesResult.status === "fulfilled") {
        const payload = resourcesResult.value?.data;
        const list = payload?.data?.resources || payload?.resources || [];
        setResources(Array.isArray(list) ? list : []);
      }

      if (bookingsResult.status === "fulfilled") {
        const payload: any = bookingsResult.value;
        const list = payload?.data?.data ?? payload?.data ?? [];
        setBookings(Array.isArray(list) ? list : []);
      }

      if (analyticsResult.status === "fulfilled") {
        const payload: any = analyticsResult.value;
        setAnalytics(payload?.data?.data ?? payload?.data ?? null);
      }

      const failures = results.filter((result) => result.status === "rejected");
      setLoadError(
        failures.length
          ? "Some room, booking, or reporting data could not be refreshed."
          : "",
      );
      setLastUpdated(new Date());
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, roomType]);

  const categoryOf = (resource: StayResource) => {
    const raw = String(resource.resourceCategory || "").toLowerCase();
    if (raw === "room" || raw === "dorm") return raw;
    if (raw === "meeting_room" || raw === "conference_room") return "";
    const type = String(resource.type || "").toLowerCase();
    if (type.includes("dorm")) return "dorm";
    if (type.includes("room")) return "room";
    return "";
  };

  const roomResources = useMemo(
    () => resources.filter((resource) => categoryOf(resource) === category),
    [resources, category],
  );

  const floorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          roomResources
            .map((resource) => resource.floor?.trim())
            .filter(Boolean),
        ),
      ).sort(),
    [roomResources],
  );

  const scopedRooms = useMemo(
    () =>
      selectedFloor === "All floors"
        ? roomResources
        : roomResources.filter(
            (resource) =>
              (resource.floor?.trim() || "Unassigned") === selectedFloor,
          ),
    [roomResources, selectedFloor],
  );

  const roomNameById = useMemo(() => {
    const map = new Map<string, string>();
    roomResources.forEach((resource) => {
      const id = String(resource.recordId || resource._id || "");
      if (id) map.set(id, resource.name || "Unnamed");
    });
    return map;
  }, [roomResources]);

  const scopedRoomIds = useMemo(
    () =>
      new Set(
        scopedRooms
          .map((resource) => String(resource.recordId || resource._id || ""))
          .filter(Boolean),
      ),
    [scopedRooms],
  );

  const scopedBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const roomId = String(booking.roomId || "");
        if (!roomId) return selectedFloor === "All floors";
        if (scopedRoomIds.has(roomId)) return true;
        // Keep stays for rooms that were archived or deleted visible in the
        // unscoped view instead of silently dropping their revenue.
        return selectedFloor === "All floors" && !roomNameById.has(roomId);
      }),
    [bookings, scopedRoomIds, roomNameById, selectedFloor],
  );

  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => dayKeyOf(now), [now]);
  const fiscalStartYear = fiscalYearOf(now);
  const fiscalYearLabel = `FY ${fiscalStartYear}-${String(fiscalStartYear + 1).slice(-2)}`;

  const rows: StayRow[] = useMemo(
    () =>
      scopedBookings.map((booking) => {
        const checkIn = asDate(booking.checkIn);
        const checkOut = asDate(booking.checkOut);
        const nights = Math.max(
          1,
          numeric(booking.nights) ||
            (checkIn && checkOut
              ? Math.round(
                  (startOfDay(checkOut).getTime() -
                    startOfDay(checkIn).getTime()) /
                    86400000,
                )
              : 1),
        );
        const amount = numeric(booking.total);
        const paid = numeric(booking.amountPaid);
        return {
          booking,
          checkIn,
          checkOut,
          nights,
          amount,
          paid,
          outstanding: isCancelled(booking) ? 0 : Math.max(0, amount - paid),
        };
      }),
    [scopedBookings],
  );

  // A stay occupies one bed (dorm) or one key (room) per booking.
  const occupiedUnitsOn = (day: Date) =>
    scopedBookings.filter((booking) => {
      if (!isOpen(booking)) return false;
      const checkIn = asDate(booking.checkIn);
      const checkOut = asDate(booking.checkOut);
      if (!checkIn || !checkOut) return false;
      return startOfDay(checkIn) <= day && startOfDay(checkOut) > day;
    }).length;

  const stats = useMemo(() => {
    const activeRooms = scopedRooms.filter(
      (resource) => String(resource.status || "").toLowerCase() === "active",
    );
    const totalUnits = activeRooms.reduce(
      (sum, resource) => sum + capacityUnitsOf(resource, roomType),
      0,
    );
    const todayStart = startOfDay(now);
    const occupiedUnits = occupiedUnitsOn(todayStart);
    const occupancyToday = totalUnits
      ? Math.min(100, Math.round((occupiedUnits / totalUnits) * 100))
      : 0;

    const inHouse = scopedBookings.filter(isCheckedIn);
    const arrivalsToday = scopedBookings.filter(
      (booking) =>
        isBooked(booking) && dayKey(booking.checkIn) === todayKey,
    );
    const departuresToday = scopedBookings.filter(
      (booking) =>
        isCheckedIn(booking) && dayKey(booking.checkOut) === todayKey,
    );
    const overdueCheckouts = scopedBookings.filter((booking) => {
      if (!isCheckedIn(booking)) return false;
      const checkOut = asDate(booking.checkOut);
      return checkOut ? startOfDay(checkOut) < todayStart : false;
    });

    const cancelledCount = scopedBookings.filter(isCancelled).length;
    const cancellationRate = scopedBookings.length
      ? Math.round((cancelledCount / scopedBookings.length) * 100)
      : 0;

    const todayMovements = [
      ...arrivalsToday.map((booking) => ({ kind: "Arrival" as const, booking })),
      ...departuresToday.map((booking) => ({
        kind: "Departure" as const,
        booking,
      })),
    ].sort((left, right) =>
      String(left.booking.guestName || "").localeCompare(
        String(right.booking.guestName || ""),
      ),
    );

    return {
      totalRooms: activeRooms.length,
      allRooms: scopedRooms.length,
      totalUnits,
      occupiedUnits,
      occupancyToday,
      inHouse,
      arrivalsToday,
      departuresToday,
      overdueCheckouts,
      cancelledCount,
      cancellationRate,
      todayMovements,
      availableUnits: Math.max(0, totalUnits - occupiedUnits),
      averageUnits:
        activeRooms.length > 0
          ? Math.round((totalUnits / activeRooms.length) * 10) / 10
          : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, roomType, scopedBookings, scopedRooms, todayKey]);

  const commercial = useMemo(() => {
    const monthlyLabels = [
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
    ];
    const fiscalMonths = Array.from(
      { length: 12 },
      (_, index) => new Date(fiscalStartYear, index + 3, 1),
    );
    const monthlyRevenue = fiscalMonths.map(() => 0);
    const monthlyStays = fiscalMonths.map(() => 0);

    const liveRows = rows.filter((row) => !isCancelled(row.booking));

    liveRows.forEach((row) => {
      if (!row.checkIn) return;
      const index = fiscalMonths.findIndex(
        (month) => monthKeyOf(month) === monthKeyOf(row.checkIn!),
      );
      if (index === -1) return;
      monthlyRevenue[index] += row.amount;
      monthlyStays[index] += 1;
    });

    const fiscalYears = new Set<number>([fiscalStartYear]);
    rows.forEach((row) => {
      if (row.checkIn) fiscalYears.add(fiscalYearOf(row.checkIn));
    });
    const yearly = Array.from(fiscalYears)
      .sort((left, right) => left - right)
      .map((yearStart) => {
        const yearRows = liveRows.filter(
          (row) => row.checkIn && fiscalYearOf(row.checkIn) === yearStart,
        );
        return {
          fiscalYear: `FY ${yearStart}-${String(yearStart + 1).slice(-2)}`,
          revenue: yearRows.reduce((sum, row) => sum + row.amount, 0),
          stays: yearRows.length,
        };
      });

    const revenueFiscalYear = liveRows
      .filter(
        (row) =>
          row.checkIn && fiscalYearOf(row.checkIn) === fiscalStartYear,
      )
      .reduce((sum, row) => sum + row.amount, 0);
    const completedRows = rows.filter((row) => isCheckedOut(row.booking));
    const completedNights = completedRows.reduce(
      (sum, row) => sum + row.nights,
      0,
    );
    const completedRevenue = completedRows.reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    const adr = completedNights ? completedRevenue / completedNights : 0;
    const avgNights = completedRows.length
      ? completedNights / completedRows.length
      : numeric(analytics?.summary?.avgNights);

    const pendingRows = rows.filter(
      (row) => !isCancelled(row.booking) && row.outstanding > 0,
    );
    const pendingPaymentAmount = pendingRows.reduce(
      (sum, row) => sum + row.outstanding,
      0,
    );

    const statusMap = new Map<string, number>();
    scopedBookings.forEach((booking) => {
      const label = readableLabel(booking.status || "Not recorded");
      statusMap.set(label, (statusMap.get(label) || 0) + 1);
    });
    const statusBreakdown = [...statusMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);

    const paymentBreakdown = [
      {
        label: "Paid in full",
        value: liveRows.filter((row) => row.outstanding <= 0).length,
      },
      {
        label: "Partially paid",
        value: liveRows.filter(
          (row) => row.outstanding > 0 && row.paid > 0,
        ).length,
      },
      {
        label: "Unpaid",
        value: liveRows.filter(
          (row) => row.outstanding > 0 && row.paid <= 0,
        ).length,
      },
      {
        label: "Cancelled",
        value: stats.cancelledCount,
      },
    ].filter((item) => item.value > 0);

    const floorMap = new Map<string, number>();
    scopedRooms.forEach((resource) => {
      const label = resource.floor?.trim() || "Unassigned";
      floorMap.set(label, (floorMap.get(label) || 0) + 1);
    });
    const floorBreakdown = [...floorMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);

    const capacityBands = [
      { label: "1–2", min: 1, max: 2 },
      { label: "3–4", min: 3, max: 4 },
      { label: "5–8", min: 5, max: 8 },
      { label: "9+", min: 9, max: Number.POSITIVE_INFINITY },
    ];
    const capacityBreakdown = capacityBands
      .map((band) => ({
        label: band.label,
        value: scopedRooms.filter((resource) => {
          const capacity = capacityUnitsOf(resource, roomType);
          return capacity >= band.min && capacity <= band.max;
        }).length,
      }))
      .filter((item) => item.value > 0);

    const lengthBands = [
      { label: "1 night", min: 1, max: 1 },
      { label: "2–3 nights", min: 2, max: 3 },
      { label: "4–7 nights", min: 4, max: 7 },
      { label: "8+ nights", min: 8, max: Number.POSITIVE_INFINITY },
    ];
    const lengthBreakdown = lengthBands
      .map((band) => ({
        label: band.label,
        value: liveRows.filter(
          (row) => row.nights >= band.min && row.nights <= band.max,
        ).length,
      }))
      .filter((item) => item.value > 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysElapsed = now.getDate();
    const roomPerformance = scopedRooms
      .map((resource) => {
        const id = roomIdOf(resource);
        const roomRows = rows.filter(
          (row) => String(row.booking.roomId || "") === id,
        );
        const liveRoomRows = roomRows.filter(
          (row) => !isCancelled(row.booking),
        );
        const monthNights = liveRoomRows.reduce((sum, row) => {
          if (!row.checkIn || !row.checkOut) return sum;
          const start = Math.max(
            startOfDay(row.checkIn).getTime(),
            monthStart.getTime(),
          );
          const end = Math.min(
            startOfDay(row.checkOut).getTime(),
            startOfDay(now).getTime(),
          );
          return end > start ? sum + (end - start) / 86400000 : sum;
        }, 0);
        const availableNights =
          capacityUnitsOf(resource, roomType) * daysElapsed;
        return {
          id,
          name: resource.name || "Unnamed",
          floor: resource.floor?.trim() || "Unassigned",
          wing: resource.wing || "",
          capacity: capacityUnitsOf(resource, roomType),
          pricePerNight: numeric(resource.pricePerNight),
          status: resource.status || "Not recorded",
          stays: liveRoomRows.length,
          monthStays: liveRoomRows.filter(
            (row) => row.checkIn && row.checkIn >= monthStart,
          ).length,
          nights: monthNights,
          revenue: liveRoomRows.reduce((sum, row) => sum + row.amount, 0),
          occupancy: availableNights
            ? Math.min(
                100,
                Math.round((monthNights / availableNights) * 100),
              )
            : 0,
        };
      })
      .sort(
        (left, right) =>
          right.nights - left.nights || right.stays - left.stays,
      );

    const bookedRooms = roomPerformance.filter((room) => room.stays > 0);
    const topRooms = bookedRooms
      .slice(0, 5)
      .map((room) => ({ label: room.name, value: room.stays }));
    const otherRoomStays = bookedRooms
      .slice(5)
      .reduce((sum, room) => sum + room.stays, 0);
    if (otherRoomStays > 0) {
      topRooms.push({ label: "Other rooms", value: otherRoomStays });
    }

    const activeRoomPerformance = roomPerformance.filter(
      (room) => String(room.status || "").toLowerCase() === "active",
    );
    const leastOccupiedRoom = [...activeRoomPerformance].sort(
      (left, right) => left.occupancy - right.occupancy,
    )[0];

    const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekdayCounts = weekdayLabels.map(() => 0);
    liveRows.forEach((row) => {
      if (!row.checkIn) return;
      const index = (row.checkIn.getDay() + 6) % 7;
      weekdayCounts[index] += 1;
    });

    const arrivalsNext7 = rows
      .filter(
        (row) =>
          isBooked(row.booking) &&
          row.checkIn &&
          row.checkIn.getTime() >= startOfDay(now).getTime() &&
          row.checkIn.getTime() <=
            startOfDay(now).getTime() + 7 * 86400000,
      )
      .sort(
        (left, right) => left.checkIn!.getTime() - right.checkIn!.getTime(),
      )
      .slice(0, 20);

    const recentRows = [...rows]
      .filter((row) => row.checkIn)
      .sort((left, right) => {
        const leftTime = left.checkIn!.getTime();
        const rightTime = right.checkIn!.getTime();
        if (leftTime !== rightTime) return rightTime - leftTime;
        return numeric(right.booking.bookingNumber) - numeric(left.booking.bookingNumber);
      })
      .slice(0, 60);

    return {
      monthlyLabels,
      monthlyRevenue,
      monthlyStays,
      yearly,
      revenueFiscalYear,
      completedCount: completedRows.length,
      completedRevenue,
      adr,
      avgNights,
      pendingPaymentAmount,
      pendingPaymentCount: pendingRows.length,
      statusBreakdown,
      paymentBreakdown,
      floorBreakdown,
      capacityBreakdown,
      lengthBreakdown,
      roomPerformance,
      topRooms,
      leastOccupiedRoom,
      weekdayLabels,
      weekdayCounts,
      arrivalsNext7,
      recentRows,
    };
  }, [
    analytics?.summary?.avgNights,
    fiscalStartYear,
    now,
    roomType,
    rows,
    scopedBookings,
    scopedRooms,
    stats.cancelledCount,
  ]);

  const analyticsDaily = useMemo(() => {
    const daily = Array.isArray(analytics?.daily) ? analytics.daily : [];
    const last30 = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - index));
      return dayKeyOf(date);
    });
    const byDate = new Map(daily.map((entry) => [entry.date, entry]));
    return {
      labels: last30.map((key) => {
        const date = new Date(`${key}T00:00:00`);
        return date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        });
      }),
      bookings: last30.map((key) => byDate.get(key)?.bookings || 0),
      revenue: last30.map((key) => byDate.get(key)?.revenue || 0),
    };
  }, [analytics?.daily, now]);

  const roomRows = useMemo(
    () =>
      [...commercial.roomPerformance].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [commercial.roomPerformance],
  );

  const busiestRoom = commercial.roomPerformance.find(
    (room) => room.stays > 0,
  );

  const roomNameOf = (booking: RoomStayBooking) =>
    roomNameById.get(String(booking.roomId || "")) || "Removed room";

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
              className="absolute inset-y-0 right-0 w-full overflow-hidden bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            >
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
            </div>
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[58%]">
              <h1 className="text-[30px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
                <span className="text-primary">{headingPrimary}</span>{" "}
                <span className="text-accent">{headingAccent}</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
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
            <div className="absolute right-6 top-5 z-10 flex items-center gap-2.5 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <MapPinned size={15} className="shrink-0 text-white/90" />
              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                  Scope
                </p>
                <select
                  value={selectedFloor}
                  onChange={(event) => setSelectedFloor(event.target.value)}
                  className="-mt-0.5 max-w-[140px] bg-transparent text-[12px] font-pmedium text-white outline-none [&>option]:text-slate-900"
                >
                  <option>All floors</option>
                  {floorOptions.map((floor) => (
                    <option key={floor}>{floor}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError} Existing dashboard values may be incomplete.
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={<DoorOpen size={20} />}
              label={`Bookable ${nounPlural}`}
              value={stats.totalRooms}
              sub={`${stats.totalUnits} ${unitLabel} in the selected floor scope`}
            />
            <StatTile
              icon={<BedDouble size={20} />}
              label={roomType === "Dorm" ? "Bed capacity" : "Room keys"}
              value={stats.totalUnits}
              sub={`Average ${stats.averageUnits} ${unitLabel} per ${nounLower}`}
            />
            <StatTile
              icon={<CircleGauge size={20} />}
              label="Occupancy today"
              value={`${stats.occupancyToday}%`}
              sub={`${stats.occupiedUnits} of ${stats.totalUnits} ${unitLabel} occupied · ${stats.availableUnits} free`}
              status="success"
            />
            <StatTile
              icon={<Users size={20} />}
              label="In-house guests"
              value={stats.inHouse.length}
              sub={`${stats.overdueCheckouts.length} overdue checkout${stats.overdueCheckouts.length === 1 ? "" : "s"}`}
              status={stats.overdueCheckouts.length > 0 ? "attention" : "default"}
            />
            <StatTile
              icon={<LogIn size={20} />}
              label="Arrivals today"
              value={stats.arrivalsToday.length}
              sub={`${stats.arrivalsToday.length} guests expected to check in`}
            />
            <StatTile
              icon={<LogOut size={20} />}
              label="Departures today"
              value={stats.departuresToday.length}
              sub={`${stats.departuresToday.length} stays due to check out`}
            />
            <StatTile
              icon={<IndianRupee size={20} />}
              label="Booked stay value"
              value={currency(commercial.revenueFiscalYear)}
              sub={`${fiscalYearLabel} · ${commercial.completedCount} completed stays`}
            />
            <StatTile
              icon={<Wallet size={20} />}
              label="Pending payments"
              value={currency(commercial.pendingPaymentAmount)}
              sub={`${commercial.pendingPaymentCount} stays with a balance due`}
              status={
                commercial.pendingPaymentCount > 0 ? "attention" : "success"
              }
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-pmedium text-slate-900">
                Manage {nounLower} operations
              </p>
              <p className="mt-1 text-[10px] font-pmedium text-slate-500">
                Open the underlying records used by this dashboard.
                {lastUpdated
                  ? ` Last refreshed ${lastUpdated.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}.`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Card
              icon={<CalendarCheck />}
              title={`${noun} Reservations`}
              route={managementRoute}
              state={{ fromSection: `${category}-management` }}
            />
            <Card
              icon={<Ticket />}
              title={`${noun} Booking`}
              route={bookingRoute}
              state={{ fromSection: `${category}-management` }}
            />
            <Card
              icon={<Tag />}
              title="Resource & Pricing"
              route={resourcePricingRoute}
              state={{ fromSection: `${category}-management` }}
            />
            <Card
              icon={<ShoppingCart />}
              title="Sales Architecture"
              route="/department-accesses/sales-department/sales-architecture"
              state={{ fromSection: `${category}-management` }}
            />
          </div>
        </div>

        {/* ───────────────────────── Charts ───────────────────────── */}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ChartCard
              title="Stay Revenue by Month"
              subtitle="Saved stay value by check-in month for the current fiscal year, excluding cancellations."
              action={
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-[0.08em] text-slate-400">
                    Reporting period
                  </p>
                  <p className="mt-1 text-[11px] font-pmedium text-slate-700">
                    {fiscalYearLabel}
                  </p>
                </div>
              }
            >
              {commercial.monthlyRevenue.some((value) => value > 0) ? (
                <ReactApexChart
                  type="area"
                  height={320}
                  series={[
                    {
                      name: "Stay revenue",
                      data: commercial.monthlyRevenue,
                    },
                  ]}
                  options={{
                    chart: {
                      toolbar: { show: false },
                      fontFamily: "Poppins",
                      zoom: { enabled: false },
                    },
                    colors: ["#2563EB"],
                    stroke: { curve: "smooth", width: 3 },
                    fill: {
                      type: "gradient",
                      gradient: { opacityFrom: 0.22, opacityTo: 0.02 },
                    },
                    markers: {
                      size: 4,
                      colors: ["#ffffff"],
                      strokeColors: "#2563EB",
                      strokeWidth: 2,
                    },
                    dataLabels: { enabled: false },
                    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
                    xaxis: {
                      categories: commercial.monthlyLabels,
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                      labels: {
                        style: { colors: "#64748b", fontSize: "11px" },
                      },
                    },
                    yaxis: {
                      labels: {
                        formatter: (value: number) => currency(value),
                      },
                    },
                    tooltip: {
                      y: {
                        formatter: (
                          value: number,
                          { dataPointIndex }: { dataPointIndex: number },
                        ) =>
                          `${currency(value)} · ${
                            commercial.monthlyStays[dataPointIndex] ?? 0
                          } stays`,
                      },
                    },
                  }}
                />
              ) : (
                <Empty>
                  Add stay bookings with a saved total to populate this chart.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Today's Front Desk"
              subtitle={now.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              bodyClassName=""
              action={<RecordCountChip count={stats.todayMovements.length} />}
              footer={
                <Link
                  to={managementRoute}
                  state={{ fromSection: `${category}-management` }}
                  className="flex items-center justify-between px-5 py-3 text-[11px] font-pmedium text-blue-600 transition hover:bg-blue-50/50"
                >
                  Review all reservations <ArrowRight size={14} />
                </Link>
              }
            >
              {stats.todayMovements.length ? (
                <div className="divide-y divide-slate-100">
                  {stats.todayMovements.slice(0, 8).map((movement, index) => (
                    <div
                      key={
                        movement.booking._id ||
                        `${movement.kind}-${movement.booking.bookingNumber || index}`
                      }
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-pmedium text-slate-800">
                          {movement.booking.guestName || "Unnamed guest"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {roomNameOf(movement.booking)} ·{" "}
                          {movement.kind === "Arrival"
                            ? `arrives ${shortDate(movement.booking.checkIn)}`
                            : `departs ${shortDate(movement.booking.checkOut)}`}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-pmedium ${
                          movement.kind === "Arrival"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {movement.kind}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[160px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                  No arrivals or departures are scheduled for today.
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && commercial.yearly.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-4">
            <ChartCard
              title="Yearly Stays & Revenue"
              subtitle="Live stay count and saved value per fiscal year — every year on record, not just the current one."
            >
              <ReactApexChart
                type="bar"
                height={300}
                series={[
                  {
                    name: "Revenue",
                    data: commercial.yearly.map((row) => row.revenue),
                  },
                  {
                    name: "Stays",
                    data: commercial.yearly.map((row) => row.stays),
                  },
                ]}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: "Poppins" },
                  colors: ["#2563EB", "#93c5fd"],
                  plotOptions: {
                    bar: {
                      horizontal: false,
                      columnWidth: "48%",
                      borderRadius: 5,
                    },
                  },
                  dataLabels: { enabled: false },
                  grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
                  xaxis: {
                    categories: commercial.yearly.map((row) => row.fiscalYear),
                    labels: {
                      style: { colors: "#64748b", fontSize: "11px" },
                    },
                  },
                  yaxis: [
                    {
                      title: { text: "Revenue" },
                      labels: {
                        formatter: (value: number) => currency(value),
                      },
                    },
                    {
                      opposite: true,
                      title: { text: "Stays" },
                      labels: {
                        formatter: (value: number) => `${Math.round(value)}`,
                      },
                    },
                  ],
                  legend: {
                    position: "top",
                    fontSize: "11px",
                    labels: { colors: "#64748b" },
                  },
                  tooltip: {
                    shared: true,
                    intersect: false,
                    y: {
                      formatter: (
                        value: number,
                        { seriesIndex }: { seriesIndex: number },
                      ) =>
                        seriesIndex === 0
                          ? currency(value)
                          : `${value} stay${value === 1 ? "" : "s"}`,
                    },
                  },
                }}
              />
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Stay Status"
              subtitle="Every stay record in the selected floor scope, by status."
            >
              {commercial.statusBreakdown.length ? (
                <DonutChart
                  centerLabel="Stays"
                  labels={commercial.statusBreakdown.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(
                    0,
                    commercial.statusBreakdown.length,
                  )}
                  series={commercial.statusBreakdown.map((item) => item.value)}
                  tooltipValue={commercial.statusBreakdown.map(
                    (item) => `${item.value} stays`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>No stays recorded for this floor scope.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Payment Collection"
              subtitle="Paid, partially paid, unpaid, and cancelled stays."
            >
              {commercial.paymentBreakdown.length ? (
                <DonutChart
                  centerLabel="Stays"
                  labels={commercial.paymentBreakdown.map(
                    (item) => item.label,
                  )}
                  colors={
                    commercial.paymentBreakdown.length > 1
                      ? ["#2563EB", "#60a5fa", "#F59E0B", "#64748B"].slice(
                          0,
                          commercial.paymentBreakdown.length,
                        )
                      : ["#2563EB"]
                  }
                  series={commercial.paymentBreakdown.map(
                    (item) => item.value,
                  )}
                  tooltipValue={commercial.paymentBreakdown.map(
                    (item) => `${item.value} stays`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>No payment details recorded yet.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Floor Mix"
              subtitle={`${nounPlural} grouped by the floor saved on the resource.`}
            >
              {commercial.floorBreakdown.length ? (
                <DonutChart
                  centerLabel={nounPlural}
                  labels={commercial.floorBreakdown.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(
                    0,
                    commercial.floorBreakdown.length,
                  )}
                  series={commercial.floorBreakdown.map((item) => item.value)}
                  tooltipValue={commercial.floorBreakdown.map(
                    (item) => `${item.value} ${nounPlural}`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>No {nounPlural} recorded for this floor scope.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title={roomType === "Dorm" ? "Bed Capacity Mix" : "Room Size Mix"}
              subtitle={`${nounPlural} grouped by saved capacity (${unitLabel}).`}
            >
              {commercial.capacityBreakdown.length ? (
                <DonutChart
                  centerLabel={nounPlural}
                  labels={commercial.capacityBreakdown.map(
                    (item) => item.label,
                  )}
                  colors={DONUT_PALETTE.slice(
                    0,
                    commercial.capacityBreakdown.length,
                  )}
                  series={commercial.capacityBreakdown.map(
                    (item) => item.value,
                  )}
                  tooltipValue={commercial.capacityBreakdown.map(
                    (item) => `${item.value} ${nounPlural}`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>
                  Add capacity to {nounPlural} to see the size mix.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Length of Stay"
              subtitle="Live stays grouped by number of nights booked."
            >
              {commercial.lengthBreakdown.length ? (
                <DonutChart
                  centerLabel="Stays"
                  labels={commercial.lengthBreakdown.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(
                    0,
                    commercial.lengthBreakdown.length,
                  )}
                  series={commercial.lengthBreakdown.map((item) => item.value)}
                  tooltipValue={commercial.lengthBreakdown.map(
                    (item) => `${item.value} stays`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>No live stays to break down by length.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title={`Top ${nounPlural} by Stays`}
              subtitle="Most-booked rooms, top 5 + other."
            >
              {commercial.topRooms.length ? (
                <DonutChart
                  centerLabel="Stays"
                  labels={commercial.topRooms.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(0, commercial.topRooms.length)}
                  series={commercial.topRooms.map((item) => item.value)}
                  tooltipValue={commercial.topRooms.map(
                    (item) => `${item.value} stays`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>No {nounLower} stays recorded yet.</Empty>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ChartCard
              title="Check-ins by Weekday"
              subtitle="Live stays grouped by the weekday guests check in."
              action={<CalendarClock size={18} className="text-blue-600" />}
            >
              {commercial.weekdayCounts.some((value) => value > 0) ? (
                <GroupedBarGraph
                  series={[
                    {
                      name: "Check-ins",
                      data: commercial.weekdayCounts,
                    },
                  ]}
                  options={{
                    chart: {
                      type: "bar",
                      toolbar: { show: false },
                      fontFamily: "inherit",
                    },
                    colors: ["#2563EB"],
                    plotOptions: {
                      bar: {
                        horizontal: false,
                        columnWidth: "46%",
                        borderRadius: 5,
                        borderRadiusApplication: "end",
                      },
                    },
                    dataLabels: { enabled: false },
                    xaxis: {
                      categories: commercial.weekdayLabels,
                      labels: {
                        style: { colors: "#64748b", fontSize: "10px" },
                      },
                    },
                    yaxis: {
                      labels: {
                        style: { colors: "#94a3b8", fontSize: "11px" },
                      },
                    },
                    grid: { borderColor: "#f1f5f9" },
                  }}
                />
              ) : (
                <Empty>
                  Stays with a saved check-in date will populate this chart.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Occupancy by Room"
              subtitle="Month-to-date occupied nights per room, ranked highest to lowest."
              bodyClassName=""
            >
              {commercial.roomPerformance.length ? (
                <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
                  {commercial.roomPerformance.map((room) => (
                    <div
                      key={room.id || room.name}
                      className="px-5 py-4 transition hover:bg-slate-50/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-pmedium text-slate-800">
                            {room.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {room.floor} · {room.capacity} {unitLabel} ·{" "}
                            {room.monthStays} stays this month
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-pmedium ${
                            room.occupancy >= 60
                              ? "bg-emerald-50 text-emerald-700"
                              : room.occupancy >= 25
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {room.occupancy}%
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, room.occupancy)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No {nounLower} records are available for this floor scope.
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Checkouts & Revenue (30 days)"
              subtitle="Completed stays by checkout date, from the saved stay reporting endpoint."
            >
              {analyticsDaily.bookings.some((value) => value > 0) ? (
                <GroupedBarGraph
                  series={[
                    {
                      name: "Checkouts",
                      data: analyticsDaily.bookings,
                    },
                  ]}
                  options={{
                    chart: {
                      type: "bar",
                      toolbar: { show: false },
                      fontFamily: "inherit",
                    },
                    colors: ["#60a5fa"],
                    plotOptions: {
                      bar: {
                        horizontal: false,
                        columnWidth: "52%",
                        borderRadius: 4,
                        borderRadiusApplication: "end",
                      },
                    },
                    dataLabels: { enabled: false },
                    xaxis: {
                      categories: analyticsDaily.labels,
                      labels: {
                        style: { colors: "#94a3b8", fontSize: "9px" },
                        rotate: -45,
                        rotateAlways: true,
                      },
                    },
                    yaxis: {
                      labels: {
                        style: { colors: "#94a3b8", fontSize: "11px" },
                      },
                    },
                    grid: { borderColor: "#f1f5f9" },
                    tooltip: {
                      y: {
                        formatter: (
                          value: number,
                          { dataPointIndex }: { dataPointIndex: number },
                        ) =>
                          `${value} checkout${value === 1 ? "" : "s"} · ${currency(
                            analyticsDaily.revenue[dataPointIndex] ?? 0,
                          )}`,
                      },
                    },
                  }}
                />
              ) : (
                <Empty>
                  Completed stays in the last 30 days will populate this chart.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Operational Attention"
              bodyClassName="p-5"
              footer={
                <Link
                  to={resourcePricingRoute}
                  className="flex items-center justify-between px-5 py-3 text-[11px] font-pmedium text-slate-700 transition hover:text-blue-700"
                >
                  Review {nounLower} and pricing setup <ArrowRight size={15} />
                </Link>
              }
            >
              <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-blue-600"
                />
                <div>
                  <p className="text-[11px] font-pmedium text-slate-800">
                    {commercial.leastOccupiedRoom
                      ? `${commercial.leastOccupiedRoom.name} has the most free ${unitLabel}`
                      : `Add ${nounPlural} to begin tracking occupancy`}
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    {commercial.leastOccupiedRoom
                      ? `${commercial.leastOccupiedRoom.occupancy}% occupied this month with ${commercial.leastOccupiedRoom.monthStays} stays. Promote this ${nounLower} or move shorter stays here.`
                      : `Create ${nounPlural} resources with nightly pricing, then take bookings to populate this dashboard.`}
                  </p>
                </div>
              </div>
              {stats.arrivalsToday.length > 0 ? (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-4">
                  <LogIn size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-[11px] font-pmedium text-slate-800">
                      {stats.arrivalsToday.length} arrival
                      {stats.arrivalsToday.length === 1 ? "" : "s"} due today
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      {stats.arrivalsToday
                        .slice(0, 3)
                        .map((booking) => booking.guestName || "Unnamed guest")
                        .join(", ")}
                      {stats.arrivalsToday.length > 3
                        ? ` and ${stats.arrivalsToday.length - 3} more`
                        : ""}
                      . Complete check-in from the reservations desk.
                    </p>
                  </div>
                </div>
              ) : null}
              {commercial.pendingPaymentCount > 0 ? (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-amber-50/70 p-4">
                  <Wallet size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-[11px] font-pmedium text-slate-800">
                      {currency(commercial.pendingPaymentAmount)} awaiting
                      collection
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      {commercial.pendingPaymentCount} live stays have a balance
                      due. Follow up before the next check-out.
                    </p>
                  </div>
                </div>
              ) : null}
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <ChartCard title="Stay Snapshot">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      30-day occupancy
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {numeric(analytics?.summary?.occupancyRate)}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Avg stay
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {commercial.avgNights
                      ? `${commercial.avgNights.toFixed(1)} nights`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Avg nightly rate
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {commercial.adr > 0 ? currency(commercial.adr) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Cancellation rate
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {stats.cancellationRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Total {unitLabel}
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {stats.totalUnits}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Busiest {nounLower}
                    </span>
                  </div>
                  <span className="max-w-[140px] truncate text-[11px] font-pmedium text-slate-900">
                    {busiestRoom?.name || "No stays yet"}
                  </span>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Stay Mix">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {commercial.capacityBreakdown.map((band, index) => (
                  <div
                    key={band.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: DONUT_PALETTE[index] }}
                      />
                      <span className="text-[11px] font-pmedium text-slate-600">
                        {band.label} {unitLabel}
                      </span>
                    </div>
                    <span className="text-[13px] font-pmedium text-slate-900">
                      {band.value}
                    </span>
                  </div>
                ))}
                {commercial.lengthBreakdown.map((band, index) => (
                  <div
                    key={band.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            DONUT_PALETTE[
                              (commercial.capacityBreakdown.length + index) %
                                DONUT_PALETTE.length
                            ],
                        }}
                      />
                      <span className="text-[11px] font-pmedium text-slate-600">
                        {band.label}
                      </span>
                    </div>
                    <span className="text-[13px] font-pmedium text-slate-900">
                      {band.value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Moon size={14} className="text-blue-600" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Completed stays
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {commercial.completedCount}
                  </span>
                </div>
              </div>
            </ChartCard>
          </div>
        )}

        {/* ───────────────────────── Tables ───────────────────────── */}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-4">
            <ChartCard
              title={`${noun} Register`}
              subtitle={`Every ${nounLower} in the selected floor scope, including saved nightly pricing and month-to-date occupancy.`}
              action={<RecordCountChip count={roomRows.length} />}
              bodyClassName=""
            >
              {roomRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[960px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">{noun}</th>
                        <th className="px-4 py-3">Floor / wing</th>
                        <th className="px-4 py-3 text-right">
                          {roomType === "Dorm" ? "Beds" : "Keys"}
                        </th>
                        <th className="px-4 py-3 text-right">Price / night</th>
                        <th className="px-4 py-3 text-right">Stays</th>
                        <th className="px-4 py-3 text-right">
                          Occupied nights
                        </th>
                        <th className="px-4 py-3 text-right">Occupancy</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roomRows.map((room, index) => {
                        const isActive =
                          String(room.status).toLowerCase() === "active";
                        return (
                          <tr
                            key={room.id || `${room.name}-${index}`}
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-3 text-slate-900">
                              {room.name}
                            </td>
                            <td className="px-4 py-3">
                              {room.floor}
                              {room.wing ? ` · ${room.wing}` : ""}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.capacity}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.pricePerNight > 0
                                ? currency(room.pricePerNight)
                                : "Not recorded"}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.stays}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.nights.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.occupancy}%
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {room.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No {nounLower} records are available for this floor scope.
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Upcoming Arrivals"
              subtitle={`Guests booked to check in over the next 7 days in the selected floor scope.`}
              action={<RecordCountChip count={commercial.arrivalsNext7.length} />}
              bodyClassName=""
            >
              {commercial.arrivalsNext7.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Check-in</th>
                        <th className="px-4 py-3">Guest</th>
                        <th className="px-4 py-3">{noun}</th>
                        <th className="px-4 py-3 text-right">Nights</th>
                        <th className="px-4 py-3 text-right">
                          Rate / night
                        </th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commercial.arrivalsNext7.map((row, index) => (
                        <tr
                          key={
                            row.booking._id ||
                            `${row.booking.bookingNumber || index}`
                          }
                          className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                        >
                          <td className="px-5 py-3 text-slate-900">
                            {dateLabel(row.booking.checkIn)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-900">
                              {row.booking.guestName || "Unnamed guest"}
                            </p>
                            {row.booking.guestPhone ? (
                              <p className="mt-0.5 text-[9px] text-slate-400">
                                {row.booking.guestPhone}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {roomNameOf(row.booking)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {row.nights}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {row.booking.ratePerNight
                              ? currency(numeric(row.booking.ratePerNight))
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(
                                row.booking.status,
                              )}`}
                            >
                              {readableLabel(row.booking.status)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-900">
                            {row.amount > 0 ? currency(row.amount) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No arrivals are scheduled for the next 7 days.
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Stay Register"
              subtitle="The most recent stay bookings, including status, payment, and saved totals."
              action={<RecordCountChip count={commercial.recentRows.length} />}
              bodyClassName=""
            >
              {commercial.recentRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[1040px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Check-in</th>
                        <th className="px-4 py-3">Check-out</th>
                        <th className="px-4 py-3">Guest</th>
                        <th className="px-4 py-3">{noun}</th>
                        <th className="px-4 py-3 text-right">Nights</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-5 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commercial.recentRows.map((row, index) => {
                        const paymentLabel = isCancelled(row.booking)
                          ? "Cancelled"
                          : row.outstanding <= 0
                            ? "Paid in full"
                            : row.paid > 0
                              ? "Partially paid"
                              : "Unpaid";
                        return (
                          <tr
                            key={
                              row.booking._id ||
                              `${row.booking.bookingNumber || index}`
                            }
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-3 text-slate-900">
                              {dateLabel(row.booking.checkIn)}
                            </td>
                            <td className="px-4 py-3">
                              {dateLabel(row.booking.checkOut)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-slate-900">
                                {row.booking.guestName || "Unnamed guest"}
                              </p>
                              {row.booking.bookingNumber ? (
                                <p className="mt-0.5 text-[9px] text-slate-400">
                                  #{row.booking.bookingNumber}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              {roomNameOf(row.booking)}
                              {row.booking.bedNumber
                                ? ` · bed ${row.booking.bedNumber}`
                                : ""}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {row.nights}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(
                                  row.booking.status,
                                )}`}
                              >
                                {readableLabel(row.booking.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${
                                  paymentLabel === "Paid in full"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : paymentLabel === "Cancelled"
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {paymentLabel}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-slate-900">
                              {row.amount > 0 ? currency(row.amount) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No {nounLower} stays are available for this floor scope.
                </div>
              )}
            </ChartCard>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
