/**
 * One-off cleanup: releases any ResourceSeat that is still marked assigned to
 * a tenant company which either:
 *   - no longer exists (deleted directly in the database), or
 *   - has a contract that has already ended (status would compute as
 *     "Expired").
 *
 * Going forward this class of bug is prevented in code (tenant-company.service.ts
 * releases a tenant's seats automatically once its status becomes Expired),
 * but this script fixes any seats already stuck assigned from before that fix.
 *
 * Run with:
 *   cd server
 *   npx tsx scripts/releaseOrphanedAndExpiredSeats.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { TenantCompany } from "../models/TenantCompany.js";
import { ResourceSeat } from "../models/ResourceSeat.js";

dotenv.config();

const MONGO_URL = process.env.DB_URL;
if (!MONGO_URL) {
    console.error("DB_URL is not set in the environment.");
    process.exit(1);
}

function isExpired(contractEnd: any) {
    if (!contractEnd) return false;
    const end = new Date(contractEnd);
    if (Number.isNaN(end.getTime())) return false;
    return end.getTime() < Date.now();
}

const run = async () => {
    await mongoose.connect(MONGO_URL!);
    console.log("Connected to MongoDB.");

    const assignedSeats = await ResourceSeat.find({ assignedTenantCompanyId: { $ne: null } }).lean().exec();
    if (assignedSeats.length === 0) {
        console.log("No assigned seats found. Nothing to check.");
        await mongoose.disconnect();
        return;
    }

    const tenantIds = [...new Set(assignedSeats.map((seat: any) => String(seat.assignedTenantCompanyId)))];
    const tenants = await TenantCompany.find({ _id: { $in: tenantIds } })
        .select("_id companyName contractEnd")
        .lean()
        .exec();
    const tenantById = new Map(tenants.map((t: any) => [String(t._id), t]));

    const orphanedSeatIds: any[] = [];
    const expiredSeatIds: any[] = [];
    const expiredTenantNames = new Set<string>();
    const orphanedTenantIds = new Set<string>();

    for (const seat of assignedSeats as any[]) {
        const tenantId = String(seat.assignedTenantCompanyId);
        const tenant = tenantById.get(tenantId);
        if (!tenant) {
            orphanedSeatIds.push(seat._id);
            orphanedTenantIds.add(tenantId);
        } else if (isExpired(tenant.contractEnd)) {
            expiredSeatIds.push(seat._id);
            expiredTenantNames.add(tenant.companyName);
        }
    }

    console.log(`Checked ${assignedSeats.length} assigned seat(s) across ${tenantIds.length} tenant reference(s).`);
    console.log(`  - Orphaned (tenant no longer exists): ${orphanedSeatIds.length} seat(s), referencing ${orphanedTenantIds.size} missing tenant id(s).`);
    console.log(`  - Expired contract: ${expiredSeatIds.length} seat(s), tenants: ${[...expiredTenantNames].join(", ") || "none"}.`);

    const seatIdsToRelease = [...orphanedSeatIds, ...expiredSeatIds];
    if (seatIdsToRelease.length === 0) {
        console.log("Nothing to release.");
        await mongoose.disconnect();
        return;
    }

    const result = await ResourceSeat.updateMany(
        { _id: { $in: seatIdsToRelease } },
        { $set: { assignedTenantCompanyId: null, assignedTenantCompanyName: "", assignedAt: null } },
    ).exec();

    console.log(`\nDone. Released ${result.modifiedCount} seat(s).`);
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
});
