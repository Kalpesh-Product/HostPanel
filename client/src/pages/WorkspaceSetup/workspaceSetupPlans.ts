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
        title: "Included Features",
        items: [
          "Static Website (Desktop & Mobile)",
          "Admin Control Panel",
          "Smart Lead Management",
          "Organization Management",
          "Access Grants",
          "Visitor Management (Standard Visitor)",
          "Built-in AI Chat",
          "Customer Support",
          "Cloud Storage",
          "Up to 2 Users",
        ],
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
        title: "Included Features",
        items: [
          "Everything in BASIC +",
          "Transactional Website",
          "Payment Gateway",
          "Advanced Sales Module",
          "Meeting Room Booking System",
          "Visitor Management",
          "Integrated Ticketing System",
          "Smart Calendar",
          "Unit Setting",
          "Unit Management",
          "Up to 5 Users",
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
        title: "Included Features",
        items: [
          "Everything in PROFESSIONAL +",
          "Advanced Booking Engine",
          "Custom Native Applications",
          "End-to-End Finance Suite",
          "HR Management System (HRMS)",
          "IT Infrastructure Module",
          "Maintenance Management Module",
          "AI-Driven Lead Generation",
          "AI Customer Experience Agent",
          "AI Sales Automation",
          "AI SEO & Growth Engine",
          "Custom-Built Technology Stack",
          "Unlimited Users",
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
