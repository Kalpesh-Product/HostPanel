import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Mail, Phone, Wallet, ShieldCheck, CalendarDays,
  Users, LayoutGrid, CreditCard, X, Loader2, CheckCircle2, AlertTriangle,
  Percent, MapPin, Package, Receipt, FileText, Pencil, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getVirtualOffice,
  recordVirtualOfficeRentPayment,
  deleteVirtualOffice,
} from "../../../services/virtual-offices";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import PageFrame from "../../../components/Pages/PageFrame";
import { SalesTenantCompaniesSkeleton } from "../../../components/ui/SalesPageSkeletons";
import VirtualOfficeFormModal from "./VirtualOfficeFormModal";
import VirtualOfficeRenewModal from "./VirtualOfficeRenewModal";

const RENEWABLE_STATUSES = new Set(["Expiring Soon", "Expired"]);

const RENT_STATUS = [
  { value: "Active", label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "Overdue", label: "Overdue", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "Pending", label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "Cancelled", label: "Cancelled", className: "border-slate-200 bg-slate-100 text-slate-600" },
];

const RECORD_STATUS = [
  { value: "Onboarding", label: "Onboarding", className: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "Onboarded", label: "Onboarded", className: "border-violet-200 bg-violet-50 text-violet-700" },
  { value: "Active", label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "Expiring Soon", label: "Expiring Soon", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "Expired", label: "Expired", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "Cancelled", label: "Cancelled", className: "border-slate-200 bg-slate-100 text-slate-600" },
];

