// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import WorkspaceMember from "../models/WorkspaceMember.js";
import {
  listInventoryForCurrentUser,
  createInventoryForCurrentUser,
  updateInventoryForCurrentUser,
  allocateInventoryForCurrentUser,
  transferInventoryForCurrentUser,
  deleteInventoryForCurrentUser,
  returnInventoryForCurrentUser,
  markUnderMaintenanceForCurrentUser,
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

function getRoleBand(role) {
  const r = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (r === "founder" || r === "owner") return "owner";
  if (r === "super_admin" || r === "superadmin") return "super_admin";
  if (r === "admin" || r === "admin_manager") return "admin";
  if (r === "manager") return "manager";
  return "employee";
}

async function resolveAssignedDepartmentNames(req: Request): Promise<string[]> {
  try {
    const workspaceId = getCurrentWorkspaceId(req);
    const userId = (req as any).user?.id || (req as any).user?._id || (req as any).user;
    if (!workspaceId || !userId) return [];

    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: userId,
    })
      .populate("departments", "name")
      .lean()
      .exec();

    if (!membership?.departments || !Array.isArray(membership.departments)) return [];
    return membership.departments
      .map((d: any) => d?.name)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function listInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const roleBand = getRoleBand((request as any).workspaceMembership?.role);
    const assignedDepartmentNames = await resolveAssignedDepartmentNames(request);
    const query = {
      ...request.query,
      workspaceId: getCurrentWorkspaceId(request),
      roleBand,
      assignedDepartmentNames,
    };
    const result = await listInventoryForCurrentUser(userId, query);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const roleBand = getRoleBand((request as any).workspaceMembership?.role);
    const assignedDepartmentNames = await resolveAssignedDepartmentNames(request);
    const body = {
      ...request.body,
      workspaceId: getCurrentWorkspaceId(request),
      roleBand,
      assignedDepartmentNames,
    };
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
    const roleBand = getRoleBand((request as any).workspaceMembership?.role);
    const assignedDepartmentNames = await resolveAssignedDepartmentNames(request);
    const body = {
      ...request.body,
      workspaceId: getCurrentWorkspaceId(request),
      roleBand,
      assignedDepartmentNames,
    };
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
    const roleBand = getRoleBand((request as any).workspaceMembership?.role);
    const assignedDepartmentNames = await resolveAssignedDepartmentNames(request);
    const result = await allocateInventoryForCurrentUser(userId, inventoryId, {
      ...request.body,
      roleBand,
      assignedDepartmentNames,
    });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function transferInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const roleBand = getRoleBand((request as any).workspaceMembership?.role);
    const result = await transferInventoryForCurrentUser(userId, inventoryId, {
      ...request.body,
      roleBand,
    });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const roleBand = getRoleBand((request as any).workspaceMembership?.role);
    const assignedDepartmentNames = await resolveAssignedDepartmentNames(request);
    const result = await deleteInventoryForCurrentUser(userId, inventoryId, {
      roleBand,
      assignedDepartmentNames,
    });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function returnInventory(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const roleBand = getRoleBand((request as any).workspaceMembership?.role);
    const assignedDepartmentNames = await resolveAssignedDepartmentNames(request);
    const result = await returnInventoryForCurrentUser(userId, inventoryId, {
      ...request.body,
      roleBand,
      assignedDepartmentNames,
    });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function markUnderMaintenance(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = (request as any).user?.id || (request as any).user?._id || (request as any).user;
    const inventoryId = request.params.inventoryId;
    const roleBand = getRoleBand((request as any).workspaceMembership?.role);
    const assignedDepartmentNames = await resolveAssignedDepartmentNames(request);
    const result = await markUnderMaintenanceForCurrentUser(userId, inventoryId, {
      ...request.body,
      roleBand,
      assignedDepartmentNames,
    });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
