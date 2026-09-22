import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  CalendarClock,
  FileText,
  Layers,
  Search,
  ShieldCheck,
} from "lucide-react";

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

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  expiring_soon: "bg-amber-50 text-amber-700",
  expired_downgraded: "bg-red-50 text-red-600",
  none: "bg-slate-100 text-slate-500",
};

const TABS = [
  { key: "modules", label: "Included Modules" },
  { key: "invoices", label: "Invoices" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const PlanBillingTab = () => {
  const axios = useAxiosPrivate();
  const [activeTab, setActiveTab] = useState<TabKey>("modules");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["planBillingSummary"],
    queryFn: async () => {
      const res = await axios.get("/api/plan-billing/summary");
      return res?.data?.data;
    },
  });

  const { data: invoicesData } = useQuery({
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
  const includedModules = useMemo(() => summary?.includedModules || [], [summary]);
  const invoices = useMemo(() => invoicesData || [], [invoicesData]);

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return includedModules;
    return includedModules.filter(
      (m: any) =>
        (m.label || "").toLowerCase().includes(q) || (m.section || "").toLowerCase().includes(q),
    );
  }, [includedModules, searchQuery]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv: any) =>
      `${PLAN_LABELS[inv.plan] || inv.plan} ${inv.amount}`.toLowerCase().includes(q),
    );
  }, [invoices, searchQuery]);

  const addonCount = includedModules.filter((m: any) => m.source === "addon").length;

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading plan details…</div>;
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      <div className="mb-1">
        <h2 className="text-title font-pmedium text-primary uppercase">Plan &amp; Billing</h2>
        <p className="text-xs font-pmedium text-slate-500 mt-1">
          Your current plan, what's included, and your payment history.
        </p>
      </div>

      {/* Stat Cards */}
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
            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Started</p>
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
              {planStatus === "expired_downgraded" ? "Expired" : "Renews On"}
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
          Your plan expires on <b>{formatDate(summary?.planExpiryDate)}</b>. If it isn't renewed,
          you'll be downgraded to Basic and lose access to:{" "}
          {(summary?.modulesLostOnDowngrade || []).join(", ") || "the modules included in this plan"}.
        </div>
      )}
      {planStatus === "expired_downgraded" && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-[12px] text-red-700">
          Your plan expired and this workspace is now on Basic. Your data is safe — renew to
          restore access to: {(summary?.modulesLostOnDowngrade || []).join(", ") || "your previous modules"}.
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setSearchQuery("");
            }}
            className={`rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
              activeTab === tab.key
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {tab.label}
            {tab.key === "modules" && ` (${includedModules.length})`}
            {tab.key === "invoices" && ` (${invoices.length})`}
          </button>
        ))}
      </div>

      {/* Filter/search + table panel */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[320px]">
        <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
          <div className="text-[11px] font-pmedium text-slate-500">
            {activeTab === "modules"
              ? `${includedModules.length} module${includedModules.length === 1 ? "" : "s"} included${addonCount ? ` · ${addonCount} custom add-on${addonCount === 1 ? "" : "s"}` : ""}`
              : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder={activeTab === "modules" ? "Search modules..." : "Search invoices..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {activeTab === "modules" ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-5 py-3.5">Module</th>
                  <th className="px-5 py-3.5">Section</th>
                  <th className="px-5 py-3.5 text-center">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-16 text-slate-400 font-pmedium">
                      No modules found.
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                      <td className="px-5 py-3.5 text-[12px] font-pmedium text-slate-800">{m.label}</td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-500">{m.section}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-pmedium uppercase tracking-wide ${
                            m.source === "addon"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {m.source === "addon" ? "Custom Add-on" : `${planLabel} Default`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Paid On</th>
                  <th className="px-5 py-3.5 text-center">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-slate-400 font-pmedium">
                      {planId === "basic" ? "Basic plan has no invoices." : "No invoices yet."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice: any) => (
                    <tr
                      key={invoice._id}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-50"
                    >
                      <td className="px-5 py-3.5 text-[12px] font-pmedium text-slate-800">
                        {PLAN_LABELS[invoice.plan] || invoice.plan}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-600">${invoice.amount}</td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-500">{formatDate(invoice.paidAt)}</td>
                      <td className="px-5 py-3.5 text-center">
                        {invoice.hostedInvoiceUrl ? (
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-pmedium text-blue-600 hover:underline"
                          >
                            <FileText size={12} />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">--</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanBillingTab;
