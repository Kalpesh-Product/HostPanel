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
  generalQuestion: string;
  initialResponse: string;
  firstStepId: string;
  followUpSteps: ChatbotFollowUpStep[];
};

export const chatbotFlow: ChatbotFlowItem[] = [
  {
    id: "getting-started",
    generalQuestion: "How do I get started?",
    initialResponse: "Welcome! I can help you get set up in just a few steps.",
    firstStepId: "account-type",
    followUpSteps: [
      {
        id: "account-type",
        question: "Are you trying to create a new account or use an existing one?",
        answers: [
          { text: "Create a new account", nextStepId: "sign-up-method", response: "Excellent! Let's get you on board." },
          { text: "Use existing account", nextStepId: "login-help", response: "Glad to have you back." },
          { text: "Not sure", nextStepId: "general-overview", response: "No problem, let's figure it out together." }
        ]
      },
      {
        id: "sign-up-method",
        question: "Would you like to sign up with Email or Google?",
        answers: [
          { text: "Email", isTerminal: true, response: "Great choice. Just head to the Sign Up page and enter your details. Check your inbox for a verification code!", action: 'docs' },
          { text: "Google", isTerminal: true, response: "Fast and easy! Just click 'Continue with Google' on the Sign Up page.", action: 'docs' }
        ]
      },
      {
        id: "login-help",
        question: "What issue are you facing with your existing account?",
        answers: [
          { text: "Forgot Password", isTerminal: true, response: "You can reset your password by clicking 'Forgot Password' on the login screen.", action: 'link' },
          { text: "Verification Code", isTerminal: true, response: "Check your spam folder. If it's not there, I can connect you to support.", action: 'support' }
        ]
      }
    ],
  },
  {
    id: "resource-pricing",
    generalQuestion: "Can you explain plans or pricing?",
    initialResponse: "We have flexible plans designed for every stage of growth.",
    firstStepId: "user-type",
    followUpSteps: [
      {
        id: "user-type",
        question: "Who is this plan for?",
        answers: [
          { text: "Just me (Personal)", nextStepId: "personal-details", response: "Our Personal plan is perfect for individuals." },
          { text: "My Team", nextStepId: "team-details", response: "Great! We offer collaborative features for teams." },
          { text: "Enterprise", isTerminal: true, response: "For Enterprise, we provide custom quotes and dedicated support.", action: 'support' }
        ]
      },
      {
        id: "personal-details",
        question: "Are you looking for monthly or annual billing?",
        answers: [
          { text: "Monthly", isTerminal: true, response: "The Personal plan is /month billed monthly." },
          { text: "Annual", isTerminal: true, response: "The Personal plan is /month billed annually (Save 20%!)." }
        ]
      }
    ],
  },
  {
    id: "technical-issue",
    generalQuestion: "I am seeing an error or technical issue.",
    initialResponse: "I'm sorry to hear that. Let's troubleshoot this quickly.",
    firstStepId: "issue-type",
    followUpSteps: [
      {
        id: "issue-type",
        question: "What seems to be the problem?",
        answers: [
          { text: "Page not loading", nextStepId: "browser-check", response: "That's frustrating. Let's check a few things." },
          { text: "Button not working", nextStepId: "specific-page", response: "I see. Which page are you on?" },
          { text: "Something else", isTerminal: true, response: "This might be a unique issue. Let's get a human to help.", action: 'support' }
        ]
      },
      {
        id: "browser-check",
        question: "Have you tried clearing your browser cache or using Incognito mode?",
        answers: [
          { text: "Yes, still broken", isTerminal: true, response: "Okay, I'll escalate this to our technical team.", action: 'support' },
          { text: "I'll try that now", isTerminal: true, response: "Sounds good! If it doesn't work, come back and let me know." }
        ]
      }
    ],
  },
  {
    id: "contact-support",
    generalQuestion: "How can I contact support?",
    initialResponse: "Our support team is always ready to help.",
    firstStepId: "support-channel",
    followUpSteps: [
      {
        id: "support-channel",
        question: "How would you prefer to reach us?",
        answers: [
          { text: "Live Chat", isTerminal: true, response: "Our live chat is available 24/7. Connecting you now...", action: 'support' },
          { text: "Email", isTerminal: true, response: "You can email us at support@wono.com. We usually reply within 2 hours.", action: 'docs' },
          { text: "Callback", isTerminal: true, response: "Please leave your number and we will call you back shortly.", action: 'support' }
        ]
      }
    ],
  }
];
