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
  plan: {
    type: String,
    enum: ["static-free", "professional"],
    default: "static-free",
  },
  creditsLimit: { type: Number, default: 5 },
  creditsUsed: { type: Number, default: 0 },
  addOnCreditsPurchased: { type: Number, default: 0 },
  creditsResetDate: { type: Date },
  publishedProjectId: { type: String, default: null },
  publishedProjectUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Monthly limit is plan-based: professional gets 10, everything else the base
// 5. creditsLimit is kept in sync by syncSubscriptionPlan and used as a
// fallback for legacy rows that predate the plan field.
const PROFESSIONAL_MONTHLY_CREDITS = 10;
const getMonthlyLimit = (doc) => {
  if (doc.plan === "professional") return PROFESSIONAL_MONTHLY_CREDITS;
  return Number(doc.creditsLimit || 0) > 0
    ? Number(doc.creditsLimit)
    : MONTHLY_BASE_CREDITS;
};

websiteCreditsSchema.virtual("monthlyCreditsLimit").get(function () {
  return getMonthlyLimit(this);
});

websiteCreditsSchema.virtual("monthlyCreditsUsed").get(function () {
  return Math.max(0, Math.min(Number(this.creditsUsed || 0), getMonthlyLimit(this)));
});

websiteCreditsSchema.virtual("monthlyCreditsRemaining").get(function () {
  return Math.max(0, getMonthlyLimit(this) - Number(this.creditsUsed || 0));
});

websiteCreditsSchema.virtual("addOnCreditsUsed").get(function () {
  return Math.max(0, Number(this.creditsUsed || 0) - getMonthlyLimit(this));
});

websiteCreditsSchema.virtual("addOnCreditsRemaining").get(function () {
  const purchased = Number(this.addOnCreditsPurchased || 0);
  const consumed = Math.max(0, Number(this.creditsUsed || 0) - getMonthlyLimit(this));
  return Math.max(0, purchased - consumed);
});

websiteCreditsSchema.virtual("effectiveCreditsLimit").get(function () {
  return getMonthlyLimit(this) + Number(this.addOnCreditsPurchased || 0);
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
