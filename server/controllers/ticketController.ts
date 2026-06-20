import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ticket } from "../models/Ticket.js";
import { TicketIssueCatalog } from "../models/TicketIssueCatalog.js";
import HostUser from "../models/HostUser.js";
import { TenantCompany } from "../models/TenantCompany.js";
import Department from "../models/Department.js";
import TenantEmployee from "../models/TenantEmployee.js";

const nullableObjectIdFields = [
    "assigneeUserId",
    "acceptedByUserId",
    "repairLogAssignedToUserId",
    "tenantCompanyId",
    "followUpOfTicketId",
    "assetId",
    "departmentId",
    "submittedByDeptId",
    "assetDepartmentId",
] as const;

const toNullableObjectId = (value: unknown): mongoose.Types.ObjectId | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;

    const normalizedValue = String(value);
    return mongoose.Types.ObjectId.isValid(normalizedValue)
        ? new mongoose.Types.ObjectId(normalizedValue)
        : null;
};

const normalizePriority = (value: unknown): "Low" | "Medium" | "High" => {
    const priority = String(value || "Medium").trim().toLowerCase();
    if (priority === "low") return "Low";
    if (priority === "high" || priority === "critical" || priority === "urgent") return "High";
    return "Medium";
};

const sanitizeTicketPayload = (payload: Record<string, any>) => {
    const sanitizedPayload = { ...payload };

    if (Object.prototype.hasOwnProperty.call(sanitizedPayload, "priority")) {
        sanitizedPayload.priority = normalizePriority(sanitizedPayload.priority);
    }

    for (const field of nullableObjectIdFields) {
        if (Object.prototype.hasOwnProperty.call(sanitizedPayload, field)) {
            sanitizedPayload[field] = toNullableObjectId(sanitizedPayload[field]);
        }
    }

    return sanitizedPayload;
};


const resolveTenantTicketContext = async (userId: any, requestedTenantCompanyId?: unknown) => {
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

const getUserDisplayName = (user: any, fallback = "") => {
    const composed = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return String(user?.name || composed || user?.email || fallback || "User").trim();
};

const buildTicketScopeFilter = async (req: Request) => {
    const requestWorkspaceId = (req as any).workspaceMembership?.workspace;
    if (requestWorkspaceId) {
        return { workspaceId: requestWorkspaceId };
    }

    const tenantContext = await resolveTenantTicketContext((req as any).user, req.query?.tenantCompanyId);
    const tenantCompany: any = tenantContext.company;
    if (tenantCompany?._id) {
        return {
            workspaceId: tenantCompany.workspaceId,
            tenantCompanyId: tenantCompany._id,
        };
    }

    return { ownerId: (req as any).user };
};


// Create a new ticket
export const createTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const ownerId = (req as any).user;
        const requestedTenantCompanyId = req.body?.tenantCompanyId;

        // Step 1: Try to resolve tenant context
        const tenantContext = await resolveTenantTicketContext(ownerId, requestedTenantCompanyId);
        const tenantCompany: any = tenantContext.company;

        // Step 2: Determine workspace and tenant company
        const workspaceId =
            (req as any).workspaceMembership?.workspace ||
            tenantCompany?.workspaceId ||
            null;

        // Step 3: Get ticket number
        const ticketCounterFilter = workspaceId
            ? { workspaceId }
            : { ownerId };

        const latestTicket = await Ticket.findOne(ticketCounterFilter)
            .sort({ ticketNumber: -1 })
            .select("ticketNumber")
            .lean();

        const ticketNumber = Number(latestTicket?.ticketNumber || 0) + 1;

        // Step 4: Sanitize payload
        const payload = sanitizeTicketPayload(req.body);
        if (payload.department === "") {
            delete payload.department;
        }

        // Step 5: Determine if this is a tenant-raised ticket
        const isTenantRequester = Boolean(
            tenantCompany?._id || requestedTenantCompanyId
        );

        const requesterName = getUserDisplayName(tenantContext.user, payload.submittedBy);

        // Handle department from dropdown (departmentId) or string
        let targetDepartment = "Administration";
        if (payload.departmentId && mongoose.Types.ObjectId.isValid(payload.departmentId)) {
            const dept = await Department.findById(payload.departmentId).select("name").lean();
            if (dept) {
                targetDepartment = dept.name;
            }
        } else if (payload.department) {
            targetDepartment = String(payload.department).trim();
        }

        // Step 6: Create ticket with proper tenant fields
        const newTicket = new Ticket({
            ...payload,
            ownerId,
            workspaceId,
            tenantCompanyId: isTenantRequester
                ? tenantCompany?._id || requestedTenantCompanyId
                : payload.tenantCompanyId || null,
            tenantCompanyName: isTenantRequester
                ? tenantCompany?.companyName || payload.tenantCompanyName || ""
                : payload.tenantCompanyName || "",
            requesterUserId: ownerId,
            submittedBy: isTenantRequester ? requesterName : payload.submittedBy,
            submittedByDept: isTenantRequester
                ? "tenant-company-employee"
                : payload.submittedByDept,
            department: targetDepartment,
            assignedTo: payload.assignedTo || `${targetDepartment} Queue`,
            ticketNumber,
            ticketCode: `TCK-${String(ticketNumber).padStart(4, "0")}`,
            status: "Open",
        });

        const savedTicket = await newTicket.save();

        res.status(201).json({
            success: true,
            message: isTenantRequester
                ? "Ticket raised successfully by tenant company"
                : "Ticket created successfully",
            data: savedTicket,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to create ticket",
        });
    }
};

