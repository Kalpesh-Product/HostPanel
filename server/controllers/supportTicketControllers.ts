// @ts-nocheck
import SupportTicket from "../models/SupportTicket.js";
import { uploadFileToS3 } from "../config/s3config.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";

const buildTicketId = () => `ST-${Date.now().toString().slice(-8)}`;

const normalizeStatus = (value: any) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "accepted") return "Accepted";
  if (raw === "in-progress" || raw === "in progress") return "In Progress";
  if (raw === "resolved") return "Resolved";
  if (raw === "closed") return "Closed";
  if (raw === "pending") return "Pending";
  if (raw === "escalated") return "Escalated";
  if (raw === "rejected") return "Rejected";
  return "Open";
};

const userToName = (user: any) => {
  if (!user) return "";
  if (typeof user === "string") return user.trim();
  if (user.name) return user.name;
  const first = user.firstName || "";
  const last = user.lastName || "";
  return `${first} ${last}`.trim();
};

const userToEmail = (user: any) => {
  if (!user) return "";
  if (typeof user === "string") return "";
  return String(user.email || "").trim();
};

const mapTicket = (ticket: any, sr: number) => ({
  id: String(ticket?._id || ticket?.id || ""),
  sr,
  ticketId: ticket?.ticketId || ticket?.ticketID || "",
  title: ticket?.title || ticket?.ticket || ticket?.ticketTitle || "",
  description: ticket?.description || "",
  pageUrl: ticket?.pageUrl || "",
  status: normalizeStatus(ticket?.status),
  requestedAt: ticket?.requestedAt || ticket?.createdAt || null,
  requestedByName: userToName(ticket?.requestedBy) || ticket?.requestedByName || "",
  requestedByEmail: userToEmail(ticket?.requestedBy) || ticket?.requestedByEmail || "",
  acceptedByName: userToName(ticket?.acceptedBy) || ticket?.acceptedByName || "",
  acceptedByEmail: userToEmail(ticket?.acceptedBy) || ticket?.acceptedByEmail || "",
  resolvedByName: userToName(ticket?.resolvedBy) || ticket?.resolvedByName || "",
  resolvedByEmail: userToEmail(ticket?.resolvedBy) || ticket?.resolvedByEmail || "",
  role: ticket?.role || "",
  department: ticket?.department || null,
  workspaceName: ticket?.workspace?.workspaceName || ticket?.workspaceName || "",
  image: ticket?.image || { id: "", url: "" },
  resolutionMessage: ticket?.resolutionMessage || "",
  resolutionAttachment: ticket?.resolutionAttachment || { id: "", url: "" },
  resolvedAt: ticket?.resolvedAt || null,
  closedByUserAt: ticket?.closedByUserAt || null,
});

export const getSupportTickets = async (req, res, next) => {
  try {
    const workspaceId = req.workspaceMembership?.workspace || null;
    const userId = req.user;
    const query: any = {};
    if (workspaceId) query.workspace = workspaceId;
    if (userId) query.requestedBy = userId;

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .populate("requestedBy", "name firstName lastName email")
      .populate("acceptedBy", "name firstName lastName email")
      .populate("resolvedBy", "name firstName lastName email")
      .populate("workspace", "workspaceName")
      .lean()
      .exec();

    const raised = tickets
      .filter((ticket) => normalizeStatus(ticket.status) !== "Closed")
      .map((ticket, index) => mapTicket(ticket, index + 1));
    const history = tickets
      .filter((ticket) => normalizeStatus(ticket.status) === "Closed")
      .map((ticket, index) => mapTicket(ticket, index + 1));

    return res.status(200).json({ data: { raised, history } });
  } catch (error) {
    next(error);
  }
};

