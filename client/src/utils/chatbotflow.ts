import type { PlanType } from "./inviteOnboarding";

// Special response marker: replaced at render time with a live description
// of the caller's actual plan (see getPlanSummary in AiChat.tsx), since the
// real answer depends on which workspace is asking, not static copy.
export const DYNAMIC_PLAN_SUMMARY = "__DYNAMIC_PLAN_SUMMARY__";

export type ChatbotAnswer = {
  text: string;
  nextStepId?: string;
  response?: string;
  isTerminal?: boolean; // If true, this ends the flow (e.g., provides a solution)
  action?: 'support' | 'docs' | 'link';
};

export type ChatbotFollowUpStep = {
  id: string;
  question: string;
  answers: ChatbotAnswer[];
};

export type ChatbotFlowItem = {
  id: string;
  // Which plan tiers see this topic as an opening option. Content is
  // authored per-tier against server/config/workspaceModuleCatalog.ts, so a
  // Basic host isn't shown Professional/Custom-only capabilities and vice
  // versa. Source content sheet: HostPanel_AI_Chatbot_QA.csv.
  plans: PlanType[];
  // Optional page-scoping: path prefixes (matched against
  // location.pathname) where this question is relevant. If set, the flow
  // ONLY appears while the host is on one of these pages, and is pinned
  // above the general (unscoped) flows in the opening list. If omitted, the
  // flow is available everywhere, as before.
  pageRoutes?: string[];
  generalQuestion: string;
  initialResponse: string;
  firstStepId: string;
  followUpSteps: ChatbotFollowUpStep[];
};

const ALL_PLANS: PlanType[] = ["basic", "professional", "custom"];

