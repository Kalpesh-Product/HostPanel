import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Eye, Download, Calendar,
  User, UserCheck, AlertCircle, FileText, ChevronDown,
  ShieldCheck, CheckCircle2, History,
  Send, Calculator, Plus, Minus, Lock,
  Coins, Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageFrame from "@/components/Pages/PageFrame";
import Skeleton, { HRPayrollSkeleton } from "@/components/ui/Skeleton";
import {
  addPayrollAdjustment,
  getPayrollSnapshot,
  getPayrollPayslipTemplatePreview,
  preparePayrollCycle,
  selectPayrollPayslipTemplate,
  updatePayrollCycleStatus,
} from "@/services/hr";
import { generatePayrollPayslip, sendPayrollPayslip } from "@/services/finance";
import { toast } from "sonner";
import {
  canAccessFinanceDashboard,
  getStoredUser,
  resolvePostLoginRoute,
} from "@/lib/auth-session";
import {
  DEFAULT_WORKSPACE_CURRENCY,
  formatWorkspaceCurrency,
} from "@/lib/workspaceLocalization";

/* ───────────────────────────── Types ───────────────────────────── */

interface AttendanceData {
  totalDays?: number;
  workingDays?: number;
  payableDays?: number;
  dailyRate?: number;
  present?: number;
  halfDays?: number;
  paidLeaves?: number;
  holidayDays?: number;
  preJoiningDays?: number;
  absentDays?: number;
  unpaidLeaves?: number;
  presentPay?: number;
  leavePay?: number;
  halfDayPay?: number;
  holidayPay?: number;
}

interface FinancialData {
  baseSalary?: number;
  attendanceGrossPay?: number;
  benefits?: number;
  standardDeductions?: number;
  attendanceDeductions?: number;
  netSalary?: number;
  hrBonus?: number;
  hrDeductions?: number;
  bonusReason?: string;
  deductionReason?: string;
  paymentStatus?: string;
  currency?: string;
}

interface ManualAdjustmentRecord {
  type?: "bonus" | "deduction";
  amount?: number;
  reason?: string;
  createdAt?: string;
}

interface EmployeePayrollData {
  id?: string;
  profileId?: string;
  name?: string;
  department?: string;
  role?: string;
  salaryPackage?: {
    annualCtc?: number;
    grossAnnual?: number;
    monthlyCtc?: number;
    grossMonthly?: number;
    currency?: string;
  };
  attendance?: AttendanceData;
  financials?: FinancialData;
  payment?: { status?: string };
  adjustmentReason?: string;
  manualAdjustments?: ManualAdjustmentRecord[];
  hasSalaryPackage?: boolean;
  payslip?: {
    id?: string;
    url?: string;
    fileUrl?: string;
    fileName?: string;
    generatedAt?: string;
    sentAt?: string;
    templateId?: PayslipTemplateId;
  };
}

interface CycleData {
  id?: string;
  status?: string;
  employees?: EmployeePayrollData[];
}

interface HistoryRecord {
  id?: string;
  month?: string;
  monthLabel?: string;
  displayMonth?: string;
  status?: string;
  totalAmount?: string;
  totalEmployees?: number;
  sentToFinanceAt?: string;
  processedOn?: string;
  employees?: EmployeePayrollData[];
}

interface PayrollFilters {
  departments?: string[];
  roles?: string[];
}

interface PayrollState {
  currentCycle: CycleData | null;
  history: HistoryRecord[];
  filters: PayrollFilters;
  settings?: {
    currency?: string;
    timezone?: string;
    payslipTemplateId?: PayslipTemplateId;
    payslipTemplateLocked?: boolean;
    payslipTemplateLockedAt?: string;
    canConfigurePayslipTemplate?: boolean;
  };
}

interface ViewingEmployee extends EmployeePayrollData {
  isHistory: boolean;
  cycleId?: string;
}

interface AdjustmentForm {
  type: "bonus" | "deduction";
  amount: string;
  reason: string;
}

/* ───────────────────────────── Constants ───────────────────────────── */

const PAYROLL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PAYROLL_TIME_ZONE = "Asia/Kolkata";

const YEARS_LIST = ["2024", "2025", "2026", "2027"];

type PayslipTemplateId = "classic-mono" | "modern-blue" | "aqua-wave" | "indigo-banner";

const PAYSLIP_TEMPLATES: Array<{
  id: PayslipTemplateId;
  name: string;
  description: string;
  accent: string;
  soft: string;
  layout: "mono" | "modern" | "wave" | "banner";
}> = [
  { id: "classic-mono", name: "Classic Mono", description: "Formal black and white", accent: "#111827", soft: "#F3F4F6", layout: "mono" },
  { id: "modern-blue", name: "Modern Blue", description: "Professional WONO style", accent: "#2563EB", soft: "#DBEAFE", layout: "modern" },
  { id: "aqua-wave", name: "Aqua Wave", description: "Colorful curved footer", accent: "#16A9C7", soft: "#DFF7FB", layout: "wave" },
  { id: "indigo-banner", name: "Indigo Banner", description: "Bold branded header", accent: "#5878F7", soft: "#E9EDFF", layout: "banner" },
];

