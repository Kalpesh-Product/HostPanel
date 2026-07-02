import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Eye, Calendar,
  User, AlertCircle, FileText, ChevronDown,
  ShieldCheck, CheckCircle2, History,
  Send, Calculator, Plus, Minus, Lock,
  IndianRupee,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageFrame from "@/components/Pages/PageFrame";
import Skeleton, { HRPayrollSkeleton } from "@/components/ui/Skeleton";
import {
  addPayrollAdjustment,
  getPayrollSnapshot,
  preparePayrollCycle,
  updatePayrollCycleStatus,
} from "@/services/hr";
import {
  canAccessFinanceDashboard,
  getStoredUser,
  resolvePostLoginRoute,
} from "@/lib/auth-session";

/* ───────────────────────────── Types ───────────────────────────── */

interface AttendanceData {
  totalDays?: number;
  workingDays?: number;
  payableDays?: number;
  dailyRate?: number;
  present?: number;
  halfDays?: number;
  paidLeaves?: number;
  absentDays?: number;
  unpaidLeaves?: number;
  presentPay?: number;
  leavePay?: number;
  halfDayPay?: number;
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
  paymentStatus?: string;
}

interface EmployeePayrollData {
  id?: string;
  profileId?: string;
  name?: string;
  department?: string;
  role?: string;
  attendance?: AttendanceData;
  financials?: FinancialData;
  payment?: { status?: string };
  adjustmentReason?: string;
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
}

interface ViewingEmployee extends EmployeePayrollData {
  isHistory: boolean;
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

/* ───────────────────────────── Helpers ───────────────────────────── */

function getPayrollTimeZoneDateParts(dateInput: Date = new Date()): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PAYROLL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateInput);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getMonthIndex(monthLabel: string): number {
  return PAYROLL_MONTH_NAMES.indexOf(monthLabel);
}

function isPayrollMonthClosed(monthLabel: string, year: string): boolean {
  const monthIndex = getMonthIndex(monthLabel);
  if (monthIndex < 0) return false;

  const currentParts = getPayrollTimeZoneDateParts(new Date());
  if (!currentParts?.year || !currentParts?.month) return false;

  const currentYear = Number(currentParts.year);
  const currentMonthIndex = Number(currentParts.month) - 1;
  const targetYear = Number(year);

  if (currentYear > targetYear) return true;
  if (currentYear < targetYear) return false;
  return currentMonthIndex > monthIndex;
}

function formatPayrollHistoryDate(dateValue?: string): string {
  if (!dateValue) return "-";
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: PAYROLL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatCurrency(amount?: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount || 0);
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
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
          >
            <div className="bg-slate-950 px-6 py-5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-200">Payroll Handoff</p>
              <h2 className="mt-2 text-xl font-bold tracking-tight">Confirm payroll transfer</h2>
            </div>
            <div className="space-y-4 px-6 py-6">
              <p className="text-sm leading-6 text-slate-600">This action cannot be undone. Do you want to proceed?</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {mode === "prepare"
                  ? "This will lock the payroll cycle and send it to Finance for payment processing."
                  : "This will send the already prepared payroll cycle to Finance for payment processing."}
              </div>
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              )}
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="flex-[2] rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
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
  onClose: () => void;
  onViewEmployee: (emp: EmployeePayrollData) => void;
}

