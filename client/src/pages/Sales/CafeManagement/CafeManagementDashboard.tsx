import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import {
  AlertTriangle,
  Armchair,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  ChefHat,
  Clock,
  Coffee,
  IndianRupee,
  MapPinned,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import cafeBannerImage from "../../../assets/cafe-banner.jpg";
import {
  getCafeAnalytics,
  getCafeMenuItems,
  getCafeOrders,
  getCafeReservations,
  getCafeTables,
  type CafeMenuItem,
  type CafeOrder,
  type CafeReservation,
  type CafeTable,
} from "../../../services/cafe";

type CafeAnalytics = {
  summary?: { revenue?: number; billedOrders?: number; averageBill?: number };
  topItems?: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  peakHours?: Array<{ hour: number; orders: number; revenue: number }>;
  daily?: Array<{ date: string; orders: number; revenue: number }>;
};

// Matches the colour language used by the coworking, meeting-room and
// room-stay dashboards so all four key-app dashboards read as one family.
const DONUT_PALETTE = ["#1E3D73", "#2563EB", "#3b82f6", "#60a5fa", "#93c5fd", "#64748B"];

const paletteFor = (count: number) =>
  Array.from(
    { length: Math.max(1, count) },
    (_, index) => DONUT_PALETTE[index % DONUT_PALETTE.length],
  );

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

const dateLabel = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const timeLabel = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "Not recorded";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const readableLabel = (value?: string) =>
  String(value || "Not recorded")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const fiscalYearOf = (date: Date) =>
  date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;

const hourLabel = (hour: number) => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const base = hour % 12 === 0 ? 12 : hour % 12;
  return `${base} ${suffix}`;
};

const localDateInput = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const waitLabel = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
};

// Server responses arrive as { success, message, data }, and axios adds one
// more `.data` layer, so most payloads resolve at `payload.data.data`.
const toList = (payload: any): any[] => {
  const data = payload?.data ?? payload;
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

const toObject = <T,>(payload: any): T | null => {
  const data = payload?.data;
  if (!data || Array.isArray(data)) return null;
  return (data.data ?? data) as T;
};

const orderStatusTone = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("cancel")) return "bg-red-50 text-red-700";
  if (value === "paid") return "bg-emerald-50 text-emerald-700";
  if (value === "ready") return "bg-violet-50 text-violet-700";
  if (value === "preparing") return "bg-amber-50 text-amber-700";
  if (value === "placed") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
};

const reservationStatusTone = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("cancel")) return "bg-red-50 text-red-700";
  if (value.includes("no-show")) return "bg-amber-50 text-amber-700";
  if (value.includes("seated")) return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
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

const ALL_TABLES = "All tables";
const managementRoute = "/key-apps/cafe-management/dashboard";
const ordersRoute = "/common-modules/cafe-orders";
const salesArchitectureRoute =
  "/department-accesses/sales-department/sales-architecture?vertical=cafe";

