/**
 * One-off migration: backfills the new plan-billing-lifecycle fields
 * (purchasedPlan, planStatus, planStartDate, planExpiryDate, planLastPaidAt)
 * on every existing Professional/Custom workspace, using the workspace's own
 * createdAt as a stand-in for "when the plan started" since no real payment
 * date exists for these pre-existing records.
 *
 * Without this, the new expiry-reminder/downgrade cron jobs would treat
 * every live paying customer as already expired the moment they ship.
 *
 * Idempotent and resumable — workspaces that already have a planStatus
 * other than "none" are skipped, so it's safe to re-run.
 *
 * Run with:
 *   cd server
 *   npx tsx scripts/backfillPlanLifecycle.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";

dotenv.config();

const MONGO_URL = process.env.DB_URL;
if (!MONGO_URL) {
  console.error("DB_URL is not set in the environment.");
  process.exit(1);
}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const run = async () => {
  await mongoose.connect(MONGO_URL!);
  console.log("Connected to MongoDB.");

  const workspaces = await Workspace.find({
    selectedPlan: { $in: ["professional", "custom"] },
    planStatus: { $in: [null, "none"] },
  });

  console.log(`Found ${workspaces.length} Professional/Custom workspace(s) to backfill.`);

  let updated = 0;
  for (const workspace of workspaces) {
    const startDate = workspace.get("createdAt") || new Date();
    const expiryDate = new Date(new Date(startDate).getTime() + ONE_MONTH_MS);

    await Workspace.updateOne(
      { _id: workspace._id },
      {
        $set: {
          purchasedPlan: workspace.selectedPlan,
          planStatus: "active",
          planStartDate: startDate,
          planExpiryDate: expiryDate,
          planLastPaidAt: startDate,
        },
      },
    );
    updated += 1;
  }

  console.log(`Backfilled ${updated} workspace(s).`);
  await mongoose.disconnect();
  console.log("Done.");
};

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
