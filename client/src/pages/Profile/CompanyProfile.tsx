import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { TextField } from "@mui/material";
import { CheckCircle2, X } from "lucide-react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import PageFrame from "../../components/Pages/PageFrame";
import { toast } from "sonner";
import PrimaryButton from "../../components/PrimaryButton";
import { PLAN_UI_DATA } from "../WorkspaceSetup/workspaceSetupPlans";

const CompanyProfile = () => {
  const axios = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [requestedUpgradePlan, setRequestedUpgradePlan] = useState("");

  const { data: userDetails } = useQuery({
    queryKey: ["profileMeCompany"],
    queryFn: async () => {
      const res = await axios.get("/api/profile/me");
      return res.data;
    },
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

  const fields = [
    { name: "workspaceName", label: "Workspace Name" },
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
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
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
      const hostCompaniesResponse = await axios.get("http://localhost:5007/api/hosts/host-companies");
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

      const response = await axios.patch("http://localhost:5007/api/hosts/request-upgrade-plan", {
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
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-title font-pmedium text-primary uppercase">
          Company Profile
        </span>
      </div>

      <div className="flex items-center gap-8 w-full border-2 border-gray-200 p-4 rounded-xl">
        <div className="flex gap-6 items-center w-full flex-col md:flex-row">
          <button
            type="button"
            onClick={() => document.getElementById("companyLogoUpload")?.click()}
            className="w-40 h-40 rounded-full border border-gray-200 bg-white overflow-hidden flex items-center justify-center"
            title="Upload company logo"
          >
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt="Company logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <span className="text-[#1976d2] text-sm font-medium px-4 text-center">
                Upload Logo
              </span>
            )}
          </button>

          <div className="md:w-96 flex flex-col gap-2">
            <span className="text-title">
              {workspace?.businessName || auth?.user?.companyName || "Company"}
            </span>
            <span className="text-subtitle">Company Logo</span>
            <div className="flex items-center gap-2">
              <label htmlFor="companyLogoUpload" className="text-primary cursor-pointer underline">
                Change Logo
              </label>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !file}
                className={`px-4 py-2 rounded-md text-white ${
                  uploading || !file ? "bg-gray-400" : "bg-primary hover:scale-[1.03] transition"
                }`}
              >
                {uploading ? "Uploading..." : "Save Image"}
              </button>
            </div>
            <input
              id="companyLogoUpload"
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      <PageFrame>
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <span className="text-subtitle font-pmedium">Company Information</span>
            {upgradePlanOptions.length > 0 ? (
              <PrimaryButton
                title="Upgrade Plan?"
                handleSubmit={() => setIsUpgradeModalOpen(true)}
              />
            ) : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {fields.map((fieldConfig) => (
              <div key={fieldConfig.name}>
                <Controller
                  name={fieldConfig.name}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      fullWidth
                      label={fieldConfig.label}
                      InputLabelProps={{ shrink: true }}
                      disabled
                    />
                  )}
                />
              </div>
            ))}
          </div>
          {requestedUpgradePlan ? (
            <p className="text-center mt-3 text-[13px] font-medium text-[#2d67f0]">
              Request sent for {requestedUpgradePlan.toUpperCase()} plan.
            </p>
          ) : null}
        </div>
      </PageFrame>

      {isUpgradeModalOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center">
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
      ) : null}
    </div>
  );
};

export default CompanyProfile;
