import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Archive, Clock, FileText, LogOut, Plus, RefreshCw, Send, UserMinus, X,
} from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

function formatDate(value: string | undefined): string {
  if (!value) return "-";
  const d = new Date(value.slice(0, 10));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatStatus(value: string): string {
  const s = String(value || "pending").toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  if (s === "completed") return "Completed";
  return "Pending";
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status || "pending").toLowerCase();
  const colors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${colors[s] || colors.pending}`}>
      <UserMinus size={10} />
      {formatStatus(status)}
    </span>
  );
}

interface ExitRequest {
  id?: string;
  _id?: string;
  exitCode?: string;
  reason?: string;
  status?: string;
  department?: string;
  noticePeriodDays?: number;
  noticeEndAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  requestedDocuments?: string[];
  requestedDocumentNotes?: string;
  rejectionReason?: string;
}

export function ExitRequestTab() {
  const axios = useAxiosPrivate();
  const [requests, setRequests] = useState<ExitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [requestedDocuments, setRequestedDocuments] = useState<string[]>([]);
  const [documentNotes, setDocumentNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const response = await axios.get("/api/hr/exit-management/requests");
      const data = response?.data?.data || response?.data || response || {};
      const list = Array.isArray(data.requests) ? data.requests : Array.isArray(data) ? data : [];
      setRequests(list);
      setErrorMessage("");
    } catch (err: any) {
      setRequests([]);
      if (err?.response?.status === 404) {
        setErrorMessage("");
      } else {
        setErrorMessage(err?.response?.data?.message || err?.message || "Failed to load exit requests");
      }
    }
  }, [axios]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    loadRequests().finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [loadRequests]);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => String(r.status || "").toLowerCase() === "pending").length;
    const approved = requests.filter((r) => String(r.status || "").toLowerCase() === "approved").length;
    const completed = requests.filter((r) => String(r.status || "").toLowerCase() === "completed").length;
    const rejected = requests.filter((r) => String(r.status || "").toLowerCase() === "rejected").length;
    return { pending, approved, completed, rejected, total: requests.length };
  }, [requests]);

  const canSubmit = useMemo(() => {
    const activeStatuses = new Set(["pending", "approved"]);
    return !requests.some((r) => activeStatuses.has(String(r.status || "").toLowerCase()));
  }, [requests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for leaving");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        reason: reason.trim(),
        requestedDocuments,
        requestedDocumentNotes: documentNotes.trim(),
      };
      await axios.post("/api/hr/exit-management/requests", payload);
      await loadRequests();
      setReason("");
      setRequestedDocuments([]);
      setDocumentNotes("");
      setShowForm(false);
      toast.success("Exit request submitted");
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to submit exit request");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-default border-borderGray rounded-xl bg-white p-4">
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">Exit Requests</span>
       
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 shrink-0">
        {[
          { key: 'total', label: 'Total', value: stats.total, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: LogOut, iconClass: 'bg-slate-50 text-slate-600' },
          { key: 'pending', label: 'Pending', value: stats.pending, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: Clock, iconClass: 'bg-amber-50 text-amber-600' },
          { key: 'approved', label: 'Approved', value: stats.approved, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', icon: AlertTriangle, iconClass: 'bg-blue-50 text-blue-600' },
          { key: 'completed', label: 'Completed', value: stats.completed, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: Archive, iconClass: 'bg-emerald-50 text-emerald-600' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={card.cardClass}>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-[15px] font-black text-slate-900">{card.value}</p>
              </div>
              <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16}/></div>
            </div>
          );
        })}
      </div>

      {/* New Request Button */}
      <div className="mb-4 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setShowForm((p) => !p)}
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-[12px] font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "New Exit Request"}
        </button>
        {!canSubmit && !showForm && (
          <p className="text-xs text-amber-600">You already have an active exit request.</p>
        )}
      </div>

      {/* Submission Form */}
      {showForm && (
        <div className="mb-4 rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <LogOut size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-blue-600">Resignation</p>
              <h2 className="text-lg font-pmedium text-slate-900">New Exit Request</h2>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2563EB]"
              placeholder="Explain the reason for leaving the company..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />

            {/* Requested Documents */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                <FileText size={13} className="text-blue-600" />
                Requested Documents to Return
              </label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                {["ID Card", "Laptop", "Access Card", "Company Phone", "Corporate Credit Card", "Health Insurance Card", "Keys", "Other Assets"].map((doc) => (
                  <label key={doc} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                      checked={requestedDocuments.includes(doc)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRequestedDocuments([...requestedDocuments, doc]);
                        } else {
                          setRequestedDocuments(requestedDocuments.filter((d) => d !== doc));
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-slate-700">{doc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Document Notes */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                <FileText size={13} className="text-blue-600" />
                Document Notes
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-[#2563EB]"
                placeholder="Any additional notes regarding the documents..."
                value={documentNotes}
                onChange={(e) => setDocumentNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setReason(""); setRequestedDocuments([]); setDocumentNotes(""); }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !reason.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send size={15} />
                {isSaving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[2rem] border border-slate-100 bg-white/90 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errorMessage}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100 shadow-sm">
            <LogOut className="text-slate-400" size={24} />
          </div>
          <p className="text-slate-500 font-semibold mb-1 uppercase tracking-widest text-[11px]">No exit requests found</p>
          <p className="text-slate-400 text-[13px]">Your exit requests will appear here.</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-6 py-4">Request Code</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Documents</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Notice Period</th>
                <th className="px-6 py-4 text-center">Last Working Day</th>
                <th className="px-6 py-4 text-center">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {requests.map((req) => (
                <tr key={req.id || req._id || req.exitCode} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900 text-sm">{req.exitCode || "-"}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-[13px] text-slate-700 truncate" title={req.reason}>{req.reason || "-"}</p>
                    {req.rejectionReason && req.status === "rejected" && (
                      <p className="text-[11px] text-red-500 mt-1 truncate" title={req.rejectionReason}>
                        Reason: {req.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    {req.requestedDocuments && req.requestedDocuments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {req.requestedDocuments.map((doc, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            <FileText size={10} /> {doc}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[13px] text-slate-400">-</span>
                    )}
                    {req.requestedDocumentNotes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic" title={req.requestedDocumentNotes}>
                        {req.requestedDocumentNotes}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={req.status || "pending"} />
                  </td>
                  <td className="px-6 py-4 text-center text-[13px] font-semibold text-slate-700">
                    {req.noticePeriodDays ? `${req.noticePeriodDays} days` : "-"}
                  </td>
                  <td className="px-6 py-4 text-center text-[13px] text-slate-600">
                    {formatDate(req.noticeEndAt || req.completedAt)}
                  </td>
                  <td className="px-6 py-4 text-center text-[13px] text-slate-600">
                    {formatDate(req.createdAt || req.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ExitRequestTab;
