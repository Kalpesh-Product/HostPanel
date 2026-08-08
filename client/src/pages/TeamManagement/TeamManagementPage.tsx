import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { UsersRound } from "lucide-react";
import PageFrame from "@/components/Pages/PageFrame";
import useManagedDepartment from "@/hooks/useManagedDepartment";

const TABS = [
  { key: "roster", label: "Access Control" },
  { key: "sops", label: "Department SOP" },
  { key: "policies", label: "Department Policies" },
];

const TeamManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, isManager, isOwnerOrSuperAdmin, managedDepartment } = useManagedDepartment();

  const activeTabKey = TABS.find((tab) => location.pathname.endsWith(`/${tab.key}`))?.key || "roster";

  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full">
        <PageFrame>
          <div className="py-16 text-center text-[12px] font-pmedium text-slate-400">Loading...</div>
        </PageFrame>
      </div>
    );
  }

  if (!isManager && !isOwnerOrSuperAdmin) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full">
        <PageFrame>
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <UsersRound className="text-slate-300" size={28} />
            <p className="text-[12px] font-pmedium text-slate-500">
              Team Management is only available to department managers.
            </p>
          </div>
        </PageFrame>
      </div>
    );
  }

  if (isManager && !managedDepartment) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full">
        <PageFrame>
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <UsersRound className="text-slate-300" size={28} />
            <p className="text-[12px] font-pmedium text-slate-500">
              You are not currently assigned as the manager of a department.
            </p>
          </div>
        </PageFrame>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Team Management
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Manage your team's sidebar access, SOPs, and policies.
                {managedDepartment?.name ? ` — ${managedDepartment.name}` : ""}
              </p>
            </div>
          </div>

          <div className="mb-1 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate(tab.key)}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                  activeTabKey === tab.key
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Outlet />
        </div>
      </PageFrame>
    </div>
  );
};

export default TeamManagementPage;
