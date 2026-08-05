import type { ComponentType } from "react";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import {
  canAccessHRDashboard,
  canAccessAdministrationDashboard,
  canAccessSalesDashboard,
  canAccessFinanceDashboard,
  canAccessMaintenanceDashboard,
  canAccessTechDashboard,
  canAccessITDashboard,
} from "@/lib/auth-session";
import CompanySettingsDashboard from "./FrontendDashboard/CompanySettingsDashboard";
import EmployeeDashboardOverview from "./EmployeeDashboardOverview";
import HRDashboardOverview from "../HR/HRDashboardOverview";
import AdministrationDashboardOverview from "../Administration/AdministrationDashboardOverview";
import SalesDashboardOverview from "../Sales/SalesDashboardOverview";
import FinanceDashboardOverview from "../Finance/FinanceDashboardOverview";
import MaintenanceDashboardOverview from "../Maintenance/MaintenanceDashboardOverview";
import TechDashboardOverview from "../Tech/TechDashboardOverview";
import ITDashboardOverview from "../IT/ITDashboardOverview";

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function toDepartmentName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    return String((value as { name?: unknown }).name || "");
  }
  return "";
}

function getRoleBand(user: unknown): string {
  const role = String(
    (user as { workspaceMembership?: { role?: string }; role?: string } | null)?.workspaceMembership?.role ||
      (user as { role?: string } | null)?.role ||
      "",
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return role;
}

const DEPARTMENT_ROUTES: {
  matches: (department: string) => boolean;
  canAccess: (user: unknown) => boolean;
  Component: ComponentType;
}[] = [
  {
    matches: (department) => department === "hr" || department.startsWith("hr"),
    canAccess: canAccessHRDashboard,
    Component: HRDashboardOverview,
  },
  {
    matches: (department) => department === "administration" || department.startsWith("administration"),
    canAccess: canAccessAdministrationDashboard,
    Component: AdministrationDashboardOverview,
  },
  {
    matches: (department) => department === "sales" || department.startsWith("sales"),
    canAccess: canAccessSalesDashboard,
    Component: SalesDashboardOverview,
  },
  {
    matches: (department) => department === "finance" || department.startsWith("finance"),
    canAccess: canAccessFinanceDashboard,
    Component: FinanceDashboardOverview,
  },
  {
    matches: (department) => department === "maintenance" || department.startsWith("maintenance"),
    canAccess: canAccessMaintenanceDashboard,
    Component: MaintenanceDashboardOverview,
  },
  {
    matches: (department) => department === "tech" || department.startsWith("tech") || department === "technology" || department.startsWith("technology"),
    canAccess: canAccessTechDashboard,
    Component: TechDashboardOverview,
  },
  {
    matches: (department) => department === "it" || department.startsWith("it"),
    canAccess: canAccessITDashboard,
    Component: ITDashboardOverview,
  },
];

/**
 * Renders the department-specific dashboard for the current user.
 *
 * Owners/super_admins always get the workspace-wide plan-tier dashboard
 * (CompanySettingsDashboard) instead of a single department's view, even
 * though canAccess*Dashboard() is permissive for that role band — otherwise
 * every owner would land on whichever department check happens to run first.
 * Department managers/members are routed to their department's rich
 * dashboard when one exists. A plain employee with no department match gets
 * the simple, common EmployeeDashboardOverview. Everyone else (admins/
 * managers without a matched department, including custom departments)
 * falls through to CompanySettingsDashboard, which renders the
 * granted-module-driven ModuleAccessDashboard for them.
 */
export function DashboardIndex() {
  const currentUser = useFreshCurrentUser();
  const access = useDashboardAccess();
  const roleBand = getRoleBand(currentUser);
  const isOwnerOrSuperAdmin = roleBand === "owner" || roleBand === "super_admin";

  const departments = [
    currentUser?.workspaceMembership?.department,
    ...(Array.isArray(currentUser?.workspaceMembership?.departments) ? currentUser.workspaceMembership.departments.map(toDepartmentName) : []),
    currentUser?.department,
    ...(Array.isArray(currentUser?.departments) ? currentUser.departments.map(toDepartmentName) : []),
    currentUser?.workspace?.department,
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (!isOwnerOrSuperAdmin) {
    const matchedRoute = DEPARTMENT_ROUTES.find(
      (route) => route.canAccess(currentUser) || departments.some((department) => route.matches(department)),
    );

    if (matchedRoute) {
      const { Component } = matchedRoute;
      return <Component />;
    }

    if (access.isLoading) {
      return <DashboardSkeleton />;
    }

    if (access.roleBand === "employee") {
      return <EmployeeDashboardOverview />;
    }
  }

  return <CompanySettingsDashboard />;
}

export default DashboardIndex;
