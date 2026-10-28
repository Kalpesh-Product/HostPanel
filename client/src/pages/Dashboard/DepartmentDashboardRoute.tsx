import { useParams } from "react-router-dom";
import ModuleCardsLanding from "./FrontendDashboard/ModuleCardsLanding";
import SalesWorkspaceDashboardPage from "../Sales/SalesWorkspaceDashboardPage";
import HRWorkspaceDashboardPage from "../HR/HRWorkspaceDashboardPage";
import AdministrationWorkspaceDashboardPage from "../Administration/AdministrationWorkspaceDashboardPage";
import FinanceWorkspaceDashboardPage from "../Finance/FinanceWorkspaceDashboardPage";
import MaintenanceWorkspaceDashboardPage from "../Maintenance/MaintenanceWorkspaceDashboardPage";
import TechWorkspaceDashboardPage from "../Tech/TechWorkspaceDashboardPage";
import ITWorkspaceDashboardPage from "../IT/ITWorkspaceDashboardPage";

const WORKSPACE_DASHBOARD_BY_DEPARTMENT_ID = {
  "hr-department": HRWorkspaceDashboardPage,
  "administration-department": AdministrationWorkspaceDashboardPage,
  "finance-department": FinanceWorkspaceDashboardPage,
  "maintenance-department": MaintenanceWorkspaceDashboardPage,
  "tech-department": TechWorkspaceDashboardPage,
  "it-department": ITWorkspaceDashboardPage,
} as const;

export default function DepartmentDashboardRoute() {
  const { departmentId = "" } = useParams();

  if (departmentId === "sales-department") {
    return <SalesWorkspaceDashboardPage />;
  }

  const Dashboard =
    WORKSPACE_DASHBOARD_BY_DEPARTMENT_ID[
      departmentId as keyof typeof WORKSPACE_DASHBOARD_BY_DEPARTMENT_ID
    ];

  if (Dashboard) {
    return <Dashboard />;
  }

  // Custom departments retain their existing module-card dashboard.
  return <ModuleCardsLanding section="department-accesses" />;
}
