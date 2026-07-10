export type ProfileTabId =
  | "company-profile"
  | "my-profile"
  | "change-password"
  | "assigned-assets"
  | "payslips"
  | "exit-request";

export type ProfileTabItem = {
  id: ProfileTabId;
  label: string;
  route: string;
  unlocked: boolean;
};

const BASIC_LOCKED_TAB_IDS = new Set<ProfileTabId>([
  "assigned-assets",
  "payslips",
  "exit-request",
]);

export const PROFILE_TAB_ITEMS: ProfileTabItem[] = [
  {
    id: "company-profile",
    label: "Company Profile",
    route: "/profile/company-profile",
    unlocked: true,
  },
  {
    id: "my-profile",
    label: "My Profile",
    route: "/profile/my-profile",
    unlocked: true,
  },
  {
    id: "change-password",
    label: "Change Password",
    route: "/profile/change-password",
    unlocked: true,
  },
  {
    id: "assigned-assets",
    label: "Assigned Assets",
    route: "/profile/assigned-assets",
    unlocked: false,
  },
  {
    id: "payslips",
    label: "Payslips",
    route: "/profile/payslips",
    unlocked: false,
  },
  {
    id: "exit-request",
    label: "Exit Request",
    route: "/profile/exit-request",
    unlocked: false,
  },
];

export const getProfileTabItemsForPlan = (plan?: string | null): ProfileTabItem[] => {
  const normalizedPlan = String(plan || "basic").trim().toLowerCase();

  return PROFILE_TAB_ITEMS.map((item) => ({
    ...item,
    unlocked: normalizedPlan !== "basic" || !BASIC_LOCKED_TAB_IDS.has(item.id),
  }));
};

export const isProfileTabUnlockedForPlan = (plan: string | null | undefined, tabId: ProfileTabId) =>
  String(plan || "basic").trim().toLowerCase() !== "basic" || !BASIC_LOCKED_TAB_IDS.has(tabId);
