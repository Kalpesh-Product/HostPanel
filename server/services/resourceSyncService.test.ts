import assert from "node:assert/strict";
import {
    getResourceCapacityOptions,
    hasResourcePricingAndCredits,
    nightlyPricedCategories,
    normalizeResourceCategory,
    normalizeResourceType,
} from "./resourceSyncService";

// Room/Dorm category detection — "room" must never shadow meeting_room/conference_room.
assert.equal(normalizeResourceCategory("Room"), "room");
assert.equal(normalizeResourceCategory("Dorm"), "dorm");
assert.equal(normalizeResourceCategory("Meeting Room"), "meeting_room");
assert.equal(normalizeResourceCategory("Conference Room"), "conference_room");

// Type derivation mirrors the category.
assert.equal(normalizeResourceType("room"), "Room");
assert.equal(normalizeResourceType("dorm"), "Dorm");

// Room occupancy and Dorm bed count are both manually entered (no fixed catalog) —
// a Room is still booked as a single unit, but can sleep more than one guest.
assert.deepEqual(getResourceCapacityOptions("room"), []);
assert.deepEqual(getResourceCapacityOptions("dorm"), []);

// Room/Dorm are flagged as nightly-priced, unlike every other category.
assert.equal(nightlyPricedCategories.has("room"), true);
assert.equal(nightlyPricedCategories.has("dorm"), true);
assert.equal(nightlyPricedCategories.has("meeting_room"), false);

// Activation readiness: a nightly rate alone is enough, same as hourly/daily for other categories.
assert.equal(hasResourcePricingAndCredits({ pricePerNight: 1500 }), true);
assert.equal(hasResourcePricingAndCredits({ pricePerNight: 0 }), false);
assert.equal(hasResourcePricingAndCredits({ pricePerHour: 0, pricePerDay: 0, pricePerNight: 0 }), false);

console.log("Resource sync (room/dorm) checks passed.");
