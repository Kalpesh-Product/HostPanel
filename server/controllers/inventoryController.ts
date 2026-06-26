// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import {
  listInventoryForCurrentUser,
  createInventoryForCurrentUser,
  updateInventoryForCurrentUser,
  allocateInventoryForCurrentUser,
  transferInventoryForCurrentUser,
  deleteInventoryForCurrentUser,
} from "../services/inventoryService.js";

export async function listInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const result = await listInventoryForCurrentUser(userId, request.query);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const result = await createInventoryForCurrentUser(userId, request.body);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const result = await updateInventoryForCurrentUser(userId, inventoryId, request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function allocateInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const result = await allocateInventoryForCurrentUser(userId, inventoryId, request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function transferInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const result = await transferInventoryForCurrentUser(userId, inventoryId, request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const result = await deleteInventoryForCurrentUser(userId, inventoryId);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

