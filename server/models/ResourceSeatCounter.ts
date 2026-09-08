import mongoose from "mongoose";

// One counter document per workspace+floor+wing+resourceCategory, keyed by a
// composite string _id. Seat numbers are global across every resource block
// that shares that floor/wing/category, so a second "Open Desk" block on the
// same floor/wing continues numbering where the first block left off.
const resourceSeatCounterSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 },
    },
    { versionKey: false },
);

export const ResourceSeatCounter =
    (mongoose.models.ResourceSeatCounter as mongoose.Model<any>) ||
    mongoose.model("ResourceSeatCounter", resourceSeatCounterSchema);

export function buildResourceSeatCounterKey(workspaceId: string, floor: string, wing: string, resourceCategory: string) {
    const normalizedFloor = String(floor || "").trim().toLowerCase();
    const normalizedWing = String(wing || "").trim().toLowerCase();
    const normalizedCategory = String(resourceCategory || "").trim().toLowerCase();
    return `${workspaceId}:${normalizedFloor}:${normalizedWing}:${normalizedCategory}`;
}

export async function reserveNextResourceSeatNumbers(
    workspaceId: string,
    floor: string,
    wing: string,
    resourceCategory: string,
    count: number,
) {
    if (count <= 0) return [];
    const key = buildResourceSeatCounterKey(workspaceId, floor, wing, resourceCategory);
    const counter = await ResourceSeatCounter.findByIdAndUpdate(
        key,
        { $inc: { seq: count } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
    const lastNumber = Number(counter.seq);
    const firstNumber = lastNumber - count + 1;
    return Array.from({ length: count }, (_, index) => firstNumber + index);
}
