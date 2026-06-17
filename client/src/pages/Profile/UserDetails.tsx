// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TextField, CircularProgress } from "@mui/material";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import { toast } from "sonner";
import PageFrame from "../../components/Pages/PageFrame";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import { getStoredTenantRole } from "../../lib/tenant-session";

const UserDetails = () => {
  const axios = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [workspaceProfile, setWorkspaceProfile] = useState<any>(null);

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
        logo: mergedUser?.logo ?? null,
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
    phone: auth?.user?.phone || "",
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
  const storedTenantRole = getStoredTenantRole();
  const hasTenantRole = Boolean(storedTenantRole || auth?.user?.tenantRole);
  const resolvedRoleLabel = hasTenantRole
    ? (storedTenantRole === "tenant-manager" || auth?.user?.tenantRole === "tenant-manager"
        ? "Tenant Manager"
        : "Tenant Employee")
    : isFounder
      ? "Founder"
      : roleLabelMap[roleCandidates[0] || ""] || "Team Member";

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
    mutation.mutate({ name: data.name, address: data.address, ...(hasTenantRole ? { phone: data.phone } : {}) });
  };

  const tenantPhone = hasTenantRole ? user.phone : "";
  const fields = [
    { name: "name", label: "Full Name", disabled: false },
    { name: "email", label: "Email", disabled: true },
    ...(hasTenantRole ? [{ name: "designation", label: "Designation", disabled: true }] : []),
    ...(hasTenantRole ? [{ name: "phone", label: "Phone", disabled: true }] : []),
    { name: "address", label: "Address", disabled: false },
  ];


  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-title font-pmedium text-primary uppercase">
          My Profile
        </span>
      </div>

      <div className="flex items-center gap-8 w-full border-2 border-gray-200 p-4 rounded-xl">
        <div className="flex gap-6 items-center w-full flex-col md:flex-row">
          <div
            className="w-40 h-40 rounded-full bg-[#1976d2] flex items-center justify-center text-white text-[5rem] font-semibold"
            title={user.name}
          >
            {user.name?.charAt(0)}
          </div>

          <div className="md:w-96 flex flex-col gap-1">
            <span className="text-title flex items-center gap-3">{user.name}</span>
            <span className="text-subtitle">{resolvedRoleLabel}</span>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            <div className="flex gap-2">
              <div className="flex flex-col gap-4 text-gray-600 min-w-20">
                <span>Email :</span>
                <span>Role :</span>
                {hasTenantRole && <span>Designation :</span>}
                <span>Work Location :</span>
              </div>
              <div className="flex flex-col gap-4 text-gray-500">
                <span>{user.email}</span>
                <span>{resolvedRoleLabel}</span>
                {hasTenantRole && <span>{user.designation || "—"}</span>}
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
              </div>
            )}
          </div>

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
    </div>
  );
};

export default UserDetails;
