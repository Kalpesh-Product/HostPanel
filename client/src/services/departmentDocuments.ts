import type { AxiosInstance } from "axios";

export type DepartmentDocumentType = "sop" | "policy";

export const getDepartmentDocuments = (
  axiosPrivate: AxiosInstance,
  departmentId: string,
  docType: DepartmentDocumentType,
) =>
  axiosPrivate.get("/api/department-documents", {
    params: { departmentId, docType },
  });

export const uploadDepartmentDocument = (axiosPrivate: AxiosInstance, formData: FormData) =>
  axiosPrivate.post("/api/department-documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Company-wide SOPs/Policies (no departmentId) — managed from Company
// Management, surfaced read-only on every member's Company Profile page.
export const getCompanyDocuments = (axiosPrivate: AxiosInstance, docType: DepartmentDocumentType) =>
  axiosPrivate.get("/api/department-documents", {
    params: { scope: "company", docType },
  });

export const uploadCompanyDocument = (axiosPrivate: AxiosInstance, formData: FormData) =>
  axiosPrivate.post("/api/department-documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// formData always carries "name"; "file" is optional (only present when
// replacing the PDF alongside — or instead of — a rename).
export const updateDepartmentDocument = (
  axiosPrivate: AxiosInstance,
  documentId: string,
  formData: FormData,
) =>
  axiosPrivate.patch(`/api/department-documents/${documentId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const toggleDepartmentDocumentStatus = (
  axiosPrivate: AxiosInstance,
  documentId: string,
  isActive: boolean,
) => axiosPrivate.patch(`/api/department-documents/${documentId}/status`, { isActive });

// Founder/super_admin/HR-manager view — every department's SOPs/Policies
// (owned + assigned), grouped department-wise, surfaced on their My Profile.
export const getAllDepartmentDocuments = (axiosPrivate: AxiosInstance, docType: DepartmentDocumentType) =>
  axiosPrivate.get("/api/department-documents", {
    params: { docType, view: "all" },
  });

// A stakeholder department's manager chooses which of their own employees
// can see a doc their department owns or was assigned/shared. Only the
// owner department may also pass assignedDepartmentIds (the server ignores
// it otherwise — a department that received a doc can't re-share it onward).
export const updateDepartmentDocumentVisibility = (
  axiosPrivate: AxiosInstance,
  documentId: string,
  payload: { departmentId: string; employeeIds: string[]; assignedDepartmentIds?: string[] },
) => axiosPrivate.patch(`/api/department-documents/${documentId}/visibility`, payload);

/**
 * Downloads a document's PDF through the API server (same-origin blob fetch)
 * instead of hitting the S3 URL directly — S3's missing CORS policy blocks a
 * raw fetch of the file, which used to make downloads fall back to opening
 * the file in a new tab. The server streams the bytes with a
 * Content-Disposition: attachment header.
 */
export async function downloadDepartmentDocumentFile(
  axiosPrivate: AxiosInstance,
  documentId: string,
  fileName: string = "Document.pdf",
): Promise<void> {
  const response = await axiosPrivate.get(`/api/department-documents/${documentId}/download`, {
    responseType: "blob",
  });
  const objectUrl = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
