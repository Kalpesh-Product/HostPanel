import TabLayout from "../../../components/Tabs/TabLayout";
import { PERMISSIONS } from "../../../constants/permissions";

const TaskReportLayout = () => {
  const tabs = [
    {
      label: "My Task Reports",
      path: "my-task-reports",
      permission: PERMISSIONS.TASKS_MY_TASK_REPORTS.value,
    },
    {
      label: "Assigned Task Reports",
      path: "assigned-task-reports",
      permission: PERMISSIONS.TASKS_ASSIGNED_TASKS_REPORTS.value,
    },
  ];

  return (
    <TabLayout
      basePath="/app/tasks/reports"
      defaultTabPath="my-task-reports"
      tabs={tabs}
      hideTabsCondition={(pathname) => pathname.includes("my-task-reports/")}
    />
  );
};

export default TaskReportLayout;