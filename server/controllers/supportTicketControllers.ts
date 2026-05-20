// @ts-nocheck
import SupportTicket from "../models/SupportTicket.js";
import { uploadFileToS3 } from "../config/s3config.js";

const buildTicketId = () => `ST-${Date.now().toString().slice(-8)}`;

const normalizeStatus = (value: any) => {
  const raw = String(value || "").trim().toLowerCase();
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
  if (user.name) return user.name;
  const first = user.firstName || "";
  const last = user.lastName || "";
  return `${first} ${last}`.trim();
};

const mapTicket = (ticket: any, sr: number) => ({
  id: String(ticket?._id || ticket?.id || ""),
  sr,
  ticketId: ticket?.ticketId || ticket?.ticketID || "",
  title: ticket?.title || ticket?.ticket || ticket?.ticketTitle || "",
  description: ticket?.description || "",
  status: normalizeStatus(ticket?.status),
  requestedAt: ticket?.requestedAt || ticket?.createdAt || null,
  requestedByName: userToName(ticket?.requestedBy),
  requestedByEmail: ticket?.requestedBy?.email || "",
  acceptedByName: userToName(ticket?.acceptedBy),
  acceptedByEmail: ticket?.acceptedBy?.email || "",
  resolvedByName: userToName(ticket?.resolvedBy),
  resolvedByEmail: ticket?.resolvedBy?.email || "",
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
    const { title, description } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    let image = { id: "", url: "" };
    if (req.file) {
      const cleanName = String(req.file.originalname || "file").replace(/[/\\?%*:|"<>]/g, "_");
      const route = `support-tickets/${req.workspaceMembership?.workspace || "default"}/${Date.now()}-${cleanName}`;
      image = await uploadFileToS3(route, req.file);
    }

    const ticket = await SupportTicket.create({
      ticketId: buildTicketId(),
      title: String(title).trim(),
      description: String(description).trim(),
      status: "Open",
      requestedBy: req.user || null,
      workspace: req.workspaceMembership?.workspace || null,
      role: req.workspaceMembership?.role || "",
      image,
    });

    return res.status(201).json({ message: "Support ticket submitted.", data: ticket });
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

    const followUp = await SupportTicket.create({
      ticketId: buildTicketId(),
      title: `Follow-up: ${parent.title || "Support Issue"}`,
      description: String(req.body?.description || "").trim() || `Follow-up for ${parent.ticketId || "ticket"}`,
      status: "Open",
      requestedBy: req.user || parent.requestedBy || null,
      workspace: parent.workspace || req.workspaceMembership?.workspace || null,
      role: req.workspaceMembership?.role || parent.role || "",
      department: parent.department || "",
      parentTicket: parent._id,
      image: parent.image || { id: "", url: "" },
    });

    return res.status(201).json({ message: "Follow-up issue raised successfully.", data: followUp });
  } catch (error) {
    next(error);
  }
};
