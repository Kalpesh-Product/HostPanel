/**
 * One-off migration: numbers every existing Open Desk / Cabin Desk resource's
 * seats so they become individually trackable and assignable, instead of the
 * old whole-block "one assignee for the entire capacity" model.
 *
 * For each open_desk/cabin_desk Resource:
 *   - Creates `capacity` ResourceSeat docs, numbered via the global
 *     workspace+floor+wing+resourceCategory counter (continuing across any
 *     other resource blocks that already share that floor/wing/category).
 *   - If the resource currently has a whole-block assignee
 *     (assignedTenantCompanyId or assignedDepartmentId), copies that same
 *     assignee onto every seat just created, so nothing that was occupied
 *     looks vacant after migration.
 *
 * Idempotent and resumable — resources that already have ResourceSeat docs
 * are skipped, so it's safe to re-run (e.g. after a partial failure).
 *
 * Run with:
 *   cd server
 *   npx tsx scripts/migrateResourceSeats.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Resource } from "../models/Resource.js";
import { ResourceSeat } from "../models/ResourceSeat.js";
import { createSeatsForResource } from "../services/resourceSeatService.js";

dotenv.config();

const MONGO_URL = process.env.DB_URL;
if (!MONGO_URL) {
    console.error("DB_URL is not set in the environment.");
    process.exit(1);
}

const SEAT_TRACKED_CATEGORIES = ["open_desk", "cabin_desk"];

const run = async () => {
    await mongoose.connect(MONGO_URL!);
    console.log("Connected to MongoDB.");

    const resources = await Resource.find({ resourceCategory: { $in: SEAT_TRACKED_CATEGORIES } }).exec();

    if (resources.length === 0) {
        console.log("No open_desk/cabin_desk resources found. Nothing to migrate.");
        await mongoose.disconnect();
        return;
    }

    console.log(`Found ${resources.length} desk resource(s). Migrating...`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const resource of resources) {
        const existingSeatCount = await ResourceSeat.countDocuments({ resourceId: resource._id });
        if (existingSeatCount > 0) {
            console.log(`  - Skipping "${resource.name}" (${resource._id}): already has ${existingSeatCount} seat(s).`);
            skipped += 1;
            continue;
        }

        try {
            const seats = await createSeatsForResource(resource, Number(resource.capacity || 0));

            const hasWholeBlockAssignee = Boolean(resource.assignedTenantCompanyId || resource.assignedDepartmentId);
            if (hasWholeBlockAssignee && seats.length > 0) {
                await ResourceSeat.updateMany(
                    { _id: { $in: seats.map((seat: any) => seat._id) } },
                    {
                        $set: {
                            assignedTenantCompanyId: resource.assignedTenantCompanyId || null,
                            assignedTenantCompanyName: resource.assignedTenantCompanyName || "",
                            assignedDepartmentId: resource.assignedDepartmentId || "",
                            assignedDepartmentName: resource.assignedDepartmentName || "",
                            assignedAt: resource.assignedAt || new Date(),
                        },
                    },
                );
                console.log(`  - Migrated "${resource.name}" (${resource._id}): ${seats.length} seat(s), all assigned to ${resource.assignedTenantCompanyName || resource.assignedDepartmentName}.`);
            } else {
                console.log(`  - Migrated "${resource.name}" (${resource._id}): ${seats.length} vacant seat(s).`);
            }
            migrated += 1;
        } catch (err) {
            console.error(`  - Failed to migrate "${resource.name}" (${resource._id}):`, err);
            failed += 1;
        }
    }

    console.log(`\nDone. Migrated ${migrated}, skipped ${skipped}, failed ${failed}.`);
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
