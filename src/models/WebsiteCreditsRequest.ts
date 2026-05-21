import mongoose, { Schema } from "mongoose";

const WebsiteCreditsRequestSchema = new Schema({
  companyId: { type: String, required: true },
  workspaceId: { type: String, required: true },
  requestedCredits: { type: Number, required: true, min: 1, max: 5 },
  pricePerCredit: { type: Number, default: 50 },
  totalAmount: { type: Number },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: String, default: null },
  notes: { type: String, default: null },
});

WebsiteCreditsRequestSchema.pre("save", function (next) {
  this.totalAmount = (this.requestedCredits || 0) * (this.pricePerCredit || 0);
  next();
});

export const WebsiteCreditsRequest =
  mongoose.models.WebsiteCreditsRequest ||
  mongoose.model("WebsiteCreditsRequest", WebsiteCreditsRequestSchema);

export default WebsiteCreditsRequest;
