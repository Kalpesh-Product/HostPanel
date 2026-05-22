import { useEffect, useState } from "react";
import { LuHardDriveUpload } from "react-icons/lu";
import { SiGoogleadsense } from "react-icons/si";
import { Loader2, Lock } from "lucide-react";
import Card from "../../../../components/Card";
import PageFrame from "../../../../components/Pages/PageFrame";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BUSINESS_TYPE_TO_VERTICAL_KEY,
  VERTICAL_KEY_TO_LABEL,
} from "../../../../constants/verticalConfig";

const VERTICAL_ICON_BY_KEY = {
  "co-working": "\u{1F5A5}\uFE0F",
  "co-living": "\u{1F3E0}",
  hostel: "\u{1F6CF}\uFE0F",
  workation: "\u{2708}\uFE0F",
  "meeting-rooms": "\u{1F4C5}",
  cafe: "\u{2615}",
};

const normalizeVerticalKey = (value: unknown) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "co-working";
  const compact = raw.replace(/\s+/g, "");
  const hyphen = raw.replace(/\s+/g, "-");
  const aliasMap: Record<string, string> = {
    coworking: "co-working",
    "co-working": "co-working",
    coliving: "co-living",
    "co-living": "co-living",
    meetingrooms: "meeting-rooms",
    "meeting-rooms": "meeting-rooms",
    hostel: "hostel",
    workation: "workation",
    cafe: "cafe",
  };
  return aliasMap[raw] || aliasMap[compact] || aliasMap[hyphen] || "co-working";
};

