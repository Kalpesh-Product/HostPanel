import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Eye,
  Layers,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  UserCheck,
  UserMinus,
  X,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createReport } from "@/services/reports";
import { HRResignationManagementSkeleton } from "@/components/ui/Skeleton";
import { getStoredUser, normalizeUserRole } from "@/lib/auth-session";
import {
  completeResignationRequest,
  extendResignationNotice,
  getResignationRequests,
  reviewResignationRequest,
  updateResignationChecklist,
} from "@/services/resignation-management";
import { downloadReportFile } from "@/utils/report-download";
import PageFrame from "@/components/Pages/PageFrame";
import ResignationManagementSettingsPanel from "./ResignationManagementSettingsPanel";
import { statusPillClass } from "@/lib/status-pill";

/* ───────────────────────────── Types ───────────────────────────── */

interface ChecklistItem {
  key?: string;
  label?: string;
  description?: string;
  completed?: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

interface NoticeExtension {
  previousNoticeEndAt?: string;
  newNoticeEndAt?: string;
  extendedBy?: string;
  extendedAt?: string;
}

interface ResignationRequest {
  id?: string;
  recordId?: string;
  employeeName?: string;
  employeeId?: string;
  email?: string;
  department?: string;
  requesterRole?: string;
  role?: string;
  exitCode?: string;
  status?: string;
  statusLabel?: string;
  reason?: string;
  rejectionReason?: string;
  completionNotes?: string;
  checklist?: ChecklistItem[];
  checklistProgress?: number;
  completedChecklistCount?: number;
  totalChecklistCount?: number;
  canComplete?: boolean;
  requestedDocuments?: string[];
  createdAt?: string;
  updatedAt?: string;
  joiningDate?: string;
  noticePeriodDays?: number;
  requestedNoticeStartDate?: string;
  expectedLastWorkingDate?: string;
  noticeStartDate?: string;
  noticeEndDate?: string;
  noticeEndAt?: string;
  noticeExtensions?: NoticeExtension[];
  approvedBy?: string;
  rejectedBy?: string;
  completedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
}

interface ResignationManagementOverview {
  exitRequests: ResignationRequest[];
  pendingRequests: ResignationRequest[];
  activeNoticeRequests: ResignationRequest[];
  historyRequests: ResignationRequest[];
  rejectedRequests: ResignationRequest[];
  completedRequests: ResignationRequest[];
  summary: {
    pendingCount: number;
    activeNoticeCount: number;
    rejectedCount: number;
    completedCount: number;
    totalCount: number;
  };
  departments: string[];
  canManage: boolean;
}

interface ManagerProfile {
  name: string;
  role: string;
}

/* ───────────────────────────── Constants ───────────────────────────── */

const FALLBACK_DEPARTMENTS = ["HR", "Administration", "Finance", "Sales", "Tech", "IT", "Maintenance"];

const STATUS_PILLS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "completed", label: "Completed" },
];

