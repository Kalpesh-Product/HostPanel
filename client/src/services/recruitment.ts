import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

const toFormData = (payload: Record<string, any>) => {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
      return;
    }
    formData.append(key, String(value));
  });

  return formData;
};

export const getRecruitmentOverview = async () => {
  const response = await axiosPrivate.get("/api/hr/recruitment");
  return unwrap(response);
};

export const getRecruitmentJobOpenings = async () => {
  const response = await axiosPrivate.get("/api/hr/recruitment/jobs");
  return unwrap(response);
};

export const createRecruitmentCandidate = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/hr/recruitment/candidates", toFormData(payload), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(response);
};

export const updateRecruitmentCandidate = async (candidateId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/hr/recruitment/candidates/${candidateId}`, toFormData(payload), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(response);
};

export const createRecruitmentJobOpening = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/hr/recruitment/jobs", payload);
  return unwrap(response);
};

export const updateRecruitmentJobOpening = async (jobCode: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/hr/recruitment/jobs/${jobCode}`, payload);
  return unwrap(response);
};

export const bulkUploadRecruitmentJobOpenings = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosPrivate.post("/api/hr/recruitment/jobs/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(response);
};

export const sendRecruitmentCandidateEmail = async (candidateId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/hr/recruitment/candidates/${candidateId}/send-email`, payload);
  return unwrap(response);
};
