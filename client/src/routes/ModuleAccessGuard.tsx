import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import useDashboardAccess from "../hooks/useDashboardAccess";
import { isModuleLockedForPlan } from "../utils/workspacePlanAccess";
import { getGatedModuleIdForPath } from "../utils/gatedModuleRoutes";
import AccessDeniedPage from "../pages/AccessDeniedPage";

// Central checkpoint for direct-URL access to plan-gated module pages
// (Finance, HR, Sales-CRM, Administration, Maintenance, IT, and the
// Custom-only Extra Common Modules / Core Modules pages). Mounted once
// around MainLayout's <Outlet /> so every route is covered without having
// to wrap each one individually. Tenant-portal routes use a separate access
// model and are skipped entirely.
export default function ModuleAccessGuard({
  isTenantRoute,
  children,
}: {
  isTenantRoute: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const { plan, hasModule, isLoading } = useDashboardAccess();

  if (isTenantRoute) return <>{children}</>;

  const gatedModuleId = getGatedModuleIdForPath(location.pathname);
  if (!gatedModuleId) return <>{children}</>;

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-slate-100 bg-white" />;
  }

  if (!hasModule(gatedModuleId) || isModuleLockedForPlan(plan, gatedModuleId)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
