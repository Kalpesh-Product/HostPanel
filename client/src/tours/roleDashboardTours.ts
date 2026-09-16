import type { BasicPageTour } from "./basicPageTours";
import type { DashboardVariant } from "../pages/Dashboard/dashboardVariant";
import { adminDashboardTour } from "./roleDashboards/adminDashboardTour";
import { employeeDashboardTour } from "./roleDashboards/employeeDashboardTour";
import { hrDashboardTour } from "./roleDashboards/hrDashboardTour";
import { administrationDashboardTour } from "./roleDashboards/administrationDashboardTour";
import { salesDashboardTour } from "./roleDashboards/salesDashboardTour";
import { financeDashboardTour } from "./roleDashboards/financeDashboardTour";
import { maintenanceDashboardTour } from "./roleDashboards/maintenanceDashboardTour";
import { techDashboardTour } from "./roleDashboards/techDashboardTour";
import { itDashboardTour } from "./roleDashboards/itDashboardTour";

// Keyed by dashboard variant rather than pathname — every variant renders at
// the same /dashboard URL, so usePageTour resolves the variant first (see
// dashboardVariant.ts) and looks the tour up here instead of matching on path.
const ROLE_DASHBOARD_TOURS: Partial<Record<DashboardVariant, BasicPageTour>> = {
  admin: adminDashboardTour,
  employee: employeeDashboardTour,
  hr: hrDashboardTour,
  administration: administrationDashboardTour,
  sales: salesDashboardTour,
  finance: financeDashboardTour,
  maintenance: maintenanceDashboardTour,
  tech: techDashboardTour,
  it: itDashboardTour,
};

export const getRoleDashboardTour = (variant: DashboardVariant): BasicPageTour | null =>
  ROLE_DASHBOARD_TOURS[variant] ?? null;
