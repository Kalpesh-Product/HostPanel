// @ts-nocheck -- workspaceModuleCatalog.ts is itself @ts-nocheck'd, so tsc
// infers overly-strict parameter types (e.g. never[]) for its exports here.
import assert from "node:assert/strict";
import { buildWorkspaceModuleCatalog, getEffectiveEnabledModuleIds } from "./workspaceModuleCatalog.js";

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

// meeting-room-system is meeting-rooms only now — co-working no longer gets
// it bundled in (it has its own Co-working Management module instead).
const professionalCoworking = getEffectiveEnabledModuleIds({
    selectedPlan: "professional",
    existingEnabledModuleIds: [],
    verticalKeys: ["co-working"],
});
assert.equal(professionalCoworking.includes("meeting-room-system"), false);
assert.equal(professionalCoworking.includes("virtual-office-sales"), true);
assert.equal(professionalCoworking.includes("tenant-companies-admin"), true);
assert.equal(professionalCoworking.includes("resource-management"), true);
assert.equal(professionalCoworking.includes("resource-pricing"), false);

const professionalMeetingRooms = getEffectiveEnabledModuleIds({
    selectedPlan: "professional",
    existingEnabledModuleIds: [],
    verticalKeys: ["meeting-rooms"],
});
assert.equal(professionalMeetingRooms.includes("meeting-room-system"), true);

// Meeting Rooms does not activate Resource & Pricing: that module belongs to
// hostel, co-living, and co-working. Bookings and Sales Architecture still
// require more than one vertical.
assert.equal(professionalMeetingRooms.includes("bookings"), false);
assert.equal(professionalMeetingRooms.includes("resource-pricing"), false);
assert.equal(professionalMeetingRooms.includes("sales-architecture"), false);

const professionalHostel = getEffectiveEnabledModuleIds({
    selectedPlan: "professional",
    existingEnabledModuleIds: [],
    verticalKeys: ["hostel"],
});
assert.equal(professionalHostel.includes("resource-pricing"), false);
assert.equal(professionalHostel.includes("tenant-companies-admin"), false);
assert.equal(professionalHostel.includes("resource-management"), true);

const professionalColiving = getEffectiveEnabledModuleIds({
    selectedPlan: "professional",
    existingEnabledModuleIds: [],
    verticalKeys: ["co-living"],
});
assert.equal(professionalColiving.includes("resource-pricing"), false);
assert.equal(professionalColiving.includes("tenant-companies-admin"), false);
assert.equal(professionalColiving.includes("resource-management"), true);

// Multi-vertical Professional workspaces get all three.
const professionalMultiVertical = getEffectiveEnabledModuleIds({
    selectedPlan: "professional",
    existingEnabledModuleIds: [],
    verticalKeys: ["hostel", "co-living"],
});
assert.equal(professionalMultiVertical.includes("bookings"), true);
assert.equal(professionalMultiVertical.includes("resource-pricing"), true);
assert.equal(professionalMultiVertical.includes("sales-architecture"), true);

// Tenant Companies (admin) remains co-working-only, while Resource Management
// is still parked and never granted by default.
assert.equal(professionalMultiVertical.includes("tenant-companies-admin"), false);
assert.equal(professionalMultiVertical.includes("resource-management"), true);

// Matching verticals do not create fresh grants on Basic; these remain
// Professional+ entitlements.
const basicCoworking = getEffectiveEnabledModuleIds({
    selectedPlan: "basic",
    existingEnabledModuleIds: [],
    verticalKeys: ["co-working"],
});
assert.equal(basicCoworking.includes("tenant-companies-admin"), false);
assert.equal(basicCoworking.includes("resource-pricing"), false);
assert.equal(basicCoworking.includes("resource-management"), false);

// The live module-access catalog must unlock vertical entitlements even for
// older workspaces whose stored enabledModuleIds predate the new mapping.
const professionalCoworkingCatalog = buildWorkspaceModuleCatalog({
    selectedPlan: "professional",
    enabledModuleIds: [],
    verticalKeys: ["co-working"],
});
const catalogSections = professionalCoworkingCatalog.sections || [];
const departmentAccesses = catalogSections
    .find((section) => section.sectionId === "department-accesses")
const administrationDepartment = departmentAccesses
    ?.items?.find((item) => item.id === "administration-department");
const resourceManagement = administrationDepartment?.tabs?.find((tab) => tab.id === "resource-management");
assert.equal(resourceManagement?.unlockedInWorkspace, true);
const salesDepartment = departmentAccesses?.items?.find((item) => item.id === "sales-department");
assert.equal(Array.isArray(salesDepartment?.tabs) && salesDepartment.tabs.length > 0, true);

const keyApps = catalogSections.find((section) => section.sectionId === "key-apps");
const allLeads = keyApps?.items?.find((item) => item.id === "website-leads");
assert.equal(allLeads?.label, "All Leads");

console.log("Workspace module catalog plan-gating checks passed.");
