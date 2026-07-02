import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
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
import { getDepartmentModules, getRoleModules } from "@/lib/owner-access";
import {
  createEmployeeRecord, getEmployeeManagementOverview,
  toggleEmployeeStatus as toggleEmployeeStatusRequest,
  updateEmployeeRecord as updateEmployeeRecordRequest,
  updateEmployeeAccess as updateEmployeeAccessRequest,
} from "@/services/hr";
import { createReport } from "@/services/reports";
import { downloadReportFile } from "@/utils/report-download";

/* ───────────────────────────── Types ───────────────────────────── */

interface EmployeeFormState {
  fullName: string; dateOfBirth: string; email: string; phone: string;
  currentAddress: string; emergencyContactName: string; emergencyContactPhone: string;
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
  currentAddress: string; emergencyContactName: string; emergencyContactPhone: string;
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
  userId?: string; source?: string; employeeId?: string; _id?: string;
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
  "HR", "Administration", "Sales", "Marketing", "IT", "Finance",
  "Operations", "Legal", "Design", "Content", "Customer Support",
];

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
  return departments.filter(Boolean).map((d) => String(d).trim()).filter(Boolean);
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
    currentAddress: "", emergencyContactName: "", emergencyContactPhone: "",
    jobTitle: "", jobCode: "", departments: ["HR"], role: "Employee",
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
  const statusKey = normalizeEmployeeStatusKey(String(employee.status || ""));
  const salary = (employee.salaryPackage as Record<string, unknown>) || {};
  const salaryAmount = Number(salary.amount || salary.grossAnnual || 0);
  const name = String(employee.fullName || employee.name || employee.full_name || "");
  const dateOfBirthVal = String(employee.dateOfBirth || employee.dob || "");
  const joiningDateVal = String(employee.joiningDate || employee.joinDate || "");
  return {
    id: String(employee._id || employee.id || employee.employeeId || ""),
    employeeNumber: String(employee.employeeCode || employee.employeeId || employee.employeeNumber || ""),
    name, fullName: name,
    email: String(employee.email || ""),
    phone: String(employee.phone || employee.mobile || ""),
    department: departments[0] || "Pending",
    departments, role, rawRole,
    status: getStatusInfo(statusKey).label,
    statusKey,
    dateOfBirth: dateOfBirthVal, dateOfBirthValue: dateOfBirthVal,
    currentAddress: String(employee.currentAddress || employee.address || ""),
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
    source: String(employee.source || ""),
    employeeId: String(employee.employeeId || employee._id || ""),
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
  const allModuleKeys = getDepartmentModules();
  const matchedDepts = departments.length > 0 ? departments : ["HR"];

  if (role === "Founder" || role === "Super Admin") {
    return [
      {
        key: "all-access", title: "Full Workspace Access",
        modules: allModuleKeys
          .filter((m: { key: string; label: string }) => m && m.key)
          .map((m: { key: string; label: string }) => ({ key: m.key, toggleId: `core_${m.key}`, label: m.label || m.key })),
      },
    ];
  }

  const roleModules = getRoleModules(role);
  const roleModuleKeys = new Set(
    (Array.isArray(roleModules) ? roleModules : [])
      .map((m: string | Record<string, unknown>) => (typeof m === "string" ? m : m?.key || m?.moduleKey || ""))
      .filter(Boolean),
  );

  const grouped: Record<string, { key: string; title: string; modules: Array<{ key: string; toggleId: string; label: string }> }> = {};

  allModuleKeys.forEach((mod: { key: string; label: string }) => {
    if (!mod || !mod.key) return;
    const dept = matchedDepts.find((d) => String(mod.key).toLowerCase().includes(d.toLowerCase())) || "General";
    if (!grouped[dept]) {
      const deptName = dept.charAt(0).toUpperCase() + dept.slice(1);
      grouped[dept] = { key: dept, title: `${deptName} Modules`, modules: [] };
    }
    const isRoleModule = roleModuleKeys.has(mod.key) || roleModuleKeys.has(`module:${mod.key}`);
    grouped[dept].modules.push({
      key: mod.key,
      toggleId: `core_${mod.key}`,
      label: mod.label || mod.key,
    });
  });

  return Object.values(grouped).filter((s) => s.modules.length > 0);
}

