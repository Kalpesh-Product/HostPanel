import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Magnet,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import GroupedBarGraph from "../../../components/graphs/GroupedBarGraph";
import leadsBannerImage from "../../../assets/coworking-banner.jpg";
import { useFreshCurrentUser } from "../../../hooks/useFreshCurrentUser";
import { getSalesTourLeads, getWebsiteLeads } from "../../../services/sales-leads";
import { getUnitTourLeads } from "../../../services/visitors";

type WebsiteLeadRecord = {
  _id?: string;
  fullName?: string;
  mobileNumber?: string;
  email?: string;
  source?: string;
  hostPanelStatus?: string;
  recievedDate?: string;
  createdAt?: string;
};

type UnitTourLeadRecord = {
  id?: string;
  name?: string;
  pocName?: string;
  phone?: string;
  pocPhone?: string;
  email?: string;
  pocEmail?: string;
  budgetRange?: string;
  leadStatus?: string;
  status?: string;
  priority?: string;
  checkInAt?: string;
  createdAt?: string;
  purpose?: string;
};

const DONUT_PALETTE = ["#1E3D73", "#2563EB", "#3b82f6", "#60a5fa", "#93c5fd", "#64748B"];

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

const dateLabel = (value?: string) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const unitTourPriority = (lead: UnitTourLeadRecord) => {
  if (lead.priority) return lead.priority;
  if (normalize(lead.budgetRange).includes("5l") || normalize(lead.budgetRange).includes("3l")) return "High";
  return lead.budgetRange ? "Medium" : "Low";
};

