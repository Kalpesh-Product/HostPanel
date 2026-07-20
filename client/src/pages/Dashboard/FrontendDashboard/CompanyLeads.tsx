// @ts-nocheck
import { useMemo, useState } from "react";
import {
  BadgeCheck, CheckCircle2, Eye, FileDown, FileSpreadsheet, FileText, Mail, Phone, Search, Sparkles, Target, Users, X, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";
import PageFrame from "../../../components/Pages/PageFrame";
import { statusPillClass } from '../../../lib/status-pill';
import { createReport } from "../../../services/reports";
import { downloadReportFile } from "../../../utils/report-download";
import { WebsiteLeadsSkeleton } from "../../../components/ui/Skeleton";

const WEBSITE_STATUSES = ["Pending", "Contacted", "Closed", "Rejected"];

function formatDateLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function getInitials(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "LD";
}

export default function CompanyLeads({ leadScope = "website" }) {
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isExportingReport, setIsExportingReport] = useState("");

  const workspaceId = selectedCompany?.workspaceId || auth?.user?.primaryWorkspace || auth?.user?.workspaceMembership?.workspace || auth?.user?.workspaceId || "";
  const companyId = selectedCompany?.companyId || auth?.user?.companyId || "";
  const isNomadsLeads = String(leadScope).toLowerCase() === "nomads";
  const pageTitle = isNomadsLeads ? "Nomads Leads" : "Website Leads";
  const pageDescription = isNomadsLeads
    ? "Enquiries received from your Wono Nomads listings."
    : "Website enquiries received from your published site.";
  const leadLabel = isNomadsLeads ? "Nomads lead" : "Website lead";

  const { data: leads = [], isPending, isError } = useQuery({
    queryKey: ["leadCompany", leadScope, companyId, workspaceId],
    enabled: !!(companyId || workspaceId),
    queryFn: async () => {
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

  const updateLeadMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosPrivate.patch("/api/leads/update-lead", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Lead updated");
      queryClient.invalidateQueries({ queryKey: ["leadCompany"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Update failed");
    },
  });

  const handleStatusChange = (leadId, newStatus) => {
    updateLeadMutation.mutate({ leadId, status: newStatus });
  };

  const leadStats = useMemo(() => {
    const total = leads.length;
    const pending = leads.filter((l) => (l.status || "Pending") === "Pending").length;
    const contacted = leads.filter((l) => l.status === "Contacted").length;
    const closed = leads.filter((l) => l.status === "Closed").length;
    return [
      { label: `Total ${pageTitle}`, value: total, icon: Target },
      { label: "Pending", value: pending, icon: Sparkles },
      { label: "Contacted", value: contacted, icon: BadgeCheck },
      { label: "Closed", value: closed, icon: CheckCircle2 },
    ];
  }, [leads, pageTitle]);

  const visibleLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesStage = stageFilter === "All" || (lead.status || "Pending") === stageFilter;
      const matchesQuery = !query || [lead.fullName, lead.mobileNumber, lead.email, lead.source, lead.vertical, lead.productType, lead.companyName]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
      return matchesStage && matchesQuery;
    });
  }, [leads, searchQuery, stageFilter]);

  const selectedLead = useMemo(
    () => leads.find((l) => l._id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  const handleExportReport = async (format = "PDF") => {
    const reportFormat = String(format).toLowerCase() === "excel" ? "Excel" : "PDF";
    if (!visibleLeads.length) { toast.error(`There are no ${pageTitle.toLowerCase()} to export.`); return; }
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: `${pageTitle} Report`, department: "Sales", category: "Other", dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7), period: pageTitle,
        generatedBy: auth?.user?.fullName || auth?.user?.name || (isNomadsLeads ? "Nomads Team" : "Website Team"), format: reportFormat,
        description: pageDescription, sourceType: "custom", sourceRef: isNomadsLeads ? "nomads-leads" : "website-leads",
        reportRows: visibleLeads.slice(0, 100).map((lead, index) => ({
          label: `${index + 1}. ${lead.fullName || leadLabel}`,
          value: [lead.mobileNumber || "No phone", lead.email || "No email", lead.source || (isNomadsLeads ? "Nomad" : "Website"), lead.productType || lead.vertical || "No product", lead.status || "Pending", formatDateLabel(lead.recievedDate || lead.receivedDate || lead.createdAt)].join(" | "),
        })),
        monthlyData: [],
      });
      if (reportFormat === "PDF") await downloadReportFile(response?.data?.download, { openInNewTab: false });
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
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                {pageTitle}
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {pageDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
              <button type="button" onClick={() => handleExportReport("PDF")} disabled={Boolean(isExportingReport)} title="Export PDF" aria-label={`Export ${pageTitle.toLowerCase()} as PDF`}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-50">
                <FileDown size={16} className="text-red-500" aria-hidden="true" />
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
              </button>
              <button type="button" onClick={() => handleExportReport("Excel")} disabled={Boolean(isExportingReport)} title="Export Excel" aria-label={`Export ${pageTitle.toLowerCase()} as Excel`}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50">
                <FileSpreadsheet size={16} className="text-emerald-500" aria-hidden="true" />
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
              </button>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-1 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Total {pageTitle}</p>
                <p className="text-[15px] font-pmedium text-slate-900">{leadStats[0]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Target size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Pending</p>
                <p className="text-[15px] font-pmedium text-slate-900">{leadStats[1]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Sparkles size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Contacted</p>
                <p className="text-[15px] font-pmedium text-slate-900">{leadStats[2]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><BadgeCheck size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Closed</p>
                <p className="text-[15px] font-pmedium text-slate-900">{leadStats[3]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              {/* STATUS FILTER PILLS */}
              <div className="w-full overflow-x-auto mb-3 [&::-webkit-scrollbar]:hidden">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button onClick={() => setStageFilter("All")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${stageFilter === "All" ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                  >All</button>
                  {WEBSITE_STATUSES.map((status) => {
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
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type="text" placeholder="Search by name, email, phone..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" />
                </div>
              </div>
            </div>

            {visibleLeads.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Target size={28} /></div>
                <p className="text-slate-400 font-semibold">No matching {pageTitle.toLowerCase()} found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
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
                    {visibleLeads.map((lead) => {
                      const websiteStageStyle = {
                        Pending: "bg-amber-50 text-amber-700 border-amber-100",
                        Contacted: "bg-blue-50 text-blue-700 border-blue-100",
                        Closed: "bg-emerald-50 text-emerald-700 border-emerald-100",
                        Rejected: "bg-rose-50 text-rose-700 border-rose-100",
                      }[lead.status || "Pending"] || "bg-slate-50 text-slate-600 border-slate-200";
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
                          <td className="px-5 py-4">
                            <div className="space-y-0.5 text-[12px] font-pmedium text-slate-600">
                              <p className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {lead.mobileNumber || "Not shared"}</p>
                              <p className="flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {lead.email || "Not shared"}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4"><span className="text-[12px] font-pmedium text-slate-700">{lead.source || "Website"}</span></td>
                          <td className="px-5 py-4">
                            {(() => {
                              const pt = (lead.productType || "").trim();
                              const v = (lead.vertical || "").trim();
                              const product = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "co-working");
                              return <p className="text-[12px] font-pmedium text-slate-700">{product}</p>;
                            })()}
                          </td>
                          <td className="px-5 py-4">
                            <select
                              value={lead.status || "Pending"}
                              onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-widest cursor-pointer outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-white text-slate-600 border-slate-200`}
                            >
                              {WEBSITE_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[12px] font-pmedium text-slate-700">{formatDateLabel(lead.recievedDate || lead.receivedDate || lead.createdAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => setSelectedLeadId(lead._id)}
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
            <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setSelectedLeadId(null)}>
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
                        <span className={statusPillClass(selectedLead.status || "Pending")}>{selectedLead.status || "Pending"}</span>
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
                  <div>
                    <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <Users size={14} /> Contact Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Phone size={10} /> Phone</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{selectedLead.mobileNumber || "Not shared"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1 flex items-center gap-1"><Mail size={10} /> Email</p>
                        <p className="text-[12px] font-pmedium text-slate-900 break-all">{selectedLead.email || "Not shared"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Received On</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{formatDateLabel(selectedLead.recievedDate || selectedLead.receivedDate || selectedLead.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Received Via</p>
                        <p className="text-[12px] font-pmedium text-slate-900">
                          {(() => {
                            const s = (selectedLead.source || "").toLowerCase();
                            if (s === "nomad" || s === "nomads") return "Wono Nomads";
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
                    const pkg = !isRedundant(selectedLead.packageName) ? selectedLead.packageName : null;
                    const att = !sameAsNop(selectedLead.attendees) ? selectedLead.attendees : null;
                    const inq = !isRedundant(selectedLead.inquiryType) ? selectedLead.inquiryType : null;
                    const slot = selectedLead.timeSlot || null;
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
                      pkg && { label: "Package / Plan", value: pkg },
                      att && { label: "Attendees / Team Size", value: att },
                      inq && { label: "Inquiry Type", value: inq },
                      slot && { label: "Preferred Time / Slot", value: slot },
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
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-2.5">
                  <button type="button" onClick={() => { handleStatusChange(selectedLead._id, "Rejected"); setSelectedLeadId(null); }}
                    className="flex-1 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-pmedium text-[12px] hover:bg-red-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  ><XCircle size={14} /> Reject Lead</button>
                  <button type="button" onClick={() => { handleStatusChange(selectedLead._id, "Closed"); setSelectedLeadId(null); }}
                    className="flex-1 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
                  ><CheckCircle2 size={14} /> Close Lead</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </PageFrame>
    </div>
  );
}
