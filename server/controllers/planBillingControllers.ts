// @ts-nocheck
import axios from "axios";
import Workspace from "../models/Workspace.js";
import HostUser from "../models/HostUser.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import HostLeadCompany from "../models/HostLeadCompany.js";
import {
  getDefaultEnabledModuleIdsForPlan,
  getVerticalModuleIds,
  getWorkspaceVerticalKeys,
  MODULE_LABEL_BY_ID,
  MODULE_SECTION_BY_ID,
} from "../config/workspaceModuleCatalog.js";

const MASTER_PANEL_BASE_URL = String(
  process.env.MASTER_PANEL_BASE_URL || "http://localhost:5007",
).replace(/\/+$/, "");

// Same visual order the Sidebar shows its sections in (Common Modules,
// Extra Common Modules, Key Apps, Core Modules, then each Department in
// its own catalog order) — mirrors workspaceModuleCatalog.ts's MODULE_GROUPS
// array order, since MODULE_SECTION_BY_ID only gives label strings, not an
// ordering. Anything not listed here (shouldn't happen, but just in case)
// sorts to the end instead of breaking the page.
const PLAN_BILLING_SECTION_ORDER = [
  "Common Modules",
  "Extra Common Modules",
  "Key Apps",
  "Core Modules",
  "HR Department",
  "Administration Department",
  "Sales Department",
  "Finance Department",
  "Maintenance Department",
  "Tech Department",
  "IT Department",
];
const sectionOrderIndex = (section: string) => {
  const index = PLAN_BILLING_SECTION_ORDER.indexOf(section);
  return index === -1 ? PLAN_BILLING_SECTION_ORDER.length : index;
};

// Same server-to-server shared secret used by verifyBusinessControllers.ts.
const masterPanelHeaders = () => ({
  "x-hostpanel-service-key": process.env.HOSTPANEL_SERVICE_API_KEY,
});

// Same resolution order as workspaceControllers.ts's own (unexported)
// getCurrentWorkspaceContext — kept local here rather than importing a
// private helper across files.
const resolveCurrentWorkspace = async (req) => {
  const membershipWorkspaceId = req.workspaceMembership?.workspace;
  if (membershipWorkspaceId) {
    const workspace = await Workspace.findById(membershipWorkspaceId);
    if (workspace) return workspace;
  }
  const user = await HostUser.findById(req.user);
  if (!user) return null;
  if (user.primaryWorkspace) {
    const workspace = await Workspace.findById(user.primaryWorkspace);
    if (workspace) return workspace;
  }
  const membership = await WorkspaceMember.findOne({ user: user._id, isActive: true })
    .sort({ isPrimary: -1, createdAt: 1 })
    .lean();
  if (membership?.workspace) {
    const workspace = await Workspace.findById(membership.workspace);
    if (workspace) return workspace;
  }
  return Workspace.findOne({ owner: user._id, isActive: true }).sort({ createdAt: 1 });
};