const PAYMENT_STATUS = [
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

function getMeta(value, list) {
  return list.find((i) => i.value === value) || { label: value || "--", className: "border-slate-200 bg-slate-100 text-slate-600" };
}

function getInitials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "VO";
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200/60 rounded-xl text-[13px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400";

export default function VirtualOfficeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const workspacePreferences = useWorkspacePreferences();
  const currency = workspacePreferences.currency;
  const fmt = useCallback(
    (v) => formatWorkspaceCurrency(Math.round(Number(v || 0)), currency, { maximumFractionDigits: 0 }),
    [currency],
  );

  const [payment, setPayment] = useState({
    monthLabel: "",
    periodStart: "",
    periodEnd: "",
    amount: "",
    transactionId: "",
    paymentMethod: "",
    status: "Paid",
    notes: "",
  });

  const loadRecord = useCallback(async () => {
    try {
      const response = await getVirtualOffice(id);
      setRecord(response?.data?.record || null);
    } catch (error) {
      toast.error(error.message || "Failed to load virtual office record.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const openPaymentModal = () => {
    setPayment({ ...payment, amount: record?.monthlyRent || "", monthLabel: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }) });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!Number(payment.amount)) {
      toast.error("Enter the payment amount.");
      return;
    }
    setSaving(true);
    try {
      await recordVirtualOfficeRentPayment(record._id || record.recordId, {
        monthLabel: payment.monthLabel,
        periodStart: payment.periodStart || null,
        periodEnd: payment.periodEnd || null,
        amount: Number(payment.amount),
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        notes: payment.notes,
      });
      toast.success("Rent payment recorded.");
      setShowPaymentModal(false);
      await loadRecord();
    } catch (error) {
      toast.error(error.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this virtual office record? This cannot be undone.")) return;
    try {
      await deleteVirtualOffice(record._id || record.recordId);
      toast.success("Virtual office record deleted.");
      navigate("/department-accesses/sales-department/virtual-offices", { replace: true });
    } catch (error) {
      toast.error(error.message || "Failed to delete record.");
    }
  };

  const handleGoBack = () => navigate("/department-accesses/sales-department/virtual-offices");

  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame><SalesTenantCompaniesSkeleton /></PageFrame>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="rounded-[2rem] border border-slate-100 bg-white p-10 text-center">
            <p className="text-sm font-pmedium text-slate-600">Virtual office record not found.</p>
            <button onClick={handleGoBack} type="button" className="mt-3 inline-block text-xs font-pmedium text-blue-600 hover:underline">
              Back to Virtual Office Companies
            </button>
          </div>
        </PageFrame>
      </div>
    );
  }

  const st = getMeta(record.status, RECORD_STATUS);
  const rt = getMeta(record.rentStatus, RENT_STATUS);
  const companyName = record.clientName || record.brandName;

  const statCards = [
    { key: "rent", label: "Monthly Rent", value: fmt(record.monthlyRent), icon: Wallet, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md", iconClass: "bg-blue-50 text-blue-600" },
    { key: "advance", label: "Advance", value: fmt(record.advanceAmount), icon: CreditCard, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-violet-500", iconClass: "bg-violet-50 text-violet-600" },
    { key: "deposit", label: "Security Deposit", value: fmt(record.securityDeposit), icon: ShieldCheck, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500", iconClass: "bg-emerald-50 text-emerald-600" },
    { key: "initial", label: "Initial Amount", value: fmt(record.initialAmount), icon: CheckCircle2, cardClass: "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500", iconClass: "bg-amber-50 text-amber-600" },
  ];

  const tabs = [
    { id: "profile", label: "Company Profile", icon: Building2 },
    { id: "plan", label: "Rental Plan & Calculations", icon: LayoutGrid },
    { id: "payments", label: "Rent Payments", icon: Receipt },
  ];

  return (
    <>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button onClick={handleGoBack} type="button" className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm">
                <ArrowLeft size={16} />
              </button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center text-sm font-black shadow-sm shrink-0">
                  {record.initials || getInitials(companyName)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-pmedium text-primary uppercase truncate">{companyName}</h2>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest ${st.className}`}>{st.label}</span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest ${rt.className}`}>{rt.label}</span>
                  </div>
                  <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mt-0.5">{record.recordCode} · {record.serviceName || "Virtual Office"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button onClick={() => setShowEditModal(true)} type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900">
                  <Pencil size={13} /> Edit
                </button>
                {RENEWABLE_STATUSES.has(record.status) && (
                  <button onClick={() => setShowRenewModal(true)} type="button" className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-amber-700 shadow-sm transition hover:bg-amber-100">
                    <RefreshCw size={13} /> Renew Contract
                  </button>
                )}
                <button onClick={openPaymentModal} type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition hover:bg-blue-700">
                  <CreditCard size={13} /> Record Payment
                </button>
                {/* Delete hidden for now — re-enable by uncommenting when needed.
                <button onClick={handleDelete} type="button" className="rounded-xl border border-rose-200 px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-rose-600 transition hover:bg-rose-50">
                  Delete
                </button>
                */}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              {statCards.map((card) => {
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

            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                    <Icon size={14} />{tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "profile" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-xs font-pmedium uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><FileText size={14} /> Company Profile</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Info label="Brand Name" value={record.brandName} icon={Building2} />
                      <Info label="Sector" value={record.sector} icon={Package} />
                      <Info label="Email" value={record.email || "--"} icon={Mail} />
                      <Info label="Phone" value={record.phone || "--"} icon={Phone} />
                      <div className="sm:col-span-2">
                        <Info label="Service / Package" value={record.serviceName || "Virtual Office"} icon={Package} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-xs font-pmedium uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><Users size={14} /> Points of Contact</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 p-4">
                        <p className="mb-2 text-[10px] font-pmedium uppercase tracking-widest text-blue-600">HO POC</p>
                        <Poc poc={record.hoPoc} />
                      </div>
                      <div className="rounded-2xl border border-slate-100 p-4">
                        <p className="mb-2 text-[10px] font-pmedium uppercase tracking-widest text-emerald-600">Local POC</p>
                        <Poc poc={record.localPoc} />
                      </div>
                    </div>
                  </div>
                </div>

                {record.notes ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-xs font-pmedium uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4">Notes</h3>
                    <p className="text-xs font-pmedium text-slate-700">{record.notes}</p>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === "plan" && (
              <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm">
                <h3 className="text-xs font-pmedium uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><LayoutGrid size={14} /> Desk &amp; Rental Breakdown</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Calc label="Open Desks" value={`${record.openDesks || 0} × ${fmt(record.openDeskRate)}/day`} sub={`= ${fmt(record.openTotal)}`} />
                  <Calc label="Cabin Desks" value={`${record.cabinDesks || 0} × ${fmt(record.cabinDeskRate)}/day`} sub={`= ${fmt(record.cabinTotal)}`} />
                  <Calc label="Total Desks" value={record.totalDesks} />
                  <Calc label="Meeting Credits" value={record.totalMeetingCredits} sub={`${record.perDeskMeetingCredits}/desk`} />
                  <Calc label="Annual Increment" value={`${record.annualIncrement || 0}%`} icon={Percent} />
                  <Calc label="Term" value={`${record.totalTerm || 0} months`} />
                  <Calc label="Rent Start Date" value={formatDate(record.rentDate)} icon={CalendarDays} />
                  <Calc label="Next Increment" value={formatDate(record.nextIncrementDate)} icon={CalendarDays} />
                  <Calc label="Term End" value={formatDate(record.termEnd)} icon={CalendarDays} />
                  <Calc label="Past Due" value={formatDate(record.pastDueDate)} icon={AlertTriangle} />
                  <div className="sm:col-span-2 lg:col-span-2">
                    <div className="flex h-full flex-col justify-center rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Current Rent Status</span>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest ${rt.className}`}>{rt.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2"><Receipt size={14} /> Rent Payments</h3>
                  <button onClick={openPaymentModal} type="button" className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-blue-600 transition hover:bg-blue-100">
                    + Add Payment
                  </button>
                </div>
                {Array.isArray(record.paymentRecords) && record.paymentRecords.length === 0 ? (
                  <p className="py-10 text-center text-xs font-pmedium text-slate-400">No rent payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="bg-white text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                        <tr>
                          <th className="px-3.5 py-2">Month</th>
                          <th className="px-3.5 py-2">Period</th>
                          <th className="px-3.5 py-2">Amount</th>
                          <th className="px-3.5 py-2">Method</th>
                          <th className="px-3.5 py-2">Transaction</th>
                          <th className="px-3.5 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {record.paymentRecords.map((p, i) => {
                          const meta = getMeta(p.status, PAYMENT_STATUS);
                          return (
                            <tr key={i} className="hover:bg-blue-50/30 transition-all">
                              <td className="px-3.5 py-2 font-pmedium text-slate-800 text-xs">{p.monthLabel || formatDate(p.periodStart) || "--"}</td>
                              <td className="px-3.5 py-2 font-pmedium text-slate-600 text-xs">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</td>
                              <td className="px-3.5 py-2 font-pmedium text-slate-900 text-sm">{fmt(p.amount)}</td>
                              <td className="px-3.5 py-2 font-pmedium text-slate-600 text-xs">{p.paymentMethod || "--"}</td>
                              <td className="px-3.5 py-2 font-pmedium text-slate-500 text-xs">{p.transactionId || "--"}</td>
                              <td className="px-3.5 py-2 text-center">
                                <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest ${meta.className}`}>{meta.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </PageFrame>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white shadow-2xl border border-white/70">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-pmedium text-slate-800">Record Rent Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Month Label">
                  <input className={inputClass} value={payment.monthLabel} onChange={(e) => setPayment({ ...payment, monthLabel: e.target.value })} />
                </Field>
                <Field label="Amount">
                  <input type="number" min="0" className={inputClass} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
                </Field>
                <Field label="Period Start">
                  <input type="date" className={inputClass} value={payment.periodStart} onChange={(e) => setPayment({ ...payment, periodStart: e.target.value })} />
                </Field>
                <Field label="Period End">
                  <input type="date" className={inputClass} value={payment.periodEnd} onChange={(e) => setPayment({ ...payment, periodEnd: e.target.value })} />
                </Field>
                <Field label="Payment Method">
                  <input className={inputClass} value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })} placeholder="e.g. Bank Transfer" />
                </Field>
                <Field label="Transaction ID">
                  <input className={inputClass} value={payment.transactionId} onChange={(e) => setPayment({ ...payment, transactionId: e.target.value })} />
                </Field>
                <Field label="Status">
                  <select className={inputClass} value={payment.status} onChange={(e) => setPayment({ ...payment, status: e.target.value })}>
                    <option value="Paid">Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </Field>
                <Field label="Notes">
                  <input className={inputClass} value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setShowPaymentModal(false)} disabled={saving} type="button" className="rounded-xl px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 transition hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={handleRecordPayment} disabled={saving} type="button" className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {saving ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <VirtualOfficeFormModal
        open={showEditModal}
        mode="edit"
        initialRecord={record}
        onClose={() => setShowEditModal(false)}
        onSaved={() => loadRecord()}
      />

      <VirtualOfficeRenewModal
        open={showRenewModal}
        record={record}
        onClose={() => setShowRenewModal(false)}
        onRenewed={() => loadRecord()}
      />
    </>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-2">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" /> : null}
      <div>
        <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xs font-pmedium text-slate-900 mt-1">{value || "--"}</p>
      </div>
    </div>
  );
}

function Poc({ poc }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-pmedium text-slate-900 text-xs">{poc?.name || "--"}</p>
      {poc?.email ? <p className="flex items-center gap-1.5 text-[10px] font-pmedium text-slate-500"><Mail className="h-3.5 w-3.5" />{poc.email}</p> : null}
      {poc?.phone ? <p className="flex items-center gap-1.5 text-[10px] font-pmedium text-slate-500"><Phone className="h-3.5 w-3.5" />{poc.phone}</p> : null}
      {poc?.address ? <p className="flex items-center gap-1.5 text-[10px] font-pmedium text-slate-500"><MapPin className="h-3.5 w-3.5" />{poc.address}</p> : null}
    </div>
  );
}

function Calc({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="flex items-center gap-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 text-sm font-pmedium text-slate-900">{value || "--"}</p>
      {sub ? <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{sub}</p> : null}
    </div>
  );
}
