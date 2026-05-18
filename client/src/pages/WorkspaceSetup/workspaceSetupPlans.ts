export type PlanType = "basic" | "professional" | "custom";

export type PlanCardData = {
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

export const PLAN_UI_DATA: PlanCardData[] = [
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
        items: ["Customer Support", "Visitor Management", "Chat Bot"],
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
        items: ["All Company Settings modules", "Customer Support", "Visitor Management", "Chat Bot"],
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

export const getUpgradePlanOptions = (plan: PlanType): PlanCardData[] => {
  if (plan === "basic") {
    return PLAN_UI_DATA.filter(
      ({ key }) => key === "professional" || key === "custom",
    );
  }

  if (plan === "professional") {
    return PLAN_UI_DATA.filter(({ key }) => key === "custom");
  }

  return [];
};