export const chatbotFlow: ChatbotFlowItem[] = [
  {
    id: "getting-started",
    plans: ALL_PLANS,
    generalQuestion: "How do I get started with HostPanel?",
    initialResponse: "Welcome! I can help you get set up in a few steps.",
    firstStepId: "account-setup",
    followUpSteps: [
      {
        id: "account-setup",
        question: "Are you setting up a new workspace or joining an existing team?",
        answers: [
          { text: "Setting up a new workspace", nextStepId: "new-workspace-help", response: "Great — let's get your workspace ready." },
          { text: "Joining an existing team", nextStepId: "join-team-help", response: "Got it — let's get you connected." },
          { text: "Not sure", isTerminal: true, response: "No problem — you'll receive an email invite from Wono to either create your own workspace or join one." }
        ]
      },
      {
        id: "new-workspace-help",
        question: "Have you received your invite email from Wono?",
        answers: [
          { text: "Yes, I have the invite link", isTerminal: true, response: "Open the link, verify your email/mobile with the OTP sent to you, then complete the Workspace Setup step to create your company profile.", action: 'docs' },
          { text: "No, I haven't received it", isTerminal: true, response: "Let's check on that for you.", action: 'support' }
        ]
      },
      {
        id: "join-team-help",
        question: "What issue are you having joining?",
        answers: [
          { text: "I don't have an invite link", isTerminal: true, response: "Your team's founder or admin needs to send you an invite from Organization Management.", action: 'support' },
          { text: "My invite link expired", isTerminal: true, response: "Invite links expire after 7 days by default.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "login-issues",
    plans: ALL_PLANS,
    generalQuestion: "I can't log in / forgot my password",
    initialResponse: "Let's get you back in — HostPanel uses OTP-based login, not a traditional password reset.",
    firstStepId: "login-problem",
    followUpSteps: [
      {
        id: "login-problem",
        question: "What's happening exactly?",
        answers: [
          { text: "I don't know my password", isTerminal: true, response: "You don't need one — click 'Login with OTP' and verify with the email or mobile you registered with.", action: 'docs' },
          { text: "OTP isn't arriving", nextStepId: "otp-troubleshoot", response: "Let's troubleshoot that." },
          { text: "Account locked / other error", isTerminal: true, response: "That needs a closer look from our team.", action: 'support' }
        ]
      },
      {
        id: "otp-troubleshoot",
        question: "Have you checked spam and confirmed the email/mobile is correct?",
        answers: [
          { text: "Yes, still nothing", isTerminal: true, response: "Let's get support to resend or check your account.", action: 'support' },
          { text: "I'll check and try again", isTerminal: true, response: "Sounds good — OTPs can take up to 2 minutes to arrive." }
        ]
      }
    ],
  },
  {
    id: "plan-billing",
    plans: ALL_PLANS,
    generalQuestion: "I have a question about my plan or billing",
    initialResponse: "Happy to help with plan and billing details.",
    firstStepId: "plan-billing-topic",
    followUpSteps: [
      {
        id: "plan-billing-topic",
        question: "What would you like to know?",
        answers: [
          { text: "What's included in my current plan", isTerminal: true, response: DYNAMIC_PLAN_SUMMARY },
          { text: "How do I upgrade my plan", isTerminal: true, response: "You can request an upgrade from Company Settings, or I can connect you with our team.", action: 'support' },
          { text: "Billing or payment issue", isTerminal: true, response: "Let's get our billing team to help directly.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "basic-visitor-management",
    plans: ["basic"],
    pageRoutes: ["/visitors/visitor-management"],
    generalQuestion: "How do I log a visitor?",
    initialResponse: "Visitor Management on the Basic plan covers standard front-desk logging.",
    firstStepId: "basic-visitor-need",
    followUpSteps: [
      {
        id: "basic-visitor-need",
        question: "What do you need to do?",
        answers: [
          { text: "Log a new visitor", isTerminal: true, response: "Go to Visitor Management > Daily tab > New Entry, fill in the visitor's details, and check them in.", action: 'docs' },
          { text: "View visitor history", isTerminal: true, response: "Open Visitor Management > History tab to see all past check-ins.", action: 'docs' },
          { text: "I need bookings or external client tracking", isTerminal: true, response: "Those tools are part of the Professional plan.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "basic-website-builder",
    plans: ALL_PLANS,
    pageRoutes: ["/company-settings/website-builder"],
    generalQuestion: "How do I edit my website or see leads?",
    initialResponse: "You can manage your site from Website Builder.",
    firstStepId: "basic-website-need",
    followUpSteps: [
      {
        id: "basic-website-need",
        question: "What do you want to do?",
        answers: [
          { text: "Edit site content or design", isTerminal: true, response: "Go to Company Settings > Website Builder to update your pages, images, and content.", action: 'docs' },
          { text: "See leads from my website", isTerminal: true, response: "Open Company Settings > Website Builder > Leads to view form submissions from your site.", action: 'docs' },
          { text: "My website isn't showing changes", isTerminal: true, response: "Let's get that checked.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "basic-team-users",
    plans: ["basic"],
    pageRoutes: ["/company-settings/organization-management"],
    generalQuestion: "How do I add a team member?",
    initialResponse: "On the Basic plan, the founder can add exactly one additional user.",
    firstStepId: "basic-team-need",
    followUpSteps: [
      {
        id: "basic-team-need",
        question: "What's your situation?",
        answers: [
          { text: "I want to add my one additional user", isTerminal: true, response: "Go to Organization Management > Users > Invite, and assign them the Super Admin role — Basic allows one Super Admin invite.", action: 'docs' },
          { text: "I need more than 2 users total", isTerminal: true, response: "That needs a Professional or Custom plan.", action: 'support' },
          { text: "My invite isn't working", isTerminal: true, response: "Let's get that looked into.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "basic-org-access",
    plans: ALL_PLANS,
    pageRoutes: ["/company-settings/organization-management", "/company-settings/access-grants"],
    generalQuestion: "What are Departments and Access Grants?",
    initialResponse: "These control who can see and manage what inside your workspace.",
    firstStepId: "basic-org-need",
    followUpSteps: [
      {
        id: "basic-org-need",
        question: "What do you need help with?",
        answers: [
          { text: "Setting up a department", isTerminal: true, response: "Go to Organization Management > Departments > Create Department, then assign a manager and modules.", action: 'docs' },
          { text: "Understanding Access Grants", isTerminal: true, response: "The founder or super admin can fine-tune exactly which modules a specific member can access, beyond their department's default.", action: 'docs' }
        ]
      }
    ],
  },
  {
    id: "pro-visitor-management-full",
    plans: ["professional", "custom"],
    pageRoutes: ["/visitors/visitor-management"],
    generalQuestion: "How do I manage bookings or external client visitors?",
    initialResponse: "Professional unlocks full Visitor Management — bookings, client tracking, and workspace tours.",
    firstStepId: "pro-visitor-need",
    followUpSteps: [
      {
        id: "pro-visitor-need",
        question: "What do you need?",
        answers: [
          { text: "Book a visitor or walk-in", isTerminal: true, response: "Use Visitor Management > New Frontdesk Action > Walk-in Booking or Verify Booking.", action: 'docs' },
          { text: "Manage external clients", isTerminal: true, response: "Open Visitor Management > Clients tab to track external client visits separately from staff or tenants.", action: 'docs' },
          { text: "Something isn't working", isTerminal: true, response: "Let's get that checked by our team.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "pro-calendar-units",
    plans: ["professional", "custom"],
    pageRoutes: ["/calendar", "/company-settings/workspace-settings", "/company-settings/workspace-management"],
    generalQuestion: "How do I use Calendar or manage my Units?",
    initialResponse: "Professional includes Calendar and Unit Settings/Management.",
    firstStepId: "pro-calendar-need",
    followUpSteps: [
      {
        id: "pro-calendar-need",
        question: "What are you trying to do?",
        answers: [
          { text: "Schedule or view events", isTerminal: true, response: "Open Calendar from the sidebar to view and create events for your workspace.", action: 'docs' },
          { text: "Manage unit/workspace settings", isTerminal: true, response: "Go to Company Settings > Unit Settings or Unit Management to configure your space.", action: 'docs' },
          { text: "Something isn't working", isTerminal: true, response: "Let's get that checked.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "pro-in-development",
    plans: ["professional", "custom"],
    generalQuestion: "Where are Tickets, Meeting Room Booking, or Sales tools?",
    initialResponse: "These are part of Professional, but a few are still being finished on our side.",
    firstStepId: "pro-dev-need",
    followUpSteps: [
      {
        id: "pro-dev-need",
        question: "Which one are you looking for?",
        answers: [
          { text: "Tickets / support ticketing", isTerminal: true, response: "Ticketing is being finalized and will be enabled soon — for now, please use Customer Support to log any issue.", action: 'support' },
          { text: "Meeting Room Booking", isTerminal: true, response: "Meeting Room Booking is coming soon — I can flag that you're waiting on this.", action: 'support' },
          { text: "Sales tools (Leads / Tenant Companies / Pricing)", isTerminal: true, response: "The Sales module is still in development.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "custom-plan-explainer",
    plans: ["custom"],
    generalQuestion: "What does the Custom plan include?",
    initialResponse: "Custom is Professional plus any extra modules chosen specifically for your business.",
    firstStepId: "custom-explain-need",
    followUpSteps: [
      {
        id: "custom-explain-need",
        question: "What would you like to know?",
        answers: [
          { text: "What extra modules can I get", isTerminal: true, response: "Custom can add HR, Finance, Maintenance, IT, Analytics, Inventory, and Assets management on top of Professional — some are still in active development.", action: 'docs' },
          { text: "How do I request a new module", isTerminal: true, response: "Module requests are scoped and enabled by our team.", action: 'support' },
          { text: "Why don't I see a module I was promised", isTerminal: true, response: "Let's check what's enabled for your workspace.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "custom-in-development",
    plans: ["custom"],
    generalQuestion: "I can't find HR, Finance, Maintenance, IT, or Analytics tools",
    initialResponse: "These department modules are part of Custom but are still being built.",
    firstStepId: "custom-dev-need",
    followUpSteps: [
      {
        id: "custom-dev-need",
        question: "Which one are you asking about?",
        answers: [
          { text: "HR (Employee / Payroll / Leave / Recruitment)", isTerminal: true, response: "The HR suite is in active development.", action: 'support' },
          { text: "Finance (Budget / Billing / Accounting)", isTerminal: true, response: "The Finance suite is in active development.", action: 'support' },
          { text: "Maintenance / IT (Repair logs, AMC)", isTerminal: true, response: "These modules are in active development.", action: 'support' },
          { text: "Analytics", isTerminal: true, response: "Analytics is in active development.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "custom-assets",
    plans: ["custom"],
    pageRoutes: ["/extra-common-modules/assets"],
    generalQuestion: "How do I use Asset Management?",
    initialResponse: "Assets is available as a Custom add-on.",
    firstStepId: "custom-assets-need",
    followUpSteps: [
      {
        id: "custom-assets-need",
        question: "What do you need?",
        answers: [
          { text: "Add or track an asset", isTerminal: true, response: "Go to Extra Common Modules > Assets to add and track company assets.", action: 'docs' },
          { text: "I don't see the Assets module", isTerminal: true, response: "Assets needs to be enabled for your workspace by our team.", action: 'support' }
        ]
      }
    ],
  }
];

export const getPlanSummary = (plan: PlanType): string => {
  if (plan === "professional") {
    return "You're on the Professional plan: everything in Basic, plus full Visitor Management (bookings & external clients), Calendar, Unit Settings/Management, and the Sales suite (some parts still rolling out).";
  }
  if (plan === "custom") {
    return "You're on the Custom plan: everything in Professional, plus whatever additional modules (e.g. Assets, HR, Finance, Maintenance, IT, Analytics) our team has enabled specifically for your workspace.";
  }
  return "You're on the Basic plan: Dashboard, Customer Support, standard Visitor Management, Website Builder & Leads, Wono Nomad, Organization Management (founder + 1 additional user), and Access Grants.";
};
