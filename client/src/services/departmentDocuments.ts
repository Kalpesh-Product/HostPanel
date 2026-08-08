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

export const updateDepartmentDocument = (
  axiosPrivate: AxiosInstance,
  documentId: string,
  payload: { name: string },
) => axiosPrivate.patch(`/api/department-documents/${documentId}`, payload);

export const toggleDepartmentDocumentStatus = (
  axiosPrivate: AxiosInstance,
  documentId: string,
  isActive: boolean,
) => axiosPrivate.patch(`/api/department-documents/${documentId}/status`, { isActive });
