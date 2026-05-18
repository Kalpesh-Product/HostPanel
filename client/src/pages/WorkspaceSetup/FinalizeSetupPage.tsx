import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import Footer from "../../components/Footer";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
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

const planCardHighlightStyles = {
  borderRadius: "40px",
  borderColor: "#1d9ae8",
  borderWidth: "3px",
  boxShadow:
    "0 10px 30px rgba(29, 154, 232, 0.16), 0 0 0 1px rgba(29, 154, 232, 0.18)",
} as const;

const PlanCard = ({
  plan,
  openGroups,
  toggleGroup,
  actionLabel,
  onAction,
  isSelected,
  actionDisabled,
  useNeutralButton,
  secondaryActionLabel,
  onSecondaryAction,
  footerNote,
}: {
  plan: PlanCardData;
  openGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;
  actionLabel: string;
  onAction: () => void;
  isSelected: boolean;
  actionDisabled?: boolean;
  useNeutralButton?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  footerNote?: string;
}) => (
  <div
    className="relative overflow-hidden rounded-[38px] bg-[#eef2f7] p-4 md:p-4 flex flex-col min-h-[360px] shadow-[0_4px_18px_rgba(15,27,53,0.05)] border"
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
    <h3 className="text-[20px] md:text-[17px] lg:text-[15px] font-bold text-[#0f1b35] text-center mt-1">
      {plan.title}
    </h3>

    <p className="text-[11px] md:text-[10px] lg:text-[10px] text-[#667791] text-center mt-3 min-h-[36px]">
      {plan.subtitle}
    </p>

    <p className="text-center mt-3 mb-3 text-[#0f1b35] font-bold text-[20px]">
      {plan.priceLabel}
    </p>

    <div className="h-px bg-[#d8e0ea] mb-3" />

    <div className="space-y-2 flex-1">
      {plan.moduleGroups.map((group, idx) => {
        const groupKey = `${plan.key}-${idx}`;
        const isOpen = Boolean(openGroups[groupKey]);

        return (
          <div key={groupKey} className="rounded-2xl border border-[#dce4ee] bg-[#f7f9fc]">
            <button
              type="button"
              onClick={() => toggleGroup(groupKey)}
              className="w-full px-3 py-2 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={16}
                  className={isSelected ? "text-[#23c35c]" : "text-[#a8b4c7]"}
                />
                <span className="text-[11px] font-bold text-[#304766]">{group.title}</span>
              </div>
              {isOpen ? (
                <ChevronDown size={14} className="text-[#607089]" />
              ) : (
                <ChevronRight size={14} className="text-[#607089]" />
              )}
            </button>

            {isOpen ? (
              <div className="px-3 pb-2 space-y-1">
                {group.items?.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-0.5">
                      <CheckCircle2
                        size={14}
                        className={isSelected ? "text-[#23c35c]" : "text-[#a8b4c7]"}
                      />
                    </span>
                    <span className="text-[11px] text-[#4f627d]">{item}</span>
                  </div>
                ))}

                {group.subgroups?.map((subgroup, subgroupIdx) => {
                  const subgroupKey = `${groupKey}-sub-${subgroupIdx}`;
                  const isSubgroupOpen = Boolean(openGroups[subgroupKey]);

                  return (
                    <div
                      key={subgroupKey}
                      className="rounded-xl border border-[#e1e7f0] bg-white/70"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroup(subgroupKey)}
                        className="w-full px-3 py-2 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            size={14}
                            className={isSelected ? "text-[#23c35c]" : "text-[#a8b4c7]"}
                          />
                          <span className="text-[11px] font-bold text-[#3b4f6d]">
                            {subgroup.title}
                          </span>
                        </div>
                        {isSubgroupOpen ? (
                          <ChevronDown size={14} className="text-[#607089]" />
                        ) : (
                          <ChevronRight size={14} className="text-[#607089]" />
                        )}
                      </button>

                      {isSubgroupOpen ? (
                        <div className="px-3 pb-2 space-y-1">
                          {subgroup.items.map((item) => (
                            <div key={item} className="flex items-start gap-2">
                              <span className="mt-0.5">
                                <CheckCircle2
                                  size={13}
                                  className={isSelected ? "text-[#23c35c]" : "text-[#a8b4c7]"}
                                />
                              </span>
                              <span className="text-[11px] text-[#4f627d]">{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>

    <div className="h-px bg-[#d8e0ea] mt-3 mb-2" />
    <p className="text-[11px] text-[#9aa8bc] text-center mb-2">{plan.note}</p>

    <button
      type="button"
      onClick={onAction}
      disabled={actionDisabled}
      className="w-full h-11 rounded-full text-[14px] font-bold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
        className="mt-3 h-11 rounded-full text-[14px] font-bold border transition-colors bg-[#dce3ed] text-[#0f1b35] border-[#d2dbe8]"
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);

  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const enabledModuleIds = getEnabledModuleIdsForPlan(selectedPlan, workspaceCount);
  const currentPlanCard = PLAN_UI_DATA.find((plan) => plan.key === selectedPlan) || PLAN_UI_DATA[0];
  const upgradePlanOptions = getUpgradePlanOptions(selectedPlan);
  const workspaceRows = [
    { label: "Workspace Name", value: workspaceDetails.workspaceName },
    { label: "Company Name", value: workspaceDetails.businessName },
    { label: "Brand Name", value: workspaceDetails.brandName },
    { label: "Country", value: workspaceDetails.country },
    { label: "State", value: workspaceDetails.state },
    { label: "City", value: workspaceDetails.city },
    { label: "Address", value: workspaceDetails.address },
    {
      label: "Type of Vertical",
      value: Array.isArray(workspaceDetails.businessTypes)
        ? workspaceDetails.businessTypes.join(", ")
        : workspaceDetails.businessType,
    },
  ].filter((row) => row.value);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleUpgradeAction = (plan: PlanCardData) => {
    const submitUpgradeRequest = async () => {
      try {
        setIsUpgradeSubmitting(true);
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

        // Permanent resolver: map legacy company code to master host lead company id.
        if ((looksLikeLegacyCompanyCode || looksLikeLegacyResolvedId) && legacyCompanyId) {
          try {
            const hostCompaniesResponse = await axiosPrivate.get(
              "http://localhost:5007/api/hosts/host-companies",
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
            // Keep fallback flow below.
          }
        }

        if (resolvedCompanyId && /^[a-f0-9]{24}$/i.test(resolvedCompanyId)) {
          resolvedCompanyId = "";
        }

        if (!resolvedCompanyId) {
          toast.error("Company id not found in session. Please re-login and try again.");
          return;
        }
        const response = await axiosPrivate.patch("http://localhost:5007/api/hosts/request-upgrade-plan", {
          companyId: resolvedCompanyId,
          requestedPlan: plan.key,
        });
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

      localStorage.setItem(
        "workspace_setup",
        JSON.stringify({
          selectedPlan,
          enabledModuleIds,
          workspaceDetails,
        }),
      );
      clearInviteOnboardingState();
      setAuth((prevState) => ({
        ...prevState,
        user: response.data?.user || prevState.user,
      }));
      toast.success(response.data?.message || "Workspace created successfully.");
      navigate("/company-settings");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to complete workspace setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#0f172a] font-['Poppins'] flex flex-col">
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
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#8da0bd] uppercase mb-4">
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
                  <span className="text-sm font-bold text-[#233552]">Workspace</span>
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
              Finalize your business location setup
            </h1>
            <p className="text-[13px] md:text-[14px] text-[#63738d] max-w-[560px] mx-auto">
              Review your business location details, confirm the active plan, and finish the setup in one last step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[285px_minmax(0,1fr)] gap-4 md:gap-4 mb-4 sm:mb-5 items-start">
            <div className="min-w-0">
              <PlanCard
                plan={currentPlanCard}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                actionLabel="Current Plan"
                onAction={() => {}}
                isSelected={true}
                useNeutralButton={true}
                onSecondaryAction={
                  !isAdditionalWorkspaceMode && upgradePlanOptions.length
                    ? () => {
                        setIsUpgradeModalOpen(true);
                      }
                    : undefined
                }
                secondaryActionLabel={
                  !isAdditionalWorkspaceMode && upgradePlanOptions.length ? "Upgrade Plan" : undefined
                }
              />
            </div>

            <div className="min-w-0 md:sticky md:top-6 self-start">
              <div className="rounded-[38px] bg-[#eef2f7] p-4 md:p-4 flex flex-col min-h-[360px] shadow-[0_4px_18px_rgba(15,27,53,0.05)] border border-[#d9e1ec]">
              <p className="text-[16px] font-bold text-[#111b33] mb-2 text-center mt-2">
                Business Location Details
              </p>
              <p className="text-[11px] font-bold text-[#233552] mb-4 text-center">
                Plan Selected : {selectedPlan.toUpperCase()}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 flex-1 content-start">
                {workspaceRows.length ? (
                  workspaceRows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-2xl border border-[#dce4ee] bg-[#f7f9fc] px-3 py-3"
                    >
                      <p className="text-[11px] font-bold text-[#233552]">
                        {row.label}:
                      </p>
                      <p className="text-[11px] text-[#6f7f96] break-words">{row.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-[#6f7f96]">No workspace details available</p>
                )}
              </div>
              <div className="h-px bg-[#d8e0ea] mt-3 mb-2" />
              <p className="text-[11px] text-[#9aa8bc] text-center">
                You can still edit these details later from workspace settings.
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
              className="h-10 w-full sm:w-auto px-7 rounded-xl bg-[#2d67f0] hover:bg-[#2558d5] transition-colors text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Continue"} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>

      {isUpgradeModalOpen && !isAdditionalWorkspaceMode ? (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-fit max-h-[90vh] overflow-y-auto rounded-[32px] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] shadow-[0_20px_80px_rgba(15,23,42,0.28)] p-5 sm:p-6 border border-[#dbe5f2] my-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6d9bff] mb-2">
                  Upgrade Plan
                </p>
                <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#111b33]">
                  Choose your plan
                </h2>
                <p className="text-[15px] text-[#63738d] mt-1 max-w-[420px]">
                  {selectedPlan === "basic"
                    ? "Pick the next plan that fits your workspace best, or continue now with your current plan."
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

            <div className="flex flex-wrap justify-center gap-4 mx-auto">
              {upgradePlanOptions.map((plan) => (
                <div key={plan.key} className="w-full max-w-[285px]">
                  <PlanCard
                    plan={plan}
                    openGroups={openGroups}
                    toggleGroup={toggleGroup}
                    actionLabel={isUpgradeSubmitting ? "Sending..." : "Upgrade Plan"}
                    onAction={() => handleUpgradeAction(plan)}
                    actionDisabled={isUpgradeSubmitting}
                    isSelected={false}
                    footerNote={
                      selectedPlan === "basic"
                        ? "Upgrade now if you want more features for this workspace."
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
                  navigate("/dashboard");
                }}
                className="h-10 px-6 rounded-xl border border-[#2d67f0] text-white text-[14px] font-medium bg-[#2d67f0] hover:bg-[#2558d5] transition-colors"
              >
                Continue now with current plan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
};

export default FinalizeSetupPage;
