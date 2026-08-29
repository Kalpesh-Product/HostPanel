import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Search, Plus, Eye, X, ShieldCheck, AlertTriangle,
  Users, Wallet, Receipt, CheckCircle2, Clock, Loader2, CreditCard,
  LayoutGrid, Banknote, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import {
  getVirtualOffices,
  createVirtualOffice,
  deleteVirtualOffice,
} from "../../../services/virtual-offices";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import PageFrame from "../../../components/Pages/PageFrame";
import { SalesTenantCompaniesSkeleton } from "../../../components/ui/SalesPageSkeletons";

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

const PAYMENT_STATUS_OPTIONS = [
  { value: "Paid", label: "Paid", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "Partially Paid", label: "Partially Paid", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "Pending", label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "Overdue", label: "Overdue", className: "border-rose-200 bg-rose-50 text-rose-700" },
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

const BILLING_MONTH_DAYS = 30;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function parseDateForInput(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const EMPTY_FORM = {
  clientName: "",
  brandName: "",
  sector: "",
  email: "",
  phone: "",
  serviceName: "",
  hoPoc: { name: "", email: "", phone: "", address: "" },
  localPoc: { name: "", email: "", phone: "", address: "" },
  openDesks: "",
  openDeskRate: "",
  cabinDesks: "",
  cabinDeskRate: "",
  monthlyRent: "",
  perDeskMeetingCredits: "",
  totalMeetingCredits: "",
  totalTerm: "",
  annualIncrement: "",
  rentDate: "",
  rentStatus: "Active",
  advanceMonths: "1",
  securityDeposit: "",
  securityDepositPaid: false,
  notes: "",
};

function computeCalculations(form) {
  const openDesks = Math.max(0, toNumber(form.openDesks));
  const openDeskRate = Math.max(0, toNumber(form.openDeskRate));
  const cabinDesks = Math.max(0, toNumber(form.cabinDesks));
  const cabinDeskRate = Math.max(0, toNumber(form.cabinDeskRate));

  const openTotal = Math.round(openDesks * openDeskRate * BILLING_MONTH_DAYS);
  const cabinTotal = Math.round(cabinDesks * cabinDeskRate * BILLING_MONTH_DAYS);
  const totalDesks = openDesks + cabinDesks;
  const computedMonthly = Math.round(openTotal + cabinTotal);

  const monthlyRent = Math.max(0, toNumber(form.monthlyRent)) || computedMonthly;
  const totalTerm = Math.max(0, toNumber(form.totalTerm));
  const annualIncrement = Math.max(0, toNumber(form.annualIncrement));
  const advanceMonths = Math.max(0, toNumber(form.advanceMonths) || 1);
  const totalContract = monthlyRent * totalTerm;
  const securityDeposit = Math.max(0, toNumber(form.securityDeposit)) || Math.round(totalContract * 0.25);
  const advanceAmount = Math.round(monthlyRent * advanceMonths);
  const initialAmount = securityDeposit + advanceAmount;
  const perDeskMeetingCredits = Math.max(0, toNumber(form.perDeskMeetingCredits));
  const totalMeetingCredits = Math.max(0, toNumber(form.totalMeetingCredits)) || Math.round(perDeskMeetingCredits * totalDesks);

  return {
    openTotal,
    cabinTotal,
    totalDesks,
    monthlyRent,
    totalContract,
    securityDeposit,
    advanceAmount,
    initialAmount,
    totalMeetingCredits,
  };
}

function Field({ label, required = false, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? <p className="mt-0.5 text-[10px] font-pmedium text-rose-600">{error}</p> : null}
    </label>
  );
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200/60 rounded-xl text-[13px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400";

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
  const [collectionStatusFilter, setCollectionStatusFilter] = useState("All Payments");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  const workspacePreferences = useWorkspacePreferences();
  const navigate = useNavigate();
  const currency = workspacePreferences.currency;
  const fmt = useCallback(
    (v) => formatWorkspaceCurrency(Math.round(Number(v || 0)), currency, { maximumFractionDigits: 0 }),
    [currency],
  );

  const recalc = useMemo(() => {
    try {
      return computeCalculations(form);
    } catch {
      return computeCalculations(EMPTY_FORM);
    }
  }, [form]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const settlePoc = (key, field, value) => {
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.clientName.trim() && !form.brandName.trim()) errors.clientName = "Client / brand name is required.";
    if (!form.localPoc.name.trim()) errors.localPocName = "Local POC name is required.";
    if (!form.hoPoc.name.trim()) errors.hoPocName = "HO POC name is required.";
    if (!Number.isFinite(toNumber(form.monthlyRent)) || toNumber(form.monthlyRent) <= 0) errors.monthlyRent = "Monthly rent is required.";
    if (!Number.isFinite(toNumber(form.totalTerm)) || toNumber(form.totalTerm) <= 0) errors.totalTerm = "Contract term is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        ...recalc,
        clientName: form.clientName.trim(),
        brandName: form.brandName.trim(),
        openDesks: toNumber(form.openDesks),
        openDeskRate: toNumber(form.openDeskRate),
        cabinDesks: toNumber(form.cabinDesks),
        cabinDeskRate: toNumber(form.cabinDeskRate),
        totalTerm: toNumber(form.totalTerm),
        annualIncrement: toNumber(form.annualIncrement),
        advanceMonths: toNumber(form.advanceMonths),
        perDeskMeetingCredits: toNumber(form.perDeskMeetingCredits),
        rentDate: form.rentDate ? new Date(form.rentDate).toISOString() : null,
      };
      const response = await createVirtualOffice(payload);
      const created = response?.data?.record;
      toast.success("Virtual office company onboarded successfully.");
      setShowModal(false);
      await loadRecords();
      const createdId = created?._id || created?.recordId;
      if (createdId) {
        navigate(`/department-accesses/sales-department/virtual-offices/${createdId}`);
      }
    } catch (error) {
      toast.error(error.message || "Failed to onboard virtual office company.");
    } finally {
      setIsSaving(false);
    }
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

  const filteredPayments = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    return paymentLedger.filter((payment) => {
      const matchesSearch = !q ||
        String(payment.companyName || "").toLowerCase().includes(q) ||
        String(payment.monthLabel || "").toLowerCase().includes(q) ||
        String(payment.transactionId || "").toLowerCase().includes(q);
      const matchesStatus = collectionStatusFilter === "All Payments" || payment.status === collectionStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [paymentLedger, collectionSearch, collectionStatusFilter]);

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
                                  onClick={() => handleDelete(record)}
                                  className="p-2 bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-all shadow-sm"
                                  title="Delete"
                                >
                                  <X size={14} />
                                </button>
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
                    {["All Payments", "Paid", "Partially Paid", "Pending", "Overdue"].map((status) => (
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
                        {status === "All Payments" ? "All" : status.replace(" Partially Paid", " Partial")}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full xl:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search company, month or transaction..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-white text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                      <tr>
                        <th className="px-3.5 py-2 min-w-[200px]">Company</th>
                        <th className="px-3.5 py-2">Billing Month</th>
                        <th className="px-3.5 py-2">Period</th>
                        <th className="px-3.5 py-2">Amount</th>
                        <th className="px-3.5 py-2">Method</th>
                        <th className="px-3.5 py-2">Transaction</th>
                        <th className="px-3.5 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredPayments.map((payment, idx) => {
                        const meta = getStatusMeta(payment.status, PAYMENT_STATUS_OPTIONS);
                        return (
                          <tr key={`${payment.companyId}-${idx}`} className="hover:bg-blue-50/30 transition-all group">
                            <td className="px-3.5 py-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/department-accesses/sales-department/virtual-offices/${payment.companyId}`)}
                                className="flex items-center gap-3 text-left"
                              >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black shadow-sm shrink-0 border border-slate-200">
                                  {payment.companyInitials || getInitials(payment.companyName)}
                                </div>
                                <div>
                                  <p className="font-pmedium text-primary text-sm break-words" title={payment.companyName}>{payment.companyName}</p>
                                  <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mt-0.5">{payment.companyCode}</p>
                                </div>
                              </button>
                            </td>
                            <td className="px-3.5 py-2 font-pmedium text-slate-800 text-xs">{payment.monthLabel || formatDate(payment.periodStart) || "--"}</td>
                            <td className="px-3.5 py-2">
                              <p className="font-pmedium text-slate-600 text-xs">{formatDate(payment.periodStart)}</p>
                              <p className="text-[10px] font-pmedium text-slate-400">to {formatDate(payment.periodEnd)}</p>
                            </td>
                            <td className="px-3.5 py-2 font-pmedium text-slate-900 text-sm">{fmt(payment.amount)}</td>
                            <td className="px-3.5 py-2 font-pmedium text-slate-600 text-xs">{payment.paymentMethod || "--"}</td>
                            <td className="px-3.5 py-2">
                              <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{payment.transactionId || "--"}</p>
                            </td>
                            <td className="px-3.5 py-2 text-center">
                              <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest ${meta.className}`}>{meta.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredPayments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-20 text-slate-400 font-pmedium bg-slate-50/50">
                            {paymentLedger.length === 0
                              ? "No rent payments recorded yet. Record a payment from a company's profile."
                              : "No payments match the current filters."}
                          </td>
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

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-[#0F172A]/40 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-pmedium text-primary uppercase">Onboard Virtual Office Company</h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">Enter company details and rental plan; amounts are calculated automatically.</p>
              </div>
              <button onClick={() => setShowModal(false)} type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><Building2 size={14} /> Company Profile</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Client Name" required error={fieldErrors.clientName}>
                      <input className={inputClass} value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} placeholder="e.g. AKIRA BUSINESS SERVICES" />
                    </Field>
                    <Field label="Brand Name">
                      <input className={inputClass} value={form.brandName} onChange={(e) => setField("brandName", e.target.value)} placeholder="Brand name" />
                    </Field>
                    <Field label="Sector">
                      <input className={inputClass} value={form.sector} onChange={(e) => setField("sector", e.target.value)} placeholder="e.g. Consulting" />
                    </Field>
                    <Field label="Service / Package">
                      <input className={inputClass} value={form.serviceName} onChange={(e) => setField("serviceName", e.target.value)} placeholder="e.g. Virtual Office Basic" />
                    </Field>
                    <Field label="Email">
                      <input className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="company@example.com" />
                    </Field>
                    <Field label="Phone">
                      <input className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+91..." />
                    </Field>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><Users size={14} /> Points of Contact</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="mb-3 text-[10px] font-pmedium uppercase tracking-widest text-blue-600">HO POC</p>
                      <div className="space-y-3">
                        <Field label="Name" required error={fieldErrors.hoPocName}>
                          <input className={inputClass} value={form.hoPoc.name} onChange={(e) => settlePoc("hoPoc", "name", e.target.value)} />
                        </Field>
                        <Field label="Email"><input className={inputClass} value={form.hoPoc.email} onChange={(e) => settlePoc("hoPoc", "email", e.target.value)} /></Field>
                        <Field label="Phone"><input className={inputClass} value={form.hoPoc.phone} onChange={(e) => settlePoc("hoPoc", "phone", e.target.value)} /></Field>
                        <Field label="Address"><input className={inputClass} value={form.hoPoc.address} onChange={(e) => settlePoc("hoPoc", "address", e.target.value)} /></Field>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="mb-3 text-[10px] font-pmedium uppercase tracking-widest text-emerald-600">Local POC</p>
                      <div className="space-y-3">
                        <Field label="Name" required error={fieldErrors.localPocName}>
                          <input className={inputClass} value={form.localPoc.name} onChange={(e) => settlePoc("localPoc", "name", e.target.value)} />
                        </Field>
                        <Field label="Email"><input className={inputClass} value={form.localPoc.email} onChange={(e) => settlePoc("localPoc", "email", e.target.value)} /></Field>
                        <Field label="Phone"><input className={inputClass} value={form.localPoc.phone} onChange={(e) => settlePoc("localPoc", "phone", e.target.value)} /></Field>
                        <Field label="Address"><input className={inputClass} value={form.localPoc.address} onChange={(e) => settlePoc("localPoc", "address", e.target.value)} /></Field>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><LayoutGrid size={14} /> Rental Plan &amp; Calculations</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Open Desks">
                      <input type="number" min="0" className={inputClass} value={form.openDesks} onChange={(e) => setField("openDesks", e.target.value)} />
                    </Field>
                    <Field label="Open Desk Rate (per day)">
                      <input type="number" min="0" className={inputClass} value={form.openDeskRate} onChange={(e) => setField("openDeskRate", e.target.value)} />
                    </Field>
                    <Field label="Cabin Desks">
                      <input type="number" min="0" className={inputClass} value={form.cabinDesks} onChange={(e) => setField("cabinDesks", e.target.value)} />
                    </Field>
                    <Field label="Cabin Desk Rate (per day)">
                      <input type="number" min="0" className={inputClass} value={form.cabinDeskRate} onChange={(e) => setField("cabinDeskRate", e.target.value)} />
                    </Field>
                    <Field label="Monthly Rent" required error={fieldErrors.monthlyRent}>
                      <input type="number" min="0" className={inputClass} value={form.monthlyRent} onChange={(e) => setField("monthlyRent", e.target.value)} />
                    </Field>
                    <Field label="Term (months)" required error={fieldErrors.totalTerm}>
                      <input type="number" min="1" className={inputClass} value={form.totalTerm} onChange={(e) => setField("totalTerm", e.target.value)} />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Open Desks Total", value: fmt(recalc.openTotal) },
                      { label: "Cabin Total", value: fmt(recalc.cabinTotal) },
                      { label: "Total Desks", value: recalc.totalDesks },
                      { label: "Contract Total", value: fmt(recalc.totalContract) },
                      { label: "Security Deposit (25%)", value: fmt(recalc.securityDeposit) },
                      { label: "Advance (rent × months)", value: fmt(recalc.advanceAmount) },
                      { label: "Initial Amount", value: fmt(recalc.initialAmount) },
                      { label: "Meeting Credits", value: recalc.totalMeetingCredits },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-pmedium uppercase tracking-wide text-slate-400">{item.label}</p>
                        <p className="mt-1 text-base font-pmedium text-blue-700">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Annual Increment (%)">
                      <input type="number" min="0" className={inputClass} value={form.annualIncrement} onChange={(e) => setField("annualIncrement", e.target.value)} />
                    </Field>
                    <Field label="Advance Rent (months)">
                      <input type="number" min="0" className={inputClass} value={form.advanceMonths} onChange={(e) => setField("advanceMonths", e.target.value)} />
                    </Field>
                    <Field label="Rent Date">
                      <input type="date" className={inputClass} value={parseDateForInput(form.rentDate)} onChange={(e) => setField("rentDate", e.target.value)} />
                    </Field>
                    <Field label="Per-Desk Meeting Credits">
                      <input type="number" min="0" className={inputClass} value={form.perDeskMeetingCredits} onChange={(e) => setField("perDeskMeetingCredits", e.target.value)} />
                    </Field>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><Banknote size={14} /> Security Deposit &amp; Notes</h3>
                  <label className="flex items-center gap-2 text-sm font-pmedium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.securityDepositPaid}
                      onChange={(e) => setField("securityDepositPaid", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#2563EB] accent-[#2563EB]"
                    />
                    Security deposit received
                  </label>
                  <div className="mt-3">
                    <Field label="Notes">
                      <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
                    </Field>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setShowModal(false)} type="button" className="rounded-xl px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-100" disabled={isSaving}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {isSaving ? "Onboarding..." : "Onboard Company"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
