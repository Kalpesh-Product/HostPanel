import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Upload, X, Search, AlertCircle, AlertTriangle, Clock, CheckCircle2, Eye, ExternalLink, FileDown, FileSpreadsheet, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { canExportReports } from "../../utils/workspacePlanAccess";
import PageFrame from "../../components/Pages/PageFrame";
import ThreeDotMenu from "../../components/ThreeDotMenu";
import { statusPillClass } from "../../lib/status-pill";
import { createReport } from "../../services/reports";
import { downloadReportFile } from "../../utils/report-download";
import { CustomerSupportSkeleton } from "../../components/ui/Skeleton";

type TicketStatus =
  | "Open"
  | "In Progress"
  | "Resolved"
  | "Closed"
  | "Pending"
  | "Escalated"
  | "Rejected";

type SupportTicket = {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  status: TicketStatus;
  requestedAt: string;
  requestedByName: string;
  requestedByEmail: string;
  acceptedByName: string;
  acceptedByEmail: string;
  resolvedByName: string;
  resolvedByEmail: string;
  role: string;
  department: string | null;
  workspaceName: string;
  pageUrl: string;
  image: { id: string; url: string };
  resolutionMessage: string;
  resolutionAttachment: { id: string; url: string };
  resolvedAt: string | null;
  closedByUserAt: string | null;
};

type SupportPayload = {
  raised: SupportTicket[];
  history: SupportTicket[];
};

const SUPPORT_TICKETS_API = "/api/tickets/support-tickets";

