// @ts-nocheck
import { useMemo, useState } from "react";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useMutation } from "@tanstack/react-query";
import PageFrame from "../../../components/Pages/PageFrame";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Edit3, Eye, Globe, Layers, ListChecks, Loader2, Plus, RotateCcw, Search, Target, Trash2, XCircle } from "lucide-react";
import { statusPillClass } from '../../../lib/status-pill';
import useNomadListingCapacity, {
  normalizeNomadListingType,
} from "../../../hooks/useNomadListingCapacity";

function getInitials(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "N";
}

export default function NomadListingsOverview() {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const user = auth?.user;
  const [requestSent, setRequestSent] = useState(Boolean(user?.companiesListingRequested));
  const [requestedTypes, setRequestedTypes] = useState([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Mirrors UnitManagementPage's delete-confirmation modal design: a real
  // confirm dialog for the delete itself, and a separate "you can't yet"
  // dialog when Master Status is still active.
  const [deletingListing, setDeletingListing] = useState(null);
  const [blockedDeleteListing, setBlockedDeleteListing] = useState(null);

  const companyId = user?.effectiveNomadsCompanyId || user?.companyId || "";
  const ownCompanyId = user?.companyId || "";
  const isLinkedToExistingCompany = Boolean(
    user?.effectiveNomadsCompanyId &&
      ownCompanyId &&
      user.effectiveNomadsCompanyId !== ownCompanyId,
  );

  const { mutate: requestCompaniesListing, isPending: isRequesting } = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/api/listings/request-companies-listing", {
        types: requestedTypes,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Request sent");
      setRequestSent(true);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to send request");
    },
  });

  // "Master Status" (isActive) is our team's review flag, set from Master
  // Panel. "Host Status" (isPublic) is this toggle — whether the host wants
  // the listing actually shown on the Nomads website. Turning it on only
  // works once Master Status is active; the server enforces that too.
  const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
    mutationFn: async ({ businessId, isPublic }) => {
      const res = await axios.patch("/api/listings/set-listing-visibility", {
        businessId,
        companyId,
        isPublic,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Visibility updated");
      void refetchListings();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to update visibility");
    },
  });

  // Soft delete — only allowed while Master Status is inactive. Deleting
  // frees the listing's plan slot immediately, so it stops counting toward
  // the limit/type-usage the moment this succeeds (useNomadListingCapacity
  // already excludes isDeleted listings from those counts).
  const { mutate: deleteListingMutate, isPending: isDeleting } = useMutation({
    mutationFn: async ({ businessId }) => {
      const res = await axios.patch("/api/listings/delete-listing", {
        businessId,
        companyId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Listing deleted");
      setDeletingListing(null);
      void refetchListings();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to delete listing");
    },
  });

  const { mutate: requestRecovery, isPending: isRequestingRecovery } = useMutation({
    mutationFn: async ({ businessId }) => {
      const res = await axios.patch("/api/listings/request-listing-recovery", {
        businessId,
        companyId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Recovery requested");
      void refetchListings();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to request recovery");
    },
  });

  const handleDeleteClick = (item) => {
    // Gated on Visibility (isPublic) — the host's own toggle — not Master
    // Status, which is staff's flag and shouldn't block a host action.
    if (item.isPublic) {
      setBlockedDeleteListing(item);
      return;
    }
    setDeletingListing(item);
  };

  const handleConfirmDeleteListing = () => {
    if (!deletingListing) return;
    deleteListingMutate({ businessId: deletingListing.businessId });
  };

  const {
    listings,
    limit,
    used: totalListings,
    remaining,
    isAtLimit,
    isPending,
    limitMessage,
    typeLimit,
    usedTypes,
    refetchListings,
  } = useNomadListingCapacity(companyId);

  // Deleted listings are excluded here too — they're not really "inactive",
  // they're gone (until recovered), and already don't count toward the plan
  // limit (totalListings, from the hook's `used`).
  const nonDeletedListings = listings.filter((l) => !l.isDeleted);
  const activeListings = nonDeletedListings.filter((l) => l.isActive).length;
  const inactiveListings = nonDeletedListings.filter((l) => !l.isActive).length;
  const deletedListings = listings.filter((l) => l.isDeleted).length;

  // Distinct product types among the host's own existing listings — the
  // set staff can be asked to activate a subset of.
  const availableTypes = useMemo(() => {
    const seen = new Map();
    nonDeletedListings.forEach((l) => {
      const normalized = normalizeNomadListingType(l?.companyType);
      if (normalized && !seen.has(normalized)) {
        seen.set(normalized, l.companyType);
      }
    });
    return Array.from(seen.entries()).map(([normalized, label]) => ({ normalized, label }));
  }, [nonDeletedListings]);

  const toggleRequestedType = (normalized) => {
    setRequestedTypes((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((t) => t !== normalized);
      }
      if (typeLimit !== null && prev.length >= typeLimit) {
        toast.error(
          `You can select up to ${typeLimit} product types on your current plan.`,
          { position: "bottom-right" },
        );
        return prev;
      }
      return [...prev, normalized];
    });
  };

  const filteredListings = useMemo(() => {
    let result = listings;
    if (statusFilter === "active") result = result.filter((l) => l.isActive);
    if (statusFilter === "inactive") result = result.filter((l) => !l.isActive);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.companyName?.toLowerCase()?.includes(q) ||
          l.companyTitle?.toLowerCase()?.includes(q) ||
          l.companyType?.toLowerCase()?.includes(q) ||
          l.city?.toLowerCase()?.includes(q) ||
          l.country?.toLowerCase()?.includes(q),
      );
    }
    return result;
  }, [listings, statusFilter, searchQuery]);

  const handleAddClick = () => {
    if (isAtLimit) {
      toast.error(limitMessage, { position: "bottom-right" });
      return;
    }
    navigate(`/key-apps/nomad-listings/add`, { state: { companyId } });
  };

  const handleEdit = (item) => {
    sessionStorage.setItem("companyId", companyId);
    sessionStorage.setItem("companyName", item?.companyName || "");
    sessionStorage.setItem("businessId", item?.businessId || "");
    navigate(`/key-apps/nomad-listings/edit`, {
      state: { website: item, companyId, isLoading: isPending },
    });
  };

  const handleView = (item) => {
    sessionStorage.setItem("companyId", companyId);
    sessionStorage.setItem("companyName", item?.companyName || "");
    sessionStorage.setItem("businessId", item?.businessId || "");
    navigate(`/key-apps/nomad-listings/view`, {
      state: { website: item, companyId, isLoading: isPending, mode: "view" },
    });
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Listings
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Manage your co-working and co-living space listings across Nomads Listings.
              </p>
            </div>
          </div>

          {/* REQUEST BANNER */}
          {!isLinkedToExistingCompany && !!listings.length && (
            <div data-tour="nomad-request-banner" className="flex flex-col gap-3 p-4 rounded-2xl border border-blue-200 bg-blue-50">
              <div className="flex items-center justify-between gap-4">
                <div className="font-pmedium text-gray-700">
                  {requestSent ? (
                    <>Your request is pending review by our team.</>
                  ) : (
                    <>Want your listing to also appear on our public Companies directory? Pick which product types you'd like activated{typeLimit !== null ? ` (up to ${typeLimit} on your plan)` : ""} and request review.</>
                  )}
                </div>
                {!requestSent && (
                  <button
                    type="button"
                    disabled={isRequesting || !requestedTypes.length}
                    onClick={() => requestCompaniesListing()}
                    className="bg-[#2563EB] text-white px-4 py-2 rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                  >
                    {isRequesting ? "Sending..." : "Request to be listed"}
                  </button>
                )}
              </div>
              {!requestSent && !!availableTypes.length && (
                <div className="flex flex-wrap gap-3">
                  {availableTypes.map(({ normalized, label }) => {
                    const checked = requestedTypes.includes(normalized);
                    const disabled =
                      !checked && typeLimit !== null && requestedTypes.length >= typeLimit;
                    return (
                      <label
                        key={normalized}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-pmedium capitalize cursor-pointer transition-colors ${
                          checked
                            ? "border-blue-500 bg-blue-100 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleRequestedType(normalized)}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STAT CARDS */}
          <div data-tour="nomad-summary" className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-1 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Total Listings</p>
                <p className="text-[15px] font-pmedium text-slate-900">{totalListings}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Layers size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Active</p>
                <p className="text-[15px] font-pmedium text-slate-900">{activeListings}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-rose-600 uppercase tracking-widest mb-1">Inactive</p>
                <p className="text-[15px] font-pmedium text-slate-900">{inactiveListings}</p>
              </div>
              <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 shrink-0"><XCircle size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-violet-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-violet-600 uppercase tracking-widest mb-1">Product Types</p>
                <p className="text-[15px] font-pmedium text-slate-900">{typeLimit === null ? usedTypes : `${usedTypes}/${typeLimit}`}</p>
              </div>
              <div className="p-2 rounded-2xl bg-violet-50 text-violet-600 shrink-0"><Layers size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Listings Left</p>
                <p className="text-[15px] font-pmedium text-slate-900">{remaining === null ? "Unlimited" : remaining}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><ListChecks size={16} /></div>
            </div>
          </div>

          {/* DATA PANEL */}
          {isPending ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 bg-slate-50/50">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                  <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-8 w-20 bg-slate-200 rounded-xl" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 w-full xl:w-auto">
                    <div className="h-9 w-48 bg-slate-200 rounded-xl" />
                    <div className="h-9 w-28 bg-slate-200 rounded-2xl" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 px-2 py-3.5 border-b border-slate-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <div key={j} className="h-3.5 flex-1 bg-slate-100 rounded-lg" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              {/* Toolbar */}
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                <div data-tour="nomad-status-filter" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {["all", "active", "inactive"].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                        statusFilter === key
                          ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                          : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                      }`}
                    >
                      {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                  <div className="text-[11px] font-pmedium text-slate-500 whitespace-nowrap">
                    {limit === null
                      ? `${totalListings} listings added · Unlimited plan`
                      : `${totalListings}/${limit} listings · ${typeLimit === null ? usedTypes : `${usedTypes}/${typeLimit}`} product types`}
                  </div>
                  <div data-tour="nomad-search" className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search by name, type, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                  <button
                    data-tour="nomad-add-listing"
                    type="button"
                    onClick={handleAddClick}
                    aria-disabled={isAtLimit}
                    title={isAtLimit ? limitMessage : "Add a new listing"}
                    className={`px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap ${
                      isAtLimit
                        ? "bg-[#2563EB] text-white opacity-60 cursor-not-allowed"
                        : "bg-[#2563EB] text-white hover:bg-primary/95 active:scale-95"
                    }`}
                  >
                    <Plus size={13} strokeWidth={3} /> ADD LISTING
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto flex-1">
                <table data-tour="nomad-table" className="w-full text-left min-w-[1180px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 whitespace-nowrap">Sr No</th>
                      <th className="px-5 py-4 whitespace-nowrap">Company Name</th>
                      <th className="px-5 py-4 whitespace-nowrap">Title</th>
                      <th className="px-5 py-4 whitespace-nowrap">Type</th>
                      <th className="px-5 py-4 whitespace-nowrap">Country</th>
                      <th className="px-5 py-4 whitespace-nowrap">State</th>
                      <th className="px-5 py-4 whitespace-nowrap">City</th>
                      <th className="px-5 py-4 whitespace-nowrap">Master Status</th>
                      <th className="px-5 py-4 whitespace-nowrap">Visibility</th>
                      <th className="px-5 py-4 text-center whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredListings.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-16 text-center">
                          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 mx-auto"><Target size={28} /></div>
                          <p className="text-slate-400 font-pmedium">No listings found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredListings.map((item, idx) => (
                        <tr key={item._id || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-[12px] font-pmedium text-slate-400">{idx + 1}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[9px] font-pmedium text-white shadow-sm">
                                {getInitials(item.companyName)}
                              </div>
                              <div>
                                <p className="text-[12px] font-pmedium text-slate-900">{item.companyName || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-[12px] font-pmedium text-slate-600">{item.companyTitle || "—"}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-[12px] font-pmedium text-slate-600 capitalize">{item.companyType || "—"}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-[12px] font-pmedium text-slate-600">{item.country || "—"}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-[12px] font-pmedium text-slate-600">{item.state || "—"}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-[12px] font-pmedium text-slate-600">{item.city || "—"}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={statusPillClass(item.isActive ? "Active" : "Inactive")}>
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`${statusPillClass(item.isPublic ? "Active" : "Inactive")}`}
                              title={
                                !item.isActive
                                  ? "Waiting on our team's review"
                                  : item.isPublic
                                    ? "Visible on the Nomads website"
                                    : "Hidden from the Nomads website"
                              }
                            >
                              {item.isPublic ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {item.isDeleted ? (
                              <div className="flex items-center justify-center gap-2">
                                {/* <span className="text-[11px] font-pmedium text-slate-400 whitespace-nowrap">
                                  Deleted by host
                                </span> */}
                                {item.recoveryRequested ? (
                                  <span className="px-2.5 py-1.5 rounded-lg text-[11px] font-pmedium uppercase tracking-wide bg-amber-50 text-amber-700 whitespace-nowrap">
                                    Recovery requested
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isRequestingRecovery}
                                    onClick={() => requestRecovery({ businessId: item.businessId })}
                                    title="Ask our team to restore this listing"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-pmedium uppercase tracking-wide bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                                  >
                                    <RotateCcw size={13} strokeWidth={2.5} /> Request Recovery
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleView(item)}
                                  title="View listing"
                                  className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-all"
                                >
                                  <Eye size={15} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item)}
                                  title="Edit listing"
                                  className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                                >
                                  <Edit3 size={15} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  disabled={!item.isActive || isTogglingVisibility}
                                  onClick={() =>
                                    toggleVisibility({
                                      businessId: item.businessId,
                                      isPublic: !item.isPublic,
                                    })
                                  }
                                  title={
                                    !item.isActive
                                      ? "Waiting on our team's review — you can control visibility once this listing is activated"
                                      : item.isPublic
                                        ? "Visible on the Nomads website — click to hide it"
                                        : "Hidden from the Nomads website — click to show it"
                                  }
                                  className={`p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                    item.isPublic
                                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  <Globe size={15} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDeleteClick(item)}
                                  title={
                                    item.isPublic
                                      ? "Turn off visibility before deleting it"
                                      : "Delete this listing"
                                  }
                                  className="p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700"
                                >
                                  <Trash2 size={15} strokeWidth={2.5} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </PageFrame>

      {blockedDeleteListing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-50 p-2 text-amber-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-pmedium text-slate-950">
                  Turn off visibility to delete this listing
                </p>
                <p className="mt-1 text-[12px] font-pmedium text-slate-500">
                  {blockedDeleteListing.companyTitle || blockedDeleteListing.companyName || "This listing"} is
                  still visible on the Nomads website. Turn its visibility off first — that's your call,
                  not our team's — then you can delete it.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlockedDeleteListing(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTogglingVisibility}
                onClick={() => {
                  toggleVisibility(
                    { businessId: blockedDeleteListing.businessId, isPublic: false },
                    { onSuccess: () => setBlockedDeleteListing(null) },
                  );
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[12px] font-pmedium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTogglingVisibility ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isTogglingVisibility ? "Turning off..." : "Turn Off Visibility"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingListing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-50 p-2 text-rose-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-pmedium text-slate-950">
                  Delete {deletingListing.companyTitle || deletingListing.companyName || "this listing"}?
                </p>
                <p className="mt-1 text-[12px] font-pmedium text-slate-500">
                  It won't be visible anywhere and stops counting toward your plan right away. You can
                  request recovery from our team afterward if you change your mind.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) setDeletingListing(null);
                }}
                disabled={isDeleting}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteListing}
                disabled={isDeleting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-[12px] font-pmedium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeleting ? "Deleting..." : "Delete Listing"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
