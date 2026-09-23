// @ts-nocheck
import axios from "axios";
import Workspace from "../models/Workspace.js";
import HostUser from "../models/HostUser.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import {
  getDefaultEnabledModuleIdsForPlan,
  MODULE_LABEL_BY_ID,
  MODULE_SECTION_BY_ID,
} from "../config/workspaceModuleCatalog.js";

const MASTER_PANEL_BASE_URL = String(
  process.env.MASTER_PANEL_BASE_URL || "http://localhost:5007",
).replace(/\/+$/, "");

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

    // Paid add-ons belong only to Custom plans. enabledModuleIds can contain
    // operational grants for every tier, so it must not drive billing labels.
    const isCustomPlan = String(workspace.selectedPlan || "").trim().toLowerCase() === "custom";
    const customAddonIds = new Set(
      isCustomPlan && Array.isArray(workspace.customPlanModuleIds)
        ? workspace.customPlanModuleIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [],
    );
    const effectiveIds = new Set([...planIds, ...customAddonIds]);
    const includedModules = Array.from(effectiveIds)
      .map((id) => ({
        id,
        label: MODULE_LABEL_BY_ID[id] || id,
        section: MODULE_SECTION_BY_ID[id] || "Other",
        source: customAddonIds.has(id) && !planIds.has(id) ? "addon" : "plan",
      }))
      .sort((a, b) => a.section.localeCompare(b.section) || a.label.localeCompare(b.label));

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
// AiHostPricing card. Falls back to null on failure — the client keeps its
// static "$199 /month" copy in that case rather than showing an error.
export const getProfessionalPlanPrice = async (req, res, next) => {
  try {
    const { data } = await axios.get(`${MASTER_PANEL_BASE_URL}/api/public/plan-pricing`, {
      timeout: 5000,
    });
    return res.status(200).json({ professionalPlanPriceUsd: data?.professionalPlanPriceUsd ?? null });
  } catch (error) {
    return res.status(200).json({ professionalPlanPriceUsd: null });
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
