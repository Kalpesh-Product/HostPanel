import assert from "node:assert/strict";
import { allocateDormBeds, occupiedDormBeds } from "./roomStayController.js";

const legacyAndGroupBookings = [
    { bedNumber: 1, bedNumbers: [] },
    { bedNumber: 2, bedNumbers: [2, 3] },
];

assert.deepEqual([...occupiedDormBeds(legacyAndGroupBookings)].sort((a, b) => a - b), [1, 2, 3]);
assert.deepEqual(allocateDormBeds(6, legacyAndGroupBookings, 2), [4, 5]);
assert.deepEqual(allocateDormBeds(4, legacyAndGroupBookings, 2), [4]);
