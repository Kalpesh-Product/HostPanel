import { Request, Response, NextFunction } from "express";
import {
    assignResourceForOwner,
    createResourceForOwner,
    deleteResourceForOwner,
    listResourcesForOwner,
    releaseResourceAssignmentForOwner,
    updateResourceForOwner,
} from "../services/resourceService.js";

interface AuthenticatedRequest extends Request {
    user?: string;
    workspaceMembership?: {
        workspace: string;
        role: string;
        isPrimary: boolean;
    };
}

function getUserId(req: AuthenticatedRequest): string {
    if (!req.user) throw new Error("Authentication required");
    return req.user;
}

function getWorkspaceId(req: AuthenticatedRequest): string {
    const id = req.workspaceMembership?.workspace || req.body.workspaceId;
    if (!id) throw new Error("Workspace ID is required");
    return id;
}

export async function listResources(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const result = await listResourcesForOwner(workspaceId, ownerId);

        response.status(200).json({
            success: true,
            message: "Resources loaded successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function createResource(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const result = await createResourceForOwner(workspaceId, ownerId, request.body);

        response.status(201).json({
            success: true,
            message: "Resource created successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateResource(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const resourceId = request.params.resourceId as string;
        const result = await updateResourceForOwner(workspaceId, ownerId, resourceId, request.body);

        response.status(200).json({
            success: true,
            message: "Resource updated successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteResource(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const resourceId = request.params.resourceId as string;
        const result = await deleteResourceForOwner(workspaceId, ownerId, resourceId);

        response.status(200).json({
            success: true,
            message: "Resource deleted successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function assignResource(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const resourceId = request.params.resourceId as string;
        const result = await assignResourceForOwner(workspaceId, ownerId, resourceId, request.body);

        response.status(200).json({
            success: true,
            message: "Resource assignment saved successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function releaseResourceAssignment(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const resourceId = request.params.resourceId as string;
        const result = await releaseResourceAssignmentForOwner(workspaceId, ownerId, resourceId);

        response.status(200).json({
            success: true,
            message: "Resource assignment released successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}
