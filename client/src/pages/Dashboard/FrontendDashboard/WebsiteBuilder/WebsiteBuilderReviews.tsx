import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BadgeCheck, CheckCircle2, ExternalLink, Eye, EyeOff, FileText, Search, Sparkles, Star, Target, X, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { format, isValid } from "date-fns";
import PageFrame from "../../../../components/Pages/PageFrame";
import useAuth from "../../../../hooks/useAuth";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { statusPillClass } from '../../../../lib/status-pill';
import { WebsiteReviewsSkeleton } from '../../../../components/ui/Skeleton';

const STATUSES = ["pending", "approved", "rejected"];
const REVIEW_CACHE_KEY = "wbr_review_cache";

function formatDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  return isValid(d) ? format(d, "dd MMM yyyy") : "—";
}

function getInitials(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "RV";
}

function getWebsiteReviewSource() {
  return "Website Reviews";
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

export default function WebsiteBuilderReviews() {
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
    queryKey: ["websiteReviews", companyId, workspaceId],
    enabled: !!(companyId || workspaceId),
    queryFn: async () => {
      const params = {};
      if (companyId) params.companyId = companyId;
      if (workspaceId) params.workspaceId = workspaceId;
      params.reviewScope = "website";
      const res = await axiosPrivate.get("/api/review", { params });
      const raw = res.data?.reviews ?? res.data?.data?.reviews ?? res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const [localCache, setLocalCache] = useState(() => {
    try {
      const stored = localStorage.getItem(REVIEW_CACHE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(localCache));
  }, [localCache]);

  const updateMutation = useMutation({
    mutationFn: async ({ reviewId, updates }) => {
      const res = await axiosPrivate.patch(`/api/review/${reviewId}`, updates);
      return res.data;
    },
    onSuccess: (data, { reviewId, updates }) => {
      if (Object.prototype.hasOwnProperty.call(updates, "isEnabled")) {
        toast.success(updates.isEnabled ? "Review enabled on the website." : "Review disabled on the website.");
      } else {
        toast.success(updates.status === "approved" ? "Review approved." : "Review rejected.");
      }
      const currentData = queryClient.getQueryData(["websiteReviews", companyId, workspaceId]);
      if (Array.isArray(currentData)) {
        const review = currentData.find((r) => r._id === reviewId);
        if (review) {
          const updatedReview = data?.review ?? data?.data?.review ?? {};
          setLocalCache((prev) => ({
            ...prev,
            [reviewId]: { ...review, ...prev[reviewId], ...updates, ...updatedReview },
          }));
        }
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to update review.");
    },
  });

  const reviews = useMemo(() => {
    const base = rawData ?? [];
    const cache = localCache;
    const cacheIds = Object.keys(cache);
    const merged = cacheIds.length === 0 ? [...base] : [...base];
    if (cacheIds.length > 0) {
      for (const id of cacheIds) {
        const idx = merged.findIndex((r) => r._id === id);
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            status: cache[id].status,
            ...(typeof cache[id].isEnabled === "boolean" ? { isEnabled: cache[id].isEnabled } : {}),
          };
        } else {
          merged.push(cache[id]);
        }
      }
    }
    const statusOrder = { pending: 0, approved: 1, rejected: 2 };
    merged.sort((a, b) => {
      const aOrder = statusOrder[a.status || "pending"] ?? 99;
      const bOrder = statusOrder[b.status || "pending"] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aDate = new Date(a.createdAt || a.submittedAt || 0).getTime();
      const bDate = new Date(b.createdAt || b.submittedAt || 0).getTime();
      return bDate - aDate;
    });
    return merged;
  }, [rawData, localCache]);

  const handleStatusChange = (reviewId, newStatus) => {
    setConfirmAction({ reviewId, updates: { status: newStatus } });
  };

  const handleVisibilityChange = (reviewId, isEnabled) => {
    setConfirmAction({ reviewId, updates: { isEnabled } });
  };

  const confirmReviewChange = () => {
    if (!confirmAction) return;
    updateMutation.mutate(confirmAction);
    setConfirmAction(null);
    setSelectedReviewId(null);
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
      const matchesQuery = !query || [r.name, getWebsiteReviewSource(), r.description]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
      return matchesStage && matchesQuery;
    });
  }, [reviews, searchQuery, stageFilter]);

  const selectedReview = useMemo(
    () => reviews.find((r) => r._id === selectedReviewId) || null,
    [reviews, selectedReviewId],
  );

  if (!companyId && !workspaceId) {
    return (
      <div className="p-2 lg:p-2.5">
        <PageFrame>
          <p className="text-red-500 text-sm">Could not determine workspace identifier. Reviews cannot be loaded.</p>
        </PageFrame>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <WebsiteReviewsSkeleton />
        </PageFrame>
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
                Website Review
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Visitor-submitted reviews for your website.
              </p>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-1 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Total Reviews</p>
                <p className="text-[15px] font-pmedium text-slate-900">{reviewStats[0]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Target size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Pending</p>
                <p className="text-[15px] font-pmedium text-slate-900">{reviewStats[1]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Sparkles size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Approved</p>
                <p className="text-[15px] font-pmedium text-slate-900">{reviewStats[2]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><BadgeCheck size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-rose-600 uppercase tracking-widest mb-1">Rejected</p>
                <p className="text-[15px] font-pmedium text-slate-900">{reviewStats[3]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 shrink-0"><X size={16} /></div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              {/* STATUS FILTER PILLS */}
              <div className="w-full overflow-x-auto mb-3 [&::-webkit-scrollbar]:hidden">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button onClick={() => setStageFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${stageFilter === "all" ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                  >All</button>
                  {STATUSES.map((status) => {
                    return (
                      <button key={status} onClick={() => setStageFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${stageFilter === status ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                      >{status.charAt(0).toUpperCase() + status.slice(1)}</button>
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
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" />
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
                <table className="w-full text-left min-w-[920px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Reviewer</th>
                      <th className="px-5 py-4">Rating</th>
                      <th className="px-5 py-4">Description</th>
                      <th className="px-5 py-4">Source</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Website Display</th>
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
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[10px] font-pmedium text-white shadow-sm">{getInitials(review.name)}</div>
                              <div>
                                <p className="text-[12px] font-pmedium text-slate-900">{review.name || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StarRating count={review.starCount} />
                          </td>
                          <td className="px-5 py-4 max-w-[260px]">
                            <p className="text-[12px] font-pmedium text-slate-600 truncate">{review.description || "—"}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-pmedium text-slate-700">{getWebsiteReviewSource()}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={statusPillClass(review.status || "pending")}>
                              {review.status || "pending"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {review.status === "approved" ? (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wide ${
                                  review.isEnabled === true
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600"
                                }`}
                              >
                                {review.isEnabled === true ? "Enabled" : "Disabled"}
                              </span>
                            ) : (
                              <span className="text-[12px] font-pmedium text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[12px] font-pmedium text-slate-700">{formatDate(review.createdAt)}</p>
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
            <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setSelectedReviewId(null)}>
              <div
                className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-pmedium shadow-sm shrink-0 bg-[#2563EB] text-white">
                      {getInitials(selectedReview.name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{selectedReview.name || "Anonymous"}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={statusPillClass(selectedReview.status || "pending")}>{selectedReview.status || "pending"}</span>
                        <span className={statusPillClass(getWebsiteReviewSource())}>{getWebsiteReviewSource()}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedReviewId(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-white">
                  <div>
                    <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <Star size={14} /> Review Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Rating</p>
                        <StarRating count={selectedReview.starCount} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Source</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{getWebsiteReviewSource()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Received On</p>
                        <p className="text-[12px] font-pmedium text-slate-900">{formatDate(selectedReview.createdAt)}</p>
                      </div>
                      {selectedReview.reviewLink && (
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-pmedium tracking-widest mb-1">Review Link</p>
                          <a href={selectedReview.reviewLink} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-pmedium tracking-wide hover:bg-blue-100 transition-colors"
                          ><ExternalLink size={11} /> Open Review Link</a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <FileText size={14} /> Description
                    </h3>
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[12px] font-pmedium leading-5 text-slate-700">{selectedReview.description || "No description provided."}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-2.5">
                  {(selectedReview.status || "pending") === "pending" ? (
                    <>
                      <button type="button" onClick={() => handleStatusChange(selectedReview._id, "rejected")}
                        className="flex-1 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-pmedium text-[12px] hover:bg-red-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      ><XCircle size={14} /> Reject</button>
                      <button type="button" onClick={() => handleStatusChange(selectedReview._id, "approved")}
                        className="flex-1 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
                      ><CheckCircle2 size={14} /> Approve</button>
                    </>
                  ) : selectedReview.status === "approved" ? (
                    <>
                      <button type="button" onClick={() => setSelectedReviewId(null)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-slate-100 transition-colors">Close</button>
                      <button
                        type="button"
                        onClick={() => handleVisibilityChange(selectedReview._id, selectedReview.isEnabled !== true)}
                        className={`flex-1 py-2.5 rounded-xl font-pmedium text-[12px] shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                          selectedReview.isEnabled === true
                            ? "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
                            : "bg-[#2563EB] text-white hover:bg-blue-700"
                        }`}
                      >
                        {selectedReview.isEnabled === true ? <EyeOff size={14} /> : <Eye size={14} />}
                        {selectedReview.isEnabled === true ? "Disable" : "Enable"}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 flex items-center justify-center text-[11px] font-pmedium text-slate-500">This review has already been {selectedReview.status}.</span>
                      <button type="button" onClick={() => setSelectedReviewId(null)} className="flex-1 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 transition-all">Close</button>
                    </>
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
                  {confirmAction.updates.status === "approved"
                    ? "Approve Review?"
                    : confirmAction.updates.status === "rejected"
                      ? "Reject Review?"
                      : confirmAction.updates.isEnabled
                        ? "Enable Review?"
                        : "Disable Review?"}
                </h3>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed mb-6">
                  {confirmAction.updates.status === "approved"
                    ? "Once approved, you can choose whether to enable this review on your hosted website. This action cannot be undone."
                    : confirmAction.updates.status === "rejected"
                      ? "Once rejected, the review will never be displayed on your website. This action cannot be undone."
                      : confirmAction.updates.isEnabled
                        ? "This approved review will be displayed on your hosted website."
                        : "This review will be hidden from your hosted website, but it will remain approved."
                  }
                </p>
                <div className="flex items-center gap-2.5">
                  <button type="button" onClick={() => setConfirmAction(null)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
                  >Cancel</button>
                  <button type="button" onClick={confirmReviewChange}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-white transition ${
                      confirmAction.updates.status === "approved" || confirmAction.updates.isEnabled
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    Yes, {confirmAction.updates.status === "approved"
                      ? "Approve"
                      : confirmAction.updates.status === "rejected"
                        ? "Reject"
                        : confirmAction.updates.isEnabled
                          ? "Enable"
                          : "Disable"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </PageFrame>
    </div>
  );
}
