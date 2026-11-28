import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import PageFrame from "@/components/Pages/PageFrame";
import { TablePageSkeleton } from "@/components/ui/Skeleton";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "@/lib/workspaceLocalization";
import {
  archiveFinanceLandlord,
  createFinanceLandlord,
  createLandlordRentRecord,
  generateLandlordRentMonth,
  getFinanceLandlords,
  getLandlordRentRecords,
  recordLandlordRentPayment,
  updateFinanceLandlord,
  updateLandlordRentRecord,
  voidLandlordRentPayment,
} from "@/services/finance";

/**
 * Landlord Payables — the rent the workspace OWES to the owners of the spaces
 * it operates. This is the payable mirror of "Tenant Rent" in Billing &
 * Payments, and the missing cost line for co-living / hostel / workation
 * verticals (rent paid to owners is usually their largest recurring expense).
 *
 * Two registers in one page:
 *   1. Rent Payables — monthly obligations, settled in installments.
 *   2. Landlords    — the owner/lease master those obligations are raised from.
 *
 * Rules reflected in the UI (all enforced server-side):
 *   - Only finance-privileged roles can open this page at all.
 *   - Payments are append-only; a mistake is VOIDED with a reason, never deleted.
 *   - Month generation is idempotent, so nobody can double-charge a month.
 *   - A settled month can't be edited below what was already paid.
 */

type Tab = "payables" | "landlords";

const EMPTY_LANDLORD_FORM = {
  name: "",
  legalName: "",
  propertyName: "",
  unitLabel: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  agreementNumber: "",
  agreementStartDate: "",
  agreementEndDate: "",
  monthlyRent: "",
  securityDepositHeld: "",
  escalationPercent: "",
  paymentDueDay: "5",
  noticePeriodDays: "",
  taxLabel: "",
  taxPercent: "",
  status: "Active",
  notes: "",
};

const EMPTY_RENT_FORM = {
  landlordId: "",
  periodKey: "",
  amount: "",
  taxPercent: "",
  dueDate: "",
  notes: "",
};

const EMPTY_PAYMENT_FORM = {
  amount: "",
  paidOn: new Date().toISOString().slice(0, 10),
  method: "Bank Transfer",
  reference: "",
  note: "",
};

const currentPeriodKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const periodLabel = (periodKey: string) => {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
};

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

