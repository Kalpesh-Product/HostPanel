// @ts-nocheck
import mongoose from "mongoose";

const websiteEditLockSchema = new mongoose.Schema(
  {
    lockKey: { type: String, required: true, unique: true, index: true },
    editorSessionId: { type: String, required: true },
    editorUserId: { type: String, default: "" },
    editorName: { type: String, default: "Someone" },
    source: { type: String, enum: ["host-panel", "master-panel"], required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.WebsiteEditLock ||
  mongoose.model("WebsiteEditLock", websiteEditLockSchema);
