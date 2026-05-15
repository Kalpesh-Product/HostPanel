import React, { useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import Footer from "../../components/Footer";
import useAuth from "../../hooks/useAuth";
import { readInviteOnboardingState } from "../../utils/inviteOnboarding";
import { getWorkspaceCount } from "../../utils/workspacePlanAccess";

type PlanType = "basic" | "professional" | "custom";

type PlanCardData = {
  key: PlanType;
  title: string;
  subtitle: string;
  priceLabel: string;
  note: string;
  moduleGroups: Array<{
    title: string;
    items?: string[];
    subgroups?: Array<{ title: string; items: string[] }>;
  }>;
};

const PLAN_UI_DATA: PlanCardData[] = [
  {
    key: "basic",
    title: "BASIC",
    subtitle: "Everything you need to start, manage, and grow your business at no cost!",
    priceLabel: "FREE*",
    note: "* Limited time offer for few months.",
    moduleGroups: [
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
        ],
      },
      {
        title: "Key Apps",
        items: ["Tickets", "Visitor Management", "Chat Bot"],
      },
    ],
  },
  {
    key: "professional",
    title: "PROFESSIONAL",
    subtitle:
      "Your ambitions and goals to scale from a small business to a growing company!",
    priceLabel: "$199 /month",
    note: "Free activation and free for first month.",
    moduleGroups: [
      {
        title: "Everything in Basic",
        items: ["All Company Settings modules", "Tickets", "Visitor Management", "Chat Bot"],
      },
      {
        title: "Add-On Key Apps",
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
  },
  {
    key: "custom",
    title: "CUSTOMISE",
    subtitle:
      "Tailored solutions for companies scaling into ENTERPRISE LEVEL OPERATIONS!",
    priceLabel: "PERSONALISED",
    note: "Custom activation post testing.",
    moduleGroups: [
      {
        title: "Everything in Basic + Professional",
        items: ["All Basic Plan modules", "Meeting Room Booking", "Sales Department modules"],
      },
      {
        title: "Add-On Key Apps",
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
  },
];

const SetupModulesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const workspaceDetails = location.state?.workspaceDetails || null;
  const inviteOnboarding = readInviteOnboardingState();
  const selectedPlan = (
    location.state?.selectedPlan ||
    inviteOnboarding?.selectedPlan ||
    "basic"
  ) as PlanType;
  const workspaceCount = getWorkspaceCount(
    (auth.user as { workspaceCount?: number } | null)?.workspaceCount,
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

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

      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 md:pt-9 pb-8">
        <div className="w-full max-w-[900px] mx-auto">
          <div className="mb-6 sm:mb-8 max-w-[900px] mx-auto">
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
                  <span className="text-sm font-bold text-[#233552]">Plans</span>
                  <span className="text-[11px] text-[#6d9bff] font-semibold">Current step</span>
                </div>
              </div>
              <div className="hidden md:block flex-1 h-px bg-[#2d67f0] mx-4 md:mx-6" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-[#c8cfda] bg-transparent text-[#c8cfda] text-sm font-bold flex items-center justify-center">
                  3
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-[#233552]">Finalize Setup</span>
                  <span className="text-[11px] text-[#9aa8bc] font-semibold">Next</span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-[900px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-4">
            {PLAN_UI_DATA.map((plan) => {
              const isSelected = selectedPlan === plan.key;
              return (
                <div
                  key={plan.key}
                  className="relative overflow-hidden rounded-[38px] bg-[#eef2f7] p-4 md:p-4 flex flex-col min-h-[440px] shadow-[0_4px_18px_rgba(15,27,53,0.05)] border"
                  style={
                    isSelected
                      ? {
                          borderRadius: "40px",
                          borderColor: "#1d9ae8",
                          borderWidth: "3px",
                          boxShadow:
                            "0 10px 30px rgba(29, 154, 232, 0.16), 0 0 0 1px rgba(29, 154, 232, 0.18)",
                        }
                      : {
                          borderRadius: "40px",
                          borderColor: "#d9e1ec",
                          borderWidth: "1px",
                        }
                  }
                >
                  <h3 className="text-[22px] md:text-[18px] lg:text-[15px] font-bold text-[#0f1b35] text-center mt-2">
                    {plan.title}
                  </h3>
                  <p className="text-[11px] md:text-[10px] lg:text-[10px] text-[#667791] text-center mt-3 min-h-[36px]">
                    {plan.subtitle}
                  </p>

                  <p className="text-center mt-3 mb-3 text-[#0f1b35] font-bold text-[26px] md:text-[24px] lg:text-[26px]">
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
                                className={
                                  isSelected ? "text-[#23c35c]" : "text-[#a8b4c7]"
                                }
                              />
                              <span className="text-[11px] font-semibold text-[#304766]">
                                {group.title}
                              </span>
                            </div>
                            <div className="flex items-center">
                              {isOpen ? (
                                <ChevronDown size={14} className="text-[#607089]" />
                              ) : (
                                <ChevronRight size={14} className="text-[#607089]" />
                              )}
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-3 pb-2 space-y-1">
                              {group.items?.map((item) => (
                                <div key={item} className="flex items-start gap-2">
                                  <span className="mt-0.5">
                                    <CheckCircle2
                                      size={14}
                                      className={
                                        isSelected ? "text-[#23c35c]" : "text-[#a8b4c7]"
                                      }
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
                                          className={
                                            isSelected ? "text-[#23c35c]" : "text-[#a8b4c7]"
                                          }
                                        />
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
                                            <span className="mt-0.5">
                                              <CheckCircle2
                                                size={13}
                                                className={
                                                  isSelected
                                                    ? "text-[#23c35c]"
                                                    : "text-[#a8b4c7]"
                                                }
                                              />
                                            </span>
                                            <span className="text-[11px] text-[#4f627d]">
                                              {item}
                                            </span>
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

                  <div className="h-px bg-[#d8e0ea] mt-3 mb-2" />
                  <p className="text-[11px] text-[#9aa8bc] text-center mb-2">{plan.note}</p>

                  <button
                    type="button"
                    className="w-full h-11 rounded-full text-[16px] font-semibold border transition-colors"
                    style={
                      isSelected
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
                    {isSelected ? "Current Plan" : "Upgrade Plan"}
                  </button>
                </div>
              );
            })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#e1e6ef] mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 max-w-[900px] mx-auto">
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
              onClick={() =>
                navigate("/create-workspace/finalize", {
                  state: {
                    workspaceDetails,
                    selectedPlan,
                    workspaceCount,
                  },
                })
              }
              className="h-10 w-full sm:w-auto px-7 rounded-xl bg-[#2d67f0] hover:bg-[#2558d5] transition-colors text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SetupModulesPage;
