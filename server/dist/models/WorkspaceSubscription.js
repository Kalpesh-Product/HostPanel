// @ts-nocheck
import mongoose from "mongoose";
const getFirstDayOfNextMonthUtc = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
};
const workspaceSubscriptionSchema = new mongoose.Schema({
    workspaceId: { type: String, required: true, unique: true },
    plan: { type: String, enum: ["static-free"], default: "static-free" },
    creditsLimit: { type: Number, default: 5 },
    creditsUsed: { type: Number, default: 0 },
    creditsResetDate: { type: Date },
    publishedProjectId: { type: String, default: null },
    publishedProjectUrl: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
workspaceSubscriptionSchema.virtual("creditsRemaining").get(function () {
    return (this.creditsLimit || 0) - (this.creditsUsed || 0);
});
workspaceSubscriptionSchema.pre("save", function (next) {
    if (!this.creditsResetDate) {
        this.creditsResetDate = getFirstDayOfNextMonthUtc();
    }
    this.updatedAt = new Date();
    next();
});
const WorkspaceSubscription = mongoose.model("WorkspaceSubscription", workspaceSubscriptionSchema);
export default WorkspaceSubscription;
