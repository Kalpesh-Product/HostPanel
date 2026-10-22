import assert from "node:assert/strict";
import { getPlanExpiryReminderThreshold } from "./plan-expiry-reminder";

const now = Date.UTC(2026, 9, 21, 0, 0, 0);
const inDays = (days: number) => new Date(now + days * 24 * 60 * 60 * 1000).toISOString();

assert.equal(getPlanExpiryReminderThreshold(inDays(31), now), null);
assert.equal(getPlanExpiryReminderThreshold(inDays(30), now), 30);
assert.equal(getPlanExpiryReminderThreshold(inDays(14), now), 14);
assert.equal(getPlanExpiryReminderThreshold(inDays(7), now), 7);
assert.equal(getPlanExpiryReminderThreshold(inDays(3), now), 3);
assert.equal(getPlanExpiryReminderThreshold(inDays(1), now), 1);
assert.equal(getPlanExpiryReminderThreshold(inDays(0), now), "expired");
assert.equal(getPlanExpiryReminderThreshold(null, now), null);

console.log("Plan expiry reminder checks passed.");
