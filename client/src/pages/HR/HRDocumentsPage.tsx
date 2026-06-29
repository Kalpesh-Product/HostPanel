import React, { useEffect, useMemo, useState } from "react";
import {
  Building, Calendar, CheckCircle2, Download, Eye, FileText,
  FolderClosed, Search, ShieldCheck, Users, X, XCircle,
} from "lucide-react";
import { getEmployeeDocumentsVault } from "@/services/hr";
import PageFrame from "@/components/Pages/PageFrame";

/* ───────────────────────────── Types ───────────────────────────── */

interface VaultDocument {
  id: string; name: string; type: string; typeLabel: string;
  uploadDate: string; uploadedAt: Date | null; source: string;
  url: string; publicId: string;
}

interface VaultEmployee {
  id: string; employeeNumber: string; name: string; fullName: string;
  department: string; departments: string[]; role: string;
  status: string; statusKey: string;
  documents: VaultDocument[]; documentCount: number;
}

interface SummaryData {
  totalEmployees: number; activeEmployees: number;
  inactiveEmployees: number; totalDocuments: number;
}

/* ───────────────────── Helper Functions ───────────────────── */

function getStatusBadge(status: string = "") {
  const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border";
  const v = status.toLowerCase();
  if (v === "active" || v === "active ") {
    return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle2 size={12} /> Active</span>;
  }
  return <span className={`${base} bg-slate-100 text-slate-600 border-slate-200`}><XCircle size={12} /> Inactive</span>;
}

function formatDocumentType(type: string = "", name: string = ""): string {
  const t = type.toLowerCase();
  const f = name.toLowerCase();
  if (t.includes("pdf") || f.endsWith(".pdf")) return "PDF";
  if (t.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(f)) return "Image";
  if (t.includes("word") || /\.(docx?|odt)$/i.test(f)) return "Word";
  if (t.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(f)) return "Spreadsheet";
  return "Document";
}

function formatDocumentDate(value: string | null | undefined): string {
  if (!value) return "Uploaded";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Uploaded" : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function getEmployeeInitials(name: string = ""): string {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").substring(0, 2).toUpperCase() || "HR";
}

function openDocumentUrl(url: string) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

