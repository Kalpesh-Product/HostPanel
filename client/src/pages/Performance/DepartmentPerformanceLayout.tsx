import { useSelector } from "react-redux";
import TabLayout from "../../components/Tabs/TabLayout";
import { PERMISSIONS } from "./../../constants/permissions";

const DepartmentPerformanceLayout = () => {
  const departmentName = useSelector(
    (state: any) => state.performance.selectedDepartmentName,
  );

  const tabs = [
    {
      label: "Daily KRA",
      path: "daily-KRA",
      permission: PERMISSIONS.PERFORMANCE_DAILY_KRA.value,
    },
    {
      label: "Monthly KPA",
      path: "monthly-KPA",
      permission: PERMISSIONS.PERFORMANCE_MONTHLY_KPA.value,
    },
  ];

  return (
    <TabLayout
      basePath={`/app/performance/${departmentName}`}
      defaultTabPath="daily-KRA"
      tabs={tabs}
      hideTabsCondition={(pathname) => pathname.includes("vendor/")}
    />
  );
};

export default DepartmentPerformanceLayout;