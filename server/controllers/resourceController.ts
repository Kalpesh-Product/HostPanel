import { Request, Response, NextFunction } from "express";
import {
    assignResourceForOwner,
    createResourceForOwner,
    deleteResourceForOwner,
    listResourcesForOwner,
    releaseResourceAssignmentForOwner,
    updateResourceForOwner,
} from "../services/resourceService.js";
import {
    assignSeatForOwner,
    getSeatResourceGroupsByAssignee,
    getSeatSummaryByLocation,
    listSeatsForResource,
    releaseSeatAssignmentForOwner,
} from "../services/resourceSeatService.js";

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

export async function listResourceSeats(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const resourceId = request.params.resourceId as string;
        const seats = await listSeatsForResource(workspaceId, resourceId);

        response.status(200).json({
            success: true,
            message: "Seats loaded successfully.",
            data: { seats },
        });
    } catch (error) {
        next(error);
    }
}

export async function assignResourceSeat(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const resourceId = request.params.resourceId as string;
        const seatNumber = Number(request.params.seatNumber);
        const seat = await assignSeatForOwner(workspaceId, ownerId, resourceId, seatNumber, request.body);

        response.status(200).json({
            success: true,
            message: "Seat assignment saved successfully.",
            data: { seat },
        });
    } catch (error) {
        next(error);
    }
}

export async function releaseResourceSeatAssignment(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const resourceId = request.params.resourceId as string;
        const seatNumber = Number(request.params.seatNumber);
        const seat = await releaseSeatAssignmentForOwner(workspaceId, ownerId, resourceId, seatNumber);

        response.status(200).json({
            success: true,
            message: "Seat assignment released successfully.",
            data: { seat },
        });
    } catch (error) {
        next(error);
    }
}

export async function getResourceSeatSummary(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const { floor, wing, resourceCategory } = request.query as { floor?: string; wing?: string; resourceCategory?: string };
        const summary = await getSeatSummaryByLocation(workspaceId, { floor, wing, resourceCategory });

        response.status(200).json({
            success: true,
            message: "Seat summary loaded successfully.",
            data: { summary },
        });
    } catch (error) {
        next(error);
    }
}

export async function getResourceSeatAssignments(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const groups = await getSeatResourceGroupsByAssignee(workspaceId);

        response.status(200).json({
            success: true,
            message: "Seat assignments loaded successfully.",
            data: groups,
        });
    } catch (error) {
        next(error);
    }
}
