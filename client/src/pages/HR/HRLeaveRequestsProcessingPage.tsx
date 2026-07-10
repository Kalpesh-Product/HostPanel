import React, { useState, useMemo, useEffect } from "react";
import {
  Search, Check, X, Eye, CheckCircle2, XCircle,
  CalendarClock, Calendar, UserCheck, Clock, ShieldAlert,
  AlertCircle, FileText, FileSpreadsheet, FileDown, Building, Users,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageFrame from "@/components/Pages/PageFrame";
import { HRLeaveRequestsProcessingSkeleton } from "@/components/ui/Skeleton";
import { getStoredUser, normalizeUserRole } from "@/lib/auth-session";
import { getLeaveRequests, updateLeaveRequest } from "@/services/leave-requests";
import { getTeamAttendance } from "@/services/attendance";
import { createReport } from "@/services/reports";
import { downloadReportFile } from "@/utils/report-download";
import { statusPillClass } from '../../lib/status-pill';

/* ───────────────────────────── Types ───────────────────────────── */

interface LeaveRequestRaw {
  recordId?: string; _id?: string; id?: string; leaveCode?: string;
  employeeName?: string; name?: string; employeeId?: string;
  requesterUserId?: string; userId?: string;
  department?: string; departments?: string[];
  requesterRole?: string; role?: string;
  leaveType?: string; status?: string;
  startDate?: string; endDate?: string; days?: number;
  reason?: string; rejectionReason?: string; actionedBy?: string;
  requesterBalance?: number; leaveMode?: string; halfDaySession?: string;
  medicalCertAttached?: boolean; createdAt?: string; updatedAt?: string;
}

interface NormalizedLeave {
  recordId: string; id: string;
  employeeName: string; name: string; employeeId: string;
  requesterUserId: string | null; userId?: string;
  department: string; departments: string[]; departmentDisplay: string;
  role: string;
  leaveType: string; type: string;
  from: string; to: string; startDate: string; endDate: string;
  days: number; status: string; statusCode: string;
  reason: string; rejectionReason: string; actionedBy: string;
  requesterBalance: number; leaveMode: string; halfDaySession: string;
  medicalCertAttached: boolean; createdAt: string; updatedAt: string;
}

interface LeaveBalances {
  totalAllowed: number; totalTaken: number; remaining: number;
  sickTaken: number; casualTaken: number; compOffTaken: number;
  sickRemaining: number; casualRemaining: number; compOffRemaining: number;
}

interface EmployeeRosterEntry {
  id: string; userId: string | null; name: string; role: string;
  department: string; departments: string[];
  status: string; attendanceStatus: string;
  attendanceRecord: Record<string, unknown> | null;
  activeLeave: Record<string, unknown> | null;
  balances: LeaveBalances;
  history: Array<Record<string, unknown>>;
}

interface AttendanceRecord {
  userId?: string; employeeId?: string; id?: string;
  name?: string; role?: string; department?: string; departments?: string[];
  status?: string; leaveMode?: string; halfDaySession?: string;
}

interface DeptSummaryCard {
  departmentName: string; total: number; onLeave: number;
}

interface RoleSummaryCard {
  key: string; label: string; total: number; onLeave: number;
}

const ROLE_LEAVE_QUOTAS: Record<string, { Casual: number; Sick: number; Vacation: number }> = {
  super_admin: { Casual: 12, Sick: 10, Vacation: 15 },
  owner: { Casual: 12, Sick: 10, Vacation: 15 },
  admin_manager: { Casual: 10, Sick: 8, Vacation: 12 },
  admin: { Casual: 10, Sick: 8, Vacation: 12 },
  manager: { Casual: 8, Sick: 8, Vacation: 10 },
  employee: { Casual: 8, Sick: 6, Vacation: 8 },
};

const MAIN_TABS = [
  { key: "requests", label: "Leave Requests" },
  { key: "current", label: "Currently On Leave" },
  { key: "master", label: "Leave Master" },
];

const STATUS_PILLS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

/* ───────────── Helper Functions ───────────── */

function normalizeStatus(value: unknown): string {
  return String(value || "pending").trim().toLowerCase();
}

function toDateKey(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : parsed.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateLabel(value: unknown): string {
  if (!value) return "-";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function normalizeKey(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function normalizeDepartmentGroup(value: unknown): string {
  if (Array.isArray(value)) return value.map(normalizeDepartmentGroup).filter(Boolean).join(" / ");
  const normalized = normalizeKey(String(value || ""));
  if (!normalized) return "";
  if (normalized === "hr" || normalized.startsWith("hr-") || normalized.includes("human-resources")) return "HR";
  if (normalized.includes("sales") || normalized.includes("crm")) return "Sales";
  if (normalized.includes("finance")) return "Finance";
  if (normalized === "admin" || normalized.startsWith("admin-") || normalized.includes("administration")) return "Administration";
  if (normalized.includes("tech")) return "Tech";
  if (normalized === "it" || normalized.startsWith("it-")) return "IT";
  if (normalized.includes("maintenance")) return "Maintenance";
  return String(value || "").trim();
}

function normalizeDepartmentList(value: unknown): string[] {
  if (Array.isArray(value)) return Array.from(new Set(value.flatMap(normalizeDepartmentList).filter(Boolean)));
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (raw.includes(" / ") || raw.includes(",")) return Array.from(new Set(raw.split(/\/|,/).map((s) => normalizeDepartmentGroup(s.trim())).filter(Boolean)));
  const single = normalizeDepartmentGroup(raw);
  return single ? [single] : [];
}

function getDepartmentDisplay(value: unknown): string {
  const depts = normalizeDepartmentList(value);
  return depts.length > 0 ? depts.join(" / ") : "General";
}

function inferDepartmentsFromRole(role?: string): string[] {
  const n = normalizeKey(role || "");
  const result: string[] = [];
  if (n.includes("hr")) result.push("HR");
  if (n.includes("admin") || n.includes("administration")) result.push("Administration");
  if (n.includes("sales")) result.push("Sales");
  if (n.includes("finance")) result.push("Finance");
  if (n.includes("tech")) result.push("Tech");
  if (n === "it" || n.includes("it-")) result.push("IT");
  if (n.includes("maintenance")) result.push("Maintenance");
  return [...new Set(result)];
}

function getRoleQuota(role?: string) {
  const n = String(role || "employee").trim().toLowerCase().replace(/-/g, "_");
  return ROLE_LEAVE_QUOTAS[n] || ROLE_LEAVE_QUOTAS.employee;
}

function isDateInRange(dateKey: string, startDate: unknown, endDate: unknown): boolean {
  const start = toDateKey(startDate);
  const end = toDateKey(endDate);
  return Boolean(start && end && start <= dateKey && end >= dateKey);
}

function employeeMatchesDepartment(employee: Record<string, unknown>, filterValue: string): boolean {
  if (filterValue === "All Departments") return true;
  const depts = normalizeDepartmentList(employee?.departments || employee?.department);
  const fallback = depts.length > 0 ? depts : inferDepartmentsFromRole(String(employee?.role || ""));
  return fallback.some((d) => normalizeDepartmentList(filterValue).includes(d));
}

function normalizeLeaveRequest(entry: Record<string, unknown>): NormalizedLeave {
  const departments = normalizeDepartmentList(entry?.departments || entry?.department || inferDepartmentsFromRole(String(entry?.requesterRole || entry?.role || "")));
  const leaveType = String(entry?.leaveType || "Casual");
  const status = normalizeStatus(entry?.status);
  const employeeName = String(entry?.employeeName || entry?.name || "Unknown");
  return {
    ...entry as unknown as Record<string, string>,
    recordId: String(entry?.recordId || entry?._id || entry?.id || ""),
    id: String(entry?.id || entry?.leaveCode || entry?.recordId || ""),
    employeeName, name: employeeName,
    employeeId: String(entry?.employeeId || ""),
    requesterUserId: entry?.requesterUserId ? String(entry.requesterUserId) : null,
    department: String(entry?.department || ""),
    departments, departmentDisplay: getDepartmentDisplay(departments),
    role: String(entry?.requesterRole || ""),
    leaveType,
    type: `${leaveType} Leave`,
    from: formatDateLabel(entry?.startDate),
    to: formatDateLabel(entry?.endDate),
    startDate: String(entry?.startDate || ""),
    endDate: String(entry?.endDate || ""),
    days: Number(entry?.days || 0),
    status, statusCode: status,
    rejectionReason: String(entry?.rejectionReason || ""),
    actionedBy: String(entry?.actionedBy || ""),
    reason: String(entry?.reason || ""),
    requesterBalance: Number(entry?.requesterBalance || 0),
    leaveMode: String(entry?.leaveMode === "half_day" ? "half_day" : "full_day"),
    halfDaySession: String(entry?.halfDaySession || ""),
    medicalCertAttached: Boolean(entry?.medicalCertAttached),
    createdAt: String(entry?.createdAt || ""),
    updatedAt: String(entry?.updatedAt || ""),
  };
}

function getStatusBadge(status: unknown) {
  const n = normalizeStatus(status);
  if (n === "approved") return <span className={statusPillClass("approved")}>Approved</span>;
  if (n === "rejected") return <span className={statusPillClass("rejected")}>Rejected</span>;
  return <span className={statusPillClass("pending")}>Pending</span>;
}

function getRosterStatusBadge(status: string) {
  const n = normalizeKey(status);
  if (n.includes("on-leave") || n.includes("half-day")) return <span className={statusPillClass("on leave")}>On Leave Today</span>;
  if (n.includes("absent")) return <span className={statusPillClass("absent")}>Absent Today</span>;
  if (n.includes("present-late")) return <span className={statusPillClass("late")}>Present Late</span>;
  return <span className={statusPillClass("present")}>Present</span>;
}

function getTypeColor(type: string): string {
  if (String(type || "").includes("Sick")) return "text-red-600 bg-red-50 border-red-200";
  if (String(type || "").includes("Casual")) return "text-[#2563EB] bg-blue-50 border-blue-200";
  return "text-amber-600 bg-amber-50 border-amber-200";
}

function getEmployeeInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").substring(0, 2).toUpperCase() || "E";
}

function buildLeaveExportRows(records: Record<string, unknown>[], scopeLabel = "", departmentLabel = "", searchLabel = "") {
  return [
    { label: "Report Scope", value: scopeLabel || "Leave Requests" },
    { label: "Department Filter", value: departmentLabel || "All Departments" },
    { label: "Search Filter", value: searchLabel || "All" },
    { label: "Record Count", value: String(records.length) },
    ...records.map((r, i) => ({
      label: `${i + 1}. ${r.name || r.employeeName || "Employee"}`,
      value: [r.type || "Leave Request", `Status: ${r.status || "Pending"}`, `Dept: ${r.departmentDisplay || r.department || "General"}`, `Dates: ${r.from || r.startDate || "-"} to ${r.to || r.endDate || "-"}`, r.days ? `Days: ${r.days}` : "", r.reason ? `Reason: ${r.reason}` : "", r.actionedBy ? `Actioned by: ${r.actionedBy}` : ""].filter(Boolean).join(" | "),
    })),
  ];
}

function buildEmployeeLeaveExportRows(employee: Record<string, unknown>) {
  const history = (Array.isArray(employee.history) ? employee.history : []) as Array<Record<string, unknown>>;
  const balances = (employee.balances || {}) as Record<string, number>;
  return [
    { label: "Employee Name", value: String(employee.name || "Unknown") },
    { label: "Employee Role", value: String(employee.role || "Employee") },
    { label: "Department", value: getDepartmentDisplay(employee.departments || employee.department) },
    { label: "Report Scope", value: "Individual Leave History" },
    { label: "Record Count", value: String(history.length) },
    { label: "Total Allowed", value: String(balances.totalAllowed ?? 0) },
    { label: "Total Taken", value: String(balances.totalTaken ?? 0) },
    { label: "Remaining Balance", value: String(balances.remaining ?? 0) },
    { label: "Sick Leave Remaining", value: String(balances.sickRemaining ?? 0) },
    { label: "Casual Leave Remaining", value: String(balances.casualRemaining ?? 0) },
    { label: "Comp Off Remaining", value: String(balances.compOffRemaining ?? 0) },
    ...history.map((r, i) => ({
      label: `${i + 1}. ${r.type || "Leave"}`,
      value: [`Status: ${r.status || "Pending"}`, `Dates: ${r.from || "-"} to ${r.to || "-"}`, r.days ? `Days: ${r.days}` : "", r.dateApplied ? `Applied On: ${r.dateApplied}` : "", r.reason ? `Reason: ${r.reason}` : "", r.actionedBy ? `Processed By: ${r.actionedBy}` : ""].filter(Boolean).join(" | "),
    })),
  ];
}

/* ───────────────────────────── Main Component ───────────────────────────── */

export default function HRLeaveRequestsProcessingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingEmployee, setViewingEmployee] = useState<Record<string, unknown> | null>(null);
  const [viewingRequest, setViewingRequest] = useState<NormalizedLeave | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<NormalizedLeave | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingLeaveDetail, setViewingLeaveDetail] = useState<Record<string, unknown> | null>(null);
  const [allEntries, setAllEntries] = useState<NormalizedLeave[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const currentUser = getStoredUser() as Record<string, unknown> | null;
  const managerProfile = {
    name: String(currentUser?.fullName || currentUser?.firstName || "HR Manager"),
    role: normalizeUserRole(String((currentUser as Record<string, unknown>)?.workspaceMembership ? (currentUser as Record<string, unknown>).workspaceMembership : (currentUser as Record<string, unknown>)?.role || "hr-manager")),
  };

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const [leaveResult, attendanceResult] = await Promise.allSettled([
          getLeaveRequests(),
          getTeamAttendance(),
        ]);
        if (!mounted) return;
        if (leaveResult.status === "fulfilled") {
          const data = leaveResult.value?.data?.leaveRequests || leaveResult.value?.leaveRequests || [];
          setAllEntries((Array.isArray(data) ? data : []).map(normalizeLeaveRequest));
        }
        if (attendanceResult.status === "fulfilled") {
          setTeamAttendance(attendanceResult.value?.data?.teamAttendance || attendanceResult.value?.teamAttendance || []);
        }
        if (leaveResult.status === "rejected" || attendanceResult.status === "rejected") {
          setErrorMessage(String((leaveResult.status === "rejected" ? leaveResult.reason : attendanceResult.reason) || ""));
        } else {
          setErrorMessage("");
        }
      } catch (err: unknown) {
        if (mounted) setErrorMessage(String((err as Error).message || "Unable to load leave requests right now."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const departments = useMemo(() => {
    const all = [...allEntries, ...teamAttendance];
    const canonical = Array.from(new Set(all.flatMap((item) => normalizeDepartmentList((item as Record<string, unknown>)?.departments || (item as Record<string, unknown>)?.department)).filter(Boolean)));
    const preferred = ["HR", "Sales", "Finance", "Administration", "Tech", "IT", "Maintenance"];
    return [...preferred.filter((d) => canonical.includes(d)), ...canonical.filter((d) => !preferred.includes(d)).sort(), "All Departments"];
  }, [allEntries, teamAttendance]);

  /* Build employee roster with leave history */
  const employeeRoster = useMemo(() => {
    const employeeMap = new Map<string, Record<string, unknown>>();
    const todayKey = toDateKey(new Date());

    const ensureEmployee = (seed: Record<string, unknown>): Record<string, unknown> | null => {
      const key = String(seed.id || seed.userId || seed.requesterUserId || seed.employeeId || seed.name || seed.recordId || "").trim();
      if (!key) return null;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          id: key, userId: seed.userId || seed.requesterUserId || null,
          name: seed.name || seed.employeeName || "Unknown",
          role: seed.role || "Employee",
          department: seed.department || "",
          departments: normalizeDepartmentList(seed.departments || seed.department || inferDepartmentsFromRole(String(seed.role))),
          attendanceStatus: seed.attendanceStatus || "",
          attendanceRecord: seed.attendanceRecord || null,
          status: "Present", activeLeave: null,
          balances: { totalAllowed: 0, totalTaken: 0, remaining: 0, sickTaken: 0, casualTaken: 0, compOffTaken: 0, sickRemaining: 0, casualRemaining: 0, compOffRemaining: 0 },
          history: [],
        });
      }
      return employeeMap.get(key)!;
    };

    teamAttendance.forEach((record) => ensureEmployee(record as unknown as Record<string, unknown>));

    allEntries.forEach((entry) => {
      const emp = ensureEmployee(entry as unknown as Record<string, unknown>);
      if (!emp) return;
      (emp.history as Array<Record<string, unknown>>).push({
        id: entry.recordId,
        dateApplied: formatDateLabel(entry.createdAt || entry.updatedAt || entry.startDate),
        type: entry.type,
        from: entry.from,
        to: entry.to,
        days: entry.days,
        status: entry.statusCode === "approved" ? "Approved" : entry.statusCode === "rejected" ? "Rejected" : "Pending",
        reason: entry.reason,
        recordId: entry.recordId,
        actionedBy: entry.actionedBy,
      });
      if (entry.statusCode === "approved") {
        (emp.balances as LeaveBalances).totalTaken += entry.days;
        if (entry.leaveType === "Sick") (emp.balances as LeaveBalances).sickTaken += entry.days;
        if (entry.leaveType === "Casual") (emp.balances as LeaveBalances).casualTaken += entry.days;
        if (entry.leaveType === "Vacation") (emp.balances as LeaveBalances).compOffTaken += entry.days;
        if (isDateInRange(todayKey, entry.startDate, entry.endDate)) {
          emp.activeLeave = { ...entry, departmentDisplay: getDepartmentDisplay(emp.departments) };
        }
      }
    });

    return Array.from(employeeMap.values()).map((emp) => {
      const quota = getRoleQuota(String(emp.role));
      const approvedByType = { Casual: 0, Sick: 0, Vacation: 0 };
      (emp.history as Array<Record<string, unknown>>).forEach((h) => {
        const orig = allEntries.find((e) => e.recordId === h.recordId);
        if (orig && orig.statusCode === "approved" && approvedByType[orig.leaveType as keyof typeof approvedByType] !== undefined) {
          approvedByType[orig.leaveType as keyof typeof approvedByType] += orig.days;
        }
      });
      const totalAllowed = quota.Casual + quota.Sick + quota.Vacation;
      const totalTaken = (emp.balances as LeaveBalances).totalTaken;
      (emp.balances as LeaveBalances).totalAllowed = totalAllowed;
      (emp.balances as LeaveBalances).remaining = Math.max(0, totalAllowed - totalTaken);
      (emp.balances as LeaveBalances).sickRemaining = Math.max(0, quota.Sick - approvedByType.Sick);
      (emp.balances as LeaveBalances).casualRemaining = Math.max(0, quota.Casual - approvedByType.Casual);
      (emp.balances as LeaveBalances).compOffRemaining = Math.max(0, quota.Vacation - approvedByType.Vacation);
      emp.department = getDepartmentDisplay(emp.departments);

      const attendanceStatus = normalizeKey(String(emp.attendanceStatus || ""));
      const hasAttendance = Boolean(emp.attendanceRecord);
      let statusLabel = "Present";
      if (emp.activeLeave) statusLabel = "On Leave Today";
      else if (attendanceStatus.includes("present-late")) statusLabel = "Present Late";
      else if (attendanceStatus.includes("absent") || (!hasAttendance && !emp.activeLeave)) statusLabel = "Absent Today";
      else if (attendanceStatus.includes("half-day") || attendanceStatus.includes("on-leave")) statusLabel = "On Leave Today";
      emp.status = statusLabel;
      (emp.history as Array<Record<string, unknown>>).sort((a, b) => new Date(String(b.dateApplied || 0)).getTime() - new Date(String(a.dateApplied || 0)).getTime());
      return emp;
    }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [allEntries, teamAttendance]);

  const leaveRequests = useMemo(() =>
    allEntries.map((entry) => ({
      ...entry,
      balances: employeeRoster.find((e) => String(e.userId || e.id) === String(entry.requesterUserId || entry.employeeId || ""))?.balances || { sickRemaining: 0, casualRemaining: 0, compOffRemaining: 0 },
      departmentDisplay: getDepartmentDisplay(entry.departments),
    })),
  [allEntries, employeeRoster]);

  const currentLeaves = useMemo(() => {
    const todayKey = toDateKey(new Date());
    return leaveRequests.filter((r) => r.statusCode === "approved" && isDateInRange(todayKey, r.startDate, r.endDate));
  }, [leaveRequests]);

  const filteredRequests = useMemo(() =>
    leaveRequests.filter((r) => {
      if (statusFilter !== "all" && r.statusCode !== statusFilter) return false;
      if (!employeeMatchesDepartment(r as unknown as Record<string, unknown>, departmentFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
      }
      return true;
    }),
  [leaveRequests, statusFilter, departmentFilter, searchQuery]);

  const filteredMaster = useMemo(() =>
    employeeRoster.filter((emp) => {
      if (!employeeMatchesDepartment(emp, departmentFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return String(emp.name).toLowerCase().includes(q) || String(emp.role).toLowerCase().includes(q);
      }
      return true;
    }),
  [employeeRoster, departmentFilter, searchQuery]);

  const filteredCurrent = useMemo(() =>
    currentLeaves.filter((r) => {
      if (!employeeMatchesDepartment(r as unknown as Record<string, unknown>, departmentFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
      }
      return true;
    }),
  [currentLeaves, departmentFilter, searchQuery]);

  const pendingRequestsCount = useMemo(() => leaveRequests.filter((r) => r.statusCode === "pending").length, [leaveRequests]);
  const approvedRequestsCount = useMemo(() => leaveRequests.filter((r) => r.statusCode === "approved").length, [leaveRequests]);
  const rejectedRequestsCount = useMemo(() => leaveRequests.filter((r) => r.statusCode === "rejected").length, [leaveRequests]);

  const activeReportRows = useMemo(() => {
    if (activeTab === "current") return filteredCurrent;
    if (activeTab === "master") return filteredMaster;
    return filteredRequests;
  }, [activeTab, filteredCurrent, filteredMaster, filteredRequests]);

  const activeReportScopeLabel = useMemo(() => {
    if (activeTab === "current") return "Current Leave Snapshot";
    if (activeTab === "master") return "Leave Master Panel";
    return "Leave Requests Queue";
  }, [activeTab]);

  const departmentSummaryCards: DeptSummaryCard[] = useMemo(() =>
    ["HR", "Sales", "Finance", "Administration", "Tech", "IT", "Maintenance"].map((deptName) => {
      const members = employeeRoster.filter((e) => normalizeDepartmentList(e.departments).includes(deptName));
      return { departmentName: deptName, total: members.length, onLeave: members.filter((m) => m.status === "On Leave Today").length };
    }),
  [employeeRoster]);

  const roleSummaryCards: RoleSummaryCard[] = useMemo(() =>
    [{ key: "owner", label: "Founder" }, { key: "super-admin", label: "Super Admin" }, { key: "admin", label: "Admin" }].map((g) => {
      const members = employeeRoster.filter((e) => normalizeKey(String(e.role)) === g.key);
      return { ...g, total: members.length, onLeave: members.filter((m) => m.status === "On Leave Today").length };
    }),
  [employeeRoster]);

  async function handleExportReport(format = "PDF") {
    const reportFormat = format.toLowerCase() === "excel" ? "Excel" : "PDF";
    if (!activeReportRows.length) { toast.error("No leave records to export."); return; }
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: `${managerProfile.name} - ${activeReportScopeLabel}`,
        department: departmentFilter === "All Departments" ? "HR" : departmentFilter,
        category: "Other", dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: activeReportScopeLabel, generatedBy: managerProfile.name,
        format: reportFormat,
        description: `${activeReportScopeLabel} for ${departmentFilter}${searchQuery ? ` filtered by ${searchQuery}` : ""}.`,
        sourceType: "custom", sourceRef: `leave-requests-${activeTab}`,
        reportRows: buildLeaveExportRows(activeReportRows, activeReportScopeLabel, departmentFilter, searchQuery),
        monthlyData: [],
      });
      if (reportFormat === "PDF") await downloadReportFile(response?.data?.download, { openInNewTab: false });
      const id = response?.data?.report?.recordId;
      toast.success("Leave report saved to Reports.");
      navigate(id ? `/dashboard/hr/report?reportId=${id}` : "/dashboard/hr/report");
    } catch (err: unknown) {
      toast.error(String((err as Error)?.message || "Failed to create leave report."));
    } finally { setIsExportingReport(""); }
  }

  async function handleExportEmployeeReport(employee: Record<string, unknown>, format = "PDF") {
    if (!employee) return;
    const reportFormat = format.toLowerCase() === "excel" ? "Excel" : "PDF";
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: `${employee.name || "Employee"} Leave History`,
        department: getDepartmentDisplay(employee.departments || employee.department) === "General" ? "HR" : getDepartmentDisplay(employee.departments || employee.department),
        category: "Employee", dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: "Individual Leave History", generatedBy: managerProfile.name,
        format: reportFormat,
        description: `${employee.name || "Employee"} individual leave history report.`,
        sourceType: "employee-profile",
        sourceRef: String(employee.userId || employee.id || employee.recordId || "").trim(),
        reportRows: buildEmployeeLeaveExportRows(employee),
        monthlyData: [],
      });
      if (reportFormat === "PDF") await downloadReportFile(response?.data?.download, { openInNewTab: false });
      const id = response?.data?.report?.recordId;
      toast.success("Employee leave report saved to Reports.");
      navigate(id ? `/dashboard/hr/report?reportId=${id}` : "/dashboard/hr/report");
    } catch (err: unknown) {
      toast.error(String((err as Error)?.message || "Failed to create employee leave report."));
    } finally { setIsExportingReport(""); }
  }

  async function handleApproveRequest(request: NormalizedLeave) {
    if (!request?.recordId) return;
    setIsSavingDecision(true); setErrorMessage("");
    try {
      const response = await updateLeaveRequest(request.recordId, { status: "approved" });
      const updated = response?.data?.leaveRequest ? normalizeLeaveRequest(response.data.leaveRequest) : null;
      if (updated) setAllEntries((prev) => prev.map((e) => (e.recordId === updated.recordId ? updated : e)));
      else setAllEntries((prev) => prev.map((e) => (e.recordId === request.recordId ? { ...e, status: "approved", statusCode: "approved" } : e)));
      setViewingRequest(null); setRejectingRequest(null); setRejectReason("");
    } catch (err: unknown) {
      setErrorMessage(String((err as Error).message || "Unable to approve leave request."));
    } finally { setIsSavingDecision(false); }
  }

  async function handleRejectSubmit() {
    if (!rejectingRequest?.recordId || !rejectReason.trim()) return;
    setIsSavingDecision(true); setErrorMessage("");
    try {
      const response = await updateLeaveRequest(rejectingRequest.recordId, { status: "rejected", rejectionReason: rejectReason });
      const updated = response?.data?.leaveRequest ? normalizeLeaveRequest(response.data.leaveRequest) : null;
      if (updated) setAllEntries((prev) => prev.map((e) => (e.recordId === updated.recordId ? updated : e)));
      else setAllEntries((prev) => prev.map((e) => (e.recordId === rejectingRequest.recordId ? { ...e, status: "rejected", statusCode: "rejected", rejectionReason: rejectReason } : e)));
      setRejectingRequest(null); setRejectReason(""); setViewingRequest(null);
    } catch (err: unknown) {
      setErrorMessage(String((err as Error).message || "Unable to reject leave request."));
    } finally { setIsSavingDecision(false); }
  }

  if (isLoading) return <HRLeaveRequestsProcessingSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header (DESIGN.md §3) ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Leave Request Processing
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Review, approve or reject employee leave requests efficiently.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                // onClick={handleExportPDF}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                <FileDown size={16} className="text-red-500"/>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
              </button>
              <button
                type="button"
                // onClick={handleExportExcel}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                <FileSpreadsheet size={16} className="text-emerald-500"/>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {errorMessage}
            </div>
          )}

          {/* ── Main Pill Tabs (DESIGN.md §4) ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setStatusFilter("all"); setSearchQuery(""); }}
                className={`flex-1 min-w-[120px] rounded-full px-4 py-2 text-[10px] font-pbold font-pmedium uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Stat Cards (DESIGN.md §5) ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Requests</p>
                <p className="text-[15px] font-black text-slate-900">{pendingRequestsCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Clock size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">On Leave Today</p>
                <p className="text-[15px] font-black text-slate-900">{currentLeaves.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><CalendarClock size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Employees</p>
                <p className="text-[15px] font-black text-slate-900">{employeeRoster.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><Users size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Approved</p>
                <p className="text-[15px] font-black text-slate-900">{approvedRequestsCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
          </div>

          {/* ── Department Snapshot (special section) ── */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Department Snapshot</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
              {departmentSummaryCards.map((card) => (
                <div key={card.departmentName} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-bold text-slate-900">{card.departmentName}</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-1">{card.total} staff</p>
                  <div className="mt-2">
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-[#2563EB] border border-blue-100 text-[10px] font-semibold">
                      {card.onLeave} on leave
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Top Management (special section) ── */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Top Management Leave</p>
            <div className="flex flex-wrap gap-2">
              {roleSummaryCards.map((card) => (
                <div key={card.key} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-900">{card.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{card.total} staff, {card.onLeave} on leave</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Data Panel (DESIGN.md §6-10) ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Data Panel Header Row (DESIGN.md §7) */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {STATUS_PILLS.map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setStatusFilter(pill.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${statusFilter === pill.key ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <select
                  className="pl-3 pr-8 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[120px]"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text" placeholder="Search name or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                
              </div>
            </div>

            {/* ── SECTION A: Leave Master Table ── */}
            {activeTab === "master" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 text-left">Employee</th>
                      <th className="px-5 py-4 text-left">Department</th>
                      <th className="px-5 py-4 text-center">Leaves Taken</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredMaster.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-pmedium">No employees found.</td></tr>
                    ) : filteredMaster.map((emp) => {
                      const b = emp.balances as LeaveBalances;
                      return (
                        <tr key={String(emp.id)} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-[#2563EB] font-pmedium text-[11px]">
                                {getEmployeeInitials(String(emp.name))}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-pmedium text-slate-800 truncate">{String(emp.name)}</p>
                                <p className="text-[10px] text-slate-400">{String(emp.role)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[11px] text-slate-600">{getDepartmentDisplay(emp.departments)}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-[13px] font-pmedium text-slate-900">{b.totalTaken}</span>
                            <span className="text-[10px] text-slate-400 ml-1">/ {b.totalAllowed}</span>
                            <div className="flex gap-1.5 mt-1 justify-center">
                              <span className="text-[9px] text-slate-600 font-pmedium">S:{b.sickTaken}</span>
                              <span className="text-[9px] text-slate-600 font-pmedium">C:{b.casualTaken}</span>
                              <span className="text-[9px] text-slate-600 font-pmedium">CO:{b.compOffTaken}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">{getRosterStatusBadge(String(emp.status))}</td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => setViewingEmployee(emp)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all">
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── SECTION B: Currently On Leave ── */}
            {activeTab === "current" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 text-left">Employee</th>
                      <th className="px-5 py-4 text-left">Department</th>
                      <th className="px-5 py-4 text-left">From</th>
                      <th className="px-5 py-4 text-left">To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredCurrent.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-20 text-slate-400 font-pmedium">No employees are currently on leave.</td></tr>
                    ) : filteredCurrent.map((r) => (
                      <tr key={r.recordId} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-[#2563EB] font-pmedium text-[11px]">
                              {getEmployeeInitials(r.name)}
                            </div>
                            <p className="text-[12px] font-pmedium text-slate-800">{r.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[11px] text-slate-600">{r.departmentDisplay}</td>
                        <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">{r.from}</td>
                        <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">{r.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── SECTION C: Leave Requests Table ── */}
            {activeTab === "requests" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 text-left">Employee</th>
                      <th className="px-5 py-4 text-left">Leave Type & Reason</th>
                      <th className="px-5 py-4 text-left">Dates</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredRequests.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-pmedium">No leave requests match your filters.</td></tr>
                    ) : filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-[#2563EB] font-pmedium text-[11px]">
                              {getEmployeeInitials(req.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-pmedium text-slate-800 truncate">{req.name}</p>
                              <p className="text-[10px] text-slate-400">{req.departmentDisplay} &bull; {req.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={statusPillClass(req.type)}>
                            {req.type}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[200px]" title={req.reason}>"{req.reason}"</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[12px] font-pmedium text-slate-700">{req.from} - {req.to}</p>
                          <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-wider mt-0.5">{req.days} day(s)</p>
                        </td>
                        <td className="px-5 py-4 text-center">{getStatusBadge(req.status)}</td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setViewingRequest(req)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all">
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                            {req.statusCode === "pending" && (
                              <>
                                <button onClick={() => handleApproveRequest(req)} disabled={isSavingDecision} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-all">
                                  <Check size={15} strokeWidth={2.5} />
                                </button>
                                <button onClick={() => setRejectingRequest(req)} disabled={isSavingDecision} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all">
                                  <X size={15} strokeWidth={2.5} />
                                </button>
                              </>
                            )}
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

      {/* ── MODAL: Employee Leave History ── */}
      <AnimatePresence>
        {viewingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {getEmployeeInitials(String(viewingEmployee.name))}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{String(viewingEmployee.name)}'s Leave Record</h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{String(viewingEmployee.role)} &bull; {getDepartmentDisplay(viewingEmployee.departments || viewingEmployee.department)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleExportEmployeeReport(viewingEmployee, "PDF")} disabled={Boolean(isExportingReport)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[10px] font-pmedium text-white hover:bg-white/20 disabled:opacity-60">
                    <FileText size={14} /> PDF
                  </button>
                  <button onClick={() => handleExportEmployeeReport(viewingEmployee, "Excel")} disabled={Boolean(isExportingReport)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[10px] font-pmedium text-[#2563EB] hover:bg-blue-50 disabled:opacity-60">
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                  <button onClick={() => setViewingEmployee(null)} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Yearly Balances</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Allowed</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{(viewingEmployee.balances as LeaveBalances).totalAllowed}</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Leaves Taken</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">{(viewingEmployee.balances as LeaveBalances).totalTaken}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Remaining</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{(viewingEmployee.balances as LeaveBalances).remaining}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 border border-red-100 bg-red-50/30 rounded-xl flex justify-between text-[12px] font-semibold">
                    <span className="text-red-600">Sick</span>
                    <span className="text-red-800">{(viewingEmployee.balances as LeaveBalances).sickRemaining} left</span>
                  </div>
                  <div className="p-3 border border-blue-100 bg-blue-50/30 rounded-xl flex justify-between text-[12px] font-semibold">
                    <span className="text-blue-600">Casual</span>
                    <span className="text-blue-800">{(viewingEmployee.balances as LeaveBalances).casualRemaining} left</span>
                  </div>
                  <div className="p-3 border border-amber-100 bg-amber-50/30 rounded-xl flex justify-between text-[12px] font-semibold">
                    <span className="text-amber-600">Comp Off</span>
                    <span className="text-amber-800">{(viewingEmployee.balances as LeaveBalances).compOffRemaining} left</span>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Leave History</p>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-4 py-3 text-left">Applied On</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">From - To</th>
                        <th className="px-4 py-3 text-center">Days</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {(viewingEmployee.history as Array<Record<string, unknown>>).map((record) => (
                        <tr key={String(record.id)} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-[11px] text-slate-600">{String(record.dateApplied || "")}</td>
                          <td className="px-4 py-3">
                            <span className={statusPillClass(String(record.type))}>
                              {String(record.type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-700">{String(record.from || "")} - {String(record.to || "")}</td>
                          <td className="px-4 py-3 text-center text-[12px] font-pmedium text-slate-900">{String(record.days || "0")}</td>
                          <td className="px-4 py-3 text-center">{getStatusBadge(record.status)}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => setViewingLeaveDetail({ ...record, employeeName: viewingEmployee.name })} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all">
                              <Eye size={14} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                <button onClick={() => setViewingEmployee(null)} className="btn-pill w-full py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all">
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Leave Detail ── */}
      <AnimatePresence>
        {viewingLeaveDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 backdrop-blur-[2px] px-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white">Leave Details</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{String(viewingLeaveDetail.employeeName || viewingLeaveDetail.name || "")}</p>
                </div>
                <button onClick={() => setViewingLeaveDetail(null)} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Leave Type</p>
                    <span className={statusPillClass(String(viewingLeaveDetail.type || "Leave"))}>
                      {String(viewingLeaveDetail.type || "Leave")}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    {getStatusBadge(viewingLeaveDetail.status)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-[13px] font-semibold text-slate-800">{String(viewingLeaveDetail.from || "")} to {String(viewingLeaveDetail.to || "")}</p>
                    <p className="text-[11px] font-bold text-[#2563EB] mt-1">{String(viewingLeaveDetail.days || "0")} Day(s)</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reason</p>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-[12px] text-slate-700 italic leading-relaxed">
                    "{String(viewingLeaveDetail.reason || "No reason provided.")}"
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setViewingLeaveDetail(null)} className="btn-pill w-full py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all">
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: View & Approve/Reject Request ── */}
      <AnimatePresence>
        {viewingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-white">Review Leave Request</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{viewingRequest.name}</p>
                </div>
                <button onClick={() => setViewingRequest(null)} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee</p>
                    <p className="text-[13px] font-bold text-slate-900">{viewingRequest.name}</p>
                    <p className="text-[11px] text-slate-500">{viewingRequest.departmentDisplay} &bull; {viewingRequest.role}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Leave Type</p>
                    <span className={statusPillClass(viewingRequest.type)}>{viewingRequest.type}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mode</p>
                    <p className="text-[13px] font-semibold text-slate-800">{viewingRequest.leaveMode === "half_day" ? "Half Day" : "Full Day"}</p>
                  </div>
                  {viewingRequest.leaveMode === "half_day" && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Session</p>
                      <p className="text-[13px] font-semibold text-slate-800">{viewingRequest.halfDaySession || "Not specified"}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Balance Before</p>
                    <p className="text-[13px] font-semibold text-slate-800">{viewingRequest.requesterBalance} day(s)</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medical Cert</p>
                    <p className="text-[13px] font-semibold text-slate-800">{viewingRequest.medicalCertAttached ? "Attached" : "Not attached"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-[13px] font-semibold text-slate-800">{viewingRequest.from} to {viewingRequest.to}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Days</p>
                    <p className="text-lg font-black text-[#2563EB]">{viewingRequest.days} Days</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason</p>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-[12px] text-slate-700 italic">
                      "{viewingRequest.reason}"
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Processed By</p>
                    <p className="text-[13px] font-semibold text-slate-800">{viewingRequest.actionedBy || "Awaiting approval"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Leave Balances</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 border border-red-200 bg-red-50 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Sick</p>
                      <p className="text-xl font-black text-red-700 mt-1">{(viewingRequest as Record<string, unknown>)?.balances ? ((viewingRequest as Record<string, unknown>).balances as Record<string, number>).sickRemaining ?? 0 : 0}</p>
                    </div>
                    <div className="p-3 border border-blue-200 bg-blue-50 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">Casual</p>
                      <p className="text-xl font-black text-blue-700 mt-1">{(viewingRequest as Record<string, unknown>)?.balances ? ((viewingRequest as Record<string, unknown>).balances as Record<string, number>).casualRemaining ?? 0 : 0}</p>
                    </div>
                    <div className="p-3 border border-amber-200 bg-amber-50 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Comp Off</p>
                      <p className="text-xl font-black text-amber-700 mt-1">{(viewingRequest as Record<string, unknown>)?.balances ? ((viewingRequest as Record<string, unknown>).balances as Record<string, number>).compOffRemaining ?? 0 : 0}</p>
                    </div>
                  </div>
                </div>
              </div>
              {viewingRequest.statusCode === "pending" && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                  <button onClick={() => { setRejectingRequest(viewingRequest); setViewingRequest(null); }} disabled={isSavingDecision} className="btn-pill flex-1 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    <XCircle size={16} /> REJECT
                  </button>
                  <button onClick={() => handleApproveRequest(viewingRequest)} disabled={isSavingDecision} className="btn-pill flex-1 py-3 bg-[#2563EB] text-white shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSavingDecision ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} APPROVE
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Reject Reason ── */}
      <AnimatePresence>
        {rejectingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 backdrop-blur-[2px] px-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 bg-red-600 border-b border-red-700 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 text-white rounded-2xl"><XCircle size={24} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Reject Leave Request</h2>
                    <p className="text-[10px] text-red-200 uppercase tracking-wider mt-1">{rejectingRequest.name}</p>
                  </div>
                </div>
                <button onClick={() => { setRejectingRequest(null); setRejectReason(""); }} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4 bg-white">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 items-start">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <p className="text-xs text-red-700 font-medium">Providing a reason is mandatory to notify the employee.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-wider">Reason for Rejection *</label>
                  <textarea
                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-pmedium text-slate-900 focus:border-red-400 outline-none resize-none transition-all text-[12px]"
                    rows={4} placeholder="Explain why the leave cannot be approved..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button onClick={() => { setRejectingRequest(null); setRejectReason(""); }} className="btn-pill flex-1 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all">
                  CANCEL
                </button>
                <button disabled={!rejectReason.trim() || isSavingDecision} onClick={handleRejectSubmit} className="btn-pill flex-1 py-3 bg-red-600 text-white shadow-sm disabled:bg-slate-300 hover:bg-red-700 transition-all disabled:cursor-not-allowed">
                  {isSavingDecision ? <Loader2 size={16} className="animate-spin mx-auto" /> : "CONFIRM REJECTION"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
