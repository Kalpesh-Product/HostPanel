import {
  BadgeCheck,
  BadgeIndianRupee,
  Building2,
  CreditCard,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import PageFrame from "../../components/Pages/PageFrame";
import profileDashboardBanner from "../../assets/profile-dashboard-banner.png";
import useAuth from "../../hooks/useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { getAssets } from "../../services/assets";
import { getMyPayslips } from "../../services/finance";
import {
  DashboardBanner,
  DashboardSection,
  DashboardStatTile,
} from "../Administration/AdministrationModuleDashboardShared";
import { getProfileTabItemsForPlan, type ProfileTabId } from "./profileAccess";

const ICONS: Record<ProfileTabId, typeof UserRound> = {
  "company-profile": Building2,
  "my-profile": UserRound,
  "change-password": KeyRound,
  "assigned-assets": PackageCheck,
  payslips: BadgeIndianRupee,
  "exit-request": LogOut,
  "plan-billing": CreditCard,
};

const MODULE_COPY: Record<ProfileTabId, string> = {
  "company-profile": "Maintain unit identity, branding, location and unit preferences",
  "my-profile": "Review personal, contact and employment information",
  "change-password": "Update account credentials and password security",
  "assigned-assets": "View equipment and assets currently assigned to you",
  payslips: "Open available salary statements and payroll records",
  "exit-request": "Submit and track your resignation request workflow",
  "plan-billing": "Review the active plan, billing cycle and renewals",
};

const MODULE_COLORS: Record<ProfileTabId, string> = {
  "company-profile": "#2563EB",
  "my-profile": "#0D9488",
  "change-password": "#7C3AED",
  "assigned-assets": "#EA580C",
  payslips: "#059669",
  "exit-request": "#E11D48",
  "plan-billing": "#0891B2",
};

const CUSTOM_MODULE_IDS = new Set<ProfileTabId>([
  "assigned-assets",
  "payslips",
  "exit-request",
]);

const titleCase = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex min-h-[66px] items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-pmedium uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-[11px] font-pmedium text-slate-800">{value}</p>
    </div>
  </div>
);