const defaultOverview: ResignationManagementOverview = {
  exitRequests: [],
  pendingRequests: [],
  activeNoticeRequests: [],
  historyRequests: [],
  rejectedRequests: [],
  completedRequests: [],
  summary: {
    pendingCount: 0,
    activeNoticeCount: 0,
    rejectedCount: 0,
    completedCount: 0,
    totalCount: 0,
  },
  departments: [],
  canManage: true,
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function formatDateLabel(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(String(value).slice(0, 10));
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function nextDayDateString(value?: string | Date | null): string {
  const raw = value ? String(value).slice(0, 10) : "";
  const date = raw && !isNaN(new Date(`${raw}T00:00:00`).getTime())
    ? new Date(`${raw}T00:00:00`)
    : new Date();
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

function formatStatusLabel(value?: string): string {
  const status = String(value || "pending").trim().toLowerCase();
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "completed") return "Completed";
  return "Pending";
}

function isMatchDepartment(requestDepartment?: string, filterDepartment?: string): boolean {
  if (filterDepartment === "All Departments") return true;
  const left = String(requestDepartment || "").trim().toLowerCase();
  const right = String(filterDepartment || "").trim().toLowerCase();
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function isMatchStatus(requestStatus?: string, filterStatus?: string): boolean {
  if (!filterStatus || filterStatus === "all") return true;
  return String(requestStatus || "pending").trim().toLowerCase() === String(filterStatus).trim().toLowerCase();
}

function isSameMonth(value?: string | Date, reference = new Date()): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(String(value).slice(0, 10));
  if (isNaN(date.getTime())) return false;
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

function isWithinLastDays(value?: string | Date, days = 30): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(String(value).slice(0, 10));
  if (isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function isMatchSearch(request: ResignationRequest, query: string): boolean {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return true;
  return [request.employeeName, request.employeeId, request.department, request.exitCode, request.reason]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

function getStatusBadge(status?: string): React.ReactElement {
  const label = formatStatusLabel(status);
  return <span className={statusPillClass(label)}>{label}</span>;
}

function buildResignationExportRows(
  records: ResignationRequest[] = [],
  scopeLabel = "",
  departmentLabel = "",
  searchLabel = "",
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Report Scope", value: scopeLabel || "Resignation Management" },
    { label: "Department Filter", value: departmentLabel || "All Departments" },
    { label: "Search Filter", value: searchLabel || "All" },
    { label: "Record Count", value: String(records.length) },
  ];
  records.forEach((record, index) => {
    rows.push({
      label: `${index + 1}. ${record.employeeName || "Employee"}`,
      value: [
        record.exitCode ? `Code: ${record.exitCode}` : "",
        `Status: ${record.statusLabel || formatStatusLabel(record.status)}`,
        `Dept: ${record.department || "General"}`,
        record.noticeStartDate || record.noticeEndDate ? `Notice: ${record.noticeStartDate || "-"} to ${record.noticeEndDate || "-"}` : "",
        record.reason ? `Reason: ${record.reason}` : "",
        typeof record.checklistProgress === "number" ? `Checklist: ${record.checklistProgress}%` : "",
        record.approvedBy ? `Approved by: ${record.approvedBy}` : "",
        record.rejectedBy ? `Rejected by: ${record.rejectedBy}` : "",
        record.completedBy ? `Completed by: ${record.completedBy}` : "",
      ].filter(Boolean).join(" | "),
    });
  });
  return rows;
}

function buildResignationRequestExportRows(request: ResignationRequest): Array<{ label: string; value: string }> {
  const checklist = Array.isArray(request.checklist) ? request.checklist : [];
  const rows: Array<{ label: string; value: string }> = [
    { label: "Employee Name", value: request.employeeName || "Employee" },
    { label: "Employee ID", value: request.employeeId || "-" },
    { label: "Department", value: request.department || "General" },
    { label: "Role", value: request.requesterRole || "Employee" },
    { label: "Report Scope", value: "Individual Resignation Request" },
    { label: "Resignation Code", value: request.exitCode || "-" },
    { label: "Status", value: request.statusLabel || formatStatusLabel(request.status) },
    { label: "Applied Date", value: formatDateLabel(request.createdAt) },
    { label: "Joining Date", value: formatDateLabel(request.joiningDate) },
    { label: "Notice Period", value: `${request.noticePeriodDays || 0} Days` },
    { label: "Notice Start", value: request.noticeStartDate ? formatDateLabel(request.noticeStartDate) : "-" },
    { label: "Notice End", value: request.noticeEndDate ? formatDateLabel(request.noticeEndDate) : "-" },
    { label: "Checklist Progress", value: `${request.checklistProgress || 0}% (${request.completedChecklistCount || 0}/${request.totalChecklistCount || 0})` },
    { label: "Reason", value: request.reason || "-" },
    { label: "Requested Documents", value: Array.isArray(request.requestedDocuments) && request.requestedDocuments.length > 0 ? request.requestedDocuments.join(", ") : "None" },
    { label: "Processed By", value: request.approvedBy || request.rejectedBy || request.completedBy || "Awaiting action" },
    { label: "Rejection Reason", value: request.rejectionReason || "-" },
    { label: "Completion Notes", value: request.completionNotes || "-" },
  ];
  checklist.forEach((item, index) => {
    rows.push({
      label: `${index + 1}. ${item.label || "Checklist Item"}`,
      value: [
        item.completed ? "Completed" : "Pending",
        item.completedAt ? `Completed On: ${formatDateLabel(item.completedAt)}` : "",
        item.completedBy ? `Completed By: ${item.completedBy}` : "",
        item.notes ? `Notes: ${item.notes}` : "",
      ].filter(Boolean).join(" | "),
    });
  });
  return rows;
}

/* ──────────────────────────────────────────────────────────────── */
/*  Main Page Component                                              */
/* ──────────────────────────────────────────────────────────────── */

export function HRResignationManagementPage() {
  const currentUser = getStoredUser();
  const managerProfile: ManagerProfile = {
    name: currentUser?.fullName || currentUser?.firstName || "HR Manager",
    role: normalizeUserRole(currentUser?.workspaceMembership?.role || currentUser?.role || "hr-manager"),
  };
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState("");
  const [overview, setOverview] = useState<ResignationManagementOverview>(defaultOverview);
  const [activeTab, setActiveTab] = useState("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingRequest, setViewingRequest] = useState<ResignationRequest | null>(null);
  const [managingResignation, setManagingResignation] = useState<ResignationRequest | null>(null);
  const [draftChecklist, setDraftChecklist] = useState<ChecklistItem[]>([]);
  const [extendNoticeDate, setExtendNoticeDate] = useState("");
  const [isExtendingNotice, setIsExtendingNotice] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<ResignationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSavingDecision, setIsSavingDecision] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const response = await getResignationRequests();
      const data = response?.data || response || {};
      setOverview({ ...defaultOverview, ...data });
    } catch (error: any) {
      toast.error(error.message || "Unable to load resignation management data.");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      try {
        await loadOverview();
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [loadOverview]);

  const allDepartments = useMemo(() => {
    const depts = [
      ...FALLBACK_DEPARTMENTS,
      ...(Array.isArray(overview.departments) ? overview.departments : []),
    ].filter(Boolean).map((d) => String(d).trim()).filter(Boolean);
    return ["All Departments", ...Array.from(new Set(depts))];
  }, [overview.departments]);

  const filteredRequests = useMemo(() => {
    return (Array.isArray(overview.pendingRequests) ? overview.pendingRequests : []).filter((r) =>
      isMatchDepartment(r.department, departmentFilter) &&
      isMatchStatus(r.status, statusFilter) &&
      isMatchSearch(r, searchQuery)
    );
  }, [overview.pendingRequests, departmentFilter, statusFilter, searchQuery]);

  const filteredNotice = useMemo(() => {
    return (Array.isArray(overview.activeNoticeRequests) ? overview.activeNoticeRequests : []).filter((r) =>
      isMatchDepartment(r.department, departmentFilter) &&
      isMatchStatus(r.status, statusFilter) &&
      isMatchSearch(r, searchQuery)
    );
  }, [overview.activeNoticeRequests, departmentFilter, statusFilter, searchQuery]);

  const filteredHistory = useMemo(() => {
    return (Array.isArray(overview.historyRequests) ? overview.historyRequests : []).filter((r) =>
      isMatchDepartment(r.department, departmentFilter) &&
      isMatchStatus(r.status, statusFilter) &&
      isMatchSearch(r, searchQuery)
    );
  }, [overview.historyRequests, departmentFilter, statusFilter, searchQuery]);

  const activeReportRows = useMemo(() => {
    if (activeTab === "notice") return filteredNotice;
    if (activeTab === "history") return filteredHistory;
    return filteredRequests;
  }, [activeTab, filteredRequests, filteredNotice, filteredHistory]);

  const activeReportScopeLabel = useMemo(() => {
    if (activeTab === "notice") return "Active Notice Periods";
    if (activeTab === "history") return "Resignation History";
    return "Resignation Requests Queue";
  }, [activeTab]);

  function openRequestDetails(request: ResignationRequest) {
    setViewingRequest(request);
  }

  function openManageChecklist(request: ResignationRequest) {
    setDraftChecklist((request.checklist || []).map((item) => ({ ...item })));
    setExtendNoticeDate(nextDayDateString(request.noticeEndAt));
    setManagingResignation(request);
    setViewingRequest(null);
  }

  async function refreshData() {
    setIsRefreshing(true);
    try {
      await loadOverview();
      toast.success("Resignation management refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleExportReport(format = "PDF") {
    const reportFormat = String(format).toLowerCase() === "excel" ? "Excel" : "PDF";
    if (!activeReportRows.length) {
      toast.error("There are no resignation records to export.");
      return;
    }
    setIsExportingReport(reportFormat);
    const deptLabel = departmentFilter || "All Departments";
    const reportTitle = `${managerProfile.name} - ${activeReportScopeLabel}`;
    const description = `${activeReportScopeLabel} for ${deptLabel}${searchQuery ? ` filtered by ${searchQuery}` : ""}.`;
    try {
      const response = await createReport({
        title: reportTitle,
        department: deptLabel === "All Departments" ? "HR" : deptLabel,
        category: "Other",
        dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: activeReportScopeLabel,
        generatedBy: managerProfile.name,
        format: reportFormat,
        description,
        sourceType: "custom",
        sourceRef: `exit-management-${activeTab}`,
        reportRows: buildResignationExportRows(activeReportRows, activeReportScopeLabel, deptLabel, searchQuery),
        monthlyData: [],
      });
      if (reportFormat === "PDF") {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }
      const createdReportId = response?.data?.report?.recordId;
      toast.success(reportFormat === "PDF" ? "Resignation report saved to Reports." : "Resignation report saved to Reports. Preview it before downloading.");
      navigate(createdReportId ? `/dashboard/hr/report?reportId=${createdReportId}` : "/dashboard/hr/report");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create resignation report.");
    } finally {
      setIsExportingReport("");
    }
  }

  async function handleExportRequestReport(request: ResignationRequest | null, format = "PDF") {
    if (!request) return;
    const reportFormat = String(format).toLowerCase() === "excel" ? "Excel" : "PDF";
    const reportTitle = `${request.employeeName || "Employee"} Resignation Report`;
    const deptLabel = request.department || "HR";
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: reportTitle,
        department: deptLabel === "General" ? "HR" : deptLabel,
        category: "Employee",
        dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: "Individual Resignation Request",
        generatedBy: managerProfile.name,
        format: reportFormat,
        description: `${request.employeeName || "Employee"} individual resignation request report.`,
        sourceType: "custom",
        sourceRef: String(request.exitCode || request.recordId || request.id || "").trim(),
        reportRows: buildResignationRequestExportRows(request),
        monthlyData: [],
      });
      if (reportFormat === "PDF") {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }
      const createdReportId = response?.data?.report?.recordId;
      toast.success(reportFormat === "PDF" ? "Resignation request report saved to Reports." : "Resignation request report saved to Reports. Preview it before downloading.");
      navigate(createdReportId ? `/dashboard/hr/report?reportId=${createdReportId}` : "/dashboard/hr/report");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create resignation request report.");
    } finally {
      setIsExportingReport("");
    }
  }

  async function handleApproveRequest(request: ResignationRequest) {
    setIsSavingDecision(true);
    try {
      const response = await reviewResignationRequest(request.id || "", { status: "approved" });
      const updatedRequest: ResignationRequest | null = response?.exitRequest || null;
      setViewingRequest(null);
      if (updatedRequest) {
        setActiveTab("notice");
        setDraftChecklist((updatedRequest.checklist || []).map((item) => ({ ...item })));
        setExtendNoticeDate(nextDayDateString(updatedRequest.noticeEndAt));
        setManagingResignation(updatedRequest);
      }
      await loadOverview();
      toast.success("Resignation request approved. Notice period started.");
    } catch (error: any) {
      toast.error(error.message || "Unable to approve resignation request.");
    } finally {
      setIsSavingDecision(false);
    }
  }

  async function handleRejectSubmit() {
    if (!rejectingRequest || !rejectReason.trim()) return;
    setIsSavingDecision(true);
    try {
      const response = await reviewResignationRequest(rejectingRequest.id || "", {
        status: "rejected",
        rejectionReason: rejectReason,
      });
      const updatedRequest: ResignationRequest | null = response?.exitRequest || null;
      if (updatedRequest) setViewingRequest(updatedRequest);
      setRejectingRequest(null);
      setRejectReason("");
      await loadOverview();
      toast.success("Resignation request rejected.");
    } catch (error: any) {
      toast.error(error.message || "Unable to reject resignation request.");
    } finally {
      setIsSavingDecision(false);
    }
  }

  function handleToggleChecklist(itemKey: string) {
    setDraftChecklist((current) =>
      current.map((item) =>
        item.key === itemKey ? { ...item, completed: !item.completed } : item,
      ),
    );
  }

  async function handleSaveChecklist() {
    if (!managingResignation) return;
    const committedItems = managingResignation.checklist || [];
    const changes = draftChecklist
      .map((draft) => {
        const committed = committedItems.find((item) => item.key === draft.key);
        if (!committed) return null;
        const completedChanged = Boolean(committed.completed) !== Boolean(draft.completed);
        const notesChanged = String(committed.notes || "") !== String(draft.notes || "");
        if (!completedChanged && !notesChanged) return null;
        return { itemKey: draft.key || "", completed: Boolean(draft.completed), notes: draft.notes || "" };
      })
      .filter((change): change is { itemKey: string; completed: boolean; notes: string } => Boolean(change));
    if (!changes.length) {
      setManagingResignation(null);
      setDraftChecklist([]);
      setExtendNoticeDate("");
      return;
    }
    setIsSavingDecision(true);
    try {
      const response = await updateResignationChecklist(managingResignation.id || "", { checklist: changes });
      const updatedRequest: ResignationRequest | null = response?.exitRequest || null;
      if (updatedRequest) setManagingResignation(updatedRequest);
      await loadOverview();
      setDraftChecklist([]);
      setExtendNoticeDate("");
      setManagingResignation(null);
      toast.success("Checklist progress saved.");
    } catch (error: any) {
      toast.error(error.message || "Unable to save checklist changes.");
    } finally {
      setIsSavingDecision(false);
    }
  }

  async function handleExtendNotice() {
    if (!managingResignation || !extendNoticeDate) return;
    setIsExtendingNotice(true);
    try {
      const response = await extendResignationNotice(managingResignation.id || "", { newNoticeEndDate: extendNoticeDate });
      const updatedRequest: ResignationRequest | null = response?.exitRequest || null;
      if (updatedRequest) {
        setManagingResignation(updatedRequest);
        setDraftChecklist((updatedRequest.checklist || []).map((item) => ({ ...item })));
        setExtendNoticeDate(nextDayDateString(updatedRequest.noticeEndAt));
      }
      await loadOverview();
      toast.success("Notice period extended. Employee notified.");
    } catch (error: any) {
      toast.error(error.message || "Unable to extend notice period.");
    } finally {
      setIsExtendingNotice(false);
    }
  }

  async function handleCompleteResignation() {
    if (!managingResignation) return;
    setIsSavingDecision(true);
    try {
      const response = await completeResignationRequest(managingResignation.id || "", {});
      const updatedRequest: ResignationRequest | null = response?.exitRequest || null;
      if (updatedRequest) setManagingResignation(updatedRequest);
      setManagingResignation(null);
      setDraftChecklist([]);
      setExtendNoticeDate("");
      await loadOverview();
      toast.success("Resignation request completed.");
    } catch (error: any) {
      toast.error(error.message || "Unable to complete resignation request.");
    } finally {
      setIsSavingDecision(false);
    }
  }

  const pendingCount = overview.summary?.pendingCount || 0;
  const completedCount = overview.summary?.completedCount || 0;
  const rejectedCount = overview.summary?.rejectedCount || 0;

  const tabStatCards = useMemo(() => {
    const notice = Array.isArray(overview.activeNoticeRequests) ? overview.activeNoticeRequests : [];
    const history = Array.isArray(overview.historyRequests) ? overview.historyRequests : [];
    if (activeTab === "notice") {
      return [
        { label: "Total On Notice", value: notice.length, icon: <Clock size={16} />, color: "", labelClass: "text-slate-400", iconClass: "bg-slate-100 text-slate-500" },
        { label: "In Progress", value: notice.filter((r) => !r.canComplete).length, icon: <CheckSquare size={16} />, color: "border-l-4 border-l-blue-500", labelClass: "text-blue-600", iconClass: "bg-blue-50 text-[#2563EB]" },
        { label: "Ready to Complete", value: notice.filter((r) => r.canComplete).length, icon: <CheckCircle2 size={16} />, color: "border-l-4 border-l-emerald-500", labelClass: "text-emerald-600", iconClass: "bg-emerald-50 text-emerald-500" },
      ];
    }
    if (activeTab === "history") {
      return [
        { label: "Total History", value: history.length, icon: <Archive size={16} />, color: "", labelClass: "text-slate-400", iconClass: "bg-slate-100 text-slate-500" },
        { label: "Completed", value: completedCount, icon: <CheckCircle2 size={16} />, color: "border-l-4 border-l-emerald-500", labelClass: "text-emerald-600", iconClass: "bg-emerald-50 text-emerald-500" },
        { label: "Rejected", value: rejectedCount, icon: <XCircle size={16} />, color: "border-l-4 border-l-red-500", labelClass: "text-red-600", iconClass: "bg-red-50 text-red-500" },
      ];
    }
    const allRequests = Array.isArray(overview.exitRequests) ? overview.exitRequests : [];
    return [
      { label: "Total Requests", value: allRequests.length, icon: <Layers size={16} />, color: "", labelClass: "text-slate-400", iconClass: "bg-slate-100 text-slate-500" },
      { label: "Pending", value: pendingCount, icon: <Clock size={16} />, color: "border-l-4 border-l-amber-500", labelClass: "text-amber-600", iconClass: "bg-amber-50 text-amber-500" },
      { label: "This Month", value: allRequests.filter((r) => isSameMonth(r.createdAt)).length, icon: <Calendar size={16} />, color: "border-l-4 border-l-blue-500", labelClass: "text-blue-600", iconClass: "bg-blue-50 text-[#2563EB]" },
      { label: "Last 30 Days", value: allRequests.filter((r) => isWithinLastDays(r.createdAt)).length, icon: <RefreshCw size={16} />, color: "border-l-4 border-l-emerald-500", labelClass: "text-emerald-600", iconClass: "bg-emerald-50 text-emerald-500" },
    ];
  }, [activeTab, overview.activeNoticeRequests, overview.historyRequests, overview.exitRequests, pendingCount, completedCount, rejectedCount]);

  if (isLoading) {
    return <HRResignationManagementSkeleton />;
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Resignation Management
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">Core Module | Review & manage employee offboarding</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* <button
                type="button"
                onClick={handleExportPDF}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                <FileDown size={16} className="text-red-500"/>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
              </button> */}
              {/* <button
                type="button"
                onClick={handleExportExcel}
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                <FileSpreadsheet size={16} className="text-emerald-500"/>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
              </button> */}
            </div>
          </div>

          {/* ── Main Tabs (pill-style, before stat cards) ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {[
              { key: "requests", label: "Requests" },
              { key: "notice", label: "Active Notice" },
              { key: "history", label: "History" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActiveTab(tab.key); setStatusFilter("all"); }}
                className={`flex-1 px-8 py-2.5 rounded-xl text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Stat Cards (tab-specific, total first) ── */}
          <div className={`grid grid-cols-1 gap-3 mb-3 shrink-0 ${tabStatCards.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            {tabStatCards.map((card) => (
              <div key={card.label} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.color}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] font-pmedium ${card.labelClass} uppercase tracking-widest mb-1`}>{card.label}</p>
                  <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                </div>
                <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>{card.icon}</div>
              </div>
            ))}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Data panel header row: status sub-tabs | filter + search + resignation rules */}
            <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {STATUS_PILLS.map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setStatusFilter(pill.key)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium transition-all ${
                      statusFilter === pill.key
                        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                        : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
              <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap xl:w-auto">
                <select
                  className="min-w-[120px] cursor-pointer appearance-none rounded-lg border border-blue-100 bg-blue-50/50 py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm outline-none hover:bg-blue-50"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  {allDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="relative min-w-[180px] flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search employee, code, or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
                <ResignationManagementSettingsPanel onSaved={loadOverview} />
              </div>
            </div>

            {/* Requests tab */}
            {activeTab === "requests" && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Employee ID</th>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4">Applied Date</th>
                      <th className="px-5 py-4 text-center">Notice Period</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700 whitespace-nowrap">{request.employeeId || "-"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-pmedium text-slate-900">
                            <UserCheck size={14} className="text-slate-400" />
                            <span className="truncate text-[12px] text-slate-800">{request.employeeName}</span>
                          </div>
                          {request.email ? <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{request.email}</p> : null}
                        </td>
                        <td className="px-5 py-4 text-[11px] font-pmedium capitalize text-slate-600 whitespace-nowrap">{request.requesterRole}</td>
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{request.department || "General"}</td>
                        <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700 whitespace-nowrap">{formatDateLabel(request.createdAt)}</td>
                        <td className="px-5 py-4 text-center text-[12px] font-pmedium text-[#2563EB] whitespace-nowrap">{request.noticePeriodDays || 0} Days</td>
                        <td className="px-5 py-4 text-center">{getStatusBadge(request.status)}</td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openRequestDetails(request)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(request)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-all"
                            >
                              <Check size={15} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingRequest(request)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all"
                            >
                              <X size={15} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-20 text-slate-400 font-pmedium">
                          No pending resignation requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Active Notice tab */}
            {activeTab === "notice" && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Employee ID</th>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Department / Role</th>
                      <th className="px-5 py-4">Last Working Date</th>
                      <th className="px-5 py-4">Checklist Progress</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredNotice.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700 whitespace-nowrap">{request.employeeId || "-"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-pmedium text-slate-900">
                            <UserCheck size={14} className="text-slate-400" />
                            <span className="truncate text-[12px] text-slate-800">{request.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{request.department || "General"}</span>
                          <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-400">{request.requesterRole}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-pmedium text-amber-600">
                            <Calendar size={12} /> {formatDateLabel(request.noticeEndAt)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-2 rounded-full transition-all ${request.checklistProgress === 100 ? "bg-emerald-500" : "bg-[#2563EB]"}`}
                                style={{ width: `${request.checklistProgress || 0}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-pmedium text-slate-600 whitespace-nowrap">
                              {request.completedChecklistCount}/{request.totalChecklistCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => openManageChecklist(request)}
                            className={`mx-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-pmedium text-[10px] uppercase tracking-wider transition-all ${
                              request.canComplete
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-blue-50 text-[#2563EB] hover:bg-blue-100"
                            }`}
                          >
                            {request.canComplete ? <CheckCircle2 size={13} /> : <CheckSquare size={13} />}
                            {request.canComplete ? "Complete" : "Manage"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredNotice.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-20 text-slate-400 font-pmedium">
                          No employees currently on notice period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* History tab */}
            {activeTab === "history" && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Employee ID</th>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Department / Role</th>
                      <th className="px-5 py-4">Resignation Date</th>
                      <th className="px-5 py-4">Reason on File</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredHistory.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700 whitespace-nowrap">{request.employeeId || "-"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-pmedium text-slate-900">
                            <UserCheck size={14} className="text-slate-400" />
                            <span className="truncate text-[12px] text-slate-800">{request.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[11px] font-pmedium text-slate-600 whitespace-nowrap">{request.department || "General"}</span>
                          <p className="mt-0.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-400">{request.requesterRole}</p>
                        </td>
                        <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700 whitespace-nowrap">{formatDateLabel(request.completedAt || request.rejectedAt || request.approvedAt)}</td>
                        <td className="px-5 py-4">
                          <p className="max-w-[220px] truncate text-[11px] font-pmedium text-slate-500" title={request.reason}>
                            {request.reason}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">{getStatusBadge(request.status)}</td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => openRequestDetails(request)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                          >
                            <Eye size={15} strokeWidth={2.5} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-20 text-slate-400 font-pmedium">
                          No historical resignation records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PageFrame>

      {/* ── View Request Modal ── */}
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><LogOut size={17} /></div>
                  <div className="min-w-0">
                    <h2 className="text-base font-pmedium text-slate-900">Resignation Request</h2>
                    <p className="mt-0.5 truncate text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{viewingRequest.exitCode || "-"} &bull; {formatStatusLabel(viewingRequest.status)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setViewingRequest(null)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4 sm:p-6 [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="col-span-2">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Employee</p>
                    <p className="mt-1 flex items-center gap-2 text-[12px] font-pmedium text-[#0F172A]">
                      <UserCheck size={14} className="shrink-0 text-slate-400" />
                      {viewingRequest.employeeName || "-"} <span className="text-slate-400">({viewingRequest.employeeId || "-"})</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Department</p>
                    <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{viewingRequest.department || "General"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Role</p>
                    <p className="mt-1 text-[12px] font-pmedium text-[#0F172A]">{viewingRequest.requesterRole || "-"}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-t border-slate-200/70 pt-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Current Status</p>
                    {getStatusBadge(viewingRequest.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="mb-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Applied Date</p>
                    <p className="text-[13px] font-pmedium text-[#0F172A]">{formatDateLabel(viewingRequest.createdAt)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-right">
                    <p className="mb-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Notice Period</p>
                    <p className="text-[13px] font-pmedium text-[#0F172A]">{viewingRequest.noticePeriodDays || 0} Days</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Requested Effective Date</p>
                    <p className="flex items-center gap-2 text-[13px] font-pmedium text-[#0F172A]"><Calendar size={13} className="text-slate-400" /> {formatDateLabel(viewingRequest.requestedNoticeStartDate)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{viewingRequest.status === "pending" ? "Expected Last Working Date" : "Last Working Date"}</p>
                    <p className="flex items-center gap-2 text-[13px] font-pmedium text-[#0F172A]"><Calendar size={13} className="text-[#2563EB]" /> {formatDateLabel(viewingRequest.noticeEndAt || viewingRequest.completedAt || viewingRequest.expectedLastWorkingDate)}</p>
                  </div>
                </div>

                {Array.isArray(viewingRequest.requestedDocuments) && viewingRequest.requestedDocuments.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Requested Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingRequest.requestedDocuments.map((doc) => (
                        <span key={doc} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium text-blue-700">{doc}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-1">Reason</p>
                  <p className="text-[13px] font-pmedium text-slate-700 leading-relaxed">{viewingRequest.reason || "-"}</p>
                </div>

                {viewingRequest.status === "approved" && (
                  <div>
                    <p className="mb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Clearance Checklist</p>
                    <div className="space-y-2">
                      {Array.isArray(viewingRequest.checklist) && viewingRequest.checklist.length > 0 ? (
                        viewingRequest.checklist.map((item) => (
                          <div key={item.key} className={`flex items-start gap-3 rounded-xl border p-3 ${item.completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${item.completed ? "bg-emerald-500 text-white" : "border-2 border-slate-300 bg-white text-transparent"}`}>
                              <Check size={13} strokeWidth={3} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[12px] font-pmedium ${item.completed ? "text-emerald-800 line-through" : "text-slate-900"}`}>{item.label}</p>
                              <p className={`mt-0.5 text-[9px] font-pmedium uppercase tracking-wider ${item.completed ? "text-emerald-600" : "text-slate-500"}`}>{item.description}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[12px] font-pmedium text-slate-500">No checklist items defined yet.</div>
                      )}
                    </div>
                  </div>
                )}

                {viewingRequest.status === "rejected" && viewingRequest.rejectionReason && (
                  <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
                    <p className="text-[10px] font-pmedium text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><XCircle size={14} /> Grounds for Rejection</p>
                    <p className="text-[13px] font-pmedium text-red-900 leading-relaxed">{viewingRequest.rejectionReason}</p>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100/80 shrink-0">
                {viewingRequest.status === "pending" ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button onClick={() => { setRejectingRequest(viewingRequest); setViewingRequest(null); }} disabled={isSavingDecision} className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-rose-500 text-white px-4 py-2.5 rounded-2xl text-[11px] font-pmedium uppercase tracking-wider hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50">
                      <X size={14} /> Reject
                    </button>
                    <button onClick={() => handleApproveRequest(viewingRequest)} disabled={isSavingDecision} className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-[11px] font-pmedium uppercase tracking-wider hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50">
                      {isSavingDecision ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {isSavingDecision ? "SAVING..." : "APPROVE & START NOTICE"}
                    </button>
                  </div>
                ) : viewingRequest.status === "approved" ? (
                  <button type="button" onClick={() => openManageChecklist(viewingRequest)} className="w-full flex items-center justify-center gap-1.5 bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl text-[11px] font-pmedium uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all">
                    <CheckSquare size={14} /> Open Checklist
                  </button>
                ) : (
                  <button onClick={() => setViewingRequest(null)} className="w-full py-2.5 bg-white border border-slate-200/60 shadow-sm text-slate-700 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[11px] uppercase tracking-wider">
                    CLOSE PANEL
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Manage Checklist Modal ── */}
      <AnimatePresence>
        {managingResignation && (
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><CheckSquare size={17} /></div>
                  <div className="min-w-0">
                    <h2 className="text-base font-pmedium text-slate-900">Clearance Checklist</h2>
                    <p className="mt-0.5 truncate text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{managingResignation.employeeName} &bull; {managingResignation.exitCode || "-"}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setManagingResignation(null); setDraftChecklist([]); setExtendNoticeDate(""); }} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4 sm:p-6 [&::-webkit-scrollbar]:hidden">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[11px] font-pmedium leading-relaxed text-amber-800">
                    Select the clearance steps to mark complete. Changes are only counted and saved when you click &quot;Save Progress &amp; Close&quot;. The final resignation can be closed only after every checklist item is done and the notice period has finished.
                  </p>
                </div>

                {/* ── Extend Notice Period ── */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-widest text-blue-700">
                      <CalendarPlus size={13} /> Extend Notice Period
                    </p>
                    <span className="text-[11px] font-pmedium text-slate-600">
                      Current last working date: <span className="text-slate-900">{formatDateLabel(managingResignation.noticeEndAt)}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex flex-1 flex-col gap-1">
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">New last working date</label>
                      <input
                        type="date"
                        value={extendNoticeDate}
                        min={nextDayDateString(managingResignation.noticeEndAt)}
                        onChange={(event) => setExtendNoticeDate(event.target.value)}
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExtendNotice}
                      disabled={!extendNoticeDate || isExtendingNotice}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {isExtendingNotice ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />}
                      {isExtendingNotice ? "EXTENDING..." : "Extend Notice Period"}
                    </button>
                  </div>
                  {Array.isArray(managingResignation.noticeExtensions) && managingResignation.noticeExtensions.length > 0 && (
                    <p className="mt-2 text-[10px] font-pmedium text-blue-600">
                      Extended {managingResignation.noticeExtensions.length} time(s). Latest end date: {formatDateLabel(managingResignation.noticeExtensions[managingResignation.noticeExtensions.length - 1]?.newNoticeEndAt)} by {managingResignation.noticeExtensions[managingResignation.noticeExtensions.length - 1]?.extendedBy || "-"}.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {draftChecklist.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleToggleChecklist(item.key || "")}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                        item.completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-blue-300"
                      }`}
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${item.completed ? "bg-emerald-500 text-white" : "border-2 border-slate-300 bg-white text-transparent"}`}>
                        <Check size={13} strokeWidth={3} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[12px] font-pmedium ${item.completed ? "text-emerald-800 line-through" : "text-slate-900"}`}>{item.label}</p>
                        <p className={`mt-0.5 text-[9px] font-pmedium uppercase tracking-wider ${item.completed ? "text-emerald-600" : "text-slate-500"}`}>{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                    <span>Checklist Progress</span>
                    <span>{managingResignation.completedChecklistCount || 0}/{managingResignation.totalChecklistCount || 0}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full ${managingResignation.checklistProgress === 100 ? "bg-emerald-500" : "bg-[#2563EB]"}`}
                      style={{ width: `${managingResignation.checklistProgress || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100/80 shrink-0">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleSaveChecklist}
                    disabled={isSavingDecision}
                    className="w-full sm:flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium hover:bg-blue-700 transition-all text-[11px] uppercase tracking-wider disabled:opacity-50"
                  >
                    {isSavingDecision ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {isSavingDecision ? "SAVING..." : "Save Progress & Close"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteResignation}
                    disabled={!managingResignation.canComplete || isSavingDecision}
                    className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-[11px] font-pmedium uppercase tracking-wider hover:bg-emerald-600 active:scale-95 transition-all disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-100"
                  >
                    {isSavingDecision ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                    Complete Resignation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Reject Request Modal ── */}
      <AnimatePresence>
        {rejectingRequest && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/20 backdrop-blur-sm">
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
                    <h2 className="text-base font-pmedium text-slate-900">Reject Resignation</h2>
                    <p className="mt-0.5 truncate text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{rejectingRequest.employeeName}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setRejectingRequest(null); setRejectReason(""); }} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4 bg-white">
                <div className="p-4 sm:p-5 bg-red-50/80 border border-red-200/80 rounded-2xl">
                  <label className="text-[10px] font-pmedium text-red-600 uppercase tracking-widest mb-2 block">Mandatory Rejection Note</label>
                  <textarea
                    rows={4} required placeholder="Explain why the resignation is being rejected..."
                    className="w-full p-3 sm:p-4 text-[13px] sm:text-[14px] rounded-xl border border-red-200 outline-none focus:ring-2 focus:ring-red-200 bg-white font-pmedium text-red-900 placeholder:text-red-300 shadow-sm"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100/80 shrink-0">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button type="button" onClick={() => { setRejectingRequest(null); setRejectReason(""); }} className="w-full sm:flex-1 py-2.5 bg-white border border-slate-200/60 shadow-sm text-slate-700 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[11px] uppercase tracking-wider">
                    Cancel
                  </button>
                  <button type="button" disabled={!rejectReason.trim() || isSavingDecision} onClick={handleRejectSubmit} className="w-full sm:flex-[2] flex items-center justify-center gap-1.5 bg-rose-500 text-white px-4 py-2.5 rounded-2xl text-[11px] font-pmedium uppercase tracking-wider hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50">
                    {isSavingDecision ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Confirm Rejection
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

export default HRResignationManagementPage;
