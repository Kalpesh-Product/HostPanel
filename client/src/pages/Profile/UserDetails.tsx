import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Country } from "country-state-city";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import type { CountryCode } from "libphonenumber-js";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeAlert,
  BadgeCheck,
  Building,
  Building2,
  CalendarDays,
  Clock,
  Camera,
  ChevronDown,
  Download,
  Eye,
  FileKey,
  FileText,
  Handshake,
  Hash,
  House,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserRound,
  X,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import { updateMyEmployeeProfile, updateMyProfilePicture } from "../../services/hr";
import { formatTime12h } from "../../utils/time";
import { getCompanyDocuments, getDepartmentDocuments, getAllDepartmentDocuments, downloadDepartmentDocumentFile, type DepartmentDocumentType } from "../../services/departmentDocuments";
import { getCities, getCountries, getStates } from "../../utils/locationApi";
import humanDate from "../../utils/humanDateForamt";
import MuiModal from "../../components/MuiModal";
import AvatarCropModal from "../../components/AvatarCropModal";
import { SectionShell, DetailCard } from "../../components/Pages/ProfileSection";

const openDocument = (fileUrl: string) => {
  if (!fileUrl) return;
  window.open(fileUrl, "_blank", "noopener,noreferrer");
};

const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

function formatDate(value: unknown): string {
  if (!value) return "-";
  const d = new Date(String(value).slice(0, 10));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateForInput(value: unknown): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const getFlagUrl = (isoCode: string) =>
  `https://flagcdn.com/w40/${String(isoCode || "").toLowerCase()}.png`;

interface PhoneCountry {
  isoCode: string;
  name: string;
  dialCode: string;
}

const PHONE_COUNTRIES: PhoneCountry[] = (() => {
  const entries = Country.getAllCountries()
    .filter((country) => Boolean(String(country.phonecode || "").trim()))
    .map((country) => ({
      isoCode: country.isoCode,
      name: country.name,
      dialCode: `+${String(country.phonecode).replace(/^\+/, "")}`,
    }));
  entries.sort((a, b) => (a.isoCode === "IN" ? -1 : b.isoCode === "IN" ? 1 : a.name.localeCompare(b.name)));
  return entries;
})();

const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES.find((c) => c.isoCode === "IN")
  || PHONE_COUNTRIES[0]
  || { isoCode: "IN", name: "India", dialCode: "+91" };

function getPhoneCountry(isoCode: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.isoCode === isoCode) || DEFAULT_PHONE_COUNTRY;
}

function parsePhoneValue(value: unknown): { isoCode: string; number: string } {
  const trimmed = String(value || "").trim();
  if (!trimmed) return { isoCode: "", number: "" };
  if (trimmed.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(trimmed);
    if (parsed?.country && PHONE_COUNTRIES.some((entry) => entry.isoCode === parsed.country)) {
      return { isoCode: parsed.country, number: parsed.nationalNumber };
    }
    const match = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dialCode.replace(/\D/g, "").length - a.dialCode.replace(/\D/g, "").length)
      .find((entry) => trimmed.replace(/\D/g, "").startsWith(entry.dialCode.replace(/\D/g, "")));
    if (match) {
      const dialDigits = match.dialCode.replace(/\D/g, "");
      return { isoCode: match.isoCode, number: trimmed.replace(/\D/g, "").slice(dialDigits.length) };
    }
    return { isoCode: DEFAULT_PHONE_COUNTRY.isoCode, number: trimmed.replace(/^\+\d+\D*/, "").replace(/\D/g, "") };
  }
  return { isoCode: DEFAULT_PHONE_COUNTRY.isoCode, number: trimmed.replace(/\D/g, "") };
}

function validatePhoneNumber(value: string, isoCode: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return { valid: true, e164: "", message: "" };
  if (!isoCode) {
    return { valid: false, e164: "", message: "Select a country code." };
  }

  const selectedCountry = getPhoneCountry(isoCode);
  const parsed = parsePhoneNumberFromString(digits, isoCode as CountryCode);
  const valid = Boolean(parsed?.isValid() && parsed.country === isoCode);

  return {
    valid,
    e164: valid ? String(parsed?.number || "") : "",
    message: valid ? "" : `Enter a valid phone number for ${selectedCountry.name}.`,
  };
}

