import DepartmentWorkspaceDashboardPage from "../Dashboard/DepartmentWorkspaceDashboardPage";
import { FinanceDashboardWidgets } from "./FinanceDashboardOverview";

/** Sidebar workspace dashboard. The existing Finance manager dashboard remains unchanged. */
export default function FinanceWorkspaceDashboardPage() {
  return (
    <DepartmentWorkspaceDashboardPage
      departmentId="finance-department"
      operationalContent={<FinanceDashboardWidgets />}
    />
  );
}
