import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TabLayout from "../../../../components/Tabs/TabLayout";
import { PERMISSIONS } from "../../../../constants/permissions";

const FrontendFinLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    {
      label: "Budget",
      path: "budget",
      permission: PERMISSIONS.FRONTEND_BUDGET.value,
    },
    {
      label: "Payment Schedule",
      path: "payment-schedule",
      permission: PERMISSIONS.FRONTEND_PAYMENT_SCHEDULE.value,
    },
    {
      label: "Voucher",
      path: "voucher",
      permission: PERMISSIONS.FRONTEND_VOUCHER.value,
    },
  ];

  useEffect(() => {
    if (location.pathname === "/app/dashboard/frontend-dashboard/finance") {
      navigate("/app/dashboard/frontend-dashboard/finance/budget", {
        replace: true,
      });
    }
  }, [location, navigate]);

  return (
    <TabLayout
      basePath="/app/dashboard/frontend-dashboard/finance"
      defaultTabPath="budget"
      tabs={tabs}
      hideTabsCondition={(pathname) => pathname.includes("budget/")}
    />
  );
};

export default FrontendFinLayout;