const capitalizeFirst = (value?: string | null) => {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function CustomerSupportPage() {
  const axios = useAxiosPrivate();
  const { plan } = useDashboardAccess();
  const showReportExports = canExportReports(plan);
  const [activeTab, setActiveTab] = useState<"raised" | "resolved">("raised");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPageUrl, setEditPageUrl] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [supportData, setSupportData] = useState<SupportPayload>({
    raised: [],
    history: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isExportingReport, setIsExportingReport] = useState("");

  const currentList = useMemo(
    () => (activeTab === "raised" ? supportData.raised : supportData.history),
    [activeTab, supportData],
  );

  const allTickets = useMemo(() => [...supportData.raised, ...supportData.history], [supportData]);
  const openCount = useMemo(() => allTickets.filter(t => t.status === "Open").length, [allTickets]);
  const inProgressCount = useMemo(() => allTickets.filter(t => t.status === "In Progress").length, [allTickets]);
  const resolvedCount = useMemo(() => allTickets.filter(t => t.status === "Resolved" || t.status === "Closed").length, [allTickets]);

  const filteredList = useMemo(() => {
    let list = currentList;
    if (activeTab === "raised" && statusFilter !== "All") {
      list = list.filter(t => t.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(t =>
        t.ticketId?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.requestedByName?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, currentList, searchQuery, statusFilter]);

  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(SUPPORT_TICKETS_API);
      const payload = response?.data?.data || {};
      setSupportData({
        raised: Array.isArray(payload?.raised) ? payload.raised : [],
        history: Array.isArray(payload?.history) ? payload.history : [],
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load support tickets.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [axios]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setPageUrl("");
    setImageFile(null);
  };

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      if (pageUrl.trim()) formData.append("pageUrl", pageUrl.trim());
      if (imageFile) formData.append("image", imageFile);

      await axios.post(SUPPORT_TICKETS_API, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Support ticket submitted.");
      resetCreateForm();
      setIsCreateModalOpen(false);
      setActiveTab("raised");
      await loadTickets();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to submit support ticket.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeTicket = async (ticket: SupportTicket) => {
    try {
      setIsSubmitting(true);
      await axios.patch(`${SUPPORT_TICKETS_API}/${ticket.id}/close`);
      toast.success(`Ticket ${ticket.ticketId} closed.`);
      await loadTickets();
      setIsDetailsModalOpen(false);
      setSelectedTicket(null);
      setActiveTab("resolved");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to close ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFollowUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicket) return;

    try {
      setIsSubmitting(true);
      await axios.post(`${SUPPORT_TICKETS_API}/${selectedTicket.id}/follow-up`, {
        description: followUpDescription.trim(),
      });
      toast.success("Follow-up issue raised successfully.");
      setIsFollowUpModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedTicket(null);
      setFollowUpDescription("");
      await loadTickets();
      setActiveTab("raised");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to create follow-up ticket.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setEditTitle(ticket.title || "");
    setEditDescription(ticket.description || "");
    setEditPageUrl(ticket.pageUrl || "");
    setEditImageFile(null);
    setIsEditModalOpen(true);
  };

  const submitEditTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicket || !editTitle.trim() || !editDescription.trim()) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("title", editTitle.trim());
      formData.append("description", editDescription.trim());
      formData.append("pageUrl", editPageUrl.trim());
      if (editImageFile) formData.append("image", editImageFile);

      await axios.patch(`${SUPPORT_TICKETS_API}/${selectedTicket.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Support ticket updated.");
      setIsEditModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedTicket(null);
      await loadTickets();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update support ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportIssues = async (format = "PDF") => {
    const reportFormat = String(format).toLowerCase() === "excel" ? "Excel" : "PDF";
    if (!filteredList.length) { toast.error("There are no issues to export."); return; }
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: activeTab === "resolved" ? "Customer Support Issue History" : "Customer Support Issues Raised",
        department: "Customer Support", category: "Other", dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: activeTab === "resolved" ? "Issue History" : "Issues Raised",
        generatedBy: "Customer Support", format: reportFormat,
        description: `Customer support ${activeTab === "resolved" ? "issue history" : "raised issues"} export.`,
        sourceType: "custom", sourceRef: activeTab === "resolved" ? "customer-support-history" : "customer-support-raised",
        reportRows: filteredList.slice(0, 100).map((ticket, index) => ({
          label: `${index + 1}. ${ticket.ticketId || "Ticket"} - ${ticket.title || "Support issue"}`,
          value: [ticket.status, formatDate(ticket.requestedAt), ticket.requestedByName || "Unknown requester", ticket.acceptedByName || "Not accepted", ticket.resolvedByName || "Not resolved"].join(" | "),
        })),
        monthlyData: [],
      });
      if (reportFormat === "PDF") await downloadReportFile(response?.data?.download, { openInNewTab: false });
      toast.success(`${reportFormat} support report saved to Reports.`);
      window.dispatchEvent(new Event("reports:refresh"));
    } catch (error: any) { toast.error(error?.message || "Failed to export support issues."); }
    finally { setIsExportingReport(""); }
  };

  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <CustomerSupportSkeleton />
        </PageFrame>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* 1. HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Customer Support
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Raise issues to the WoNo Team — every ticket is sent to the WoNo Team for reference and resolution.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
              {showReportExports && (
                <>
                  <button type="button" onClick={() => handleExportIssues("PDF")} disabled={Boolean(isExportingReport)} title="Export PDF" aria-label="Export support issues as PDF"
                    className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-50">
                    <FileDown size={16} className="text-red-500" aria-hidden="true" />
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
                  </button>
                  <button type="button" onClick={() => handleExportIssues("Excel")} disabled={Boolean(isExportingReport)} title="Export Excel" aria-label="Export support issues as Excel"
                    className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50">
                    <FileSpreadsheet size={16} className="text-emerald-500" aria-hidden="true" />
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 2. STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Total Tickets</p>
                <p className="text-[15px] font-pmedium text-slate-900">{allTickets.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><AlertCircle size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Open (Raised)</p>
                <p className="text-[15px] font-pmedium text-slate-900">{openCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><AlertTriangle size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">In Progress</p>
                <p className="text-[15px] font-pmedium text-slate-900">{inProgressCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Clock size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Resolved / Closed</p>
                <p className="text-[15px] font-pmedium text-slate-900">{resolvedCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
          </div>

          {/* 3. MAIN TABS */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("raised")}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                activeTab === "raised"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Issues Raised
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("resolved")}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                activeTab === "resolved"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Issue Resolved
            </button>
          </div>

          {/* 4. DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Toolbar */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              {activeTab === "raised" ? (
                <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${statusFilter === status
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                      }`}
                    >
                      {status === 'Open' ? 'Raised' : status}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="w-full xl:max-w-md">
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {activeTab === "raised" ? (
                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Plus size={13} strokeWidth={3} /> RAISE ISSUE TO WONO TEAM
                  </button>
                </div>
              ) : null}
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-4 py-3.5 text-[11px] font-pmedium text-slate-400 uppercase tracking-widest text-left">Ticket ID</th>
                      <th className="px-4 py-3.5 text-[11px] font-pmedium text-slate-400 uppercase tracking-widest text-left">Issue Title</th>
                      <th className="px-4 py-3.5 text-[11px] font-pmedium text-slate-400 uppercase tracking-widest text-left">Requested At</th>
                      <th className="px-4 py-3.5 text-[11px] font-pmedium text-slate-400 uppercase tracking-widest text-left">Resolved By</th>
                      <th className="px-4 py-3.5 text-[11px] font-pmedium text-slate-400 uppercase tracking-widest text-left">Status</th>
                      <th className="px-4 py-3.5 text-[11px] font-pmedium text-slate-400 uppercase tracking-widest text-left">Accepted By</th>
                      <th className="px-4 py-3.5 text-[11px] font-pmedium text-slate-400 uppercase tracking-widest text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-20 text-slate-400 font-pmedium">No issues found.</td>
                      </tr>
                    ) : (
                      filteredList.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 align-top whitespace-nowrap">
                            <div className="font-pmedium text-slate-600 inline-flex items-center gap-1 whitespace-nowrap">{ticket.ticketId || "N/A"}</div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="font-pmedium text-[#0F172A] text-[13px] truncate max-w-[200px]">{ticket.title}</div>
                          </td>
                          <td className="px-5 py-4 align-top text-xs font-pmedium text-slate-600 whitespace-nowrap">{formatDate(ticket.requestedAt)}</td>
                          <td className="px-5 py-4 align-top text-xs font-pmedium text-slate-600 whitespace-nowrap">{ticket.resolvedByName || "-"}</td>
                          <td className="px-5 py-4 align-top text-center">
                            <span className={statusPillClass(ticket.status)}>{ticket.status}</span>
                          </td>
                          <td className="px-5 py-4 align-top text-xs font-pmedium text-slate-600 whitespace-nowrap">{ticket.acceptedByName || "-"}</td>
                          <td className="px-5 py-4 align-top text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setSelectedTicket(ticket); setIsDetailsModalOpen(true); }}
                                title="View details"
                                aria-label={`View details for ${ticket.ticketId || ticket.title}`}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                              >
                                <Eye size={15} strokeWidth={2.5} aria-hidden="true" />
                              </button>
                              {ticket.status === "Open" && (
                                <ThreeDotMenu
                                  rowId={ticket.id}
                                  menuItems={[
                                    { label: "Edit Ticket", onClick: () => openEditModal(ticket) },
                                  ]}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      </PageFrame>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

            <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-pmedium text-primary tracking-tight whitespace-nowrap">Raise a Support Issue to WoNo Team</h2>
                <p className="text-[8px] sm:text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mt-2">This ticket will be sent to the WoNo Team for resolution.</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={submitTicket} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><AlertCircle size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Issue Details</span>
                </h4>
                <div className="flex flex-col gap-1">
                  <label htmlFor="issue-title" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Title <span className="text-red-400">*</span></label>
                  <input
                    id="issue-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Platform Issue"
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="issue-description" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Description / Issue <span className="text-red-400">*</span></label>
                  <textarea
                    id="issue-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    placeholder="Describe the issue in detail"
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Upload size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Attachments</span>
                </h4>
                <div className="flex flex-col gap-1">
                  <label htmlFor="issue-page-url" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Page URL</label>
                  <input
                    id="issue-page-url"
                    type="text"
                    value={pageUrl}
                    onChange={(event) => setPageUrl(event.target.value)}
                    placeholder="e.g. /extra-common-modules/assets"
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                  />
                  <p className="text-[10px] font-medium text-slate-400">Paste the page you were on when the issue happened, so our team can see exactly what you saw.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="issue-image" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Image Upload</label>
                  <label
                    htmlFor="issue-image"
                    className="w-full border-2 border-dashed border-slate-200 rounded-lg p-4 flex items-center justify-center gap-2 text-[12px] font-pmedium text-slate-500 cursor-pointer hover:border-[#2563EB] hover:bg-blue-50/50 transition-colors"
                  >
                    <Upload size={16} />
                    {imageFile ? imageFile.name : "Choose an image file"}
                  </label>
                  <input
                    id="issue-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setImageFile(file || null);
                    }}
                  />
                </div>
              </div>
            </form>

            <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }}
                className="flex-1 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim()}
                onClick={(e) => submitTicket(e)}
                className="flex-1 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDetailsModalOpen && selectedTicket ? (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => { setIsDetailsModalOpen(false); setSelectedTicket(null); }}>
          <div
            className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                  <AlertCircle size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{selectedTicket.title || "Ticket Details"}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={statusPillClass(selectedTicket.status)}>{selectedTicket.status}</span>
                    <span className="text-[10px] font-pmedium text-slate-500">{selectedTicket.ticketId || "-"}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsDetailsModalOpen(false); setSelectedTicket(null); }}
                className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-white">
              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <AlertCircle size={14} /> Ticket Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Ticket ID</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{selectedTicket.ticketId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Unit</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{selectedTicket.workspaceName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Role</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{capitalizeFirst(selectedTicket.role)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Requested At</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{formatDate(selectedTicket.requestedAt)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Accepted By</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{selectedTicket.acceptedByName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Resolved By</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{selectedTicket.resolvedByName || "—"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <FileText size={14} /> Issue Details
                </h3>
                <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Issue Title</p>
                    <p className="text-[12px] font-pmedium text-slate-900">{selectedTicket.title || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Issue Description / Follow Up</p>
                    <p className="text-[12px] font-pmedium text-slate-900 whitespace-pre-wrap max-h-24 overflow-y-auto">{selectedTicket.description || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Issue Attachment</p>
                    {selectedTicket.image?.url ? (
                      <a href={selectedTicket.image.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-pmedium tracking-wide hover:bg-blue-100 transition-colors">
                        <ExternalLink size={11} /> View Uploaded Image
                      </a>
                    ) : (
                      <p className="text-[12px] font-pmedium text-slate-400">No attachment</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Resolution
                </h3>
                <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Resolution Message</p>
                    <p className="text-[12px] font-pmedium text-slate-900 whitespace-pre-wrap max-h-24 overflow-y-auto">{selectedTicket.resolutionMessage || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Resolution Attachment</p>
                    {selectedTicket.resolutionAttachment?.url ? (
                      <a href={selectedTicket.resolutionAttachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-pmedium tracking-wide hover:bg-blue-100 transition-colors">
                        <ExternalLink size={11} /> View Resolution File
                      </a>
                    ) : (
                      <p className="text-[12px] font-pmedium text-slate-400">No resolution attachment</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-2.5">
              {selectedTicket.status === "Resolved" ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setIsFollowUpModalOpen(true); }}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[12px] hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                  >
                    Follow Up
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void closeTicket(selectedTicket)}
                    className="flex-1 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? "Closing..." : "Close Ticket"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsDetailsModalOpen(false); setSelectedTicket(null); }}
                  className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 transition-all"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isFollowUpModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

            <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-pmedium text-primary tracking-tight">Follow Up Issue</h2>
                <p className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-widest mt-2">{selectedTicket.ticketId || "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsFollowUpModalOpen(false); setFollowUpDescription(""); }}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={submitFollowUp} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><AlertCircle size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Follow Up</span>
                </h4>
                <p className="text-[12px] font-semibold text-slate-500">
                  Follow-up for ticket <span className="text-[#0F172A] font-bold">{selectedTicket.ticketId || "-"}</span>.
                </p>
                <div className="flex flex-col gap-1">
                  <label htmlFor="followup-description" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Follow Up Message</label>
                  <textarea
                    id="followup-description"
                    value={followUpDescription}
                    onChange={(event) => setFollowUpDescription(event.target.value)}
                    rows={4}
                    placeholder="Explain what is still pending or unresolved."
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            </form>

            <div className="p-5 sm:p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
              <button
                type="submit"
                disabled={isSubmitting}
                onClick={(e) => submitFollowUp(e)}
                className="w-full py-3 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/25 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none hover:bg-blue-600 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? "Submitting..." : "Submit Follow Up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

            <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-pmedium text-primary tracking-tight">Edit Support Issue</h2>
                <p className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-widest mt-2">{selectedTicket.ticketId || "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setSelectedTicket(null); }}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={submitEditTicket} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><AlertCircle size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Issue Details</span>
                </h4>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-issue-title" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Title <span className="text-red-400">*</span></label>
                  <input
                    id="edit-issue-title"
                    type="text"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="e.g. Platform Issue"
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-issue-description" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Description / Issue <span className="text-red-400">*</span></label>
                  <textarea
                    id="edit-issue-description"
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    rows={5}
                    placeholder="Describe the issue in detail"
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Upload size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Attachments</span>
                </h4>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-issue-page-url" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Page URL</label>
                  <input
                    id="edit-issue-page-url"
                    type="text"
                    value={editPageUrl}
                    onChange={(event) => setEditPageUrl(event.target.value)}
                    placeholder="e.g. /extra-common-modules/assets"
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-issue-image" className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Image Upload</label>
                  <label
                    htmlFor="edit-issue-image"
                    className="w-full border-2 border-dashed border-slate-200 rounded-lg p-4 flex items-center justify-center gap-2 text-[12px] font-pmedium text-slate-500 cursor-pointer hover:border-[#2563EB] hover:bg-blue-50/50 transition-colors"
                  >
                    <Upload size={16} />
                    {editImageFile ? editImageFile.name : selectedTicket.image?.url ? "Replace uploaded image" : "Choose an image file"}
                  </label>
                  <input
                    id="edit-issue-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setEditImageFile(file || null);
                    }}
                  />
                </div>
              </div>
            </form>

            <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setSelectedTicket(null); }}
                className="flex-1 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !editTitle.trim() || !editDescription.trim()}
                onClick={(e) => submitEditTicket(e)}
                className="flex-1 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
