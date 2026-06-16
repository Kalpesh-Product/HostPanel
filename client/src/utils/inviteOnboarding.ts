export type PlanType = "basic" | "professional" | "custom";
export type InviteType = "master" | "workspace";

export interface InviteOnboardingState {
  source: "invite";
  email: string;
  fullName: string;
  selectedPlan: PlanType;
  businessName: string;
  inviteType: InviteType;
  country: string;
  state: string;
  city: string;
  businessTypes: string[];
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
      typeof parsed.businessName !== "string" ||
      typeof parsed.country !== "string" ||
      typeof parsed.state !== "string" ||
      typeof parsed.city !== "string" ||
      !Array.isArray(parsed.businessTypes) ||
      (parsed.inviteType !== "master" && parsed.inviteType !== "workspace")
    ) {
      return null;
    }

    const normalizePlan = (plan: string): PlanType => {
      const lower = String(plan || "").trim().toLowerCase();
      if (lower === "basic") return "basic";
      if (lower === "professional") return "professional";
      if (lower === "custom" || lower === "customise" || lower === "customize" || lower === "customised" || lower === "customized") return "custom";
      return "basic";
    };

    const normalizedPlan = normalizePlan(parsed.selectedPlan);

    return {
      source: "invite",
      email: parsed.email,
      fullName: parsed.fullName,
      selectedPlan: normalizedPlan,
      businessName: parsed.businessName,
      inviteType: parsed.inviteType as InviteType,
      country: parsed.country,
      state: parsed.state,
      city: parsed.city,
      businessTypes: parsed.businessTypes
        .map((item) => String(item || "").trim())
        .filter(Boolean),
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
