export type ChatbotFlowItem = {
  id: string;
  generalQuestion: string;
  followUpQuestions: string[];
  showCustomerSupportWhen: string[];
};

export const chatbotFlow: ChatbotFlowItem[] = [
  {
    id: "services",
    generalQuestion: "What services do you offer?",
    followUpQuestions: [
      "Can you explain which plan is best for a small business?",
      "What is included in the basic plan?",
      "Do you offer a demo or trial?",
    ],
    showCustomerSupportWhen: [
      "The user asks for custom pricing.",
      "The user still does not understand the plan differences after 2 to 3 replies.",
    ],
  },
  {
    id: "pricing",
    generalQuestion: "How much does it cost?",
    followUpQuestions: [
      "Do you have monthly and yearly pricing?",
      "Are there any setup charges?",
      "Is there a discount for multiple users?",
    ],
    showCustomerSupportWhen: [
      "Pricing depends on a custom requirement.",
      "The user asks for a formal quote.",
    ],
  },
  {
    id: "signup",
    generalQuestion: "How do I sign up?",
    followUpQuestions: [
      "What details do I need to register?",
      "Will I get a verification email or OTP?",
      "Can I sign up as a company or individual?",
    ],
    showCustomerSupportWhen: [
      "Signup fails more than once.",
      "OTP or email verification is not working after retry.",
    ],
  },
  {
    id: "login",
    generalQuestion: "I cannot log in.",
    followUpQuestions: [
      "Are you seeing an invalid password error or OTP issue?",
      "Did you forget your password?",
      "Are you trying to log in with email, phone, or Google?",
    ],
    showCustomerSupportWhen: [
      "The issue remains after password reset or retry.",
      "The account seems locked or inaccessible.",
    ],
  },
  {
    id: "feature",
    generalQuestion: "How does this feature work?",
    followUpQuestions: [
      "Do you want a basic overview or step-by-step guide?",
      "Are you using this as an admin, manager, or employee?",
      "Are you trying to set it up or just use it?",
    ],
    showCustomerSupportWhen: [
      "The feature depends on role-specific access.",
      "The user says the feature is missing or not visible.",
    ],
  },
  {
    id: "error",
    generalQuestion: "Why am I getting this error?",
    followUpQuestions: [
      "What exact error message do you see?",
      "When does it happen?",
      "Did this work before or is this your first time trying it?",
    ],
    showCustomerSupportWhen: [
      "The same error continues after basic troubleshooting.",
      "The error looks account-specific or technical.",
    ],
  },
  {
    id: "upgrade",
    generalQuestion: "Can I change my subscription or upgrade?",
    followUpQuestions: [
      "Which plan are you on now?",
      "Which plan do you want to move to?",
      "Do you want to upgrade immediately or next billing cycle?",
    ],
    showCustomerSupportWhen: [
      "Billing adjustment is needed.",
      "Upgrade rules depend on account history.",
    ],
  },
  {
    id: "contact",
    generalQuestion: "How do I contact someone?",
    followUpQuestions: [
      "Do you need technical help, billing help, or sales help?",
      "Is this urgent?",
      "Would you like chat, email, or call support?",
    ],
    showCustomerSupportWhen: [
      "Show customer support immediately because the user is asking for human help.",
    ],
  },
];

export const supportTriggerRules = [
  "Show Customer Support after 2 to 3 follow-up answers if the issue is still not solved.",
  "Show Customer Support if the user repeats the same issue.",
  "Show Customer Support for billing, account access, or custom setup questions.",
  "Show Customer Support if the bot cannot confidently answer.",
  "Show Customer Support if the user asks for a human.",
];

export const initialSuggestionQuestions = chatbotFlow.map(
  (item) => item.generalQuestion
);
