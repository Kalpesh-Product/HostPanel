import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { getProfileTabItemsForPlan } from "./profileAccess";

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
  const profileTabs = getProfileTabItemsForPlan(readWorkspacePlan());
  const showTabs = location.pathname !== "/profile" && !location.pathname.includes("budget/");
  const activeTabId = profileTabs.find((tab) => location.pathname.includes(tab.id))?.id;

  return (
    <div className="p-4">
      {showTabs && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {profileTabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const baseClass = "flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all text-center";
            if (!tab.unlocked) {
              return (
                <div
                  key={tab.id}
                  title="Locked in basic plan"
                  aria-disabled="true"
                  className={`${baseClass} inline-flex items-center justify-center gap-1.5 cursor-not-allowed border border-dashed border-slate-200 bg-slate-50 text-slate-400 opacity-90`}
                >
                  <Lock size={12} className="shrink-0" />
                  {tab.label}
                </div>
              );
            }

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
