import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  Building2,
  CircleDollarSign,
  Package,
  PackageCheck,
  PackageOpen,
  TrendingDown,
  Warehouse,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import inventoryBannerImage from "../../assets/inventory-management-banner.jpg";
import { getStoredUser } from "../../lib/auth-session";
import { statusPillClass } from "../../lib/status-pill";
import { getInventory } from "../../services/inventory";
import useWorkspacePreferences from "../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../lib/workspaceLocalization";

type InventoryRecord = Record<string, any>;
type Tone = "blue" | "green" | "amber" | "violet" | "rose" | "slate";

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const readable = (value: unknown, fallback = "Not recorded") => {
  const text = String(value || "").trim();
  return text
    ? text.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : fallback;
};

const recordLabel = (
  value: unknown,
  keys: string[],
  fallback = "Not recorded",
) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      const label = String(record[key] || "").trim();
      if (label) return label;
    }
  }
  return fallback;
};

const inventoryCategory = (item: InventoryRecord) =>
  recordLabel(item.category, ["categoryName", "name", "label"], "Uncategorised");

const inventoryDepartment = (item: InventoryRecord) =>
  recordLabel(item.department, ["departmentName", "name", "label"], "Unassigned");

const topGroups = (groups: Map<string, number>, limit = 5) => {
  const entries = [...groups.entries()].sort((left, right) => right[1] - left[1]);
  if (entries.length <= limit) return entries;
  const visible = entries.slice(0, limit);
  const remaining = entries
    .slice(limit)
    .reduce((sum, [, value]) => sum + value, 0);
  return [...visible, ["Others", remaining] as [string, number]];
};

