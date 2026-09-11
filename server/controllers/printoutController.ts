import { Request, Response } from "express";
import mongoose from "mongoose";
import { PrintoutRequest } from "../models/PrintoutRequest.js";
import HostUser from "../models/HostUser.js";
import { TenantCompany } from "../models/TenantCompany.js";
import Department from "../models/Department.js";
import TenantEmployee from "../models/TenantEmployee.js";
import { createNotification } from "../utils/notify.js";
import { uploadFileToS3 } from "../config/s3config.js";

const TARGET_DEPARTMENT = "Administration";

const getUserDisplayName = (user: any, fallback = "") => {
    const composed = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return String(user?.name || composed || user?.email || fallback || "User").trim();
};

const resolveTenantPrintoutContext = async (userId: any, requestedTenantCompanyId?: unknown) => {
    const user = await HostUser.findById(userId).select("name firstName lastName email").lean().exec();
    const email = String(user?.email || "").trim().toLowerCase();
    const tenantFilter: any = { status: "Active" };

    if (requestedTenantCompanyId && mongoose.Types.ObjectId.isValid(String(requestedTenantCompanyId))) {
        tenantFilter.tenantCompanyId = new mongoose.Types.ObjectId(String(requestedTenantCompanyId));
    }

    const employee = await TenantEmployee.findOne({
        ...tenantFilter,
        $or: [
            { userId: new mongoose.Types.ObjectId(String(userId)) },
            ...(email ? [{ email }] : []),
        ],
    }).lean().exec();

    if (!employee) {
        return { user, employee: null, company: null };
    }

    const company = await TenantCompany.findById(employee.tenantCompanyId).lean().exec() as any;
    return { user, employee, company };
};

const buildPrintoutScopeFilter = async (req: Request) => {
    const requestWorkspaceId = (req as any).workspaceMembership?.workspace;
    if (requestWorkspaceId) {
        return { workspaceId: requestWorkspaceId };
    }

    const tenantContext = await resolveTenantPrintoutContext((req as any).user, req.query?.tenantCompanyId);
    const tenantCompany: any = tenantContext.company;
    if (tenantCompany?._id) {
        return {
            workspaceId: tenantCompany.workspaceId,
            tenantCompanyId: tenantCompany._id,
        };
    }

    return { ownerId: (req as any).user };
};

// Same "founder/super_admin/admin, or a member of the Administration
// department" rule as the notification fan-out below — reused here to gate
// who can list every printout request in the workspace. Anyone else only
// ever gets their own requests, even if they call the API directly without
// mine=true: printout requests are private between the requester and
// Administration, never visible to an unrelated manager/employee.
const isAdministrationStaff = async (userId: any, workspaceId: any): Promise<boolean> => {
    if (!workspaceId) return false;

    const membership = await mongoose.model("WorkspaceMember").findOne({
        workspace: workspaceId,
        user: userId,
        isActive: true,
    }).select("role departments").populate("role", "name").lean();
    if (!membership) return false;

    const roleName = String((membership as any).role?.name || "").toLowerCase();
    if (["founder", "super_admin", "admin"].includes(roleName)) return true;

    const departmentDoc = await Department.findOne({ workspaceId, name: TARGET_DEPARTMENT })
        .select("_id")
        .lean();
    if (!departmentDoc?._id) return false;

    return ((membership as any).departments || []).some(
        (deptId: any) => String(deptId) === String(departmentDoc._id)
    );
};

