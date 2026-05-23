// @ts-nocheck
import mongoose from "mongoose";

const MONTHLY_BASE_CREDITS = 5;

const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
};

const websiteCreditsSchema = new mongoose.Schema({
  companyId: { type: String, unique: true, sparse: true },
  workspaceId: { type: String, unique: true, sparse: true },
  plan: { type: String, enum: ["static-free"], default: "static-free" },
  creditsLimit: { type: Number, default: 5 },
  creditsUsed: { type: Number, default: 0 },
  addOnCreditsPurchased: { type: Number, default: 0 },
  creditsResetDate: { type: Date },
  publishedProjectId: { type: String, default: null },
  publishedProjectUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

websiteCreditsSchema.virtual("monthlyCreditsLimit").get(function () {
  return MONTHLY_BASE_CREDITS;
});

websiteCreditsSchema.virtual("monthlyCreditsUsed").get(function () {
  return Math.max(0, Math.min(Number(this.creditsUsed || 0), MONTHLY_BASE_CREDITS));
});

websiteCreditsSchema.virtual("monthlyCreditsRemaining").get(function () {
  return Math.max(0, MONTHLY_BASE_CREDITS - Number(this.creditsUsed || 0));
});

websiteCreditsSchema.virtual("addOnCreditsUsed").get(function () {
  return Math.max(0, Number(this.creditsUsed || 0) - MONTHLY_BASE_CREDITS);
});

websiteCreditsSchema.virtual("addOnCreditsRemaining").get(function () {
  const purchased = Number(this.addOnCreditsPurchased || 0);
  const consumed = Math.max(0, Number(this.creditsUsed || 0) - MONTHLY_BASE_CREDITS);
  return Math.max(0, purchased - consumed);
});

websiteCreditsSchema.virtual("effectiveCreditsLimit").get(function () {
  return MONTHLY_BASE_CREDITS + Number(this.addOnCreditsPurchased || 0);
});

websiteCreditsSchema.virtual("creditsRemaining").get(function () {
  return Math.max(0, this.effectiveCreditsLimit - Number(this.creditsUsed || 0));
});

websiteCreditsSchema.pre("save", function (next) {
  if (!this.creditsResetDate) {
    this.creditsResetDate = getFirstDayOfNextMonthUtc();
  }
  this.updatedAt = new Date();
  next();
});

const WorkspaceSubscription =
  mongoose.models.WebsiteCredits ||
  mongoose.model("WebsiteCredits", websiteCreditsSchema, "website_credits");

export default WorkspaceSubscription;
