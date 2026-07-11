import React, { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Search } from "lucide-react";
import { getMyPayslips } from "../../services/finance";

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

export function PayslipsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return payslips;
    const q = searchQuery.toLowerCase();
    return payslips.filter((p) =>
      (p.cycleKey || "").toLowerCase().includes(q) ||
      (p.monthLabel || "").toLowerCase().includes(q) ||
      (p.year || "").toLowerCase().includes(q) ||
      (p.fileName || "").toLowerCase().includes(q)
    );
  }, [payslips, searchQuery]);

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
    <div className="border-default border-borderGray rounded-xl bg-white p-4">
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">My Payslips</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search payslips by month or year..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-[#0F172A] placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errorMessage}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
            <FileText className="text-slate-400" size={24} />
          </div>
          <p className="text-slate-500 font-semibold mb-1">No payslips found</p>
          <p className="text-slate-400 text-[13px]">Payslips will appear here once generated.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4">File Name</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Generated</th>
                <th className="px-6 py-4 text-center">Sent</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {filtered.map((p) => (
                <tr key={p.id || p.cycleKey || p.fileName} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 text-sm">{p.cycleKey || `${p.monthLabel || ""} ${p.year || ""}`.trim() || "-"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-medium text-slate-700">{p.fileName || "-"}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${
                      p.emailDeliveryStatus === "Sent"
                        ? "bg-green-50 text-green-600 border-green-200"
                        : p.generatedAt
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}>
                      {p.emailDeliveryStatus === "Sent" ? "Sent" : p.generatedAt ? "Generated" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-medium text-slate-600">{formatDate(p.generatedAt)}</td>
                  <td className="px-6 py-4 text-center text-xs font-medium text-slate-600">{formatDate(p.sentToEmployeeAt)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openPayslip(p)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase transition-all flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPayslip(p)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase transition-all flex items-center gap-1"
                      >
                        <Download size={12} /> PDF
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
  );
}

export default PayslipsTab;
