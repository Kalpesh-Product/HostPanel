import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Search, Plus, Eye, Pencil, RefreshCw, ShieldCheck, AlertTriangle,
  Users, Wallet, Receipt, CheckCircle2, Clock, CreditCard, UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  getVirtualOffices,
  deleteVirtualOffice,
} from "../../../services/virtual-offices";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import PageFrame from "../../../components/Pages/PageFrame";
import { SalesTenantCompaniesSkeleton } from "../../../components/ui/SalesPageSkeletons";
import VirtualOfficeFormModal from "./VirtualOfficeFormModal";
import VirtualOfficeRenewModal from "./VirtualOfficeRenewModal";
import VirtualOfficePaymentModal from "./VirtualOfficePaymentModal";
import VirtualOfficeRentDetailsModal from "./VirtualOfficeRentDetailsModal";
import VirtualOfficeBulkUploadModal from "./VirtualOfficeBulkUploadModal";

const RENT_STATUS_OPTIONS = [
  { value: "Active", label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "Overdue", label: "Overdue", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "Pending", label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "Cancelled", label: "Cancelled", className: "border-slate-200 bg-slate-100 text-slate-600" },
];

const RECORD_STATUS_OPTIONS = [
  { value: "Onboarding", label: "Onboarding", className: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "Onboarded", label: "Onboarded", className: "border-violet-200 bg-violet-50 text-violet-700" },
  { value: "Active", label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "Expiring Soon", label: "Expiring Soon", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "Expired", label: "Expired", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "Cancelled", label: "Cancelled", className: "border-slate-200 bg-slate-100 text-slate-600" },
];

function formatDate(value) {
  if (!value) return "--";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function getStatusMeta(value, list) {
  return list.find((item) => item.value === value) || { label: value || "--", className: "bg-slate-100 text-slate-600 border-slate-200" };
}

function getInitials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "VO";
}

const RENEWABLE_STATUSES = new Set(["Expiring Soon", "Expired"]);

