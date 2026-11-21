// @ts-nocheck
import mongoose from "mongoose";
import { creditsForPlan } from "../utils/websiteCredits.js";

const getFirstDayOfNextMonthUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
};

const websiteCreditsSchema = new mongoose.Schema({
  companyId: {
    type: String,
    // Strips a legacy "<companyId>-<timestamp>" suffix so every variant of one
    // company maps to the same shared pool document.
    set: (value) => {
      const normalized = String(value || "").trim();
      const match = normalized.match(/^(.*)-(\d{10,})$/);
      return (match?.[1] || normalized) || undefined;
    },
  },
  // Informational only: the last unit that touched the company's shared pool.
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

// ONE credit pool per company. The website builder is shared by every unit of a
// company, so all units draw from the same limit, usage counter and add-on
// balance — keying on (companyId, workspaceId) gave each unit its own full
// monthly allowance against a single shared site. workspaceId on the document
// only records the last unit that touched the pool.
websiteCreditsSchema.index(
  { companyId: 1 },
  { unique: true, partialFilterExpression: { companyId: { $type: "string" } } },
);

// Monthly limit is plan-based and staff-editable: the live numbers come from
// the Master Panel's website_credits_settings document through
// creditsForPlan(), never from constants in this file. creditsLimit is the
// snapshot written by syncSubscriptionPlan and is only used as a fallback for
// legacy rows that predate the plan field.
const KNOWN_PLANS = ["static-free", "basic", "professional", "custom"];
const getMonthlyLimit = (doc) => {
  const plan = String(doc.plan || "")
    .trim()
    .toLowerCase();
  if (KNOWN_PLANS.includes(plan)) return creditsForPlan(plan);
  return Number(doc.creditsLimit || 0) > 0
    ? Number(doc.creditsLimit)
    : creditsForPlan("basic");
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
