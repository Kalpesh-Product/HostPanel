import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { UsersRound } from "lucide-react";
import PageFrame from "@/components/Pages/PageFrame";
import { TeamManagementSkeleton } from "@/components/ui/Skeleton";
import useManagedDepartment from "@/hooks/useManagedDepartment";
import useDashboardAccess from "@/hooks/useDashboardAccess";

type TeamManagementPageProps = {
  title: string;
  description: string;
  requiresCustomPlan?: boolean;
};

const TeamManagementPage = ({ title, description, requiresCustomPlan = false }: TeamManagementPageProps) => {
  const navigate = useNavigate();
  const { isLoading, isManager, isOwnerOrSuperAdmin, managedDepartment } = useManagedDepartment();
  const { plan, roleBand } = useDashboardAccess();
  const isAdmin = roleBand === "admin";
  const isCustomPlan = String(plan || "basic").trim().toLowerCase() === "custom";

  useEffect(() => {
    if (requiresCustomPlan && !isCustomPlan) {
      navigate("/extra-common-modules/team-management", { replace: true });
    }
  }, [isCustomPlan, navigate, requiresCustomPlan]);

  if (isLoading) {
    return <div className="min-h-full p-2 lg:p-2.5"><PageFrame><TeamManagementSkeleton /></PageFrame></div>;
  }

  if (!isManager && !isOwnerOrSuperAdmin && !isAdmin) {
    return (
      <div className="min-h-full p-2 lg:p-2.5">
        <PageFrame>
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <UsersRound className="text-slate-300" size={28} />
            <p className="text-[12px] font-pmedium text-slate-500">
              Team Management is available to founders, super admins, admins, and department managers with access.
            </p>
          </div>
        </PageFrame>
      </div>
    );
  }

  if (isManager && !managedDepartment) {
    return (
      <div className="min-h-full p-2 lg:p-2.5">
        <PageFrame>
          <div className="flex flex-col items-center gap-2 py-16 text-center">
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
    <div className="min-h-full p-2 font-sans text-[12px] text-[#0F172A] lg:p-2.5">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-title flex items-center gap-1.5 font-pmedium uppercase text-primary">{title}</h2>
            <p className="mt-1 text-xs font-pmedium text-slate-500">
              {description}{isManager && managedDepartment?.name ? ` — ${managedDepartment.name}` : ""}
            </p>
          </div>
          <Outlet />
        </div>
      </PageFrame>
    </div>
  );
};

export default TeamManagementPage;
