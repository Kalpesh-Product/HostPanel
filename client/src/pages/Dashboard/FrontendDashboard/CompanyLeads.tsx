// @ts-nocheck
import { useMemo, useState } from "react";
import {
  BadgeCheck, CheckCircle2, Eye, Mail, Phone, Search, Sparkles, Target, X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";
import PageFrame from "../../../components/Pages/PageFrame";

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

export default function CompanyLeads() {
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const workspaceId = selectedCompany?.workspaceId || auth?.user?.primaryWorkspace || auth?.user?.workspaceMembership?.workspace || auth?.user?.workspaceId || "";
  const companyId = selectedCompany?.companyId || auth?.user?.companyId || "";

  const { data: leads = [], isPending, isError } = useQuery({
    queryKey: ["leadCompany", companyId, workspaceId],
    enabled: !!(companyId || workspaceId),
    queryFn: async () => {
      const response = await axiosPrivate.get(`/api/leads/get-leads?companyId=${encodeURIComponent(companyId)}&workspaceId=${encodeURIComponent(workspaceId)}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      return Array.isArray(response?.data) ? response.data : [];
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosPrivate.patch("/api/leads/update-lead", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Lead updated");
      queryClient.invalidateQueries(["leadCompany"]);
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
      { label: "Total Website Leads", value: total, icon: Target },
      { label: "Pending", value: pending, icon: Sparkles },
      { label: "Contacted", value: contacted, icon: BadgeCheck },
      { label: "Closed", value: closed, icon: CheckCircle2 },
    ];
  }, [leads]);

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

  if (isPending) {
    return (
      <div className="p-2 lg:p-2.5 animate-pulse">
        <div className="h-6 w-48 bg-slate-100 rounded-xl mb-4" />
        <div className="h-4 w-72 bg-slate-100 rounded-xl mb-6" />
        <div className="rounded-[2rem] border border-slate-100 bg-white overflow-hidden">
          <div className="px-3.5 py-3 border-b border-slate-100">
            <div className="h-3 w-full bg-slate-100 rounded-lg" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
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

  if (isError) return <span className="text-red-500">Error Loading Leads</span>;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4 text-slate-700 font-sans">

          {/* HEADER */}
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Leads
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Website enquiries received from your published site.
              </p>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-1 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Website Leads</p>
                <p className="text-[15px] font-black text-slate-900">{leadStats[0]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Target size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending</p>
                <p className="text-[15px] font-black text-slate-900">{leadStats[1]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Sparkles size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contacted</p>
                <p className="text-[15px] font-black text-slate-900">{leadStats[2]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><BadgeCheck size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Closed</p>
                <p className="text-[15px] font-black text-slate-900">{leadStats[3]?.value ?? 0}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              {/* STATUS FILTER PILLS */}
              <div className="flex bg-slate-100/50 p-1 rounded-xl w-full relative border border-slate-200/50 overflow-x-auto mb-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button onClick={() => setStageFilter("All")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${stageFilter === "All" ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                  >All ({leads.length})</button>
                  {WEBSITE_STATUSES.map((status) => {
                    const count = leads.filter((l) => (l.status || "Pending") === status).length;
                    return (
                      <button key={status} onClick={() => setStageFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${stageFilter === status ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                      >{status} ({count})</button>
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
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" />
                </div>
              </div>
            </div>

            {visibleLeads.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Target size={28} /></div>
                <p className="text-slate-400 font-semibold">No matching website leads found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
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
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[10px] font-black text-white shadow-sm">{getInitials(lead.fullName)}</div>
                              <div>
                                <p className="text-[12px] font-bold text-slate-900">{lead.fullName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-0.5 text-[12px] font-semibold text-slate-600">
                              <p className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {lead.mobileNumber || "Not shared"}</p>
                              <p className="flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {lead.email || "Not shared"}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4"><span className="text-[12px] font-bold text-slate-700">{lead.source || "Website"}</span></td>
                          <td className="px-5 py-4">
                            {(() => {
                              const pt = (lead.productType || "").trim();
                              const v = (lead.vertical || "").trim();
                              const product = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "co-working");
                              return <p className="text-[12px] font-bold text-slate-700">{product}</p>;
                            })()}
                          </td>
                          <td className="px-5 py-4">
                            <select
                              value={lead.status || "Pending"}
                              onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest cursor-pointer outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${websiteStageStyle}`}
                            >
                              {WEBSITE_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[12px] font-bold text-slate-700">{formatDateLabel(lead.recievedDate || lead.createdAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => setSelectedLeadId(lead._id)}
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
          {selectedLead && (
            <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F172A]/60 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={() => setSelectedLeadId(null)} />
              <div className="relative z-10 flex flex-col w-full max-w-[620px] max-h-[88vh] overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 shrink-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow-sm">
                      {getInitials(selectedLead.fullName)}
                    </div>
                    <div>
                      <h3 className="text-[13px] font-black leading-tight text-slate-900">{selectedLead.fullName}</h3>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${{ Pending: "bg-amber-50 text-amber-700 border-amber-100", Contacted: "bg-blue-50 text-blue-700 border-blue-100", Closed: "bg-emerald-50 text-emerald-700 border-emerald-100", Rejected: "bg-rose-50 text-rose-700 border-rose-100" }[selectedLead.status || "Pending"] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{selectedLead.status || "Pending"}</span>
                        {(() => {
                          const pt = (selectedLead.productType || "").trim();
                          const v = (selectedLead.vertical || "").trim();
                          const label = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "");
                          return label ? (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedLeadId(null)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-rose-600"
                  ><X size={14} /></button>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">

                  {/* Core contact fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{selectedLead.mobileNumber || "Not shared"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                      <p className="mt-0.5 break-all text-[12px] font-bold text-slate-900">{selectedLead.email || "Not shared"}</p>
                    </div>
                    {(() => {
                      const pt = (selectedLead.productType || "").trim();
                      const v = (selectedLead.vertical || "").trim();
                      const product = pt && pt.toLowerCase() !== "co-working" ? pt : (v && v.toLowerCase() !== "co-working" ? v : "");
                      return product ? (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Product / Service</p>
                          <p className="mt-0.5 text-[12px] font-bold text-slate-900">{product}</p>
                        </div>
                      ) : null;
                    })()}
                    {selectedLead.noOfPeople && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">No. of People</p>
                        <p className="mt-0.5 text-[12px] font-bold text-slate-900">{selectedLead.noOfPeople}</p>
                      </div>
                    )}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Received On</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">{formatDateLabel(selectedLead.recievedDate || selectedLead.createdAt)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Received Via</p>
                      <p className="mt-0.5 text-[12px] font-bold text-slate-900">
                        {(() => {
                          const s = (selectedLead.source || "").toLowerCase();
                          if (s.includes("preview")) return "Website Preview";
                          if (s.includes("hosted") || s.includes("live") || s.includes("wono")) return "Hosted Website";
                          if (s.includes("direct")) return "Direct";
                          return selectedLead.source || "Website";
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Booking / Enquiry details */}
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
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 px-0.5">Booking / Enquiry Details</p>
                        <div className="grid grid-cols-2 gap-2">
                          {fields.map(({ label, value }) => (
                            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                              <p className="mt-0.5 text-[12px] font-bold text-slate-900">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Message */}
                  {selectedLead.message && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Message</p>
                      <p className="text-[12px] font-medium leading-5 text-slate-700">{selectedLead.message}</p>
                    </div>
                  )}

                </div>

                {/* Sticky Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => { handleStatusChange(selectedLead._id, "Closed"); setSelectedLeadId(null); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-emerald-700"
                  ><CheckCircle2 size={12} /> Close Lead</button>
                  <button type="button" onClick={() => { handleStatusChange(selectedLead._id, "Rejected"); setSelectedLeadId(null); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-rose-700"
                  ><X size={12} /> Reject Lead</button>
                </div>

              </div>
            </div>
          )}

        </div>
      </PageFrame>
    </div>
  );
}
