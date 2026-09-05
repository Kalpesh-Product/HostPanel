import { axiosPrivate } from "../utils/axios";

export const getTenantCompanies = async (params?: Record<string, any>) => {
  return axiosPrivate.get("/api/v1/tenant-companies", { params });
};

// The list endpoint paginates (100 per page max) to keep individual queries bounded.
// The list pages themselves now page through it incrementally (infinite scroll),
// but actions like "export report" need the complete matching set regardless of
// how much has been scrolled into view — this pages through every result for a
// given filter (search/status/packageFilter) and merges it into one array.
export const getAllTenantCompanies = async (params?: Record<string, any>) => {
  const first = await getTenantCompanies({ ...params, page: 1, limit: 100 });
  const firstPayload = first?.data || {};
  const tenants = Array.isArray(firstPayload.tenants) ? [...firstPayload.tenants] : [];
  const totalPages = Number(firstPayload.totalPages || 1);

  if (totalPages > 1) {
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const remainingResults = await Promise.all(
      remainingPages.map((page) => getTenantCompanies({ ...params, page, limit: 100 }))
    );
    remainingResults.forEach((result) => {
      const pagePayload = result?.data || {};
      if (Array.isArray(pagePayload.tenants)) tenants.push(...pagePayload.tenants);
    });
  }

  return { data: { ...firstPayload, tenants } };
};

export const getMyTenantCompany = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies/my");
};

export const getTenantCompanySectors = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies/sectors");
};

// Visitor requests routed to the current user as their tenant company's
// designated manager (Standard Visitor > Tenant Company Visitor from
// Visitor Management's Frontdesk Action).
export const getMyTenantCompanyVisitorRequests = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies/my/visitor-requests");
};

export const reviewMyTenantCompanyVisitorRequest = async (
  visitorId: string,
  payload: { decision: "approved" | "rejected"; reason?: string },
) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/my/visitor-requests/${visitorId}`, payload);
};

export const createTenantCompany = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/v1/tenant-companies", payload);
};

export const updateTenantCompany = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/${id}`, payload);
};

export const renewTenantCompany = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/tenant-companies/${id}/renew`, payload);
};

export const addTenantCompanyEmployee = async (id: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/tenant-companies/${id}/employees`, payload);
};

export const sendTenantCompanyEmployeeInvite = async (id: string, employeeId: string) => {
  return axiosPrivate.post(`/api/v1/tenant-companies/${id}/employees/${employeeId}/send-invite`);
};

export const uploadTenantCompanyAgreementDocuments = async (id: string, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("documents", file));
  return axiosPrivate.post(`/api/v1/tenant-companies/${id}/agreement-documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateTenantCompanyCreditRequest = async (
  tenantCompanyId: string,
  requestId: string,
  payload: Record<string, any>
) => {
  return axiosPrivate.patch(
    `/api/v1/tenant-companies/${tenantCompanyId}/credit-requests/${requestId}`,
    payload
  );
};

export const getTenantCompany = async (id: string) => {
  return axiosPrivate.get(`/api/v1/tenant-companies/${id}`);
};

export const deleteTenantCompanyEmployee = async (tenantCompanyId: string, employeeId: string) => {
  return axiosPrivate.delete(`/api/v1/tenant-companies/${tenantCompanyId}/employees/${employeeId}`);
};

export const updateTenantCompanyEmployee = async (tenantCompanyId: string, employeeId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/${tenantCompanyId}/employees/${employeeId}`, payload);
};

export const updateTenantCompanyEmployeeStatus = async (tenantCompanyId: string, employeeId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/${tenantCompanyId}/employees/${employeeId}/status`, payload);
};

export const updateTenantCompanyManager = async (tenantCompanyId: string, payload: Record<string, any>) => {
  return axiosPrivate.patch(`/api/v1/tenant-companies/${tenantCompanyId}/manager`, payload);
};

export const assignTenantCompanySpace = async (tenantCompanyId: string, payload: Record<string, any>) => {
  return axiosPrivate.post(`/api/v1/tenant-companies/${tenantCompanyId}/space`, payload);
};

export const getMyTenantCompanyCreditRequests = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies/my/credit-requests");
};

export const createMyTenantCompanyCreditRequest = async (payload: Record<string, any>) => {
  return axiosPrivate.post("/api/v1/tenant-companies/my/credit-requests", payload);
};

export const submitMyTenantCompanyCreditRequestPayment = async (requestId: string, payload: { paymentProof: File; transactionId?: string }) => {
  const formData = new FormData();
  formData.append("paymentProof", payload.paymentProof);
  if (payload.transactionId) {
    formData.append("transactionId", payload.transactionId);
  }
  return axiosPrivate.post(`/api/v1/tenant-companies/my/credit-requests/${requestId}/payment`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// --- Tenant Rent (monthly rent receivables) ---

export const getMyTenantRent = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies/my/rent");
};

export const submitMyTenantRentPayment = async (rentId: string, payload: { paymentProof: File; amount: number; transactionReference?: string }) => {
  const formData = new FormData();
  formData.append("paymentProof", payload.paymentProof);
  formData.append("amount", String(payload.amount));
  if (payload.transactionReference) {
    formData.append("transactionReference", payload.transactionReference);
  }
  return axiosPrivate.post(`/api/v1/tenant-companies/my/rent/${rentId}/payment`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getPendingPaymentVerifications = async () => {
  return axiosPrivate.get("/api/v1/tenant-companies/pending-payments");
};

export const confirmTenantCreditRequestPayment = async (
  tenantCompanyId: string,
  requestId: string,
  payload: { financeNote?: string } = {}
) => {
  return axiosPrivate.patch(
    `/api/v1/tenant-companies/${tenantCompanyId}/credit-requests/${requestId}/confirm-payment`,
    payload
  );
};