function PhoneCountryDropdown({ value, onChange }: { value: string; onChange: (isoCode: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = PHONE_COUNTRIES.find((country) => country.isoCode === value);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const onClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${fieldInputClass} flex w-[104px] shrink-0 items-center gap-1.5 px-2.5`}
      >
        {selected ? (
          <>
            <img src={getFlagUrl(selected.isoCode)} alt={`${selected.name} flag`} className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover" />
            <span className="truncate">{selected.dialCode}</span>
          </>
        ) : (
          <span className="truncate text-slate-500">Code</span>
        )}
        <ChevronDown size={13} className={`ml-auto shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {PHONE_COUNTRIES.map((entry) => (
            <button
              key={entry.isoCode}
              type="button"
              onClick={() => { onChange(entry.isoCode); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors hover:bg-slate-50 ${entry.isoCode === value ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
            >
              <img src={getFlagUrl(entry.isoCode)} alt={`${entry.name} flag`} className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover" />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              <span className="shrink-0 text-slate-400">{entry.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PersonalDetailsForm {
  phoneCountryIso: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  currentAddress: string;
  permanentAddress: string;
  sameAsCurrentAddress: boolean;
  country: string;
  state: string;
  city: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

function emptyPersonalDetailsForm(): PersonalDetailsForm {
  return {
    phoneCountryIso: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    currentAddress: "",
    permanentAddress: "",
    sameAsCurrentAddress: false,
    country: "",
    state: "",
    city: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  };
}

function formatTitleCase(value: string): string {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "-";
}

const fieldInputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10";
const fieldDisabledClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 text-[13px] font-medium text-slate-500 cursor-not-allowed";

function FormField({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[11px] font-pmedium uppercase tracking-[0.14em] text-slate-500">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
  );
}

function DocumentRow({
  doc,
  badge,
  onDownload,
}: {
  doc: any;
  badge?: string;
  onDownload?: (doc: any) => void;
}) {
  return (
    <div
      key={doc._id}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
          <FileText size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-pmedium text-slate-900 truncate">{doc.name || "Untitled"}</p>
          <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">
            {badge ? `${badge} · ` : ""}Updated {humanDate(doc.updatedAt)}
            {Array.isArray(doc.assignedDepartmentNames) && doc.assignedDepartmentNames.length > 0
              ? ` · Shared with ${doc.assignedDepartmentNames.join(", ")}`
              : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => openDocument(doc.fileUrl)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-pmedium uppercase text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
        >
          <Eye size={12} /> View
        </button>
        <button
          type="button"
          disabled={!onDownload}
          onClick={() => onDownload?.(doc)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-pmedium uppercase text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB] disabled:opacity-50"
        >
          <Download size={12} /> Download
        </button>
      </div>
    </div>
  );
}

// Read-only company-wide documents uploaded from HR Company Management.
// These live above department documents so My Profile is the single document hub.
function CompanyDocumentsSection({ kind, title }: { kind: DepartmentDocumentType; title: string }) {
  const axios = useAxiosPrivate();

  const { data, isLoading } = useQuery({
    queryKey: ["myProfileCompanyDocuments", kind],
    queryFn: async () => {
      const response = await getCompanyDocuments(axios, kind);
      return response?.data?.data?.documents || [];
    },
    staleTime: 60 * 1000,
  });

  const documents = (Array.isArray(data) ? data : []).filter((item: any) => item.isActive !== false);

  const handleDownload = async (doc: any) => {
    try {
      await downloadDepartmentDocumentFile(axios, doc._id, `${doc.name || "Document"}.pdf`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to download document.");
    }
  };

  return (
    <SectionShell eyebrow="Company" title={title} icon={FileText}>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl border border-slate-100 bg-slate-50/80 animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <FileText className="mx-auto text-slate-300" size={22} />
          <p className="mt-2 text-[12px] font-pmedium text-slate-400">No {title.toLowerCase()} uploaded yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {documents.map((doc: any) => (
            <DocumentRow key={doc._id} doc={doc} onDownload={handleDownload} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

// Read-only list of active SOPs/Policies uploaded from Team Management,
// surfaced here the same way Company Profile surfaces company-wide
// SOPs/Policies — but department-scoped, with two very different audiences:
//
// - Founder / super_admin / the HR department manager: EVERY department's
//   docs (owned + assigned), grouped department-wise — they oversee all of it.
// - Everyone else (a department manager or their employees): only their own
//   department's docs (owned by it, or assigned/shared to it from
//   elsewhere) — the server already applies employee-level visibility
//   filtering for plain employees.
//
// Renders nothing once we know there's nothing to show (no departments for a
// regular member, or the actor isn't founder/super_admin/HR-manager).
function DepartmentDocumentsSection({ kind, title }: { kind: DepartmentDocumentType; title: string }) {
  const axios = useAxiosPrivate();
  const { departments, departmentNames, roleBand, isLoading: isDeptLoading } = useDashboardAccess();
  const isOwnerOrSuperAdmin = roleBand === "owner" || roleBand === "super_admin";
  const isHrManager = roleBand === "manager" && departmentNames.some((name) => String(name || "").trim().toUpperCase() === "HR");
  const seesAllDepartments = isOwnerOrSuperAdmin || isHrManager;

  const departmentIds = departments.map((d) => d.id).filter(Boolean);

  const { data, isLoading } = useQuery({
    queryKey: seesAllDepartments
      ? ["myProfileAllDepartmentDocuments", kind]
      : ["myProfileDepartmentDocuments", kind, departmentIds.join(",")],
    queryFn: async () => {
      if (seesAllDepartments) {
        const res = await getAllDepartmentDocuments(axios, kind);
        return res?.data?.data?.documents || [];
      }
      const results = await Promise.all(
        departments.map((dept) =>
          getDepartmentDocuments(axios, dept.id, kind)
            .then((res: any) => res?.data?.data?.documents || [])
            .catch(() => []),
        ),
      );
      return results.flat();
    },
    enabled: seesAllDepartments || departmentIds.length > 0,
    staleTime: 60 * 1000,
  });

  const documents = (Array.isArray(data) ? data : []).filter((item: any) => item.isActive !== false);

  const handleDownload = async (doc: any) => {
    try {
      await downloadDepartmentDocumentFile(axios, doc._id, `${doc.name || "Document"}.pdf`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to download document.");
    }
  };

  const groupedByDepartment = useMemo(() => {
    if (!seesAllDepartments) return null;
    const groups = new Map<string, any[]>();
    documents.forEach((doc: any) => {
      const key = doc.departmentName || "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [documents, seesAllDepartments]);

  if (!isDeptLoading && !seesAllDepartments && departmentIds.length === 0) return null;

  return (
    <SectionShell eyebrow={seesAllDepartments ? "Every Department" : "Department"} title={title} icon={FileText}>
      {isLoading || isDeptLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl border border-slate-100 bg-slate-50/80 animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <FileText className="mx-auto text-slate-300" size={22} />
          <p className="mt-2 text-[12px] font-pmedium text-slate-400">No {title.toLowerCase()} uploaded yet.</p>
        </div>
      ) : seesAllDepartments && groupedByDepartment ? (
        <div className="flex flex-col gap-5">
          {groupedByDepartment.map(([departmentName, docs]) => (
            <div key={departmentName}>
              <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600 mb-2">{departmentName}</p>
              <div className="flex flex-col gap-2.5">
                {docs.map((doc: any) => (
                  <DocumentRow key={doc._id} doc={doc} onDownload={handleDownload} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {documents.map((doc: any) => {
            const isOwned = departmentIds.includes(String(doc.departmentId));
            const badge = isOwned ? undefined : `Assigned · ${doc.departmentName || "Other"}`;
            return <DocumentRow key={doc._id} doc={doc} badge={badge} onDownload={handleDownload} />;
          })}
        </div>
      )}
    </SectionShell>
  );
}

interface EmployeeRecord {
  employeeNumber?: string;
  fullName?: string;
  email?: string;
  profilePictureUrl?: string;
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
  shiftId?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
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
  tenantCompanyName?: string;
  userId?: string;
  _id?: string;
}

const myProfileEmployeeCache = new Map<string, EmployeeRecord>();

export default function UserDetails() {
  const { auth, setAuth } = useAuth();
  const axios = useAxiosPrivate();
  const profileCacheKey = [
    String((auth?.user as any)?.workspaceMembership?.workspace || (auth?.user as any)?.primaryWorkspace || (auth?.user as any)?.workspaceId || "workspace"),
    String((auth?.user as any)?._id || (auth?.user as any)?.id || (auth?.user as any)?.email || "user"),
    String((auth?.user as any)?.tenantCompanyId || "host"),
  ].join(":");
  const cachedEmployee = myProfileEmployeeCache.get(profileCacheKey) || null;
  const [employee, setEmployee] = useState<EmployeeRecord | null>(() => cachedEmployee);
  const [isLoading, setIsLoading] = useState(() => !cachedEmployee);
  const [errorMessage, setErrorMessage] = useState("");
  const hasTenantRole = Boolean(auth?.user?.tenantRole);
  const { plan } = useDashboardAccess();
  const isCustomPlan = String(plan || "basic").trim().toLowerCase() === "custom";
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState<PersonalDetailsForm>(emptyPersonalDetailsForm());
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const authUser = useMemo(() => auth?.user || {}, [auth?.user]);

  // My Profile is scoped to the ACTIVE unit (the one selected in the
  // workspace switcher). Refetch when the user switches units.
  const activeWorkspaceId = String(
    (auth?.user as any)?.workspaceMembership?.workspace ||
      (auth?.user as any)?.primaryWorkspace ||
      (auth?.user as any)?.workspaceId ||
      "",
  ).trim();

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

  const authAvatarUrl =
    typeof authUser?.profilePicture === "object"
      ? authUser?.profilePicture?.url
      : authUser?.profilePicture || authUser?.profileImage || "";
  const currentAvatarUrl = avatarPreviewUrl || employee?.profilePictureUrl || authAvatarUrl || "";
  const selectedPhoneCountry = PHONE_COUNTRIES.find((country) => country.isoCode === editForm.phoneCountryIso);
  const phoneValidation = validatePhoneNumber(editForm.phone, editForm.phoneCountryIso);

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

  const visiblePersonalFields = hasTenantRole
    ? personalFields.filter((field) => ["Full Name", "Email", "Phone"].includes(field.label))
    : personalFields;

  const standardWorkFields = [
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
    { label: "Shift", value: employee?.shiftName ? `${employee.shiftName} (${formatTime12h(employee.shiftStartTime || "")} - ${formatTime12h(employee.shiftEndTime || "")})` : "Not assigned", icon: Clock },
    { label: "Probation", value: employee?.probationDays ? `${employee.probationDays} days` : employee?.probationDays === 0 ? "No Probation" : "-", icon: BadgeAlert },
  ];
  const workFields = hasTenantRole
    ? [
        { label: "Tenant Company", value: employee?.tenantCompanyName || authUser?.tenantCompanyName || "-", icon: Building2 },
        { label: "Role", value: profileRole, icon: BadgeCheck },
        { label: "Designation", value: employee?.jobTitle || "-", icon: BadgeAlert },
        { label: "Status", value: formatTitleCase(profileStatus), icon: BadgeCheck },
      ]
    : standardWorkFields;

  useEffect(() => {
    let mounted = true;
    setErrorMessage("");
    const cached = myProfileEmployeeCache.get(profileCacheKey) || null;
    if (cached) {
      setEmployee(cached);
      setIsLoading(false);
    } else {
      setEmployee(null);
      setIsLoading(true);
    }
    const fetchEmployee = async () => {
      try {
        const currentUserId = String(authUser?._id || "").trim();
        if (!currentUserId) {
          setEmployee(null);
          setIsLoading(false);
          return;
        }

        if (hasTenantRole) {
          const response = await axios.get("/api/auth/tenant/profile");
          const tenantProfile = response?.data || {};
          const tenantEmployee = tenantProfile?.employee || {};
          const tenantCompany = tenantProfile?.company || {};

          if (mounted) {
            setEmployee({
              fullName: String(tenantEmployee?.name || authUser?.name || ""),
              email: String(tenantEmployee?.email || authUser?.email || ""),
              profilePictureUrl: String(tenantEmployee?.profilePictureUrl || ""),
              phone: String(tenantEmployee?.phone || ""),
              role: String(tenantEmployee?.role || authUser?.tenantRole || "Tenant Employee"),
              status: "active",
              jobTitle: String(tenantEmployee?.designation || ""),
              tenantCompanyName: String(tenantCompany?.companyName || authUser?.tenantCompanyName || ""),
              userId: currentUserId,
            });
            setErrorMessage("");
            setIsLoading(false);
          }
          return;
        }

        const [response, attendanceResponse] = await Promise.all([
          axios.get("/api/hr/company-management/overview"),
          axios.get("/api/attendance/settings").catch(() => null),
        ]);
        const overview = response?.data?.data || response?.data || response || {};
        const assignedShift = attendanceResponse?.data?.data?.shiftAssignment?.shift || null;
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
              profilePictureUrl: String(matched.profilePictureUrl || ""),
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
              shiftId: String(matched.shiftId || assignedShift?.id || ""),
              shiftName: String(assignedShift?.name || ""),
              shiftStartTime: String(assignedShift?.startTime || ""),
              shiftEndTime: String(assignedShift?.endTime || ""),
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
          if (!cached) {
            setErrorMessage((err as Error)?.message || "Failed to load profile");
          }
          setIsLoading(false);
        }
      }
    };

    fetchEmployee();
    return () => { mounted = false; };
  }, [authUser?._id, authUser?.email, authUser?.name, authUser?.tenantCompanyName, authUser?.tenantRole, activeWorkspaceId, axios, hasTenantRole, profileCacheKey]);

  useEffect(() => {
    if (employee) {
      myProfileEmployeeCache.set(profileCacheKey, employee);
    }
  }, [employee, profileCacheKey]);

  useEffect(() => {
    let isActive = true;
    getCountries()
      .then((countries) => { if (isActive) setCountryOptions(countries); })
      .catch(() => { if (isActive) setCountryOptions([]); });
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;
    if (!editForm.country) {
      setStateOptions([]);
      return;
    }
    getStates(editForm.country)
      .then((states) => { if (isActive) setStateOptions(states); })
      .catch(() => { if (isActive) setStateOptions([]); });
    return () => { isActive = false; };
  }, [editForm.country]);

  useEffect(() => {
    let isActive = true;
    if (!editForm.country || !editForm.state) {
      setCityOptions([]);
      return;
    }
    getCities(editForm.country, editForm.state)
      .then((cities) => { if (isActive) setCityOptions(cities); })
      .catch(() => { if (isActive) setCityOptions([]); });
    return () => { isActive = false; };
  }, [editForm.country, editForm.state]);

  const handleOpenEditModal = () => {
    const parsedPhone = parsePhoneValue(employee?.phone);
    const currentAddress = employee?.currentAddress || "";
    const permanentAddress = employee?.permanentAddress || "";
    setEditForm({
      phoneCountryIso: parsedPhone.isoCode,
      phone: parsedPhone.number,
      gender: employee?.gender || "",
      dateOfBirth: formatDateForInput(employee?.dateOfBirth),
      currentAddress,
      permanentAddress,
      sameAsCurrentAddress: Boolean(currentAddress) && currentAddress === permanentAddress,
      country: employee?.country || "",
      state: employee?.state || "",
      city: employee?.city || "",
      emergencyContactName: employee?.emergencyContactName || "",
      emergencyContactPhone: employee?.emergencyContactPhone || "",
    });
    setIsEditModalOpen(true);
  };

  const openAvatarPicker = () => {
    setIsAvatarPreviewOpen(false);
    window.setTimeout(() => avatarInputRef.current?.click(), 0);
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error(`Profile photo must not exceed ${MAX_AVATAR_SIZE_MB}MB.`);
      event.target.value = "";
      return;
    }
    setCropSourceUrl(URL.createObjectURL(selectedFile));
    setIsCropModalOpen(true);
    event.target.value = "";
  };

  const handleCropModalClose = () => {
    setIsCropModalOpen(false);
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    setCropSourceUrl(null);
  };

  const handleCropSave = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
    setAvatarFile(croppedFile);
    setAvatarPreviewUrl(URL.createObjectURL(croppedBlob));
    handleCropModalClose();
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setIsAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const response = await updateMyProfilePicture(formData);
      const updated = response?.data?.data || response?.data || {};
      const nextPictureUrl = String(updated.profilePictureUrl || "");
      setEmployee((prev) => (prev ? { ...prev, profilePictureUrl: nextPictureUrl } : prev));
      setAuth((prev) => ({
        ...prev,
        user: {
          ...(prev?.user || {}),
          profilePicture: nextPictureUrl ? { url: nextPictureUrl } : null,
        },
      }));
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      toast.success("Profile photo updated successfully.");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as Error)?.message
        || "Failed to update profile photo";
      toast.error(message);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    const validatedPhone = validatePhoneNumber(editForm.phone, editForm.phoneCountryIso);
    if (!validatedPhone.valid) {
      toast.error(validatedPhone.message);
      return;
    }

    setIsSavingProfile(true);
    try {
      const combinedPhone = validatedPhone.e164;
      const permanentAddress = editForm.sameAsCurrentAddress
        ? editForm.currentAddress.trim()
        : editForm.permanentAddress.trim();
      const response = await updateMyEmployeeProfile({
        phone: combinedPhone,
        phoneCountryIso: editForm.phoneCountryIso,
        gender: editForm.gender.trim(),
        dateOfBirth: editForm.dateOfBirth || null,
        currentAddress: editForm.currentAddress.trim(),
        permanentAddress,
        country: editForm.country.trim(),
        state: editForm.state.trim(),
        city: editForm.city.trim(),
        emergencyContactName: editForm.emergencyContactName.trim(),
        emergencyContactPhone: editForm.emergencyContactPhone.trim(),
      });
      const updated = response?.data?.data || response?.data || {};
      setEmployee((prev) => (prev ? {
        ...prev,
        phone: String(updated.phone ?? combinedPhone),
        gender: String(updated.gender ?? editForm.gender),
        dateOfBirth: String(updated.dateOfBirth ?? editForm.dateOfBirth),
        currentAddress: String(updated.currentAddress ?? editForm.currentAddress),
        permanentAddress: String(updated.permanentAddress ?? permanentAddress),
        country: String(updated.country ?? editForm.country),
        state: String(updated.state ?? editForm.state),
        city: String(updated.city ?? editForm.city),
        emergencyContactName: String(updated.emergencyContactName ?? editForm.emergencyContactName),
        emergencyContactPhone: String(updated.emergencyContactPhone ?? editForm.emergencyContactPhone),
      } : prev));
      toast.success("Profile updated successfully.");
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as Error)?.message
        || "Failed to update profile";
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading && !employee) {
    return (
      <div className="border-default border-borderGray rounded-xl bg-white p-4" aria-label="Loading profile">
        <div className="mb-4 h-5 w-28 animate-pulse rounded bg-slate-200" />
        <div className="space-y-5">
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 sm:p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-[1.75rem] bg-slate-200" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-8 w-56 max-w-full animate-pulse rounded-lg bg-slate-200" />
                <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
                <div className="flex gap-2 pt-1">
                  <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-7 w-28 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
          {[9, 6].map((cardCount, sectionIndex) => (
            <div key={sectionIndex} className="rounded-[2rem] border border-slate-100 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: cardCount }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage && !employee) {
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
    <>
    <div className="border-default border-borderGray rounded-xl bg-white p-4">
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">My Profile</span>
      </div>
      <div className="space-y-5">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (currentAvatarUrl) setIsAvatarPreviewOpen(true);
                  else openAvatarPicker();
                }}
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] text-2xl font-bold text-white shadow-[0_18px_40px_rgba(37,99,235,0.28)] transition hover:brightness-95"
                title={currentAvatarUrl ? "View profile photo" : "Upload profile photo"}
              >
                {currentAvatarUrl ? (
                  <img src={currentAvatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </button>
              <button
                type="button"
                onClick={openAvatarPicker}
                title="Change profile photo"
                aria-label="Change profile photo"
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-md transition hover:bg-slate-700"
              >
                <Camera size={13} />
              </button>
              <input
                ref={avatarInputRef}
                id="profilePictureUpload"
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />

              <MuiModal open={isAvatarPreviewOpen} onClose={() => setIsAvatarPreviewOpen(false)} title="Profile Photo">
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={currentAvatarUrl}
                    alt="Profile preview"
                    className="max-h-80 w-full rounded-xl border border-slate-100 object-contain p-4"
                  />
                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-[12px] font-pmedium text-white transition hover:bg-blue-700"
                  >
                    <Camera size={14} /> Change Image
                  </button>
                </div>
              </MuiModal>

              <AvatarCropModal
                open={isCropModalOpen}
                imageSrc={cropSourceUrl}
                onClose={handleCropModalClose}
                onSave={handleCropSave}
              />
            </div>
            <div className="min-w-0 flex-1">
              {/* <p className="text-[10px] font-pmedium uppercase tracking-[0.32em] text-blue-600">My Profile</p> */}
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{profileName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Complete employee profile including personal and employment details.
              </p>

              {avatarFile && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="profilePictureUpload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-pmedium text-blue-700 transition hover:bg-blue-100"
                  >
                    Change Image
                  </label>
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={isAvatarUploading}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-3 py-1.5 text-[11px] font-pmedium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isAvatarUploading ? "Uploading..." : "Save Photo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAvatarFile(null); setAvatarPreviewUrl(null); }}
                    disabled={isAvatarUploading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
                  <ShieldCheck size={14} /> {profileRole}
                </span>
                {profileDepartment && profileDepartment !== "-" ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                    <Building size={14} /> {profileDepartment}
                  </span>
                ) : null}
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                  profileStatus === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white/80 text-slate-600"
                }`}>
                  <BadgeCheck size={14} /> {formatTitleCase(profileStatus)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!employee && !hasTenantRole && !isLoading ? (
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
          <SectionShell
            title="Personal & Contact Details"
            icon={UserRound}
            action={
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <Pencil size={13} /> Edit
              </button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visiblePersonalFields.filter((f) => {
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

      {isCustomPlan ? (
        <>
          <CompanyDocumentsSection kind="sop" title="Company SOPs" />
          <CompanyDocumentsSection kind="policy" title="Company Policies" />
          <DepartmentDocumentsSection kind="sop" title="Department SOPs" />
          <DepartmentDocumentsSection kind="policy" title="Department Policies" />
        </>
      ) : null}
    </div>
  </div>

  {isEditModalOpen && createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/40 pt-[6vh] pb-8 backdrop-blur-sm"
      onClick={() => !isSavingProfile && setIsEditModalOpen(false)}
    >
      <div
        className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Pencil size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-pmedium text-slate-900">Edit Personal & Contact Details</h3>
              <p className="text-[12px] text-slate-500">Name and email cannot be changed here.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSavingProfile && setIsEditModalOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <FormField label="Full Name">
              <input type="text" value={String(profileName)} disabled readOnly className={fieldDisabledClass} />
            </FormField>
            <FormField label="Email">
              <input type="email" value={String(profileEmail)} disabled readOnly className={fieldDisabledClass} />
            </FormField>

            <FormField
              label="Phone"
              hint={selectedPhoneCountry
                ? `${selectedPhoneCountry.dialCode} is selected for ${selectedPhoneCountry.name}.`
                : "Select a country code."}
            >
              <div className="flex gap-2">
                <PhoneCountryDropdown
                  value={editForm.phoneCountryIso}
                  onChange={(isoCode) => setEditForm((p) => ({ ...p, phoneCountryIso: isoCode }))}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={editForm.phone}
                  maxLength={15}
                  placeholder="Phone number"
                  aria-invalid={Boolean(editForm.phone) && !phoneValidation.valid}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 15);
                    setEditForm((p) => ({ ...p, phone: digitsOnly }));
                  }}
                  className={`${fieldInputClass} flex-1 ${editForm.phone && !phoneValidation.valid ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10" : ""}`}
                />
              </div>
              {editForm.phone && !phoneValidation.valid && (
                <span className="text-[10px] font-medium text-rose-600">{phoneValidation.message}</span>
              )}
            </FormField>
            <FormField label="Gender">
              <select
                value={editForm.gender}
                onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                className={fieldInputClass}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>

            <FormField label="Date of Birth">
              <input
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                className={fieldInputClass}
              />
            </FormField>
            <FormField label="Country">
              <select
                value={editForm.country}
                onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value, state: "", city: "" }))}
                className={fieldInputClass}
              >
                <option value="">Select Country</option>
                {countryOptions.map((country) => (<option key={country} value={country}>{country}</option>))}
              </select>
            </FormField>

            <FormField label="State">
              <select
                value={editForm.state}
                onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value, city: "" }))}
                disabled={!editForm.country}
                className={`${fieldInputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
              >
                <option value="">Select State</option>
                {stateOptions.map((state) => (<option key={state} value={state}>{state}</option>))}
              </select>
            </FormField>
            <FormField label="City">
              <select
                value={editForm.city}
                onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                disabled={!editForm.state}
                className={`${fieldInputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
              >
                <option value="">Select City</option>
                {cityOptions.map((city) => (<option key={city} value={city}>{city}</option>))}
              </select>
            </FormField>

            <FormField label="Current Address" className="sm:col-span-2">
              <input
                type="text"
                value={editForm.currentAddress}
                onChange={(e) => setEditForm((p) => ({
                  ...p,
                  currentAddress: e.target.value,
                  permanentAddress: p.sameAsCurrentAddress ? e.target.value : p.permanentAddress,
                }))}
                className={fieldInputClass}
              />
            </FormField>
            <FormField label="Permanent Address" className="sm:col-span-2">
              <input
                type="text"
                value={editForm.permanentAddress}
                disabled={editForm.sameAsCurrentAddress}
                onChange={(e) => setEditForm((p) => ({ ...p, permanentAddress: e.target.value }))}
                className={`${fieldInputClass} ${editForm.sameAsCurrentAddress ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""}`}
              />
              <label className="mt-1 flex items-center gap-2 text-[12px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={editForm.sameAsCurrentAddress}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditForm((p) => ({
                      ...p,
                      sameAsCurrentAddress: checked,
                      permanentAddress: checked ? p.currentAddress : p.permanentAddress,
                    }));
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30"
                />
                Same as current address
              </label>
            </FormField>

            <FormField label="Emergency Contact Name">
              <input
                type="text"
                value={editForm.emergencyContactName}
                onChange={(e) => setEditForm((p) => ({ ...p, emergencyContactName: e.target.value }))}
                className={fieldInputClass}
              />
            </FormField>
            <FormField label="Emergency Contact Phone">
              <input
                type="tel"
                value={editForm.emergencyContactPhone}
                onChange={(e) => setEditForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
                className={fieldInputClass}
              />
            </FormField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(false)}
            disabled={isSavingProfile}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-6 py-2.5 text-[11px] font-pmedium uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isSavingProfile ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )}
  </>
  );
}
