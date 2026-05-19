// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TextField, Avatar, CircularProgress } from "@mui/material";
import { X, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import { toast } from "sonner";
import PageFrame from "../../components/Pages/PageFrame";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import { PLAN_UI_DATA } from "../WorkspaceSetup/workspaceSetupPlans";

const UserDetails = () => {
  const axios = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [workspaceProfile, setWorkspaceProfile] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [upgradeOpenGroups, setUpgradeOpenGroups] = useState<Record<string, boolean>>({});
  const [requestedUpgradePlan, setRequestedUpgradePlan] = useState("");

  const { data: userDetails } = useQuery({
    queryKey: ["profileMe"],
    queryFn: async () => {
      const res = await axios.get("/api/profile/me");
      return res.data;
    },
  });

  useEffect(() => {
    const payload = userDetails?.data;
    if (!payload) return;

    const mergedUser = payload?.user || {};
    const workspace = payload?.workspace || null;

    setWorkspaceProfile({ workspace });

    setAuth((prev) => ({
      ...prev,
      user: {
        ...(prev?.user || {}),
        ...mergedUser,
      },
    }));
  }, [setAuth, userDetails]);

  const buildProfileDefaults = useCallback(() => ({
    name: auth?.user?.name || "",
    email: auth?.user?.email || "",
    address: auth?.user?.address || workspaceProfile?.workspace?.address || "",
    workspaceName: workspaceProfile?.workspace?.workspaceName || "",
    businessName: workspaceProfile?.workspace?.businessName || "",
    brandName: workspaceProfile?.workspace?.brandName || "",
    country: workspaceProfile?.workspace?.country || "",
    state: workspaceProfile?.workspace?.state || "",
    city: workspaceProfile?.workspace?.city || "",
    businessTypes:
      Array.isArray(workspaceProfile?.workspace?.businessTypes) &&
      workspaceProfile.workspace.businessTypes.length > 0
        ? workspaceProfile.workspace.businessTypes.join(", ")
        : "",
    selectedPlan: workspaceProfile?.workspace?.selectedPlan || "",
  }), [auth?.user, workspaceProfile?.workspace]);

  const { control, handleSubmit, reset } = useForm({
    mode: "onChange",
    defaultValues: {},
  });

  useEffect(() => {
    if (auth?.user || workspaceProfile?.workspace) {
      reset(buildProfileDefaults());
    }
  }, [buildProfileDefaults, reset]);

  const user = {
    name: `${auth?.user?.name || ""}`,
    email: auth?.user?.email || "",
    designation: auth?.user?.designation || "",
    avatarColor: "#1976d2",
    workLocation: auth?.user?.address || workspaceProfile?.workspace?.address || "",
  };
  const normalizeRole = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
  const roleArrayTitles = Array.isArray(auth?.user?.role)
    ? auth.user.role
        .map((entry: any) => entry?.roleTitle || entry?.title || entry?.name)
        .filter(Boolean)
    : [];
  const roleCandidates = [
    auth?.user?.workspaceMembership?.role,
    auth?.user?.role,
    auth?.user?.designation,
    ...roleArrayTitles,
  ]
    .filter(Boolean)
    .map((value) => normalizeRole(value));
  const rawPermissions = Array.isArray(auth?.user?.permissions?.permissions)
    ? auth.user.permissions.permissions
    : [];
  const isFounder =
    roleCandidates.some((role) => role === "owner" || role === "founder" || role.includes("founder")) ||
    Boolean(
      auth?.user?.isOwner ||
        auth?.user?.isFounder ||
        auth?.user?.workspaceMembership?.isOwner ||
        auth?.user?.workspaceMembership?.isFounder,
    ) ||
    rawPermissions.some((permission: any) =>
      String(permission || "").toLowerCase().includes("owner") ||
      String(permission || "").toLowerCase().includes("founder"),
    );
  const roleLabelMap: Record<string, string> = {
    owner: "Founder",
    founder: "Founder",
    "super-admin": "Super Admin",
    "master-admin": "Founder",
    admin: "Department Admin",
    manager: "Department Manager",
    employee: "Employee",
  };
  const resolvedRoleLabel = isFounder
    ? "Founder"
    : roleLabelMap[roleCandidates[0] || ""] || "Team Member";

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      await axios.patch("/api/profile/update-profile/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Profile image uploaded successfully.");
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error("Failed to upload image.");
      setTimeout(() => window.location.reload(), 1000);
    } finally {
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (updatedData) =>
      axios.patch(`/api/profile/update-profile/${auth?.user?._id}`, updatedData),
    onSuccess: (res) => {
      toast.success(res.data.message || "Profile updated successfully.");
      setAuth((prev) => ({
        ...prev,
        user: { ...prev.user, ...res.data.data },
      }));
      setEditMode(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user details");
    },
  });

  const onSubmit = (data, event) => {
    if (!editMode) {
      event?.preventDefault();
      return;
    }
    mutation.mutate({ name: data.name, address: data.address });
  };

  const fields = [
    { name: "name", label: "Full Name", disabled: false },
    { name: "email", label: "Email", disabled: true },
    { name: "address", label: "Address", disabled: false },
    { name: "workspaceName", label: "Workspace Name", disabled: true },
    { name: "businessName", label: "Company Name", disabled: true },
    { name: "brandName", label: "Brand Name", disabled: true },
    { name: "country", label: "Country", disabled: true },
    { name: "state", label: "State", disabled: true },
    { name: "city", label: "City", disabled: true },
    { name: "businessTypes", label: "Types of Vertical", disabled: true },
    { name: "selectedPlan", label: "Selected Plan", disabled: true },
  ];
  const selectedPlan = String(workspaceProfile?.workspace?.selectedPlan || "").toLowerCase();
  const upgradePlanOptions =
    selectedPlan === "basic"
      ? ["professional", "custom"]
      : selectedPlan === "professional"
      ? ["custom"]
      : [];
  const upgradePlanCards = PLAN_UI_DATA.filter((plan) => upgradePlanOptions.includes(plan.key));
  const toggleUpgradeGroup = (key: string) =>
    setUpgradeOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

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
      authUser?.companyName || workspaceProfile?.workspace?.businessName || "",
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
      // Use direct fallback below.
    }

    if (directCompanyId && !/^[a-f0-9]{24}$/i.test(directCompanyId)) {
      return directCompanyId;
    }
    return "";
  };

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
          My Profile
        </span>
      </div>

      <div className="flex items-center gap-8 w-full border-2 border-gray-200 p-4 rounded-xl">
        <div className="flex gap-6 items-center w-full flex-col md:flex-row">
          <div className="w-40 h-40">
            <Avatar
              style={{
                backgroundColor: user.avatarColor,
                width: "100%",
                height: "100%",
                fontSize: "5rem",
              }}
              src={previewUrl || auth?.user?.profilePicture?.url}
            >
              {!previewUrl && !auth?.user?.profilePicture?.url && user.name?.charAt(0)}
            </Avatar>
          </div>

          <div className="md:w-96 flex flex-col gap-1">
            <span className="text-title flex items-center gap-3">{user.name}</span>
            <span className="text-subtitle">{resolvedRoleLabel}</span>

            {previewUrl && (
              <div className="flex flex-col items-start gap-2">
                <label htmlFor="fileUpload" className="text-primary cursor-pointer underline">
                  Change Image
                </label>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`px-4 py-2 rounded-md text-white ${
                    uploading ? "bg-gray-400" : "bg-primary hover:scale-[1.05] transition"
                  }`}
                >
                  {uploading ? "Uploading..." : "Save Image"}
                </button>
              </div>
            )}

            <input
              id="fileUpload"
              type="file"
              accept=".png, .jpg, .jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex flex-col gap-4 flex-1">
            <div className="flex gap-2">
              <div className="flex flex-col gap-4 text-gray-600 min-w-20">
                <span>Email :</span>
                <span>Role :</span>
                <span>Work Location :</span>
              </div>
              <div className="flex flex-col gap-4 text-gray-500">
                <span>{user.email}</span>
                <span>{resolvedRoleLabel}</span>
                <span>{user.workLocation}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageFrame>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-8">
            <span className="text-subtitle font-pmedium">Personal Information</span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {fields.map((fieldConfig) => {
                const { name, label, disabled: fieldDisabled } = fieldConfig;
                const isEditable = editMode && !fieldDisabled;

                return (
                  <div key={name}>
                    <div className={name === "selectedPlan" ? "flex items-center gap-2" : ""}>
                    {isEditable ? (
                      <Controller
                        name={name}
                        control={control}
                        rules={{ required: `${label} is required` }}
                        render={({ field, fieldState: { error } }) => (
                          <TextField
                            {...field}
                            size="small"
                            fullWidth
                            label={label}
                            InputLabelProps={{ shrink: true }}
                            error={!!error}
                            helperText={error?.message}
                          />
                        )}
                      />
                    ) : (
                      <Controller
                        name={name}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            fullWidth
                            label={label}
                            InputLabelProps={{ shrink: true }}
                            disabled
                          />
                        )}
                      />
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center">
            {!editMode && (
              <div className="flex items-center gap-3">
                <PrimaryButton
                  title="Edit"
                  handleSubmit={() => {
                    reset(buildProfileDefaults());
                    setEditMode(true);
                  }}
                />
                {upgradePlanOptions.length > 0 ? (
                  <PrimaryButton
                    title="Upgrade Plan?"
                    handleSubmit={() => setIsUpgradeModalOpen(true)}
                  />
                ) : null}
              </div>
            )}
          </div>

          {!editMode && requestedUpgradePlan ? (
            <p className="text-center mt-3 text-[13px] font-medium text-[#2d67f0]">
              Request sent for {requestedUpgradePlan.toUpperCase()} plan.
            </p>
          ) : null}

          {editMode && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <PrimaryButton
                title={mutation.isPending ? <CircularProgress size={20} color="inherit" /> : "Save"}
                disabled={mutation.isPending}
              />
              <SecondaryButton
                title="Cancel"
                handleSubmit={() => {
                  reset(buildProfileDefaults());
                  setEditMode(false);
                }}
              />
            </div>
          )}
        </form>
      </PageFrame>

      {isUpgradeModalOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/45 backdrop-blur-[2px] px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] border border-[#dbe5f2] shadow-[0_20px_80px_rgba(15,23,42,0.28)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-[28px] sm:text-[32px] font-bold text-[#111b33]">
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

                  <div className="space-y-2 flex-1">
                    {plan.moduleGroups.map((group, groupIdx) => {
                      const groupKey = `${plan.key}-profile-${groupIdx}`;
                      const isGroupOpen = Boolean(upgradeOpenGroups[groupKey]);
                      return (
                        <div key={group.title} className="rounded-xl border border-[#dce4ee] bg-[#f7f9fc]">
                          <button
                            type="button"
                            onClick={() => toggleUpgradeGroup(groupKey)}
                            className="w-full px-3 py-2 flex items-center justify-between text-left"
                          >
                            <span className="text-[11px] font-bold text-[#304766]">{group.title}</span>
                            {isGroupOpen ? (
                              <ChevronDown size={13} className="text-[#607089]" />
                            ) : (
                              <ChevronRight size={13} className="text-[#607089]" />
                            )}
                          </button>

                          {isGroupOpen ? (
                            <div className="px-3 pb-2 space-y-1">
                              {group.items?.map((item) => (
                                <div key={item} className="flex items-start gap-2">
                                  <CheckCircle2 size={12} className="text-[#23c35c] mt-0.5" />
                                  <span className="text-[11px] text-[#4f627d]">{item}</span>
                                </div>
                              ))}

                              {group.subgroups?.map((subgroup, subgroupIdx) => {
                                const subgroupKey = `${groupKey}-sub-${subgroupIdx}`;
                                const isSubgroupOpen = Boolean(upgradeOpenGroups[subgroupKey]);
                                return (
                                  <div
                                    key={subgroupKey}
                                    className="rounded-lg border border-[#e1e7f0] bg-white/70"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleUpgradeGroup(subgroupKey)}
                                      className="w-full px-3 py-2 flex items-center justify-between text-left"
                                    >
                                      <span className="text-[11px] font-bold text-[#3b4f6d]">
                                        {subgroup.title}
                                      </span>
                                      {isSubgroupOpen ? (
                                        <ChevronDown size={13} className="text-[#607089]" />
                                      ) : (
                                        <ChevronRight size={13} className="text-[#607089]" />
                                      )}
                                    </button>
                                    {isSubgroupOpen ? (
                                      <div className="px-3 pb-2 space-y-1">
                                        {subgroup.items.map((item) => (
                                          <div key={item} className="flex items-start gap-2">
                                            <CheckCircle2 size={12} className="text-[#23c35c] mt-0.5" />
                                            <span className="text-[11px] text-[#4f627d]">{item}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
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

            <div className="pt-4 mt-5 border-t border-[#e1e6ef] flex justify-center">
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="h-10 px-6 rounded-xl border border-[#d0d8e5] text-black text-[14px] font-medium bg-[#dce3ed] hover:bg-[#cfd8e6] transition-colors"
              >
                Continue with same plan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UserDetails;