const unitTourStage = (lead: UnitTourLeadRecord) => lead.leadStatus || lead.status || "New";

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
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
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${statuses[status]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">{value}</p>
        {sub ? <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function LeadsManagementDashboard() {
  const currentUser = useFreshCurrentUser();
  const [websiteLeads, setWebsiteLeads] = useState<WebsiteLeadRecord[]>([]);
  const [unitTourLeads, setUnitTourLeads] = useState<UnitTourLeadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const workspaceId = currentUser?.primaryWorkspace || currentUser?.workspaceMembership?.workspace || currentUser?.workspaceId || "";
  const companyId = currentUser?.companyId || "";

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.allSettled([
      getWebsiteLeads({ workspaceId, companyId }),
      getUnitTourLeads({ limit: 100 }),
    ]).then(async ([websiteResult, unitTourResult]) => {
      if (cancelled) return;

      setWebsiteLeads(
        websiteResult.status === "fulfilled" && Array.isArray(websiteResult.value?.data)
          ? websiteResult.value.data
          : [],
      );

      if (unitTourResult.status === "fulfilled" && Array.isArray(unitTourResult.value?.visitors)) {
        const tourVisitors = unitTourResult.value.visitors.filter((visitor: any) => {
          const purpose = normalize(visitor.purpose);
          return purpose.includes("tour") || purpose.includes("workspace") || purpose.includes("enquiry");
        });
        setUnitTourLeads(tourVisitors);
      } else {
        try {
          const fallback = await getSalesTourLeads({ limit: 100 });
          setUnitTourLeads(Array.isArray(fallback?.data?.leads) ? fallback.data.leads : []);
        } catch {
          setUnitTourLeads([]);
        }
      }

      const failures = [websiteResult, unitTourResult].filter((result) => result.status === "rejected");
      setLoadError(failures.length ? "Some lead sources could not be refreshed." : "");
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, companyId]);

  const stats = useMemo(() => {
    const websitePending = websiteLeads.filter((lead) => normalize(lead.hostPanelStatus) !== "closed").length;
    const websiteClosed = websiteLeads.filter((lead) => normalize(lead.hostPanelStatus) === "closed").length;
    const unitTourActive = unitTourLeads.filter((lead) => ["New", "Contacted", "Qualified"].includes(unitTourStage(lead))).length;
    const unitTourConverted = unitTourLeads.filter((lead) => unitTourStage(lead) === "Converted").length;
    const highPriority = unitTourLeads.filter((lead) => unitTourPriority(lead) === "High").length;
    return {
      total: websiteLeads.length + unitTourLeads.length,
      websiteCount: websiteLeads.length,
      unitTourCount: unitTourLeads.length,
      pendingReview: websitePending + unitTourActive,
      highPriority,
      converted: unitTourConverted + websiteClosed,
    };
  }, [websiteLeads, unitTourLeads]);

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - (11 - index), 1);
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const monthlyTrend = useMemo(() => {
    const anchor = new Date();
    const monthIndexOf = (value?: string) => {
      const created = new Date(String(value || ""));
      if (Number.isNaN(created.getTime())) return -1;
      const difference = (anchor.getFullYear() - created.getFullYear()) * 12 + anchor.getMonth() - created.getMonth();
      const index = 11 - difference;
      return index >= 0 && index < 12 ? index : -1;
    };
    const websiteCounts = new Array(12).fill(0);
    websiteLeads.forEach((lead) => {
      const index = monthIndexOf(lead.recievedDate || lead.createdAt);
      if (index >= 0) websiteCounts[index] += 1;
    });
    const unitTourCounts = new Array(12).fill(0);
    unitTourLeads.forEach((lead) => {
      const index = monthIndexOf(lead.checkInAt || lead.createdAt);
      if (index >= 0) unitTourCounts[index] += 1;
    });
    return { websiteCounts, unitTourCounts };
  }, [websiteLeads, unitTourLeads]);

  const pipelineStages = useMemo(() => {
    const buckets = { New: 0, Contacted: 0, Qualified: 0, Converted: 0, Lost: 0 };
    unitTourLeads.forEach((lead) => {
      const stage = unitTourStage(lead);
      if (stage in buckets) buckets[stage as keyof typeof buckets] += 1;
    });
    return Object.entries(buckets).filter(([, value]) => value > 0);
  }, [unitTourLeads]);

  const sourceMix = useMemo(() => {
    const nomad = websiteLeads.filter((lead) => normalize(lead.source) === "nomad").length;
    const website = websiteLeads.length - nomad;
    return [
      { label: "Website", value: website },
      { label: "Nomad", value: nomad },
      { label: "Unit Tour", value: unitTourLeads.length },
    ].filter((item) => item.value > 0);
  }, [websiteLeads, unitTourLeads]);

  const recentLeads = useMemo(() => {
    const combined = [
      ...websiteLeads.map((lead) => ({
        key: lead._id || lead.fullName || "",
        name: lead.fullName || "Website lead",
        contact: lead.mobileNumber || lead.email || "Not shared",
        source: normalize(lead.source) === "nomad" ? "Nomad" : "Website",
        createdAt: lead.recievedDate || lead.createdAt || "",
        status: lead.hostPanelStatus || "Pending",
      })),
      ...unitTourLeads.map((lead) => ({
        key: lead.id || lead.pocName || lead.name || "",
        name: lead.pocName || lead.name || "Unit tour lead",
        contact: lead.pocPhone || lead.phone || lead.pocEmail || lead.email || "Not shared",
        source: "Unit Tour",
        createdAt: lead.checkInAt || lead.createdAt || "",
        status: unitTourStage(lead),
      })),
    ];
    return combined
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .slice(0, 8);
  }, [websiteLeads, unitTourLeads]);

  const trendChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB", "#F59E0B"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={leadsBannerImage}
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[58%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Leads</span> <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Live pipeline visibility across website enquiries, Nomad leads, and unit-tour walk-ins.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Website", "Nomad", "Unit Tours", "Pipeline"].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Total leads</p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, key) => (
              <div key={key} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile icon={<Magnet size={20} />} label="Total leads" value={stats.total} sub="Website, Nomad, and unit-tour leads combined" />
            <StatTile icon={<Globe size={20} />} label="Website & Nomad" value={stats.websiteCount} sub="All website and Nomad enquiries" />
            <StatTile icon={<Users size={20} />} label="Unit tour leads" value={stats.unitTourCount} sub="Synced from Visitor Management" />
            <StatTile icon={<Sparkles size={20} />} label="Pending review" value={stats.pendingReview} sub="Not yet closed or converted" status={stats.pendingReview ? "attention" : "success"} />
            <StatTile icon={<Target size={20} />} label="High priority" value={stats.highPriority} sub="High-budget unit-tour leads" status={stats.highPriority ? "attention" : "success"} />
            <StatTile icon={<CheckCircle2 size={20} />} label="Converted / closed" value={stats.converted} sub="Converted tours and closed website leads" status="success" />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">Manage leads</p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">Open the full leads list, pre-filtered to the pool you need.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DashboardModuleCard
              icon={<Globe size={19} />}
              title="Website & Nomad Leads"
              route="/department-accesses/sales-department/leads-management/list"
              state={{ tab: "website-leads" }}
              description="Review and update website enquiries"
              color="#2563EB"
            />
            <DashboardModuleCard
              icon={<Users size={19} />}
              title="Unit Tour Leads"
              route="/department-accesses/sales-department/leads-management/list"
              state={{ tab: "unit-tour" }}
              description="Follow up visitor-desk walk-ins"
              color="#7C3AED"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard title="Monthly Lead Trend" subtitle="Website/Nomad vs. unit-tour leads created in the last 12 calendar months.">
                <GroupedBarGraph
                  options={trendChartOptions}
                  series={[
                    { name: "Website & Nomad", data: monthlyTrend.websiteCounts },
                    { name: "Unit Tour", data: monthlyTrend.unitTourCounts },
                  ]}
                />
              </ChartCard>
              <ChartCard title="Pipeline Stage Breakdown" subtitle="Unit-tour leads grouped by sales stage.">
                {pipelineStages.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={pipelineStages.map(([label]) => label)}
                    series={pipelineStages.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, pipelineStages.length)}
                    tooltipValue={pipelineStages.map(([, value]) => `${value} leads`)}
                  />
                ) : (
                  <Empty>No unit-tour pipeline data is available yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <ChartCard title="Lead Source Mix" subtitle="Every lead grouped by where it came from.">
                {sourceMix.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={sourceMix.map((item) => item.label)}
                    series={sourceMix.map((item) => item.value)}
                    colors={DONUT_PALETTE.slice(0, sourceMix.length)}
                    tooltipValue={sourceMix.map((item) => `${item.value} leads`)}
                  />
                ) : (
                  <Empty>No lead-source data is available yet.</Empty>
                )}
              </ChartCard>
              <ChartCard title="Recent Leads" subtitle="The latest leads across every source." bodyClassName="">
                {recentLeads.length ? (
                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Lead</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3">Source</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentLeads.map((lead, index) => (
                          <tr key={lead.key || index} className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30">
                            <td className="px-5 py-3 text-slate-900">{lead.name}</td>
                            <td className="px-4 py-3">{lead.contact}</td>
                            <td className="px-4 py-3">{lead.source}</td>
                            <td className="px-4 py-3">{dateLabel(lead.createdAt)}</td>
                            <td className="px-5 py-3">
                              <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-pmedium text-blue-700">{lead.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">No leads are available yet.</div>
                )}
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