function getPayslipTemplateName(templateId?: PayslipTemplateId) {
  return PAYSLIP_TEMPLATES.find((template) => template.id === templateId)?.name || "Modern Blue";
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function formatPayrollHistoryDate(dateValue?: string, timeZone = PAYROLL_TIME_ZONE): string {
  if (!dateValue) return "-";
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatCurrency(amount?: number, currency = DEFAULT_WORKSPACE_CURRENCY): string {
  return formatWorkspaceCurrency(amount, currency, { maximumFractionDigits: 0 });
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

/* ──────────────────────────────────────────────────────────────── */
/*  HandoffConfirmModal                                              */
/* ──────────────────────────────────────────────────────────────── */

interface HandoffConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: string;
  error: string;
  submitting: boolean;
}

function HandoffConfirmModal({ open, onClose, onConfirm, mode, error, submitting }: HandoffConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Confirm payroll transfer</h2>
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">Payroll Handoff</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-sm font-pmedium leading-6 text-slate-600">This action cannot be undone. Do you want to proceed?</p>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm font-pmedium text-slate-700">
                {mode === "prepare"
                  ? "This will lock the payroll cycle and send it to Finance for payment processing."
                  : "This will send the already prepared payroll cycle to Finance for payment processing."}
              </div>
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-pmedium text-rose-700">{error}</div>
              )}
            </div>
            <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="rounded-2xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {submitting ? "Processing..." : mode === "prepare" ? "Confirm & Send to Finance" : "Send to Finance"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  HistoryCycleModal                                                */
/* ──────────────────────────────────────────────────────────────── */

interface HistoryCycleModalProps {
  cycle: HistoryRecord | null;
  workspaceCurrency: string;
  onClose: () => void;
  onViewEmployee: (emp: EmployeePayrollData) => void;
}

function HistoryCycleModal({ cycle, workspaceCurrency, onClose, onViewEmployee }: HistoryCycleModalProps) {
  const employees = Array.isArray(cycle?.employees) ? cycle.employees : [];
  const paidCount = employees.filter((e) =>
    String(e.financials?.paymentStatus || e.payment?.status || "").toLowerCase() === "paid"
  ).length;
  const pendingCount = employees.filter((e) =>
    String(e.financials?.paymentStatus || e.payment?.status || "Pending").toLowerCase() !== "paid"
  ).length;

  return (
    <AnimatePresence>
      {cycle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[2rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                  <History size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">
                    {cycle.monthLabel || cycle.displayMonth || cycle.month} Payroll
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-500">ID: {cycle.id}</span>
                    <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-wider text-blue-600">Status: {cycle.status}</span>
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-wider text-emerald-600">Paid: {paidCount}</span>
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-wider text-amber-600">Pending: {pendingCount}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-x-auto flex-1 bg-white">
              <table className="w-full min-w-[1120px] text-left font-pmedium">
                <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Emp ID</th>
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4 text-center">Attendance Base</th>
                    <th className="px-5 py-4 text-right">Net Salary</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <tr key={emp.id} className="group transition-colors hover:bg-slate-50/50">
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{emp.id || "--"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-pmedium text-slate-900">
                            <UserCheck size={14} className="text-slate-400" />
                            {emp.name}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[11px] font-pmedium capitalize text-slate-600">{emp.role}</td>
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{emp.department}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-center justify-center text-xs">
                            <span className="font-pmedium text-slate-900">{emp.attendance?.workingDays} <span className="text-[10px] text-slate-400 font-pmedium uppercase">Working Days</span></span>
                            <span className="text-[10px] font-pmedium text-green-600 mt-0.5">{emp.attendance?.present} Present Days</span>
                            <span className="text-[10px] font-pmedium text-amber-600 mt-0.5">{emp.attendance?.halfDays || 0} Half Days</span>
                            <span className="text-[10px] font-pmedium text-red-500 mt-0.5">{emp.attendance?.absentDays ?? emp.attendance?.unpaidLeaves} Absent Days</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="font-pmedium text-slate-900 text-base">
                            {formatCurrency(emp.financials?.netSalary, emp.financials?.currency || emp.salaryPackage?.currency || workspaceCurrency)}
                          </div>
                          {(emp.financials?.hrBonus ?? 0) > 0 && <div className="text-[9px] font-pmedium text-green-600 uppercase tracking-wider mt-0.5">+ Bonus Added</div>}
                          {(emp.financials?.hrDeductions ?? 0) > 0 && <div className="text-[9px] font-pmedium text-red-500 uppercase tracking-wider mt-0.5">- Extra Deduction</div>}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {(() => {
                            const paymentStatus = String(emp.financials?.paymentStatus || emp.payment?.status || "Pending");
                            const normalized = paymentStatus.toLowerCase();
                            const cls = normalized === "paid"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : normalized === "processing"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-slate-50 text-slate-500 border-slate-200";
                            return (
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${cls}`}>
                                {paymentStatus}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => onViewEmployee(emp)}
                            title="View breakdown"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                          >
                            <Eye size={15} strokeWidth={2.5} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center font-pmedium text-slate-400">
                        Detailed records not available for this cycle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex shrink-0">
              <button onClick={onClose} className="w-full py-3 bg-white border border-slate-200 rounded-2xl font-pmedium text-slate-600 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-wider">
                CLOSE RECORD
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  EmployeeDetailModal                                              */
/* ──────────────────────────────────────────────────────────────── */

function PayslipTemplatePicker({
  value, onChange, actionLoading, selectionDisabled, onPreview, onDownload,
}: {
  value: PayslipTemplateId;
  onChange: (templateId: PayslipTemplateId) => void;
  actionLoading: { templateId: PayslipTemplateId; action: "preview" | "download" } | null;
  selectionDisabled?: boolean;
  onPreview: (templateId: PayslipTemplateId) => void;
  onDownload: (templateId: PayslipTemplateId) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Payslip template">
      {PAYSLIP_TEMPLATES.map((template) => {
        const selected = value === template.id;
        const previewing = actionLoading?.templateId === template.id && actionLoading.action === "preview";
        const downloading = actionLoading?.templateId === template.id && actionLoading.action === "download";
        return (
          <div
            key={template.id}
            role="radio"
            aria-checked={selected}
            className={"group relative rounded-2xl border p-3 text-left transition-all focus-within:ring-2 focus-within:ring-blue-200 " + (
              selected
                ? "border-blue-500 bg-blue-50/60 shadow-sm ring-2 ring-blue-100"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            )}
          >
            <button
              type="button"
              disabled={selectionDisabled}
              onClick={() => onChange(template.id)}
              aria-label={"Select " + template.name + " payroll template"}
              className="absolute inset-0 z-0 rounded-2xl focus:outline-none disabled:cursor-not-allowed"
            />

            <div className="pointer-events-none relative z-10 flex gap-4">
              <div className="relative h-[142px] w-[104px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {template.layout === "banner" && <div className="absolute inset-x-2 top-2 h-7 rounded-sm" style={{ backgroundColor: template.accent }} />}
                {template.layout === "modern" && <div className="absolute inset-x-0 top-0 h-9" style={{ backgroundColor: "#1E3D73" }} />}
                {template.layout === "wave" && (
                  <>
                    <div className="absolute left-0 top-0 h-9 w-9 -translate-x-4 -translate-y-4 rotate-45" style={{ backgroundColor: template.accent }} />
                    <div className="absolute -bottom-4 -left-2 h-11 w-32 -rotate-6 rounded-[50%]" style={{ backgroundColor: template.accent }} />
                  </>
                )}
                {template.layout === "mono" && <div className="absolute inset-x-3 top-5 h-px bg-slate-800" />}
                <div className={"absolute left-3 right-3 " + (template.layout === "banner" ? "top-12" : "top-[52px]") + " h-2 rounded-sm"} style={{ backgroundColor: template.soft }} />
                <div className="absolute left-3 right-3 top-[68px] grid grid-cols-2 gap-1.5">
                  <div className="space-y-1.5">
                    <div className="h-1 rounded bg-slate-300" /><div className="h-1 rounded bg-slate-200" />
                    <div className="h-1 rounded bg-slate-200" /><div className="h-2 rounded" style={{ backgroundColor: template.accent }} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1 rounded bg-slate-300" /><div className="h-1 rounded bg-slate-200" />
                    <div className="h-1 rounded bg-slate-200" /><div className="h-2 rounded" style={{ backgroundColor: template.accent }} />
                  </div>
                </div>
                <div className="absolute bottom-5 left-3 right-3 h-2.5 rounded-sm" style={{ backgroundColor: template.layout === "mono" ? "#111827" : template.accent }} />

                <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/70 p-2 opacity-100 backdrop-blur-[1px] transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onPreview(template.id); }}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-[9px] font-pmedium uppercase tracking-wider text-slate-800 shadow-sm transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {previewing ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" /> : <Eye size={12} />}
                    {previewing ? "Opening" : "Preview"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onDownload(template.id); }}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/50 bg-slate-900/70 px-2 py-2 text-[9px] font-pmedium uppercase tracking-wider text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {downloading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-white" /> : <Download size={12} />}
                    {downloading ? "Saving" : "Download"}
                  </button>
                </div>
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-pmedium text-slate-800">{template.name}</p>
                    <p className="mt-1 text-[10px] font-pmedium leading-4 text-slate-400">{template.description}</p>
                  </div>
                  <span className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border " + (selected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white text-transparent")}>
                    <CheckCircle2 size={12} />
                  </span>
                </div>
                <span className="mt-3 inline-flex rounded-md px-2 py-1 text-[9px] font-pmedium uppercase tracking-wider" style={{ backgroundColor: template.soft, color: template.accent }}>
                  {template.layout === "mono" ? "B&W" : "Color"}
                </span>
                <p className="mt-4 text-[9px] font-pmedium leading-4 text-slate-400">Hover to preview or download the PDF.</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PayrollTemplateModalProps {
  open: boolean;
  selectedTemplateId: PayslipTemplateId;
  confirming: boolean;
  saving: boolean;
  actionLoading: { templateId: PayslipTemplateId; action: "preview" | "download" } | null;
  onSelect: (templateId: PayslipTemplateId) => void;
  onPreview: (templateId: PayslipTemplateId) => void;
  onDownload: (templateId: PayslipTemplateId) => void;
  onClose: () => void;
  onContinue: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

function PayrollTemplateModal({
  open, selectedTemplateId, confirming, saving, actionLoading,
  onSelect, onPreview, onDownload, onClose, onContinue, onBack, onConfirm,
}: PayrollTemplateModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0F172A]/55 p-3 backdrop-blur-sm sm:p-5"
          onClick={() => { if (!saving) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 12 }}
            className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="payroll-template-title"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-blue-50/30 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-sm"><FileText size={18} /></div>
                <div className="min-w-0">
                  <h2 id="payroll-template-title" className="truncate text-base font-pmedium text-slate-900 sm:text-lg">
                    {confirming ? "Confirm payroll template" : "Choose payroll template"}
                  </h2>
                  <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">One-time workspace setting</p>
                </div>
              </div>
              <button type="button" onClick={onClose} disabled={saving} aria-label="Close payroll template setup"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <p className="text-sm font-pmedium text-slate-800">Select one design</p>
              <p className="mb-4 mt-1 text-[11px] font-pmedium leading-5 text-slate-500">
                Hover over a template for Preview and Download. Preview opens the generated PDF in a new tab.
              </p>
              <PayslipTemplatePicker
                value={selectedTemplateId}
                onChange={onSelect}
                selectionDisabled={saving || confirming}
                actionLoading={actionLoading}
                onPreview={onPreview}
                onDownload={onDownload}
              />

              {confirming && (
                <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={18} />
                    <div>
                      <p className="text-xs font-pmedium text-amber-900">This action cannot be undone</p>
                      <p className="mt-1 text-[11px] font-pmedium leading-5 text-amber-800">
                        Once confirmed, {getPayslipTemplateName(selectedTemplateId)} is permanently locked for this workspace. The Payroll Templates button will disappear and the design cannot be changed later.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              <p className="text-[10px] font-pmedium text-slate-500">Selected: <span className="text-slate-900">{getPayslipTemplateName(selectedTemplateId)}</span></p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={confirming ? onBack : onClose} disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {confirming ? "Back" : "Cancel"}
                </button>
                <button type="button" onClick={confirming ? onConfirm : onContinue} disabled={saving}
                  className={"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300 " + (confirming ? "bg-amber-600 hover:bg-amber-700" : "bg-[#2563EB] hover:bg-blue-700")}>
                  {confirming ? <Lock size={13} /> : <CheckCircle2 size={13} />}
                  {saving ? "Locking template..." : confirming ? "Confirm & Lock Permanently" : "Use This Template"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface EmployeeDetailModalProps {
  employee: ViewingEmployee | null;
  workspaceCurrency: string;
  onClose: () => void;
  payrollStatus: string;
  cycleId?: string;
  onSaveAdjustment: (profileId: string, adj: AdjustmentForm) => void;
  adjustment: AdjustmentForm;
  setAdjustment: React.Dispatch<React.SetStateAction<AdjustmentForm>>;
  isHistoryCycle?: boolean;
  isProcessingPayslip?: boolean;
  onGeneratePayslip?: (employee: ViewingEmployee) => void;
  workspaceTemplateId?: PayslipTemplateId;
  onSendPayslip?: (employee: ViewingEmployee) => void;
}

function EmployeeDetailModal({
  employee, workspaceCurrency, onClose, payrollStatus, cycleId,
  onSaveAdjustment, adjustment, setAdjustment, isHistoryCycle,
  isProcessingPayslip, onGeneratePayslip, onSendPayslip,
  workspaceTemplateId,
}: EmployeeDetailModalProps) {
  if (!employee) return null;
  const att = employee.attendance || {};
  const fin = employee.financials || {};
  const currency = fin.currency || employee.salaryPackage?.currency || workspaceCurrency;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm"
        onClick={() => { onClose(); setAdjustment({ type: "bonus", amount: "", reason: "" }); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                <Calculator size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">{employee.name}&rsquo;s Salary Detail</h2>
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mt-0.5 truncate">{employee.role} | {employee.department} | {employee.id}</p>
              </div>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-wider text-blue-600 shrink-0">
                {isHistoryCycle ? "Historical" : "Current"}
              </span>
            </div>
            <button
              onClick={() => { onClose(); setAdjustment({ type: "bonus", amount: "", reason: "" }); }}
              className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white flex flex-col gap-5">
            <div>
              <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                <Calendar size={14} /> Auto-Calculated from Attendance
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Total Cycle Days</p><p className="mt-1 font-pmedium text-slate-900">{att.totalDays}</p></div>
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Working Days</p><p className="mt-1 font-pmedium text-blue-700">{att.workingDays}</p></div>
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Payable Days</p><p className="mt-1 font-pmedium text-slate-900">{att.payableDays}</p></div>
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Daily Rate</p><p className="mt-1 font-pmedium text-slate-900">{formatCurrency(att.dailyRate, currency)}</p></div>
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Present Days</p><p className="mt-1 font-pmedium text-green-600">{att.present}</p></div>
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Half Days</p><p className="mt-1 font-pmedium text-amber-600">{att.halfDays || 0}</p></div>
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Paid Leaves</p><p className="mt-1 font-pmedium text-green-600">{att.paidLeaves}</p></div>
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Holidays</p><p className="mt-1 font-pmedium text-green-600">{att.holidayDays || 0}</p></div>
                <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Absent Days</p><p className="mt-1 font-pmedium text-red-600">{att.absentDays ?? att.unpaidLeaves}</p></div>
                {(att.preJoiningDays ?? 0) > 0 && (
                  <div><p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Pre-Joining Days</p><p className="mt-1 font-pmedium text-slate-500">{att.preJoiningDays}</p></div>
                )}
              </div>
              <p className="mt-3 text-[10px] font-pmedium text-slate-500">Salary is calculated only from the employee's date of joining if they joined during this cycle; days before joining are excluded and unpaid.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="flex flex-col h-full">
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <FileText size={14} /> Salary Breakdown
                </h3>
                <div className="flex-1 flex flex-col bg-slate-50/60 border border-slate-100 p-4 rounded-2xl space-y-2">
                  <Row label="Monthly Base Salary" value={formatCurrency(fin.baseSalary, currency)} />
                  <Row label="Attendance Earned" value={formatCurrency(fin.attendanceGrossPay, currency)} valueClass="text-blue-600" />
                  <Row label="Benefits / Allowances" value={`+${formatCurrency(fin.benefits, currency)}`} valueClass="text-emerald-600" />
                  <div className="border-t border-slate-200 my-1" />
                  <Row label="Present Pay" value={formatCurrency(att.presentPay, currency)} />
                  <Row label="Leave Pay" value={formatCurrency(att.leavePay, currency)} />
                  <Row label="Half Day Pay" value={`${formatCurrency(att.halfDayPay, currency)} (${att.halfDays || 0} half day(s))`} valueClass="text-amber-600" />
                  <Row label="Holiday Pay" value={`${formatCurrency(att.holidayPay, currency)} (${att.holidayDays || 0} day(s))`} valueClass="text-green-600" />
                  <Row label="Standard Deductions (Tax/PF)" value={`-${formatCurrency(fin.standardDeductions, currency)}`} valueClass="text-red-500" />
                  {(fin.attendanceDeductions ?? 0) > 0 && (
                    <Row label="Attendance Loss" value={`-${formatCurrency(fin.attendanceDeductions, currency)}`} valueClass="text-red-500" />
                  )}
                  {(fin.hrBonus ?? 0) > 0 && (
                    <div className="bg-green-50 p-2 rounded-lg -mx-2 space-y-1">
                      <span className="text-[9px] font-pmedium text-green-700 uppercase tracking-widest">Manual Bonus</span>
                      {(employee.manualAdjustments || []).filter((a) => a.type === "bonus").map((a, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-pmedium text-green-700/80">{a.reason || "Bonus"}</span>
                          <span className="font-pmedium text-green-600">+{formatCurrency(a.amount, currency)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-xs border-t border-green-200 pt-1">
                        <span className="font-pmedium text-green-800">Total Bonus</span>
                        <span className="font-pmedium text-green-700">+{formatCurrency(fin.hrBonus, currency)}</span>
                      </div>
                    </div>
                  )}
                  {(fin.hrDeductions ?? 0) > 0 && (
                    <div className="bg-red-50 p-2 rounded-lg -mx-2 space-y-1">
                      <span className="text-[9px] font-pmedium text-red-700 uppercase tracking-widest">Manual Deduction</span>
                      {(employee.manualAdjustments || []).filter((a) => a.type === "deduction").map((a, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-pmedium text-red-700/80">{a.reason || "Deduction"}</span>
                          <span className="font-pmedium text-red-600">-{formatCurrency(a.amount, currency)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-xs border-t border-red-200 pt-1">
                        <span className="font-pmedium text-red-800">Total Deduction</span>
                        <span className="font-pmedium text-red-700">-{formatCurrency(fin.hrDeductions, currency)}</span>
                      </div>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-300 pt-2 flex justify-between items-center mt-auto">
                    <span className="font-pmedium text-slate-900 text-xs">NET PAYABLE</span>
                    <span className="font-pmedium text-blue-600 text-lg">{formatCurrency(fin.netSalary, currency)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col h-full">
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} /> HR Adjustments
                </h3>
                <div className="flex-1 flex flex-col bg-slate-50/60 border border-slate-100 p-4 rounded-2xl">
                  {isHistoryCycle ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <Lock size={40} className="text-slate-300 mb-3" />
                      <h4 className="text-sm font-pmedium text-slate-900">Historical Record</h4>
                      <p className="text-xs font-pmedium text-slate-500 mt-2">This is a completed payroll cycle. Adjustments cannot be made to past records.</p>
                    </div>
                  ) : payrollStatus !== "Pending" ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <CheckCircle2 size={40} className="text-slate-300 mb-3" />
                      <h4 className="text-sm font-pmedium text-slate-900">Payroll is Locked</h4>
                      <p className="text-xs font-pmedium text-slate-500 mt-2">
                        Adjustments can only be made while the payroll status is &lsquo;Pending&rsquo;. Current status is <strong className="font-pmedium">{payrollStatus}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col space-y-3">
                      <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
                        <button
                          onClick={() => setAdjustment({ ...adjustment, type: "bonus" })}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-pmedium uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${adjustment.type === "bonus" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                        >
                          <Plus size={12} /> Add Bonus
                        </button>
                        <button
                          onClick={() => setAdjustment({ ...adjustment, type: "deduction" })}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-pmedium uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${adjustment.type === "deduction" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                        >
                          <Minus size={12} /> Add Deduction
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-pmedium uppercase tracking-wider text-slate-500">{currency}</span>
                          <input
                            type="number" placeholder="0"
                            className="w-full pl-14 pr-4 py-2.5 bg-white border-2 border-transparent rounded-xl font-pmedium text-slate-900 focus:border-[#2563EB] outline-none"
                            value={adjustment.amount}
                            onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                          Type of {adjustment.type === "bonus" ? "Bonus" : "Deduction"}
                        </label>
                        <textarea
                          placeholder={adjustment.type === "bonus" ? "e.g. Performance Bonus Q1" : "e.g. Late Attendance Penalty"}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-white border-2 border-transparent rounded-xl font-pmedium text-slate-700 outline-none resize-none"
                          value={adjustment.reason}
                          onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (employee.profileId && cycleId) {
                            onSaveAdjustment(employee.profileId, adjustment);
                          }
                        }}
                        disabled={!adjustment.amount || !adjustment.reason}
                        className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl text-[10px] font-pmedium uppercase tracking-wider shadow-sm disabled:bg-slate-300 disabled:shadow-none hover:bg-blue-700 transition-all mt-auto"
                      >
                        Apply Adjustment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                <FileText size={14} /> Payslip
              </h3>
              {(() => {
                const ps = employee.payslip || {};
                const paymentStatus = String(fin.paymentStatus || employee.payment?.status || "");
                const isPaid = paymentStatus.toLowerCase() === "paid";
                const canHavePayslip = isPaid && Number(fin.netSalary || 0) > 0;

                if (ps.id) {
                  return (
                    <div className="flex flex-wrap items-center gap-3 bg-slate-50/60 border border-slate-100 p-4 rounded-2xl">
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-xs font-pmedium text-slate-800">
                          Payslip generated{ps.fileName ? ` — ${ps.fileName}` : ""}
                        </p>
                        <p className="text-[10px] font-pmedium text-slate-400 mt-1">
                          Template: {getPayslipTemplateName(ps.templateId)}
                        </p>
                        <p className="text-[10px] font-pmedium text-slate-400 mt-1">
                          {ps.generatedAt
                            ? `Generated ${new Date(ps.generatedAt).toLocaleDateString()}`
                            : "Generated but no date recorded."}
                        </p>
                        {ps.sentAt ? (
                          <span className="inline-flex items-center gap-1 mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-wider text-emerald-600">
                            <CheckCircle2 size={11} /> Sent to employee
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-wider text-amber-600">
                            <Send size={11} /> Not sent yet
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(ps.fileUrl || ps.url) && (
                          <button
                            onClick={() => window.open(ps.fileUrl || ps.url, "_blank", "noopener,noreferrer")}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-pmedium uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all"
                          >
                            <FileText size={13} /> View Payslip
                          </button>
                        )}
                        {!ps.sentAt && (
                          <button
                            onClick={() => onSendPayslip?.(employee)}
                            disabled={isProcessingPayslip}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-[10px] font-pmedium uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all disabled:bg-slate-300 disabled:shadow-none"
                          >
                            <Send size={13} /> {isProcessingPayslip ? "Processing..." : "Send Payslip"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                if (canHavePayslip) {
                  if (!workspaceTemplateId) {
                    return (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={17} />
                          <div>
                            <p className="text-xs font-pmedium text-amber-900">Payroll template setup required</p>
                            <p className="mt-1 text-[10px] font-pmedium leading-5 text-amber-800">
                              The HR manager must choose and permanently confirm a template from the Payroll Templates button beside Prepare Payroll before any payslip can be generated.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="min-w-[200px] flex-1">
                        <p className="text-xs font-pmedium text-slate-800">Ready to generate payslip</p>
                        <p className="mt-1 text-[10px] font-pmedium text-slate-400">
                          Workspace template: {getPayslipTemplateName(workspaceTemplateId)}
                        </p>
                      </div>
                      <button
                        onClick={() => onGeneratePayslip?.(employee)}
                        disabled={isProcessingPayslip}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                      >
                        <FileText size={13} /> {isProcessingPayslip ? "Generating..." : "Generate Payslip"}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center justify-center text-center p-4 bg-slate-50/60 border border-slate-100 rounded-2xl">
                    <p className="text-xs font-pmedium text-slate-500">
                      Payslip becomes available once Finance confirms this employee&rsquo;s payment as paid.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, value, valueClass = "text-slate-900" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="font-pmedium text-slate-600">{label}</span>
      <span className={`font-pmedium ${valueClass}`}>{value}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  Main Page Component                                              */
/* ──────────────────────────────────────────────────────────────── */

export default function HRPayrollPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("master");
  const [masterStatusFilter, setMasterStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [handoffMode, setHandoffMode] = useState("prepare");
  const [isSubmittingHandoff, setIsSubmittingHandoff] = useState(false);
  const [handoffError, setHandoffError] = useState("");

  // Payroll for a month is only complete once that month ends, so default to
  // the last completed month rather than the in-progress current month.
  const defaultPayrollDate = new Date();
  defaultPayrollDate.setDate(1);
  defaultPayrollDate.setMonth(defaultPayrollDate.getMonth() - 1);
  const [selectedMonth, setSelectedMonth] = useState(PAYROLL_MONTH_NAMES[defaultPayrollDate.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(defaultPayrollDate.getFullYear()));

  const [payrollData, setPayrollData] = useState<PayrollState>({
    currentCycle: null,
    history: [],
    filters: { departments: [], roles: [] },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [viewingEmployee, setViewingEmployee] = useState<ViewingEmployee | null>(null);
  const [viewingHistoryCycle, setViewingHistoryCycle] = useState<HistoryRecord | null>(null);

  const [adjustment, setAdjustment] = useState<AdjustmentForm>({ type: "bonus", amount: "", reason: "" });
  const [isProcessingPayslip, setIsProcessingPayslip] = useState(false);
  const [selectedPayslipTemplate, setSelectedPayslipTemplate] = useState<PayslipTemplateId>("modern-blue");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTemplateConfirmationOpen, setIsTemplateConfirmationOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templatePdfAction, setTemplatePdfAction] = useState<{
    templateId: PayslipTemplateId;
    action: "preview" | "download";
  } | null>(null);

  const payrollCycle = payrollData.currentCycle;
  const payrollMaster = useMemo(
    () => Array.isArray(payrollCycle?.employees) ? payrollCycle.employees : [],
    [payrollCycle],
  );
  const payrollHistory = useMemo(
    () => Array.isArray(payrollData.history) ? payrollData.history : [],
    [payrollData.history],
  );
  const payrollStatus = payrollCycle?.status || "Pending";
  const payrollCurrency = payrollData.settings?.currency || DEFAULT_WORKSPACE_CURRENCY;
  const payrollTimeZone = payrollData.settings?.timezone || PAYROLL_TIME_ZONE;
  const workspacePayslipTemplate = payrollData.settings?.payslipTemplateLocked
    ? payrollData.settings?.payslipTemplateId
    : undefined;
  const canConfigurePayrollTemplate = payrollData.settings?.canConfigurePayslipTemplate === true;

  const ctcPayrollEmployees = useMemo(
    () => payrollMaster.filter((emp) => (
      emp.hasSalaryPackage !== false &&
      Number(emp.salaryPackage?.annualCtc || emp.salaryPackage?.grossAnnual || 0) > 0
    )),
    [payrollMaster],
  );

  const payablePayrollEmployees = useMemo(
    () => ctcPayrollEmployees.filter((emp) => Number(emp.financials?.netSalary || 0) > 0),
    [ctcPayrollEmployees],
  );

  const zeroNetPayrollEmployees = ctcPayrollEmployees.length - payablePayrollEmployees.length;

  // Founders/owners/super admins conceptually span every department, so listing
  // each department name in the filter is redundant - show a single "All Departments" pill.
  const isFullAccessRole = useMemo(() => {
    const currentUser = getStoredUser();
    const normalized = String(currentUser?.workspaceMembership?.role || currentUser?.role || "").trim().toLowerCase();
    return normalized.includes("founder") || normalized.includes("owner")
      || (normalized.includes("super") && normalized.includes("admin"));
  }, []);

  const departments = [
    "All Departments",
    ...(
      Array.isArray(payrollData.filters?.departments) && payrollData.filters.departments.length > 0
        ? payrollData.filters.departments
        : ["HR", "Sales", "Finance", "Administration", "Tech", "IT", "Maintenance"]
    ),
  ];

  const roles = [
    "All Roles",
    ...(
      Array.isArray(payrollData.filters?.roles) && payrollData.filters.roles.length > 0
        ? payrollData.filters.roles
        : ["Employee", "Manager", "Admin", "Super Admin"]
    ),
  ];

  const loadPayrollData = useCallback(async (month: string, year: string) => {
    try {
      setIsLoading(true);
      const response = await getPayrollSnapshot({ month, year });
      const envelope = response?.data || {};
      const payload = envelope?.data || envelope;

      const nextPayrollData = {
        currentCycle: payload.currentCycle || null,
        history: Array.isArray(payload.history) ? payload.history : [],
        filters: payload.filters || { departments: [], roles: [] },
        settings: payload.settings || { currency: DEFAULT_WORKSPACE_CURRENCY, timezone: PAYROLL_TIME_ZONE },
      };
      setPayrollData(nextPayrollData);
      setErrorMessage("");
      return nextPayrollData;
    } catch (error: any) {
      setPayrollData({ currentCycle: null, history: [], filters: { departments: [], roles: [] } });
      setErrorMessage(error?.message || "Failed to load payroll data.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setViewingEmployee(null);
    setViewingHistoryCycle(null);
    void loadPayrollData(selectedMonth, selectedYear);
  }, [loadPayrollData, selectedMonth, selectedYear]);

  const handleTemplatePdfAction = async (
    templateId: PayslipTemplateId,
    action: "preview" | "download",
  ) => {
    if (templatePdfAction) return;

    let previewWindow: Window | null = null;
    if (action === "preview") {
      previewWindow = window.open("about:blank", "_blank");
      if (!previewWindow) {
        toast.error("Allow pop-ups to preview the payroll template PDF.");
        return;
      }
      previewWindow.opener = null;
      previewWindow.document.title = "Generating payroll template preview...";
      previewWindow.document.body.innerHTML = '<p style="font-family: sans-serif; padding: 24px;">Generating PDF preview...</p>';
    }

    setTemplatePdfAction({ templateId, action });
    try {
      const response = await getPayrollPayslipTemplatePreview(templateId);
      const objectUrl = URL.createObjectURL(response.data);

      if (action === "preview" && previewWindow) {
        previewWindow.location.href = objectUrl;
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } else {
        const downloadLink = document.createElement("a");
        downloadLink.href = objectUrl;
        downloadLink.download = "payroll-" + templateId + "-template.pdf";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      }
    } catch (error: any) {
      previewWindow?.close();
      toast.error(error?.message || "Unable to generate the payroll template PDF.");
    } finally {
      setTemplatePdfAction(null);
    }
  };

  const closeTemplateModal = () => {
    if (isSavingTemplate) return;
    setIsTemplateModalOpen(false);
    setIsTemplateConfirmationOpen(false);
  };

  const handleLockPayrollTemplate = async () => {
    if (isSavingTemplate) return;
    setIsSavingTemplate(true);
    try {
      const response = await selectPayrollPayslipTemplate(selectedPayslipTemplate);
      const envelope = response?.data || {};
      const lockedTemplate = envelope?.data || envelope;
      setPayrollData((current) => ({
        ...current,
        settings: {
          ...(current.settings || {}),
          payslipTemplateId: (lockedTemplate.id || selectedPayslipTemplate) as PayslipTemplateId,
          payslipTemplateLocked: true,
          payslipTemplateLockedAt: lockedTemplate.lockedAt || new Date().toISOString(),
        },
      }));
      toast.success("Payroll template selected and locked permanently.");
      setIsTemplateModalOpen(false);
      setIsTemplateConfirmationOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to lock the payroll template.");
      await loadPayrollData(selectedMonth, selectedYear);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const filteredMaster = useMemo(() => {
    return ctcPayrollEmployees.filter((emp) => {
      const matchesDept = departmentFilter === "All Departments" || emp.department === departmentFilter;
      const matchesRole = roleFilter === "All Roles" || emp.role === roleFilter;
      const matchesSearch = (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.id || "").toLowerCase().includes(searchQuery.toLowerCase());
      const isPaid = String(emp.financials?.paymentStatus || emp.payment?.status || "").toLowerCase() === "paid";
      const matchesStatus = masterStatusFilter === "all" || (masterStatusFilter === "completed" ? isPaid : !isPaid);
      return matchesDept && matchesRole && matchesSearch && matchesStatus;
    });
  }, [ctcPayrollEmployees, departmentFilter, roleFilter, searchQuery, masterStatusFilter]);

  const currentTotalNet = payablePayrollEmployees.reduce((sum, emp) => sum + (emp.financials?.netSalary || 0), 0);
  const currentTotalBonus = payablePayrollEmployees.reduce(
    (sum, emp) => sum + (emp.financials?.benefits || 0) + (emp.financials?.hrBonus || 0),
    0,
  );

  const openPayrollHandoffModal = (mode = "prepare") => {
    setHandoffMode(mode);
    setHandoffError("");
    setIsHandoffModalOpen(true);
  };

  const handleConfirmPayrollHandoff = async () => {
    setIsSubmittingHandoff(true);
    setHandoffError("");

    try {
      let targetCycleId = payrollCycle?.id;

      if (handoffMode === "prepare") {
        const prepareResponse = await preparePayrollCycle({ month: selectedMonth, year: selectedYear });
        const prepareEnvelope = prepareResponse?.data || {};
        targetCycleId = (prepareEnvelope?.data || prepareEnvelope)?.currentCycle?.id || targetCycleId;
      }

      if (!targetCycleId) throw new Error("Payroll cycle not found.");

      await updatePayrollCycleStatus(targetCycleId, { status: "Sent to Finance" });
      await loadPayrollData(selectedMonth, selectedYear);
      setIsHandoffModalOpen(false);

      const currentUser = getStoredUser();
      if (currentUser && canAccessFinanceDashboard(currentUser)) {
        navigate(
          `/dashboard/finance/billing-payments?tab=payroll&month=${encodeURIComponent(selectedMonth)}&year=${encodeURIComponent(selectedYear)}`,
          { replace: true },
        );
      } else if (currentUser) {
        navigate(resolvePostLoginRoute(currentUser), { replace: true });
      }
    } catch (error: any) {
      setHandoffError(error?.message || "Failed to send payroll to finance.");
    } finally {
      setIsSubmittingHandoff(false);
    }
  };

  const handleSaveAdjustment = async (profileId: string, adj: AdjustmentForm) => {
    if (!adj.amount || !adj.reason || !payrollCycle?.id) return;
    try {
      await addPayrollAdjustment(payrollCycle.id, profileId, adj);
      const refreshed = await loadPayrollData(selectedMonth, selectedYear);
      const updatedEmployee = refreshed?.currentCycle?.employees?.find((emp: EmployeePayrollData) => emp.profileId === profileId);
      if (updatedEmployee) setViewingEmployee({ ...updatedEmployee, isHistory: false });
      setAdjustment({ type: "bonus", amount: "", reason: "" });
    } catch (error: any) {
      alert(error?.message || "Failed to save payroll adjustment.");
    }
  };

  const refreshViewingEmployee = async (employee: ViewingEmployee) => {
    const refreshed = await loadPayrollData(selectedMonth, selectedYear);
    const updatedEmployee = refreshed?.currentCycle?.employees?.find((emp: EmployeePayrollData) => emp.profileId === employee.profileId);
    if (updatedEmployee) setViewingEmployee({ ...updatedEmployee, isHistory: employee.isHistory, cycleId: employee.cycleId || payrollCycle?.id });
    return updatedEmployee;
  };

  const handleGeneratePayslip = async (employee: ViewingEmployee) => {
    const cycleId = employee.cycleId || payrollCycle?.id;
    if (!cycleId || !employee.profileId || isProcessingPayslip) return;
    setIsProcessingPayslip(true);
    try {
      const res = await generatePayrollPayslip(cycleId, employee.profileId);
      const updated = res?.data?.data || res?.data || {};
      toast.success(`Payslip generated for ${employee.name}.`);
      const refreshedEmployee = await refreshViewingEmployee(employee);
      if (!refreshedEmployee && (updated?.id || updated?._id)) {
        const fileUrl = updated.fileUrl || updated.payslipUrl || "";
        setViewingEmployee({
          ...employee,
          payslip: {
            id: updated.id || updated._id,
            fileUrl,
            url: fileUrl,
            fileName: updated.fileName || "",
            generatedAt: updated.generatedAt || new Date().toISOString(),
            templateId: workspacePayslipTemplate,
          },
        });
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate payslip.");
    } finally {
      setIsProcessingPayslip(false);
    }
  };

  const handleSendPayrollPayslip = async (employee: ViewingEmployee) => {
    if (!employee.payslip?.id || isProcessingPayslip) return;
    setIsProcessingPayslip(true);
    try {
      const res = await sendPayrollPayslip(employee.payslip.id);
      toast.success(`Payslip sent to ${employee.name}.`);
      const refreshedEmployee = await refreshViewingEmployee(employee);
      if (!refreshedEmployee) {
        setViewingEmployee({
          ...employee,
          payslip: { ...(employee.payslip || {}), sentAt: res?.sentToEmployeeAt || new Date().toISOString() },
        });
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to send payslip.");
    } finally {
      setIsProcessingPayslip(false);
    }
  };

  const historyStats = useMemo(() => {
    const totalDisbursed = payrollHistory.reduce((sum, r) => {
      const amt = Number(String(r.totalAmount || "0").replace(/[^0-9.]/g, ""));
      return sum + amt;
    }, 0);
    const totalEmployees = payrollHistory.reduce((sum, r) => sum + (r.totalEmployees || 0), 0);
    const latestDate = payrollHistory.length > 0
      ? formatPayrollHistoryDate(
          payrollHistory.sort((a, b) => new Date(b.sentToFinanceAt || b.processedOn || "").getTime() - new Date(a.sentToFinanceAt || a.processedOn || "").getTime())[0]
            ?.sentToFinanceAt || payrollHistory[0]?.processedOn,
          payrollTimeZone,
        )
      : "—";
    return { totalDisbursed, totalEmployees, latestDate };
  }, [payrollHistory, payrollTimeZone]);

  const statCards = useMemo(() => {
    if (activeTab === "master") {
      return [
        {
          key: "total-employees", label: "Total Employees",
          value: payrollMaster.length, type: "number",
          extra: `${payablePayrollEmployees.length} ready to process`,
          icon: User, className: "border-l-4 border-l-blue-500",
          iconClass: "bg-blue-50 text-blue-600",
          valueClass: "text-blue-600",
        },
        {
          key: "total-payout", label: `Total Payout (${selectedMonth})`,
          value: currentTotalNet, type: "currency",
          icon: Coins, className: "border-l-4 border-l-emerald-500",
          iconClass: "bg-emerald-50 text-emerald-600",
          valueClass: "text-emerald-600",
        },
        {
          key: "additions-bonus", label: "Additions & Bonus",
          value: currentTotalBonus, type: "currency",
          icon: Calculator, className: "border-l-4 border-l-amber-500",
          iconClass: "bg-amber-50 text-amber-600",
          valueClass: "text-amber-600",
        },
        {
          key: "cycle-status", label: "Cycle Status",
          value: payrollStatus, type: "text",
          icon: CheckCircle2, className: "border-l-4 border-l-purple-500",
          iconClass: "bg-purple-50 text-purple-600",
          valueClass: "text-purple-600",
        },
      ];
    }
    return [
      {
        key: "total-employees", label: "Total Employees",
        value: historyStats.totalEmployees, type: "number",
        icon: User, className: "border-l-4 border-l-blue-500",
        iconClass: "bg-blue-50 text-blue-600",
        valueClass: "text-blue-600",
      },
      {
        key: "total-cycles", label: "Cycles Processed",
        value: payrollHistory.length, type: "number",
        icon: History, className: "border-l-4 border-l-blue-500",
        iconClass: "bg-blue-50 text-blue-600",
        valueClass: "text-blue-600",
      },
      {
        key: "total-disbursed", label: "Total Disbursed",
        value: historyStats.totalDisbursed, type: "currency",
        icon: Coins, className: "border-l-4 border-l-emerald-500",
        iconClass: "bg-emerald-50 text-emerald-600",
        valueClass: "text-emerald-600",
      },
      {
        key: "latest-handoff", label: "Latest Handoff",
        value: historyStats.latestDate, type: "text",
        icon: Calendar, className: "border-l-4 border-l-purple-500",
        iconClass: "bg-purple-50 text-purple-600",
        valueClass: "text-purple-600",
      },
    ];
  }, [activeTab, payrollMaster, currentTotalNet, payablePayrollEmployees, currentTotalBonus, payrollStatus, selectedMonth, payrollHistory, historyStats]);

  const getStatusBadge = (status: string) => {
    if (status === "Pending") return "bg-slate-50 text-slate-500 border-slate-200";
    if (status === "Prepared") return "bg-amber-50 text-amber-600 border-amber-200";
    return "bg-blue-50 text-blue-600 border-blue-200";
  };

  /* ────────── Loading skeleton rows for master table ────────── */
  function MasterSkeletonRows() {
    return (
      <>
        {Array.from({ length: 7 }).map((_, idx) => (
          <tr key={`payroll-master-skel-${idx}`} className="animate-pulse">
            <td className="px-5 py-4"><Skeleton className="h-3 w-16" /></td>
            <td className="px-5 py-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-40" />
              </div>
            </td>
            <td className="px-5 py-4"><Skeleton className="h-3 w-20" /></td>
            <td className="px-5 py-4"><Skeleton className="h-3 w-24" /></td>
            <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-28 ml-auto mb-2" /><Skeleton className="h-3 w-24 ml-auto" /></td>
            <td className="px-5 py-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 mx-auto" /><Skeleton className="h-3 w-24 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto" /><Skeleton className="h-3 w-24 mx-auto" />
              </div>
            </td>
            <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-28 ml-auto mb-2" /><Skeleton className="h-3 w-24 ml-auto" /></td>
            <td className="px-5 py-4 text-center"><Skeleton className="h-6 w-20 rounded-full mx-auto" /></td>
            <td className="px-5 py-4 text-center"><Skeleton className="h-8 w-8 rounded-lg mx-auto" /></td>
          </tr>
        ))}
      </>
    );
  }

  function HistorySkeletonRows() {
    return (
      <>
        {Array.from({ length: 6 }).map((_, idx) => (
          <tr key={`payroll-history-skel-${idx}`} className="animate-pulse">
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
              </div>
            </td>
            <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
            <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
            <td className="px-5 py-4 text-center"><Skeleton className="h-6 w-12 rounded-full mx-auto" /></td>
            <td className="px-5 py-4 text-center"><Skeleton className="h-6 w-12 rounded-full mx-auto" /></td>
            <td className="px-5 py-4 text-center"><Skeleton className="h-6 w-12 rounded-full mx-auto" /></td>
            <td className="px-5 py-4 text-center"><Skeleton className="h-8 w-8 rounded-lg mx-auto" /></td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-title flex items-center gap-1.5 font-pmedium uppercase text-primary">
                Payroll Management
              </h2>
              <p className="mt-1 text-xs font-pmedium text-slate-500">
                Calculate monthly salary from employee CTC, apply attendance deductions and send the cycle to Finance.
              </p>
            </div>

          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-pmedium text-rose-700 flex items-center justify-between gap-4">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => loadPayrollData(selectedMonth, selectedYear)}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[10px] font-pmedium uppercase tracking-wider"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Main Tabs (pill-style, before stat cards) ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button
              onClick={() => { setActiveTab("master"); setSearchQuery(""); }}
              className={`flex-1 px-8 py-2.5 rounded-xl text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                activeTab === "master" 
                ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              PAYROLL MASTER
            </button>
            <button
              onClick={() => { setActiveTab("history"); setSearchQuery(""); }}
              className={`flex-1 px-8 py-2.5 rounded-xl text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                activeTab === "history" ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              PAYROLL HISTORY
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div data-tour="hr-payroll-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {statCards.map((card) => {
              const Icon = card.icon;
              const isLoadingActive = isLoading && activeTab === "master" && card.key !== "cycle-status";
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.className}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    {isLoadingActive ? (
                      <Skeleton className="h-6 w-20 mt-1" />
                    ) : card.type === "currency" ? (
                      <p className={`text-[15px] font-pmedium ${card.valueClass || "text-slate-900"}`}>{formatCurrency(card.value as number, payrollCurrency)}</p>
                    ) : card.type === "text" ? (
                      <p className={`text-[15px] font-pmedium mt-1 truncate ${card.valueClass || "text-slate-900"}`}>{String(card.value)}</p>
                    ) : (
                      <p className={`text-[15px] font-pmedium ${card.valueClass || "text-slate-900"}`}>{String(card.value)}</p>
                    )}
                    {"extra" in card && card.extra && !isLoading && (
                      <p className="text-[9px] font-pmedium text-amber-600 uppercase tracking-wider mt-1">{card.extra}</p>
                    )}
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Data panel header row — same filters on both tabs */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
              {/* Status sub-tabs */}
              {activeTab === "master" ? (
                <div data-tour="hr-payroll-status-filters" className="flex flex-wrap items-center gap-1.5">
                  {([
                    { key: "all", label: "All" },
                    { key: "pending", label: "Pending" },
                    { key: "completed", label: "Completed" },
                  ] as const).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setMasterStatusFilter(tab.key)}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] sm:text-[12px] font-pmedium transition-all ${
                        masterStatusFilter === tab.key
                          ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                          : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : <div />}

              <div className="flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto">
                <div className="relative">
                  <select
                    className="min-w-[120px] cursor-pointer appearance-none rounded-lg border border-blue-100 bg-blue-50/50 py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm outline-none hover:bg-blue-50"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2563EB]/60 pointer-events-none" />
                </div>
                {isFullAccessRole ? (
                  <div
                    title="Full workspace access"
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm"
                  >
                    <Building2 size={13} />
                    All Departments
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      className="min-w-[150px] cursor-pointer appearance-none rounded-lg border border-blue-100 bg-blue-50/50 py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm outline-none hover:bg-blue-50"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2563EB]/60 pointer-events-none" />
                  </div>
                )}
                <div className="relative min-w-[220px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    data-tour="hr-payroll-search"
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
              </div>
            </div>

            {/* Payroll Master Tab */}
            {activeTab === "master" && (
              <div className="flex flex-col flex-1">
                {/* Cycle action banner */}
                <div data-tour="hr-payroll-cycle-actions" className="bg-linear-to-r from-slate-900 to-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center px-8 gap-4">
                  <div className="text-white">
                    <p className="text-sm font-semibold">Prepare Payroll for {selectedMonth} {selectedYear}</p>
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-wider mt-0.5 flex items-center gap-2">
                      Current Status:{" "}
                      <span className={`px-2 py-0.5 rounded ${payrollStatus === "Pending" ? "bg-slate-700" : payrollStatus === "Prepared" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500 text-white"}`}>
                        {payrollStatus}
                      </span>
                    </p>
                    {zeroNetPayrollEmployees > 0 && (
                      <p className="mt-2 text-[10px] font-pmedium text-amber-300 uppercase tracking-wider">
                        {zeroNetPayrollEmployees} employee(s) with zero net pay are hidden from finance handoff
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">

                    <div className="relative">
                      <select
                        className="min-w-[130px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#0F172A] shadow-sm outline-none hover:bg-slate-50"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      >
                        {PAYROLL_MONTH_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select
                        className="min-w-[90px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#0F172A] shadow-sm outline-none hover:bg-slate-50"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                      >
                        {YEARS_LIST.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {canConfigurePayrollTemplate && !payrollData.settings?.payslipTemplateLocked && !isLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsTemplateConfirmationOpen(false);
                          setIsTemplateModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-300/60 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-[#2563EB] shadow-lg shadow-slate-950/20 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <FileText size={14} /> Payroll Templates
                      </button>
                    )}
                    {workspacePayslipTemplate && !isLoading && (
                      <button
                        type="button"
                        onClick={() => void handleTemplatePdfAction(workspacePayslipTemplate, "preview")}
                        disabled={Boolean(templatePdfAction)}
                        title="Preview the confirmed payroll template in a new tab"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-[#0F172A] shadow-lg shadow-slate-950/20 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FileText size={14} className="text-[#2563EB]" />
                        Template: {getPayslipTemplateName(workspacePayslipTemplate)}
                      </button>
                    )}
                    {payrollStatus === "Pending" && (
                      <button
                        onClick={() => openPayrollHandoffModal("prepare")}
                        disabled={payablePayrollEmployees.length === 0}
                        title={payablePayrollEmployees.length === 0 ? "Add a valid CTC and attendance data before preparing payroll." : undefined}
                        className="px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-xs hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                      >
                        <Calculator size={14} /> PREPARE PAYROLL (LOCK DATA)
                      </button>
                    )}
                    {payrollStatus === "Prepared" && (
                      <button
                        onClick={() => openPayrollHandoffModal("send")}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-pmedium text-xs hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-all flex items-center gap-2 animate-pulse"
                      >
                        <Send size={14} /> SEND TO FINANCE
                      </button>
                    )}
                    {payrollStatus === "Sent to Finance" && (
                      <div className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40">
                        <CheckCircle2 size={14} /> AWAITING FINANCE PROCESSING
                      </div>
                    )}
                    {payrollStatus === "Paid" && (
                      <div className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40">
                        <CheckCircle2 size={14} /> PAYMENT COMPLETED
                      </div>
                    )}
                  </div>
                </div>

                {/* Master table */}
                <div className="overflow-x-auto flex-1">
                  <table data-tour="hr-payroll-table" className="w-full min-w-[1120px] text-left font-pmedium">
                    <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Emp ID</th>
                        <th className="px-5 py-4">Employee</th>
                        <th className="px-5 py-4">Role</th>
                        <th className="px-5 py-4">Department</th>
                        <th className="px-5 py-4 text-right">CTC & Monthly Salary</th>
                        <th className="px-5 py-4 text-center">Attendance Base</th>
                        <th className="px-5 py-4 text-right">Net Salary</th>
                        <th className="px-5 py-4 text-center">Status</th>
                        <th className="px-5 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {isLoading ? <MasterSkeletonRows /> : (
                        filteredMaster.length > 0 ? (
                          filteredMaster.map((emp) => (
                            <tr key={emp.id} className="group transition-colors hover:bg-slate-50/50">
                              <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{emp.id || "--"}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 font-pmedium text-slate-900">
                                  <UserCheck size={14} className="text-slate-400" />
                                  {emp.name}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-[11px] font-pmedium capitalize text-slate-600">{emp.role}</td>
                              <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{emp.department}</td>
                              <td className="px-5 py-4 text-right">
                                <div className="font-pmedium text-slate-900 text-sm">
                                  {formatCurrency(emp.salaryPackage?.annualCtc || emp.salaryPackage?.grossAnnual, emp.salaryPackage?.currency || payrollCurrency)}
                                </div>
                                <div className="mt-0.5 text-[10px] font-pmedium uppercase tracking-wider text-blue-600">
                                  {formatCurrency(emp.salaryPackage?.monthlyCtc || emp.salaryPackage?.grossMonthly, emp.salaryPackage?.currency || payrollCurrency)} / month
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col items-center justify-center text-xs">
                                  <span className="font-pmedium text-slate-900">{emp.attendance?.workingDays} <span className="text-[10px] text-slate-400 font-pmedium uppercase">Working Days</span></span>
                                  <span className="text-[10px] font-pmedium text-green-600 mt-0.5">{emp.attendance?.present} Present Days</span>
                                  <span className="text-[10px] font-pmedium text-amber-600 mt-0.5">{emp.attendance?.halfDays || 0} Half Days</span>
                                  <span className="text-[10px] font-pmedium text-red-500 mt-0.5">{emp.attendance?.absentDays ?? emp.attendance?.unpaidLeaves} Absent Days</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="font-pmedium text-slate-900 text-base">{formatCurrency(emp.financials?.netSalary, emp.financials?.currency || payrollCurrency)}</div>
                                {(emp.financials?.benefits ?? 0) > 0 && <div className="text-[9px] font-pmedium text-indigo-600 uppercase tracking-wider mt-0.5">+ Benefits Added</div>}
                                {(emp.financials?.hrBonus ?? 0) > 0 && <div className="text-[9px] font-pmedium text-green-600 uppercase tracking-wider mt-0.5">+ Manual Bonus</div>}
                                {((emp.financials?.attendanceDeductions ?? 0) > 0 || (emp.financials?.hrDeductions ?? 0) > 0) && (
                                  <div className="text-[9px] font-pmedium text-red-500 uppercase tracking-wider mt-0.5">- Deductions Applied</div>
                                )}
                              </td>
                              <td className="px-5 py-4 text-center">
                                {(() => {
                                  const empPaymentStatus = String(emp.financials?.paymentStatus || emp.payment?.status || payrollStatus);
                                  const normalized = empPaymentStatus.toLowerCase();
                                  const cls = normalized === "paid"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    : normalized === "processing"
                                      ? "bg-amber-50 text-amber-600 border-amber-200"
                                      : getStatusBadge(payrollStatus);
                                  return (
                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${cls}`}>
                                      {empPaymentStatus}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <button
                                  onClick={() => setViewingEmployee({ ...(emp as EmployeePayrollData), isHistory: false })}
                                  title="View breakdown"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                                >
                                  <Eye size={15} strokeWidth={2.5} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="px-5 py-16 text-center">
                              <div className="mx-auto flex max-w-md flex-col items-center">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                                  <User size={20} />
                                </div>
                                <p className="text-sm font-pmedium text-slate-800">
                                  {ctcPayrollEmployees.length > 0 ? "No employees match these filters" : "No employees with CTC found"}
                                </p>
                                <p className="mt-1 text-xs font-pmedium leading-5 text-slate-500">
                                  {ctcPayrollEmployees.length > 0
                                    ? "Clear or change the search, department, and role filters."
                                    : "Add an Annual CTC in Company Management before calculating payroll."}
                                </p>
                                {ctcPayrollEmployees.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => navigate("/hr/company-management")}
                                    className="mt-4 flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700"
                                  >
                                    <Plus size={14} /> Open Company Management
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payroll History Tab */}
            {activeTab === "history" && (
              <div className="overflow-x-auto flex-1">
                    <table data-tour="hr-payroll-table" className="w-full min-w-[1120px] text-left font-pmedium">
                      <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Month</th>
                          <th className="px-5 py-4">Sent Date</th>
                          <th className="px-5 py-4 text-right">Total Amount</th>
                          <th className="px-5 py-4 text-center">Employees</th>
                          <th className="px-5 py-4 text-center">Remaining</th>
                          <th className="px-5 py-4 text-center">Paid</th>
                          <th className="px-5 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {isLoading ? <HistorySkeletonRows /> : (
                          payrollHistory.length > 0 ? (
                            payrollHistory.map((record) => {
                              const recordEmployees = Array.isArray(record.employees) ? record.employees : [];
                              const paidCount = recordEmployees.filter((e) =>
                                String(e.financials?.paymentStatus || e.payment?.status || "").toLowerCase() === "paid"
                              ).length;
                              const remainingCount = recordEmployees.filter((e) =>
                                String(e.financials?.paymentStatus || e.payment?.status || "Pending").toLowerCase() !== "paid"
                              ).length;
                              const label = record.monthLabel || record.displayMonth || `Month ${record.month}`;

                              return (
                                <tr key={record.id} className="group transition-colors hover:bg-slate-50/50">
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                        <History size={18} />
                                      </div>
                                      <div>
                                        <div className="font-pmedium text-slate-900">{label} Payroll</div>
                                        <div className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider mt-0.5">{record.status}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-sm font-pmedium text-slate-700">
                                    {formatPayrollHistoryDate(record.sentToFinanceAt || record.processedOn, payrollTimeZone)}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <div className="font-pmedium text-blue-600">
                                      {formatCurrency(
                                        Number(record.totalAmount || 0),
                                        recordEmployees[0]?.financials?.currency || recordEmployees[0]?.salaryPackage?.currency || payrollCurrency,
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-pmedium text-slate-700">{record.totalEmployees}</span>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-pmedium text-amber-700">{remainingCount}</span>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-pmedium text-emerald-700">{paidCount}</span>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <button
                                      onClick={() => setViewingHistoryCycle(record)}
                                      title="View payroll record"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                                    >
                                      <Eye size={15} strokeWidth={2.5} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-5 py-16 text-center font-pmedium text-slate-400">
                                No payroll history is available yet.
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
            )}
          </div>
        </div>
      </PageFrame>

      {/* Modals */}
      <PayrollTemplateModal
        open={isTemplateModalOpen}
        selectedTemplateId={selectedPayslipTemplate}
        confirming={isTemplateConfirmationOpen}
        saving={isSavingTemplate}
        actionLoading={templatePdfAction}
        onSelect={(templateId) => {
          setSelectedPayslipTemplate(templateId);
          setIsTemplateConfirmationOpen(false);
        }}
        onPreview={(templateId) => void handleTemplatePdfAction(templateId, "preview")}
        onDownload={(templateId) => void handleTemplatePdfAction(templateId, "download")}
        onClose={closeTemplateModal}
        onContinue={() => setIsTemplateConfirmationOpen(true)}
        onBack={() => setIsTemplateConfirmationOpen(false)}
        onConfirm={handleLockPayrollTemplate}
      />

      <HandoffConfirmModal
        open={isHandoffModalOpen}
        onClose={() => setIsHandoffModalOpen(false)}
        onConfirm={handleConfirmPayrollHandoff}
        mode={handoffMode}
        error={handoffError}
        submitting={isSubmittingHandoff}
      />

      <HistoryCycleModal
        cycle={viewingHistoryCycle}
        workspaceCurrency={payrollCurrency}
        onClose={() => setViewingHistoryCycle(null)}
        onViewEmployee={(emp) => setViewingEmployee({ ...emp, isHistory: true, cycleId: viewingHistoryCycle?.id })}
      />

      <EmployeeDetailModal
        employee={viewingEmployee}
        workspaceCurrency={payrollCurrency}
        onClose={() => { setViewingEmployee(null); setAdjustment({ type: "bonus", amount: "", reason: "" }); }}
        payrollStatus={payrollStatus}
        cycleId={viewingEmployee?.cycleId || payrollCycle?.id}
        onSaveAdjustment={handleSaveAdjustment}
        adjustment={adjustment}
        setAdjustment={setAdjustment}
        isHistoryCycle={viewingEmployee?.isHistory}
        isProcessingPayslip={isProcessingPayslip}
        onGeneratePayslip={handleGeneratePayslip}
        onSendPayslip={handleSendPayrollPayslip}
        workspaceTemplateId={workspacePayslipTemplate}
      />
    </div>
  );
}
