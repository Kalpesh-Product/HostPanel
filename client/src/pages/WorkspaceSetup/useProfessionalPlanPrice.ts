import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { PLAN_UI_DATA, type PlanCardData } from "./workspaceSetupPlans";

type PlanPricingResponse = {
  professionalPlanPriceUsd: number | null;
  professionalAnnualPlanPriceUsd: number | null;
};

// Live Professional plan price from MasterPanel's Plan Pricing settings —
// same source AiHostPricing.jsx (Nomads) reads, kept in sync so a change
// staff make there shows up here too instead of the static "$199 /month"
// baked into workspaceSetupPlans.ts. Falls back to that static copy while
// loading or if the request fails, so setup never blocks on this.
//
// Pass billingCycle="annual" to show the FULL yearly total
// (e.g. "$1,999 /year · billed annually") — the default
// (no argument / "monthly") keeps the monthly rate, matching previous
// behavior exactly for every existing caller.
export const useProfessionalPlanPriceLabel = (billingCycle?: string): string => {
  const axios = useAxiosPrivate();
  const isAnnual = String(billingCycle || "").toLowerCase() === "annual";
  const staticLabel =
    PLAN_UI_DATA.find((plan) => plan.key === "professional")?.priceLabel || "$199 /month";

  const { data } = useQuery({
    queryKey: ["professionalPlanPrice"],
    queryFn: async () => {
      const res = await axios.get<PlanPricingResponse>(
        "/api/plan-billing/professional-price",
      );
      return res?.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rate = isAnnual
    ? data?.professionalAnnualPlanPriceUsd
    : data?.professionalPlanPriceUsd;

  // 0 / null / undefined all mean "unset or unreachable" — never render them
  // as a real price; keep the static fallback instead.
  if (rate == null || rate <= 0) return staticLabel;
  return isAnnual
    ? `$${Number(rate).toLocaleString("en-US")} /year · billed annually`
    : `$${rate} /month`;
};

// Returns PLAN_UI_DATA with the Professional card's priceLabel replaced by
// the live value — the shape every renderer already expects.
export const usePlanUiDataWithLivePricing = (
  billingCycle?: string,
): PlanCardData[] => {
  const professionalPriceLabel = useProfessionalPlanPriceLabel(billingCycle);
  return PLAN_UI_DATA.map((plan) =>
    plan.key === "professional" ? { ...plan, priceLabel: professionalPriceLabel } : plan,
  );
};
