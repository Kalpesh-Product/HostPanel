import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Calendar,
  FileDown,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  UserMinus,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createReport } from "@/services/reports";
import { HRExitManagementSkeleton } from "@/components/ui/Skeleton";
import { getStoredUser, normalizeUserRole } from "@/lib/auth-session";
import {
  completeExitRequest,
  getExitRequests,
  reviewExitRequest,
  updateExitChecklist,
} from "@/services/exit-management";
import { downloadReportFile } from "@/utils/report-download";
import PageFrame from "@/components/Pages/PageFrame";

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

interface ExitRequest {
  id?: string;
  recordId?: string;
  employeeName?: string;
  employeeId?: string;
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
  noticeStartDate?: string;
  noticeEndDate?: string;
  noticeEndAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
  completedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
}

interface ExitManagementOverview {
  exitRequests: ExitRequest[];
  pendingRequests: ExitRequest[];
  activeNoticeRequests: ExitRequest[];
  historyRequests: ExitRequest[];
  rejectedRequests: ExitRequest[];
  completedRequests: ExitRequest[];
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

const defaultOverview: ExitManagementOverview = {
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

function formatStatusLabel(value?: string): string {
  const status = String(value || "pending").trim().toLowerCase();
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "completed") return "Completed";
  return "Pending";
}

function getInitials(name = ""): string {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function isMatchDepartment(requestDepartment?: string, filterDepartment?: string): boolean {
  if (filterDepartment === "All Departments") return true;
  const left = String(requestDepartment || "").trim().toLowerCase();
  const right = String(filterDepartment || "").trim().toLowerCase();
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function isMatchSearch(request: ExitRequest, query: string): boolean {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return true;
  return [request.employeeName, request.employeeId, request.department, request.exitCode, request.reason]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

function getStatusChipClass(status?: string): string {
  const normalized = String(status || "pending").trim().toLowerCase();
  if (normalized === "approved") return "bg-blue-50 text-blue-700 border-blue-200";
  if (normalized === "rejected") return "bg-red-50 text-red-600 border-red-200";
  if (normalized === "completed") return "bg-green-50 text-green-700 border-green-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function buildExitExportRows(
  records: ExitRequest[] = [],
  scopeLabel = "",
  departmentLabel = "",
  searchLabel = "",
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Report Scope", value: scopeLabel || "Exit Management" },
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

function buildExitRequestExportRows(request: ExitRequest): Array<{ label: string; value: string }> {
  const checklist = Array.isArray(request.checklist) ? request.checklist : [];
  const rows: Array<{ label: string; value: string }> = [
    { label: "Employee Name", value: request.employeeName || "Employee" },
    { label: "Employee ID", value: request.employeeId || "-" },
    { label: "Department", value: request.department || "General" },
    { label: "Role", value: request.requesterRole || "Employee" },
    { label: "Report Scope", value: "Individual Exit Request" },
    { label: "Exit Code", value: request.exitCode || "-" },
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

export function HRExitManagementPage() {
  const currentUser = getStoredUser();
  const managerProfile: ManagerProfile = {
    name: currentUser?.fullName || currentUser?.firstName || "HR Manager",
    role: normalizeUserRole(currentUser?.workspaceMembership?.role || currentUser?.role || "hr-manager"),
  };
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState("");
  const [overview, setOverview] = useState<ExitManagementOverview>(defaultOverview);
  const [activeTab, setActiveTab] = useState("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [viewingRequest, setViewingRequest] = useState<ExitRequest | null>(null);
  const [managingExit, setManagingExit] = useState<ExitRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<ExitRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      const response = await getExitRequests();
      const data = response?.data || response || {};
      setOverview({ ...defaultOverview, ...data });
    } catch (error: any) {
      toast.error(error.message || "Unable to load exit management data.");
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
      isMatchDepartment(r.department, departmentFilter) && isMatchSearch(r, searchQuery)
    );
  }, [overview.pendingRequests, departmentFilter, searchQuery]);

  const filteredNotice = useMemo(() => {
    return (Array.isArray(overview.activeNoticeRequests) ? overview.activeNoticeRequests : []).filter((r) =>
      isMatchDepartment(r.department, departmentFilter) && isMatchSearch(r, searchQuery)
    );
  }, [overview.activeNoticeRequests, departmentFilter, searchQuery]);

  const filteredHistory = useMemo(() => {
    return (Array.isArray(overview.historyRequests) ? overview.historyRequests : []).filter((r) =>
      isMatchDepartment(r.department, departmentFilter) && isMatchSearch(r, searchQuery)
    );
  }, [overview.historyRequests, departmentFilter, searchQuery]);

  const activeReportRows = useMemo(() => {
    if (activeTab === "notice") return filteredNotice;
    if (activeTab === "history") return filteredHistory;
    return filteredRequests;
  }, [activeTab, filteredRequests, filteredNotice, filteredHistory]);

  const activeReportScopeLabel = useMemo(() => {
    if (activeTab === "notice") return "Active Notice Periods";
    if (activeTab === "history") return "Exit History";
    return "Exit Requests Queue";
  }, [activeTab]);

  function openRequestDetails(request: ExitRequest) {
    setViewingRequest(request);
  }

  function openManageChecklist(request: ExitRequest) {
    setManagingExit(request);
    setViewingRequest(null);
  }

  async function refreshData() {
    setIsRefreshing(true);
    try {
      await loadOverview();
      toast.success("Exit management refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleExportReport(format = "PDF") {
    const reportFormat = String(format).toLowerCase() === "excel" ? "Excel" : "PDF";
    if (!activeReportRows.length) {
      toast.error("There are no exit records to export.");
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
        reportRows: buildExitExportRows(activeReportRows, activeReportScopeLabel, deptLabel, searchQuery),
        monthlyData: [],
      });
      if (reportFormat === "PDF") {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }
      const createdReportId = response?.data?.report?.recordId;
      toast.success(reportFormat === "PDF" ? "Exit report saved to Reports." : "Exit report saved to Reports. Preview it before downloading.");
      navigate(createdReportId ? `/dashboard/hr/report?reportId=${createdReportId}` : "/dashboard/hr/report");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create exit report.");
    } finally {
      setIsExportingReport("");
    }
  }

  async function handleExportRequestReport(request: ExitRequest | null, format = "PDF") {
    if (!request) return;
    const reportFormat = String(format).toLowerCase() === "excel" ? "Excel" : "PDF";
    const reportTitle = `${request.employeeName || "Employee"} Exit Report`;
    const deptLabel = request.department || "HR";
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: reportTitle,
        department: deptLabel === "General" ? "HR" : deptLabel,
        category: "Employee",
        dataWindow: "Custom",
        reportMonth: new Date().toISOString().slice(0, 7),
        period: "Individual Exit Request",
        generatedBy: managerProfile.name,
        format: reportFormat,
        description: `${request.employeeName || "Employee"} individual exit request report.`,
        sourceType: "custom",
        sourceRef: String(request.exitCode || request.recordId || request.id || "").trim(),
        reportRows: buildExitRequestExportRows(request),
        monthlyData: [],
      });
      if (reportFormat === "PDF") {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }
      const createdReportId = response?.data?.report?.recordId;
      toast.success(reportFormat === "PDF" ? "Exit request report saved to Reports." : "Exit request report saved to Reports. Preview it before downloading.");
      navigate(createdReportId ? `/dashboard/hr/report?reportId=${createdReportId}` : "/dashboard/hr/report");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create exit request report.");
    } finally {
      setIsExportingReport("");
    }
  }

  async function handleApproveRequest(request: ExitRequest) {
    try {
      const response = await reviewExitRequest(request.id || "", { status: "approved" });
      const updatedRequest: ExitRequest | null = response?.data?.exitRequest || response?.data?.data?.exitRequest || null;
      if (updatedRequest) setViewingRequest(updatedRequest);
      await loadOverview();
      toast.success("Exit request approved.");
    } catch (error: any) {
      toast.error(error.message || "Unable to approve exit request.");
    }
  }

  async function handleRejectSubmit() {
    if (!rejectingRequest || !rejectReason.trim()) return;
    try {
      const response = await reviewExitRequest(rejectingRequest.id || "", {
        status: "rejected",
        rejectionReason: rejectReason,
      });
      const updatedRequest: ExitRequest | null = response?.data?.exitRequest || response?.data?.data?.exitRequest || null;
      if (updatedRequest) setViewingRequest(updatedRequest);
      setRejectingRequest(null);
      setRejectReason("");
      await loadOverview();
      toast.success("Exit request rejected.");
    } catch (error: any) {
      toast.error(error.message || "Unable to reject exit request.");
    }
  }

  async function handleToggleChecklist(itemKey: string) {
    if (!managingExit) return;
    const checklistItem = (managingExit.checklist || []).find((item) => item.key === itemKey);
    const nextCompleted = !checklistItem?.completed;
    try {
      const response = await updateExitChecklist(managingExit.id || "", { itemKey, completed: nextCompleted });
      const updatedRequest: ExitRequest | null = response?.data?.exitRequest || response?.data?.data?.exitRequest || null;
      if (updatedRequest) setManagingExit(updatedRequest);
      await loadOverview();
      toast.success(nextCompleted ? "Checklist item marked complete." : "Checklist item reopened.");
    } catch (error: any) {
      toast.error(error.message || "Unable to update checklist item.");
    }
  }

  async function handleCompleteExit() {
    if (!managingExit) return;
    try {
      const response = await completeExitRequest(managingExit.id || "", {});
      const updatedRequest: ExitRequest | null = response?.data?.exitRequest || response?.data?.data?.exitRequest || null;
      if (updatedRequest) setManagingExit(updatedRequest);
      setManagingExit(null);
      await loadOverview();
      toast.success("Exit request completed.");
    } catch (error: any) {
      toast.error(error.message || "Unable to complete exit request.");
    }
  }

  const pendingCount = overview.summary?.pendingCount || 0;
  const activeNoticeCount = overview.summary?.activeNoticeCount || 0;
  const completedCount = overview.summary?.completedCount || 0;

  if (isLoading) {
    return <HRExitManagementSkeleton />;
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Exit Management
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Core Module | Review & manage employee offboarding</p>
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

          {/* ── Main Tabs (pill-style, before stat cards) ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {[
              { key: "requests", label: `REQUESTS (${pendingCount})` },
              { key: "notice", label: `ACTIVE NOTICE (${activeNoticeCount})` },
              { key: "history", label: `HISTORY (${completedCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-8 py-2.5 rounded-xl text-[10px] font-pbold font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Requests</p>
                <p className="text-[15px] font-black text-slate-900">{pendingCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-500 shrink-0">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Notice Periods</p>
                <p className="text-[15px] font-black text-slate-900">{activeNoticeCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-[#2563EB] shrink-0">
                <Clock size={16} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Completed Exits</p>
                <p className="text-[15px] font-black text-slate-900">{completedCount}</p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-500 shrink-0">
                <Archive size={16} />
              </div>
            </div>
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Data panel header row */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <select
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  {allDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search employee, code, or reason..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Requests tab */}
            {activeTab === "requests" && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-6 py-5">Employee</th>
                      <th className="px-6 py-5">Department / Role</th>
                      <th className="px-6 py-5">Applied Date</th>
                      <th className="px-6 py-5 text-center">Notice Period</th>
                      <th className="px-6 py-5">Reason</th>
                      <th className="px-6 py-5 text-center">Status</th>
                      <th className="px-6 py-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-800 bg-gradient-to-br from-[#2563EB] to-[#1e40af] text-[10px] font-semibold text-white shadow-sm">
                              {getInitials(request.employeeName)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{request.employeeName}</div>
                              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{request.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-medium text-slate-700 text-sm">{request.department || "General"}</span>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">{request.requesterRole}</p>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-700">{formatDateLabel(request.createdAt)}</td>
                        <td className="px-6 py-5 text-center font-semibold text-[#2563EB]">{request.noticePeriodDays || 0} Days</td>
                        <td className="px-6 py-5">
                          <p className="max-w-[260px] truncate text-xs font-medium text-slate-500" title={request.reason}>
                            {request.reason}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusChipClass(request.status)}`}>
                            <Clock size={10} /> {formatStatusLabel(request.status)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openRequestDetails(request)}
                              className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl font-semibold text-[10px] uppercase transition-all"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(request)}
                              className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-green-50 hover:text-green-600 rounded-xl font-semibold text-[10px] uppercase transition-all"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingRequest(request)}
                              className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl font-semibold text-[10px] uppercase transition-all"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportRequestReport(request, "PDF")}
                              className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl font-semibold text-[10px] uppercase transition-all"
                            >
                              Export
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-semibold">
                          <ShieldAlert size={28} className="mx-auto mb-3 text-slate-300" />
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
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-6 py-5">Employee</th>
                      <th className="px-6 py-5">Department / Role</th>
                      <th className="px-6 py-5">Last Working Date</th>
                      <th className="px-6 py-5">Checklist Progress</th>
                      <th className="px-6 py-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredNotice.map((request) => (
                      <tr key={request.id} className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-800 bg-gradient-to-br from-[#2563EB] to-[#1e40af] text-[10px] font-semibold text-white shadow-sm">
                              {getInitials(request.employeeName)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{request.employeeName}</div>
                              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{request.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-medium text-slate-700 text-sm">{request.department || "General"}</span>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">{request.requesterRole}</p>
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-amber-600">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-sm text-amber-600">
                            <Calendar size={14} /> {formatDateLabel(request.noticeEndAt)}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-2 rounded-full transition-all ${request.checklistProgress === 100 ? "bg-green-500" : "bg-[#2563EB]"}`}
                                style={{ width: `${request.checklistProgress || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">
                              {request.completedChecklistCount}/{request.totalChecklistCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            type="button"
                            onClick={() => openManageChecklist(request)}
                            className={`mx-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-semibold text-[10px] uppercase transition-all ${
                              request.canComplete
                                ? "bg-green-600 text-white shadow-md shadow-green-200 hover:bg-green-700"
                                : "bg-blue-50 text-[#2563EB] hover:bg-blue-100"
                            }`}
                          >
                            {request.canComplete ? <CheckCircle2 size={14} /> : <CheckSquare size={14} />}
                            {request.canComplete ? "Complete Exit" : "Manage"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredNotice.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-semibold">
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
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-6 py-5">Employee</th>
                      <th className="px-6 py-5">Department / Role</th>
                      <th className="px-6 py-5">Exit Date</th>
                      <th className="px-6 py-5">Reason on File</th>
                      <th className="px-6 py-5 text-center">Status</th>
                      <th className="px-6 py-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredHistory.map((request) => (
                      <tr key={request.id} className="opacity-80 hover:opacity-100 hover:bg-blue-50/30 transition-all group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-500 bg-gradient-to-br from-slate-400 to-slate-500 text-[10px] font-semibold text-white shadow-sm">
                              {getInitials(request.employeeName)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">{request.employeeName}</div>
                              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{request.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-medium text-slate-600 text-sm">{request.department || "General"}</span>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">{request.requesterRole}</p>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-700">{formatDateLabel(request.completedAt || request.rejectedAt || request.approvedAt)}</td>
                        <td className="px-6 py-5">
                          <p className="max-w-[260px] truncate text-xs italic text-slate-500" title={request.reason}>
                            {request.reason}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusChipClass(request.status)}`}>
                            <Archive size={10} /> {formatStatusLabel(request.status)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            type="button"
                            onClick={() => openRequestDetails(request)}
                            className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl font-semibold text-[10px] uppercase transition-all"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">
                          No historical exit records found.
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
      {viewingRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 bg-slate-900 p-6 md:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#1e40af] text-lg font-bold text-white">
                  {getInitials(viewingRequest.employeeName)}
                </div>
                <div>
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                    <LogOut size={22} className="text-red-400" /> Exit Request
                  </h2>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">{viewingRequest.exitCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-red-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8">
              <div className="space-y-6">
                <section>
                  <h3 className="mb-4 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Employee Information</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="col-span-2">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">Name</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {viewingRequest.employeeName} <span className="ml-1 text-xs text-slate-400">({viewingRequest.employeeId})</span>
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">Department / Role</p>
                      <p className="font-semibold text-slate-900">{viewingRequest.department || "General"}</p>
                      <p className="text-xs text-slate-500">{viewingRequest.requesterRole}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">Joining Date</p>
                      <p className="font-semibold text-slate-900">{formatDateLabel(viewingRequest.joiningDate)}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Exit Details</h3>
                  <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-blue-50/40 p-5 md:grid-cols-3">
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-blue-500">Applied Date</p>
                      <p className="font-semibold text-slate-900">{formatDateLabel(viewingRequest.createdAt)}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-blue-500">Notice Period</p>
                      <p className="font-semibold text-slate-900">{viewingRequest.noticePeriodDays || 0} Days</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-blue-500">Last Working Date</p>
                      <p className="text-lg font-bold text-red-600">{formatDateLabel(viewingRequest.noticeEndAt || viewingRequest.completedAt)}</p>
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-blue-500">Reason</p>
                      <div className="rounded-xl border border-blue-100 bg-white p-4 text-sm font-medium leading-relaxed text-slate-700">
                        {viewingRequest.reason}
                      </div>
                    </div>
                    {viewingRequest.requestedDocuments?.length > 0 && (
                      <div className="col-span-1 md:col-span-3">
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-blue-500">Requested Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {viewingRequest.requestedDocuments.map((doc) => (
                            <span key={doc} className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold text-[#2563EB]">{doc}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {viewingRequest.status === "approved" && (
                  <section>
                    <h3 className="mb-4 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Clearance Checklist</h3>
                    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      {Array.isArray(viewingRequest.checklist) && viewingRequest.checklist.length > 0 ? (
                        viewingRequest.checklist.map((item) => (
                          <div key={item.key} className={`flex items-start gap-4 rounded-xl border-2 p-4 ${item.completed ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
                            <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded ${item.completed ? "bg-green-500 text-white" : "border-2 border-slate-300 bg-white text-transparent"}`}>
                              <Check size={16} strokeWidth={3} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${item.completed ? "text-green-800 line-through" : "text-slate-900"}`}>{item.label}</p>
                              <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-wider ${item.completed ? "text-green-600" : "text-slate-500"}`}>{item.description}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500">No checklist items defined yet.</div>
                      )}
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                  Exit status: <span className="font-semibold text-slate-700">{formatStatusLabel(viewingRequest.status)}</span>
                </section>
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50 p-6">
              <button type="button" onClick={() => setViewingRequest(null)} className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 font-semibold text-slate-600 transition hover:bg-slate-100">Close</button>
              <button type="button" onClick={() => handleExportRequestReport(viewingRequest, "PDF")} disabled={Boolean(isExportingReport)} className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">EXPORT PDF</button>
              <button type="button" onClick={() => handleExportRequestReport(viewingRequest, "Excel")} disabled={Boolean(isExportingReport)} className="flex-1 rounded-2xl bg-[#2563EB] py-4 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">EXPORT EXCEL</button>
              {viewingRequest.status === "pending" && (
                <>
                  <button type="button" onClick={() => { setRejectingRequest(viewingRequest); setViewingRequest(null); }} className="flex-1 rounded-2xl border border-red-200 bg-white py-4 font-semibold text-red-600 transition hover:bg-red-50">Reject Request</button>
                  <button type="button" onClick={() => handleApproveRequest(viewingRequest)} className="flex-1 rounded-2xl bg-[#2563EB] py-4 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">Approve & Start Notice</button>
                </>
              )}
              {viewingRequest.status === "approved" && (
                <button type="button" onClick={() => openManageChecklist(viewingRequest)} className="flex-1 rounded-2xl bg-green-600 py-4 font-semibold text-white shadow-lg shadow-green-200 transition hover:bg-green-700">Open Checklist</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Checklist Modal ── */}
      {managingExit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 p-6 md:p-8">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-white"><CheckSquare size={22} /> Exit Clearance Checklist</h2>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {managingExit.employeeName} &bull; {managingExit.exitCode}
                </p>
              </div>
              <button type="button" onClick={() => setManagingExit(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-red-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8">
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-medium leading-relaxed text-amber-800">
                    Mark each clearance step as complete. The final exit can be closed only after every checklist item is done and the notice period has finished.
                  </p>
                </div>
                <div className="space-y-3">
                  {(managingExit.checklist || []).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleToggleChecklist(item.key || "")}
                      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
                        item.completed ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50 hover:border-blue-300"
                      }`}
                    >
                      <div className={`flex h-6 w-6 items-center justify-center rounded ${item.completed ? "bg-green-500 text-white" : "border-2 border-slate-300 bg-white text-transparent"}`}>
                        <Check size={16} strokeWidth={3} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${item.completed ? "text-green-800 line-through" : "text-slate-900"}`}>{item.label}</p>
                        <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-wider ${item.completed ? "text-green-600" : "text-slate-500"}`}>{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span>Checklist Progress</span>
                    <span>{managingExit.completedChecklistCount || 0}/{managingExit.totalChecklistCount || 0}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full ${managingExit.checklistProgress === 100 ? "bg-green-500" : "bg-[#2563EB]"}`}
                      style={{ width: `${managingExit.checklistProgress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-4 border-t border-slate-100 bg-slate-50 p-6">
              <button type="button" onClick={() => setManagingExit(null)} className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 font-semibold text-slate-600 transition hover:bg-slate-100">Save Progress & Close</button>
              <button type="button" onClick={handleCompleteExit} disabled={!managingExit.canComplete} className="flex-1 rounded-2xl bg-green-600 py-4 font-semibold text-white shadow-lg shadow-green-200 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
                <UserMinus size={18} className="mr-2 inline-block" /> Complete Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Request Modal ── */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-red-700 bg-red-600 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/20 p-3 text-white"><XCircle size={24} /></div>
                <div>
                  <h2 className="text-2xl font-bold leading-none text-white">Reject Resignation</h2>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-red-200">{rejectingRequest.exitCode}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setRejectingRequest(null); setRejectReason(""); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X size={18} /></button>
            </div>
            <div className="space-y-5 bg-white p-6 md:p-8">
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-medium leading-relaxed text-red-700">
                  You are rejecting an exit request from <span className="font-semibold text-red-900">{rejectingRequest.employeeName}</span>. A rejection reason is required.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reason for Rejection *</label>
                <textarea
                  className="w-full resize-none rounded-xl border-2 border-transparent bg-slate-50 p-4 font-medium text-slate-900 outline-none transition focus:border-red-400"
                  rows={4}
                  placeholder="Explain why the resignation is being rejected..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4 border-t border-slate-100 bg-slate-50 p-6">
              <button type="button" onClick={() => { setRejectingRequest(null); setRejectReason(""); }} className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button>
              <button type="button" disabled={!rejectReason.trim()} onClick={handleRejectSubmit} className="flex-1 rounded-2xl bg-red-600 py-4 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HRExitManagementPage;
