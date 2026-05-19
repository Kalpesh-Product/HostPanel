// @ts-nocheck
import SupportTicket from "../models/SupportTicket.js";
import HostUser from "../models/HostUser.js";
import Company from "../models/Company.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";
import { uploadFileToS3 } from "../config/s3config.js";

const getUserContext = async (userId: string, workspaceId: string) => {
  const user = await HostUser.findById(userId).lean().exec();
  if (!user) return null;

  const membership = workspaceId
    ? await WorkspaceMember.findOne({
        user: userId,
        workspace: workspaceId,
        isActive: true,
      })
        .lean()
        .exec()
    : null;
  const workspace = workspaceId
    ? await Workspace.findById(workspaceId).select("_id workspaceName").lean().exec()
    : null;

  let company = null;
  if (user?.company) {
    company = await Company.findById(user.company)
      .select("_id companyName")
      .lean()
      .exec();
  }
  if (!company && user?.companyId) {
    company = await Company.findOne({ companyId: user.companyId })
      .select("_id companyName")
      .lean()
      .exec();
  }

  return { user, membership, company, workspace };
};

const normalizeTicket = (ticket: any) => ({
  id: String(ticket?._id || ""),
  sr: Number(ticket?.sr || 0),
  ticketId: String(ticket?.ticketId || ""),
  title: String(ticket?.title || ""),
  description: String(ticket?.description || ""),
  status: String(ticket?.status || ""),
  requestedAt: ticket?.requestedAt || ticket?.createdAt || null,
  requestedByName: String(ticket?.requestedBy?.name || ""),
  requestedByEmail: String(ticket?.requestedBy?.email || ""),
  acceptedByName: String(ticket?.acceptedBy?.name || ""),
  acceptedByEmail: String(ticket?.acceptedBy?.email || ""),
  resolvedByName: String(ticket?.resolvedBy?.name || ""),
  resolvedByEmail: String(ticket?.resolvedBy?.email || ""),
  role: String(ticket?.role || ""),
  department: String(ticket?.department || ""),
  workspaceName: String(ticket?.workspaceName || ""),
  image: {
    id: String(ticket?.image?.id || ""),
    url: String(ticket?.image?.url || ""),
  },
  resolutionMessage: String(ticket?.resolutionMessage || ""),
  resolutionAttachment: {
    id: String(ticket?.resolutionAttachment?.id || ""),
    url: String(ticket?.resolutionAttachment?.url || ""),
  },
  resolvedAt: ticket?.resolvedAt || null,
  closedByUserAt: ticket?.closedByUserAt || null,
});

export const createSupportTicket = async (req, res) => {
  try {
    const userId = req.user;
    const workspaceId = String(req.workspaceMembership?.workspace || "");
    const { title, description } = req.body;

    const trimmedTitle = String(title || "").trim();
    const trimmedDescription = String(description || "").trim();
    if (!trimmedTitle || !trimmedDescription) {
      return res
        .status(400)
        .json({ success: false, message: "Title and description are required." });
    }

    const context = await getUserContext(userId, workspaceId);
    if (!context?.user) {
      return res
        .status(404)
        .json({ success: false, message: "Host user not found." });
    }

    let uploadedImage = { id: "", url: "" };
    if (req.file) {
      const ext = String(req.file.originalname || "")
        .split(".")
        .pop()
        ?.toLowerCase();
      const imageRoute = `support-tickets/${Date.now()}-${Math.round(
        Math.random() * 1e9,
      )}.${ext || "png"}`;
      uploadedImage = await uploadFileToS3(imageRoute, req.file);
    }

    const normalizedRole = String(context?.membership?.role || "")
      .trim()
      .toLowerCase();
    const isTopRole =
      normalizedRole === "founder" || normalizedRole === "super_admin";

    const departmentList = Array.isArray(context?.membership?.departments)
      ? context.membership.departments.filter(Boolean)
      : [];

    const ticket = await SupportTicket.create({
      user: context.user._id,
      requestedBy: context.user._id,
      title: trimmedTitle,
      description: trimmedDescription,
      company: context?.company?._id || null,
      companyName: context?.company?.companyName || "",
      workspace: context?.workspace?._id || null,
      workspaceName: context?.workspace?.workspaceName || "",
      role: context?.membership?.role || "",
      department: isTopRole ? null : departmentList.join(", "),
      requestedAt: new Date(),
      status: "Pending",
      image: uploadedImage,
    });

    const populated = await SupportTicket.findById(ticket._id)
      .populate("requestedBy", "name email")
      .populate("acceptedBy", "name email")
      .populate("resolvedBy", "name email")
      .lean()
      .exec();

    return res.status(201).json({
      success: true,
      message: "Support ticket raised successfully.",
      data: normalizeTicket(populated),
    });
  } catch (error) {
    console.error("createSupportTicket error", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to raise support ticket.",
    });
  }
};