const WebsiteBuilderTypeActions = ({ type = "static" }) => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedCompany = useSelector((state: any) => state.company.selectedCompany);
  const [existingWebsite, setExistingWebsite] = useState<any>(null);
  const [isCheckingWebsite, setIsCheckingWebsite] = useState(type !== "static");
  const [workspaceBusinessName, setWorkspaceBusinessName] = useState("");
  const [workspaceBusinessTypes, setWorkspaceBusinessTypes] = useState<string[]>([]);
  const [workspacePlan, setWorkspacePlan] = useState("");
  const builderBasePath = location.pathname.includes("/company-settings/website-builder")
    ? "/company-settings/website-builder"
    : "/dashboard/website-builder";

  const contextCompanyId = auth?.user?.companyId || "";
  const reduxCompanyId = selectedCompany?.companyId || "";
  const userDataRaw = localStorage.getItem("user");
  const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
  const realCompanyId = userData?.companyId || "";
  const companyId = realCompanyId || reduxCompanyId || contextCompanyId || "";
  const selectedVertical = normalizeVerticalKey(localStorage.getItem("selectedVertical"));
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
          params: {
            workspaceId,
            companyId,
            businessName,
          },
        });
        const websites = Array.isArray(response?.data) ? response.data : [];
        const byCompany = (website) =>
          String(website?.companyId || "").trim() === String(companyId).trim() ||
          String(website?.companyName || "").trim().toLowerCase() ===
            businessName.toLowerCase();
        const foundByVertical = websites.find((website) => {
          if (!byCompany(website)) return false;
          const websiteVertical = normalizeVerticalKey(
            website?.vertical || website?.verticalType,
          );
          return websiteVertical === selectedVertical;
        });
        const found = foundByVertical || websites.find(byCompany) || null;
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
    workspaceId,
    selectedVertical,
    type,
  ]);

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
  const normalizedPlan = workspacePlan.toLowerCase();
  const isLockedPlan = normalizedPlan === "static-free" || normalizedPlan === "basic";
  const isProfessionalPlan =
    normalizedPlan === "professional" || (!isLockedPlan && normalizedPlan === "pro");
  const existingVerticalKey = String(existingWebsite?.vertical || "").trim();
  const existingVerticalLabel =
    VERTICAL_KEY_TO_LABEL[existingVerticalKey] ||
    String(existingWebsite?.verticalLabel || "").trim() ||
    String(existingWebsite?.vertical || "").trim() ||
    "Co-Working";
  const existingVerticalIcon = VERTICAL_ICON_BY_KEY[existingVerticalKey] || "\u{1F310}";
  const existingWebsiteUrl =
    String(existingWebsite?.deployedUrl || "").trim() ||
    `${String(existingWebsite?.searchKey || "company")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")}.wono.co`;

  const handleEditWebsiteClick = () => {
    const editSearchKey = String(existingWebsite?.searchKey || "").trim();
    if (!editSearchKey) return;
    const editVertical = String(existingWebsite?.vertical || "").trim();
    localStorage.setItem("selectedVertical", editVertical);
    localStorage.setItem(
      "selectedVerticalLabel",
      VERTICAL_KEY_TO_LABEL[editVertical] || editVertical,
    );
    navigate(
      `../edit-website/${encodeURIComponent(editSearchKey)}?vertical=${encodeURIComponent(editVertical || "co-working")}`,
      {
      state: {
        searchKey: editSearchKey,
        companyName: existingWebsite?.companyName,
        vertical: editVertical || "co-working",
      },
    });
  };

  const handleCreateOrEditClick = async () => {
    if (type !== "static") {
      navigate(createOrEditRoute);
      return;
    }

    try {
      const businessName = String(
        workspaceBusinessName ||
          selectedCompany?.companyName ||
          auth?.user?.companyName ||
          "",
      ).trim();
      const response = await axios.get("/api/editor/get-websites", {
        params: {
          workspaceId,
          companyId,
          businessName,
        },
      });
      const websites = Array.isArray(response?.data) ? response.data : [];
      const byCompany = (website) =>
        String(website?.companyId || "").trim() === String(companyId).trim() ||
        String(website?.companyName || "").trim().toLowerCase() ===
          businessName.toLowerCase();
      const foundByVertical = websites.find((website) => {
        if (!byCompany(website)) return false;
        const websiteVertical = normalizeVerticalKey(
          website?.vertical || website?.verticalType,
        );
        return websiteVertical === selectedVertical;
      });
      const found = foundByVertical || websites.find(byCompany) || null;
      const resolvedSearchKey = String(found?.searchKey || "").trim();

      if (found && resolvedSearchKey) {
        const existingVertical = String(found?.vertical || "").trim();
        const existingVerticalLabel = String(found?.verticalLabel || "").trim();
        const mappedVerticalKey = BUSINESS_TYPE_TO_VERTICAL_KEY[existingVerticalLabel];
        if (mappedVerticalKey || existingVertical) {
          localStorage.setItem(
            "selectedVertical",
            mappedVerticalKey || existingVertical,
          );
        }
        if (existingVerticalLabel) {
          localStorage.setItem("selectedVerticalLabel", existingVerticalLabel);
        }
        const resolvedVertical = normalizeVerticalKey(
          found?.vertical || found?.verticalType,
        );
        navigate(
          `../edit-website/${encodeURIComponent(resolvedSearchKey)}?vertical=${encodeURIComponent(resolvedVertical)}`,
          {
            state: {
              searchKey: resolvedSearchKey,
              companyName: found?.companyName,
              vertical: resolvedVertical,
            },
          },
        );
        return;
      }
    } catch (error) {
      // fall through to picker flow
    }

    if (workspaceBusinessTypes.length <= 1) {
      const selectedType = workspaceBusinessTypes[0] || "Co-Working";
      const selectedVertical =
        BUSINESS_TYPE_TO_VERTICAL_KEY[selectedType] || "co-working";
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
            {isCheckingWebsite ? (
              <div className="flex h-full min-h-[140px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-md">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking Website...
                </div>
              </div>
            ) : existingWebsite ? (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    handleEditWebsiteClick();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleEditWebsiteClick();
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Card
                    icon={<LuHardDriveUpload />}
                    title="Edit Website"
                    route={location.pathname}
                  />
                </div>

                {isProfessionalPlan ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(staticVerticalPickerRoute)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(staticVerticalPickerRoute);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Card
                      icon={<LuHardDriveUpload />}
                      title="Create Another Website"
                      route={location.pathname}
                    />
                  </div>
                ) : (
                  <div className="group relative cursor-not-allowed">
                    <div className="pointer-events-none">
                      <Card
                        icon={<LuHardDriveUpload />}
                        title="Create Another Website"
                        route={location.pathname}
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/45" />
                    <div className="absolute inset-0 hidden items-center justify-center rounded-2xl bg-black/40 text-sm font-semibold text-white group-hover:flex">
                      Upgrade your plan
                    </div>
                    <Lock size={16} className="absolute right-4 top-4 text-slate-600" />
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    void handleCreateOrEditClick();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void handleCreateOrEditClick();
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Card
                    icon={<LuHardDriveUpload />}
                    title={createOrEditTitle}
                    route={location.pathname}
                  />
                </div>
              </>
            )}
            <Card icon={<SiGoogleadsense />} title="Leads" route={leadsRoute} />
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WebsiteBuilderTypeActions;