// Get all tickets (with optional filtering)
export const getTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, department, assigneeUserId, tenantCompanyId } = req.query;
        const filter: any = await buildTicketScopeFilter(req);

        if (tenantCompanyId && mongoose.Types.ObjectId.isValid(String(tenantCompanyId))) {
            filter.tenantCompanyId = new mongoose.Types.ObjectId(String(tenantCompanyId));
        }

        if (status) filter.status = status as any;

        if (department) {
            const deptStr = String(department).trim();
            if (mongoose.Types.ObjectId.isValid(deptStr)) {
                filter.departmentId = new mongoose.Types.ObjectId(deptStr);
            } else if (deptStr !== "") {
                filter.department = deptStr;
            }
        }

        if (assigneeUserId) {
            const normalizedAssigneeUserId = String(assigneeUserId);
            if (!mongoose.Types.ObjectId.isValid(normalizedAssigneeUserId)) {
                res.status(400).json({ success: false, message: "Invalid assignee user id" });
                return;
            }
            filter.assigneeUserId = new mongoose.Types.ObjectId(normalizedAssigneeUserId);
        }

        const tickets = await Ticket.find(filter)
            .sort({ createdAt: -1 })
            .populate("ownerId", "name email")
            .populate("assigneeUserId", "name email")
            .populate("assetId");

        res.status(200).json({ success: true, data: tickets });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get a single ticket by ID
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
    try {
        const scopeFilter = await buildTicketScopeFilter(req);
        const queryFilter = { _id: req.params.id, ...scopeFilter };

        const ticket = await Ticket.findOne(queryFilter).populate("ownerId assigneeUserId assetId");
        if (!ticket) {
            res.status(404).json({ success: false, message: "Ticket not found" });
            return;
        }
        res.status(200).json({ success: true, data: ticket });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a ticket
export const updateTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const scopeFilter = await buildTicketScopeFilter(req);
        const queryFilter = { _id: req.params.id, ...scopeFilter };

        const updatedTicket = await Ticket.findOneAndUpdate(
            queryFilter,
            { $set: sanitizeTicketPayload(req.body) },
            { new: true, runValidators: true }
        );

        if (!updatedTicket) {
            res.status(404).json({ success: false, message: "Ticket not found" });
            return;
        }
        res.status(200).json({ success: true, data: updatedTicket });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a ticket
export const deleteTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const scopeFilter = await buildTicketScopeFilter(req);
        const queryFilter = { _id: req.params.id, ...scopeFilter };

        const deletedTicket = await Ticket.findOneAndDelete(queryFilter);
        if (!deletedTicket) {
            res.status(404).json({ success: false, message: "Ticket not found" });
            return;
        }
        res.status(200).json({ success: true, message: "Ticket deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get issue suggestions from TicketIssueCatalog
export const getIssueSuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
        const workspaceId = (req as any).workspaceMembership?.workspace;
        const { department, q } = req.query;

        if (!workspaceId) {
            res.status(401).json({ success: false, message: "Workspace ID is required" });
            return;
        }

        const filter: any = {
            workspaceId,
            isActive: { $ne: false },
        };

        if (department) {
            const deptStr = String(department).trim();
            if (mongoose.Types.ObjectId.isValid(deptStr)) {
                filter.departmentId = new mongoose.Types.ObjectId(deptStr);
            } else if (deptStr !== "") {
                filter.$or = [
                    { department: deptStr },
                    { departmentKey: deptStr.toLowerCase() }
                ];
            }
        }

        if (q) {
            const queryStr = String(q).trim().toLowerCase();
            if (queryStr !== "") {
                filter.$or = filter.$or || [];
                filter.$or.push(
                    { normalizedTitle: { $regex: queryStr, $options: "i" } },
                    { keywords: { $in: [queryStr] } }
                );
            }
        }

        const suggestions = await TicketIssueCatalog.find(filter)
            .sort({ usageCount: -1, lastUsedAt: -1 })
            .limit(20)
            .lean()
            .exec();

        res.status(200).json({ success: true, data: suggestions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};