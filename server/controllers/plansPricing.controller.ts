import { Request, Response, NextFunction } from "express";
import {
    createPlansPricingForOwner,
    deletePlansPricingForOwner,
    getAvailableTenantResourcesForWorkspace,
    listPlansPricingForOwner,
    updatePlansPricingForOwner,
} from "../services/plansPricing.service.js";

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

export async function listPricingPackages(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const result = await listPlansPricingForOwner(workspaceId, ownerId);

        response.status(200).json({
            success: true,
            message: "Pricing packages loaded successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function createPricingPackage(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const result = await createPlansPricingForOwner(workspaceId, ownerId, request.body);

        response.status(201).json({
            success: true,
            message: "Pricing package created successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function updatePricingPackage(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const packageId = request.params.packageId as string;
        const result = await updatePlansPricingForOwner(workspaceId, ownerId, packageId, request.body);

        response.status(200).json({
            success: true,
            message: "Pricing package updated successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function deletePricingPackage(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const ownerId = getUserId(request);
        const packageId = request.params.packageId as string;
        const result = await deletePlansPricingForOwner(workspaceId, ownerId, packageId);

        response.status(200).json({
            success: true,
            message: "Pricing package deleted successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function getAvailableTenantResources(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceId(request);
        const { floor = "", wing = "" } = request.query as { floor?: string; wing?: string };
        const resources = await getAvailableTenantResourcesForWorkspace(workspaceId, floor, wing);

        response.status(200).json({
            success: true,
            message: "Available tenant resources loaded successfully.",
            data: { resources },
        });
    } catch (error) {
        next(error);
    }
}