// Fan out a "new printout request" notification to everyone who can act on
// it: Administration department members plus workspace founders/super
// admins/admins — mirrors ticketController's createTicket department fan-out.
const notifyAdministrationOfNewRequest = async (
    workspaceId: any,
    actorUserId: any,
    request: any,
    requesterDisplayName: string,
) => {
    if (!workspaceId) return;

    const departmentDoc = await Department.findOne({ workspaceId, name: TARGET_DEPARTMENT })
        .select("_id")
        .lean();

    const workspaceMembers = await mongoose.model("WorkspaceMember").find({
        workspace: workspaceId,
        isActive: true,
    }).select("user role departments").populate("role", "name").lean();

    const recipientIds = new Set<string>();
    for (const member of workspaceMembers as any[]) {
        const memberId = String(member.user);
        if (memberId === String(actorUserId)) continue;

        const roleName = String(member.role?.name || "").toLowerCase();
        const isTopManagement = ["founder", "super_admin", "admin"].includes(roleName);
        const isInAdministration = Boolean(
            departmentDoc?._id &&
            (member.departments || []).some((deptId: any) => String(deptId) === String(departmentDoc._id))
        );

        if (isTopManagement || isInAdministration) {
            recipientIds.add(memberId);
        }
    }

    for (const recipientId of recipientIds) {
        createNotification({
            workspaceId,
            recipientUserId: recipientId,
            actorUserId,
            type: "printout_requested",
            category: "system",
            title: "New Printout Request",
            description: `${requesterDisplayName} submitted a printout request: "${request.title}" (${request.requestCode}).`,
            entityType: "printout_request",
            entityId: String(request._id),
            entityCode: request.requestCode,
            targetUrl: "/common-modules/printouts",
            data: { requestCode: request.requestCode, copies: request.copies, priority: request.priority },
            priority: request.priority === "High" ? "high" : "normal",
            isActionRequired: true,
            dedupeKey: `printout-created:${request._id}:${recipientId}`,
        });
    }
};

export const createPrintoutRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const ownerId = (req as any).user;
        const requestedTenantCompanyId = req.body?.tenantCompanyId;
        const isWalkIn = String(req.body?.sourceType || "self") === "walk-in";

        const tenantContext = await resolveTenantPrintoutContext(ownerId, requestedTenantCompanyId);
        const tenantCompany: any = tenantContext.company;
        const workspaceId =
            (req as any).workspaceMembership?.workspace ||
            tenantCompany?.workspaceId ||
            null;

        if (!req.body?.title || !String(req.body.title).trim()) {
            res.status(400).json({ success: false, message: "A document title/description is required" });
            return;
        }

        const isTenantRequester = isWalkIn
            ? String(req.body?.requestedByType || "internal") === "tenant"
            : Boolean(tenantCompany?._id || requestedTenantCompanyId);

        const loggerDisplayName = getUserDisplayName(tenantContext.user);

        let requestedByName = loggerDisplayName;
        let requestedByDepartment = "";
        let tenantCompanyId: any = null;
        let tenantCompanyName = "";

        if (isWalkIn) {
            requestedByName = String(req.body?.requestedByName || "").trim() || "Walk-in requester";
            requestedByDepartment = String(req.body?.requestedByDepartment || "").trim();
            if (isTenantRequester) {
                tenantCompanyId = requestedTenantCompanyId && mongoose.Types.ObjectId.isValid(String(requestedTenantCompanyId))
                    ? requestedTenantCompanyId
                    : null;
                tenantCompanyName = String(req.body?.tenantCompanyName || "").trim();
            }
        } else if (isTenantRequester) {
            tenantCompanyId = tenantCompany?._id || requestedTenantCompanyId;
            tenantCompanyName = tenantCompany?.companyName || "";
        } else {
            requestedByDepartment = String(req.body?.requestedByDepartment || "").trim();
        }

        const requestCounterFilter = workspaceId ? { workspaceId } : { ownerId };
        const latestRequest = await PrintoutRequest.findOne(requestCounterFilter)
            .sort({ requestNumber: -1 })
            .select("requestNumber")
            .lean();
        const requestNumber = Number(latestRequest?.requestNumber || 0) + 1;

        const uploadedFiles = Array.isArray((req as any).files) ? (req as any).files : [];
        const attachments: { id: string; url: string; name: string }[] = [];
        for (const file of uploadedFiles) {
            const cleanName = String(file.originalname || "document").replace(/[/\\?%*:|"<>]/g, "_");
            const route = `printouts/${workspaceId || ownerId}/${Date.now()}-${cleanName}`;
            try {
                const uploaded = await uploadFileToS3(route, file);
                attachments.push({ id: uploaded.id, url: uploaded.url, name: cleanName });
            } catch (uploadError: any) {
                res.status(502).json({
                    message: "Document upload failed. Please try again.",
                    error: uploadError?.message || "S3 upload error",
                });
                return;
            }
        }

        const newRequest = new PrintoutRequest({
            workspaceId,
            ownerId,
            requestNumber,
            requestCode: `PRT-${String(requestNumber).padStart(4, "0")}`,
            title: String(req.body.title).trim(),
            notes: String(req.body?.notes || "").trim(),
            copies: Math.max(1, Number(req.body?.copies) || 1),
            colorMode: req.body?.colorMode === "Color" ? "Color" : "Black & White",
            paperSize: String(req.body?.paperSize || "A4").trim() || "A4",
            doubleSided: Boolean(req.body?.doubleSided === true || req.body?.doubleSided === "true"),
            priority: ["Low", "Medium", "High"].includes(req.body?.priority) ? req.body.priority : "Medium",
            requestedByUserId: isWalkIn
                ? (req.body?.requestedByUserId && mongoose.Types.ObjectId.isValid(String(req.body.requestedByUserId))
                    ? req.body.requestedByUserId
                    : null)
                : ownerId,
            requestedByName,
            requestedByType: isTenantRequester ? "tenant" : "internal",
            requestedByDepartment,
            tenantCompanyId,
            tenantCompanyName,
            sourceType: isWalkIn ? "walk-in" : "self",
            loggedByUserId: isWalkIn ? ownerId : null,
            loggedByName: isWalkIn ? loggerDisplayName : "",
            attachments,
            status: "Pending",
        });

        const savedRequest = await newRequest.save();

        notifyAdministrationOfNewRequest(workspaceId, ownerId, savedRequest, requestedByName);

        res.status(201).json({
            success: true,
            message: "Printout request submitted successfully",
            data: savedRequest,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message || "Failed to submit printout request" });
    }
};

