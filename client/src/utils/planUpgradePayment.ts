// Shared by every "Upgrade to Professional" entry point (ModuleCardsLanding,
// AddModulesPage, CreditsIndicator, Sidebar, CompanyProfile) so they all pay
// through the same real Stripe flow Master Panel already uses for plan
// renewals (PlanBillingTab's handleRenewSubmit), instead of each duplicating
// the call. "Custom" plan stays on the separate staff-reviewed request flow.
const MASTER_PANEL_BASE_URL =
  String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() || "https://masterpanel.wono.co";

export async function payForProfessionalUpgrade(
  axiosPrivate: { post: (url: string, body: unknown) => Promise<any> },
  companyId: string,
  billingCycle: "monthly" | "annual",
): Promise<string> {
  const response = await axiosPrivate.post(`${MASTER_PANEL_BASE_URL}/api/hosts/plan-payments/send`, {
    companyId,
    plan: "professional",
    billingCycle,
  });
  const paymentLinkUrl = response?.data?.paymentLinkUrl;
  if (!paymentLinkUrl) {
    throw new Error("Payment link wasn't returned — please try again.");
  }
  return paymentLinkUrl;
}
