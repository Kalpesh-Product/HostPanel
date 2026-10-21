import assert from "node:assert/strict";
import { resolveListingsEmptyAction } from "./CompanyReviews.helpers";

const idle = { isPending: false, isError: false };

// --- No listings: the host must add one. ---
const none = resolveListingsEmptyAction({ ...idle, listingCount: 0, activePublicListingCount: 0 });
assert.equal(none.label, "Add Listing");
assert.equal(none.to, "/key-apps/nomad-listings/add");

// --- Listings exist but none are active/public: manage/activate them. ---
const inactive = resolveListingsEmptyAction({ ...idle, listingCount: 3, activePublicListingCount: 0 });
assert.equal(inactive.label, "Manage Listings");
assert.equal(inactive.to, "/key-apps/nomad-listings");

// --- At least one active public listing: just view listings. ---
const active = resolveListingsEmptyAction({ ...idle, listingCount: 2, activePublicListingCount: 1 });
assert.equal(active.label, "View Listings");

// --- Lookup failed: never claim "no listings"; fall back to viewing them. ---
const failed = resolveListingsEmptyAction({ isPending: false, isError: true, listingCount: 0, activePublicListingCount: 0 });
assert.equal(failed.label, "View Listings");
assert.notEqual(failed.label, "Add Listing");

// --- Still loading: disabled "checking" state. ---
const loading = resolveListingsEmptyAction({ isPending: true, isError: false, listingCount: 0, activePublicListingCount: 0 });
assert.equal(loading.disabled, true);
assert.equal(loading.kind, "pending");

console.log("Nomads reviews empty-state checks passed.");
