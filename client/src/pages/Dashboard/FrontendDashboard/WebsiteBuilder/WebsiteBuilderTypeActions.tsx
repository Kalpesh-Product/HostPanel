import { useEffect, useRef, useState } from "react";
import { LuHardDriveUpload } from "react-icons/lu";
import { SiGoogleadsense } from "react-icons/si";
import { MdOutlineRateReview } from "react-icons/md";
import { MdOutlineWorkHistory } from "react-icons/md";
import { Loader2 } from "lucide-react";
import Card from "../../../../components/Card";
import PageFrame from "../../../../components/Pages/PageFrame";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BUSINESS_TYPE_TO_VERTICAL_KEY,
} from "../../../../constants/verticalConfig";
import { toast } from "sonner";

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

const isSameCompanyTemplate = ({
  website,
  companyId,
  workspaceId,
  businessName,
}: {
  website: any;
  companyId: string;
  workspaceId: string;
  businessName: string;
}) => {
  const websiteCompanyId = String(website?.companyId || "").trim();
  const websiteWorkspaceId = String(website?.workspaceId || "").trim();
  const websiteCompanyName = String(website?.companyName || "")
    .trim()
    .toLowerCase();
  const normalizedBusinessName = String(businessName || "").trim().toLowerCase();

  // Cascade instead of early-return: templates are sometimes stored with a
  // companyId from a different source than the one in the session (e.g. base
  // host-company id vs workspace-suffixed id), so a companyId mismatch must
  // still fall through to the workspace/business-name checks.
  if (companyId && websiteCompanyId === String(companyId).trim()) return true;
  if (workspaceId && websiteWorkspaceId === String(workspaceId).trim()) return true;
  if (normalizedBusinessName && websiteCompanyName === normalizedBusinessName)
    return true;
  return false;
};

