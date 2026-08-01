import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "./useAxiosPrivate";
import useAuth from "./useAuth";
import {
  getEnabledModuleIdsForPlan,
  getWorkspaceCount,
} from "../utils/workspacePlanAccess";

export type PlanType = "basic" | "professional" | "custom";
export type RoleBand = "owner" | "super_admin" | "admin" | "manager" | "employee";

export interface WorkspaceModuleTab {
  id: string;
  label?: string;
  route?: string;
  implemented?: boolean;
  unlockedInWorkspace?: boolean;
}

export interface WorkspaceModuleItem extends WorkspaceModuleTab {
  isGroup?: boolean;
  tabs?: WorkspaceModuleTab[];
}

export interface WorkspaceModuleSection {
  sectionId: string;
  sectionLabel?: string;
  items: WorkspaceModuleItem[];
}

export interface DashboardAccessResult {
  plan: PlanType;
  isLoading: boolean;
  /** True if the given module ID is accessible for this workspace/plan */
  hasModule: (id: string) => boolean;
  enabledModuleIds: Set<string>;
  workspaceName: string;
  /** Normalized role band for the current member — drives which dashboard renders */
  roleBand: RoleBand;
  /** Department names the current member is assigned to / manages */
  departmentNames: string[];
  /** Full department records (id/name/moduleIds) the current member is assigned to / manages */
  departments: { id: string; name: string; moduleIds: string[] }[];
  /** The actual per-member granted module ids (role + department + explicit grants) */
  grantedModuleIds: Set<string>;
  /** The full module catalog tree (sections/items/tabs), for building module-driven UI */
  moduleMap: { sections: WorkspaceModuleSection[] };
}

const normalizeRoleBand = (role: string): RoleBand => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (normalized === "owner" || normalized === "founder") return "owner";
  if (normalized === "super_admin" || normalized === "superadmin") return "super_admin";
  if (normalized === "admin" || normalized === "admin_manager") return "admin";
  if (normalized === "manager") return "manager";
  return "employee";
};

/**
 * Fetches the workspace module-access-map and derives plan + module access.
 * Also fetches organization overview (mirroring Sidebar.tsx's pattern) to
 * resolve the current member's role band + assigned department names, so
 * dashboard components can render per-role/per-department content rather
 * than the same view for everyone.
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

  const { data, isLoading: isModuleMapLoading } = useQuery({
    queryKey: ["workspace-module-access-map", cacheScope],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/workspaces/module-access-map");
      return res?.data?.data ?? res?.data ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ["organization-overview-self", cacheScope],
    queryFn: async () => {
      const res = await axiosPrivate.get("/api/organization/overview");
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

    const grantedModuleIds = new Set<string>(
      Array.isArray(data?.currentMemberGrantedModules)
        ? data.currentMemberGrantedModules.map((id: any) => String(id || "").trim()).filter(Boolean)
        : [],
    );

    const moduleMap = {
      sections: Array.isArray(data?.moduleMap?.sections) ? data.moduleMap.sections : [],
    };

    const teamMembers = Array.isArray(overviewData?.teamMembers) ? overviewData.teamMembers : [];
    const currentUserId = String(
      (auth?.user as { id?: string; _id?: string } | null)?.id ||
        (auth?.user as { id?: string; _id?: string } | null)?._id ||
        "",
    ).trim();
    const currentUserEmail = String(
      (auth?.user as { email?: string } | null)?.email || "",
    )
      .trim()
      .toLowerCase();
    const me = teamMembers.find((member: any) => {
      const memberUserId = String(member?.userId || member?.id || "").trim();
      const memberEmail = String(member?.email || "").trim().toLowerCase();
      return (
        (memberUserId && memberUserId === currentUserId) ||
        (currentUserEmail && memberEmail === currentUserEmail)
      );
    }) || null;

    const rawRole = String(
      me?.role ||
        (auth?.user as { workspaceMembership?: { role?: string }; role?: string } | null)
          ?.workspaceMembership?.role ||
        (auth?.user as { workspaceMembership?: { role?: string }; role?: string } | null)?.role ||
        "",
    );

    const myDepartmentNames = new Set(
      (Array.isArray(me?.departmentNames) ? me.departmentNames : [])
        .map((name: string) => String(name || "").trim().toLowerCase())
        .filter(Boolean),
    );
    const allDepartments = Array.isArray(overviewData?.departments) ? overviewData.departments : [];
    const normalizedRoleBand = normalizeRoleBand(rawRole);
    const canSeeAllDepartments = normalizedRoleBand === "owner" || normalizedRoleBand === "super_admin";
    const departments = allDepartments
      .filter(
        (d: any) =>
          canSeeAllDepartments ||
          myDepartmentNames.has(String(d?.name || "").trim().toLowerCase()),
      )
      .map((d: any) => ({
        id: String(d?.id || d?._id || ""),
        name: String(d?.name || ""),
        moduleIds: Array.isArray(d?.moduleIds) ? d.moduleIds.map((id: any) => String(id || "").trim()).filter(Boolean) : [],
      }));

    return {
      plan,
      isLoading: isModuleMapLoading || isOverviewLoading,
      hasModule: (id: string) => allIds.has(id),
      enabledModuleIds: allIds,
      workspaceName: String(data?.workspaceName || ""),
      roleBand: normalizedRoleBand,
      departmentNames: Array.isArray(me?.departmentNames) ? me.departmentNames : [],
      departments,
      grantedModuleIds,
      moduleMap,
    };
  }, [data, isModuleMapLoading, overviewData, isOverviewLoading, auth?.user]);

  return result;
}
