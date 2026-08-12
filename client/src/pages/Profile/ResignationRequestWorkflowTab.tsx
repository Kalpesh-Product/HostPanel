import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  LogOut,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  UserMinus,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface ResignationRuleItem {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
}

interface DocumentOption {
  id?: string;
  label: string;
  description?: string;
}

interface ResignationSettings {
  returnRequirements: ResignationRuleItem[];
  instructions: string[];
  confirmationWarning: string;
  version: number;
  requestedDocumentTemplates: DocumentOption[];
}

interface ResignationRequest {
  id?: string;
  _id?: string;
  exitCode?: string;
  reason?: string;
  status?: string;
  noticePeriodDays?: number;
  noticeEndAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  requestedDocuments?: string[];
  requestedDocumentNotes?: string;
  rejectionReason?: string;
}

const EMPTY_SETTINGS: ResignationSettings = {
  returnRequirements: [],
  instructions: [],
  confirmationWarning:
    "I have reviewed my notice period, return requirements, and company resignation instructions.",
  version: 1,
  requestedDocumentTemplates: [],
};

const STATUS_PILLS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "completed", label: "Completed" },
];

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function isMatchStatus(requestStatus?: string, filterStatus?: string): boolean {
  if (!filterStatus || filterStatus === "all") return true;
  return String(requestStatus || "pending").trim().toLowerCase() === String(filterStatus).trim().toLowerCase();
}

function isMatchSearch(request: ResignationRequest, query: string): boolean {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return true;
  return [request.exitCode, request.reason, request.status]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

function StatusBadge({ status = "pending" }: { status?: string }) {
  const key = status.toLowerCase();
  const styles: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-blue-200 bg-blue-50 text-blue-700",
    rejected: "border-red-200 bg-red-50 text-red-700",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      className={"inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider " + (styles[key] || styles.pending)}
    >
      <UserMinus size={10} />
      {key.charAt(0).toUpperCase() + key.slice(1)}
    </span>
  );
}

