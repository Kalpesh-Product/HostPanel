import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CircleGauge,
  DoorOpen,
  IndianRupee,
  MapPinned,
  RefreshCw,
  ShoppingCart,
  Tag,
  Ticket,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import Card from "../../components/Card";
import meetingRoomBannerImage from "../../assets/meeting-room-banner.jpg";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import { getResources } from "../../services/resources";
import { getMeetingRoomBookings } from "../../services/meeting-room-bookings";
import { formatTime12h } from "../../utils/time";

type ResourceRecord = {
  recordId?: string;
  name?: string;
  resourceCategory?: string;
  type?: string;
  status?: string;
  capacity?: number;
  floor?: string;
  wing?: string;
  location?: string;
  pricePerHour?: number;
  pricePerDay?: number;
  credits?: number;
  amenities?: string[];
  currentlyBooked?: boolean;
};

type BookingRecord = {
  recordId?: string;
  id?: string;
  bookingCode?: string;
  bookingNumber?: number;
  roomId?: any;
  roomName?: string;
  floor?: string;
  wing?: string;
  roomType?: string;
  roomCapacity?: number;
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  storedStatus?: string;
  bookingType?: string;
  paymentStatus?: string;
  paymentMode?: string;
  totalAmount?: number;
  bookingCredits?: number;
  attendees?: number;
  purpose?: string;
  bookedByName?: string;
  bookedForName?: string;
  bookedByTenantCompanyName?: string;
  clientName?: string;
  clientCompany?: string;
  department?: string;
  createdAt?: string;
};

// Matches the server's default bookable day (09:00-22:00). The dashboard
// uses it only to estimate available room-hours for the utilisation figure;
// every other number is calculated straight from saved records.
const BOOKABLE_HOURS_PER_DAY = 13;
const ROOM_CATEGORIES = ["meeting_room", "conference_room"];

// Last color ("Other"/catch-all) stays a visible mid-tone slate, not a pale
// grey — a pale grey slice (and its white percentage label) disappears
// against this page's white card background.
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

const dateLabel = (value?: string) => {
  if (!value) return "Not recorded";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const readableLabel = (value?: string) =>
  String(value || "Not recorded")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const minutesOf = (value?: string) => {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return hours * 60 + (Number.isNaN(minutes) ? 0 : minutes);
};

const roomCategory = (room: ResourceRecord) => {
  const category = String(room.resourceCategory || "").toLowerCase();
  if (ROOM_CATEGORIES.includes(category)) return category;
  const type = String(room.type || "").toLowerCase();
  if (type.includes("conference")) return "conference_room";
  if (type.includes("meeting")) return "meeting_room";
  return "";
};

const resolvedRoomId = (booking: BookingRecord) => {
  const raw = booking.roomId;
  if (raw && typeof raw === "object") return String(raw._id || raw.id || "");
  return String(raw || "");
};

const bookingStatus = (booking: BookingRecord) =>
  String(booking.status || booking.storedStatus || "Not recorded").toLowerCase();

const isCancelled = (booking: BookingRecord) =>
  bookingStatus(booking).includes("cancel");

const isCompleted = (booking: BookingRecord) =>
  bookingStatus(booking).includes("complete");

const isPaidLike = (booking: BookingRecord) => {
  const status = String(booking.paymentStatus || "").trim();
  return (
    /paid|collected|not.?required|complete/i.test(status) ||
    numeric(booking.totalAmount) <= 0
  );
};

const bookingDays = (booking: BookingRecord) => {
  const start = new Date(`${String(booking.date || "").slice(0, 10)}T00:00:00`);
  const end = new Date(
    `${String(booking.endDate || booking.date || "").slice(0, 10)}T00:00:00`,
  );
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
};

const durationHours = (booking: BookingRecord) => {
  const start = minutesOf(booking.startTime);
  const end = minutesOf(booking.endTime);
  if (start === null || end === null || end <= start) return 0;
  return ((end - start) * bookingDays(booking)) / 60;
};

const bookingStart = (booking: BookingRecord) => {
  const date = String(booking.date || "").slice(0, 10);
  if (!date) return null;
  const dateTime = new Date(`${date}T${booking.startTime || "00:00"}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
};

const bookingEnd = (booking: BookingRecord) => {
  const date = String(booking.endDate || booking.date || "").slice(0, 10);
  if (!date) return null;
  const dateTime = new Date(`${date}T${booking.endTime || "23:59"}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
};

const timeRange = (booking: BookingRecord) => {
  const start = formatTime12h(booking.startTime || "");
  const end = formatTime12h(booking.endTime || "");
  if (!start && !end) return "Time not recorded";
  return `${start || "—"} – ${end || "—"}`;
};

const bookingPerson = (booking: BookingRecord) =>
  booking.bookedForName ||
  booking.bookedByTenantCompanyName ||
  booking.clientName ||
  booking.clientCompany ||
  booking.bookedByName ||
  "Unnamed booker";

const statusTone = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("cancel")) return "bg-red-50 text-red-700";
  if (value.includes("pending") || value.includes("resched"))
    return "bg-amber-50 text-amber-700";
  if (value.includes("progress") || value.includes("confirm"))
    return "bg-emerald-50 text-emerald-700";
  if (value.includes("complete")) return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
};

