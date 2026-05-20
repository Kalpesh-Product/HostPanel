import { useEffect, useState } from "react";
import { LuHardDriveUpload } from "react-icons/lu";
import { SiGoogleadsense } from "react-icons/si";
import Card from "../../../../components/Card";
import PageFrame from "../../../../components/Pages/PageFrame";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

const WebsiteBuilderTypeActions = ({ type = "static" }) => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const location = useLocation();
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const [existingWebsite, setExistingWebsite] = useState(null);
  const [workspaceBusinessName, setWorkspaceBusinessName] = useState("");
  const builderBasePath = location.pathname.includes("/company-settings/website-builder")
    ? "/company-settings/website-builder"
    : "/dashboard/website-builder";

  const companyId = selectedCompany?.companyId || auth?.user?.companyId || "";
  const companyName =
    selectedCompany?.companyName || auth?.user?.companyName || "";
  const effectiveCompanyName = workspaceBusinessName || companyName;

  const formatCompanyName = (name) =>
    String(name || "")
      .trim()
      .toLowerCase()
      .split("-")[0]
      .replace(/\s+/g, "");

  useEffect(() => {
    const fetchWorkspaceSettings = async () => {
      try {
        const res = await axios.get("/api/workspaces/settings");
        const businessName = String(
          res?.data?.data?.settings?.profile?.businessName || "",
        ).trim();
        setWorkspaceBusinessName(businessName);
      } catch (error) {
        setWorkspaceBusinessName("");
      }
    };

    fetchWorkspaceSettings();
  }, [axios, auth?.user?.primaryWorkspace]);

  useEffect(() => {
    const checkExistingWebsite = async () => {
      try {
        const searchKey = formatCompanyName(effectiveCompanyName);
        if (!searchKey) {
          setExistingWebsite(null);
          return;
        }

        const response = await axios.get(`/api/editor/get-website/${searchKey}`);
        const data = response?.data;
        const found =
          data && !Array.isArray(data) && (data?._id || data?.companyName)
            ? data
            : null;

        if (found && companyId) {
          const foundCompanyId = String(found?.companyId || "").trim();
          if (foundCompanyId && foundCompanyId !== String(companyId).trim()) {
            setExistingWebsite(null);
            return;
          }
        }

        setExistingWebsite(found);
      } catch (error) {
        setExistingWebsite(null);
      }
    };

    checkExistingWebsite();
  }, [axios, companyId, effectiveCompanyName, auth?.user?.primaryWorkspace]);

  const createOrEditTitle = existingWebsite ? "Edit Website" : "Create Website";
  const websiteSlug = existingWebsite?.searchKey || existingWebsite?.companyName || "";
  const createOrEditRoute = existingWebsite
    ? `${builderBasePath}/edit-website/${encodeURIComponent(websiteSlug)}`
    : `${builderBasePath}/${type}/create-website`;
  const leadsRoute = `${builderBasePath}/${type}/leads`;

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <h2 className="text-title font-pmedium text-primary uppercase">
            {type === "dynamic" ? "Dynamic Website" : "Static Website"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={<LuHardDriveUpload />} title={createOrEditTitle} route={createOrEditRoute} />
            <Card icon={<SiGoogleadsense />} title="Leads" route={leadsRoute} />
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WebsiteBuilderTypeActions;
