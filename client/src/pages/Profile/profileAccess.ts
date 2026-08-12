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

export type CompanyProfileAccessContext = {
  roleBand?: string | null;
  departmentNames?: string[] | null;
};

const CUSTOM_ONLY_TAB_IDS = new Set<ProfileTabId>([
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
    label: "Resignation Request",
    route: "/profile/resignation-request",
    unlocked: false,
  },
];

export const canAccessCompanyProfile = ({
  roleBand,
  departmentNames,
}: CompanyProfileAccessContext): boolean => {
  const normalizedRole = String(roleBand || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const isFounderOrSuperAdmin = ["owner", "founder", "super_admin", "superadmin"].includes(normalizedRole);
  const isHrManager = normalizedRole === "manager" && (departmentNames || []).some(
    (name) => String(name || "").trim().toLowerCase() === "hr",
  );

  return isFounderOrSuperAdmin || isHrManager;
};

export const getProfileTabItemsForPlan = (
  plan?: string | null,
  access?: CompanyProfileAccessContext,
): ProfileTabItem[] => {
  const normalizedPlan = String(plan || "basic").trim().toLowerCase();

  return PROFILE_TAB_ITEMS
    .filter((item) => item.id !== "company-profile" || !access || canAccessCompanyProfile(access))
    .filter((item) => normalizedPlan === "custom" || !CUSTOM_ONLY_TAB_IDS.has(item.id))
    .map((item) => ({ ...item, unlocked: true }));
};

export const isProfileTabUnlockedForPlan = (plan: string | null | undefined, tabId: ProfileTabId) =>
  String(plan || "basic").trim().toLowerCase() === "custom" || !CUSTOM_ONLY_TAB_IDS.has(tabId);
