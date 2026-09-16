import type { ComponentType } from "react";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { resolveSyncDashboardVariant } from "./dashboardVariant";
import type { DeptSlug } from "@/lib/departmentSlug";
import CompanySettingsDashboard from "./FrontendDashboard/CompanySettingsDashboard";
import EmployeeDashboardOverview from "./EmployeeDashboardOverview";
import AdminDashboardOverview from "./AdminDashboardOverview";
import HRDashboardOverview from "../HR/HRDashboardOverview";
import AdministrationDashboardOverview from "../Administration/AdministrationDashboardOverview";
import SalesDashboardOverview from "../Sales/SalesDashboardOverview";
import FinanceDashboardOverview from "../Finance/FinanceDashboardOverview";
import MaintenanceDashboardOverview from "../Maintenance/MaintenanceDashboardOverview";
import TechDashboardOverview from "../Tech/TechDashboardOverview";
import ITDashboardOverview from "../IT/ITDashboardOverview";

const DEPARTMENT_COMPONENT_BY_SLUG: Record<DeptSlug, ComponentType> = {
  hr: HRDashboardOverview,
  administration: AdministrationDashboardOverview,
  sales: SalesDashboardOverview,
  finance: FinanceDashboardOverview,
  maintenance: MaintenanceDashboardOverview,
  tech: TechDashboardOverview,
  it: ITDashboardOverview,
};

/**
 * Renders the department-specific dashboard for the current user.
 *
 * Owners/super_admins always get the workspace-wide plan-tier dashboard
 * (CompanySettingsDashboard) instead of a single department's view, even
 * though canAccess*Dashboard() is permissive for that role band — otherwise
 * every owner would land on whichever department check happens to run first.
 * Department managers/members are routed to their department's rich
 * dashboard when one exists. A plain employee with no department match gets
 * the simple, common EmployeeDashboardOverview. A roleBand "admin" with no
 * department match gets AdminDashboardOverview (admin-branded header +
 * granted-module-driven ModuleAccessDashboard, per their assigned
 * departments). Everyone else (managers without a matched department,
 * including custom departments) falls through to CompanySettingsDashboard,
 * which renders the granted-module-driven ModuleAccessDashboard for them.
 */
export function DashboardIndex() {
  const currentUser = useFreshCurrentUser();
  const access = useDashboardAccess();

  const syncVariant = resolveSyncDashboardVariant(currentUser);

  if (syncVariant === "founder") {
    return <CompanySettingsDashboard />;
  }
  if (syncVariant) {
    const Component = DEPARTMENT_COMPONENT_BY_SLUG[syncVariant];
    return <Component />;
  }

  if (access.isLoading) {
    return <DashboardSkeleton />;
  }

  if (access.roleBand === "employee") {
    return <EmployeeDashboardOverview />;
  }

  if (access.roleBand === "admin") {
    return <AdminDashboardOverview />;
  }

  return <CompanySettingsDashboard />;
}

export default DashboardIndex;
