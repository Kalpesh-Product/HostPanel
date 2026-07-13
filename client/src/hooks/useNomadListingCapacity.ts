import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "./useAxiosPrivate";

export type NomadListingPlan = "basic" | "professional" | "custom";

const PLAN_LIMITS: Record<NomadListingPlan, number | null> = {
  basic: 2,
  professional: 4,
  custom: null,
};

const normalizePlan = (value: unknown): NomadListingPlan => {
  const plan = String(value || "").trim().toLowerCase();
  if (plan === "professional") return "professional";
  if (["custom", "customise", "customize", "customised", "customized"].includes(plan)) {
    return "custom";
  }
  return "basic";
};

const readStoredPlan = (): NomadListingPlan => {
  try {
    const parsed = JSON.parse(localStorage.getItem("workspace_setup") || "{}");
    return normalizePlan(parsed?.selectedPlan);
  } catch {
    return "basic";
  }
};

export const normalizeNomadListingType = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export const getNomadListingLimitMessage = (
  plan: NomadListingPlan,
  limit: number | null,
) =>
  limit === null
    ? ""
    : `${plan === "professional" ? "Professional" : "Basic"} plan allows only ${limit} Nomad listings. Delete one to add another.`;

export default function useNomadListingCapacity(companyId: string) {
  const axios = useAxiosPrivate();
  const storedPlan = readStoredPlan();

  const { data: plan = storedPlan, isPending: isPlanPending } = useQuery({
    queryKey: ["workspace-plan", companyId],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/workspaces/module-access-map");
        return normalizePlan(response.data?.data?.selectedPlan);
      } catch {
        return storedPlan;
      }
    },
    staleTime: 30_000,
  });

  const {
    data: listings = [],
    isPending: isListingsPending,
    refetch: refetchListings,
  } = useQuery({
    queryKey: ["nomad-listings", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      try {
        const response = await axios.get(
          `https://wononomadsbe.vercel.app/api/company/get-listings/${companyId}`,
          {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
            params: { t: Date.now() },
          },
        );
        return Array.isArray(response.data) ? response.data : [];
      } catch (error: any) {
        if (error?.response?.status === 404) return [];
        throw error;
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const limit = PLAN_LIMITS[plan];
  const used = listings.length;
  const remaining = limit === null ? null : Math.max(limit - used, 0);
  const isAtLimit = limit !== null && used >= limit;
  const addedTypes = new Set(
    listings.map((listing: { companyType?: string }) =>
      normalizeNomadListingType(listing?.companyType),
    ).filter(Boolean),
  );

  return {
    plan,
    limit,
    used,
    remaining,
    isAtLimit,
    listings,
    addedTypes,
    isPending: isPlanPending || isListingsPending,
    refetchListings,
    limitMessage: getNomadListingLimitMessage(plan, limit),
  };
}
