import React, { useEffect, useState } from "react";
import { FileText, Download, Eye, Search } from "lucide-react";
import { getMyPayslips } from "../../services/finance";

interface Payslip {
  id?: string;
  payslipNumber?: string;
  month?: string;
  year?: string;
  cycleKey?: string;
  netPay?: number;
  grossPay?: number;
  totalDeductions?: number;
  status?: string;
  generatedAt?: string;
  sentToEmployeeAt?: string;
  fileName?: string;
}

function formatCurrency(amount?: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function PayslipsTab() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const data = await getMyPayslips();
        if (!mounted) return;
        setPayslips(Array.isArray(data) ? data : data?.payslips || []);
      } catch {
        if (mounted) setPayslips([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = payslips.filter((p) =>
    !searchQuery.trim() ||
    (p.cycleKey || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.month || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.year || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.payslipNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
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
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4 text-right">Gross Pay</th>
                <th className="px-6 py-4 text-right">Deductions</th>
                <th className="px-6 py-4 text-right">Net Pay</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Generated</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {filtered.map((p) => (
                <tr key={p.id || p.cycleKey} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 text-sm">{p.cycleKey || `${p.month} ${p.year}`}</div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{p.payslipNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">{formatCurrency(p.grossPay)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-red-500">{formatCurrency(p.totalDeductions)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-blue-600 text-base">{formatCurrency(p.netPay)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                      p.sentToEmployeeAt
                        ? "bg-green-50 text-green-600 border-green-200"
                        : p.generatedAt
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}>
                      {p.sentToEmployeeAt ? "Sent" : p.generatedAt ? "Generated" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-medium text-slate-600">{formatDate(p.generatedAt)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-lg text-[10px] font-semibold uppercase transition-all flex items-center gap-1">
                        <Eye size={12} /> View
                      </button>
                      <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-lg text-[10px] font-semibold uppercase transition-all flex items-center gap-1">
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
