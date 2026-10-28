import DepartmentWorkspaceDashboardPage from "../Dashboard/DepartmentWorkspaceDashboardPage";
import { TechDashboardWidgets } from "./TechDashboardOverview";

/** Sidebar workspace dashboard. The existing Tech manager dashboard remains unchanged. */
export default function TechWorkspaceDashboardPage() {
  return (
    <DepartmentWorkspaceDashboardPage
      departmentId="tech-department"
      operationalContent={<TechDashboardWidgets />}
    />
  );
}
