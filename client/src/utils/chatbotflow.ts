export type ChatbotFollowUpStep = {
  question: string;
  answers: string[];
};

export type ChatbotFlowItem = {
  id: string;
  generalQuestion: string;
  followUpSteps: ChatbotFollowUpStep[];
};

export const chatbotFlow: ChatbotFlowItem[] = [
  {
    id: "getting-started",
    generalQuestion: "How do I get started?",
    followUpSteps: [
      {
        question: "Are you trying to create a new account or use an existing one?",
        answers: ["Create a new account", "Use existing account", "Not sure"],
      },
      {
        question: "Which step are you currently on?",
        answers: ["Sign up", "Verification", "Login", "Dashboard access"],
      },
      {
        question: "What result are you expecting to see?",
        answers: ["Account created", "Access granted", "Setup completed", "Something else"],
      },
    ],
  },
  {
    id: "plans-pricing",
    generalQuestion: "Can you explain plans or pricing?",
    followUpSteps: [
      {
        question: "Are you comparing plans, billing cycles, or included features?",
        answers: ["Plans", "Billing cycles", "Included features", "All of these"],
      },
      {
        question: "Do you need pricing for personal use, team use, or enterprise use?",
        answers: ["Personal", "Team", "Enterprise", "Not sure"],
      },
      {
        question: "Are you looking for monthly cost, annual cost, or both?",
        answers: ["Monthly", "Annual", "Both"],
      },
    ],
  },
  {
    id: "account-access",
    generalQuestion: "I need help with account access.",
    followUpSteps: [
      {
        question: "Are you unable to sign in, verify your account, or reset credentials?",
        answers: ["Sign in", "Verification", "Reset credentials", "All of these"],
      },
      {
        question: "Do you see an error message during access?",
        answers: ["Yes", "No", "Not sure"],
      },
      {
        question: "Did this issue start recently or has it never worked?",
        answers: ["Started recently", "Never worked", "Not sure"],
      },
    ],
  },
  {
    id: "feature-guidance",
    generalQuestion: "How does a specific feature work?",
    followUpSteps: [
      {
        question: "Which feature are you trying to use?",
        answers: ["Dashboard", "Reports", "Billing", "Another feature"],
      },
      {
        question: "Do you want a quick overview or step-by-step instructions?",
        answers: ["Quick overview", "Step-by-step instructions"],
      },
      {
        question: "Are you setting it up for the first time or troubleshooting it?",
        answers: ["First-time setup", "Troubleshooting", "Both"],
      },
    ],
  },
  {
    id: "technical-issue",
    generalQuestion: "I am seeing an error or technical issue.",
    followUpSteps: [
      {
        question: "What exact message or behavior are you seeing?",
        answers: ["Login error", "Page not loading", "Something broke", "Not sure"],
      },
      {
        question: "When does the issue happen?",
        answers: ["At login", "During setup", "While using a feature", "All the time"],
      },
      {
        question: "Does it happen every time or only sometimes?",
        answers: ["Every time", "Sometimes", "Only once so far"],
      },
    ],
  },
  {
    id: "billing-subscription",
    generalQuestion: "Can I update my billing or subscription?",
    followUpSteps: [
      {
        question: "Are you trying to upgrade, downgrade, renew, or cancel?",
        answers: ["Upgrade", "Downgrade", "Renew", "Cancel"],
      },
      {
        question: "When do you want this change to take effect?",
        answers: ["Immediately", "Next billing cycle", "Not sure"],
      },
      {
        question: "Are you asking about charges, invoices, or payment methods?",
        answers: ["Charges", "Invoices", "Payment methods", "All of these"],
      },
    ],
  },
  {
    id: "integrations-setup",
    generalQuestion: "Can you help me connect tools or integrations?",
    followUpSteps: [
      {
        question: "Which integration are you trying to connect?",
        answers: ["Email", "CRM", "Payments", "Another integration"],
      },
      {
        question: "Are you at the authorization step or configuration step?",
        answers: ["Authorization", "Configuration", "Not sure"],
      },
      {
        question: "Do you see any connection or permission error?",
        answers: ["Connection error", "Permission error", "No error", "Not sure"],
      },
    ],
  },
  {
    id: "contact-support",
    generalQuestion: "How can I contact support?",
    followUpSteps: [
      {
        question: "Is this a technical, billing, or account-related request?",
        answers: ["Technical", "Billing", "Account-related", "Other"],
      },
      {
        question: "Is this urgent or blocking your work right now?",
        answers: ["Urgent", "Blocking work", "Not urgent"],
      },
      {
        question: "Do you prefer chat, email, or callback support?",
        answers: ["Chat", "Email", "Callback"],
      },
    ],
  },
];