function buildEmployeeReportRows(employee: Record<string, unknown>): Array<{ label: string; value: string }> {
  return [
    { label: "Employee ID", value: String(employee.employeeNumber || employee.employeeId || "-") },
    { label: "Full Name", value: String((employee.fullName || employee.name || "") as string) },
    { label: "Email", value: String(employee.email || "-") },
    { label: "Phone", value: String(employee.phone || "-") },
    { label: "Department", value: String(((employee.departments || employee.departmentNames || []) as string[]).join(", ") || "-") },
    { label: "Role", value: String(employee.role || employee.workspaceRole || "-") },
    { label: "Job Title", value: String(employee.jobTitle || employee.title || "-") },
    { label: "Employment Type", value: String(employee.employmentType || "-") },
    { label: "Work Mode", value: String(employee.workMode || "-") },
    { label: "Work Location", value: String(employee.workLocation || "-") },
    { label: "Joining Date", value: String(employee.joiningDate || "-") },
    { label: "Date of Birth", value: String(employee.dateOfBirth || employee.dob || "-") },
    { label: "Current Address", value: String(employee.currentAddress || employee.address || "-") },
    { label: "Manager", value: String(employee.managerName || "-") },
    { label: "Salary Package", value: String(employee.salaryLabel || "-") },
    { label: "Bank Name", value: String(employee.bankName || "-") },
    { label: "Account Number", value: String(employee.accountNumber || "-") },
    { label: "IFSC Code", value: String(employee.ifscCode || "-") },
    { label: "National ID Number", value: String(employee.nationalIdNumber || employee.taxId || "-") },
    { label: "Provident Fund / UAN", value: String(employee.providentFundNumber || "-") },
    { label: "Status", value: String(employee.status || "-") },
    { label: "Last Login", value: String(employee.lastLogin || "-") },
  ];
}

/* ──────────────────── Inline Form Section Component ──────────────────── */

function FormSection({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Icon size={16} />
          </div>
          <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">{title}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>
      {open && <div className="p-5 border-t border-slate-100">{children}</div>}
    </div>
  );
}

/* ──────────────────── Main Component ──────────────────── */

