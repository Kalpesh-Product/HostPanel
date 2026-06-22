// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import HostUser from "../models/HostUser.js";
import {
  listTenantCompaniesForCurrentUser,
  getTenantCompanySectorsForCurrentUser,
  getTenantCompanyForCurrentUser,
  getMyTenantCompanyForCurrentUser,
  createTenantCompanyForCurrentUser,
  updateTenantCompanyForCurrentUser,
  renewTenantCompanyForCurrentUser,
  assignTenantCompanySpaceForCurrentUser,
  addTenantCompanyEmployeeForCurrentUser,
  updateTenantCompanyEmployeeForCurrentUser,
  updateTenantCompanyEmployeeStatusForCurrentUser,
  deleteTenantCompanyEmployeeForCurrentUser,
  assignTenantCompanyManagerForCurrentUser,
  uploadTenantCompanyAgreementDocumentsForCurrentUser,
  getMyTenantCompanyCreditRequestsForCurrentUser,
  createMyTenantCompanyCreditRequestForCurrentUser,
  submitMyTenantCompanyCreditRequestPaymentForCurrentUser,
  updateTenantCompanyCreditRequestForCurrentUser,
  confirmTenantCreditRequestPaymentForCurrentUser,
  getPendingPaymentVerificationsForCurrentUser,
} from "../services/tenant-company.service.js";

export const getTenantCompanySectors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await getTenantCompanySectorsForCurrentUser(userId);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const listTenantCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await listTenantCompaniesForCurrentUser(userId, req.query);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await getTenantCompanyForCurrentUser(userId, req.params.id);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getMyTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const user = await HostUser.findById(userId).lean().exec();
    const email = String(user?.email || "").trim().toLowerCase();
    const result = await getMyTenantCompanyForCurrentUser(userId, email);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const createTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await createTenantCompanyForCurrentUser(userId, req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await updateTenantCompanyForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const renewTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await renewTenantCompanyForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const assignTenantCompanySpace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await assignTenantCompanySpaceForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const addTenantCompanyEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await addTenantCompanyEmployeeForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateTenantCompanyEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await updateTenantCompanyEmployeeForCurrentUser(userId, req.params.id, req.params.employeeId, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateTenantCompanyEmployeeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await updateTenantCompanyEmployeeStatusForCurrentUser(userId, req.params.id, req.params.employeeId, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const deleteTenantCompanyEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await deleteTenantCompanyEmployeeForCurrentUser(userId, req.params.id, req.params.employeeId);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const assignTenantCompanyManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await assignTenantCompanyManagerForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const uploadTenantCompanyAgreementDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const files = req.files || req.file ? (Array.isArray(req.files) ? req.files : req.file ? [req.file] : []) : [];
    const result = await uploadTenantCompanyAgreementDocumentsForCurrentUser(userId, req.params.id, files);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getMyTenantCompanyCreditRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await getMyTenantCompanyCreditRequestsForCurrentUser(userId);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const createMyTenantCompanyCreditRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await createMyTenantCompanyCreditRequestForCurrentUser(userId, req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const submitMyTenantCompanyCreditRequestPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const file = req.file;
    const result = await submitMyTenantCompanyCreditRequestPaymentForCurrentUser(userId, req.params.requestId, req.body, file);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateTenantCompanyCreditRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await updateTenantCompanyCreditRequestForCurrentUser(userId, req.params.id, req.params.requestId, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const confirmTenantCreditRequestPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await confirmTenantCreditRequestPaymentForCurrentUser(
      userId,
      req.params.id,
      req.params.requestId,
      req.body
    );
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getPendingPaymentVerifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const result = await getPendingPaymentVerificationsForCurrentUser(userId);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};