function downloadDocument(url: string, fileName: string = "document") {
  if (!url) return;
  const link = document.createElement("a");
  link.href = url; link.target = "_blank"; link.rel = "noreferrer";
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function normalizeDocument(document: Record<string, unknown> = {}, fallbackEmployee: Record<string, unknown> = {}): VaultDocument {
  const uploadedAt = document?.uploadedAt ? new Date(document.uploadedAt as string) : null;
  return {
    id: String(document.id || document.publicId || `${fallbackEmployee.id || fallbackEmployee.employeeId || "doc"}-${Math.random().toString(36).slice(2, 8)}`),
    name: String(document.name || "Employee Document"),
    type: String(document.type || "document"),
    typeLabel: formatDocumentType(String(document.type || ""), String(document.name || "")),
    uploadDate: document?.uploadDate as string || (uploadedAt && !Number.isNaN(uploadedAt.getTime()) ? formatDocumentDate(uploadedAt.toISOString()) : "Uploaded"),
    uploadedAt,
    source: String(document.source || "Onboarding"),
    url: String(document.url || ""),
    publicId: String(document.publicId || ""),
  };
}

function normalizeEmployee(employee: Record<string, unknown> = {}): VaultEmployee {
  const documents = (Array.isArray(employee.documents) ? employee.documents : [])
    .map((d: Record<string, unknown>) => normalizeDocument(d, employee))
    .filter((d: VaultDocument) => d.name);
  return {
    id: String(employee.id || employee._id || employee.employeeId || ""),
    employeeNumber: String(employee.employeeId || employee.id || employee._id || ""),
    name: String(employee.name || employee.fullName || "Unnamed Employee"),
    fullName: String(employee.fullName || employee.name || ""),
    department: String(employee.department || "Pending"),
    departments: (Array.isArray(employee.departments) ? employee.departments : []).map(String).filter(Boolean),
    role: String(employee.role || employee.rawRole || "Employee"),
    status: String(employee.status || (employee.statusKey ? String(employee.statusKey).replace(/_/g, " ") : "Invite Sent")),
    statusKey: String(employee.statusKey || employee.status || "").toLowerCase(),
    documents,
    documentCount: documents.length,
  };
}

function groupDocumentsIntoEmployees(documents: Record<string, unknown>[] = []): VaultEmployee[] {
  const groups = new Map<string, VaultEmployee>();
  documents.forEach((doc, index) => {
    const employeeId = String(doc.employeeId || "").trim();
    const employeeName = String(doc.employeeName || "Employee").trim();
    const groupKey = employeeId || employeeName || `employee-${index}`;
    const current = groups.get(groupKey) || {
      id: employeeId || groupKey,
      employeeNumber: employeeId || groupKey,
      name: employeeName || "Employee",
      fullName: employeeName || "Employee",
      role: String(doc.employeeRole || "Employee"),
      department: String(doc.employeeDepartment || "Pending"),
      departments: doc.employeeDepartment ? [String(doc.employeeDepartment)] : [],
      status: String(doc.employeeStatus || "Invite Sent"),
      statusKey: String(doc.employeeStatusKey || "").toLowerCase(),
      documents: [],
    };
    current.documents.push(normalizeDocument(doc, current));
    groups.set(groupKey, current);
  });
  return Array.from(groups.values()).map(normalizeEmployee);
}

/* ───────────────────── Skeleton Row ───────────────────── */

function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

/* ───────────────────── Main Component ───────────────────── */

export default function HRDocumentsPage(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [viewingDocsFor, setViewingDocsFor] = useState<VaultEmployee | null>(null);
  const [previewFile, setPreviewFile] = useState<(VaultDocument & { employeeName?: string }) | null>(null);
  const [documentRecords, setDocumentRecords] = useState<VaultEmployee[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(["All Departments"]);
  const [summary, setSummary] = useState<SummaryData>({
    totalEmployees: 0, activeEmployees: 0, inactiveEmployees: 0, totalDocuments: 0,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadVault() {
      try {
        setIsLoading(true);
        const response = await getEmployeeDocumentsVault();
        if (!isMounted) return;
        const payload = (response?.data as Record<string, unknown>) || {};
        const employeeSource = (Array.isArray(payload.employees) ? payload.employees : []).map((e: Record<string, unknown>) => normalizeEmployee(e));
        const documentSource = Array.isArray(payload.documents) ? payload.documents : [];
        const employees = employeeSource.length > 0 ? employeeSource : groupDocumentsIntoEmployees(documentSource);

        const departments = Array.from(new Set([
          "All Departments",
          ...(Array.isArray(payload.departments) ? payload.departments.map((d: Record<string, unknown> | string) => typeof d === "string" ? d : String(d?.name || "")).filter(Boolean) : []),
          ...employees.flatMap((e) => e.departments.length > 0 ? e.departments : [e.department]),
        ])).filter(Boolean) as string[];

        setDocumentRecords(employees);
        setDepartmentOptions(departments);
        const totalDocs = Number(payload.summary?.totalDocuments ?? employees.reduce((sum, e) => sum + e.documentCount, 0));
        setSummary({
          totalEmployees: Number(payload.summary?.totalEmployees ?? employees.length),
          activeEmployees: Number(payload.summary?.activeEmployees ?? employees.filter((e) => e.statusKey === "active").length),
          inactiveEmployees: Number(payload.summary?.inactiveEmployees ?? employees.filter((e) => ["inactive", "terminated"].includes(e.statusKey)).length),
          totalDocuments: totalDocs,
        });
        setErrorMessage("");
      } catch (error: unknown) {
        if (!isMounted) return;
        setErrorMessage((error as Error)?.message || "Failed to load employee documents.");
        setDocumentRecords([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadVault();
    return () => { isMounted = false; };
  }, []);

  const displayedRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return documentRecords.filter((record) => {
      const statusKey = record.statusKey.toLowerCase();
      const inactive = new Set(["inactive", "terminated"]);
      const matchesTab = activeTab === "active" ? !inactive.has(statusKey) : inactive.has(statusKey);
      const matchesDept = departmentFilter === "All Departments"
        || record.department.toLowerCase().includes(departmentFilter.toLowerCase())
        || record.departments.some((d) => d.toLowerCase() === departmentFilter.toLowerCase());
      const matchesSearch = !query
        || record.name.toLowerCase().includes(query)
        || record.id.toLowerCase().includes(query)
        || record.department.toLowerCase().includes(query)
        || record.documents.some((doc) => doc.name.toLowerCase().includes(query));
      return matchesTab && matchesDept && matchesSearch;
    });
  }, [documentRecords, activeTab, departmentFilter, searchQuery]);

  const statCards = [
    { label: "Total Vault Files", value: summary.totalDocuments, icon: FolderClosed, toneClass: "bg-blue-50 text-blue-600", accentClass: "" },
    { label: "Active Employee Folders", value: summary.activeEmployees, icon: CheckCircle2, toneClass: "bg-emerald-50 text-emerald-600", accentClass: "border-l-4 border-l-emerald-500" },
    { label: "Inactive / Ex-Employees", value: summary.inactiveEmployees, icon: XCircle, toneClass: "bg-slate-100 text-slate-500", accentClass: "border-l-4 border-l-slate-400" },
  ];

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ═══ HEADER ═══ */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Document Vault
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Manage and view employee documents securely.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700 flex items-center gap-2">
              <XCircle size={14} /> {errorMessage}
            </div>
          )}

          {/* ═══ STAT CARDS (3-col) ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
            {statCards.map((card) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.accentClass}`}
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    {isLoading ? (
                      <div className="h-[22px] w-16 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      <p className="text-[15px] font-black text-slate-900">{card.value}</p>
                    )}
                  </div>
                  <div className={`p-2 rounded-2xl ${card.toneClass} shrink-0`}>
                    <CardIcon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ DATA PANEL ═══ */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            {/* Header Row: Inner Tabs + Filter + Search */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              {/* Left: Inner tabs */}
              <div className="flex bg-slate-100/50 p-1 rounded-xl w-full xl:w-auto relative border border-slate-200/50 overflow-x-auto">
                {([
                  { key: "active" as const, label: "Active Employees", count: summary.activeEmployees },
                  { key: "inactive" as const, label: "Inactive Employees", count: summary.inactiveEmployees },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-[13px] font-bold transition-colors relative z-10 whitespace-nowrap flex items-center gap-2 ${
                      activeTab === tab.key ? "text-[#0F172A]" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {activeTab === tab.key && (
                      <div className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60 z-[-1]" />
                    )}
                    {tab.label}
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                      activeTab === tab.key ? "bg-[#2563EB]/10 text-[#2563EB]" : "bg-slate-200 text-slate-600"
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* Right: Filter + Search */}
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="pl-3 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm min-w-[100px]"
                >
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search employee or document..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4 text-left">Employee Info</th>
                    <th className="px-5 py-4 text-left">Department</th>
                    <th className="px-5 py-4 text-left">Uploaded Documents</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)
                  ) : displayedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-20 text-slate-400 font-semibold">
                        <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                        No records found in this section.
                      </td>
                    </tr>
                  ) : (
                    displayedRecords.map((record) => (
                      <tr key={record.id || record.name} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm shrink-0 border text-white ${
                              record.statusKey === "active"
                                ? "bg-[#2563EB] border-blue-800"
                                : "bg-slate-400 border-slate-500"
                            }`}>
                              {getEmployeeInitials(record.name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-[12px]">{record.name}</p>
                              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                                {record.employeeNumber || record.id} &bull; {record.role}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                            <Building size={13} className="text-slate-400" /> {record.department}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {record.documents.slice(0, 3).map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => setPreviewFile({ ...doc, employeeName: record.name })}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-[#2563EB] transition-all"
                              >
                                <FileText size={10} className="text-[#2563EB]" />
                                <span className="truncate max-w-[100px]">{doc.name}</span>
                              </button>
                            ))}
                            {record.documents.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-[#2563EB] rounded-lg text-[9px] font-bold">
                                +{record.documents.length - 3} More
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingDocsFor(record)}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                          >
                            <FolderClosed size={12} /> Open Folder
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </PageFrame>

      {/* ═══════════════════════════════════════════════════════
           MODAL: Employee Document Folder
           ═══════════════════════════════════════════════════════ */}
      {viewingDocsFor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-sm p-4" onClick={() => { setViewingDocsFor(null); setPreviewFile(null); }}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 md:px-8 py-6 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-lg font-bold shadow-sm">
                  {getEmployeeInitials(viewingDocsFor.name)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{viewingDocsFor.name}&apos;s Documents</h2>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    <span>{viewingDocsFor.employeeNumber || viewingDocsFor.id}</span>
                    <span>&bull;</span>
                    <span>{viewingDocsFor.department}</span>
                    <span>&bull;</span>
                    {getStatusBadge(viewingDocsFor.statusKey)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setViewingDocsFor(null); setPreviewFile(null); }}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info bar */}
            <div className="bg-blue-50 px-6 md:px-8 py-3 border-b border-blue-100 flex items-center gap-2 shrink-0">
              <ShieldCheck size={16} className="text-[#2563EB]" />
              <span className="text-[11px] font-medium text-blue-900">View-only mode. Documents are stored in Cloudinary and linked from the employee profile.</span>
            </div>

            {/* Document list */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-5">
                Files on Record ({viewingDocsFor.documents.length})
              </h3>

              {viewingDocsFor.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {viewingDocsFor.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-[#2563EB] shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-[12px] truncate max-w-[160px]">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">{doc.typeLabel}</span>
                            <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                              <Calendar size={9} /> {doc.uploadDate}
                            </span>
                          </div>
                          <p className="text-[8px] font-medium text-slate-400 uppercase mt-0.5">Source: {doc.source}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ ...doc, employeeName: viewingDocsFor.name })}
                          className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-[#2563EB] hover:border-blue-300 rounded-lg transition-all"
                          title="Preview"
                        >
                          <Eye size={13} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDocument(doc.url, doc.name)}
                          className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 rounded-lg transition-all"
                          title="Download"
                        >
                          <Download size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-semibold text-[12px]">No documents uploaded yet.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => { setViewingDocsFor(null); setPreviewFile(null); }}
                className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>

          {/* ─── Nested Modal: Document Preview ─── */}
          {previewFile && (
            <div className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-sm z-[110] flex flex-col p-4 md:p-8" onClick={(e) => e.stopPropagation()}>
              {/* Preview header */}
              <div className="flex justify-between items-center w-full max-w-5xl mx-auto mb-4 text-white">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={24} className="text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{previewFile.name}</h3>
                    <p className="text-[10px] text-slate-400">Viewing secure copy for {previewFile.employeeName || viewingDocsFor?.name}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadDocument(previewFile.url, previewFile.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-semibold transition-all"
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="w-9 h-9 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Preview content */}
              <div className="flex-1 w-full max-w-5xl mx-auto bg-slate-100 rounded-xl overflow-hidden flex flex-col items-center justify-center relative shadow-2xl border border-white/10">
                {previewFile.url ? (
                  previewFile.typeLabel === "Image" ? (
                    <img src={previewFile.url} alt={previewFile.name} className="w-full h-full object-contain bg-black/5" />
                  ) : previewFile.typeLabel === "PDF" ? (
                    <iframe title={previewFile.name} src={previewFile.url} className="w-full h-full min-h-[70vh] border-0 bg-white" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 rotate-[-30deg]">
                        <span className="text-6xl font-bold uppercase tracking-[2em] text-slate-700">CONFIDENTIAL</span>
                      </div>
                      <FileText size={64} className="text-slate-400 mb-4" />
                      <p className="font-semibold text-slate-600 text-[13px]">Secure Document Viewer</p>
                      <p className="text-[11px] text-slate-500 mt-1">Previewing: {previewFile.name}</p>
                      <button
                        type="button"
                        onClick={() => openDocumentUrl(previewFile.url)}
                        className="mt-5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Open in new tab
                      </button>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                    <FileText size={64} className="text-slate-400 mb-4" />
                    <p className="font-semibold text-slate-600 text-[13px]">Secure Document Viewer</p>
                    <p className="text-[11px] text-slate-500 mt-1">Previewing: {previewFile.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
