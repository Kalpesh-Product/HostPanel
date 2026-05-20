import { useEffect, useState } from "react";
import { LuHardDriveUpload } from "react-icons/lu";
import { SiGoogleadsense } from "react-icons/si";
import { Loader2 } from "lucide-react";
import Card from "../../../../components/Card";
import PageFrame from "../../../../components/Pages/PageFrame";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

const WebsiteBuilderTypeActions = ({ type = "static" }) => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const [existingWebsite, setExistingWebsite] = useState(null);
  const [isCheckingWebsite, setIsCheckingWebsite] = useState(type !== "static");
  const [workspaceBusinessName, setWorkspaceBusinessName] = useState("");
  const [workspaceBusinessTypes, setWorkspaceBusinessTypes] = useState<string[]>([]);
  const builderBasePath = location.pathname.includes("/company-settings/website-builder")
    ? "/company-settings/website-builder"
    : "/dashboard/website-builder";

  const contextCompanyId = auth?.user?.companyId || "";
  const reduxCompanyId = selectedCompany?.companyId || "";
  const userDataRaw = localStorage.getItem("user");
  const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
  const realCompanyId = userData?.companyId || "";
  const companyId = realCompanyId || reduxCompanyId || contextCompanyId || "";
  const workspaceId =
    selectedCompany?.workspaceId ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceId ||
    "";
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        const res = await axios.get("/api/profile/me");
        const workspace = res?.data?.data?.workspace || {};
        const businessName = String(workspace?.businessName || "").trim();
        const types = Array.isArray(workspace?.businessTypes)
          ? workspace.businessTypes
          : workspace?.businessType
            ? [workspace.businessType]
            : [];
        setWorkspaceBusinessName(businessName);
        setWorkspaceBusinessTypes(types);
      } catch (error) {
        setWorkspaceBusinessName("");
        setWorkspaceBusinessTypes([]);
      }
    };

    fetchWorkspaceData();
  }, [axios, auth?.user?.primaryWorkspace]);

  useEffect(() => {
    const checkExistingWebsite = async () => {
      if (type !== "static") {
        return;
      }
      try {
        setIsCheckingWebsite(true);
        const businessName = String(
          workspaceBusinessName ||
            selectedCompany?.companyName ||
            auth?.user?.companyName ||
            "",
        ).trim();
        if (!businessName) {
          setExistingWebsite(null);
          return;
        }

        const response = await axios.get("/api/editor/get-websites", {
          params: { companyId },
        });
        const websites = Array.isArray(response?.data) ? response.data : [];
        const found = websites.find(
          (website) =>
            String(website?.companyId || "").trim() === String(companyId).trim() ||
            String(website?.companyName || "").trim().toLowerCase() ===
              businessName.toLowerCase(),
        ) || null;
        setExistingWebsite(found);
      } catch (error) {
        setExistingWebsite(null);
      } finally {
        setIsCheckingWebsite(false);
      }
    };

    checkExistingWebsite();
  }, [
    axios,
    companyId,
    auth?.user?.primaryWorkspace,
    auth?.user?.companyName,
    selectedCompany?.companyName,
    workspaceBusinessName,
    type,
  ]);

  const createOrEditTitle = existingWebsite ? "Edit Website" : "Create Website";
  const searchKey = existingWebsite?.searchKey || "";
  const companyName = existingWebsite?.companyName || "";
  const staticVerticalPickerRoute = `${builderBasePath}/static/select-vertical${
    workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""
  }`;
  const createOrEditRoute =
    type === "static"
      ? staticVerticalPickerRoute
      : `${builderBasePath}/${type}/create-website`;
  const leadsRoute = `${builderBasePath}/${type}/leads`;
  const handleCreateOrEditClick = async () => {
    if (type !== "static") {
      navigate(createOrEditRoute);
      return;
    }

    try {
      const response = await axios.get("/api/editor/get-websites", {
        params: { companyId },
      });
      const websites = Array.isArray(response?.data) ? response.data : [];
      const businessName = String(
        workspaceBusinessName ||
          selectedCompany?.companyName ||
          auth?.user?.companyName ||
          "",
      ).trim();
      const found =
        websites.find(
          (website) =>
            String(website?.companyId || "").trim() === String(companyId).trim() ||
            String(website?.companyName || "").trim().toLowerCase() ===
              businessName.toLowerCase(),
        ) || null;
      const resolvedSearchKey = String(found?.searchKey || "").trim();

      if (found && resolvedSearchKey) {
        const existingVertical = String(found?.vertical || "").trim();
        const existingVerticalLabel = String(found?.verticalLabel || "").trim();
        if (existingVertical) {
          localStorage.setItem("selectedVertical", existingVertical);
        }
        if (existingVerticalLabel) {
          localStorage.setItem("selectedVerticalLabel", existingVerticalLabel);
        }
        navigate(`../edit-website/${encodeURIComponent(resolvedSearchKey)}`, {
          state: { searchKey: resolvedSearchKey, companyName: found?.companyName },
        });
        return;
      }
    } catch (error) {
      // fall through to picker flow
    }

    if (workspaceBusinessTypes.length <= 1) {
      const selectedType = workspaceBusinessTypes[0] || "Co-Working";
      const toVerticalMap = {
        "Co-Working": "co-working",
        "Co-Living": "co-living",
        Hostels: "hostel",
        Workation: "workation",
        "Meeting Rooms": "meeting-rooms",
        Cafe: "cafe",
      };
      const selectedVertical = toVerticalMap[selectedType] || "co-working";
      localStorage.setItem("selectedVertical", selectedVertical);
      localStorage.setItem("selectedVerticalLabel", selectedType);
      navigate(`${builderBasePath}/static/create-website`);
      return;
    }

    navigate(staticVerticalPickerRoute);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <h2 className="text-title font-pmedium text-primary uppercase">
            {type === "dynamic" ? "Dynamic Website" : "Static Website"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (isCheckingWebsite) return;
                void handleCreateOrEditClick();
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && !isCheckingWebsite) {
                  event.preventDefault();
                  void handleCreateOrEditClick();
                }
              }}
              className="cursor-pointer"
            >
              {isCheckingWebsite ? (
                <div className="flex h-full min-h-[140px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-md">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking Website...
                  </div>
                </div>
              ) : (
                <Card
                  icon={<LuHardDriveUpload />}
                  title={createOrEditTitle}
                  route={location.pathname}
                />
              )}
            </div>
            <Card icon={<SiGoogleadsense />} title="Leads" route={leadsRoute} />
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WebsiteBuilderTypeActions;
