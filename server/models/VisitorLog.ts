// @ts-nocheck
import mongoose from "mongoose";

const visitorLogSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      required: true,
    },
    visitorCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      default: "",
      trim: true,
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    visitorCompanyType: {
      type: String,
      enum: ["individual", "company"],
      default: "individual",
      trim: true,
    },
    visitorType: {
      type: String,
      enum: ["standard", "department", "tenant"],
      default: "standard",
      trim: true,
    },
    tenantCompanyName: {
      type: String,
      default: "",
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    // Unit Tour / Sales tour fields
    pocName: { type: String, default: "", trim: true },
    pocDesignation: { type: String, default: "", trim: true },
    pocPhone: { type: String, default: "", trim: true },
    pocEmail: { type: String, default: "", trim: true },
    preferredContactMethod: { type: String, default: "", trim: true },
    industry: { type: String, default: "", trim: true },
    teamSize: { type: String, default: "", trim: true },
    seatCount: { type: String, default: "", trim: true },
    preferredSpace: { type: String, default: "", trim: true },
    budgetRange: { type: String, default: "", trim: true },
    moveInTimeline: { type: String, default: "", trim: true },
    followUpDate: { type: String, default: "", trim: true },
    tourNotes: { type: String, default: "", trim: true },
    hostUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      default: null,
      index: true,
    },
    hostName: {
      type: String,
      default: "",
      trim: true,
    },
    hostRole: {
      type: String,
      default: "",
      trim: true,
    },
    hostDepartments: {
      type: [String],
      default: [],
    },
    meetingTargetType: {
      type: String,
      enum: ["", "department", "role", "tenant-role"],
      default: "",
      trim: true,
    },
    meetingTargetValue: {
      type: String,
      default: "",
      trim: true,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "checked_in", "checked_out", "cancelled", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    badgeNo: {
      type: String,
      default: "",
      trim: true,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    checkedInByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      default: null,
    },
    checkedInByName: {
      type: String,
      default: "",
      trim: true,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    checkedOutByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostUser",
      default: null,
    },
    checkedOutByName: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "frontdesk",
      trim: true,
    },
  },
  { timestamps: true },
);

visitorLogSchema.index({ workspace: 1, createdAt: -1 });

const VisitorLog = mongoose.models.VisitorLog || mongoose.model("VisitorLog", visitorLogSchema);
export default VisitorLog;
