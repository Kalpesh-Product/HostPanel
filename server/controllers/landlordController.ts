// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import {
  listLandlordsForWorkspace,
  createLandlordForWorkspace,
  updateLandlordForWorkspace,
  archiveLandlordForWorkspace,
  listLandlordRentForWorkspace,
  createLandlordRentForWorkspace,
  generateLandlordRentForMonth,
  updateLandlordRentForWorkspace,
  recordLandlordRentPayment,
  voidLandlordRentPayment,
} from "../services/landlordRentService.js";

// The workspace always comes from the authenticated membership resolved by
// verifyJwt — never from the request body or query, so a caller cannot read or
// write another workspace's landlord ledger.
function getWorkspaceId(req: Request) {
  return (req as any)?.workspaceMembership?.workspace
    ? (req as any).workspaceMembership.workspace
    : null;
}

function getUserId(req: Request) {
  const user = (req as any).user;
  if (!user) return null;
  return user.id || user._id || user;
}

export async function getLandlords(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await listLandlordsForWorkspace(workspaceId, userId, req.query || {});

    return res.status(200).json({
      success: true,
      message: "Landlords loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createLandlord(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await createLandlordForWorkspace({ workspaceId, userId, body: req.body || {} });

    return res.status(201).json({
      success: true,
      message: "Landlord created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLandlord(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const landlordId = String(req.params.landlordId || "").trim();
    if (!landlordId) return res.status(400).json({ message: "landlordId is required" });

    const result = await updateLandlordForWorkspace({
      workspaceId,
      userId,
      landlordId,
      body: req.body || {},
    });

    return res.status(200).json({
      success: true,
      message: "Landlord updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function archiveLandlord(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const landlordId = String(req.params.landlordId || "").trim();
    if (!landlordId) return res.status(400).json({ message: "landlordId is required" });

    const result = await archiveLandlordForWorkspace({
      workspaceId,
      userId,
      landlordId,
      archive: req.body?.archived !== false,
    });

    return res.status(200).json({
      success: true,
      message: result?.landlord?.status === "Archived" ? "Landlord archived." : "Landlord reactivated.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLandlordRent(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await listLandlordRentForWorkspace(workspaceId, userId, req.query || {});

    return res.status(200).json({
      success: true,
      message: "Landlord rent payables loaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createLandlordRent(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await createLandlordRentForWorkspace({ workspaceId, userId, body: req.body || {} });

    return res.status(201).json({
      success: true,
      message: "Rent payable created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateLandlordRent(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const result = await generateLandlordRentForMonth({
      workspaceId,
      userId,
      periodKey: String(req.body?.periodKey || "").trim(),
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLandlordRent(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const rentId = String(req.params.rentId || "").trim();
    if (!rentId) return res.status(400).json({ message: "rentId is required" });

    const result = await updateLandlordRentForWorkspace({
      workspaceId,
      userId,
      rentId,
      body: req.body || {},
    });

    return res.status(200).json({
      success: true,
      message: "Rent payable updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordLandlordRentPaymentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const rentId = String(req.params.rentId || "").trim();
    if (!rentId) return res.status(400).json({ message: "rentId is required" });

    const result = await recordLandlordRentPayment({ workspaceId, userId, rentId, body: req.body || {} });

    return res.status(200).json({
      success: true,
      message: "Rent payment recorded.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function voidLandlordRentPaymentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!workspaceId) return res.status(401).json({ message: "Unauthorized: workspace not resolved." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not resolved." });

    const rentId = String(req.params.rentId || "").trim();
    const paymentId = String(req.params.paymentId || "").trim();
    if (!rentId) return res.status(400).json({ message: "rentId is required" });
    if (!paymentId) return res.status(400).json({ message: "paymentId is required" });

    const result = await voidLandlordRentPayment({
      workspaceId,
      userId,
      rentId,
      paymentId,
      body: req.body || {},
    });

    return res.status(200).json({
      success: true,
      message: "Rent payment voided.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
