// @ts-nocheck
import { useMemo, useState } from "react";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useMutation, useQuery } from "@tanstack/react-query";
import PageFrame from "../../../components/Pages/PageFrame";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle2, Edit3, Layers, Search, Target, XCircle } from "lucide-react";
import { statusPillClass } from '../../../lib/status-pill';

function formatDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function getInitials(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "N";
}

export default function NomadListingsOverview() {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const user = auth?.user;
  const [requestSent, setRequestSent] = useState(Boolean(user?.companiesListingRequested));

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const companyId = user?.effectiveNomadsCompanyId || user?.companyId || "";
  const ownCompanyId = user?.companyId || "";
  const isLinkedToExistingCompany = Boolean(
    user?.effectiveNomadsCompanyId &&
      ownCompanyId &&
      user.effectiveNomadsCompanyId !== ownCompanyId,
  );

  const { mutate: requestCompaniesListing, isPending: isRequesting } = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/api/listings/request-companies-listing");
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

  const totalListings = listings.length;
  const activeListings = listings.filter((l) => l.isActive).length;
  const inactiveListings = listings.filter((l) => !l.isActive).length;

  const filteredListings = useMemo(() => {
    let result = listings;
    if (statusFilter === "active") result = result.filter((l) => l.isActive);
    if (statusFilter === "inactive") result = result.filter((l) => !l.isActive);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.companyName?.toLowerCase()?.includes(q) ||
          l.companyType?.toLowerCase()?.includes(q) ||
          l.city?.toLowerCase()?.includes(q) ||
          l.country?.toLowerCase()?.includes(q),
      );
    }
    return result;
  }, [listings, statusFilter, searchQuery]);

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

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Nomad Listings
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Manage your co-working and co-living space listings across Wono Nomads.
              </p>
            </div>
          </div>

          {/* REQUEST BANNER */}
          {!isLinkedToExistingCompany && !!listings.length && (
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-blue-200 bg-blue-50">
              <div className="font-pmedium text-gray-700">
                {requestSent ? (
                  <>Your request is pending review by our team.</>
                ) : (
                  <>Want your listing to also appear on our public Companies directory? Request to have it reviewed and listed.</>
                )}
              </div>
              {!requestSent && (
                <button
                  type="button"
                  disabled={isRequesting}
                  onClick={() => requestCompaniesListing()}
                  className="btn-pill bg-[#2563EB] text-white px-4 py-2 shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                >
                  {isRequesting ? "Sending..." : "Request to be listed"}
                </button>
              )}
            </div>
          )}

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-1 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Listings</p>
                <p className="text-[15px] font-black text-slate-900">{totalListings}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Layers size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Active</p>
                <p className="text-[15px] font-black text-slate-900">{activeListings}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Inactive</p>
                <p className="text-[15px] font-black text-slate-900">{inactiveListings}</p>
              </div>
              <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 shrink-0"><XCircle size={16} /></div>
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
                <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
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
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search by name, type, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddClick}
                    className="btn-pill bg-[#2563EB] text-white px-4 py-2.5 flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                  >
                    Add Product
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Sr No</th>
                      <th className="px-5 py-4">Company Name</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">City</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredListings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center">
                          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 mx-auto"><Target size={28} /></div>
                          <p className="text-slate-400 font-pmedium">No listings found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredListings.map((item, idx) => (
                        <tr key={item._id || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-pmedium text-slate-400">{idx + 1}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[9px] font-pmedium text-white shadow-sm">
                                {getInitials(item.companyName)}
                              </div>
                              <div>
                                <p className="text-[12px] font-pmedium text-slate-900">{item.companyName || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-pmedium text-slate-600 capitalize">{item.companyType || "—"}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-pmedium text-slate-600">{item.city || item.country || "—"}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={statusPillClass(item.isActive ? "Active" : "Inactive")}>
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[12px] font-pmedium text-slate-700">{formatDate(item.createdAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                              >
                                <Edit3 size={15} strokeWidth={2.5} />
                              </button>
                            </div>
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
    </div>
  );
}
