import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck, Building2, CalendarDays, CheckCircle2,
  ChevronRight, Mail, Phone, RotateCcw, Eye,
  Search, ShieldCheck, Sparkles, Target, User, X,
  Briefcase, DollarSign, Home, Clock, Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useFreshCurrentUser } from "../../../hooks/useFreshCurrentUser";
import { createReport } from "../../../services/reports";
import { getSalesTourLeads, getWebsiteLeads } from "../../../services/sales-leads";
import { getUnitTourLeads } from "../../../services/visitors";
import { downloadReportFile } from "../../../utils/report-download";
import PageFrame from "../../../components/Pages/PageFrame";

const STAGES = ["New", "Contacted", "Qualified", "Converted", "Lost"];

const STAGE_META = {
  New: { tone: "bg-blue-50 text-blue-700 border-blue-100", label: "New" },
  Contacted: { tone: "bg-amber-50 text-amber-700 border-amber-100", label: "Contacted" },
  Qualified: { tone: "bg-indigo-50 text-indigo-700 border-indigo-100", label: "Qualified" },
  Converted: { tone: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Converted" },
  Lost: { tone: "bg-rose-50 text-rose-700 border-rose-100", label: "Lost" },
};

const PRIORITY_META = {
  High: { tone: "bg-rose-50 text-rose-700 border-rose-100", label: "High" },
  Medium: { tone: "bg-amber-50 text-amber-700 border-amber-100", label: "Medium" },
  Low: { tone: "bg-slate-50 text-slate-600 border-slate-200", label: "Low" },
};

function formatDateLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function getInitials(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "SL";
}

function getActivityIcon(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "meeting") return <User size={14} />;
  if (normalized === "note") return <Sparkles size={14} />;
  return <ShieldCheck size={14} />;
}

function buildLeadReportRows(leads = [], filters = {}, stats = {}) {
  const rows = [
    { label: "Total Leads", value: String(stats.total ?? leads.length ?? 0) },
    { label: "Active Pipeline", value: String(stats.active ?? 0) },
    { label: "High Priority", value: String(stats.highPriority ?? 0) },
    { label: "Converted", value: String(stats.converted ?? 0) },
    { label: "Lost", value: String(stats.lost ?? 0) },
    { label: "Stage Filter", value: filters.stageFilter || "All" },
    { label: "Search Filter", value: filters.searchQuery || "All" },
  ];
  leads.slice(0, 100).forEach((lead, index) => {
    rows.push({
      label: `${index + 1}. ${lead.name || "Lead"}`,
      value: [lead.company || "Unknown company", lead.phone || "No phone", lead.email || "No email", lead.status || "New", lead.priority || "Low", lead.lastContact || "No contact"].join(" | "),
    });
  });
  return rows;
}

// Map visitor log from backend to the lead shape used in the UI
function visitorToLead(visitor) {
  const name = visitor.pocName || visitor.name || visitor.fullName || "";
  const phone = visitor.pocPhone || visitor.phone || "";
  const email = visitor.pocEmail || visitor.email || "";
  const company = visitor.company || "";
  const dateAdded = formatDateLabel(visitor.checkInAt || visitor.createdAt);
  const lastContact = formatDateLabel(visitor.followUpDate || visitor.updatedAt || visitor.createdAt);
  
  return {
    id: visitor.id || visitor.recordId || visitor._id || "",
    visitorCode: visitor.visitorCode || "",
    name,
    phone,
    email,
    company,
    industry: visitor.industry || "",
    teamSize: visitor.teamSize || "",
    seatCount: visitor.seatCount || "",
    preferredSpace: visitor.preferredSpace || "",
    budgetRange: visitor.budgetRange || "",
    moveInTimeline: visitor.moveInTimeline || "",
    pocName: visitor.pocName || "",
    pocDesignation: visitor.pocDesignation || "",
    pocPhone: visitor.pocPhone || "",
    pocEmail: visitor.pocEmail || "",
    preferredContactMethod: visitor.preferredContactMethod || "",
    followUpDate: visitor.followUpDate || "",
    requirements: visitor.tourNotes || visitor.notes || "",
    purpose: visitor.purpose || "Workspace Tour",
    source: "visitor-management",
    sourceLabel: "Visitor Management",
    status: "New",
    priority: visitor.budgetRange?.includes("5L+") || visitor.budgetRange?.includes("3L") ? "High" : visitor.budgetRange ? "Medium" : "Low",
    dateAdded,
    lastContact,
    checkInAt: visitor.checkInAt || null,
    checkOutAt: visitor.checkOutAt || null,
    qualification: {
      pocName: visitor.pocName || "",
      pocDesignation: visitor.pocDesignation || "",
      pocPhone: visitor.pocPhone || "",
      pocEmail: visitor.pocEmail || "",
      preferredContactMethod: visitor.preferredContactMethod || "",
      followUpDate: visitor.followUpDate ? formatDateLabel(visitor.followUpDate) : "",
    },
    activities: [
      {
        type: "Check-in",
        date: formatDateLabel(visitor.checkInAt || visitor.createdAt),
        note: `Visitor checked in at frontdesk for a workspace tour. ${visitor.tourNotes ? `Notes: ${visitor.tourNotes}` : ""}`.trim(),
      },
    ],
  };
}