export default function ProfileDashboard() {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const { plan, roleBand, departmentNames, isLoading } = useDashboardAccess();
  const user = (auth?.user || {}) as Record<string, any>;
  const normalizedPlan = String(plan || "basic").trim().toLowerCase();
  const displayName =
    String(user.name || "").trim() ||
    `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`.trim() ||
    "User";
  const email = String(user.email || "").trim() || "Not available";
  const phone = String(user.phone || user.mobile || "").trim() || "Not available";
  const rawRole = user.workspaceMembership?.role || user.role || roleBand || "member";
  const roleLabel = titleCase(String(rawRole).toLowerCase() === "owner" ? "founder" : rawRole);
  const departmentLabel =
    departmentNames.length > 0
      ? departmentNames.join(", ")
      : titleCase(user.department || user.departmentName || "Not assigned");
  const workspaceLabel = String(
    user.workspaceMembership?.workspaceName ||
      user.workspace?.businessName ||
      user.companyName ||
      user.tenantCompanyName ||
      "Current unit",
  ).trim();
  const locationLabel = String(
    user.workspace?.location || user.location || user.city || "Not available",
  ).trim();
  const modules = getProfileTabItemsForPlan(normalizedPlan, {
    roleBand,
    departmentNames,
  });
  const standardModules = modules.filter((item) => !CUSTOM_MODULE_IDS.has(item.id));
  const customModules = modules.filter((item) => CUSTOM_MODULE_IDS.has(item.id));
  const hasCustomProfileModules = customModules.length > 0;
  const userId = String(user._id || user.id || user.userId || "").trim();
  const profileFields = [displayName, email, phone, roleLabel, workspaceLabel];
  const completedFields = profileFields.filter(
    (value) => value && value !== "Not available" && value !== "Current unit",
  ).length;
  const profileReadiness = Math.round((completedFields / profileFields.length) * 100);
  const [customSummary, setCustomSummary] = useState<{
    assignedAssets: number | null;
    payslips: number | null;
    activeResignations: number | null;
  }>({ assignedAssets: null, payslips: null, activeResignations: null });
  const [isCustomSummaryLoading, setIsCustomSummaryLoading] = useState(false);

  useEffect(() => {
    if (!hasCustomProfileModules) {
      setCustomSummary({ assignedAssets: null, payslips: null, activeResignations: null });
      setIsCustomSummaryLoading(false);
      return;
    }

    let mounted = true;
    setIsCustomSummaryLoading(true);

    Promise.allSettled([
      getAssets(),
      getMyPayslips(),
      axiosPrivate.get("/api/hr/resignation-management/requests/me"),
    ]).then((results) => {
      if (!mounted) return;

      const [assetResult, payslipResult, resignationResult] = results;
      let assignedAssets: number | null = null;
      let payslips: number | null = null;
      let activeResignations: number | null = null;

      if (assetResult.status === "fulfilled") {
        const response = assetResult.value as any;
        const assets = Array.isArray(response?.data?.assets)
          ? response.data.assets
          : Array.isArray(response?.assets)
            ? response.assets
            : [];
        assignedAssets = assets.reduce((total: number, asset: any) => {
          const allocated = Array.isArray(asset?.allocations)
            ? asset.allocations
                .filter((allocation: any) => String(allocation?.userId || "") === userId)
                .reduce((sum: number, allocation: any) => sum + Number(allocation?.quantity || 0), 0)
            : 0;
          const legacyMatch =
            String(asset?.assignedToUserId || "") === userId ||
            String(asset?.assignedTo || "").trim().toLowerCase() === displayName.toLowerCase();
          return total + (allocated || (legacyMatch ? 1 : 0));
        }, 0);
      }

      if (payslipResult.status === "fulfilled") {
        const response = payslipResult.value as any;
        const list = Array.isArray(response?.payslips)
          ? response.payslips
          : Array.isArray(response)
            ? response
            : [];
        payslips = list.length;
      }

      if (resignationResult.status === "fulfilled") {
        const requests = resignationResult.value?.data?.data?.requests;
        const list = Array.isArray(requests) ? requests : [];
        activeResignations = list.filter((request: any) => {
          const status = String(request?.status || "").trim().toLowerCase();
          return !["rejected", "completed", "cancelled", "withdrawn"].includes(status);
        }).length;
      }

      setCustomSummary({ assignedAssets, payslips, activeResignations });
      setIsCustomSummaryLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [axiosPrivate, displayName, hasCustomProfileModules, userId]);

  const renderModules = (
    items: typeof modules,
    columns: "three" | "four" = "four",
  ) => (
    <div
      className={`mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 ${
        columns === "three" ? "xl:grid-cols-3" : "xl:grid-cols-3"
      }`}
    >
      {items.map((item) => {
        const Icon = ICONS[item.id];
        return (
          <DashboardModuleCard
            key={item.id}
            icon={<Icon size={19} />}
            title={item.label}
            route={item.route}
            description={MODULE_COPY[item.id]}
            color={MODULE_COLORS[item.id]}
          />
        );
      })}
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner
          title="Profile"
          description="A single view of your identity, unit access, account security, billing, and employee self-service modules."
          tags={["Personal Details", "Unit Access", "Security", "Plan & Billing"]}
          image={profileDashboardBanner}
          moduleCount={modules.length}
        />

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile
              icon={<UserRound size={20} />}
              label="My Profile"
              value={`${profileReadiness}%`}
              sub={`${completedFields} of ${profileFields.length} essential details ready`}
              tone="blue"
            />
            <DashboardStatTile
              icon={<Building2 size={20} />}
              label="Unit Profile"
              value={workspaceLabel}
              sub="Identity, branding and unit details"
              tone="cyan"
            />
            <DashboardStatTile
              icon={<KeyRound size={20} />}
              label="Password Security"
              value="Available"
              sub="Password and credential controls"
              tone="violet"
            />
            <DashboardStatTile
              icon={<CreditCard size={20} />}
              label="Plan & Billing"
              value={titleCase(normalizedPlan)}
              sub="Plan, billing cycle and renewal details"
              tone="green"
            />
          </div>
        )}

        {hasCustomProfileModules ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardStatTile
              icon={<PackageCheck size={20} />}
              label="Assigned Assets"
              value={isCustomSummaryLoading ? "..." : (customSummary.assignedAssets ?? "—")}
              sub="Asset units currently assigned to you"
              tone="amber"
            />
            <DashboardStatTile
              icon={<BadgeIndianRupee size={20} />}
              label="Payslips"
              value={isCustomSummaryLoading ? "..." : (customSummary.payslips ?? "—")}
              sub="Salary statements available in your profile"
              tone="green"
            />
            <DashboardStatTile
              icon={<LogOut size={20} />}
              label="Resignation Requests"
              value={isCustomSummaryLoading ? "..." : (customSummary.activeResignations ?? "—")}
              sub="Requests currently under review"
              tone="rose"
            />
          </div>
        ) : null}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Profile modules</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the relevant profile module; the existing tabs and workflows remain unchanged.
          </p>
          {renderModules(standardModules)}
        </div>

        {customModules.length > 0 ? (
          <div className="mb-6 border-t border-slate-100 pt-5">
            <p className="text-sm font-pmedium text-slate-900">Custom plan modules</p>
            <p className="mt-1 text-[10px] text-slate-500">
              Employee self-service records and requests included with the Custom plan.
            </p>
            {renderModules(customModules, "three")}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DashboardSection
            title="Account snapshot"
            subtitle="Current identity and unit details available to your profile."
            bodyClassName="p-0"
          >
            <DetailRow icon={<UserRound size={17} />} label="Full name" value={displayName} />
            <DetailRow icon={<Mail size={17} />} label="Email address" value={email} />
            <DetailRow icon={<Phone size={17} />} label="Phone number" value={phone} />
            <DetailRow icon={<Building2 size={17} />} label="Unit" value={workspaceLabel} />
          </DashboardSection>

          <DashboardSection
            title="Access and security"
            subtitle="Plan, role, department, and credential controls for this account."
            bodyClassName="p-0"
          >
            <DetailRow icon={<ShieldCheck size={17} />} label="Unit role" value={roleLabel} />
            <DetailRow icon={<BadgeCheck size={17} />} label="Department access" value={departmentLabel} />
            <DetailRow icon={<MapPin size={17} />} label="Unit location" value={locationLabel} />
            <DetailRow icon={<KeyRound size={17} />} label="Password security" value="Password controls available" />
          </DashboardSection>
        </div>
      </PageFrame>
    </div>
  );
}
