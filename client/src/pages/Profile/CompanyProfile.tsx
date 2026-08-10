import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Camera, CheckCircle2, Download, Eye, FileText, Loader2, MapPin, Pencil, Save, ShieldCheck, X } from "lucide-react";
import { Country } from "country-state-city";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import useWorkspacePreferences from "../../hooks/useWorkspacePreferences";
import { updateWorkspaceSettings } from "../../services/unit-settings";
import { getCompanyDocuments, downloadDepartmentDocumentFile, type DepartmentDocumentType } from "../../services/departmentDocuments";
import humanDate from "../../utils/humanDateForamt";
import { getCities, getCountries, getStates } from "../../utils/locationApi";
import { toast } from "sonner";
import PrimaryButton from "../../components/PrimaryButton";
import MuiModal from "../../components/MuiModal";
import LogoAdjustModal from "../../components/LogoAdjustModal";
import { SectionShell, DetailCard } from "../../components/Pages/ProfileSection";
import { PLAN_UI_DATA } from "../WorkspaceSetup/workspaceSetupPlans";
import AccountDeletionDangerZone from "./AccountDeletionDangerZone";

const MASTER_PANEL_BASE_URL = String(import.meta.env.VITE_MASTER_PANEL_BE_URL || "").trim() || "https://masterpanel.wono.co";
const MAX_LOGO_SIZE_MB = 1;
const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024;

const openDocument = (fileUrl: string) => {
  if (!fileUrl) return;
  window.open(fileUrl, "_blank", "noopener,noreferrer");
};