export const getPrintoutRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, mine, includeCancelled } = req.query;
        const filter: any = await buildPrintoutScopeFilter(req);

        if (status) filter.status = status;
        if (String(mine || "") === "true") {
            filter.requestedByUserId = (req as any).user;
        } else if (Object.keys(filter).length === 1 && filter.workspaceId) {
            // Internal caller asking for the full workspace listing (no
            // mine=true) — only Administration staff get that; everyone else
            // is silently narrowed to their own requests, even if they call
            // this endpoint directly without going through the UI.
            const authorized = await isAdministrationStaff((req as any).user, filter.workspaceId);
            if (!authorized) {
                filter.requestedByUserId = (req as any).user;
            }
        }
        // A cancelled request is only ever visible to the person who cancelled
        // it (before it was accepted) — Administration never sees it. Callers
        // viewing their own requests (mine=true, or a tenant's own company
        // scope) explicitly opt in via includeCancelled=true.
        if (!filter.status && String(includeCancelled || "") !== "true") {
            filter.status = { $ne: "Cancelled" };
        }

        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const parsedLimit = parseInt(String(req.query.limit), 10);
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 500) : 200;
        const skip = (page - 1) * limit;

        const [requests, total] = await Promise.all([
            PrintoutRequest.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("requestedByUserId", "name email")
                .populate("loggedByUserId", "name email"),
            PrintoutRequest.countDocuments(filter),
        ]);

        res.status(200).json({ success: true, data: requests, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPrintoutRequestById = async (req: Request, res: Response): Promise<void> => {
    try {
        const scopeFilter = await buildPrintoutScopeFilter(req);
        const queryFilter = { _id: req.params.id, ...scopeFilter };

        const request = await PrintoutRequest.findOne(queryFilter).populate("requestedByUserId loggedByUserId printedByUserId");
        if (!request) {
            res.status(404).json({ success: false, message: "Printout request not found" });
            return;
        }
        res.status(200).json({ success: true, data: request });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePrintoutRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const scopeFilter = await buildPrintoutScopeFilter(req);
        const queryFilter = { _id: req.params.id, ...scopeFilter };

        const existingRequest = await PrintoutRequest.findOne(queryFilter).lean();
        if (!existingRequest) {
            res.status(404).json({ success: false, message: "Printout request not found" });
            return;
        }

        const actorId = (req as any).user;
        const updateSet: Record<string, any> = {};
        const nextStatus = req.body?.status;

        // Editable request-detail fields — only ever changeable while the
        // request is still Pending (nobody has accepted it yet).
        const EDITABLE_FIELDS = ["title", "notes", "copies", "colorMode", "paperSize", "doubleSided", "priority"] as const;
        const requestedEdits = EDITABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(req.body || {}, field));
        const isCancelAttempt = nextStatus === "Cancelled";

        if ((requestedEdits.length > 0 || isCancelAttempt) && existingRequest.status !== "Pending") {
            res.status(400).json({ success: false, message: "This request has already been accepted and can no longer be edited or cancelled." });
            return;
        }

        for (const field of requestedEdits) {
            if (field === "title") updateSet.title = String(req.body.title || "").trim();
            else if (field === "notes") updateSet.notes = String(req.body.notes || "").trim();
            else if (field === "copies") updateSet.copies = Math.max(1, Number(req.body.copies) || 1);
            else if (field === "colorMode") updateSet.colorMode = req.body.colorMode === "Color" ? "Color" : "Black & White";
            else if (field === "paperSize") updateSet.paperSize = String(req.body.paperSize || "A4").trim() || "A4";
            else if (field === "doubleSided") updateSet.doubleSided = Boolean(req.body.doubleSided === true || req.body.doubleSided === "true");
            else if (field === "priority") updateSet.priority = ["Low", "Medium", "High"].includes(req.body.priority) ? req.body.priority : "Medium";
        }

        if (nextStatus && ["Pending", "In Progress", "Completed", "Rejected", "Cancelled"].includes(nextStatus)) {
            updateSet.status = nextStatus;
            const actorUser = await HostUser.findById(actorId).select("name firstName lastName email").lean();
            const actorName = getUserDisplayName(actorUser);
            if (nextStatus === "In Progress") {
                updateSet.acceptedByUserId = actorId;
                updateSet.acceptedByName = actorName;
                updateSet.acceptedAt = new Date();
            } else if (nextStatus === "Rejected") {
                updateSet.rejectedByUserId = actorId;
                updateSet.rejectedByName = actorName;
                updateSet.rejectedAt = new Date();
                if (typeof req.body?.rejectionReason === "string") {
                    updateSet.rejectionReason = req.body.rejectionReason.trim();
                }
            } else if (nextStatus === "Completed") {
                updateSet.completedAt = new Date();
                updateSet.printedByUserId = actorId;
                updateSet.printedByName = actorName;
            }
        }
        if (typeof req.body?.cancelReason === "string") {
            updateSet.cancelReason = req.body.cancelReason.trim();
        }

        if (Object.keys(updateSet).length === 0) {
            res.status(400).json({ success: false, message: "Nothing to update" });
            return;
        }

        const updatedRequest = await PrintoutRequest.findOneAndUpdate(
            queryFilter,
            { $set: updateSet },
            { new: true, runValidators: true }
        );

        if (!updatedRequest) {
            res.status(404).json({ success: false, message: "Printout request not found" });
            return;
        }

        if (nextStatus && nextStatus !== existingRequest.status) {
            const recipientId = String(existingRequest.requestedByUserId || "");
            if (recipientId && recipientId !== String(actorId)) {
                const STATUS_MESSAGES: Record<string, string> = {
                    "In Progress": `Your printout request ${updatedRequest.requestCode} has been accepted and is now in progress.`,
                    "Completed": `Your printout request ${updatedRequest.requestCode} is ready — collect it from the front desk.`,
                    "Rejected": `Your printout request ${updatedRequest.requestCode} was rejected.`,
                    "Cancelled": `Your printout request ${updatedRequest.requestCode} was cancelled.`,
                };
                createNotification({
                    workspaceId: (existingRequest as any).workspaceId || "",
                    recipientUserId: recipientId,
                    actorUserId: actorId,
                    type: "printout_status_changed",
                    category: "system",
                    title: "Printout Status Updated",
                    description: STATUS_MESSAGES[updatedRequest.status] || `Your printout request ${updatedRequest.requestCode} is now "${updatedRequest.status}".`,
                    entityType: "printout_request",
                    entityId: String(updatedRequest._id),
                    entityCode: updatedRequest.requestCode,
                    targetUrl: "/common-modules/printouts",
                    data: { requestCode: updatedRequest.requestCode, oldStatus: existingRequest.status, newStatus: updatedRequest.status },
                    priority: updatedRequest.status === "Completed" ? "normal" : "low",
                    dedupeKey: `printout-status:${updatedRequest._id}:${recipientId}:${Date.now()}`,
                });
            }
        }

        res.status(200).json({ success: true, message: "Printout request updated", data: updatedRequest });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
