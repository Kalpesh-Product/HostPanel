import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Users, Search, UserPlus, Shield, Mail, Phone, Building, Briefcase,
  CheckCircle2, Key, Lock, X, Power, MailOpen, Calendar, FileText,
  FileSpreadsheet, UploadCloud, Download, FileDown, Plus, Filter, AlertCircle,
  Eye, Edit3, Clock, UserCheck, UserX, Loader2, ChevronDown, ArrowLeft,
  ChevronRight, AlertTriangle, XCircle, Camera, Save, Ban,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import PageFrame from "@/components/Pages/PageFrame";
import { HREmployeeManagementSkeleton } from "@/components/ui/Skeleton";
import { canAccessEmployeeModule, getStoredUser, normalizeUserRole } from "@/lib/auth-session";
import { getAllDepartmentModules, getRoleModules } from "@/lib/owner-access";
import { axiosPrivate } from "@/utils/axios";
import {
  createEmployeeRecord, getEmployeeManagementOverview,
  updateEmployeeRecord as updateEmployeeRecordRequest,
  updateEmployeeAccessRequest,
} from "@/services/hr";
import { getRecruitmentOverview } from "@/services/recruitment";
import { createReport } from "@/services/reports";
import { downloadReportFile } from "@/utils/report-download";
import { getCountries, getStates, getCities } from "@/utils/locationApi";
import { uploadEmployeeDocuments } from "@/services/hr";

/* ───────────────────────────── Types ───────────────────────────── */

interface EmployeeFormState {
  fullName: string; dateOfBirth: string; email: string; phone: string;
  currentAddress: string; country: string; state: string; city: string;
  emergencyContactName: string; emergencyContactPhone: string;
  jobTitle: string; jobCode: string; departments: string[]; role: string;
  managerUserId: string; workLocation: string; workMode: string; employmentType: string;
  internshipIsUnpaid: boolean; internshipDurationMonths: string; internshipEndDate: string;
  noticePeriodDays: string; probationDays: string; joiningDate: string; salaryAmount: string;
  bankNameSelection: string; bankNameCustom: string; bankName: string;
  accountHolderName: string; accountNumber: string; ifscCode: string;
  nationalIdType: string; nationalIdNumber: string; taxId: string; providentFundNumber: string;
  identityProof: File | null; addressProof: File | null; bankProof: File | null;
  otherDocuments: File[];
}

interface Employee {
  id: string; employeeNumber: string; name: string; fullName: string; email: string;
  phone: string; department: string; departments: string[]; role: string; rawRole: string;
  status: string; statusKey: string; dateOfBirth: string; dateOfBirthValue: string;
  currentAddress: string; country: string; state: string; city: string;
  emergencyContactName: string; emergencyContactPhone: string;
  joiningDate: string; joiningDateValue: string; lastLogin: string; title: string;
  jobTitle: string; jobCode: string; employmentType: string; internshipDurationMonths: string;
  internshipEndDate: string; internshipIsUnpaid: boolean; workMode: string;
  workModeLabel: string; employmentTypeLabel: string; workLocation: string;
  workLocationLabel: string; managerName: string; managerUserId: string;
  noticePeriodDays: number; probationDays: number; bankName: string;
  accountHolderName: string; accountNumber: string; ifscCode: string;
  nationalIdType: string; nationalIdNumber: string; taxId: string; providentFundNumber: string;
  salaryPackage: { amount: number; grossAnnual: number; currency: string; payFrequency: string };
  salaryLabel: string; salaryMonthlyLabel: string;
  permissions: { modules: string[]; features: string[] };
  documents: Array<{ name: string; type: string; uploadedAt: string }>;
  notes: string;
  userId?: string; linkedWorkspaceMemberId?: string; source?: string; employeeId?: string; _id?: string;
  transferState?: string; transferredAt?: string; transferredToWorkspaceId?: string;
  transferredToWorkspaceName?: string; transferredToWorkspaceLocation?: string;
  transferredFromWorkspaceId?: string; transferredFromWorkspaceName?: string;
  transferredFromWorkspaceLocation?: string; transferNote?: string;
  nextRole?: string; nextDepartments?: string[];
}

interface AccessFormState { role: string; departments: string[]; selectedModules: string[]; }

interface JobTitleOption {
  jobCode: string; title: string; department: string; employmentType: string;
  remainingVacancies: number; internshipDurationMonths?: number; isPaid?: boolean;
  designation?: string; label?: string;
}

interface BankBranchOption { bankName: string; branchName: string; ifscCode: string; }

interface BulkImportSummary {
  processedRows: number; createdCount: number; skippedCount: number;
  fileName: string; issues: string[];
}

interface EmployeeSummaryCard {
  label: string; value: number; icon: React.ComponentType<{ size?: number }>; toneClass: string; accentClass: string;
}

interface RequiredField { field: string; notes: string; }

interface EmployeeAddPrefillData {
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  jobCode?: string;
  jobTitle?: string;
  designation?: string;
  joinDate?: string;
  joiningDate?: string;
  department?: string;
  departments?: string[];
}

interface EmployeeManagementRouteState {
  openAddModal?: boolean;
  prefillData?: EmployeeAddPrefillData;
}

/* ───────────────────────────── Constants ───────────────────────────── */

const ROLE_VALUE_TO_LABEL: Record<string, string> = {
  owner: "Founder", super_admin: "Super Admin", admin: "Admin",
  manager: "Manager", employee: "Employee",
};

const ROLE_LABEL_TO_VALUE: Record<string, string> = {
  Founder: "owner", "Super Admin": "super_admin", Admin: "admin",
  Manager: "manager", Employee: "employee",
};

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: "Active", inactive: "Inactive", pending: "Pending",
  invite_sent: "Invite Sent", registered: "Registered",
  terminated: "Terminated", probation: "Probation",
};

