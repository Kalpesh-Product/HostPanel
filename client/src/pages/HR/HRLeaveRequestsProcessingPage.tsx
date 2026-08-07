import React, { useState, useMemo, useEffect } from "react";
import {
  Search, Check, X, Eye, CheckCircle2, XCircle,
  CalendarClock, Calendar, UserCheck, Clock, ShieldAlert,
  FileText, FileSpreadsheet, FileDown, Building, Users,
  Loader2, Plus, Tags, WalletCards, ChevronDown, Pencil, Trash2, MapPin, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageFrame from "@/components/Pages/PageFrame";
import { HRLeaveRequestsProcessingSkeleton } from "@/components/ui/Skeleton";
import { getStoredUser, normalizeUserRole } from "@/lib/auth-session";
import { getLeaveRequests, updateLeaveRequest, getLeaveQuotas, updateLeaveQuota, getHolidays, createHoliday, updateHoliday, deleteHoliday, getLeaveTypes, createLeaveType, updateLeaveType } from "@/services/leave-requests";
import { getTeamAttendance } from "@/services/attendance";
import { getEmployeeManagementOverview } from "@/services/hr";
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
  reason?: string; rejectionReason?: string; actionedBy?: string; actionedByDesignation?: string; actionedByDepartment?: string; actionedAt?: string;
  requesterBalance?: number; leaveMode?: string; halfDaySession?: string;
  medicalCertAttached?: boolean; canAction?: boolean; isApprovalRecipient?: boolean; createdAt?: string; updatedAt?: string;
}

