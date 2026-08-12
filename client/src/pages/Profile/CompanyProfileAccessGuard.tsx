import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { canAccessCompanyProfile } from "./profileAccess";

export default function CompanyProfileAccessGuard({ children }: { children: ReactNode }) {
  const { roleBand, departmentNames, isLoading } = useDashboardAccess();

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-slate-100 bg-white" />;
  }

  if (!canAccessCompanyProfile({ roleBand, departmentNames })) {
    return <Navigate to="/profile/my-profile" replace />;
  }

  return children;
}