export const getSupportTickets = async (req, res) => {
  try {
    const userId = String(req.user || "");
    const tickets = await SupportTicket.find({ user: userId })
      .populate("requestedBy", "name email")
      .populate("acceptedBy", "name email")
      .populate("resolvedBy", "name email")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const history = tickets
      .filter(
        (ticket) =>
          ticket.status === "Closed" ||
          ticket.status === "Rejected" ||
          Boolean(ticket.resolvedAt) ||
          Boolean(String(ticket.resolutionMessage || "").trim()),
      )
      .map(normalizeTicket);
    const historyIdSet = new Set(history.map((item) => item.id));
    const raised = tickets
      .filter((ticket) => !historyIdSet.has(String(ticket?._id || "")))
      .map(normalizeTicket);

    return res.status(200).json({
      success: true,
      data: { raised, history },
    });
  } catch (error) {
    console.error("getSupportTickets error", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to load support tickets.",
    });
  }
};

export const closeSupportTicketByUser = async (req, res) => {
  try {
    const userId = String(req.user || "");
    const ticketId = String(req.params.ticketId || "");

    const ticket = await SupportTicket.findOne({ _id: ticketId, user: userId });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Support ticket not found." });
    }

    ticket.status = "Closed";
    ticket.closedByUserAt = new Date();
    if (!ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    await ticket.save();

    const updated = await SupportTicket.findById(ticket._id)
      .populate("requestedBy", "name email")
      .populate("acceptedBy", "name email")
      .populate("resolvedBy", "name email")
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: "Ticket closed successfully.",
      data: normalizeTicket(updated),
    });
  } catch (error) {
    console.error("closeSupportTicketByUser error", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to close ticket.",
    });
  }
};

export const followUpSupportTicket = async (req, res) => {
  try {
    const userId = req.user;
    const workspaceId = String(req.workspaceMembership?.workspace || "");
    const ticketId = String(req.params.ticketId || "");
    const { description } = req.body;

    const ticket = await SupportTicket.findOne({ _id: ticketId, user: userId }).lean();
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Support ticket not found." });
    }

    const context = await getUserContext(userId, workspaceId);
    const normalizedRole = String(context?.membership?.role || ticket.role || "")
      .trim()
      .toLowerCase();
    const isTopRole =
      normalizedRole === "founder" || normalizedRole === "super_admin";

    const followUpDescription = String(description || "").trim();

    const newDescription = followUpDescription
      ? `${ticket.description}\n\nFollow-up: ${followUpDescription}`
      : `${ticket.description}\n\nFollow-up requested by user.`;

    const newTicket = await SupportTicket.create({
      user: context?.user?._id || userId,
      requestedBy: context?.user?._id || userId,
      title: ticket.title,
      description: newDescription,
      company: context?.company?._id || ticket.company || null,
      companyName: context?.company?.companyName || ticket.companyName || "",
      workspace: context?.workspace?._id || ticket.workspace || null,
      workspaceName:
        context?.workspace?.workspaceName || ticket.workspaceName || "",
      role: context?.membership?.role || ticket.role || "",
      department: isTopRole
        ? null
        : context?.membership?.departments?.join(", ") || ticket.department || "",
      requestedAt: new Date(),
      status: "Pending",
      image: ticket.image || { id: "", url: "" },
    });

    const populated = await SupportTicket.findById(newTicket._id)
      .populate("requestedBy", "name email")
      .populate("acceptedBy", "name email")
      .populate("resolvedBy", "name email")
      .lean()
      .exec();

    return res.status(201).json({
      success: true,
      message: "Follow-up ticket created successfully.",
      data: normalizeTicket(populated),
    });
  } catch (error) {
    console.error("followUpSupportTicket error", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to create follow-up ticket.",
    });
  }
};
