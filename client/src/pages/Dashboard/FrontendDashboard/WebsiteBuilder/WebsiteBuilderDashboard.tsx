import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Globe,
  Magnet,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import PageFrame from "../../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../../components/DashboardModuleCard";
import DonutChart from "../../../../components/graphs/DonutChart";
import GroupedBarGraph from "../../../../components/graphs/GroupedBarGraph";
import techBannerImage from "../../../../assets/tech-dashboard-banner.webp";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import { getRecruitmentOverview } from "../../../../services/recruitment";

const DONUT_PALETTE = ["#2563EB", "#7C3AED", "#F59E0B", "#10B981", "#EF4444", "#64748B"];

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

const statusTone = (status?: string) => {
  const value = String(status || "").trim().toLowerCase();
  if (value.includes("closed") || value.includes("approved"))
    return "bg-emerald-50 text-emerald-700";
  if (value.includes("rejected")) return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
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

type WebsiteBuilderModule = {
  id: string;
  label: string;
  icon: ReactNode;
  route: string;
  description: string;
  color: string;
};

const WebsiteBuilderDashboard = () => {
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const user = auth?.user;
  const selectedCompany = useSelector(
    (state: { company?: { selectedCompany?: { companyId?: string; workspaceId?: string; companyName?: string } } }) =>
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
  const companyName = String(selectedCompany?.companyName || user?.companyName || "");

  // Same lookup CompanyLeads / WebsiteBuilderReviews use, so "has a website"
  // always agrees with the create/edit entry point and the leads/reviews pages.
  const { data: website = null, isPending: isWebsitePending, isError: isWebsiteError } = useQuery({
    queryKey: ["companyWebsite", companyId, workspaceId, companyName],
    enabled: Boolean(companyId || workspaceId || companyName),
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/editor/get-websites", {
        params: { companyId, workspaceId, businessName: companyName },
      });
      const websites = Array.isArray(response?.data) ? response.data : [];
      const matches = (site: any) => {
        const siteCompanyId = String(site?.companyId || "").trim();
        const siteWorkspaceId = String(site?.workspaceId || "").trim();
        const siteCompanyName = String(site?.companyName || "").trim().toLowerCase();
        if (companyId && siteCompanyId) return siteCompanyId === companyId.trim();
        if (workspaceId && siteWorkspaceId) return siteWorkspaceId === workspaceId.trim();
        return Boolean(companyName) && siteCompanyName === companyName.trim().toLowerCase();
      };
      return websites.find(matches) || null;
    },
  });

  const isWebsitePublished = Boolean(
    website?.isPublished === true || website?.deployedUrl || website?.publishedProjectUrl,
  );
  const publishedWebsiteUrl = String(
    website?.deployedUrl || website?.publishedProjectUrl || "",
  ).trim();

  // Same endpoint + leadScope="website" CompanyLeads uses, so counts agree.
  const { data: leads = [], isPending: isLeadsPending } = useQuery({
    queryKey: ["leadCompany", "website", companyId, workspaceId],
    enabled: Boolean(companyId || workspaceId),
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/leads/get-leads", {
        params: { companyId, workspaceId, leadScope: "website" },
        headers: { "Cache-Control": "no-cache" },
      });
      return Array.isArray(response?.data) ? response.data : [];
    },
  });

  // Same endpoint + reviewScope="website" WebsiteBuilderReviews uses.
  const { data: reviews = [], isPending: isReviewsPending } = useQuery({
    queryKey: ["websiteReviews", companyId, workspaceId],
    enabled: Boolean(companyId || workspaceId),
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/review", {
        params: { companyId, workspaceId, reviewScope: "website" },
        headers: { "Cache-Control": "no-cache" },
      });
      const raw = res.data?.reviews ?? res.data?.data?.reviews ?? res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
  });

  // Same service the Careers page (HRRecruitmentPage mode="careers") uses,
  // filtered to roles actually posted on the public website.
  const { data: recruitmentOverview, isPending: isRecruitmentPending } = useQuery({
    queryKey: ["module-stats-recruitment"],
    queryFn: () => getRecruitmentOverview(),
    staleTime: 5 * 60 * 1000,
  });

  const careerJobs = useMemo(() => {
    const openings = Array.isArray((recruitmentOverview as any)?.jobOpenings)
      ? (recruitmentOverview as any).jobOpenings
      : [];
    return openings.filter((job: any) => job?.isPostedOnWebsite === true);
  }, [recruitmentOverview]);

  const isLoading = isWebsitePending || isLeadsPending || isReviewsPending || isRecruitmentPending;

  const stats = useMemo(() => {
    const pendingLeads = leads.filter(
      (lead: any) => (lead.hostPanelStatus || "Pending") === "Pending",
    ).length;
    const closedLeads = leads.filter(
      (lead: any) => lead.hostPanelStatus === "Closed",
    ).length;
    const pendingReviews = reviews.filter(
      (review: any) => (review.status || "pending") === "pending",
    ).length;
    const approvedReviews = reviews.filter(
      (review: any) => review.status === "approved",
    ).length;
    const activeCareerJobs = careerJobs.filter((job: any) => job?.isActive).length;

    return {
      pendingLeads,
      closedLeads,
      pendingReviews,
      approvedReviews,
      activeCareerJobs,
    };
  }, [leads, reviews, careerJobs]);

  const leadPipeline = useMemo(() => {
    const buckets: Record<string, number> = {};
    leads.forEach((lead: any) => {
      const label = readableLabel(lead.hostPanelStatus);
      buckets[label] = (buckets[label] || 0) + 1;
    });
    return Object.entries(buckets);
  }, [leads]);

  const reviewBreakdown = useMemo(() => {
    const buckets: Record<string, number> = {};
    reviews.forEach((review: any) => {
      const label = readableLabel(review.status || "pending");
      buckets[label] = (buckets[label] || 0) + 1;
    });
    return Object.entries(buckets);
  }, [reviews]);

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - (11 - index), 1);
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const monthlyLeads = useMemo(() => {
    const anchor = new Date();
    const counts = new Array(12).fill(0);
    leads.forEach((lead: any) => {
      const created = new Date(String(lead.recievedDate || lead.receivedDate || lead.createdAt || ""));
      if (Number.isNaN(created.getTime())) return;
      const difference =
        (anchor.getFullYear() - created.getFullYear()) * 12 + anchor.getMonth() - created.getMonth();
      const index = 11 - difference;
      if (index >= 0 && index < 12) counts[index] += 1;
    });
    return counts;
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
    plotOptions: { bar: { borderRadius: 4, columnWidth: "44%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const builderBasePath = "/key-apps/website-builder";
  const websiteSearchKey = String(website?.searchKey || "").trim();
  // Same resolution WebsiteBuilderTypeActions uses to decide create vs. edit,
  // so the module card jumps straight into the builder instead of landing on
  // the action-cards page first.
  const hasResumableDraft =
    website?.isDraft === true && website?.isPublished !== true && Boolean(websiteSearchKey);
  const canEditExistingWebsite = Boolean(website) || hasResumableDraft;
  const isDraftOnly =
    website?.isDraft === true && website?.isPublished !== true && !website?.draftData;
  const createOrEditRoute =
    !canEditExistingWebsite || isDraftOnly || !websiteSearchKey
      ? `${builderBasePath}/dynamic/create-website`
      : `${builderBasePath}/edit-website/${encodeURIComponent(websiteSearchKey)}`;
  const createOrEditState =
    !canEditExistingWebsite || isDraftOnly || !websiteSearchKey
      ? { fromSection: "website-builder" }
      : {
          fromSection: "website-builder",
          searchKey: websiteSearchKey,
          companyName: website?.companyName,
        };

  const modules: WebsiteBuilderModule[] = [
    {
      id: "website-create-edit",
      label: website ? "Edit Website" : "Create Website",
      icon: <Globe size={19} />,
      route: createOrEditRoute,
      description: website
        ? "Update your published site and page content"
        : "Build your company website from a template",
      color: "#2563EB",
    },
    {
      id: "website-leads",
      label: "Website Leads",
      icon: <Magnet size={19} />,
      route: `${builderBasePath}/dynamic/leads`,
      description: "Enquiries received from your live website",
      color: "#0F766E",
    },
    {
      id: "website-reviews",
      label: "Website Review",
      icon: <Star size={19} />,
      route: `${builderBasePath}/dynamic/reviews`,
      description: "Visitor-submitted reviews awaiting moderation",
      color: "#7C3AED",
    },
    {
      id: "website-careers",
      label: "Careers",
      icon: <Briefcase size={19} />,
      route: `${builderBasePath}/dynamic/careers`,
      description: "Job openings posted on your careers page",
      color: "#F59E0B",
    },
  ];

  const moduleMetric = (moduleId: string) => {
    if (moduleId === "website-leads") return leads.length;
    if (moduleId === "website-reviews") return reviews.length;
    if (moduleId === "website-careers") return careerJobs.length;
    if (moduleId === "website-create-edit") return website ? (isWebsitePublished ? "Live" : "Draft") : "Not created";
    return "—";
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={techBannerImage}
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
                <span className="text-primary">Website Builder</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Build and publish your company website, and track leads, reviews,
                and careers postings coming from it.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Website", "Leads", "Reviews", "Careers"].map((tag) => (
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
                Website status
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">
                {!website ? "Not created" : isWebsitePublished ? "Live" : "Draft"}
              </p>
            </div>
          </div>
        </div>

        {isWebsiteError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            Website data could not be refreshed just now — existing values may be
            incomplete.
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div key={key} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<Globe size={20} />}
              label="Website status"
              value={!website ? "Not created" : isWebsitePublished ? "Live" : "Draft"}
              sub={
                isWebsitePublished
                  ? publishedWebsiteUrl || "Published and visible to visitors"
                  : website
                    ? "Saved but not published yet"
                    : "Create your website to go live"
              }
              status={isWebsitePublished ? "success" : website ? "attention" : "default"}
            />
            <StatTile
              icon={<Magnet size={20} />}
              label="Website leads"
              value={leads.length}
              sub={`${stats.pendingLeads} awaiting follow-up`}
              status={stats.pendingLeads > 0 ? "attention" : "success"}
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Closed leads"
              value={stats.closedLeads}
              sub="Enquiries marked closed"
              status={stats.closedLeads ? "success" : "default"}
            />
            <StatTile
              icon={<Target size={20} />}
              label="Lead response rate"
              value={leads.length ? `${Math.round((stats.closedLeads / leads.length) * 100)}%` : "0%"}
              sub={`${leads.length} total enquiries received`}
            />
            <StatTile
              icon={<Star size={20} />}
              label="Guest reviews"
              value={reviews.length}
              sub={`${stats.approvedReviews} approved, visible on site`}
              status={reviews.length ? "success" : "default"}
            />
            <StatTile
              icon={<Sparkles size={20} />}
              label="Reviews pending"
              value={stats.pendingReviews}
              sub="Awaiting moderation"
              status={stats.pendingReviews > 0 ? "attention" : "success"}
            />
            <StatTile
              icon={<Briefcase size={20} />}
              label="Careers postings"
              value={careerJobs.length}
              sub={`${stats.activeCareerJobs} currently active`}
            />
            <StatTile
              icon={<BadgeCheck size={20} />}
              label="Active job openings"
              value={stats.activeCareerJobs}
              sub="Visible on your careers page"
              status={stats.activeCareerJobs ? "success" : "default"}
            />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">Manage website builder</p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Build or edit your website, and review the leads, reviews, and
              careers postings it brings in.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map((module) => (
              <div
                key={module.id}
                data-tour={
                  module.id === "website-create-edit"
                    ? "wb-create-edit"
                    : module.id === "website-leads"
                      ? "wb-leads"
                      : module.id === "website-reviews"
                        ? "wb-reviews"
                        : module.id === "website-careers"
                          ? "wb-careers"
                          : undefined
                }
                className="grid"
              >
                <DashboardModuleCard
                  icon={module.icon}
                  title={module.label}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={
                    module.id === "website-create-edit"
                      ? createOrEditState
                      : { fromSection: "website-builder" }
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard
                title="Website Leads Trend"
                subtitle="Enquiries received through your website during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={chartOptions}
                  series={[{ name: "Website leads", data: monthlyLeads }]}
                />
              </ChartCard>
              <ChartCard title="Lead Pipeline" subtitle="Current enquiry distribution by stage.">
                {leadPipeline.length ? (
                  <DonutChart
                    centerLabel="Leads"
                    labels={leadPipeline.map(([label]) => label)}
                    series={leadPipeline.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, leadPipeline.length)}
                    tooltipValue={leadPipeline.map(([, value]) => `${value} leads`)}
                    wrapLabels
                  />
                ) : (
                  <Empty>No leads have been recorded from your website yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Review Status Breakdown" subtitle="Visitor reviews grouped by moderation status.">
                {reviewBreakdown.length ? (
                  <DonutChart
                    centerLabel="Reviews"
                    labels={reviewBreakdown.map((item) => item[0])}
                    series={reviewBreakdown.map((item) => item[1])}
                    colors={DONUT_PALETTE.slice(0, reviewBreakdown.length)}
                    tooltipValue={reviewBreakdown.map((item) => `${item[1]} reviews`)}
                    wrapLabels
                  />
                ) : (
                  <Empty>No reviews have been submitted yet.</Empty>
                )}
              </ChartCard>
              <ChartCard title="Module Snapshot">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {modules.map((module, index) => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: DONUT_PALETTE[index % DONUT_PALETTE.length] }}
                        >
                          {module.icon}
                        </span>
                        <span className="truncate text-[11px] font-pmedium text-slate-600">
                          {module.label}
                        </span>
                      </div>
                      <span className="ml-3 text-[13px] font-pmedium text-slate-900">
                        {moduleMetric(module.id)}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <ChartCard
                title="Recent Website Leads"
                subtitle="The latest enquiries received through your website."
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
                        {recentLeads.map((lead: any, index: number) => (
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
                              {dateLabel(lead.recievedDate || lead.receivedDate || lead.createdAt)}
                            </td>
                            <td className="truncate px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] font-pmedium ${statusTone(lead.hostPanelStatus)}`}
                              >
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
                    <p>No leads have been recorded from your website yet.</p>
                    {!website ? (
                      <button
                        type="button"
                        onClick={() => navigate(createOrEditRoute, { state: createOrEditState })}
                        className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#2563EB] px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700"
                      >
                        Create Website
                      </button>
                    ) : null}
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

export default WebsiteBuilderDashboard;
