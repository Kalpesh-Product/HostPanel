import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeAlert,
  BadgeCheck,
  Building,
  Building2,
  CalendarDays,
  FileKey,
  Handshake,
  Hash,
  House,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  UserRound,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getStoredTenantRole } from "../../lib/tenant-session";

function formatDate(value: unknown): string {
  if (!value) return "-";
  const d = new Date(String(value).slice(0, 10));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTitleCase(value: string): string {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "-";
}

function DetailCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className="text-blue-600 shrink-0" />
        <p className="text-[10px] font-pmedium uppercase tracking-[0.24em] text-slate-500">{label}</p>
      </div>
      <p className="text-[13px] font-semibold text-slate-900 break-words">{String(value || "-")}</p>
    </div>
  );
}

function SectionShell({ eyebrow, title, icon: Icon, children }: { eyebrow: string; title: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[10px] font-pmedium uppercase tracking-[0.32em] text-blue-600">{eyebrow}</p>
          <h2 className="text-lg font-pmedium text-slate-900">{title}</h2>
        </div>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

interface EmployeeRecord {
  employeeNumber?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  department?: string;
  departments?: string[];
  role?: string;
  status?: string;
  dateOfBirth?: string;
  currentAddress?: string;
  permanentAddress?: string;
  country?: string;
  state?: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  joiningDate?: string;
  jobTitle?: string;
  jobCode?: string;
  employmentType?: string;
  workMode?: string;
  workLocation?: string;
  managerName?: string;
  noticePeriodDays?: number;
  probationDays?: number;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  nationalIdType?: string;
  nationalIdNumber?: string;
  taxId?: string;
  providentFundNumber?: string;
  salaryLabel?: string;
  salaryMonthlyLabel?: string;
  userId?: string;
  _id?: string;
}

export default function UserDetails() {
  const { auth } = useAuth();
  const axios = useAxiosPrivate();
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const hasTenantRole = Boolean(getStoredTenantRole() || auth?.user?.tenantRole);

  const authUser = useMemo(() => auth?.user || {}, [auth?.user]);

  const initials = useMemo(() => {
    const name = employee?.fullName || authUser?.name || authUser?.firstName || "U";
    return String(name)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [employee, authUser]);

  const profileEmail = employee?.email || authUser?.email || "-";
  const profileName = employee?.fullName || authUser?.name || `${authUser?.firstName || ""} ${authUser?.lastName || ""}`.trim() || "User";
  const rawRole = employee?.role || authUser?.workspaceMembership?.role || authUser?.role || "Member";
  const profileRole = formatTitleCase(
    String(rawRole).toLowerCase() === "owner" ? "founder" : rawRole
  );
  const profileDepartments = employee?.departments?.filter(Boolean) || [];
  const profileDepartment = profileDepartments.length > 0
    ? profileDepartments.join(", ")
    : employee?.department || "-";
  const profileStatus = employee?.status || "active";

  const personalFields = [
    { label: "Full Name", value: profileName, icon: UserRound },
    { label: "Email", value: profileEmail, icon: ShieldCheck },
    { label: "Phone", value: employee?.phone || authUser?.phone || "-", icon: Phone },
    { label: "Gender", value: employee?.gender || "-", icon: User },
    { label: "Date of Birth", value: formatDate(employee?.dateOfBirth), icon: CalendarDays },
    { label: "Current Address", value: employee?.currentAddress || "-", icon: House },
    { label: "Permanent Address", value: employee?.permanentAddress || "-", icon: House },
    { label: "Country", value: employee?.country || "-", icon: MapPin },
    { label: "State", value: employee?.state || "-", icon: MapPin },
    { label: "City", value: employee?.city || "-", icon: Building2 },
    { label: "Emergency Contact Name", value: employee?.emergencyContactName || "-", icon: Handshake },
    { label: "Emergency Contact Phone", value: employee?.emergencyContactPhone || "-", icon: Phone },
  ];

  const workFields = [
    { label: "Employee ID", value: employee?.employeeNumber || "-", icon: Hash },
    { label: "Role", value: profileRole, icon: BadgeCheck },
    { label: "Department", value: profileDepartment, icon: Building },
    { label: "Job Title", value: employee?.jobTitle || "-", icon: BadgeAlert },
    { label: "Job Code", value: employee?.jobCode || "-", icon: FileKey },
    { label: "Work Location", value: employee?.workLocation || "-", icon: MapPin },
    { label: "Work Mode", value: formatTitleCase(employee?.workMode || ""), icon: Building2 },
    { label: "Employment Type", value: formatTitleCase(employee?.employmentType || ""), icon: User },
    { label: "Joining Date", value: formatDate(employee?.joiningDate), icon: CalendarDays },
    { label: "Manager", value: employee?.managerName || "-", icon: UserRound },
    { label: "Notice Period", value: employee?.noticePeriodDays ? `${employee.noticePeriodDays} days` : "-", icon: CalendarDays },
    { label: "Probation", value: employee?.probationDays ? `${employee.probationDays} days` : employee?.probationDays === 0 ? "No Probation" : "-", icon: BadgeAlert },
  ];

  useEffect(() => {
    let mounted = true;
    const fetchEmployee = async () => {
      try {
        const currentUserId = String(authUser?._id || "").trim();
        if (!currentUserId) {
          setEmployee(null);
          setIsLoading(false);
          return;
        }

        const response = await axios.get("/api/hr/employee-management/overview");
        const overview = response?.data?.data || response?.data || response || {};
        const employees = Array.isArray(overview.employees) ? overview.employees : [];

        const matched = employees.find((emp: Record<string, unknown>) => {
          const empUserId = String(emp.userId || emp._id || "").trim();
          return empUserId === currentUserId;
        });

        if (mounted) {
          if (matched) {
            setEmployee({
              employeeNumber: String(matched.employeeId || matched.employeeNumber || matched.employeeCode || ""),
              fullName: String(matched.fullName || matched.name || ""),
              email: String(matched.email || ""),
              phone: String(matched.phone || matched.mobile || ""),
              gender: String(matched.gender || ""),
              department: String(matched.department || ""),
              departments: Array.isArray(matched.departments || matched.departmentNames) ? (matched.departments || matched.departmentNames).filter(Boolean).map(String) : [],
              role: String(matched.workspaceRole || matched.role || ""),
              status: String(matched.status || ""),
              dateOfBirth: String(matched.dateOfBirth || matched.dob || ""),
              currentAddress: String(matched.currentAddress || matched.address || ""),
              permanentAddress: String(matched.permanentAddress || ""),
              country: String(matched.country || ""),
              state: String(matched.state || ""),
              city: String(matched.city || ""),
              emergencyContactName: String(matched.emergencyContactName || ""),
              emergencyContactPhone: String(matched.emergencyContactPhone || ""),
              joiningDate: String(matched.joiningDate || matched.joinDate || ""),
              jobTitle: String(matched.jobTitle || matched.title || ""),
              jobCode: String(matched.jobCode || ""),
              employmentType: String(matched.employmentType || "full-time"),
              workMode: String(matched.workMode || ""),
              workLocation: String(matched.workLocation || ""),
              managerName: String(matched.managerName || ""),
              noticePeriodDays: Number(matched.noticePeriodDays) || 0,
              probationDays: Number(matched.probationDays) || 0,
              bankName: String(matched.bankName || ""),
              accountHolderName: String(matched.accountHolderName || ""),
              accountNumber: String(matched.accountNumber || ""),
              ifscCode: String(matched.ifscCode || ""),
              nationalIdType: String(matched.nationalIdType || ""),
              nationalIdNumber: String(matched.nationalIdNumber || ""),
              taxId: String(matched.taxId || ""),
              providentFundNumber: String(matched.providentFundNumber || ""),
              salaryLabel: String(matched.salaryLabel || ""),
              salaryMonthlyLabel: String(matched.salaryMonthlyLabel || ""),
              userId: String(matched.userId || matched._id || ""),
              _id: String(matched._id || ""),
            });
          }
          setErrorMessage("");
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setErrorMessage((err as Error)?.message || "Failed to load profile");
          setIsLoading(false);
        }
      }
    };

    fetchEmployee();
    return () => { mounted = false; };
  }, [authUser?._id, axios]);

  if (isLoading && !employee && !authUser?.name) {
    return (
      <div className="border-default border-borderGray rounded-xl bg-white p-4 space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse" />
        <div className="h-32 rounded-[2rem] border border-white/80 bg-white/90 shadow-sm animate-pulse" />
        <div className="h-48 rounded-[2rem] border border-white/80 bg-white/90 shadow-sm animate-pulse" />
      </div>
    );
  }

  if (errorMessage && !employee && !authUser?.name) {
    return (
      <div className="border-default border-borderGray rounded-xl bg-white p-4">
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-center">
          <BadgeAlert className="mx-auto h-10 w-10 text-rose-400" />
          <h3 className="mt-3 text-lg font-semibold text-rose-900">Unable to load profile</h3>
          <p className="mt-2 text-sm text-rose-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-default border-borderGray rounded-xl bg-white p-4">
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">My Profile</span>
      </div>
      <div className="space-y-5">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] text-2xl font-bold text-white shadow-[0_18px_40px_rgba(37,99,235,0.28)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              {/* <p className="text-[10px] font-pmedium uppercase tracking-[0.32em] text-blue-600">My Profile</p> */}
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{profileName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Complete employee profile including personal and employment details.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
              <ShieldCheck size={14} /> {profileRole}
            </span>
            {/* <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
              <Building size={14} /> {profileDepartment}
            </span> */}
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              profileStatus === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white/80 text-slate-600"
            }`}>
              <BadgeCheck size={14} /> {formatTitleCase(profileStatus)}
            </span>
          </div>
        </div>
      </section>

      {!employee && !hasTenantRole ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
          <UserRound className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Employee profile not found</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your employee record has not been created in the system yet. Contact HR to set up your profile.
          </p>
        </div>
      ) : null}

      {(employee || hasTenantRole) && (
        <>
          <SectionShell title="Personal & Contact Details" icon={UserRound}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {personalFields.filter((f) => {
                if (f.label === "Date of Birth" && !employee?.dateOfBirth && !hasTenantRole) return false;
                if ((f.label === "Emergency Contact Name" || f.label === "Emergency Contact Phone") && !employee?.emergencyContactName && !hasTenantRole) return false;
                return true;
              }).map((field) => (
                <DetailCard key={field.label} label={field.label} value={field.value} icon={field.icon} />
              ))}
            </div>
          </SectionShell>

          <SectionShell title="Work Details" icon={Building}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {workFields.map((field) => (
                <DetailCard key={field.label} label={field.label} value={field.value} icon={field.icon} />
              ))}
            </div>
          </SectionShell>
        </>
      )}
    </div>
  </div>
  );
}