function TablePageSkeleton({ rows = 6, columns = 6 }) {
  return (
    <div className="p-2 lg:p-2.5 animate-pulse">
      <div className="h-6 w-48 bg-slate-100 rounded-xl mb-4" />
      <div className="h-4 w-72 bg-slate-100 rounded-xl mb-6" />
      <div className="rounded-[2rem] border border-slate-100 bg-white overflow-hidden">
        <div className="px-3.5 py-3 border-b border-slate-100">
          <div className="h-3 w-full bg-slate-100 rounded-lg" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-3.5 py-3 border-b border-slate-50">
            {Array.from({ length: columns }).map((_, j) => (
              <div key={j} className="h-3 flex-1 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeadsManagementPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [leads, setLeads] = useState([]);
  const [leadStages, setLeadStages] = useState({});
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isExportingReport, setIsExportingReport] = useState("");
  const [mainTab, setMainTab] = useState("website-leads");
  const [websiteLeads, setWebsiteLeads] = useState([]);
  const [websiteLeadStages, setWebsiteLeadStages] = useState({});
  const [selectedWebsiteLeadId, setSelectedWebsiteLeadId] = useState(null);
  const [isWebsiteLoading, setIsWebsiteLoading] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const currentUser = useFreshCurrentUser();
  const navigate = useNavigate();

  const currentUserName = useMemo(
    () => currentUser?.fullName || currentUser?.name || currentUser?.displayName || "Sales Team",
    [currentUser],
  );

  const workspaceId = useMemo(
    () => currentUser?.primaryWorkspace || currentUser?.workspaceMembership?.workspace || currentUser?.workspaceId || "",
    [currentUser],
  );

  const companyId = useMemo(
    () => currentUser?.companyId || "",
    [currentUser],
  );

  const loadWebsiteLeads = async () => {
    setIsWebsiteLoading(true);
    setWebsiteError("");
    try {
      const params = { workspaceId, companyId };
      const result = await getWebsiteLeads(params);
      const nextLeads = Array.isArray(result?.data) ? result.data : [];
      setWebsiteLeads(nextLeads);
      setWebsiteLeadStages((current) => {
        const nextStages = { ...current };
        nextLeads.forEach((lead) => {
          if (!nextStages[lead._id]) nextStages[lead._id] = lead.status || "Pending";
        });
        return nextStages;
      });
    } catch (fetchError) {
      setWebsiteError(fetchError.message || "Unable to load website leads right now.");
    } finally {
      setIsWebsiteLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === "website-leads" && websiteLeads.length === 0) {
      loadWebsiteLeads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const result = await getUnitTourLeads({ limit: 100 });
      // The visitor overview returns visitors array; filter for Workspace Tour purpose
      const allVisitors = Array.isArray(result?.visitors) ? result.visitors : [];
      const tourVisitors = allVisitors.filter((v) => {
        const purpose = String(v.purpose || "").toLowerCase();
        return purpose.includes("tour") || purpose.includes("workspace") || purpose.includes("enquiry");
      });
      const nextLeads = tourVisitors.map(visitorToLead);
      setLeads(nextLeads);
      setLeadStages((current) => {
        const nextStages = { ...current };
        nextLeads.forEach((lead) => {
          if (!nextStages[lead.id]) nextStages[lead.id] = lead.status || "New";
        });
        return nextStages;
      });
      setError("");
    } catch (fetchError) {
      // Fallback: try the old sales-leads endpoint
      try {
        const fallback = await getSalesTourLeads({ limit: 100 });
        const nextLeads = Array.isArray(fallback?.data?.leads) ? fallback.data.leads : [];
        setLeads(nextLeads);
        setLeadStages((current) => {
          const nextStages = { ...current };
          nextLeads.forEach((lead) => {
            if (!nextStages[lead.id]) nextStages[lead.id] = lead.status || "New";
          });
          return nextStages;
        });
        setError("");
      } catch {
        setError(fetchError.message || "Unable to load unit tour leads right now.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadLeads(); }, []);

  const normalizedLeads = useMemo(
    () => leads.map((lead) => ({ ...lead, status: leadStages[lead.id] || lead.status || "New" })),
    [leads, leadStages],
  );

  const visibleLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return normalizedLeads.filter((lead) => {
      const matchesStage = stageFilter === "All" || lead.status === stageFilter;
      const matchesQuery = !query || [lead.name, lead.company, lead.visitorCode, lead.requirements, lead.source, lead.phone, lead.email, ...Object.values(lead.qualification || {})]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
      return matchesStage && matchesQuery;
    });
  }, [normalizedLeads, searchQuery, stageFilter]);

  const pipelineStats = useMemo(() => {
    const total = visibleLeads.length;
    const converted = visibleLeads.filter((l) => l.status === "Converted").length;
    const active = visibleLeads.filter((l) => ["New", "Contacted", "Qualified"].includes(l.status)).length;
    const highPriority = visibleLeads.filter((l) => l.priority === "High").length;
    const lost = visibleLeads.filter((l) => l.status === "Lost").length;
    return { total, converted, active, highPriority, lost };
  }, [visibleLeads]);

  const stats = useMemo(() => {
    const total = normalizedLeads.length;
    const converted = normalizedLeads.filter((l) => l.status === "Converted").length;
    const active = normalizedLeads.filter((l) => ["New", "Contacted", "Qualified"].includes(l.status)).length;
    const hot = normalizedLeads.filter((l) => l.priority === "High").length;
    return [
      { label: "Total Leads", value: total, tone: "bg-blue-50 text-blue-700 border-blue-100", icon: Target },
      { label: "Active Pipeline", value: active, tone: "bg-amber-50 text-amber-700 border-amber-100", icon: BadgeCheck },
      { label: "High Priority", value: hot, tone: "bg-rose-50 text-rose-700 border-rose-100", icon: Sparkles },
      { label: "Converted", value: converted, tone: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
    ];
  }, [normalizedLeads]);

  const normalizedWebsiteLeads = useMemo(
    () => websiteLeads.map((lead) => ({ ...lead, status: websiteLeadStages[lead._id] || lead.status || "Pending" })),
    [websiteLeads, websiteLeadStages],
  );

  const websiteLeadStats = useMemo(() => {
    const total = normalizedWebsiteLeads.length;
    const pending = normalizedWebsiteLeads.filter((l) => l.status === "Pending").length;
    const contacted = normalizedWebsiteLeads.filter((l) => l.status === "Contacted").length;
    const closed = normalizedWebsiteLeads.filter((l) => l.status === "Closed").length;
    return [
      { label: "Total Website Leads", value: total, icon: Target },
      { label: "Pending", value: pending, icon: Sparkles },
      { label: "Contacted", value: contacted, icon: BadgeCheck },
      { label: "Closed", value: closed, icon: CheckCircle2 },
    ];
  }, [normalizedWebsiteLeads]);

  const WEBSITE_STATUSES = ["Pending", "Contacted", "Closed", "Rejected"];

  const visibleWebsiteLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return normalizedWebsiteLeads.filter((lead) => {
      const matchesStage = stageFilter === "All" || lead.status === stageFilter;
      const matchesQuery = !query || [lead.fullName, lead.mobileNumber, lead.email, lead.source, lead.vertical, lead.productType, lead.companyName]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
      return matchesStage && matchesQuery;
    });
  }, [normalizedWebsiteLeads, searchQuery, stageFilter]);

  const selectedLead = useMemo(
    () => normalizedLeads.find((l) => l.id === selectedLeadId) || null,
    [normalizedLeads, selectedLeadId],
  );

  const qualificationEntries = useMemo(
    () => Object.entries(selectedLead?.qualification || {}).filter(([, v]) => Boolean(String(v || "").trim())).map(([label, value]) => ({
      label: { pocName: "POC Name", pocDesignation: "POC Designation", pocPhone: "POC Phone", pocEmail: "POC Email", preferredContactMethod: "Preferred Contact", followUpDate: "Follow-up Date" }[label] || label.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
      value,
    })),
    [selectedLead],
  );

  const handleUpdateStage = (leadId, nextStage) => {
    setLeadStages((current) => ({ ...current, [leadId]: nextStage }));
  };

  const handleUpdateWebsiteLeadStatus = (leadId, nextStatus) => {
    setWebsiteLeadStages((current) => ({ ...current, [leadId]: nextStatus }));
  };

  const selectedWebsiteLead = useMemo(
    () => websiteLeads.find((l) => l._id === selectedWebsiteLeadId) || null,
    [websiteLeads, selectedWebsiteLeadId],
  );

  const handleExportReport = async (format = "PDF") => {
    const reportFormat = String(format).toLowerCase() === "excel" ? "Excel" : "PDF";
    const isWebsite = mainTab === "website-leads";
    const exportData = isWebsite ? visibleWebsiteLeads : visibleLeads;
    if (!exportData.length) { toast.error("There are no leads to export."); return; }
    const departmentLabel = "Sales";
    const searchLabel = searchQuery.trim() || "All";
    const stageLabel = stageFilter || "All";
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: isWebsite ? "Website Leads Report" : "Sales Leads Management Report", department: departmentLabel, category: "Other", dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7), period: "Leads Management", generatedBy: currentUserName,
        format: reportFormat,
        description: `${isWebsite ? "Website leads" : "Sales leads"} export for ${departmentLabel}${stageLabel !== "All" ? `, stage ${stageLabel}` : ""}${searchQuery.trim() ? `, filtered by ${searchQuery.trim()}` : ""}.`,
        sourceType: "custom", sourceRef: isWebsite ? "website-leads" : "sales-leads-management",
        reportRows: buildLeadReportRows(exportData, { stageFilter: stageLabel, searchQuery: searchLabel }, pipelineStats),
        monthlyData: [],
      });
      if (reportFormat === "PDF") await downloadReportFile(response?.data?.download, { openInNewTab: false });
      const createdReportId = response?.data?.report?.recordId;
      toast.success(reportFormat === "PDF" ? "Report saved to Reports." : "Report saved to Reports. Preview it before downloading.");
      navigate(createdReportId ? `/dashboard/sales-crm/report?reportId=${createdReportId}` : "/dashboard/sales-crm/report");
      window.dispatchEvent(new Event("reports:refresh"));
    } catch (exportError) { toast.error(exportError?.message || "Failed to export leads report."); }
    finally { setIsExportingReport(""); }
  };

  if (isLoading || (mainTab === "website-leads" && isWebsiteLoading)) return <TablePageSkeleton rows={6} columns={6} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4 text-slate-700 font-sans">

        {/* 1. HEADER */}
        <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
              Leads Management
            </h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">
              Sales synced from Visitor Management and Website Builder.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* <button
              type="button"
              onClick={mainTab === "website-leads" ? loadWebsiteLeads : loadLeads}
              disabled={mainTab === "website-leads" ? isWebsiteLoading : isLoading}
              title="Refresh"
              className="px-4 py-2.5 bg-white text-[#0F172A] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={14} /> Refresh
            </button> */}
          </div>
        </div>

        {/* {(error || (mainTab === "website-leads" && websiteError)) && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-600">{mainTab === "website-leads" ? websiteError : error}</div>
        )} */}

        

        {/* 2. MAIN TABS (Website Leads | Unit Tour List) */}
        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {[
            { key: "website-leads", label: "Website Leads" },
            { key: "unit-tour", label: "Unit Tour Leads" },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => { setMainTab(tab.key); setStageFilter("All"); setSearchQuery(""); }}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${mainTab === tab.key ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >{tab.label}</button>
          ))}
        </div>

        {/* 3. STAT CARDS (DESIGN.md 4-col grid with border-left accents) */}
        {mainTab === "unit-tour" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Leads</p>
              <p className="text-[15px] font-black text-slate-900">{stats[0]?.value ?? 0}</p>
            </div>
            <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Target size={16}/></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Active Pipeline</p>
              <p className="text-[15px] font-black text-slate-900">{stats[1]?.value ?? 0}</p>
            </div>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><BadgeCheck size={16}/></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">High Priority</p>
              <p className="text-[15px] font-black text-slate-900">{stats[2]?.value ?? 0}</p>
            </div>
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Sparkles size={16}/></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Converted</p>
              <p className="text-[15px] font-black text-slate-900">{stats[3]?.value ?? 0}</p>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16}/></div>
          </div>
        </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Website Leads</p>
              <p className="text-[15px] font-black text-slate-900">{websiteLeadStats[0]?.value ?? 0}</p>
            </div>
            <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Target size={16}/></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending</p>
              <p className="text-[15px] font-black text-slate-900">{websiteLeadStats[1]?.value ?? 0}</p>
            </div>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Sparkles size={16}/></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Contacted</p>
              <p className="text-[15px] font-black text-slate-900">{websiteLeadStats[2]?.value ?? 0}</p>
            </div>
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><BadgeCheck size={16}/></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Closed</p>
              <p className="text-[15px] font-black text-slate-900">{websiteLeadStats[3]?.value ?? 0}</p>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16}/></div>
          </div>
        </div>
        )}

        

        {/* 4. TABLES (Website Leads | Unit Tour List) */}
        {mainTab === "unit-tour" ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
          {/* STATUS SUB-TABS */}
          <div className="flex bg-slate-100/50 p-1 rounded-xl w-full relative border border-slate-200/50 overflow-x-auto mb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button onClick={() => setStageFilter("All")}
                className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${stageFilter === "All" ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
              >All ({normalizedLeads.length})</button>
              {STAGES.map((status) => {
                const count = normalizedLeads.filter((l) => l.status === status).length;
                return (
                  <button key={status} onClick={() => setStageFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${stageFilter === status ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                  >{status} ({count})</button>
                );
              })}
            </div>
          </div>
            <div />
            <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input type="text" placeholder="Search leads, companies, visitor codes..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" />
              </div>
            </div>
          </div>
          {visibleLeads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Target size={28} /></div>
              <p className="text-slate-400 font-semibold">No matching leads found.</p>
            </div>
          ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[860px]">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-5 py-4">Lead Details</th>
                  <th className="px-5 py-4">Contact Info</th>
                  <th className="px-5 py-4">Requirements</th>
                  <th className="px-5 py-4">Stage</th>
                  <th className="px-5 py-4">Timeline</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {visibleLeads.map((lead) => {
                  const stageMeta = STAGE_META[lead.status] || STAGE_META.New;
                  const priorityMeta = PRIORITY_META[lead.priority] || PRIORITY_META.Low;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white shadow-sm">{getInitials(lead.name)}</div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-slate-900 truncate">{lead.name}</p>
                            <p className="mt-0.5 text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                              <Building2 size={10} className="text-slate-400" /> {lead.company || "Individual"} {lead.industry && `• ${lead.industry}`}
                            </p>
                            {lead.visitorCode && <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1"><BadgeCheck size={9} /> {lead.visitorCode}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-[11px] font-semibold text-slate-600">
                          <p className="flex items-center gap-1.5 truncate"><Phone size={11} className="text-slate-400" /> {lead.phone || "Not shared"}</p>
                          <p className="flex items-center gap-1.5 truncate"><Mail size={11} className="text-slate-400" /> {lead.email || "Not shared"}</p>
                          {lead.qualification?.preferredContactMethod && <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Prefers: {lead.qualification.preferredContactMethod}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                           <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><Home size={11} className="text-slate-400" /> {lead.preferredSpace || lead.purpose || "Unit Tour"} {lead.seatCount && `(${lead.seatCount} seats)`}</p>
                           {lead.budgetRange && <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1"><DollarSign size={11} className="text-emerald-500" /> {lead.budgetRange}</p>}
                           <div className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${priorityMeta.tone}`}>{priorityMeta.label} priority</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${stageMeta.tone}`}>{stageMeta.label}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700"><CalendarDays size={11} className="text-blue-500" /> {lead.dateAdded}</p>
                          {lead.moveInTimeline && <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"><Clock size={11} className="text-amber-500" /> {lead.moveInTimeline}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => setSelectedLeadId(lead.id)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"><Eye size={15} strokeWidth={2.5} /></button>
                          <button type="button" onClick={() => handleUpdateStage(lead.id, "Converted")}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg transition-all"><CheckCircle2 size={15} strokeWidth={2.5} /></button>
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
        ) : (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
          {/* STATUS SUB-TABS (stage filter pills, above main tabs) */}
        <div className="flex bg-slate-100/50 p-1 rounded-xl w-full relative border border-slate-200/50 overflow-x-auto mb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button onClick={() => setStageFilter("All")}
              className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${stageFilter === "All" ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
            >All ({mainTab === "website-leads" ? websiteLeads.length : normalizedLeads.length})</button>
            {(mainTab === "website-leads" ? WEBSITE_STATUSES : STAGES).map((status) => {
              const count = mainTab === "website-leads"
                ? websiteLeads.filter((l) => l.status === status).length
                : normalizedLeads.filter((l) => l.status === status).length;
              return (
                <button key={status} onClick={() => setStageFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${stageFilter === status ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                >{status} ({count})</button>
              );
            })}
          </div>
        </div>
            <div />
            <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input type="text" placeholder="Search by name, email, phone..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" />
              </div>
            </div>
          </div>
          {visibleWebsiteLeads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Target size={28} /></div>
              <p className="text-slate-400 font-semibold">No matching website leads found.</p>
            </div>
          ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-5 py-4">Lead Names</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Source</th>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Received Date</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {visibleWebsiteLeads.map((lead) => {
                  const websiteStageStyle = {
                    Pending: "bg-amber-50 text-amber-700 border-amber-100",
                    Contacted: "bg-blue-50 text-blue-700 border-blue-100",
                    Closed: "bg-emerald-50 text-emerald-700 border-emerald-100",
                    Rejected: "bg-rose-50 text-rose-700 border-rose-100",
                  }[lead.status] || "bg-slate-50 text-slate-600 border-slate-200";
                  return (
                    <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[10px] font-black text-white shadow-sm">{getInitials(lead.fullName)}</div>
                          <div>
                            <p className="text-[12px] font-bold text-slate-900">{lead.fullName}</p>
                            
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5 text-[12px] font-semibold text-slate-600">
                          <p className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {lead.mobileNumber || "Not shared"}</p>
                          <p className="flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {lead.email || "Not shared"}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-[12px] font-bold text-slate-700">{lead.source || "Website"}</span></td>
                      <td className="px-5 py-4">
                        {(() => {
                          const pt = (lead.productType || "").trim();
                          const v  = (lead.vertical || "").trim();
                          const product = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "co-working");
                          return <p className="text-[12px] font-bold text-slate-700">{product}</p>;
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateWebsiteLeadStatus(lead._id, e.target.value)}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest cursor-pointer outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${websiteStageStyle}`}
                        >
                          {WEBSITE_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[12px] font-bold text-slate-700">{formatDateLabel(lead.recievedDate || lead.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => setSelectedWebsiteLeadId(lead._id)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"><Eye size={15} strokeWidth={2.5} /></button>
                          {/* <button type="button" onClick={() => handleUpdateWebsiteLeadStatus(lead._id, "Closed")}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg transition-all"><CheckCircle2 size={15} strokeWidth={2.5} /></button> */}
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
        )}

      {mainTab === "unit-tour" && selectedLead && (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F172A]/60 backdrop-blur-md p-3 sm:p-4">
          
          <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={() => setSelectedLeadId(null)} />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-[2.5rem] border border-white/80 bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-sm">
                  {getInitials(selectedLead.name)}
                </div>
                <div>
                  <h3 className="text-[15px] font-black leading-tight text-slate-900">{selectedLead.name}</h3>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {selectedLead.company} {selectedLead.visitorCode || selectedLead.id}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STAGE_META[selectedLead.status]?.tone || STAGE_META.New.tone}`}>{selectedLead.status}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${PRIORITY_META[selectedLead.priority]?.tone || PRIORITY_META.Low.tone}`}>{selectedLead.priority} Priority</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Source: {selectedLead.sourceLabel || "Visitor Management"}</span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedLeadId(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-rose-600"
              ><X size={16} /></button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto xl:grid-cols-[1.06fr_0.94fr]">
              <div className="min-h-0 space-y-3 border-b border-slate-100 p-4 sm:p-5 xl:border-b-0 xl:border-r xl:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                    <p className="mt-1 text-[12px] font-bold text-slate-900">{selectedLead.phone || "Not shared"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                    <p className="mt-1 break-all text-[12px] font-bold text-slate-900">{selectedLead.email || "Not shared"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visit Type</p>
                    <p className="mt-1 text-[12px] font-bold text-slate-900">{selectedLead.purpose || "Unit Tour"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</p>
                    <p className="mt-1 text-[12px] font-bold text-slate-900">{selectedLead.department || "Administration"}</p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Requirements</p>
                  <p className="mt-1.5 text-[12px] font-medium leading-5 text-slate-700">{selectedLead.requirements}</p>
                </div>

                {qualificationEntries.length > 0 && (
                  <div className="rounded-[2rem] border border-slate-100 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Qualification Snapshot</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {qualificationEntries.map((item) => (
                        <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                          <p className="mt-0.5 text-[12px] font-bold text-slate-900">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Actions</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STAGES.map((stage) => (
                      <button key={stage} type="button" onClick={() => handleUpdateStage(selectedLead.id, stage)}
                        className={`rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition ${selectedLead.status === stage ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                      >{stage}</button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { handleUpdateStage(selectedLead.id, "Converted"); }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-emerald-700"
                    ><CheckCircle2 size={13} /> Convert Lead</button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 bg-slate-50 p-4 sm:p-5 xl:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[15px] font-black text-slate-900">Activity Timeline</h4>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Lead journey from frontdesk to sales follow-up</p>
                  </div>
                  <div className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">{selectedLead.source}</div>
                </div>

                <div className="mt-4 space-y-3">
                  {(selectedLead.activities || []).map((activity, index) => (
                    <div key={`${activity.type}-${index}`} className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-sm">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 rounded-xl border border-slate-100 bg-white p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{activity.type}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{activity.date}</p>
                        </div>
                        <p className="mt-1 text-[12px] font-medium leading-5 text-slate-700">{activity.note}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[2rem] border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Sales note</p>
                  <p className="mt-1.5 text-[12px] font-medium leading-5 text-blue-900">
                    This lead is coming straight from the visitor desk, so Sales can continue the conversation without re-entering the contact details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mainTab === "website-leads" && selectedWebsiteLead && (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F172A]/60 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={() => setSelectedWebsiteLeadId(null)} />
          <div className="relative z-10 flex flex-col w-full max-w-[620px] max-h-[88vh] overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 shrink-0">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow-sm">
                  {getInitials(selectedWebsiteLead.fullName)}
                </div>
                <div>
                  <h3 className="text-[13px] font-black leading-tight text-slate-900">{selectedWebsiteLead.fullName}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${{ Pending: "bg-amber-50 text-amber-700 border-amber-100", Contacted: "bg-blue-50 text-blue-700 border-blue-100", Closed: "bg-emerald-50 text-emerald-700 border-emerald-100", Rejected: "bg-rose-50 text-rose-700 border-rose-100" }[selectedWebsiteLead.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{selectedWebsiteLead.status}</span>
                    {(() => {
                      // Show productType as primary category; fall back to vertical only if productType is absent or same as "co-working" default
                      const pt = (selectedWebsiteLead.productType || "").trim();
                      const v  = (selectedWebsiteLead.vertical   || "").trim();
                      const label = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "");
                      return label ? (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedWebsiteLeadId(null)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-rose-600"
              ><X size={14} /></button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">

              {/* Core contact fields — always shown */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                  <p className="mt-0.5 text-[12px] font-bold text-slate-900">{selectedWebsiteLead.mobileNumber || "Not shared"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                  <p className="mt-0.5 break-all text-[12px] font-bold text-slate-900">{selectedWebsiteLead.email || "Not shared"}</p>
                </div>
                {(() => {
                  const pt = (selectedWebsiteLead.productType || "").trim();
                  const v  = (selectedWebsiteLead.vertical   || "").trim();
                  const product = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "");
                  return product ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Product / Service</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{product}</p>
                    </div>
                  ) : null;
                })()}
                {selectedWebsiteLead.noOfPeople && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">No. of People</p>
                    <p className="mt-0.5 text-[12px] font-bold text-slate-900">{selectedWebsiteLead.noOfPeople}</p>
                  </div>
                )}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Received On</p>
                  <p className="mt-0.5 text-[12px] font-bold text-slate-900">{formatDateLabel(selectedWebsiteLead.recievedDate || selectedWebsiteLead.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Received Via</p>
                  <p className="mt-0.5 text-[12px] font-bold text-slate-900">
                    {(() => {
                      const s = (selectedWebsiteLead.source || "").toLowerCase();
                      if (s.includes("preview")) return "Website Preview";
                      if (s.includes("hosted") || s.includes("live") || s.includes("wono")) return "Hosted Website";
                      if (s.includes("direct")) return "Direct";
                      return selectedWebsiteLead.source || "Website";
                    })()}
                  </p>
                </div>
              </div>

              {/* Booking / Enquiry fields — smart dedup */}
              {(() => {
                const norm = (v) => String(v || "").toLowerCase().trim();
                const vertical  = norm(selectedWebsiteLead.vertical);
                const product   = norm(selectedWebsiteLead.productType);
                const nop       = norm(selectedWebsiteLead.noOfPeople);

                // A field is a duplicate if its normalised value matches vertical, productType, or noOfPeople
                const isRedundant = (val) => {
                  const s = norm(val);
                  return !s || s === vertical || s === product || (vertical && product && s === `${vertical} · ${product}`);
                };
                const sameAsNop = (val) => { const s = norm(val); return !s || s === nop; };

                const sd   = selectedWebsiteLead.startDate   || null;
                const ed   = selectedWebsiteLead.endDate     || null;
                // Stay Duration is only useful when dates aren't already shown
                const dur  = selectedWebsiteLead.stayDuration && !(sd && ed) ? selectedWebsiteLead.stayDuration : null;
                const room = !isRedundant(selectedWebsiteLead.roomType)    ? selectedWebsiteLead.roomType    : null;
                // dormType redundant if same value as roomType OR same as vertical
                const dorm = !isRedundant(selectedWebsiteLead.dormType) && norm(selectedWebsiteLead.dormType) !== norm(selectedWebsiteLead.roomType) ? selectedWebsiteLead.dormType : null;
                const pkg  = !isRedundant(selectedWebsiteLead.packageName) ? selectedWebsiteLead.packageName : null;
                // Attendees redundant if same number as noOfPeople
                const att  = !sameAsNop(selectedWebsiteLead.attendees)    ? selectedWebsiteLead.attendees   : null;
                const inq  = !isRedundant(selectedWebsiteLead.inquiryType) ? selectedWebsiteLead.inquiryType : null;
                const slot = selectedWebsiteLead.timeSlot  || null;
                const bud  = selectedWebsiteLead.budget    || null;
                const loc  = selectedWebsiteLead.location  || null;

                const fields = [
                  sd   && { label: "Start Date",             value: formatDateLabel(sd) },
                  ed   && { label: "End Date",               value: formatDateLabel(ed) },
                  dur  && { label: "Stay Duration",          value: dur },
                  room && { label: "Room Type",              value: room },
                  dorm && { label: "Bed / Dorm Type",        value: dorm },
                  pkg  && { label: "Package / Plan",         value: pkg },
                  att  && { label: "Attendees / Team Size",  value: att },
                  inq  && { label: "Inquiry Type",           value: inq },
                  slot && { label: "Preferred Time / Slot",  value: slot },
                  bud  && { label: "Budget",                 value: bud },
                  loc  && { label: "Location",               value: loc },
                ].filter(Boolean);

                if (!fields.length) return null;
                return (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 px-0.5">Booking / Enquiry Details</p>
                    <div className="grid grid-cols-2 gap-2">
                      {fields.map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                          <p className="mt-0.5 text-[12px] font-bold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Message */}
              {selectedWebsiteLead.message && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Message</p>
                  <p className="text-[12px] font-medium leading-5 text-slate-700">{selectedWebsiteLead.message}</p>
                </div>
              )}

            </div>

            {/* Sticky Footer — action buttons only */}
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-end gap-2 shrink-0">
              <button type="button" onClick={() => { handleUpdateWebsiteLeadStatus(selectedWebsiteLead._id, "Closed"); setSelectedWebsiteLeadId(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-emerald-700"
              ><CheckCircle2 size={12} /> Close Lead</button>
              <button type="button" onClick={() => { handleUpdateWebsiteLeadStatus(selectedWebsiteLead._id, "Rejected"); setSelectedWebsiteLeadId(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-rose-700"
              ><X size={12} /> Reject Lead</button>
            </div>

          </div>
        </div>
      )}

        </div>
      </PageFrame>
    </div>
  );
}