export const createSupportTicket = async (req, res, next) => {
  try {
    const { title, description, pageUrl } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    let image = { id: "", url: "" };
    if (req.file) {
      const cleanName = String(req.file.originalname || "file").replace(/[/\\?%*:|"<>]/g, "_");
      const route = `support-tickets/${req.workspaceMembership?.workspace || "default"}/${Date.now()}-${cleanName}`;
      try {
        image = await uploadFileToS3(route, req.file);
      } catch (uploadError: any) {
        return res.status(502).json({
          message: "Attachment upload failed. Please try again.",
          error: uploadError?.message || "S3 upload error",
        });
      }
    }

    const [requestedByUser, workspaceDoc] = await Promise.all([
      req.user
        ? HostUser.findById(req.user)
            .select("name firstName lastName email company")
            .lean()
            .exec()
        : Promise.resolve(null),
      req.workspaceMembership?.workspace
        ? Workspace.findById(req.workspaceMembership.workspace)
            .select("workspaceName brandName businessName company")
            .lean()
            .exec()
        : Promise.resolve(null),
    ]);

    const requestedByName = String(
      requestedByUser?.name ||
        `${requestedByUser?.firstName || ""} ${requestedByUser?.lastName || ""}`.trim() ||
        requestedByUser?.email ||
        "",
    ).trim();
    const requestedByEmail = String(requestedByUser?.email || "").trim();
    const workspaceName = String(workspaceDoc?.workspaceName || "").trim();
    const companyName = String(
      workspaceDoc?.brandName || workspaceDoc?.businessName || workspaceDoc?.workspaceName || "",
    ).trim();
    const company = workspaceDoc?.company || requestedByUser?.company || null;

    const ticket = await SupportTicket.create({
      ticketId: buildTicketId(),
      title: String(title).trim(),
      description: String(description).trim(),
      pageUrl: String(pageUrl || "").trim(),
      status: "Open",
      requestedBy: req.user || null,
      user: req.user || null,
      workspace: req.workspaceMembership?.workspace || null,
      company,
      role: req.workspaceMembership?.role || "",
      requestedAt: new Date(),
      requestedByName,
      requestedByEmail,
      companyName,
      workspaceName,
      image,
    });

    return res.status(201).json({ message: "Support ticket submitted.", data: ticket });
  } catch (error) {
    next(error);
  }
};

export const updateSupportTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId).exec();
    if (!ticket) return res.status(404).json({ message: "Support ticket not found." });

    if (String(ticket.requestedBy || "") !== String(req.user || "")) {
      return res.status(403).json({ message: "You can only edit a ticket you raised." });
    }

    // Once the Wono team has accepted the ticket, `status` moves off "Open"
    // and acceptedBy/acceptedByName/acceptedByEmail get set — that's the
    // signal that someone is already acting on it, so the host user can no
    // longer edit the details out from under them.
    if (normalizeStatus(ticket.status) !== "Open") {
      return res.status(400).json({
        message: "This ticket has already been accepted by the Wono team and can no longer be edited.",
      });
    }

    const { title, description, pageUrl } = req.body;

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ message: "Title cannot be empty." });
      }
      ticket.title = String(title).trim();
    }

    if (description !== undefined) {
      if (!String(description).trim()) {
        return res.status(400).json({ message: "Description cannot be empty." });
      }
      ticket.description = String(description).trim();
    }

    if (pageUrl !== undefined) {
      ticket.pageUrl = String(pageUrl || "").trim();
    }

    if (req.file) {
      const cleanName = String(req.file.originalname || "file").replace(/[/\\?%*:|"<>]/g, "_");
      const route = `support-tickets/${req.workspaceMembership?.workspace || "default"}/${Date.now()}-${cleanName}`;
      try {
        ticket.image = await uploadFileToS3(route, req.file);
      } catch (uploadError: any) {
        return res.status(502).json({
          message: "Attachment upload failed. Please try again.",
          error: uploadError?.message || "S3 upload error",
        });
      }
    }

    await ticket.save();
    return res.status(200).json({ message: "Support ticket updated.", data: ticket });
  } catch (error) {
    next(error);
  }
};

export const closeSupportTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId).exec();
    if (!ticket) return res.status(404).json({ message: "Support ticket not found." });
    if (normalizeStatus(ticket.status) !== "Resolved") {
      return res
        .status(400)
        .json({ message: "Ticket can be closed only after it is resolved." });
    }
    ticket.status = "Closed";
    ticket.closedBy = req.user || null;
    ticket.closedByUserAt = new Date();
    await ticket.save();
    return res.status(200).json({ message: "Ticket closed successfully." });
  } catch (error) {
    next(error);
  }
};

export const createFollowUpTicket = async (req, res, next) => {
  try {
    const parent = await SupportTicket.findById(req.params.ticketId).exec();
    if (!parent) return res.status(404).json({ message: "Support ticket not found." });
    if (normalizeStatus(parent.status) !== "Resolved") {
      return res
        .status(400)
        .json({ message: "Follow-up can be raised only after the ticket is resolved." });
    }

    const [requestedByUser, workspaceDoc] = await Promise.all([
      req.user
        ? HostUser.findById(req.user)
            .select("name firstName lastName email company")
            .lean()
            .exec()
        : Promise.resolve(null),
      (parent.workspace || req.workspaceMembership?.workspace)
        ? Workspace.findById(parent.workspace || req.workspaceMembership?.workspace)
            .select("workspaceName brandName businessName company")
            .lean()
            .exec()
        : Promise.resolve(null),
    ]);

    const requestedByName = String(
      requestedByUser?.name ||
        `${requestedByUser?.firstName || ""} ${requestedByUser?.lastName || ""}`.trim() ||
        requestedByUser?.email ||
        parent.requestedByName ||
        "",
    ).trim();
    const requestedByEmail = String(
      requestedByUser?.email || parent.requestedByEmail || "",
    ).trim();
    const workspaceName = String(
      workspaceDoc?.workspaceName || parent.workspaceName || "",
    ).trim();
    const companyName = String(
      workspaceDoc?.brandName ||
        workspaceDoc?.businessName ||
        workspaceDoc?.workspaceName ||
        parent.companyName ||
        "",
    ).trim();
    const company = workspaceDoc?.company || requestedByUser?.company || parent.company || null;

    const followUp = await SupportTicket.create({
      ticketId: buildTicketId(),
      title: `Follow-up: ${parent.title || "Support Issue"}`,
      description: String(req.body?.description || "").trim() || `Follow-up for ${parent.ticketId || "ticket"}`,
      status: "Open",
      requestedBy: req.user || parent.requestedBy || null,
      user: req.user || parent.user || parent.requestedBy || null,
      workspace: parent.workspace || req.workspaceMembership?.workspace || null,
      company,
      role: req.workspaceMembership?.role || parent.role || "",
      department: parent.department || "",
      parentTicket: parent._id,
      requestedAt: new Date(),
      requestedByName,
      requestedByEmail,
      companyName,
      workspaceName,
      image: parent.image || { id: "", url: "" },
    });

    return res.status(201).json({ message: "Follow-up issue raised successfully.", data: followUp });
  } catch (error) {
    next(error);
  }
};
