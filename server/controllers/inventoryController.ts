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

const getCurrentWorkspaceId = (req: Request) => {
  const user = (req as any).user || {};
  return (
    (req as any).workspaceMembership?.workspace ||
    user.activeWorkspaceId ||
    user.activeWorkspace ||
    user.primaryWorkspace ||
    user.workspaceId ||
    req.body?.workspaceId ||
    req.query?.workspaceId
  );
};

export async function listInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const query = { ...request.query, workspaceId: getCurrentWorkspaceId(request) };
    const result = await listInventoryForCurrentUser(userId, query);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const body = { ...request.body, workspaceId: getCurrentWorkspaceId(request) };
    const result = await createInventoryForCurrentUser(userId, body);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const body = { ...request.body, workspaceId: getCurrentWorkspaceId(request) };
    const result = await updateInventoryForCurrentUser(userId, inventoryId, body);
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