const paymentTone = (booking: BookingRecord) => {
  if (isCancelled(booking)) return "bg-slate-100 text-slate-600";
  if (isPaidLike(booking)) return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
};

const fiscalYearOf = (date: Date) =>
  date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;

const monthKeyOf = (date: Date) => date.getFullYear() * 12 + date.getMonth();

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

export default function MeetingRoomManagementPage() {
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("All floors");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([getResources(), getMeetingRoomBookings()]).then(
      (results) => {
        if (cancelled) return;
        const [resourcesResult, bookingsResult] = results;

        if (resourcesResult.status === "fulfilled") {
          const payload = resourcesResult.value?.data;
          const list = payload?.data?.resources || payload?.resources || [];
          setResources(Array.isArray(list) ? list : []);
        }

        if (bookingsResult.status === "fulfilled") {
          const payload: any = bookingsResult.value;
          const list = payload?.bookings || payload?.data?.bookings || [];
          setBookings(Array.isArray(list) ? list : []);
        }

        const failures = results.filter((result) => result.status === "rejected");
        setLoadError(
          failures.length
            ? "Some room or booking data could not be refreshed."
            : "",
        );
        setLastUpdated(new Date());
        setIsLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Only meeting and conference room resources belong on this dashboard —
  // desk, cabin and virtual-office records stay on the coworking dashboard.
  const roomResources = useMemo(
    () => resources.filter((resource) => Boolean(roomCategory(resource))),
    [resources],
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

  const roomIdSet = useMemo(
    () => new Set(scopedRooms.map((room) => String(room.recordId || ""))),
    [scopedRooms],
  );

  const roomNameSet = useMemo(
    () =>
      new Set(
        scopedRooms
          .map((room) => String(room.name || "").trim().toLowerCase())
          .filter(Boolean),
      ),
    [scopedRooms],
  );

  const scopedBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const roomId = resolvedRoomId(booking);
        if (roomId && roomIdSet.has(roomId)) return true;
        const name = String(booking.roomName || "").trim().toLowerCase();
        if (name && roomNameSet.has(name)) return true;
        // Bookings saved before the room was renamed still carry a floor —
        // keep them visible when a floor scope is active.
        return (
          selectedFloor !== "All floors" &&
          String(booking.floor || "").trim() === selectedFloor
        );
      }),
    [bookings, roomIdSet, roomNameSet, selectedFloor],
  );

  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, [now]);
  const fiscalStartYear = fiscalYearOf(now);
  const fiscalYearLabel = `FY ${fiscalStartYear}-${String(fiscalStartYear + 1).slice(-2)}`;

  const rows = useMemo(
    () =>
      scopedBookings.map((booking) => ({
        booking,
        start: bookingStart(booking),
        end: bookingEnd(booking),
        hours: durationHours(booking),
        amount: numeric(booking.totalAmount),
      })),
    [scopedBookings],
  );

  const stats = useMemo(() => {
    const activeRooms = scopedRooms.filter(
      (room) => String(room.status || "").toLowerCase() === "active",
    );
    const meetingRooms = scopedRooms.filter(
      (room) => roomCategory(room) === "meeting_room",
    );
    const conferenceRooms = scopedRooms.filter(
      (room) => roomCategory(room) === "conference_room",
    );
    const totalSeats = scopedRooms.reduce(
      (sum, room) => sum + numeric(room.capacity),
      0,
    );
    const averageSeats = scopedRooms.length
      ? Math.round(totalSeats / scopedRooms.length)
      : 0;

    const todayBookings = rows.filter(
      (row) =>
        String(row.booking.date || "").slice(0, 10) === todayKey &&
        !isCancelled(row.booking),
    );
    const todaySchedule = [...todayBookings].sort(
      (left, right) =>
        (minutesOf(left.booking.startTime) ?? 0) -
        (minutesOf(right.booking.startTime) ?? 0),
    );
    const inProgress = todayBookings.filter((row) => {
      if (isCompleted(row.booking)) return false;
      if (!row.start || !row.end) return false;
      return row.start <= now && row.end >= now;
    }).length;

    const upcoming = rows
      .filter((row) => {
        if (!row.start || !row.end) return false;
        if (isCancelled(row.booking) || isCompleted(row.booking)) return false;
        const inSevenDays =
          row.start.getTime() >= now.getTime() &&
          row.start.getTime() <= now.getTime() + 7 * 86400000;
        return inSevenDays;
      })
      .sort(
        (left, right) => left.start!.getTime() - right.start!.getTime(),
      );

    const monthRows = rows.filter(
      (row) =>
        row.start &&
        row.start.getFullYear() === now.getFullYear() &&
        row.start.getMonth() === now.getMonth() &&
        row.start <= now,
    );
    const activeMonthRows = monthRows.filter(
      (row) => !isCancelled(row.booking),
    );
    const monthHours = activeMonthRows.reduce(
      (sum, row) => sum + row.hours,
      0,
    );
    const availableHours =
      Math.max(activeRooms.length, 1) * BOOKABLE_HOURS_PER_DAY * now.getDate();
    const utilisation = availableHours
      ? Math.min(100, Math.round((monthHours / availableHours) * 100))
      : 0;

    const cancelledCount = scopedBookings.filter(isCancelled).length;
    const cancellationRate = scopedBookings.length
      ? Math.round((cancelledCount / scopedBookings.length) * 100)
      : 0;

    return {
      totalRooms: scopedRooms.length,
      meetingRooms: meetingRooms.length,
      conferenceRooms: conferenceRooms.length,
      activeRooms: activeRooms.length,
      totalSeats,
      averageSeats,
      todayBookings: todayBookings.length,
      inProgress,
      todaySchedule,
      upcoming,
      monthHours,
      availableHours,
      utilisation,
      cancelledCount,
      cancellationRate,
    };
  }, [now, scopedRooms, scopedBookings, rows, todayKey]);

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
    const monthlyBookings = fiscalMonths.map(() => 0);

    rows.forEach((row) => {
      if (!row.start || isCancelled(row.booking)) return;
      const index = fiscalMonths.findIndex(
        (month) => monthKeyOf(month) === monthKeyOf(row.start!),
      );
      if (index === -1) return;
      monthlyRevenue[index] += row.amount;
      monthlyBookings[index] += 1;
    });

    const fiscalYears = new Set<number>([fiscalStartYear]);
    rows.forEach((row) => {
      if (row.start) fiscalYears.add(fiscalYearOf(row.start));
    });
    const yearly = Array.from(fiscalYears)
      .sort((left, right) => left - right)
      .map((yearStart) => {
        const yearRows = rows.filter(
          (row) => row.start && fiscalYearOf(row.start) === yearStart,
        );
        const liveRows = yearRows.filter(
          (row) => !isCancelled(row.booking),
        );
        return {
          fiscalYear: `FY ${yearStart}-${String(yearStart + 1).slice(-2)}`,
          revenue: liveRows.reduce((sum, row) => sum + row.amount, 0),
          bookings: liveRows.length,
        };
      });

    const revenueFiscalYear = rows
      .filter(
        (row) =>
          row.start &&
          fiscalYearOf(row.start) === fiscalStartYear &&
          !isCancelled(row.booking),
      )
      .reduce((sum, row) => sum + row.amount, 0);
    const paidBookings = rows.filter(
      (row) =>
        row.start &&
        fiscalYearOf(row.start) === fiscalStartYear &&
        !isCancelled(row.booking) &&
        isPaidLike(row.booking),
    ).length;

    const pendingPaymentRows = rows.filter(
      (row) => !isCancelled(row.booking) && !isPaidLike(row.booking),
    );
    const pendingPaymentAmount = pendingPaymentRows.reduce(
      (sum, row) => sum + row.amount,
      0,
    );

    const upcomingRows = [...stats.upcoming].slice(0, 12);
    const recentRows = [...rows]
      .filter((row) => row.start)
      .sort((left, right) => right.start!.getTime() - left.start!.getTime())
      .slice(0, 60);

    const statusMap = new Map<string, number>();
    scopedBookings.forEach((booking) => {
      const label = readableLabel(booking.status || booking.storedStatus);
      statusMap.set(label, (statusMap.get(label) || 0) + 1);
    });
    const statusBreakdown = [...statusMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);

    const liveBookings = scopedBookings.filter(
      (booking) => !isCancelled(booking),
    );
    const typeMap = new Map<string, number>();
    liveBookings.forEach((booking) => {
      const label = readableLabel(booking.bookingType || "Internal");
      typeMap.set(label, (typeMap.get(label) || 0) + 1);
    });
    const typeBreakdown = [...typeMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);

    const paymentBreakdown = [
      {
        label: "Paid / no charge",
        value: scopedBookings.filter(
          (booking) => !isCancelled(booking) && isPaidLike(booking),
        ).length,
      },
      {
        label: "Payment pending",
        value: scopedBookings.filter(
          (booking) => !isCancelled(booking) && !isPaidLike(booking),
        ).length,
      },
      {
        label: "Cancelled",
        value: stats.cancelledCount,
      },
    ].filter((item) => item.value > 0);

    const capacityBands = [
      { label: "1–4 seats", min: 1, max: 4 },
      { label: "5–8 seats", min: 5, max: 8 },
      { label: "9–12 seats", min: 9, max: 12 },
      { label: "13+ seats", min: 13, max: Number.POSITIVE_INFINITY },
    ];
    const capacityBreakdown = capacityBands
      .map((band) => ({
        label: band.label,
        value: scopedRooms.filter((room) => {
          const capacity = numeric(room.capacity);
          return capacity >= band.min && capacity <= band.max;
        }).length,
      }))
      .filter((item) => item.value > 0);

    const roomTypeBreakdown = [
      {
        label: "Meeting rooms",
        value: scopedRooms.filter(
          (room) => roomCategory(room) === "meeting_room",
        ).length,
      },
      {
        label: "Conference rooms",
        value: scopedRooms.filter(
          (room) => roomCategory(room) === "conference_room",
        ).length,
      },
    ].filter((item) => item.value > 0);

    const monthRows = rows.filter(
      (row) =>
        row.start &&
        row.start.getFullYear() === now.getFullYear() &&
        row.start.getMonth() === now.getMonth() &&
        row.start <= now,
    );

    const roomPerformance = scopedRooms
      .map((room) => {
        const roomBookings = rows.filter((row) => {
          const roomId = resolvedRoomId(row.booking);
          if (roomId && roomId === String(room.recordId || "")) return true;
          return (
            String(row.booking.roomName || "").trim().toLowerCase() ===
            String(room.name || "").trim().toLowerCase()
          );
        });
        const liveRoomBookings = roomBookings.filter(
          (row) => !isCancelled(row.booking),
        );
        const roomMonthRows = monthRows.filter((row) =>
          roomBookings.some((candidate) => candidate.booking === row.booking),
        );
        const hours = roomMonthRows
          .filter((row) => !isCancelled(row.booking))
          .reduce((sum, row) => sum + row.hours, 0);
        const capacityHours = BOOKABLE_HOURS_PER_DAY * now.getDate();
        return {
          id: String(room.recordId || room.name || ""),
          name: room.name || "Unnamed room",
          floor: room.floor?.trim() || "Unassigned",
          wing: room.wing || "",
          category: roomCategory(room),
          capacity: numeric(room.capacity),
          pricePerHour: numeric(room.pricePerHour),
          credits: numeric(room.credits),
          status: room.status || "Not recorded",
          bookings: liveRoomBookings.length,
          monthBookings: roomMonthRows.filter(
            (row) => !isCancelled(row.booking),
          ).length,
          hours,
          utilisation: capacityHours
            ? Math.min(100, Math.round((hours / capacityHours) * 100))
            : 0,
        };
      })
      .sort(
        (left, right) =>
          right.hours - left.hours || right.bookings - left.bookings,
      );

    const bookedRooms = roomPerformance.filter((room) => room.bookings > 0);
    const topRooms = bookedRooms
      .slice(0, 5)
      .map((room) => ({ label: room.name, value: room.bookings }));
    const otherRoomBookings = bookedRooms
      .slice(5)
      .reduce((sum, room) => sum + room.bookings, 0);
    if (otherRoomBookings > 0) {
      topRooms.push({ label: "Other rooms", value: otherRoomBookings });
    }

    const activeRoomPerformance = roomPerformance.filter(
      (room) => String(room.status || "").toLowerCase() === "active",
    );
    const leastUsedRoom = [...activeRoomPerformance].sort(
      (left, right) => left.hours - right.hours,
    )[0];

    return {
      monthlyLabels,
      monthlyRevenue,
      monthlyBookings,
      yearly,
      revenueFiscalYear,
      paidBookings,
      pendingPaymentAmount,
      pendingPaymentCount: pendingPaymentRows.length,
      upcomingRows,
      recentRows,
      statusBreakdown,
      typeBreakdown,
      paymentBreakdown,
      capacityBreakdown,
      roomTypeBreakdown,
      roomPerformance,
      topRooms,
      leastUsedRoom,
    };
  }, [
    fiscalStartYear,
    now,
    rows,
    scopedBookings,
    scopedRooms,
    stats.cancelledCount,
    stats.upcoming,
  ]);

  const peakHours = useMemo(() => {
    const hours = Array.from({ length: 14 }, (_, index) => index + 7);
    const data = hours.map((hour) =>
      rows.filter((row) => {
        if (isCancelled(row.booking)) return false;
        if (!row.start) return false;
        if (
          row.start.getFullYear() !== now.getFullYear() ||
          row.start.getMonth() !== now.getMonth()
        )
          return false;
        return (minutesOf(row.booking.startTime) ?? -1) >= hour * 60 &&
          (minutesOf(row.booking.startTime) ?? -1) < (hour + 1) * 60;
      }).length,
    );
    return {
      labels: hours.map((hour) =>
        hour >= 12
          ? `${hour === 12 ? 12 : hour - 12} PM`
          : `${hour} AM`,
      ),
      data,
    };
  }, [now, rows]);

  const roomRows = useMemo(
    () =>
      [...commercial.roomPerformance].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [commercial.roomPerformance],
  );

  const busiestRoom = commercial.roomPerformance.find(
    (room) => room.bookings > 0,
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            {/* Photo area — a real meeting-room photo (Unsplash License),
                faded into the white panel on the left via mask, with a blue
                theme-color tint over it. */}
            <img
              src={meetingRoomBannerImage}
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
            {/* White panel — same inverse mask, so it blends into the image
                instead of a hard edge. */}
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
                <span className="text-primary">Meeting Room</span>{" "}
                <span className="text-accent">Management</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Live room availability, booking demand, utilization, payments,
                and revenue across every meeting and conference room.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[
                  "Meeting rooms",
                  "Conference rooms",
                  "Bookings",
                  "Revenue",
                ].map((tag) => (
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

        {/* Banner above is header-only; every number lives here instead, once. */}
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
              label="Bookable rooms"
              value={stats.totalRooms}
              sub={`${stats.meetingRooms} meeting rooms · ${stats.conferenceRooms} conference rooms`}
            />
            <StatTile
              icon={<Users size={20} />}
              label="Seat capacity"
              value={stats.totalSeats}
              sub={`Average ${stats.averageSeats} seats per room`}
            />
            <StatTile
              icon={<CalendarCheck size={20} />}
              label="Bookings today"
              value={stats.todayBookings}
              sub={`${stats.inProgress} in progress · ${stats.todaySchedule.length} on today's schedule`}
            />
            <StatTile
              icon={<CircleGauge size={20} />}
              label="Month-to-date utilisation"
              value={`${stats.utilisation}%`}
              sub={`${stats.monthHours.toFixed(1)} booked hrs of ${stats.availableHours} available (${BOOKABLE_HOURS_PER_DAY}h/day)`}
              status="success"
            />
            <StatTile
              icon={<CalendarClock size={20} />}
              label="Upcoming (7 days)"
              value={stats.upcoming.length}
              sub="Confirmed and pending future bookings"
            />
            <StatTile
              icon={<IndianRupee size={20} />}
              label="Booked revenue"
              value={currency(commercial.revenueFiscalYear)}
              sub={`${fiscalYearLabel} · ${commercial.paidBookings} paid bookings`}
            />
            <StatTile
              icon={<Wallet size={20} />}
              label="Pending payments"
              value={currency(commercial.pendingPaymentAmount)}
              sub={`${commercial.pendingPaymentCount} bookings awaiting payment`}
              status={
                commercial.pendingPaymentCount > 0 ? "attention" : "success"
              }
            />
            <StatTile
              icon={<XCircle size={20} />}
              label="Cancellation rate"
              value={`${stats.cancellationRate}%`}
              sub={`${stats.cancelledCount} of ${scopedBookings.length} bookings cancelled`}
              status={stats.cancellationRate > 15 ? "attention" : "success"}
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-pmedium text-slate-900">
                Manage meeting room operations
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
              title="Meeting Room Booking"
              route="/meetings/meeting-rooms"
              state={{ fromSection: "meeting-room-management" }}
            />
            <Card
              icon={<Ticket />}
              title="All Bookings"
              route="/department-accesses/administration-department/bookings"
              state={{ fromSection: "meeting-room-management" }}
            />
            <Card
              icon={<Tag />}
              title="Resource & Pricing"
              route="/key-apps/meeting-room-management/resource-pricing"
              state={{ fromSection: "meeting-room-management" }}
            />
            <Card
              icon={<ShoppingCart />}
              title="Sales Architecture"
              route="/department-accesses/sales-department/sales-architecture"
              state={{ fromSection: "meeting-room-management" }}
            />
          </div>
        </div>

        {/* ───────────────────────── Charts — everything visual lives here ───────────────────────── */}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ChartCard
              title="Booked Revenue by Month"
              subtitle="Saved booking totals by month for the current fiscal year, excluding cancelled bookings."
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
                      name: "Booked revenue",
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
                      labels: { formatter: (value: number) => currency(value) },
                    },
                    tooltip: {
                      y: {
                        formatter: (value: number, { dataPointIndex }: { dataPointIndex: number }) =>
                          `${currency(value)} · ${commercial.monthlyBookings[dataPointIndex] ?? 0} bookings`,
                      },
                    },
                  }}
                />
              ) : (
                <Empty>
                  Add priced meeting-room bookings to populate this chart.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Today's Room Schedule"
              subtitle={now.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              bodyClassName=""
              action={<RecordCountChip count={stats.todaySchedule.length} />}
              footer={
                <Link
                  to="/department-accesses/administration-department/bookings"
                  state={{ fromSection: "meeting-room-management" }}
                  className="flex items-center justify-between px-5 py-3 text-[11px] font-pmedium text-blue-600 transition hover:bg-blue-50/50"
                >
                  Review all bookings <ArrowRight size={14} />
                </Link>
              }
            >
              {stats.todaySchedule.length ? (
                <div className="divide-y divide-slate-100">
                  {stats.todaySchedule.slice(0, 8).map((row, index) => (
                    <div
                      key={
                        row.booking.recordId ||
                        row.booking.bookingCode ||
                        `${row.booking.roomName || "room"}-${index}`
                      }
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-pmedium text-slate-800">
                          {row.booking.roomName || "Unnamed room"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {timeRange(row.booking)} ·{" "}
                          {bookingPerson(row.booking)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-pmedium ${statusTone(
                          row.booking.status,
                        )}`}
                      >
                        {readableLabel(row.booking.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[160px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                  No meeting rooms are booked for today.
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && commercial.yearly.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-4">
            <ChartCard
              title="Yearly Bookings & Revenue"
              subtitle="Live booking count and booked value per fiscal year — every year on record, not just the current one."
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
                    name: "Bookings",
                    data: commercial.yearly.map((row) => row.bookings),
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
                      labels: { formatter: (value: number) => currency(value) },
                    },
                    {
                      opposite: true,
                      title: { text: "Bookings" },
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
                          : `${value} booking${value === 1 ? "" : "s"}`,
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
              title="Booking Status"
              subtitle="Every booking record in the selected floor scope, by status."
            >
              {commercial.statusBreakdown.length ? (
                <DonutChart
                  centerLabel="Bookings"
                  labels={commercial.statusBreakdown.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(
                    0,
                    commercial.statusBreakdown.length,
                  )}
                  series={commercial.statusBreakdown.map((item) => item.value)}
                  tooltipValue={commercial.statusBreakdown.map(
                    (item) => `${item.value} bookings`,
                  )}
                />
              ) : (
                <Empty>No bookings recorded for this floor scope.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Booking Type Mix"
              subtitle="Internal, tenant, and external bookings, excluding cancellations."
            >
              {commercial.typeBreakdown.length ? (
                <DonutChart
                  centerLabel="Bookings"
                  labels={commercial.typeBreakdown.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(
                    0,
                    commercial.typeBreakdown.length,
                  )}
                  series={commercial.typeBreakdown.map((item) => item.value)}
                  tooltipValue={commercial.typeBreakdown.map(
                    (item) => `${item.value} bookings`,
                  )}
                />
              ) : (
                <Empty>No live bookings to break down by type.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Payment Status"
              subtitle="Paid, pending, and cancelled booking records."
            >
              {commercial.paymentBreakdown.length ? (
                <DonutChart
                  centerLabel="Bookings"
                  labels={commercial.paymentBreakdown.map((item) => item.label)}
                  colors={
                    commercial.paymentBreakdown.length > 1
                      ? ["#2563EB", "#F59E0B", "#64748B"].slice(
                          0,
                          commercial.paymentBreakdown.length,
                        )
                      : ["#2563EB"]
                  }
                  series={commercial.paymentBreakdown.map((item) => item.value)}
                  tooltipValue={commercial.paymentBreakdown.map(
                    (item) => `${item.value} bookings`,
                  )}
                />
              ) : (
                <Empty>No payment details recorded yet.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Room Type Mix"
              subtitle="Meeting rooms vs. conference rooms in the selected scope."
            >
              {commercial.roomTypeBreakdown.length ? (
                <DonutChart
                  centerLabel="Rooms"
                  labels={commercial.roomTypeBreakdown.map(
                    (item) => item.label,
                  )}
                  colors={DONUT_PALETTE.slice(
                    0,
                    commercial.roomTypeBreakdown.length,
                  )}
                  series={commercial.roomTypeBreakdown.map(
                    (item) => item.value,
                  )}
                  tooltipValue={commercial.roomTypeBreakdown.map(
                    (item) => `${item.value} rooms`,
                  )}
                />
              ) : (
                <Empty>No meeting or conference room records yet.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Capacity Mix"
              subtitle="Rooms grouped by saved seat capacity."
            >
              {commercial.capacityBreakdown.length ? (
                <DonutChart
                  centerLabel="Rooms"
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
                    (item) => `${item.value} rooms`,
                  )}
                />
              ) : (
                <Empty>Add room capacity to see the size mix.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Top Rooms by Bookings"
              subtitle="Most-booked rooms, top 5 + other."
            >
              {commercial.topRooms.length ? (
                <DonutChart
                  centerLabel="Bookings"
                  labels={commercial.topRooms.map((item) => item.label)}
                  colors={DONUT_PALETTE.slice(0, commercial.topRooms.length)}
                  series={commercial.topRooms.map((item) => item.value)}
                  tooltipValue={commercial.topRooms.map(
                    (item) => `${item.value} bookings`,
                  )}
                />
              ) : (
                <Empty>No room bookings recorded yet.</Empty>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ChartCard
              title="Peak Booking Hours"
              subtitle="Non-cancelled bookings starting in each hour this month."
              action={<CalendarClock size={18} className="text-blue-600" />}
            >
              {peakHours.data.some((value) => value > 0) ? (
                <GroupedBarGraph
                  series={[
                    {
                      name: "Bookings",
                      data: peakHours.data,
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
                      categories: peakHours.labels,
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
                  Bookings with a saved start time will populate this chart.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Room Performance"
              subtitle="Month-to-date booked hours per room, ranked highest to lowest."
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
                            {readableLabel(room.category)} · {room.floor} ·{" "}
                            {room.monthBookings} this month
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-pmedium ${room.utilisation >= 60 ? "bg-emerald-50 text-emerald-700" : room.utilisation >= 25 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          {room.hours.toFixed(1)} hrs
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, room.utilisation)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No meeting room records are available for this floor scope.
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <ChartCard
              title="Operational Attention"
              bodyClassName="p-5"
              footer={
                <Link
                  to="/key-apps/meeting-room-management/resource-pricing"
                  className="flex items-center justify-between px-5 py-3 text-[11px] font-pmedium text-slate-700 transition hover:text-blue-700"
                >
                  Review room and pricing setup <ArrowRight size={15} />
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
                    {commercial.leastUsedRoom
                      ? `${commercial.leastUsedRoom.name} has the most free time`
                      : "Add meeting rooms to begin tracking usage"}
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    {commercial.leastUsedRoom
                      ? `${commercial.leastUsedRoom.hours.toFixed(1)} booked hours this month with ${commercial.leastUsedRoom.bookings} bookings. Promote this room or move smaller meetings here.`
                      : "Create meeting or conference room resources with pricing, then take bookings to populate this dashboard."}
                  </p>
                </div>
              </div>
              {commercial.pendingPaymentCount > 0 ? (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-amber-50/70 p-4">
                  <Wallet size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-[11px] font-pmedium text-slate-800">
                      {currency(commercial.pendingPaymentAmount)} awaiting payment
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      {commercial.pendingPaymentCount} live bookings have a
                      balance due. Follow up before the next room slot.
                    </p>
                  </div>
                </div>
              ) : null}
            </ChartCard>

            <ChartCard title="Room Mix">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {commercial.roomTypeBreakdown.map((category, index) => (
                  <div
                    key={category.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: DONUT_PALETTE[index] }}
                      />
                      <span className="text-[11px] font-pmedium text-slate-600">
                        {category.label}
                      </span>
                    </div>
                    <span className="text-[13px] font-pmedium text-slate-900">
                      {category.value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Total seats
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {stats.totalSeats}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Busiest room
                    </span>
                  </div>
                  <span className="max-w-[140px] truncate text-[11px] font-pmedium text-slate-900">
                    {busiestRoom?.name || "No bookings yet"}
                  </span>
                </div>
              </div>
            </ChartCard>
          </div>
        )}

        {/* ───────────────────────── Tables — raw records, always last ───────────────────────── */}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-4">
            <ChartCard
              title="Room Register"
              subtitle="Every meeting and conference room in the selected floor scope, including saved pricing and month-to-date usage."
              action={<RecordCountChip count={roomRows.length} />}
              bodyClassName=""
            >
              {roomRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[1040px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Room</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Floor / wing</th>
                        <th className="px-4 py-3 text-right">Capacity</th>
                        <th className="px-4 py-3 text-right">Price / hour</th>
                        <th className="px-4 py-3 text-right">Credits / hour</th>
                        <th className="px-4 py-3 text-right">Bookings</th>
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
                              {readableLabel(room.category)}
                            </td>
                            <td className="px-4 py-3">
                              {room.floor}
                              {room.wing ? ` · ${room.wing}` : ""}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.capacity}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.pricePerHour > 0
                                ? currency(room.pricePerHour)
                                : "Not recorded"}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.credits > 0 ? room.credits : "Not recorded"}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {room.bookings}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
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
                  No meeting room records are available for this floor scope.
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Upcoming Bookings"
              subtitle="Next meetings in the selected floor scope, ordered by start time."
              action={<RecordCountChip count={commercial.upcomingRows.length} />}
              bodyClassName=""
            >
              {commercial.upcomingRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Room</th>
                        <th className="px-4 py-3">Booked by</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Attendees</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commercial.upcomingRows.map((row, index) => (
                        <tr
                          key={
                            row.booking.recordId ||
                            row.booking.bookingCode ||
                            `${row.booking.roomName || "room"}-${index}`
                          }
                          className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                        >
                          <td className="px-5 py-3 text-slate-900">
                            {dateLabel(row.booking.date)}
                          </td>
                          <td className="px-4 py-3">
                            {timeRange(row.booking)}
                          </td>
                          <td className="px-4 py-3">
                            {row.booking.roomName || "Not recorded"}
                          </td>
                          <td className="px-4 py-3">
                            {bookingPerson(row.booking)}
                          </td>
                          <td className="px-4 py-3">
                            {readableLabel(row.booking.bookingType)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {numeric(row.booking.attendees)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(row.booking.status)}`}
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
                  No upcoming bookings in the next 7 days.
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Booking Register"
              subtitle="The most recent meeting room bookings, including status, payment, and saved totals."
              action={<RecordCountChip count={commercial.recentRows.length} />}
              bodyClassName=""
            >
              {commercial.recentRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[1060px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Room</th>
                        <th className="px-4 py-3">Booked by</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commercial.recentRows.map((row, index) => (
                        <tr
                          key={
                            row.booking.recordId ||
                            row.booking.bookingCode ||
                            `${row.booking.roomName || "room"}-${index}`
                          }
                          className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                        >
                          <td className="px-5 py-3 text-slate-900">
                            {dateLabel(row.booking.date)}
                          </td>
                          <td className="px-4 py-3">
                            {timeRange(row.booking)}
                          </td>
                          <td className="px-4 py-3">
                            {row.booking.roomName || "Not recorded"}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-900">
                              {bookingPerson(row.booking)}
                            </p>
                            {row.booking.bookingCode ? (
                              <p className="mt-0.5 text-[9px] text-slate-400">
                                {row.booking.bookingCode}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {readableLabel(row.booking.bookingType)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(row.booking.status)}`}
                            >
                              {readableLabel(row.booking.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${paymentTone(row.booking)}`}
                            >
                              {row.booking.paymentStatus || "Not recorded"}
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
                  No meeting room bookings are available for this floor scope.
                </div>
              )}
            </ChartCard>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
