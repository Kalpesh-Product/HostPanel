import TabLayout from "../../../../components/Tabs/TabLayout";

const WebsitesLayout = () => {
  const tabs = [
    {
      label: "Active",
      path: "active",
    },
    {
      label: "InActive",
      path: "inactive",
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