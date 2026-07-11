import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Upload, X, Search, AlertCircle, AlertTriangle, Clock, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import PageFrame from "../../components/Pages/PageFrame";
import { statusPillClass } from "../../lib/status-pill";

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
  const [activeTab, setActiveTab] = useState<"raised" | "resolved">("raised");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [supportData, setSupportData] = useState<SupportPayload>({
    raised: [],
    history: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
                Track issue lifecycle with clear ownership and resolution context.
              </p>
            </div>
          </div>

          {/* 2. STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tickets</p>
                <p className="text-[15px] font-black text-slate-900">{allTickets.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><AlertCircle size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Open (Raised)</p>
                <p className="text-[15px] font-black text-slate-900">{openCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><AlertTriangle size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">In Progress</p>
                <p className="text-[15px] font-black text-slate-900">{inProgressCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Clock size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Resolved / Closed</p>
                <p className="text-[15px] font-black text-slate-900">{resolvedCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
          </div>

          {/* 3. MAIN TABS */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("raised")}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
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
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
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
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${statusFilter === status
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
                    className="btn-pill bg-[#2563EB] text-white px-4 py-2.5 flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Plus size={13} strokeWidth={3} />Raise Issue
                  </button>
                </div>
              ) : null}
            </div>
            {isLoading ? (
              <div className="p-4 text-sm font-bold text-slate-500">Loading tickets...</div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-4 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Ticket ID</th>
                      <th className="px-4 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Issue Title</th>
                      <th className="px-4 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Requested At</th>
                      <th className="px-4 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Resolved By</th>
                      <th className="px-4 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Status</th>
                      <th className="px-4 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Accepted By</th>
                      <th className="px-4 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Action</th>
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
                            <button
                              type="button"
                              onClick={() => { setSelectedTicket(ticket); setIsDetailsModalOpen(true); }}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition-all"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PageFrame>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

            <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-pmedium text-primary tracking-tight">Raise a Support Issue</h2>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-2">Submit a new support ticket</p>
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
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
          <div onClick={() => { setIsDetailsModalOpen(false); setSelectedTicket(null); }} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
          <div className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-xl max-h-[92vh] md:max-h-[85vh] shadow-2xl relative z-[90] flex flex-col overflow-hidden">
            <div className="px-6 py-4 md:p-8 flex justify-between items-center border-b border-slate-100/60 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
              <div>
                <h2 className="text-xl md:text-2xl font-pmedium text-primary tracking-tight">Ticket Details</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedTicket.ticketId || "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsDetailsModalOpen(false); setSelectedTicket(null); }}
                className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

              <div className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Ticket ID</p><p className="text-[13px] font-bold text-[#0F172A]">{selectedTicket.ticketId || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Workspace</p><p className="text-[13px] font-bold text-[#0F172A]">{selectedTicket.workspaceName || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Role</p><p className="text-[13px] font-bold text-[#0F172A]">{selectedTicket.role || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Department</p><p className="text-[13px] font-bold text-[#0F172A]">{selectedTicket.department || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Requested At</p><p className="text-[13px] font-bold text-[#0F172A]">{formatDate(selectedTicket.requestedAt)}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Accepted By</p><p className="text-[13px] font-bold text-[#0F172A]">{selectedTicket.acceptedByName || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Resolved By</p><p className="text-[13px] font-bold text-[#0F172A]">{selectedTicket.resolvedByName || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Status</p><span className={statusPillClass(selectedTicket.status)}>{selectedTicket.status}</span></div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-1">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Issue Title</p>
                  <p className="text-[13px] font-bold text-[#0F172A]">{selectedTicket.title || "-"}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-1">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Issue Description / Follow Up</p>
                  <p className="text-[13px] font-bold text-[#0F172A] whitespace-pre-wrap max-h-20 overflow-y-auto">{selectedTicket.description || "-"}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-1">
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Issue Attachment</p>
                    {selectedTicket.image?.url ? (
                      <a href={selectedTicket.image.url} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-[#2563EB] underline">View Uploaded Image</a>
                    ) : (
                      <p className="text-[13px] font-bold text-slate-400">No attachment</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-1">
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Resolution Attachment</p>
                    {selectedTicket.resolutionAttachment?.url ? (
                      <a href={selectedTicket.resolutionAttachment.url} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-[#2563EB] underline">View Resolution File</a>
                    ) : (
                      <p className="text-[13px] font-bold text-slate-400">No resolution attachment</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-1">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Resolution</p>
                  <p className="text-[13px] font-bold text-[#0F172A] whitespace-pre-wrap max-h-20 overflow-y-auto">{selectedTicket.resolutionMessage || "-"}</p>
                </div>
              </div>

            <div className="p-4 sm:p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 shrink-0 flex flex-wrap gap-3 justify-end">
              {selectedTicket.status === "Resolved" ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setIsFollowUpModalOpen(true); }}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                  >
                    Follow Up
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void closeTicket(selectedTicket)}
                    className="px-6 py-3 bg-[#2563EB] text-white rounded-xl font-bold text-[13px] shadow-lg shadow-[#2563EB]/30 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none hover:bg-blue-600 transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? "Closing..." : "Close Ticket"}
                  </button>
                </>
              ) : null}
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
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-2">{selectedTicket.ticketId || "-"}</p>
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
                className="w-full py-3 bg-[#2563EB] text-white rounded-xl font-black text-[12px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/25 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none hover:bg-blue-600 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? "Submitting..." : "Submit Follow Up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
