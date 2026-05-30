// import { CgWebsite } from "react-icons/cg";
import { LuWorkflow } from "react-icons/lu";
// import { Lock } from "lucide-react";
// import { useEffect, useState } from "react";
// import { useSelector } from "react-redux";
import Card from "../../../../components/Card";
import PageFrame from "../../../../components/Pages/PageFrame";
// import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
// import useAuth from "../../../../hooks/useAuth";

const WebsiteTypeSelector = () => {
  // Dynamic-only mode: keep old static/lock plan logic commented for reference.
  // const axios = useAxiosPrivate();
  // const { auth } = useAuth();
  // const selectedCompany = useSelector((state) => state.company.selectedCompany);
  // const [workspacePlan, setWorkspacePlan] = useState("");
  // const contextCompanyId = auth?.user?.companyId || "";
  // const reduxCompanyId = selectedCompany?.companyId || "";
  // const userDataRaw = localStorage.getItem("user");
  // const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
  // const realCompanyId = userData?.companyId || "";
  // const companyId = realCompanyId || reduxCompanyId || contextCompanyId || "";
  // useEffect(() => { ... }, [axios, companyId]);
  // const normalizedPlan = workspacePlan.toLowerCase();
  // const isDynamicLocked = normalizedPlan === "static-free" || normalizedPlan === "basic";

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <h2 className="text-title font-pmedium text-primary uppercase">
            Website Builder
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* <Card icon={<CgWebsite />} title="Static Website" route="static" /> */}
            <Card icon={<LuWorkflow />} title="Dynamic Website" route="dynamic" />
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WebsiteTypeSelector;
