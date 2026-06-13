// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck, Building2, CalendarDays, CheckCircle2,
  ChevronRight, FileDown, FileSpreadsheet, Filter, Mail, Phone,
  Search, ShieldCheck, Sparkles, Target, User, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useFreshCurrentUser } from "../../../hooks/useFreshCurrentUser";
import { createReport } from "../../../services/reports";
import { getSalesTourLeads } from "../../../services/sales-leads";
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
  const currentUser = useFreshCurrentUser();
  const navigate = useNavigate();

  const currentUserName = useMemo(
    () => currentUser?.fullName || currentUser?.name || currentUser?.displayName || "Sales Team",
    [currentUser],
  );

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const result = await getSalesTourLeads({ limit: 100 });
      const nextLeads = Array.isArray(result?.data?.leads) ? result.data.leads : [];
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
      setError(fetchError.message || "Unable to load sales leads right now.");
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

  const handleExportReport = async (format = "PDF") => {
    const reportFormat = String(format).toLowerCase() === "excel" ? "Excel" : "PDF";
    if (!visibleLeads.length) { toast.error("There are no sales leads to export."); return; }
    const departmentLabel = "Sales & CRM";
    const searchLabel = searchQuery.trim() || "All";
    const stageLabel = stageFilter || "All";
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: "Sales Leads Management Report", department: departmentLabel, category: "Other", dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7), period: "Leads Management", generatedBy: currentUserName,
        format: reportFormat,
        description: `Sales leads export for ${departmentLabel}${stageLabel !== "All" ? `, stage ${stageLabel}` : ""}${searchQuery.trim() ? `, filtered by ${searchQuery.trim()}` : ""}.`,
        sourceType: "custom", sourceRef: "sales-leads-management",
        reportRows: buildLeadReportRows(visibleLeads, { stageFilter: stageLabel, searchQuery: searchLabel }, pipelineStats),
        monthlyData: [],
      });
      if (reportFormat === "PDF") await downloadReportFile(response?.data?.download, { openInNewTab: false });
      const createdReportId = response?.data?.report?.recordId;
      toast.success(reportFormat === "PDF" ? "Sales report saved to Reports." : "Sales report saved to Reports. Preview it before downloading.");
      navigate(createdReportId ? `/dashboard/sales-crm/report?reportId=${createdReportId}` : "/dashboard/sales-crm/report");
      window.dispatchEvent(new Event("reports:refresh"));
    } catch (exportError) { toast.error(exportError?.message || "Failed to export sales leads report."); }
    finally { setIsExportingReport(""); }
  };

  if (isLoading) return <TablePageSkeleton rows={6} columns={6} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
            Leads Management
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Sales synced from Visitor Management and Website Builder.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => handleExportReport("PDF")} disabled={isExportingReport || !visibleLeads.length}
            className="px-4 py-2.5 bg-white text-[#e01313] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
          ><FileDown size={13} className="text-red-500" />{isExportingReport === "PDF" ? "Exporting..." : ""}</button>
          <button type="button" onClick={() => handleExportReport("Excel")} disabled={isExportingReport || !visibleLeads.length}
            className="px-4 py-2.5 bg-[#ffffff] text-[#1fd628] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
          ><FileSpreadsheet size={13} />{isExportingReport === "Excel" ? "Exporting..." : ""}</button>
          
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-[2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-medium text-rose-700">{error}</div>
      )}

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-2.5 rounded-[2rem] border border-slate-100 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className={`flex w-8 h-8 items-center justify-center rounded-2xl border ${stat.tone}`}>
                  <Icon size={16} />
                </div>
                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">Live sync</span>
              </div>
              <p className="text-[15px] font-black text-slate-900">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setStageFilter("All")}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition ${stageFilter === "All" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
          >All ({normalizedLeads.length})</button>
          {STAGES.map((stage) => {
            const count = normalizedLeads.filter((l) => l.status === stage).length;
            const active = stageFilter === stage;
            return (
              <button key={stage} type="button" onClick={() => setStageFilter(stage)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition ${active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >{stage} ({count})</button>
            );
          })}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads, companies, visitor codes..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[12px] font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-[13px] font-black text-slate-900">Tour Leads</h2>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sales tours, quote requests, and general website enquiries</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Filter size={13} /> {visibleLeads.length} visible
          </div>
        </div>

        {visibleLeads.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Target size={28} />
            </div>
            <h3 className="text-[15px] font-black text-slate-900">No matching leads found</h3>
            <p className="mt-1.5 max-w-lg text-[12px] font-medium text-slate-500">
              Frontdesk tours and website quote or inquiry forms are synced here as sales-ready leads.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">
                <tr>
                  <th className="px-3.5 py-2">Lead</th>
                  <th className="px-3.5 py-2">Contact</th>
                  <th className="px-3.5 py-2">Source</th>
                  <th className="px-3.5 py-2">Stage</th>
                  <th className="px-3.5 py-2">Added</th>
                  <th className="px-3.5 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLeads.map((lead) => {
                  const stageMeta = STAGE_META[lead.status] || STAGE_META.New;
                  const priorityMeta = PRIORITY_META[lead.priority] || PRIORITY_META.Low;
                  return (
                    <tr key={lead.id} className="transition hover:bg-blue-50/40">
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[10px] font-black text-white shadow-sm">
                            {getInitials(lead.name)}
                          </div>
                          <div>
                            <p className="text-[12px] font-bold text-slate-900">{lead.name}</p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              <Building2 size={10} className="inline-block -translate-y-px" /> {lead.company}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="space-y-0.5 text-[12px] font-semibold text-slate-600">
                          <p className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {lead.phone || "Not shared"}</p>
                          <p className="flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {lead.email || "Not shared"}</p>
                        </div>
                      </td>
                      <td className="px-3.5 py-2">
                        <p className="text-[12px] font-bold text-slate-700">{lead.sourceLabel}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{lead.purpose}</p>
                        <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${priorityMeta.tone}`}>
                          {priorityMeta.label} priority
                        </div>
                      </td>
                      <td className="px-3.5 py-2">
                        <div className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${stageMeta.tone}`}>
                          {stageMeta.label}
                        </div>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Purpose: {lead.purpose}</p>
                      </td>
                      <td className="px-3.5 py-2">
                        <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
                          <CalendarDays size={11} className="text-slate-400" /> {lead.dateAdded}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Last contact: {lead.lastContact}</p>
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => setSelectedLeadId(lead.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                          >View <ChevronRight size={12} /></button>
                          <button type="button" onClick={() => handleUpdateStage(lead.id, "Converted")}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-emerald-700"
                          >Convert</button>
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

      {selectedLead && (
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

      </PageFrame>
    </div>
  );
}