function StatusPill({ record }: { record: any }) {
  const tone = record?.isOverdue
    ? "bg-rose-100 text-rose-700"
    : record?.status === "Paid"
      ? "bg-emerald-100 text-emerald-700"
      : record?.status === "Partial"
        ? "bg-indigo-100 text-indigo-700"
        : "bg-amber-100 text-amber-700";
  const label = record?.isOverdue ? "Overdue" : record?.status === "Partial" ? "Partially Paid" : record?.status || "Due";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-wider ${tone}`}>
      {label}
    </span>
  );
}

function AgreementPill({ landlord }: { landlord: any }) {
  const tone =
    landlord?.agreementState === "Expired"
      ? "bg-rose-100 text-rose-700"
      : landlord?.agreementState === "Expiring soon"
        ? "bg-amber-100 text-amber-700"
        : landlord?.agreementState === "Active"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-wider ${tone}`}>
      {landlord?.agreementState || "Not set"}
    </span>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
        {label} {required ? <span className="text-red-400">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[9px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all";

function Modal({
  title,
  subtitle,
  badge,
  icon,
  onClose,
  children,
  footer,
  maxWidth = "max-w-2xl",
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
      <div className={`bg-white rounded-[1.75rem] w-full ${maxWidth} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-start shrink-0">
          <div className="min-w-0">
            {badge ? (
              <span className="px-2 py-0.5 rounded border text-[9px] font-pmedium uppercase tracking-widest bg-blue-50 text-blue-600 border-blue-200 mb-2 inline-block">
                {badge}
              </span>
            ) : null}
            <h2 className="text-lg font-pmedium text-slate-900 flex items-center gap-2 mt-1">
              {icon}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle ? (
              <p className="text-[10px] font-pmedium text-slate-400 uppercase mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 bg-white px-6 sm:px-8 py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function LandlordPayablesPage() {
  const preferences = useWorkspacePreferences();
  const money = (value: number) =>
    formatWorkspaceCurrency(Number(value || 0), preferences.currency, {
      maximumFractionDigits: 0,
    });

  const [tab, setTab] = useState<Tab>("payables");
  const [period, setPeriod] = useState<string>(currentPeriodKey());
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");

  const [payables, setPayables] = useState<any[]>([]);
  const [paySummary, setPaySummary] = useState<any>({});
  const [landlords, setLandlords] = useState<any[]>([]);
  const [landlordSummary, setLandlordSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [landlordForm, setLandlordForm] = useState<any>(null); // { editingId?: string, ...fields }
  const [rentForm, setRentForm] = useState<any>(null);
  const [paymentFor, setPaymentFor] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [detail, setDetail] = useState<any>(null);
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [voidReason, setVoidReason] = useState("");
  const [editRentFor, setEditRentFor] = useState<any>(null);
  const [editRentForm, setEditRentForm] = useState({ amount: "", dueDate: "", notes: "" });

  const periodOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let index = 0; index < 18; index += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    }
    return options;
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const query: Record<string, any> = {};
    if (period !== "All") query.periodKey = period;

    const [payablesResult, landlordsResult] = await Promise.allSettled([
      getLandlordRentRecords(query),
      getFinanceLandlords({ status: "All" }),
    ]);

    if (payablesResult.status === "fulfilled") {
      const payload = payablesResult.value || {};
      setPayables(Array.isArray(payload.records) ? payload.records : []);
      setPaySummary(payload.summary || {});
    } else {
      setPayables([]);
      setPaySummary({});
      setError(errorMessage(payablesResult.reason, "Could not load landlord rent payables."));
    }

    if (landlordsResult.status === "fulfilled") {
      const payload = landlordsResult.value || {};
      setLandlords(Array.isArray(payload.landlords) ? payload.landlords : []);
      setLandlordSummary(payload.summary || {});
    } else {
      setLandlords([]);
      setLandlordSummary({});
      setError((previous) =>
        previous || errorMessage(landlordsResult.reason, "Could not load the landlord master."),
      );
    }

    setIsLoading(false);
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeLandlords = useMemo(
    () => landlords.filter((landlord) => landlord.status === "Active"),
    [landlords],
  );

  const visiblePayables = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payables.filter((record) => {
      if (status !== "All") {
        if (status === "Overdue" && !record.isOverdue) return false;
        if (status !== "Overdue" && record.status !== status) return false;
      }
      if (!term) return true;
      return [record.landlordName, record.propertyName, record.unitLabel, record.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [payables, search, status]);

  const visibleLandlords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return landlords.filter((landlord) => {
      if (status !== "All" && landlord.status !== status) return false;
      if (!term) return true;
      return [landlord.name, landlord.propertyName, landlord.unitLabel, landlord.agreementNumber, landlord.contactPerson]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [landlords, search, status]);

  /* ── Actions ─────────────────────────────────────────────────────────── */

  const submitLandlord = async () => {
    if (!landlordForm) return;
    if (!String(landlordForm.name || "").trim()) {
      toast.error("Landlord name is required.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: landlordForm.name,
        legalName: landlordForm.legalName,
        propertyName: landlordForm.propertyName,
        unitLabel: landlordForm.unitLabel,
        contactPerson: landlordForm.contactPerson,
        phone: landlordForm.phone,
        email: landlordForm.email,
        address: landlordForm.address,
        agreementNumber: landlordForm.agreementNumber,
        agreementStartDate: landlordForm.agreementStartDate || null,
        agreementEndDate: landlordForm.agreementEndDate || null,
        monthlyRent: Number(landlordForm.monthlyRent || 0),
        securityDepositHeld: Number(landlordForm.securityDepositHeld || 0),
        escalationPercent: Number(landlordForm.escalationPercent || 0),
        paymentDueDay: Number(landlordForm.paymentDueDay || 5),
        noticePeriodDays: Number(landlordForm.noticePeriodDays || 0),
        taxLabel: landlordForm.taxLabel,
        taxPercent: Number(landlordForm.taxPercent || 0),
        notes: landlordForm.notes,
        ...(landlordForm.editingId ? { status: landlordForm.status } : {}),
      };
      if (landlordForm.editingId) {
        await updateFinanceLandlord(landlordForm.editingId, payload);
        toast.success("Landlord updated.");
      } else {
        await createFinanceLandlord(payload);
        toast.success("Landlord added.");
      }
      setLandlordForm(null);
      await load();
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not save the landlord."));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArchive = async (landlord: any) => {
    const archived = landlord.status !== "Archived";
    setIsSaving(true);
    try {
      await archiveFinanceLandlord(landlord.id, archived);
      toast.success(archived ? "Landlord archived." : "Landlord reactivated.");
      await load();
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not change the landlord status."));
    } finally {
      setIsSaving(false);
    }
  };

  const submitRent = async () => {
    if (!rentForm) return;
    if (!rentForm.landlordId) {
      toast.error("Select a landlord first.");
      return;
    }
    setIsSaving(true);
    try {
      await createLandlordRentRecord({
        landlordId: rentForm.landlordId,
        periodKey: rentForm.periodKey || currentPeriodKey(),
        amount: Number(rentForm.amount || 0),
        taxPercent: Number(rentForm.taxPercent || 0),
        dueDate: rentForm.dueDate || undefined,
        notes: rentForm.notes,
      });
      toast.success("Rent payable raised.");
      setRentForm(null);
      await load();
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not raise the rent payable."));
    } finally {
      setIsSaving(false);
    }
  };

  const generateMonth = async () => {
    setIsSaving(true);
    try {
      const result: any = await generateLandlordRentMonth(period === "All" ? currentPeriodKey() : period);
      toast.success(result?.message || "Month raised.");
      await load();
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not raise the month."));
    } finally {
      setIsSaving(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentFor) return;
    setIsSaving(true);
    try {
      await recordLandlordRentPayment(paymentFor.id, {
        amount: Number(paymentForm.amount || 0),
        paidOn: paymentForm.paidOn || undefined,
        method: paymentForm.method,
        reference: paymentForm.reference,
        note: paymentForm.note,
      });
      toast.success("Payment recorded.");
      setPaymentFor(null);
      setPaymentForm(EMPTY_PAYMENT_FORM);
      setDetail(null);
      await load();
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not record the payment."));
    } finally {
      setIsSaving(false);
    }
  };

  const submitRentEdit = async () => {
    if (!editRentFor) return;
    setIsSaving(true);
    try {
      await updateLandlordRentRecord(editRentFor.id, {
        amount: Number(editRentForm.amount || 0),
        dueDate: editRentForm.dueDate || undefined,
        notes: editRentForm.notes,
      });
      toast.success("Rent payable updated.");
      setEditRentFor(null);
      setDetail(null);
      await load();
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not update the rent payable."));
    } finally {
      setIsSaving(false);
    }
  };

  const submitVoid = async () => {
    if (!voidTarget) return;
    if (voidReason.trim().length < 3) {
      toast.error("Add a reason (at least 3 characters) before voiding.");
      return;
    }
    setIsSaving(true);
    try {
      await voidLandlordRentPayment(voidTarget.rentId, voidTarget.paymentId, voidReason.trim());
      toast.success("Payment voided. The balance is open again.");
      setVoidTarget(null);
      setVoidReason("");
      setDetail(null);
      await load();
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not void the payment."));
    } finally {
      setIsSaving(false);
    }
  };

  const openPayment = (record: any) => {
    setPaymentFor(record);
    setPaymentForm({
      ...EMPTY_PAYMENT_FORM,
      amount: String(record.balance ?? record.totalAmount ?? ""),
      paidOn: new Date().toISOString().slice(0, 10),
    });
  };

  const openEditRent = (record: any) => {
    setEditRentFor(record);
    setEditRentForm({
      amount: String(record.amount ?? ""),
      dueDate: String(record.dueDate || "").slice(0, 10),
      notes: record.notes || "",
    });
  };

  const openLandlord = (landlord?: any) => {
    setLandlordForm(
      landlord
        ? {
            ...EMPTY_LANDLORD_FORM,
            ...landlord,
            editingId: landlord.id,
            monthlyRent: String(landlord.monthlyRent ?? ""),
            securityDepositHeld: String(landlord.securityDepositHeld ?? ""),
            escalationPercent: String(landlord.escalationPercent ?? ""),
            taxPercent: String(landlord.taxPercent ?? ""),
            paymentDueDay: String(landlord.paymentDueDay ?? 5),
            noticePeriodDays: String(landlord.noticePeriodDays ?? ""),
            agreementStartDate: String(landlord.agreementStartDate || "").slice(0, 10),
            agreementEndDate: String(landlord.agreementEndDate || "").slice(0, 10),
          }
        : { ...EMPTY_LANDLORD_FORM },
    );
  };

  const openRentForm = () => {
    setRentForm({
      ...EMPTY_RENT_FORM,
      periodKey: period === "All" ? currentPeriodKey() : period,
    });
  };

  const statCards = [
    {
      key: "commitment",
      label: "Monthly Commitment",
      value: money(Number(landlordSummary.monthlyCommitment || 0)),
      sub: `${landlordSummary.active ?? 0} active landlords`,
      icon: Wallet,
      accent: "border-l-blue-500",
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: money(Number(paySummary.outstanding || 0)),
      sub: period === "All" ? "All recorded months" : periodLabel(period),
      icon: Clock,
      accent: "border-l-amber-500",
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      key: "paid",
      label: "Paid",
      value: money(Number(paySummary.paidAmount || 0)),
      sub: `${paySummary.paidCount ?? 0} settled months`,
      icon: CheckCircle2,
      accent: "border-l-emerald-500",
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: money(Number(paySummary.overdueAmount || 0)),
      sub: `${paySummary.overdueCount ?? 0} past due date`,
      icon: AlertTriangle,
      accent: "border-l-rose-500",
      iconClass: "bg-rose-50 text-rose-600",
    },
  ];

  if (isLoading && !payables.length && !landlords.length) {
    return <TablePageSkeleton rows={6} columns={6} />;
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Landlord Payables
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Core Module | Rent payable to property owners, with a lease register and an append-only payment ledger
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm">
                <Calendar size={18} className="text-[#2563EB]" />
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className="bg-transparent font-pmedium text-[#0F172A] outline-none cursor-pointer border-none text-xs"
                >
                  <option value="All">All months</option>
                  {periodOptions.map((key) => (
                    <option key={key} value={key}>
                      {periodLabel(key)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                type="button"
                onClick={generateMonth}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:opacity-60"
                title="Raise this month's rent for every active landlord (safe to click twice)"
              >
                <Sparkles size={14} /> Raise month
              </button>
              <button
                type="button"
                onClick={tab === "landlords" ? () => openLandlord() : openRentForm}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium text-white shadow-sm transition-all hover:bg-primary/95"
              >
                <Plus size={14} /> {tab === "landlords" ? "Add landlord" : "Add payable"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-pmedium text-rose-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-wider text-rose-700"
              >
                Retry
              </button>
            </div>
          ) : null}

          {/* ── Tabs ── */}
          <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-100 bg-white p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max flex-nowrap gap-1.5" role="tablist" aria-label="Landlord payable sections">
              {[
                { key: "payables" as Tab, label: "Rent Payables", icon: CreditCard },
                { key: "landlords" as Tab, label: "Landlords", icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => {
                      setTab(item.key);
                      setStatus("All");
                      setSearch("");
                    }}
                    className={`flex min-w-[8.5rem] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all sm:min-w-[10rem] ${
                      tab === item.key
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 ${card.accent}`}
                >
                  <div className="min-w-0">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{card.label}</p>
                    <p className="mt-1 truncate text-[15px] font-pmedium text-slate-900">{card.value}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{card.sub}</p>
                  </div>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${card.iconClass}`}>
                    <Icon size={18} />
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:max-w-sm">
              <Search size={15} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tab === "landlords" ? "Search name, property, agreement no." : "Search landlord, property, unit, reference"}
                className="w-full bg-transparent text-[12px] font-pmedium text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-pmedium text-slate-700 shadow-sm outline-none"
            >
              {tab === "payables" ? (
                <>
                  <option value="All">All statuses</option>
                  <option value="Due">Due</option>
                  <option value="Partial">Partially paid</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </>
              ) : (
                <>
                  <option value="All">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </>
              )}
            </select>
          </div>

          {/* ── Payables table ── */}
          {tab === "payables" ? (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Landlord</th>
                      <th className="px-3 py-3">Property / Unit</th>
                      <th className="px-3 py-3">Period</th>
                      <th className="px-3 py-3">Due date</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                      <th className="px-3 py-3 text-right">Paid</th>
                      <th className="px-3 py-3 text-right">Balance</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visiblePayables.map((record) => (
                      <tr key={record.id || record.recordId} className="text-[11px] text-slate-600 hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <p className="truncate font-pmedium text-slate-900">{record.landlordName}</p>
                          <p className="truncate text-[9px] uppercase tracking-wider text-slate-400">{record.id}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="truncate">{record.propertyName || "—"}</p>
                          <p className="truncate text-[9px] text-slate-400">{record.unitLabel || ""}</p>
                        </td>
                        <td className="px-3 py-3">{record.periodLabel}</td>
                        <td className="px-3 py-3">{record.dueDateLabel || "—"}</td>
                        <td className="px-3 py-3 text-right font-pmedium text-slate-900">{money(record.totalAmount)}</td>
                        <td className="px-3 py-3 text-right">{money(record.paidAmount)}</td>
                        <td className="px-3 py-3 text-right font-pmedium text-slate-900">{money(record.balance)}</td>
                        <td className="px-3 py-3">
                          <StatusPill record={record} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetail(record)}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                              title="View ledger"
                            >
                              <Search size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditRent(record)}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                              title="Edit amount or due date"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openPayment(record)}
                              disabled={record.status === "Paid"}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Record payment"
                            >
                              <Wallet size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visiblePayables.length ? (
                <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <CreditCard className="text-slate-300" size={26} />
                  <p className="text-[12px] font-pmedium text-slate-500">No rent payables for this selection.</p>
                  <p className="max-w-md text-[10px] text-slate-400">
                    Add landlords with a monthly rent, then use <span className="font-pmedium">Raise month</span> to create the
                    payable for every active landlord at once. Re-running it never double-charges a month.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            /* ── Landlords table ── */
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead className="bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Landlord</th>
                      <th className="px-3 py-3">Property / Unit</th>
                      <th className="px-3 py-3">Agreement</th>
                      <th className="px-3 py-3 text-right">Rent / month</th>
                      <th className="px-3 py-3">Due day</th>
                      <th className="px-3 py-3 text-right">Deposit held</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLandlords.map((landlord) => (
                      <tr key={landlord.id} className="text-[11px] text-slate-600 hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <p className="truncate font-pmedium text-slate-900">{landlord.name}</p>
                          <p className="truncate text-[9px] uppercase tracking-wider text-slate-400">
                            {landlord.contactPerson || landlord.phone || "No contact recorded"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="truncate">{landlord.propertyName || "—"}</p>
                          <p className="truncate text-[9px] text-slate-400">{landlord.unitLabel || ""}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <AgreementPill landlord={landlord} />
                            <span className="text-[9px] text-slate-400">
                              {landlord.agreementEndDateLabel ? `ends ${landlord.agreementEndDateLabel}` : "no end date"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-pmedium text-slate-900">{money(landlord.monthlyRent)}</td>
                        <td className="px-3 py-3">{landlord.paymentDueDay}</td>
                        <td className="px-3 py-3 text-right">{money(landlord.securityDepositHeld)}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-wider ${
                              landlord.status === "Active"
                                ? "bg-emerald-100 text-emerald-700"
                                : landlord.status === "Archived"
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {landlord.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openLandlord(landlord)}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                              title="Edit landlord"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleArchive(landlord)}
                              className={`rounded-lg border p-2 transition ${
                                landlord.status === "Archived"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              }`}
                              title={landlord.status === "Archived" ? "Reactivate" : "Archive"}
                            >
                              {landlord.status === "Archived" ? <RefreshCw size={13} /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visibleLandlords.length ? (
                <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <Building2 className="text-slate-300" size={26} />
                  <p className="text-[12px] font-pmedium text-slate-500">No landlords recorded yet.</p>
                  <p className="max-w-md text-[10px] text-slate-400">
                    Add the owners you lease space from — rent, due day, deposit held and the agreement window. That master
                    drives the month generation and the lease-expiry warnings here.
                  </p>
                  <button
                    type="button"
                    onClick={() => openLandlord()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium text-white shadow-sm"
                  >
                    <Plus size={14} /> Add landlord
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </PageFrame>

      {/* ── Landlord form ── */}
      {landlordForm ? (
        <Modal
          title={landlordForm.editingId ? "Edit landlord" : "New landlord"}
          subtitle={landlordForm.editingId ? "Changes apply to future months only" : "Owner / lease register"}
          badge="Lease master"
          icon={<Building2 size={18} />}
          onClose={() => setLandlordForm(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setLandlordForm(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-pmedium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitLandlord()}
                disabled={isSaving}
                className="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium text-white shadow-sm disabled:opacity-60"
              >
                {isSaving ? "Saving…" : landlordForm.editingId ? "Save changes" : "Add landlord"}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Landlord name" required>
              <input
                className={inputClass}
                value={landlordForm.name}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, name: event.target.value }))}
                placeholder="e.g. Sunrise Estates"
              />
            </Field>
            <Field label="Legal / registered name">
              <input
                className={inputClass}
                value={landlordForm.legalName}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, legalName: event.target.value }))}
                placeholder="As printed on the agreement"
              />
            </Field>
            <Field label="Property / building">
              <input
                className={inputClass}
                value={landlordForm.propertyName}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, propertyName: event.target.value }))}
                placeholder="e.g. Palm Court, Block B"
              />
            </Field>
            <Field label="Unit / floor">
              <input
                className={inputClass}
                value={landlordForm.unitLabel}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, unitLabel: event.target.value }))}
                placeholder="e.g. 2nd floor"
              />
            </Field>
            <Field label="Contact person">
              <input
                className={inputClass}
                value={landlordForm.contactPerson}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, contactPerson: event.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={landlordForm.phone}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, phone: event.target.value }))}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                value={landlordForm.email}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, email: event.target.value }))}
              />
            </Field>
            <Field label="Address">
              <input
                className={inputClass}
                value={landlordForm.address}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, address: event.target.value }))}
              />
            </Field>
            <Field label="Agreement number">
              <input
                className={inputClass}
                value={landlordForm.agreementNumber}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, agreementNumber: event.target.value }))}
              />
            </Field>
            <Field label="Agreement start">
              <input
                type="date"
                className={inputClass}
                value={landlordForm.agreementStartDate}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, agreementStartDate: event.target.value }))}
              />
            </Field>
            <Field label="Agreement end" hint="Expiry is flagged 60 days ahead so renewals are never missed.">
              <input
                type="date"
                className={inputClass}
                value={landlordForm.agreementEndDate}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, agreementEndDate: event.target.value }))}
              />
            </Field>
            <Field label="Monthly rent" required hint="Used as the default when a month is raised.">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={landlordForm.monthlyRent}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, monthlyRent: event.target.value }))}
              />
            </Field>
            <Field label="Rent due day" hint="1–28, so every month has that date.">
              <input
                type="number"
                min="1"
                max="28"
                className={inputClass}
                value={landlordForm.paymentDueDay}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, paymentDueDay: event.target.value }))}
              />
            </Field>
            <Field label="Deposit held by landlord" hint="Money we paid to the owner — an asset, not an expense.">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={landlordForm.securityDepositHeld}
                onChange={(event) =>
                  setLandlordForm((previous: any) => ({ ...previous, securityDepositHeld: event.target.value }))
                }
              />
            </Field>
            <Field label="Escalation %" hint="Informational only — never auto-applied.">
              <input
                type="number"
                min="0"
                max="100"
                className={inputClass}
                value={landlordForm.escalationPercent}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, escalationPercent: event.target.value }))}
              />
            </Field>
            <Field label="Notice period (days)">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={landlordForm.noticePeriodDays}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, noticePeriodDays: event.target.value }))}
              />
            </Field>
            <Field label="Deduction label" hint="e.g. TDS on rent">
              <input
                className={inputClass}
                value={landlordForm.taxLabel}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, taxLabel: event.target.value }))}
              />
            </Field>
            <Field label="Deduction %">
              <input
                type="number"
                min="0"
                max="100"
                className={inputClass}
                value={landlordForm.taxPercent}
                onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, taxPercent: event.target.value }))}
              />
            </Field>
            {landlordForm.editingId ? (
              <Field label="Status">
                <select
                  className={inputClass}
                  value={landlordForm.status}
                  onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, status: event.target.value }))}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </Field>
            ) : null}
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea
                  rows={2}
                  className={inputClass}
                  value={landlordForm.notes}
                  onChange={(event) => setLandlordForm((previous: any) => ({ ...previous, notes: event.target.value }))}
                />
              </Field>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ── Raise a single payable ── */}
      {rentForm ? (
        <Modal
          title="Raise rent payable"
          subtitle="One landlord, one month"
          badge="Payable"
          icon={<CreditCard size={18} />}
          maxWidth="max-w-xl"
          onClose={() => setRentForm(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRentForm(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-pmedium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRent()}
                disabled={isSaving}
                className="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium text-white shadow-sm disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Raise payable"}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Landlord" required>
                <select
                  className={inputClass}
                  value={rentForm.landlordId}
                  onChange={(event) => {
                    const landlord = activeLandlords.find((item) => item.id === event.target.value);
                    setRentForm((previous: any) => ({
                      ...previous,
                      landlordId: event.target.value,
                      amount: landlord ? String(landlord.monthlyRent ?? "") : previous.amount,
                      taxPercent: landlord ? String(landlord.taxPercent ?? "") : previous.taxPercent,
                    }));
                  }}
                >
                  <option value="">Select a landlord…</option>
                  {activeLandlords.map((landlord) => (
                    <option key={landlord.id} value={landlord.id}>
                      {landlord.name}
                      {landlord.propertyName ? ` — ${landlord.propertyName}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Month" required>
              <select
                className={inputClass}
                value={rentForm.periodKey}
                onChange={(event) => setRentForm((previous: any) => ({ ...previous, periodKey: event.target.value }))}
              >
                {periodOptions.map((key) => (
                  <option key={key} value={key}>
                    {periodLabel(key)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rent amount" required>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={rentForm.amount}
                onChange={(event) => setRentForm((previous: any) => ({ ...previous, amount: event.target.value }))}
              />
            </Field>
            <Field label="Deduction %">
              <input
                type="number"
                min="0"
                max="100"
                className={inputClass}
                value={rentForm.taxPercent}
                onChange={(event) => setRentForm((previous: any) => ({ ...previous, taxPercent: event.target.value }))}
              />
            </Field>
            <Field label="Due date" hint="Leave blank to use the landlord's due day.">
              <input
                type="date"
                className={inputClass}
                value={rentForm.dueDate}
                onChange={(event) => setRentForm((previous: any) => ({ ...previous, dueDate: event.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea
                  rows={2}
                  className={inputClass}
                  value={rentForm.notes}
                  onChange={(event) => setRentForm((previous: any) => ({ ...previous, notes: event.target.value }))}
                />
              </Field>
            </div>
          </div>
          {!activeLandlords.length ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
              No active landlords yet. Add a landlord with a monthly rent first.
            </p>
          ) : null}
        </Modal>
      ) : null}

      {/* ── Record payment ── */}
      {paymentFor ? (
        <Modal
          title={`Record payment — ${paymentFor.landlordName}`}
          subtitle={`${paymentFor.periodLabel} · balance ${money(paymentFor.balance)}`}
          badge="Settlement"
          icon={<Wallet size={18} />}
          maxWidth="max-w-lg"
          onClose={() => setPaymentFor(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPaymentFor(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-pmedium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitPayment()}
                disabled={isSaving}
                className="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium text-white shadow-sm disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Record payment"}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Amount paid" required hint="Cannot exceed the outstanding balance.">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((previous) => ({ ...previous, amount: event.target.value }))}
              />
            </Field>
            <Field label="Paid on">
              <input
                type="date"
                className={inputClass}
                value={paymentForm.paidOn}
                onChange={(event) => setPaymentForm((previous) => ({ ...previous, paidOn: event.target.value }))}
              />
            </Field>
            <Field label="Method">
              <select
                className={inputClass}
                value={paymentForm.method}
                onChange={(event) => setPaymentForm((previous) => ({ ...previous, method: event.target.value }))}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>
            </Field>
            <Field label="Reference / UTR / cheque no.">
              <input
                className={inputClass}
                value={paymentForm.reference}
                onChange={(event) => setPaymentForm((previous) => ({ ...previous, reference: event.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Note">
                <input
                  className={inputClass}
                  value={paymentForm.note}
                  onChange={(event) => setPaymentForm((previous) => ({ ...previous, note: event.target.value }))}
                />
              </Field>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ── Edit payable ── */}
      {editRentFor ? (
        <Modal
          title={`Edit payable — ${editRentFor.landlordName}`}
          subtitle={`${editRentFor.periodLabel} · paid so far ${money(editRentFor.paidAmount)}`}
          badge="Correction"
          icon={<Pencil size={18} />}
          maxWidth="max-w-lg"
          onClose={() => setEditRentFor(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditRentFor(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-pmedium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRentEdit()}
                disabled={isSaving}
                className="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium text-white shadow-sm disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Rent amount" required hint="Cannot go below what is already paid.">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={editRentForm.amount}
                onChange={(event) => setEditRentForm((previous) => ({ ...previous, amount: event.target.value }))}
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                className={inputClass}
                value={editRentForm.dueDate}
                onChange={(event) => setEditRentForm((previous) => ({ ...previous, dueDate: event.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea
                  rows={2}
                  className={inputClass}
                  value={editRentForm.notes}
                  onChange={(event) => setEditRentForm((previous) => ({ ...previous, notes: event.target.value }))}
                />
              </Field>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ── Ledger detail ── */}
      {detail ? (
        <Modal
          title={`${detail.landlordName} — ${detail.periodLabel}`}
          subtitle={detail.id}
          badge={detail.isOverdue ? "Overdue" : detail.status}
          icon={<CreditCard size={18} />}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-pmedium text-slate-600"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => openPayment(detail)}
                disabled={detail.status === "Paid"}
                className="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium text-white shadow-sm disabled:opacity-60"
              >
                Record payment
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Rent</p>
              <p className="mt-1 text-sm font-pmedium text-slate-900">{money(detail.amount)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                {detail.taxLabel || "Deduction"}
              </p>
              <p className="mt-1 text-sm font-pmedium text-slate-900">{money(detail.taxAmount)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">Paid</p>
              <p className="mt-1 text-sm font-pmedium text-emerald-900">{money(detail.paidAmount)}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-amber-600">Balance</p>
              <p className="mt-1 text-sm font-pmedium text-amber-900">{money(detail.balance)}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Payment ledger</p>
            <p className="mt-1 text-[10px] text-slate-400">
              Payments are appended and never deleted. A correction voids the entry and keeps the audit trail.
            </p>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Paid on</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Method / Ref</th>
                    <th className="px-3 py-2">By</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                  {(detail.payments || []).map((payment: any) => (
                    <tr key={payment.id} className={payment.voided ? "bg-rose-50/40 text-slate-400" : ""}>
                      <td className="px-3 py-2">{payment.paidOnLabel || "—"}</td>
                      <td className={`px-3 py-2 text-right font-pmedium ${payment.voided ? "line-through" : "text-slate-900"}`}>
                        {money(payment.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <p>{payment.method || "—"}</p>
                        <p className="text-[9px] text-slate-400">{payment.reference || ""}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p>{payment.recordedByName || "—"}</p>
                        {payment.voided ? (
                          <p className="text-[9px] text-rose-500">voided: {payment.voidReason}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {payment.voided ? (
                          <span className="text-[9px] uppercase tracking-wider text-rose-500">Voided</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setVoidTarget({
                                rentId: detail.id,
                                paymentId: payment.id,
                                amount: payment.amount,
                                landlordName: detail.landlordName,
                              })
                            }
                            className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[9px] font-pmedium uppercase tracking-wider text-rose-600 transition hover:bg-rose-50"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!(detail.payments || []).length ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-[10px] text-slate-400">
                        No payments recorded against this month yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ── Void payment ── */}
      {voidTarget ? (
        <Modal
          title="Void payment"
          subtitle={`${voidTarget.landlordName} · ${money(voidTarget.amount)}`}
          badge="Reversal"
          icon={<AlertTriangle size={18} />}
          maxWidth="max-w-md"
          onClose={() => {
            setVoidTarget(null);
            setVoidReason("");
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setVoidTarget(null);
                  setVoidReason("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-pmedium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitVoid()}
                disabled={isSaving}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-pmedium text-white shadow-sm disabled:opacity-60"
              >
                {isSaving ? "Voiding…" : "Void payment"}
              </button>
            </>
          }
        >
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
            The entry stays in the ledger marked voided, and the balance opens again. This is an audit-visible correction —
            the reason is stored with your name and timestamp.
          </p>
          <Field label="Reason" required>
            <textarea
              rows={3}
              className={inputClass}
              value={voidReason}
              onChange={(event) => setVoidReason(event.target.value)}
              placeholder="e.g. Wrong landlord selected; payment re-recorded against LPR-…"
            />
          </Field>
        </Modal>
      ) : null}
    </div>
  );
}
