/**
 * AdminDashboardOverview — shown to members with roleBand "admin" who don't
 * match a single named department dashboard. An admin can be assigned to
 * several departments at once, so this page renders one clearly-labelled
 * section per assigned department, each with that department's own data —
 * the full rich manager widgets for the 7 known departments, and a
 * module-driven overview for any custom department — followed by everything
 * else granted to the admin personally.
 *
 * Visual language matches the plan-wise, employee and manager dashboards:
 * slate outer shell + bordered inner frame, blue-gradient greeting masthead,
 * today's attendance as the hero card, an "Admin Pulse" metric row and quick
 * actions. All original `admin-*` tour anchors are preserved.
 */
import { useEffect, useMemo, useState, type ComponentType, type ElementType } from "react";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  CreditCard,
  Globe2,
  KeyRound,
  Laptop,
  LayoutDashboard,
  LayoutGrid,
  ShieldCheck,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import useDashboardAccess from "@/hooks/useDashboardAccess";
import useWorkspacePreferences from "@/hooks/useWorkspacePreferences";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import {
  PlanBadge,
  MetricTile,
  QuickActionTile,
  getGreeting,
} from "@/pages/Dashboard/FrontendDashboard/dashboard/DashboardShared";
import TodayAttendanceCard from "@/pages/Dashboard/FrontendDashboard/dashboard/TodayAttendanceCard";
import ModernModuleOverview from "@/pages/Dashboard/FrontendDashboard/dashboard/ModernModuleOverview";
import { matchDepartmentSlug, type DeptSlug } from "@/lib/departmentSlug";
import { HRDashboardWidgets } from "@/pages/HR/HRDashboardOverview";
import { AdministrationDashboardWidgets } from "@/pages/Administration/AdministrationDashboardOverview";
import { SalesDashboardWidgets } from "@/pages/Sales/SalesDashboardOverview";
import { FinanceDashboardWidgets } from "@/pages/Finance/FinanceDashboardOverview";
import { MaintenanceDashboardWidgets } from "@/pages/Maintenance/MaintenanceDashboardOverview";
import { TechDashboardWidgets } from "@/pages/Tech/TechDashboardOverview";
import { ITDashboardWidgets } from "@/pages/IT/ITDashboardOverview";

const RICH_WIDGETS_BY_SLUG: Record<DeptSlug, ComponentType> = {
  hr: HRDashboardWidgets,
  administration: AdministrationDashboardWidgets,
  sales: SalesDashboardWidgets,
  finance: FinanceDashboardWidgets,
  maintenance: MaintenanceDashboardWidgets,
  tech: TechDashboardWidgets,
  it: ITDashboardWidgets,
};

const DEPARTMENT_META: Record<DeptSlug, { icon: ElementType; color: string }> = {
  hr: { icon: Users, color: "#2563EB" },
  administration: { icon: Building2, color: "#1E3D73" },
  sales: { icon: BriefcaseBusiness, color: "#f59e0b" },
  finance: { icon: WalletCards, color: "#0ea5e9" },
  maintenance: { icon: Wrench, color: "#f97316" },
  tech: { icon: Globe2, color: "#7c3aed" },
  it: { icon: Laptop, color: "#0891b2" },
};

const DEFAULT_DEPARTMENT_META = { icon: LayoutGrid, color: "#1E3D73" };

const DepartmentBanner = ({
  name,
  slug,
  moduleCount,
}: {
  name: string;
  slug: DeptSlug | null;
  moduleCount: number;
}) => {
  const meta = slug ? DEPARTMENT_META[slug] : DEFAULT_DEPARTMENT_META;
  const Icon = meta.icon;

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-100/60" />
      <div className="relative flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-blue-100"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-pmedium uppercase tracking-[0.22em] text-[#2563EB]">
            {slug ? "Department Unit dashboard" : "Assigned Department"}
          </p>
          <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">{name}</h3>
          <p className="text-[10px] font-pmedium text-slate-500">
            {moduleCount} {moduleCount === 1 ? "module" : "modules"} assigned
          </p>
        </div>
      </div>
    </div>
  );
};