const WebsiteBuilderTypeActions = ({ type = "dynamic" }) => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedCompany = useSelector((state: any) => state.company.selectedCompany);
  const [existingWebsite, setExistingWebsite] = useState<any>(null);
  const [isCheckingWebsite, setIsCheckingWebsite] = useState(true);
  const [workspaceBusinessName, setWorkspaceBusinessName] = useState("");
  const [workspaceBusinessTypes, setWorkspaceBusinessTypes] = useState<string[]>([]);
  // Prevents the checkExistingWebsite effect from re-running (and re-showing the spinner)
  // when workspaceBusinessName resolves asynchronously after the first API call already
  // found/didn't find a website.
  const hasCheckedWebsiteRef = useRef(false);
  // const [workspacePlan, setWorkspacePlan] = useState("");
  const builderBasePath = location.pathname.includes("/company-settings/website-builder")
    ? "/company-settings/website-builder"
    : "/dashboard/website-builder";

  const contextCompanyId = String(auth?.user?.companyId || "").trim();
  const reduxCompanyId = String(selectedCompany?.companyId || "").trim();
  // Always prioritize actively selected company context over stale localStorage user payloads.
  const companyId = reduxCompanyId || contextCompanyId || "";
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
      // Dynamic-only mode: keep existing website lookup enabled.
      // Guard: once we've got a result (found or not found), don't re-run when
      // workspaceBusinessName resolves asynchronously and re-triggers this effect.
      if (hasCheckedWebsiteRef.current) return;

      try {
        setIsCheckingWebsite(true);
        const businessName = String(
          selectedCompany?.companyName ||
            workspaceBusinessName ||
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
        const found =
          websites.find((website) =>
            isSameCompanyTemplate({
              website,
              companyId,
              workspaceId,
              businessName,
            }),
          ) || null;

        if (found) {
          hasCheckedWebsiteRef.current = true;
          setExistingWebsite(found);
          return;
        }

        const subscriptionId = companyId || workspaceId;
        if (subscriptionId) {
          try {
            const subscriptionResponse = await axios.get(`/api/subscription/${subscriptionId}`, {
              params: {
                companyId,
                workspaceId,
              },
            });
            const subscription = subscriptionResponse?.data || {};
            const publishedUrl = String(subscription?.publishedProjectUrl || "").trim();
            const publishedSearchKey = publishedUrl
              ? publishedUrl
                  .replace(/^https?:\/\//i, "")
                  .split(".")[0]
                  .trim()
              : "";

            if (
              String(subscription?.publishedProjectId || "").trim() ||
              publishedUrl
            ) {
              hasCheckedWebsiteRef.current = true;
              setExistingWebsite({
                _id: subscription?.publishedProjectId || subscriptionId,
                searchKey: publishedSearchKey || businessName.toLowerCase().replace(/\s+/g, "-"),
                companyId: companyId || undefined,
                workspaceId: workspaceId || undefined,
                companyName: businessName,
                isPublished: true,
                deployedUrl: publishedUrl,
                publishedProjectUrl: publishedUrl,
              });
              return;
            }
          } catch (subscriptionError) {
            // Keep the fallback conservative; no published state if subscription lookup fails.
          }
        }

        hasCheckedWebsiteRef.current = true;
        setExistingWebsite(null);
      } catch (error) {
        hasCheckedWebsiteRef.current = true;
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
    type,
  ]);

  // Dynamic-only mode: plan-lock fetch intentionally disabled.
  // useEffect(() => {
  //   const fetchSubscriptionPlan = async () => {
  //     if (!companyId) {
  //       setWorkspacePlan("");
  //       return;
  //     }
  //     try {
  //       const res = await axios.get(`/api/subscription/${companyId}`);
  //       setWorkspacePlan(String(res?.data?.plan || "").trim());
  //     } catch (error) {
  //       setWorkspacePlan("");
  //     }
  //   };
  //
  //   fetchSubscriptionPlan();
  // }, [axios, companyId]);

  const createOrEditRoute = `${builderBasePath}/dynamic/create-website`;
  const leadsRoute = `${builderBasePath}/dynamic/leads`;
  const reviewsRoute = `${builderBasePath}/dynamic/reviews`;
  const careersRoute = `${builderBasePath}/dynamic/careers`;
  const hasExistingWebsite = Boolean(existingWebsite);
  const hasResumableDraft =
    existingWebsite?.isDraft === true &&
    existingWebsite?.isPublished !== true &&
    Boolean(String(existingWebsite?.searchKey || "").trim());
  const canEditExistingWebsite = hasExistingWebsite || hasResumableDraft;
  const createOrEditLabel = canEditExistingWebsite ? "Edit Website" : "Create Website";
  // const normalizedPlan = workspacePlan.toLowerCase();
  // Dynamic-only mode: keep plan lock logic disabled for now.
  // const isLockedPlan = normalizedPlan === "static-free" || normalizedPlan === "basic";
  // const isProfessionalPlan =
  //   normalizedPlan === "professional" || (!isLockedPlan && normalizedPlan === "pro");
  const handleEditWebsiteClick = () => {
    const targetWebsite = existingWebsite;
    const editSearchKey = String(targetWebsite?.searchKey || "").trim();
    if (!editSearchKey) return;
    // isDraftOnly: has the draft flag but no published state and no saved draftData snapshot
    // (old single-page websites have neither isDraft nor draftData — they should still edit normally)
    const isDraftOnly =
      targetWebsite?.isDraft === true &&
      targetWebsite?.isPublished !== true &&
      !targetWebsite?.draftData;

    if (!canEditExistingWebsite) {
      navigate(createOrEditRoute, { replace: true });
      return;
    }

    if (isDraftOnly) {
      navigate(createOrEditRoute, { replace: true });
      return;
    }

    // Edit flow should not carry vertical in the URL anymore.
    navigate(
      `${builderBasePath}/edit-website/${encodeURIComponent(editSearchKey)}`,
      {
        state: {
          searchKey: editSearchKey,
          companyName: existingWebsite?.companyName,
        },
      },
    );
  };

  const handleCreateOrEditClick = async () => {
    // Dynamic-only mode: previous static branch intentionally skipped.
    // if (type !== "static") {
    //   navigate(createOrEditRoute);
    //   return;
    // }
    try {
      const businessName = String(
        selectedCompany?.companyName ||
          workspaceBusinessName ||
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
      const found =
        websites.find((website) =>
          isSameCompanyTemplate({
            website,
            companyId,
            workspaceId,
            businessName,
          }),
        ) || null;
      const resolvedSearchKey = String(found?.searchKey || "").trim();

      if (found && resolvedSearchKey) {
        // Any existing website record (even old single-page ones without draftData)
        // should open the edit flow, not loop back to create.
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
        navigate(
          `${builderBasePath}/edit-website/${encodeURIComponent(resolvedSearchKey)}`,
          {
            state: {
              searchKey: resolvedSearchKey,
              companyName: found?.companyName,
            },
          },
        );
        return;
      }
    } catch (error) {
      // fall through to picker flow
    }

    const selectedType = workspaceBusinessTypes[0] || "Co-Working";
    const selectedVertical =
      BUSINESS_TYPE_TO_VERTICAL_KEY[selectedType] || "co-working";
    localStorage.setItem("selectedVertical", selectedVertical);
    localStorage.setItem("selectedVerticalLabel", selectedType);
    navigate(createOrEditRoute);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <h2 className="text-title font-pmedium text-primary uppercase">
            Website Builder
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
                    title={createOrEditLabel}
                    route={location.pathname}
                  />
                </div>
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
                    title={createOrEditLabel}
                    route={location.pathname}
                  />
                </div>
              </>
            )}
            <Card icon={<SiGoogleadsense />} title="Website Leads" route={leadsRoute} />
            <Card icon={<MdOutlineRateReview />} title="Website Review" route={reviewsRoute} />
            <Card 
              icon={<MdOutlineWorkHistory />} 
              title="Careers" 
              route={careersRoute}
              locked={!hasExistingWebsite}
              lockReason="Please create your website first"
              onClick={() => {
                if (!hasExistingWebsite) {
                  toast.error("Please create your website first to unlock the Careers page settings.");
                } else {
                  navigate(careersRoute);
                }
              }}
            />
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WebsiteBuilderTypeActions;