// Read-only list of active company-wide SOPs/Policies (uploaded from HR's
// Company Management page) — view opens the PDF in a new tab, download
// pulls a local copy.
const CompanyDocumentsSection = ({ kind, title }: { kind: DepartmentDocumentType; title: string }) => {
  const axios = useAxiosPrivate();

  const { data, isLoading } = useQuery({
    queryKey: ["companyProfileDocuments", kind],
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
                    Updated {humanDate(doc.updatedAt)}
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
                  onClick={() => handleDownload(doc)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-pmedium uppercase text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
                >
                  <Download size={12} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

const CompanyProfile = () => {
  const axios = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { auth, setAuth } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [requestedUpgradePlan, setRequestedUpgradePlan] = useState("");
  const [isLogoPreviewOpen, setIsLogoPreviewOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [isLogoAdjustOpen, setIsLogoAdjustOpen] = useState(false);

  // Company Profile is scoped to the ACTIVE unit (the one selected in the
  // workspace switcher), not the main unit. Scoping the query key by the
  // active workspace id keeps the profile in sync when the user switches units.
  const activeWorkspaceId = String(
    (auth?.user as any)?.workspaceMembership?.workspace ||
      (auth?.user as any)?.primaryWorkspace ||
      (auth?.user as any)?.workspaceId ||
      "",
  ).trim();

const { data: userDetails, refetch: refetchProfile } = useQuery({
  queryKey: ["profileMeCompany", activeWorkspaceId],
  queryFn: async () => {
    const res = await axios.get("/api/profile/me");
    return res.data;
  },
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

  useEffect(() => {
    const payload = userDetails?.data;
    if (!payload) return;
    const mergedUser = payload?.user || {};
    setAuth((prev) => ({
      ...prev,
      user: {
        ...(prev?.user || {}),
        ...mergedUser,
        logo: mergedUser?.logo ?? null,
      },
    }));
  }, [setAuth, userDetails]);

  const workspace = userDetails?.data?.workspace || null;
  const workspacePreferences = useWorkspacePreferences();

  const authUserRole = String(
    (auth?.user as any)?.workspaceMembership?.role || (auth?.user as any)?.role || "",
  )
    .trim()
    .toLowerCase();
  const canEditUnitInfo = ["founder", "owner", "super_admin"].includes(authUserRole);

  // Per-unit editable fields: unit name, location (country/state/city) and
  // localization (timezone/currency). Everything else stays shared/read-only.
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [editForm, setEditForm] = useState({
    workspaceName: "",
    country: "",
    state: "",
    city: "",
    timezone: "",
    currency: "",
  });
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [savedPrefs, setSavedPrefs] = useState<{ timezone?: string; currency?: string } | null>(null);

  const displayTimezone = String(savedPrefs?.timezone || workspacePreferences.timezone || "");
  const displayCurrency = String(savedPrefs?.currency || workspacePreferences.currency || "");

  const timezoneOptions = useMemo(() => {
    try {
      const supported = (Intl as any).supportedValuesOf?.("timeZone");
      if (Array.isArray(supported) && supported.length > 0) return supported as string[];
    } catch {
      // fall through to the curated list below
    }
    return [
      "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
      "America/Anchorage", "Pacific/Honolulu", "Asia/Kolkata", "Asia/Dubai",
      "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai", "Europe/London",
      "Europe/Paris", "Europe/Berlin", "Australia/Sydney", "UTC",
    ];
  }, []);

  const currencyOptions = useMemo(() => {
    try {
      return Array.from(
        new Set(
          Country.getAllCountries()
            .map((item: any) => String(item?.currency || "").trim().toUpperCase())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b));
    } catch {
      return ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY", "CNY"];
    }
  }, []);

  useEffect(() => {
    // When the user switches units, forget the locally overridden prefs so the
    // new unit's timezone/currency are shown.
    setSavedPrefs(null);
  }, [activeWorkspaceId]);

  useEffect(() => {
    let active = true;
    getCountries()
      .then((countries) => { if (active) setCountryOptions(countries); })
      .catch(() => { if (active) setCountryOptions([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!editForm.country) {
      setStateOptions([]);
      return;
    }
    getStates(editForm.country)
      .then((states) => { if (active) setStateOptions(states); })
      .catch(() => { if (active) setStateOptions([]); });
    return () => { active = false; };
  }, [editForm.country]);

  useEffect(() => {
    let active = true;
    if (!editForm.country || !editForm.state) {
      setCityOptions([]);
      return;
    }
    getCities(editForm.country, editForm.state)
      .then((cities) => { if (active) setCityOptions(cities); })
      .catch(() => { if (active) setCityOptions([]); });
    return () => { active = false; };
  }, [editForm.country, editForm.state]);

  const handleOpenEditModal = () => {
    setEditForm({
      workspaceName: String(workspace?.workspaceName || ""),
      country: String(workspace?.country || ""),
      state: String(workspace?.state || ""),
      city: String(workspace?.city || ""),
      timezone: displayTimezone,
      currency: displayCurrency,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUnitInfo = async () => {
    const unitName = editForm.workspaceName.trim();
    if (!unitName) {
      toast.error("Unit name is required.");
      return;
    }
    if (!editForm.timezone) {
      toast.error("Please select a timezone.");
      return;
    }
    if (!editForm.currency) {
      toast.error("Please select a currency.");
      return;
    }
    setIsSavingUnit(true);
    try {
      await updateWorkspaceSettings(axios, {
        profile: {
          workspaceName: unitName,
          country: editForm.country.trim(),
          state: editForm.state.trim(),
          city: editForm.city.trim(),
        },
        preferences: {
          timezone: editForm.timezone,
          currency: editForm.currency,
        },
      });
      setSavedPrefs({ timezone: editForm.timezone, currency: editForm.currency });
      setIsEditModalOpen(false);
      toast.success("Unit information updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ["profileMeCompany", activeWorkspaceId] });
      await refetchProfile();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update unit information.");
    } finally {
      setIsSavingUnit(false);
    }
  };

  const defaults = useMemo(
    () => ({
      workspaceName: workspace?.workspaceName || "",
      businessName: workspace?.businessName || "",
      brandName: workspace?.brandName || "",
      country: workspace?.country || "",
      state: workspace?.state || "",
      city: workspace?.city || "",
      businessTypes:
        Array.isArray(workspace?.businessTypes) && workspace.businessTypes.length > 0
          ? workspace.businessTypes.join(", ")
          : "",
      selectedPlan: workspace?.selectedPlan || "",
    }),
    [workspace],
  );

  const { control, reset } = useForm({
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const companyFields = [
    { name: "workspaceName", label: "Unit Name" },
    { name: "businessName", label: "Company Name" },
    { name: "brandName", label: "Brand Name" },
    { name: "country", label: "Country" },
    { name: "state", label: "State" },
    { name: "city", label: "City" },
    { name: "businessTypes", label: "Types of Vertical" },
    { name: "selectedPlan", label: "Selected Plan" },
  ];

  const selectedPlan = String(workspace?.selectedPlan || "").toLowerCase();
  const upgradePlanOptions =
    selectedPlan === "basic"
      ? ["professional", "custom"]
      : selectedPlan === "professional"
      ? ["custom"]
      : [];
  const upgradePlanCards = PLAN_UI_DATA.filter((plan) => upgradePlanOptions.includes(plan.key));

  const currentLogoUrl =
    previewUrl ||
    (typeof auth?.user?.logo === "object" ? auth?.user?.logo?.url : auth?.user?.logo) ||
    "";

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > MAX_LOGO_SIZE_BYTES) {
      toast.error(`Logo image must not exceed ${MAX_LOGO_SIZE_MB}MB.`);
      event.target.value = "";
      return;
    }
    setCropSourceUrl(URL.createObjectURL(selectedFile));
    setIsLogoAdjustOpen(true);
    event.target.value = "";
  };

  const handleLogoAdjustClose = () => {
    setIsLogoAdjustOpen(false);
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    setCropSourceUrl(null);
  };

  const handleLogoAdjustSave = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], "logo.jpg", { type: "image/jpeg" });
    setFile(croppedFile);
    setPreviewUrl(URL.createObjectURL(croppedBlob));
    handleLogoAdjustClose();
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const response = await axios.patch("/api/profile/company-logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const nextLogo = response?.data?.data?.logo || null;
      setAuth((prev) => ({
        ...prev,
        user: {
          ...(prev?.user || {}),
          logo: nextLogo,
        },
      }));
      setPreviewUrl(null);
      setFile(null);
      toast.success("Company logo uploaded successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to upload company logo.");
    } finally {
      setUploading(false);
    }
  };

  const getUpgradeRequestStorageKey = (companyId: string) =>
    `hostpanel_upgrade_request_status_${companyId}`;

  const resolveMasterCompanyId = async () => {
    const authUser = auth.user as
      | {
          company?: string | { _id?: string; id?: string };
          companyId?: string;
          hostLeadCompanyId?: string;
        }
      | null;
    const directCompanyId = String(
      authUser?.hostLeadCompanyId ||
        (typeof authUser?.company === "string"
          ? authUser.company
          : authUser?.company?._id || authUser?.company?.id) ||
        authUser?.companyId ||
        "",
    ).trim();

    const legacyCompanyId = String(authUser?.companyId || "").trim();
    const companyNameHint = String(
      auth?.user?.companyName || workspace?.businessName || "",
    )
      .trim()
      .toLowerCase();

    try {
      const hostCompaniesResponse = await axios.get(`${MASTER_PANEL_BASE_URL}/api/hosts/host-companies`);
      const hostCompanies = (Array.isArray(hostCompaniesResponse?.data)
        ? hostCompaniesResponse.data
        : Array.isArray(hostCompaniesResponse?.data?.data)
        ? hostCompaniesResponse.data.data
        : Array.isArray(hostCompaniesResponse?.data?.companies)
        ? hostCompaniesResponse.data.companies
        : []) as Array<Record<string, unknown>>;

      let matchedCompany = hostCompanies.find((company) => {
        const leadId = String(company?.leadId || "").trim();
        const companyId = String(company?.companyId || "").trim();
        return (
          (legacyCompanyId && (leadId === legacyCompanyId || companyId === legacyCompanyId)) ||
          false
        );
      });

      if (!matchedCompany && companyNameHint) {
        matchedCompany = hostCompanies.find((company) => {
          const name = String(company?.companyName || "").trim().toLowerCase();
          return name && name === companyNameHint;
        });
      }

      if (matchedCompany?.companyId) {
        return String(matchedCompany.companyId).trim();
      }
    } catch {
      // fallback below
    }

    if (directCompanyId && !/^[a-f0-9]{24}$/i.test(directCompanyId)) {
      return directCompanyId;
    }
    return "";
  };

  useEffect(() => {
    let mounted = true;
    const syncUpgradeRequest = async () => {
      const companyId = await resolveMasterCompanyId();
      if (!mounted || !companyId) return;
      try {
        const raw = localStorage.getItem(getUpgradeRequestStorageKey(companyId));
        if (!raw) return;
        const parsed = JSON.parse(raw) as { requestedPlan?: string; status?: string };
        if (parsed?.status === "pending" && parsed?.requestedPlan) {
          setRequestedUpgradePlan(String(parsed.requestedPlan).toLowerCase());
        }
      } catch {
        // ignore invalid local state
      }
    };
    void syncUpgradeRequest();
    return () => {
      mounted = false;
    };
  }, [auth.user, workspace?.businessName]);

  const handleUpgradePlanRequest = async (plan: string) => {
    if (requestedUpgradePlan === plan) {
      toast.info(`${plan.toUpperCase()} plan already requested.`);
      return;
    }
    try {
      setIsUpgradeSubmitting(true);
      const companyId = await resolveMasterCompanyId();
      if (!companyId) {
        toast.error("Company id not found. Please re-login and try again.");
        return;
      }

      const response = await axios.patch(`${MASTER_PANEL_BASE_URL}/api/hosts/request-upgrade-plan`, {
        companyId,
        requestedPlan: plan,
      });
      localStorage.setItem(
        getUpgradeRequestStorageKey(companyId),
        JSON.stringify({
          companyId,
          requestedPlan: plan,
          status: "pending",
          requestedAt: new Date().toISOString(),
        }),
      );
      toast.success(response?.data?.message || "Request sent. Sales team will contact you soon.");
      setRequestedUpgradePlan(plan);
      setIsUpgradeModalOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send upgrade request.");
    } finally {
      setIsUpgradeSubmitting(false);
    }
  };

  useEffect(() => {
    if (requestedUpgradePlan && selectedPlan === requestedUpgradePlan) {
      setRequestedUpgradePlan("");
    }
  }, [requestedUpgradePlan, selectedPlan]);

  return (
    <div className="border-default border-borderGray rounded-xl bg-white p-4">
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">Company Profile</span>
      </div>
      <div className="space-y-5 text-slate-900">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative shrink-0">
              {/* h-16/w-56 = 3.5:1, the same LOGO_DISPLAY_ASPECT (168/48) the crop
                  tool below enforces and the sidebar header (Header.tsx) renders at
                  — a wide, letterboxed rectangle rather than a square/circle frame. */}
              <button
                type="button"
                onClick={() =>
                  currentLogoUrl
                    ? setIsLogoPreviewOpen(true)
                    : document.getElementById("companyLogoUpload")?.click()
                }
                className="flex h-16 w-56 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30"
                title={currentLogoUrl ? "Preview company logo" : "Upload company logo"}
              >
                {currentLogoUrl ? (
                  <img src={currentLogoUrl} alt="Company logo" className="h-full w-full object-contain p-3" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Building2 size={22} />
                    <span className="text-[9px] font-semibold uppercase tracking-wide">Upload Logo</span>
                  </div>
                )}
              </button>
              <label
                htmlFor="companyLogoUpload"
                title="Change company logo"
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-md transition hover:bg-slate-700"
              >
                <Camera size={13} />
              </label>
              <input
                id="companyLogoUpload"
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleFileChange}
              />

              <MuiModal
                open={isLogoPreviewOpen}
                onClose={() => setIsLogoPreviewOpen(false)}
                title="Company Logo"
              >
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={currentLogoUrl}
                    alt="Company logo preview"
                    className="max-h-80 w-full rounded-xl border border-slate-100 object-contain p-4"
                  />
                  <label
                    htmlFor="companyLogoUpload"
                    onClick={() => setIsLogoPreviewOpen(false)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-[12px] font-pmedium text-white transition hover:bg-blue-700"
                  >
                    Change Logo
                  </label>
                </div>
              </MuiModal>

              <LogoAdjustModal
                open={isLogoAdjustOpen}
                imageSrc={cropSourceUrl}
                onClose={handleLogoAdjustClose}
                onSave={handleLogoAdjustSave}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {workspace?.businessName || auth?.user?.companyName || "Company"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Company information, branding, and workspace details are managed here.
              </p>

              {file && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="companyLogoUpload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-pmedium text-blue-700 transition hover:bg-blue-100"
                  >
                    Change Image
                  </label>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-3 py-1.5 text-[11px] font-pmedium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {uploading ? "Uploading..." : "Save Image"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFile(null); setPreviewUrl(null); }}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {workspace?.selectedPlan ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
                    <ShieldCheck size={14} /> {String(workspace.selectedPlan).charAt(0).toUpperCase() + String(workspace.selectedPlan).slice(1)} Plan
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <SectionShell
        eyebrow="Company"
        title="Unit & Company Information"
        icon={Building2}
        action={
          upgradePlanOptions.length > 0 ? (
            <PrimaryButton title="Upgrade Plan?" handleSubmit={() => setIsUpgradeModalOpen(true)} />
          ) : null
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {companyFields.map((fieldConfig) => {
            const value = workspace?.[fieldConfig.name]
              ? Array.isArray(workspace[fieldConfig.name])
                ? (workspace[fieldConfig.name] as string[]).join(", ")
                : String(workspace[fieldConfig.name] || "")
              : "-";
            const icon = ["country", "state", "city"].includes(fieldConfig.name)
              ? MapPin
              : fieldConfig.name === "selectedPlan"
                ? ShieldCheck
                : Building2;

            return <DetailCard key={fieldConfig.name} label={fieldConfig.label} value={value} icon={icon} />;
          })}
          <DetailCard label="Timezone" value={displayTimezone || "-"} icon={Building2} />
          <DetailCard label="Currency" value={displayCurrency || "-"} icon={Building2} />
        </div>
        {requestedUpgradePlan ? (
          <p className="text-center mt-4 text-[13px] font-medium text-[#2d67f0]">
            Request sent for {requestedUpgradePlan.toUpperCase()} plan.
          </p>
        ) : null}
      </SectionShell>

      <CompanyDocumentsSection kind="policy" title="Company Policies" />
      <CompanyDocumentsSection kind="sop" title="Company SOPs" />

      <AccountDeletionDangerZone />

      {isUpgradeModalOpen ? createPortal(
        <div className="fixed inset-0 z-[1400] bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] border border-[#dbe5f2] shadow-[0_20px_80px_rgba(15,23,42,0.28)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-['Poppins'] text-[22px] sm:text-[26px] md:text-[30px] font-bold text-[#111b33] uppercase mb-2 tracking-normal">
                  Upgrade Plan
                </h2>
                <p className="text-[14px] text-[#63738d] mt-1">
                  Choose the plan you want and send the upgrade request to master panel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="h-9 w-9 rounded-full border border-[#d7dfeb] text-[#5c6d84] inline-flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className={`grid grid-cols-1 ${
                upgradePlanCards.length > 1 ? "md:grid-cols-2" : ""
              } gap-4 mx-auto ${
                upgradePlanCards.length > 1 ? "max-w-[700px]" : "max-w-[320px]"
              }`}
            >
              {upgradePlanCards.map((plan) => (
                <div
                  key={plan.key}
                  className="w-full max-w-[300px] rounded-[30px] bg-[#eef2f7] p-4 border border-[#d9e1ec] shadow-[0_4px_18px_rgba(15,27,53,0.05)] flex flex-col"
                >
                  <h3 className="text-[18px] font-bold text-[#0f1b35] text-center mt-1">
                    {plan.title}
                  </h3>
                  <p className="text-[11px] text-[#667791] text-center mt-2 min-h-[30px]">
                    {plan.subtitle}
                  </p>
                  <p className="text-center mt-3 mb-3 text-[#0f1b35] font-bold text-[18px]">
                    {plan.priceLabel}
                  </p>

                  <div className="h-px bg-[#d8e0ea] mb-3" />

                  <div className="space-y-2 flex-1 rounded-2xl border border-[#dce4ee] bg-[#f7f9fc] px-3 py-2">
                    {plan.moduleGroups.flatMap((group) => group.items || []).map((item) => (
                      <div key={`${plan.key}-${item}`} className="flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-[#23c35c] mt-0.5" />
                        <span className="text-[11px] text-[#4f627d]">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-[#d8e0ea] mt-3 mb-2" />
                  <p className="text-[11px] text-[#9aa8bc] text-center mb-2">{plan.note}</p>

                  <div className="w-full">
                    <PrimaryButton
                      title={
                        requestedUpgradePlan === plan.key
                          ? "Requested"
                          : isUpgradeSubmitting
                          ? "Sending..."
                          : `Upgrade to ${plan.title}`
                      }
                      handleSubmit={() => handleUpgradePlanRequest(plan.key)}
                      disabled={isUpgradeSubmitting || requestedUpgradePlan === plan.key}
                      className="w-full rounded-full"
                      padding="py-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      , document.body) : null}

      <MuiModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Unit Information"
      >
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
              Unit Name
            </label>
            <input
              type="text"
              value={editForm.workspaceName}
              onChange={(event) => setEditForm((prev) => ({ ...prev, workspaceName: event.target.value }))}
              placeholder="Unit name"
              className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-black placeholder:text-[#9aa8bc] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
              Country
            </label>
            <select
              value={editForm.country}
              onChange={(event) => setEditForm((prev) => ({ ...prev, country: event.target.value, state: "", city: "" }))}
              className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
            >
              <option value="">Select country</option>
              {countryOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
              State
            </label>
            <select
              value={editForm.state}
              onChange={(event) => setEditForm((prev) => ({ ...prev, state: event.target.value, city: "" }))}
              disabled={!editForm.country}
              className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#bcd0ff] disabled:opacity-60"
            >
              <option value="">
                {!editForm.country ? "Select country first" : "Select state"}
              </option>
              {stateOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
              City
            </label>
            <select
              value={editForm.city}
              onChange={(event) => setEditForm((prev) => ({ ...prev, city: event.target.value }))}
              disabled={!editForm.country || !editForm.state}
              className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#bcd0ff] disabled:opacity-60"
            >
              <option value="">
                {!editForm.country || !editForm.state
                  ? "Select country and state first"
                  : "Select city"}
              </option>
              {cityOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
              Timezone
            </label>
            <select
              value={editForm.timezone}
              onChange={(event) => setEditForm((prev) => ({ ...prev, timezone: event.target.value }))}
              className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
            >
              <option value="">Select timezone</option>
              {timezoneOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[#7b8ba3]">
              Used for bookings, attendance, reminders, and reports in this unit.
            </p>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
              Currency
            </label>
            <select
              value={editForm.currency}
              onChange={(event) => setEditForm((prev) => ({ ...prev, currency: event.target.value }))}
              className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
            >
              <option value="">Select currency</option>
              {currencyOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[#7b8ba3]">
              Defaults to the unit's country currency and can be confirmed by the owner.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-pmedium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveUnitInfo}
              disabled={isSavingUnit}
              className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-[12px] font-pmedium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSavingUnit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSavingUnit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </MuiModal>
    </div>
  </div>
  );
  };

export default CompanyProfile;
