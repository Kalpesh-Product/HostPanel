import { CgWebsite } from "react-icons/cg";
import { LuWorkflow } from "react-icons/lu";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Card from "../../../../components/Card";
import PageFrame from "../../../../components/Pages/PageFrame";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";

const WebsiteTypeSelector = () => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const [workspacePlan, setWorkspacePlan] = useState("");

  const contextCompanyId = auth?.user?.companyId || "";
  const reduxCompanyId = selectedCompany?.companyId || "";
  const userDataRaw = localStorage.getItem("user");
  const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
  const realCompanyId = userData?.companyId || "";
  const companyId = realCompanyId || reduxCompanyId || contextCompanyId || "";

  useEffect(() => {
    const fetchSubscriptionPlan = async () => {
      if (!companyId) {
        setWorkspacePlan("");
        return;
      }
      try {
        const res = await axios.get(`/api/subscription/${companyId}`);
        setWorkspacePlan(String(res?.data?.plan || "").trim());
      } catch (error) {
        setWorkspacePlan("");
      }
    };

    fetchSubscriptionPlan();
  }, [axios, companyId]);

  const normalizedPlan = workspacePlan.toLowerCase();
  const isDynamicLocked = normalizedPlan === "static-free" || normalizedPlan === "basic";

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <h2 className="text-title font-pmedium text-primary uppercase">
            Website Builder
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={<CgWebsite />} title="Static Website" route="static" />
            {isDynamicLocked ? (
              <div className="group relative cursor-not-allowed">
                <div className="pointer-events-none">
                  <Card icon={<LuWorkflow />} title="Dynamic Website" route="dynamic" />
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/45" />
                <div className="absolute inset-0 hidden items-center justify-center rounded-2xl bg-black/40 text-sm font-semibold text-white group-hover:flex">
                  Available on Professional plan
                </div>
                <Lock size={16} className="absolute right-4 top-4 text-slate-600" />
              </div>
            ) : (
              <Card icon={<LuWorkflow />} title="Dynamic Website" route="dynamic" />
            )}
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WebsiteTypeSelector;
