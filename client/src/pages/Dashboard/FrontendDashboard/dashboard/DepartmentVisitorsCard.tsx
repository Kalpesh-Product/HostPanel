/**
 * DepartmentVisitorsCard — live visitor approval queue for the current
 * member's department, shown on every department manager dashboard. A
 * standard visitor logged in Visitor Management with this department and a
 * host chosen shows up here for the host to Accept/Reject; once accepted,
 * frontdesk checks the visitor in from Visitor Management itself.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Eye, X } from "lucide-react";
import { SectionCard } from "./DashboardShared";
import { getMyVisitorRequests, reviewVisitorDecision } from "@/services/visitors";

interface VisitorRecord {
  id?: string;
  recordId?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  hostUserId?: string;
  hostName?: string;
  host?: string;
  company?: string;
  purpose?: string;
  reason?: string;
  notes?: string;
  statusKey?: string;
  approvalStatus?: string;
  status?: string;
  rejectionReason?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

type VisitorDecision = "approved" | "rejected";

interface NoticeState {
  type: "success" | "error";
  text: string;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function formatClockTime(value: string | null | undefined): string {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getVisitorStatusLabel(visitor: VisitorRecord): string {
  const status = normalizeText(visitor?.statusKey || visitor?.status || "");
  if (status.includes("checked_in")) return "Checked In";
  if (status.includes("checked_out")) return "Checked Out";
  if (status.includes("approved")) return "Approved";
  if (status.includes("rejected") || status.includes("cancelled")) return "Rejected";
  return "Pending Approval";
}

function getVisitorBadge(status: string) {
  const badgeClass = "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border animate-pulse";
  const baseClass = "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border";
  switch (status) {
    case "Pending Approval":
      return <span className={`${badgeClass} bg-amber-100 text-amber-700 border-amber-200`}>Pending</span>;
    case "Approved":
      return <span className={`${baseClass} bg-blue-100 text-blue-700 border-blue-200`}>Approved</span>;
    case "Checked In":
      return <span className={`${baseClass} bg-emerald-100 text-emerald-700 border-emerald-200`}>Checked In</span>;
    case "Checked Out":
      return <span className={`${baseClass} bg-red-100 text-red-700 border-red-200`}>Checked Out</span>;
    default:
      return <span className={`${baseClass} bg-gray-100 text-gray-700 border-gray-200`}>{status}</span>;
  }
}

interface DepartmentVisitorsCardProps {
  department: string;
  title: string;
}

export const DepartmentVisitorsCard = ({ title }: DepartmentVisitorsCardProps) => {
  const queryClient = useQueryClient();
  const [visitorNotice, setVisitorNotice] = useState<NoticeState | null>(null);
  const [reviewingVisitorId, setReviewingVisitorId] = useState("");
  const [viewingVisitor, setViewingVisitor] = useState<VisitorRecord | null>(null);
  const [rejectingVisitor, setRejectingVisitor] = useState<VisitorRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queryKey = useMemo(() => ["dashboard-my-visitor-requests"], []);

  const { data: visitors = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const overview = await getMyVisitorRequests();
      const list = (overview as { visitors?: unknown })?.visitors;
      return Array.isArray(list) ? (list as VisitorRecord[]) : [];
    },
    staleTime: 60 * 1000,
  });

  const filteredVisitors = useMemo(() => {
    return visitors
      .filter((visitor) => {
        const key = normalizeText(visitor?.statusKey || visitor?.status || "");
        return key.includes("pending") || key.includes("approved") || key.includes("checked_in") || key === "checked in";
      })
      .slice(0, 4);
  }, [visitors]);

  const handleVisitorDecision = async (visitor: VisitorRecord, decision: VisitorDecision, reason = "") => {
    const visitorId = visitor?.id || visitor?.recordId;
    if (!visitorId) return;

    const rejectionReason = decision === "rejected" ? reason.trim() : "";
    if (decision === "rejected" && !rejectionReason) return;

    setReviewingVisitorId(String(visitorId));
    setVisitorNotice(null);

    try {
      await reviewVisitorDecision(visitorId, { decision, reason: rejectionReason });

      const patch = (entry: VisitorRecord): VisitorRecord => {
        const entryId = String(entry.id || entry.recordId || "");
        if (entryId !== String(visitorId)) return entry;
        return {
          ...entry,
          approvalStatus: decision,
          statusKey: decision,
          status: decision === "approved" ? "approved" : "rejected",
          rejectionReason: decision === "rejected" ? rejectionReason.trim() : "",
        };
      };

      queryClient.setQueryData<VisitorRecord[]>(queryKey, (current = []) => current.map(patch));
      setViewingVisitor((current) => (current ? patch(current) : current));

      setVisitorNotice({
        type: "success",
        text: decision === "approved"
          ? `${visitor.name || "Visitor"} approved. Frontdesk has been notified.`
          : `${visitor.name || "Visitor"} rejected. Frontdesk has been notified.`,
      });
    } catch (decisionError) {
      setVisitorNotice({ type: "error", text: (decisionError as { response?: { data?: { message?: string } } })?.response?.data?.message || (decisionError as Error)?.message || "Unable to review the visitor right now." });
    } finally {
      setReviewingVisitorId("");
    }
  };

  const submitRejection = async () => {
    if (!rejectingVisitor || !rejectReason.trim()) return;
    await handleVisitorDecision(rejectingVisitor, "rejected", rejectReason);
    setRejectingVisitor(null);
    setRejectReason("");
  };

  const visitorError = error ? (error as Error)?.message || "Visitor requests could not be loaded." : "";

  return (
    <SectionCard title={title}>
      <div className="space-y-3">
        {visitorError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-small font-pmedium text-amber-700">{visitorError}</div>
        ) : null}

        {visitorNotice ? (
          <div className={`rounded-xl border px-3 py-2 text-small font-pmedium ${visitorNotice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {visitorNotice.text}
          </div>
        ) : null}

        {isLoading ? (
          <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">Loading visitor activity...</p></div>
        ) : filteredVisitors.length > 0 ? filteredVisitors.map((visitor) => {
          const visitorKey = visitor.recordId || visitor.id;
          const isPending = normalizeText(visitor?.statusKey || visitor?.approvalStatus || visitor?.status).includes("pending");
          const isReviewing = Boolean(reviewingVisitorId) && String(visitor.id || visitor.recordId || "") === reviewingVisitorId;
          return (
            <div key={visitorKey} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500">
                  <BadgeCheck size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-content font-pmedium text-gray-900 truncate">{visitor.name || visitor.fullName || "Visitor"}</p>
                  <div className="mt-1">{getVisitorBadge(getVisitorStatusLabel(visitor))}</div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-pmedium text-gray-400">
                    <span>Requested: {formatClockTime(visitor.createdAt)}</span>
                    <span>Check-In: {formatClockTime(visitor.checkInAt)}</span>
                    <span>Check-Out: {formatClockTime(visitor.checkOutAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  title="View details"
                  onClick={() => setViewingVisitor(visitor)}
                  className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all"
                >
                  <Eye size={13} strokeWidth={2.5} />
                </button>
                {String(visitor?.hostUserId || "").trim() && isPending ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVisitorDecision(visitor, "approved")}
                      disabled={isReviewing}
                      className="rounded-md border border-emerald-200 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectingVisitor(visitor); setRejectReason(""); }}
                      disabled={isReviewing}
                      className="rounded-md border border-red-200 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        }) : (
          <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No visitor requests for {title.replace(/ Visitors$/, "")}</p></div>
        )}
      </div>

      {viewingVisitor ? (() => {
        const isPending = normalizeText(viewingVisitor?.statusKey || viewingVisitor?.approvalStatus || viewingVisitor?.status).includes("pending");
        const isReviewing = Boolean(reviewingVisitorId) && String(viewingVisitor.id || viewingVisitor.recordId || "") === reviewingVisitorId;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm" onClick={() => setViewingVisitor(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-pmedium text-gray-900 truncate">{viewingVisitor.name || viewingVisitor.fullName || "Visitor"}</p>
                  <div className="mt-1">{getVisitorBadge(getVisitorStatusLabel(viewingVisitor))}</div>
                </div>
                <button onClick={() => setViewingVisitor(null)} className="w-8 h-8 shrink-0 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all">
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Phone</p>
                    <p className="mt-0.5 text-xs font-pmedium text-gray-900">{viewingVisitor.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Email</p>
                    <p className="mt-0.5 text-xs font-pmedium text-gray-900 truncate">{viewingVisitor.email || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Company</p>
                    <p className="mt-0.5 text-xs font-pmedium text-gray-900">{viewingVisitor.company || "Individual"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Purpose</p>
                    <p className="mt-0.5 text-xs font-pmedium text-gray-900">{viewingVisitor.purpose || "Not specified"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Reason to Meet</p>
                  <p className="mt-0.5 text-xs font-pmedium text-gray-700 leading-relaxed">{viewingVisitor.reason || viewingVisitor.notes || "No reason added."}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-pmedium text-gray-400 border-t border-gray-100 pt-3">
                  <span>Requested: {formatClockTime(viewingVisitor.createdAt)}</span>
                  <span>Check-In: {formatClockTime(viewingVisitor.checkInAt)}</span>
                  <span>Check-Out: {formatClockTime(viewingVisitor.checkOutAt)}</span>
                </div>
                {viewingVisitor.rejectionReason ? (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-red-500">Rejection Reason</p>
                    <p className="mt-0.5 text-xs font-pmedium text-red-700">{viewingVisitor.rejectionReason}</p>
                  </div>
                ) : null}
              </div>
              {isPending && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleVisitorDecision(viewingVisitor, "approved")}
                    disabled={isReviewing}
                    className="flex-1 rounded-xl border border-emerald-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectingVisitor(viewingVisitor); setRejectReason(""); }}
                    disabled={isReviewing}
                    className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })() : null}

      {rejectingVisitor ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm" onClick={() => setRejectingVisitor(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-start justify-between gap-3">
              <p className="font-pmedium text-gray-900">Reject {rejectingVisitor.name || rejectingVisitor.fullName || "this visitor"}?</p>
              <button onClick={() => setRejectingVisitor(null)} className="w-8 h-8 shrink-0 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-red-500 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-2">
              <label className="text-[9px] font-pmedium uppercase tracking-widest text-gray-400">Reason for rejection</label>
              <textarea
                autoFocus
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Let the front desk know why this request is being rejected"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-pmedium text-gray-900 outline-none transition-all focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none"
              />
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingVisitor(null)}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRejection}
                disabled={!rejectReason.trim() || Boolean(reviewingVisitorId)}
                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-red-700 disabled:opacity-60"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
};

export default DepartmentVisitorsCard;
