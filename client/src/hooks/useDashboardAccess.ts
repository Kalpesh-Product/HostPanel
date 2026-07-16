import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "./useAxiosPrivate";
import useAuth from "./useAuth";
import {
  getEnabledModuleIdsForPlan,
  getWorkspaceCount,
} from "../utils/workspacePlanAccess";

export type PlanType = "basic" | "professional" | "custom";

export interface DashboardAccessResult {
  plan: PlanType;
  isLoading: boolean;
  /** True if the given module ID is accessible for this workspace/plan */
  hasModule: (id: string) => boolean;
  enabledModuleIds: Set<string>;
}

/**
 * Fetches the workspace module-access-map and derives plan + module access.
 * Used by plan-aware dashboard components.
 */
export default function useDashboardAccess(): DashboardAccessResult {
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const user = auth?.user as any;
  const cacheScope = String(
    user?.workspaceMembership?.workspace ||
      user?.primaryWorkspace ||
      user?.workspaceId ||
      user?._id ||
      user?.id ||
      user?.email ||
      "anonymous",
  );

  const { data, isLoading } = useQuery({
    queryKey: ["workspace-module-access-map", cacheScope],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/workspaces/module-access-map");
      return res?.data?.data ?? res?.data ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo<DashboardAccessResult>(() => {
    const rawPlan = (data?.selectedPlan ?? "basic") as PlanType;
    const plan: PlanType = ["basic", "professional", "custom"].includes(rawPlan)
      ? rawPlan
      : "basic";

    const workspaceCount = getWorkspaceCount(
      (auth?.user as any)?.workspaceCount ?? 1
    );

    // Default IDs from the plan
    const planDefaultIds = getEnabledModuleIdsForPlan(plan, workspaceCount);

    // Extra IDs added per-workspace by admin (custom plan extras)
    const extraIds: string[] = Array.isArray(data?.enabledModuleIds)
      ? data.enabledModuleIds
      : [];

    const allIds = new Set<string>([...planDefaultIds, ...extraIds]);

    return {
      plan,
      isLoading,
      hasModule: (id: string) => allIds.has(id),
      enabledModuleIds: allIds,
    };
  }, [data, isLoading, auth?.user]);

  return result;
}
