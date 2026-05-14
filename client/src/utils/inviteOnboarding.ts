export type PlanType = "basic" | "professional" | "custom";

export interface InviteOnboardingState {
  source: "invite";
  email: string;
  fullName: string;
  selectedPlan: PlanType;
  businessName: string;
}

const INVITE_ONBOARDING_KEY = "invite_onboarding";

export const readInviteOnboardingState = (): InviteOnboardingState | null => {
  try {
    const raw = localStorage.getItem(INVITE_ONBOARDING_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<InviteOnboardingState>;
    if (
      parsed?.source !== "invite" ||
      typeof parsed.email !== "string" ||
      typeof parsed.fullName !== "string" ||
      typeof parsed.selectedPlan !== "string" ||
      typeof parsed.businessName !== "string"
    ) {
      return null;
    }

    if (!["basic", "professional", "custom"].includes(parsed.selectedPlan)) {
      return null;
    }

    return {
      source: "invite",
      email: parsed.email,
      fullName: parsed.fullName,
      selectedPlan: parsed.selectedPlan as PlanType,
      businessName: parsed.businessName,
    };
  } catch {
    return null;
  }
};

export const writeInviteOnboardingState = (state: InviteOnboardingState) => {
  localStorage.setItem(INVITE_ONBOARDING_KEY, JSON.stringify(state));
};

export const clearInviteOnboardingState = () => {
  localStorage.removeItem(INVITE_ONBOARDING_KEY);
};

