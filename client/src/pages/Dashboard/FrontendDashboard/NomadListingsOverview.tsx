// @ts-nocheck
import { useMemo, useState } from "react";
import {
  BadgeCheck, Building2, Eye, LayoutList, Plus, Search, Sparkles, X,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageFrame from "../../../components/Pages/PageFrame";
import useAuth from "../../../hooks/useAuth";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { queryClient } from "../../../main";

const STATUSES = ["active", "inactive"];

function getInitials(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "CO";
}

export default function NomadListingsOverview() {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const user = auth?.user;

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedListingId, setSelectedListingId] = useState(null);

  const companyId = user?.companyId || "";

  const { data: listings = [], isPending } = useQuery({
    queryKey: ["nomad-listings", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const res = await axios.get(
        `https://wononomadsbe.vercel.app/api/company/get-listings/${companyId}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          params: { t: Date.now() },
        },
      );
      return res.data || [];
    },
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: async (data) => {
      const response = await axios.patch("/api/listings/activate-product", data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Status updated");
      queryClient.invalidateQueries({ queryKey: ["nomad-listings"] });
      setSelectedListingId(null);
    },
    onError: (error) => {
      toast.error("Failed to update status");
    },
  });

  const listingsData = useMemo(() => {
    return (Array.isArray(listings) ? listings : []).map((item, index) => ({
      ...item,
      srNo: index + 1,
      businessId: item.businessId,
      companyName: item.companyName,
      companyType: item.companyType,
      city: item.city,
      state: item.state,
      country: item.country,
      ratings: item.ratings,
      totalReviews: item.totalReviews,
    }));
  }, [listings]);

  const listingStats = useMemo(() => {
    const total = listingsData.length;
    const active = listingsData.filter((l) => l.isActive).length;
    const inactive = listingsData.filter((l) => !l.isActive).length;
    return [
      { label: "Total Listings", value: total, icon: LayoutList },
      { label: "Active", value: active, icon: BadgeCheck },
      { label: "Inactive", value: inactive, icon: X },
    ];
  }, [listingsData]);

  const visibleListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return listingsData.filter((l) => {
      const matchesStage = stageFilter === "all"
        || (stageFilter === "active" && l.isActive)
        || (stageFilter === "inactive" && !l.isActive);
      const matchesQuery = !query || [l.companyName, l.companyType, l.city, l.state, l.country]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
      return matchesStage && matchesQuery;
    });
  }, [listingsData, searchQuery, stageFilter]);

  const selectedListing = useMemo(
    () => listingsData.find((l) => l.businessId === selectedListingId) || null,
    [listingsData, selectedListingId],
  );

  const handleAddClick = () => {
    navigate(`/company-settings/nomad-listings/add`, { state: { companyId } });
  };

  const handleEdit = (item) => {
    sessionStorage.setItem("companyId", companyId);
    sessionStorage.setItem("companyName", item?.companyName || "");
    sessionStorage.setItem("businessId", item?.businessId || "");
    navigate(`/company-settings/nomad-listings/edit`, {
      state: { website: item, companyId, isLoading: isPending },
    });
  };

  if (isPending) {
    return (
      <div className="p-2 lg:p-2.5 animate-pulse">
        <div className="h-6 w-48 bg-slate-100 rounded-xl mb-4" />
        <div className="h-4 w-72 bg-slate-100 rounded-xl mb-6" />
        <div className="rounded-[2rem] border border-slate-100 bg-white overflow-hidden">
          <div className="px-3.5 py-3 border-b border-slate-100">
            <div className="h-3 w-full bg-slate-100 rounded-lg" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-3.5 py-3 border-b border-slate-50">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-3 flex-1 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
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
                Nomad Listings
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Manage your nomad business listings.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-blue-700 shadow-sm"
            >
              <Plus size={12} /> Add Product
            </button>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-1 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Listings</p>
                <p className="text-[15px] font-black text-slate-900">{listingStats[0]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><LayoutList size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active</p>
                <p className="text-[15px] font-black text-slate-900">{listingStats[1]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><BadgeCheck size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Inactive</p>
                <p className="text-[15px] font-black text-slate-900">{listingStats[2]?.value ?? 0}</p>
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
                  >All ({listingsData.length})</button>
                  {STATUSES.map((status) => {
                    const count = status === "active"
                      ? listingsData.filter((l) => l.isActive).length
                      : listingsData.filter((l) => !l.isActive).length;
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
                  <input type="text" placeholder="Search by name, type, location..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" />
                </div>
              </div>
            </div>

            {visibleListings.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Building2 size={28} /></div>
                <p className="text-slate-400 font-semibold">No matching listings found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">SR NO</th>
                      <th className="px-5 py-4">Company Name</th>
                      <th className="px-5 py-4">Company Type</th>
                      <th className="px-5 py-4">Location</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {visibleListings.map((listing) => {
                      const statusTone = listing.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-rose-50 text-rose-700 border-rose-100";
                      const location = [listing.city, listing.state, listing.country].filter(Boolean).join(", ") || "—";
                      return (
                        <tr key={listing.businessId || listing.srNo} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-bold text-slate-700">{listing.srNo}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[10px] font-black text-white shadow-sm">{getInitials(listing.companyName)}</div>
                              <div>
                                <p className="text-[12px] font-bold text-slate-900">{listing.companyName || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-bold text-slate-700">{listing.companyType || "—"}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-semibold text-slate-600">{location}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusTone}`}>
                              {listing.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => setSelectedListingId(listing.businessId)}
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
          {selectedListing && (
            <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F172A]/60 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={() => setSelectedListingId(null)} />
              <div className="relative z-10 flex flex-col w-full max-w-[580px] max-h-[88vh] overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 shrink-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow-sm">
                      {getInitials(selectedListing.companyName)}
                    </div>
                    <div>
                      <h3 className="text-[13px] font-black leading-tight text-slate-900">{selectedListing.companyName || "Unnamed"}</h3>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${selectedListing.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>{selectedListing.isActive ? "Active" : "Inactive"}</span>
                        {selectedListing.companyType && (
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{selectedListing.companyType}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedListingId(null)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-rose-600"
                  ><X size={14} /></button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Company Type</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{selectedListing.companyType || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Rating</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{selectedListing.ratings || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total Reviews</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{selectedListing.totalReviews || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Location</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{[selectedListing.city, selectedListing.state, selectedListing.country].filter(Boolean).join(", ") || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => handleEdit(selectedListing)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-blue-700"
                  >Edit</button>
                  <button type="button" onClick={() => toggleStatus({ businessId: selectedListing.businessId, status: !selectedListing.isActive })}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition ${selectedListing.isActive ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                  >{selectedListing.isActive ? "Mark Inactive" : "Mark Active"}</button>
                </div>

              </div>
            </div>
          )}

        </div>
      </PageFrame>
    </div>
  );
}
