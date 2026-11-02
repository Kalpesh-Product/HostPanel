// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2, Eye, Download, FileText, Globe, Search, Sparkles, Target, Users, X, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";
import useDashboardAccess from "../../../hooks/useDashboardAccess";
import { canExportReports } from "../../../utils/workspacePlanAccess";
import PageFrame from "../../../components/Pages/PageFrame";
import { statusPillClass } from '../../../lib/status-pill';
import { createReport } from "../../../services/reports";
import ExportReportModal, { type ExportParams } from "../../../components/ExportReportModal";
import ReportExportButton from "@/components/ReportExportButton";
import { isDateInExportPeriod } from '@/utils/export-period';
import { downloadReportFile } from "../../../utils/report-download";
import { WebsiteLeadsSkeleton } from "../../../components/ui/Skeleton";

const HOST_PANEL_STATUSES = ["Pending", "Accepted", "Rejected", "Closed"];

const STAGE_PILL_STYLES = {
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  Accepted: "bg-blue-50 text-blue-700 border-blue-100",
  Rejected: "bg-rose-50 text-rose-700 border-rose-100",
  Closed: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const PAYMENT_PILL_STYLES = {
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Rejected: "bg-rose-50 text-rose-700 border-rose-100",
  Failed: "bg-rose-50 text-rose-700 border-rose-100",
};

function formatMoney(amount, currency) {
  const value = Number(amount) || 0;
  const code = String(currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function paymentPillLead(lead) {
  const paymentStatus = lead.paymentStatus || (lead.hostPanelStatus === "Rejected" ? "Rejected" : "Pending");
  if (paymentStatus === "Paid") {
    return `Paid · ${formatMoney(lead.paymentBaseAmount, lead.paymentCurrency)}`;
  }
  return paymentStatus;
}

function formatDateLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function getInitials(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "LD";
}

function isSameCompanyWebsite(website, companyId, workspaceId, companyName) {
  const websiteCompanyId = String(website?.companyId || "").trim();
  const websiteWorkspaceId = String(website?.workspaceId || "").trim();
  const websiteCompanyName = String(website?.companyName || "").trim().toLowerCase();

  if (companyId && websiteCompanyId) return websiteCompanyId === String(companyId).trim();
  if (workspaceId && websiteWorkspaceId) return websiteWorkspaceId === String(workspaceId).trim();
  return Boolean(companyName) && websiteCompanyName === String(companyName).trim().toLowerCase();
}

export default function CompanyLeads({ leadScope = "website" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const { plan } = useDashboardAccess();
  const showReportExports = canExportReports(plan);
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isExportingReport, setIsExportingReport] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [manualAmountPrompt, setManualAmountPrompt] = useState(null); // { leadId } | null
  const [manualAmountValue, setManualAmountValue] = useState("");
  const [manualCurrencyValue, setManualCurrencyValue] = useState("USD");
  const [discountType, setDiscountType] = useState("amount"); // "amount" | "percent"
  const [discountValue, setDiscountValue] = useState("");
  const [availabilityInfo, setAvailabilityInfo] = useState(null); // { checked, available, conflictBookingCode } | null

  const workspaceId = selectedCompany?.workspaceId || auth?.user?.primaryWorkspace || auth?.user?.workspaceMembership?.workspace || auth?.user?.workspaceId || "";
  const companyId = selectedCompany?.companyId || auth?.user?.companyId || "";
  const companyName = selectedCompany?.companyName || auth?.user?.companyName || "";
  const isAllLeads = String(leadScope).toLowerCase() === "all";
  const isNomadsLeads = String(leadScope).toLowerCase() === "nomads";
  const pageTitle = isAllLeads ? "All Leads" : isNomadsLeads ? "Leads" : "Website Leads";
  const pageDescription = isAllLeads
    ? "All website and nomads leads in one place."
    : isNomadsLeads
    ? "Enquiries received from your Nomads Listings."
    : "Website enquiries received from your published site.";
  const leadLabel = isAllLeads ? "Lead" : isNomadsLeads ? "Nomads lead" : "Website lead";

  const { data: leads = [], isPending, isError } = useQuery({
    queryKey: ["leadCompany", leadScope, companyId, workspaceId],
    enabled: !!(companyId || workspaceId),
    queryFn: async () => {
      if (isAllLeads) {
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
        const websiteLeads = (Array.isArray(websiteRes?.data) ? websiteRes.data : []).map((l) => ({ ...l, _leadType: "Website" }));
        const nomadsLeads = (Array.isArray(nomadsRes?.data) ? nomadsRes.data : []).map((l) => ({ ...l, _leadType: "Nomads" }));
        return [...websiteLeads, ...nomadsLeads].sort((a, b) => {
          const aDate = new Date(a.recievedDate || a.receivedDate || a.createdAt || 0).getTime();
          const bDate = new Date(b.recievedDate || b.receivedDate || b.createdAt || 0).getTime();
          return bDate - aDate;
        });
      }
      const response = await axiosPrivate.get("/api/leads/get-leads", {
        params: { companyId, workspaceId, leadScope },
        headers: { "Cache-Control": "no-cache" },
      });
      const rawLeads = Array.isArray(response?.data) ? response.data : [];
      return [...rawLeads].sort((a, b) => {
        const aDate = new Date(a.recievedDate || a.receivedDate || a.createdAt || 0).getTime();
        const bDate = new Date(b.recievedDate || b.receivedDate || b.createdAt || 0).getTime();
        return bDate - aDate;
      });
    },
  });

  const { data: leadPlan } = useQuery({
    queryKey: ["leadPlanLimit", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/leads/plan-limit", { params: { workspaceId } });
      return res.data; // { plan, limit } — limit null means unlimited (custom plan)
    },
  });
  const leadLimit = leadPlan?.limit ?? null;
  const planCappedLeads = Number.isFinite(leadLimit) ? leads.slice(0, leadLimit) : leads;
  const lockedLeadsCount = Number.isFinite(leadLimit) ? Math.max(leads.length - leadLimit, 0) : 0;

  const requestMoreLeadsMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosPrivate.post("/api/leads/request-more-leads", { workspaceId });
      return res.data;
    },
    onSuccess: (data) => toast.success(data.message || "Request sent"),
    onError: (err) => toast.error(err.response?.data?.message || "Failed to send request"),
  });

  const { data: website = null, isPending: isWebsitePending, isError: isWebsiteError } = useQuery({
    queryKey: ["companyWebsite", companyId, workspaceId, companyName],
    enabled: !!(companyId || workspaceId || companyName),
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/editor/get-websites", {
        params: { companyId, workspaceId, businessName: companyName },
      });
      const websites = Array.isArray(response?.data) ? response.data : [];
      return websites.find((item) => isSameCompanyWebsite(item, companyId, workspaceId, companyName)) || null;
    },
  });

  const websiteSearchKey = String(website?.searchKey || "").trim();
  const publishedWebsiteUrl = String(website?.deployedUrl || website?.publishedProjectUrl || "").trim();
  const isWebsitePublished = Boolean(website?.isPublished === true || publishedWebsiteUrl);
  const websiteAction = website
    ? {
        label: "Edit Website",
        to: websiteSearchKey
          ? `/key-apps/website-builder/edit-website/${encodeURIComponent(websiteSearchKey)}`
          : "/key-apps/website-builder/dynamic/create-website",
      }
    : {
        label: isWebsiteError ? "Open Website Builder" : "Create Website",
        to: "/key-apps/website-builder",
      };

  const updateLeadMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosPrivate.patch("/api/leads/update-lead", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Lead updated");
      queryClient.invalidateQueries({ queryKey: ["leadCompany"] });
      setManualAmountPrompt(null);
      setManualAmountValue("");
      setManualCurrencyValue("USD");
      setDiscountType("amount");
      setDiscountValue("");
      setAvailabilityInfo(null);
    },
    onError: (err, variables) => {
      if (err.response?.data?.requiresManualAmount) {
        setManualAmountPrompt({ leadId: variables.leadId });
        return;
      }
      toast.error(err.response?.data?.message || "Update failed");
    },
  });

  const handleStatusChange = (leadId, newStatus) => {
    updateLeadMutation.mutate({ leadId, hostPanelStatus: newStatus });
  };

  const previewPaymentMutation = useMutation({
    mutationFn: async (leadId) => {
      const res = await axiosPrivate.get("/api/leads/preview-payment", { params: { leadId } });
      return res.data;
    },
  });

  // Accept always opens the amount modal first — prefilled with the
  // auto-calculated price when one could be resolved (e.g. meeting rooms),
  // left blank otherwise (e.g. co-working/co-living, priced monthly). The
  // host can edit it either way; whatever is in the field is what gets sent.
  const acceptLead = async (leadId) => {
    setManualAmountPrompt({ leadId });
    setManualAmountValue("");
    setManualCurrencyValue("USD");
    setDiscountType("amount");
    setDiscountValue("");
    setAvailabilityInfo(null);
    try {
      const preview = await previewPaymentMutation.mutateAsync(leadId);
      if (Number(preview?.base) > 0) setManualAmountValue(String(preview.base));
      if (preview?.currency) setManualCurrencyValue(preview.currency);
      if (preview?.availability) setAvailabilityInfo(preview.availability);
    } catch {
      // leave blank — host enters the amount manually
    }
  };

  const manualFeePreview = useMemo(() => {
    const subtotal = Number(manualAmountValue) || 0;
    const rawDiscountValue = Math.max(0, Number(discountValue) || 0);
    const discountAmount = Math.round(
      (discountType === "percent" ? (subtotal * Math.min(rawDiscountValue, 100)) / 100 : Math.min(rawDiscountValue, subtotal)) * 100,
    ) / 100;
    const base = Math.round((subtotal - discountAmount) * 100) / 100;
    const platformFeeAmount = Math.round(base * 0.07 * 100) / 100;
    return {
      subtotal, discountAmount, base, platformFeeAmount,
      total: Math.round((base + platformFeeAmount) * 100) / 100,
    };
  }, [manualAmountValue, discountType, discountValue]);

  const submitManualAmount = () => {
    if (!manualAmountPrompt) return;
    const amount = Number(manualAmountValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    updateLeadMutation.mutate({
      leadId: manualAmountPrompt.leadId,
      hostPanelStatus: "Accepted",
      manualAmount: amount,
      manualCurrency: manualCurrencyValue,
      discountType,
      discountValue: Number(discountValue) || 0,
    });
  };

  const renderAcceptStepper = (activeStep) => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {[["1", "Lead Details"], ["2", "Confirm & Accept"]].map(([num, label], i) => (
        <div key={num} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-pmedium ${
              Number(num) === activeStep ? "bg-[#2563EB] text-white" : Number(num) < activeStep ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
            }`}>{num}</span>
            <span className={`text-[11px] font-pmedium ${Number(num) === activeStep ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
          </div>
          {i === 0 && <span className="w-6 h-px bg-slate-200" />}
        </div>
      ))}
    </div>
  );

  const notifySlotUnavailableMutation = useMutation({
    mutationFn: async (leadId) => {
      const res = await axiosPrivate.post("/api/leads/notify-slot-unavailable", { leadId });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Client notified");
      queryClient.invalidateQueries({ queryKey: ["leadCompany"] });
      setManualAmountPrompt(null);
      setAvailabilityInfo(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to notify client");
    },
  });

  const leadStats = useMemo(() => {
    const total = leads.length;
    const pending = leads.filter((l) => (l.hostPanelStatus || "Pending") === "Pending").length;
    const closed = leads.filter((l) => l.hostPanelStatus === "Closed").length;
    const paidLeads = leads.filter((l) => l.paymentStatus === "Paid");
    // Host's net take — base amount only, excludes the 7% WoNo platform fee
    // the client's total payment also covers.
    const paymentsReceivedTotal = paidLeads.reduce((sum, l) => sum + (Number(l.paymentBaseAmount) || 0), 0);
    const paymentsReceivedCurrency = paidLeads[0]?.paymentCurrency || "USD";
    return [
      { label: "Pending", value: pending, icon: Sparkles },
      { label: "Closed", value: closed, icon: CheckCircle2 },
      { label: "Payments Received", value: formatMoney(paymentsReceivedTotal, paymentsReceivedCurrency), icon: Wallet },
      {
        label: "Leads Remaining",
        value: Number.isFinite(leadLimit) ? `${Math.max(leadLimit - total, 0)} / ${leadLimit}` : "Unlimited",
        icon: Target,
      },
    ];
  }, [leads, pageTitle, leadLimit]);

  const visibleLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return planCappedLeads.filter((lead) => {
      const matchesStage = stageFilter === "All" || (lead.hostPanelStatus || "Pending") === stageFilter;
      const matchesQuery = !query || [lead.fullName, lead.mobileNumber, lead.email, lead.source, lead.vertical, lead.productType, lead.companyName, lead._leadType]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
      return matchesStage && matchesQuery;
    });
  }, [planCappedLeads, searchQuery, stageFilter]);

  const selectedLead = useMemo(
    () => leads.find((l) => l._id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  useEffect(() => {
    const searchRecord = location.state?.globalSearchRecord;
    if (searchRecord?.type !== "lead" || isPending) return;
    const recordId = String(searchRecord?.record?._id || searchRecord?.record?.id || "");
    const matchingLead = leads.find((lead) => String(lead?._id || lead?.id || "") === recordId);
    setSearchQuery(String(location.state?.globalSearchQuery || searchRecord?.record?.fullName || ""));
    if (matchingLead) setSelectedLeadId(matchingLead._id || matchingLead.id);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [isPending, leads, location.pathname, location.search, location.state, navigate]);

  const handleExportReport = async ({ format, dataWindow, period, reportMonth, dateFrom, dateTo }: ExportParams) => {
    const reportFormat = format === "Excel" ? "Excel" : "PDF";
    const exportLeads = visibleLeads.filter((lead) => isDateInExportPeriod(lead.recievedDate || lead.receivedDate || lead.createdAt || lead.updatedAt, { dateFrom, dateTo }));
    if (!exportLeads.length) { toast.error(`There are no ${pageTitle.toLowerCase()} to export for the selected period.`); return; }
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: `${pageTitle} Report`, department: "Sales", category: "Other", dataWindow,
        reportMonth, period: period || pageTitle,
        generatedBy: auth?.user?.fullName || auth?.user?.name || (isNomadsLeads ? "Nomads Team" : "Website Team"), format: reportFormat,
        description: pageDescription, sourceType: "custom", sourceRef: isNomadsLeads ? "nomads-leads" : "website-leads",
        reportRows: exportLeads.slice(0, 100).map((lead, index) => ({
          label: `${index + 1}. ${lead.fullName || leadLabel}`,
          value: [lead.mobileNumber || "No phone", lead.email || "No email", lead.source || (isNomadsLeads ? "Nomad" : "Website"), lead.productType || lead.vertical || "No product", lead.hostPanelStatus || "Pending", formatDateLabel(lead.recievedDate || lead.receivedDate || lead.createdAt)].join(" | "),
        })),
        monthlyData: [],
      });
      await downloadReportFile(response?.data?.download?.url, { openInNewTab: false });
      toast.success(`${reportFormat} report saved to Reports.`);
      window.dispatchEvent(new Event("reports:refresh"));
    } catch (error) { toast.error(error?.message || `Failed to export ${pageTitle.toLowerCase()} report.`); }
    finally { setIsExportingReport(""); }
  };

  if (isPending) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <WebsiteLeadsSkeleton label={`Loading ${pageTitle.toLowerCase()}`} />
        </PageFrame>
      </div>
    );
  }

  if (isError) return <span className="text-red-500">Error Loading Leads</span>;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4 text-slate-700 font-sans">

          {/* HEADER */}
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5" data-tour="wb-leads-header">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                {pageTitle}
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {pageDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
              {showReportExports && (
                <>
                  <ReportExportButton onClick={() => setShowExportModal(true)} isExporting={Boolean(isExportingReport)} aria-label={`Export ${pageTitle.toLowerCase()}`} />
                </>
              )}
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-1 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Pending</p>
                <p className="text-[15px] font-pmedium text-slate-900">{leadStats[0]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Sparkles size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Closed</p>
                <p className="text-[15px] font-pmedium text-slate-900">{leadStats[1]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Payments Received</p>
                <p className="text-[15px] font-pmedium text-slate-900">{leadStats[2]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Wallet size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-violet-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-violet-600 uppercase tracking-widest mb-1">Leads Remaining</p>
                <p className="text-[15px] font-pmedium text-slate-900">{leadStats[3]?.value ?? "-"}</p>
              </div>
              <div className="p-2 rounded-2xl bg-violet-50 text-violet-600 shrink-0"><Target size={16} /></div>
            </div>
          </div>

          {lockedLeadsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] font-pmedium text-amber-800">
                Showing {planCappedLeads.length} of {leads.length} leads on your <span className="capitalize">{leadPlan?.plan || "basic"}</span> plan.
                {" "}{lockedLeadsCount} more {lockedLeadsCount === 1 ? "lead is" : "leads are"} locked — upgrade to see them.
              </p>
              <button type="button" onClick={() => requestMoreLeadsMutation.mutate()} disabled={requestMoreLeadsMutation.isPending}
                className="px-4 py-2 rounded-xl text-[12px] font-pmedium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
              >{requestMoreLeadsMutation.isPending ? "Sending..." : "Request More Leads"}</button>
            </div>
          )}

          {/* TABLE */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              {/* STATUS FILTER PILLS */}
              <div className="w-full overflow-x-auto mb-3 [&::-webkit-scrollbar]:hidden" data-tour="wb-leads-status-filter">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button onClick={() => setStageFilter("All")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${stageFilter === "All" ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                  >All</button>
                  {HOST_PANEL_STATUSES.map((status) => {
                    return (
                      <button key={status} onClick={() => setStageFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${stageFilter === status ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                      >{status}</button>
                    );
                  })}
                </div>
              </div>
              <div />
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input type="text" placeholder="Search" data-tour="wb-leads-search"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-100/70 border-0 rounded-lg text-[12px] font-pmedium text-slate-500 focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all placeholder:text-slate-500" />
                </div>
              </div>
            </div>

            {visibleLeads.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center" data-tour="wb-leads-empty-state">
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${leads.length === 0 ? "bg-blue-50 text-[#2563EB]" : "bg-slate-50 text-slate-400"}`}>
                  <Target size={28} />
                </div>
                <h3 className="text-[15px] font-pmedium text-slate-900">
                  {leads.length === 0 ? "No leads yet" : `No matching ${pageTitle.toLowerCase()} found`}
                </h3>
                <p className="mt-2 max-w-md text-[12px] font-pmedium leading-relaxed text-slate-500">
                  {leads.length === 0
                    ? isWebsitePending
                      ? "Checking your website so we can show the right next step."
                      : isWebsiteError
                        ? "Open Website Builder to check your website and choose the next step."
                        : !website
                          ? "Create your website to start receiving enquiries. New submissions will appear here automatically."
                          : isWebsitePublished
                            ? "Your website is live and ready to receive enquiries. New submissions will appear here automatically."
                            : "Your website is saved but not live yet. Finish editing and publish it to start receiving enquiries."
                    : "Try another search term or clear the current status and search filters."}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {leads.length === 0 ? (
                    <Link
                      to={websiteAction.to}
                      aria-disabled={isWebsitePending}
                      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${isWebsitePending ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <Globe size={14} /> {isWebsitePending ? "Checking Website" : websiteAction.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStageFilter("All");
                      }}
                      className="inline-flex items-center justify-center rounded-lg bg-[#2563EB] px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                    >
                      Clear Filters
                    </button>
                  )}
                  {leads.length === 0 && isWebsitePublished && publishedWebsiteUrl && (
                    <a
                      href={publishedWebsiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-pmedium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                    >
                      <Eye size={14} /> View Live Website
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left min-w-[1040px]" data-tour="wb-leads-table">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Lead Names</th>
                      <th className="px-5 py-4">Source</th>
                      <th className="px-5 py-4">Product</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Payment Status</th>
                      <th className="px-5 py-4">Received Date</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {visibleLeads.map((lead) => {
                      const websiteStageStyle = STAGE_PILL_STYLES[lead.hostPanelStatus || "Pending"] || "bg-slate-50 text-slate-600 border-slate-200";
                      const paymentStyle = PAYMENT_PILL_STYLES[lead.paymentStatus || "Pending"] || "bg-slate-50 text-slate-600 border-slate-200";
                      return (
                        <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[10px] font-pmedium text-white shadow-sm">{getInitials(lead.fullName)}</div>
                              <div>
                                <p className="text-[12px] font-pmedium text-slate-900">{lead.fullName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4"><span className="text-[12px] font-pmedium text-slate-700">{lead._leadType || lead.source || "Website"}</span></td>
                          <td className="px-5 py-4">
                            {(() => {
                              const pt = (lead.productType || "").trim();
                              const v = (lead.vertical || "").trim();
                              const product = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "co-working");
                              return <p className="text-[12px] font-pmedium text-slate-700">{product}</p>;
                            })()}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider ${websiteStageStyle}`}>
                              {lead.hostPanelStatus || "Pending"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full border px-2.5 py-1 whitespace-nowrap text-[10px] font-pmedium uppercase tracking-wider ${paymentStyle}`}>
                              {paymentPillLead(lead)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[12px] font-pmedium text-slate-700">{formatDateLabel(lead.recievedDate || lead.receivedDate || lead.createdAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => setSelectedLeadId(lead._id)} data-tour="wb-leads-view"
                                title="View details" aria-label={`View details for ${lead.fullName}`}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"><Eye size={15} strokeWidth={2.5} aria-hidden="true" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DETAIL MODAL */}
          {selectedLead && (
            <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
              <div
                className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-pmedium shadow-sm shrink-0 bg-[#2563EB] text-white">
                      {getInitials(selectedLead.fullName)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{selectedLead.fullName}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={statusPillClass(selectedLead.hostPanelStatus || "Pending")}>{selectedLead.hostPanelStatus || "Pending"}</span>
                        <span className={statusPillClass(paymentPillLead(selectedLead))}>{paymentPillLead(selectedLead)}</span>
                        {(() => {
                          const pt = (selectedLead.productType || "").trim();
                          const v = (selectedLead.vertical || "").trim();
                          const label = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "");
                          return label ? (
                            <span className={statusPillClass(label)}>{label}</span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedLeadId(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-white">
                {manualAmountPrompt ? (
                  <>
                    {renderAcceptStepper(2)}
                    <button type="button" onClick={() => setManualAmountPrompt(null)} className="text-[11px] font-pmedium text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1">&larr; Back to Lead Details</button>
                    <h3 className="text-[13px] font-pmedium text-slate-900 mb-1">Confirm Booking Amount</h3>
                    <p className="text-[11px] text-slate-500 mb-4">
                      {previewPaymentMutation.isPending
                        ? "Calculating price…"
                        : Number(manualAmountValue) > 0
                          ? "Pre-filled from the listed price — change it if needed."
                          : "Couldn't auto-calculate this price (e.g. co-working/co-living isn't priced by the hour). Enter the amount."}
                    </p>

                    {availabilityInfo?.checked && (
                      availabilityInfo.available ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-pmedium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
                          <CheckCircle2 size={13} /> Slot available
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] font-pmedium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
                          <X size={13} /> Already booked ({availabilityInfo.conflictBookingCode || "another booking"}) for this slot
                        </div>
                      )
                    )}

                    <label className="block text-[10px] uppercase tracking-widest font-pmedium text-slate-500 mb-1">Amount</label>
                    <input type="number" min="0" step="0.01" autoFocus value={manualAmountValue}
                      onChange={(e) => setManualAmountValue(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-pmedium mb-3 outline-none focus:border-blue-400"
                    />
                    <label className="block text-[10px] uppercase tracking-widest font-pmedium text-slate-500 mb-1">Currency</label>
                    <select value={manualCurrencyValue} onChange={(e) => setManualCurrencyValue(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-pmedium mb-3 outline-none focus:border-blue-400"
                    >
                      {["USD", "INR", "EUR", "GBP"].map((code) => <option key={code} value={code}>{code}</option>)}
                    </select>

                    <label className="block text-[10px] uppercase tracking-widest font-pmedium text-slate-500 mb-1">Discount (optional)</label>
                    <div className="flex items-center gap-2 mb-4">
                      <input type="number" min="0" step="0.01" value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="0"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-pmedium outline-none focus:border-blue-400"
                      />
                      <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}
                        className="rounded-xl border border-slate-200 px-2 py-2 text-[12px] font-pmedium outline-none focus:border-blue-400"
                      >
                        <option value="amount">{manualCurrencyValue}</option>
                        <option value="percent">%</option>
                      </select>
                    </div>

                    {manualFeePreview.subtotal > 0 && (
                      <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3 mb-2 space-y-1.5">
                        <div className="flex justify-between text-[11px] font-pmedium text-slate-600">
                          <span>Subtotal</span>
                          <span>{formatMoney(manualFeePreview.subtotal, manualCurrencyValue)}</span>
                        </div>
                        {manualFeePreview.discountAmount > 0 && (
                          <div className="flex justify-between text-[11px] font-pmedium text-rose-600">
                            <span>Discount</span>
                            <span>-{formatMoney(manualFeePreview.discountAmount, manualCurrencyValue)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] font-pmedium text-slate-600">
                          <span>WoNo platform fee (7%)</span>
                          <span>{formatMoney(manualFeePreview.platformFeeAmount, manualCurrencyValue)}</span>
                        </div>
                        <div className="flex justify-between text-[12px] font-pmedium text-slate-900 pt-1.5 border-t border-slate-200">
                          <span>Total payable</span>
                          <span>{formatMoney(manualFeePreview.total, manualCurrencyValue)}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                  {(selectedLead.hostPanelStatus || "Pending") === "Pending" && renderAcceptStepper(1)}
                  <div>
                    <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <Users size={14} /> Contact Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Received On</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{formatDateLabel(selectedLead.recievedDate || selectedLead.receivedDate || selectedLead.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Received Via</p>
                        <p className="text-[12px] font-pmedium text-slate-900">
                          {selectedLead._leadType || (() => {
                            const s = (selectedLead.source || "").toLowerCase();
                            if (s === "nomad" || s === "nomads") return "Nomads Listings";
                            if (s.includes("preview")) return "Website Preview";
                            if (s.includes("hosted") || s.includes("live") || s.includes("wono")) return "Hosted Website";
                            if (s.includes("direct")) return "Direct";
                            return selectedLead.source || "Website";
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const norm = (v) => String(v || "").toLowerCase().trim();
                    const vertical = norm(selectedLead.vertical);
                    const product = norm(selectedLead.productType);
                    const nop = norm(selectedLead.noOfPeople);

                    const isRedundant = (val) => {
                      const s = norm(val);
                      return !s || s === vertical || s === product || (vertical && product && s === `${vertical} · ${product}`);
                    };
                    const sameAsNop = (val) => { const s = norm(val); return !s || s === nop; };

                    const pt = (selectedLead.productType || "").trim();
                    const v = (selectedLead.vertical || "").trim();
                    const productLabel = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "");

                    const sd = selectedLead.startDate || null;
                    const ed = selectedLead.endDate || null;
                    const dur = selectedLead.stayDuration && !(sd && ed) ? selectedLead.stayDuration : null;
                    const room = !isRedundant(selectedLead.roomType) ? selectedLead.roomType : null;
                    const dorm = !isRedundant(selectedLead.dormType) && norm(selectedLead.dormType) !== norm(selectedLead.roomType) ? selectedLead.dormType : null;
                    const pkg =
                      !isRedundant(selectedLead.packageName) &&
                      norm(selectedLead.packageName) !== norm(selectedLead.roomType) &&
                      norm(selectedLead.packageName) !== norm(selectedLead.dormType)
                        ? selectedLead.packageName
                        : "-";
                    const att = !sameAsNop(selectedLead.attendees) ? selectedLead.attendees : null;
                    const inq = !isRedundant(selectedLead.inquiryType) ? selectedLead.inquiryType : null;
                    const slot = selectedLead.timeSlot || null;
                    const endTime = selectedLead.endTime || null;
                    const seating = selectedLead.seating || null;
                    const meetingLength = selectedLead.duration || null;
                    const bud = selectedLead.budget || null;
                    const loc = selectedLead.location || null;

                    const fields = [
                      productLabel && { label: "Product / Service", value: productLabel },
                      selectedLead.noOfPeople && { label: "No. of People", value: selectedLead.noOfPeople },
                      sd && { label: "Start Date", value: formatDateLabel(sd) },
                      ed && { label: "End Date", value: formatDateLabel(ed) },
                      dur && { label: "Stay Duration", value: dur },
                      room && { label: "Room Type", value: room },
                      dorm && { label: "Bed / Dorm Type", value: dorm },
                      { label: "Package / Plan", value: pkg },
                      att && { label: "Attendees / Team Size", value: att },
                      inq && { label: "Inquiry Type", value: inq },
                      slot && { label: "Preferred Time / Slot", value: endTime ? `${slot} – ${endTime}` : slot },
                      meetingLength && { label: "Duration", value: meetingLength },
                      seating && { label: "Seating", value: seating },
                      bud && { label: "Budget", value: bud },
                      loc && { label: "Location", value: loc },
                    ].filter(Boolean);

                    if (!fields.length) return null;
                    return (
                      <div>
                        <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                          <Target size={14} /> Booking / Enquiry Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                          {fields.map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">{label}</p>
                              <p className="text-[12px] font-pmedium text-slate-900">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {selectedLead.hostPanelStatus === "Accepted" && (
                    <div>
                      <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                        <CheckCircle2 size={14} /> Payment Summary
                      </h3>
                      <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                        {(() => {
                          const currency = selectedLead.paymentCurrency || "USD";
                          const subtotal = Number(selectedLead.paymentSubtotalAmount) || 0;
                          const discountAmount = Number(selectedLead.discountAmount) || 0;
                          const base = Number(selectedLead.paymentBaseAmount) || 0;
                          const fee = Number(selectedLead.paymentPlatformFeeAmount) || 0;
                          const total = Number(selectedLead.paymentTotalAmount) || 0;
                          const isPaid = (selectedLead.paymentStatus || "Pending") === "Paid";
                          return (
                            <>
                              {discountAmount > 0 && (
                                <>
                                  <div className="flex justify-between items-center gap-3 text-[12px] font-pmedium">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="text-slate-900">{formatMoney(subtotal, currency)}</span>
                                  </div>
                                  <div className="flex justify-between items-center gap-3 text-[12px] font-pmedium">
                                    <span className="text-slate-500">Discount</span>
                                    <span className="text-rose-600">-{formatMoney(discountAmount, currency)}</span>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between items-center gap-3 text-[12px] font-pmedium">
                                <span className="text-slate-500">Booking amount</span>
                                <span className="text-slate-900">{formatMoney(base, currency)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-3 text-[12px] font-pmedium">
                                <span className="text-slate-500">Platform fee</span>
                                <span className="text-slate-900">{selectedLead.paymentPlatformFeePercent ?? 7}% — {formatMoney(fee, currency)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-3 text-[12px] font-pmedium">
                                <span className="text-slate-500">Booking status</span>
                                <span className={statusPillClass(selectedLead.paymentStatus || "Pending")}>{isPaid ? "Paid" : "Awaiting Payment"}</span>
                              </div>
                              <div className="flex justify-between items-center gap-3 bg-white border border-slate-100 rounded-xl px-3.5 py-3">
                                <span className="text-[9px] uppercase font-pmedium tracking-widest text-slate-500">Total payable</span>
                                <span className="text-[15px] font-pmedium text-slate-900">{formatMoney(total, currency)}</span>
                              </div>
                              {selectedLead.bookingCode && (
                                <div className="flex justify-between items-center gap-3 bg-emerald-50/60 border border-emerald-100 rounded-xl px-3.5 py-3">
                                  <span className="text-[9px] uppercase font-pmedium tracking-widest text-emerald-600">Booking confirmed</span>
                                  <span className="text-[13px] font-pmedium text-emerald-700">{selectedLead.bookingCode}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedLead.message && (
                    <div>
                      <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                        <FileText size={14} /> Message
                      </h3>
                      <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[12px] font-pmedium leading-5 text-slate-700">{selectedLead.message}</p>
                      </div>
                    </div>
                  )}
                  </>
                )}
                </div>

                {/* Footer — decision actions per reference flow */}
                {manualAmountPrompt ? (
                  <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center gap-2.5">
                    <button type="button" onClick={() => setManualAmountPrompt(null)} disabled={updateLeadMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-pmedium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >Cancel</button>
                    {availabilityInfo?.checked && !availabilityInfo.available ? (
                      <button type="button"
                        onClick={() => notifySlotUnavailableMutation.mutate(manualAmountPrompt.leadId)}
                        disabled={notifySlotUnavailableMutation.isPending}
                        title="Rejects the lead and emails the client to pick another slot."
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-pmedium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                      >{notifySlotUnavailableMutation.isPending ? "Notifying..." : "Notify Client — Slot Unavailable"}</button>
                    ) : (
                      <button type="button" onClick={submitManualAmount}
                        disabled={updateLeadMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-pmedium bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-60"
                      >{updateLeadMutation.isPending ? "Accepting..." : "Accept"}</button>
                    )}
                  </div>
                ) : (
                  (() => {
                    const hostStatus = selectedLead.hostPanelStatus || "Pending";
                    const paymentStatus = selectedLead.paymentStatus || "Pending";
                    const isBusy = updateLeadMutation.isPending || previewPaymentMutation.isPending;
                    const openAccept = () => acceptLead(selectedLead._id);
                    const rejectLead = () => handleStatusChange(selectedLead._id, "Rejected");
                    const baseButton = "flex-1 py-2.5 rounded-xl font-pmedium text-[12px] transition-colors shadow-sm flex items-center justify-center gap-1.5 min-w-[110px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
                    if (hostStatus !== "Pending" && hostStatus !== "Accepted") return null;
                    return (
                      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 shrink-0 flex flex-wrap items-center gap-2.5">
                        {hostStatus === "Pending" && (
                          <>
                            <button type="button" onClick={rejectLead} disabled={isBusy}
                              className={`${baseButton} bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-300 disabled:opacity-60`}
                            ><X size={14} /> Reject</button>
                            <button type="button" onClick={openAccept} disabled={isBusy}
                              className={`${baseButton} bg-[#2563EB] text-white hover:bg-blue-700 focus-visible:ring-[#2563EB]/40 disabled:opacity-60`}
                            ><CheckCircle2 size={14} /> Accept</button>
                          </>
                        )}
                        {hostStatus === "Accepted" && (
                          <>
                            <span className="flex-1 text-right text-[11px] font-pmedium text-slate-500 min-w-[180px]">
                              {selectedLead.bookingCode
                                ? `Booking ${selectedLead.bookingCode}`
                                : paymentStatus !== "Paid"
                                  ? `Awaiting payment — ${formatMoney(selectedLead.paymentTotalAmount, selectedLead.paymentCurrency)} payable`
                                  : "Payment received — ready to finalize"}
                            </span>
                            <button type="button"
                              onClick={() => navigate(
                                selectedLead.bookingCode
                                  ? `/visitors/visitor-management/frontdesk-action?bookingCode=${selectedLead.bookingCode}`
                                  : `/visitors/visitor-management/frontdesk-action?leadId=${selectedLead._id}`
                              )}
                              disabled={isBusy || paymentStatus !== "Paid"}
                              className={selectedLead.bookingCode
                                ? `${baseButton} bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60`
                                : `${baseButton} bg-[#2563EB] text-white hover:bg-blue-700 focus-visible:ring-[#2563EB]/40 disabled:opacity-60`}
                            >{selectedLead.bookingCode ? <><CheckCircle2 size={14} /> Booking Created</> : <><CheckCircle2 size={14} /> Create Booking</>}</button>
                          </>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

        </div>
      </PageFrame>

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={`Export ${pageTitle}`}
        subtitle="Select format and date range to export."
        department="Sales"
        category="Other"
        sourceRef={isNomadsLeads ? "nomads-leads" : "website-leads"}
        reportTitle={`${pageTitle} Report`}
        defaultDataWindow="Custom"
        onExport={handleExportReport}
      />

    </div>
  );
}