interface NormalizedLeave {
  recordId: string; id: string;
  employeeName: string; name: string; employeeId: string; email?: string;
  requesterUserId: string | null; userId?: string;
  department: string; departments: string[]; departmentDisplay: string;
  role: string;
  leaveType: string; type: string;
  from: string; to: string; startDate: string; endDate: string;
  days: number; status: string; statusCode: string;
  reason: string; rejectionReason: string; actionedBy: string; actionedByDesignation: string; actionedByDepartment: string; actionedAt: string;
  requesterBalance: number; leaveMode: string; halfDaySession: string;
  medicalCertAttached: boolean; canAction: boolean; isApprovalRecipient: boolean; createdAt: string; updatedAt: string;
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

interface LeaveQuotaRow {
  userId: string;
  name: string; email: string; employeeId: string;
  role: string; departments: string[];
  year: number; quotaConfigured: boolean;
  assignedLeaveTypeIds: string[]; assignedLeaveTypes: LeaveTypeConfig[];
  cycleType: "calendar_year" | "financial_year"; carryForward: boolean; carryForwardLimit?: number | null;
  total: Record<string, number>;
  used: Record<string, number>;
  remaining: Record<string, number>;
}

interface LeaveTypeConfig {
  id: string; name: string; code: string; description: string;
  isActive: boolean; requiresBalance: boolean;
  medicalCertificateAfterDays?: number | null; color?: string; sortOrder?: number;
}
interface HolidayEntry {
  id: string; name: string; description: string;
  date: string; time: string; location: string; year: number; type: string;
  recurring: boolean; isActive: boolean; entryKind: "holiday" | "event"; source?: string;
}

const MAIN_TABS = [
  { key: "requests", label: "Leave Requests" },
  { key: "current", label: "Currently On Leave" },
  { key: "master", label: "Leave Master" },
  { key: "quotas", label: "Leave Quotas" },
  { key: "holidays", label: "Holidays & Events" },
];

const HOLIDAY_TYPES = [
  { key: "public", label: "Public Holiday" },
  { key: "company", label: "Company Holiday" },
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

function formatClockTime(value: string): string {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value || "--";
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
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
  return depts.length > 0 ? depts.join(" / ") : "All Departments";
}

const ROLE_LABEL_UPPERCASE_WORDS = new Set(["hr", "it"]);
function formatRoleLabel(role?: string): string {
  const raw = String(role || "").trim();
  if (!raw) return "Employee";
  return raw
    .replace(/[_\s]+/g, "-")
    .split("-")
    .filter(Boolean)
    .map((word) => (ROLE_LABEL_UPPERCASE_WORDS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
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
  const leaveType = String(entry?.leaveType || "Leave");
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
    actionedByDesignation: String(entry?.actionedByDesignation || ""),
    actionedByDepartment: String(entry?.actionedByDepartment || ""),
    actionedAt: String(entry?.actionedAt || ""),
    reason: String(entry?.reason || ""),
    requesterBalance: Number(entry?.requesterBalance || 0),
    leaveMode: String(entry?.leaveMode === "half_day" ? "half_day" : "full_day"),
    halfDaySession: String(entry?.halfDaySession || ""),
    medicalCertAttached: Boolean(entry?.medicalCertAttached),
    canAction: Boolean(entry?.canAction),
    isApprovalRecipient: Boolean(entry?.isApprovalRecipient),
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

function formatActionedBy(entry: { actionedBy?: string; actionedByDesignation?: string; actionedByDepartment?: string }): string {
  const name = (entry.actionedBy || "").trim();
  if (!name) return "";
  const bracket = [entry.actionedByDesignation, entry.actionedByDepartment].filter(Boolean).join(" · ");
  return bracket ? `${name} (${bracket})` : name;
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
    ...((Array.isArray(employee.leaveTypeBalances) ? employee.leaveTypeBalances : []) as Array<Record<string, unknown>>).map((type) => ({
      label: String(type.name || "Leave") + " Balance",
      value: `Allowed ${type.total ?? 0} | Used ${type.used ?? 0} | Remaining ${Number(type.remaining) < 0 ? "Unlimited" : type.remaining ?? 0}`,
    })),
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
  const [employeeDirectory, setEmployeeDirectory] = useState<Record<string, unknown>[]>([]);
  const [leaveQuotas, setLeaveQuotas] = useState<LeaveQuotaRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeConfig[]>([]);
  const [leaveTypeSuggestions, setLeaveTypeSuggestions] = useState<string[]>([]);
  const [leaveTypeName, setLeaveTypeName] = useState("");
  const [isSavingLeaveType, setIsSavingLeaveType] = useState(false);
  const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
  const [isSuggestionDropdownOpen, setIsSuggestionDropdownOpen] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [assignmentEmployee, setAssignmentEmployee] = useState<LeaveQuotaRow | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<string[]>([]);
  const [isAssignmentDropdownOpen, setIsAssignmentDropdownOpen] = useState(true);
  const [balanceEmployee, setBalanceEmployee] = useState<LeaveQuotaRow | null>(null);
  const [balanceDraft, setBalanceDraft] = useState<Record<string, number>>({});
  const [policyDraft, setPolicyDraft] = useState({ cycleType: "calendar_year", carryForward: false, carryForwardLimit: "" });
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [holidaySubTab, setHolidaySubTab] = useState<"holiday" | "event">("holiday");
  const [holidayEntryFilter, setHolidayEntryFilter] = useState<"all" | "public" | "company">("all");
  const [eventEntryFilter, setEventEntryFilter] = useState<"all" | "upcoming" | "past">("all");
  const [viewingCalendarEntry, setViewingCalendarEntry] = useState<HolidayEntry | null>(null);
  const [quotaYear, setQuotaYear] = useState(new Date().getFullYear());
  const [savingQuotaUserId, setSavingQuotaUserId] = useState<string | null>(null);
  const [holidayForm, setHolidayForm] = useState({ name: "", description: "", date: "", time: "", location: "", type: "company", entryKind: "holiday", source: "manual", externalId: "", recurring: false });
  const [publicHolidaySuggestions, setPublicHolidaySuggestions] = useState<Array<{ name: string; date: string; description?: string }>>([]);
  const [isLoadingPublicHolidays, setIsLoadingPublicHolidays] = useState(false);
  const [isCalendarEntryModalOpen, setIsCalendarEntryModalOpen] = useState(false);
  const [isPublicHolidayModalOpen, setIsPublicHolidayModalOpen] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);
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
    async function loadData(isInitial = false) {
      try {
        if (isInitial) setIsLoading(true);
        const [leaveResult, attendanceResult, quotaResult, holidayResult, leaveTypeResult, employeeResult] = await Promise.allSettled([
          getLeaveRequests(),
          getTeamAttendance(),
          getLeaveQuotas(),
          getHolidays(),
          getLeaveTypes({ includeInactive: true }),
          getEmployeeManagementOverview(),
        ]);
        if (!mounted) return;
        if (leaveResult.status === "fulfilled") {
          const data = leaveResult.value?.data?.leaveRequests || leaveResult.value?.leaveRequests || [];
          setAllEntries((Array.isArray(data) ? data : []).map(normalizeLeaveRequest));
        }
        if (attendanceResult.status === "fulfilled") {
          setTeamAttendance(attendanceResult.value?.data?.teamAttendance || attendanceResult.value?.teamAttendance || []);
        }
        if (employeeResult.status === "fulfilled") {
          const employees = employeeResult.value?.data?.employees || employeeResult.value?.data?.data?.employees || [];
          setEmployeeDirectory((Array.isArray(employees) ? employees : []).filter((employee) => employee?.source !== "tenant-company"));
        }
        if (quotaResult.status === "fulfilled") {
          const quotaData = quotaResult.value?.data?.quotas || quotaResult.value?.quotas || [];
          setLeaveQuotas(Array.isArray(quotaData) ? quotaData : []);
        }
        if (holidayResult.status === "fulfilled") {
          const holidayData = holidayResult.value?.data?.holidays || holidayResult.value?.holidays || [];
          setHolidays(Array.isArray(holidayData) ? holidayData : []);
        }
        if (leaveTypeResult.status === "fulfilled") {
          const typePayload = leaveTypeResult.value?.data || leaveTypeResult.value || {};
          setLeaveTypes(Array.isArray(typePayload.leaveTypes) ? typePayload.leaveTypes : []);
          setLeaveTypeSuggestions(Array.isArray(typePayload.suggestions) ? typePayload.suggestions : []);
        }        if (leaveResult.status === "rejected" || attendanceResult.status === "rejected") {
          const rejectedLeave = leaveResult.status === "rejected" ? (leaveResult as PromiseRejectedResult).reason : null;
          const rejectedAttendance = attendanceResult.status === "rejected" ? (attendanceResult as PromiseRejectedResult).reason : null;
          setErrorMessage(String((rejectedLeave || rejectedAttendance) || ""));
        } else {
          setErrorMessage("");
        }
      } catch (err: unknown) {
        if (mounted) setErrorMessage(String((err as Error).message || "Unable to load leave requests right now."));
      } finally {
        if (mounted && isInitial) setIsLoading(false);
      }
    }
    loadData(true);
    const intervalId = window.setInterval(async () => {
      try {
        const fresh = await getLeaveRequests();
        if (!mounted) return;
        const entries = fresh?.data?.leaveRequests || fresh?.leaveRequests || [];
        setAllEntries((Array.isArray(entries) ? entries : []).map(normalizeLeaveRequest));
      } catch { /* keep the last successful queue while the connection recovers */ }
    }, 3000);
    return () => { mounted = false; window.clearInterval(intervalId); };
  }, []);

  useEffect(() => {
    let mounted = true;
    getLeaveQuotas({ year: quotaYear })
      .then((result) => {
        if (!mounted) return;
        const rows = result?.data?.quotas || result?.quotas || [];
        setLeaveQuotas(Array.isArray(rows) ? rows : []);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [quotaYear]);
  const departments = useMemo(() => {
    const all = [...employeeDirectory, ...allEntries, ...teamAttendance];
    const canonical = Array.from(new Set(all.flatMap((item) => normalizeDepartmentList((item as Record<string, unknown>)?.departments || (item as Record<string, unknown>)?.department)).filter(Boolean)));
    const preferred = ["HR", "Sales", "Finance", "Administration", "Tech", "IT", "Maintenance"];
    return [...preferred.filter((d) => canonical.includes(d)), ...canonical.filter((d) => !preferred.includes(d)).sort(), "All Departments"];
  }, [allEntries, employeeDirectory, teamAttendance]);

  /* Build employee roster with leave history */
  const employeeRoster = useMemo(() => {
    const employeeMap = new Map<string, Record<string, unknown>>();
    const todayKey = toDateKey(new Date());

    const ensureEmployee = (seed: Record<string, unknown>): Record<string, unknown> | null => {
      const key = String(seed.userId || seed.requesterUserId || seed.linkedUserId || seed.employeeUserId || seed.id || seed.employeeId || seed.name || seed.recordId || "").trim();
      if (!key) return null;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          id: key,
          userId: seed.userId || seed.requesterUserId || seed.linkedUserId || seed.employeeUserId || null,
          employeeId: seed.employeeId || seed.employeeCode || seed.employeeNumber || "",
          name: seed.name || seed.fullName || seed.employeeName || "Unknown",
          email: seed.email || "",
          role: seed.role || seed.workspaceRole || seed.rawRole || seed.jobTitle || "Employee",
          department: seed.department || "",
          departments: normalizeDepartmentList(seed.departmentNames || seed.departments || seed.department || inferDepartmentsFromRole(String(seed.role || seed.workspaceRole || seed.rawRole))),
          attendanceStatus: seed.attendanceStatus || "",
          attendanceRecord: seed.attendanceRecord || null,
          employmentStatus: seed.status || "",
          status: "Present", activeLeave: null,
          balances: { totalAllowed: 0, totalTaken: 0, remaining: 0, sickTaken: 0, casualTaken: 0, compOffTaken: 0, sickRemaining: 0, casualRemaining: 0, compOffRemaining: 0 },
          history: [],
        });
      }
      const employee = employeeMap.get(key)!;
      if (!employee.userId && (seed.userId || seed.requesterUserId || seed.linkedUserId || seed.employeeUserId)) employee.userId = seed.userId || seed.requesterUserId || seed.linkedUserId || seed.employeeUserId;
      if (!employee.employeeId && (seed.employeeId || seed.employeeCode || seed.employeeNumber)) employee.employeeId = seed.employeeId || seed.employeeCode || seed.employeeNumber;
      if ((!employee.name || employee.name === "Unknown") && (seed.name || seed.fullName || seed.employeeName)) employee.name = seed.name || seed.fullName || seed.employeeName;
      return employee;
    };

    employeeDirectory.forEach((employee) => ensureEmployee(employee));
    leaveQuotas.forEach((quota) => ensureEmployee({
      id: quota.userId,
      userId: quota.userId,
      employeeId: quota.employeeId,
      name: quota.name,
      email: quota.email,
      role: quota.role,
      departments: quota.departments,
    }));
    teamAttendance.forEach((record) => {
      const employee = ensureEmployee(record as unknown as Record<string, unknown>);
      if (!employee) return;
      employee.attendanceStatus = record.status || "";
      employee.attendanceRecord = record as unknown as Record<string, unknown>;
      if (record.name) employee.name = record.name;
      if (record.role) employee.role = record.role;
      const attendanceDepartments = normalizeDepartmentList(record.departments || record.department);
      if (attendanceDepartments.length > 0) employee.departments = attendanceDepartments;
    });

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
        if (isDateInRange(todayKey, entry.startDate, entry.endDate)) {
          emp.activeLeave = { ...entry, departmentDisplay: getDepartmentDisplay(emp.departments) };
        }
      }
    });

    const quotaByUserId = new Map(leaveQuotas.map((q) => [String(q.userId || "").trim(), q]));

    return Array.from(employeeMap.values()).map((emp) => {
      const storedQuota = quotaByUserId.get(String(emp.userId || emp.id || "").trim());
      const totalAllowed = Object.values(storedQuota?.total || {}).reduce((sum, value) => sum + Number(value || 0), 0);
      const totalTaken = Object.values(storedQuota?.used || {}).reduce((sum, value) => sum + Number(value || 0), 0);
      const remaining = Object.values(storedQuota?.remaining || {}).reduce((sum, value) => {
        const numeric = Number(value);
        return sum + (Number.isFinite(numeric) ? numeric : 0);
      }, 0);
      (emp.balances as LeaveBalances).totalAllowed = totalAllowed;
      (emp.balances as LeaveBalances).totalTaken = totalTaken;
      (emp.balances as LeaveBalances).remaining = remaining;
      const employeeLeaveTypes = (storedQuota?.assignedLeaveTypes || []).filter((type) => type.isActive !== false);
      emp.leaveTypeBalances = employeeLeaveTypes.map((type) => ({
        name: type.name,
        total: Number(storedQuota?.total?.[type.id] || 0),
        used: Number(storedQuota?.used?.[type.id] || 0),
        remaining: Number(storedQuota?.remaining?.[type.id] ?? 0),
      }));
      emp.quotaConfigured = Boolean(storedQuota);
      const employeeRoleKey = normalizeKey(String(emp.role || ""));
      if (["founder", "owner", "super-admin", "superadmin"].includes(employeeRoleKey)) {
        emp.departments = ["All Departments"];
      }
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
  }, [allEntries, employeeDirectory, teamAttendance, leaveQuotas]);

  const leaveRequests = useMemo(() =>
    allEntries.map((entry) => {
      const matchedEmployee = employeeRoster.find((e) => String(e.userId || e.id) === String(entry.requesterUserId || entry.employeeId || ""));
      return {
        ...entry,
        balances: matchedEmployee?.balances || { totalAllowed: 0, totalTaken: 0, remaining: 0 },
        leaveTypeBalances: matchedEmployee?.leaveTypeBalances || [],
        departmentDisplay: getDepartmentDisplay(entry.departments),
        email: String(matchedEmployee?.email || ""),
      };
    }),
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

  const activeLeaveTypes = useMemo(() => leaveTypes.filter((type) => type.isActive), [leaveTypes]);
  const holidayEntries = useMemo(() => holidays.filter((entry) => entry.entryKind !== "event"), [holidays]);
  const eventEntries = useMemo(() => holidays.filter((entry) => entry.entryKind === "event"), [holidays]);
  const filteredHolidayEntries = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return holidayEntries.filter((entry) => {
      if (holidayEntryFilter !== "all" && entry.type !== holidayEntryFilter) return false;
      if (!needle) return true;
      return [entry.name, entry.description, entry.type, entry.date].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [holidayEntries, holidayEntryFilter, searchQuery]);
  const filteredEventEntries = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const todayKey = toDateKey(new Date());
    return eventEntries.filter((entry) => {
      if (eventEntryFilter === "upcoming" && entry.date < todayKey) return false;
      if (eventEntryFilter === "past" && entry.date >= todayKey) return false;
      if (!needle) return true;
      return [entry.name, entry.description, entry.location, entry.time, entry.date].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [eventEntries, eventEntryFilter, searchQuery]);
  const filteredQuotas = useMemo(() => {
    const yearRows = leaveQuotas.filter((q) => String(q.year || "") === String(quotaYear) || (!q.year && String(new Date().getFullYear()) === String(quotaYear)));
    const effective = yearRows.length > 0 ? yearRows : leaveQuotas;
    return effective.filter((q) => {
      if (departmentFilter !== "All Departments" && !normalizeDepartmentList(q.departments).includes(departmentFilter)) return false;
      if (searchQuery.trim()) {
        const needle = searchQuery.toLowerCase();
        return q.name.toLowerCase().includes(needle) || q.role.toLowerCase().includes(needle) || q.employeeId.toLowerCase().includes(needle);
      }
      return true;
    });
  }, [leaveQuotas, quotaYear, departmentFilter, searchQuery]);

  const pendingRequestsCount = useMemo(() => leaveRequests.filter((r) => r.statusCode === "pending").length, [leaveRequests]);
  const approvedRequestsCount = useMemo(() => leaveRequests.filter((r) => r.statusCode === "approved").length, [leaveRequests]);
  const rejectedRequestsCount = useMemo(() => leaveRequests.filter((r) => r.statusCode === "rejected").length, [leaveRequests]);

  const activeReportRows = useMemo(() => {
    if (activeTab === "current") return filteredCurrent;
    if (activeTab === "master") return filteredMaster;
    if (activeTab === "quotas" || activeTab === "holidays") return filteredRequests;
    return filteredRequests;
  }, [activeTab, filteredCurrent, filteredMaster, filteredRequests]);

  const activeReportScopeLabel = useMemo(() => {
    if (activeTab === "current") return "Current Leave Snapshot";
    if (activeTab === "master") return "Leave Master Panel";
    if (activeTab === "quotas") return "Leave Quota Panel";
    if (activeTab === "holidays") return "Holidays & Events Calendar";
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
      const updatedPayload = response?.data?.leaveRequest || response?.leaveRequest;
      const updated = updatedPayload ? normalizeLeaveRequest(updatedPayload) : null;
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
      const updatedPayload = response?.data?.leaveRequest || response?.leaveRequest;
      const updated = updatedPayload ? normalizeLeaveRequest(updatedPayload) : null;
      if (updated) setAllEntries((prev) => prev.map((e) => (e.recordId === updated.recordId ? updated : e)));
      else setAllEntries((prev) => prev.map((e) => (e.recordId === rejectingRequest.recordId ? { ...e, status: "rejected", statusCode: "rejected", rejectionReason: rejectReason } : e)));
      setRejectingRequest(null); setRejectReason(""); setViewingRequest(null);
    } catch (err: unknown) {
      setErrorMessage(String((err as Error).message || "Unable to reject leave request."));
    } finally { setIsSavingDecision(false); }
  }

  async function refreshLeavePolicyData() {
    const [quotaResult, typeResult] = await Promise.all([
      getLeaveQuotas({ year: quotaYear }),
      getLeaveTypes({ includeInactive: true }),
    ]);
    const quotaData = quotaResult?.data?.quotas || quotaResult?.quotas || [];
    const typePayload = typeResult?.data || typeResult || {};
    setLeaveQuotas(Array.isArray(quotaData) ? quotaData : []);
    setLeaveTypes(Array.isArray(typePayload.leaveTypes) ? typePayload.leaveTypes : []);
    setLeaveTypeSuggestions(Array.isArray(typePayload.suggestions) ? typePayload.suggestions : []);
  }

  async function handleAddLeaveType(nameOverride?: string) {
    const name = String(nameOverride || leaveTypeName).trim();
    if (name.length < 2) { toast.error("Enter a leave type name."); return; }
    setIsSavingLeaveType(true);
    try {
      await createLeaveType({ name, requiresBalance: true });
      await refreshLeavePolicyData();
      setLeaveTypeName("");
      toast.success(`${name} added.`);
    } catch (err: unknown) {
      toast.error(String((err as Error).message || "Unable to add leave type."));
    } finally { setIsSavingLeaveType(false); }
  }

  async function handleAddSelectedSuggestions() {
    if (selectedSuggestions.length === 0) { toast.error("Select at least one leave type."); return; }
    setIsSavingLeaveType(true);
    try {
      for (const name of selectedSuggestions) await createLeaveType({ name, requiresBalance: true });
      await refreshLeavePolicyData();
      setSelectedSuggestions([]);
      setIsSuggestionDropdownOpen(false);
      toast.success("Selected leave types added.");
    } catch (err: unknown) {
      toast.error(String((err as Error).message || "Unable to add selected leave types."));
    } finally { setIsSavingLeaveType(false); }
  }

  async function handleToggleLeaveType(type: LeaveTypeConfig) {
    try {
      await updateLeaveType(type.id, { isActive: !type.isActive });
      await refreshLeavePolicyData();
      toast.success(`${type.name} ${type.isActive ? "disabled" : "enabled"}.`);
    } catch (err: unknown) {
      toast.error(String((err as Error).message || "Unable to update leave type."));
    }
  }

  function openAssignmentModal(row: LeaveQuotaRow) {
    setAssignmentEmployee(row);
    setAssignmentDraft(Array.isArray(row.assignedLeaveTypeIds) ? row.assignedLeaveTypeIds : []);
    setIsAssignmentDropdownOpen(true);
  }

  async function handleSaveAssignment() {
    if (!assignmentEmployee) return;
    setSavingQuotaUserId(assignmentEmployee.userId);
    try {
      await updateLeaveQuota(assignmentEmployee.userId, {
        year: quotaYear,
        assignedLeaveTypeIds: assignmentDraft,
      });
      await refreshLeavePolicyData();
      setAssignmentEmployee(null);
      toast.success(`Leave types updated for ${assignmentEmployee.name}.`);
    } catch (err: unknown) {
      toast.error(String((err as Error).message || "Unable to assign leave types."));
    } finally { setSavingQuotaUserId(null); }
  }

  function openBalanceModal(row: LeaveQuotaRow) {
    if (!row.assignedLeaveTypeIds?.length) {
      toast.error("Assign at least one leave type to this employee first.");
      return;
    }
    setBalanceEmployee(row);
    setBalanceDraft(Object.fromEntries(row.assignedLeaveTypeIds.map((id) => [id, Number(row.total?.[id] || 0)])));
    setPolicyDraft({
      cycleType: row.cycleType || "calendar_year",
      carryForward: Boolean(row.carryForward),
      carryForwardLimit: row.carryForwardLimit == null ? "" : String(row.carryForwardLimit),
    });
  }

  async function handleSaveBalances() {
    if (!balanceEmployee) return;
    setSavingQuotaUserId(balanceEmployee.userId);
    try {
      await updateLeaveQuota(balanceEmployee.userId, {
        year: quotaYear,
        balances: balanceDraft,
        cycleType: policyDraft.cycleType,
        carryForward: policyDraft.carryForward,
        carryForwardLimit: policyDraft.carryForward ? (policyDraft.carryForwardLimit === "" ? null : Number(policyDraft.carryForwardLimit)) : null,
      });
      await refreshLeavePolicyData();
      setBalanceEmployee(null);
      toast.success(`Balances updated for ${balanceEmployee.name}.`);
    } catch (err: unknown) {
      toast.error(String((err as Error).message || "Unable to update leave balances."));
    } finally { setSavingQuotaUserId(null); }
  }
  function openNewCalendarEntry(entryKind: "holiday" | "event") {
    setEditingHolidayId(null);
    setHolidaySubTab(entryKind);
    setHolidayForm({ name: "", description: "", date: "", time: "", location: "", type: "company", entryKind, source: "manual", externalId: "", recurring: false });
    setIsCalendarEntryModalOpen(true);
  }

  function selectPublicHolidaySuggestion(suggestion: { name: string; date: string; description?: string }) {
    setEditingHolidayId(null);
    setHolidaySubTab("holiday");
    setHolidayForm({
      name: suggestion.name,
      description: suggestion.description || "",
      date: suggestion.date,
      time: "",
      location: "",
      type: "public",
      entryKind: "holiday",
      source: "public_api",
      externalId: `${suggestion.date}-${suggestion.name}`,
      recurring: false,
    });
    setIsPublicHolidayModalOpen(false);
    setIsCalendarEntryModalOpen(true);
  }

  async function loadPublicHolidaySuggestions() {
    setIsLoadingPublicHolidays(true);
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`https://tallyfy.com/national-holidays/api/IN/${year}.json`);
      if (!response.ok) throw new Error("Public holiday service is unavailable.");
      const payload = await response.json();
      setPublicHolidaySuggestions((Array.isArray(payload?.holidays) ? payload.holidays : []).map((entry: any) => ({
        name: String(entry.name || entry.local_name || "Public Holiday"),
        date: String(entry.date || ""),
        description: String(entry.description || ""),
      })).filter((entry: any) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date)));
    } catch (err: unknown) {
      toast.error(String((err as Error).message || "Unable to load public holiday suggestions."));
    } finally { setIsLoadingPublicHolidays(false); }
  }

  async function handleHolidaySubmit(e: React.FormEvent) {
    e.preventDefault();
    const isEvent = holidayForm.entryKind === "event";
    const entryLabel = isEvent ? "Event" : "Holiday";
    const name = holidayForm.name.trim();
    const date = holidayForm.date;
    if (!name || name.length < 2) { toast.error(`${entryLabel} name is required.`); return; }
    if (!date) { toast.error(`${entryLabel} date is required.`); return; }
    if (isEvent && !holidayForm.time) { toast.error("Event time is required."); return; }
    setIsSavingHoliday(true);
    const payload = {
      name,
      description: holidayForm.description.trim(),
      date,
      time: isEvent ? holidayForm.time : "",
      location: isEvent ? holidayForm.location.trim() : "",
      type: holidayForm.type,
      entryKind: holidayForm.entryKind,
      source: holidayForm.source,
      externalId: holidayForm.externalId,
      recurring: holidayForm.recurring,
    };
    try {
      if (editingHolidayId) {
        await updateHoliday(editingHolidayId, payload);
        toast.success(`${entryLabel} updated.`);
      } else {
        await createHoliday(payload);
        toast.success(`${entryLabel} added.`);
      }
      const fresh = await getHolidays({ year: new Date(date).getFullYear() });
      const holidayData = fresh?.data?.holidays || fresh?.holidays || [];
      setHolidays(Array.isArray(holidayData) ? holidayData : []);
      setHolidayForm({ name: "", description: "", date: "", time: "", location: "", type: "company", entryKind: "holiday", source: "manual", externalId: "", recurring: false });
      setEditingHolidayId(null);
      setIsCalendarEntryModalOpen(false);
    } catch (err: unknown) {
      toast.error(String((err as Error).message || `Unable to save ${entryLabel.toLowerCase()}.`));
    } finally {
      setIsSavingHoliday(false);
    }
  }

  async function handleDeleteHoliday(entry: HolidayEntry) {
    const entryLabel = entry.entryKind === "event" ? "event" : "holiday";
    if (!window.confirm(`Delete ${entryLabel} "${entry.name}"?`)) return;
    try {
      await deleteHoliday(entry.id);
      setHolidays((prev) => prev.filter((item) => item.id !== entry.id));
      if (viewingCalendarEntry?.id === entry.id) setViewingCalendarEntry(null);
      toast.success(`${entryLabel === "event" ? "Event" : "Holiday"} deleted.`);
    } catch (err: unknown) {
      toast.error(String((err as Error).message || `Unable to delete ${entryLabel}.`));
    }
  }

  function startViewCalendarEntry(entry: HolidayEntry) {
    setViewingCalendarEntry(entry);
  }

  function startEditHoliday(entry: HolidayEntry) {
    setViewingCalendarEntry(null);
    setEditingHolidayId(entry.id);
    setHolidaySubTab(entry.entryKind === "event" ? "event" : "holiday");
    setHolidayForm({
      name: entry.name,
      description: entry.description || "",
      date: entry.date,
      time: entry.time || "",
      location: entry.location || "",
      type: entry.type || "company",
      entryKind: entry.entryKind || "holiday",
      source: entry.source || "manual",
      externalId: "",
      recurring: Boolean(entry.recurring),
    });
    setIsCalendarEntryModalOpen(true);
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
                className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
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
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Pending Requests</p>
                <p className="text-[15px] font-pmedium text-slate-900">{pendingRequestsCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Clock size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mb-1">On Leave Today</p>
                <p className="text-[15px] font-pmedium text-slate-900">{currentLeaves.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><CalendarClock size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Total Employees</p>
                <p className="text-[15px] font-pmedium text-slate-900">{employeeRoster.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><Users size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Approved</p>
                <p className="text-[15px] font-pmedium text-slate-900">{approvedRequestsCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><CheckCircle2 size={16} /></div>
            </div>
          </div>

          {/* ── Department Snapshot (special section) ── */}
          {/* <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-3">Department Snapshot</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
              {departmentSummaryCards.map((card) => (
                <div key={card.departmentName} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-bold text-slate-900">{card.departmentName}</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-1">{card.total} staff</p>
                  <div className="mt-2">
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-[#2563EB] border border-blue-100 text-[10px] font-pmedium">
                      {card.onLeave} on leave
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {/* ── Top Management (special section) ── */}
          {/* <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-3">Top Management Leave</p>
            <div className="flex flex-wrap gap-2">
              {roleSummaryCards.map((card) => (
                <div key={card.key} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-900">{card.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{card.total} staff, {card.onLeave} on leave</p>
                </div>
              ))}
            </div>
          </div> */}

          {/* ── Data Panel (DESIGN.md §6-10) ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Data Panel Header Row */}
            {activeTab === "holidays" ? (
              <div className="border-b border-slate-100/60">
                <div className="flex overflow-x-auto border-b border-slate-100/60 bg-white p-1 shadow-sm [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1 shadow-sm [&::-webkit-scrollbar]:hidden">
                    <button type="button" onClick={() => setHolidaySubTab("holiday")} className={`relative z-10 flex min-w-[150px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${holidaySubTab === "holiday" ? "text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                      {holidaySubTab === "holiday" && <motion.div layoutId="leaveCalendarTabs" className="absolute inset-0 z-[-1] rounded-full bg-[#2563EB] shadow-sm" />}
                      Company Holidays
                    </button>
                    <button type="button" onClick={() => setHolidaySubTab("event")} className={`relative z-10 flex min-w-[150px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${holidaySubTab === "event" ? "text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                      {holidaySubTab === "event" && <motion.div layoutId="leaveCalendarTabs" className="absolute inset-0 z-[-1] rounded-full bg-[#2563EB] shadow-sm" />}
                      Company Events
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-stretch gap-3 bg-slate-50/50 p-3 lg:flex-row lg:items-center lg:justify-between lg:p-5">
                  <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {holidaySubTab === "holiday" ? (
                      <>
                        {(["all", "public", "company"] as const).map((filter) => (
                          <button key={filter} type="button" onClick={() => setHolidayEntryFilter(filter)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium capitalize transition-all ${holidayEntryFilter === filter ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"}`}>
                            {filter}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {(["all", "upcoming", "past"] as const).map((filter) => (
                          <button key={filter} type="button" onClick={() => setEventEntryFilter(filter)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium capitalize transition-all ${eventEntryFilter === filter ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"}`}>
                            {filter}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:w-auto">
                    <div className="relative min-w-[210px] flex-1 sm:w-72">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input type="text" placeholder={holidaySubTab === "event" ? "Search company events..." : "Search company holidays..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-[11px] font-pmedium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" />
                    </div>
                    {holidaySubTab === "holiday" && (
                      <button type="button" onClick={() => { setIsPublicHolidayModalOpen(true); loadPublicHolidaySuggestions(); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]">
                        <Upload size={14} /> Import
                      </button>
                    )}
                    <button type="button" onClick={() => openNewCalendarEntry(holidaySubTab)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95">
                      <Plus size={14} /> {holidaySubTab === "event" ? "Add Event" : "Add Holiday"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
                <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {STATUS_PILLS.map((pill) => (
                    <button key={pill.key} onClick={() => setStatusFilter(pill.key)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium transition-all sm:text-[12px] ${statusFilter === pill.key ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200" : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"}`}>
                      {pill.label}
                    </button>
                  ))}
                </div>
                <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap xl:w-auto">
                  <select className="min-w-[120px] cursor-pointer appearance-none rounded-lg border border-blue-100 bg-blue-50/50 py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm outline-none hover:bg-blue-50" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="relative min-w-[180px] flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input type="text" placeholder="Search name or role..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20" />
                  </div>
                </div>
              </div>
            )}
            {/* SECTION A: Leave Master Table */}
            {activeTab === "master" && (
              <div className="overflow-x-auto font-pmedium">
                <table className="w-full min-w-[1120px] text-left font-pmedium">
                  <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Emp ID</th>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4 text-center">Total Leaves</th>
                      <th className="px-5 py-4 text-center">Used</th>
                      <th className="px-5 py-4 text-center">Remaining</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredMaster.length === 0 ? (
                      <tr><td colSpan={9} className="py-16 text-center font-pmedium text-slate-400">No employees found.</td></tr>
                    ) : filteredMaster.map((emp) => {
                      const balances = emp.balances as LeaveBalances;
                      return (
                        <tr key={String(emp.id)} className="group transition-colors hover:bg-slate-50/50">
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{String(emp.employeeId || "--")}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 font-pmedium text-slate-900">
                              <UserCheck size={14} className="text-slate-400" />
                              {String(emp.name)}
                            </div>
                            {emp.email ? <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{String(emp.email)}</p> : null}
                          </td>
                          <td className="px-5 py-4 text-[11px] font-pmedium capitalize text-slate-600">{String(emp.role || "employee").replace(/_/g, " ")}</td>
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{getDepartmentDisplay(emp.departments)}</td>
                          <td className="px-5 py-4 text-center text-[12px] font-pmedium text-slate-800">{balances.totalAllowed}</td>
                          <td className="px-5 py-4 text-center text-[12px] font-pmedium text-amber-600">{balances.totalTaken}</td>
                          <td className="px-5 py-4 text-center text-[12px] font-pmedium text-emerald-600">{balances.remaining}</td>
                          <td className="px-5 py-4 text-center">{getRosterStatusBadge(String(emp.status))}</td>
                          <td className="px-5 py-4 text-center">
                            <button type="button" onClick={() => setViewingEmployee(emp)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700" aria-label={`View ${String(emp.name)} leave record`} title="View leave record">
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
                <table className="w-full min-w-[1140px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4 text-left">Employee ID</th>
                      <th className="px-5 py-4 text-left">Employee</th>
                      <th className="px-5 py-4 text-left">Role</th>
                      <th className="px-5 py-4 text-left">Department</th>
                      <th className="px-5 py-4 text-left">Type</th>
                      <th className="px-5 py-4 text-left">Dates</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredRequests.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-20 text-slate-400 font-pmedium">No leave requests match your filters.</td></tr>
                    ) : filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700 whitespace-nowrap">{req.employeeId || "-"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-pmedium text-slate-900">
                            <UserCheck size={14} className="text-slate-400" />
                            <span className="truncate text-[12px] text-slate-800">{req.name}</span>
                          </div>
                          {req.email ? <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{req.email}</p> : null}
                        </td>
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{formatRoleLabel(req.role)}</td>
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{req.departmentDisplay}</td>
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{req.leaveType || "Leave"}</td>
                        <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700 whitespace-nowrap">{req.from} - {req.to}</td>
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

            {/* ── SECTION D: Leave Quotas ── */}
            {activeTab === "quotas" && (
              <div className="flex flex-col gap-3 font-pmedium">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Leave Year</label>
                    <select className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] outline-none" value={quotaYear} onChange={(e) => setQuotaYear(Number(e.target.value) || new Date().getFullYear())}>
                      {Array.from(new Set([new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, ...leaveQuotas.map((q) => q.year).filter(Boolean)])).sort((a, b) => b - a).map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <span className="text-[10px] text-slate-400">{filteredQuotas.length} employees</span>
                  </div>
                  <button type="button" onClick={() => setIsLeaveTypeModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white transition-colors hover:bg-blue-700">
                    <Tags size={14} /> Configure Leave Types
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[940px] text-left font-pmedium">
                    <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Emp ID</th>
                        <th className="px-5 py-4">Employee</th>
                        <th className="px-5 py-4">Role</th>
                        <th className="px-5 py-4">Department</th>
                        <th className="px-5 py-4">Assigned Leave Types</th>
                        <th className="px-5 py-4">Leave Cycle</th>
                        <th className="px-5 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {filteredQuotas.length === 0 ? (
                        <tr><td colSpan={7} className="py-16 text-center font-pmedium text-slate-400">No employees found.</td></tr>
                      ) : filteredQuotas.map((row) => (
                        <tr key={row.userId || row.name} className="group transition-colors hover:bg-slate-50/50">
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{row.employeeId || "--"}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 font-pmedium text-slate-900"><UserCheck size={14} className="text-slate-400" />{row.name}</div>
                            {row.email ? <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{row.email}</p> : null}
                          </td>
                          <td className="px-5 py-4 font-pmedium capitalize text-slate-600">{String(row.role || "employee").replace(/_/g, " ")}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-600">{normalizeDepartmentList(row.departments).join(" / ") || "--"}</td>
                          <td className="px-5 py-4">
                            <div className="flex max-w-[280px] flex-wrap gap-1.5">
                              {(row.assignedLeaveTypes || []).length === 0 ? <span className="text-[10px] font-pmedium text-amber-600">Not assigned</span> : row.assignedLeaveTypes.map((type) => (
                                <span key={type.id} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium text-blue-700">{type.name}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[11px] font-pmedium text-slate-700">{row.cycleType === "financial_year" ? "Financial year" : "Calendar year"}</p>
                            <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{row.carryForward ? `Carry forward${row.carryForwardLimit != null ? ` · Max ${row.carryForwardLimit}` : ""}` : "Resets yearly"}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button type="button" onClick={() => openAssignmentModal(row)} className="group/action relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700" aria-label="Add leave type">
                                <Plus size={14} />
                                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[9px] font-pmedium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100">Add Leave Type</span>
                              </button>
                              <button type="button" onClick={() => openBalanceModal(row)} className="group/action relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700" aria-label="Add balance">
                                <WalletCards size={14} />
                                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[9px] font-pmedium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100">Add Balance</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* SECTION E: Holidays & Events */}
            {activeTab === "holidays" && (
              <div className="font-pmedium">
                {holidaySubTab === "holiday" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Holiday</th>
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4">Origin</th>
                          <th className="px-5 py-4">Recurring</th>
                          <th className="px-5 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {filteredHolidayEntries.length === 0 ? (
                          <tr><td colSpan={5} className="py-16 text-center text-[11px] font-pmedium text-slate-400">No company holidays found.</td></tr>
                        ) : filteredHolidayEntries.map((holiday) => (
                          <tr key={holiday.id} className="transition-colors hover:bg-slate-50/50">
                            <td className="px-5 py-4">
                              <p className="text-[12px] font-pmedium text-slate-900">{holiday.name}</p>
                              {holiday.description ? <p className="mt-0.5 max-w-md truncate text-[10px] font-pmedium text-slate-400">{holiday.description}</p> : null}
                            </td>
                            <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{formatDateLabel(holiday.date)}</td>
                            <td className="px-5 py-4"><span className={statusPillClass(holiday.type === "public" ? "Public Holiday" : "Company Holiday")}>{holiday.type === "public" ? "Public" : "Company"}</span></td>
                            <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{holiday.recurring ? "Yearly" : "Once"}</td>
                            <td className="px-5 py-4">
                              <div className="flex justify-center gap-1.5">
                                <button type="button" title="View holiday" aria-label="View holiday" onClick={() => startViewCalendarEntry(holiday)} className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-blue-100 hover:text-blue-700"><Eye size={14} /></button>
                                <button type="button" title="Edit holiday" aria-label="Edit holiday" onClick={() => startEditHoliday(holiday)} className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-amber-100 hover:text-amber-700"><Pencil size={14} /></button>
                                <button type="button" title="Delete holiday" aria-label="Delete holiday" onClick={() => handleDeleteHoliday(holiday)} className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[940px] text-left">
                      <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Event</th>
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4">Time</th>
                          <th className="px-5 py-4">Location</th>
                          <th className="px-5 py-4">Description</th>
                          <th className="px-5 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {filteredEventEntries.length === 0 ? (
                          <tr><td colSpan={6} className="py-16 text-center text-[11px] font-pmedium text-slate-400">No company events found.</td></tr>
                        ) : filteredEventEntries.map((event) => (
                          <tr key={event.id} className="transition-colors hover:bg-slate-50/50">
                            <td className="px-5 py-4 text-[12px] font-pmedium text-slate-900">{event.name}</td>
                            <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{formatDateLabel(event.date)}</td>
                            <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{formatClockTime(event.time)}</td>
                            <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{event.location || "--"}</td>
                            <td className="max-w-xs px-5 py-4 text-[11px] font-pmedium text-slate-500"><p className="truncate">{event.description || "--"}</p></td>
                            <td className="px-5 py-4">
                              <div className="flex justify-center gap-1.5">
                                <button type="button" title="View event" aria-label="View event" onClick={() => startViewCalendarEntry(event)} className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-blue-100 hover:text-blue-700"><Eye size={14} /></button>
                                <button type="button" title="Edit event" aria-label="Edit event" onClick={() => startEditHoliday(event)} className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-amber-100 hover:text-amber-700"><Pencil size={14} /></button>
                                <button type="button" title="Delete event" aria-label="Delete event" onClick={() => handleDeleteHoliday(event)} className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}          </div>
        </div>
      </PageFrame>
      {/* Leave type setup */}
      <AnimatePresence>
        {isLeaveTypeModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm" onClick={() => setIsLeaveTypeModalOpen(false)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4"><div><h2 className="text-lg font-pmedium text-slate-900">Configure Leave Types</h2><p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Company leave catalogue</p></div><button onClick={() => setIsLeaveTypeModalOpen(false)} className="rounded-full bg-white p-2 text-slate-500 shadow-sm"><X size={17} /></button></div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5 font-pmedium">
                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Common leave types</label>
                  <div className="relative">
                    <button type="button" onClick={() => setIsSuggestionDropdownOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-[12px] font-pmedium text-slate-700"><span>{selectedSuggestions.length ? `${selectedSuggestions.length} selected` : "Select leave types"}</span><ChevronDown size={15} className={isSuggestionDropdownOpen ? "rotate-180" : ""} /></button>
                    {isSuggestionDropdownOpen && <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{leaveTypeSuggestions.filter((name) => !leaveTypes.some((type) => type.name.toLowerCase() === name.toLowerCase())).map((name) => <label key={name} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-pmedium text-slate-700 hover:bg-slate-50"><input type="checkbox" className="h-4 w-4 accent-[#2563EB]" checked={selectedSuggestions.includes(name)} onChange={(e) => setSelectedSuggestions((prev) => e.target.checked ? [...prev, name] : prev.filter((entry) => entry !== name))} />{name}</label>)}</div>}
                  </div>
                  <button type="button" onClick={handleAddSelectedSuggestions} disabled={isSavingLeaveType || selectedSuggestions.length === 0} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[10px] font-pmedium uppercase tracking-wider text-white disabled:opacity-40">{isSavingLeaveType ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Selected</button>
                </div>
                <div className="border-t border-slate-100 pt-4"><label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Missing type? Add it here</label><div className="flex gap-2"><input value={leaveTypeName} onChange={(e) => setLeaveTypeName(e.target.value)} placeholder="e.g. Study Leave" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-pmedium outline-none focus:border-[#2563EB]" /><button type="button" onClick={() => handleAddLeaveType()} disabled={isSavingLeaveType} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white disabled:opacity-40">Add</button></div></div>
                <div className="border-t border-slate-100 pt-4"><p className="mb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Configured types</p><div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{leaveTypes.length === 0 ? <p className="p-4 text-[11px] text-slate-400">No leave types configured.</p> : leaveTypes.map((type) => <label key={type.id} className="flex cursor-pointer items-center justify-between px-4 py-3"><span><span className="block text-[12px] font-pmedium text-slate-800">{type.name}</span><span className="text-[10px] text-slate-400">{type.isActive ? "Available for assignment" : "Disabled"}</span></span><input type="checkbox" className="h-4 w-4 accent-[#2563EB]" checked={type.isActive} onChange={() => handleToggleLeaveType(type)} /></label>)}</div></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee leave type assignment */}
      <AnimatePresence>
        {assignmentEmployee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[112] flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm" onClick={() => setAssignmentEmployee(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4"><div><h2 className="text-lg font-pmedium text-slate-900">Assign Leave Types</h2><p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{assignmentEmployee.employeeId || "--"} · {assignmentEmployee.name}</p></div><button onClick={() => setAssignmentEmployee(null)} className="rounded-full bg-white p-2 text-slate-500 shadow-sm"><X size={17} /></button></div>
              <div className="p-5 font-pmedium"><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Leave types</label><div className="relative"><button type="button" onClick={() => setIsAssignmentDropdownOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-[12px] text-slate-700"><span>{assignmentDraft.length ? `${assignmentDraft.length} selected` : "Select leave types"}</span><ChevronDown size={15} /></button>{isAssignmentDropdownOpen && <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-2">{activeLeaveTypes.length === 0 ? <p className="p-3 text-[11px] text-amber-600">Configure company leave types first.</p> : activeLeaveTypes.map((type) => <label key={type.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] text-slate-700 hover:bg-slate-50"><input type="checkbox" className="h-4 w-4 accent-[#2563EB]" checked={assignmentDraft.includes(type.id)} onChange={(e) => setAssignmentDraft((prev) => e.target.checked ? [...prev, type.id] : prev.filter((id) => id !== type.id))} />{type.name}</label>)}</div>}</div><div className="mt-3 flex flex-wrap gap-1.5">{assignmentDraft.map((id) => { const type = activeLeaveTypes.find((entry) => entry.id === id); return type ? <span key={id} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] text-blue-700">{type.name}</span> : null; })}</div></div>
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button onClick={() => setAssignmentEmployee(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600">Cancel</button><button onClick={handleSaveAssignment} disabled={savingQuotaUserId === assignmentEmployee.userId} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white disabled:opacity-50">{savingQuotaUserId === assignmentEmployee.userId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save Assignment</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee balance and leave-year policy */}
      <AnimatePresence>
        {balanceEmployee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[112] flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm" onClick={() => setBalanceEmployee(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4"><div><h2 className="text-lg font-pmedium text-slate-900">Add Leave Balances</h2><p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{balanceEmployee.employeeId || "--"} · {balanceEmployee.name} · {quotaYear}</p></div><button onClick={() => setBalanceEmployee(null)} className="rounded-full bg-white p-2 text-slate-500 shadow-sm"><X size={17} /></button></div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5 font-pmedium"><div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{balanceEmployee.assignedLeaveTypeIds.map((id) => { const type = activeLeaveTypes.find((entry) => entry.id === id); if (!type) return null; return <div key={id} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="text-[12px] text-slate-800">{type.name}</p><p className="text-[10px] text-slate-400">Annual balance in days</p></div><input type="number" min={0} step="0.5" value={balanceDraft[id] ?? 0} onChange={(e) => setBalanceDraft((prev) => ({ ...prev, [id]: Math.max(0, Number(e.target.value) || 0) }))} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center text-[12px] outline-none focus:border-[#2563EB]" /></div>})}</div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Calculated by</label><select value={policyDraft.cycleType} onChange={(e) => setPolicyDraft((prev) => ({ ...prev, cycleType: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none"><option value="calendar_year">Calendar year · January to December</option><option value="financial_year">Financial year · April to March</option></select></div>
                <div><label className="mb-2 block text-[10px] uppercase tracking-widest text-slate-500">At the next leave year</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setPolicyDraft((prev) => ({ ...prev, carryForward: false }))} className={`rounded-xl border px-3 py-3 text-left ${!policyDraft.carryForward ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}><span className="block text-[11px]">Reset balances</span><span className="mt-1 block text-[9px] text-slate-400">Start again with annual allowance</span></button><button type="button" onClick={() => setPolicyDraft((prev) => ({ ...prev, carryForward: true }))} className={`rounded-xl border px-3 py-3 text-left ${policyDraft.carryForward ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}><span className="block text-[11px]">Carry forward</span><span className="mt-1 block text-[9px] text-slate-400">Add unused balance to next year</span></button></div></div>
                {policyDraft.carryForward && <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Maximum carry forward (optional)</label><input type="number" min={0} step="0.5" value={policyDraft.carryForwardLimit} onChange={(e) => setPolicyDraft((prev) => ({ ...prev, carryForwardLimit: e.target.value }))} placeholder="Unlimited" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#2563EB]" /></div>}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button onClick={() => setBalanceEmployee(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-600">Cancel</button><button onClick={handleSaveBalances} disabled={savingQuotaUserId === balanceEmployee.userId} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-[10px] uppercase tracking-wider text-white disabled:opacity-50">{savingQuotaUserId === balanceEmployee.userId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save Balances</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Public holiday importer */}
      <AnimatePresence>
        {isPublicHolidayModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[114] flex items-center justify-center bg-[#0F172A]/70 p-4 backdrop-blur-sm" onClick={() => setIsPublicHolidayModalOpen(false)}><motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4"><div><h2 className="text-lg font-pmedium text-slate-900">Import Public Holidays</h2><p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Review and edit before adding to the company calendar</p></div><button onClick={() => setIsPublicHolidayModalOpen(false)} className="rounded-full bg-white p-2 text-slate-500 shadow-sm"><X size={17} /></button></div><div className="flex-1 overflow-y-auto p-5 font-pmedium">{isLoadingPublicHolidays ? <div className="flex items-center justify-center gap-2 py-20 text-[12px] text-slate-500"><Loader2 size={17} className="animate-spin" /> Loading public holidays...</div> : publicHolidaySuggestions.length === 0 ? <div className="py-20 text-center text-[12px] text-slate-400">No suggestions available for {quotaYear}.</div> : <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{publicHolidaySuggestions.map((suggestion) => { const alreadyAdded = holidayEntries.some((entry) => entry.date === suggestion.date && entry.name.toLowerCase() === suggestion.name.toLowerCase()); return <div key={`${suggestion.date}-${suggestion.name}`} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="text-[12px] text-slate-900">{suggestion.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{formatDateLabel(suggestion.date)}</p></div><button type="button" disabled={alreadyAdded} onClick={() => selectPublicHolidaySuggestion(suggestion)} className="rounded-lg bg-blue-50 px-3 py-2 text-[10px] uppercase tracking-wider text-blue-700 disabled:bg-slate-100 disabled:text-slate-400">{alreadyAdded ? "Added" : "Review & Add"}</button></div>})}</div>}</div></motion.div></motion.div>
        )}
      </AnimatePresence>

      {/* Holiday or event details */}
      <AnimatePresence>
        {viewingCalendarEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[115] flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-sm" onClick={() => setViewingCalendarEntry(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/70 bg-white font-pmedium shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><Calendar size={17} /></div>
                  <div className="min-w-0"><h2 className="truncate text-base font-pmedium text-slate-900">{viewingCalendarEntry.name}</h2><p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">{viewingCalendarEntry.entryKind === "event" ? "Company Event" : "Company Holiday"}</p></div>
                </div>
                <button type="button" onClick={() => setViewingCalendarEntry(null)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700"><X size={15} /></button>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-400">Date</p><p className="mt-1 text-[12px] text-slate-800">{formatDateLabel(viewingCalendarEntry.date)}</p></div>
                  {viewingCalendarEntry.entryKind === "event" ? <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-400">Time</p><p className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-800"><Clock size={13} className="text-slate-400" />{formatClockTime(viewingCalendarEntry.time)}</p></div> : <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-400">Origin</p><p className="mt-1 text-[12px] text-slate-800">{viewingCalendarEntry.type === "public" ? "Public Holiday" : "Company Holiday"}</p></div>}
                  {viewingCalendarEntry.entryKind === "event" && <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:col-span-2"><p className="text-[9px] uppercase tracking-widest text-slate-400">Location</p><p className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-800"><MapPin size={13} className="text-slate-400" />{viewingCalendarEntry.location || "Not specified"}</p></div>}
                </div>
                {viewingCalendarEntry.description ? <div><p className="text-[9px] uppercase tracking-widest text-slate-400">Description</p><p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-5 text-slate-700">{viewingCalendarEntry.description}</p></div> : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
                <button type="button" onClick={() => setViewingCalendarEntry(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100">Close</button>
                <button type="button" onClick={() => startEditHoliday(viewingCalendarEntry)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-blue-700"><Pencil size={13} /> Edit</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holiday or Event editor */}
      <AnimatePresence>
        {isCalendarEntryModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[116] flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-sm" onClick={() => setIsCalendarEntryModalOpen(false)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <h2 className="text-base font-pmedium text-slate-900">{editingHolidayId ? "Edit" : "Add"} {holidayForm.entryKind === "event" ? "Company Event" : "Holiday"}</h2>
                <button type="button" onClick={() => setIsCalendarEntryModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-slate-700"><X size={15} /></button>
              </div>
              <form onSubmit={handleHolidaySubmit} className="space-y-4 p-5 font-pmedium">
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Name *</label><input value={holidayForm.name} onChange={(e) => setHolidayForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" /></div>
                <div className={`grid grid-cols-1 gap-3 ${holidayForm.entryKind === "event" ? "sm:grid-cols-2" : ""}`}>
                  <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Date *</label><input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" /></div>
                  {holidayForm.entryKind === "event" && <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Time *</label><input type="time" value={holidayForm.time} onChange={(e) => setHolidayForm((prev) => ({ ...prev, time: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" /></div>}
                </div>
                {holidayForm.entryKind === "event" && <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Location</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input value={holidayForm.location} onChange={(e) => setHolidayForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Event venue or meeting point" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-[12px] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" /></div></div>}
                {holidayForm.entryKind === "holiday" && <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Holiday Origin</label><select value={holidayForm.type} onChange={(e) => setHolidayForm((prev) => ({ ...prev, type: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#2563EB]">{HOLIDAY_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select></div>}
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-slate-500">Description</label><textarea rows={3} value={holidayForm.description} onChange={(e) => setHolidayForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" /></div>
                {holidayForm.entryKind === "holiday" && <label className="flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" className="h-4 w-4 accent-[#2563EB]" checked={holidayForm.recurring} onChange={(e) => setHolidayForm((prev) => ({ ...prev, recurring: e.target.checked }))} />Repeats every year</label>}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsCalendarEntryModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100">Cancel</button><button type="submit" disabled={isSavingHoliday} className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[10px] uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{isSavingHoliday ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {isSavingHoliday ? "Saving..." : "Save"}</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee leave history */}      <AnimatePresence>
        {viewingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] bg-white font-pmedium shadow-2xl">
              <div className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-pmedium text-[#2563EB]">
                    {getEmployeeInitials(String(viewingEmployee.name))}
                  </div>
                  <div>
                    <h2 className="text-lg font-pmedium text-slate-900">{String(viewingEmployee.name)}'s Leave Record</h2>
                    <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{String(viewingEmployee.role)} &bull; {getDepartmentDisplay(viewingEmployee.departments || viewingEmployee.department)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleExportEmployeeReport(viewingEmployee, "PDF")} disabled={Boolean(isExportingReport)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-pmedium text-slate-600 hover:bg-slate-100 disabled:opacity-60">
                    <FileText size={14} /> PDF
                  </button>
                  <button onClick={() => handleExportEmployeeReport(viewingEmployee, "Excel")} disabled={Boolean(isExportingReport)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[10px] font-pmedium text-white hover:bg-blue-700 disabled:opacity-60">
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                  <button onClick={() => setViewingEmployee(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Yearly Balances</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-wider">Total Allowed</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{(viewingEmployee.balances as LeaveBalances).totalAllowed}</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                    <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-wider">Leaves Taken</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">{(viewingEmployee.balances as LeaveBalances).totalTaken}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                    <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-wider">Remaining</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{(viewingEmployee.balances as LeaveBalances).remaining}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(((viewingEmployee.leaveTypeBalances as Array<Record<string, unknown>>) || [])).map((type) => (
                    <div key={String(type.name)} className="rounded-xl border border-blue-100 bg-blue-50/30 p-3">
                      <p className="text-[11px] font-pmedium text-blue-700">{String(type.name)}</p>
                      <p className="mt-1 text-[10px] text-slate-500">Allowed {String(type.total ?? 0)} | Used {String(type.used ?? 0)} | Remaining {Number(type.remaining) < 0 ? "Unlimited" : String(type.remaining ?? 0)}</p>
                    </div>
                  ))}
                  {(!Array.isArray(viewingEmployee.leaveTypeBalances) || viewingEmployee.leaveTypeBalances.length === 0) && <p className="text-[11px] text-slate-400">No leave types or balances configured.</p>}
                </div>
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Leave History</p>
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
                <button onClick={() => setViewingEmployee(null)} className="w-full py-3 bg-white border border-slate-200 rounded-xl font-pmedium text-slate-600 hover:bg-slate-100 transition-all text-[12px]">
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
                  <h2 className="text-lg font-pmedium text-slate-900">Leave Details</h2>
                  <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{String(viewingLeaveDetail.employeeName || viewingLeaveDetail.name || "")}</p>
                </div>
                <button onClick={() => setViewingLeaveDetail(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-wider mb-1">Leave Type</p>
                    <span className={statusPillClass(String(viewingLeaveDetail.type || "Leave"))}>
                      {String(viewingLeaveDetail.type || "Leave")}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    {getStatusBadge(viewingLeaveDetail.status)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-[13px] font-semibold text-slate-800">{String(viewingLeaveDetail.from || "")} to {String(viewingLeaveDetail.to || "")}</p>
                    <p className="text-[11px] font-bold text-[#2563EB] mt-1">{String(viewingLeaveDetail.days || "0")} Day(s)</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-wider mb-2">Reason</p>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-[12px] text-slate-700 italic leading-relaxed">
                    "{String(viewingLeaveDetail.reason || "No reason provided.")}"
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setViewingLeaveDetail(null)} className="w-full py-3 bg-white border border-slate-200 rounded-xl font-pmedium text-slate-600 hover:bg-slate-100 transition-all text-[12px]">
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
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-slate-200/60 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-[24px]"
            >
              <div className="flex w-full justify-center py-2 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-slate-200" />
              </div>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><FileText size={17} /></div>
                  <div className="min-w-0">
                    <h2 className="text-base font-pmedium text-slate-900">Review Leave Request</h2>
                    <p className="mt-0.5 truncate text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Request #{viewingRequest.id || viewingRequest.recordId || "-"} &bull; {viewingRequest.status}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setViewingRequest(null)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4 sm:p-6 [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Employee ID</p>
                    <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{viewingRequest.employeeId || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Employee Name</p>
                    <p className="mt-1 flex items-center gap-2 text-[12px] font-pmedium text-[#0F172A]">
                      <UserCheck size={14} className="shrink-0 text-slate-400" />
                      {viewingRequest.name || "-"}
                    </p>
                    {viewingRequest.email ? <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{viewingRequest.email}</p> : null}
                  </div>
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Role</p>
                    <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{formatRoleLabel(viewingRequest.role)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Department</p>
                    <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{viewingRequest.departmentDisplay}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-t border-slate-200/70 pt-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Current Status</p>
                    {getStatusBadge(viewingRequest.status)}
                  </div>
                </div>
                <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">{viewingRequest.statusCode === "rejected" ? "Rejected By" : "Approved By"}</p>
                  <p className="text-[13px] font-pmedium text-[#0F172A]">{viewingRequest.actionedBy ? formatActionedBy(viewingRequest) : "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="mb-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Type</p>
                    <p className="text-[13px] font-pmedium text-[#0F172A]">{viewingRequest.leaveType || "Leave"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-right">
                    <p className="mb-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Duration</p>
                    <p className="text-[14px] font-pmedium text-[#0F172A]">{viewingRequest.days ?? 0} {viewingRequest.days === 1 ? "Day" : "Days"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">From</p>
                    <p className="flex items-center gap-2 text-[12px] font-pmedium text-[#0F172A]"><Calendar size={13} className="text-[#2563EB]" /> {viewingRequest.from || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">To</p>
                    <p className="flex items-center gap-2 text-[12px] font-pmedium text-[#0F172A]"><Calendar size={13} className="text-[#2563EB]" /> {viewingRequest.to || viewingRequest.from || "-"}</p>
                  </div>
                </div>
                {viewingRequest.leaveMode === "half_day" && (
                  <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Leave Mode</p>
                    <p className="text-[13px] font-semibold text-[#0F172A]">Half Day{viewingRequest.halfDaySession ? ` | ${viewingRequest.halfDaySession}` : ""}</p>
                  </div>
                )}
                <div className="p-4 rounded-2xl border bg-blue-50/50 border-blue-200/60 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest mb-1 text-blue-500">Balance Before Request</p>
                    <p className="text-[14px] font-bold text-blue-700">{viewingRequest.requesterBalance} day(s)</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-pmedium uppercase bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 shadow-sm">
                    {viewingRequest.medicalCertAttached ? <FileText size={14} strokeWidth={2.5} /> : null} {viewingRequest.medicalCertAttached ? "Certificate Attached" : "No Certificate"}
                  </div>
                </div>
                {((((viewingRequest as Record<string, unknown>).leaveTypeBalances as Array<Record<string, unknown>>) || []).length > 0) && (
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-2">Leave Balances</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {((((viewingRequest as Record<string, unknown>).leaveTypeBalances as Array<Record<string, unknown>>) || [])).map((type) => (
                        <div key={String(type.name)} className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                          <p className="text-[9px] font-pmedium uppercase tracking-wider text-blue-700">{String(type.name)}</p>
                          <p className="mt-1 text-[13px] font-bold text-slate-800">{Number(type.remaining) < 0 ? "Unlimited" : String(type.remaining ?? 0)} left</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-2">Request Statement</p>
                  <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">"{viewingRequest.reason}"</p>
                </div>
                {viewingRequest.statusCode === "rejected" && viewingRequest.rejectionReason && (
                  <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
                    <p className="text-[10px] font-pmedium text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><XCircle size={14} /> Grounds for Rejection</p>
                    <p className="text-[13px] font-semibold text-red-900 leading-relaxed">{viewingRequest.rejectionReason}</p>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100/80 shrink-0">
                {viewingRequest.statusCode === "pending" && viewingRequest.canAction ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button onClick={() => { setRejectingRequest(viewingRequest); setViewingRequest(null); }} disabled={isSavingDecision} className="w-full sm:flex-1 py-3.5 sm:py-4 bg-white border border-red-200/80 text-red-600 rounded-xl font-pmedium hover:bg-red-50 shadow-sm transition-all text-[11px] sm:text-[12px] uppercase tracking-wider disabled:opacity-50">
                      REJECT
                    </button>
                    <button
                      onClick={() => handleApproveRequest(viewingRequest)}
                      disabled={isSavingDecision}
                      className="w-full sm:flex-[2] py-3.5 sm:py-4 bg-[#2563EB] text-white rounded-xl font-pmedium shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all text-[11px] sm:text-[12px] uppercase tracking-wider disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {isSavingDecision ? "SAVING..." : "AUTHORIZE LEAVE"}
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setViewingRequest(null)} className="w-full py-3.5 sm:py-4 bg-white border border-slate-200/60 shadow-sm text-slate-700 rounded-xl font-pmedium hover:bg-slate-50 transition-all text-[11px] sm:text-[12px] uppercase tracking-wider">
                    CLOSE PANEL
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Reject Reason ── */}
      <AnimatePresence>
        {rejectingRequest && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-slate-200/60 bg-white shadow-2xl sm:rounded-[24px]"
            >
              <div className="flex w-full justify-center py-2 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-slate-200" />
              </div>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><XCircle size={17} /></div>
                  <div className="min-w-0">
                    <h2 className="text-base font-pmedium text-slate-900">Reject Leave Request</h2>
                    <p className="mt-0.5 truncate text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{rejectingRequest.name}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setRejectingRequest(null); setRejectReason(""); }} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4 bg-white">
                <div className="p-4 sm:p-5 bg-red-50/80 border border-red-200/80 rounded-2xl">
                  <label className="text-[10px] font-pmedium text-red-600 uppercase tracking-widest mb-2 block">Mandatory Rejection Note</label>
                  <textarea
                    rows={4} required placeholder="Explain why this request is denied..."
                    className="w-full p-3 sm:p-4 text-[13px] sm:text-[14px] rounded-xl border border-red-200 outline-none focus:ring-2 focus:ring-red-200 bg-white font-pmedium text-red-900 placeholder:text-red-300 shadow-sm"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100/80 shrink-0">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button onClick={() => { setRejectingRequest(null); setRejectReason(""); }} className="w-full sm:flex-1 py-3.5 sm:py-4 bg-white border border-slate-200/60 shadow-sm text-slate-700 rounded-xl font-pmedium hover:bg-slate-50 transition-all text-[11px] sm:text-[12px] uppercase tracking-wider">
                    CANCEL
                  </button>
                  <button disabled={!rejectReason.trim() || isSavingDecision} onClick={handleRejectSubmit} className="w-full sm:flex-[2] py-3.5 sm:py-4 bg-red-600 text-white rounded-xl font-pmedium shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all text-[11px] sm:text-[12px] uppercase tracking-wider disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2">
                    {isSavingDecision ? <Loader2 size={16} className="animate-spin" /> : "CONFIRM REJECTION"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
