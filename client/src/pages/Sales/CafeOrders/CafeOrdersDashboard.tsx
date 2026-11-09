import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactApexChart from "react-apexcharts";
import {
  AlertTriangle,
  Armchair,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  Clock3,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import PageFrame from "../../../components/Pages/PageFrame";
import cafeBannerImage from "../../../assets/cafe-banner.jpg";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import {
  getCafeAnalytics,
  getCafeOrders,
  getCafeReservations,
  getCafeTables,
  type CafeOrder,
  type CafeReservation,
  type CafeTable,
} from "../../../services/cafe";

type CafeAnalytics = {
  summary?: { revenue?: number; billedOrders?: number; averageBill?: number };
  topItems?: Array<{ menuItemId: string; name: string; quantity: number; revenue: number }>;
  peakHours?: Array<{ hour: number; orders: number; revenue: number }>;
  daily?: Array<{ date: string; orders: number; revenue: number }>;
};

const localDateInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const toList = <T,>(response: any): T[] => {
  const payload = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(payload) ? payload : [];
};

const hourLabel = (hour: number) => {
  const normalized = Number(hour) || 0;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const display = normalized % 12 || 12;
  return `${display} ${suffix}`;
};

const dateLabel = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const statusClass = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value === "paid" || value === "served") return "bg-emerald-50 text-emerald-700";
  if (value === "ready") return "bg-violet-50 text-violet-700";
  if (value === "preparing") return "bg-amber-50 text-amber-700";
  if (value === "cancelled") return "bg-red-50 text-red-700";
  return "bg-blue-50 text-blue-700";
};

