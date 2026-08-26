import React, { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Download, Eye, FileText, Search, Wallet } from "lucide-react";
import { getMyPayslips } from "../../services/finance";
import PageFrame from "../../components/Pages/PageFrame";

function formatCurrency(value = 0, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: String(currency || "INR").trim().toUpperCase() || "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString("en-IN")}`;
  }
}

function formatDate(value: string | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function ordinal(day: number): string {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatPeriodRange(p: PayslipRecord): string {
  const match = /^(\d{4})-(\d{2})$/.exec(String(p.cycleKey || ""));
  const year = match ? Number(match[1]) : Number(p.year);
  const monthIndex = match ? Number(match[2]) - 1 : new Date(`${p.monthLabel} 1, ${p.year}`).getMonth();
  if (!year || Number.isNaN(monthIndex) || monthIndex < 0) {
    return p.cycleKey || `${p.monthLabel || ""} ${p.year || ""}`.trim() || "-";
  }
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const monthShort = new Date(year, monthIndex, 1).toLocaleDateString("en-IN", { month: "short" });
  return `${ordinal(1)} to ${ordinal(lastDay)} ${monthShort} ${year}`;
}

interface PayslipRecord {
  id?: string;
  fileName?: string;
  amount?: number;
  currency?: string;
  grossPay?: number;
  totalDeductions?: number;
  netPay?: number;
  monthLabel?: string;
  year?: string;
  cycleKey?: string;
  generatedAt?: string;
  sentToEmployeeAt?: string;
  fileUrl?: string;
  emailDeliveryStatus?: string;
}

function StatusBadge({ p }: { p: PayslipRecord }) {
  if (p.emailDeliveryStatus === "Sent") {
    return (
      <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[9px] sm:text-[10px] font-pmedium uppercase tracking-wider">
        Sent
      </span>
    );
  }
  if (p.generatedAt) {
    return (
      <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[9px] sm:text-[10px] font-pmedium uppercase tracking-wider">
        Generated
      </span>
    );
  }
  return (
    <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[9px] sm:text-[10px] font-pmedium uppercase tracking-wider animate-pulse">
      Pending
    </span>
  );
}

export function PayslipsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    (async () => {
      try {
        const response = await getMyPayslips();
        if (!mounted) return;
        const data = response || {};
        const list = Array.isArray(data.payslips) ? data.payslips : Array.isArray(data) ? data : [];
        setPayslips(list);
      } catch (err: unknown) {
        if (mounted) {
          setErrorMessage((err as Error)?.message || "Failed to load payslips");
          setPayslips([]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(payslips.map((p) => String(p.year || "")).filter(Boolean));
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [payslips]);

  const yearScoped = useMemo(() => {
    if (yearFilter === "All") return payslips;
    return payslips.filter((p) => String(p.year || "") === yearFilter);
  }, [payslips, yearFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return yearScoped;
    return yearScoped.filter((p) =>
      (p.cycleKey || "").toLowerCase().includes(q) ||
      (p.monthLabel || "").toLowerCase().includes(q) ||
      String(p.year || "").toLowerCase().includes(q) ||
      (p.fileName || "").toLowerCase().includes(q)
    );
  }, [yearScoped, searchQuery]);

  const statCards = useMemo(() => {
    const generated = yearScoped.filter((p) => Boolean(p.generatedAt)).length;
    const totalNet = yearScoped.reduce((sum, p) => sum + Number(p.netPay ?? p.amount ?? 0), 0);
    const currency = yearScoped[0]?.currency || "INR";
    return [
      { key: "generated", label: "Payslips Generated", value: String(generated), icon: CheckCircle2 },
      { key: "amount", label: "Total Net Pay", value: formatCurrency(totalNet, currency), icon: Wallet, isCurrency: true },
    ];
  }, [yearScoped]);

  const openPayslip = (p: PayslipRecord) => {
    if (!p.fileUrl) return;
    window.open(p.fileUrl, "_blank", "noopener,noreferrer");
  };

  const downloadPayslip = (p: PayslipRecord) => {
    if (!p.fileUrl) return;
    const link = document.createElement("a");
    link.href = p.fileUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = p.fileName || "Payslip.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <PageFrame>
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
        <div>
          <h2 className="text-title font-pmedium text-primary uppercase">My Payslips</h2>
          <p className="text-xs font-pmedium text-slate-500 mt-1">All payslips generated for you, in one place</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm" data-tour="payslips-year-filter">
          <Calendar size={15} className="text-[#2563EB]" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-transparent font-semibold text-[#0F172A] outline-none cursor-pointer border-none text-xs"
          >
            <option value="All">All Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 shrink-0" data-tour="payslips-summary">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const borderColors = ['border-l-4 border-l-blue-500', 'border-l-4 border-l-emerald-500'];
          const iconClasses = ['bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600'];
          return (
            <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${borderColors[idx] || ''}`}>
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className={`text-[15px] font-pmedium truncate ${card.isCurrency ? 'text-blue-600' : 'text-slate-900'}`}>{card.value}</p>
              </div>
              <div className={`p-2 rounded-2xl ${iconClasses[idx] || 'bg-slate-50 text-slate-600'} shrink-0`}>
                <Icon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Data Panel ── */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex justify-end bg-slate-50/50">
          <div className="relative min-w-[220px] sm:min-w-[260px]" data-tour="payslips-search">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search payslips by month or year..."
              className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
              <FileText className="text-slate-400" size={24} />
            </div>
            <p className="text-slate-500 font-semibold mb-1">No payslips found</p>
            <p className="text-slate-400 text-[13px]">Payslips will appear here once generated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[760px]" data-tour="payslips-table">
              <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-6 py-5">Period</th>
                  <th className="px-6 py-5">File Name</th>
                  <th className="px-6 py-5 text-right">Amount</th>
                  <th className="px-6 py-5 text-center">Status</th>
                  <th className="px-6 py-5 text-center">Generated</th>
                  <th className="px-6 py-5 text-center">Sent</th>
                  <th className="px-6 py-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {filtered.map((p) => (
                  <tr key={p.id || p.cycleKey || p.fileName} className="group transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-pmedium text-slate-900 text-sm">{formatPeriodRange(p)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] font-medium text-slate-700">{p.fileName || "-"}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-pmedium text-slate-900">{formatCurrency(p.netPay ?? p.amount, p.currency)}</td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge p={p} />
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-medium text-slate-600">{formatDate(p.generatedAt)}</td>
                    <td className="px-6 py-4 text-center text-xs font-medium text-slate-600">{formatDate(p.sentToEmployeeAt)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPayslip(p)}
                          disabled={!p.fileUrl}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:pointer-events-none"
                          title="View Payslip"
                        >
                          <Eye size={14} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadPayslip(p)}
                          disabled={!p.fileUrl}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:pointer-events-none"
                          title="Download PDF"
                        >
                          <Download size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </PageFrame>
  );
}

export default PayslipsTab;
