import { useEffect, useMemo } from "react";
import { Tabs } from "@mui/material";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useIsMobile from "../../hooks/useIsMobile";
import useAuth from "../../hooks/useAuth";
import { Lock } from "lucide-react";

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
  lockUnauthorizedTabs?: boolean;
}

const TabLayout = ({
  basePath,
  tabs = [],
  defaultTabPath,
  hideTabsCondition = () => false,
  hideTabsOnPaths = [],
  scrollable,
  lockUnauthorizedTabs = false,
}: TabLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { auth } = useAuth();

  const rawPermissions = (auth?.user as any)?.permissions?.permissions;
  const userPermissions = useMemo(() => rawPermissions || [], [rawPermissions]);

  const tabsWithAccess = useMemo(
    () =>
      tabs.map((tab) => ({
        ...tab,
        locked: Boolean(tab.permission && !userPermissions.includes(tab.permission)),
      })),
    [tabs, userPermissions],
  );

  const filteredTabs = useMemo(() => {
    if (lockUnauthorizedTabs) return tabsWithAccess;
    return tabsWithAccess.filter((tab) => !tab.locked);
  }, [tabsWithAccess, lockUnauthorizedTabs]);

  useEffect(() => {
    const firstUnlockedTab = filteredTabs.find((tab: any) => !tab.locked);
    if (
      location.pathname === basePath &&
      defaultTabPath &&
      firstUnlockedTab
    ) {
      navigate(`${basePath}/${firstUnlockedTab.path}`, { replace: true });
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
          {filteredTabs.map((tab, index) =>
            tab.locked ? (
              <span
                key={`${tab.path}-${index}`}
                className="border-r-[1px] border-borderGray inline-flex items-center justify-center gap-1 text-slate-400 bg-slate-50 cursor-not-allowed"
                title="You don’t have permission for this tab."
                style={{
                  textAlign: "center",
                  padding: "12px 16px",
                  display: "block",
                  minWidth: isMobile ? "70%" : `${tabPercent}%`,
                }}
              >
                <Lock size={12} />
                {tab.label}
              </span>
            ) : (
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
            ),
          )}
        </Tabs>
      )}

      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
};

export default TabLayout;
