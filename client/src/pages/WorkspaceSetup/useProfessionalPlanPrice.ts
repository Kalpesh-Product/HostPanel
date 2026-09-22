import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { PLAN_UI_DATA, type PlanCardData } from "./workspaceSetupPlans";

// Live Professional plan price from MasterPanel's Plan Pricing settings —
// same source AiHostPricing.jsx (Nomads) reads, kept in sync so a change
// staff make there shows up here too instead of the static "$199 /month"
// baked into workspaceSetupPlans.ts. Falls back to that static copy while
// loading or if the request fails, so setup never blocks on this.
export const useProfessionalPlanPriceLabel = (): string => {
  const axios = useAxiosPrivate();
  const staticLabel =
    PLAN_UI_DATA.find((plan) => plan.key === "professional")?.priceLabel || "$199 /month";

  const { data } = useQuery({
    queryKey: ["professionalPlanPrice"],
    queryFn: async () => {
      const res = await axios.get("/api/plan-billing/professional-price");
      return res?.data?.professionalPlanPriceUsd as number | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return data != null ? `$${data} /month` : staticLabel;
};

// Returns PLAN_UI_DATA with the Professional card's priceLabel replaced by
// the live value — the shape every renderer already expects.
export const usePlanUiDataWithLivePricing = (): PlanCardData[] => {
  const professionalPriceLabel = useProfessionalPlanPriceLabel();
  return PLAN_UI_DATA.map((plan) =>
    plan.key === "professional" ? { ...plan, priceLabel: professionalPriceLabel } : plan,
  );
};
