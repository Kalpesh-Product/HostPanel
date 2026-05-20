// @ts-nocheck
import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, trim: true },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Closed", "Pending", "Escalated", "Rejected"],
      default: "Open",
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null },
    role: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    image: {
      id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    resolutionMessage: { type: String, trim: true, default: "" },
    resolutionAttachment: {
      id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    resolvedAt: { type: Date, default: null },
    closedByUserAt: { type: Date, default: null },
    parentTicket: { type: mongoose.Schema.Types.ObjectId, ref: "SupportTicket", default: null },
  },
  {
    timestamps: true,
    collection: "supporttickets",
    strict: false,
  },
);

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
export default SupportTicket;

