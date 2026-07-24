import { createPortal } from "react-dom";
import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import Footer from "../../components/Footer";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import { showSuccessAlert } from "../../utils/alerts";
import { switchWorkspaceSession } from "../../services/workspace-session";
import {
  clearInviteOnboardingState,
  readInviteOnboardingState,
} from "../../utils/inviteOnboarding";
import { getEnabledModuleIdsForPlan, getWorkspaceCount } from "../../utils/workspacePlanAccess";
import {
  getUpgradePlanOptions,
  PLAN_UI_DATA,
  type PlanCardData,
  type PlanType,
} from "./workspaceSetupPlans";

type UpgradeRequestStatus = "pending" | "approved" | "rejected";
type UpgradeRequestState = {
  companyId: string;
  requestedPlan: string;
  status: UpgradeRequestStatus;
  requestedAt?: string;
};

const MASTER_PANEL_BASE_URL = String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() || "https://wonomasterbe.vercel.app";

const planCardHighlightStyles = {
  borderRadius: "40px",
  borderColor: "#1d9ae8",
  borderWidth: "3px",
  boxShadow:
    "0 10px 30px rgba(29, 154, 232, 0.16), 0 0 0 1px rgba(29, 154, 232, 0.18)",
} as const;

const PlanCard = ({
  plan,
  actionLabel,
  onAction,
  isSelected,
  actionDisabled,
  useNeutralButton,
  secondaryActionLabel,
  onSecondaryAction,
  footerNote,
  minHeightClass = "min-h-[500px]",
}: {
  plan: PlanCardData;
  actionLabel: string;
  onAction: () => void;
  isSelected: boolean;
  actionDisabled?: boolean;
  useNeutralButton?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  footerNote?: string;
  minHeightClass?: string;
}) => (
  <div
    className={`relative overflow-visible rounded-[38px] bg-[#eef2f7] p-4 md:p-4 flex flex-col ${minHeightClass} shadow-[0_4px_18px_rgba(15,27,53,0.05)] border`}
    style={
      isSelected
        ? planCardHighlightStyles
        : {
            borderRadius: "40px",
            borderColor: "#d9e1ec",
            borderWidth: "1px",
          }
    }
  >
    <h3 className="text-[20px] md:text-[17px] lg:text-[15px] font-pmedium text-[#0f1b35] text-center mt-1">
      {plan.title}
    </h3>

    <p className="text-[11px] md:text-[10px] lg:text-[10px] text-[#667791] text-center mt-3 min-h-[36px]">
      {plan.subtitle}
    </p>

    <p className="text-center mt-3 mb-3 text-[#0f1b35] font-bold text-[20px]">
      {plan.priceLabel}
    </p>

    <div className="h-px bg-[#d8e0ea] mb-3" />

    <div className="space-y-2 flex-1 rounded-2xl border border-[#dce4ee] bg-[#f7f9fc] px-3 py-2">
      {plan.moduleGroups.flatMap((group) => group.items || []).map((item) => (
        <div key={`${plan.key}-${item}`} className="flex items-start gap-2">
          <span className="mt-0.5">
            <CheckCircle2
              size={14}
              className={isSelected ? "text-[#23c35c]" : "text-[#a8b4c7]"}
            />
          </span>
          <span className="text-[11px] leading-5 text-[#4f627d]">{item}</span>
        </div>
      ))}
    </div>

    <div className="h-px bg-[#d8e0ea] mt-3 mb-2" />
    <p className="text-[11px] text-[#9aa8bc] text-center mb-2">{plan.note}</p>

    <button
      type="button"
      onClick={onAction}
      disabled={actionDisabled}
      className="w-full h-11 rounded-full text-[16px] font-bold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      style={
        useNeutralButton
          ? {
              backgroundColor: "#2d67f0",
              color: "#ffffff",
              borderColor: "#2d67f0",
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)",
            }
          : isSelected
          ? {
              backgroundColor: "#2d67f0",
              color: "#ffffff",
              borderColor: "#2d67f0",
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)",
            }
          : {
              backgroundColor: "#dce3ed",
              color: "#0f1b35",
              borderColor: "#d2dbe8",
            }
      }
    >
      {actionLabel}
    </button>

      {secondaryActionLabel && onSecondaryAction ? (
        <button
          type="button"
          onClick={onSecondaryAction}
        className="mt-3 h-11 rounded-full text-[16px] font-bold border transition-colors bg-[#dce3ed] text-[#0f1b35] border-[#d2dbe8]"
        >
          {secondaryActionLabel}
        </button>
      ) : null}

    {footerNote ? (
      <p className="mt-2 text-[11px] text-[#7b8ba3] text-center">{footerNote}</p>
    ) : null}
  </div>
);

const FinalizeSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const axiosPrivate = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const workspaceDetails = location.state?.workspaceDetails || {};
  const isAdditionalWorkspaceMode = Boolean(location.state?.additionalWorkspaceMode);
  const inviteOnboarding = readInviteOnboardingState();
  const initialSelectedPlan = (location.state?.selectedPlan || "basic") as PlanType;
  const hostLeadCompanyIdOverride =
    String(
      location.state?.hostLeadCompanyId ||
        localStorage.getItem("host_lead_company_id") ||
        "",
    ).trim();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(initialSelectedPlan);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [upgradeRequestState, setUpgradeRequestState] = useState<UpgradeRequestState | null>(
    null,
  );

  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const enabledModuleIds = getEnabledModuleIdsForPlan(selectedPlan, workspaceCount);
  const currentPlanCard = PLAN_UI_DATA.find((plan) => plan.key === selectedPlan) || PLAN_UI_DATA[0];
  const upgradePlanOptions = getUpgradePlanOptions(selectedPlan);
  const workspaceRows = [
    { label: "Unit Name", value: workspaceDetails.workspaceName },
    { label: "Company Name", value: workspaceDetails.businessName },
    { label: "Brand Name", value: workspaceDetails.brandName },
    { label: "Country", value: workspaceDetails.country },
    { label: "State", value: workspaceDetails.state },
    { label: "City", value: workspaceDetails.city },
    { label: "Timezone", value: workspaceDetails.timezone },
    { label: "Currency", value: workspaceDetails.currency },
    { label: "Address", value: workspaceDetails.address },
    {
      label: "Type of Vertical",
      value: Array.isArray(workspaceDetails.businessTypes)
        ? workspaceDetails.businessTypes.join(", ")
        : workspaceDetails.businessType,
    },
  ].filter((row) => row.value);

  const getUpgradeRequestStorageKey = (companyId: string) =>
    `hostpanel_upgrade_request_status_${companyId}`;

  const readStoredUpgradeRequest = (companyId: string): UpgradeRequestState | null => {
    if (!companyId) return null;
    try {
      const raw = localStorage.getItem(getUpgradeRequestStorageKey(companyId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as UpgradeRequestState;
      if (!parsed?.status || !parsed?.requestedPlan) return null;
      if (parsed.status === "approved" || parsed.status === "rejected") return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeStoredUpgradeRequest = (requestState: UpgradeRequestState | null) => {
    if (!requestState?.companyId) return;
    const storageKey = getUpgradeRequestStorageKey(requestState.companyId);
    if (requestState.status === "approved" || requestState.status === "rejected") {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(requestState));
  };

  const normalizeUpgradeStatus = (value: unknown): UpgradeRequestStatus | null => {
    const normalized = String(value || "").trim().toLowerCase();
    if (
      normalized === "pending" ||
      normalized === "requested" ||
      normalized === "in_review" ||
      normalized === "under_review"
    ) {
      return "pending";
    }
    if (
      normalized === "approved" ||
      normalized === "accepted" ||
      normalized === "completed" ||
      normalized === "done"
    ) {
      return "approved";
    }
    if (
      normalized === "rejected" ||
      normalized === "declined" ||
      normalized === "denied" ||
      normalized === "cancelled"
    ) {
      return "rejected";
    }
    return null;
  };

  const resolveCompanyId = async (): Promise<string> => {
    const authUser = auth.user as
      | {
          company?: string | { _id?: string; id?: string };
          companyId?: string;
          hostLeadCompanyId?: string;
        }
      | null;

    let resolvedCompanyId = String(
      hostLeadCompanyIdOverride ||
        authUser?.hostLeadCompanyId ||
        (typeof authUser?.company === "string"
          ? authUser.company
          : authUser?.company?._id || authUser?.company?.id) ||
        authUser?.companyId ||
        "",
    ).trim();

    const legacyCompanyId = String(authUser?.companyId || "").trim();
    const looksLikeLegacyCompanyCode = /^CMP/i.test(legacyCompanyId);
    const looksLikeLegacyResolvedId = /^CMP/i.test(resolvedCompanyId);
    const companyNameHint = String(
      (auth.user as { companyName?: string } | null)?.companyName ||
        workspaceDetails.businessName ||
        "",
    )
      .trim()
      .toLowerCase();

    if ((looksLikeLegacyCompanyCode || looksLikeLegacyResolvedId) && legacyCompanyId) {
      try {
        const hostCompaniesResponse = await axiosPrivate.get(
          `${MASTER_PANEL_BASE_URL}/api/hosts/host-companies`,
        );
        const hostCompanies =
          (Array.isArray(hostCompaniesResponse?.data)
            ? hostCompaniesResponse.data
            : Array.isArray(hostCompaniesResponse?.data?.data)
            ? hostCompaniesResponse.data.data
            : Array.isArray(hostCompaniesResponse?.data?.companies)
            ? hostCompaniesResponse.data.companies
            : []) as Array<Record<string, unknown>>;

        let matchedCompany = hostCompanies.find((company) => {
          const leadId = String(company?.leadId || "").trim();
          const companyId = String(company?.companyId || "").trim();
          return leadId === legacyCompanyId || companyId === legacyCompanyId;
        });

        if (!matchedCompany && companyNameHint) {
          matchedCompany = hostCompanies.find((company) => {
            const name = String(company?.companyName || "").trim().toLowerCase();
            return name && name === companyNameHint;
          });
        }

        if (matchedCompany?.companyId) {
          resolvedCompanyId = String(matchedCompany.companyId).trim();
          localStorage.setItem("host_lead_company_id", resolvedCompanyId);
        }
      } catch {
        // keep fallback
      }
    }

    if (resolvedCompanyId && /^[a-f0-9]{24}$/i.test(resolvedCompanyId)) {
      return "";
    }

    return resolvedCompanyId;
  };

  useEffect(() => {
    if (isAdditionalWorkspaceMode) return;
    let active = true;

    const syncUpgradeRequestState = async () => {
      const companyId = await resolveCompanyId();
      if (!active || !companyId) return;

      const localState = readStoredUpgradeRequest(companyId);
      if (localState && active) setUpgradeRequestState(localState);

      try {
        const response = await axiosPrivate.get(`${MASTER_PANEL_BASE_URL}/api/hosts/host-companies`);
        const companies = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data?.companies)
          ? response.data.companies
          : [];
        const matched = companies.find(
          (item: Record<string, unknown>) =>
            String(item?.companyId || "").trim() === companyId ||
            String(item?.leadId || "").trim() === companyId,
        ) as Record<string, unknown> | undefined;
        if (!matched) return;

        const status =
          normalizeUpgradeStatus(matched?.upgradeRequestStatus) ||
          normalizeUpgradeStatus(matched?.planUpgradeStatus) ||
          normalizeUpgradeStatus(matched?.requestedPlanStatus) ||
          normalizeUpgradeStatus(matched?.upgradeStatus);
        const requestedPlan = String(
          matched?.requestedPlan || matched?.upgradeRequestedPlan || matched?.targetPlan || "",
        )
          .trim()
          .toLowerCase();

        if (!status || !requestedPlan) return;

        const serverState: UpgradeRequestState = {
          companyId,
          requestedPlan,
          status,
          requestedAt: String(
            matched?.requestedAt || matched?.upgradeRequestedAt || matched?.updatedAt || "",
          ).trim(),
        };

        if (!active) return;
        if (status === "pending") {
          setUpgradeRequestState(serverState);
          writeStoredUpgradeRequest(serverState);
        } else {
          setUpgradeRequestState(null);
          writeStoredUpgradeRequest(serverState);
        }
      } catch {
        // keep local fallback state
      }
    };

    void syncUpgradeRequestState();
    return () => {
      active = false;
    };
  }, [axiosPrivate, auth.user, hostLeadCompanyIdOverride, isAdditionalWorkspaceMode, workspaceDetails.businessName]);

  const handleUpgradeAction = (plan: PlanCardData) => {
    const submitUpgradeRequest = async () => {
      try {
        setIsUpgradeSubmitting(true);
        const resolvedCompanyId = await resolveCompanyId();
        if (!resolvedCompanyId) {
          toast.error("Company id not found in session. Please re-login and try again.");
          return;
        }
        const response = await axiosPrivate.patch(`${MASTER_PANEL_BASE_URL}/api/hosts/request-upgrade-plan`, {
          companyId: resolvedCompanyId,
          requestedPlan: plan.key,
        });
        const nextRequestState: UpgradeRequestState = {
          companyId: resolvedCompanyId,
          requestedPlan: String(plan.key || "").toLowerCase(),
          status: "pending",
          requestedAt: new Date().toISOString(),
        };
        setUpgradeRequestState(nextRequestState);
        writeStoredUpgradeRequest(nextRequestState);
        setIsUpgradeModalOpen(false);
        toast.success(response.data?.message || "Request sent. Sales team will contact you soon.");
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to send upgrade request.");
      } finally {
        setIsUpgradeSubmitting(false);
      }
    };

    void submitUpgradeRequest();
  };

  const hasPendingUpgradeRequest = upgradeRequestState?.status === "pending";
  const pendingUpgradePlan = String(upgradeRequestState?.requestedPlan || "").toLowerCase();

  // Temporary override requested: force basic plan for a specific company.
  useEffect(() => {
    const normalizedCompanyName = String(
      workspaceDetails?.businessName ||
        (auth.user as { companyName?: string } | null)?.companyName ||
        "",
    )
      .trim()
      .toLowerCase();
    if (normalizedCompanyName === "91springboard") {
      setSelectedPlan("basic");
    }
  }, [auth.user, workspaceDetails?.businessName]);

  const handleCompleteSetup = async () => {
    try {
      setIsSubmitting(true);
      const response = await axiosPrivate.post("/api/workspaces/setup", {
        workspaceDetails,
        selectedPlan,
        enabledModuleIds,
        modules: [],
        additionalWorkspaceMode: isAdditionalWorkspaceMode,
      });

      // The server is authoritative on the plan: additional workspaces inherit
      // the account plan and are never downgraded. Persist what the server
      // actually saved so the UI can't drift back to a stale/basic plan.
      const createdWorkspace = (response?.data?.workspace || {}) as {
        selectedPlan?: string;
        enabledModuleIds?: string[];
      };
      const persistedPlan = (String(createdWorkspace.selectedPlan || selectedPlan)
        .trim()
        .toLowerCase() || selectedPlan) as PlanType;
      const persistedEnabledModuleIds = Array.isArray(createdWorkspace.enabledModuleIds)
        ? createdWorkspace.enabledModuleIds
        : enabledModuleIds;

      localStorage.setItem(
        "workspace_setup",
        JSON.stringify({
          selectedPlan: persistedPlan,
          enabledModuleIds: persistedEnabledModuleIds,
          workspaceDetails,
        }),
      );
      clearInviteOnboardingState();
      const nextUser = response.data?.user || auth.user || null;
      const createdWorkspaceId = String(
        response?.data?.data?.workspaceId ||
          response?.data?.workspaceId ||
          response?.data?.workspace?._id ||
          response?.data?.workspace?.id ||
          "",
      ).trim();
      let activeWorkspaceId = createdWorkspaceId;
      let nextAccessibleWorkspaces = Array.isArray(
        (nextUser as { accessibleWorkspaces?: unknown[] } | null)?.accessibleWorkspaces,
      )
        ? ((nextUser as { accessibleWorkspaces?: unknown[] } | null)?.accessibleWorkspaces as Record<string, unknown>[])
        : [];

      if (!activeWorkspaceId && nextAccessibleWorkspaces.length) {
        const matchedWorkspace = nextAccessibleWorkspaces.find((workspace) => {
          const normalizedWorkspaceName = String(workspace?.workspaceName || "")
            .trim()
            .toLowerCase();
          return (
            normalizedWorkspaceName &&
            normalizedWorkspaceName ===
              String(workspaceDetails?.workspaceName || "").trim().toLowerCase()
          );
        });
        activeWorkspaceId = String(matchedWorkspace?.id || matchedWorkspace?._id || "").trim();
      }

      if (activeWorkspaceId) {
        try {
          const switchResponse = await switchWorkspaceSession(axiosPrivate, activeWorkspaceId);
          const switchedWorkspaceId = String(
            switchResponse?.data?.data?.activeWorkspaceId || activeWorkspaceId,
          );
          activeWorkspaceId = switchedWorkspaceId;
          nextAccessibleWorkspaces = Array.isArray(switchResponse?.data?.data?.accessibleWorkspaces)
            ? switchResponse.data.data.accessibleWorkspaces
            : nextAccessibleWorkspaces;
        } catch {
          // If switch API fails, continue with the created workspace context we already have.
        }
      }

      setAuth((prevState) => ({
        ...prevState,
        user: nextUser
          ? {
              ...(nextUser as Record<string, unknown>),
              ...(activeWorkspaceId ? { primaryWorkspace: activeWorkspaceId } : {}),
              ...(nextAccessibleWorkspaces.length
                ? { accessibleWorkspaces: nextAccessibleWorkspaces }
                : {}),
            }
          : prevState.user,
      }));
      await showSuccessAlert(
        response.data?.message || "Business location created successfully. Redirecting to dashboard...",
      );
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to complete unit setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#0f172a] font-['Poppins'] flex flex-col">
      <div className="shadow-md bg-white/80 backdrop-blur-md">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-0">
          <div className="flex items-center py-3">
            <a href="https://wono.co">
              <img src={logo} alt="wono" className="w-28 sm:w-36 h-auto" />
            </a>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-8">
        <div className="w-full max-w-[900px] mx-auto">
          <div className="mb-5 sm:mb-6">
            <p className="text-[10px] font-pmedium tracking-[0.22em] text-[#8da0bd] uppercase mb-4">
              Progress
            </p>
            <div className="flex flex-col md:flex-row md:items-center w-full gap-4 md:gap-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center">
                    <Check size={16} strokeWidth={3} />
                  </div>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-[#233552]">Unit</span>
                  <span className="text-[11px] text-[#6d9bff] font-semibold">Done</span>
                </div>
              </div>

              <div className="hidden md:block flex-1 h-px bg-[#2d67f0] mx-4 md:mx-6" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dce9ff] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#2d67f0] text-white text-sm font-bold flex items-center justify-center">
                    2
                  </div>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-[#233552]">Finalize Setup</span>
                  <span className="text-[11px] text-[#6d9bff] font-semibold">
                    Current step
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 sm:mb-5 text-center">
            <h1 className="text-[22px] sm:text-[26px] md:text-[30px] font-bold text-[#111b33] mb-2">
              FINALIZE YOUR BUSINESS LOCATION SETUP
            </h1>
            <p className="text-[13px] md:text-[14px] text-[#63738d] max-w-[900px] mx-auto whitespace-nowrap">
              Review your business location details, confirm the active plan, and finish the setup in one last step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-4 md:gap-4 mb-4 sm:mb-5 items-stretch">
            <div className="min-w-0">
              <PlanCard
                plan={currentPlanCard}
                actionLabel="Current Plan"
                onAction={() => {}}
                isSelected={true}
                minHeightClass="min-h-[500px] h-full"
                useNeutralButton={true}
                onSecondaryAction={
                  !isAdditionalWorkspaceMode && upgradePlanOptions.length
                    ? () => {
                        setIsUpgradeModalOpen(true);
                      }
                    : undefined
                }
                secondaryActionLabel={
                  !isAdditionalWorkspaceMode && upgradePlanOptions.length
                    ? hasPendingUpgradeRequest
                      ? "Upgrade Requested"
                      : "Upgrade Plan"
                    : undefined
                }
                actionDisabled={hasPendingUpgradeRequest}
              />
            </div>

            <div className="min-w-0 self-stretch">
              <div className="rounded-[38px] bg-[#eef2f7] p-4 md:p-4 flex h-full min-h-[500px] flex-col shadow-[0_4px_18px_rgba(15,27,53,0.05)] border border-[#d9e1ec]">
              <p className="text-[16px] font-bold text-[#111b33] mb-1 text-center mt-1">
                Business Location Details
              </p>
              <p className="text-[11px] font-bold text-[#233552] mb-3 text-center">
                Plan Selected : {selectedPlan.toUpperCase()}
              </p>
              <div className="grid grid-cols-1 auto-rows-auto gap-y-2 flex-1 content-between">
                {workspaceRows.length ? (
                  workspaceRows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-2xl border border-[#dce4ee] bg-[#f7f9fc] px-3.5 py-3"
                    >
                      <p className="text-[12.5px] text-[#4f627d] break-words">
                        <span className="font-bold text-[#1f3553] text-[12px]">{row.label}:</span>{" "}
                        <span className="font-semibold text-[#1f3553]">
                          {row.value}
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-[#6f7f96]">No unit details available</p>
                )}
              </div>
              <div className="h-px bg-[#d8e0ea] mt-3 mb-2" />
              <p className="text-[11px] text-[#9aa8bc] text-center">
                You can still edit these details later from unit settings.
              </p>
            </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e1e6ef] mt-3 sm:mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                navigate("/create-workspace", {
                  state: { workspaceDetails, selectedPlan },
                })
              }
              className="h-10 w-full sm:w-auto px-5 rounded-xl border border-[#d0d8e5] text-[#5b6b83] text-[14px] font-medium bg-transparent"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCompleteSetup}
              disabled={isSubmitting}
              className="h-10 w-full sm:w-auto px-7 rounded-xl bg-[#2d67f0] hover:bg-[#2558d5] transition-colors text-white text-[13px] font-pmedium inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Finish"} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>

      {isUpgradeModalOpen && !isAdditionalWorkspaceMode ? createPortal(
        <div className="fixed inset-0 z-[1400] bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-fit max-h-[90vh] overflow-y-auto rounded-[32px] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] shadow-[0_20px_80px_rgba(15,23,42,0.28)] p-5 sm:p-6 border border-[#dbe5f2] my-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[15px] font-pmedium uppercase tracking-[0.18em] text-[#6d9bff] mb-2">
                  Upgrade Plan
                </p>
                  <h2 className="font-['Poppins'] text-[22px] sm:text-[26px] md:text-[30px] font-bold text-[#111b33] uppercase mb-2 tracking-normal">
                  CHOOSE THE PLAN
                  </h2>
                <p className="text-[15px] text-[#63738d] mt-1 max-w-[900px] whitespace-nowrap">
                  {selectedPlan === "basic"
                    ? "Pick the next plan that fits your unit best, or continue now with your current plan."
                    : "Send an upgrade request for a higher plan, or continue now with your current plan."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="h-10 w-10 rounded-full border border-[#d7dfeb] text-[#5c6d84] inline-flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

              <div className="flex flex-wrap justify-center gap-4 mx-auto items-stretch">
              {hasPendingUpgradeRequest ? (
                <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-[13px] font-semibold text-amber-800">
                  Upgrade request for {pendingUpgradePlan.toUpperCase()} is pending. It will stay saved until approved or rejected.
                </div>
              ) : null}
              {upgradePlanOptions.map((plan) => (
                <div key={plan.key} className="w-full max-w-[320px] flex">
                  <PlanCard
                    plan={plan}
                    actionLabel={
                      pendingUpgradePlan === plan.key
                        ? "Request Pending"
                        : isUpgradeSubmitting
                        ? "Sending..."
                        : "Upgrade Plan"
                    }
                    onAction={() => handleUpgradeAction(plan)}
                    actionDisabled={isUpgradeSubmitting || hasPendingUpgradeRequest}
                    isSelected={false}
                    minHeightClass="h-full"
                    footerNote={
                      selectedPlan === "basic"
                        ? "Upgrade now if you want more features for this unit."
                        : "Request this plan and our sales team will contact you soon."
                    }
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 mt-5 border-t border-[#e1e6ef] flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                }}
                className="h-10 px-6 rounded-xl border border-[#2d67f0] text-white text-[16px] font-pmedium bg-[#2d67f0] hover:bg-[#2558d5] transition-colors"
              >
                Continue now with current plan
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}

      <Footer />
    </div>
  );
};

export default FinalizeSetupPage;
