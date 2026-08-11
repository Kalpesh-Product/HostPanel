import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Eye, Calendar,
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
  preparePayrollCycle,
  updatePayrollCycleStatus,
} from "@/services/hr";
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
  paymentStatus?: string;
  currency?: string;
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
  hasSalaryPackage?: boolean;
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
  settings?: { currency?: string; timezone?: string };
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
}

function EmployeeDetailModal({
  employee, workspaceCurrency, onClose, payrollStatus, cycleId,
  onSaveAdjustment, adjustment, setAdjustment, isHistoryCycle,
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
              <div>
                <h3 className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-10 flex items-center gap-2">
                  <FileText size={14} /> Salary Breakdown
                </h3>
                <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-2xl space-y-2">
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
                    <div className="flex justify-between items-center text-xs bg-green-50 p-2 rounded-lg -mx-2">
                      <span className="font-pmedium text-green-700">Manual Bonus</span>
                      <span className="font-pmedium text-green-600">+{formatCurrency(fin.hrBonus, currency)}</span>
                    </div>
                  )}
                  {(fin.hrDeductions ?? 0) > 0 && (
                    <div className="flex justify-between items-center text-xs bg-red-50 p-2 rounded-lg -mx-2">
                      <span className="font-pmedium text-red-700">Manual Deduction</span>
                      <span className="font-pmedium text-red-600">-{formatCurrency(fin.hrDeductions, currency)}</span>
                    </div>
                  )}
                  {employee.adjustmentReason && (
                    <p className="text-[10px] font-pmedium text-slate-500 italic mt-1 bg-white border border-slate-200 p-2 rounded">
                      Note: {employee.adjustmentReason}
                    </p>
                  )}
                  <div className="border-t-2 border-slate-300 pt-2 flex justify-between items-center">
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
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Reason / Description</label>
                        <textarea
                          placeholder="e.g. Performance Bonus Q1"
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

      setPayrollData({
        currentCycle: payload.currentCycle || null,
        history: Array.isArray(payload.history) ? payload.history : [],
        filters: payload.filters || { departments: [], roles: [] },
        settings: payload.settings || { currency: DEFAULT_WORKSPACE_CURRENCY, timezone: PAYROLL_TIME_ZONE },
      });
      setErrorMessage("");
    } catch (error: any) {
      setPayrollData({ currentCycle: null, history: [], filters: { departments: [], roles: [] } });
      setErrorMessage(error?.message || "Failed to load payroll data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setViewingEmployee(null);
    setViewingHistoryCycle(null);
    void loadPayrollData(selectedMonth, selectedYear);
  }, [loadPayrollData, selectedMonth, selectedYear]);

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
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Payroll Management
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
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
                <div className="flex flex-wrap items-center gap-1.5">
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
                <div className="bg-linear-to-r from-slate-900 to-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center px-8 gap-4">
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

                  <div className="flex items-center gap-3">
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
                    {(payrollStatus === "Sent to Finance" || payrollStatus === "Paid") && (
                      <div className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40">
                        <CheckCircle2 size={14} /> AWAITING FINANCE PROCESSING
                      </div>
                    )}
                  </div>
                </div>

                {/* Master table */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[1120px] text-left font-pmedium">
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
                    <table className="w-full min-w-[1120px] text-left font-pmedium">
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
        onViewEmployee={(emp) => setViewingEmployee({ ...emp, isHistory: true })}
      />

      <EmployeeDetailModal
        employee={viewingEmployee}
        workspaceCurrency={payrollCurrency}
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
