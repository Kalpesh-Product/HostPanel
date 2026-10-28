import DepartmentWorkspaceDashboardPage from "../Dashboard/DepartmentWorkspaceDashboardPage";
import { MaintenanceDashboardWidgets } from "./MaintenanceDashboardOverview";

/** Sidebar workspace dashboard. The existing Maintenance manager dashboard remains unchanged. */
export default function MaintenanceWorkspaceDashboardPage() {
  return (
    <DepartmentWorkspaceDashboardPage
      departmentId="maintenance-department"
      operationalContent={<MaintenanceDashboardWidgets />}
    />
  );
}
