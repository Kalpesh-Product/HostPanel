// @ts-nocheck -- workspaceModuleCatalog.ts is itself @ts-nocheck'd, so tsc
// infers overly-strict parameter types (e.g. never[]) for its exports here.
import assert from "node:assert/strict";
import { getEffectiveEnabledModuleIds } from "./workspaceModuleCatalog.js";

// A brand-new Basic-plan signup with the cafe vertical selected does NOT get
// the vertical modules for free — they're a Professional+ perk now.
const freshBasicCafe = getEffectiveEnabledModuleIds({
    selectedPlan: "basic",
    existingEnabledModuleIds: [],
    verticalKeys: ["cafe"],
});
assert.equal(freshBasicCafe.includes("cafe-management"), false);
assert.equal(freshBasicCafe.includes("cafe-orders"), false);

// An existing Basic-plan workspace that already had cafe-management granted
// (e.g. from before this rule existed) keeps it — never clawed back.
const existingBasicCafe = getEffectiveEnabledModuleIds({
    selectedPlan: "basic",
    existingEnabledModuleIds: ["cafe-management", "cafe-orders"],
    verticalKeys: ["cafe"],
});
assert.equal(existingBasicCafe.includes("cafe-management"), true);
assert.equal(existingBasicCafe.includes("cafe-orders"), true);

// Professional-plan signups still get vertical modules freely, same as before.
const freshProfessionalCafe = getEffectiveEnabledModuleIds({
    selectedPlan: "professional",
    existingEnabledModuleIds: [],
    verticalKeys: ["cafe"],
});
assert.equal(freshProfessionalCafe.includes("cafe-management"), true);
assert.equal(freshProfessionalCafe.includes("cafe-orders"), true);

// A Basic workspace with no cafe vertical at all never sees cafe modules,
// grandfathered or not (the grandfather filter only keeps ids that are both
// already-existing AND still vertical-matched).
const noVerticalBasic = getEffectiveEnabledModuleIds({
    selectedPlan: "basic",
    existingEnabledModuleIds: ["cafe-management"],
    verticalKeys: [],
});
assert.equal(noVerticalBasic.includes("cafe-management"), false);

console.log("Workspace module catalog plan-gating checks passed.");