// GET /api/plan-billing/summary — everything the Plan & Billing tab and the
// dashboard expiry banner need, read locally (this data lives in HostPanel's
// own DB — MasterPanel writes it directly, see planPaymentControllers.js).
export const getPlanBillingSummary = async (req, res, next) => {
  try {
    const workspace = await resolveCurrentWorkspace(req);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }

    // Modules that would be (or were) lost on a downgrade to Basic — same
    // "plan default set minus Basic's default set" MasterPanel's
    // reminder/downgrade cron jobs compute, so the banner and the emails
    // always agree.
    const planIds = new Set(getDefaultEnabledModuleIdsForPlan(workspace.selectedPlan));
    const basicIds = new Set(getDefaultEnabledModuleIdsForPlan("basic"));
    const modulesLostOnDowngrade: string[] = [];
    for (const id of planIds) {
      if (basicIds.has(id)) continue;
      modulesLostOnDowngrade.push(MODULE_LABEL_BY_ID[id] || id);
    }

    // Paid add-ons belong only to Custom plans. enabledModuleIds (the raw
    // field) can contain ad-hoc operational grants for every tier that
    // aren't really "included in your plan", so it must not drive billing
    // labels wholesale — but vertical modules (Cafe Management, Co-working
    // Management, etc.) genuinely ARE part of what this plan unlocks for
    // this workspace's business type, same as MasterPanel's
    // getDefaultEnabledModuleIdsForWorkspace computes when actually
    // granting access, so they belong here too.
    const isCustomPlan = String(workspace.selectedPlan || "").trim().toLowerCase() === "custom";
    const customAddonIds = new Set(
      isCustomPlan && Array.isArray(workspace.customPlanModuleIds)
        ? workspace.customPlanModuleIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [],
    );
    const verticalIds = new Set(
      String(workspace.selectedPlan || "").trim().toLowerCase() === "basic"
        ? []
        : getVerticalModuleIds(getWorkspaceVerticalKeys(workspace.businessTypes)),
    );
    const effectiveIds = new Set([...planIds, ...verticalIds, ...customAddonIds]);
    const isBasicPlan = String(workspace.selectedPlan || "").trim().toLowerCase() === "basic";
    const includedModules = Array.from(effectiveIds)
      .flatMap((id) => {
        let section = MODULE_SECTION_BY_ID[id] || "Other";
        // "website-review" shares its id between the Key Apps entry and the
        // Tech Department tab of the same name, and MODULE_SECTION_BY_ID
        // resolves the later-walked one (Tech Department) since Key Apps has
        // no matching entry to protect it, unlike its website-builder/
        // website-leads siblings. Basic has this module (BASIC_DEFAULT_IDS)
        // but no Tech Department at all, so don't label it with a department
        // this plan doesn't have — group it with Key Apps instead, same as
        // its siblings.
        if (isBasicPlan && id === "website-review" && section === "Tech Department") {
          section = "Key Apps";
        }
        // tenant-companies-sales is a flat Professional-plan default (not
        // vertical-gated, unlike tenant-companies-admin) with no department
        // tab of its own in the catalog, so MODULE_SECTION_BY_ID's walk
        // never gets a chance to correct it past whatever the generic
        // "Add-ons" list assigned it — it belongs in Sales Department.
        if (id === "tenant-companies-sales") section = "Sales Department";
        const source = customAddonIds.has(id) && !planIds.has(id) ? "addon" : "plan";
        const entries = [{ id, label: MODULE_LABEL_BY_ID[id] || id, section, source }];
        // website-leads is the access-grant id for TWO genuinely separate
        // pages — Key Apps' "All Leads" (what MODULE_SECTION_BY_ID resolves
        // to by design) and Tech Department's own "Website Leads" tab —
        // which only exists for a non-Basic plan. One flat id can only
        // resolve to one section above, so add the Tech Department entry
        // explicitly rather than losing it, matching what the Sidebar
        // actually shows in both places.
        if (id === "website-leads" && !isBasicPlan) {
          entries.push({ id, label: "Website Leads", section: "Tech Department", source });
        }
        return entries;
      })
      .sort((a, b) => sectionOrderIndex(a.section) - sectionOrderIndex(b.section) || a.label.localeCompare(b.label));

    // hasUsedTrial/isTrialing drive the Add Modules upgrade modal's "Start
    // Free Trial" CTA (hide it once used, or once this workspace is already
    // trialing) — read from the shared hostleadcompanies collection
    // MasterPanel's start-trial endpoint writes to.
    const leadCompany = await HostLeadCompany.findOne({ companyId: workspace.companyId }).lean();

    return res.status(200).json({
      data: {
        selectedPlan: workspace.selectedPlan,
        purchasedPlan: workspace.purchasedPlan,
        planStatus: workspace.planStatus,
        planStartDate: workspace.planStartDate,
        planExpiryDate: workspace.planExpiryDate,
        planLastPaidAt: workspace.planLastPaidAt,
        customPlanModuleIds: workspace.customPlanModuleIds || [],
        customPlanMonthlyPriceUsd: workspace.customPlanMonthlyPriceUsd,
        companyId: workspace.companyId,
        modulesLostOnDowngrade,
        includedModules,
        isTrialing: Boolean(workspace.isTrialing),
        hasUsedTrial: Boolean(leadCompany?.hasUsedTrial),
        trialEndAt: leadCompany?.trialEndAt || null,
        // Only a company that started its trial through the card-backed
        // startTrialCheckout flow has a Stripe customer — the billing
        // portal (manage card / cancel) only works for those.
        hasBillingPortal: Boolean(leadCompany?.stripeCustomerId),
        // Stripe's real subscription lifecycle state ("trialing", "active",
        // "past_due", "canceling", "canceled") — lets the trial banner say
        // the right thing once a cancellation is scheduled instead of
        // always claiming the card will auto-charge.
        subscriptionStatus: leadCompany?.subscriptionStatus || "",
        // A staff-granted extra trial window for THIS company specifically
        // (Plan Pricing > trial companies, MasterPanel) — drives the
        // dashboard's BonusTrialOfferNotice banner. Only meaningful while
        // active is true and claimedAt is unset.
        bonusTrialOffer: {
          active: Boolean(leadCompany?.bonusTrialOffer?.active),
          durationDays: leadCompany?.bonusTrialOffer?.durationDays ?? null,
          claimedAt: leadCompany?.bonusTrialOffer?.claimedAt || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/plan-billing/professional-price — proxies MasterPanel's own
// public price endpoint (no service key needed, it's unauthenticated on
// that side too) so the workspace-setup pricing cards
// (WorkspaceSetup/workspaceSetupPlans.ts) show the live Professional price
// set on MasterPanel's Plan Pricing settings page, same as Nomads'
// AiHostPricing card. Serves both cycles: professionalAnnualPlanPriceUsd is
// the discounted per-month-equivalent rate charged × 12 upfront for yearly
// billing. Falls back to null on failure — the client keeps its static
// "$199 /month" copy in that case rather than showing an error.
export const getProfessionalPlanPrice = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${MASTER_PANEL_BASE_URL}/api/public/plan-pricing`, {
      timeout: 5000,
    });
    return res.status(200).json({
      professionalPlanPriceUsd: data?.professionalPlanPriceUsd ?? null,
      professionalAnnualPlanPriceUsd: data?.professionalAnnualPlanPriceUsd ?? null,
      basicPlanPriceUsd: data?.basicPlanPriceUsd ?? null,
      basicPlanAnnualPriceUsd: data?.basicPlanAnnualPriceUsd ?? null,
      freeTrialEnabled: Boolean(data?.freeTrialEnabled),
      freeTrialDurationDays: data?.freeTrialDurationDays ?? null,
    });
  } catch (error) {
    return res.status(200).json({
      professionalPlanPriceUsd: null,
      professionalAnnualPlanPriceUsd: null,
      basicPlanPriceUsd: null,
      basicPlanAnnualPriceUsd: null,
      freeTrialEnabled: false,
      freeTrialDurationDays: null,
    });
  }
};

// POST /api/plan-billing/start-trial — self-serve, no staff review (there's
// no payment involved). Resolves the caller's own workspace/companyId the
// same way getPlanBillingInvoices does, then proxies to MasterPanel's
// start-trial endpoint, which is the source of truth for eligibility
// (freeTrialEnabled + hasUsedTrial) and for actually applying the trial to
// every workspace under the company.
export const startTrial = async (req, res, next) => {
  try {
    const workspace = await resolveCurrentWorkspace(req);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const { data } = await axios.patch(
      `${MASTER_PANEL_BASE_URL}/api/hosts/start-trial`,
      { companyId: workspace.companyId, companyName: workspace.businessName },
      { headers: masterPanelHeaders() },
    );
    return res.status(200).json(data);
  } catch (error) {
    if (error?.response) {
      return res.status(error.response.status || 502).json(error.response.data);
    }
    next(error);
  }
};

// POST /api/plan-billing/claim-bonus-trial — self-serve, mirrors startTrial
// above but for a staff-granted extra trial window specific to this company
// (see bonusTrialOffer on getPlanBillingSummary). MasterPanel's endpoint is
// the source of truth for eligibility (bonusTrialOffer.active + not already
// claimed) and applies the extension to every workspace under the company.
export const claimBonusTrial = async (req, res, next) => {
  try {
    const workspace = await resolveCurrentWorkspace(req);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const { data } = await axios.patch(
      `${MASTER_PANEL_BASE_URL}/api/hosts/claim-bonus-trial`,
      { companyId: workspace.companyId },
      { headers: masterPanelHeaders() },
    );
    return res.status(200).json(data);
  } catch (error) {
    if (error?.response) {
      return res.status(error.response.status || 502).json(error.response.data);
    }
    next(error);
  }
};

// POST /api/plan-billing/start-trial-checkout — card-backed version of
// startTrial above. Proxies to MasterPanel's start-trial-checkout, which
// creates a Stripe Checkout Session (subscription mode, card captured, $0
// due now, auto-charges when the trial ends) and returns its URL. The
// actual DB flip to an active trial happens later on MasterPanel's
// webhook, once Stripe confirms the session — not here, since the host
// hasn't necessarily finished entering their card yet when this returns.
export const startTrialCheckout = async (req, res, next) => {
  try {
    const workspace = await resolveCurrentWorkspace(req);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const user = await HostUser.findById(req.user);
    if (!user?.email) {
      return res.status(400).json({ message: "Your account has no email on file." });
    }
    const { data } = await axios.patch(
      `${MASTER_PANEL_BASE_URL}/api/hosts/start-trial-checkout`,
      {
        companyId: workspace.companyId,
        companyName: workspace.businessName,
        email: user.email,
        name: user.name,
      },
      { headers: masterPanelHeaders() },
    );
    return res.status(200).json(data);
  } catch (error) {
    if (error?.response) {
      return res.status(error.response.status || 502).json(error.response.data);
    }
    next(error);
  }
};

// POST /api/plan-billing/billing-portal — Stripe's own hosted page for
// managing a card-backed subscription (update card, cancel). Only works
// for a company that started its trial through startTrialCheckout above
// (has a stripeCustomerId on MasterPanel's side) — the old no-card
// startTrial flow has nothing for this to manage.
export const createBillingPortalSession = async (req, res, next) => {
  try {
    const workspace = await resolveCurrentWorkspace(req);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const { data } = await axios.post(
      `${MASTER_PANEL_BASE_URL}/api/hosts/billing-portal`,
      { companyId: workspace.companyId },
      { headers: masterPanelHeaders() },
    );
    return res.status(200).json(data);
  } catch (error) {
    if (error?.response) {
      return res.status(error.response.status || 502).json(error.response.data);
    }
    next(error);
  }
};

// GET /api/plan-billing/invoices — proxies to MasterPanel, which owns
// Stripe end-to-end (same convention verifyBusinessControllers.ts uses for
// verification-badge invoices).
export const getPlanBillingInvoices = async (req, res, next) => {
  try {
    const workspace = await resolveCurrentWorkspace(req);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found for this user." });
    }
    const { data } = await axios.get(
      `${MASTER_PANEL_BASE_URL}/api/hostpanel/plan/${encodeURIComponent(workspace.companyId)}/invoices`,
      { headers: masterPanelHeaders() },
    );
    return res.status(200).json(data);
  } catch (error) {
    if (error?.response) {
      return res.status(error.response.status || 502).json(error.response.data);
    }
    next(error);
  }
};