export default function VirtualOfficesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, overdue: 0, pending: 0 });
  const [activeTab, setActiveTab] = useState("companies");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [rentStatusFilter, setRentStatusFilter] = useState("All Rent Status");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [collectionStatusFilter, setCollectionStatusFilter] = useState("All Rent Status");
  const [viewingRecord, setViewingRecord] = useState(null);
  const [payingRecord, setPayingRecord] = useState(null);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingRecord, setEditingRecord] = useState(null);
  const [renewingRecord, setRenewingRecord] = useState(null);
  const [bulkUploadType, setBulkUploadType] = useState(null);

  const workspacePreferences = useWorkspacePreferences();
  const navigate = useNavigate();
  const currency = workspacePreferences.currency;
  const fmt = useCallback(
    (v) => formatWorkspaceCurrency(Math.round(Number(v || 0)), currency, { maximumFractionDigits: 0 }),
    [currency],
  );

  const openCreateModal = () => {
    setModalMode("create");
    setEditingRecord(null);
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setModalMode("edit");
    setEditingRecord(record);
    setShowModal(true);
  };

  const handleModalSaved = () => {
    loadRecords();
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getVirtualOffices({
        page: 1,
        limit: 100,
        ...(debouncedSearchQuery ? { search: debouncedSearchQuery } : {}),
        ...(statusFilter !== "All Status" ? { status: statusFilter } : {}),
        ...(rentStatusFilter !== "All Rent Status" ? { rentStatus: rentStatusFilter } : {}),
      });
      const payload = response?.data || {};
      setRecords(Array.isArray(payload.records) ? payload.records : []);
      if (payload.summary) setSummary(payload.summary);
    } catch (error) {
      toast.error(error.message || "Failed to load virtual office companies.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchQuery, statusFilter, rentStatusFilter]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const statusMeta = (value) => getStatusMeta(value, RECORD_STATUS_OPTIONS);
  const rentMeta = (value) => getStatusMeta(value, RENT_STATUS_OPTIONS);

  // Flatten every rent payment across the loaded records into a single
  // collection ledger, attaching the owning company for context.
  const paymentLedger = useMemo(() => {
    return records.flatMap((record) =>
      (Array.isArray(record.paymentRecords) ? record.paymentRecords : []).map((payment) => ({
        ...payment,
        companyId: record._id || record.recordId,
        companyName: record.clientName || record.brandName,
        companyCode: record.recordCode,
        companyInitials: record.initials || getInitials(record.clientName || record.brandName),
      })),
    );
  }, [records]);

  // Company-wise view for Rent Collections & Payments: one row per company,
  // expandable to show that company's month-wise payment history.
  const filteredCompanies = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    return records.filter((record) => {
      const companyName = record.clientName || record.brandName || "";
      const matchesSearch = !q ||
        companyName.toLowerCase().includes(q) ||
        String(record.recordCode || "").toLowerCase().includes(q);
      const matchesStatus = collectionStatusFilter === "All Rent Status" || record.rentStatus === collectionStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, collectionSearch, collectionStatusFilter]);

  const collectionSummary = useMemo(() => {
    const totalCollected = paymentLedger.reduce((sum, p) => sum + (p.status === "Paid" ? Number(p.amount || 0) : 0), 0);
    return {
      paidCount: paymentLedger.filter((p) => p.status === "Paid").length,
      pendingCount: paymentLedger.filter((p) => p.status === "Pending" || p.status === "Overdue").length,
      totalCollected,
    };
  }, [paymentLedger]);

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete virtual office record for "${record.clientName}"? This cannot be undone.`)) return;
    try {
      await deleteVirtualOffice(record._id || record.recordId);
      toast.success("Virtual office record deleted.");
      await loadRecords();
    } catch (error) {
      toast.error(error.message || "Failed to delete record.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame><SalesTenantCompaniesSkeleton /></PageFrame>
      </div>
    );
  }

  const summaryCards = [
    { key: "total", icon: Building2, value: summary.total, label: "Total Companies", cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md", iconClass: "bg-blue-50 text-blue-600" },
    { key: "active", icon: ShieldCheck, value: summary.active, label: "Active Rents", cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-green-500", iconClass: "bg-green-50 text-green-600" },
    { key: "overdue", icon: AlertTriangle, value: summary.overdue, label: "Overdue Rents", cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-red-500", iconClass: "bg-red-50 text-red-600" },
    { key: "pending", icon: Users, value: summary.pending, label: "Pending Onboarding", cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500", iconClass: "bg-amber-50 text-amber-600" },
  ];

  const collectionCards = [
    { key: "collected", icon: CheckCircle2, value: fmt(collectionSummary.totalCollected), label: "Collected", cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500", iconClass: "bg-emerald-50 text-emerald-600" },
    { key: "paid-count", icon: Receipt, value: collectionSummary.paidCount, label: "Paid Records", cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500", iconClass: "bg-blue-50 text-blue-600" },
    { key: "pending-count", icon: Clock, value: collectionSummary.pendingCount, label: "Pending / Overdue", cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500", iconClass: "bg-amber-50 text-amber-600" },
    { key: "companies", icon: Wallet, value: records.length, label: "Companies", cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md", iconClass: "bg-violet-50 text-violet-600" },
  ];

  return (
    <>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="mb-3 flex flex-col md:flex-row md:items-end justify-between gap-3 shrink-0">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Virtual Office Companies
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">Onboard and manage companies using our virtual office services.</p>
            </div>
          </div>

          <div className="mb-8 mt-5 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("companies")}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${activeTab === "companies" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              Virtual office companies
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("collections")}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${activeTab === "collections" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              Rent collections &amp; payments
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 shrink-0">
            {(activeTab === "companies" ? summaryCards : collectionCards).map((card) => {
              const Icon = card.icon;
              const labelToneClass = card.cardClass.includes("border-l")
                ? (card.iconClass.split(" ").find((cls) => cls.startsWith("text-")) || "text-slate-400")
                : "text-slate-400";
              return (
                <div key={card.key} className={card.cardClass}>
                  <div>
                    <p className={`text-[10px] font-pmedium ${labelToneClass} uppercase tracking-widest mb-1`}>{card.label}</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass}`}><Icon size={16} /></div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-110">
            {/* ===== COMPANIES TAB ===== */}
            {activeTab === "companies" && (
              <React.Fragment>
                <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 shrink-0 bg-slate-50/50">
                  <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {["All Status", "Active", "Onboarding", "Expiring Soon", "Expired", "Cancelled"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                          statusFilter === status
                            ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                            : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                        }`}
                      >
                        {status === "All Status" ? "All" : status}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input
                        type="text"
                        placeholder="Search company..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <select
                      className="w-full sm:w-auto px-3 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-700 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition-all cursor-pointer"
                      value={rentStatusFilter}
                      onChange={(e) => setRentStatusFilter(e.target.value)}
                    >
                      {["All Rent Status", ...RENT_STATUS_OPTIONS.map((o) => o.value)].map((v) => <option key={v}>{v}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setBulkUploadType("companies")}
                      className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-slate-100 hover:border-slate-500 text-slate-500 transition-all active:scale-95 shadow-sm"
                      title="Bulk upload companies"
                    >
                      <UploadCloud size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Plus size={13} strokeWidth={3} /> ADD COMPANY
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[1000px] text-left">
                    <thead className="bg-white text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                      <tr>
                        <th className="px-3.5 py-2 min-w-[220px]">Company</th>
                        <th className="px-3.5 py-2 min-w-[180px]">Plan</th>
                        <th className="px-3.5 py-2">Monthly Rent</th>
                        <th className="px-3.5 py-2">Advance</th>
                        <th className="px-3.5 py-2">Term End</th>
                        <th className="px-3.5 py-2">Rent Status</th>
                        <th className="px-3.5 py-2 text-center">Status</th>
                        <th className="px-3.5 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {records.map((record) => {
                        const st = statusMeta(record.status);
                        const rt = rentMeta(record.rentStatus);
                        return (
                          <tr key={record._id || record.recordId} className="hover:bg-blue-50/30 transition-all group">
                            <td className="px-3.5 py-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/department-accesses/sales-department/virtual-offices/${record._id || record.recordId}`)}
                                className="flex items-center gap-3 text-left"
                              >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black shadow-sm shrink-0 border border-slate-200">
                                  {record.initials || getInitials(record.clientName || record.brandName)}
                                </div>
                                <div>
                                  <p className="font-pmedium text-primary text-sm break-words" title={record.clientName || record.brandName}>{record.clientName || record.brandName}</p>
                                  <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mt-0.5">{record.recordCode}</p>
                                </div>
                              </button>
                            </td>
                            <td className="px-3.5 py-2">
                              <p className="font-pmedium text-slate-800 text-xs">{record.serviceName || "Virtual Office"}</p>
                              <p className="text-[10px] font-pmedium text-slate-400">{record.totalDesks} desks · {record.totalMeetingCredits} credits</p>
                            </td>
                            <td className="px-3.5 py-2 font-pmedium text-slate-800 text-xs">{fmt(record.monthlyRent)}</td>
                            <td className="px-3.5 py-2 font-pmedium text-slate-600 text-xs">{fmt(record.advanceAmount)}</td>
                            <td className="px-3.5 py-2 font-pmedium text-slate-600 text-xs">{formatDate(record.termEnd)}</td>
                            <td className="px-3.5 py-2">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest ${rt.className}`}>{rt.label}</span>
                            </td>
                            <td className="px-3.5 py-2 text-center">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest ${st.className}`}>{st.label}</span>
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/department-accesses/sales-department/virtual-offices/${record._id || record.recordId}`)}
                                  className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                                  title="View details"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(record)}
                                  className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                {RENEWABLE_STATUSES.has(record.status) && (
                                  <button
                                    type="button"
                                    onClick={() => setRenewingRecord(record)}
                                    className="p-2 bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 rounded-lg transition-all shadow-sm"
                                    title="Renew contract"
                                  >
                                    <RefreshCw size={14} />
                                  </button>
                                )}
                                {/* Delete hidden for now — re-enable by uncommenting when needed.
                                <button
                                  type="button"
                                  onClick={() => handleDelete(record)}
                                  className="p-2 bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-all shadow-sm"
                                  title="Delete"
                                >
                                  <X size={14} />
                                </button>
                                */}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {records.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-20 text-slate-400 font-pmedium bg-slate-50/50">No virtual office companies match the current filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </React.Fragment>
            )}

            {/* ===== COLLECTIONS TAB ===== */}
            {activeTab === "collections" && (
              <React.Fragment>
                <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 shrink-0 bg-slate-50/50">
                  <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {["All Rent Status", ...RENT_STATUS_OPTIONS.map((o) => o.value)].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setCollectionStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                          collectionStatusFilter === status
                            ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                            : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                        }`}
                      >
                        {status === "All Rent Status" ? "All" : status}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input
                        type="text"
                        placeholder="Search company..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                        value={collectionSearch}
                        onChange={(e) => setCollectionSearch(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setBulkUploadType("payments")}
                      className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-slate-100 hover:border-slate-500 text-slate-500 transition-all active:scale-95 shadow-sm"
                      title="Bulk upload rent payments"
                    >
                      <UploadCloud size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPaymentPicker(true)}
                      className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <CreditCard size={13} strokeWidth={2.5} /> RECORD PAYMENT
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[820px] text-left">
                    <thead className="bg-white text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                      <tr>
                        <th className="px-3.5 py-2 min-w-[220px]">Company</th>
                        <th className="px-3.5 py-2">Monthly Rent</th>
                        <th className="px-3.5 py-2">Payment Records</th>
                        <th className="px-3.5 py-2">Rent Status</th>
                        <th className="px-3.5 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredCompanies.map((record) => {
                        const companyId = record._id || record.recordId;
                        const companyName = record.clientName || record.brandName;
                        const rt = rentMeta(record.rentStatus);
                        const paymentCount = Array.isArray(record.paymentRecords) ? record.paymentRecords.length : 0;
                        return (
                          <tr key={companyId} className="hover:bg-blue-50/30 transition-all group">
                            <td className="px-3.5 py-2">
                              <button type="button" onClick={() => setViewingRecord(record)} className="flex items-center gap-3 text-left">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black shadow-sm shrink-0 border border-slate-200">
                                  {record.initials || getInitials(companyName)}
                                </div>
                                <div>
                                  <p className="font-pmedium text-primary text-sm break-words" title={companyName}>{companyName}</p>
                                  <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mt-0.5">{record.recordCode}</p>
                                </div>
                              </button>
                            </td>
                            <td className="px-3.5 py-2 font-pmedium text-slate-800 text-xs">{fmt(record.monthlyRent)}</td>
                            <td className="px-3.5 py-2 font-pmedium text-slate-600 text-xs">{paymentCount} record{paymentCount === 1 ? "" : "s"}</td>
                            <td className="px-3.5 py-2">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest ${rt.className}`}>{rt.label}</span>
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingRecord(record)}
                                  className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                                  title="View rent details"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPayingRecord(record)}
                                  className="p-2 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-all shadow-sm"
                                  title="Record payment"
                                >
                                  <CreditCard size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCompanies.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-20 text-slate-400 font-pmedium bg-slate-50/50">No companies match the current filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </React.Fragment>
            )}
          </div>
        </PageFrame>
      </div>

      <VirtualOfficeFormModal
        open={showModal}
        mode={modalMode}
        initialRecord={editingRecord}
        onClose={() => setShowModal(false)}
        onSaved={handleModalSaved}
      />

      <VirtualOfficeRenewModal
        open={Boolean(renewingRecord)}
        record={renewingRecord}
        onClose={() => setRenewingRecord(null)}
        onRenewed={() => loadRecords()}
      />

      <VirtualOfficePaymentModal
        open={Boolean(payingRecord) || showPaymentPicker}
        record={payingRecord}
        records={records}
        onClose={() => {
          setPayingRecord(null);
          setShowPaymentPicker(false);
        }}
        onRecorded={() => loadRecords()}
      />

      <VirtualOfficeRentDetailsModal
        open={Boolean(viewingRecord)}
        record={viewingRecord}
        onClose={() => setViewingRecord(null)}
      />

      <VirtualOfficeBulkUploadModal
        open={Boolean(bulkUploadType)}
        type={bulkUploadType || "companies"}
        records={records}
        onClose={() => setBulkUploadType(null)}
        onImported={() => loadRecords()}
      />
    </>
  );
}
