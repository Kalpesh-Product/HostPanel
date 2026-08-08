import { Request, Response, NextFunction } from "express";
import {
  createHolidayForWorkspace,
  createLeaveRequestForUser,
  createLeaveTypeForWorkspace,
  deleteHolidayForWorkspace,
  listHolidaysForWorkspace,
  listLeaveQuotasForWorkspace,
  listLeaveRequestsForUser,
  listLeaveTypesForWorkspace,
  updateHolidayForWorkspace,
  updateLeaveQuotaForUser,
  updateLeaveRequestForUser,
  updateLeaveTypeForWorkspace,
  uploadLeaveCertificateForUser,
  attachLeaveCertificateForUser,
} from "../services/core/leave.service.js";

interface AuthenticatedRequest extends Request {
  user?: string;
  workspaceMembership?: { workspace?: string };
}

const getWorkspaceId = (req: AuthenticatedRequest): string | undefined =>
  typeof req.workspaceMembership?.workspace === "string" && req.workspaceMembership.workspace
    ? req.workspaceMembership.workspace
    : undefined;

export async function createLeaveRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await createLeaveRequestForUser(req.user as string, req.body || {}, getWorkspaceId(req));
    res.status(201).json({ success: true, message: "Leave request created successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function listLeaveRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await listLeaveRequestsForUser(req.user as string, req.query as Record<string, any>, getWorkspaceId(req));
    res.status(200).json({ success: true, message: "Leave requests loaded successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateLeaveRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await updateLeaveRequestForUser(
      req.user as string,
      String(req.params.leaveRequestId),
      req.body || {},
      getWorkspaceId(req),
    );
    res.status(200).json({ success: true, message: "Leave request updated successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function uploadLeaveCertificate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await uploadLeaveCertificateForUser(req.user as string, (req as any).file);
    res.status(201).json({ success: true, message: "Certificate uploaded successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function attachLeaveCertificate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await attachLeaveCertificateForUser(
      req.user as string,
      String(req.params.leaveRequestId),
      (req as any).file,
      getWorkspaceId(req),
    );
    res.status(200).json({ success: true, message: "Medical certificate attached to leave request.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function listLeaveTypes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await listLeaveTypesForWorkspace(req.user as string, req.query as Record<string, any>, getWorkspaceId(req));
    res.status(200).json({ success: true, message: "Leave types loaded successfully.", data: result });
  } catch (error) { next(error); }
}

export async function createLeaveType(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await createLeaveTypeForWorkspace(req.user as string, req.body || {}, getWorkspaceId(req));
    res.status(201).json({ success: true, message: "Leave type added successfully.", data: result });
  } catch (error) { next(error); }
}

export async function updateLeaveType(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await updateLeaveTypeForWorkspace(req.user as string, String(req.params.leaveTypeId), req.body || {}, getWorkspaceId(req));
    res.status(200).json({ success: true, message: "Leave type updated successfully.", data: result });
  } catch (error) { next(error); }
}
export async function listLeaveQuotas(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await listLeaveQuotasForWorkspace(req.user as string, req.query as Record<string, any>, getWorkspaceId(req));
    res.status(200).json({ success: true, message: "Leave quotas loaded successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateLeaveQuota(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await updateLeaveQuotaForUser(
      req.user as string,
      String(req.params.userId),
      req.body || {},
      getWorkspaceId(req),
    );
    res.status(200).json({ success: true, message: "Leave quota updated successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function listHolidays(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await listHolidaysForWorkspace(req.user as string, req.query as Record<string, any>, getWorkspaceId(req));
    res.status(200).json({ success: true, message: "Holidays loaded successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function createHoliday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await createHolidayForWorkspace(req.user as string, req.body || {}, getWorkspaceId(req));
    res.status(201).json({ success: true, message: "Holiday added successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateHoliday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await updateHolidayForWorkspace(
      req.user as string,
      String(req.params.holidayId),
      req.body || {},
      getWorkspaceId(req),
    );
    res.status(200).json({ success: true, message: "Holiday updated successfully.", data: result });
  } catch (error) {
    next(error);
  }
}

export async function deleteHoliday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await deleteHolidayForWorkspace(req.user as string, String(req.params.holidayId), getWorkspaceId(req));
    res.status(200).json({ success: true, message: "Holiday deleted successfully.", data: result });
  } catch (error) {
    next(error);
  }
}
