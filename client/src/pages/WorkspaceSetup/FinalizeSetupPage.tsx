import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Users,
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
import {
  canAccessWorkspaceManagement,
  getEnabledModuleIdsForPlan,
  getWorkspaceCount,
} from "../../utils/workspacePlanAccess";

type PlanType = "basic" | "professional" | "custom";

type PlanGroup = {
  title: string;
  items?: string[];
  subgroups?: Array<{ title: string; items: string[] }>;
};

const getPlanGroups = (hasWorkspaceManagement: boolean): Record<PlanType, PlanGroup[]> => ({
  basic: [
    {
      title: "Company Settings",
      items: [
        "Website Builder",
        "Nomad Listing",
        "Website Leads",
        "Reviews",
        "Organization Management",
        "Module Management",
        "Access Grants",
        "Workspace Settings",
        "Analytics",
        hasWorkspaceManagement
          ? "Workspace Management"
          : "Workspace Management after multiple workspaces",
      ],
    },
    {
      title: "Key Apps",
      items: ["Tickets", "Visitor Management", "Chat Bot"],
    },
  ],
  professional: [
    {
      title: "Everything in Basic",
      items: [
        "All Company Settings modules",
        "Tickets",
        "Visitor Management",
        "Chat Bot",
      ],
    },
    {
      title: "Key Apps",
      items: ["Meeting Room Booking"],
    },
    {
      title: "Department Access",
      subgroups: [
        {
          title: "Sales Department",
          items: [
            "Sales Leads Management",
            "Tenant Companies",
            "Plans & Pricing",
            "Sales Architecture",
          ],
        },
      ],
    },
  ],
  custom: [
    {
      title: "Everything in Basic + Professional",
      items: ["All Basic modules", "Meeting Room Booking", "Sales Department modules"],
    },
    {
      title: "Key Apps",
      items: [
        "Attendance",
        "Tasks",
        "Leave Requests",
        "Assets",
        "Inventory",
        "Finance Management",
        "Reports",
      ],
    },
    {
      title: "Department Access",
      subgroups: [
        {
          title: "HR Department",
          items: [
            "Employee Management",
            "Documents",
            "Recruitment",
            "Leave Request Processing",
            "Attendance Review",
            "Payroll Management",
            "Exit Management",
          ],
        },
        {
          title: "Administration Department",
          items: [
            "Tenant Companies",
            "Bookings",
            "Visitors Management",
            "Resource Management",
            "House Keeping",
            "Workspace Layout",
          ],
        },
        {
          title: "Finance Department",
          items: ["Finance & Budget", "Billing & Payments", "Accounting"],
        },
        {
          title: "Maintenance Department",
          items: ["Maintenance Repair Logs", "AMC Maintenance Scheduler"],
        },
        {
          title: "Tech Department",
          items: ["Website Builder"],
        },
        {
          title: "IT Department",
          items: ["IT Repair Logs"],
        },
      ],
    },
  ],
});

const FinalizeSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const axiosPrivate = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const workspaceDetails = location.state?.workspaceDetails || {};
  const inviteOnboarding = readInviteOnboardingState();
  const selectedPlan = (
    location.state?.selectedPlan ||
    inviteOnboarding?.selectedPlan ||
    "basic"
  ) as PlanType;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );
  const hasWorkspaceManagement = canAccessWorkspaceManagement(workspaceCount);
  const enabledModuleIds = getEnabledModuleIdsForPlan(selectedPlan, workspaceCount);

  const selectedPlanGroups = getPlanGroups(hasWorkspaceManagement)[selectedPlan] || [];
  const workspaceRows = [
    { label: "Workspace Name", value: workspaceDetails.workspaceName },
    { label: "Business Name", value: workspaceDetails.businessName },
    { label: "Brand Name", value: workspaceDetails.brandName },
    { label: "Country", value: workspaceDetails.country },
    { label: "State", value: workspaceDetails.state },
    { label: "City", value: workspaceDetails.city },
    { label: "Address", value: workspaceDetails.address },
    {
      label: "Business Type",
      value: Array.isArray(workspaceDetails.businessTypes)
        ? workspaceDetails.businessTypes.join(", ")
        : workspaceDetails.businessType,
    },
  ].filter((row) => row.value);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCompleteSetup = async () => {
    try {
      setIsSubmitting(true);
      const response = await axiosPrivate.post("/api/workspaces/setup", {
        workspaceDetails,
        selectedPlan,
        enabledModuleIds,
        modules: [],
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
          <div className="flex justify-between items-center py-3 gap-3">
            <a href="https://wono.co">
              <img src={logo} alt="wono" className="w-28 sm:w-36 h-auto" />
            </a>
            <button
              type="button"
              onClick={() => (window.location.href = "https://nomad.wono.co")}
              className="relative pb-1 transition-all duration-300 group font-bold bg-transparent uppercase border-none text-[11px] sm:text-[13px] whitespace-nowrap"
            >
              Become a nomad
              <span className="absolute left-0 w-0 bottom-0 block h-[2px] bg-blue-500 transition-all duration-300 group-hover:w-full" />
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-12">
        <div className="w-full max-w-[900px] mx-auto">
          <div className="mb-6 sm:mb-8">
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
                <div className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center">
                    <Check size={16} strokeWidth={3} />
                  </div>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-[#233552]">Set Up Modules</span>
                  <span className="text-[11px] text-[#6d9bff] font-semibold">Done</span>
                </div>
              </div>

              <div className="hidden md:block flex-1 h-px bg-[#2d67f0] mx-4 md:mx-6" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dce9ff] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#2d67f0] text-white text-sm font-bold flex items-center justify-center">
                    3
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

          <div className="mb-5 sm:mb-6 text-center">
            <h1 className="text-[24px] sm:text-[28px] md:text-[34px] font-bold text-[#111b33] mb-3">
              Finalize your workspace setup
            </h1>
            <p className="text-sm md:text-[14px] text-[#63738d] max-w-[560px] mx-auto">
              Review what is configured so far, then continue to dashboard to explore more settings and customize your workspace as you like.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 mb-5 sm:mb-6">
            <div className="rounded-2xl sm:rounded-3xl border border-[#d5ddea] bg-[#eef2f7] p-4 sm:p-5">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-[#2d67f0] mb-4">
                <CheckCircle2 size={22} />
              </div>
              <p className="text-[15px] font-bold text-[#111b33] mb-2">
                Workspace Details:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {workspaceRows.length ? (
                  workspaceRows.map((row) => (
                    <div key={row.label}>
                      <p className="text-[11px] font-semibold text-[#233552]">
                        {row.label}:
                      </p>
                      <p className="text-[11px] text-[#6f7f96] break-words">{row.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-[#6f7f96]">No workspace details available</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-[#d5ddea] bg-[#eef2f7] p-4 sm:p-5">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-[#2d67f0] mb-4">
                <Users size={22} />
              </div>
              <p className="text-[15px] font-bold text-[#111b33] mb-2">
                Modules Enabled
              </p>
              <p className="text-[11px] font-semibold text-[#233552] mb-3">
                Plan Selected : {selectedPlan.toUpperCase()}
              </p>
              <div className="space-y-2">
                {selectedPlanGroups.map((group, idx) => {
                  const groupKey = `group-${idx}`;
                  const isOpen = Boolean(openGroups[groupKey]);

                  return (
                    <div
                      key={groupKey}
                      className="rounded-2xl border border-[#dce4ee] bg-[#f7f9fc]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroup(groupKey)}
                        className="w-full px-3 py-2 flex items-center justify-between text-left"
                      >
                        <span className="text-[11px] font-semibold text-[#304766]">
                          {group.title}
                        </span>
                        {isOpen ? (
                          <ChevronDown size={14} className="text-[#607089]" />
                        ) : (
                          <ChevronRight size={14} className="text-[#607089]" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-2 space-y-1">
                          {group.items?.map((item) => (
                            <div key={item} className="flex items-start gap-2">
                              <span className="mt-0.5 text-[#23c35c]">
                                <CheckCircle2 size={14} />
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
                                    <CheckCircle2 size={14} className="text-[#23c35c]" />
                                    <span className="text-[11px] font-semibold text-[#3b4f6d]">
                                      {subgroup.title}
                                    </span>
                                  </div>
                                  {isSubgroupOpen ? (
                                    <ChevronDown size={14} className="text-[#607089]" />
                                  ) : (
                                    <ChevronRight size={14} className="text-[#607089]" />
                                  )}
                                </button>
                                {isSubgroupOpen && (
                                  <div className="px-3 pb-2 space-y-1">
                                    {subgroup.items.map((item) => (
                                      <div key={item} className="flex items-start gap-2">
                                        <span className="mt-0.5 text-[#23c35c]">
                                          <CheckCircle2 size={13} />
                                        </span>
                                        <span className="text-[11px] text-[#4f627d]">{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {!selectedPlanGroups.length && (
                <p className="text-[11px] text-[#6f7f96]">No modules selected</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#e1e6ef] mt-4 sm:mt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                navigate("/create-workspace/modules", {
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
      <Footer />
    </div>
  );
};

export default FinalizeSetupPage;
