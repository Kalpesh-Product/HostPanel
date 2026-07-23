import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Country } from "country-state-city";
import {
  BadgeAlert,
  BadgeCheck,
  Building,
  Building2,
  CalendarDays,
  Camera,
  ChevronDown,
  FileKey,
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
import useModuleAccessMap from "../../hooks/useModuleAccessMap";
import { getStoredTenantRole } from "../../lib/tenant-session";
import { updateMyEmployeeProfile, updateMyProfilePicture } from "../../services/hr";
import { getCities, getCountries, getStates } from "../../utils/locationApi";
import MuiModal from "../../components/MuiModal";
import AvatarCropModal from "../../components/AvatarCropModal";

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

// National significant number length used to cap phone digit entry per country.
const PHONE_COUNTRY_DIGITS: Record<string, number> = {
  IN: 10, US: 10, CA: 10, GB: 10, AU: 9, AE: 9, SA: 9, QA: 8, OM: 8, BH: 8,
  KW: 8, SG: 8, MY: 9, TH: 9, PH: 10, ID: 10, PK: 10, BD: 10, LK: 9, NP: 10,
  JP: 10, KR: 10, CN: 11, DE: 11, FR: 9, IT: 10, ES: 9, NL: 9, ZA: 9, NG: 10,
  KE: 9,
};

interface PhoneCountry {
  isoCode: string;
  name: string;
  dialCode: string;
  digits: number;
}

const PHONE_COUNTRIES: PhoneCountry[] = (() => {
  const allCountries = Country.getAllCountries();
  const entries = Object.entries(PHONE_COUNTRY_DIGITS)
    .map(([isoCode, digits]) => {
      const country = allCountries.find((c) => c.isoCode === isoCode);
      if (!country) return null;
      return { isoCode, name: country.name, dialCode: `+${country.phonecode}`, digits };
    })
    .filter((entry): entry is PhoneCountry => Boolean(entry));
  entries.sort((a, b) => (a.isoCode === "IN" ? -1 : b.isoCode === "IN" ? 1 : a.name.localeCompare(b.name)));
  return entries;
})();

const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES.find((c) => c.isoCode === "IN") || PHONE_COUNTRIES[0];

function getPhoneCountry(isoCode: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.isoCode === isoCode) || DEFAULT_PHONE_COUNTRY;
}

function parsePhoneValue(value: unknown): { isoCode: string; number: string } {
  const trimmed = String(value || "").trim();
  if (!trimmed) return { isoCode: DEFAULT_PHONE_COUNTRY.isoCode, number: "" };
  if (trimmed.startsWith("+")) {
    const match = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((entry) => trimmed.startsWith(entry.dialCode));
    if (match) {
      return { isoCode: match.isoCode, number: trimmed.slice(match.dialCode.length).replace(/\D/g, "") };
    }
    return { isoCode: DEFAULT_PHONE_COUNTRY.isoCode, number: trimmed.replace(/^\+\d+\D*/, "").replace(/\D/g, "") };
  }
  return { isoCode: DEFAULT_PHONE_COUNTRY.isoCode, number: trimmed.replace(/\D/g, "") };
}

function PhoneCountryDropdown({ value, onChange }: { value: string; onChange: (isoCode: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = getPhoneCountry(value);

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
        <img src={getFlagUrl(selected.isoCode)} alt={`${selected.name} flag`} className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover" />
        <span className="truncate">{selected.dialCode}</span>
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
    phoneCountryIso: DEFAULT_PHONE_COUNTRY.isoCode,
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

function SectionShell({ eyebrow, title, icon: Icon, action, children }: { eyebrow?: string; title: string; icon: React.ComponentType<{ size?: number }>; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-pmedium uppercase tracking-[0.32em] text-blue-600">{eyebrow}</p>
            <h2 className="text-lg font-pmedium text-slate-900">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      <div className="pt-5">{children}</div>
    </section>
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
  const { auth, setAuth } = useAuth();
  const axios = useAxiosPrivate();
  const { workspacePlan } = useModuleAccessMap();
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const hasTenantRole = Boolean(getStoredTenantRole() || auth?.user?.tenantRole);

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
  const planDepartmentDisplay = workspacePlan === "basic"
    ? "-"
    : workspacePlan === "professional"
    ? "Sales and Tech"
    : "All Departments";
  const currentAvatarUrl = avatarPreviewUrl || employee?.profilePictureUrl || "";

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
    { label: "Department", value: planDepartmentDisplay, icon: Building },
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
    setIsSavingProfile(true);
    try {
      const combinedPhone = editForm.phone.trim()
        ? `${getPhoneCountry(editForm.phoneCountryIso).dialCode} ${editForm.phone.trim()}`
        : "";
      const permanentAddress = editForm.sameAsCurrentAddress
        ? editForm.currentAddress.trim()
        : editForm.permanentAddress.trim();
      const response = await updateMyEmployeeProfile({
        phone: combinedPhone,
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
                onClick={() =>
                  currentAvatarUrl
                    ? setIsAvatarPreviewOpen(true)
                    : document.getElementById("profilePictureUpload")?.click()
                }
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] text-2xl font-bold text-white shadow-[0_18px_40px_rgba(37,99,235,0.28)] transition hover:brightness-95"
                title={currentAvatarUrl ? "View profile photo" : "Upload profile photo"}
              >
                {currentAvatarUrl ? (
                  <img src={currentAvatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </button>
              <label
                htmlFor="profilePictureUpload"
                title="Change profile photo"
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-md transition hover:bg-slate-700"
              >
                <Camera size={13} />
              </label>
              <input
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
                  <label
                    htmlFor="profilePictureUpload"
                    onClick={() => setIsAvatarPreviewOpen(false)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-[12px] font-pmedium text-white transition hover:bg-blue-700"
                  >
                    Change Photo
                  </label>
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

            <FormField label="Phone" hint={`${getPhoneCountry(editForm.phoneCountryIso).digits}-digit number for ${getPhoneCountry(editForm.phoneCountryIso).name}`}>
              <div className="flex gap-2">
                <PhoneCountryDropdown
                  value={editForm.phoneCountryIso}
                  onChange={(isoCode) => setEditForm((p) => ({
                    ...p,
                    phoneCountryIso: isoCode,
                    phone: p.phone.slice(0, getPhoneCountry(isoCode).digits),
                  }))}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={editForm.phone}
                  maxLength={getPhoneCountry(editForm.phoneCountryIso).digits}
                  onChange={(e) => {
                    const maxDigits = getPhoneCountry(editForm.phoneCountryIso).digits;
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, maxDigits);
                    setEditForm((p) => ({ ...p, phone: digitsOnly }));
                  }}
                  className={`${fieldInputClass} flex-1`}
                />
              </div>
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
