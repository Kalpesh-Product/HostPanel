import DepartmentWorkspaceDashboardPage from "../Dashboard/DepartmentWorkspaceDashboardPage";
import { ITDashboardWidgets } from "./ITDashboardOverview";

/** Sidebar workspace dashboard. The existing IT manager dashboard remains unchanged. */
export default function ITWorkspaceDashboardPage() {
  return (
    <DepartmentWorkspaceDashboardPage
      departmentId="it-department"
      operationalContent={<ITDashboardWidgets />}
    />
  );
}
