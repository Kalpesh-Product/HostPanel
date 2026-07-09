// @ts-nocheck
import { useMemo, useState } from "react";
import {
  AlertTriangle, BadgeCheck, CheckCircle2, Eye, Search, Sparkles, Star, Target, X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { format, isValid } from "date-fns";
import PageFrame from "../../../components/Pages/PageFrame";
import useAuth from "../../../hooks/useAuth";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";

const STATUSES = ["pending", "approved", "rejected"];

function formatDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  return isValid(d) ? format(d, "dd MMM yyyy") : "—";
}

function getInitials(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "RV";
}

function StarRating({ count }) {
  const n = Number(count);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 5) return <span className="text-slate-400 text-[12px] font-semibold">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < n ? "text-amber-400 fill-amber-400" : "text-slate-300"} />
      ))}
    </div>
  );
}

export default function CompanyReviews() {
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const axiosPrivate = useAxiosPrivate();

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const companyId = (selectedCompany?.companyId ?? auth?.user?.companyId ?? "").trim();
  const workspaceId = (selectedCompany?.workspaceId ?? auth?.user?.primaryWorkspace ?? auth?.user?.workspaceId ?? "").trim();

  const { data: rawData, isPending, isError } = useQuery({
    queryKey: ["companyReviews", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const res = await axiosPrivate.get(`/api/review?companyId=${companyId}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const raw = res.data?.reviews ?? res.data?.data?.reviews ?? res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ reviewId, status }) => {
      const res = await axiosPrivate.patch(`/api/review/${reviewId}`, { status });
      return res.data;
    },
    onSuccess: (_data, { status }) => {
      toast.success(status === "approved" ? "Review approved." : "Review rejected.");
      queryClient.invalidateQueries(["companyReviews"]);
      setConfirmAction(null);
      setSelectedReviewId(null);
    },
    onError: () => {
      toast.error("Failed to update review.");
    },
  });

  const reviews = useMemo(() => {
    const base = rawData ?? [];
    const statusOrder = { pending: 0, approved: 1, rejected: 2 };
    const sorted = [...base].sort((a, b) => {
      const aOrder = statusOrder[a.status || "pending"] ?? 99;
      const bOrder = statusOrder[b.status || "pending"] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aDate = new Date(a.createdAt || a.submittedAt || 0).getTime();
      const bDate = new Date(b.createdAt || b.submittedAt || 0).getTime();
      return bDate - aDate;
    });
    return sorted;
  }, [rawData]);

  const handleStatusChange = (reviewId, newStatus) => {
    setConfirmAction({ reviewId, status: newStatus });
  };

  const confirmStatusChange = () => {
    if (!confirmAction) return;
    updateMutation.mutate({ reviewId: confirmAction.reviewId, status: confirmAction.status });
  };

  const reviewStats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((r) => (r.status || "pending") === "pending").length;
    const approved = reviews.filter((r) => r.status === "approved").length;
    const rejected = reviews.filter((r) => r.status === "rejected").length;
    return [
      { label: "Total Reviews", value: total, icon: Target },
      { label: "Pending", value: pending, icon: Sparkles },
      { label: "Approved", value: approved, icon: BadgeCheck },
      { label: "Rejected", value: rejected, icon: X },
    ];
  }, [reviews]);

  const visibleReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return reviews.filter((r) => {
      const matchesStage = stageFilter === "all" || (r.status || "pending") === stageFilter;
      const matchesQuery = !query || [r.name, r.reviewerName, r.reviewSource, r.description, r.review]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
      return matchesStage && matchesQuery;
    });
  }, [reviews, searchQuery, stageFilter]);

  const selectedReview = useMemo(
    () => reviews.find((r) => r._id === selectedReviewId) || null,
    [reviews, selectedReviewId],
  );

  if (isPending) {
    return (
      <div className="p-2 lg:p-2.5 animate-pulse">
        <div className="h-6 w-48 bg-slate-100 rounded-xl mb-4" />
        <div className="h-4 w-72 bg-slate-100 rounded-xl mb-6" />
        <div className="rounded-[2rem] border border-slate-100 bg-white overflow-hidden">
          <div className="px-3.5 py-3 border-b border-slate-100">
            <div className="h-3 w-full bg-slate-100 rounded-lg" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-3.5 py-3 border-b border-slate-50">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-3 flex-1 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-2 lg:p-2.5">
        <PageFrame>
          <div className="py-12 text-center text-red-500 text-sm font-semibold">Failed to load reviews. Please try again.</div>
        </PageFrame>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4 text-slate-700 font-sans">

          {/* HEADER */}
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Nomads Reviews
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Visitor-submitted reviews for your nomad listings.
              </p>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-1 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Reviews</p>
                <p className="text-[15px] font-black text-slate-900">{reviewStats[0]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Target size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending</p>
                <p className="text-[15px] font-black text-slate-900">{reviewStats[1]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Sparkles size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Approved</p>
                <p className="text-[15px] font-black text-slate-900">{reviewStats[2]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><BadgeCheck size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Rejected</p>
                <p className="text-[15px] font-black text-slate-900">{reviewStats[3]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 shrink-0"><X size={16} /></div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              {/* STATUS FILTER PILLS */}
              <div className="flex bg-slate-100/50 p-1 rounded-xl w-full relative border border-slate-200/50 overflow-x-auto mb-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button onClick={() => setStageFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${stageFilter === "all" ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                  >All ({reviews.length})</button>
                  {STATUSES.map((status) => {
                    const count = reviews.filter((r) => (r.status || "pending") === status).length;
                    return (
                      <button key={status} onClick={() => setStageFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${stageFilter === status ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                      >{status.charAt(0).toUpperCase() + status.slice(1)} ({count})</button>
                    );
                  })}
                </div>
              </div>
              <div />
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type="text" placeholder="Search by name, source, description..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" />
                </div>
              </div>
            </div>

            {visibleReviews.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Target size={28} /></div>
                <p className="text-slate-400 font-semibold">No matching reviews found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Reviewer</th>
                      <th className="px-5 py-4">Rating</th>
                      <th className="px-5 py-4">Description</th>
                      <th className="px-5 py-4">Source</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Received Date</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {visibleReviews.map((review) => {
                      const statusTone = {
                        pending: "bg-amber-50 text-amber-700 border-amber-100",
                        approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
                        rejected: "bg-rose-50 text-rose-700 border-rose-100",
                      }[review.status || "pending"] || "bg-slate-50 text-slate-600 border-slate-200";
                      return (
                        <tr key={review._id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[10px] font-black text-white shadow-sm">{getInitials(review.name || review.reviewerName)}</div>
                              <div>
                                <p className="text-[12px] font-bold text-slate-900">{review.name || review.reviewerName || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StarRating count={review.starCount || review.rating || review.ratingValue} />
                          </td>
                          <td className="px-5 py-4 max-w-[260px]">
                            <p className="text-[12px] font-semibold text-slate-600 truncate">{review.description || review.review || "—"}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-bold text-slate-700">{review.reviewSource || "—"}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusTone}`}>
                              {review.status || "pending"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[12px] font-bold text-slate-700">{formatDate(review.createdAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => setSelectedReviewId(review._id)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"><Eye size={15} strokeWidth={2.5} /></button>
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
          {selectedReview && (
            <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F172A]/60 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={() => setSelectedReviewId(null)} />
              <div className="relative z-10 flex flex-col w-full max-w-[580px] max-h-[88vh] overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 shrink-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow-sm">
                      {getInitials(selectedReview.name || selectedReview.reviewerName)}
                    </div>
                    <div>
                      <h3 className="text-[13px] font-black leading-tight text-slate-900">{selectedReview.name || selectedReview.reviewerName || "Anonymous"}</h3>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${{ pending: "bg-amber-50 text-amber-700 border-amber-100", approved: "bg-emerald-50 text-emerald-700 border-emerald-100", rejected: "bg-rose-50 text-rose-700 border-rose-100" }[selectedReview.status || "pending"] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{selectedReview.status || "pending"}</span>
                        {selectedReview.reviewSource && (
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{selectedReview.reviewSource}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedReviewId(null)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-rose-600"
                  ><X size={14} /></button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Rating</span>
                    <StarRating count={selectedReview.starCount || selectedReview.rating || selectedReview.ratingValue} />
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Description</p>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                      <p className="text-[12px] font-medium leading-5 text-slate-700">{selectedReview.description || selectedReview.review || "No description provided."}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Received On</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{formatDate(selectedReview.createdAt)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Source</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{selectedReview.reviewSource || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-end gap-2 shrink-0">
                  {(selectedReview.status || "pending") === "pending" && (
                    <>
                      <button type="button" onClick={() => handleStatusChange(selectedReview._id, "approved")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-emerald-700"
                      ><CheckCircle2 size={12} /> Approve</button>
                      <button type="button" onClick={() => handleStatusChange(selectedReview._id, "rejected")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-rose-700"
                      ><X size={12} /> Reject</button>
                    </>
                  )}
                  {(selectedReview.status || "pending") !== "pending" && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">This review has already been {selectedReview.status}.</span>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* CONFIRMATION MODAL */}
          {confirmAction && (
            <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F172A]/60 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
              <div className="relative z-10 flex flex-col w-full max-w-[420px] overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 mb-4">
                  <AlertTriangle size={28} className="text-amber-500" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">
                  {confirmAction.status === "approved" ? "Approve Review?" : "Reject Review?"}
                </h3>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed mb-6">
                  {confirmAction.status === "approved"
                    ? "Once approved, the review will be visible on your nomad listing. This action cannot be undone."
                    : "Once rejected, the review will never be displayed on your nomad listing. This action cannot be undone."
                  }
                </p>
                <div className="flex items-center gap-2.5">
                  <button type="button" onClick={() => setConfirmAction(null)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
                  >Cancel</button>
                  <button type="button" onClick={confirmStatusChange}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition ${
                      confirmAction.status === "approved"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >Yes, {confirmAction.status === "approved" ? "Approve" : "Reject"}</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </PageFrame>
    </div>
  );
}
