import { PERMISSIONS } from "../../constants/permissions";
import TabLayout from "../../components/Tabs/TabLayout";

const ManageVisitorLayout = () => {
  const tabs = [
    {
      label: "Internal Visitors",
      path: "internal-visitors",
      permission: PERMISSIONS.VISITORS_MANAGE_INTERNAL_VISITORS.value,
    },
    {
      label: "External Clients",
      path: "external-clients",
      permission: PERMISSIONS.VISITORS_MANAGE_EXTERNAL_CLIENTS.value,
    },
  ];

  return (
    <TabLayout
      basePath="/app/visitors/manage-visitors"
      defaultTabPath="internal-visitors"
      tabs={tabs}
      lockUnauthorizedTabs
      hideTabsCondition={(pathname) => pathname.includes("internal-visitors/")}
    />
  );
};

export default ManageVisitorLayout;
