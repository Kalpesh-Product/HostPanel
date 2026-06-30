import { axiosPrivate } from "../utils/axios";

const unwrap = <T = any>(response: any): T => response?.data?.data ?? response?.data ?? response;

export const getRecruitmentOverview = async () => {
  const response = await axiosPrivate.get("/api/recruitment/overview");
  return unwrap(response);
};

export const getRecruitmentJobOpenings = async () => {
  const response = await axiosPrivate.get("/api/recruitment/job-openings");
  return unwrap(response);
};

export const createRecruitmentCandidate = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/recruitment/candidates", payload);
  return unwrap(response);
};

export const updateRecruitmentCandidate = async (candidateId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/recruitment/candidates/${candidateId}`, payload);
  return unwrap(response);
};

export const createRecruitmentJobOpening = async (payload: Record<string, any>) => {
  const response = await axiosPrivate.post("/api/recruitment/job-openings", payload);
  return unwrap(response);
};

export const updateRecruitmentJobOpening = async (jobCode: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.patch(`/api/recruitment/job-openings/${jobCode}`, payload);
  return unwrap(response);
};

export const sendRecruitmentCandidateEmail = async (candidateId: string, payload: Record<string, any>) => {
  const response = await axiosPrivate.post(`/api/recruitment/candidates/${candidateId}/email`, payload);
  return unwrap(response);
};