export function ResignationRequestWorkflowTab() {
  const axios = useAxiosPrivate();
  const [requests, setRequests] = useState<ResignationRequest[]>([]);
  const [settings, setSettings] = useState<ResignationSettings>(EMPTY_SETTINGS);
  const [noticePeriodDays, setNoticePeriodDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ResignationRequest | null>(null);
  const [reason, setReason] = useState("");
  const [requestedDocuments, setRequestedDocuments] = useState<string[]>([]);
  const [customDocument, setCustomDocument] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const response = await axios.get("/api/hr/resignation-management/requests/me");
      const data = response?.data?.data || {};
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setSettings({
        ...EMPTY_SETTINGS,
        ...(data.settings || {}),
        requestedDocumentTemplates:
          data.settings?.requestedDocumentTemplates ||
          data.requestedDocumentTemplates ||
          [],
      });
      setNoticePeriodDays(Number(data.submissionContext?.noticePeriodDays || 0));
      setErrorMessage("");
    } catch (error: any) {
      setRequests([]);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load resignation requests.",
      );
    }
  }, [axios]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    loadRequests().finally(() => {
      if (mounted) setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [loadRequests]);

  const stats = useMemo(() => {
    const count = (status: string) =>
      requests.filter((request) => request.status === status).length;
    return {
      total: requests.length,
      pending: count("pending"),
      approved: count("approved"),
      rejected: count("rejected"),
    };
  }, [requests]);

  const statCards = useMemo(
    () => [
      {
        label: "Total",
        value: stats.total,
        icon: <Layers size={16} />,
        color: "",
        labelClass: "text-slate-400",
        iconClass: "bg-slate-100 text-slate-500",
      },
      {
        label: "Pending",
        value: stats.pending,
        icon: <Clock size={16} />,
        color: "border-l-4 border-l-amber-500",
        labelClass: "text-amber-600",
        iconClass: "bg-amber-50 text-amber-500",
      },
      {
        label: "Approved",
        value: stats.approved,
        icon: <AlertTriangle size={16} />,
        color: "border-l-4 border-l-blue-500",
        labelClass: "text-blue-600",
        iconClass: "bg-blue-50 text-[#2563EB]",
      },
      {
        label: "Rejected",
        value: stats.rejected,
        icon: <XCircle size={16} />,
        color: "border-l-4 border-l-red-500",
        labelClass: "text-red-600",
        iconClass: "bg-red-50 text-red-500",
      },
    ],
    [stats],
  );

  const filteredRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          isMatchStatus(request.status, statusFilter) &&
          isMatchSearch(request, searchQuery),
      ),
    [requests, statusFilter, searchQuery],
  );

  const hasActiveRequest = requests.some((request) =>
    ["pending", "approved"].includes(String(request.status || "").toLowerCase()),
  );
  const canSubmit = !hasActiveRequest;

  const openCreateForm = () => {
    setEditingRequest(null);
    setReason("");
    setRequestedDocuments([]);
    setCustomDocument("");
    setDocumentNotes("");
    setAcknowledged(false);
    setShowForm(true);
  };

  const openEditForm = (request: ResignationRequest) => {
    setEditingRequest(request);
    setReason(request.reason || "");
    setRequestedDocuments(Array.isArray(request.requestedDocuments) ? request.requestedDocuments : []);
    setCustomDocument("");
    setDocumentNotes(request.requestedDocumentNotes || "");
    setAcknowledged(true);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRequest(null);
    setReason("");
    setRequestedDocuments([]);
    setCustomDocument("");
    setDocumentNotes("");
    setAcknowledged(false);
  };

  const toggleDocument = (label: string) => {
    setRequestedDocuments((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  };

  const addCustomDocument = () => {
    const label = customDocument.trim();
    if (!label) return;
    if (requestedDocuments.some((item) => item.toLowerCase() === label.toLowerCase())) {
      toast.error("That document is already selected.");
      return;
    }
    if (requestedDocuments.length >= 8) {
      toast.error("You can request up to 8 documents.");
      return;
    }
    setRequestedDocuments((current) => [...current, label]);
    setCustomDocument("");
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 10) {
      toast.error("Please enter at least 10 characters for the resignation reason.");
      return;
    }
    if (!acknowledged) {
      toast.error("Confirm that you reviewed the notice period and resignation instructions.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        reason: reason.trim(),
        requestedDocuments,
        requestedDocumentNotes: documentNotes.trim(),
        policyAcknowledged: true,
      };
      if (editingRequest) {
        const requestId = editingRequest.id || editingRequest._id;
        if (!requestId) throw new Error("Resignation request id is missing.");
        await axios.patch(`/api/hr/resignation-management/requests/${requestId}`, payload);
        toast.success("Resignation request updated for HR review.");
      } else {
        await axios.post("/api/hr/resignation-management/requests", payload);
        toast.success("Resignation request submitted for HR review.");
      }
      await loadRequests();
      closeForm();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save resignation request.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-borderGray bg-white p-4" aria-labelledby="exit-request-heading">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="exit-request-heading" className="text-title font-pmedium uppercase text-primary">
            Resignation Requests
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Review your company rules before submitting a resignation request.
          </p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className={`my-4 grid grid-cols-1 gap-3 ${statCards.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {statCards.map((card) => (
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
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm backdrop-blur-md">
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
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search code or reason..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </div>
            <button
              type="button"
              onClick={openCreateForm}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium uppercase text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus size={13} />
              New Resignation Request
            </button>
          </div>
        </div>

        {!canSubmit && !showForm && (
          <div className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            You already have an active resignation request. A new request can be submitted after it is rejected or completed.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : errorMessage ? (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <LogOut className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 text-xs font-pmedium uppercase tracking-wider text-slate-500">No resignation requests</p>
            <p className="mt-1 text-xs text-slate-400">Your submitted requests will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-4">Request</th>
                  <th className="px-5 py-4">Reason</th>
                  <th className="px-5 py-4">Documents requested</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Notice</th>
                  <th className="px-5 py-4 text-center">Submitted</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {filteredRequests.map((request) => (
                  <tr key={request.id || request._id} className="transition-all hover:bg-blue-50/30 group">
                    <td className="px-5 py-4 text-sm font-pmedium text-slate-900">{request.exitCode || "-"}</td>
                    <td className="max-w-xs px-5 py-4">
                      <p className="truncate text-xs text-slate-700" title={request.reason}>{request.reason || "-"}</p>
                      {request.rejectionReason && (
                        <p className="mt-1 truncate text-[11px] text-red-600">HR: {request.rejectionReason}</p>
                      )}
                    </td>
                    <td className="max-w-xs px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(request.requestedDocuments || []).map((document) => (
                          <span key={document} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                            <FileText size={10} className="mr-1 inline" />{document}
                          </span>
                        ))}
                        {!request.requestedDocuments?.length && <span className="text-xs text-slate-400">None</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center"><StatusBadge status={request.status} /></td>
                    <td className="px-5 py-4 text-center text-xs text-slate-600">
                      {request.noticePeriodDays || 0} days
                      {request.noticeEndAt && <span className="block text-[10px] text-slate-400">Ends {formatDate(request.noticeEndAt)}</span>}
                    </td>
                    <td className="px-5 py-4 text-center text-xs text-slate-600">{formatDate(request.createdAt || request.updatedAt)}</td>
                    <td className="px-5 py-4 text-center">
                      {String(request.status || "").toLowerCase() === "pending" ? (
                        <button
                          type="button"
                          onClick={() => openEditForm(request)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[10px] font-pmedium uppercase text-slate-600 transition-all hover:bg-blue-50 hover:text-[#2563EB]"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      ) : (
                        <span className="text-[10px] font-pmedium uppercase tracking-wider text-slate-400">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Popup Form ── */}
      {showForm && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-request-form-title"
        >
          <form
            onSubmit={submitRequest}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-6">
              <div>
                <h2 id="exit-request-form-title" className="flex items-center gap-2 text-lg font-pmedium text-slate-900">
                  <LogOut size={18} className="text-[#2563EB]" />
                  {editingRequest ? "Edit Resignation Request" : "New Resignation Request"}
                </h2>
                <p className="mt-1 text-[11px] font-pmedium text-slate-500">
                  {editingRequest
                    ? editingRequest.exitCode + " is still pending HR review. Update your reason or requested documents."
                    : "Review the notice period, return requirements, and resignation instructions before submitting."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close resignation request form"
                className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto bg-white p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock size={17} />
                    <span className="text-xs font-pmedium uppercase tracking-wider">Your notice period</span>
                  </div>
                  <p className="mt-2 text-2xl font-pmedium text-blue-950">
                    {noticePeriodDays} {noticePeriodDays === 1 ? "day" : "days"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    The notice period starts after HR approves the request. HR will confirm your final working day.
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <ShieldAlert size={17} />
                    <span className="text-xs font-pmedium uppercase tracking-wider">Important</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-amber-800">
                    Submitting this form does not immediately end employment. Continue attendance, handover, and assigned work until HR completes the resignation.
                  </p>
                </div>
              </div>

              <fieldset>
                <legend className="text-xs font-pmedium uppercase tracking-wider text-slate-700">
                  Items HR requires you to return
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {settings.returnRequirements.length ? settings.returnRequirements.map((item) => (
                    <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-sm font-pmedium text-slate-900">
                            {item.label}
                            {item.required !== false && <span className="ml-1 text-red-500">*</span>}
                          </p>
                          {item.description && <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500">HR has not added return requirements.</p>
                  )}
                </div>
              </fieldset>

              <div>
                <h2 className="text-xs font-pmedium uppercase tracking-wider text-slate-700">
                  Company resignation instructions
                </h2>
                <ol className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {settings.instructions.length ? settings.instructions.map((instruction, index) => (
                    <li key={instruction + index} className="flex gap-3 text-xs leading-5 text-slate-700">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-pmedium text-slate-600">
                        {index + 1}
                      </span>
                      {instruction}
                    </li>
                  )) : (
                    <li className="text-xs text-slate-500">No additional instructions have been configured.</li>
                  )}
                </ol>
              </div>

              <div>
                <label htmlFor="exit-reason" className="text-xs font-pmedium uppercase tracking-wider text-slate-700">
                  Reason for resignation
                </label>
                <textarea
                  id="exit-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={2500}
                  required
                  className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Explain your reason for leaving the company..."
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">{reason.length}/2500</p>
              </div>

              <fieldset>
                <legend className="text-xs font-pmedium uppercase tracking-wider text-slate-700">
                  Documents you want HR to issue
                </legend>
                <p className="mt-1 text-xs text-slate-500">
                  Select available documents or add a custom document request.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {settings.requestedDocumentTemplates.map((document) => (
                    <label key={document.label} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-300">
                      <input
                        type="checkbox"
                        checked={requestedDocuments.includes(document.label)}
                        onChange={() => toggleDocument(document.label)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-800">{document.label}</span>
                        {document.description && <span className="mt-0.5 block text-xs text-slate-500">{document.description}</span>}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="custom-exit-document" className="sr-only">Custom document request</label>
                  <input
                    id="custom-exit-document"
                    value={customDocument}
                    onChange={(event) => setCustomDocument(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomDocument();
                      }
                    }}
                    maxLength={120}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Add another document..."
                  />
                  <button
                    type="button"
                    onClick={addCustomDocument}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-pmedium text-blue-700 hover:bg-blue-100"
                  >
                    <Plus size={14} /> Add request
                  </button>
                </div>
                {requestedDocuments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2" aria-label="Selected document requests">
                    {requestedDocuments.map((document) => (
                      <span key={document} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
                        {document}
                        <button
                          type="button"
                          onClick={() => toggleDocument(document)}
                          aria-label={"Remove " + document}
                          className="rounded-full p-0.5 hover:bg-blue-100"
                        >
                          <Trash2 size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </fieldset>

              <div>
                <label htmlFor="exit-document-notes" className="text-xs font-pmedium uppercase tracking-wider text-slate-700">
                  Message to HR about requested documents
                </label>
                <textarea
                  id="exit-document-notes"
                  value={documentNotes}
                  onChange={(event) => setDocumentNotes(event.target.value)}
                  maxLength={2000}
                  className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Add delivery details, name format, or other notes for HR..."
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs leading-5 text-red-800">
                  <span className="block font-pmedium">Confirmation required</span>
                  {settings.confirmationWarning}
                </span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-pmedium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || reason.trim().length < 10 || !acknowledged}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-xs font-pmedium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send size={14} />
                {isSaving
                  ? "Saving..."
                  : editingRequest
                    ? "Save Changes"
                    : "Submit to HR"}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </section>
  );
}

export default ResignationRequestWorkflowTab;
