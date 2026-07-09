import { useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useIsMobile from "../../hooks/useIsMobile";
import useModuleAccessMap from "../../hooks/useModuleAccessMap";
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
  lockUnauthorizedTabs = false,
}: TabLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { grantedModules, isLoading: isLoadingAccess } = useModuleAccessMap();

  const tabsWithAccess = useMemo(
    () =>
      tabs.map((tab) => ({
        ...tab,
        // While the access map is still loading, treat tabs as unlocked so
        // they don't flash locked-then-unlocked on every page load.
        locked: Boolean(tab.permission) && !isLoadingAccess && !grantedModules.has(String(tab.permission)),
      })),
    [tabs, grantedModules, isLoadingAccess],
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

  const tabPercent = filteredTabs.length > 0 ? 100 / filteredTabs.length : 100;

  const showTabs =
    !hideTabsCondition(location.pathname) &&
    !hideTabsOnPaths.some((path) => location.pathname.includes(path));

  return (
    <div className="p-4">
      {showTabs && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {filteredTabs.map((tab, index) =>
            tab.locked ? (
              <span
                key={`${tab.path}-${index}`}
                className="flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all inline-flex items-center justify-center gap-1 text-slate-400 bg-slate-50 cursor-not-allowed"
                title="You don't have permission for this tab."
                style={{
                  minWidth: isMobile ? "70%" : `${tabPercent}%`,
                }}
              >
                <Lock size={12} />
                {tab.label}
              </span>
            ) : (
              <NavLink
                key={`${tab.path}-${index}`}
                to={`${basePath}/${tab.path}`}
                style={({ isActive }) => ({
                  textDecoration: "none",
                  minWidth: isMobile ? "70%" : `${tabPercent}%`,
                })}
                className={({ isActive }) =>
                  `flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all text-center ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ),
          )}
        </div>
      )}

      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
};

export default TabLayout;
