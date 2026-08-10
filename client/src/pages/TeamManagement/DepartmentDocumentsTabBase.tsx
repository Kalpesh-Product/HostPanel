// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { CheckCircle2, ChevronDown, Edit3, FileText, Loader2, Plus, Search, Share2, Trash2, Upload, Users, X, XCircle } from "lucide-react";
import useAxiosPrivate from "@/hooks/useAxiosPrivate";
import useManagedDepartment from "@/hooks/useManagedDepartment";
import { getDepartments, getOrganizationOverview } from "@/services/organization";
import { noOnlyWhitespace, isAlphanumeric } from "@/utils/validators";
import humanDate from "@/utils/humanDateForamt";
import {
  getDepartmentDocuments,
  uploadDepartmentDocument,
  updateDepartmentDocument,
  toggleDepartmentDocumentStatus,
  updateDepartmentDocumentVisibility,
  type DepartmentDocumentType,
} from "@/services/departmentDocuments";

interface DepartmentDocumentsTabBaseProps {
  docType: DepartmentDocumentType;
  title: string;
}

const STATUS_PILLS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

function DocumentsTableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4"><div className="h-4 w-40 rounded-md bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-3 w-16 rounded-md bg-gray-100" /></td>
      <td className="px-5 py-4"><div className="h-3 w-24 rounded-md bg-gray-100" /></td>
      <td className="px-5 py-4"><div className="h-3 w-24 rounded-md bg-gray-100" /></td>
      <td className="px-5 py-4"><div className="mx-auto h-5 w-16 rounded-full bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="mx-auto h-8 w-8 rounded-lg bg-gray-200" /></td>
    </tr>
  );
}

