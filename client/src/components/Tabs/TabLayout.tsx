import { useEffect, useMemo } from "react";
import { Tabs } from "@mui/material";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useIsMobile from "../../hooks/useIsMobile";
import useAuth from "../../hooks/useAuth";

interface TabItem {
  label: string;
  path: string;
  permission?: string;
}

interface TabLayoutProps {
  basePath: string;
  tabs?: TabItem[];
  defaultTabPath?: string;
  hideTabsCondition?: (pathname: string) => boolean;
  hideTabsOnPaths?: string[];
  scrollable?: boolean;
}

const TabLayout = ({
  basePath,
  tabs = [],
  defaultTabPath,
  hideTabsCondition = () => false,
  hideTabsOnPaths = [],
  scrollable,
}: TabLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { auth } = useAuth();

  const rawPermissions = (auth?.user as any)?.permissions?.permissions;
  const userPermissions = useMemo(() => rawPermissions || [], [rawPermissions]);

  const filteredTabs = useMemo(
    () =>
      tabs.filter(
        (tab) => !tab.permission || userPermissions.includes(tab.permission),
      ),
    [tabs, userPermissions],
  );

  useEffect(() => {
    if (
      location.pathname === basePath &&
      defaultTabPath &&
      filteredTabs.length > 0
    ) {
      navigate(`${basePath}/${filteredTabs[0].path}`, { replace: true });
    }
  }, [location.pathname, navigate, basePath, defaultTabPath, filteredTabs]);

  const activeTab = filteredTabs.findIndex((tab) =>
    location.pathname.includes(tab.path),
  );
  const tabPercent = filteredTabs.length > 0 ? 100 / filteredTabs.length : 100;

  const showTabs =
    !hideTabsCondition(location.pathname) &&
    !hideTabsOnPaths.some((path) => location.pathname.includes(path));

  return (
    <div className="p-4">
      {showTabs && (
        <Tabs
          value={activeTab}
          variant={scrollable || isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : false}
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            backgroundColor: "white",
            borderRadius: 2,
            border: "1px solid #d1d5db",
            overflowX: isMobile ? "auto" : "hidden",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: "medium",
              padding: "12px 16px",
              borderRight: "0.1px solid #d1d5db",
              minWidth: isMobile ? "fit-content" : "auto",
            },
            "& .Mui-selected": {
              backgroundColor: "#1E3D73",
              color: "white",
            },
          }}
        >
          {filteredTabs.map((tab, index) => (
            <NavLink
              key={`${tab.path}-${index}`}
              className="border-r-[1px] border-borderGray"
              to={`${basePath}/${tab.path}`}
              style={({ isActive }) => ({
                textDecoration: "none",
                color: isActive ? "white" : "#1E3D73",
                textAlign: "center",
                padding: "12px 16px",
                display: "block",
                backgroundColor: isActive ? "#1E3D73" : "white",
                minWidth: isMobile ? "70%" : `${tabPercent}%`,
              })}
            >
              {tab.label}
            </NavLink>
          ))}
        </Tabs>
      )}

      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
};

export default TabLayout;
