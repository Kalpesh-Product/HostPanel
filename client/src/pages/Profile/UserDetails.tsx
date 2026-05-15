// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TextField, Avatar, CircularProgress } from "@mui/material";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../../hooks/useAuth";
import { toast } from "sonner";
import PageFrame from "../../components/Pages/PageFrame";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";

const UserDetails = () => {
  const axios = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
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
            <span className="text-subtitle">{user.designation}</span>

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
                <span>Work Location :</span>
              </div>
              <div className="flex flex-col gap-4 text-gray-500">
                <span>{user.email}</span>
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
                );
              })}
            </div>
          </div>

          <div className="flex justify-center">
            {!editMode && (
              <PrimaryButton
                title="Edit"
                handleSubmit={() => {
                  reset(buildProfileDefaults());
                  setEditMode(true);
                }}
              />
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
