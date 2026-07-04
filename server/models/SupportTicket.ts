// @ts-nocheck
import mongoose from "mongoose";

const supportTicketCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  {
    collection: "counters",
    versionKey: false,
  },
);

const SupportTicketCounter =
  mongoose.models.SupportTicketCounter ||
  mongoose.model("SupportTicketCounter", supportTicketCounterSchema);

const supportTicketSchema = new mongoose.Schema(
  {
    sr: { type: Number, unique: true, sparse: true, index: true },
    ticketId: { type: String, trim: true },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    pageUrl: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Open", "Accepted", "In Progress", "Resolved", "Closed", "Pending", "Escalated", "Rejected"],
      default: "Open",
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    acceptedByName: { type: String, trim: true, default: "" },
    acceptedByEmail: { type: String, trim: true, default: "" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    resolvedByName: { type: String, trim: true, default: "" },
    resolvedByEmail: { type: String, trim: true, default: "" },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "HostUser", default: null },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "HostCompany", default: null },
    requestedAt: { type: Date, default: Date.now },
    role: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    requestedByName: { type: String, trim: true, default: "" },
    requestedByEmail: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    workspaceName: { type: String, trim: true, default: "" },
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

supportTicketSchema.pre("validate", async function (next) {
  try {
    if (this.isNew && (this.sr === null || this.sr === undefined)) {
      const maxSrDoc = await mongoose
        .model("SupportTicket")
        .findOne({ sr: { $type: "number" } })
        .sort({ sr: -1 })
        .select("sr")
        .lean()
        .exec();
      const maxSr = Number(maxSrDoc?.sr || 0);

      await SupportTicketCounter.updateOne(
        { _id: "supportTicketSr" },
        { $setOnInsert: { seq: 0 } },
        { upsert: true },
      ).exec();

      await SupportTicketCounter.updateOne(
        { _id: "supportTicketSr" },
        { $max: { seq: maxSr } },
      ).exec();

      const counter = await SupportTicketCounter.findByIdAndUpdate(
        { _id: "supportTicketSr" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
        .lean()
        .exec();
      this.sr = Number(counter?.seq || 1);
    }
    next();
  } catch (error) {
    next(error as any);
  }
});

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
export default SupportTicket;
