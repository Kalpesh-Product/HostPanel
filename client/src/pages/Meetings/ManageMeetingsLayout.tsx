import TabLayout from "../../components/Tabs/TabLayout";
import { PERMISSIONS } from "../../constants/permissions";

const ManageMeetingsLayout = () => {
  const tabs = [
    {
      label: "Internal Meetings",
      path: "internal-meetings",
      permission: PERMISSIONS.MEETINGS_MEETINGS_INTERNAL.value,
    },
    {
      label: "External Clients",
      path: "external-clients",
      permission: PERMISSIONS.MEETINGS_MEETINGS_EXTERNAL.value,
    },
  ];

  return (
    <TabLayout
      basePath="/app/meetings/manage-meetings"
      defaultTabPath="internal-meetings"
      tabs={tabs}
      hideTabsCondition={(pathname) => pathname.includes("internal-meetings/")}
    />
  );
};

export default ManageMeetingsLayout;