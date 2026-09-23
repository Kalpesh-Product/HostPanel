import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  ArrowRight,
  CalendarClock,
  Eye,
  FileText,
  Layers,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

const MASTER_PANEL_BASE_URL =
  String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() || "https://masterpanel.wono.co";

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic Plan",
  professional: "Professional Plan",
  custom: "Custom Plan",
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatAmount = (amount?: number | string | null, currency = "USD") => {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  expiring_soon: "bg-amber-50 text-amber-700",
  expired_downgraded: "bg-red-50 text-red-600",
  none: "bg-slate-100 text-slate-500",
};

const TABS = [
  { key: "modules", label: "Included Modules" },
  { key: "payments", label: "Payment History" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type IncludedModule = {
  id?: string;
  label?: string;
  section?: string;
  source?: string;
};

type ModuleGroup = {
  section: string;
  modules: IncludedModule[];
};

const INTERNAL_MODULE_PREFIXES = ["org_", "org-", "visitors_", "visitors-"];

const isDisplayableModule = (module: IncludedModule) => {
  const id = String(module?.id || "").trim().toLowerCase();
  const label = String(module?.label || "").trim();
  if (!id || !label) return false;
  if (INTERNAL_MODULE_PREFIXES.some((prefix) => id.startsWith(prefix))) return false;
  if (label === module.id && /[_]/.test(label)) return false;
  return true;
};

const getModuleKey = (module: IncludedModule) =>
  `${String(module?.section || "Other").trim().toLowerCase()}::${String(module?.label || module?.id || "")
    .trim()
    .toLowerCase()}`;

const getInvoiceUrl = (invoice: any) => invoice?.hostedInvoiceUrl || invoice?.invoicePdfUrl || "";

const PlanBillingTab = () => {
  const axios = useAxiosPrivate();
  const [activeTab, setActiveTab] = useState<TabKey>("modules");
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewBillingCycle, setRenewBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isRenewSubmitting, setIsRenewSubmitting] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["planBillingSummary"],
    queryFn: async () => {
      const res = await axios.get("/api/plan-billing/summary");
      return res?.data?.data;
    },
  });

  // Live Professional pricing for the renew modal — same source the
  // upgrade-plan modals and workspace-setup pricing cards read from.
  const { data: pricing } = useQuery({
    queryKey: ["professionalPlanPrice"],
    queryFn: async () => {
      const res = await axios.get("/api/plan-billing/professional-price");
      return res?.data;
    },
    enabled: isRenewModalOpen,
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["planBillingInvoices"],
    queryFn: async () => {
      const res = await axios.get("/api/plan-billing/invoices");
      return res?.data?.invoices || [];
    },
    enabled: Boolean(summary && summary.selectedPlan !== "basic"),
  });

  const planId = summary?.selectedPlan || "basic";
  const planLabel = PLAN_LABELS[planId] || planId;
  const planStatus = summary?.planStatus || "none";
  const isTrialing = Boolean(summary?.isTrialing);

  // Preview of the cycle a renewal would actually start/end on — same rule
  // MasterPanel's computeProjectedPeriod already uses when previewing a
  // payment-link email: extend from the current expiry if it's still in the
  // future (no paid time lost), otherwise start today.
  const renewPeriod = useMemo(() => {
    const currentExpiry = summary?.planExpiryDate ? new Date(summary.planExpiryDate) : null;
    const start = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    const end = new Date(start);
    if (renewBillingCycle === "annual") {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return { start, end };
  }, [summary?.planExpiryDate, renewBillingCycle]);

  // Self-serve, same as the Verify Business "pay" flow: MasterPanel mints a
  // real Stripe Payment Link on the spot and hands the URL straight back —
  // no staff review, no "sales team will contact you" — so the host lands
  // on the actual payment page immediately, same as clicking pay for a
  // verification badge does.
  const handleRenewSubmit = async () => {
    if (!summary?.companyId) {
      toast.error("Company id not found. Please refresh and try again.");
      return;
    }
    try {
      setIsRenewSubmitting(true);
      const response = await axios.post(
        `${MASTER_PANEL_BASE_URL}/api/hosts/plan-payments/send`,
        { companyId: summary.companyId, plan: planId, billingCycle: renewBillingCycle },
      );
      if (response?.data?.paymentLinkUrl) {
        window.location.href = response.data.paymentLinkUrl;
      } else {
        toast.error("Payment link wasn't returned — please try again.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to start the payment.");
    } finally {
      setIsRenewSubmitting(false);
    }
  };
  const includedModules = useMemo<IncludedModule[]>(() => summary?.includedModules || [], [summary]);
  const invoices = useMemo(() => invoicesData || [], [invoicesData]);

  const visibleModules = useMemo(() => {
    const unique = new Map<string, IncludedModule>();
    includedModules.filter(isDisplayableModule).forEach((module) => {
      const key = getModuleKey(module);
      if (!unique.has(key)) unique.set(key, module);
    });
    return Array.from(unique.values()).sort((a, b) =>
      String(a.section || "Other").localeCompare(String(b.section || "Other")) ||
      String(a.label || "").localeCompare(String(b.label || "")),
    );
  }, [includedModules]);

  const filteredModuleGroups = useMemo<ModuleGroup[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const groups = new Map<string, IncludedModule[]>();
    visibleModules
      .filter((module) => {
        if (moduleFilter === "Plan Modules" && module.source !== "plan") return false;
        if (moduleFilter === "Custom Add-ons" && module.source !== "addon") return false;
        if (!q) return true;
        return (
          String(module.label || "").toLowerCase().includes(q) ||
          String(module.section || "").toLowerCase().includes(q)
        );
      })
      .forEach((module) => {
        const section = String(module.section || "Other").trim() || "Other";
        const existing = groups.get(section) || [];
        existing.push(module);
        groups.set(section, existing);
      });

    return Array.from(groups.entries()).map(([section, modules]) => ({
      section,
      modules: modules.sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""))),
    }));
  }, [moduleFilter, searchQuery, visibleModules]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((invoice: any) => {
      const normalizedStatus = String(invoice.status || "Paid").trim().toLowerCase();
      if (paymentFilter !== "All" && normalizedStatus !== paymentFilter.toLowerCase()) return false;
      if (!q) return true;
      return [
        PLAN_LABELS[invoice.plan] || invoice.plan,
        invoice.amount,
        invoice.status,
        invoice.invoiceNumber,
        getInvoiceUrl(invoice),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [invoices, paymentFilter, searchQuery]);

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading plan details...</div>;
  }

  return (
    <div className="border-default border-borderGray rounded-xl bg-white p-4 flex flex-col gap-4 font-pmedium">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-title font-pmedium text-primary uppercase">Plan &amp; Billing</h2>
          <p className="text-xs font-pmedium text-slate-500 mt-1">
            Your current plan, included modules, and payment history.
          </p>
        </div>
        {planId !== "basic" ? (
          <button
            type="button"
            onClick={() => {
              setRenewBillingCycle("monthly");
              setIsRenewModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-[11px] font-pmedium text-white transition hover:bg-blue-700"
          >
            <RefreshCw size={13} />
            Renew Now
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-1 shrink-0">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 border-l-4 border-l-blue-500 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">Current Plan</p>
            <p className="text-[15px] font-pmedium text-slate-900 truncate">{planLabel}</p>
          </div>
          <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
            <ShieldCheck size={16} />
          </div>
        </div>
        <div
          className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 ${
            planStatus === "active"
              ? "border-l-emerald-500"
              : planStatus === "expiring_soon"
                ? "border-l-amber-500"
                : planStatus === "expired_downgraded"
                  ? "border-l-red-500"
                  : "border-l-slate-400"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-pmedium uppercase tracking-wide ${STATUS_TONE[planStatus] || STATUS_TONE.none}`}
            >
              {planStatus.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-400">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Started On</p>
            <p className="text-[15px] font-pmedium text-slate-900">
              {planId === "basic" ? "--" : formatDate(summary?.planStartDate)}
            </p>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50 text-slate-500 shrink-0">
            <CalendarClock size={16} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-purple-500">
          <div className="min-w-0">
            <p className="text-[10px] font-pmedium text-purple-600 uppercase tracking-widest mb-1">
              {planStatus === "expired_downgraded" ? "Expired" : "Expires On"}
            </p>
            <p className="text-[15px] font-pmedium text-slate-900">
              {planId === "basic" ? "--" : formatDate(summary?.planExpiryDate)}
            </p>
          </div>
          <div className="p-2 rounded-2xl bg-purple-50 text-purple-600 shrink-0">
            <Layers size={16} />
          </div>
        </div>
      </div>

      {planStatus === "expiring_soon" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-[12px] text-amber-800">
          {isTrialing ? (
            <>
              Your free trial ends on <b>{formatDate(summary?.planExpiryDate)}</b>. Renew now to keep it,
              or you'll be downgraded to Basic and lose access to:{" "}
              {(summary?.modulesLostOnDowngrade || []).join(", ") || "the modules included in this plan"}.
            </>
          ) : (
            <>
              Your plan expires on <b>{formatDate(summary?.planExpiryDate)}</b>. If it is not renewed,
              you will be downgraded to Basic and lose access to:{" "}
              {(summary?.modulesLostOnDowngrade || []).join(", ") || "the modules included in this plan"}.
            </>
          )}
        </div>
      )}
      {isTrialing && planStatus !== "expiring_soon" && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-[12px] text-blue-800">
          You're on a free trial of the {planLabel}, active until <b>{formatDate(summary?.planExpiryDate)}</b>.
          Renew now to continue on this plan after the trial ends.
        </div>
      )}
      {planStatus === "expired_downgraded" && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-[12px] text-red-700">
          Your plan expired and this workspace is now on Basic. Your data is safe. Renew to restore
          access to: {(summary?.modulesLostOnDowngrade || []).join(", ") || "your previous modules"}.
        </div>
      )}

      <div className="w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <div className="grid w-full grid-cols-2 gap-1.5" role="tablist" aria-label="Plan and billing sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchQuery("");
                setModuleFilter("All");
                setPaymentFilter("All");
              }}
              className={`flex w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                activeTab === tab.key
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.key === "modules" ? <Layers size={14} className="shrink-0" /> : <Receipt size={14} className="shrink-0" />}
              {tab.label}
              {tab.key === "modules" && ` (${visibleModules.length})`}
              {tab.key === "payments" && ` (${invoices.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[380px]">
        <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(activeTab === "modules"
              ? ["All", "Plan Modules", ...(planId === "custom" ? ["Custom Add-ons"] : [])]
              : ["All", "Paid", "Pending", "Failed"]
            ).map((filter) => {
              const isActive = activeTab === "modules" ? moduleFilter === filter : paymentFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => activeTab === "modules" ? setModuleFilter(filter) : setPaymentFilter(filter)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] sm:text-[12px] font-pmedium transition-all ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                      : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
          <div className="relative w-full xl:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder={activeTab === "modules" ? "Search modules or categories..." : "Search payment history..."}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {activeTab === "modules" ? (
          <div className="flex-1 p-4 sm:p-5">
            {filteredModuleGroups.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm font-pmedium text-slate-400">
                No modules found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredModuleGroups.map((group) => (
                  <section
                    key={group.section}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                      <h3 className="text-[12px] font-pmedium uppercase tracking-widest text-slate-700">
                        {group.section}
                      </h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-pmedium text-slate-500 shadow-sm">
                        {group.modules.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                      {group.modules.map((module) => (
                        <div
                          key={`${group.section}-${module.id || module.label}`}
                          className="flex min-h-[44px] items-center rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-[12px] font-pmedium leading-snug text-slate-800"
                        >
                          {module.label}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[680px] text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Paid On</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-center">Invoice</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoicesLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 font-pmedium">
                      Loading payment history...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 font-pmedium">
                      {planId === "basic" ? "Basic plan has no payment history." : "No payment history yet."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice: any) => (
                    <tr
                      key={invoice._id || invoice.id || `${invoice.plan}-${invoice.paidAt}`}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-50"
                    >
                      <td className="px-5 py-3.5 text-[12px] font-pmedium text-slate-800">
                        {PLAN_LABELS[invoice.plan] || invoice.plan || "Plan Payment"}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-pmedium text-slate-700">
                        {formatAmount(invoice.amount, invoice.currency || "USD")}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-pmedium text-slate-500">{formatDate(invoice.paidAt || invoice.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-pmedium uppercase tracking-wider text-emerald-700">
                          {invoice.status || "Paid"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {getInvoiceUrl(invoice) ? (
                          <a
                            href={getInvoiceUrl(invoice)}
                            target="_blank"
                            rel="noreferrer"
                            title="Open invoice"
                            aria-label="Open invoice"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-200 hover:bg-blue-100"
                          >
                            <FileText size={14} />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(invoice)}
                          title="View payment details"
                          aria-label="View payment details"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isRenewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Renew Plan</p>
                <h3 className="mt-1 text-sm font-pmedium text-slate-900">Renew {planLabel}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRenewModalOpen(false)}
                title="Close"
                aria-label="Close renew plan"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[12px] text-slate-500">Choose a billing cycle to continue on this plan.</p>
              <div className="grid grid-cols-2 gap-3">
                {(["monthly", "annual"] as const).map((cycle) => {
                  const isSelected = renewBillingCycle === cycle;
                  const rate =
                    cycle === "annual"
                      ? pricing?.professionalAnnualPlanPriceUsd
                      : pricing?.professionalPlanPriceUsd;
                  const priceLabel =
                    rate != null
                      ? cycle === "annual"
                        ? `$${Number(rate).toLocaleString("en-US")} /year`
                        : `$${rate} /month`
                      : "";
                  return (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setRenewBillingCycle(cycle)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-[#2563EB] bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="text-[12px] font-pmedium text-slate-900 capitalize">{cycle}</p>
                      {priceLabel ? (
                        <p className="text-[11px] text-slate-500 mt-0.5">{priceLabel}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 flex items-center justify-between gap-3 text-[12px]">
                <div>
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Starts</p>
                  <p className="font-pmedium text-slate-800 mt-0.5">{formatDate(renewPeriod.start.toISOString())}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 shrink-0" />
                <div className="text-right">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Ends</p>
                  <p className="font-pmedium text-slate-800 mt-0.5">{formatDate(renewPeriod.end.toISOString())}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                You'll be taken to a secure Stripe payment page to complete this renewal.
              </p>
            </div>
            <div className="border-t border-slate-100 px-5 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRenewModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-pmedium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenewSubmit}
                disabled={isRenewSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[11px] font-pmedium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isRenewSubmitting ? "Redirecting..." : "Continue to Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Payment Record</p>
                <h3 className="mt-1 text-sm font-pmedium text-slate-900">
                  {selectedInvoice.invoiceNumber || "Plan payment details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                title="Close"
                aria-label="Close payment details"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                ["Plan", PLAN_LABELS[selectedInvoice.plan] || selectedInvoice.plan || "Plan Payment"],
                ["Amount", formatAmount(selectedInvoice.amount, selectedInvoice.currency || "USD")],
                ["Paid On", formatDate(selectedInvoice.paidAt || selectedInvoice.createdAt)],
                ["Status", selectedInvoice.status || "Paid"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="mt-1 text-[12px] font-pmedium capitalize text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            {getInvoiceUrl(selectedInvoice) && (
              <div className="border-t border-slate-100 px-5 py-4 text-right">
                <a
                  href={getInvoiceUrl(selectedInvoice)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[11px] font-pmedium text-white transition-colors hover:bg-blue-700"
                >
                  <FileText size={14} />
                  Open Invoice
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanBillingTab;
