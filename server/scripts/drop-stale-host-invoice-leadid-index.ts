/**
 * One-off repair script: drops the stale `leadId_1` unique index on the
 * `hostinvoicerequests` collection. That index is left over from an older
 * schema (one invoice doc per booking, with a top-level `leadId`) — the
 * current schema stores `leadId` only inside the `bookings[]` subdocuments,
 * so every new HostInvoiceRequest has no top-level `leadId` field at all,
 * which Mongo treats as `leadId: null`. The unique index then rejects the
 * second such document with E11000 dup key { leadId: null }.
 *
 * Mongoose only creates missing indexes on connect — it never drops ones
 * that no longer match the schema — so this has to be removed by hand.
 * Safe to run multiple times: if the index is already gone, it logs that
 * and exits cleanly instead of throwing.
 *
 * Run with:
 *   cd server
 *   npx tsx scripts/drop-stale-host-invoice-leadid-index.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const MONGO_URL = process.env.DB_URL;
if (!MONGO_URL) {
  console.error("DB_URL is not set in the environment.");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URL as string);
  const collection = mongoose.connection.collection("hostinvoicerequests");

  const indexes = await collection.indexes();
  const stale = indexes.find((idx) => idx.name === "leadId_1");

  if (!stale) {
    console.log("No leadId_1 index found on hostinvoicerequests — nothing to do.");
  } else {
    await collection.dropIndex("leadId_1");
    console.log("Dropped stale leadId_1 index on hostinvoicerequests.");
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Failed to drop stale index:", error);
  process.exit(1);
});