export default function HREmployeeManagementPage(): React.ReactElement {
  const isMountedRef = useRef(true);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transferredEmployees, setTransferredEmployees] = useState<Employee[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(DEFAULT_DEPARTMENT_OPTIONS);
  const [jobTitleOptions, setJobTitleOptions] = useState<JobTitleOption[]>([]);
  const [bankNameOptions, setBankNameOptions] = useState<string[]>(() => mergeBankNameOptions());
  const [bankBranchOptions, setBankBranchOptions] = useState<BankBranchOption[]>(() => mergeBankBranchOptions());

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
      setJobTitleOptions((overview.jobTitleOptions as JobTitleOption[]) || []);
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

  const [inviteForm, setInviteForm] = useState<EmployeeFormState>(() => createEmployeeFormState());
  const [editForm, setEditForm] = useState<EmployeeFormState>(() => createEmployeeFormState());


  /* ───────────────────── Inline Add Employee Form State ───────────────────── */

  const [addForm, setAddForm] = useState<EmployeeFormState>(() => createEmployeeFormState());
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [addFormSubmitting, setAddFormSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(() => new URLSearchParams(window.location.search).get("mode") === "add");
  const setShowAddFormWithUrl = (show: boolean) => {
    setShowAddForm(show);
    const p = window.location.pathname;
    window.history.replaceState(null, "", show ? `${p}?mode=add` : p);
  };

  const resetAddForm = () => {
    setAddForm(createEmployeeFormState());
    setAddFormErrors({});
  };

  const validateAddForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!addForm.fullName.trim()) errors.fullName = "Full name is required";
    if (!addForm.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) errors.email = "Invalid email format";
    if (!addForm.phone.trim()) errors.phone = "Phone is required";
    if (!addForm.joiningDate.trim()) errors.joiningDate = "Joining date is required";
    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddForm()) { toast.error("Please fix the form errors"); return; }
    setAddFormSubmitting(true);
    try {
      const payload = buildEmployeeRecordPayload(addForm, addForm.departments, { status: "invite_sent" });
      const response = await createEmployeeRecord(payload);
      if (response?.success) {
        toast.success("Employee created & invite sent");
        resetAddForm();
        setShowAddForm(false);
        loadEmployees({ silent: true });
      } else {
        toast.error(response?.message || "Failed to create employee");
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to create employee");
    } finally {
      setAddFormSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const reportRows = visibleEmployees.map((emp) => ({
        label: emp.name || emp.email,
        value: `ID: ${emp.employeeNumber} | Email: ${emp.email} | Dept: ${emp.department} | Role: ${emp.role} | Status: ${emp.status}`,
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
        value: `ID: ${emp.employeeNumber} | Email: ${emp.email} | Dept: ${emp.department} | Role: ${emp.role} | Status: ${emp.status}`,
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
    setAddForm((prev) => ({ ...prev, [field]: value }));
    if (addFormErrors[field]) setAddFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleAddRoleChange = (newRole: string) => {
    setAddForm((prev) => ({
      ...prev,
      role: newRole,
      departments: syncInviteDepartmentDefaults(newRole, prev.departments),
      workMode: newRole === "Super Admin" || newRole === "Founder" ? "hybrid" : prev.workMode,
    }));
  };

  const handleAddDepartmentToggle = (department: string, isChecked: boolean) => {
    setAddForm((prev) => {
      if (prev.role === "Super Admin" || prev.role === "Founder") {
        return { ...prev, departments: filterValidDepartments(allDepartments) };
      }
      if (prev.role === "Admin") {
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

  const syncInviteDepartmentDefaults = (role: string, previousDepartments: string[] = []) => {
    if (role === "Super Admin" || role === "Founder") return [...allDepartments];
    if (role === "Admin") {
      const preferred = filterValidDepartments(previousDepartments);
      return preferred.length >= 2 ? Array.from(new Set(preferred)) : allDepartments.slice(0, 2);
    }
    return filterValidDepartments(previousDepartments);
  };

  const syncEditDepartmentDefaults = (role: string, previousDepartments: string[] = []) => {
    if (role === "Super Admin" || role === "Founder") return filterValidDepartments(allDepartments);
    if (role === "Admin") {
      const preferred = filterValidDepartments(previousDepartments);
      return preferred.length >= 2 ? Array.from(new Set(preferred)) : filterValidDepartments(allDepartments).slice(0, 2);
    }
    return filterValidDepartments(previousDepartments);
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
      departments: syncInviteDepartmentDefaults(newRole, prev.departments),
      workMode: newRole === "Super Admin" || newRole === "Founder" ? "hybrid" : prev.workMode,
    }));
  };

  const handleInviteDepartmentToggle = (department: string, isChecked: boolean) => {
    setInviteForm((prev) => {
      if (prev.role === "Super Admin" || prev.role === "Founder") {
        return { ...prev, departments: filterValidDepartments(allDepartments) };
      }
      if (prev.role === "Admin") {
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
    setEditForm({
      fullName: employee.fullName || employee.name, dateOfBirth: employee.dateOfBirthValue,
      email: employee.email, phone: employee.phone,
      currentAddress: employee.currentAddress,
      emergencyContactName: employee.emergencyContactName,
      emergencyContactPhone: employee.emergencyContactPhone,
      jobTitle: employee.jobTitle, jobCode: employee.jobCode,
      departments: employee.departments.length > 0 ? employee.departments : ["HR"],
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
      departments: syncEditDepartmentDefaults(newRole, prev.departments),
      workMode: newRole === "Super Admin" || newRole === "Founder" ? "hybrid" : prev.workMode,
    }));
  };

  const handleEditDepartmentToggle = (department: string, isChecked: boolean) => {
    setEditForm((prev) => {
      if (prev.role === "Super Admin" || prev.role === "Founder") {
        const nextDepts = syncEditDepartmentDefaults("Super Admin", prev.departments);
        const allSelected = department && nextDepts.includes(department) ? nextDepts : [...nextDepts, department];
        return { ...prev, departments: [...new Set(allSelected)] };
      }
      if (prev.role === "Admin") {
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
    try {
      const selectedDepartments = editForm.role === "Super Admin" || editForm.role === "Founder" ? [...allDepartments] : editForm.departments;
      const payload = buildEmployeeRecordPayload(editForm, selectedDepartments, { status: editingEmployee.statusKey });
      const response = await updateEmployeeRecordRequest(editingEmployee.id, payload);
      if (response?.success) {
        toast.success("Employee updated");
        setIsEditModalOpen(false);
        setEditingEmployee(null);
        loadEmployees({ silent: true });
      } else {
        toast.error(response?.message || "Failed to update employee");
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to update employee");
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
        const departmentsRaw = String(row.departments || row.department || row.Department || row.Departments || "HR");
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
    role: "Employee", departments: ["HR"], selectedModules: [],
  });

  const accessCoreSections = useMemo(
    () => getRoleCoreSectionsForEmployeeAccess(accessForm.role, accessForm.departments),
    [accessForm.role, accessForm.departments],
  );

  const handleOpenAccessPanel = (employee: Employee) => {
    setManagingAccessFor(employee);
    setAccessForm({
      role: employee.role || "Employee",
      departments: employee.departments.length > 0 ? employee.departments : ["HR"],
      selectedModules: employee.permissions?.modules || [],
    });
  };

  const handleSaveAccess = async () => {
    if (!managingAccessFor) return;
    setIsSavingAccess(true);
    try {
      const response = await updateEmployeeAccessRequest(managingAccessFor.id, {
        role: mapRoleLabelToValue(accessForm.role),
        departmentNames: accessForm.departments,
        grantedModules: accessForm.selectedModules,
      });
      if (response?.success) {
        toast.success("Access updated");
        setManagingAccessFor(null);
        loadEmployees({ silent: true });
      } else {
        toast.error(response?.message || "Failed to update access");
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to update access");
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
        (e.employeeNumber?.toLowerCase() || "").includes(q),
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
    if (!Array.isArray(jobTitleOptions) || jobTitleOptions.length === 0) return [];
    const normalizedDepts = selectedDepartments.map((d) => String(d || "").trim()).filter(Boolean);
    if (normalizedDepts.length === 0) return jobTitleOptions;
    return jobTitleOptions.filter((o) => {
      const optDept = String(o?.department || "").trim();
      return !optDept || normalizedDepts.includes(optDept);
    });
  };

  const inviteJobTitleSuggestions = useMemo(
    () => getJobTitleSuggestions(inviteForm.departments),
    [jobTitleOptions, inviteForm.departments],
  );

  const addFormJobTitleSuggestions = useMemo(
    () => getJobTitleSuggestions(addForm.departments),
    [jobTitleOptions, addForm.departments],
  );

  const editJobTitleSuggestions = useMemo(
    () => getJobTitleSuggestions(editForm.departments),
    [jobTitleOptions, editForm.departments],
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
      if (prev.jobCode === currentOption.jobCode && prev.jobTitle === currentOption.title) return prev;
      const intMode = ["intern", "trainee"].includes(String(currentOption.employmentType || "").toLowerCase());
      return {
        ...prev, jobCode: currentOption.jobCode || "",
        jobTitle: currentOption.title || "",
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
      if (prev.jobCode === currentOption.jobCode && prev.jobTitle === currentOption.title) return prev;
      const intMode = ["intern", "trainee"].includes(String(currentOption.employmentType || "").toLowerCase());
      return {
        ...prev, jobCode: currentOption.jobCode || "",
        jobTitle: currentOption.title || "",
        employmentType: currentOption.employmentType || prev.employmentType,
        internshipDurationMonths: intMode ? String(currentOption.internshipDurationMonths || prev.internshipDurationMonths || "6") : prev.internshipDurationMonths,
        internshipIsUnpaid: intMode ? currentOption.isPaid === false : false,
        internshipEndDate: intMode ? calculateInternshipEndDate(prev.joiningDate, intMode ? String(currentOption.internshipDurationMonths || prev.internshipDurationMonths || "6") : prev.internshipDurationMonths) : "",
      };
    });
  }, [editJobTitleSuggestions, editForm.jobCode, isEditModalOpen]);

  const buildEmployeeRecordPayload = (form: EmployeeFormState, selectedDepartments: string[], options: Record<string, unknown> = {}): Record<string, unknown> => {
    const internshipEndDate = form.internshipEndDate || calculateInternshipEndDate(form.joiningDate, form.internshipDurationMonths);
    const internshipIsUnpaid = isInternshipEmploymentType(form.employmentType) && Boolean(form.internshipIsUnpaid);
    const requiresCompensation = !isInternshipEmploymentType(form.employmentType) || !internshipIsUnpaid;
    const status = normalizeEmployeeStatusKey(String(options.status || "invite_sent"));
    return {
      employeeId: String(form.employeeId || "").trim(),
      fullName: form.fullName, dateOfBirth: form.dateOfBirth || null,
      email: form.email, phone: form.phone, currentAddress: form.currentAddress,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      jobTitle: form.jobTitle, jobCode: form.jobCode,
      departmentNames: selectedDepartments, workspaceRole: mapRoleLabelToValue(form.role),
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
      ifscCode: requiresCompensation ? form.ifscCode : "",
      status,
    };
  };

  const getStatusBadge = (status: string) => {
    const info = getStatusInfo(status);
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${info.color}`}>
        {status === "active" && <UserCheck size={12} />}
        {status === "inactive" && <UserX size={12} />}
        {status === "terminated" && <Ban size={12} />}
        {status === "pending" && <Clock size={12} />}
        {status === "invite_sent" && <Mail size={12} />}
        {status === "registered" && <UserCheck size={12} />}
        {status === "probation" && <AlertCircle size={12} />}
        {info.label}
      </span>
    );
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</label>
                      <select
                        value={addForm.role}
                        onChange={(e) => handleAddRoleChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      >
                        {Object.entries(ROLE_LABEL_TO_VALUE).map(([label]) => (
                          <option key={label} value={label}>{label}</option>
                        ))}
                      </select>
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
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      >
                        <option value="">No Manager</option>
                        {managerOptions.map((mgr) => (
                          <option key={mgr.value} value={mgr.value}>{mgr.label} ({mgr.role})</option>
                        ))}
                      </select>
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Departments</label>
                    <select
                      value={addForm.departments[0] || ""}
                      onChange={(e) => handleAddDepartmentToggle(e.target.value, true)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      <option value="">Select Department</option>
                    </select>
                    <p className="text-[9px] font-medium text-slate-400 mt-1">Department options will be loaded from API.</p>
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
                    {addFormSubmitting ? "Saving..." : "Create Employee"}
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
                      onClick={() => { setShowAddForm(true); resetAddForm(); }}
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
                        <th className="px-5 py-4 text-left">Last Login</th>
                        <th className="px-5 py-4 text-right">Actions</th>
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
                                <span className="font-bold text-slate-800 text-[12px]">{emp.employeeNumber || emp.id}</span>
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
                              <td className="px-5 py-4">
                                <span className="text-[10px] font-medium text-slate-400">{emp.lastLogin}</span>
                              </td>
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
                                  {!isAccessActionLocked && (
                                    <button
                                      onClick={() => handleOpenAccessPanel(emp)}
                                      className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-all"
                                      title="Access"
                                    >
                                      <Shield size={14} strokeWidth={2.5} />
                                    </button>
                                  )}
                                </div>
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
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={() => { setIsEditModalOpen(false); setEditingEmployee(null); }}>
          <div className="relative w-full max-w-3xl mx-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Edit3 size={16} /> Edit: {editingEmployee.name}
              </h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingEmployee(null); }} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
              {/* Basic */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input type="text" value={editForm.fullName} onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone</label>
                  <input type="tel" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</label>
                  <select value={editForm.role} onChange={(e) => handleEditRoleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                    {Object.entries(ROLE_LABEL_TO_VALUE).map(([label]) => (<option key={label} value={label}>{label}</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employment Type</label>
                  <select value={editForm.employmentType} onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, employmentType: v, internshipIsUnpaid: isInternshipEmploymentType(v) ? p.internshipIsUnpaid : false })); }} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                    {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Work Mode</label>
                  <select value={editForm.workMode} onChange={(e) => setEditForm((p) => ({ ...p, workMode: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                    {WORK_MODE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joining Date</label>
                  <input type="date" value={editForm.joiningDate} onChange={(e) => setEditForm((p) => ({ ...p, joiningDate: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Salary (Annual CTC)</label>
                  <input type="number" value={editForm.salaryAmount} onChange={(e) => setEditForm((p) => ({ ...p, salaryAmount: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
              </div>

              {/* Departments */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Departments</label>
                <div className="flex flex-wrap gap-2">
                  {allDepartments.map((dept) => {
                    const isSelected = editForm.departments.includes(dept);
                    return (
                      <button key={dept} type="button" onClick={() => handleEditDepartmentToggle(dept, !isSelected)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isSelected ? "bg-[#2563EB] text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={() => { setIsEditModalOpen(false); setEditingEmployee(null); }} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleSaveEdit} className="px-6 py-2 bg-[#2563EB] text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center gap-1.5">
                <Save size={13} /> Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── MODAL: Access Control Panel ─── */}
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
                  <select value={accessForm.departments[0] || "HR"} onChange={(e) => setAccessForm((p) => ({ ...p, departments: [e.target.value] }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
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
