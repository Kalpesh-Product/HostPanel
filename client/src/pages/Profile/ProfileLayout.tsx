import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getProfileTabItemsForPlan } from "./profileAccess";
import useAuth from "../../hooks/useAuth";
import useDashboardAccess from "../../hooks/useDashboardAccess";

const readWorkspacePlan = (): string => {
  try {
    const raw = localStorage.getItem("workspace_setup");
    if (!raw) return "basic";
    const parsed = JSON.parse(raw) as { selectedPlan?: string };
    return String(parsed?.selectedPlan || "basic");
  } catch {
    return "basic";
  }
};

const ProfileLayout = () => {
  const location = useLocation();
  const { auth } = useAuth();
  const { plan, roleBand, departmentNames, isLoading } = useDashboardAccess();
  const effectivePlan = isLoading ? readWorkspacePlan() : plan;
  const effectiveRole = isLoading
    ? String((auth?.user as any)?.workspaceMembership?.role || (auth?.user as any)?.role || roleBand)
    : roleBand;
  const effectiveDepartments = departmentNames.length > 0
    ? departmentNames
    : ((auth?.user as any)?.departmentNames || []);
  const profileTabs = getProfileTabItemsForPlan(effectivePlan, {
    roleBand: effectiveRole,
    departmentNames: effectiveDepartments,
  });
  const showTabs = location.pathname !== "/profile" && !location.pathname.includes("budget/");
  const activeTabId = profileTabs.find(
    (tab) => location.pathname === tab.route || location.pathname.includes(tab.id),
  )?.id;

  return (
    <div className="p-4">
      {showTabs && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {profileTabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const baseClass = "flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all text-center";
            return (
              <NavLink
                key={tab.id}
                to={tab.route}
                className={`${baseClass} ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      )}

      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
};

export default ProfileLayout;
