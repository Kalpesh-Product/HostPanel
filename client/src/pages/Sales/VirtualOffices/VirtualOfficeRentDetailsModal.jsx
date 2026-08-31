import React from "react";
import { Receipt, X } from "lucide-react";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";

const PAYMENT_STATUS_OPTIONS = [
  { value: "Paid", label: "Paid", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "Partially Paid", label: "Partially Paid", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "Pending", label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "Overdue", label: "Overdue", className: "border-rose-200 bg-rose-50 text-rose-700" },
];

function getStatusMeta(value) {
  return PAYMENT_STATUS_OPTIONS.find((o) => o.value === value) || { label: value || "--", className: "border-slate-200 bg-slate-100 text-slate-600" };
}

function formatDate(value) {
  if (!value) return "--";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function getInitials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "VO";
}

export default function VirtualOfficeRentDetailsModal({ open, record, onClose }) {
  const workspacePreferences = useWorkspacePreferences();
  const fmt = (v) => formatWorkspaceCurrency(Math.round(Number(v || 0)), workspacePreferences.currency, { maximumFractionDigits: 0 });

  if (!open || !record) return null;

  const companyName = record.clientName || record.brandName;
  const payments = (Array.isArray(record.paymentRecords) ? [...record.paymentRecords] : []).sort(
    (a, b) => new Date(b.periodStart || b.paymentDate || 0) - new Date(a.periodStart || a.paymentDate || 0),
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-[#0F172A]/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl border border-white/70">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black shadow-sm shrink-0 border border-slate-200">
              {record.initials || getInitials(companyName)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-pmedium text-slate-800 truncate">{companyName}</h2>
              <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mt-0.5">
                {record.recordCode} · Monthly Rent {fmt(record.monthlyRent)}
              </p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <h3 className="mb-3 text-xs font-pmedium uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Receipt size={14} /> Rent Payment History
          </h3>
          {payments.length === 0 ? (
            <p className="py-10 text-center text-xs font-pmedium text-slate-400">No rent payments recorded yet for this company.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
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
                  {payments.map((p, idx) => {
                    const meta = getStatusMeta(p.status);
                    return (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-all">
                        <td className="px-3.5 py-2 font-pmedium text-slate-800 text-xs">{p.monthLabel || formatDate(p.periodStart) || "--"}</td>
                        <td className="px-3.5 py-2">
                          <p className="font-pmedium text-slate-600 text-xs">{formatDate(p.periodStart)}</p>
                          <p className="text-[10px] font-pmedium text-slate-400">to {formatDate(p.periodEnd)}</p>
                        </td>
                        <td className="px-3.5 py-2 font-pmedium text-slate-900 text-sm">{fmt(p.amount)}</td>
                        <td className="px-3.5 py-2 font-pmedium text-slate-600 text-xs">{p.paymentMethod || "--"}</td>
                        <td className="px-3.5 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{p.transactionId || "--"}</td>
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
      </div>
    </div>
  );
}
