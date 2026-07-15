import { useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "./useAxiosPrivate";

/**
 * Fetches the current member's granted module ids from
 * GET /api/workspaces/module-access-map (the same source OrganizationPage.tsx
 * and Sidebar.tsx already use for plan/role-based access). This is the real
 * grant list — founder/super_admin get every id via the server's
 * getAllModuleIds() bypass, admin/manager get their department's modules,
 * employees get the common baseline, all merged with any explicit grants.
 */
export default function useModuleAccessMap() {
  const axiosPrivate = useAxiosPrivate();
  const [grantedModules, setGrantedModules] = useState<Set<string>>(new Set());
  // The logged-in user object (sessionStorage/auth context) never carries the
  // workspace's plan — buildAuthUserPayload on the server has no `workspace`
  // field at all. This module-access-map response is the one already-used,
  // lightweight endpoint that actually returns `selectedPlan`, so it's the
  // reliable source for plan-gated UI (e.g. department dropdown filtering).
  const [workspacePlan, setWorkspacePlan] = useState<string>("basic");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await axiosPrivate.get("/api/workspaces/module-access-map");
        const ids = Array.isArray(response?.data?.data?.currentMemberGrantedModules)
          ? response.data.data.currentMemberGrantedModules
          : [];
        const rawPlan = String(response?.data?.data?.selectedPlan || "basic").trim().toLowerCase();
        if (isMounted) {
          setGrantedModules(new Set(ids.map((id: any) => String(id || "").trim()).filter(Boolean)));
          setWorkspacePlan(rawPlan === "professional" || rawPlan === "custom" ? rawPlan : "basic");
        }
      } catch (error) {
        if (isMounted) {
          setGrantedModules(new Set());
          setWorkspacePlan("basic");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [axiosPrivate]);

  const hasModuleAccess = useMemo(
    () => (permission?: string) => {
      if (!permission) return true;
      return grantedModules.has(String(permission).trim());
    },
    [grantedModules],
  );

  return { grantedModules, hasModuleAccess, isLoading, workspacePlan };
}