// Click-to-open dropdown of checkboxes — shows ~5 rows before scrolling, so
// picking departments/employees to assign visibility to doesn't need a
// permanently-open list taking up form space.
function MultiSelectDropdown({
  items,
  selectedIds,
  onChange,
  placeholder,
  emptyLabel,
}: {
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selectedNames = items.filter((item) => selectedIds.includes(item.id)).map((item) => item.name);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200/60 bg-white px-3 py-2.5 text-left text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
      >
        <span className={`truncate ${selectedNames.length === 0 ? "text-slate-400" : ""}`}>
          {selectedNames.length === 0 ? placeholder : selectedNames.join(", ")}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <div className="max-h-[180px] overflow-y-auto flex flex-col gap-0.5">
            {items.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] font-pmedium text-slate-400">{emptyLabel}</p>
            ) : (
              items.map((item) => {
                const checked = selectedIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-pmedium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        onChange(e.target.checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id))
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30"
                    />
                    {item.name}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border";
  return isActive ? (
    <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>
      <CheckCircle2 size={12} /> Active
    </span>
  ) : (
    <span className={`${base} bg-rose-50 text-rose-600 border-rose-200`}>
      <XCircle size={12} /> Inactive
    </span>
  );
}

const DepartmentDocumentsTabBase = ({ docType, title }: DepartmentDocumentsTabBaseProps) => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { managedDepartment } = useManagedDepartment();
  const departmentId = managedDepartment?.id || "";

  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit" | "delete" | "visibility" | "">("");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [visibilityEmployeeIds, setVisibilityEmployeeIds] = useState<string[]>([]);
  const [visibilityAssignedDepartmentIds, setVisibilityAssignedDepartmentIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const queryKey = ["department-documents", departmentId, docType];

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await getDepartmentDocuments(axiosPrivate, departmentId, docType);
      return response?.data?.data?.documents || [];
    },
    enabled: Boolean(departmentId),
  });

  // All other departments this doc could be shared/assigned to.
  const { data: allDepartments = [] } = useQuery({
    queryKey: ["all-departments-for-sharing"],
    queryFn: async () => {
      const response = await getDepartments(axiosPrivate);
      return response?.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const otherDepartments = useMemo(
    () => allDepartments.filter((d: any) => String(d.id) !== String(departmentId)).map((d: any) => ({ id: String(d.id), name: d.name })),
    [allDepartments, departmentId],
  );

  // Own department's employee roster — used both for "show to these
  // employees" at creation and for the Manage Visibility action.
  const { data: overviewData } = useQuery({
    queryKey: ["department-documents-roster", departmentId],
    queryFn: async () => {
      const response = await getOrganizationOverview(axiosPrivate);
      return response?.data?.data ?? response?.data ?? {};
    },
    enabled: Boolean(departmentId),
  });
  const ownDepartmentRoster = useMemo(() => {
    const department = Array.isArray(overviewData?.departments) ? overviewData.departments[0] : null;
    const roster = Array.isArray(department?.employees) ? department.employees : [];
    return roster
      .filter((member: any) => String(member?.roleBand || "").trim().toLowerCase() === "employee")
      .map((member: any) => ({ id: String(member.id), name: member.name }));
  }, [overviewData]);
  const rosterIdSet = useMemo(() => new Set(ownDepartmentRoster.map((m) => m.id)), [ownDepartmentRoster]);

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: { documentName: "", file: null as File | null, assignedDepartmentIds: [] as string[], employeeIds: [] as string[] },
  });

  const {
    handleSubmit: handleEditSubmit,
    control: editControl,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm({
    mode: "onChange",
    defaultValues: { newName: "", file: null as File | null },
  });

  const { mutate: uploadDoc, isPending: isUploading } = useMutation({
    mutationFn: async (values: { documentName: string; file: File; assignedDepartmentIds: string[]; employeeIds: string[] }) => {
      const formData = new FormData();
      formData.append("file", values.file);
      formData.append("departmentId", departmentId);
      formData.append("docType", docType);
      formData.append("name", values.documentName);
      formData.append("assignedDepartmentIds", JSON.stringify(values.assignedDepartmentIds || []));
      formData.append("visibleEmployeeIds", JSON.stringify(values.employeeIds || []));
      return uploadDepartmentDocument(axiosPrivate, formData);
    },
    onSuccess: () => {
      toast.success(`${title} uploaded successfully!`);
      reset();
      setOpenModal(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || `Failed to upload ${title.toLowerCase()}.`);
    },
  });

  const { mutate: editDoc, isPending: isEditing } = useMutation({
    mutationFn: async (values: { documentId: string; name: string; file: File | null }) => {
      const formData = new FormData();
      formData.append("name", values.name);
      if (values.file) formData.append("file", values.file);
      return updateDepartmentDocument(axiosPrivate, values.documentId, formData);
    },
    onSuccess: () => {
      toast.success(`${title} updated successfully!`);
      setOpenModal(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || `Failed to update ${title.toLowerCase()}.`);
    },
  });

  const { mutate: toggleStatus, isPending: isTogglingStatus } = useMutation({
    mutationFn: async (payload: { documentId: string; nextActive: boolean }) =>
      toggleDepartmentDocumentStatus(axiosPrivate, payload.documentId, payload.nextActive),
    onSuccess: (_data, payload) => {
      toast.success(`${title} marked as ${payload.nextActive ? "active" : "inactive"} successfully!`);
      setOpenModal(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || `Failed to update ${title.toLowerCase()}.`);
    },
  });

  const { mutate: saveVisibility, isPending: isSavingVisibility } = useMutation({
    mutationFn: async (payload: { employeeIds: string[]; assignedDepartmentIds?: string[] }) =>
      updateDepartmentDocumentVisibility(axiosPrivate, selectedDoc._id, { departmentId, ...payload }),
    onSuccess: () => {
      toast.success("Visibility updated successfully!");
      setOpenModal(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update visibility.");
    },
  });

  const documents = Array.isArray(data) ? data : [];

  const stats = useMemo(() => {
    const total = documents.length;
    const active = documents.filter((item: any) => item.isActive !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [documents]);

  const statCards = [
    { key: "total", label: `Total ${title}s`, value: stats.total, icon: FileText, toneClass: "bg-blue-50 text-[#2563EB]", borderClass: "" },
    { key: "active", label: "Active", value: stats.active, icon: CheckCircle2, toneClass: "bg-emerald-50 text-emerald-600", borderClass: "border-l-4 border-l-emerald-500" },
    { key: "inactive", label: "Inactive", value: stats.inactive, icon: XCircle, toneClass: "bg-rose-50 text-rose-600", borderClass: "border-l-4 border-l-rose-500" },
  ];

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return documents
      .filter((item: any) => {
        const isActive = item.isActive !== false;
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive) return false;
        if (!query) return true;
        return String(item.name || "").toLowerCase().includes(query);
      })
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [documents, statusFilter, searchQuery]);

  const openVisibilityModal = (item: any) => {
    const currentEmployees = (Array.isArray(item.visibleEmployeeIds) ? item.visibleEmployeeIds : [])
      .map((id: any) => String(id))
      .filter((id: string) => rosterIdSet.has(id));
    const currentAssignedDepts = (Array.isArray(item.assignedDepartmentIds) ? item.assignedDepartmentIds : []).map((id: any) => String(id));
    setSelectedDoc(item);
    setVisibilityEmployeeIds(currentEmployees);
    setVisibilityAssignedDepartmentIds(currentAssignedDepts);
    setModalType("visibility");
    setOpenModal(true);
  };

  if (!departmentId) {
    return (
      <p className="text-[11px] font-pmedium text-slate-400 text-center py-10">
        No managed department found for this account.
      </p>
    );
  }

  const isSelectedDocOwned = selectedDoc && String(selectedDoc.departmentId) === String(departmentId);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 shrink-0">
        {statCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div
              key={card.key}
              className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
              </div>
              <div className={`p-2 rounded-2xl ${card.toneClass} shrink-0`}>
                <CardIcon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
          <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {STATUS_PILLS.map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setStatusFilter(pill.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium transition-all sm:text-[12px] ${
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
            <div className="relative min-w-[180px] flex-1 xl:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder={`Search ${title.toLowerCase()}s...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setModalType("add");
                setOpenModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#2563EB] px-3.5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            >
              <Plus size={14} /> Add {title}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4">{title} Name</th>
                <th className="px-5 py-4">Assigned By</th>
                <th className="px-5 py-4">Upload Date</th>
                <th className="px-5 py-4">Modified Date</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => <DocumentsTableRowSkeleton key={rowIndex} />)
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 font-pmedium">
                    <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                    No {title.toLowerCase()}s found.
                  </td>
                </tr>
              ) : (
                visible.map((item: any) => {
                  const isActive = item.isActive !== false;
                  const isOwned = String(item.departmentId) === String(departmentId);
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <a
                          className="text-[12px] font-pmedium text-[#2563EB] underline cursor-pointer"
                          href={item.fileUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.name || "Untitled"}
                        </a>
                      </td>
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">
                        {isOwned ? "Own" : item.departmentName || "Other"}
                      </td>
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{humanDate(item.createdAt)}</td>
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{humanDate(item.updatedAt)}</td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge isActive={isActive} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openVisibilityModal(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            title="Manage visibility"
                          >
                            <Users size={14} strokeWidth={2.5} />
                          </button>
                          {isOwned && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalType("edit");
                                  setSelectedDoc(item);
                                  setEditValue("newName", item.name || "");
                                  setEditValue("file", null);
                                  setOpenModal(true);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                                title={`Edit ${title.toLowerCase()}`}
                              >
                                <Edit3 size={14} strokeWidth={2.5} />
                              </button>
                              {isActive ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("delete");
                                    setSelectedDoc(item);
                                    setOpenModal(true);
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-rose-100 hover:text-rose-600"
                                  title="Mark as inactive"
                                >
                                  <Trash2 size={14} strokeWidth={2.5} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleStatus({ documentId: item._id, nextActive: true })}
                                  disabled={isTogglingStatus}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50"
                                  title="Mark as active"
                                >
                                  <CheckCircle2 size={14} strokeWidth={2.5} />
                                </button>
                              )}
                            </>
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

      {openModal && (
        <div
          className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                  {modalType === "visibility" ? <Users size={18} /> : <FileText size={18} />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-pmedium text-slate-800 truncate">
                    {modalType === "add"
                      ? `Add ${title}`
                      : modalType === "edit"
                        ? `Edit ${title}`
                        : modalType === "visibility"
                          ? "Manage Visibility"
                          : `Mark ${title} As Inactive`}
                  </h2>
                  <p className="text-[11px] font-pmedium text-slate-500 mt-0.5">
                    {modalType === "add"
                      ? `Upload a new department ${title.toLowerCase()} PDF`
                      : modalType === "edit"
                        ? `Renaming or replacing the PDF for ${selectedDoc?.name || "this document"}`
                        : modalType === "visibility"
                          ? `Who can see "${selectedDoc?.name || "this document"}"`
                          : "Hides it from employees without deleting it"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white">
              {modalType === "add" && (
                <form onSubmit={handleSubmit((values: any) => uploadDoc(values))} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                      Document Name <span className="text-red-400">*</span>
                    </label>
                    <Controller
                      name="documentName"
                      control={control}
                      rules={{ required: "Document Name is required", validate: { noOnlyWhitespace, isAlphanumeric } }}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder={title === "SOP" ? "e.g. Client Onboarding SOP" : "e.g. Code of Conduct"}
                          className={`w-full rounded-lg border px-3 py-2.5 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${
                            errors.documentName ? "border-red-300 bg-red-50" : "border-slate-200/60 bg-white"
                          }`}
                        />
                      )}
                    />
                    {errors.documentName && (
                      <span className="text-[10px] font-pmedium text-red-500">{String(errors.documentName.message)}</span>
                    )}
                  </div>

                  <Controller
                    name="file"
                    control={control}
                    rules={{ required: `${title} PDF is required` }}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                          {title} PDF <span className="text-red-400">*</span>
                        </label>
                        <label
                          htmlFor="department-doc-file"
                          className={`flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50/40 ${
                            errors.file ? "border-red-300 bg-red-50" : "border-slate-300 bg-slate-50/60"
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                            <Upload size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-pmedium text-slate-700">
                              {(field.value as File | null)?.name || "Click to upload PDF"}
                            </p>
                            <p className="text-[10px] font-pmedium text-slate-400">PDF only, up to 5MB</p>
                          </div>
                        </label>
                        <input
                          id="department-doc-file"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => field.onChange(e.target.files?.[0] || null)}
                        />
                        {errors.file && (
                          <span className="text-[10px] font-pmedium text-red-500">{String(errors.file.message)}</span>
                        )}
                      </div>
                    )}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                      Show to employees in {managedDepartment?.name || "your department"}
                    </label>
                    <p className="text-[10px] font-pmedium text-slate-400 -mt-1">
                      Leave empty to keep it manager-only for now — you can change this anytime.
                    </p>
                    <Controller
                      name="employeeIds"
                      control={control}
                      render={({ field }) => (
                        <MultiSelectDropdown
                          items={ownDepartmentRoster}
                          selectedIds={field.value || []}
                          onChange={field.onChange}
                          placeholder="Select employees..."
                          emptyLabel="No employees in your department yet."
                        />
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                      Also share with other departments
                    </label>
                    <p className="text-[10px] font-pmedium text-slate-400 -mt-1">
                      Their manager will see it as assigned, and can choose which of their employees see it.
                    </p>
                    <Controller
                      name="assignedDepartmentIds"
                      control={control}
                      render={({ field }) => (
                        <MultiSelectDropdown
                          items={otherDepartments}
                          selectedIds={field.value || []}
                          onChange={field.onChange}
                          placeholder="Select departments..."
                          emptyLabel="No other departments available."
                        />
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOpenModal(false)}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {isUploading ? "Uploading..." : `Upload ${title}`}
                    </button>
                  </div>
                </form>
              )}

              {modalType === "edit" && (
                <form
                  onSubmit={handleEditSubmit((values: any) =>
                    editDoc({ documentId: selectedDoc?._id, name: values.newName, file: values.file }),
                  )}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                      Document Name <span className="text-red-400">*</span>
                    </label>
                    <Controller
                      name="newName"
                      control={editControl}
                      rules={{ required: "Document Name is required", validate: { noOnlyWhitespace, isAlphanumeric } }}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className={`w-full rounded-lg border px-3 py-2.5 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${
                            editErrors.newName ? "border-red-300 bg-red-50" : "border-slate-200/60 bg-white"
                          }`}
                        />
                      )}
                    />
                    {editErrors.newName && (
                      <span className="text-[10px] font-pmedium text-red-500">{String(editErrors.newName.message)}</span>
                    )}
                  </div>

                  <Controller
                    name="file"
                    control={editControl}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                          Replace {title} PDF <span className="text-slate-400 normal-case">(optional)</span>
                        </label>
                        <label
                          htmlFor="department-doc-edit-file"
                          className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50/40"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                            <Upload size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-pmedium text-slate-700">
                              {(field.value as File | null)?.name || "Keep current PDF"}
                            </p>
                            <p className="text-[10px] font-pmedium text-slate-400">PDF only, up to 5MB</p>
                          </div>
                        </label>
                        <input
                          id="department-doc-edit-file"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => field.onChange(e.target.files?.[0] || null)}
                        />
                      </div>
                    )}
                  />

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOpenModal(false)}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isEditing}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isEditing ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
                      {isEditing ? "Saving..." : `Update ${title}`}
                    </button>
                  </div>
                </form>
              )}

              {modalType === "visibility" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                      Show to employees in {managedDepartment?.name || "your department"}
                    </label>
                    <MultiSelectDropdown
                      items={ownDepartmentRoster}
                      selectedIds={visibilityEmployeeIds}
                      onChange={setVisibilityEmployeeIds}
                      placeholder="Select employees..."
                      emptyLabel="No employees in your department yet."
                    />
                  </div>

                  {isSelectedDocOwned ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                        Also share with other departments
                      </label>
                      <p className="text-[10px] font-pmedium text-slate-400 -mt-1">
                        Their manager will see it as assigned, and can choose which of their employees see it.
                      </p>
                      <MultiSelectDropdown
                        items={otherDepartments}
                        selectedIds={visibilityAssignedDepartmentIds}
                        onChange={setVisibilityAssignedDepartmentIds}
                        placeholder="Select departments..."
                        emptyLabel="No other departments available."
                      />
                    </div>
                  ) : (
                    <p className="text-[10px] font-pmedium text-slate-400">
                      This was assigned to your department by {selectedDoc?.departmentName || "another department"} — only they can
                      re-share it further. You can still choose which of your own employees see it.
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOpenModal(false)}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        saveVisibility(
                          isSelectedDocOwned
                            ? { employeeIds: visibilityEmployeeIds, assignedDepartmentIds: visibilityAssignedDepartmentIds }
                            : { employeeIds: visibilityEmployeeIds },
                        )
                      }
                      disabled={isSavingVisibility}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSavingVisibility ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                      {isSavingVisibility ? "Saving..." : "Save Visibility"}
                    </button>
                  </div>
                </div>
              )}

              {modalType === "delete" && (
                <div className="flex flex-col items-center gap-4 text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-pmedium text-slate-800">Mark "{selectedDoc?.name}" as inactive?</p>
                    <p className="text-[11px] font-pmedium text-slate-500 mt-1">
                      It will stop showing to employees but stays in your records.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full pt-2">
                    <button
                      type="button"
                      onClick={() => setOpenModal(false)}
                      className="flex-1 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus({ documentId: selectedDoc?._id, nextActive: false })}
                      disabled={isTogglingStatus}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-all"
                    >
                      {isTogglingStatus ? <Loader2 size={14} className="animate-spin" /> : null} Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDocumentsTabBase;
