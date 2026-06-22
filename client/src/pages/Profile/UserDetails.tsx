import React, { useCallback, useEffect, useMemo, useState } from "react";
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

interface UserRecord {
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  designation?: string;
  _id?: string;
  role?: unknown;
  permissions?: { permissions?: unknown[] };
  isOwner?: boolean;
  isFounder?: boolean;
  tenantRole?: string;
  workspaceMembership?: {
    role?: string;
    isOwner?: boolean;
    isFounder?: boolean;
  };
}

type ProfileFormValues = {
  name: string;
  email: string;
  address: string;
  workspaceName: string;
  businessName: string;
  brandName: string;
  country: string;
  state: string;
  city: string;
  businessTypes: string;
  selectedPlan: string;
  designation?: string;
  phone?: string;
};

const UserDetails = () => {
  const axios = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [workspaceProfile, setWorkspaceProfile] = useState<any>(null);

  // Cast auth.user to a known shape for safe property access
  const authUser = useMemo(() => (auth?.user ?? {}) as UserRecord, [auth?.user]);

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

  const buildProfileDefaults = useCallback((): ProfileFormValues => ({
    name: authUser?.name || "",
    email: authUser?.email || "",
    address: authUser?.address || workspaceProfile?.workspace?.address || "",
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
  }), [authUser, workspaceProfile?.workspace]);

  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    mode: "onChange",
    defaultValues: {} as ProfileFormValues,
  });

  useEffect(() => {
    if (authUser?.name || workspaceProfile?.workspace) {
      reset(buildProfileDefaults());
    }
  }, [authUser?.name, workspaceProfile?.workspace, buildProfileDefaults, reset]);

  const formatName = (name: string) =>
    name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

  const user = {
    name: `${authUser?.name || ""}`,
    email: authUser?.email || "",
    designation: authUser?.designation || "",
    avatarColor: "#1976d2",
    workLocation: authUser?.address || workspaceProfile?.workspace?.address || "",
    phone: authUser?.phone || "",
  };
  const resolveRoleValue = (value: unknown): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value !== null) {
      return (value as any)?.name || (value as any)?.roleTitle || (value as any)?.title || "";
    }
    return String(value);
  };
  const normalizeRole = (value: unknown) =>
    resolveRoleValue(value)
      .trim()
      .toUpperCase()
      .replace(/-/g, " ");
  const roleArrayTitles = Array.isArray(authUser?.role)
    ? (authUser.role as any[])
      .map((entry: any) => entry?.roleTitle || entry?.title || entry?.name)
      .filter(Boolean)
    : [];
  const roleCandidates = [
    authUser?.workspaceMembership?.role,
    authUser?.role,
    authUser?.designation,
    ...roleArrayTitles,
  ]
    .filter(Boolean)
    .map((value) => normalizeRole(value));
  const rawPermissions = Array.isArray(authUser?.permissions?.permissions)
    ? authUser.permissions!.permissions!
    : [];
  const _isFounder =
    roleCandidates.some((role) => role === "owner" || role === "founder" || role.includes("founder")) ||
    Boolean(
      authUser?.isOwner ||
      authUser?.isFounder ||
      authUser?.workspaceMembership?.isOwner ||
      authUser?.workspaceMembership?.isFounder,
    ) ||
    rawPermissions.some((permission: any) =>
      String(permission || "").toLowerCase().includes("owner") ||
      String(permission || "").toLowerCase().includes("founder"),
    );
  const _roleLabelMap: Record<string, string> = {
    owner: "Founder",
    founder: "Founder",
    "super-admin": "Super Admin",
    "master-admin": "Founder",
    admin: "Department Admin",
    manager: "Department Manager",
    employee: "Employee",
  };
  void _isFounder;
  void _roleLabelMap;
  const storedTenantRole = getStoredTenantRole();
  const hasTenantRole = Boolean(storedTenantRole || authUser?.tenantRole);
  // console.log(auth.user.tenantRole)
  // const resolvedRoleLabel = hasTenantRole
  //   ? (storedTenantRole === "tenant-manager" || auth?.user?.tenantRole === "tenant-manager"
  //       ? "Tenant Manager"
  //       : "Tenant Employee")
  //   : isFounder
  //     ? "Founder"
  //     : roleLabelMap[roleCandidates[0] || ""] || "Team Member";
  const resolvedRoleLabel = normalizeRole(authUser?.workspaceMembership?.role) || normalizeRole(authUser?.tenantRole);
  // console.log('resolvedRoleLabel', auth?.user?.workspaceMembership?.role);

  const mutation = useMutation({
    mutationFn: async (updatedData: { name?: string; address?: string; phone?: string }) =>
      axios.patch(`/api/profile/update-profile/${authUser?._id}`, updatedData),
    onSuccess: (res) => {
      toast.success(res.data.message || "Profile updated successfully.");
      setAuth((prev) => ({
        ...prev,
        user: { ...prev.user, ...res.data.data },
      }));
      setEditMode(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user details");
    },
  });

  const onSubmit = (data: ProfileFormValues, event?: React.BaseSyntheticEvent) => {
    if (!editMode) {
      event?.preventDefault();
      return;
    }
    mutation.mutate({ name: data.name, address: data.address, ...(hasTenantRole ? { phone: (data as any).phone } : {}) });
  };

  const tenantPhone = hasTenantRole ? user.phone : "";
  void tenantPhone;
  const fields: Array<{ name: keyof ProfileFormValues; label: string; disabled: boolean }> = [
    { name: "name", label: "Full Name", disabled: false },
    { name: "email", label: "Email", disabled: true },
    ...(hasTenantRole ? [{ name: "designation" as keyof ProfileFormValues, label: "Designation", disabled: true }] : []),
    ...(hasTenantRole ? [{ name: "phone" as keyof ProfileFormValues, label: "Phone", disabled: true }] : []),
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
                {/* {hasTenantRole && <span>Designation :</span>} */}
                <span>Work Location :</span>
              </div>
              <div className="flex flex-col gap-4 text-gray-500">
                <span>{user.email}</span>
                <span>{resolvedRoleLabel}</span>
                {/* {hasTenantRole && <span>{user.designation || "—"}</span>} */}
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
