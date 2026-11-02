import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Globe,
  Layers3,
  Lock,
  Magnet,
  Star,
  Target,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import GroupedBarGraph from "../../../components/graphs/GroupedBarGraph";
import coworkingBannerImage from "../../../assets/coworking-banner.jpg";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";
import useNomadListingCapacity from "../../../hooks/useNomadListingCapacity";
import { NOMAD_DASHBOARD_MODULES } from "./nomadDashboardModules";

const VERIFY_LOCKED_REASON =
  "Add and activate a listing — or get your existing wono.co listings approved — to unlock Verify Business.";

const DONUT_PALETTE = [
  "#1E3D73",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#64748B",
];

const normalize = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const readableLabel = (value?: string) =>
  String(value || "Pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const dateLabel = (value?: unknown) => {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[280px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
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

const statusTone = (status?: string) => {
  const value = normalize(status);
  if (value.includes("convert") || value.includes("won") || value === "closed")
    return "bg-emerald-50 text-emerald-700";
  if (value.includes("lost") || value.includes("reject"))
    return "bg-rose-50 text-rose-700";
  if (value.includes("contact") || value.includes("progress"))
    return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

// Read-only, locked variant of DashboardModuleCard — mirrors its layout so
// the Verify Business card never looks like a different component family.
function LockedModuleCard({
  icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[154px] min-w-0 cursor-not-allowed flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-5 text-center opacity-80 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
      title={VERIFY_LOCKED_REASON}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ backgroundColor: color }}
      />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-pmedium text-amber-700">
        <Lock size={11} />
        Locked
      </span>
      <span
        className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}12`, color }}
      >
        {icon}
      </span>
      <span className="max-w-full text-[13px] font-pmedium leading-[1.35] text-slate-900 [overflow-wrap:anywhere]">
        {title}
      </span>
      {description ? (
        <span className="mt-1.5 line-clamp-2 max-w-[190px] text-[9px] font-pmedium leading-4 text-slate-400">
          {description}
        </span>
      ) : null}
    </button>
  );
}

const WonoNomad = () => {
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const user = auth?.user;
  const selectedCompany = useSelector(
    (state: { company?: { selectedCompany?: { companyId?: string; workspaceId?: string } } }) =>
      state.company?.selectedCompany,
  );

  // Listings capacity — same hook the listings page uses, so quotas and
  // statuses always agree between the dashboard and the tables.
  const companyId = String(
    user?.effectiveNomadsCompanyId || user?.companyId || "",
  );
  const capacity = useNomadListingCapacity(companyId);
  const { listings = [], isPending, isError } = capacity;

  // Nomads leads — same endpoint (and params shape) CompanyLeads uses with
  // leadScope="nomads", so counts line up with the leads tables.
  const workspaceId = String(
    selectedCompany?.workspaceId ||
      user?.primaryWorkspace ||
      (user?.workspaceMembership as { workspace?: string } | undefined)
        ?.workspace ||
      user?.workspaceId ||
      "",
  );
  const leadsCompanyId = selectedCompany?.companyId || user?.companyId || "";
  const { data: leads = [], isPending: isLeadsPending } = useQuery({
    queryKey: ["nomads-leads-dashboard", leadsCompanyId, workspaceId],
    enabled: Boolean(leadsCompanyId || workspaceId),
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/leads/get-leads", {
        params: { companyId: leadsCompanyId, workspaceId, leadScope: "nomads" },
        headers: { "Cache-Control": "no-cache" },
      });
      return Array.isArray(response?.data) ? response.data : [];
    },
  });

  // Reviews — same endpoint (and cache key family) CompanyReviews uses with
  // reviewScope="nomads", so the dashboard count matches the reviews table.
  const reviewsCompanyId = selectedCompany?.companyId || user?.companyId || "";
  const { data: reviews = [], isPending: isReviewsPending } = useQuery({
    queryKey: ["companyReviews-dashboard", reviewsCompanyId],
    enabled: Boolean(reviewsCompanyId),
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/review", {
        params: { companyId: reviewsCompanyId, reviewScope: "nomads" },
        headers: { "Cache-Control": "no-cache" },
      });
      const raw = res.data?.reviews ?? res.data?.data?.reviews ?? res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
  });

  // Same query (and cache entry) the Verify Business page uses. The lock on
  // the Verify Business module card follows the page's own rule: open once
  // the host has an active, public listing or an approved claim on existing
  // listings. A host already verified can always get in to manage the badge.
  // While loading, or if the check itself fails, don't lock anyone out.
  const { data: overview, isPending: isOverviewPending, isError: isOverviewError } = useQuery({
    queryKey: ["verify-business-overview"],
    queryFn: async () =>
      (await axiosPrivate.get("/api/verify-business/overview")).data,
    retry: false,
  });
  const verifyLocked =
    !isOverviewPending &&
    !isOverviewError &&
    !overview?.eligible &&
    !overview?.verification;

  const stats = useMemo(() => {
    const nonDeleted = listings.filter(
      (listing) => !listing?.isDeleted,
    );
    const activeListings = nonDeleted.filter(
      (listing) => listing.isActive,
    ).length;
    const publicListings = nonDeleted.filter(
      (listing) => listing.isPublic,
    ).length;
    const verifiedListings = nonDeleted.filter(
      (listing) => listing.isVerified,
    ).length;
    const inactiveListings = nonDeleted.length - activeListings;

    // "Pending"/empty is the host-facing catch-all on CompanyLeads' pills, so
    // it counts as awaiting follow-up; lost/rejected stay out of this tile.
    const pendingLeads = leads.filter((lead) => {
      const status = normalize(lead.hostPanelStatus || lead.status);
      return !status || status.includes("pending") || status.includes("new");
    }).length;
    const inProgressLeads = leads.filter((lead) => {
      const status = normalize(lead.hostPanelStatus || lead.status);
      return status.includes("contact") || status.includes("progress");
    }).length;
    const convertedLeads = leads.filter((lead) => {
      const status = normalize(lead.hostPanelStatus || lead.status);
      return status.includes("convert") || status.includes("won") || status.includes("closed");
    }).length;
    const conversionRate = leads.length
      ? Math.round((convertedLeads / leads.length) * 100)
      : 0;

    return {
      totalListings: capacity.used,
      activeListings,
      inactiveListings,
      publicListings,
      verifiedListings,
      pendingLeads,
      inProgressLeads,
      convertedLeads,
      conversionRate,
    };
  }, [listings, leads, capacity.used]);

  const approvedReviews = useMemo(
    () =>
      reviews.filter((review) => normalize(review.status) === "approved")
        .length,
    [reviews],
  );

  const listingTypes = useMemo(() => {
    const map = new Map<string, number>();
    listings
      .filter((listing) => !listing?.isDeleted)
      .forEach((listing) => {
        const label = readableLabel(listing.companyType || "Other");
        map.set(label, (map.get(label) || 0) + 1);
      });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
  }, [listings]);

  const leadPipeline = useMemo(() => {
    const buckets: Record<string, number> = {};
    leads.forEach((lead) => {
      const label = readableLabel(lead.hostPanelStatus || lead.status);
      buckets[label] = (buckets[label] || 0) + 1;
    });
    return Object.entries(buckets);
  }, [leads]);

  const monthlyLeads = useMemo(() => {
    const anchor = new Date();
    const counts = new Array(12).fill(0);
    leads.forEach((lead) => {
      const created = new Date(
        String(lead.recievedDate || lead.receivedDate || lead.createdAt || ""),
      );
      if (Number.isNaN(created.getTime())) return;
      const difference =
        (anchor.getFullYear() - created.getFullYear()) * 12 +
        anchor.getMonth() -
        created.getMonth();
      const index = 11 - difference;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
  }, [leads]);

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort(
          (left, right) =>
            new Date(
              String(
                right.recievedDate || right.receivedDate || right.createdAt || 0,
              ),
            ).getTime() -
            new Date(
              String(
                left.recievedDate || left.receivedDate || left.createdAt || 0,
              ),
            ).getTime(),
        )
        .slice(0, 8),
    [leads],
  );

  const recentListings = useMemo(
    () =>
      [...listings]
        .filter((listing) => !listing?.isDeleted)
        .slice(0, 8),
    [listings],
  );

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        anchor.getFullYear(),
        anchor.getMonth() - (11 - index),
        1,
      );
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const moduleMetric = (moduleId: string) => {
    if (moduleId === "nomad-listings") return stats.totalListings;
    if (moduleId === "nomads-leads") return leads.length;
    if (moduleId === "nomad-reviews") return reviews.length;
    return "—";
  };

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "44%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const isLoading = isPending || isLeadsPending || isReviewsPending;

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={coworkingBannerImage}
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[68%]">
              <h1 className="text-[30px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
                <span className="text-primary">Nomads Listings</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Listing visibility, guest reviews, verification, and enquiry
                pipeline across your co-working and co-living listings.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Listings", "Reviews", "Leads", "Verification"].map((tag) => (
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
                Plan
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {readableLabel(capacity.plan)}
              </p>
            </div>
          </div>
        </div>

        {isError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            Listing data could not be refreshed just now — existing values may be
            incomplete.
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<Layers3 size={20} />}
              label="Nomad listings"
              value={stats.totalListings}
              sub={
                capacity.limit === null
                  ? "Unlimited plan slot"
                  : `${capacity.used}/${capacity.limit} plan slots used`
              }
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Active listings"
              value={stats.activeListings}
              sub={`${stats.inactiveListings} not currently active`}
              status={stats.activeListings ? "success" : "default"}
            />
            <StatTile
              icon={<Globe size={20} />}
              label="Public listings"
              value={stats.publicListings}
              sub="Visible on the Nomads website"
            />
            <StatTile
              icon={<BadgeCheck size={20} />}
              label="Verified listings"
              value={stats.verifiedListings}
              sub="Verified badge showing on wono.co"
              status={stats.verifiedListings ? "success" : "default"}
            />
            <StatTile
              icon={<Magnet size={20} />}
              label="Nomads leads"
              value={leads.length}
              sub="Enquiries from your listings"
            />
            <StatTile
              icon={<Target size={20} />}
              label="Lead conversion"
              value={`${stats.conversionRate}%`}
              sub={`${stats.convertedLeads} leads converted`}
              status={stats.convertedLeads ? "success" : "default"}
            />
            <StatTile
              icon={<Clock size={20} />}
              label="Awaiting follow-up"
              value={stats.pendingLeads}
              sub="Leads with no action recorded yet"
              status={
                stats.pendingLeads > 0 ? "attention" : "success"
              }
            />
            <StatTile
              icon={<Star size={20} />}
              label="Guest reviews"
              value={reviews.length}
              sub={`${approvedReviews} approved reviews`}
              status={reviews.length ? "success" : "default"}
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">
              Manage nomad listings
            </p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Open the modules available across listings, reviews, leads, and
              verification — the same workspace as the Nomads dropdown.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {NOMAD_DASHBOARD_MODULES.map((module) => {
              const locked =
                module.id === "nomad-verify-business" && verifyLocked;
              const Icon = module.icon;
              if (locked) {
                return (
                  <div
                    key={module.id}
                    data-tour="wono-nomad-verify-business"
                    className="grid"
                  >
                    <LockedModuleCard
                      icon={<Icon size={19} />}
                      title={module.label}
                      description={module.description}
                      color={module.color}
                      onClick={() => toast(VERIFY_LOCKED_REASON)}
                    />
                  </div>
                );
              }
              return (
                <div
                  key={module.id}
                  data-tour={
                    module.id === "nomad-listings"
                      ? "wono-nomad-listings"
                      : module.id === "nomad-reviews"
                        ? "wono-nomad-reviews"
                        : module.id === "nomads-leads"
                          ? "wono-nomad-leads"
                          : undefined
                  }
                  className="grid"
                >
                  <DashboardModuleCard
                    icon={<Icon size={19} />}
                    title={module.label}
                    route={module.route}
                    description={module.description}
                    color={module.color}
                    state={{ fromSection: "wono-nomad" }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard
                title="Nomads Leads Trend"
                subtitle="Nomads enquiries received during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={chartOptions}
                  series={[{ name: "Nomads leads", data: monthlyLeads }]}
                />
              </ChartCard>
              <ChartCard
                title="Lead Pipeline"
                subtitle="Current enquiry distribution by stage."
              >
                {leadPipeline.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={leadPipeline.map(([label]) => label)}
                    series={leadPipeline.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, leadPipeline.length)}
                    tooltipValue={leadPipeline.map(
                      ([, value]) => `${value} leads`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>
                    No leads have been recorded from your Nomads listings yet.
                  </Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Listings by Product Type"
                subtitle="Non-deleted listings grouped by their product type."
              >
                {listingTypes.length ? (
                  <DonutChart
                    centerLabel="Listings"
                    labels={listingTypes.map((item) => item.label)}
                    series={listingTypes.map((item) => item.value)}
                    colors={DONUT_PALETTE.slice(0, listingTypes.length)}
                    tooltipValue={listingTypes.map(
                      (item) => `${item.value} listings`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>
                    No listings are recorded yet — add one from the Listings
                    module.
                  </Empty>
                )}
              </ChartCard>
              <ChartCard title="Module Snapshot">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {NOMAD_DASHBOARD_MODULES.map((module, index) => {
                    const Icon = module.icon;
                    return (
                      <div
                        key={module.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{
                              backgroundColor:
                                DONUT_PALETTE[index % DONUT_PALETTE.length],
                            }}
                          >
                            <Icon size={14} />
                          </span>
                          <span className="truncate text-[11px] font-pmedium text-slate-600">
                            {module.label}
                          </span>
                        </div>
                        <span className="ml-3 text-[13px] font-pmedium text-slate-900">
                          {moduleMetric(module.id)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <ChartCard
                title="Recent Nomads Leads"
                subtitle="The latest enquiries received from your listings."
                action={<RecordCountChip count={leads.length} />}
                bodyClassName=""
              >
                {recentLeads.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[34%] px-5 py-3">Lead</th>
                          <th className="w-[24%] px-4 py-3">Product</th>
                          <th className="w-[20%] px-4 py-3">Received</th>
                          <th className="w-[22%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentLeads.map((lead, index) => (
                          <tr
                            key={lead._id || `${lead.fullName}-${index}`}
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {lead.fullName || "Unnamed lead"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {lead.productType || lead.vertical || "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {dateLabel(
                                lead.recievedDate ||
                                  lead.receivedDate ||
                                  lead.createdAt,
                              )}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(lead.hostPanelStatus || lead.status)}`}
                              >
                                {readableLabel(lead.hostPanelStatus || lead.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No leads have been recorded from your Nomads listings yet.
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Listings Needing Attention"
                subtitle="Listings not currently active on the Nomads website."
                action={<RecordCountChip count={stats.inactiveListings} />}
                bodyClassName=""
              >
                {recentListings.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[30%] px-5 py-3">Listing</th>
                          <th className="w-[16%] px-4 py-3">Type</th>
                          <th className="w-[16%] px-4 py-3">City</th>
                          <th className="w-[18%] px-4 py-3">Master Status</th>
                          <th className="w-[20%] px-5 py-3">Visibility</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...recentListings]
                          .sort((left, right) => Number(Boolean(left.isActive)) - Number(Boolean(right.isActive)))
                          .map((listing, index) => (
                          <tr
                            key={listing._id || `${listing.companyName}-${index}`}
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {listing.companyName || "Unnamed listing"}
                            </td>
                            <td className="truncate px-4 py-3 capitalize">
                              {listing.companyType || "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {listing.city || listing.country || "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${listing.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                              >
                                {listing.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${listing.isPublic ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                              >
                                {listing.isPublic ? "Public" : "Hidden"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No listings are recorded yet.
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
};

export default WonoNomad;
