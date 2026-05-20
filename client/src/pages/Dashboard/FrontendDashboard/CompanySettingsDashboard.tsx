import { useEffect, useMemo, useState } from "react";
import PageFrame from "../../../components/Pages/PageFrame";
import useAuth from "../../../hooks/useAuth";
import { useLocation } from "react-router-dom";

const getGreeting = (hours: number) => {
  if (hours < 12) return "Good Morning";
  if (hours < 17) return "Good Afternoon";
  if (hours < 20) return "Good Evening";
  return "Good Night";
};

const CompanySettingsDashboard = () => {
  const { auth } = useAuth();
  const location = useLocation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const founderName = useMemo(() => {
    const user = (auth?.user || {}) as {
      firstName?: string;
      lastName?: string;
      name?: string;
    };
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || user.name || "Founder";
  }, [auth?.user]);

  const greeting = `${getGreeting(now.getHours())}, ${founderName}`;
  const isCompanySettingsPage = location.pathname.startsWith("/company-settings");
  const pageTitle = isCompanySettingsPage ? "Company Settings" : "Dashboard";

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <h2 className="text-title font-pmedium text-primary uppercase">
            {pageTitle}
          </h2>
          <p className="text-subtitle font-pmedium text-gray-700">{greeting}</p>
        </div>
      </PageFrame>
    </div>
  );
};

export default CompanySettingsDashboard;