function HistoryCycleModal({ cycle, onClose, onViewEmployee }: HistoryCycleModalProps) {
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
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="bg-white rounded-4xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
          >
            <div className="p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-white leading-none flex items-center gap-3">
                  <History size={24} className="text-blue-400" /> Payroll Record: {cycle.monthLabel || cycle.displayMonth || cycle.month} Payroll
                </h2>
                <div className="flex gap-4 mt-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">ID: {cycle.id}</p>
                  <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Status: {cycle.status}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Paid: {paidCount}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending: {pendingCount}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 shadow-sm hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-x-auto flex-1 bg-white">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60 sticky top-0">
                  <tr>
                    <th className="px-8 py-5">Employee Info</th>
                    <th className="px-8 py-5">Department & Role</th>
                    <th className="px-8 py-5 text-center">Attendance Base</th>
                    <th className="px-8 py-5 text-right">Net Salary</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-linear-to-br from-[#2563EB] to-[#1e40af] rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                              {getInitials(emp.name || "")}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{emp.name}</div>
                              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{emp.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-semibold text-slate-700 text-sm">{emp.department}</span>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{emp.role}</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col items-center justify-center text-xs">
                            <span className="font-semibold text-slate-900">{emp.attendance?.workingDays} <span className="text-[10px] text-slate-400 font-medium uppercase">Working Days</span></span>
                            <span className="text-[10px] font-medium text-green-600 mt-0.5">{emp.attendance?.present} Present Days</span>
                            <span className="text-[10px] font-medium text-amber-600 mt-0.5">{emp.attendance?.halfDays || 0} Half Days</span>
                            <span className="text-[10px] font-medium text-red-500 mt-0.5">{emp.attendance?.absentDays ?? emp.attendance?.unpaidLeaves} Absent Days</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="font-semibold text-slate-900 text-base">{formatCurrency(emp.financials?.netSalary)}</div>
                          {(emp.financials?.hrBonus ?? 0) > 0 && <div className="text-[9px] font-semibold text-green-600 uppercase tracking-wider mt-0.5">+ Bonus Added</div>}
                          {(emp.financials?.hrDeductions ?? 0) > 0 && <div className="text-[9px] font-semibold text-red-500 uppercase tracking-wider mt-0.5">- Extra Deduction</div>}
                        </td>
                        <td className="px-8 py-5 text-center">
                          {(() => {
                            const paymentStatus = String(emp.financials?.paymentStatus || emp.payment?.status || "Pending");
                            const normalized = paymentStatus.toLowerCase();
                            const cls = normalized === "paid"
                              ? "bg-green-50 text-green-600 border-green-200"
                              : normalized === "processing"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-slate-50 text-slate-500 border-slate-200";
                            return (
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${cls}`}>
                                {paymentStatus}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button
                            onClick={() => onViewEmployee(emp)}
                            className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl font-semibold text-[10px] uppercase transition-all flex items-center gap-1.5 mx-auto"
                          >
                            <Eye size={14} /> Breakdown
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium">
                        Detailed records not available for this cycle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100/60 flex shrink-0">
              <button onClick={onClose} className="w-full py-4 bg-white border border-slate-200 rounded-4xl font-semibold text-slate-600 hover:bg-slate-100 transition-all">
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

interface EmployeeDetailModalProps {
  employee: ViewingEmployee | null;
  onClose: () => void;
  payrollStatus: string;
  cycleId?: string;
  onSaveAdjustment: (profileId: string, adj: AdjustmentForm) => void;
  adjustment: AdjustmentForm;
  setAdjustment: React.Dispatch<React.SetStateAction<AdjustmentForm>>;
  isHistoryCycle?: boolean;
}

function EmployeeDetailModal({
  employee, onClose, payrollStatus, cycleId,
  onSaveAdjustment, adjustment, setAdjustment, isHistoryCycle,
}: EmployeeDetailModalProps) {
  if (!employee) return null;
  const att = employee.attendance || {};
  const fin = employee.financials || {};

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="bg-white rounded-4xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          <div className="p-8 bg-slate-50 border-b border-slate-100/60 flex justify-between items-start shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900 leading-none">{employee.name}&rsquo;s Salary Detail</h2>
                <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold uppercase tracking-wider">
                  {isHistoryCycle ? "Historical" : "Current"}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-2">{employee.role} | {employee.department} | {employee.id}</p>
            </div>
            <button
              onClick={() => { onClose(); setAdjustment({ type: "bonus", amount: "", reason: "" }); }}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm hover:text-red-500 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto flex-1 bg-white grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Calendar size={12} /> Auto-Calculated from Attendance
                </h3>
                <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] text-slate-500 font-medium uppercase">Total Cycle Days</p><p className="font-semibold text-slate-900 text-lg">{att.totalDays}</p></div>
                  <div><p className="text-[10px] text-slate-500 font-medium uppercase">Working Days</p><p className="font-semibold text-blue-700 text-lg">{att.workingDays}</p></div>
                  <div><p className="text-[10px] text-slate-500 font-medium uppercase">Payable Days</p><p className="font-semibold text-slate-900 text-lg">{att.payableDays}</p></div>
                  <div><p className="text-[10px] text-slate-500 font-medium uppercase">Daily Rate</p><p className="font-semibold text-slate-900 text-lg">{formatCurrency(att.dailyRate)}</p></div>
                  <div><p className="text-[10px] text-slate-500 font-medium uppercase">Present Days</p><p className="font-semibold text-green-600 text-lg">{att.present}</p></div>
                  <div><p className="text-[10px] text-slate-500 font-medium uppercase">Half Days</p><p className="font-semibold text-amber-600 text-lg">{att.halfDays || 0}</p></div>
                  <div><p className="text-[10px] text-slate-500 font-medium uppercase">Paid Leaves</p><p className="font-semibold text-green-600 text-lg">{att.paidLeaves}</p></div>
                  <div><p className="text-[10px] text-slate-500 font-medium uppercase">Absent Days</p><p className="font-semibold text-red-600 text-lg">{att.absentDays ?? att.unpaidLeaves}</p></div>
                </div>
                <p className="mt-3 text-[10px] font-medium text-slate-500">Pre-joining working days are counted as absences in the monthly payroll view.</p>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <FileText size={12} /> Salary Breakdown
                </h3>
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4">
                  <Row label="Monthly Base Salary" value={formatCurrency(fin.baseSalary)} />
                  <Row label="Attendance Earned" value={formatCurrency(fin.attendanceGrossPay)} valueClass="text-blue-600" />
                  <Row label="Benefits / Allowances" value={`+${formatCurrency(fin.benefits)}`} valueClass="text-emerald-600" />
                  <div className="border-t border-slate-200 my-2" />
                  <Row label="Present Pay" value={formatCurrency(att.presentPay)} />
                  <Row label="Leave Pay" value={formatCurrency(att.leavePay)} />
                  <Row label="Half Day Pay" value={`${formatCurrency(att.halfDayPay)} (${att.halfDays || 0} half day(s))`} valueClass="text-amber-600" />
                  <Row label="Standard Deductions (Tax/PF)" value={`-${formatCurrency(fin.standardDeductions)}`} valueClass="text-red-500" />
                  {(fin.attendanceDeductions ?? 0) > 0 && (
                    <Row label="Attendance Loss" value={`-${formatCurrency(fin.attendanceDeductions)}`} valueClass="text-red-500" />
                  )}
                  {(fin.hrBonus ?? 0) > 0 && (
                    <div className="flex justify-between items-center text-sm bg-green-50 p-2 rounded-lg -mx-2">
                      <span className="font-medium text-green-700">Manual Bonus</span>
                      <span className="font-semibold text-green-600">+{formatCurrency(fin.hrBonus)}</span>
                    </div>
                  )}
                  {(fin.hrDeductions ?? 0) > 0 && (
                    <div className="flex justify-between items-center text-sm bg-red-50 p-2 rounded-lg -mx-2">
                      <span className="font-medium text-red-700">Manual Deduction</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(fin.hrDeductions)}</span>
                    </div>
                  )}
                  {employee.adjustmentReason && (
                    <p className="text-[10px] font-medium text-slate-500 italic mt-1 bg-white border border-slate-200 p-2 rounded">
                      Note: {employee.adjustmentReason}
                    </p>
                  )}
                  <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center">
                    <span className="font-semibold text-slate-900 text-lg">NET PAYABLE</span>
                    <span className="font-semibold text-blue-600 text-2xl">{formatCurrency(fin.netSalary)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-100/60 rounded-4xl p-6 flex flex-col">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-blue-600" /> HR Adjustments
              </h3>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-6">Add Bonus or manual deductions</p>

              {isHistoryCycle ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Lock size={48} className="text-slate-300 mb-4" />
                  <h4 className="text-lg font-bold text-slate-900">Historical Record</h4>
                  <p className="text-sm text-slate-500 mt-2">This is a completed payroll cycle. Adjustments cannot be made to past records.</p>
                </div>
              ) : payrollStatus !== "Pending" ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <CheckCircle2 size={48} className="text-slate-300 mb-4" />
                  <h4 className="text-lg font-bold text-slate-900">Payroll is Locked</h4>
                  <p className="text-sm text-slate-500 mt-2">
                    Adjustments can only be made while the payroll status is &lsquo;Pending&rsquo;. Current status is <strong>{payrollStatus}</strong>.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-5">
                  <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    <button
                      onClick={() => setAdjustment({ ...adjustment, type: "bonus" })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${adjustment.type === "bonus" ? "bg-white shadow-sm text-green-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <Plus size={14} /> ADD BONUS
                    </button>
                    <button
                      onClick={() => setAdjustment({ ...adjustment, type: "deduction" })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${adjustment.type === "deduction" ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <Minus size={14} /> ADD DEDUCTION
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Amount</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number" placeholder="0"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-semibold text-slate-900 focus:border-[#2563EB] outline-none"
                        value={adjustment.amount}
                        onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Reason / Description</label>
                    <textarea
                      placeholder="e.g. Performance Bonus Q1"
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-medium text-slate-700 focus:border-[#2563EB] outline-none resize-none h-full min-h-25"
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
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold shadow-lg disabled:bg-slate-300 disabled:shadow-none hover:bg-black transition-all mt-auto"
                  >
                    APPLY ADJUSTMENT
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, value, valueClass = "text-slate-900" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  Main Page Component                                              */
/* ──────────────────────────────────────────────────────────────── */

export default function HRPayrollPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("master");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [handoffMode, setHandoffMode] = useState("prepare");
  const [isSubmittingHandoff, setIsSubmittingHandoff] = useState(false);
  const [handoffError, setHandoffError] = useState("");

  const defaultPayrollDate = new Date();
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

  const payrollCycle = payrollData.currentCycle;
  const payrollMaster = Array.isArray(payrollCycle?.employees) ? payrollCycle.employees : [];
  const payrollHistory = Array.isArray(payrollData.history) ? payrollData.history : [];
  const payrollStatus = payrollCycle?.status || "Pending";

  const payrollMonthClosed = useMemo(
    () => isPayrollMonthClosed(selectedMonth, selectedYear),
    [selectedMonth, selectedYear],
  );

  const payablePayrollEmployees = useMemo(
    () => payrollMaster.filter((emp) => Number(emp.financials?.netSalary || 0) > 0),
    [payrollMaster],
  );

  const excludedZeroPayrollEmployees = payrollMaster.length - payablePayrollEmployees.length;

  const departments = [
    "All Departments",
    ...(
      Array.isArray(payrollData.filters?.departments) && payrollData.filters.departments.length > 0
        ? payrollData.filters.departments
        : ["HR", "Sales & CRM", "Finance", "Administration", "Tech", "IT", "Maintenance"]
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

  const loadPayrollData = async (month = selectedMonth, year = selectedYear) => {
    try {
      setIsLoading(true);
      const response = await getPayrollSnapshot({ month, year });
      const payload = response?.data || {};

      setPayrollData({
        currentCycle: payload.currentCycle || null,
        history: Array.isArray(payload.history) ? payload.history : [],
        filters: payload.filters || { departments: [], roles: [] },
      });
      setErrorMessage("");
    } catch (error: any) {
      setPayrollData({ currentCycle: null, history: [], filters: { departments: [], roles: [] } });
      setErrorMessage(error?.message || "Failed to load payroll data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setViewingEmployee(null);
    setViewingHistoryCycle(null);
    loadPayrollData();
  }, [selectedMonth, selectedYear]);

  const filteredMaster = useMemo(() => {
    return payablePayrollEmployees.filter((emp) => {
      const matchesDept = departmentFilter === "All Departments" || emp.department === departmentFilter;
      const matchesRole = roleFilter === "All Roles" || emp.role === roleFilter;
      const matchesSearch = (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.id || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesRole && matchesSearch;
    });
  }, [payablePayrollEmployees, departmentFilter, roleFilter, searchQuery]);

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
        targetCycleId = prepareResponse?.data?.currentCycle?.id || targetCycleId;
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
      await loadPayrollData(selectedMonth, selectedYear);
      setAdjustment({ type: "bonus", amount: "", reason: "" });
    } catch (error: any) {
      alert(error?.message || "Failed to save payroll adjustment.");
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
            ?.sentToFinanceAt || payrollHistory[0]?.processedOn
        )
      : "—";
    return { totalDisbursed, totalEmployees, latestDate };
  }, [payrollHistory]);

  const statCards = useMemo(() => {
    if (activeTab === "master") {
      return [
        {
          key: "total-payout", label: `Total Payout (${selectedMonth})`,
          value: currentTotalNet, type: "currency",
          icon: IndianRupee, className: "border-l-4 border-l-blue-500",
          iconClass: "bg-blue-50 text-blue-600",
        },
        {
          key: "employees-payable", label: "Employees Payable",
          value: payablePayrollEmployees.length, type: "number",
          extra: excludedZeroPayrollEmployees > 0 ? `${excludedZeroPayrollEmployees} zero-pay excluded` : undefined,
          icon: User, className: "",
          iconClass: "bg-slate-50 text-slate-600",
        },
        {
          key: "additions-bonus", label: "Additions & Bonus",
          value: currentTotalBonus, type: "currency",
          icon: Calculator, className: "border-l-4 border-l-amber-500",
          iconClass: "bg-amber-50 text-amber-600",
        },
        {
          key: "cycle-status", label: "Cycle Status",
          value: payrollStatus, type: "text",
          icon: CheckCircle2, className: "border-l-4 border-l-purple-500",
          iconClass: "bg-purple-50 text-purple-600",
        },
      ];
    }
    return [
      {
        key: "total-cycles", label: "Cycles Processed",
        value: payrollHistory.length, type: "number",
        icon: History, className: "border-l-4 border-l-blue-500",
        iconClass: "bg-blue-50 text-blue-600",
      },
      {
        key: "total-disbursed", label: "Total Disbursed",
        value: historyStats.totalDisbursed, type: "currency",
        icon: IndianRupee, className: "border-l-4 border-l-emerald-500",
        iconClass: "bg-emerald-50 text-emerald-600",
      },
      {
        key: "total-employees", label: "Employees Processed",
        value: historyStats.totalEmployees, type: "number",
        icon: User, className: "",
        iconClass: "bg-slate-50 text-slate-600",
      },
      {
        key: "latest-handoff", label: "Latest Handoff",
        value: historyStats.latestDate, type: "text",
        icon: Calendar, className: "border-l-4 border-l-purple-500",
        iconClass: "bg-purple-50 text-purple-600",
      },
    ];
  }, [activeTab, currentTotalNet, payablePayrollEmployees, excludedZeroPayrollEmployees, currentTotalBonus, payrollStatus, selectedMonth, payrollHistory, historyStats]);

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
            <td className="px-8 py-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </td>
            <td className="px-8 py-5"><Skeleton className="h-4 w-28 mb-2" /><Skeleton className="h-3 w-20" /></td>
            <td className="px-8 py-5">
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 mx-auto" /><Skeleton className="h-3 w-24 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto" /><Skeleton className="h-3 w-24 mx-auto" />
              </div>
            </td>
            <td className="px-8 py-5 text-right"><Skeleton className="h-4 w-28 ml-auto mb-2" /><Skeleton className="h-3 w-24 ml-auto" /></td>
            <td className="px-8 py-5 text-center"><Skeleton className="h-6 w-20 rounded-full mx-auto" /></td>
            <td className="px-8 py-5 text-center"><Skeleton className="h-9 w-28 rounded-xl mx-auto" /></td>
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
            <td className="px-6 py-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
              </div>
            </td>
            <td className="px-6 py-5"><Skeleton className="h-4 w-24" /></td>
            <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
            <td className="px-6 py-5 text-center"><Skeleton className="h-6 w-12 rounded-full mx-auto" /></td>
            <td className="px-6 py-5 text-center"><Skeleton className="h-6 w-12 rounded-full mx-auto" /></td>
            <td className="px-6 py-5 text-center"><Skeleton className="h-6 w-12 rounded-full mx-auto" /></td>
            <td className="px-6 py-5 text-center"><Skeleton className="h-9 w-20 rounded-xl mx-auto" /></td>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Payroll Processing
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Core Module</p>
            </div>

            {/* Month/Year selectors */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  className="pl-4 pr-8 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium outline-none cursor-pointer appearance-none shadow-sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {PAYROLL_MONTH_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  className="pl-4 pr-8 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium outline-none cursor-pointer appearance-none shadow-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {YEARS_LIST.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between gap-4">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => loadPayrollData(selectedMonth, selectedYear)}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Main Tabs (pill-style, before stat cards) ── */}
          <div className="mb-3 flex bg-slate-100 p-1.5 rounded-2xl w-full">
            <button
              onClick={() => { setActiveTab("master"); setSearchQuery(""); }}
              className={`flex-1 px-8 py-2.5 rounded-xl text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
                activeTab === "master" ? "bg-white shadow-sm text-[#2563EB]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              PAYROLL MASTER
            </button>
            <button
              onClick={() => { setActiveTab("history"); setSearchQuery(""); }}
              className={`flex-1 px-8 py-2.5 rounded-xl text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
                activeTab === "history" ? "bg-white shadow-sm text-[#2563EB]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              PAYROLL HISTORY
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {statCards.map((card) => {
              const Icon = card.icon;
              const isLoadingActive = isLoading && activeTab === "master" && card.key !== "cycle-status";
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.className}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    {isLoadingActive ? (
                      <Skeleton className="h-6 w-20 mt-1" />
                    ) : card.type === "currency" ? (
                      <p className="text-[15px] font-black text-slate-900">{formatCurrency(card.value as number)}</p>
                    ) : card.type === "text" ? (
                      <p className="text-sm font-black text-purple-600 mt-1 truncate">{String(card.value)}</p>
                    ) : (
                      <p className="text-[15px] font-black text-slate-900">{String(card.value)}</p>
                    )}
                    {"extra" in card && card.extra && !isLoading && (
                      <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider mt-1">{card.extra}</p>
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
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <select
                  className="w-full sm:w-36 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  className="w-full sm:w-40 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Payroll Master Tab */}
            {activeTab === "master" && (
              <div className="flex flex-col flex-1">
                {/* Cycle action banner */}
                <div className="bg-linear-to-r from-slate-900 to-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center px-8 gap-4">
                  <div className="text-white">
                    <p className="text-sm font-semibold">Payroll Cycle: {selectedMonth} {selectedYear}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 flex items-center gap-2">
                      Current Status:{" "}
                      <span className={`px-2 py-0.5 rounded ${payrollStatus === "Pending" ? "bg-slate-700" : payrollStatus === "Prepared" ? "bg-amber-500/20 text-amber-300" : "bg-green-500/20 text-green-300"}`}>
                        {payrollStatus}
                      </span>
                    </p>
                    {!payrollMonthClosed && payrollStatus === "Pending" && (
                      <p className="mt-2 text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                        Payroll can be prepared after the month closes.
                      </p>
                    )}
                    {excludedZeroPayrollEmployees > 0 && (
                      <p className="mt-2 text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                        {excludedZeroPayrollEmployees} employee(s) with zero net pay are hidden from finance handoff
                      </p>
                    )}
                  </div>

                  <div>
                    {payrollStatus === "Pending" && (
                      <button
                        onClick={() => openPayrollHandoffModal("prepare")}
                        disabled={!payrollMonthClosed}
                        className="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-xs hover:bg-slate-200 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        <Calculator size={14} /> PREPARE PAYROLL (LOCK DATA)
                      </button>
                    )}
                    {payrollStatus === "Prepared" && (
                      <button
                        onClick={() => openPayrollHandoffModal("send")}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-xs hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-all flex items-center gap-2 animate-pulse"
                      >
                        <Send size={14} /> SEND TO FINANCE
                      </button>
                    )}
                    {(payrollStatus === "Sent to Finance" || payrollStatus === "Paid") && (
                      <div className="px-6 py-2.5 bg-green-500/20 text-green-400 rounded-xl font-semibold text-xs flex items-center gap-2 border border-green-500/30">
                        <CheckCircle2 size={14} /> AWAITING FINANCE PROCESSING
                      </div>
                    )}
                  </div>
                </div>

                {/* Master table */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-8 py-5">Employee Info</th>
                        <th className="px-8 py-5">Department & Role</th>
                        <th className="px-8 py-5 text-center">Attendance Base</th>
                        <th className="px-8 py-5 text-right">Net Salary</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {isLoading ? <MasterSkeletonRows /> : (
                        filteredMaster.length > 0 ? (
                          filteredMaster.map((emp) => (
                            <tr key={emp.id} className={`transition-all group ${payrollStatus === "Pending" ? "hover:bg-blue-50/30" : ""}`}>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-linear-to-br from-[#2563EB] to-[#1e40af] rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                                    {getInitials(emp.name || "")}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900 text-sm">{emp.name}</div>
                                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{emp.id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <span className="font-semibold text-slate-700 text-sm">{emp.department}</span>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{emp.role}</p>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col items-center justify-center text-xs">
                                  <span className="font-semibold text-slate-900">{emp.attendance?.workingDays} <span className="text-[10px] text-slate-400 font-medium uppercase">Working Days</span></span>
                                  <span className="text-[10px] font-medium text-green-600 mt-0.5">{emp.attendance?.present} Present Days</span>
                                  <span className="text-[10px] font-medium text-amber-600 mt-0.5">{emp.attendance?.halfDays || 0} Half Days</span>
                                  <span className="text-[10px] font-medium text-red-500 mt-0.5">{emp.attendance?.absentDays ?? emp.attendance?.unpaidLeaves} Absent Days</span>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="font-semibold text-slate-900 text-base">{formatCurrency(emp.financials?.netSalary)}</div>
                                {(emp.financials?.benefits ?? 0) > 0 && <div className="text-[9px] font-semibold text-indigo-600 uppercase tracking-wider mt-0.5">+ Benefits Added</div>}
                                {(emp.financials?.hrBonus ?? 0) > 0 && <div className="text-[9px] font-semibold text-green-600 uppercase tracking-wider mt-0.5">+ Manual Bonus</div>}
                                {((emp.financials?.attendanceDeductions ?? 0) > 0 || (emp.financials?.hrDeductions ?? 0) > 0) && (
                                  <div className="text-[9px] font-semibold text-red-500 uppercase tracking-wider mt-0.5">- Deductions Applied</div>
                                )}
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${getStatusBadge(payrollStatus)}`}>
                                  {payrollStatus}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-center">
                                <button
                                  onClick={() => setViewingEmployee({ ...(emp as EmployeePayrollData), isHistory: false })}
                                  className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl font-semibold text-[10px] uppercase transition-all flex items-center gap-1.5 mx-auto"
                                >
                                  <Eye size={14} /> Breakdown
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-8 py-16 text-center text-slate-400 font-semibold">
                              {payrollMaster.length > 0 && excludedZeroPayrollEmployees > 0
                                ? "All zero-pay employees are hidden from the finance handoff."
                                : "No payroll data available for this period."}
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
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                        <tr>
                          <th className="px-8 py-5">Month</th>
                          <th className="px-8 py-5">Sent Date</th>
                          <th className="px-8 py-5 text-right">Total Amount</th>
                          <th className="px-8 py-5 text-center">Employees</th>
                          <th className="px-8 py-5 text-center">Remaining</th>
                          <th className="px-8 py-5 text-center">Paid</th>
                          <th className="px-8 py-5 text-center">Action</th>
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
                                <tr key={record.id} className="hover:bg-blue-50/30 transition-all group">
                                  <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                        <History size={18} />
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-900">{label} Payroll</div>
                                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{record.status}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-5 text-sm font-medium text-slate-700">
                                    {formatPayrollHistoryDate(record.sentToFinanceAt || record.processedOn)}
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                    <div className="font-semibold text-blue-600">{record.totalAmount}</div>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">{record.totalEmployees}</span>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">{remainingCount}</span>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">{paidCount}</span>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                    <button
                                      onClick={() => setViewingHistoryCycle(record)}
                                      className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl font-semibold text-[10px] uppercase transition-all flex items-center gap-1.5 mx-auto"
                                    >
                                      <Eye size={14} /> View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-8 py-16 text-center text-slate-400 font-semibold">
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
        onClose={() => setViewingHistoryCycle(null)}
        onViewEmployee={(emp) => setViewingEmployee({ ...emp, isHistory: true })}
      />

      <EmployeeDetailModal
        employee={viewingEmployee}
        onClose={() => { setViewingEmployee(null); setAdjustment({ type: "bonus", amount: "", reason: "" }); }}
        payrollStatus={payrollStatus}
        cycleId={payrollCycle?.id}
        onSaveAdjustment={handleSaveAdjustment}
        adjustment={adjustment}
        setAdjustment={setAdjustment}
        isHistoryCycle={viewingEmployee?.isHistory}
      />
    </div>
  );
}
