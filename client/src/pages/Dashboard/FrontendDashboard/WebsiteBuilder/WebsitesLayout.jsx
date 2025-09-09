import TabLayout from "../../../../components/Tabs/TabLayout";
import { PERMISSIONS } from "../../../../constants/permissions";

const WebsitesLayout = () => {
  // Map routes to tabs
  const tabs = [
    {
      label: "Active",
      path: "active",
      // permission: PERMISSIONS.FINANCE_BUDGET.value,
    },
    {
      label: "InActive",
      path: "inactive",
      // permission: PERMISSIONS.FINANCE_BUDGET.value,
    },
  ];

  return (
    <TabLayout
      tabs={tabs}
      basePath={"/dashboard/company/websites"}
      defaultTabPath={"active"}
      scrollable={true}
      hideTabsOnPaths={["/dashboard/company/websites/active/"]}
    />
  );
};

export default WebsitesLayout;