function SectionCard({
  title,
  subtitle,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle: string;
  bodyClassName?: string;
  children: ReactNode;
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

function StatTile({ icon, label, value, sub, tone = "blue" }: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub: string;
  tone?: "blue" | "amber" | "emerald" | "violet";
}) {
  const tones = {
    blue: {
      card: "hover:border-l-blue-600",
      icon: "border-l-blue-600 bg-blue-50 text-blue-700",
    },
    amber: {
      card: "hover:border-l-amber-500",
      icon: "border-l-amber-500 bg-amber-50 text-amber-700",
    },
    emerald: {
      card: "hover:border-l-emerald-500",
      icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    },
    violet: {
      card: "hover:border-l-violet-500",
      icon: "border-l-violet-500 bg-violet-50 text-violet-700",
    },
  };
  return (
    <div className={`flex min-h-[108px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-md ${tones[tone].card}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone].icon}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[20px] font-pmedium leading-none text-slate-900">{value}</p>
        <p className="mt-2 truncate text-[9px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export default function CafeOrdersDashboard() {
  const workspacePreferences = useWorkspacePreferences();
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [openOrders, setOpenOrders] = useState<CafeOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<CafeOrder[]>([]);
  const [reservations, setReservations] = useState<CafeReservation[]>([]);
  const [analytics, setAnalytics] = useState<CafeAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      getCafeTables(),
      getCafeOrders({ scope: "open" }),
      getCafeOrders({ scope: "history" }),
      getCafeReservations(localDateInput()),
      getCafeAnalytics(30),
    ]).then((results) => {
      if (cancelled) return;
      const [tablesResult, openResult, historyResult, reservationsResult, analyticsResult] = results;
      if (tablesResult.status === "fulfilled") setTables(toList<CafeTable>(tablesResult.value));
      if (openResult.status === "fulfilled") setOpenOrders(toList<CafeOrder>(openResult.value));
      if (historyResult.status === "fulfilled") setHistoryOrders(toList<CafeOrder>(historyResult.value));
      if (reservationsResult.status === "fulfilled") setReservations(toList<CafeReservation>(reservationsResult.value));
      if (analyticsResult.status === "fulfilled") setAnalytics(analyticsResult.value?.data?.data || null);
      if (results.some((result) => result.status === "rejected")) {
        setLoadError("Some café order data could not be refreshed.");
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const paidOrders = historyOrders.filter((order) => order.status === "Paid");
  const orderStatuses = useMemo(() => {
    const labels = ["Placed", "Preparing", "Ready", "Served", "Paid", "Cancelled"];
    return labels.map((label) => ({
      label,
      value: [...openOrders, ...historyOrders].filter((order) => order.status === label).length,
    })).filter((item) => item.value > 0);
  }, [openOrders, historyOrders]);

  const paymentMix = useMemo(() => {
    const counts = new Map<string, number>();
    paidOrders.forEach((order) => {
      const method = String(order.paymentMethod || "Not recorded").trim() || "Not recorded";
      counts.set(method, (counts.get(method) || 0) + 1);
    });
    return [...counts.entries()].map(([label, value]) => ({ label, value }));
  }, [paidOrders]);

  const recentOrders = useMemo(
    () => [...openOrders, ...historyOrders]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 8),
    [openOrders, historyOrders],
  );

  const activeTables = tables.filter((table) => table.isActive).length;
  const occupiedTables = new Set(openOrders.map((order) => String(order.tableId || "")).filter(Boolean)).size;
  const kitchenOrders = openOrders.filter((order) => ["Placed", "Preparing"].includes(order.status)).length;
  const readyOrders = openOrders.filter((order) => order.status === "Ready").length;
  const confirmedReservations = reservations.filter((reservation) => reservation.status === "Confirmed").length;

  const modules = [
    { id: "live", title: "Live Tables", description: "Take table orders and track service status", icon: Armchair, color: "#2563EB" },
    { id: "reservations", title: "Reservations", description: "Review arrivals and seat reserved guests", icon: CalendarClock, color: "#4F46E5" },
    { id: "insights", title: "Insights", description: "Monitor sales, demand, and popular items", icon: BarChart3, color: "#7C3AED" },
    { id: "history", title: "Order History", description: "Review settled and cancelled café orders", icon: Receipt, color: "#0F766E" },
  ];

  const dailyCategories = (analytics?.daily || []).map((item) =>
    dateLabel(item.date).replace(/ \d{4}$/, ""),
  );

  const orderTrendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "56%" } },
    dataLabels: { enabled: false },
    colors: ["#2563EB"],
    xaxis: { categories: dailyCategories },
    yaxis: { title: { text: "Orders" }, min: 0, forceNiceScale: true },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };

  const revenueTrendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    dataLabels: { enabled: false },
    stroke: { width: 3, curve: "smooth" as const },
    colors: ["#10B981"],
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.04, stops: [0, 95, 100] },
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

  const peakOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "58%" } },
    dataLabels: { enabled: false },
    colors: ["#2563EB"],
    xaxis: { categories: (analytics?.peakHours || []).map((item) => hourLabel(item.hour)) },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };

  const topItems = (analytics?.topItems || []).slice(0, 8);
  const topItemsOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "58%" } },
    dataLabels: { enabled: false },
    colors: ["#4F46E5"],
    xaxis: { categories: topItems.map((item) => item.name) },
    grid: { borderColor: "#EEF2F7" },
    tooltip: { theme: "light" },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img src={cafeBannerImage} alt="" aria-hidden="true" className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)" }} />
            <div aria-hidden="true" className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3B82F6]/35 to-[#60A5FA]/20 sm:w-[64%]" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)" }} />
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]" style={{ WebkitMaskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)", maskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)" }} />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[76%]">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[29px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[36px]">
                <span className="text-primary">Cafe Orders</span><span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-md text-[11px] font-pmedium leading-5 text-slate-500">Live table service, reservations, kitchen flow, sales performance, and order history.</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Tables", "Kitchen", "Sales", "Reservations"].map((tag) => <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600">{tag}</span>)}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Open orders</p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">{openOrders.length}</p>
            </div>
          </div>
        </div>

        {loadError && !isLoading ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800"><AlertTriangle size={16} />{loadError}</div> : null}

        {!isLoading ? <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
            <StatTile icon={<Armchair size={18} />} label="Active tables" value={activeTables} sub={`${occupiedTables} currently occupied`} />
            <StatTile icon={<Receipt size={18} />} label="Open orders" value={openOrders.length} sub="Across live tables" tone="amber" />
            <StatTile icon={<ChefHat size={18} />} label="In kitchen" value={kitchenOrders} sub="Placed or preparing" tone="amber" />
            <StatTile icon={<Clock3 size={18} />} label="Ready" value={readyOrders} sub="Awaiting service" tone="violet" />
            <StatTile icon={<Users size={18} />} label="Reservations" value={confirmedReservations} sub="Confirmed today" />
            <StatTile icon={<TrendingUp size={18} />} label="Revenue" value={formatCurrency(analytics?.summary?.revenue || 0)} sub="Last 30 days" tone="emerald" />
            <StatTile icon={<CheckCircle2 size={18} />} label="Bills settled" value={analytics?.summary?.billedOrders || 0} sub="Last 30 days" tone="emerald" />
            <StatTile icon={<Receipt size={18} />} label="Average bill" value={formatCurrency(analytics?.summary?.averageBill || 0)} sub="Settled orders" tone="violet" />
          </div>

          <div className="mb-6">
            <p className="text-sm font-pmedium text-slate-900">Manage café order operations</p>
            <p className="mt-1 text-[10px] text-slate-500">Open a module to work with its dedicated café order view.</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {modules.map((module) => {
                const Icon = module.icon;
                return <DashboardModuleCard key={module.id} icon={<Icon size={19} />} title={module.title} route={`/common-modules/cafe-orders/list?tab=${module.id}`} description={module.description} color={module.color} state={{ moduleTitle: module.title }} />;
              })}
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-4">
            <SectionCard title="Order trend" subtitle="Settled café order count across the last 30 days.">
              {(analytics?.daily || []).length ? <ReactApexChart type="bar" height={320} options={orderTrendOptions} series={[{ name: "Orders", data: (analytics?.daily || []).map((item) => item.orders) }]} /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No settled-order trend recorded yet.</div>}
            </SectionCard>
            <SectionCard title="Revenue trend" subtitle="Revenue collected from settled café orders across the last 30 days.">
              {(analytics?.daily || []).length ? <ReactApexChart type="area" height={320} options={revenueTrendOptions} series={[{ name: "Revenue", data: (analytics?.daily || []).map((item) => item.revenue) }]} /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No café revenue trend recorded yet.</div>}
            </SectionCard>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Order status" subtitle="Current operational and historical order distribution.">
              {orderStatuses.length ? <DonutChart centerLabel="Orders" labels={orderStatuses.map((item) => item.label)} series={orderStatuses.map((item) => item.value)} colors={["#2563EB", "#F59E0B", "#7C3AED", "#10B981", "#0F766E", "#EF4444"]} tooltipValue={orderStatuses.map((item) => `${item.value} orders`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No order-status data yet.</div>}
            </SectionCard>
            <SectionCard title="Payment methods" subtitle="How settled café bills were collected.">
              {paymentMix.length ? <DonutChart centerLabel="Bills" labels={paymentMix.map((item) => item.label)} series={paymentMix.map((item) => item.value)} colors={["#2563EB", "#10B981", "#7C3AED", "#F59E0B", "#64748B"]} tooltipValue={paymentMix.map((item) => `${item.value} bills`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No payment-method data yet.</div>}
            </SectionCard>
          </div>

          <div className="mb-4 flex flex-col gap-4">
            <SectionCard title="Peak order hours" subtitle="Settled bills grouped by the hour they were completed.">
              {(analytics?.peakHours || []).length ? <ReactApexChart type="bar" height={320} options={peakOptions} series={[{ name: "Orders", data: (analytics?.peakHours || []).map((item) => item.orders) }]} /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No hourly order demand recorded yet.</div>}
            </SectionCard>
            <SectionCard title="Top-selling items" subtitle="Highest-volume menu items across settled bills.">
              {topItems.length ? <ReactApexChart type="bar" height={320} options={topItemsOptions} series={[{ name: "Quantity sold", data: topItems.map((item) => item.quantity) }]} /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No item-sales data recorded yet.</div>}
            </SectionCard>
          </div>

          <SectionCard title="Recent orders" subtitle="Latest live, settled, and cancelled café orders." bodyClassName="max-h-[390px] overflow-y-auto p-0">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-[16%] px-5 py-3">Order</th><th className="w-[21%] px-5 py-3">Table / customer</th><th className="w-[18%] px-5 py-3">Waiter</th><th className="w-[17%] px-5 py-3">Created</th><th className="w-[14%] px-5 py-3">Total</th><th className="w-[14%] px-5 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {recentOrders.length ? recentOrders.map((order) => <tr key={order._id} className="hover:bg-slate-50/70"><td className="truncate px-5 py-3 font-pmedium text-slate-900">#{order.orderNumber}</td><td className="truncate px-5 py-3 text-slate-600">{order.tableLabel || order.customerName || "Table order"}</td><td className="truncate px-5 py-3 text-slate-600">{order.waiterName || "Not recorded"}</td><td className="truncate px-5 py-3 text-slate-600">{dateLabel(order.createdAt)}</td><td className="truncate px-5 py-3 font-pmedium text-slate-900">{formatCurrency(order.total)}</td><td className="px-5 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-wide ${statusClass(order.status)}`}>{order.status}</span></td></tr>) : <tr><td colSpan={6} className="px-5 py-12 text-center text-[11px] text-slate-500">No café orders recorded yet.</td></tr>}
              </tbody>
            </table>
          </SectionCard>
        </> : <div className="flex min-h-[300px] items-center justify-center text-[11px] text-slate-500">Loading café order dashboard...</div>}
      </PageFrame>
    </div>
  );
}