const roleBand = (value: unknown) => {
  const role = normalize(value);
  if (["owner", "founder"].includes(role)) return "owner";
  if (["super_admin", "superadmin"].includes(role)) return "super_admin";
  if (["admin", "admin_manager"].includes(role)) return "admin";
  if (role === "manager" || role.endsWith("_manager")) return "manager";
  return "employee";
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

const ledgerDelta = (entry: InventoryRecord) => {
  const quantity = Math.abs(Number(entry.qty || entry.quantity) || 0);
  const text = normalize(entry.type || entry.action);
  if (/initial|purchase|transfer_in|return|received|increase/.test(text))
    return quantity;
  if (
    /consumption|consumed|allocate|transfer_out|utilized|issued|decrease/.test(
      text,
    )
  )
    return -quantity;
  return 0;
};

export default function InventoryWorkspaceDashboard() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const user = useMemo(() => getStoredUser(), []);
  const band = roleBand(user?.workspaceMembership?.role || user?.role);
  const workspacePreferences = useWorkspacePreferences();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getInventory()
      .then((response) => {
        if (cancelled) return;
        setInventory(
          Array.isArray(response?.inventory)
            ? response.inventory
            : Array.isArray(response?.data?.inventory)
              ? response.data.inventory
              : [],
        );
        setLoadError("");
      })
      .catch(() => {
        if (!cancelled) {
          setInventory([]);
          setLoadError("Inventory data could not be refreshed just now.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const totalStock = inventory.reduce(
      (sum, item) => sum + (Number(item.totalQuantity) || 0),
      0,
    );
    const available = inventory.reduce(
      (sum, item) => sum + (Number(item.availableQuantity) || 0),
      0,
    );
    const allocated = inventory.reduce((sum, item) => {
      const explicit = Number(item.allocatedQuantity);
      return (
        sum +
        (Number.isFinite(explicit)
          ? explicit
          : Math.max(
              0,
              (Number(item.totalQuantity) || 0) -
                (Number(item.availableQuantity) || 0),
            ))
      );
    }, 0);
    const activeInventory = inventory.filter(
      (item) => !["maintenance", "retired"].includes(normalize(item.status)),
    );
    const lowStock = activeInventory.filter(
      (item) =>
        Number(item.availableQuantity) > 0 &&
        Number(item.availableQuantity) <= 10,
    ).length;
    const outOfStock = activeInventory.filter(
      (item) => Number(item.availableQuantity) <= 0,
    ).length;
    const totalValue = inventory.reduce((sum, item) => {
      const explicit = Number(item.totalValue);
      if (Number.isFinite(explicit) && explicit > 0) return sum + explicit;
      return (
        sum + (Number(item.unitPrice) || 0) * (Number(item.totalQuantity) || 0)
      );
    }, 0);
    return {
      sku: inventory.length,
      totalStock,
      available,
      allocated,
      lowStock,
      outOfStock,
      departments: new Set(
        inventory.map((item) => item.department).filter(Boolean),
      ).size,
      totalValue,
    };
  }, [inventory]);

  const moduleTitle =
    band === "owner" || band === "super_admin"
      ? "Overall Inventory"
      : band === "admin"
        ? "Assigned Dept Inventory"
        : band === "manager"
          ? "Department Inventory"
          : "My Department Inventory";

  const statusRows = useMemo(
    () =>
      [
        [
          "Healthy stock",
          inventory.filter((item) => Number(item.availableQuantity) > 10)
            .length,
        ],
        ["Low stock", stats.lowStock],
        ["Out of stock", stats.outOfStock],
        [
          "Maintenance / retired",
          inventory.filter((item) =>
            ["maintenance", "retired"].includes(normalize(item.status)),
          ).length,
        ],
      ] as Array<[string, number]>,
    [inventory, stats.lowStock, stats.outOfStock],
  );

  const stockBalanceRows = useMemo(
    () => [
      ["Available", stats.available] as [string, number],
      ["Allocated / used", stats.allocated] as [string, number],
    ],
    [stats.allocated, stats.available],
  );

  const departmentRows = useMemo(() => {
    const groups = new Map<string, number>();
    inventory.forEach((item) => {
      const label = inventoryDepartment(item);
      groups.set(
        label,
        (groups.get(label) || 0) + (Number(item.totalQuantity) || 0),
      );
    });
    return topGroups(groups);
  }, [inventory]);

  const categoryRows = useMemo(() => {
    const groups = new Map<string, number>();
    inventory.forEach((item) => {
      const label = inventoryCategory(item);
      groups.set(
        label,
        (groups.get(label) || 0) + (Number(item.totalQuantity) || 0),
      );
    });
    return topGroups(groups);
  }, [inventory]);

  const now = useMemo(() => new Date(), []);
  const monthLabels = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) =>
        new Date(
          now.getFullYear(),
          now.getMonth() - 5 + index,
          1,
        ).toLocaleDateString("en-US", { month: "short" }),
      ),
    [now],
  );
  const movement = useMemo(() => {
    const stockIn = new Array(6).fill(0);
    const stockOut = new Array(6).fill(0);
    inventory.forEach((item) => {
      (Array.isArray(item.ledger) ? item.ledger : []).forEach(
        (entry: InventoryRecord) => {
          const date = new Date(
            entry.date || entry.dateLabel || item.createdAt || "",
          );
          if (Number.isNaN(date.getTime())) return;
          const monthsAgo =
            (now.getFullYear() - date.getFullYear()) * 12 +
            now.getMonth() -
            date.getMonth();
          if (monthsAgo < 0 || monthsAgo > 5) return;
          const delta = ledgerDelta(entry);
          if (delta > 0) stockIn[5 - monthsAgo] += delta;
          if (delta < 0) stockOut[5 - monthsAgo] += Math.abs(delta);
        },
      );
    });
    return { stockIn, stockOut };
  }, [inventory, now]);

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#10B981", "#F59E0B"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const recentInventory = useMemo(
    () =>
      [...inventory]
        .sort(
          (left, right) =>
            new Date(right.lastUpdated || right.createdAt || 0).getTime() -
            new Date(left.lastUpdated || left.createdAt || 0).getTime(),
        )
        .slice(0, 10),
    [inventory],
  );

  const formatCurrency = (value: number) =>
    formatWorkspaceCurrency(value, workspacePreferences.currency, {
      maximumFractionDigits: 0,
    });

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={inventoryBannerImage}
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
              className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/45 via-[#3B82F6]/25 to-[#60A5FA]/15"
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
                <span className="text-primary">Inventory</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">
                Live stock, availability, allocation, value, and movement within
                your role and department scope.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Stock", "Availability", "Movement", "Departments"].map(
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
                Active modules
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">1</p>
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
              icon={<Package size={20} />}
              label="Stock items"
              value={stats.sku}
              sub="Inventory records visible to your role"
            />
            <StatTile
              icon={<Boxes size={20} />}
              label="Total stock"
              value={stats.totalStock}
              sub="Total recorded units across inventory"
              tone="violet"
            />
            <StatTile
              icon={<PackageOpen size={20} />}
              label="Available"
              value={stats.available}
              sub="Units currently ready for use"
              tone="green"
            />
            <StatTile
              icon={<PackageCheck size={20} />}
              label="Allocated / used"
              value={stats.allocated}
              sub="Units issued, allocated, or consumed"
              tone="blue"
            />
            <StatTile
              icon={<TrendingDown size={20} />}
              label="Low stock"
              value={stats.lowStock}
              sub="Items at or below the reorder threshold"
              tone="amber"
            />
            <StatTile
              icon={<AlertTriangle size={20} />}
              label="Out of stock"
              value={stats.outOfStock}
              sub="Items with no available units"
              tone="rose"
            />
            <StatTile
              icon={<Building2 size={20} />}
              label="Departments"
              value={stats.departments}
              sub="Departments represented in inventory"
              tone="slate"
            />
            <StatTile
              icon={<CircleDollarSign size={20} />}
              label="Stock value"
              value={formatCurrency(stats.totalValue)}
              sub="Recorded value of visible inventory"
              tone="green"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Manage inventory
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the inventory workspace curated for your role and department
            scope.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:max-w-[1220px]">
            <DashboardModuleCard
              icon={<Warehouse size={19} />}
              title={moduleTitle}
              route="/extra-common-modules/inventory/manage"
              description="Manage stock, availability, transfers, pricing, and inventory history"
              color="#2563EB"
              state={{ fromSection: "inventory-dashboard", moduleTitle }}
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <SectionCard
                title="Inventory movement trend"
                subtitle="Stock received versus issued across the last six months."
              >
                {inventory.length ? (
                  <GroupedBarGraph
                    options={trendOptions}
                    series={[
                      { name: "Stock In", data: movement.stockIn },
                      { name: "Stock Out", data: movement.stockOut },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No inventory movement recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Stock balance"
                subtitle="Available units compared with inventory already allocated or used."
              >
                {stats.totalStock ? (
                  <DonutChart
                    centerLabel="Units"
                    labels={stockBalanceRows.map(([label]) => label)}
                    series={stockBalanceRows.map(([, value]) => value)}
                    colors={["#10B981", "#2563EB"]}
                    tooltipValue={stockBalanceRows.map(
                      ([, value]) => `${value} units`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No stock balance data yet.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Stock health"
                subtitle="Current inventory items grouped by availability state."
              >
                {statusRows.some(([, value]) => value > 0) ? (
                  <DonutChart
                    centerLabel="Items"
                    labels={statusRows.map(([label]) => label)}
                    series={statusRows.map(([, value]) => value)}
                    colors={["#10B981", "#F59E0B", "#EF4444", "#64748B"]}
                    tooltipValue={statusRows.map(
                      ([, value]) => `${value} items`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No stock health data yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Department-wise stock"
                subtitle="Recorded inventory units distributed across departments in your scope."
              >
                {departmentRows.length ? (
                  <DonutChart
                    centerLabel="Units"
                    labels={departmentRows.map(([label]) => label)}
                    series={departmentRows.map(([, value]) => value)}
                    colors={["#1E3D73", "#2563EB", "#60A5FA", "#10B981", "#F59E0B", "#94A3B8"]}
                    tooltipValue={departmentRows.map(
                      ([, value]) => `${value} units`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No department distribution data yet.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Inventory categories"
                subtitle="Stock-unit mix across the most-used inventory categories."
              >
                {categoryRows.length ? (
                  <DonutChart
                    centerLabel="Units"
                    labels={categoryRows.map(([label]) => label)}
                    series={categoryRows.map(([, value]) => value)}
                    colors={["#7C3AED", "#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#94A3B8"]}
                    tooltipValue={categoryRows.map(
                      ([, value]) => `${value} units`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No inventory category data yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Recent inventory"
              subtitle="Latest stock records visible within your current role scope."
              bodyClassName="max-h-[390px] overflow-y-auto p-0"
            >
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[17%] px-5 py-3 font-pmedium">Item name</th>
                    <th className="w-[11%] px-3 py-3 font-pmedium">Inventory ID</th>
                    <th className="w-[13%] px-3 py-3 font-pmedium">Category</th>
                    <th className="w-[14%] px-3 py-3 font-pmedium">Department</th>
                    <th className="w-[12%] px-3 py-3 font-pmedium">Location</th>
                    <th className="w-[12%] px-3 py-3 text-center font-pmedium">Available</th>
                    <th className="w-[11%] px-3 py-3 font-pmedium">Unit value</th>
                    <th className="w-[10%] px-3 py-3 font-pmedium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInventory.length ? (
                    recentInventory.map((item, index) => {
                      const available = Number(item.availableQuantity) || 0;
                      const status =
                        available <= 0
                          ? "Out of Stock"
                          : available <= 10
                            ? "Low Stock"
                            : readable(item.status, "Available");
                      return (
                        <tr
                          key={
                            item.recordId ||
                            item.id ||
                            item._id ||
                            `${item.name}-${index}`
                          }
                          className="bg-white text-[11px] text-slate-600"
                        >
                          <td
                            className="truncate px-5 py-3 font-pmedium text-slate-900"
                            title={item.name || "Unnamed item"}
                          >
                            {item.name || "Unnamed item"}
                          </td>
                          <td
                            className="truncate px-3 py-3 text-[#2563EB]"
                            title={String(item.inventoryCode || item.id || "Not set")}
                          >
                            {item.inventoryCode || item.id || "Not set"}
                          </td>
                          <td
                            className="truncate px-3 py-3"
                            title={inventoryCategory(item)}
                          >
                            {inventoryCategory(item)}
                          </td>
                          <td
                            className="truncate px-3 py-3"
                            title={inventoryDepartment(item)}
                          >
                            {inventoryDepartment(item)}
                          </td>
                          <td
                            className="truncate px-3 py-3"
                            title={String(item.location || "Not set")}
                          >
                            {item.location || "Not set"}
                          </td>
                          <td className="px-3 py-3 text-center font-pmedium text-slate-800">
                            {available}
                            <span className="text-slate-400">
                              /{Number(item.totalQuantity) || 0}
                            </span>{" "}
                            <span className="text-[9px] text-slate-400">
                              {item.unit || "units"}
                            </span>
                          </td>
                          <td className="truncate px-3 py-3 font-pmedium text-slate-700">
                            {formatCurrency(Number(item.unitPrice) || 0)}
                          </td>
                          <td className="px-3 py-3">
                            <span className={statusPillClass(status)}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No inventory records are available yet.
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
