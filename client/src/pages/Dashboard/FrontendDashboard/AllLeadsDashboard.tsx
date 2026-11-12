import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Magnet,
  ShieldCheck,
  Target,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import GroupedBarGraph from "../../../components/graphs/GroupedBarGraph";
import salesBannerImage from "../../../assets/sales-dashboard-banner.webp";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";

const DONUT_PALETTE = ["#2563EB", "#7C3AED", "#F59E0B", "#10B981", "#EF4444", "#64748B"];

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

// Website leads are constrained to "Pending"/"Closed" (see CompanyLeads'
// HOST_PANEL_STATUSES); Nomads leads use a free-form status string. Bucket
// both the same way so the dashboard's pending/closed tiles agree with the
// All Leads table regardless of which source a lead came from.
const isPendingStatus = (status?: string) => {
  const value = normalize(status);
  return !value || value.includes("pending") || value.includes("new");
};
const isClosedStatus = (status?: string) => {
  const value = normalize(status);
  return (
    value.includes("closed") ||
    value.includes("convert") ||
    value.includes("won")
  );
};

const statusTone = (status?: string) => {
  if (isClosedStatus(status)) return "bg-emerald-50 text-emerald-700";
  if (isPendingStatus(status)) return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
};

const leadTypeTone = (type?: string) =>
  type === "Nomads" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700";

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
  const hoverBorders = {
    default: "hover:border-blue-200 hover:border-l-blue-600",
    success: "hover:border-emerald-200 hover:border-l-emerald-500",
    attention: "hover:border-amber-200 hover:border-l-amber-500",
  };

  return (
    <div className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${hoverBorders[status]}`}>
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

const AllLeadsDashboard = () => {
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const user = auth?.user;
  const selectedCompany = useSelector(
    (state: { company?: { selectedCompany?: { companyId?: string; workspaceId?: string } } }) =>
      state.company?.selectedCompany,
  );

  const companyId = String(selectedCompany?.companyId || user?.companyId || "");
  const workspaceId = String(
    selectedCompany?.workspaceId ||
      user?.primaryWorkspace ||
      (user?.workspaceMembership as { workspace?: string } | undefined)?.workspace ||
      user?.workspaceId ||
      "",
  );

  // Same query key/shape CompanyLeads uses for leadScope="all" — fetches
  // website and nomads leads in parallel and tags each with _leadType, so
  // this dashboard's counts always agree with the All Leads table.
  const { data: leads = [], isPending, isError } = useQuery({
    queryKey: ["leadCompany", "all", companyId, workspaceId],
    enabled: Boolean(companyId || workspaceId),
    queryFn: async () => {
      const [websiteRes, nomadsRes] = await Promise.all([
        axiosPrivate.get("/api/leads/get-leads", {
          params: { companyId, workspaceId, leadScope: "website" },
          headers: { "Cache-Control": "no-cache" },
        }),
        axiosPrivate.get("/api/leads/get-leads", {
          params: { companyId, workspaceId, leadScope: "nomads" },
          headers: { "Cache-Control": "no-cache" },
        }),
      ]);
      const websiteLeads = (Array.isArray(websiteRes?.data) ? websiteRes.data : []).map(
        (lead: any) => ({ ...lead, _leadType: "Website" }),
      );
      const nomadsLeads = (Array.isArray(nomadsRes?.data) ? nomadsRes.data : []).map(
        (lead: any) => ({ ...lead, _leadType: "Nomads" }),
      );
      return [...websiteLeads, ...nomadsLeads];
    },
  });

  const stats = useMemo(() => {
    const websiteLeads = leads.filter((lead: any) => lead._leadType === "Website");
    const nomadsLeads = leads.filter((lead: any) => lead._leadType === "Nomads");
    const pending = leads.filter((lead: any) => isPendingStatus(lead.hostPanelStatus)).length;
    const closed = leads.filter((lead: any) => isClosedStatus(lead.hostPanelStatus)).length;
    const conversionRate = leads.length ? Math.round((closed / leads.length) * 100) : 0;

    return {
      total: leads.length,
      website: websiteLeads.length,
      nomads: nomadsLeads.length,
      pending,
      closed,
      conversionRate,
    };
  }, [leads]);

  const sourceMix = useMemo(() => {
    const buckets: Record<string, number> = {};
    leads.forEach((lead: any) => {
      const label = lead._leadType || "Website";
      buckets[label] = (buckets[label] || 0) + 1;
    });
    return Object.entries(buckets);
  }, [leads]);

  const statusBreakdown = useMemo(() => {
    const buckets: Record<string, number> = {};
    leads.forEach((lead: any) => {
      const label = isClosedStatus(lead.hostPanelStatus)
        ? "Closed"
        : isPendingStatus(lead.hostPanelStatus)
          ? "Pending"
          : readableLabel(lead.hostPanelStatus);
      buckets[label] = (buckets[label] || 0) + 1;
    });
    return Object.entries(buckets).sort((left, right) => right[1] - left[1]);
  }, [leads]);

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - (11 - index), 1);
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const monthlyLeadsBySource = useMemo(() => {
    const anchor = new Date();
    const website = new Array(12).fill(0);
    const nomads = new Array(12).fill(0);
    leads.forEach((lead: any) => {
      const created = new Date(String(lead.recievedDate || lead.receivedDate || lead.createdAt || ""));
      if (Number.isNaN(created.getTime())) return;
      const difference =
        (anchor.getFullYear() - created.getFullYear()) * 12 + anchor.getMonth() - created.getMonth();
      const index = 11 - difference;
      if (index < 0 || index >= 12) return;
      if (lead._leadType === "Nomads") nomads[index] += 1;
      else website[index] += 1;
    });
    return { website, nomads };
  }, [leads]);

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort(
          (left: any, right: any) =>
            new Date(String(right.recievedDate || right.receivedDate || right.createdAt || 0)).getTime() -
            new Date(String(left.recievedDate || left.receivedDate || left.createdAt || 0)).getTime(),
        )
        .slice(0, 8),
    [leads],
  );

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB", "#7C3AED"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const isLoading = isPending;

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={salesBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full overflow-hidden bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            >
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[68%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">All Leads</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Every enquiry received across your website and Nomads
                listings, combined in one pipeline view.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Website", "Nomads", "Pending", "Closed"].map((tag) => (
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
                Total leads
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {stats.total}
              </p>
            </div>
          </div>
        </div>

        {isError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            Lead data could not be refreshed just now — existing values may be
            incomplete.
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 6 }, (_, key) => (
              <div key={key} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              icon={<Target size={20} />}
              label="Total leads"
              value={stats.total}
              sub="Website and Nomads enquiries combined"
            />
            <StatTile
              icon={<Globe size={20} />}
              label="Website leads"
              value={stats.website}
              sub="Enquiries from your published website"
            />
            <StatTile
              icon={<ShieldCheck size={20} />}
              label="Nomads leads"
              value={stats.nomads}
              sub="Enquiries from your Nomads listings"
            />
            <StatTile
              icon={<Clock size={20} />}
              label="Pending"
              value={stats.pending}
              sub="Leads awaiting follow-up"
              status={stats.pending > 0 ? "attention" : "success"}
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Closed / converted"
              value={stats.closed}
              sub="Leads marked closed or converted"
              status={stats.closed ? "success" : "default"}
            />
            <StatTile
              icon={<Magnet size={20} />}
              label="Conversion rate"
              value={`${stats.conversionRate}%`}
              sub={`${stats.closed} of ${stats.total} leads closed`}
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">Manage all leads</p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Open the combined leads table to review, filter, and follow up
              on every enquiry.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-1">
            <DashboardModuleCard
              icon={<Target size={19} />}
              title="All Leads"
              route="/key-apps/all-leads/list"
              description="Website and Nomads enquiries in one combined table"
              color="#2563EB"
              state={{ fromSection: "all-leads" }}
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard
                title="Monthly Leads Trend"
                subtitle="Website versus Nomads leads received during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={chartOptions}
                  series={[
                    { name: "Website", data: monthlyLeadsBySource.website },
                    { name: "Nomads", data: monthlyLeadsBySource.nomads },
                  ]}
                />
              </ChartCard>
              <ChartCard title="Leads by Source" subtitle="Current split between website and Nomads enquiries.">
                {sourceMix.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={sourceMix.map(([label]) => label)}
                    series={sourceMix.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, sourceMix.length)}
                    tooltipValue={sourceMix.map(([, value]) => `${value} leads`)}
                    wrapLabels
                  />
                ) : (
                  <Empty>No leads have been recorded yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4">
              <ChartCard title="Status Breakdown" subtitle="All leads grouped by their current follow-up status.">
                {statusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={statusBreakdown.map(([label]) => label)}
                    series={statusBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, statusBreakdown.length)}
                    tooltipValue={statusBreakdown.map(([, value]) => `${value} leads`)}
                    wrapLabels
                  />
                ) : (
                  <Empty>No leads have been recorded yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <ChartCard
                title="Recent Leads"
                subtitle="The latest enquiries received across website and Nomads listings."
                action={<RecordCountChip count={leads.length} />}
                bodyClassName=""
              >
                {recentLeads.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="w-[28%] px-5 py-3">Lead</th>
                          <th className="w-[16%] px-4 py-3">Source</th>
                          <th className="w-[20%] px-4 py-3">Product</th>
                          <th className="w-[18%] px-4 py-3">Received</th>
                          <th className="w-[18%] px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentLeads.map((lead: any, index: number) => (
                          <tr
                            key={lead._id || `${lead.fullName}-${index}`}
                            className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30"
                          >
                            <td className="truncate px-5 py-3 text-slate-900">
                              {lead.fullName || "Unnamed lead"}
                            </td>
                            <td className="truncate px-4 py-3">
                              <span className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${leadTypeTone(lead._leadType)}`}>
                                {lead._leadType || "Website"}
                              </span>
                            </td>
                            <td className="truncate px-4 py-3">
                              {lead.productType || lead.vertical || "Not recorded"}
                            </td>
                            <td className="truncate px-4 py-3">
                              {dateLabel(lead.recievedDate || lead.receivedDate || lead.createdAt)}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(lead.hostPanelStatus)}`}>
                                {readableLabel(lead.hostPanelStatus)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">
                    No leads have been recorded yet.
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

export default AllLeadsDashboard;
