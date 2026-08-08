// @ts-nocheck
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { TextField } from "@mui/material";
import { CheckCircle2, Edit3, FileText, Plus, Search, Trash2 } from "lucide-react";
import MuiModal from "@/components/MuiModal";
import UploadFileInput from "@/components/UploadFileInput";
import PrimaryButton from "@/components/PrimaryButton";
import SecondaryButton from "@/components/SecondaryButton";
import DangerButton from "@/components/DangerButton";
import useAxiosPrivate from "@/hooks/useAxiosPrivate";
import useManagedDepartment from "@/hooks/useManagedDepartment";
import { noOnlyWhitespace, isAlphanumeric } from "@/utils/validators";
import humanDate from "@/utils/humanDateForamt";
import {
  getDepartmentDocuments,
  uploadDepartmentDocument,
  updateDepartmentDocument,
  toggleDepartmentDocumentStatus,
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

const DepartmentDocumentsTabBase = ({ docType, title }: DepartmentDocumentsTabBaseProps) => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { managedDepartment } = useManagedDepartment();
  const departmentId = managedDepartment?.id || "";

  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit" | "delete" | "">("");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
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

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: { documentName: "", file: null as File | null },
  });

  const {
    handleSubmit: handleEditSubmit,
    control: editControl,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm({
    mode: "onChange",
    defaultValues: { newName: "" },
  });

  const { mutate: uploadDoc, isPending: isUploading } = useMutation({
    mutationFn: async (values: { documentName: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", values.file);
      formData.append("departmentId", departmentId);
      formData.append("docType", docType);
      formData.append("name", values.documentName);
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
    mutationFn: async (values: { documentId: string; name: string }) =>
      updateDepartmentDocument(axiosPrivate, values.documentId, { name: values.name }),
    onSuccess: () => {
      toast.success(`${title} updated successfully!`);
      setOpenModal(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || `Failed to update ${title.toLowerCase()}.`);
    },
  });

  const { mutate: deactivateDoc, isPending: isDeactivating } = useMutation({
    mutationFn: async (documentId: string) => toggleDepartmentDocumentStatus(axiosPrivate, documentId, false),
    onSuccess: () => {
      toast.success(`${title} marked as inactive successfully!`);
      setOpenModal(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || `Failed to update ${title.toLowerCase()}.`);
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
    { key: "inactive", label: "Inactive", value: stats.inactive, icon: Trash2, toneClass: "bg-rose-50 text-rose-600", borderClass: "border-l-4 border-l-rose-500" },
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

  if (!departmentId) {
    return (
      <p className="text-[11px] font-pmedium text-slate-400 text-center py-10">
        No managed department found for this account.
      </p>
    );
  }

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
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4">{title} Name</th>
                <th className="px-5 py-4">Upload Date</th>
                <th className="px-5 py-4">Modified Date</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400 font-pmedium">
                    Loading...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400 font-pmedium">
                    <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                    No {title.toLowerCase()}s found.
                  </td>
                </tr>
              ) : (
                visible.map((item: any) => {
                  const isActive = item.isActive !== false;
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
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{humanDate(item.createdAt)}</td>
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{humanDate(item.updatedAt)}</td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${
                            isActive
                              ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                              : "text-slate-500 bg-slate-50 border-slate-200"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setModalType("edit");
                              setSelectedDoc(item);
                              setEditValue("newName", item.name || "");
                              setOpenModal(true);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            title={`Edit ${title.toLowerCase()}`}
                          >
                            <Edit3 size={14} strokeWidth={2.5} />
                          </button>
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

      <MuiModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={
          modalType === "add" ? `Add ${title}` : modalType === "edit" ? `Edit ${title}` : `Mark ${title} As Inactive`
        }
      >
        {modalType === "add" && (
          <form
            onSubmit={handleSubmit((values: any) => uploadDoc(values))}
            className="grid grid-cols-1 gap-4"
          >
            <Controller
              name="documentName"
              control={control}
              rules={{ required: "Document Name is required", validate: { noOnlyWhitespace, isAlphanumeric } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Document Name"
                  size="small"
                  fullWidth
                  error={!!errors.documentName}
                  helperText={errors?.documentName?.message}
                />
              )}
            />
            <Controller
              name="file"
              control={control}
              rules={{ required: `${title} file is required` }}
              render={({ field }) => (
                <UploadFileInput value={field.value} onChange={field.onChange} previewType="pdf" />
              )}
            />
            <PrimaryButton type="submit" title={`Upload ${title}`} isLoading={isUploading} disabled={isUploading} />
          </form>
        )}

        {modalType === "edit" && (
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={handleEditSubmit((values: any) =>
              editDoc({ documentId: selectedDoc?._id, name: values.newName }),
            )}
          >
            <Controller
              name="newName"
              control={editControl}
              rules={{ required: "Document Name is required", validate: { noOnlyWhitespace, isAlphanumeric } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Document Name"
                  fullWidth
                  error={!!editErrors.newName}
                  helperText={editErrors?.newName?.message}
                />
              )}
            />
            <PrimaryButton type="submit" title={`Update ${title}`} isLoading={isEditing} disabled={isEditing} />
          </form>
        )}

        {modalType === "delete" && (
          <div className="border-default border-borderGray rounded-xl flex flex-col gap-4 p-4">
            <span>Mark {selectedDoc?.name} as Inactive?</span>
            <div className="flex justify-end gap-4 items-center">
              <SecondaryButton title="Cancel" handleSubmit={() => setOpenModal(false)} />
              <DangerButton
                title="Confirm"
                handleSubmit={() => deactivateDoc(selectedDoc?._id)}
              />
            </div>
          </div>
        )}
      </MuiModal>
    </div>
  );
};

export default DepartmentDocumentsTabBase;
