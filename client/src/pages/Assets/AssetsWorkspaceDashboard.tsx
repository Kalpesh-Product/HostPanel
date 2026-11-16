import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  PackageCheck,
  PackageOpen,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import assetBannerImage from "../../assets/assets-management-banner.jpg";
import { getStoredUser } from "../../lib/auth-session";
import { statusPillClass } from "../../lib/status-pill";
import { getAssetRequests, getAssets } from "../../services/assets";
import useWorkspacePreferences from "../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../lib/workspaceLocalization";

type AssetRecord = Record<string, any>;
type RequestRecord = Record<string, any>;
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

const nestedLabel = (
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

const assetCategory = (asset: AssetRecord) =>
  nestedLabel(
    asset.category || asset.categoryId,
    ["categoryName", "name", "label"],
    "Uncategorised",
  );

const assetDepartment = (asset: AssetRecord) =>
  nestedLabel(
    asset.department || asset.departmentId,
    ["departmentName", "name", "label"],
    "Unassigned",
  );

const assetAssignee = (asset: AssetRecord) => {
  const directAssignee = nestedLabel(
    asset.assignedTo,
    ["fullName", "name", "label"],
    "",
  );
  if (directAssignee && normalize(directAssignee) !== "unassigned") {
    return directAssignee;
  }

  const allocations = Array.isArray(asset.allocations) ? asset.allocations : [];
  const allocation = allocations.find(
    (item: AssetRecord) => Number(item?.quantity) > 0,
  );
  return nestedLabel(
    allocation?.user || allocation?.department,
    ["fullName", "name", "label"],
    "Unassigned",
  );
};

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

export default function AssetsWorkspaceDashboard() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const workspacePreferences = useWorkspacePreferences();
  const user = useMemo(() => getStoredUser(), []);
  const band = roleBand(user?.workspaceMembership?.role || user?.role);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled([
      getAssets({ page: 1, limit: 1000 }),
      getAssetRequests({ page: 1, limit: 1000 }),
    ])
      .then(([assetResult, requestResult]) => {
        if (cancelled) return;
        if (assetResult.status === "fulfilled") {
          const payload = assetResult.value;
          setAssets(
            Array.isArray(payload?.assets)
              ? payload.assets
              : Array.isArray(payload?.data?.assets)
                ? payload.data.assets
                : [],
          );
        }
        if (requestResult.status === "fulfilled") {
          const payload = requestResult.value;
          setRequests(
            Array.isArray(payload?.requests)
              ? payload.requests
              : Array.isArray(payload?.data?.requests)
                ? payload.data.requests
                : [],
          );
        }
        setLoadError(
          assetResult.status === "rejected"
            ? "Asset data could not be refreshed just now."
            : "",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const totalUnits = assets.reduce(
      (sum, asset) => sum + (Number(asset.quantity) || 1),
      0,
    );
    const allocatedUnits = assets.reduce(
      (sum, asset) => sum + (Number(asset.allocatedQuantity) || 0),
      0,
    );
    const availableUnits = assets.reduce((sum, asset) => {
      const quantity = Number(asset.quantity) || 1;
      const available = Number(asset.availableQuantity);
      return (
        sum +
        (Number.isFinite(available)
          ? available
          : Math.max(0, quantity - (Number(asset.allocatedQuantity) || 0)))
      );
    }, 0);
    const statusCount = (status: string) =>
      assets
        .filter((asset) => normalize(asset.status) === normalize(status))
        .reduce((sum, asset) => sum + (Number(asset.quantity) || 1), 0);
    const totalValue = assets.reduce((sum, asset) => {
      const unitPrice = Number(
        String(asset.unitPrice || asset.value || 0).replace(/,/g, ""),
      );
      return (
        sum +
        (Number.isFinite(unitPrice) ? unitPrice : 0) *
          (Number(asset.quantity) || 1)
      );
    }, 0);
    return {
      totalUnits,
      allocatedUnits,
      availableUnits,
      utilisation: totalUnits
        ? Math.round((allocatedUnits / totalUnits) * 100)
        : 0,
      maintenance: statusCount("maintenance") + statusCount("repair"),
      decommissioned: statusCount("decommissioned") + statusCount("disposed"),
      pendingRequests: requests.filter(
        (request) => normalize(request.status) === "pending",
      ).length,
      totalValue,
    };
  }, [assets, requests]);

  const overallAssetsTitle =
    band === "owner" || band === "super_admin"
      ? "Overall Assets"
      : band === "admin"
        ? "Assigned Dept Assets"
        : band === "manager"
          ? "Department Assets"
          : "My Department Assets";
  const modules = [
    {
      id: "overall-assets",
      title: overallAssetsTitle,
      description:
        "Review asset identity, ownership, location, quantity, and availability within your role scope",
      icon: Boxes,
      color: "#2563EB",
      route: "/extra-common-modules/assets/overall-assets",
    },
    {
      id: "asset-requests",
      title: "Asset Requests",
      description:
        "Raise, review, approve, and fulfil department asset requirements",
      icon: ClipboardList,
      color: "#7C3AED",
      route: "/extra-common-modules/assets/asset-requests",
    },
  ];

  const statusRows = useMemo(() => {
    const groups = new Map<string, number>();
    assets.forEach((asset) => {
      const label = readable(asset.status, "Active");
      groups.set(
        label,
        (groups.get(label) || 0) + (Number(asset.quantity) || 1),
      );
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [assets]);

  const allocationRows = useMemo(
    () => [
      ["Allocated", stats.allocatedUnits] as [string, number],
      ["Available", stats.availableUnits] as [string, number],
    ],
    [stats.allocatedUnits, stats.availableUnits],
  );

  const departmentRows = useMemo(() => {
    const groups = new Map<string, number>();
    assets.forEach((asset) => {
      const label = assetDepartment(asset);
      groups.set(label, (groups.get(label) || 0) + (Number(asset.quantity) || 1));
    });
    return topGroups(groups);
  }, [assets]);

  const categoryRows = useMemo(() => {
    const groups = new Map<string, number>();
    assets.forEach((asset) => {
      const label = assetCategory(asset);
      groups.set(label, (groups.get(label) || 0) + (Number(asset.quantity) || 1));
    });
    return topGroups(groups);
  }, [assets]);

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
  const monthlyTrend = useMemo(() => {
    const registered = new Array(6).fill(0);
    const assigned = new Array(6).fill(0);
    assets.forEach((asset) => {
      const assetDate = new Date(
        asset.createdAt || asset.purchaseDate || asset.updatedAt || "",
      );
      if (!Number.isNaN(assetDate.getTime())) {
        const monthsAgo =
          (now.getFullYear() - assetDate.getFullYear()) * 12 +
          now.getMonth() -
          assetDate.getMonth();
        if (monthsAgo >= 0 && monthsAgo <= 5) {
          registered[5 - monthsAgo] += Number(asset.quantity) || 1;
        }
      }
      (Array.isArray(asset.allocations) ? asset.allocations : []).forEach(
        (allocation: AssetRecord) => {
          const assignedDate = new Date(allocation.assignedAt || "");
          if (Number.isNaN(assignedDate.getTime())) return;
          const monthsAgo =
            (now.getFullYear() - assignedDate.getFullYear()) * 12 +
            now.getMonth() -
            assignedDate.getMonth();
          if (monthsAgo >= 0 && monthsAgo <= 5) {
            assigned[5 - monthsAgo] += Number(allocation.quantity) || 1;
          }
        },
      );
    });
    return { registered, assigned };
  }, [assets, now]);

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB", "#10B981"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const recentAssets = useMemo(
    () =>
      [...assets]
        .sort(
          (left, right) =>
            new Date(right.updatedAt || right.createdAt || 0).getTime() -
            new Date(left.updatedAt || left.createdAt || 0).getTime(),
        )
        .slice(0, 10),
    [assets],
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
              src={assetBannerImage}
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
                <span className="text-primary">Assets</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">
                Live inventory, allocation, maintenance, requests, and asset
                value within your role scope.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Inventory", "Allocations", "Maintenance", "Requests"].map(
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
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {modules.length}
              </p>
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
              icon={<Boxes size={20} />}
              label="Total units"
              value={stats.totalUnits}
              sub="Asset units visible within your role scope"
            />
            <StatTile
              icon={<PackageCheck size={20} />}
              label="Allocated"
              value={stats.allocatedUnits}
              sub="Units assigned to departments or people"
              tone="green"
            />
            <StatTile
              icon={<PackageOpen size={20} />}
              label="Available"
              value={stats.availableUnits}
              sub="Units currently ready for allocation"
              tone="blue"
            />
            <StatTile
              icon={<ShieldCheck size={20} />}
              label="Utilisation"
              value={`${stats.utilisation}%`}
              sub="Share of inventory currently allocated"
              tone="violet"
            />
            <StatTile
              icon={<Wrench size={20} />}
              label="In maintenance"
              value={stats.maintenance}
              sub="Units requiring repair or maintenance"
              tone="amber"
            />
            <StatTile
              icon={<Archive size={20} />}
              label="Decommissioned"
              value={stats.decommissioned}
              sub="Retired and disposed inventory units"
              tone="slate"
            />
            <StatTile
              icon={<ClipboardList size={20} />}
              label="Pending requests"
              value={stats.pendingRequests}
              sub="Asset requests awaiting a decision"
              tone="rose"
            />
            <StatTile
              icon={<CircleDollarSign size={20} />}
              label="Recorded value"
              value={formatCurrency(stats.totalValue)}
              sub="Total recorded value of visible inventory"
              tone="green"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Manage assets</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the asset views available for your role and department scope.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.title}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{
                    fromSection: "assets-dashboard",
                    moduleTitle: module.title,
                  }}
                />
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <SectionCard
                title="Asset activity trend"
                subtitle="Units registered versus assigned across the last six months."
              >
                {assets.length ? (
                  <GroupedBarGraph
                    options={trendOptions}
                    series={[
                      { name: "Registered", data: monthlyTrend.registered },
                      { name: "Assigned", data: monthlyTrend.assigned },
                    ]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No asset activity recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Allocation availability"
                subtitle="Assigned inventory compared with units still ready to allocate."
              >
                {stats.totalUnits ? (
                  <DonutChart
                    centerLabel="Units"
                    labels={allocationRows.map(([label]) => label)}
                    series={allocationRows.map(([, value]) => value)}
                    colors={["#10B981", "#2563EB"]}
                    tooltipValue={allocationRows.map(
                      ([, value]) => `${value} units`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No allocation data yet.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Asset status"
                subtitle="Current inventory units grouped by operational status."
              >
                {statusRows.length ? (
                  <DonutChart
                    centerLabel="Units"
                    labels={statusRows.map(([label]) => label)}
                    series={statusRows.map(([, value]) => value)}
                    colors={[
                      "#2563EB",
                      "#F59E0B",
                      "#10B981",
                      "#64748B",
                      "#EF4444",
                    ].slice(0, statusRows.length)}
                    tooltipValue={statusRows.map(
                      ([, value]) => `${value} units`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No asset status data yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Department-wise assets"
                subtitle="Visible asset units distributed across owning departments."
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
                title="Asset categories"
                subtitle="Inventory mix across the most-used asset categories."
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
                    No category distribution data yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Recent assets"
              subtitle="Latest asset records visible within your current role scope."
              bodyClassName="max-h-[390px] overflow-y-auto p-0"
            >
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[17%] px-5 py-3 font-pmedium">Asset name</th>
                    <th className="w-[11%] px-3 py-3 font-pmedium">Asset ID</th>
                    <th className="w-[13%] px-3 py-3 font-pmedium">Category</th>
                    <th className="w-[13%] px-3 py-3 font-pmedium">Department</th>
                    <th className="w-[15%] px-3 py-3 font-pmedium">Assigned to</th>
                    <th className="w-[12%] px-3 py-3 font-pmedium">Location</th>
                    <th className="w-[9%] px-3 py-3 text-center font-pmedium">Available</th>
                    <th className="w-[10%] px-3 py-3 font-pmedium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAssets.length ? (
                    recentAssets.map((asset, index) => (
                      <tr
                        key={
                          asset.recordId ||
                          asset._id ||
                          asset.id ||
                          `${asset.name}-${index}`
                        }
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td
                          className="truncate px-5 py-3 font-pmedium text-slate-900"
                          title={asset.name || "Unnamed asset"}
                        >
                          {asset.name || "Unnamed asset"}
                        </td>
                        <td
                          className="truncate px-3 py-3 text-[#2563EB]"
                          title={String(asset.assetCode || asset.id || "Not set")}
                        >
                          {asset.assetCode || asset.id || "Not set"}
                        </td>
                        <td className="truncate px-3 py-3" title={assetCategory(asset)}>
                          {assetCategory(asset)}
                        </td>
                        <td className="truncate px-3 py-3" title={assetDepartment(asset)}>
                          {assetDepartment(asset)}
                        </td>
                        <td className="truncate px-3 py-3" title={assetAssignee(asset)}>
                          {assetAssignee(asset)}
                        </td>
                        <td
                          className="truncate px-3 py-3"
                          title={String(asset.location || "Not set")}
                        >
                          {asset.location || "Not set"}
                        </td>
                        <td className="px-3 py-3 text-center font-pmedium text-slate-800">
                          {Number.isFinite(Number(asset.availableQuantity))
                            ? Number(asset.availableQuantity)
                            : Math.max(
                                0,
                                (Number(asset.quantity) || 1) -
                                  (Number(asset.allocatedQuantity) || 0),
                              )}
                          <span className="text-slate-400">
                            /{Number(asset.quantity) || 1}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={statusPillClass(
                              asset.status || "Active",
                            )}
                          >
                            {readable(asset.status, "Active")}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No asset records are available yet.
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
