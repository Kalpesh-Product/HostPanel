// @ts-nocheck
import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    sr: {
      type: Number,
      unique: true,
      index: true,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      required: true,
    },
    ticketId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostCompany",
      default: null,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
    },
    workspaceName: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: null,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      trim: true,
      enum: [
        "Open",
        "In Progress",
        "Closed",
        "Pending",
        "Escalated",
        "Rejected",
      ],
      default: "Pending",
    },
    image: {
      id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    resolutionMessage: {
      type: String,
      trim: true,
      default: "",
    },
    resolutionAttachment: {
      id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedByUserAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

supportTicketSchema.pre("validate", async function (next) {
  if (!this.isNew) return next();

  const lastRecord = await this.constructor
    .findOne({})
    .sort({ sr: -1 })
    .select("sr")
    .lean()
    .exec();

  const nextSr = Number(lastRecord?.sr || 0) + 1;
  this.sr = nextSr;

  if (!this.ticketId) {
    this.ticketId = `SUP-${String(nextSr).padStart(6, "0")}`;
  }

  next();
});

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
export default SupportTicket;