const EMPLOYEE_STATUS_OPTIONS = [
  { key: "active", label: "Active", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "inactive", label: "Inactive", color: "text-slate-600 bg-slate-50 border-slate-200" },
  { key: "pending", label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "invite_sent", label: "Invite Sent", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { key: "registered", label: "Registered", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "probation", label: "Probation", color: "text-purple-600 bg-purple-50 border-purple-200" },
  { key: "terminated", label: "Terminated", color: "text-rose-600 bg-rose-50 border-rose-200" },
];

const DEFAULT_DEPARTMENT_OPTIONS = [
  "HR",
  "Sales",
  "Finance",
  "Administration",
  "Maintenance",
  "Tech",
  "IT",
];
const ALLOWED_DEPARTMENT_OPTIONS = new Set(DEFAULT_DEPARTMENT_OPTIONS.map((department) => department.toLowerCase()));

const WORK_MODE_OPTIONS = ["remote", "office", "hybrid"];
const EMPLOYMENT_TYPE_OPTIONS = [
  "full-time", "part-time", "contract", "intern", "trainee", "consultant",
];
const NATIONAL_ID_TYPES = [
  "Aadhaar", "PAN Card", "Passport", "Voter ID", "Driving License", "Other",
];
const BANK_NAME_CUSTOM_OPTION = "__custom__";
const INTERNSHIP_EMPLOYMENT_TYPES = new Set(["intern", "trainee"]);

function isInternshipEmploymentType(type: string): boolean {
  return INTERNSHIP_EMPLOYMENT_TYPES.has(String(type || "").toLowerCase());
}

function getStatusInfo(key: string) {
  return EMPLOYEE_STATUS_OPTIONS.find((s) => s.key === (key || "").toLowerCase())
    || { key: "pending", label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-200" };
}

/* ───────────────────────── Helper Functions ───────────────────────── */

function filterValidDepartments(departments: string[] = []): string[] {
  const seen = new Set<string>();
  return departments
    .filter(Boolean)
    .map((d) => String(d).trim())
    .map((d) => DEFAULT_DEPARTMENT_OPTIONS.find((option) => option.toLowerCase() === d.toLowerCase()) || "")
    .filter((d) => Boolean(d) && ALLOWED_DEPARTMENT_OPTIONS.has(d.toLowerCase()))
    .filter((d) => {
      const key = d.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getNormalizedRoleKey(role: string = ""): string {
  return String(normalizeUserRole(role) || role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isWorkspaceLeaderRole(role: string = ""): boolean {
  const key = getNormalizedRoleKey(role);
  return key === "founder" || key === "owner" || key === "super_admin";
}

function formatDepartmentDisplay(role: string = "", departments: string[] = [], fallback = "-"): string {
  const cleanDepartments = filterValidDepartments(departments);
  if (isWorkspaceLeaderRole(role)) return "All Departments";
  if (cleanDepartments.length > 0) return cleanDepartments.join(", ");
  return fallback;
}

type DepartmentSelectionMode = "all" | "multiple" | "single";

function getDepartmentSelectionMode(role: string = ""): DepartmentSelectionMode {
  const key = getNormalizedRoleKey(role);
  if (key === "owner" || key === "founder" || key === "super_admin") return "all";
  if (key === "admin") return "multiple";
  return "single";
}

function normalizeDepartmentSelection(role: string = "", departments: string[] = []): string[] {
  const cleanDepartments = filterValidDepartments(departments);
  if (!String(role || "").trim()) return [];
  const mode = getDepartmentSelectionMode(role);
  if (mode === "all") return cleanDepartments;
  if (mode === "multiple") return cleanDepartments;
  return cleanDepartments.slice(0, 1);
}

function isValidIfscCode(value: string = ""): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value || "").trim().toUpperCase());
}

const DEFAULT_PROBATION_OPTIONS = [
  { label: "No Probation", value: "none" },
  { label: "30 Days", value: "30" },
  { label: "45 Days", value: "45" },
  { label: "60 Days", value: "60" },
  { label: "90 Days", value: "90" },
  { label: "6 Months", value: "180" },
];

function calculateInternshipEndDate(joiningDate: string = "", durationMonths: string = "6"): string {
  if (!joiningDate) return "";
  const start = new Date(joiningDate);
  if (Number.isNaN(start.getTime())) return "";
  const months = Number(durationMonths) || 6;
  start.setMonth(start.getMonth() + months);
  return start.toISOString().split("T")[0];
}

function formatDateForInput(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  }
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mergeBankNameOptions(options: string[] = []): string[] {
  const defaults = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Yes Bank", "Bank of Baroda", "Punjab National Bank", "Canara Bank", "Union Bank of India"];
  const combined = new Set([...defaults, ...options.filter(Boolean)]);
  return Array.from(combined);
}

function mergeBankBranchOptions(options: (string | Record<string, string>)[] = []): BankBranchOption[] {
  const baseBranches: BankBranchOption[] = [];
  const seenIfsc = new Set<string>();
  [...(options || [])].forEach((entry) => {
    if (typeof entry === "string") {
      const ifsc = entry.trim();
      if (ifsc && !seenIfsc.has(ifsc)) { seenIfsc.add(ifsc); baseBranches.push({ bankName: "", branchName: "", ifscCode: ifsc }); }
    } else if (entry && typeof entry === "object") {
      const ifsc = String(entry.ifscCode || "").trim();
      if (ifsc && !seenIfsc.has(ifsc)) { seenIfsc.add(ifsc); baseBranches.push({ bankName: String(entry.bankName || ""), branchName: String(entry.branchName || ""), ifscCode: ifsc }); }
    }
  });
  return baseBranches;
}

async function fetchIfscBranchDetails(ifscCode: string = ""): Promise<BankBranchOption | null> {
  try {
    const code = ifscCode.trim().toUpperCase();
    if (!code || code.length < 8) return null;
    const response = await fetch(`https://ifsc.razorpay.com/${code}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !data.BRANCH) return null;
    return { bankName: String(data.BANK || ""), branchName: String(data.BRANCH || ""), ifscCode: code };
  } catch { return null; }
}

function findBankBranchByIfsc(branches: BankBranchOption[], bankName: string = "", ifscCode: string = ""): BankBranchOption | undefined {
  const code = ifscCode.trim().toUpperCase();
  return branches.find((b) => b.ifscCode === code && (!bankName || b.bankName === bankName));
}

function normalizeBankNameOption(value: string): string {
  return String(value || "").replace(" (NEFT/IFSC enabled)", "").trim();
}

function createEmployeeFormState(): EmployeeFormState {
  return {
    fullName: "", dateOfBirth: "", email: "", phone: "",
    currentAddress: "", country: "", state: "", city: "", emergencyContactName: "", emergencyContactPhone: "",
    jobTitle: "", jobCode: "", departments: [], role: "",
    managerUserId: "", workLocation: "", workMode: "hybrid", employmentType: "full-time",
    internshipIsUnpaid: false, internshipDurationMonths: "6", internshipEndDate: "",
    noticePeriodDays: "30", probationDays: "none", joiningDate: "", salaryAmount: "",
    bankNameSelection: "", bankNameCustom: "", bankName: "",
    accountHolderName: "", accountNumber: "", ifscCode: "",
    nationalIdType: "", nationalIdNumber: "", taxId: "", providentFundNumber: "",
    identityProof: null, addressProof: null, bankProof: null, otherDocuments: [],
  };
}

function normalizeEmployeeStatusKey(value: string = ""): string {
  const v = String(value || "").toLowerCase().replace(/\s+/g, "_");
  if (v in EMPLOYEE_STATUS_LABELS) return v;
  if (v === "joined" || v === "onboarded") return "active";
  if (v === "left" || v === "resigned" || v === "fired") return "terminated";
  if (v === "disabled") return "inactive";
  return "pending";
}

function mapRoleLabelToValue(role: string): string {
  return ROLE_LABEL_TO_VALUE[role] || String(role || "").toLowerCase().replace(/\s+/g, "_");
}

function mapEmployeeToUi(employee: Record<string, unknown> = {}): Employee {
  const rawRole = String(employee.workspaceRole || employee.role || "employee");
  const roleKey = normalizeUserRole(rawRole);
  const role = ROLE_VALUE_TO_LABEL[roleKey] || roleKey;
  const departmentsRaw = employee.departmentNames || employee.departments || employee.department || [];
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw.filter(Boolean).map(String) : [String(departmentsRaw)];
  const departmentDisplay = formatDepartmentDisplay(role, departments, role === "Admin" ? "Assigned Departments" : "-");
  const statusKey = normalizeEmployeeStatusKey(String(employee.status || ""));
  const salary = (employee.salaryPackage as Record<string, unknown>) || {};
  const salaryAmount = Number(salary.amount || salary.grossAnnual || 0);
  const name = String(employee.fullName || employee.name || employee.full_name || "");
  const dateOfBirthVal = formatDateForInput(employee.dateOfBirth || employee.dob || "");
  const joiningDateVal = formatDateForInput(employee.joiningDate || employee.joinDate || "");
  return {
    id: String(employee._id || employee.id || employee.employeeId || ""),
    employeeNumber: String(employee.employeeId || employee.employeeCode || employee.employeeNumber || ""),
    name, fullName: name,
    email: String(employee.email || ""),
    phone: String(employee.phone || employee.mobile || ""),
    department: departmentDisplay,
    departments, role, rawRole,
    status: getStatusInfo(statusKey).label,
    statusKey,
    dateOfBirth: dateOfBirthVal, dateOfBirthValue: dateOfBirthVal,
    currentAddress: String(employee.currentAddress || employee.address || ""),
    country: String(employee.country || ""),
    state: String(employee.state || ""),
    city: String(employee.city || ""),
    emergencyContactName: String(employee.emergencyContactName || ""),
    emergencyContactPhone: String(employee.emergencyContactPhone || ""),
    joiningDate: joiningDateVal, joiningDateValue: joiningDateVal,
    lastLogin: String(employee.lastLogin || employee.last_login || "-"),
    title: String(employee.jobTitle || employee.title || ""),
    jobTitle: String(employee.jobTitle || employee.title || ""),
    jobCode: String(employee.jobCode || ""),
    employmentType: String(employee.employmentType || "full-time"),
    internshipDurationMonths: String(employee.internshipDurationMonths || ""),
    internshipEndDate: String(employee.internshipEndDate || ""),
    internshipIsUnpaid: Boolean(employee.internshipIsUnpaid),
    workMode: String(employee.workMode || "hybrid"),
    workModeLabel: String(employee.workMode || "Hybrid"),
    employmentTypeLabel: String(employee.employmentType || "Full-time"),
    workLocation: String(employee.workLocation || ""),
    workLocationLabel: String(employee.workLocation || ""),
    managerName: String(employee.managerName || ""),
    managerUserId: String(employee.managerUserId || ""),
    noticePeriodDays: Number(employee.noticePeriodDays) || 30,
    probationDays: Number(employee.probationDays) || 0,
    bankName: String(employee.bankName || ""),
    accountHolderName: String(employee.accountHolderName || ""),
    accountNumber: String(employee.accountNumber || ""),
    ifscCode: String(employee.ifscCode || ""),
    nationalIdType: String(employee.nationalIdType || ""),
    nationalIdNumber: String(employee.nationalIdNumber || ""),
    taxId: String(employee.taxId || ""),
    providentFundNumber: String(employee.providentFundNumber || ""),
    salaryPackage: { amount: salaryAmount, grossAnnual: salaryAmount, currency: "INR", payFrequency: "annual" },
    salaryLabel: salaryAmount ? `₹${(salaryAmount / 100000).toFixed(1)}L` : "-",
    salaryMonthlyLabel: salaryAmount ? `₹${Math.round(salaryAmount / 12).toLocaleString("en-IN")}/mo` : "-",
    permissions: (employee.permissions as { modules: string[]; features: string[] }) || { modules: [], features: [] },
    documents: (employee.documents as Array<{ name: string; type: string; uploadedAt: string }>) || [],
    notes: String(employee.notes || ""),
    userId: String(employee.userId || employee._id || ""),
    linkedWorkspaceMemberId: String(employee.linkedWorkspaceMemberId || employee.workspaceMemberId || ""),
    source: String(employee.source || ""),
    employeeId: String(employee.employeeId || employee.employeeCode || employee.employeeNumber || employee._id || ""),
    _id: String(employee._id || ""),
    transferState: String(employee.transferState || ""),
    transferredAt: String(employee.transferredAt || ""),
    transferredToWorkspaceId: String(employee.transferredToWorkspaceId || ""),
    transferredToWorkspaceName: String(employee.transferredToWorkspaceName || ""),
    transferredToWorkspaceLocation: String(employee.transferredToWorkspaceLocation || ""),
    transferredFromWorkspaceId: String(employee.transferredFromWorkspaceId || ""),
    transferredFromWorkspaceName: String(employee.transferredFromWorkspaceName || ""),
    transferredFromWorkspaceLocation: String(employee.transferredFromWorkspaceLocation || ""),
    transferNote: String(employee.transferNote || ""),
    nextRole: String(employee.nextRole || ""),
    nextDepartments: Array.isArray(employee.nextDepartments) ? employee.nextDepartments.map(String) : [],
  };
}

function getRoleCoreSectionsForEmployeeAccess(role: string = "", departments: string[] = []): Array<{ key: string; title: string; modules: Array<{ key: string; toggleId: string; label: string }> }> {
  const allModuleKeys = getAllDepartmentModules();
  const matchedDepts = departments.length > 0 ? departments : ["General"];

  if (role === "Founder" || role === "Super Admin") {
    return [
      {
        key: "all-access", title: "Full Workspace Access",
        modules: allModuleKeys
          .filter((m: { id: string; label: string }) => m && m.id)
          .map((m: { id: string; label: string }) => ({ key: m.id, toggleId: `core_${m.id}`, label: m.label || m.id })),
      },
    ];
  }

  const roleModules = getRoleModules(role);
  const roleModuleKeys = new Set(
    (Array.isArray(roleModules) ? roleModules : [])
      .map((m: string | Record<string, unknown>) => (typeof m === "string" ? m : (m as Record<string, string>)?.id || ""))
      .filter(Boolean),
  );

  const grouped: Record<string, { key: string; title: string; modules: Array<{ key: string; toggleId: string; label: string }> }> = {};

  allModuleKeys.forEach((mod: { id: string; label: string }) => {
    if (!mod || !mod.id) return;
    const dept = matchedDepts.find((d) => String(mod.id).toLowerCase().includes(d.toLowerCase())) || "General";
    if (!grouped[dept]) {
      const deptName = dept.charAt(0).toUpperCase() + dept.slice(1);
      grouped[dept] = { key: dept, title: `${deptName} Modules`, modules: [] };
    }
    grouped[dept].modules.push({
      key: mod.id,
      toggleId: `core_${mod.id}`,
      label: mod.label || mod.id,
    });
  });

  return Object.values(grouped).filter((s) => s.modules.length > 0);
}

function buildEmployeeReportRows(employee: Record<string, unknown>): Array<{ label: string; value: string }> {
  const rawRole = String(employee.workspaceRole || employee.role || "");
  const departmentsRaw = employee.departments || employee.departmentNames || [];
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw.filter(Boolean).map(String) : [String(departmentsRaw)];
  const roleKey = normalizeUserRole(rawRole);
  const roleLabel = ROLE_VALUE_TO_LABEL[roleKey] || roleKey;
  return [
    { label: "Employee ID", value: String(employee.employeeId || employee.employeeNumber || "-") },
    { label: "Full Name", value: String((employee.fullName || employee.name || "") as string) },
    { label: "Email", value: String(employee.email || "-") },
    { label: "Phone", value: String(employee.phone || "-") },
    { label: "Emergency Contact Name", value: String(employee.emergencyContactName || "-") },
    { label: "Emergency Contact Phone", value: String(employee.emergencyContactPhone || "-") },
    { label: "Department", value: formatDepartmentDisplay(roleLabel, departments, roleLabel === "Admin" ? "Assigned Departments" : "-") },
    { label: "Role", value: String(employee.role || employee.workspaceRole || "-") },
    { label: "Job Code", value: String(employee.jobCode || "-") },
    { label: "Job Title", value: String(employee.jobTitle || employee.title || "-") },
    { label: "Employment Type", value: String(employee.employmentType || "-") },
    { label: "Work Mode", value: String(employee.workMode || "-") },
    { label: "Work Location", value: String(employee.workLocation || "-") },
    { label: "Joining Date", value: String(employee.joiningDate || "-") },
    { label: "Date of Birth", value: String(employee.dateOfBirth || employee.dob || "-") },
    { label: "Current Address", value: String(employee.currentAddress || employee.address || "-") },
    { label: "Country", value: String(employee.country || "-") },
    { label: "State", value: String(employee.state || "-") },
    { label: "City", value: String(employee.city || "-") },
    { label: "Manager", value: String(employee.managerName || "-") },
    { label: "Salary Package", value: String(employee.salaryLabel || "-") },
    { label: "Bank Name", value: String(employee.bankName || "-") },
    { label: "Account Holder Name", value: String(employee.accountHolderName || "-") },
    { label: "Account Number", value: String(employee.accountNumber || "-") },
    { label: "IFSC Code", value: String(employee.ifscCode || "-") },
    { label: "National ID Type", value: String(employee.nationalIdType || "-") },
    { label: "National ID Number", value: String(employee.nationalIdNumber || employee.taxId || "-") },
    { label: "Tax ID (PAN)", value: String(employee.taxId || "-") },
    { label: "Provident Fund / UAN", value: String(employee.providentFundNumber || "-") },
    { label: "Status", value: String(employee.status || "-") },
    { label: "Last Login", value: String(employee.lastLogin || "-") },
  ];
}

/* ──────────────────── Inline Form Section Component ──────────────────── */

function FormSection({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 border-b border-slate-200/80 pb-2 pt-1 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
            <Icon size={16} />
          </div>
          <span className="text-[12px] font-black text-slate-800 uppercase tracking-[0.16em]">{title}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </section>
  );
}

function DepartmentCheckboxDropdown({
  departments,
  selectedDepartments,
  onToggle,
  error,
  note,
}: {
  departments: string[];
  selectedDepartments: string[];
  onToggle: (department: string, isChecked: boolean) => void;
  error?: string;
  note: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedDepartments.length;
  const buttonLabel = selectedCount > 0
    ? `${selectedCount} department${selectedCount === 1 ? "" : "s"} selected`
    : "Select Departments";

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-3 py-2 flex items-center justify-between gap-3 rounded-lg border bg-white text-left text-[12px] font-semibold outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${
          error ? "border-red-300 bg-red-50 text-red-600" : "border-slate-200/60 text-[#0F172A]"
        }`}
      >
        <span>{buttonLabel}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl border bg-white p-3 max-h-44 overflow-y-auto ${error ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
          {departments.map((department) => {
            const checked = selectedDepartments.includes(department);
            return (
              <label key={department} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onToggle(department, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span>{department}</span>
              </label>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-medium text-slate-400">{note}</p>
        {error && <span className="text-[10px] font-medium text-red-500">{error}</span>}
      </div>
    </div>
  );
}

/* ──────────────────── Main Component ──────────────────── */

export default function HREmployeeManagementPage(): React.ReactElement {
  const isMountedRef = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transferredEmployees, setTransferredEmployees] = useState<Employee[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(DEFAULT_DEPARTMENT_OPTIONS);
  const [bankNameOptions, setBankNameOptions] = useState<string[]>(() => mergeBankNameOptions());
  const [bankBranchOptions, setBankBranchOptions] = useState<BankBranchOption[]>(() => mergeBankBranchOptions());
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [recruitmentJobOpenings, setRecruitmentJobOpenings] = useState<JobTitleOption[]>([]);

  const currentRoleKey = normalizeUserRole(
    (currentUser?.workspaceMembership as Record<string, unknown>)?.role as string || (currentUser?.role as string),
  );

  const canOpenEmployeeAccessPanelByRole = useMemo(
    () => new Set(["owner", "super_admin", "admin", "hr_manager", "hr", "manager"]).has(currentRoleKey),
    [currentRoleKey],
  );

  const grantedModuleKeys = useMemo(
    () => new Set(
      ((currentUser?.workspaceMembership as Record<string, unknown>)?.grantedModules as string[] || [])
        .map((moduleKey: string) => normalizeUserRole(String(moduleKey || "").replace(/^disabled:/, "")))
        .filter(Boolean),
    ),
    [currentUser],
  );

  const hasEmployeeManagementModuleAccess = useMemo(
    () =>
      grantedModuleKeys.has("employee-management") ||
      canAccessEmployeeModule(currentUser, "employee-management", { section: "core" }),
    [currentUser, grantedModuleKeys],
  );

  const [inviteForm, setInviteForm] = useState<EmployeeFormState>(() => createEmployeeFormState());
  const [editForm, setEditForm] = useState<EmployeeFormState>(() => createEmployeeFormState());
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  /* ───────────────────── Inline Add Employee Form State ───────────────────── */
  const [addForm, setAddForm] = useState<EmployeeFormState>(() => createEmployeeFormState());
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [addFormSubmitting, setAddFormSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const setShowAddFormWithUrl = (show: boolean) => {
    setShowAddForm(show);
    const p = window.location.pathname;
    window.history.replaceState(null, "", show ? `${p}?mode=add` : p);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const syncCurrentUser = () => setCurrentUser(getStoredUser());
    window.addEventListener("auth:updated", syncCurrentUser);
    window.addEventListener("auth:cleared", syncCurrentUser);
    return () => {
      window.removeEventListener("auth:updated", syncCurrentUser);
      window.removeEventListener("auth:cleared", syncCurrentUser);
    };
  }, []);

  const loadEmployees = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await getEmployeeManagementOverview();
      if (!isMountedRef.current) return;
      const overview = (response?.data as Record<string, unknown>) || {};
      const nextEmployees = ((overview.employees as Record<string, unknown>[]) || [])
        .filter((e) => e?.source !== "tenant-company")
        .map(mapEmployeeToUi);
      const nextTransferred = ((overview.transferredEmployees as Record<string, unknown>[]) || [])
        .filter((e) => e?.source !== "tenant-company")
        .map(mapEmployeeToUi);
      setEmployees(nextEmployees);
      setTransferredEmployees(nextTransferred);
      if (Array.isArray(overview.departments) && overview.departments.length > 0) {
        const nextDepts = (overview.departments as Array<{ name?: string } | string>)
          .map((d) => (typeof d === "string" ? d : d?.name || ""))
          .filter(Boolean);
        setAvailableDepartments(filterValidDepartments([...DEFAULT_DEPARTMENT_OPTIONS, ...nextDepts]));
      }
      setBankNameOptions(mergeBankNameOptions((overview.bankNameOptions as string[]) || []));
      setBankBranchOptions(mergeBankBranchOptions((overview.bankBranchOptions as BankBranchOption[]) || []));
      if (!silent) setErrorMessage("");
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      if (!silent) {
        setEmployees([]);
        setTransferredEmployees([]);
        setErrorMessage((error as Error)?.message || "Failed to load employee records.");
      }
    } finally {
      if (!silent && isMountedRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    setEmployees([]);
    setTransferredEmployees([]);
    setErrorMessage("");
    const userId = currentUser?.id || currentUser?._id;
    if (userId) loadEmployees();
  }, [currentUser?.id, currentUser?._id, (currentUser as Record<string, unknown>)?.activeWorkspaceId, (currentUser as Record<string, unknown>)?.workspace?.id]);

  useEffect(() => {
    let isActive = true;
    const loadDepartmentOptions = async () => {
      try {
        const response = await axiosPrivate.get("/api/organization/departments");
        if (!isActive) return;
        const nextDepartments = ((response?.data?.data as Array<{ name?: string } | string>) || [])
          .map((department) => (typeof department === "string" ? department : department?.name || ""))
          .filter(Boolean);
        if (nextDepartments.length > 0) {
          setAvailableDepartments(filterValidDepartments([...DEFAULT_DEPARTMENT_OPTIONS, ...nextDepartments]));
        }
      } catch {
        // Keep the default list if the organization endpoint is unavailable.
      }
    };

    loadDepartmentOptions();
    return () => {
      isActive = false;
    };
  }, [currentUser?.id, currentUser?._id, (currentUser as Record<string, unknown>)?.activeWorkspaceId, (currentUser as Record<string, unknown>)?.workspace?.id]);

  useEffect(() => {
    let isActive = true;
    const loadCountries = async () => {
      try {
        const countries = await getCountries();
        if (isActive) setCountryOptions(countries);
      } catch {
        if (isActive) setCountryOptions([]);
      }
    };

    void loadCountries();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadStates = async () => {
      if (!addForm.country && !inviteForm.country && !editForm.country) {
        setStateOptions([]);
        return;
      }
      try {
        const nextCountry = addForm.country || inviteForm.country || editForm.country;
        const states = await getStates(nextCountry);
        if (isActive) setStateOptions(states);
      } catch {
        if (isActive) setStateOptions([]);
      }
    };

    void loadStates();
    return () => {
      isActive = false;
    };
  }, [addForm.country, inviteForm.country, editForm.country]);

  useEffect(() => {
    let isActive = true;
    const loadCities = async () => {
      const nextCountry = addForm.country || inviteForm.country || editForm.country;
      const nextState = addForm.state || inviteForm.state || editForm.state;
      if (!nextCountry || !nextState) {
        setCityOptions([]);
        return;
      }
      try {
        const cities = await getCities(nextCountry, nextState);
        if (isActive) setCityOptions(cities);
      } catch {
        if (isActive) setCityOptions([]);
      }
    };

    void loadCities();
    return () => {
      isActive = false;
    };
  }, [addForm.country, addForm.state, inviteForm.country, inviteForm.state, editForm.country, editForm.state]);

  useEffect(() => {
    let isActive = true;
    const loadRecruitmentOpenings = async () => {
      try {
        const response = await getRecruitmentOverview();
        const overview = (response || {}) as Record<string, unknown>;
        const openings = Array.isArray(overview.jobOpenings) ? overview.jobOpenings : [];
        const mapped = openings.map((opening: Record<string, unknown>) => ({
          jobCode: String(opening.jobCode || ""),
          title: String(opening.title || opening.position || ""),
          designation: String(opening.designation || opening.title || opening.position || ""),
          department: String(opening.department || ""),
          employmentType: String(opening.employmentType || opening.employmentTypeLabel || "full-time"),
          remainingVacancies: Number(opening.remainingVacancies || opening.vacancies || 0),
          internshipDurationMonths: opening.internshipDurationMonths ? Number(opening.internshipDurationMonths) : undefined,
          isPaid: opening.isPaid !== false,
        })).filter((opening) => Boolean(opening.jobCode || opening.title));

        if (isActive) {
          setRecruitmentJobOpenings(mapped);
        }
      } catch {
        if (isActive) setRecruitmentJobOpenings([]);
      }
    };

    void loadRecruitmentOpenings();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const routeState = (location.state || {}) as EmployeeManagementRouteState;
    const prefill = routeState.prefillData;

    if (!routeState.openAddModal && !prefill) {
      return;
    }

    if (prefill) {
      const nextDepartments = Array.isArray(prefill.departments)
        ? prefill.departments.map((department) => String(department || "")).filter(Boolean)
        : String(prefill.department || "").trim()
          ? [String(prefill.department || "").trim()]
          : [];

      setAddForm((prev) => ({
        ...prev,
        fullName: String(prefill.fullName || prefill.name || prev.fullName || ""),
        email: String(prefill.email || prev.email || ""),
        phone: String(prefill.phone || prev.phone || ""),
        role: String(prefill.role || prev.role || "Employee"),
        jobCode: String(prefill.jobCode || prev.jobCode || ""),
        jobTitle: String(prefill.jobTitle || prefill.designation || prev.jobTitle || ""),
        joiningDate: String(prefill.joiningDate || prefill.joinDate || prev.joiningDate || ""),
        departments: nextDepartments.length > 0 ? filterValidDepartments(nextDepartments) : prev.departments,
      }));
    }

    if (routeState.openAddModal) {
      setIsAddModalOpen(true);
    }

    void navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    const departments = filterValidDepartments(availableDepartments);
    if (departments.length === 0) return;

    setAddForm((prev) => (
      isWorkspaceLeaderRole(prev.role)
        ? { ...prev, departments }
        : prev
    ));
    setEditForm((prev) => (
      isWorkspaceLeaderRole(prev.role)
        ? { ...prev, departments }
        : prev
    ));
  }, [availableDepartments]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => loadEmployees({ silent: true }), 15000);
    const handleFocus = () => loadEmployees({ silent: true });
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("all");

  const roleFilterOptions = useMemo(() => Object.keys(ROLE_LABEL_TO_VALUE), []);
  const statusFilterOptions = useMemo(
    () => EMPLOYEE_STATUS_OPTIONS,
    [],
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [managingAccessFor, setManagingAccessFor] = useState<Employee | null>(null);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [viewTab, setViewTab] = useState<"personal" | "employment" | "documents">("personal");
  const bulkSpreadsheetInputRef = useRef<HTMLInputElement | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkSpreadsheetName, setBulkSpreadsheetName] = useState("");
  const [bulkSpreadsheetRows, setBulkSpreadsheetRows] = useState<Record<string, unknown>[]>([]);
  const [bulkImportSummary, setBulkImportSummary] = useState<BulkImportSummary | null>(null);
  const [bulkImportError, setBulkImportError] = useState("");
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  const resetAddForm = () => {
    setAddForm(createEmployeeFormState());
    setAddFormErrors({});
  };

  const buildEmployeeFormErrors = (form: EmployeeFormState, selectedDepartments: string[] = []): Record<string, string> => {
    const errors: Record<string, string> = {};
    const normalizedPhone = String(form.phone || "").replace(/[^\d+]/g, "");
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email format";
    if (!form.phone.trim()) errors.phone = "Phone is required";
    else if (normalizedPhone.length < 10) errors.phone = "Enter a valid phone number";
    if (!form.role.trim()) errors.role = "Role is required";
    if (!form.joiningDate.trim()) errors.joiningDate = "Joining date is required";
    if (form.role.trim()) {
      const deptMode = getDepartmentSelectionMode(form.role);
      const cleanDepartments = filterValidDepartments(selectedDepartments);
      if (deptMode === "all" && allDepartments.length === 0) errors.departments = "No departments available";
      if (deptMode === "multiple" && cleanDepartments.length === 0) errors.departments = "Select at least one department";
      if (deptMode === "single" && cleanDepartments.length === 0) errors.departments = "Select a department";
    }
    if (!form.country.trim()) errors.country = "Country is required";
    if (!form.state.trim()) errors.state = "State is required";
    if (!form.city.trim()) errors.city = "City is required";
    if (form.ifscCode.trim() && !isValidIfscCode(form.ifscCode)) errors.ifscCode = "Invalid IFSC code";
    return errors;
  };

  const validateAddForm = (): boolean => {
    const errors = buildEmployeeFormErrors(addForm, addForm.departments);
    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitAddForm = async (sendInvite: boolean) => {
    if (!validateAddForm()) { toast.error("Please fix the form errors"); return; }
    setAddFormSubmitting(true);
    try {
      const documents = await uploadSelectedEmployeeDocuments(addForm);
      const payload = buildEmployeeRecordPayload(
        addForm,
        addForm.departments,
        { status: sendInvite ? "invite_sent" : "pending", sendInvite, documents },
      );
      const response = await createEmployeeRecord(payload);
      if (response?.data?.success) {
        toast.success(sendInvite ? "Employee created & invite sent" : "Employee created");
        resetAddForm();
        setShowAddForm(false);
        setIsAddModalOpen(false);
        loadEmployees({ silent: true });
      } else {
        toast.error(response?.data?.message || "Failed to create employee");
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to create employee");
    } finally {
      setAddFormSubmitting(false);
    }
  };

  const handleAddFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAddForm(true);
  };

  const handleExportPDF = async () => {
    try {
      const reportRows = visibleEmployees.map((emp) => ({
        label: emp.name || emp.email,
        value: `ID: ${emp.employeeId || emp.employeeNumber} | Email: ${emp.email} | Dept: ${emp.department} | Role: ${emp.role} | Status: ${emp.status}`,
      }));
      const response = await createReport({
        title: "Employee Management Report",
        department: "HR",
        category: "HR",
        dataWindow: "All",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: new Date().toISOString().slice(0, 7),
        generatedBy: (currentUser?.name as string) || "Admin",
        format: "PDF",
        description: `Employee report — ${visibleEmployees.length} employees`,
        sourceType: "custom",
        sourceRef: "hr-employee-management",
        reportRows,
      });
      if (response?.data?.download) await downloadReportFile(response.data.download, { openInNewTab: true });
      window.dispatchEvent(new Event("reports:refresh"));
      toast.success("PDF report saved.");
    } catch { toast.error("Failed to export PDF."); }
  };

  const handleExportExcel = async () => {
    try {
      const reportRows = visibleEmployees.map((emp) => ({
        label: emp.name || emp.email,
        value: `ID: ${emp.employeeId || emp.employeeNumber} | Email: ${emp.email} | Dept: ${emp.department} | Role: ${emp.role} | Status: ${emp.status}`,
      }));
      const response = await createReport({
        title: "Employee Management Report",
        department: "HR",
        category: "HR",
        dataWindow: "All",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: new Date().toISOString().slice(0, 7),
        generatedBy: (currentUser?.name as string) || "Admin",
        format: "Excel",
        description: `Employee report — ${visibleEmployees.length} employees`,
        sourceType: "custom",
        sourceRef: "hr-employee-management",
        reportRows,
      });
      await downloadReportFile(response?.data?.download, `${new Date().toISOString().slice(0, 10)}_Employees.xlsx`);
      window.dispatchEvent(new Event("reports:refresh"));
      toast.success("Excel report saved.");
    } catch { toast.error("Failed to export Excel."); }
  };

  /* ───────────────────── Add Form Field Handlers ───────────────────── */

  const handleAddFieldChange = (field: keyof EmployeeFormState, value: unknown) => {
    setAddForm((prev) => {
      if (field === "country") {
        return { ...prev, country: String(value || ""), state: "", city: "" };
      }
      if (field === "state") {
        return { ...prev, state: String(value || ""), city: "" };
      }
      return { ...prev, [field]: value };
    });
    if (addFormErrors[field]) setAddFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleAddRoleChange = (newRole: string) => {
    setAddForm((prev) => ({
      ...prev,
      role: newRole,
      departments: normalizeDepartmentSelection(newRole, prev.departments),
      workMode: newRole && (newRole === "Super Admin" || newRole === "Founder") ? "hybrid" : prev.workMode,
    }));
  };

  const handleAddDepartmentToggle = (department: string, isChecked: boolean) => {
    setAddForm((prev) => {
      const mode = getDepartmentSelectionMode(prev.role);
      if (mode === "all") {
        return { ...prev, departments: filterValidDepartments(allDepartments) };
      }
      if (mode === "multiple") {
        return {
          ...prev,
          departments: isChecked
            ? Array.from(new Set([...prev.departments, department]))
            : prev.departments.filter((item) => item !== department),
        };
      }
      return { ...prev, departments: filterValidDepartments([department]) };
    });
  };

  const handleAddEmploymentTypeChange = (employmentType: string) => {
    const internshipMode = isInternshipEmploymentType(employmentType);
    setAddForm((prev) => ({
      ...prev,
      employmentType,
      internshipIsUnpaid: internshipMode ? prev.internshipIsUnpaid : false,
      salaryAmount: internshipMode && prev.internshipIsUnpaid ? "" : prev.salaryAmount,
      bankNameSelection: internshipMode && prev.internshipIsUnpaid ? "" : prev.bankNameSelection,
      bankNameCustom: internshipMode && prev.internshipIsUnpaid ? "" : prev.bankNameCustom,
      bankName: internshipMode && prev.internshipIsUnpaid ? "" : prev.bankName,
      accountHolderName: internshipMode && prev.internshipIsUnpaid ? "" : prev.accountHolderName,
      accountNumber: internshipMode && prev.internshipIsUnpaid ? "" : prev.accountNumber,
      ifscCode: internshipMode && prev.internshipIsUnpaid ? "" : prev.ifscCode,
    }));
  };

  const handleAddInternshipPaidToggle = (isUnpaid: boolean) => {
    setAddForm((prev) => ({
      ...prev,
      internshipIsUnpaid: isUnpaid,
      salaryAmount: isUnpaid ? "" : prev.salaryAmount,
      bankNameSelection: isUnpaid ? "" : prev.bankNameSelection,
      bankNameCustom: isUnpaid ? "" : prev.bankNameCustom,
      bankName: isUnpaid ? "" : prev.bankName,
      accountHolderName: isUnpaid ? "" : prev.accountHolderName,
      accountNumber: isUnpaid ? "" : prev.accountNumber,
      ifscCode: isUnpaid ? "" : prev.ifscCode,
    }));
  };

  /* ───────────────────── Shared Helpers ───────────────────── */

  const syncEditDepartmentDefaults = (role: string, previousDepartments: string[] = []) => {
    return normalizeDepartmentSelection(role, previousDepartments.length > 0 ? previousDepartments : allDepartments.slice(0, 1));
  };

  /* ───────────────────── IFSC Auto-lookup (Invite & Edit) ───────────────────── */

  useEffect(() => {
    const ifscCode = normalizeBankNameOption(addForm.ifscCode).toUpperCase();
    const timeoutId = window.setTimeout(async () => {
      if (!ifscCode) { setAddForm((prev) => (prev.workLocation ? { ...prev, workLocation: "" } : prev)); return; }
      const liveBranch = await fetchIfscBranchDetails(ifscCode);
      if (!isMountedRef.current) return;
      setAddForm((prev) => {
        if (normalizeBankNameOption(prev.ifscCode).toUpperCase() !== ifscCode) return prev;
        const cachedBranch = findBankBranchByIfsc(bankBranchOptions, "", ifscCode);
        const nextLocation = liveBranch?.branchName || cachedBranch?.branchName || "";
        return prev.workLocation === nextLocation ? prev : { ...prev, workLocation: nextLocation };
      });
    }, 450);
    return () => window.clearTimeout(timeoutId);
  }, [addForm.ifscCode, bankBranchOptions]);

  useEffect(() => {
    const ifscCode = normalizeBankNameOption(inviteForm.ifscCode).toUpperCase();
    const timeoutId = window.setTimeout(async () => {
      if (!ifscCode) { setInviteForm((prev) => (prev.workLocation ? { ...prev, workLocation: "" } : prev)); return; }
      const liveBranch = await fetchIfscBranchDetails(ifscCode);
      if (!isMountedRef.current) return;
      setInviteForm((prev) => {
        if (normalizeBankNameOption(prev.ifscCode).toUpperCase() !== ifscCode) return prev;
        const cachedBranch = findBankBranchByIfsc(bankBranchOptions, "", ifscCode);
        const nextLocation = liveBranch?.branchName || cachedBranch?.branchName || "";
        return prev.workLocation === nextLocation ? prev : { ...prev, workLocation: nextLocation };
      });
    }, 450);
    return () => window.clearTimeout(timeoutId);
  }, [inviteForm.ifscCode, bankBranchOptions]);

  useEffect(() => {
    const ifscCode = normalizeBankNameOption(editForm.ifscCode).toUpperCase();
    const timeoutId = window.setTimeout(async () => {
      if (!ifscCode) { setEditForm((prev) => (prev.workLocation ? { ...prev, workLocation: "" } : prev)); return; }
      const liveBranch = await fetchIfscBranchDetails(ifscCode);
      if (!isMountedRef.current) return;
      setEditForm((prev) => {
        if (normalizeBankNameOption(prev.ifscCode).toUpperCase() !== ifscCode) return prev;
        const cachedBranch = findBankBranchByIfsc(bankBranchOptions, "", ifscCode);
        const nextLocation = liveBranch?.branchName || cachedBranch?.branchName || "";
        return prev.workLocation === nextLocation ? prev : { ...prev, workLocation: nextLocation };
      });
    }, 450);
    return () => window.clearTimeout(timeoutId);
  }, [editForm.ifscCode, bankBranchOptions]);

  /* ───────────────────── Invite Modal Handlers ───────────────────── */

  const handleInviteRoleChange = (newRole: string) => {
    setInviteForm((prev) => ({
      ...prev,
      role: newRole,
      departments: normalizeDepartmentSelection(newRole, prev.departments),
      workMode: newRole === "Super Admin" || newRole === "Founder" ? "hybrid" : prev.workMode,
    }));
  };

  const handleInviteDepartmentToggle = (department: string, isChecked: boolean) => {
    setInviteForm((prev) => {
      const mode = getDepartmentSelectionMode(prev.role);
      if (mode === "all") {
        return { ...prev, departments: filterValidDepartments(allDepartments) };
      }
      if (mode === "multiple") {
        return {
          ...prev,
          departments: isChecked
            ? Array.from(new Set([...prev.departments, department]))
            : prev.departments.filter((item) => item !== department),
        };
      }
      return { ...prev, departments: filterValidDepartments([department]) };
    });
  };

  const handleInviteEmploymentTypeChange = (employmentType: string) => {
    const internshipMode = isInternshipEmploymentType(employmentType);
    setInviteForm((prev) => ({
      ...prev,
      employmentType,
      internshipIsUnpaid: internshipMode ? prev.internshipIsUnpaid : false,
      salaryAmount: internshipMode && prev.internshipIsUnpaid ? "" : prev.salaryAmount,
      bankNameSelection: internshipMode && prev.internshipIsUnpaid ? "" : prev.bankNameSelection,
      bankNameCustom: internshipMode && prev.internshipIsUnpaid ? "" : prev.bankNameCustom,
      bankName: internshipMode && prev.internshipIsUnpaid ? "" : prev.bankName,
      accountHolderName: internshipMode && prev.internshipIsUnpaid ? "" : prev.accountHolderName,
      accountNumber: internshipMode && prev.internshipIsUnpaid ? "" : prev.accountNumber,
      ifscCode: internshipMode && prev.internshipIsUnpaid ? "" : prev.ifscCode,
    }));
  };

  const handleInviteInternshipPaidToggle = (isUnpaid: boolean) => {
    setInviteForm((prev) => ({
      ...prev,
      internshipIsUnpaid: isUnpaid,
      salaryAmount: isUnpaid ? "" : prev.salaryAmount,
      bankNameSelection: isUnpaid ? "" : prev.bankNameSelection,
      bankNameCustom: isUnpaid ? "" : prev.bankNameCustom,
      bankName: isUnpaid ? "" : prev.bankName,
      accountHolderName: isUnpaid ? "" : prev.accountHolderName,
      accountNumber: isUnpaid ? "" : prev.accountNumber,
      ifscCode: isUnpaid ? "" : prev.ifscCode,
    }));
  };



  /* ───────────────────── Edit Modal Handlers ───────────────────── */

  const handleOpenEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditFormErrors({});
    setEditFormSubmitting(false);
    setEditForm({
      fullName: employee.fullName || employee.name, dateOfBirth: employee.dateOfBirthValue,
      email: employee.email, phone: employee.phone,
      currentAddress: employee.currentAddress,
      country: (employee as Record<string, string>)?.country || "",
      state: (employee as Record<string, string>)?.state || "",
      city: (employee as Record<string, string>)?.city || "",
      emergencyContactName: employee.emergencyContactName,
      emergencyContactPhone: employee.emergencyContactPhone,
      jobTitle: employee.jobTitle, jobCode: employee.jobCode,
      departments: normalizeDepartmentSelection(employee.role, isWorkspaceLeaderRole(employee.role) ? allDepartments : employee.departments),
      role: employee.role || "Employee",
      managerUserId: employee.managerUserId,
      workLocation: employee.workLocation, workMode: employee.workMode,
      employmentType: employee.employmentType || "full-time",
      internshipIsUnpaid: employee.internshipIsUnpaid,
      internshipDurationMonths: employee.internshipDurationMonths || "6",
      internshipEndDate: employee.internshipEndDate,
      noticePeriodDays: String(employee.noticePeriodDays || "30"),
      probationDays: String(employee.probationDays || "none"),
      joiningDate: employee.joiningDateValue,
      salaryAmount: String(employee.salaryPackage?.amount || ""),
      bankNameSelection: employee.bankName || "",
      bankNameCustom: "", bankName: employee.bankName || "",
      accountHolderName: employee.accountHolderName,
      accountNumber: employee.accountNumber,
      ifscCode: employee.ifscCode,
      nationalIdType: employee.nationalIdType, nationalIdNumber: employee.nationalIdNumber,
      taxId: employee.taxId, providentFundNumber: employee.providentFundNumber,
      identityProof: null, addressProof: null, bankProof: null, otherDocuments: [],
    });
    setIsEditModalOpen(true);
  };

  const handleEditRoleChange = (newRole: string) => {
    setEditForm((prev) => ({
      ...prev, role: newRole,
      departments: normalizeDepartmentSelection(newRole, prev.departments),
      workMode: newRole && (newRole === "Super Admin" || newRole === "Founder") ? "hybrid" : prev.workMode,
    }));
  };

  const handleEditDepartmentToggle = (department: string, isChecked: boolean) => {
    setEditForm((prev) => {
      const mode = getDepartmentSelectionMode(prev.role);
      if (mode === "all") {
        return { ...prev, departments: filterValidDepartments(allDepartments) };
      }
      if (mode === "multiple") {
        return {
          ...prev,
          departments: isChecked
            ? Array.from(new Set([...prev.departments, department]))
            : prev.departments.filter((item) => item !== department),
        };
      }
      return { ...prev, departments: filterValidDepartments([department]) };
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    if (editFormSubmitting) return;
    const selectedDepartments = getDepartmentSelectionMode(editForm.role) === "all"
      ? [...allDepartments]
      : editForm.departments;
    const validationErrors = buildEmployeeFormErrors(editForm, selectedDepartments);
    if (Object.keys(validationErrors).length > 0) {
      setEditFormErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError || "Please fix the form errors");
      return;
    }
    setEditFormErrors({});
    setEditFormSubmitting(true);
    try {
      const existingDocuments = Array.isArray(editingEmployee.documents) ? editingEmployee.documents : [];
      const documents = await uploadSelectedEmployeeDocuments(editForm, existingDocuments as Array<Record<string, unknown>>);
      const payload = buildEmployeeRecordPayload(editForm, selectedDepartments, {
        status: editingEmployee.statusKey,
        documents,
      });
      const response = await updateEmployeeRecordRequest(editingEmployee.id, payload);
      if (response?.data?.success) {
        toast.success("Employee updated");
        setIsEditModalOpen(false);
        setEditingEmployee(null);
        loadEmployees({ silent: true });
      } else {
        toast.error(response?.data?.message || "Failed to update employee");
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to update employee");
    } finally {
      setEditFormSubmitting(false);
    }
  };

  /* ───────────────────── Bulk Upload Handlers ───────────────────── */

  const handleBulkUploadClick = () => {
    setIsBulkUploadModalOpen(true);
    setBulkImportSummary(null);
    setBulkImportError("");
    setBulkSpreadsheetName("");
    setBulkSpreadsheetRows([]);
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkSpreadsheetName(file.name);
    setBulkImportSummary(null);
    setBulkImportError("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        setBulkSpreadsheetRows(rows);
      } catch { setBulkImportError("Failed to parse spreadsheet. Please check the file format."); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async () => {
    if (bulkSpreadsheetRows.length === 0) { toast.error("No rows to import"); return; }
    setIsBulkImporting(true);
    setBulkImportError("");
    let createdCount = 0;
    let skippedCount = 0;
    const issues: string[] = [];
    for (let i = 0; i < bulkSpreadsheetRows.length; i++) {
      const row = bulkSpreadsheetRows[i];
      try {
        const rowName = String(row.fullName || row.name || row.FullName || row.Name || "").trim();
        const rowEmail = String(row.email || row.Email || "").trim().toLowerCase();
        if (!rowName || !rowEmail) { skippedCount++; issues.push(`Row ${i + 2}: Missing name or email`); continue; }
        const departmentsRaw = String(row.departments || row.department || row.Department || row.Departments || "");
        const departments = departmentsRaw.split(",").map((d: string) => d.trim()).filter(Boolean);
        const payload: Record<string, unknown> = {
          fullName: rowName, email: rowEmail,
          phone: String(row.phone || row.Phone || row.mobile || row.Mobile || ""),
          departmentNames: departments,
          workspaceRole: mapRoleLabelToValue(String(row.role || row.Role || "Employee")),
          joiningDate: String(row.joiningDate || row.joining_date || row.JoiningDate || ""),
          employmentType: String(row.employmentType || row.EmploymentType || "full-time"),
          workMode: String(row.workMode || row.WorkMode || "hybrid"),
        };
        await createEmployeeRecord(payload);
        createdCount++;
      } catch (err) {
        skippedCount++;
        issues.push(`Row ${i + 2}: ${(err as Error)?.message || "Creation failed"}`);
      }
    }
    setIsBulkImporting(false);
    setBulkImportSummary({ processedRows: bulkSpreadsheetRows.length, createdCount, skippedCount, fileName: bulkSpreadsheetName, issues });
    if (createdCount > 0) loadEmployees({ silent: true });
  };

  /* ───────────────────── View Employee Handlers ───────────────────── */

  const handleDownloadEmployeeReport = async () => {
    if (!viewingEmployee) return;
    try {
      const blob = await createReport({ type: "employee_detail", employeeId: viewingEmployee.id });
      await downloadReportFile(blob, `${viewingEmployee.name.replace(/\s+/g, "_")}_Report.xlsx`);
      toast.success("Report downloaded");
    } catch { toast.error("Failed to generate report"); }
  };

  /* ───────────────────── Access Control Handlers ───────────────────── */

  const [accessForm, setAccessForm] = useState<AccessFormState>({
    role: "Employee", departments: [], selectedModules: [],
  });
  const [accessTogglePendingEmployeeId, setAccessTogglePendingEmployeeId] = useState("");
  const [accessToggleOverrides, setAccessToggleOverrides] = useState<Record<string, boolean>>({});

  const accessCoreSections = useMemo(
    () => getRoleCoreSectionsForEmployeeAccess(accessForm.role, accessForm.departments),
    [accessForm.role, accessForm.departments],
  );

  const handleOpenAccessPanel = (employee: Employee) => {
    setManagingAccessFor(employee);
    setAccessForm({
      role: employee.role || "Employee",
      departments: isWorkspaceLeaderRole(employee.role) ? filterValidDepartments(allDepartments) : employee.departments,
      selectedModules: employee.permissions?.modules || [],
    });
  };

  const handleSaveAccess = async () => {
    if (!managingAccessFor) return;
    setIsSavingAccess(true);
    try {
      const response = await updateEmployeeAccessRequest(managingAccessFor.id, {
        accessModules: accessForm.selectedModules,
        accessFeatures: [],
      });
      if (response) {
        setManagingAccessFor(null);
        loadEmployees({ silent: true });
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message || err?.message || "Failed to update access");
    } finally {
      setIsSavingAccess(false);
    }
  };

  /* ───────────────────── Derived Data ───────────────────── */

  const allDepartments = availableDepartments;

  const managerOptions = useMemo(
    () =>
      employees
        .filter((e) => e?.userId && e?.source !== "tenant-company")
        .map((e) => ({ value: String(e.userId), label: e.name || e.fullName || "Unnamed Employee", role: e.role || "Employee" })),
    [employees],
  );

  const managerNameById = useMemo(() => {
    const next = new Map<string, string>();
    managerOptions.forEach((o) => next.set(o.value, o.label));
    return next;
  }, [managerOptions]);

  const visibleEmployees = useMemo(() => {
    let filtered = employees;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter((e) =>
        (e.name?.toLowerCase() || "").includes(q) ||
        (e.email?.toLowerCase() || "").includes(q) ||
        (e.employeeId?.toLowerCase() || e.employeeNumber?.toLowerCase() || "").includes(q),
      );
    }
    if (deptFilter !== "All Departments") {
      filtered = filtered.filter((e) => e.department === deptFilter || e.departments.includes(deptFilter));
    }
    if (roleFilter !== "All Roles") {
      const roleValue = ROLE_LABEL_TO_VALUE[roleFilter];
      filtered = filtered.filter((e) => e.rawRole === roleValue || e.role === roleFilter);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.statusKey === statusFilter);
    }
    return filtered;
  }, [employees, searchQuery, deptFilter, roleFilter, statusFilter]);

  const visibleTransferredEmployees = useMemo(() => {
    if (deptFilter !== "All Departments" || roleFilter !== "All Roles") return [];
    const q = searchQuery.toLowerCase().trim();
    let filtered = transferredEmployees;
    if (q) filtered = filtered.filter((e) =>
      (e.name?.toLowerCase() || "").includes(q) || (e.email?.toLowerCase() || "").includes(q),
    );
    return filtered;
  }, [transferredEmployees, searchQuery, deptFilter, roleFilter]);

  const updateEmployeeAccessState = async (employee: Employee, enabled: boolean) => {
    const targetMemberId = String(employee?.linkedWorkspaceMemberId || "").trim();
    if (!targetMemberId) {
      toast.error("This employee is not linked to a workspace member yet.");
      return false;
    }
    try {
      await axiosPrivate.patch(`/api/organization/members/${targetMemberId}/status`, {
        action: enabled ? "enable" : "disable",
      });
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message || err?.message || "Failed to update access");
      return false;
    }
  };

  const employeeSummaryCards: EmployeeSummaryCard[] = useMemo(() => {
    const activeCount = visibleEmployees.filter((e) => e.statusKey === "active").length;
    const pendingCount = visibleEmployees.filter((e) => ["pending", "invite_sent", "registered"].includes(e.statusKey)).length;
    const inactiveCount = visibleEmployees.filter((e) => ["inactive", "terminated"].includes(e.statusKey)).length;
    return [
      { label: "Total Employees", value: visibleEmployees.length, icon: Users, toneClass: "bg-slate-50 text-slate-600", accentClass: "" },
      { label: "Active", value: activeCount, icon: CheckCircle2, toneClass: "bg-emerald-50 text-emerald-600", accentClass: "border-l-4 border-l-emerald-500" },
      { label: "Pending", value: pendingCount, icon: Clock, toneClass: "bg-amber-50 text-amber-600", accentClass: "border-l-4 border-l-amber-500" },
      { label: "Inactive", value: inactiveCount, icon: Power, toneClass: "bg-rose-50 text-rose-600", accentClass: "border-l-4 border-l-rose-500" },
    ];
  }, [visibleEmployees]);

  const formatTransferredDate = (value: string): string => {
    if (!value) return "Transferred recently";
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return "Transferred recently";
    return parsedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getJobTitleSuggestions = (selectedDepartments: string[] = []): JobTitleOption[] => {
    if (!Array.isArray(recruitmentJobOpenings) || recruitmentJobOpenings.length === 0) return [];
    const normalizedDepts = selectedDepartments.map((d) => String(d || "").trim()).filter(Boolean);
    if (normalizedDepts.length === 0) return recruitmentJobOpenings;
    return recruitmentJobOpenings.filter((o) => {
      const optDept = String(o?.department || "").trim();
      return !optDept || normalizedDepts.includes(optDept);
    });
  };

  const inviteJobTitleSuggestions = useMemo(
    () => getJobTitleSuggestions(inviteForm.departments),
    [recruitmentJobOpenings, inviteForm.departments],
  );

  const addFormJobTitleSuggestions = useMemo(
    () => getJobTitleSuggestions(addForm.departments),
    [recruitmentJobOpenings, addForm.departments],
  );

  const editJobTitleSuggestions = useMemo(
    () => getJobTitleSuggestions(editForm.departments),
    [recruitmentJobOpenings, editForm.departments],
  );

  useEffect(() => {
    if (!inviteForm.jobCode) {
      setInviteForm((prev) => {
        if (!prev.jobCode && !prev.jobTitle && !prev.employmentType) return prev;
        return { ...prev, jobCode: "", jobTitle: "", employmentType: "", internshipIsUnpaid: false, internshipDurationMonths: "", internshipEndDate: "" };
      });
      return;
    }
    const currentOption = inviteJobTitleSuggestions.find((o) => o.jobCode === inviteForm.jobCode);
    if (!currentOption) return;
    setInviteForm((prev) => {
      const nextTitle = currentOption.designation || currentOption.title;
      if (prev.jobCode === currentOption.jobCode && prev.jobTitle === nextTitle) return prev;
      const intMode = ["intern", "trainee"].includes(String(currentOption.employmentType || "").toLowerCase());
      return {
        ...prev, jobCode: currentOption.jobCode || "",
        jobTitle: nextTitle || "",
        employmentType: currentOption.employmentType || prev.employmentType,
        internshipDurationMonths: intMode ? String(currentOption.internshipDurationMonths || prev.internshipDurationMonths || "6") : prev.internshipDurationMonths,
        internshipIsUnpaid: intMode ? currentOption.isPaid === false : false,
        internshipEndDate: intMode ? calculateInternshipEndDate(prev.joiningDate, intMode ? String(currentOption.internshipDurationMonths || prev.internshipDurationMonths || "6") : prev.internshipDurationMonths) : "",
      };
    });
  }, [inviteJobTitleSuggestions, inviteForm.jobCode]);

  useEffect(() => {
    if (!isEditModalOpen) return;
    if (!editForm.jobCode) {
      setEditForm((prev) => {
        if (!prev.jobCode && !prev.jobTitle && !prev.employmentType) return prev;
        return { ...prev, jobCode: "", jobTitle: "", employmentType: "", internshipIsUnpaid: false, internshipDurationMonths: "", internshipEndDate: "" };
      });
      return;
    }
    const currentOption = editJobTitleSuggestions.find((o) => o.jobCode === editForm.jobCode);
    if (!currentOption) return;
    setEditForm((prev) => {
      const nextTitle = currentOption.designation || currentOption.title;
      if (prev.jobCode === currentOption.jobCode && prev.jobTitle === nextTitle) return prev;
      const intMode = ["intern", "trainee"].includes(String(currentOption.employmentType || "").toLowerCase());
      return {
        ...prev, jobCode: currentOption.jobCode || "",
        jobTitle: nextTitle || "",
        employmentType: currentOption.employmentType || prev.employmentType,
        internshipDurationMonths: intMode ? String(currentOption.internshipDurationMonths || prev.internshipDurationMonths || "6") : prev.internshipDurationMonths,
        internshipIsUnpaid: intMode ? currentOption.isPaid === false : false,
        internshipEndDate: intMode ? calculateInternshipEndDate(prev.joiningDate, intMode ? String(currentOption.internshipDurationMonths || prev.internshipDurationMonths || "6") : prev.internshipDurationMonths) : "",
      };
    });
  }, [editJobTitleSuggestions, editForm.jobCode, isEditModalOpen]);

  const uploadSelectedEmployeeDocuments = async (form: EmployeeFormState, existingDocuments: Array<Record<string, unknown>> = []) => {
    const fileEntries: Array<{ field: keyof Pick<EmployeeFormState, "identityProof" | "addressProof" | "bankProof" | "otherDocuments">; files: File[] }> = [
      { field: "identityProof", files: form.identityProof ? [form.identityProof] : [] },
      { field: "addressProof", files: form.addressProof ? [form.addressProof] : [] },
      { field: "bankProof", files: form.bankProof ? [form.bankProof] : [] },
      { field: "otherDocuments", files: Array.isArray(form.otherDocuments) ? form.otherDocuments : [] },
    ];

    const hasFiles = fileEntries.some((entry) => entry.files.length > 0);
    if (!hasFiles) return existingDocuments;

    const formData = new FormData();
    fileEntries.forEach((entry) => {
      entry.files.forEach((file) => {
        formData.append(String(entry.field), file);
      });
    });

    const response = await uploadEmployeeDocuments(formData);
    const uploaded = (response?.data?.data?.documents || response?.data?.documents || []) as Array<Record<string, unknown>>;
    return [...existingDocuments, ...uploaded];
  };

  const buildEmployeeRecordPayload = (form: EmployeeFormState, selectedDepartments: string[], options: Record<string, unknown> = {}): Record<string, unknown> => {
    const internshipEndDate = form.internshipEndDate || calculateInternshipEndDate(form.joiningDate, form.internshipDurationMonths);
    const internshipIsUnpaid = isInternshipEmploymentType(form.employmentType) && Boolean(form.internshipIsUnpaid);
    const requiresCompensation = !isInternshipEmploymentType(form.employmentType) || !internshipIsUnpaid;
    const status = normalizeEmployeeStatusKey(String(options.status || "invite_sent"));
    const departments = filterValidDepartments(selectedDepartments);
    return {
      fullName: form.fullName, dateOfBirth: form.dateOfBirth || null,
      email: form.email, phone: form.phone, currentAddress: form.currentAddress,
      country: form.country,
      state: form.state,
      city: form.city,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      jobTitle: form.jobTitle, jobCode: form.jobCode,
      designation: form.jobTitle,
      departments,
      departmentNames: departments,
      workspaceRole: mapRoleLabelToValue(form.role),
      managerUserId: form.managerUserId || null,
      managerName: form.managerUserId
        ? managerNameById.get(form.managerUserId) || (editingEmployee?.managerName ?? "")
        : "",
      employmentType: form.employmentType, internshipIsUnpaid,
      internshipDurationMonths: isInternshipEmploymentType(form.employmentType) ? Number(form.internshipDurationMonths || 0) || 6 : null,
      internshipEndDate: isInternshipEmploymentType(form.employmentType) ? internshipEndDate || null : null,
      workLocation: form.workLocation || "", workMode: form.workMode,
      noticePeriodDays: form.noticePeriodDays ? Number(form.noticePeriodDays) : 30,
      probationDays: form.probationDays && form.probationDays !== "none" ? Number(form.probationDays) : 0,
      joiningDate: form.joiningDate || null,
      salaryPackage: requiresCompensation
        ? { amount: form.salaryAmount ? Number(form.salaryAmount) : 0, grossAnnual: form.salaryAmount ? Number(form.salaryAmount) : 0, currency: "INR", payFrequency: "annual" }
        : { amount: 0, grossAnnual: 0, currency: "INR", payFrequency: "annual" },
      bankName: requiresCompensation
        ? String(form.bankNameSelection === BANK_NAME_CUSTOM_OPTION ? form.bankNameCustom : form.bankName || form.bankNameSelection || "").trim()
        : "",
      accountHolderName: requiresCompensation ? form.accountHolderName : "",
      accountNumber: requiresCompensation ? form.accountNumber : "",
      ifscCode: requiresCompensation ? form.ifscCode.toUpperCase() : "",
      documents: Array.isArray(options.documents) ? options.documents : [],
      sendInvite: Boolean(options.sendInvite),
      status,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50"><UserCheck size={12}/>Joined</span>;
      case 'inactive':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50"><Ban size={12}/>Disabled</span>;
      case 'terminated':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50"><Ban size={12}/>Terminated</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50"><Clock size={12}/>Pending</span>;
      case 'invite_sent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50"><Mail size={12}/>Invite Sent</span>;
      case 'registered':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50"><UserCheck size={12}/>Registered</span>;
      case 'probation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50"><AlertCircle size={12}/>Probation</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100">{status || 'Unknown'}</span>;
    }
  };

  const employeeViewRows = useMemo(
    () => viewingEmployee ? buildEmployeeReportRows(viewingEmployee as unknown as Record<string, unknown>) : [],
    [viewingEmployee],
  );

  /* ───────────────────── Render ───────────────────── */

  if (isLoading) return <HREmployeeManagementSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ═══ HEADER ═══ */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Employee Management
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Manage employees, invitations, department roles and access permissions.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBulkUploadClick}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-slate-100 hover:border-slate-500 text-slate-500 transition-all active:scale-95 shadow-sm"
              >
                <UploadCloud size={13} /> 
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-500 text-white px-1.5 py-0.5 rounded">BULK UPLOAD</span>
              </button>
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

          {/* ═══ ERROR BANNER ═══ */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle size={14} /> {errorMessage}
            </div>
          )}

          {/* ═══ STAT CARDS ═══ */}
          <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            {employeeSummaryCards.map((card) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.accentClass}`}
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-black text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.toneClass} shrink-0`}>
                    <CardIcon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ BACK ARROW (when inside create employee) ═══ */}
          {showAddForm && (
            <button
              type="button"
              onClick={() => { resetAddForm(); setShowAddForm(false); }}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#2563EB] transition-colors w-fit"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {/* ═══ ADD EMPLOYEE FORM ═══ */}
          {showAddForm && (
            <form onSubmit={handleAddFormSubmit}>
              <div className="flex flex-col gap-4">

                {/* Section 1: Personal Details */}
                <FormSection title="Personal Details" icon={Users}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={addForm.fullName}
                        onChange={(e) => handleAddFieldChange("fullName", e.target.value)}
                        className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFormErrors.fullName ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                        placeholder="Enter full name"
                      />
                      {addFormErrors.fullName && <span className="text-[10px] font-medium text-red-500">{addFormErrors.fullName}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email <span className="text-red-400">*</span></label>
                      <input
                        type="email"
                        value={addForm.email}
                        onChange={(e) => handleAddFieldChange("email", e.target.value)}
                        className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFormErrors.email ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                        placeholder="Enter email"
                      />
                      {addFormErrors.email && <span className="text-[10px] font-medium text-red-500">{addFormErrors.email}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone <span className="text-red-400">*</span></label>
                      <input
                        type="tel"
                        value={addForm.phone}
                        onChange={(e) => handleAddFieldChange("phone", e.target.value)}
                        className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFormErrors.phone ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                        placeholder="Enter phone number"
                      />
                      {addFormErrors.phone && <span className="text-[10px] font-medium text-red-500">{addFormErrors.phone}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date of Birth</label>
                      <input
                        type="date"
                        value={addForm.dateOfBirth}
                        onChange={(e) => handleAddFieldChange("dateOfBirth", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={addForm.emergencyContactName}
                        onChange={(e) => handleAddFieldChange("emergencyContactName", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="Emergency contact person"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={addForm.emergencyContactPhone}
                        onChange={(e) => handleAddFieldChange("emergencyContactPhone", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="Emergency contact phone"
                      />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Address</label>
                      <textarea
                        value={addForm.currentAddress}
                        onChange={(e) => handleAddFieldChange("currentAddress", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                        rows={2}
                        placeholder="Enter address"
                      />
                    </div>
                  </div>
                </FormSection>

                {/* Section 2: Employment Details */}
                <FormSection title="Employment Details" icon={Briefcase}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role <span className="text-red-400">*</span></label>
                      <select
                        value={addForm.role}
                        onChange={(e) => handleAddRoleChange(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFormErrors.role ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                      >
                        <option value="">Select Role</option>
                        {Object.entries(ROLE_LABEL_TO_VALUE).map(([label]) => (
                          <option key={label} value={label}>{label}</option>
                        ))}
                      </select>
                      {addFormErrors.role && <span className="text-[10px] font-medium text-red-500">{addFormErrors.role}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employment Type</label>
                      <select
                        value={addForm.employmentType}
                        onChange={(e) => handleAddEmploymentTypeChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      >
                        {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Mode</label>
                      <select
                        value={addForm.workMode}
                        onChange={(e) => handleAddFieldChange("workMode", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      >
                        {WORK_MODE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joining Date <span className="text-red-400">*</span></label>
                      <input
                        type="date"
                        value={addForm.joiningDate}
                        onChange={(e) => handleAddFieldChange("joiningDate", e.target.value)}
                        className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFormErrors.joiningDate ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                      />
                      {addFormErrors.joiningDate && <span className="text-[10px] font-medium text-red-500">{addFormErrors.joiningDate}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Title</label>
                      <input
                        type="text"
                        value={addForm.jobTitle}
                        onChange={(e) => handleAddFieldChange("jobTitle", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="e.g. Software Engineer"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Location</label>
                      <input
                        type="text"
                        value={addForm.workLocation}
                        onChange={(e) => handleAddFieldChange("workLocation", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="Office / City"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Probation Period</label>
                      <select
                        value={addForm.probationDays}
                        onChange={(e) => handleAddFieldChange("probationDays", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      >
                        {DEFAULT_PROBATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notice Period (Days)</label>
                      <input
                        type="number"
                        value={addForm.noticePeriodDays}
                        onChange={(e) => handleAddFieldChange("noticePeriodDays", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manager</label>
                      <select
                        value={addForm.managerUserId}
                        onChange={(e) => handleAddFieldChange("managerUserId", e.target.value)}
                        disabled={String(addForm.role || "").trim().toLowerCase() !== "employee"}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        <option value="">No Manager</option>
                        {managerOptions.map((mgr) => (
                          <option key={mgr.value} value={mgr.value}>{mgr.label} ({mgr.role})</option>
                        ))}
                      </select>
                      {String(addForm.role || "").trim().toLowerCase() !== "employee" && (
                        <p className="text-[9px] font-medium text-slate-400">Manager can only be assigned for Employee role.</p>
                      )}
                    </div>
                  </div>

                  {/* Internship Options */}
                  {isInternshipEmploymentType(addForm.employmentType) && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addForm.internshipIsUnpaid}
                            onChange={(e) => handleAddInternshipPaidToggle(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                          />
                          <span className="text-[11px] font-bold text-amber-800">Unpaid Internship (skip compensation fields)</span>
                        </label>
                      </div>
                      {!addForm.internshipIsUnpaid && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duration (Months)</label>
                            <input
                              type="number"
                              value={addForm.internshipDurationMonths}
                              onChange={(e) => {
                                handleAddFieldChange("internshipDurationMonths", e.target.value);
                                handleAddFieldChange("internshipEndDate", calculateInternshipEndDate(addForm.joiningDate, e.target.value));
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End Date</label>
                            <input
                              type="date"
                              value={addForm.internshipEndDate}
                              onChange={(e) => handleAddFieldChange("internshipEndDate", e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Departments */}
                  <div className="mt-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Departments <span className="text-red-400">*</span></label>
                    {getDepartmentSelectionMode(addForm.role) === "all" ? (
                      <>
                        <input
                          value="All departments"
                          disabled
                          className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-[12px] font-semibold outline-none transition-all ${addFormErrors.departments ? "border-red-300 bg-red-50 text-red-500" : "border-slate-200/60 text-slate-500"}`}
                        />
                        <p className="text-[9px] font-medium text-slate-400 mt-1">Founder and super admin are assigned all departments automatically.</p>
                        {addFormErrors.departments && <span className="text-[10px] font-medium text-red-500 mt-1">{addFormErrors.departments}</span>}
                      </>
                    ) : getDepartmentSelectionMode(addForm.role) === "multiple" ? (
                      <DepartmentCheckboxDropdown
                        departments={allDepartments}
                        selectedDepartments={addForm.departments}
                        onToggle={handleAddDepartmentToggle}
                        error={addFormErrors.departments}
                        note="Admin can select multiple departments."
                      />
                    ) : (
                      <>
                        <select
                          value={addForm.departments[0] || ""}
                          onChange={(e) => handleAddFieldChange("departments", e.target.value ? [e.target.value] : [])}
                          className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFormErrors.departments ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                        >
                          <option value="">Select Department</option>
                          {allDepartments.map((department) => (
                            <option key={department} value={department}>{department}</option>
                          ))}
                        </select>
                        <p className="text-[9px] font-medium text-slate-400 mt-1">Managers and employees can be assigned one department.</p>
                        {addFormErrors.departments && <span className="text-[10px] font-medium text-red-500 mt-1">{addFormErrors.departments}</span>}
                      </>
                    )}
                  </div>
                </FormSection>

                {/* Section 3: Compensation & Bank */}
                <FormSection title="Compensation & Bank Details" icon={FileText}>
                  {(!isInternshipEmploymentType(addForm.employmentType) || !addForm.internshipIsUnpaid) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Annual CTC (₹)</label>
                        <input
                          type="number"
                          value={addForm.salaryAmount}
                          onChange={(e) => handleAddFieldChange("salaryAmount", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                          placeholder="e.g. 600000"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bank Name</label>
                        <select
                          value={addForm.bankNameSelection}
                          onChange={(e) => handleAddFieldChange("bankNameSelection", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        >
                          <option value="">Select Bank</option>
                          {bankNameOptions.map((bank) => (
                            <option key={bank} value={bank}>{bank}</option>
                          ))}
                          <option value={BANK_NAME_CUSTOM_OPTION}>Other (type below)</option>
                        </select>
                      </div>
                      {addForm.bankNameSelection === BANK_NAME_CUSTOM_OPTION && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Bank Name</label>
                          <input
                            type="text"
                            value={addForm.bankNameCustom}
                            onChange={(e) => handleAddFieldChange("bankNameCustom", e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                            placeholder="Enter bank name"
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Holder Name</label>
                        <input
                          type="text"
                          value={addForm.accountHolderName}
                          onChange={(e) => handleAddFieldChange("accountHolderName", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                          placeholder="As on bank account"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Number</label>
                        <input
                          type="text"
                          value={addForm.accountNumber}
                          onChange={(e) => handleAddFieldChange("accountNumber", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                          placeholder="Enter account number"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">IFSC Code</label>
                        <input
                          type="text"
                          value={addForm.ifscCode}
                          onChange={(e) => handleAddFieldChange("ifscCode", e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                          placeholder="e.g. HDFC0001234"
                        />
                        {addForm.workLocation && (
                          <span className="text-[9px] font-medium text-emerald-600 mt-0.5">Branch: {addForm.workLocation}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[12px] font-semibold text-slate-500">Compensation fields are skipped for unpaid internships.</p>
                    </div>
                  )}
                </FormSection>

                {/* Section 4: IDs & Documents */}
                <FormSection title="IDs & Documents" icon={FileSpreadsheet}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID Type</label>
                      <select
                        value={addForm.nationalIdType}
                        onChange={(e) => handleAddFieldChange("nationalIdType", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      >
                        <option value="">Select Type</option>
                        {NATIONAL_ID_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID Number</label>
                      <input
                        type="text"
                        value={addForm.nationalIdNumber}
                        onChange={(e) => handleAddFieldChange("nationalIdNumber", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="ID number"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax ID (PAN)</label>
                      <input
                        type="text"
                        value={addForm.taxId}
                        onChange={(e) => handleAddFieldChange("taxId", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="PAN number"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Provident Fund / UAN</label>
                      <input
                        type="text"
                        value={addForm.providentFundNumber}
                        onChange={(e) => handleAddFieldChange("providentFundNumber", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        placeholder="UAN number"
                      />
                    </div>
                  </div>
                </FormSection>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { resetAddForm(); setShowAddForm(false); }}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addFormSubmitting}
                    className="px-8 py-2.5 bg-[#2563EB] text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {addFormSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {addFormSubmitting ? "Saving..." : "Save & Invite"}
                  </button>
                </div>

              </div>
            </form>
          )}

          {/* ═══ EMPLOYEE TABLE (hidden when add form is open) ═══ */}
          {!showAddForm && (
            <>
              {/* ─── Data Panel ─── */}
              <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                {/* Header Row: Search + Filters */}
                <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[180px] w-full xl:w-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Right: Filters */}
                  <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                    {/* Department filter */}
                    <div className="relative">
                      <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                      <select
                        value={deptFilter}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDeptFilter(e.target.value)}
                        className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                      >
                        <option>All Departments</option>
                        {availableDepartments.map((department) => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                      </select>
                    </div>

                    {/* Role filter */}
                    <div className="relative">
                      <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                      <select
                        value={roleFilter}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
                        className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[100px]"
                      >
                        <option>All Roles</option>
                        {roleFilterOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    {/* Add Employee button */}
                    <button
                      onClick={() => { setIsAddModalOpen(true); resetAddForm(); }}
                      className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-bold text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <UserPlus size={13} strokeWidth={2.5} /> ADD EMPLOYEE
                    </button>
                  </div>
                </div>

                {/* Status Sub-Tabs (Pill Filters) */}
                <div className="px-3 sm:px-4 lg:px-5 py-2 border-b border-slate-100/40 bg-white flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${
                      statusFilter === "all"
                        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                        : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                    }`}
                  >
                    All
                  </button>
                  {statusFilterOptions.filter((o) => o.key !== "probation" && o.key !== "terminated").map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setStatusFilter(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all ${
                        statusFilter === opt.key
                          ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                          : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-5 py-4 text-left">Employee ID</th>
                        <th className="px-5 py-4 text-left">Employee Name</th>
                        <th className="px-5 py-4 text-left">Email</th>
                        <th className="px-5 py-4 text-left">Department &amp; Role</th>
                        <th className="px-5 py-4 text-center">Status</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                        <th className="px-5 py-4 text-left">Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {visibleEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-20 text-slate-400 font-semibold">
                            No employees found.
                          </td>
                        </tr>
                      ) : (
                        visibleEmployees.map((emp) => {
                          const isTenantEmployee = emp.source === "tenant-company";
                          const isFounderEmployee = normalizeUserRole(emp?.rawRole || emp?.role) === "owner" || String(emp?.role || "").trim() === "Founder";
                          const isEditAccessLocked = isTenantEmployee || ["inactive", "terminated"].includes(emp.statusKey);
                          const isAccessActionLocked = isTenantEmployee || isFounderEmployee || !canOpenEmployeeAccessPanelByRole || !hasEmployeeManagementModuleAccess;

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-5 py-4">
                                <span className="font-bold text-slate-800 text-[12px]">{emp.employeeId || emp.employeeNumber || emp.id}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm shrink-0 border ${
                                    ["pending", "invite_sent"].includes(emp.statusKey)
                                      ? "bg-orange-50 text-orange-600 border-orange-200"
                                      : "bg-[#2563EB] text-white border-blue-800"
                                  }`}>
                                    {(emp.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-slate-800 text-[12px]">{emp.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-[11px] font-medium text-slate-500">{emp.email}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-slate-700 text-[11px]">{emp.department}</span>
                                  <span className={`inline-block w-fit px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                    emp.role === "Founder" || emp.role === "Super Admin" || emp.role === "Admin"
                                      ? "bg-purple-100 text-purple-700"
                                      : emp.role === "Manager"
                                        ? "bg-blue-100 text-blue-600"
                                        : "bg-slate-100 text-slate-500"
                                  }`}>{emp.role}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-center">{getStatusBadge(emp.statusKey || emp.status)}</td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => { setIsEditModalOpen(false); setManagingAccessFor(null); setViewingEmployee(emp); setViewTab("personal"); }}
                                    className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                                    title="View"
                                  >
                                    <Eye size={14} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditEmployee(emp)}
                                    disabled={isEditAccessLocked}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      isEditAccessLocked
                                        ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                        : "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                                    }`}
                                    title="Edit"
                                  >
                                    <Edit3 size={14} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                {(() => {
                                  const statusKey = emp.statusKey;

                                  if (statusKey === "invite_sent") {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50">
                                        <Clock size={12} /> Access Pending
                                      </span>
                                    );
                                  }

                                  if (statusKey === "registered") {
                                    return (
                                      <div className="flex flex-col items-start gap-1">
                                        <label className="inline-flex items-center gap-2 cursor-not-allowed select-none">
                                          <input type="checkbox" checked={true} disabled={true} className="sr-only peer" />
                                          <span className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-blue-500 opacity-60">
                                            <span className="absolute left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow translate-x-5" />
                                          </span>
                                        </label>
                                        <span className="text-[10px] font-bold text-blue-600">Access Pending</span>
                                      </div>
                                    );
                                  }

                                  const currentUserId = String(currentUser?.id || currentUser?._id || "").trim();
                                  const currentUserEmail = String(currentUser?.email || "").trim().toLowerCase();
                                  const isCurrentLoggedInEmployee =
                                    Boolean(currentUserId && String(emp.userId || "").trim() === currentUserId) ||
                                    Boolean(currentUserEmail && String(emp.email || "").trim().toLowerCase() === currentUserEmail);
                                  const accessTargetId = String(emp.linkedWorkspaceMemberId || "").trim();

                                  if (!accessTargetId && !isCurrentLoggedInEmployee) {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                                        <Lock size={12} /> Not Linked
                                      </span>
                                    );
                                  }

                                  if (statusKey === "pending") {
                                    return (
                                      <div className="flex flex-col items-start gap-1">
                                        <label className="inline-flex items-center gap-2 cursor-not-allowed select-none">
                                          <input type="checkbox" checked={false} disabled={true} className="sr-only peer" />
                                          <span className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-amber-400 opacity-60">
                                            <span className="absolute left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow translate-x-0" />
                                          </span>
                                        </label>
                                        <span className="text-[10px] font-bold text-amber-600">Access Pending</span>
                                      </div>
                                    );
                                  }

                                  const isSelfLocked = isCurrentLoggedInEmployee;
                                  const isOrgActive = statusKey === "active" || statusKey === "probation";
                                  const hasModules = Array.isArray(emp.permissions?.modules) && emp.permissions.modules.length > 0;
                                  const storedAccessEnabled = isOrgActive ? (hasModules || true) : false;
                                  const isAccessEnabled = accessToggleOverrides[emp.id] ?? storedAccessEnabled;
                                  const isAccessSaving = accessTogglePendingEmployeeId === emp.id;

                                  const isToggleLocked = isSelfLocked;
                                  const trackClass = isSelfLocked
                                    ? "bg-slate-300"
                                    : isAccessEnabled
                                      ? "bg-emerald-500"
                                      : "bg-rose-500";
                                  let labelText = isSelfLocked ? "Self Protected" : isAccessEnabled ? "Access On" : "Access Off";
                                  let labelColor = isSelfLocked ? "text-slate-500" : isAccessEnabled ? "text-emerald-600" : "text-rose-600";
                                  return (
                                    <div className="flex flex-col items-start gap-1">
                                      <label className={`inline-flex items-center gap-2 ${isToggleLocked || isAccessSaving ? "cursor-not-allowed" : "cursor-pointer"} select-none`}>
                                        <input
                                          type="checkbox"
                                          checked={isAccessEnabled}
                                          disabled={isToggleLocked || isAccessSaving}
                                          onChange={async (e) => {
                                            const nextEnabled = e.target.checked;
                                            setAccessToggleOverrides((prev) => ({ ...prev, [emp.id]: nextEnabled }));
                                            setAccessTogglePendingEmployeeId(emp.id);
                                            const ok = await updateEmployeeAccessState(emp, nextEnabled);
                                            if (ok) {
                                              toast.success(nextEnabled ? "Access enabled" : "Access disabled");
                                            } else {
                                              setAccessToggleOverrides((prev) => ({ ...prev, [emp.id]: !nextEnabled }));
                                            }
                                            await loadEmployees({ silent: true });
                                            setAccessTogglePendingEmployeeId("");
                                          }}
                                          className="sr-only peer"
                                        />
                                        <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${trackClass} ${isAccessSaving ? "opacity-80" : ""}`}>
                                          <span className={`absolute left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${isAccessEnabled ? "translate-x-5" : "translate-x-0"}`}>
                                            {isAccessSaving ? <Loader2 size={10} className="animate-spin text-slate-400" /> : null}
                                          </span>
                                        </span>
                                      </label>
                                      <span className={`text-[10px] font-bold ${labelColor}`}>{labelText}</span>
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── Transferred Employees Table ─── */}
              {visibleTransferredEmployees.length > 0 && (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100/60 bg-slate-50/50">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Building size={14} /> Transferred Employees ({visibleTransferredEmployees.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                        <tr>
                          <th className="px-5 py-4 text-left">Name</th>
                          <th className="px-5 py-4 text-left">Email</th>
                          <th className="px-5 py-4 text-left">From</th>
                          <th className="px-5 py-4 text-left">To</th>
                          <th className="px-5 py-4 text-left">Transferred</th>
                          <th className="px-5 py-4 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {visibleTransferredEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4 font-semibold text-slate-800 text-[12px]">{emp.name}</td>
                            <td className="px-5 py-4 text-[11px] font-medium text-slate-500">{emp.email}</td>
                            <td className="px-5 py-4 text-[11px] text-slate-600">{emp.transferredFromWorkspaceName || "-"}</td>
                            <td className="px-5 py-4 text-[11px] text-slate-600">{emp.transferredToWorkspaceName || "-"}</td>
                            <td className="px-5 py-4 text-[10px] font-medium text-slate-400">{formatTransferredDate(emp.transferredAt)}</td>
                            <td className="px-5 py-4">{getStatusBadge(emp.statusKey)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </PageFrame>

      {/* ═══════════════════════════════════════════════════════
           MODALS (rendered via createPortal)
           ═══════════════════════════════════════════════════════ */}

      {/* ─── MODAL: View Employee ─── */}
      {viewingEmployee && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={() => setViewingEmployee(null)}>
          <div className="relative w-full max-w-2xl mx-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {(viewingEmployee.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{viewingEmployee.name}</h3>
                  <p className="text-[10px] font-medium text-slate-500">{viewingEmployee.email}</p>
                </div>
              </div>
              <button onClick={() => setViewingEmployee(null)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white px-6">
              {(["personal", "employment", "documents"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setViewTab(tab)}
                  className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                    viewTab === tab ? "text-[#2563EB] border-[#2563EB]" : "text-slate-400 border-transparent hover:text-slate-600"
                  }`}
                >
                  {tab === "personal" ? "Personal" : tab === "employment" ? "Employment" : "Documents"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {viewTab === "personal" && (
                <div className="grid grid-cols-2 gap-4">
                  {employeeViewRows.slice(0, 12).map((row) => (
                    <div key={row.label} className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.label}</span>
                      <span className="text-[12px] font-semibold text-slate-800">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {viewTab === "employment" && (
                <div className="grid grid-cols-2 gap-4">
                  {employeeViewRows.slice(12).map((row) => (
                    <div key={row.label} className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.label}</span>
                      <span className="text-[12px] font-semibold text-slate-800">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {viewTab === "documents" && (
                <div>
                  {viewingEmployee.documents && viewingEmployee.documents.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {viewingEmployee.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            <span className="text-[12px] font-semibold text-slate-700">{doc.name}</span>
                          </div>
                          <span className="text-[9px] font-medium text-slate-400">{doc.uploadedAt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-12 text-slate-400 font-semibold text-[12px]">No documents uploaded.</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={handleDownloadEmployeeReport}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <Download size={13} /> Download Report
              </button>
              <button onClick={() => setViewingEmployee(null)} className="px-4 py-2 bg-[#2563EB] text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── MODAL: Edit Employee ─── */}
      {isEditModalOpen && editingEmployee && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={() => { setIsEditModalOpen(false); setEditingEmployee(null); setEditFormErrors({}); setEditFormSubmitting(false); }}>
          <div className="relative w-full max-w-3xl mx-4 bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 size={16} /> Edit: {editingEmployee.name}
              </h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingEmployee(null); setEditFormErrors({}); setEditFormSubmitting(false); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={16} className="text-white/80" />
              </button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5 bg-slate-100">
              <FormSection title="Personal Info" icon={Users}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name <span className="text-red-400">*</span></label>
                    <input type="text" value={editForm.fullName} onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.fullName ? "border-red-300 bg-red-50" : "border-slate-200/60"}`} />
                    {editFormErrors.fullName && <span className="text-[10px] font-medium text-red-500">{editFormErrors.fullName}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email <span className="text-red-400">*</span></label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.email ? "border-red-300 bg-red-50" : "border-slate-200/60"}`} />
                    {editFormErrors.email && <span className="text-[10px] font-medium text-red-500">{editFormErrors.email}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone <span className="text-red-400">*</span></label>
                    <input type="tel" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.phone ? "border-red-300 bg-red-50" : "border-slate-200/60"}`} />
                    {editFormErrors.phone && <span className="text-[10px] font-medium text-red-500">{editFormErrors.phone}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date of Birth</label>
                    <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Address</label>
                    <input type="text" value={editForm.currentAddress} onChange={(e) => setEditForm((p) => ({ ...p, currentAddress: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Country <span className="text-red-400">*</span></label>
                    <select value={editForm.country} onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value, state: "", city: "" }))} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.country ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}>
                      <option value="">Select Country</option>
                      {countryOptions.map((country) => (<option key={country} value={country}>{country}</option>))}
                    </select>
                    {editFormErrors.country && <span className="text-[10px] font-medium text-red-500">{editFormErrors.country}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State <span className="text-red-400">*</span></label>
                    <select value={editForm.state} onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value, city: "" }))} disabled={!editForm.country} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.state ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}>
                      <option value="">Select State</option>
                      {stateOptions.map((state) => (<option key={state} value={state}>{state}</option>))}
                    </select>
                    {editFormErrors.state && <span className="text-[10px] font-medium text-red-500">{editFormErrors.state}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">City <span className="text-red-400">*</span></label>
                    <select value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} disabled={!editForm.state} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.city ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}>
                      <option value="">Select City</option>
                      {cityOptions.map((city) => (<option key={city} value={city}>{city}</option>))}
                    </select>
                    {editFormErrors.city && <span className="text-[10px] font-medium text-red-500">{editFormErrors.city}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency Contact Name</label>
                    <input type="text" value={editForm.emergencyContactName} onChange={(e) => setEditForm((p) => ({ ...p, emergencyContactName: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency Contact Phone</label>
                    <input type="tel" value={editForm.emergencyContactPhone} onChange={(e) => setEditForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                </div>
              </FormSection>

              <FormSection title="Job Details" icon={Briefcase}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role <span className="text-red-400">*</span></label>
                    <select value={editForm.role} onChange={(e) => handleEditRoleChange(e.target.value)} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.role ? "border-red-300 bg-red-50" : "border-slate-300"}`}>
                      <option value="">Select Role</option>
                      {Object.keys(ROLE_LABEL_TO_VALUE).map((label) => (<option key={label} value={label}>{label}</option>))}
                    </select>
                    {editFormErrors.role && <span className="text-[10px] font-medium text-red-500">{editFormErrors.role}</span>}
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Departments <span className="text-red-400">*</span></label>
                    {getDepartmentSelectionMode(editForm.role) === "all" ? (
                      <>
                        <input
                          value="All departments"
                          disabled
                          className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-[12px] font-semibold outline-none transition-all ${editFormErrors.departments ? "border-red-300 bg-red-50 text-red-500" : "border-slate-200/60 text-slate-500"}`}
                        />
                        <p className="text-[9px] font-medium text-slate-400 mt-2">Founder and super admin are assigned all departments automatically.</p>
                        {editFormErrors.departments && <p className="text-[10px] font-medium text-red-500 mt-2">{editFormErrors.departments}</p>}
                      </>
                    ) : getDepartmentSelectionMode(editForm.role) === "multiple" ? (
                      <DepartmentCheckboxDropdown
                        departments={allDepartments}
                        selectedDepartments={editForm.departments}
                        onToggle={handleEditDepartmentToggle}
                        error={editFormErrors.departments}
                        note="Admin can select multiple departments."
                      />
                    ) : (
                      <>
                        <select
                          value={editForm.departments[0] || ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, departments: e.target.value ? [e.target.value] : [] }))}
                          className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.departments ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                        >
                          <option value="">Select Department</option>
                          {allDepartments.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <p className="text-[9px] font-medium text-slate-400 mt-2">Managers and employees can be assigned one department.</p>
                        {editFormErrors.departments && <p className="text-[10px] font-medium text-red-500 mt-2">{editFormErrors.departments}</p>}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joining Date <span className="text-red-400">*</span></label>
                    <input type="date" value={editForm.joiningDate} onChange={(e) => setEditForm((p) => ({ ...p, joiningDate: e.target.value }))} className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${editFormErrors.joiningDate ? "border-red-300 bg-red-50" : "border-slate-200/60"}`} />
                    {editFormErrors.joiningDate && <span className="text-[10px] font-medium text-red-500">{editFormErrors.joiningDate}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employment Type</label>
                    <select value={editForm.employmentType} onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, employmentType: v, internshipIsUnpaid: isInternshipEmploymentType(v) ? p.internshipIsUnpaid : false })); }} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                      {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Mode</label>
                    <select value={editForm.workMode} onChange={(e) => setEditForm((p) => ({ ...p, workMode: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                      {WORK_MODE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Role / Code</label>
                    <select
                      value={editForm.jobCode}
                      onChange={(e) => {
                        const selected = editJobTitleSuggestions.find((o) => o.jobCode === e.target.value) || null;
                        setEditForm((p) => ({
                          ...p,
                          jobCode: e.target.value,
                          jobTitle: selected?.designation || selected?.title || p.jobTitle,
                          employmentType: selected?.employmentType || p.employmentType,
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      <option value="">Select from recruitment</option>
                      {editJobTitleSuggestions.map((job) => (
                        <option key={job.jobCode || job.title} value={job.jobCode}>
                          {(job.designation || job.title)} {job.jobCode ? `(${job.jobCode})` : ""} {job.department ? `- ${job.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Designation</label>
                    <input type="text" value={editForm.jobTitle} onChange={(e) => setEditForm((p) => ({ ...p, jobTitle: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Code</label>
                    <input
                      type="text"
                      value={editForm.jobCode}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[12px] font-semibold text-slate-700 outline-none"
                      placeholder="Auto-filled from job role"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manager</label>
                    <select value={editForm.managerUserId} onChange={(e) => setEditForm((p) => ({ ...p, managerUserId: e.target.value }))} disabled={String(editForm.role || "").trim().toLowerCase() !== "employee"} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed">
                      <option value="">No Manager</option>
                      {managerOptions.map((mgr) => (
                        <option key={mgr.value} value={mgr.value}>{mgr.label} ({mgr.role})</option>
                      ))}
                    </select>
                    {String(editForm.role || "").trim().toLowerCase() !== "employee" && (
                      <p className="text-[9px] font-medium text-slate-400">Manager can only be assigned for Employee role.</p>
                    )}
                  </div>
                </div>
              </FormSection>

              <FormSection title="Bank Details" icon={FileText}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Location</label>
                  <input type="text" value={editForm.workLocation} onChange={(e) => setEditForm((p) => ({ ...p, workLocation: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bank Name</label>
                  <select value={editForm.bankNameSelection} onChange={(e) => setEditForm((p) => ({ ...p, bankNameSelection: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                    <option value="">Select Bank</option>
                    {bankNameOptions.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                    <option value={BANK_NAME_CUSTOM_OPTION}>Other (type below)</option>
                  </select>
                </div>
                {editForm.bankNameSelection === BANK_NAME_CUSTOM_OPTION && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Bank Name</label>
                    <input type="text" value={editForm.bankNameCustom} onChange={(e) => setEditForm((p) => ({ ...p, bankNameCustom: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Holder Name</label>
                  <input type="text" value={editForm.accountHolderName} onChange={(e) => setEditForm((p) => ({ ...p, accountHolderName: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Number</label>
                  <input type="text" value={editForm.accountNumber} onChange={(e) => setEditForm((p) => ({ ...p, accountNumber: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">IFSC Code</label>
                  <input type="text" value={editForm.ifscCode} onChange={(e) => setEditForm((p) => ({ ...p, ifscCode: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID Type</label>
                  <select value={editForm.nationalIdType} onChange={(e) => setEditForm((p) => ({ ...p, nationalIdType: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                    <option value="">Select Type</option>
                    {NATIONAL_ID_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID Number</label>
                  <input type="text" value={editForm.nationalIdNumber} onChange={(e) => setEditForm((p) => ({ ...p, nationalIdNumber: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax ID (PAN)</label>
                  <input type="text" value={editForm.taxId} onChange={(e) => setEditForm((p) => ({ ...p, taxId: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Provident Fund / UAN</label>
                  <input type="text" value={editForm.providentFundNumber} onChange={(e) => setEditForm((p) => ({ ...p, providentFundNumber: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                </div>
              </FormSection>

              <FormSection title="Documents" icon={FileSpreadsheet}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID File</label>
                    <input type="file" onChange={(e) => setEditForm((p) => ({ ...p, identityProof: e.target.files?.[0] || null }))} className="w-full text-[11px] text-slate-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-800 file:font-semibold file:shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Address Proof</label>
                    <input type="file" onChange={(e) => setEditForm((p) => ({ ...p, addressProof: e.target.files?.[0] || null }))} className="w-full text-[11px] text-slate-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-800 file:font-semibold file:shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bank Proof</label>
                    <input type="file" onChange={(e) => setEditForm((p) => ({ ...p, bankProof: e.target.files?.[0] || null }))} className="w-full text-[11px] text-slate-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-800 file:font-semibold file:shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Other Documents</label>
                    <input type="file" multiple onChange={(e) => setEditForm((p) => ({ ...p, otherDocuments: Array.from(e.target.files || []) }))} className="w-full text-[11px] text-slate-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-800 file:font-semibold file:shadow-sm" />
                  </div>
                </div>
              </FormSection>

            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={() => { setIsEditModalOpen(false); setEditingEmployee(null); setEditFormErrors({}); setEditFormSubmitting(false); }} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleSaveEdit} disabled={editFormSubmitting} className="px-6 py-2 bg-[#2563EB] text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {editFormSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {editFormSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── MODAL: Access Control Panel ─── */}
      {isAddModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[4vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto"
          onClick={() => { resetAddForm(); setIsAddModalOpen(false); }}
        >
          <div
            className="relative w-full max-w-4xl mx-4 bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus size={16} /> Add Employee
              </h3>
              <button
                type="button"
                onClick={() => { resetAddForm(); setIsAddModalOpen(false); }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={16} className="text-white/80" />
              </button>
            </div>
            <form onSubmit={handleAddFormSubmit} className="p-6 max-h-[75vh] overflow-y-auto space-y-5 bg-slate-100">
              <FormSection title="Personal Info" icon={Users}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={addForm.fullName}
                      onChange={(e) => handleAddFieldChange("fullName", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    {addFormErrors.fullName && <span className="text-[10px] font-medium text-red-500">{addFormErrors.fullName}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email <span className="text-red-400">*</span></label>
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => handleAddFieldChange("email", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    {addFormErrors.email && <span className="text-[10px] font-medium text-red-500">{addFormErrors.email}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone <span className="text-red-400">*</span></label>
                    <input
                      type="tel"
                      value={addForm.phone}
                      onChange={(e) => handleAddFieldChange("phone", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    {addFormErrors.phone && <span className="text-[10px] font-medium text-red-500">{addFormErrors.phone}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date of Birth</label>
                    <input
                      type="date"
                      value={addForm.dateOfBirth}
                      onChange={(e) => handleAddFieldChange("dateOfBirth", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Address</label>
                    <input
                      type="text"
                      value={addForm.currentAddress}
                      onChange={(e) => handleAddFieldChange("currentAddress", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      placeholder="Enter current address"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Country <span className="text-red-400">*</span></label>
                    <select
                      value={addForm.country}
                      onChange={(e) => handleAddFieldChange("country", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      <option value="">Select Country</option>
                      {countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}
                    </select>
                    {addFormErrors.country && <span className="text-[10px] font-medium text-red-500">{addFormErrors.country}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State <span className="text-red-400">*</span></label>
                    <select
                      value={addForm.state}
                      onChange={(e) => handleAddFieldChange("state", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      disabled={!addForm.country}
                    >
                      <option value="">Select State</option>
                      {stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                    {addFormErrors.state && <span className="text-[10px] font-medium text-red-500">{addFormErrors.state}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">City <span className="text-red-400">*</span></label>
                    <select
                      value={addForm.city}
                      onChange={(e) => handleAddFieldChange("city", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      disabled={!addForm.state}
                    >
                      <option value="">Select City</option>
                      {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                    {addFormErrors.city && <span className="text-[10px] font-medium text-red-500">{addFormErrors.city}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={addForm.emergencyContactName}
                      onChange={(e) => handleAddFieldChange("emergencyContactName", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={addForm.emergencyContactPhone}
                      onChange={(e) => handleAddFieldChange("emergencyContactPhone", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection title="Job Details" icon={Briefcase}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role <span className="text-red-400">*</span></label>
                    <select
                      value={addForm.role}
                      onChange={(e) => handleAddRoleChange(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFormErrors.role ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                    >
                      <option value="">Select Role</option>
                      {Object.keys(ROLE_LABEL_TO_VALUE).map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                    {addFormErrors.role && <span className="text-[10px] font-medium text-red-500">{addFormErrors.role}</span>}
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Departments <span className="text-red-400">*</span></label>
                    {getDepartmentSelectionMode(addForm.role) === "all" ? (
                      <>
                        <input
                          value="All departments"
                          disabled
                          className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-[12px] font-semibold outline-none transition-all ${addFormErrors.departments ? "border-red-300 bg-red-50 text-red-500" : "border-slate-200/60 text-slate-500"}`}
                        />
                        <p className="text-[9px] font-medium text-slate-400 mt-2">Founder and super admin are assigned all departments automatically.</p>
                        {addFormErrors.departments && <span className="text-[10px] font-medium text-red-500 mt-2">{addFormErrors.departments}</span>}
                      </>
                    ) : getDepartmentSelectionMode(addForm.role) === "multiple" ? (
                      <DepartmentCheckboxDropdown
                        departments={allDepartments}
                        selectedDepartments={addForm.departments}
                        onToggle={handleAddDepartmentToggle}
                        error={addFormErrors.departments}
                        note="Admin can select multiple departments."
                      />
                    ) : (
                      <>
                        <select
                          value={addForm.departments[0] || ""}
                          onChange={(e) => handleAddFieldChange("departments", e.target.value ? [e.target.value] : [])}
                          className={`w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${addFormErrors.departments ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                        >
                          <option value="">Select Department</option>
                          {allDepartments.map((department) => (
                            <option key={department} value={department}>{department}</option>
                          ))}
                        </select>
                        <p className="text-[9px] font-medium text-slate-400 mt-2">Managers and employees can be assigned one department.</p>
                        {addFormErrors.departments && <span className="text-[10px] font-medium text-red-500 mt-2">{addFormErrors.departments}</span>}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joining Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={addForm.joiningDate}
                      onChange={(e) => handleAddFieldChange("joiningDate", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    {addFormErrors.joiningDate && <span className="text-[10px] font-medium text-red-500">{addFormErrors.joiningDate}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employment Type</label>
                    <select
                      value={addForm.employmentType}
                      onChange={(e) => handleAddEmploymentTypeChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Mode</label>
                    <select
                      value={addForm.workMode}
                      onChange={(e) => handleAddFieldChange("workMode", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      {WORK_MODE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Role</label>
                    <select
                      value={addForm.jobCode}
                      onChange={(e) => {
                        const selected = addFormJobTitleSuggestions.find((o) => o.jobCode === e.target.value) || null;
                        handleAddFieldChange("jobCode", e.target.value);
                        if (selected) {
                          handleAddFieldChange("jobTitle", selected.designation || selected.title);
                          handleAddFieldChange("employmentType", selected.employmentType || addForm.employmentType);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      <option value="">Select from recruitment</option>
                      {addFormJobTitleSuggestions.map((job) => (
                        <option key={job.jobCode || job.title} value={job.jobCode}>
                          {(job.designation || job.title)} {job.jobCode ? `(${job.jobCode})` : ""} {job.department ? `- ${job.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Code</label>
                    <input
                      type="text"
                      value={addForm.jobCode}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[12px] font-semibold text-slate-700 outline-none"
                      placeholder="Auto-filled from job role"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Designation</label>
                    <input
                      type="text"
                      value={addForm.jobTitle}
                      onChange={(e) => handleAddFieldChange("jobTitle", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      placeholder="Editable designation"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manager</label>
                    <select
                      value={addForm.managerUserId}
                      onChange={(e) => handleAddFieldChange("managerUserId", e.target.value)}
                      disabled={String(addForm.role || "").trim().toLowerCase() !== "employee"}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">No Manager</option>
                      {managerOptions.map((mgr) => (
                        <option key={mgr.value} value={mgr.value}>{mgr.label} ({mgr.role})</option>
                      ))}
                    </select>
                    {String(addForm.role || "").trim().toLowerCase() !== "employee" && (
                      <p className="text-[9px] font-medium text-slate-400">Manager can only be assigned for Employee role.</p>
                    )}
                  </div>
                </div>
              </FormSection>
              <FormSection title="Bank Details" icon={FileText}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Annual CTC</label>
                  <input
                    type="number"
                    value={addForm.salaryAmount}
                    onChange={(e) => handleAddFieldChange("salaryAmount", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    placeholder="e.g. 600000"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bank Name</label>
                  <select
                    value={addForm.bankNameSelection}
                    onChange={(e) => handleAddFieldChange("bankNameSelection", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  >
                    <option value="">Select Bank</option>
                    {bankNameOptions.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                    <option value={BANK_NAME_CUSTOM_OPTION}>Other (type below)</option>
                  </select>
                </div>
                {addForm.bankNameSelection === BANK_NAME_CUSTOM_OPTION && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Bank Name</label>
                    <input
                      type="text"
                      value={addForm.bankNameCustom}
                      onChange={(e) => handleAddFieldChange("bankNameCustom", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      placeholder="Enter bank name"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Holder Name</label>
                  <input
                    type="text"
                    value={addForm.accountHolderName}
                    onChange={(e) => handleAddFieldChange("accountHolderName", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Number</label>
                  <input
                    type="text"
                    value={addForm.accountNumber}
                    onChange={(e) => handleAddFieldChange("accountNumber", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">IFSC Code</label>
                  <input
                    type="text"
                    value={addForm.ifscCode}
                    onChange={(e) => handleAddFieldChange("ifscCode", e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    placeholder="HDFC0XXXXXX"
                  />
                  {addFormErrors.ifscCode && <span className="text-[10px] font-medium text-red-500">{addFormErrors.ifscCode}</span>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID Type</label>
                  <select
                    value={addForm.nationalIdType}
                    onChange={(e) => handleAddFieldChange("nationalIdType", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  >
                    <option value="">Select Type</option>
                    {NATIONAL_ID_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID Number</label>
                  <input
                    type="text"
                    value={addForm.nationalIdNumber}
                    onChange={(e) => handleAddFieldChange("nationalIdNumber", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax ID (PAN)</label>
                  <input
                    type="text"
                    value={addForm.taxId}
                    onChange={(e) => handleAddFieldChange("taxId", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Provident Fund / UAN</label>
                  <input
                    type="text"
                    value={addForm.providentFundNumber}
                    onChange={(e) => handleAddFieldChange("providentFundNumber", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
              </div>
              </FormSection>

              <FormSection title="Documents" icon={FileSpreadsheet}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">National ID File</label>
                  <input
                    type="file"
                    onChange={(e) => handleAddFieldChange("identityProof", e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-800 file:font-semibold file:shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Address Proof</label>
                  <input
                    type="file"
                    onChange={(e) => handleAddFieldChange("addressProof", e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-800 file:font-semibold file:shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bank Proof</label>
                  <input
                    type="file"
                    onChange={(e) => handleAddFieldChange("bankProof", e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-800 file:font-semibold file:shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Other Documents</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleAddFieldChange("otherDocuments", Array.from(e.target.files || []))}
                    className="w-full text-[11px] text-slate-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-slate-800 file:font-semibold file:shadow-sm"
                  />
                </div>
              </div>
              </FormSection>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { resetAddForm(); setIsAddModalOpen(false); }}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addFormSubmitting}
                  onClick={() => { void submitAddForm(true); }}
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {addFormSubmitting ? <Loader2 size={14} className="animate-spin" /> : <MailOpen size={14} />}
                  {addFormSubmitting ? "Saving..." : "Save & Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {managingAccessFor && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={() => setManagingAccessFor(null)}>
          <div className="relative w-full max-w-2xl mx-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Shield size={16} /> Access: {managingAccessFor.name}
              </h3>
              <button onClick={() => setManagingAccessFor(null)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</label>
                  <select value={accessForm.role} onChange={(e) => setAccessForm((p) => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                    {Object.entries(ROLE_LABEL_TO_VALUE).slice(0, 5).map(([label]) => (<option key={label} value={label}>{label}</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                  <select value={accessForm.departments[0] || ""} onChange={(e) => setAccessForm((p) => ({ ...p, departments: [e.target.value] }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                    <option value="">Select Department</option>
                    {availableDepartments.map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
              </div>
              {accessCoreSections.map((section) => (
                <div key={section.key}>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{section.title}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {section.modules.map((mod) => {
                      const isSelected = accessForm.selectedModules.includes(mod.key);
                      return (
                        <label key={mod.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => setAccessForm((p) => ({
                              ...p,
                              selectedModules: e.target.checked ? [...p.selectedModules, mod.key] : p.selectedModules.filter((k) => k !== mod.key),
                            }))}
                            className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                          />
                          <span className="text-[11px] font-semibold text-slate-700">{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={() => setManagingAccessFor(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleSaveAccess} disabled={isSavingAccess} className="px-6 py-2 bg-[#2563EB] text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-1.5">
                {isSavingAccess ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {isSavingAccess ? "Saving..." : "Save Access"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── MODAL: Bulk Upload ─── */}
      {isBulkUploadModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={() => setIsBulkUploadModalOpen(false)}>
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud size={16} /> Bulk Upload Employees
              </h3>
              <button onClick={() => setIsBulkUploadModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!bulkSpreadsheetName ? (
                <>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-[#2563EB] transition-colors cursor-pointer" onClick={() => bulkSpreadsheetInputRef.current?.click()}>
                    <UploadCloud size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-[12px] font-bold text-slate-600 mb-1">Click to upload spreadsheet</p>
                    <p className="text-[10px] text-slate-400">Supports .xlsx, .xls, .csv files</p>
                  </div>
                  <input ref={bulkSpreadsheetInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkFileChange} />
                </>
              ) : bulkImportSummary ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[12px] font-bold text-emerald-800">Import Complete</p>
                    <p className="text-[11px] text-emerald-600 mt-1">{bulkImportSummary.createdCount} created, {bulkImportSummary.skippedCount} skipped</p>
                  </div>
                  {bulkImportSummary.issues.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 max-h-32 overflow-y-auto">
                      {bulkImportSummary.issues.map((issue, i) => (
                        <p key={i} className="text-[10px] font-medium text-amber-700">{issue}</p>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setIsBulkUploadModalOpen(false); setBulkImportSummary(null); }} className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all">
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-slate-700">{bulkSpreadsheetName}</span>
                    <span className="text-[10px] font-medium text-slate-400">{bulkSpreadsheetRows.length} rows</span>
                  </div>
                  {bulkImportError && <p className="text-[11px] font-medium text-red-500">{bulkImportError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => { setBulkSpreadsheetName(""); setBulkSpreadsheetRows([]); }} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all">
                      Change File
                    </button>
                    <button onClick={handleBulkImport} disabled={isBulkImporting || bulkSpreadsheetRows.length === 0} className="flex-1 py-2.5 bg-[#2563EB] text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                      {isBulkImporting ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                      {isBulkImporting ? "Importing..." : `Import ${bulkSpreadsheetRows.length} Rows`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

    </div>
  );
}