const WorkspaceClock = ({ timezone, location }: { timezone: string; location: string }) => {
  const [tick, setTick] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(tick);
    } catch {
      return "";
    }
  }, [tick, timezone]);

  if (!timeLabel) return null;

  return (
    <>
      {` | `}
      <span className="inline-block whitespace-nowrap" aria-label={timeLabel}>
        {timeLabel.split("").map((ch, i) =>
          /[0-9]/.test(ch) ? (
            <span key={i} className="inline-block w-[0.665em] text-center">
              {ch}
            </span>
          ) : (
            <span key={i}>{ch}</span>
          )
        )}
      </span>
      {location ? ` - ${location}` : ""}
    </>
  );
};

export function AdminDashboardOverview() {
  const currentUser = useFreshCurrentUser();
  const access = useDashboardAccess();
  const workspacePreferences = useWorkspacePreferences();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setNow(new Date());
  }, [workspacePreferences.timezone]);

  const adminName = useMemo(() => {
    const full = `${(currentUser as any)?.firstName || ""} ${(currentUser as any)?.lastName || ""}`.trim();
    return full || (currentUser as any)?.fullName || (currentUser as any)?.name || (currentUser as any)?.displayName || "there";
  }, [currentUser]);

  const { greeting, todayLabel } = useMemo(() => {
    const timezone = workspacePreferences.timezone;

    try {
      const hourPart = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .find((part) => part.type === "hour")?.value;
      const workspaceHour = Number(hourPart);

      return {
        greeting: `${getGreeting(Number.isFinite(workspaceHour) ? workspaceHour : now.getHours())}, ${adminName}`,
        todayLabel: new Intl.DateTimeFormat("en-IN", {
          timeZone: timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now),
      };
    } catch {
      return {
        greeting: `${getGreeting(now.getHours())}, ${adminName}`,
        todayLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }, [adminName, now, workspacePreferences.timezone]);

  // Every assigned department, in one place, tagged with its known slug where
  // one exists. This drives a dedicated section per department below.
  const assignedDepartments = useMemo(
    () =>
      access.departments.map((dept) => ({
        ...dept,
        slug: matchDepartmentSlug(dept.name),
      })),
    [access.departments],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <div className="flex flex-col gap-5 rounded-xl border-default p-4">

        {/* Greeting card — same blue plan-card style used across the plan,
            employee and manager dashboards. */}
        <section
          data-tour="admin-greeting"
          className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-blue-50/70" />
          <div className="relative flex min-w-0 items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100 sm:flex">
              <LayoutDashboard size={21} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-pmedium uppercase tracking-[0.22em] text-[#2563EB]">
                  Admin Unit dashboard
                </p>
                <PlanBadge plan={access.plan} />
              </div>
              <h2 className="mt-2 text-xl font-pmedium text-[#1E3D73] sm:text-2xl">
                {greeting} 👋
              </h2>
              <p className="mt-1 text-xs font-pmedium text-slate-500 sm:text-sm">
                {todayLabel}
                <WorkspaceClock
                  timezone={workspacePreferences.timezone}
                  location={workspacePreferences.location}
                />
              </p>
            </div>
          </div>
        </section>

        {/* Today's attendance — the hero card, same as the other dashboards */}
        <div data-tour="admin-attendance">
          <TodayAttendanceCard variant="hero" />
        </div>

        {/* Admin Pulse — a compact workspace-wide overview for the admin role */}
        <div data-tour="admin-overview">
          <section className="rounded-[1.75rem] border border-blue-100 bg-[#F8FAFD] p-5 shadow-[0_12px_34px_rgba(30,61,115,0.06)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E3D73] text-white shadow-sm">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                  Workspace
                </p>
                <h3 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                  Admin Pulse
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                icon={Building2}
                label="Departments"
                value={assignedDepartments.length}
                sub="Assigned to you"
                route="/core-modules/organization-management"
                color="#1E3D73"
              />
              <MetricTile
                icon={Users}
                label="Active Members"
                value={access.metrics.activeMembers}
                sub={`of ${access.metrics.totalMembers} total`}
                route="/extra-common-modules/team-management"
                color="#2563EB"
              />
              <MetricTile
                icon={KeyRound}
                label="Granted Modules"
                value={access.grantedModuleIds.size}
                sub="Available to you"
                route="/plan-billing/modules"
                color="#7c3aed"
              />
              <MetricTile
                icon={CreditCard}
                label="Current Plan"
                value={access.plan.charAt(0).toUpperCase() + access.plan.slice(1)}
                sub="Billing & modules"
                route="/plan-billing"
                color="#059669"
              />
            </div>
          </section>
        </div>

        {/* Quick actions — the admin tools used most often */}
        <div data-tour="admin-quick-links">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5 shadow-[0_12px_34px_rgba(37,99,235,0.08)] sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70" />
            <div className="relative mb-5">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                Jump back in
              </p>
              <h3 className="mt-1 text-lg font-pmedium text-[#1E3D73]">
                Quick Actions
              </h3>
              <p className="mt-1 text-xs font-pmedium text-slate-500">
                Your everyday admin tools, one click away.
              </p>
            </div>
            <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <QuickActionTile
                icon={CreditCard}
                label="Plan & Billing"
                description="Manage plan, modules & payments"
                route="/plan-billing"
              />
              <QuickActionTile
                icon={Users}
                label="Team Management"
                description="Members, access & policies"
                route="/extra-common-modules/team-management"
              />
              <QuickActionTile
                icon={ClipboardCheck}
                label="Attendance"
                description="Review team attendance"
                route="/common-modules/attendance"
              />
              <QuickActionTile
                icon={Building2}
                label="Organization"
                description="Departments & structure"
                route="/core-modules/organization-management"
              />
              <QuickActionTile
                icon={ShieldCheck}
                label="Module Access"
                description="Workspace modules by plan"
                route="/plan-billing/modules"
              />
            </div>
          </section>
        </div>

        {/* One full section per assigned department, each showing that
            department's own data. Known departments get their rich manager
            widgets; custom departments get a module-driven overview scoped
            strictly to that department. */}
        {assignedDepartments.length > 0 && (
          <div data-tour="admin-department-dashboards" className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-[10px] font-pmedium uppercase tracking-[0.2em] text-slate-400">
                Your Assigned Departments · {assignedDepartments.length}
              </p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {assignedDepartments.map((dept) => {
              const Widgets = dept.slug ? RICH_WIDGETS_BY_SLUG[dept.slug] : null;
              return (
                <section key={dept.id} className="flex flex-col gap-4">
                  <DepartmentBanner
                    name={dept.name}
                    slug={dept.slug}
                    moduleCount={dept.moduleIds.length}
                  />
                  <div className="rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-[0_10px_30px_rgba(30,61,115,0.06)] sm:p-5">
                    {Widgets ? (
                      <Widgets />
                    ) : (
                      <ModernModuleOverview
                        moduleMap={access.moduleMap}
                        grantedModuleIds={access.grantedModuleIds}
                        roleBand={access.roleBand}
                        departments={access.departments}
                        scopeDepartmentId={dept.id}
                        eyebrow="Department"
                        title={`${dept.name} Overview`}
                        emptyTitle="No modules assigned to this department"
                        emptyDescription="Modules granted to this department will appear here."
                      />
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Everything else granted to the admin personally (common modules
            that aren't tied to any assigned department) — rendered in the same
            modern visual language as the rest of this dashboard. */}
        <div data-tour="admin-other-modules">
          <ModernModuleOverview
            moduleMap={access.moduleMap}
            grantedModuleIds={access.grantedModuleIds}
            roleBand={access.roleBand}
            departments={access.departments}
            eyebrow="Personal"
            title="Your Overview"
            emptyTitle="No personal modules assigned"
            emptyDescription="Common modules granted to you outside of your assigned departments will appear here."
          />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardOverview;
