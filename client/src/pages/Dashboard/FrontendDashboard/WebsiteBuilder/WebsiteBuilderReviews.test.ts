import assert from "node:assert/strict";
import { resolveWebsiteEmptyAction, isSameCompanyWebsite } from "./WebsiteBuilderReviews.helpers";

// --- Published website: must offer editing + the live URL, never "Create"/"Publish". ---
const published = resolveWebsiteEmptyAction({
  website: { searchKey: "acme", isPublished: true, deployedUrl: "https://acme.wono.co" },
  isWebsitePending: false,
  isWebsiteError: false,
});
assert.equal(published.label, "Edit Website");
assert.notEqual(published.label, "Publish Website");
assert.notEqual(published.label, "Create Website");
assert.equal(published.isWebsitePublished, true);
assert.equal(published.publishedWebsiteUrl, "https://acme.wono.co");
assert.equal(published.to, "/key-apps/website-builder/edit-website/acme");

// --- Saved-but-unpublished draft: edit it, still not published. ---
const draft = resolveWebsiteEmptyAction({
  website: { searchKey: "draft-co", isPublished: false },
  isWebsitePending: false,
  isWebsiteError: false,
});
assert.equal(draft.label, "Edit Website");
assert.equal(draft.isWebsitePublished, false);
assert.equal(draft.publishedWebsiteUrl, "");

// --- No website at all: create one. ---
assert.equal(
  resolveWebsiteEmptyAction({ website: null, isWebsitePending: false, isWebsiteError: false }).label,
  "Create Website",
);

// --- Lookup failed: never claim the host has no website. ---
assert.equal(
  resolveWebsiteEmptyAction({ website: null, isWebsitePending: false, isWebsiteError: true }).label,
  "Open Website Builder",
);

// --- Still loading: disabled "checking" state, no navigation claim. ---
const pending = resolveWebsiteEmptyAction({ website: null, isWebsitePending: true, isWebsiteError: false });
assert.equal(pending.disabled, true);
assert.equal(pending.kind, "pending");

// --- A legacy website record can still expose its published URL without a searchKey. ---
const legacyPublishedWebsite = resolveWebsiteEmptyAction({
  website: { isPublished: true, publishedProjectUrl: "https://sub.wono.co" },
  isWebsitePending: false,
  isWebsiteError: false,
});
assert.equal(legacyPublishedWebsite.isWebsitePublished, true);
assert.equal(legacyPublishedWebsite.publishedWebsiteUrl, "https://sub.wono.co");
assert.equal(legacyPublishedWebsite.to, "/key-apps/website-builder/dynamic/create-website");

// --- Ownership matching keeps the correct website binding. ---
assert.equal(isSameCompanyWebsite({ companyId: "c1" }, "c1", "w1", "Acme"), true);
assert.equal(isSameCompanyWebsite({ companyId: "c2" }, "c1", "w1", "Acme"), false);
assert.equal(isSameCompanyWebsite({ workspaceId: "w1" }, "", "w1", "Acme"), true);
assert.equal(isSameCompanyWebsite({ companyName: "acme" }, "", "", "Acme"), true);

console.log("Website reviews empty-state checks passed.");
