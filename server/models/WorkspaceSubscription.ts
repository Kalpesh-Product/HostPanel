// @ts-nocheck
import mongoose from "mongoose";

const MONTHLY_BASE_CREDITS = 5;

const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
};

const websiteCreditsSchema = new mongoose.Schema({
  companyId: { type: String },
  workspaceId: { type: String },
  plan: {
    type: String,
    // "basic" replaces "static-free" (same 5 credits); the legacy value stays
    // accepted so old rows keep validating until their next plan sync.
    enum: ["static-free", "basic", "professional", "custom"],
    default: "basic",
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

// One credit pool per company *per workspace* (matches the rest of the data
// model — e.g. a company with multiple workspace units), not one pool per
// company globally. Previously companyId and workspaceId were each unique on
// their own, which — combined with how much id reuse exists in this data —
// caused a brand-new company to silently inherit and increment an unrelated
// company's existing credits doc just because one of the two ids collided.
websiteCreditsSchema.index({ companyId: 1, workspaceId: 1 }, { unique: true });

// Monthly limit is plan-based: professional 8, custom 12, basic (and the
// legacy "static-free" label) the base 5. creditsLimit is kept in sync by
// syncSubscriptionPlan and used as a fallback for legacy rows that predate
// the plan field.
const PROFESSIONAL_MONTHLY_CREDITS = 8;
const CUSTOM_MONTHLY_CREDITS = 12;
const getMonthlyLimit = (doc) => {
  if (doc.plan === "professional") return PROFESSIONAL_MONTHLY_CREDITS;
  if (doc.plan === "custom") return CUSTOM_MONTHLY_CREDITS;
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