export default function CafeManagementDashboard() {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [openOrders, setOpenOrders] = useState<CafeOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<CafeOrder[]>([]);
  const [reservations, setReservations] = useState<CafeReservation[]>([]);
  const [menuItems, setMenuItems] = useState<CafeMenuItem[]>([]);
  const [analytics, setAnalytics] = useState<CafeAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedTable, setSelectedTable] = useState(ALL_TABLES);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const headingParts = "Cafe Management".split(" ");
  const headingAccent = headingParts.pop() || "";
  const headingPrimary = headingParts.join(" ");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([
      getCafeTables(),
      getCafeOrders({ scope: "open" }),
      getCafeOrders({ scope: "history" }),
      getCafeReservations(localDateInput(0)),
      getCafeMenuItems(),
      getCafeAnalytics(30),
    ]).then((results) => {
      if (cancelled) return;
      const [tablesResult, openResult, historyResult, reservationsResult, menuResult, analyticsResult] =
        results;

      if (tablesResult.status === "fulfilled")
        setTables(toList(tablesResult.value) as CafeTable[]);
      if (openResult.status === "fulfilled")
        setOpenOrders(toList(openResult.value) as CafeOrder[]);
      if (historyResult.status === "fulfilled")
        setHistoryOrders(toList(historyResult.value) as CafeOrder[]);
      if (reservationsResult.status === "fulfilled")
        setReservations(toList(reservationsResult.value) as CafeReservation[]);
      if (menuResult.status === "fulfilled")
        setMenuItems(toList(menuResult.value) as CafeMenuItem[]);
      if (analyticsResult.status === "fulfilled")
        setAnalytics(toObject<CafeAnalytics>(analyticsResult.value));

      const failures = results.filter((result) => result.status === "rejected");
      setLoadError(
        failures.length
          ? "Some table, order, or reporting data could not be refreshed."
          : "",
      );
      setLastUpdated(new Date());
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const now = useMemo(() => new Date(), []);
  const fiscalStartYear = fiscalYearOf(now);
  const fiscalYearLabel = `FY ${fiscalStartYear}-${String(fiscalStartYear + 1).slice(-2)}`;

  const tableById = useMemo(() => {
    const map = new Map<string, CafeTable>();
    tables.forEach((table) => map.set(String(table._id), table));
    return map;
  }, [tables]);

  const tableNameOf = (order: CafeOrder) => {
    const tableId = String(order.tableId || "");
    if (tableId) return tableById.get(tableId)?.name || order.tableLabel || "Removed table";
    return order.tableLabel || "Walk-in / Takeaway";
  };

  const selectedTableId = useMemo(() => {
    if (selectedTable === ALL_TABLES) return "";
    return String(
      tables.find((table) => table.name === selectedTable)?._id || "",
    );
  }, [selectedTable, tables]);

  const scopedTableIds = useMemo(
    () => new Set(selectedTableId ? [selectedTableId] : []),
    [selectedTableId],
  );

  const scopedOpenOrders = useMemo(
    () =>
      selectedTableId
        ? openOrders.filter((order) => scopedTableIds.has(String(order.tableId || "")))
        : openOrders,
    [openOrders, scopedTableIds, selectedTableId],
  );

  const scopedPaidOrders = useMemo(
    () =>
      historyOrders.filter(
        (order) =>
          order.status === "Paid" &&
          (!selectedTableId || scopedTableIds.has(String(order.tableId || ""))),
      ),
    [historyOrders, scopedTableIds, selectedTableId],
  );

  const scopedCancelledOrders = useMemo(
    () =>
      historyOrders.filter(
        (order) =>
          order.status === "Cancelled" &&
          (!selectedTableId || scopedTableIds.has(String(order.tableId || ""))),
      ),
    [historyOrders, scopedTableIds, selectedTableId],
  );

  const scopedReservations = useMemo(
    () =>
      selectedTableId
        ? reservations.filter((entry) => scopedTableIds.has(String(entry.tableId || "")))
        : reservations,
    [reservations, scopedTableIds, selectedTableId],
  );

  const scopedTables = useMemo(
    () =>
      selectedTableId
        ? tables.filter((table) => String(table._id) === selectedTableId)
        : tables,
    [tables, selectedTableId],
  );

  // ── Stat tiles ──────────────────────────────────────────────────────────

  const readyOrders = scopedOpenOrders.filter((order) => order.status === "Ready");
  const openOrderValue = scopedOpenOrders.reduce(
    (sum, order) => sum + numeric(order.total),
    0,
  );
  const openOrderItems = scopedOpenOrders.reduce(
    (sum, order) =>
      sum + (order.items ?? []).reduce((count, line) => count + numeric(line.quantity), 0),
    0,
  );

  const occupiedTables = scopedTables.filter((table) => table.openOrder).length;
  const activeTables = scopedTables.filter((table) => table.isActive).length;

  const seatedReservations = scopedReservations.filter(
    (entry) => entry.status === "Seated",
  );
  const pendingReservations = scopedReservations.filter(
    (entry) => entry.status === "Confirmed",
  );

  const yearly = useMemo(() => {
    const years = new Set<number>();
    scopedPaidOrders.forEach((order) => {
      const billed = asDate(order.billedAt);
      if (billed) years.add(fiscalYearOf(billed));
    });
    if (!years.size) years.add(fiscalStartYear);
    return Array.from(years)
      .sort((left, right) => left - right)
      .map((start) => {
        const rows = scopedPaidOrders.filter((order) => {
          const billed = asDate(order.billedAt);
          return billed && fiscalYearOf(billed) === start;
        });
        return {
          fiscalYear: `FY ${start}-${String(start + 1).slice(-2)}`,
          revenue: rows.reduce((sum, order) => sum + numeric(order.total), 0),
          bills: rows.length,
        };
      });
  }, [scopedPaidOrders, fiscalStartYear]);

  const fiscalYearEntry =
    yearly.find((entry) => entry.fiscalYear === fiscalYearLabel) ?? {
      fiscalYear: fiscalYearLabel,
      revenue: 0,
      bills: 0,
    };

  const avgBill30 = useMemo(() => {
    if (!selectedTableId) return numeric(analytics?.summary?.averageBill);
    const cutoff = startOfDay(now).getTime() - 29 * 86400000;
    const rows = scopedPaidOrders.filter((order) => {
      const billed = asDate(order.billedAt);
      return billed && billed.getTime() >= cutoff;
    });
    const revenue = rows.reduce((sum, order) => sum + numeric(order.total), 0);
    return rows.length ? revenue / rows.length : 0;
  }, [selectedTableId, analytics, scopedPaidOrders, now]);

  const unavailableItems = menuItems.filter((item) => !item.isAvailable);
  const categoryMix = useMemo(() => {
    const map = new Map<string, number>();
    menuItems.forEach((item) => {
      const label = item.category?.trim() || "Uncategorised";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
  }, [menuItems]);

  const settledCount = scopedPaidOrders.length + scopedCancelledOrders.length;
  const cancellationRate = settledCount
    ? Math.round((scopedCancelledOrders.length / settledCount) * 100)
    : 0;

  // ── Chart data ──────────────────────────────────────────────────────────

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    [...scopedOpenOrders, ...scopedPaidOrders, ...scopedCancelledOrders].forEach(
      (order) => {
        const label = readableLabel(order.status);
        map.set(label, (map.get(label) || 0) + 1);
      },
    );
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
  }, [scopedOpenOrders, scopedPaidOrders, scopedCancelledOrders]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    scopedPaidOrders.forEach((order) => {
      const label = readableLabel(order.paymentMethod || "Not recorded");
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
  }, [scopedPaidOrders]);

  const topItems = useMemo(() => {
    const items = Array.isArray(analytics?.topItems) ? analytics.topItems : [];
    const head = items
      .slice(0, 5)
      .map((item) => ({
        label: item.name || "Unknown item",
        value: numeric(item.quantity),
      }));
    const otherQty = items
      .slice(5)
      .reduce((sum, item) => sum + numeric(item.quantity), 0);
    if (otherQty > 0) head.push({ label: "Other items", value: otherQty });
    return head;
  }, [analytics]);

  const peakHours = useMemo(() => {
    const map = new Map<number, { orders: number; revenue: number }>();
    (analytics?.peakHours ?? []).forEach((bucket) =>
      map.set(Number(bucket.hour), {
        orders: numeric(bucket.orders),
        revenue: numeric(bucket.revenue),
      }),
    );
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: hourLabel(hour),
      orders: map.get(hour)?.orders ?? 0,
      revenue: map.get(hour)?.revenue ?? 0,
    }));
  }, [analytics]);

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
      orders: last30.map((key) => numeric(byDate.get(key)?.orders)),
      revenue: last30.map((key) => numeric(byDate.get(key)?.revenue)),
    };
  }, [analytics?.daily, now]);

  // Outlet-wide comparison of billed revenue per table; deliberately not
  // filtered by the table scope so the selection can be compared to the rest.
  const revenueByTable = useMemo(() => {
    const map = new Map<string, number>();
    historyOrders
      .filter((order) => order.status === "Paid")
      .forEach((order) => {
        const label = tableNameOf(order);
        map.set(label, (map.get(label) || 0) + numeric(order.total));
      });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOrders, tableById]);

  const maxTableRevenue = revenueByTable[0]?.value ?? 0;

  // Sold quantities for the menu register, following the selected table scope.
  const menuSold30 = useMemo(() => {
    const cutoff = startOfDay(now).getTime() - 29 * 86400000;
    const qty = new Map<string, number>();
    const revenue = new Map<string, number>();
    scopedPaidOrders.forEach((order) => {
      const billed = asDate(order.billedAt);
      if (!billed || billed.getTime() < cutoff) return;
      (order.items ?? []).forEach((line) => {
        const id = String(line.menuItemId || "");
        if (!id) return;
        qty.set(id, (qty.get(id) || 0) + numeric(line.quantity));
        revenue.set(id, (revenue.get(id) || 0) + numeric(line.lineTotal));
      });
    });
    return { qty, revenue };
  }, [scopedPaidOrders, now]);

  const menuRows = useMemo(
    () =>
      [...menuItems]
        .sort(
          (left, right) =>
            (left.category || "").localeCompare(right.category || "") ||
            left.name.localeCompare(right.name),
        )
        .map((item) => ({
          ...item,
          sold30: menuSold30.qty.get(String(item._id)) || 0,
          revenue30: menuSold30.revenue.get(String(item._id)) || 0,
        })),
    [menuItems, menuSold30],
  );

  const recentOrders = useMemo(
    () =>
      [...scopedOpenOrders, ...scopedPaidOrders, ...scopedCancelledOrders]
        .sort((left, right) => numeric(right.orderNumber) - numeric(left.orderNumber))
        .slice(0, 60),
    [scopedOpenOrders, scopedPaidOrders, scopedCancelledOrders],
  );

  // ── Operational attention ───────────────────────────────────────────────

  const longestWait = useMemo(() => {
    const waits = scopedOpenOrders
      .map((order) => {
        const created = asDate(order.createdAt);
        return {
          order,
          minutes: created
            ? Math.max(
                0,
                Math.floor((now.getTime() - created.getTime()) / 60000),
              )
            : 0,
        };
      })
      .sort((left, right) => right.minutes - left.minutes);
    return waits.length ? waits[0] : null;
  }, [scopedOpenOrders, now]);

  const cancelledValue = scopedCancelledOrders.reduce(
    (sum, order) => sum + numeric(order.total),
    0,
  );

  const busiestHour = [...peakHours].sort(
    (left, right) => right.orders - left.orders,
  )[0];
  const thirtyDayRevenue = numeric(analytics?.summary?.revenue);
  const thirtyDayBills = numeric(analytics?.summary?.billedOrders);

  const tableOptions = useMemo(
    () => tables.map((table) => table.name).filter(Boolean),
    [tables],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={cafeBannerImage}
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
                Live table occupancy, order flow, menu performance, and billed
                revenue across the cafe.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Tables", "Menu", "Orders", "Revenue"].map((tag) => (
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
                  value={selectedTable}
                  onChange={(event) => setSelectedTable(event.target.value)}
                  className="-mt-0.5 max-w-[140px] bg-transparent text-[12px] font-pmedium text-white outline-none [&>option]:text-slate-900"
                >
                  <option>{ALL_TABLES}</option>
                  {tableOptions.map((name) => (
                    <option key={name}>{name}</option>
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
              icon={<Receipt size={20} />}
              label="Open orders"
              value={scopedOpenOrders.length}
              sub={`${readyOrders.length} ready to serve · ${Math.max(0, scopedOpenOrders.length - readyOrders.length)} in progress`}
              status={readyOrders.length > 0 ? "attention" : "default"}
            />
            <StatTile
              icon={<IndianRupee size={20} />}
              label="Open order value"
              value={currency(openOrderValue)}
              sub={`${openOrderItems} items across ${new Set(scopedOpenOrders.map((order) => tableNameOf(order))).size} table${new Set(scopedOpenOrders.map((order) => tableNameOf(order))).size === 1 ? "" : "s"}`}
            />
            <StatTile
              icon={<Armchair size={20} />}
              label="Tables occupied"
              value={`${occupiedTables}/${activeTables}`}
              sub={`${Math.max(0, activeTables - occupiedTables)} free of ${scopedTables.length} in the selected scope`}
              status={occupiedTables === 0 ? "success" : "default"}
            />
            <StatTile
              icon={<CalendarCheck size={20} />}
              label="Reservations today"
              value={scopedReservations.length}
              sub={`${seatedReservations.length} seated · ${pendingReservations.length} still to arrive`}
              status={pendingReservations.length > 0 ? "attention" : "default"}
            />
            <StatTile
              icon={<Wallet size={20} />}
              label="Billed value"
              value={currency(fiscalYearEntry.revenue)}
              sub={`${fiscalYearLabel} · ${fiscalYearEntry.bills} paid bill${fiscalYearEntry.bills === 1 ? "" : "s"} in scope`}
            />
            <StatTile
              icon={<Coffee size={20} />}
              label="Average bill (30 days)"
              value={avgBill30 > 0 ? currency(avgBill30) : "—"}
              sub={
                selectedTableId
                  ? "From paid bills at this table"
                  : "Per paid bill, outlet-wide"
              }
            />
            <StatTile
              icon={<ChefHat size={20} />}
              label="Menu availability"
              value={`${menuItems.length - unavailableItems.length}/${menuItems.length}`}
              sub={`${unavailableItems.length} unavailable · ${categoryMix.length} categories`}
              status={unavailableItems.length > 0 ? "attention" : "success"}
            />
            <StatTile
              icon={<XCircle size={20} />}
              label="Cancellation rate"
              value={`${cancellationRate}%`}
              sub={`${scopedCancelledOrders.length} of ${settledCount} settled bills cancelled`}
              status={cancellationRate >= 10 ? "attention" : "success"}
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-pmedium text-slate-900">
                Manage cafe operations
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
            <DashboardModuleCard
              icon={<Receipt />}
              title="Cafe Orders"
              route={ordersRoute}
              state={{ fromSection: "cafe-management" }}
              description="Live orders, billing, and settlement"
              color="#EA580C"
            />
            <DashboardModuleCard
              icon={<CalendarCheck />}
              title="Reservations"
              route={managementRoute}
              state={{ fromSection: "cafe-management", tab: "reservations" }}
              description="Table reservations and guest arrivals"
              color="#2563EB"
            />
            <DashboardModuleCard
              icon={<Armchair />}
              title="Tables & Menu"
              route={managementRoute}
              state={{ fromSection: "cafe-management", tab: "tables" }}
              description="Table layout, menu, and availability"
              color="#0D9488"
            />
            <DashboardModuleCard
              icon={<ShoppingCart />}
              title="Cafe Architecture"
              route={salesArchitectureRoute}
              state={{ fromSection: "cafe-management" }}
              description="Cafe resources and service structure"
              color="#F59E0B"
            />
          </div>
        </div>

        {/* ───────────────────────── Charts ───────────────────────── */}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ChartCard
              title="Revenue by Day (30 days)"
              subtitle="Paid bill revenue per day for the last 30 days — outlet-wide, not affected by the table scope."
              action={
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-[0.08em] text-slate-400">
                    30-day total
                  </p>
                  <p className="mt-1 text-[11px] font-pmedium text-slate-700">
                    {currency(thirtyDayRevenue)}
                  </p>
                </div>
              }
            >
              {analyticsDaily.revenue.some((value) => value > 0) ? (
                <ReactApexChart
                  type="area"
                  height={320}
                  series={[
                    {
                      name: "Billed revenue",
                      data: analyticsDaily.revenue,
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
                      size: 3,
                      colors: ["#ffffff"],
                      strokeColors: "#2563EB",
                      strokeWidth: 2,
                    },
                    dataLabels: { enabled: false },
                    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
                    xaxis: {
                      categories: analyticsDaily.labels,
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                      labels: {
                        style: { colors: "#64748b", fontSize: "9px" },
                        rotate: -45,
                        rotateAlways: true,
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
                            analyticsDaily.orders[dataPointIndex] ?? 0
                          } paid bill${(analyticsDaily.orders[dataPointIndex] ?? 0) === 1 ? "" : "s"}`,
                      },
                    },
                  }}
                />
              ) : (
                <Empty>
                  Paid bills in the last 30 days will populate this chart.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Today's Reservations"
              subtitle={now.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              bodyClassName=""
              action={<RecordCountChip count={scopedReservations.length} />}
              footer={
                <Link
                  to={managementRoute}
                  state={{ fromSection: "cafe-management", tab: "reservations" }}
                  className="flex items-center justify-between px-5 py-3 text-[11px] font-pmedium text-blue-600 transition hover:bg-blue-50/50"
                >
                  Review all reservations <ArrowRight size={14} />
                </Link>
              }
            >
              {scopedReservations.length ? (
                <div className="divide-y divide-slate-100">
                  {scopedReservations.slice(0, 8).map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-pmedium text-slate-800">
                          {entry.guestName || "Unnamed guest"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {timeLabel(entry.reservationAt)} · {entry.partySize}{" "}
                          guest{entry.partySize === 1 ? "" : "s"} ·{" "}
                          {entry.tableId
                            ? tableById.get(String(entry.tableId))?.name ||
                              "Removed table"
                            : "No table assigned"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-pmedium ${reservationStatusTone(
                          entry.status,
                        )}`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[160px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
                  No reservations are booked for today in this scope.
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && yearly.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-4">
            <ChartCard
              title="Yearly Billed Revenue"
              subtitle="Paid bill value and count per fiscal year, from the most recent bills on record — outlet-wide."
            >
              <ReactApexChart
                type="bar"
                height={300}
                series={[
                  {
                    name: "Revenue",
                    data: yearly.map((row) => row.revenue),
                  },
                  {
                    name: "Paid bills",
                    data: yearly.map((row) => row.bills),
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
                    categories: yearly.map((row) => row.fiscalYear),
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
                      title: { text: "Paid bills" },
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
                          : `${value} bill${value === 1 ? "" : "s"}`,
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
              title="Order Status"
              subtitle="Live and settled bills in the selected table scope, by status."
            >
              {statusBreakdown.length ? (
                <DonutChart
                  centerLabel="Orders"
                  labels={statusBreakdown.map((item) => item.label)}
                  colors={paletteFor(statusBreakdown.length)}
                  series={statusBreakdown.map((item) => item.value)}
                  tooltipValue={statusBreakdown.map(
                    (item) => `${item.value} order${item.value === 1 ? "" : "s"}`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>No orders recorded for this table scope yet.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Payment Methods"
              subtitle="How paid bills in the selected table scope were settled."
            >
              {paymentBreakdown.length ? (
                <DonutChart
                  centerLabel="Bills"
                  labels={paymentBreakdown.map((item) => item.label)}
                  colors={paletteFor(paymentBreakdown.length)}
                  series={paymentBreakdown.map((item) => item.value)}
                  tooltipValue={paymentBreakdown.map(
                    (item) => `${item.value} bill${item.value === 1 ? "" : "s"}`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>No paid bills recorded for this table scope yet.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Menu Category Mix"
              subtitle="Menu items grouped by their saved category — menu is shared across tables."
            >
              {categoryMix.length ? (
                <DonutChart
                  centerLabel="Items"
                  labels={categoryMix.map((item) => item.label)}
                  colors={paletteFor(categoryMix.length)}
                  series={categoryMix.map((item) => item.value)}
                  tooltipValue={categoryMix.map(
                    (item) => `${item.value} item${item.value === 1 ? "" : "s"}`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>Add menu items to see the category mix.</Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Top Selling Items (30 days)"
              subtitle="Units sold per item on paid bills, top 5 + other — outlet-wide."
            >
              {topItems.length ? (
                <DonutChart
                  centerLabel="Units"
                  labels={topItems.map((item) => item.label)}
                  colors={paletteFor(topItems.length)}
                  series={topItems.map((item) => item.value)}
                  tooltipValue={topItems.map(
                    (item) => `${item.value} unit${item.value === 1 ? "" : "s"}`,
                  )}
                  handleClick={() => undefined}
                  onSliceClick={() => undefined}
                  width="100%"
                />
              ) : (
                <Empty>No paid bills in the last 30 days yet.</Empty>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ChartCard
              title="Peak Ordering Hours"
              subtitle="Paid bills by the hour they were billed over the last 30 days — outlet-wide."
              action={<CalendarClock size={18} className="text-blue-600" />}
            >
              {peakHours.some((bucket) => bucket.orders > 0) ? (
                <ReactApexChart
                  type="bar"
                  height={300}
                  series={[
                    {
                      name: "Paid bills",
                      data: peakHours.map((bucket) => bucket.orders),
                    },
                  ]}
                  options={{
                    chart: {
                      toolbar: { show: false },
                      fontFamily: "inherit",
                    },
                    colors: ["#2563EB"],
                    plotOptions: {
                      bar: {
                        horizontal: false,
                        columnWidth: "62%",
                        borderRadius: 3,
                        borderRadiusApplication: "end",
                      },
                    },
                    dataLabels: { enabled: false },
                    grid: { borderColor: "#f1f5f9" },
                    xaxis: {
                      categories: peakHours.map((bucket) => bucket.label),
                      labels: {
                        style: { colors: "#94a3b8", fontSize: "9px" },
                        rotate: -60,
                        rotateAlways: true,
                      },
                    },
                    yaxis: {
                      labels: {
                        style: { colors: "#94a3b8", fontSize: "11px" },
                      },
                    },
                    tooltip: {
                      y: {
                        formatter: (
                          value: number,
                          { dataPointIndex }: { dataPointIndex: number },
                        ) =>
                          `${value} bill${value === 1 ? "" : "s"} · ${currency(
                            peakHours[dataPointIndex]?.revenue ?? 0,
                          )}`,
                      },
                    },
                  }}
                />
              ) : (
                <Empty>
                  Billed orders over the last 30 days will populate this chart.
                </Empty>
              )}
            </ChartCard>

            <ChartCard
              title="Revenue by Table"
              subtitle="Total billed value per table across all bills on record — a comparison, so the table scope does not apply."
              bodyClassName=""
            >
              {revenueByTable.length ? (
                <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
                  {revenueByTable.map((row) => {
                    const share = maxTableRevenue
                      ? Math.round((row.value / maxTableRevenue) * 100)
                      : 0;
                    return (
                      <div
                        key={row.label}
                        className="px-5 py-4 transition hover:bg-slate-50/70"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-[11px] font-pmedium text-slate-800">
                            {row.label}
                          </p>
                          <span className="shrink-0 text-[11px] font-pmedium text-slate-900">
                            {currency(row.value)}
                          </span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No paid bills are on record yet.
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <ChartCard title="Operational Attention">
              {readyOrders.length > 0 ? (
                <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4">
                  <Clock size={18} className="mt-0.5 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-[11px] font-pmedium text-slate-800">
                      {readyOrders.length} order
                      {readyOrders.length === 1 ? "" : "s"} ready to serve
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      {readyOrders
                        .slice(0, 3)
                        .map(
                          (order) =>
                            `#${order.orderNumber} · ${tableNameOf(order)}`,
                        )
                        .join(", ")}
                      {readyOrders.length > 3
                        ? ` and ${readyOrders.length - 3} more`
                        : ""}
                      . Deliver them before they cool down.
                    </p>
                  </div>
                </div>
              ) : null}
              {longestWait && longestWait.minutes >= 15 ? (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-amber-50/70 p-4">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <div>
                    <p className="text-[11px] font-pmedium text-slate-800">
                      Order #{longestWait.order.orderNumber} at{" "}
                      {tableNameOf(longestWait.order)} has been open for{" "}
                      {waitLabel(longestWait.minutes)}
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      The longest-running open bill in this scope. Check with the
                      floor staff whether the guest is still waiting.
                    </p>
                  </div>
                </div>
              ) : null}
              {scopedCancelledOrders.length > 0 ? (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-red-50/70 p-4">
                  <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-[11px] font-pmedium text-slate-800">
                      {currency(cancelledValue)} lost to cancellations
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      {scopedCancelledOrders.length} cancelled bill
                      {scopedCancelledOrders.length === 1 ? "" : "s"} in this
                      scope. Review reasons from the order history.
                    </p>
                  </div>
                </div>
              ) : null}
              {unavailableItems.length > 0 ? (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-amber-50/70 p-4">
                  <ChefHat size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-[11px] font-pmedium text-slate-800">
                      {unavailableItems.length} menu item
                      {unavailableItems.length === 1 ? "" : "s"} marked
                      unavailable
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      {unavailableItems
                        .slice(0, 4)
                        .map((item) => item.name)
                        .join(", ")}
                      {unavailableItems.length > 4
                        ? ` and ${unavailableItems.length - 4} more`
                        : ""}
                      . Update availability from Tables &amp; Menu.
                    </p>
                  </div>
                </div>
              ) : null}
              {readyOrders.length === 0 &&
              !(longestWait && longestWait.minutes >= 15) &&
              scopedCancelledOrders.length === 0 &&
              unavailableItems.length === 0 ? (
                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-4">
                  <Coffee size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-[11px] font-pmedium text-slate-800">
                      Nothing needs attention right now
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      No ready orders, long waits, cancellations, or menu gaps in
                      this scope.
                    </p>
                  </div>
                </div>
              ) : null}
            </ChartCard>

            <ChartCard title="Cafe Snapshot">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      30-day revenue
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {currency(thirtyDayRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Paid bills (30d)
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {thirtyDayBills}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Avg bill (30d)
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {thirtyDayRevenue && thirtyDayBills
                      ? currency(thirtyDayRevenue / thirtyDayBills)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Busiest hour
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {busiestHour && busiestHour.orders > 0
                      ? busiestHour.label
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Top table by revenue
                    </span>
                  </div>
                  <span className="max-w-[140px] truncate text-[11px] font-pmedium text-slate-900">
                    {revenueByTable[0]?.label || "No bills yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Cancellation rate
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {cancellationRate}%
                  </span>
                </div>
              </div>
            </ChartCard>
          </div>
        )}

        {!isLoading && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <ChartCard title="Floor Snapshot">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Armchair size={14} className="text-blue-600" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Active tables
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {activeTables}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Users size={14} className="text-blue-600" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Total seats
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {scopedTables.reduce((sum, table) => sum + numeric(table.seats), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Tables occupied
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {occupiedTables}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Tables free
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {Math.max(0, activeTables - occupiedTables)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ChefHat size={14} className="text-blue-600" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Menu items
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {menuItems.length}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Menu categories
                    </span>
                  </div>
                  <span className="text-[13px] font-pmedium text-slate-900">
                    {categoryMix.length}
                  </span>
                </div>
              </div>
            </ChartCard>

            <ChartCard
              title="Today at the Cafe"
              subtitle="Reservations still to arrive alongside the live table load."
              action={<Users size={18} className="text-blue-600" />}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-400">
                    To arrive
                  </p>
                  <p className="mt-2 text-[22px] font-pmedium leading-none text-slate-900">
                    {pendingReservations.length}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    {pendingReservations.length
                      ? `${pendingReservations
                          .slice(0, 3)
                          .map((entry) => entry.guestName || "Unnamed guest")
                          .join(", ")}${pendingReservations.length > 3 ? ` and ${pendingReservations.length - 3} more` : ""}`
                      : "No confirmed reservations pending in this scope."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-400">
                    Seated today
                  </p>
                  <p className="mt-2 text-[22px] font-pmedium leading-none text-slate-900">
                    {seatedReservations.length}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    {seatedReservations.length
                      ? `${seatedReservations.reduce((sum, entry) => sum + numeric(entry.partySize), 0)} guests seated across the day`
                      : "No parties seated from today's reservations yet."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-400">
                    Live tables
                  </p>
                  <p className="mt-2 text-[22px] font-pmedium leading-none text-slate-900">
                    {occupiedTables}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    {occupiedTables
                      ? `${openOrderItems} items in progress on open bills`
                      : "Every table in this scope is free."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-400">
                    Open value
                  </p>
                  <p className="mt-2 text-[22px] font-pmedium leading-none text-slate-900">
                    {currency(openOrderValue)}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Awaiting billing from {scopedOpenOrders.length} open order
                    {scopedOpenOrders.length === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>
            </ChartCard>
          </div>
        )}

        {/* ───────────────────────── Tables ───────────────────────── */}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-4">
            <ChartCard
              title="Live Open Orders"
              subtitle="Unbilled orders in the selected table scope, oldest first, with how long each has been open."
              action={<RecordCountChip count={scopedOpenOrders.length} />}
              bodyClassName=""
            >
              {scopedOpenOrders.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[960px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-4 py-3">Table</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3 text-right">Items</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th className="px-4 py-3 text-right">Waiting</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...scopedOpenOrders]
                        .sort(
                          (left, right) =>
                            (asDate(left.createdAt)?.getTime() ?? 0) -
                            (asDate(right.createdAt)?.getTime() ?? 0),
                        )
                        .map((order, index) => {
                          const created = asDate(order.createdAt);
                          const minutes = created
                            ? Math.max(
                                0,
                                Math.floor(
                                  (now.getTime() - created.getTime()) / 60000,
                                ),
                              )
                            : 0;
                          return (
                            <tr
                              key={order._id || `${order.orderNumber}-${index}`}
                              className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                            >
                              <td className="px-5 py-3 text-slate-900">
                                #{order.orderNumber}
                              </td>
                              <td className="px-4 py-3">
                                {tableNameOf(order)}
                              </td>
                              <td className="px-4 py-3">
                                {order.customerName || "Walk-in guest"}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900">
                                {(order.items ?? []).reduce(
                                  (count, line) => count + numeric(line.quantity),
                                  0,
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900">
                                {currency(numeric(order.total))}
                              </td>
                              <td
                                className={`px-4 py-3 text-right ${
                                  minutes >= 30
                                    ? "text-amber-700"
                                    : "text-slate-900"
                                }`}
                              >
                                {waitLabel(minutes)}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${orderStatusTone(
                                    order.status,
                                  )}`}
                                >
                                  {readableLabel(order.status)}
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
                  No open orders in this table scope — every bill is settled.
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Menu Register"
              subtitle="Every menu item with saved pricing, availability, and quantities sold on paid bills over the last 30 days in this scope."
              action={<RecordCountChip count={menuRows.length} />}
              bodyClassName=""
            >
              {menuRows.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Item</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Sold (30d)</th>
                        <th className="px-4 py-3 text-right">
                          Revenue (30d)
                        </th>
                        <th className="px-5 py-3">Availability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {menuRows.map((item) => (
                        <tr
                          key={item._id}
                          className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                        >
                          <td className="px-5 py-3 text-slate-900">
                            {item.name}
                          </td>
                          <td className="px-4 py-3">
                            {item.category || "Uncategorised"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {numeric(item.price) > 0
                              ? currency(numeric(item.price))
                              : "Not recorded"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {item.sold30}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {item.revenue30 > 0 ? currency(item.revenue30) : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${
                                item.isAvailable
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {item.isAvailable ? "Available" : "Unavailable"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No menu items are saved yet. Add them from Tables &amp; Menu.
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Order Register"
              subtitle="The most recent orders, open and settled, including status, payment method, and totals."
              action={<RecordCountChip count={recentOrders.length} />}
              bodyClassName=""
            >
              {recentOrders.length ? (
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full min-w-[1040px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3">Table</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3 text-right">Items</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-5 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentOrders.map((order, index) => (
                        <tr
                          key={order._id || `${order.orderNumber}-${index}`}
                          className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                        >
                          <td className="px-5 py-3 text-slate-900">
                            #{order.orderNumber}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-900">
                              {dateLabel(order.createdAt)}
                            </p>
                            <p className="mt-0.5 text-[9px] text-slate-400">
                              {timeLabel(order.createdAt)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {tableNameOf(order)}
                          </td>
                          <td className="px-4 py-3">
                            {order.customerName || "Walk-in guest"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {(order.items ?? []).reduce(
                              (count, line) => count + numeric(line.quantity),
                              0,
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${orderStatusTone(
                                order.status,
                              )}`}
                            >
                              {readableLabel(order.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {order.status === "Paid" && order.paymentMethod
                              ? readableLabel(order.paymentMethod)
                              : "—"}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-900">
                            {order.status === "Cancelled"
                              ? "—"
                              : currency(numeric(order.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                  No orders are on record for this table scope yet.
                </div>
              )}
            </ChartCard>
          </div>
        )}
      </PageFrame>
    </div>
  );
}


