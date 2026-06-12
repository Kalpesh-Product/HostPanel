// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import {
  listTenantCompaniesForCurrentUser,
  getTenantCompanyForCurrentUser,
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
} from "../services/tenant-company.service.js";

export const listTenantCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await listTenantCompaniesForCurrentUser(userId, req.query);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await getTenantCompanyForCurrentUser(userId, req.params.id);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const createTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await createTenantCompanyForCurrentUser(userId, req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await updateTenantCompanyForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const renewTenantCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await renewTenantCompanyForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const assignTenantCompanySpace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await assignTenantCompanySpaceForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const addTenantCompanyEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await addTenantCompanyEmployeeForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateTenantCompanyEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await updateTenantCompanyEmployeeForCurrentUser(userId, req.params.id, req.params.employeeId, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateTenantCompanyEmployeeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await updateTenantCompanyEmployeeStatusForCurrentUser(userId, req.params.id, req.params.employeeId, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const deleteTenantCompanyEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await deleteTenantCompanyEmployeeForCurrentUser(userId, req.params.id, req.params.employeeId);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const assignTenantCompanyManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await assignTenantCompanyManagerForCurrentUser(userId, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const uploadTenantCompanyAgreementDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const files = req.files || req.file ? (Array.isArray(req.files) ? req.files : req.file ? [req.file] : []) : [];
    const result = await uploadTenantCompanyAgreementDocumentsForCurrentUser(userId, req.params.id, files);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getMyTenantCompanyCreditRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await getMyTenantCompanyCreditRequestsForCurrentUser(userId);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const createMyTenantCompanyCreditRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await createMyTenantCompanyCreditRequestForCurrentUser(userId, req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const submitMyTenantCompanyCreditRequestPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const file = req.file;
    const result = await submitMyTenantCompanyCreditRequestPaymentForCurrentUser(userId, req.params.requestId, req.body, file);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateTenantCompanyCreditRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await updateTenantCompanyCreditRequestForCurrentUser(userId, req.params.id, req.params.requestId, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};
