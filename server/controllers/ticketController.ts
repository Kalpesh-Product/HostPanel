import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ticket } from "../models/Ticket.js";
import { TicketIssueCatalog } from "../models/TicketIssueCatalog.js";
import HostUser from "../models/HostUser.js";
import { TenantCompany } from "../models/TenantCompany.js";
import Department from "../models/Department.js";
import TenantEmployee from "../models/TenantEmployee.js";
import { createNotification } from "../utils/notify.js";
import { uploadFileToS3 } from "../config/s3config.js";

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

        // Step 6: Upload any attached files (screenshots/documents) to S3
        const uploadedFiles = Array.isArray((req as any).files) ? (req as any).files : [];
        const attachments: { id: string; url: string; name: string }[] = [];
        for (const file of uploadedFiles) {
            const cleanName = String(file.originalname || "file").replace(/[/\\?%*:|"<>]/g, "_");
            const route = `tickets/${workspaceId || ownerId}/${Date.now()}-${cleanName}`;
            try {
                const uploaded = await uploadFileToS3(route, file);
                attachments.push({ id: uploaded.id, url: uploaded.url, name: cleanName });
            } catch (uploadError: any) {
                res.status(502).json({
                    message: "Attachment upload failed. Please try again.",
                    error: uploadError?.message || "S3 upload error",
                });
                return;
            }
        }

        // Step 7: Create ticket with proper tenant fields
        const newTicket = new Ticket({
            ...payload,
            ownerId,
            workspaceId,
            attachments,
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

        // Create notifications for the assigned user
        if (savedTicket.assigneeUserId && String(savedTicket.assigneeUserId) !== String(ownerId)) {
            createNotification({
                workspaceId: workspaceId || "",
                recipientUserId: String(savedTicket.assigneeUserId),
                actorUserId: ownerId,
                type: "ticket_assigned",
                category: "ticket",
                title: "New Ticket Assigned",
                description: `Ticket #${savedTicket.ticketCode} has been assigned to you by ${requesterName}.`,
                entityType: "ticket",
                entityId: String(savedTicket._id),
                entityCode: savedTicket.ticketCode,
                targetUrl: `/tickets`,
                data: { ticketCode: savedTicket.ticketCode, department: targetDepartment, priority: savedTicket.priority },
                priority: savedTicket.priority === "High" ? "high" : "normal",
                isActionRequired: true,
                dedupeKey: `ticket-assigned:${savedTicket._id}:${savedTicket.assigneeUserId}`,
            });
        }

        // Notify the whole destination department (any admin assigned there,
        // its manager(s), and its employees) plus workspace founders/super
        // admins/admins, so a newly raised ticket reaches everyone who can
        // act on it — not just whoever happens to be the initial assignee.
        if (workspaceId) {
            const departmentDoc = await Department.findOne({ workspaceId, name: targetDepartment })
                .select("_id")
                .lean();

            // `role` on WorkspaceMember is an ObjectId ref to Role — a plain
            // find() can't filter on "role.name" without populating first
            // (it's not an embedded subdocument), so populate then filter in
            // JS. Role names are "founder"/"super_admin"/"admin"/"manager"/
            // "employee" (see seedRoles.ts) — there is no role literally
            // named "owner".
            const workspaceMembers = await mongoose.model("WorkspaceMember").find({
                workspace: workspaceId,
                isActive: true,
            }).select("user role departments").populate("role", "name").lean();

            const recipientIds = new Set<string>();
            for (const member of workspaceMembers as any[]) {
                const memberId = String(member.user);
                if (memberId === String(ownerId) || memberId === String(savedTicket.assigneeUserId || "")) {
                    continue;
                }

                const roleName = String(member.role?.name || "").toLowerCase();
                const isTopManagement = ["founder", "super_admin", "admin"].includes(roleName);
                const isInDestinationDepartment = Boolean(
                    departmentDoc?._id &&
                    (member.departments || []).some((deptId: any) => String(deptId) === String(departmentDoc._id))
                );

                if (isTopManagement || isInDestinationDepartment) {
                    recipientIds.add(memberId);
                }
            }

            for (const recipientId of recipientIds) {
                createNotification({
                    workspaceId,
                    recipientUserId: recipientId,
                    actorUserId: ownerId,
                    type: "ticket_created",
                    category: "ticket",
                    title: "New Ticket Raised",
                    description: `${requesterName} raised ticket #${savedTicket.ticketCode} in ${targetDepartment}.`,
                    entityType: "ticket",
                    entityId: String(savedTicket._id),
                    entityCode: savedTicket.ticketCode,
                    targetUrl: `/tickets`,
                    data: { ticketCode: savedTicket.ticketCode, department: targetDepartment, priority: savedTicket.priority },
                    priority: savedTicket.priority === "High" ? "high" : "normal",
                    dedupeKey: `ticket-created:${savedTicket._id}:${recipientId}`,
                });
            }
        }

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

        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const parsedLimit = parseInt(String(req.query.limit), 10);
        // Every current caller already sends `limit` (100-200) and treats the
        // response as that bounded page; this default just protects the route
        // for any caller that doesn't.
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 500) : 200;
        const skip = (page - 1) * limit;

        const [tickets, total] = await Promise.all([
            Ticket.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("ownerId", "name email")
                .populate("assigneeUserId", "name email")
                .populate("assetId"),
            Ticket.countDocuments(filter),
        ]);

        res.status(200).json({ success: true, data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) });
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

        const existingTicket = await Ticket.findOne(queryFilter).lean();

        const updateSet: Record<string, any> = { ...sanitizeTicketPayload(req.body) };

        // Capture acceptance / assignment timestamps when the state changes.
        if (req.body.acceptedByUserId && (!existingTicket?.acceptedByUserId || String(existingTicket.acceptedByUserId) !== String(req.body.acceptedByUserId))) {
            updateSet.acceptedAt = new Date();
        }
        if (req.body.assigneeUserId && (!existingTicket?.assigneeUserId || String(existingTicket.assigneeUserId) !== String(req.body.assigneeUserId))) {
            updateSet.assignedAt = new Date();
        }

        const updatedTicket = await Ticket.findOneAndUpdate(
            queryFilter,
            { $set: updateSet },
            { new: true, runValidators: true }
        );

        if (!updatedTicket) {
            res.status(404).json({ success: false, message: "Ticket not found" });
            return;
        }

        // Notify on status change
        if (existingTicket && req.body.status && req.body.status !== existingTicket.status) {
            const ownerId = String(existingTicket.ownerId || "");
            const assigneeId = String(existingTicket.assigneeUserId || "");
            const actorId = (req as any).user || "";
            const recipients = new Set<string>();
            if (ownerId) recipients.add(ownerId);
            if (assigneeId) recipients.add(assigneeId);
            recipients.delete(actorId);

            for (const recipientId of recipients) {
                createNotification({
                    workspaceId: scopeFilter.workspaceId || "",
                    recipientUserId: recipientId,
                    actorUserId: actorId,
                    type: "ticket_status_changed",
                    category: "ticket",
                    title: "Ticket Status Updated",
                    description: `Ticket ${updatedTicket.ticketCode} status changed from "${existingTicket.status}" to "${updatedTicket.status}".`,
                    entityType: "ticket",
                    entityId: String(updatedTicket._id),
                    entityCode: updatedTicket.ticketCode,
                    targetUrl: `/tickets`,
                    data: { ticketCode: updatedTicket.ticketCode, oldStatus: existingTicket.status, newStatus: updatedTicket.status },
                    priority: updatedTicket.status === "Resolved" || updatedTicket.status === "Closed" ? "normal" : "low",
                    dedupeKey: `ticket-status:${updatedTicket._id}:${recipientId}:${Date.now()}`,
                });
            }
        }

        // Notify on assignment: the new assignee is told the ticket is now
        // theirs, and the raiser is told who has picked it up.
        if (existingTicket && req.body.assigneeUserId && String(req.body.assigneeUserId) !== String(existingTicket.assigneeUserId)) {
            const newAssigneeId = String(req.body.assigneeUserId);
            const actorId = String((req as any).user || "");
            const raiserId = String(existingTicket.requesterUserId || existingTicket.ownerId || "");

            if (newAssigneeId && newAssigneeId !== actorId) {
                createNotification({
                    workspaceId: scopeFilter.workspaceId || "",
                    recipientUserId: newAssigneeId,
                    actorUserId: actorId,
                    type: "ticket_assigned",
                    category: "ticket",
                    title: "Ticket Assigned to You",
                    description: `Ticket ${updatedTicket.ticketCode} has been assigned to you.`,
                    entityType: "ticket",
                    entityId: String(updatedTicket._id),
                    entityCode: updatedTicket.ticketCode,
                    targetUrl: `/tickets`,
                    data: { ticketCode: updatedTicket.ticketCode, department: updatedTicket.department, priority: updatedTicket.priority },
                    priority: updatedTicket.priority === "High" ? "high" : "normal",
                    isActionRequired: true,
                    dedupeKey: `ticket-assigned:${updatedTicket._id}:${newAssigneeId}:${Date.now()}`,
                });
            }

            if (raiserId && raiserId !== actorId && raiserId !== newAssigneeId) {
                createNotification({
                    workspaceId: scopeFilter.workspaceId || "",
                    recipientUserId: raiserId,
                    actorUserId: actorId,
                    type: "ticket_assigned",
                    category: "ticket",
                    title: "Your Ticket Has Been Assigned",
                    description: `Ticket ${updatedTicket.ticketCode} has been assigned to ${updatedTicket.assignedTo || "a team member"}.`,
                    entityType: "ticket",
                    entityId: String(updatedTicket._id),
                    entityCode: updatedTicket.ticketCode,
                    targetUrl: `/tickets`,
                    data: { ticketCode: updatedTicket.ticketCode, department: updatedTicket.department, assignedTo: updatedTicket.assignedTo },
                    priority: "normal",
                    dedupeKey: `ticket-assigned-raiser:${updatedTicket._id}:${raiserId}:${Date.now()}`,
                });
            }
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

        // If a specific department was requested but no saved issues exist yet,
        // seed the default templates for that department and return them.
        if (!suggestions.length && department) {
            const deptStr = String(department).trim();
            const departmentName = mongoose.Types.ObjectId.isValid(deptStr)
                ? (await Department.findById(deptStr).select("name").lean().exec() as any)?.name || deptStr
                : deptStr;
            let departmentId = mongoose.Types.ObjectId.isValid(deptStr)
                ? new mongoose.Types.ObjectId(deptStr)
                : (await Department.findOne({ name: departmentName, workspaceId }).select("_id").lean().exec() as any)?._id || null;

            await seedDepartmentIssuesIfEmpty(String(workspaceId), departmentName, departmentId ? String(departmentId) : null);

            const seeded = await TicketIssueCatalog.find({
                workspaceId,
                isActive: { $ne: false },
                $or: [
                    { department: departmentName },
                    { departmentKey: departmentName.toLowerCase() }
                ],
            })
                .sort({ usageCount: -1, lastUsedAt: -1 })
                .limit(20)
                .lean()
                .exec();

            res.status(200).json({ success: true, data: seeded });
            return;
        }

        res.status(200).json({ success: true, data: suggestions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Default issue templates seeded per department when a workspace has no saved
// issues yet. Kept generic so every department starts with a sensible list, and
// the user can add their own custom issues on top (which are persisted too).
const DEFAULT_DEPARTMENT_ISSUES: Record<string, string[]> = {
    "IT": [
        "Email & Outlook Issues",
        "Internet & Network Issues",
        "Printer Issues",
        "Hardware Upgrade Issues",
        "System Update Issues",
        "Shared Drive & Access Issues",
        "System Boot Issues",
        "Antivirus Issues",
        "Software Installation Issues",
        "Backup & Restore Issues",
        "Peripheral & Device Issues",
        "Platform Issue",
        "Biometric Issues",
        "IT Internal Issues",
    ],

    "HR": [
        "Leave & Attendance",
        "Payroll & Salary",
        "HR Documents Request",
        "PF / ESIC / Tax Queries",
        "Performance & Appraisal",
        "Recruitment / Referral",
        "Policy Clarification",
        "Grievance / Complaint",
        "Workplace Concern (Confidential)",
        "Employee Engagement / Events",
        "General HR Query / Other Option",
        "Platform Issue",
    ],

    "Finance": [
        "Salary Delay",
        "Reimbursement Pending",
        "Invoice Payment",
        "Budget Request",
        "Tax Update",
        "Petty Cash",
        "Expense Policy",
        "Vendor Payment",
        "Bonus Query",
        "Account Issue",
        "Platform Issue",
    ],

    "Sales": [
        "CRM Issue",
        "Collateral Request",
        "Client Database",
        "Report Error",
        "Travel Delay",
        "Proposal Template",
        "Lead Issue",
        "Demo Request",
        "Invoice Delay",
        "Pricing Query",
        "Platform Issue",
    ],

    "Technology": [
        "Platform Issue",
    ],

    "Maintenance": [
        "AC Issues",
        "Water Leakage",
        "Washroom Plumbing Issues",
        "Washroom Door & Lock Issues",
        "Electrical & Lighting Issues",
        "Ceiling / Wall Damage",
        "Flooring & Interior Fixing",
        "Furniture & Fixture Repairs",
        "Equipment Maintenance",
        "Rat smell / Bad odour",
        "Platform Issue",
    ],

    "Administration": [
        "Water & Pantry Supply Issues",
        "General Cleaning Issues",
        "Washroom Cleaning & Hygiene Issues",
        "Water Quality Issue",
        "Furniture Issues",
        "AC Control Issues",
        "Platform Issue",
        "Requirements of Water & Bottle",
    ],
};

const seedDepartmentIssuesIfEmpty = async (workspaceId: string, department: string, departmentId?: string | null): Promise<void> => {
    const departmentKey = String(department || "").trim().toLowerCase();
    if (!departmentKey) return;

    const existing = await TicketIssueCatalog.countDocuments({
        workspaceId,
        departmentKey,
        source: "seed",
    }).exec();

    if (existing > 0) return;

    const templates = DEFAULT_DEPARTMENT_ISSUES[department]?.length
        ? DEFAULT_DEPARTMENT_ISSUES[department]
        : DEFAULT_DEPARTMENT_ISSUES["Administration"];

    const now = new Date();
    await TicketIssueCatalog.insertMany(
        templates.map((title) => ({
            workspaceId,
            department,
            departmentId: departmentId || null,
            departmentKey,
            title,
            normalizedTitle: title.trim().toLowerCase(),
            description: "",
            keywords: [],
            usageCount: 0,
            lastUsedAt: null,
            createdByUserId: null,
            source: "seed",
            isActive: true,
            createdAt: now,
            updatedAt: now,
        })),
    );
};

// Save a custom issue into the catalog (used when the requester types their own
// issue title). Reuses an existing matching entry to avoid duplicates.
export const createTicketIssue = async (req: Request, res: Response): Promise<void> => {
    try {
        const workspaceId = (req as any).workspaceMembership?.workspace;
        if (!workspaceId) {
            res.status(401).json({ success: false, message: "Workspace ID is required" });
            return;
        }

        const department = String(req.body?.department || "").trim();
        const title = String(req.body?.title || "").trim();
        if (!department || !title) {
            res.status(400).json({ success: false, message: "Department and issue title are required." });
            return;
        }

        const departmentKey = department.toLowerCase();
        const normalizedTitle = title.toLowerCase();

        // Reuse existing issue for this workspace/department if present.
        const existing = await TicketIssueCatalog.findOne({
            workspaceId,
            departmentKey,
            normalizedTitle,
        }).lean().exec();

        if (existing) {
            res.status(200).json({ success: true, data: existing, reused: true });
            return;
        }

        const created = await TicketIssueCatalog.create({
            workspaceId,
            department,
            departmentId: req.body?.departmentId || null,
            departmentKey,
            title,
            normalizedTitle,
            description: String(req.body?.description || "").trim(),
            keywords: Array.isArray(req.body?.keywords) ? req.body.keywords : [],
            usageCount: 0,
            lastUsedAt: null,
            createdByUserId: (req as any).user || null,
            source: "custom",
            isActive: true,
        });

        res.status(201).json({ success: true, data: created, reused: false });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Increment the usage counter / last-used time for a catalog issue when it is
// selected for a new ticket. Supports lookup by catalog id or by dept+title.
export const recordIssueUsage = async (req: Request, res: Response): Promise<void> => {
    try {
        const workspaceId = (req as any).workspaceMembership?.workspace;
        if (!workspaceId) {
            res.status(401).json({ success: false, message: "Workspace ID is required" });
            return;
        }

        const { issueId, department, title } = req.body || {};

        let filter: any = null;
        if (issueId && mongoose.Types.ObjectId.isValid(String(issueId))) {
            filter = { _id: new mongoose.Types.ObjectId(String(issueId)), workspaceId };
        } else if (department && title) {
            filter = {
                workspaceId,
                departmentKey: String(department).trim().toLowerCase(),
                normalizedTitle: String(title).trim().toLowerCase(),
            };
        }

        if (!filter) {
            res.status(400).json({ success: false, message: "Issue reference is required." });
            return;
        }

        await TicketIssueCatalog.updateOne(filter, {
            $inc: { usageCount: 1 },
            $set: { lastUsedAt: new Date() },
        }).exec();

        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};