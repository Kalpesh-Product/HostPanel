// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import {
  listVirtualOfficesForCurrentUser,
  getVirtualOfficeForCurrentUser,
  createVirtualOfficeForCurrentUser,
  updateVirtualOfficeForCurrentUser,
  deleteVirtualOfficeForCurrentUser,
  recordRentPaymentForCurrentUser,
} from "../services/virtualOffice.service.js";

const getUserId = (req) => req.user?.id || req.user?._id || req.user;

export const listVirtualOffices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await listVirtualOfficesForCurrentUser(getUserId(req), req.query);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getVirtualOffice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getVirtualOfficeForCurrentUser(getUserId(req), req.params.id);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const createVirtualOffice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createVirtualOfficeForCurrentUser(getUserId(req), req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateVirtualOffice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await updateVirtualOfficeForCurrentUser(getUserId(req), req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const deleteVirtualOffice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deleteVirtualOfficeForCurrentUser(getUserId(req), req.params.id);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const recordVirtualOfficeRentPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await recordRentPaymentForCurrentUser(getUserId(req), req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};
