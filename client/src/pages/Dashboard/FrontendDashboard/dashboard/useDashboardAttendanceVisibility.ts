import useDashboardAccess from "../../../../hooks/useDashboardAccess";

export const useShouldShowDashboardAttendance = () => {
  const access = useDashboardAccess();
  return (
    (access.roleBand === "manager" && access.hasModule("attendance")) ||
    (access.roleBand === "admin" && access.hasModule("attendance")) ||
    (access.roleBand === "employee" && access.plan === "custom" && access.hasModule("attendance"))
  );
};