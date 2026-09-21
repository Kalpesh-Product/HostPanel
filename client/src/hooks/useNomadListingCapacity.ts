import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "./useAxiosPrivate";

export type NomadListingPlan = "basic" | "professional" | "custom";

// Nomads backend the listings are read from. Falls back to the live site when
// VITE_NOMADS_API_URL is unset; set it to the local Nomads backend (e.g.
// http://localhost:3000) to test against a local database. A trailing slash
// or "/api" is tolerated either way.
export const getNomadsApiBase = () =>
  (String(import.meta.env.VITE_NOMADS_API_URL || "").trim() || "https://wono.co")
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

// Basic: 2 product types, 4 listings total. Professional: 3 product types,
// 9 listings total. Listings can be distributed across the allowed product
// types however the host likes (e.g. 3+1, or 3+3+3) — TYPE_LIMITS only gates
// adding a BRAND NEW product type, not adding another location under a type
// that's already in use.
const PLAN_LIMITS: Record<NomadListingPlan, number | null> = {
  basic: 4,
  professional: 9,
  custom: null,
};

const TYPE_LIMITS: Record<NomadListingPlan, number | null> = {
  basic: 2,
  professional: 3,
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

// Shared with the claim modal / listings page so the status is fetched once.
export const EXISTING_COMPANY_CLAIM_QUERY_KEY = ["existing-company-claim-status"];

export const normalizeNomadListingType = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export const getNomadListingLimitMessage = (
  plan: NomadListingPlan,
  limit: number | null,
) =>
  limit === null
    ? ""
    : `${plan === "professional" ? "Professional" : "Basic"} plan allows only ${limit} Nomad listings. Delete one to add another.`;

export const getNomadListingEnabledLimitMessage = (
  plan: NomadListingPlan,
  limit: number | null,
) =>
  limit === null
    ? ""
    : `Disable an active listing to enable this one — the ${plan === "professional" ? "Professional" : "Basic"} plan allows only ${limit} enabled listings at a time.`;

export const getNomadListingTypeLimitMessage = (
  plan: NomadListingPlan,
  typeLimit: number | null,
) =>
  typeLimit === null
    ? ""
    : `${plan === "professional" ? "Professional" : "Basic"} plan allows only ${typeLimit} product types. Add another listing under an existing type, or upgrade your plan.`;

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
          `${getNomadsApiBase()}/api/company/get-listings/${companyId}`,
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

  // A soft-deleted listing frees its plan slot immediately, so it's
  // excluded from every quota/type-usage number below — `listings` itself
  // still includes it (the table needs to render its "Deleted by host" row).
  const nonDeletedListings = listings.filter(
    (listing: { isDeleted?: boolean }) => !listing?.isDeleted,
  );

  const limit = PLAN_LIMITS[plan];
  const used = nonDeletedListings.length;
  const remaining = limit === null ? null : Math.max(limit - used, 0);
  const isAtLimit = limit !== null && used >= limit;
  // The plan limit also caps how many listings can be ENABLED (visible) at
  // once. A company that came over via Transfer can hold more listings than
  // its plan allows — all shown, but only `limit` of them switched on.
  const enabledCount = nonDeletedListings.filter(
    (listing: { isPublic?: boolean }) => Boolean(listing?.isPublic),
  ).length;
  const isAtEnabledLimit = limit !== null && enabledCount >= limit;
  const addedTypes = new Set(
    nonDeletedListings.map((listing: { companyType?: string }) =>
      normalizeNomadListingType(listing?.companyType),
    ).filter(Boolean),
  );

  const typeLimit = TYPE_LIMITS[plan];
  const usedTypes = addedTypes.size;
  const remainingTypes = typeLimit === null ? null : Math.max(typeLimit - usedTypes, 0);
  // Adding another location under a type that's already in use never
  // touches the type limit — it only gates a brand new type.
  const canAddNewType = typeLimit === null || usedTypes < typeLimit;

  return {
    plan,
    limit,
    used,
    remaining,
    isAtLimit,
    enabledCount,
    isAtEnabledLimit,
    listings,
    addedTypes,
    typeLimit,
    usedTypes,
    remainingTypes,
    canAddNewType,
    isPending: isPlanPending || isListingsPending,
    refetchListings,
    limitMessage: getNomadListingLimitMessage(plan, limit),
    enabledLimitMessage: getNomadListingEnabledLimitMessage(plan, limit),
    typeLimitMessage: getNomadListingTypeLimitMessage(plan, typeLimit),
  };
}
