// @ts-nocheck
import mongoose from "mongoose";

const reviewActorSchema = new mongoose.Schema(
  {
    userId: { type: String, trim: true, default: "" },
    userType: { type: String, trim: true, default: "HOST" },
    date: { type: Date, default: null },
  },
  { _id: false },
);

const websiteReviewSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, trim: true, index: true, default: "" },
    companyId: { type: String, trim: true, index: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    searchKey: { type: String, trim: true, index: true, default: "" },
    reviewerName: { type: String, trim: true, required: true },
    reviewreName: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
    fullName: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    jobPosition: { type: String, trim: true, default: "" },
    review: { type: String, trim: true, required: true },
    comment: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    starCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    source: { type: String, trim: true, default: "website" },
    reviewSource: { type: String, trim: true, default: "Website Reviews" },
    websiteUrl: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "pending", index: true },
    isEnabled: { type: Boolean, default: false, index: true },
    reviewerImage: { type: String, trim: true, default: "" },
    approvedBy: { type: reviewActorSchema, default: null },
    rejectedBy: { type: reviewActorSchema, default: null },
    upstreamSynced: { type: Boolean, default: false },
    upstreamError: { type: String, default: "" },
    upstreamReviewId: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const WebsiteReview =
  mongoose.models.WebsiteReview ||
  mongoose.model("WebsiteReview", websiteReviewSchema);

export default WebsiteReview;
